<?php

namespace App\Http\Controllers\Music;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\ManagesActionPlans;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Music\Playlist;
use App\Models\Music\Song;
use App\Models\Music\PlaylistSong;
use App\Models\User\User;
use App\Models\ActivityLog;
use App\Models\Music\Gallery;
use App\Models\Music\WorshipGroup;
use App\Models\PublicBoard;
use App\Models\ActionPlan;
use App\Models\Music\ServiceTeam;
use App\Models\Music\TeamMember;
use Illuminate\Support\Facades\Schema;



class MusicController extends Controller
{
    use ManagesActionPlans;

    protected ?string $actionPlanDepartment = 'music-ministry';

    protected function actionPlanView(): string
    {
        return 'modules.music.actionplan';
    }

    protected function actionPlanCanManage(): bool
    {
        return auth()->user()?->canAccess('music-ministry', 'manage-actionplan') ?? false;
    }

    // ==================== MAIN INDEX ====================
   public function index()
{
    if (!auth()->user()->canAccess('music-ministry', 'access')) {
        abort(403, 'You do not have permission to access this page.');
    }
    
    $playlists = Playlist::with('songs')->orderBy('created_at', 'desc')->get();
    $songs = Song::orderBy('title')->get();
    
    // CHANGE THIS: Use membership_type instead of is_singer
    $singers = User::where('membership_type', 'Permanent')
        ->where('is_active', true)
        ->orderBy('name')
        ->get();
    
    $gallery = Gallery::orderBy('created_at', 'desc')->get();
    $groups = WorshipGroup::with('leader', 'members')->get();
    $posts = PublicBoard::with('creator')->orderBy('is_pinned', 'desc')->orderBy('created_at', 'desc')->get();
    $tasks = ActionPlan::with('assignedUser', 'creator')->orderBy('due_date')->get();
    $users = User::where('is_active', true)->get();
    $serviceTeams = ServiceTeam::with('members.user')->orderBy('created_at', 'desc')->get();
    $generations = ServiceTeam::with('members.user')->orderBy('created_at', 'desc')->get();
    $voiceParts = ['Soprano', 'Alto', 'Tenor', 'Bass', 'Musician'];
    $performanceLevels = ['Normal', 'Good'];
    $youtubeVideos = DB::table('landing_youtube_videos')
        ->orderBy('sort_order')
        ->get();
    
    $featuredImages = Schema::hasTable('landing_featured_images')
        ? (Schema::hasColumn('landing_featured_images', 'is_hero')
            ? DB::table('landing_featured_images')
                ->select('*', 'is_hero')
                ->orderBy('sort_order')
                ->get()
            : DB::table('landing_featured_images')
                ->select('*', DB::raw('false as is_hero'))
                ->orderBy('sort_order')
                ->get())
        : collect();

    return view('modules.music.index', compact('playlists', 'songs', 'singers', 'gallery', 'groups', 'posts', 'tasks', 'users', 'serviceTeams', 'generations', 'voiceParts', 'performanceLevels','youtubeVideos', 'featuredImages'));
}

    // ==================== PLAYLIST METHODS ====================
    
    public function storePlaylist(Request $request)
    {
        if (!auth()->user()->canAccess('music-ministry', 'add-playlists')) {
            abort(403, 'You do not have permission to create playlists.');
        }
        
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'songs' => 'array'
        ]);
        
        $playlist = Playlist::create([
            'title' => $request->title,
            'description' => $request->description,
            'created_by' => auth()->id()
        ]);
        
        $songsAdded = 0;
        
        if ($request->has('songs')) {
            foreach ($request->songs as $index => $songId) {
                PlaylistSong::create([
                    'playlist_id' => $playlist->id,
                    'song_id' => $songId,
                    'display_order' => $index + 1
                ]);
                $songsAdded++;
            }
        }
        
        if ($request->ajax()) {
            return response()->json(['success' => true, 'songs_added' => $songsAdded]);
        }
        
        return redirect()->back()->with('success', 'Playlist created with ' . $songsAdded . ' songs!');
    }
    
    public function editPlaylist($id)
    {
        $playlist = Playlist::with('songs')->findOrFail($id);
        $songs = Song::orderBy('title')->get();
        $playlistSongIds = $playlist->songs->pluck('id')->toArray();
        
        return view('modules.music.edit-playlist', compact('playlist', 'songs', 'playlistSongIds'));
    }
    
    public function updatePlaylistSongs(Request $request, $id)
    {
        $playlist = Playlist::findOrFail($id);
        
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'songs' => 'array'
        ]);
        
        $playlist->title = $request->title;
        $playlist->description = $request->description;
        $playlist->save();
        
        PlaylistSong::where('playlist_id', $id)->delete();
        
        if ($request->has('songs')) {
            foreach ($request->songs as $index => $songId) {
                PlaylistSong::create([
                    'playlist_id' => $id,
                    'song_id' => $songId,
                    'display_order' => $index + 1
                ]);
            }
        }
        
        return redirect()->route('music.index')->with('success', 'Playlist updated successfully!');
    }
    
    public function deletePlaylist($id)
    {
        $playlist = Playlist::findOrFail($id);
        $playlist->delete();
        
        return redirect()->back()->with('success', 'Playlist deleted!');
    }
    
    public function getPlaylistSongs($id)
    {
        try {
            $playlist = Playlist::with('songs')->findOrFail($id);
            
            $songsData = $playlist->songs->map(function($song) {
                return [
                    'id' => $song->id,
                    'title' => $song->title,
                    'artist' => $song->artist ?? '',
                    'key_signature' => $song->key_signature ?? '',
                    'tempo' => $song->tempo ?? '',
                    'assigned_singer' => $song->assigned_singer ?? '',
                    'lyrics' => $song->lyrics ?? ''
                ];
            });
            
            return response()->json([
                'success' => true,
                'playlist_title' => $playlist->title,
                'songs' => $songsData
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // ==================== SONG METHODS ====================
    
    public function storeSong(Request $request)
    {
        if (!auth()->user()->canAccess('music-ministry', 'add-songs')) {
            abort(403, 'You do not have permission to add songs.');
        }
        
        $request->validate([
            'title' => 'required|string|max:255',
            'artist' => 'nullable|string|max:255',
            'key_signature' => 'nullable|string|max:10',
            'tempo' => 'nullable|integer',
            'lyrics' => 'nullable|string',
            'youtube_link' => 'nullable|url',
            'assigned_singer' => 'nullable|string|max:255'
        ]);
        
        $song = Song::create([
            'title' => $request->title,
            'artist' => $request->artist,
            'key_signature' => $request->key_signature,
            'tempo' => $request->tempo,
            'lyrics' => $request->lyrics,
            'youtube_link' => $request->youtube_link,
            'assigned_singer' => $request->assigned_singer,
            'created_by' => auth()->id()
        ]);
        
        if ($request->ajax()) {
            return response()->json(['success' => true]);
        }
        
        return redirect()->back()->with('success', 'Song added successfully!');
    }
    
    public function editSong($id)
    {
        $song = Song::findOrFail($id);
        return view('modules.music.edit-song', compact('song'));
    }
    
    public function updateSong(Request $request, $id)
    {
        $song = Song::findOrFail($id);
        
        $request->validate([
            'title' => 'required|string|max:255',
            'artist' => 'nullable|string|max:255',
            'key_signature' => 'nullable|string|max:10',
            'tempo' => 'nullable|integer',
            'lyrics' => 'nullable|string',
            'youtube_link' => 'nullable|url',
            'assigned_singer' => 'nullable|string|max:255'
        ]);
        
        $song->update($request->all());
        
        return redirect()->route('music.index')->with('success', 'Song updated successfully!');
    }
    
    public function deleteSong($id)
    {
        $song = Song::findOrFail($id);
        $song->delete();
        
        return redirect()->back()->with('success', 'Song deleted!');
    }
    
    public function viewLyrics($id)
    {
        $song = Song::findOrFail($id);
        return view('modules.music.lyrics-modal', compact('song'));
    }
    
    public function addToPlaylist(Request $request)
    {
        $request->validate([
            'playlist_id' => 'required|exists:playlists,id',
            'song_id' => 'required|exists:songs,id'
        ]);
        
        $exists = PlaylistSong::where('playlist_id', $request->playlist_id)
            ->where('song_id', $request->song_id)
            ->exists();
        
        if (!$exists) {
            $maxOrder = PlaylistSong::where('playlist_id', $request->playlist_id)->max('display_order') ?? 0;
            PlaylistSong::create([
                'playlist_id' => $request->playlist_id,
                'song_id' => $request->song_id,
                'display_order' => $maxOrder + 1
            ]);
        }
        
        return response()->json(['success' => true]);
    }

    // ==================== SINGER METHODS ====================
    
    public function updateVoicePart(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $user->voice_part = $request->voice_part;
        $user->save();
        
        return response()->json(['success' => true]);
    }
    
    public function updatePerformanceLevel(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $user->singer_level = $request->performance_level;
        $user->save();
        
        return response()->json(['success' => true]);
    }
    
   public function updateSingerSettings(Request $request)
{
    try {
        $user = User::findOrFail($request->user_id);
        
        if ($request->field === 'voice_part') {
            $user->voice_part = $request->value;
        } elseif ($request->field === 'singer_level') {
            $user->singer_level = $request->value;
        }
        $user->save();
        
        return response()->json(['success' => true]);
    } catch (\Illuminate\Validation\ValidationException $e) {
        return response()->json([
            'success' => false,
            'message' => collect($e->errors())->flatten()->first(),
            'errors' => $e->errors(),
        ], 422);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

    
    
    

    // ==================== GROUPS METHODS ====================
    
    public function storeGroup(Request $request)
    {
        if (!auth()->user()->canAccess('music-ministry', 'add-groups')) {
            abort(403, 'You do not have permission to create groups.');
        }
        
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'leader_id' => 'nullable|exists:users,id'
        ]);
        
        WorshipGroup::create([
            'name' => $request->name,
            'description' => $request->description,
            'leader_id' => $request->leader_id,
            'created_by' => auth()->id()
        ]);
        
        return redirect()->back()->with('success', 'Group created successfully!');
    }
    /**
 * Export all generations to CSV
 */
public function exportAllGenerations()
{
    try {
        $generations = ServiceTeam::with('members.user')
            ->orderBy('created_at', 'desc')
            ->get();
        
        if ($generations->isEmpty()) {
            if (request()->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No generations to export.'
                ]);
            }
            return redirect()->back()->with('error', 'No generations to export.');
        }
        
        $filename = 'all_generations_' . date('Y-m-d_His') . '.csv';
        $handle = fopen('php://temp', 'w+');
        
        // Add UTF-8 BOM for Excel compatibility
        fwrite($handle, "\xEF\xBB\xBF");
        
        // Headers
        fputcsv($handle, [
            'Generation ID',
            'Service Name',
            'Service Date',
            'Generated At',
            'Team',
            'Name',
            'Email',
            'Voice Part',
            'Performance Level'
        ]);
        
        // Data
        foreach ($generations as $gen) {
            $teams = $gen->members->groupBy('team_number');
            foreach ($teams as $teamNum => $members) {
                $teamLetter = chr(64 + $teamNum);
                foreach ($members as $member) {
                    fputcsv($handle, [
                        $gen->id,
                        $gen->service_name,
                        $gen->service_date ?? 'Not set',
                        $gen->created_at->format('Y-m-d H:i:s'),
                        'Service ' . $teamLetter,
                        $member->user->name,
                        $member->user->email,
                        $member->voice_part,
                        $member->performance_level
                    ]);
                }
            }
        }
        
        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);
        
        return response($csv, 200)
            ->header('Content-Type', 'text/csv; charset=UTF-8')
            ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
        
    } catch (\Illuminate\Validation\ValidationException $e) {
        return response()->json([
            'success' => false,
            'message' => collect($e->errors())->flatten()->first(),
            'errors' => $e->errors(),
        ], 422);
    } catch (\Exception $e) {
        \Log::error('Export all generations error: ' . $e->getMessage());
        if (request()->ajax()) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ]);
        }
        return redirect()->back()->with('error', 'Error exporting: ' . $e->getMessage());
    }
}
    
    public function deleteGroup($id)
    {
        $group = WorshipGroup::findOrFail($id);
        $group->delete();
        
        return redirect()->back()->with('success', 'Group deleted successfully!');
    }

    // ==================== PUBLIC BOARD METHODS ====================
    
public function storeBoardPost(Request $request)
{
    if (!auth()->user()->canAccess('music-ministry', 'add-board')) {
        abort(403, 'You do not have permission to create posts.');
    }
    
    $validated = $request->validate([
        'title' => 'required|string|max:255',
        'content' => 'required|string',
        'type' => 'required|in:event,update',
        'event_date' => 'nullable|required_if:type,event|date',
        'is_published' => 'nullable|boolean',
    ]);
    
    $post = PublicBoard::create([
        'title' => $validated['title'],
        'content' => $validated['content'],
        'type' => $validated['type'],
        'event_date' => $validated['event_date'] ?? null,
        'is_published' => $request->boolean('is_published'),
        'is_pinned' => $request->boolean('is_pinned'),
        'created_by' => auth()->id()
    ]);

    return response()->json(['success' => true, 'message' => 'Board item created.', 'item' => $post], 201);
}

    public function editBoardPost($id)
    {
        if (!auth()->user()->canAccess('music-ministry', 'add-board')) {
            abort(403);
        }

        return response()->json(['success' => true, 'item' => PublicBoard::findOrFail($id)]);
    }

    public function updateBoardPost(Request $request, $id)
    {
        if (!auth()->user()->canAccess('music-ministry', 'add-board')) {
            abort(403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'type' => 'required|in:event,update',
            'event_date' => 'nullable|required_if:type,event|date',
            'is_published' => 'nullable|boolean',
            'is_pinned' => 'nullable|boolean',
        ]);

        $item = PublicBoard::findOrFail($id);
        $item->update([
            'title' => $validated['title'],
            'content' => $validated['content'],
            'type' => $validated['type'],
            'event_date' => $validated['event_date'] ?? null,
            'is_published' => $request->boolean('is_published'),
            'is_pinned' => $request->boolean('is_pinned'),
        ]);

        return response()->json(['success' => true, 'message' => 'Board item updated.', 'item' => $item]);
    }

    public function togglePublishBoard($id)
    {
        if (!auth()->user()->canAccess('music-ministry', 'add-board')) {
            abort(403);
        }

        $item = PublicBoard::findOrFail($id);
        $item->update(['is_published' => !$item->is_published]);

        return response()->json(['success' => true, 'is_published' => $item->is_published]);
    }
    
    public function togglePinBoard($id)
    {
        if (!auth()->user()->canAccess('music-ministry', 'add-board')) {
            abort(403);
        }
        $post = PublicBoard::findOrFail($id);
        $post->is_pinned = !$post->is_pinned;
        $post->save();
        
        return response()->json(['success' => true, 'is_pinned' => $post->is_pinned]);
    }
    
    public function deleteBoardPost($id)
    {
        if (!auth()->user()->canAccess('music-ministry', 'add-board')) {
            abort(403);
        }
        $post = PublicBoard::findOrFail($id);
        $post->delete();
        
        return response()->json(['success' => true, 'message' => 'Board item deleted.']);
    }

    // ==================== ACTION PLAN METHODS ====================
    
    public function storeActionPlan(Request $request)
    {
        return $this->actionPlanStore($request);
    }

    public function editActionPlan($id)
    {
        return $this->actionPlanEdit($id);
    }

    public function updateActionPlan(Request $request, $id)
    {
        return $this->actionPlanUpdate($request, $id);
    }
    
    public function updateActionPlanStatus(Request $request, $id)
    {
        return $this->actionPlanUpdateStatus($request, $id);
    }
    
    public function deleteActionPlan($id)
    {
        return $this->actionPlanDestroy($id);
    }

    public function addTask(Request $request, $planId)
    {
        return $this->actionPlanAddTask($request, $planId);
    }

    public function updateTask(Request $request, $taskId)
    {
        return $this->actionPlanUpdateTask($request, $taskId);
    }

    public function deleteTask($taskId)
    {
        return $this->actionPlanDeleteTask($taskId);
    }

    // ==================== SERVICE TEAM GENERATOR METHODS ====================
    
public function generateBalancedGroups(Request $request)
{
    try {
        $request->validate([
            'service_name' => 'required|string|max:255',
            'service_date' => 'required|date',
            'number_of_teams' => 'required|integer|min:1|max:10'
        ]);
        
        // Get all singers
        $allSingers = User::where('membership_type', 'Permanent')
            ->whereNotNull('voice_part')
            ->whereNotNull('singer_level')
            ->get();
        
        $totalSingers = $allSingers->count();
        $numTeams = $request->number_of_teams;
        
        if ($totalSingers == 0) {
            return response()->json([
                'success' => false,
                'message' => 'No singers found.'
            ]);
        }
        
        // Group singers by voice part and level
        $groupedByVoice = [];
        foreach ($allSingers as $singer) {
            $voice = $singer->voice_part;
            if (!isset($groupedByVoice[$voice])) {
                $groupedByVoice[$voice] = ['good' => [], 'normal' => []];
            }
            if ($singer->singer_level == 'Good') {
                $groupedByVoice[$voice]['good'][] = $singer;
            } else {
                $groupedByVoice[$voice]['normal'][] = $singer;
            }
        }
        
        // Shuffle each group for randomness
        foreach ($groupedByVoice as $voice => &$groups) {
            shuffle($groups['good']);
            shuffle($groups['normal']);
        }
        
        // Calculate target per team
        $targetPerTeam = ceil($totalSingers / $numTeams);
        $minPerTeam = floor($totalSingers / $numTeams);
        
        // Initialize teams
        $teams = [];
        for ($i = 1; $i <= $numTeams; $i++) {
            $teams[$i] = [];
        }
        
        $assignedIds = [];
        $voiceParts = array_keys($groupedByVoice);
        
        // Calculate how many of each voice part per team
        $voiceCounts = [];
        foreach ($voiceParts as $voice) {
            $totalForVoice = count($groupedByVoice[$voice]['good']) + count($groupedByVoice[$voice]['normal']);
            $voiceCounts[$voice] = [
                'target' => ceil($totalForVoice / $numTeams),
                'good_target' => ceil(count($groupedByVoice[$voice]['good']) / $numTeams),
                'normal_target' => ceil(count($groupedByVoice[$voice]['normal']) / $numTeams)
            ];
        }
        
        // Track current counts per team
        $teamVoiceCounts = [];
        $teamGoodCounts = [];
        $teamNormalCounts = [];
        for ($i = 1; $i <= $numTeams; $i++) {
            $teamVoiceCounts[$i] = [];
            $teamGoodCounts[$i] = 0;
            $teamNormalCounts[$i] = 0;
            foreach ($voiceParts as $voice) {
                $teamVoiceCounts[$i][$voice] = 0;
            }
        }
        
        // Distribute singers by voice part with priority to teams needing that voice
        foreach ($voiceParts as $voice) {
            $goodSingers = $groupedByVoice[$voice]['good'];
            $normalSingers = $groupedByVoice[$voice]['normal'];
            
            // Find teams with lowest count of this voice part
            $sortedTeams = range(1, $numTeams);
            usort($sortedTeams, function($a, $b) use ($teamVoiceCounts, $voice) {
                return $teamVoiceCounts[$a][$voice] - $teamVoiceCounts[$b][$voice];
            });
            
            // Distribute Good singers first
            $teamIndex = 0;
            foreach ($goodSingers as $singer) {
                $teamNum = $sortedTeams[$teamIndex % count($sortedTeams)];
                $teams[$teamNum][] = $singer;
                $assignedIds[] = $singer->id;
                $teamVoiceCounts[$teamNum][$voice]++;
                $teamGoodCounts[$teamNum]++;
                $teamIndex++;
            }
            
            // Resort teams for Normal singers
            usort($sortedTeams, function($a, $b) use ($teamVoiceCounts, $voice) {
                return $teamVoiceCounts[$a][$voice] - $teamVoiceCounts[$b][$voice];
            });
            
            // Distribute Normal singers
            $teamIndex = 0;
            foreach ($normalSingers as $singer) {
                $teamNum = $sortedTeams[$teamIndex % count($sortedTeams)];
                $teams[$teamNum][] = $singer;
                $assignedIds[] = $singer->id;
                $teamVoiceCounts[$teamNum][$voice]++;
                $teamNormalCounts[$teamNum]++;
                $teamIndex++;
            }
        }
        
        // Final balance pass - move singers to equalize team sizes
        for ($attempt = 0; $attempt < 10; $attempt++) {
            for ($i = 1; $i <= $numTeams; $i++) {
                for ($j = $i + 1; $j <= $numTeams; $j++) {
                    $sizeI = count($teams[$i]);
                    $sizeJ = count($teams[$j]);
                    
                    if (abs($sizeI - $sizeJ) > 1) {
                        if ($sizeI > $sizeJ && $sizeI > $minPerTeam) {
                            // Find a Normal singer to move (prefer moving Normal over Good)
                            $moved = null;
                            $moveIndex = null;
                            foreach ($teams[$i] as $index => $member) {
                                if ($member->singer_level == 'Normal') {
                                    $moved = $member;
                                    $moveIndex = $index;
                                    break;
                                }
                            }
                            // If no Normal, move Good
                            if (!$moved && count($teams[$i]) > 0) {
                                $moved = array_pop($teams[$i]);
                                $teams[$j][] = $moved;
                            } elseif ($moved) {
                                unset($teams[$i][$moveIndex]);
                                $teams[$i] = array_values($teams[$i]);
                                $teams[$j][] = $moved;
                            }
                        } elseif ($sizeJ > $sizeI && $sizeJ > $minPerTeam) {
                            $moved = null;
                            $moveIndex = null;
                            foreach ($teams[$j] as $index => $member) {
                                if ($member->singer_level == 'Normal') {
                                    $moved = $member;
                                    $moveIndex = $index;
                                    break;
                                }
                            }
                            if (!$moved && count($teams[$j]) > 0) {
                                $moved = array_pop($teams[$j]);
                                $teams[$i][] = $moved;
                            } elseif ($moved) {
                                unset($teams[$j][$moveIndex]);
                                $teams[$j] = array_values($teams[$j]);
                                $teams[$i][] = $moved;
                            }
                        }
                    }
                }
            }
        }
        
        // Verify no duplicates
        $finalAssigned = [];
        foreach ($teams as $team) {
            foreach ($team as $member) {
                if (in_array($member->id, $finalAssigned)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Duplicate detected: ' . $member->name
                    ], 500);
                }
                $finalAssigned[] = $member->id;
            }
        }
        
        // Sort each team by voice part
        $voicePriority = ['Soprano' => 1, 'Alto' => 2, 'Tenor' => 3, 'Bass' => 4, 'Musician' => 5];
        
        foreach ($teams as $teamNum => &$team) {
            usort($team, function($a, $b) use ($voicePriority) {
                return ($voicePriority[$a->voice_part] ?? 99) - ($voicePriority[$b->voice_part] ?? 99);
            });
        }
        
        // Save to database
        $serviceTeam = ServiceTeam::create([
            'service_name' => $request->service_name,
            'service_date' => $request->service_date,
            'number_of_teams' => $numTeams,
            'generated_at' => now(),
            'created_by' => auth()->id()
        ]);
        
        foreach ($teams as $teamNum => $members) {
            foreach ($members as $member) {
                TeamMember::create([
                    'service_team_id' => $serviceTeam->id,
                    'team_number' => $teamNum,
                    'user_id' => $member->id,
                    'voice_part' => $member->voice_part,
                    'performance_level' => $member->singer_level
                ]);
            }
        }
        
        // Prepare response
        $teamsData = [];
        foreach ($teams as $teamNum => $members) {
            $goodCount = 0;
            $normalCount = 0;
            $voiceCounts = [];
            
            foreach ($members as $member) {
                if ($member->singer_level == 'Good') $goodCount++;
                else $normalCount++;
                
                $voice = $member->voice_part;
                $voiceCounts[$voice] = ($voiceCounts[$voice] ?? 0) + 1;
            }
            
            $teamsData[] = [
                'team_number' => $teamNum,
                'member_count' => count($members),
                'good_count' => $goodCount,
                'normal_count' => $normalCount,
                'voice_counts' => $voiceCounts,
                'members' => array_map(function($member) {
                    return [
                        'name' => $member->name,
                        'voice_part' => $member->voice_part,
                        'performance_level' => $member->singer_level
                    ];
                }, $members)
            ];
        }
        
        return response()->json([
            'success' => true,
            'service_team_id' => $serviceTeam->id,
            'teams' => $teamsData,
            'total_singers' => $totalSingers,
            'target_per_team' => $targetPerTeam,
            'min_per_team' => $minPerTeam,
            'message' => "Successfully distributed {$totalSingers} singers into {$numTeams} teams"
        ]);
        
    } catch (\Exception $e) {
        \Log::error('Error generating groups: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Error: ' . $e->getMessage()
        ], 500);
    }
}
    // ==================== TEAM DETAILS METHODS ====================

public function getGenerationDetails($id)
{
    try {
        $generation = ServiceTeam::with('members.user')->findOrFail($id);
        $teams = $generation->members->groupBy('team_number');
        
        $teamsData = [];
        foreach ($teams as $teamNum => $members) {
            $teamsData[] = [
                'team_number' => $teamNum,
                'member_count' => $members->count(),
                'members' => $members->map(function($member) {
                    return [
                        'name' => $member->user->name,
                        'voice_part' => $member->voice_part,
                        'performance_level' => $member->performance_level
                    ];
                })->values()
            ];
        }
        
        // Sort teams by team_number
        usort($teamsData, function($a, $b) {
            return $a['team_number'] - $b['team_number'];
        });
        
        return response()->json([
            'success' => true,
            'service_name' => $generation->service_name,
            'service_date' => $generation->service_date,
            'number_of_teams' => $generation->number_of_teams,
            'teams' => $teamsData,
            'total_members' => $generation->members->count()
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => $e->getMessage()
        ], 500);
    }
}
    
   public function exportGeneration($id)
{
    try {
        $generation = ServiceTeam::with('members.user')->findOrFail($id);
        $teams = $generation->members->groupBy('team_number');
        
        $filename = 'groups_' . preg_replace('/[^a-zA-Z0-9]/', '_', $generation->service_name) . '_' . date('Y-m-d') . '.csv';
        
        $handle = fopen('php://temp', 'w+');
        
        // Add UTF-8 BOM for Excel compatibility
        fwrite($handle, "\xEF\xBB\xBF");
        
        // Headers
        fputcsv($handle, ['Team', 'Name', 'Email', 'Voice Part', 'Performance Level']);
        
        // Data
        foreach ($teams as $teamNum => $members) {
            foreach ($members as $member) {
                fputcsv($handle, [
                    'Service ' . chr(64 + $teamNum),
                    $member->user->name,
                    $member->user->email,
                    $member->voice_part,
                    $member->performance_level
                ]);
            }
        }
        
        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);
        
        return response($csv, 200)
            ->header('Content-Type', 'text/csv; charset=UTF-8')
            ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
        
    } catch (\Exception $e) {
        \Log::error('Export error: ' . $e->getMessage());
        return redirect()->back()->with('error', 'Error exporting: ' . $e->getMessage());
    }
}
    
  public function restoreGeneration($id)
{
    try {
        $oldGeneration = ServiceTeam::with('members')->findOrFail($id);
        
        $newGeneration = ServiceTeam::create([
            'service_name' => $oldGeneration->service_name . ' (Restored)',
            'service_date' => $oldGeneration->service_date,
            'number_of_teams' => $oldGeneration->number_of_teams,
            'generated_at' => now(),
            'created_by' => auth()->id()
        ]);
        
        foreach ($oldGeneration->members as $member) {
            TeamMember::create([
                'service_team_id' => $newGeneration->id,
                'team_number' => $member->team_number,
                'user_id' => $member->user_id,
                'voice_part' => $member->voice_part,
                'performance_level' => $member->performance_level
            ]);
        }
        
        return response()->json([
            'success' => true,
            'message' => 'Generation restored successfully!',
            'new_generation_id' => $newGeneration->id
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => $e->getMessage()
        ], 500);
    }
}
    
    public function deleteServiceTeam($id)
    {
        $team = ServiceTeam::findOrFail($id);
        $team->delete();
        
        return redirect()->back()->with('success', 'Service team deleted successfully!');
    }

   // ==================== GALLERY METHODS ====================

public function editGallery($id)
{
    try {
        $photo = Gallery::findOrFail($id);
        
        if (!auth()->user()->canAccess('music-ministry', 'edit-gallery')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }
        
        return response()->json([
            'success' => true,
            'photo' => $photo
        ]);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

public function updateGallery(Request $request, $id)
{
    try {
        if (!auth()->user()->canAccess('music-ministry', 'edit-gallery')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }
        
        $photo = Gallery::findOrFail($id);
        
        $photo->title = $request->title;
        $photo->description = $request->caption;
        $photo->category = $request->category;
        $photo->tags = $request->tags;
        $photo->save();
        
        return response()->json(['success' => true, 'message' => 'Photo updated successfully']);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

public function deleteGallery($id)
{
    try {
        if (!auth()->user()->canAccess('music-ministry', 'delete-gallery')) {
            if (request()->ajax()) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
            }
            abort(403, 'You do not have permission to delete photos.');
        }
        
        $photo = Gallery::findOrFail($id);
        
        // Delete the file from storage
        $filePath = public_path($photo->image_path);
        if (file_exists($filePath)) {
            unlink($filePath);
        }
        
        $photo->delete();
        
        if (request()->ajax()) {
            return response()->json(['success' => true, 'message' => 'Photo deleted successfully']);
        }
        
        return redirect()->back()->with('success', 'Photo deleted successfully');
    } catch (\Exception $e) {
        if (request()->ajax()) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
        return redirect()->back()->with('error', 'Error deleting photo: ' . $e->getMessage());
    }
}

public function storeGallery(Request $request)
{
    if (!auth()->user()->canAccess('music-ministry', 'add-gallery')) {
        abort(403, 'You do not have permission to upload photos.');
    }
    
    $request->validate([
        'images.*' => 'required|image|mimes:jpeg,png,jpg,gif|max:5120',
        'caption' => 'nullable|string',
    ]);
    
    $uploadedCount = 0;
    
    if ($request->hasFile('images')) {
        foreach ($request->file('images') as $image) {
            $filename = time() . '_' . uniqid() . '_' . $image->getClientOriginalName();
            $image->move(public_path('uploads/gallery'), $filename);
            $imagePath = 'uploads/gallery/' . $filename;
            $fallbackTitle = pathinfo($image->getClientOriginalName(), PATHINFO_FILENAME);
            $title = trim((string) $request->caption) !== '' ? trim((string) $request->caption) : $fallbackTitle;
            
            Gallery::create([
                'title' => $title,
                'image_path' => $imagePath,
                'description' => $request->caption,
                'event_date' => now(),
                'created_by' => auth()->id()
            ]);
            $uploadedCount++;
        }
    }
    
    if ($request->ajax()) {
        return response()->json(['success' => true, 'uploaded' => $uploadedCount]);
    }
    
    return redirect()->back()->with('success', $uploadedCount . ' photo(s) uploaded successfully!');
}


// ==================== LANDING PAGE CONTENT METHODS ====================

public function storeYouTubeVideo(Request $request)
{
    try {
        $request->validate([
            'title' => 'required|string|max:255',
            'youtube_id' => 'required|url|max:500'
        ]);

        $youtubeId = $this->extractYouTubeId($request->youtube_id);
        
        $maxOrder = DB::table('landing_youtube_videos')->max('sort_order') ?? 0;
        
        $id = DB::table('landing_youtube_videos')->insertGetId([
            'title' => $request->title,
            'youtube_id' => $youtubeId,
            'is_published' => $request->boolean('is_published'),
            'sort_order' => $maxOrder + 1,
            'created_by' => auth()->id(),
            'created_at' => now(),
            'updated_at' => now()
        ]);
        
        return response()->json(['success' => true, 'id' => $id]);
    } catch (\Illuminate\Validation\ValidationException $e) {
        return response()->json([
            'success' => false,
            'message' => collect($e->errors())->flatten()->first(),
            'errors' => $e->errors(),
        ], 422);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

public function updateYouTubeVideo(Request $request, $id)
{
    try {
        $request->validate([
            'title' => 'required|string|max:255',
            'youtube_id' => 'required|url|max:500'
        ]);

        $youtubeId = $this->extractYouTubeId($request->youtube_id);
        
        DB::table('landing_youtube_videos')->where('id', $id)->update([
            'title' => $request->title,
            'youtube_id' => $youtubeId,
            'is_published' => $request->boolean('is_published'),
            'updated_at' => now()
        ]);
        
        return response()->json(['success' => true]);
    } catch (\Illuminate\Validation\ValidationException $e) {
        return response()->json([
            'success' => false,
            'message' => collect($e->errors())->flatten()->first(),
            'errors' => $e->errors(),
        ], 422);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

public function editYouTubeVideo($id)
{
    try {
        $video = DB::table('landing_youtube_videos')->where('id', $id)->first();
        return response()->json(['success' => true, 'video' => $video]);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

public function deleteYouTubeVideo($id)
{
    try {
        DB::table('landing_youtube_videos')->where('id', $id)->delete();
        return response()->json(['success' => true]);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

public function toggleYouTubePublish($id)
{
    try {
        $video = DB::table('landing_youtube_videos')->where('id', $id)->first();
        DB::table('landing_youtube_videos')->where('id', $id)->update([
            'is_published' => !$video->is_published,
            'updated_at' => now()
        ]);
        return response()->json(['success' => true]);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

// Featured Image Methods
public function storeFeaturedImage(Request $request)
{
    try {
        $request->validate([
            'title' => 'required|string|max:255',
            'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:5120',
            'description' => 'nullable|string',
        ]);

        
        // Upload image
        $image = $request->file('image');
        $filename = time() . '_' . uniqid() . '_' . $image->getClientOriginalName();
        $image->move(public_path('uploads/landing'), $filename);
        $imagePath = 'uploads/landing/' . $filename;
        
        $maxOrder = DB::table('landing_featured_images')->max('sort_order') ?? 0;
        
        $id = DB::table('landing_featured_images')->insertGetId([
            'title' => $request->title,
            'image_path' => $imagePath,
            'description' => $request->description,
            'is_published' => $request->has('is_published'),
            'is_hero' => false,
            'sort_order' => $maxOrder + 1,
            'created_by' => auth()->id(),
            'created_at' => now(),
            'updated_at' => now()
        ]);
        
        return response()->json(['success' => true, 'id' => $id]);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

public function updateFeaturedImage(Request $request, $id)
{
    try {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        
        $updateData = [
            'title' => $request->title,
            'description' => $request->description,
            'is_published' => $request->has('is_published'),
            'updated_at' => now()
        ];

        if (!$request->has('is_published')) {
            $updateData['is_hero'] = false;
        }
        
        // Upload new image if provided
        if ($request->hasFile('image')) {
            $request->validate(['image' => 'image|mimes:jpeg,png,jpg,gif|max:5120']);
            
            // Delete old image
            $oldImage = DB::table('landing_featured_images')->where('id', $id)->first();
            if ($oldImage && file_exists(public_path($oldImage->image_path))) {
                unlink(public_path($oldImage->image_path));
            }
            
            $image = $request->file('image');
            $filename = time() . '_' . uniqid() . '_' . $image->getClientOriginalName();
            $image->move(public_path('uploads/landing'), $filename);
            $updateData['image_path'] = 'uploads/landing/' . $filename;
        }
        
        DB::table('landing_featured_images')->where('id', $id)->update($updateData);
        
        return response()->json(['success' => true]);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

public function editFeaturedImage($id)
{
    try {
        $image = DB::table('landing_featured_images')->where('id', $id)->first();
        return response()->json(['success' => true, 'image' => $image]);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

public function deleteFeaturedImage($id)
{
    try {
        $image = DB::table('landing_featured_images')->where('id', $id)->first();
        if ($image && file_exists(public_path($image->image_path))) {
            unlink(public_path($image->image_path));
        }
        DB::table('landing_featured_images')->where('id', $id)->delete();
        return response()->json(['success' => true]);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

public function toggleFeaturedPublish($id)
{
    try {
        $image = DB::table('landing_featured_images')->where('id', $id)->first();
        if (!$image) {
            return response()->json(['success' => false, 'message' => 'Image not found.'], 404);
        }

        $currentHero = property_exists($image, 'is_hero') ? (bool) $image->is_hero : false;
        $willPublish = !($image->is_published ?? false);
        DB::table('landing_featured_images')->where('id', $id)->update([
            'is_published' => $willPublish,
            'is_hero' => $willPublish ? $currentHero : false,
            'updated_at' => now()
        ]);
        return response()->json(['success' => true]);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

public function toggleFeaturedHero($id)
{
    try {
        $image = DB::table('landing_featured_images')->where('id', $id)->first();
        if (!$image) {
            return response()->json(['success' => false, 'message' => 'Image not found.'], 404);
        }

        $currentHero = property_exists($image, 'is_hero') ? (bool) $image->is_hero : false;
        $currentPublished = property_exists($image, 'is_published') ? (bool) $image->is_published : false;
        $nextHero = !$currentHero;

        DB::table('landing_featured_images')->where('id', $id)->update([
            'is_hero' => $nextHero,
            'is_published' => $nextHero ? true : $currentPublished,
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => $currentHero ? 'Image removed from hero.' : 'Image added to hero.',
        ]);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

public function updateLandingOrder(Request $request)
{
    try {
        $validated = $request->validate([
            'type' => 'required|in:youtube,featured',
            'orders' => 'required|array',
            'orders.*.id' => 'required|integer',
            'orders.*.sort_order' => 'required|integer|min:1',
        ]);
        $type = $validated['type'];
        $orders = $validated['orders'];
        
        $table = $type === 'youtube' ? 'landing_youtube_videos' : 'landing_featured_images';
        
        foreach ($orders as $order) {
            DB::table($table)->where('id', $order['id'])->update([
                'sort_order' => $order['sort_order'],
                'updated_at' => now()
            ]);
        }
        
        return response()->json(['success' => true]);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

private function extractYouTubeId(string $url): string
{
    $host = strtolower((string) parse_url($url, PHP_URL_HOST));
    $path = trim((string) parse_url($url, PHP_URL_PATH), '/');
    $videoId = null;

    if (in_array($host, ['youtu.be', 'www.youtu.be'], true)) {
        $videoId = explode('/', $path)[0] ?? null;
    } elseif (in_array($host, ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'], true)) {
        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);
        if (!empty($query['v'])) {
            $videoId = $query['v'];
        } elseif (preg_match('~^(?:shorts|embed|live)/([^/?]+)~', $path, $matches)) {
            $videoId = $matches[1];
        }
    }

    if (!$videoId || !preg_match('/^[A-Za-z0-9_-]{11}$/', $videoId)) {
        throw \Illuminate\Validation\ValidationException::withMessages([
            'youtube_id' => 'Enter a valid YouTube video link.',
        ]);
    }

    return $videoId;
}
}
