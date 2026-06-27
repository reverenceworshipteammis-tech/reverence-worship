<?php

use App\Http\Controllers\Discipline\DisciplineController;
use App\Http\Controllers\Discipline\AttendanceController;
use App\Http\Controllers\Discipline\PermissionController;
use App\Http\Controllers\Discipline\DisciplineRecordController;
use App\Http\Controllers\Discipline\ActionPlanController;
use App\Http\Controllers\Discipline\ReportController;

Route::middleware('auth')->prefix('discipline')->name('discipline.')->group(function () {
    Route::get('/', [DisciplineController::class, 'index'])->name('index');
    Route::get('/overview', [DisciplineController::class, 'getOverview'])->name('overview');
    
    // Attendance Routes
// Attendance Routes
Route::prefix('attendance')->name('attendance.')->group(function () {
    Route::get('/', [AttendanceController::class, 'index'])->name('index');
    Route::get('/session-check', [AttendanceController::class, 'checkSessionExists'])->name('session-check');
    
    // Parameterized routes FIRST (more specific)
    Route::get('/session/{date}/{sessionType}', [AttendanceController::class, 'getSessionDetails'])->name('session-details')->where('sessionType', '.*');
    Route::get('/session-summary', [AttendanceController::class, 'getSessionSummary'])->name('session-summary');
    
    // Then the static routes
    Route::delete('/session', [AttendanceController::class, 'deleteSession'])->name('delete-session');
    
    Route::post('/store', [AttendanceController::class, 'store'])->name('store');
    Route::post('/bulk-update', [AttendanceController::class, 'bulkUpdate'])->name('bulk-update');
    Route::post('/complete-session', [AttendanceController::class, 'completeSession'])->name('complete-session');
    Route::get('/{id}/edit', [AttendanceController::class, 'edit'])->name('edit');
    Route::put('/{id}', [AttendanceController::class, 'update'])->name('update');
    Route::delete('/{id}', [AttendanceController::class, 'destroy'])->name('destroy');
    Route::get('/stats', [AttendanceController::class, 'getStats'])->name('stats');
});
    
    // Permission Routes
Route::prefix('permission')->name('permission.')->group(function () {
    Route::get('/', [PermissionController::class, 'index'])->name('index');
    Route::get('/search-users', [PermissionController::class, 'searchUsers'])->name('search-users'); // ADD THIS LINE
    Route::post('/store', [PermissionController::class, 'store'])->name('store');
    Route::get('/{id}/edit', [PermissionController::class, 'edit'])->name('edit');
    Route::put('/{id}', [PermissionController::class, 'update'])->name('update');
    Route::delete('/{id}', [PermissionController::class, 'destroy'])->name('destroy');
    Route::get('/stats', [PermissionController::class, 'getStats'])->name('stats');
});
    // Records
    Route::prefix('records')->name('records.')->group(function () {
        Route::get('/', [DisciplineRecordController::class, 'index'])->name('index');
        Route::get('/session', [DisciplineRecordController::class, 'viewSession'])->name('session-view');
        Route::delete('/session', [DisciplineRecordController::class, 'deleteSession'])->name('session-delete');
        Route::post('/store', [DisciplineRecordController::class, 'store'])->name('store');
        Route::post('/bulk', [DisciplineRecordController::class, 'bulkStore'])->name('bulk');
        Route::get('/{id}/edit', [DisciplineRecordController::class, 'edit'])->name('edit');
        Route::put('/{id}', [DisciplineRecordController::class, 'update'])->name('update');
        Route::delete('/{id}', [DisciplineRecordController::class, 'destroy'])->name('destroy');
        Route::post('/{id}/resolve', [DisciplineRecordController::class, 'resolve'])->name('resolve');
        Route::get('/stats', [DisciplineRecordController::class, 'getStats'])->name('stats');
    });
    
    // Action Plans
    Route::prefix('action-plans')->name('action-plans.')->group(function () {
        Route::get('/', [ActionPlanController::class, 'index'])->name('index');
        Route::post('/store', [ActionPlanController::class, 'store'])->name('store');
        Route::get('/{id}/edit', [ActionPlanController::class, 'edit'])->name('edit');
        Route::put('/{id}', [ActionPlanController::class, 'update'])->name('update');
        Route::delete('/{id}', [ActionPlanController::class, 'destroy'])->name('destroy');
        Route::post('/{id}/task', [ActionPlanController::class, 'addTask'])->name('add-task');
        Route::put('/task/{taskId}', [ActionPlanController::class, 'updateTask'])->name('update-task');
        Route::delete('/task/{taskId}', [ActionPlanController::class, 'deleteTask'])->name('delete-task');
    });
    
    // Reports
Route::prefix('reports')->name('reports.')->group(function () {
    Route::get('/', [ReportController::class, 'index'])->name('index');
    Route::get('/generate', [ReportController::class, 'generate'])->name('generate');
    Route::get('/export', [ReportController::class, 'export'])->name('export');
});
});