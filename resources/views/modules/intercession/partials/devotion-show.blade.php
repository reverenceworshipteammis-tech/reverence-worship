@extends('layouts.app')

@section('title', $devotion->title ?? 'Devotion')

@section('content')
<div class="max-w-4xl mx-auto py-8">
    <div class="bg-white rounded-xl shadow-md overflow-hidden">
        <!-- Header Image or Decoration -->
        <div class="h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
        
        <div class="p-8">
            <!-- Back Button -->
            <div class="mb-6">
                <a href="{{ route('intercession.index') }}" class="text-blue-600 hover:text-blue-800 flex items-center gap-2">
                    <i class="fas fa-arrow-left"></i> Back to Devotions
                </a>
            </div>
            
            <!-- Devotion Content -->
            <div class="text-center mb-6">
                <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                    <i class="fas fa-bible text-blue-600 text-2xl"></i>
                </div>
                <h1 class="text-3xl font-bold text-gray-800 mb-2">{{ $devotion->title ?? 'Devotion' }}</h1>
                <p class="text-gray-500">
                    <i class="fas fa-calendar-alt mr-2"></i>
                    {{ isset($devotion->date) ? \Carbon\Carbon::parse($devotion->date)->format('l, F j, Y') : 'Date not set' }}
                </p>
            </div>
            
            <!-- Bible Verse -->
            @if(isset($devotion->bible_verse) && $devotion->bible_verse)
            <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg">
                <p class="text-blue-800 italic text-lg text-center">
                    "{{ $devotion->bible_verse }}"
                </p>
            </div>
            @endif
            
            <!-- Devotion Text - English -->
            <div class="prose max-w-none mb-8">
                <h3 class="text-lg font-semibold text-gray-700 mb-2">English</h3>
                <p class="text-gray-700 leading-relaxed whitespace-pre-line">{{ $devotion->content ?? 'Content not available' }}</p>
                
                <!-- Kinyarwanda Version - Only show if content exists -->
                @if(isset($devotion->content_rw) && !empty($devotion->content_rw))
                <div class="mt-6 pt-4 border-t">
                    <h3 class="text-lg font-semibold text-gray-700 mb-2">Ikinyarwanda</h3>
                    <p class="text-gray-700 leading-relaxed whitespace-pre-line">{{ $devotion->content_rw }}</p>
                </div>
                @endif
            </div>
            
            <!-- Action Buttons -->
            <div class="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t">
                <div>
                    @if(isset($hasCompleted) && $hasCompleted)
                        <div class="bg-green-100 text-green-700 px-4 py-2 rounded-lg inline-flex items-center gap-2">
                            <i class="fas fa-check-circle"></i>
                            <span>You've completed this devotion</span>
                        </div>
                    @else
                        <form action="{{ route('intercession.devotion.complete', $devotion->id) }}" method="POST" class="inline">
                            @csrf
                            <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium inline-flex items-center gap-2 transition">
                                <i class="fas fa-check"></i> Mark as Read & Completed
                            </button>
                        </form>
                    @endif
                </div>
                
                <!-- Share Buttons -->
                <div class="flex gap-2">
                    <button onclick="shareDevotion('facebook')" class="bg-blue-800 hover:bg-blue-900 text-white w-10 h-10 rounded-full flex items-center justify-center transition">
                        <i class="fab fa-facebook-f"></i>
                    </button>
                    <button onclick="shareDevotion('twitter')" class="bg-sky-500 hover:bg-sky-600 text-white w-10 h-10 rounded-full flex items-center justify-center transition">
                        <i class="fab fa-twitter"></i>
                    </button>
                    <button onclick="shareDevotion('whatsapp')" class="bg-green-500 hover:bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center transition">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                    <button onclick="copyLink()" class="bg-gray-500 hover:bg-gray-600 text-white w-10 h-10 rounded-full flex items-center justify-center transition">
                        <i class="fas fa-link"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Prayer Request Section -->
    <div class="bg-white rounded-xl shadow-md p-6 mt-6">
        <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <i class="fas fa-pray text-purple-600"></i>
            </div>
            <h3 class="text-lg font-bold text-gray-800">Prayer Request</h3>
        </div>
        <p class="text-gray-600 mb-4">How can we pray for you today?</p>
        <form id="prayerRequestForm" onsubmit="submitPrayerRequest(event)">
            @csrf
            <input type="hidden" name="devotion_id" value="{{ $devotion->id }}">
            <textarea name="prayer_request" id="prayer_request" rows="3" 
                      placeholder="Share your prayer request..." 
                      class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 mb-3"></textarea>
            <button type="submit" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition">
                Submit Prayer Request
            </button>
        </form>
    </div>
</div>

<script>
function shareDevotion(platform) {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent('{{ $devotion->title ?? "Devotion" }}');
    
    let shareUrl = '';
    switch(platform) {
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
            break;
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?text=${title}&url=${url}`;
            break;
        case 'whatsapp':
            shareUrl = `https://wa.me/?text=${title}%20${url}`;
            break;
    }
    
    if (shareUrl) {
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }
}

function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        appAlert('Link copied to clipboard!');
    });
}

function submitPrayerRequest(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    
    fetch('{{ route("intercession.prayer.store") }}', {
        method: 'POST',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            appAlert('Prayer request submitted successfully!');
            event.target.reset();
        } else {
            appAlert('Error submitting prayer request: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('Error submitting prayer request');
    });
}
</script>
@endsection
