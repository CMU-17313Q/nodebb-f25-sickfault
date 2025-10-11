'use strict';
/* global $, ajaxify, app, config, bootbox */

function isLoggedIn() {
    return (window.app && app.user && app.user.uid) || (window.config && config.loggedIn);
}

function showCategoryModal() {
    const modal = `
        <div class="modal fade" id="createCategoryModal" tabindex="-1" role="dialog">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Create New Category</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="createCategoryForm">
                            <div class="form-group">
                                <label for="categoryName">Category Name *</label>
                                <input type="text" class="form-control" id="categoryName" required minlength="3" maxlength="100" placeholder="Enter category name">
                                <small class="form-text text-muted">3-100 characters</small>
                            </div>
                            <div class="form-group">
                                <label for="categoryDescription">Description (optional)</label>
                                <textarea class="form-control" id="categoryDescription" rows="3" maxlength="500" placeholder="Enter category description"></textarea>
                                <small class="form-text text-muted">Maximum 500 characters</small>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" id="submitCategory">Create Category</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove any existing modal
    $('#createCategoryModal').remove();

    $('body').append(modal);

    const $modal = $('#createCategoryModal');

    // Handle close button
    $modal.find('.close').on('click', function() {
        $modal.modal('hide');
    });

    // Handle form submission
    $modal.find('#submitCategory').on('click', async function() {
        const name = $('#categoryName').val().trim();
        const description = $('#categoryDescription').val().trim();
        
        // Validate
        if (!name || name.length < 3) {
            bootbox.alert('Category name must be at least 3 characters.');
            return;
        }
        
        if (name.length > 100) {
            bootbox.alert('Category name cannot exceed 100 characters.');
            return;
        }
        
        // Disable button and show loading state
        const $btn = $(this);
        $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Creating...');
        
        try {
            const res = await $.ajax({
                method: 'POST',
                url: '/api/category/create',
                headers: { 'x-csrf-token': config.csrf_token },
                data: { name, description }
            });
            
            // Category created successfully - will redirect
            $('#createCategoryModal').modal('hide');
            
            if (res?.cid) {
                // Refresh the page or redirect to the new category
                const onCategories = window.ajaxify?.data?.url && /^categories/.test(ajaxify.data.url);
                if (onCategories && typeof ajaxify.refresh === 'function') {
                    ajaxify.refresh();
                } else if (typeof ajaxify.go === 'function') {
                    ajaxify.go('category/' + res.slug);
                } else {
                    window.location.href = (window.config?.relative_path || '') + '/category/' + res.slug;
                }
            }
        } catch (e) {
            $btn.prop('disabled', false).text('Create Category');
            bootbox.alert(e?.responseJSON?.error || 'Failed to create category. Please try again.');
        }
    });
    
    // Handle Enter key in form
    $modal.find('#createCategoryForm').on('submit', function(e) {
        e.preventDefault();
        $modal.find('#submitCategory').trigger('click');
    });

    // Focus on name input when modal opens
    $modal.on('shown.bs.modal', function() {
        $('#categoryName').focus();
    });

    // Show the modal
    $modal.modal('show');
}

function showMyOwnedCategoriesModal() {
    const modal = `
        <div class="modal fade" id="myOwnedCategoriesModal" tabindex="-1" role="dialog">
            <div class="modal-dialog modal-lg" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">My Owned Categories</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div id="ownedCategoriesList">
                            <div class="text-center"><i class="fa fa-spinner fa-spin"></i> Loading...</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove any existing modal
    $('#myOwnedCategoriesModal').remove();

    $('body').append(modal);

    const $modal = $('#myOwnedCategoriesModal');

    // Load owned categories
    async function loadOwnedCategories() {
        try {
            const res = await $.ajax({
                method: 'GET',
                url: '/api/user/my-categories'
            });

            const $list = $('#ownedCategoriesList');
            $list.empty();

            if (!res.categories || res.categories.length === 0) {
                $list.html('<p class="text-muted">You haven\'t created any categories yet.</p>');
                return;
            }

            const categoryItems = res.categories.map(cat => {
                return `
                    <div class="category-item mb-3 p-3 border rounded">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="mb-2">
                                    <a href="${(window.config?.relative_path || '')}/category/${cat.slug}" class="text-decoration-none">
                                        ${cat.name}
                                    </a>
                                </h6>
                                ${cat.description ? `<p class="text-muted mb-2">${cat.description}</p>` : ''}
                                <small class="text-muted">
                                    <i class="fa fa-users"></i> ${cat.member_count} member${cat.member_count !== 1 ? 's' : ''}
                                </small>
                            </div>
                            <div>
                                <a href="${(window.config?.relative_path || '')}/category/${cat.slug}" class="btn btn-sm btn-primary">
                                    <i class="fa fa-arrow-right"></i> View
                                </a>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            $list.html(categoryItems);
        } catch (e) {
            $('#ownedCategoriesList').html('<p class="text-danger">Error loading categories.</p>');
        }
    }

    // Handle close button
    $modal.find('.close').on('click', function() {
        $modal.modal('hide');
    });

    // Show modal and load categories
    $modal.modal('show');
    loadOwnedCategories();
}

function showMembersModal(cid) {
    const modal = `
        <div class="modal fade" id="manageMembersModal" tabindex="-1" role="dialog">
            <div class="modal-dialog modal-lg" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Manage Category Members</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="inviteMemberUsername">Invite Member</label>
                            <div class="input-group">
                                <input type="text" class="form-control" id="inviteMemberUsername" placeholder="Enter username">
                                <div class="input-group-append">
                                    <button class="btn btn-primary" type="button" id="inviteMemberBtn">
                                        <i class="fa fa-user-plus"></i> Invite
                                    </button>
                                </div>
                            </div>
                        </div>
                        <hr>
                        <h6>Current Members</h6>
                        <div id="membersList">
                            <div class="text-center"><i class="fa fa-spinner fa-spin"></i> Loading...</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove any existing modal
    $('#manageMembersModal').remove();

    $('body').append(modal);

    const $modal = $('#manageMembersModal');

    // Load members list
    async function loadMembers() {
        try {
            const res = await $.ajax({
                method: 'GET',
                url: `/api/category/${cid}/members`
            });

            const $list = $('#membersList');
            $list.empty();

            if (!res.members || res.members.length === 0) {
                $list.html('<p class="text-muted">No members yet. Invite someone to get started!</p>');
                return;
            }

            const memberItems = res.members.map(member => {
                const isOwner = parseInt(member.uid) === parseInt(res.ownerUid);
                const pictureHtml = member.picture
                    ? `<img src="${member.picture}" alt="${member.username}" style="width: 30px; height: 30px; border-radius: 50%; margin-right: 10px;">`
                    : `<div style="width: 30px; height: 30px; border-radius: 50%; background: #ccc; margin-right: 10px; display: inline-block;"></div>`;

                return `
                    <div class="member-item d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                        <div class="d-flex align-items-center">
                            ${pictureHtml}
                            <span>${member.username}</span>
                            ${isOwner ? '<span class="badge badge-primary ml-2">Owner</span>' : ''}
                        </div>
                        ${!isOwner ? `<button class="btn btn-sm btn-danger remove-member-btn" data-uid="${member.uid}" data-username="${member.username}">
                            <i class="fa fa-times"></i> Remove
                        </button>` : ''}
                    </div>
                `;
            }).join('');

            $list.html(memberItems);

            // Attach remove handlers
            $list.find('.remove-member-btn').on('click', async function() {
                const targetUid = $(this).data('uid');
                const username = $(this).data('username');

                try {
                    await $.ajax({
                        method: 'DELETE',
                        url: `/api/category/${cid}/members/${targetUid}`,
                        headers: { 'x-csrf-token': config.csrf_token }
                    });

                    // Member removed successfully - list will refresh
                    loadMembers();
                } catch (e) {
                    bootbox.alert(e?.responseJSON?.error || 'Failed to remove member.');
                }
            });
        } catch (e) {
            $('#membersList').html('<p class="text-danger">Error loading members.</p>');
        }
    }

    // Handle invite member
    $modal.find('#inviteMemberBtn').on('click', async function() {
        const username = $('#inviteMemberUsername').val().trim();

        if (!username) {
            bootbox.alert('Please enter a username.');
            return;
        }

        const $btn = $(this);
        $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i>');

        try {
            await $.ajax({
                method: 'POST',
                url: `/api/category/${cid}/invite`,
                headers: { 'x-csrf-token': config.csrf_token },
                data: { username }
            });

            // Member invited successfully - list will refresh
            $('#inviteMemberUsername').val('');
            loadMembers();
        } catch (e) {
            bootbox.alert(e?.responseJSON?.error || 'Failed to invite member.');
        } finally {
            $btn.prop('disabled', false).html('<i class="fa fa-user-plus"></i> Invite');
        }
    });

    // Handle Enter key
    $modal.find('#inviteMemberUsername').on('keypress', function(e) {
        if (e.which === 13) {
            e.preventDefault();
            $modal.find('#inviteMemberBtn').trigger('click');
        }
    });

    // Handle close button
    $modal.find('.close').on('click', function() {
        $modal.modal('hide');
    });

    // Show modal and load members
    $modal.modal('show');
    loadMembers();
}

async function addLockIconsToCategories() {
    // Add lock icons to private categories created by users
    if (ajaxify?.data?.categories && Array.isArray(ajaxify.data.categories)) {
        // Get list of all user-created category IDs
        try {
            const response = await $.ajax({
                method: 'GET',
                url: '/api/user-categories/list'
            });

            const userCreatedCids = new Set(response.cids);

            ajaxify.data.categories.forEach(function(category) {
                // Only add lock if this is a user-created category
                if (userCreatedCids.has(category.cid)) {
                    // Find the category item by cid
                    const categoryElement = $(`[data-cid="${category.cid}"]`);

                    // Find the category name/title within this element
                    const categoryName = categoryElement.find('.category-title, h2 a, .category-header-name, [component="category/link"]');

                    // Add lock icon if not already present
                    if (categoryName.length && !categoryName.find('.private-category-lock').length) {
                        const lockIcon = $('<i class="fa fa-lock private-category-lock" style="color: #888; margin-right: 6px; font-size: 0.9em;"></i>');
                        categoryName.prepend(lockIcon);
                    }
                }
            });
        } catch (e) {
            console.error('[user-public-categories] Failed to load user categories:', e);
        }
    }
}

$(window).on('action:ajaxify.end', (_ev, data) => {
    // Handle homepage (/) and categories list page - add lock icons
    if (/^$|^categories/.test(data.url)) {
        addLockIconsToCategories();
    }

    if (!isLoggedIn()) return;

    // Handle categories list page
    if (/^categories/.test(data.url)) {
        // Check if buttons already exist
        if (document.getElementById('user-category-controls')) return;

        const controls = $(`
            <div id="user-category-controls" style="margin: 1rem 0;">
                <button id="btn-new-public-category" class="btn btn-primary">
                    <i class="fa fa-plus"></i> Create New Category
                </button>
                <button id="btn-my-owned-categories" class="btn btn-info" style="margin-left: 10px;">
                    <i class="fa fa-list"></i> My Categories
                </button>
            </div>
        `);

        controls.find('#btn-new-public-category').on('click', showCategoryModal);
        controls.find('#btn-my-owned-categories').on('click', showMyOwnedCategoriesModal);

        // Find the best place to insert the controls
        const pageHeader = $('.page-header, .category-header, #category-selector');
        if (pageHeader.length) {
            pageHeader.after(controls);
        } else {
            $('#content').prepend(controls);
        }
    }

    // Handle individual category page
    if (/^category\//.test(data.url)) {
        // Check if button already exists
        if (document.getElementById('manage-members-btn')) return;

        const cid = ajaxify?.data?.cid;
        const ownerUid = ajaxify?.data?.ownerUid;
        const currentUid = app?.user?.uid;

        console.log('[user-public-categories] Category page - cid:', cid, 'ownerUid:', ownerUid, 'currentUid:', currentUid);

        // Add lock icon for private categories
        if (ownerUid) {
            // Find the category title/name element
            const categoryTitle = $('[component="category/header"] h1, [component="category/header"] .category-title, h1[itemprop="name"]');

            if (categoryTitle.length && !categoryTitle.find('.private-category-lock').length) {
                const lockIcon = $('<i class="fa fa-lock private-category-lock" style="color: #888; margin-right: 8px; font-size: 0.85em;"></i>');
                categoryTitle.prepend(lockIcon);
            }
        }

        // Only show button if user is the owner
        if (cid && ownerUid && parseInt(ownerUid) === parseInt(currentUid)) {
            const manageMembersBtn = $(`
                <button id="manage-members-btn" class="btn btn-info" style="margin-left: 10px;">
                    <i class="fa fa-users"></i> Manage Members
                </button>
            `);

            const deleteCategoryBtn = $(`
                <button id="delete-category-btn" class="btn btn-danger" style="margin-left: 10px;">
                    <i class="fa fa-trash"></i> Delete Category
                </button>
            `);

            manageMembersBtn.on('click', function() {
                showMembersModal(cid);
            });

            deleteCategoryBtn.on('click', function() {
                bootbox.confirm({
                    title: 'Delete Category',
                    message: 'Are you sure you want to delete this category? This will permanently remove all topics, posts, and members. This action cannot be undone.',
                    buttons: {
                        confirm: {
                            label: 'Delete',
                            className: 'btn-danger'
                        },
                        cancel: {
                            label: 'Cancel',
                            className: 'btn-secondary'
                        }
                    },
                    callback: async function(confirmed) {
                        if (confirmed) {
                            const $btn = $('#delete-category-btn');
                            $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Deleting...');

                            try {
                                await $.ajax({
                                    method: 'DELETE',
                                    url: `/api/category/${cid}/delete`,
                                    headers: { 'x-csrf-token': config.csrf_token }
                                });

                                // Category deleted successfully - redirect to categories page
                                if (typeof ajaxify.go === 'function') {
                                    ajaxify.go('categories');
                                } else {
                                    window.location.href = (window.config?.relative_path || '') + '/categories';
                                }
                            } catch (e) {
                                $btn.prop('disabled', false).html('<i class="fa fa-trash"></i> Delete Category');
                                bootbox.alert(e?.responseJSON?.error || 'Failed to delete category. Please try again.');
                            }
                        }
                    }
                });
            });

            // Try to find a good place to insert the buttons
            const tools = $('[component="category/controls"]');
            if (tools.length) {
                tools.append(manageMembersBtn);
                tools.append(deleteCategoryBtn);
            } else {
                const header = $('[component="category/header"]');
                if (header.length) {
                    header.append(manageMembersBtn);
                    header.append(deleteCategoryBtn);
                }
            }
        }
    }
});