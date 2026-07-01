<!DOCTYPE html>
<html>
<head>
    <title>{{ $song->title }} - Lyrics</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gray-100 p-8">
    <div class="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <div class="flex justify-between items-center mb-4 border-b pb-3">
            <h1 class="text-2xl font-bold text-gray-800">{{ $song->title }}</h1>
            <button onclick="window.close()" class="text-gray-500 hover:text-gray-700">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        
        <div class="space-y-2 mb-4">
            <p><strong>Artist:</strong> {{ $song->artist ?? 'Unknown' }}</p>
            <p><strong>Key:</strong> {{ $song->key_signature ?? '-' }}</p>
            <p><strong>Tempo:</strong> {{ $song->tempo ?? '-' }} BPM</p>
            <p><strong>Singer:</strong> {{ $song->assigned_singer ?? 'Not assigned' }}</p>
            @if($song->youtube_link)
                <p><strong>YouTube:</strong> <a href="{{ $song->youtube_link }}" target="_blank" class="text-blue-600">Watch Video</a></p>
            @endif
        </div>
        
        <div class="border-t pt-4">
            <div class="flex justify-between items-center mb-3">
                <h3 class="font-bold text-lg">Lyrics</h3>
                <button onclick="copyLyrics()" 
                        class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition">
                    <i class="fas fa-copy"></i> Copy Lyrics
                </button>
            </div>
            <div id="lyricsContent" class="prose max-w-none">
                <pre id="lyricsText" class="whitespace-pre-wrap font-sans text-gray-700">{{ $song->lyrics ?? 'No lyrics available.' }}</pre>
            </div>
        </div>
    </div>

    <script>
        function copyLyrics() {
            const lyricsText = document.getElementById('lyricsText');
            const textToCopy = lyricsText.innerText || lyricsText.textContent;
            
            if (!textToCopy || textToCopy === 'No lyrics available.') {
                appAlert('No lyrics to copy!');
                return;
            }
            
            // Modern approach
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(textToCopy)
                    .then(function() {
                        showCopySuccess();
                    })
                    .catch(function(err) {
                        console.error('Failed to copy: ', err);
                        fallbackCopyText(textToCopy);
                    });
            } else {
                fallbackCopyText(textToCopy);
            }
        }
        
        function fallbackCopyText(text) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.top = '0';
            textarea.style.left = '0';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            
            try {
                document.execCommand('copy');
                showCopySuccess();
            } catch (err) {
                console.error('Fallback: Oops, unable to copy', err);
                appAlert('Failed to copy lyrics. Please select and copy manually.');
            }
            
            document.body.removeChild(textarea);
        }
        
        function showCopySuccess() {
            const copyBtn = document.querySelector('button[onclick="copyLyrics()"]');
            const originalHtml = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            copyBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            copyBtn.classList.add('bg-green-600');
            
            setTimeout(function() {
                copyBtn.innerHTML = originalHtml;
                copyBtn.classList.remove('bg-green-600');
                copyBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
            }, 2000);
        }
    </script>
</body>
</html>
