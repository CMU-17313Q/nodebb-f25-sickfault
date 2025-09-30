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
            app.alert({
                type: 'danger',
                title: 'Invalid Input',
                message: 'Category name must be at least 3 characters.',
                timeout: 3000
            });
            return;
        }
        
        if (name.length > 100) {
            app.alert({
                type: 'danger',
                title: 'Invalid Input',
                message: 'Category name cannot exceed 100 characters.',
                timeout: 3000
            });
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
            
            app.alertSuccess('Category created successfully!');
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
            
            if (e?.status === 409) {
                app.alert({
                    type: 'danger',
                    title: 'Duplicate Name',
                    message: 'A category with this name already exists. Please choose a different name.',
                    timeout: 5000
                });
            } else {
                app.alert({
                    type: 'danger',
                    title: 'Error',
                    message: e?.responseJSON?.error || 'Failed to create category. Please try again.',
                    timeout: 5000
                });
            }
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

$(window).on('action:ajaxify.end', (_ev, data) => {
    if (!/^categories/.test(data.url)) return;
    if (!isLoggedIn()) return;

    // Check if buttons already exist
    if (document.getElementById('user-category-controls')) return;

    const controls = $(`
        <div id="user-category-controls" style="margin: 1rem 0;">
            <button id="btn-new-public-category" class="btn btn-primary">
                <i class="fa fa-plus"></i> Create New Category
            </button>
        </div>
    `);

    controls.find('#btn-new-public-category').on('click', showCategoryModal);

    // Find the best place to insert the controls
    const pageHeader = $('.page-header, .category-header, #category-selector');
    if (pageHeader.length) {
        pageHeader.after(controls);
    } else {
        $('#content').prepend(controls);
    }
});