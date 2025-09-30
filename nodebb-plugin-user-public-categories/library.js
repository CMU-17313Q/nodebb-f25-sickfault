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
    await User.updateSettings(uid, { ...settings, userPublicCatCount: next });
}

// Check if category name exists
async function categoryNameExists(name) {
    try {
        const categoriesData = await Categories.getAllCategories();
        const normalizedName = name.trim().toLowerCase();
        return categoriesData.some(cat =>
            cat.name && cat.name.toLowerCase() === normalizedName
        );
    } catch (err) {
        console.error('[user-public-categories] Error checking category name:', err);
        return false;
    }
}


exports.init = async function init(params) {
    router = params.router;
    middleware = params.middleware;
    
    // Ensure ownerUid field exists in category schema
    try {
        const categoryKeys = await db.getSortedSetRange('categories:cid', 0, -1);
        for (const cid of categoryKeys) {
            const exists = await db.exists(`category:${cid}:ownerUid`);
            if (!exists) {
                await Categories.setCategoryField(cid, 'ownerUid', 0);
            }
        }
    } catch (err) {
        console.error('[user-public-categories] Error initializing ownerUid field:', err);
    }
    
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

                // Check for duplicate names
                const isDuplicate = await categoryNameExists(name);
                if (isDuplicate) {
                    return res.status(409).json({
                        error: 'A category with this name already exists. Please choose a different name.'
                    });
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
                    order: -Date.now(), // Negative timestamp to appear at top
                    disabled: 0,
                    descriptionParsed: sanitizedDescription
                };
                
                const cid = await Categories.create(categoryData);
                
                // Set owner
                await Categories.setCategoryField(cid, 'ownerUid', uid);
                
                // Give moderator privileges to the creator
                try {
                    await Privileges.categories.give(
                        ['topics:read', 'topics:create', 'posts:edit', 'posts:delete', 'moderate'],
                        cid,
                        `uid:${uid}`
                    );
                } catch (e) {
                    console.error('[user-public-categories] Error setting privileges:', e);
                }
                
                // Increment user's category count
                await bumpCount(uid);
                
                // Get the created category's slug
                const createdCategory = await Categories.getCategoryData(cid);
                
                res.json({ 
                    ok: true, 
                    cid,
                    slug: createdCategory.slug || slugify(sanitizedName)
                });
            } catch (err) {
                console.error('[user-public-categories] Error creating category:', err);
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
                const userCategories = categories.filter(cat => cat.ownerUid && parseInt(cat.ownerUid) > 0);
                
                // Enrich with owner information
                const enrichedCategories = await Promise.all(userCategories.map(async (cat) => {
                    const [ownerUsername, topicCount, postCount] = await Promise.all([
                        User.getUserField(cat.ownerUid, 'username'),
                        Categories.getCategoryField(cat.cid, 'topic_count'),
                        Categories.getCategoryField(cat.cid, 'post_count')
                    ]);
                    
                    return {
                        ...cat,
                        ownerUsername,
                        topic_count: topicCount || 0,
                        post_count: postCount || 0,
                        created: cat.order // Using order as creation timestamp
                    };
                }));
                
                // Sort by creation date (newest first)
                enrichedCategories.sort((a, b) => b.created - a.created);
                
                res.json(enrichedCategories);
            } catch (err) {
                console.error('[user-public-categories] Error getting admin view:', err);
                next(err);
            }
        }
    );
    
    console.log('[user-public-categories] Plugin initialized successfully');
};