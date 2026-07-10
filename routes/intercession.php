<?php

use App\Http\Controllers\Intercession\IntercessionController;
use App\Http\Controllers\Intercession\FormController;
use App\Http\Controllers\Intercession\ReportController;
// ==================== INTERCESSION MAIN ROUTES ====================
Route::middleware('auth')->prefix('intercession')->name('intercession.')->group(function () {
    Route::get('/', [IntercessionController::class, 'index'])->name('index');
    Route::get('/bible-study/chapter', [IntercessionController::class, 'bibleStudyChapter'])->name('bible-study.chapter');
    Route::get('/action-plans', [IntercessionController::class, 'actionPlans'])->name('action-plans');
    Route::post('/action-plans/store', [IntercessionController::class, 'storeActionPlan'])->name('action-plans.store');
    Route::put('/action-plans/{id}/status', [IntercessionController::class, 'updateActionPlanStatus'])->name('action-plans.status');
});

// ==================== ACTION PLANS ROUTES ====================
Route::prefix('intercession/action-plans')->middleware('auth')->group(function () {
    Route::post('/store', [IntercessionController::class, 'storeActionPlan'])->name('intercession.action-plans.store');
    Route::put('/{id}/status', [IntercessionController::class, 'updateActionPlanStatus'])->name('intercession.action-plans.status');
    Route::delete('/{id}', [IntercessionController::class, 'deleteActionPlan'])->name('intercession.action-plans.delete');
    Route::get('/{id}/edit', [IntercessionController::class, 'editActionPlan'])->name('intercession.action-plans.edit');
    // Change this from POST to PUT
    Route::put('/{id}', [IntercessionController::class, 'updateActionPlan'])->name('intercession.action-plans.update');
    Route::put('/tasks/{id}/status', [IntercessionController::class, 'updateTaskStatus'])->name('intercession.action-plans.tasks.status');
    Route::post('/{id}/task', [IntercessionController::class, 'addTask'])->name('intercession.action-plans.tasks.store');
    Route::put('/task/{taskId}', [IntercessionController::class, 'updateTask'])->name('intercession.action-plans.tasks.update');
    Route::delete('/task/{taskId}', [IntercessionController::class, 'deleteTask'])->name('intercession.action-plans.tasks.delete');
});

// ==================== REPORTS ROUTES ====================
Route::prefix('reports')->name('reports.')->middleware('auth')->group(function () {
    Route::get('/', [ReportController::class, 'index'])->name('index');
    Route::get('/filter', [ReportController::class, 'filter'])->name('filter');
    Route::get('/export', [ReportController::class, 'export'])->name('export');
    Route::get('/user-progress', [ReportController::class, 'userProgress'])->name('reports.user-progress');
});
// ==================== FORMS ROUTES ====================
Route::middleware('auth')->prefix('forms')->name('forms.')->group(function () {
    // Form management routes (admin)
    Route::get('/', [IntercessionController::class, 'index'])->name('index');
    Route::get('/manage', [IntercessionController::class, 'index'])->name('manage');
    Route::get('/manage/create', [FormController::class, 'create'])->name('manage.create');
    Route::post('/manage/store', [FormController::class, 'store'])->name('manage.store');
    Route::get('/manage/{id}/edit', [FormController::class, 'edit'])->name('manage.edit');
    Route::put('/manage/{id}', [FormController::class, 'update'])->name('manage.update');
    Route::delete('/manage/{id}', [FormController::class, 'destroy'])->name('manage.delete');
    Route::post('/manage/{id}/duplicate', [FormController::class, 'duplicate'])->name('manage.duplicate');
    Route::post('/manage/{id}/toggle-publish', [FormController::class, 'togglePublish'])->name('manage.toggle-publish');
    Route::get('/manage/{id}/submissions', [FormController::class, 'submissions'])->name('manage.submissions');
    Route::get('/manage/{formId}/submissions/{submissionId}/review', [FormController::class, 'reviewSubmission'])
        ->name('manage.submissions.review');
    // Bulk release/unrelease routes
    Route::post('/submissions/bulk-release', [FormController::class, 'bulkRelease'])->name('submissions.bulk-release');
    Route::post('/submissions/bulk-unrelease', [FormController::class, 'bulkUnrelease'])->name('submissions.bulk-unrelease');
    Route::post('/submissions/{id}/unrelease', [FormController::class, 'unreleaseSubmission'])->name('submissions.unrelease');
    Route::post('/submissions/{id}/release', [FormController::class, 'releaseSubmission'])->name('submissions.release');
    Route::post('/submissions/{id}/grade', [FormController::class, 'gradeSubmissionQuestion'])->name('submissions.grade');
    Route::delete('/submissions/{id}', [FormController::class, 'deleteSubmission'])->name('submissions.delete');
    // Add route for refreshing available forms
    Route::get('/available-forms', [FormController::class, 'getAvailableForms'])->name('available-forms');
    // Debug route - remove after testing
Route::get('/debug-checkbox-grid', [FormController::class, 'debugCheckboxGrid'])->name('debug.checkbox.grid');
    // View form submissions (for admin)
    Route::get('/{id}/submissions', [FormController::class, 'submissions'])->name('submissions');
    
    // Form taking routes (users)
    Route::get('/{id}/take', [FormController::class, 'take'])->name('take');
    Route::post('/{id}/submit', [FormController::class, 'submit'])->name('submit');
    Route::get('/{id}/results', [FormController::class, 'results'])->name('results');
    
    // ✅ FIXED: Release submission route - moved inside the forms group
    // This will match: /forms/submissions/{id}/release
    Route::post('/submissions/{id}/release', [FormController::class, 'releaseSubmission'])->name('submissions.release');
    
    // Alias for edit (without manage prefix for compatibility)
    Route::get('/{id}/edit', [FormController::class, 'edit'])->name('edit');
});

// ==================== BACKWARD COMPATIBILITY ALIASES ====================
Route::get('/forms/create', [FormController::class, 'create'])->name('forms.create')->middleware('auth');
