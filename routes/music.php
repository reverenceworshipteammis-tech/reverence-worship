<?php

use App\Http\Controllers\Music\MusicController;
use App\Http\Controllers\Music\SingerController;
use App\Http\Controllers\Music\PlaylistController;
use App\Http\Controllers\Music\SongController;
use App\Http\Controllers\Music\TeamController;

Route::middleware('auth')->prefix('music')->group(function () {
    Route::get('/', [MusicController::class, 'index'])->name('music.index');
    
    // Gallery
    Route::post('/gallery/store', [MusicController::class, 'storeGallery'])->name('music.gallery.store');
    Route::get('/gallery/{id}/edit', [MusicController::class, 'editGallery'])->name('music.gallery.edit');
    Route::put('/gallery/{id}', [MusicController::class, 'updateGallery'])->name('music.gallery.update');
    Route::delete('/gallery/{id}', [MusicController::class, 'deleteGallery'])->name('music.gallery.delete');
    
    // Playlist
    Route::post('/playlist/store', [PlaylistController::class, 'store'])->name('music.playlist.store');
    Route::get('/playlist/{id}/edit', [PlaylistController::class, 'edit'])->name('music.playlist.edit');
    Route::put('/playlist/{id}', [PlaylistController::class, 'updateSongs'])->name('music.playlist.update');
    Route::delete('/playlist/{id}', [PlaylistController::class, 'destroy'])->name('music.playlist.delete');
    Route::get('/playlist/{id}/songs', [PlaylistController::class, 'getSongs'])->name('music.playlist.songs');
    
    // Song
    Route::post('/song/store', [SongController::class, 'store'])->name('music.song.store');
    Route::get('/song/{id}/edit', [SongController::class, 'edit'])->name('music.song.edit');
    Route::put('/song/{id}', [SongController::class, 'update'])->name('music.song.update');
    Route::delete('/song/{id}', [SongController::class, 'destroy'])->name('music.song.delete');
    Route::get('/song/{id}/lyrics', [SongController::class, 'viewLyrics'])->name('music.song.lyrics');
    Route::post('/song/add-to-playlist', [SongController::class, 'addToPlaylist'])->name('music.song.add-to-playlist');
    Route::post('/add-to-playlist', [SongController::class, 'addToPlaylist'])->name('music.song.add-to-playlist');
    
    // Singer
    Route::put('/singer/{id}/voice-part', [SingerController::class, 'updateVoicePart'])->name('music.singer.voice-part');
    Route::put('/singer/{id}/performance-level', [SingerController::class, 'updatePerformanceLevel'])->name('music.singer.performance-level');
    Route::post('/singer/settings', [SingerController::class, 'updateSettings'])->name('music.singer.settings');
    
    // Group
    Route::post('/group/store', [MusicController::class, 'storeGroup'])->name('music.group.store');
    Route::delete('/group/{id}', [MusicController::class, 'deleteGroup'])->name('music.group.delete');
    
    // Public Board
    Route::post('/board/store', [MusicController::class, 'storeBoardPost'])->name('music.board.store');
    Route::get('/board/{id}/edit', [MusicController::class, 'editBoardPost'])->name('music.board.edit');
    Route::put('/board/{id}', [MusicController::class, 'updateBoardPost'])->name('music.board.update');
    Route::post('/board/{id}/toggle-publish', [MusicController::class, 'togglePublishBoard'])->name('music.board.toggle-publish');
    Route::post('/board/{id}/toggle-pin', [MusicController::class, 'togglePinBoard'])->name('music.board.toggle-pin');
    Route::delete('/board/{id}', [MusicController::class, 'deleteBoardPost'])->name('music.board.delete');
    
    // Action Plan
    Route::get('/action-plan', [MusicController::class, 'actionPlanIndex'])->name('music.action-plan.index');
    Route::post('/action-plan/store', [MusicController::class, 'storeActionPlan'])->name('music.action-plan.store');
    Route::get('/action-plan/{id}/edit', [MusicController::class, 'editActionPlan'])->name('music.action-plan.edit');
    Route::put('/action-plan/{id}', [MusicController::class, 'updateActionPlan'])->name('music.action-plan.update');
    Route::put('/action-plan/{id}/status', [MusicController::class, 'updateActionPlanStatus'])->name('music.action-plan.status');
    Route::delete('/action-plan/{id}', [MusicController::class, 'deleteActionPlan'])->name('music.action-plan.delete');
    Route::post('/action-plan/{id}/task', [MusicController::class, 'addTask'])->name('music.action-plan.tasks.store');
    Route::put('/action-plan/task/{taskId}', [MusicController::class, 'updateTask'])->name('music.action-plan.tasks.update');
    Route::delete('/action-plan/task/{taskId}', [MusicController::class, 'deleteTask'])->name('music.action-plan.tasks.delete');
    
    // Service Team / Generation Routes
    Route::prefix('teams')->group(function () {
        // Generation
        Route::post('/generate', [MusicController::class, 'generateBalancedGroups'])->name('music.teams.generate');
        
        // Details
        Route::get('/{id}/details', [MusicController::class, 'getGenerationDetails'])->name('music.teams.details');
        
        // Export single generation
        Route::get('/{id}/export', [MusicController::class, 'exportGeneration'])->name('music.teams.export');
        
        // Export all generations
        Route::get('/export-all', [MusicController::class, 'exportAllGenerations'])->name('music.teams.export-all');
        
        // Restore generation
        Route::post('/{id}/restore', [MusicController::class, 'restoreGeneration'])->name('music.teams.restore');
        
        // Delete generation
        Route::delete('/{id}', [MusicController::class, 'deleteServiceTeam'])->name('music.teams.delete');
    });
    
    // Singer settings update
    Route::post('/singers/update-settings', [SingerController::class, 'updateSettings'])->name('music.singers.update-settings');
    
    // Landing Page Content Routes
    Route::prefix('landing')->group(function () {
        // YouTube Videos
        Route::post('/youtube', [MusicController::class, 'storeYouTubeVideo'])->name('music.landing.youtube.store');
        Route::put('/youtube/{id}', [MusicController::class, 'updateYouTubeVideo'])->name('music.landing.youtube.update');
        Route::get('/youtube/{id}/edit', [MusicController::class, 'editYouTubeVideo'])->name('music.landing.youtube.edit');
        Route::delete('/youtube/{id}', [MusicController::class, 'deleteYouTubeVideo'])->name('music.landing.youtube.delete');
        Route::post('/youtube/{id}/toggle-publish', [MusicController::class, 'toggleYouTubePublish'])->name('music.landing.youtube.toggle-publish');
        
        // Featured Images
        Route::post('/featured', [MusicController::class, 'storeFeaturedImage'])->name('music.landing.featured.store');
        Route::post('/featured/{id}', [MusicController::class, 'updateFeaturedImage'])->name('music.landing.featured.update');
        Route::get('/featured/{id}/edit', [MusicController::class, 'editFeaturedImage'])->name('music.landing.featured.edit');
        Route::delete('/featured/{id}', [MusicController::class, 'deleteFeaturedImage'])->name('music.landing.featured.delete');
        Route::post('/featured/{id}/toggle-publish', [MusicController::class, 'toggleFeaturedPublish'])->name('music.landing.featured.toggle-publish');
        Route::post('/featured/{id}/toggle-hero', [MusicController::class, 'toggleFeaturedHero'])->name('music.landing.featured.toggle-hero');
        
        // Update order
        Route::post('/update-order', [MusicController::class, 'updateLandingOrder'])->name('music.landing.update-order');
    });
});

Route::get('/debug/singers', function() {
    $singers = \App\Models\User\User::where('is_singer', true)
        ->select('id', 'name', 'email', 'membership_type', 'voice_part', 'singer_level')
        ->get();
    
    return response()->json([
        'total' => $singers->count(),
        'permanent' => $singers->where('membership_type', 'Permanent')->count(),
        'other_types' => $singers->groupBy('membership_type')->map->count(),
        'sample' => $singers->first()
    ]);
})->middleware('auth');
