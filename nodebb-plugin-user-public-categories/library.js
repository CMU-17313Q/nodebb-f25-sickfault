'use strict';

let router, middleware;
const Categories = require.main.require('./src/categories');
const Privileges = require.main.require('./src/privileges');
const User = require.main.require('./src/user');
const db = require.main.require('./src/database');
const slugify = require.main.require('./src/slugify');

// Configuration
const PARENT_CID = 0; // Put 0 to place at root, or a parent category cid if you created one

// Helper function to sanitize HTML (basic implementation)
function sanitizeInput(input) {
    if (!input) return '';
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

// Get user's category count
async function getCount(uid) {
    const settings = (await User.getSettings(uid)) || {};
    return Number(settings.userPublicCatCount || 0);
}

// Increment user's category count
async function bumpCount(uid) {
    const settings = (await User.getSettings(uid)) || {};
    const next = Number(settings.userPublicCatCount || 0) + 1;
    await User.setSetting(uid, 'userPublicCatCount', next);
}


exports.init = async function init(params) {
    router = params.router;
    middleware = params.middleware;

    // Create category endpoint
    router.post('/api/category/create',
        middleware.ensureLoggedIn,
        middleware.applyCSRF,
        async (req, res, next) => {
            try {
                const uid = req.user.uid;
                const { name, description = '' } = req.body || {};
                
                // Validate name
                if (!name || name.trim().length < 3) {
                    return res.status(400).json({ error: 'Name must be at least 3 characters.' });
                }
                
                if (name.trim().length > 100) {
                    return res.status(400).json({ error: 'Name cannot exceed 100 characters.' });
                }

                // Sanitize inputs
                const sanitizedName = sanitizeInput(name.trim());
                const sanitizedDescription = sanitizeInput(description.trim());

                // Create the category
                const categoryData = {
                    name: sanitizedName,
                    description: sanitizedDescription,
                    parentCid: PARENT_CID,
                    icon: 'fa-comments',
                    order: -Date.now(),
                    disabled: 0,
                    descriptionParsed: sanitizedDescription
                };

                // Add ownerUid to the category data before creation
                categoryData.ownerUid = uid;

                const category = await Categories.create(categoryData);
                const cid = category.cid;

                // Add owner to members set
                await db.setAdd(`category:${cid}:members`, uid);

                // Remove default group privileges to make category private
                const publicGroups = ['registered-users', 'guests', 'spiders', 'fediverse'];
                const allGroupPrivs = [
                    'groups:find', 'groups:read', 'groups:topics:read', 'groups:topics:create',
                    'groups:topics:reply', 'groups:topics:tag', 'groups:posts:edit', 'groups:posts:history',
                    'groups:posts:delete', 'groups:posts:upvote', 'groups:posts:downvote', 'groups:topics:delete',
                    'groups:topics:schedule', 'groups:posts:view_deleted', 'groups:purge'
                ];

                for (const group of publicGroups) {
                    await Privileges.categories.rescind(allGroupPrivs, cid, group);
                }

                // Grant full privileges to the owner
                const ownerPrivileges = [
                    'find', 'read', 'topics:read', 'topics:create', 'topics:reply', 'topics:tag',
                    'posts:edit', 'posts:delete', 'posts:upvote', 'posts:downvote', 'moderate'
                ];

                await Privileges.categories.give(ownerPrivileges, cid, uid);
                
                // Increment user's category count
                await bumpCount(uid);

                // Generate slug for response
                const slug = `${cid}/${slugify(sanitizedName)}`;

                res.json({
                    ok: true,
                    cid,
                    slug: slug
                });
            } catch (err) {
                console.error('[user-public-categories] Error creating category:', err);
                next(err);
            }
        }
    );

    // Invite user to category endpoint
    router.post('/api/category/:cid/invite',
        middleware.ensureLoggedIn,
        middleware.applyCSRF,
        async (req, res, next) => {
            try {
                const cid = parseInt(req.params.cid);
                const uid = req.user.uid;
                const { username } = req.body || {};

                if (!username || !username.trim()) {
                    return res.status(400).json({ error: 'Username is required' });
                }

                // Get ownerUid from database
                const ownerUid = await db.getObjectField(`category:${cid}`, 'ownerUid');
                
                // Check ownership
                if (!ownerUid || parseInt(ownerUid) !== uid) {
                    const isAdmin = await User.isAdministrator(uid);
                    if (!isAdmin) {
                        return res.status(403).json({ error: 'Only the category owner can invite users' });
                    }
                }

                // Get user by username
                const targetUid = await User.getUidByUsername(username.trim());
                if (!targetUid) {
                    return res.status(404).json({ error: 'User not found' });
                }

                // Check if user is already a member
                const isMember = await db.isSetMember(`category:${cid}:members`, targetUid);
                if (isMember) {
                    return res.status(409).json({ error: 'User is already a member of this category' });
                }

                // Add user to members set
                await db.setAdd(`category:${cid}:members`, targetUid);

                // Grant member privileges
                const memberPrivileges = [
                    'find', 'read', 'topics:read', 'topics:create', 'topics:reply'
                ];

                await Privileges.categories.give(memberPrivileges, cid, targetUid);

                res.json({ ok: true, message: 'User invited successfully' });
            } catch (err) {
                console.error('[user-public-categories] Error inviting user:', err);
                next(err);
            }
        }
    );

    // Remove member from category endpoint
    router.delete('/api/category/:cid/members/:targetUid',
        middleware.ensureLoggedIn,
        middleware.applyCSRF,
        async (req, res, next) => {
            try {
                const cid = parseInt(req.params.cid);
                const uid = req.user.uid;
                const targetUid = parseInt(req.params.targetUid);

                // Get ownerUid from database
                const ownerUid = await db.getObjectField(`category:${cid}`, 'ownerUid');
                
                // Check ownership
                if (!ownerUid || parseInt(ownerUid) !== uid) {
                    const isAdmin = await User.isAdministrator(uid);
                    if (!isAdmin) {
                        return res.status(403).json({ error: 'Only the category owner can remove members' });
                    }
                }

                // Prevent removing the owner
                if (targetUid === parseInt(ownerUid)) {
                    return res.status(400).json({ error: 'Cannot remove the category owner' });
                }

                // Remove user from members set
                await db.setRemove(`category:${cid}:members`, targetUid);

                // Revoke privileges
                const memberPrivileges = [
                    'find', 'read', 'topics:read', 'topics:create', 'topics:reply'
                ];

                await Privileges.categories.rescind(memberPrivileges, cid, targetUid);

                res.json({ ok: true, message: 'Member removed successfully' });
            } catch (err) {
                console.error('[user-public-categories] Error removing member:', err);
                next(err);
            }
        }
    );

    // Get category members endpoint
    router.get('/api/category/:cid/members',
        async (req, res, next) => {
            try {
                const cid = parseInt(req.params.cid);

                // Get ownerUid from database
                const ownerUid = await db.getObjectField(`category:${cid}`, 'ownerUid');
                if (!ownerUid) {
                    return res.status(404).json({ error: 'Not a user category' });
                }

                // Get member UIDs
                const memberUids = await db.getSetMembers(`category:${cid}:members`);

                // Get member details
                const members = await Promise.all(memberUids.map(async (memberUid) => {
                    const userData = await User.getUserFields(memberUid, ['username', 'picture', 'uid']);
                    return userData;
                }));

                res.json({ members, ownerUid: ownerUid });
            } catch (err) {
                console.error('[user-public-categories] Error getting members:', err);
                next(err);
            }
        }
    );

    // Delete category endpoint
    router.delete('/api/category/:cid/delete',
        middleware.ensureLoggedIn,
        middleware.applyCSRF,
        async (req, res, next) => {
            try {
                const cid = parseInt(req.params.cid);
                const uid = req.user.uid;

                // Get ownerUid from database
                const ownerUid = await db.getObjectField(`category:${cid}`, 'ownerUid');

                // Check ownership
                if (!ownerUid || parseInt(ownerUid) !== uid) {
                    const isAdmin = await User.isAdministrator(uid);
                    if (!isAdmin) {
                        return res.status(403).json({ error: 'Only the category owner can delete this category' });
                    }
                }

                // Clean up members set
                await db.delete(`category:${cid}:members`);

                // Purge the category (removes category and all its content)
                await Categories.purge(cid, uid);

                res.json({ ok: true, message: 'Category deleted successfully' });
            } catch (err) {
                console.error('[user-public-categories] Error deleting category:', err);
                next(err);
            }
        }
    );

    // Get current user's owned categories
    router.get('/api/user/my-categories',
        middleware.ensureLoggedIn,
        async (req, res, next) => {
            try {
                const uid = req.user.uid;
                const categories = await Categories.getAllCategories();
                const myCategories = [];

                for (const cat of categories) {
                    const ownerUid = await db.getObjectField(`category:${cat.cid}`, 'ownerUid');
                    if (ownerUid && parseInt(ownerUid) === uid) {
                        const memberCount = await db.setCount(`category:${cat.cid}:members`);
                        myCategories.push({
                            cid: cat.cid,
                            name: cat.name,
                            description: cat.description,
                            slug: cat.slug,
                            member_count: memberCount || 0
                        });
                    }
                }

                res.json({ categories: myCategories });
            } catch (err) {
                console.error('[user-public-categories] Error getting user categories:', err);
                next(err);
            }
        }
    );

    // Admin endpoint to view all user-created categories
    router.get('/api/admin/user-categories',
        middleware.ensureLoggedIn,
        middleware.admin.checkPrivileges,
        async (req, res, next) => {
            try {
                const categories = await Categories.getAllCategories();
                const userCategories = [];

                for (const cat of categories) {
                    const ownerUid = await db.getObjectField(`category:${cat.cid}`, 'ownerUid');
                    if (ownerUid && parseInt(ownerUid) > 0) {
                        const [ownerUsername, memberCount] = await Promise.all([
                            User.getUserField(ownerUid, 'username'),
                            db.setCount(`category:${cat.cid}:members`)
                        ]);

                        userCategories.push({
                            ...cat,
                            ownerUid,
                            ownerUsername,
                            member_count: memberCount || 0
                        });
                    }
                }

                res.json(userCategories);
            } catch (err) {
                console.error('[user-public-categories] Error getting admin view:', err);
                next(err);
            }
        }
    );
    
    console.log('[user-public-categories] Plugin initialized successfully');
};

// Hook to preserve ownerUid when creating categories
exports.preserveOwnerUidOnCreate = async function(hookData) {
    if (hookData.data.ownerUid) {
        hookData.category.ownerUid = hookData.data.ownerUid;
    }
    return hookData;
};

// Hook to ensure ownerUid is fetched from database
exports.addOwnerUidToFields = async function(hookData) {
    if (hookData.fields && Array.isArray(hookData.fields) && hookData.fields.length > 0) {
        if (!hookData.fields.includes('ownerUid')) {
            hookData.fields.push('ownerUid');
        }
    }
    return hookData;
};

// Hook to add ownerUid to category data when fetched
exports.addOwnerUidToCategory = async function(hookData) {
    if (hookData && hookData.category && hookData.category.cid) {
        const ownerUid = await db.getObjectField(`category:${hookData.category.cid}`, 'ownerUid');
        if (ownerUid) {
            hookData.category.ownerUid = parseInt(ownerUid);
        }
    }
    return hookData;
};