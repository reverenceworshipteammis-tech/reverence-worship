<?php

namespace App\Http\Controllers;

use App\Models\PublicBoard;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class LandingPageController extends Controller
{
    public function index()
    {
        $landingData = Cache::remember('landing_page_payload', now()->addHours(12), function () {
            $videos = Schema::hasTable('landing_youtube_videos')
                ? DB::table('landing_youtube_videos')
                    ->where('is_published', true)
                    ->orderBy('sort_order')
                    ->get()
                : collect();

            $pictures = Schema::hasTable('landing_featured_images')
                ? (Schema::hasColumn('landing_featured_images', 'is_hero')
                    ? DB::table('landing_featured_images')
                        ->select('*', 'is_hero')
                        ->where('is_published', true)
                        ->orderBy('sort_order')
                        ->get()
                    : DB::table('landing_featured_images')
                        ->select('*', DB::raw('false as is_hero'))
                        ->where('is_published', true)
                        ->orderBy('sort_order')
                        ->get())
                : collect();

            $events = collect();
            if (Schema::hasTable('public_board')) {
                $eventQuery = PublicBoard::with('creator');
                if (Schema::hasColumn('public_board', 'is_published')) {
                    $eventQuery->where('is_published', true);
                }
                $events = $eventQuery->orderByDesc('is_pinned')
                    ->orderByRaw('CASE WHEN event_date IS NULL THEN 1 ELSE 0 END')
                    ->orderBy('event_date')
                    ->orderByDesc('created_at')
                    ->take(6)
                    ->get();
            }

            return [
                'videos' => $videos,
                'pictures' => $pictures,
                'events' => $events,
            ];
        });

        $videos = $landingData['videos'];
        $pictures = $landingData['pictures'];
        $events = $landingData['events'];
        $heroPictures = $pictures->where('is_hero', true)->values();

        return view('landing', compact('videos', 'pictures', 'heroPictures', 'events'));
    }
}
