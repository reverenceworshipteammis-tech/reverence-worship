<?php

namespace App\Http\Controllers\Music;

use App\Http\Controllers\Controller;
use App\Models\Music\Song;
use App\Models\Music\PlaylistSong;
use Illuminate\Http\Request;

class SongController extends Controller
{
    public function store(Request $request)
    {
        if (!auth()->user()->canAccess('music-ministry', 'add-songs')) {
            abort(403);
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
    
    public function edit($id)
    {
        $song = Song::findOrFail($id);
        return view('modules.music.edit-song', compact('song'));
    }
    
    public function update(Request $request, $id)
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
    
    public function destroy($id)
    {
        $song = Song::findOrFail($id);
        $song->delete();
        
        return redirect()->back()->with('success', 'Song deleted!');
    }
    
    public function viewLyrics($id)
    {
        $song = Song::findOrFail($id);

        if (request()->expectsJson() || request()->ajax()) {
            return response()->json([
                'success' => true,
                'song' => [
                    'id' => $song->id,
                    'title' => $song->title,
                    'artist' => $song->artist,
                    'key_signature' => $song->key_signature,
                    'tempo' => $song->tempo,
                    'assigned_singer' => $song->assigned_singer,
                    'youtube_link' => $song->youtube_link,
                    'lyrics' => $song->lyrics,
                ],
            ]);
        }

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
}
