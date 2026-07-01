<?php

use App\Http\Controllers\Finance\ContributionController;
use App\Http\Controllers\Finance\MyContributionController;
use App\Http\Controllers\Finance\PaymentController;
use App\Http\Controllers\Finance\SponsorController;
use App\Http\Controllers\Finance\ExpenseController;
use App\Http\Controllers\Finance\ActionPlanController as FinanceActionPlanController;

// Existing financial routes
Route::prefix('financial')->name('financial.')->middleware('auth')->group(function () {
    Route::get('/my-contributions', [MyContributionController::class, 'myContributions'])->name('my-contributions');
    Route::post('/submit-payment', [MyContributionController::class, 'submitPayment'])->name('submit-payment');
    Route::post('/update-annual-amount', [MyContributionController::class, 'updateAnnualAmount'])->name('update-annual-amount');
    Route::get('/admin', [MyContributionController::class, 'adminIndex'])->name('admin.index');
    Route::post('/approve/{id}', [MyContributionController::class, 'approveContribution'])->name('approve');
});

// New Finance Management Module Routes
Route::prefix('finance')->name('finance.')->middleware('auth')->group(function () {
    
    // Main view
    Route::get('/', [ContributionController::class, 'index'])->name('index');
    
    // ==================== FAMILY FILTER ROUTE ====================
    Route::get('/families/filter-options', [ContributionController::class, 'getFamilyFilterOptions'])->name('families.filter-options');
    
    // ==================== OVERVIEW / DASHBOARD ROUTES ====================
    Route::prefix('overview')->name('overview.')->group(function () {
        Route::get('/stats', [ContributionController::class, 'getOverviewStats'])->name('stats');
        Route::get('/monthly-trend', [ContributionController::class, 'getMonthlyTrend'])->name('monthly-trend');
        Route::get('/income-breakdown', [ContributionController::class, 'getIncomeBreakdown'])->name('income-breakdown');
        Route::get('/expense-breakdown', [ContributionController::class, 'getExpenseBreakdown'])->name('expense-breakdown');
    });
    
    // ==================== SETTINGS ROUTES ====================
    Route::prefix('settings')->name('settings.')->group(function () {
        Route::get('/get', [ContributionController::class, 'getSettings'])->name('get');
        Route::post('/update', [ContributionController::class, 'updateSettings'])->name('update');
        Route::get('/terms', [ContributionController::class, 'getTerms'])->name('terms.get');
        Route::post('/terms', [ContributionController::class, 'updateTerms'])->name('terms.update');
    });
    
    // ==================== CONTRIBUTIONS ROUTES ====================
    Route::prefix('contributions')->name('contributions.')->group(function () {
        Route::get('/filter', [ContributionController::class, 'filterMemberContributions'])->name('filter');
        Route::get('/export', [ContributionController::class, 'exportContributions'])->name('export');
        Route::post('/set-annual', [ContributionController::class, 'setMemberAnnualContribution'])->name('set-annual');
        Route::post('/pay', [ContributionController::class, 'payMemberContribution'])->name('pay');
        Route::post('/update', [ContributionController::class, 'updateMemberContribution'])->name('update');
        Route::delete('/{userId}', [ContributionController::class, 'deleteMemberContribution'])->name('delete');
        Route::get('/{userId}/details', [ContributionController::class, 'getMemberContributionDetails'])->name('details');
        Route::post('/edit-annual', [ContributionController::class, 'editMemberAnnualContribution'])->name('edit-annual');
    });
    
    // ==================== PAYMENTS ROUTES ====================
    Route::prefix('payments')->name('payments.')->group(function () {
        Route::get('/', [PaymentController::class, 'getPaymentsList'])->name('data');
        Route::get('/filter', [PaymentController::class, 'filterPaymentsList'])->name('filter');
        Route::get('/export', [PaymentController::class, 'exportPayments'])->name('export');
        Route::post('/', [PaymentController::class, 'storePayment'])->name('store');
        Route::get('/{id}/details', [PaymentController::class, 'getPaymentDetails'])->name('details');
        Route::put('/{id}', [PaymentController::class, 'updatePayment'])->name('update');
        Route::delete('/{id}', [PaymentController::class, 'deletePayment'])->name('delete');
        Route::get('/{id}', [PaymentController::class, 'showPayment'])->name('show');
        Route::get('/{paymentId}/history', [PaymentController::class, 'getPaymentHistory'])->name('history');
    });
    
    // ==================== SPONSORS ROUTES ====================
    Route::prefix('sponsors')->name('sponsors.')->group(function () {
        Route::get('/', [SponsorController::class, 'getSponsors'])->name('data');
        Route::get('/filter', [SponsorController::class, 'filterSponsors'])->name('filter');
        Route::get('/export', [SponsorController::class, 'exportSponsors'])->name('export');
        Route::post('/', [SponsorController::class, 'storeSponsor'])->name('store');
        Route::put('/{id}', [SponsorController::class, 'updateSponsor'])->name('update');
        Route::delete('/{id}', [SponsorController::class, 'deleteSponsor'])->name('delete');
        Route::get('/{id}/edit', [SponsorController::class, 'editSponsor'])->name('edit');
        Route::get('/{id}', [SponsorController::class, 'showSponsor'])->name('show');
        Route::post('/payment', [SponsorController::class, 'recordSponsorPayment'])->name('record-payment');
        Route::get('/{id}/payments', [SponsorController::class, 'getSponsorPayments'])->name('payments');
    });
    
    // ==================== EXPENSES ROUTES - FIXED ====================
    Route::prefix('expenses')->name('expenses.')->group(function () {
        Route::get('/', [ExpenseController::class, 'getExpenses'])->name('data');
        Route::get('/filter', [ExpenseController::class, 'filterExpenses'])->name('filter');
        Route::post('/', [ExpenseController::class, 'storeExpense'])->name('store');  // Changed from /store to /
        Route::put('/{id}', [ExpenseController::class, 'updateExpense'])->name('update');
        Route::delete('/{id}', [ExpenseController::class, 'deleteExpense'])->name('delete');
        Route::get('/{id}/details', [ExpenseController::class, 'getExpenseDetails'])->name('details');
        Route::post('/{id}/approve', [ExpenseController::class, 'approveExpense'])->name('approve');
    });
    
    // ==================== GIFTS ROUTES ====================
    Route::prefix('gifts')->name('gifts.')->group(function () {
        Route::get('/', [ContributionController::class, 'getGifts'])->name('data');
        Route::get('/filter', [ContributionController::class, 'filterGifts'])->name('filter');
        Route::post('/', [ContributionController::class, 'storeGift'])->name('store');
        Route::put('/{id}', [ContributionController::class, 'updateGift'])->name('update');
        Route::delete('/{id}', [ContributionController::class, 'deleteGift'])->name('delete');
        Route::get('/{id}', [ContributionController::class, 'showGift'])->name('show');
    });
    
    // ==================== BUDGET ROUTES ====================
    Route::prefix('budget')->name('budget.')->group(function () {
        Route::get('/', [ContributionController::class, 'getBudget'])->name('data');
        Route::post('/', [ContributionController::class, 'storeBudget'])->name('store');
        Route::put('/{id}', [ContributionController::class, 'updateBudget'])->name('update');
        Route::delete('/{id}', [ContributionController::class, 'deleteBudget'])->name('delete');
    });
    
    // ==================== ACTION PLANS ROUTES ====================
    Route::prefix('action-plans')->name('action-plans.')->group(function () {
        Route::get('/', [FinanceActionPlanController::class, 'filterActionPlans'])->name('index');
        Route::get('/filter', [FinanceActionPlanController::class, 'filterActionPlans'])->name('filter');
        Route::post('/store', [FinanceActionPlanController::class, 'storeActionPlan'])->name('store');
        Route::post('/', [FinanceActionPlanController::class, 'storeActionPlan']);
        Route::get('/{id}/edit', [FinanceActionPlanController::class, 'editActionPlan'])->name('edit');
        Route::get('/{id}', [FinanceActionPlanController::class, 'showActionPlan'])->name('show');
        Route::put('/{id}', [FinanceActionPlanController::class, 'updateActionPlan'])->name('update');
        Route::post('/{id}', [FinanceActionPlanController::class, 'updateActionPlan']);
        Route::delete('/{id}', [FinanceActionPlanController::class, 'deleteActionPlan'])->name('delete');
        Route::post('/{id}/task', [FinanceActionPlanController::class, 'addTask'])->name('tasks.store');
        Route::put('/task/{taskId}', [FinanceActionPlanController::class, 'updateTask'])->name('tasks.update');
        Route::delete('/task/{taskId}', [FinanceActionPlanController::class, 'deleteTask'])->name('tasks.delete');
    });
    
    // ==================== REPORTS ROUTES ====================
    Route::prefix('reports')->name('reports.')->group(function () {
        Route::get('/contributions', [ContributionController::class, 'generateContributionsReport'])->name('contributions');
        Route::get('/payments', [ContributionController::class, 'generatePaymentsReport'])->name('payments');
        Route::get('/gifts', [ContributionController::class, 'generateGiftsReport'])->name('gifts');
        Route::get('/sponsors', [ContributionController::class, 'generateSponsorsReport'])->name('sponsors');
        Route::get('/sponsors-gifts', [ContributionController::class, 'generateSponsorsGiftsReport'])->name('sponsors-gifts');
        Route::get('/expenses', [ContributionController::class, 'generateExpensesReport'])->name('expenses');
        Route::get('/summary', [ContributionController::class, 'generateSummaryReport'])->name('summary');
        Route::get('/income', [ContributionController::class, 'generateIncomeReport'])->name('income');
        Route::get('/balance', [ContributionController::class, 'generateBalanceReport'])->name('balance');
        Route::get('/export', [ContributionController::class, 'exportReport'])->name('export');
    });
});
