@extends('layouts.app')

@section('title', 'Form Submissions')
@section('page-title', 'Form Submissions')

@section('content')
<div class="max-w-7xl mx-auto py-6">
    <div class="bg-white rounded-xl shadow-md overflow-hidden">
        
        <!-- Header -->
        <div class="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-5">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <a href="{{ route('intercession.index') }}" class="text-white/80 hover:text-white transition flex items-center gap-2 text-sm mb-2">
                        <i class="fas fa-arrow-left"></i> Back to Forms
                    </a>
                    <h1 class="text-2xl font-bold text-white">{{ $form->title }}</h1>
                    <p class="text-indigo-100 text-sm mt-1">Manage Submissions</p>
                </div>
                <div class="flex items-center gap-3">
                    <span class="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
                        <i class="fas fa-users mr-1"></i> {{ count($submissions) }} Responses
                    </span>
                </div>
            </div>
        </div>
        
        @php
            // Get settings
            $settings = json_decode($form->settings, true) ?? [];
            $isQuiz = $settings['is_quiz'] ?? false;
            $releaseGrade = $settings['release_grade'] ?? 'immediately';
            $allowExport = $settings['allow_export'] ?? true;
            $includeTimestamps = $settings['include_timestamps'] ?? true;
            
            // Ensure $questions is defined
            if (!isset($questions) || !$questions) {
                $questions = json_decode($form->questions, true) ?? [];
            }
            
            // Calculate total points for this form
            $formTotalPoints = 0;
            if (is_array($questions)) {
                foreach($questions as $q) {
                    $qType = $q['type'] ?? 'short_answer';
                    if ($qType != 'title_section' && $qType != 'section_break') {
                        $formTotalPoints += isset($q['points']) ? (int)$q['points'] : 1;
                    }
                }
            }
            if ($formTotalPoints == 0) {
                $formTotalPoints = 1;
            }
            
            // For each submission, calculate earned points the same way as results page
            foreach($submissions as $sub) {
                // Decode the answers
                $answers = json_decode($sub->answers, true);
                $earned = 0;
                $allowPartialPoints = $settings['allow_partial_points'] ?? true;
                
                if ($answers && is_array($answers) && is_array($questions)) {
                    foreach($questions as $index => $question) {
                        $questionType = $question['type'] ?? 'short_answer';
                        
                        // Skip sections
                        if ($questionType == 'title_section' || $questionType == 'section_break') {
                            continue;
                        }
                        
                        $points = isset($question['points']) ? (int)$question['points'] : 1;
                        $answerKey = 'question_' . $index;
                        $answer = $answers[$answerKey] ?? null;
                        
                        // Calculate earned points for this question
                        if ($questionType == 'multiple_choice' || $questionType == 'dropdown') {
                            if (isset($question['correctAnswer']) && $question['correctAnswer'] !== '') {
                                if ($answer == $question['correctAnswer']) {
                                    $earned += $points;
                                }
                            }
                        } elseif ($questionType == 'checkboxes') {
                            if (isset($question['correctAnswers']) && is_array($question['correctAnswers']) && !empty($question['correctAnswers'])) {
                                $correctAnswers = $question['correctAnswers'];
                                $userAnswers = is_array($answer) ? $answer : [];
                                
                                if (!empty($userAnswers)) {
                                    $totalCorrect = count($correctAnswers);
                                    $correctSelected = 0;
                                    
                                    foreach ($userAnswers as $userAnswer) {
                                        if (in_array($userAnswer, $correctAnswers)) {
                                            $correctSelected++;
                                        }
                                    }
                                    
                                    if ($allowPartialPoints && $correctSelected > 0) {
                                        $earned += ($correctSelected / $totalCorrect) * $points;
                                    } elseif (!$allowPartialPoints && $correctSelected == $totalCorrect) {
                                        $earned += $points;
                                    }
                                }
                            }
                        } elseif ($questionType == 'short_answer' || $questionType == 'paragraph') {
                            if (isset($question['correctAnswer']) && $question['correctAnswer'] !== '') {
                                if (strtolower(trim($answer)) == strtolower(trim($question['correctAnswer']))) {
                                    $earned += $points;
                                }
                            }
                        } elseif ($questionType == 'date' || $questionType == 'time') {
                            if (isset($question['correctAnswer']) && $question['correctAnswer'] !== '') {
                                if ($answer == $question['correctAnswer']) {
                                    $earned += $points;
                                }
                            }
                        } elseif ($questionType == 'linear_scale' || $questionType == 'rating') {
                            if ($answer !== null && $answer !== '') {
                                $earned += $points;
                            }
                        } elseif ($questionType == 'multiple_choice_grid') {
                            if (isset($question['correctAnswers']) && is_array($question['correctAnswers'])) {
                                $rows = $question['rows'] ?? [];
                                $gridAnswers = is_array($answer) ? $answer : [];
                                
                                foreach ($rows as $rowIndex => $row) {
                                    $rowKey = 'question_' . $index . '_' . $rowIndex;
                                    $userRowAnswer = $gridAnswers[$rowKey] ?? null;
                                    $correctRowAnswer = $question['correctAnswers'][$rowIndex] ?? null;
                                    
                                    if ($correctRowAnswer !== null && $correctRowAnswer !== '') {
                                        if ($userRowAnswer == $correctRowAnswer) {
                                            $earned += $points / count($rows);
                                        }
                                    }
                                }
                            }
                        } elseif ($questionType == 'checkbox_grid') {
                            if (isset($question['correctAnswers']) && is_array($question['correctAnswers'])) {
                                $rows = $question['rows'] ?? [];
                                $gridAnswers = is_array($answer) ? $answer : [];
                                
                                foreach ($rows as $rowIndex => $row) {
                                    $rowKey = 'question_' . $index . '_' . $rowIndex;
                                    $userRowAnswers = isset($gridAnswers[$rowKey]) ? (array)$gridAnswers[$rowKey] : [];
                                    $correctRowAnswers = $question['correctAnswers'][$rowIndex] ?? [];
                                    
                                    if (!empty($correctRowAnswers) && !empty($userRowAnswers)) {
                                        $correctCount = 0;
                                        foreach ($correctRowAnswers as $correctAns) {
                                            if (in_array($correctAns, $userRowAnswers)) {
                                                $correctCount++;
                                            }
                                        }
                                        if ($allowPartialPoints && $correctCount > 0) {
                                            $earned += ($correctCount / count($correctRowAnswers)) * ($points / count($rows));
                                        } elseif (!$allowPartialPoints && $correctCount == count($correctRowAnswers)) {
                                            $earned += $points / count($rows);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Round to 2 decimal places
                $sub->earned_points = round($earned, 2);
                $sub->total_points = $formTotalPoints;
                
                // Check if submission is released
                $sub->is_released = isset($sub->released_at) || (isset($sub->is_released) && $sub->is_released);
            }
            
            // Count pending submissions
            $pendingCount = 0;
            foreach($submissions as $sub) {
                if (!$sub->is_released && $sub->score !== null) {
                    $pendingCount++;
                }
            }
            
            // Count released submissions
            $releasedCount = 0;
            foreach($submissions as $sub) {
                if ($sub->is_released && $sub->score !== null) {
                    $releasedCount++;
                }
            }
        @endphp
        
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-6 bg-gray-50 border-b">
            <div class="bg-white rounded-lg p-4 shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-file-alt text-blue-600"></i>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500">Total Submissions</p>
                        <p class="text-xl font-bold text-gray-800">{{ count($submissions) }}</p>
                    </div>
                </div>
            </div>
            
            @if($isQuiz && $releaseGrade == 'later')
            <div class="bg-white rounded-lg p-4 shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-clock text-yellow-600"></i>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500">Pending Release</p>
                        <p class="text-xl font-bold text-yellow-600">{{ $pendingCount }}</p>
                    </div>
                </div>
            </div>
            
            <div class="bg-white rounded-lg p-4 shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-check-circle text-green-600"></i>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500">Released</p>
                        <p class="text-xl font-bold text-green-600">{{ $releasedCount }}</p>
                    </div>
                </div>
            </div>
            @endif
            
            @if($isQuiz)
            <div class="bg-white rounded-lg p-4 shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-star text-green-600"></i>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500">Average Score</p>
                        <p class="text-xl font-bold text-gray-800">
                            @php
                                $totalScore = 0;
                                $countWithScore = 0;
                                foreach($submissions as $sub) {
                                    if ($sub->score !== null) {
                                        $totalScore += $sub->score;
                                        $countWithScore++;
                                    }
                                }
                                $avgScore = $countWithScore > 0 ? round($totalScore / $countWithScore, 1) : 0;
                            @endphp
                            {{ number_format($avgScore, 1) }}%
                        </p>
                    </div>
                </div>
            </div>
            
            <div class="bg-white rounded-lg p-4 shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-trophy text-purple-600"></i>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500">Highest Score</p>
                        <p class="text-xl font-bold text-gray-800">
                            @php
                                $highestScore = 0;
                                foreach($submissions as $sub) {
                                    if ($sub->score !== null && $sub->score > $highestScore) {
                                        $highestScore = $sub->score;
                                    }
                                }
                            @endphp
                            {{ number_format($highestScore, 1) }}%
                        </p>
                    </div>
                </div>
            </div>
            
            <div class="bg-white rounded-lg p-4 shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-cog text-indigo-600"></i>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-gray-800">
                            @if($releaseGrade == 'immediately')
                                <span class="text-green-600">Auto-graded</span>
                            @elseif($releaseGrade == 'later')
                                <span class="text-yellow-600">Pending Review</span>
                            @else
                                <span class="text-gray-600">Private</span>
                            @endif
                        </p>
                    </div>
                </div>
            </div>
            @endif
        </div>
        
        <!-- Filters -->
        <div class="p-4 border-b bg-white flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-2">
                <i class="fas fa-filter text-gray-400 text-sm"></i>
                <span class="text-sm text-gray-600">Filter:</span>
            </div>
            <select id="filterScore" class="text-sm border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" onchange="filterSubmissions()">
                <option value="all">All Scores</option>
                <option value="high">High (â‰¥ 80%)</option>
                <option value="medium">Medium (60-79%)</option>
                <option value="low">Low (40-59%)</option>
                <option value="fail">Fail (&lt; 40%)</option>
            </select>
            <select id="filterRelease" class="text-sm border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" onchange="filterSubmissions()">
                <option value="all">All Status</option>
                <option value="released">Released</option>
                <option value="pending">Pending Release</option>
            </select>
            <input type="text" id="searchInput" placeholder="Search by user..." class="text-sm border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" onkeyup="filterSubmissions()">
            <span class="text-xs text-gray-400 ml-auto" id="resultCount">Showing {{ count($submissions) }} results</span>
        </div>
        
        <!-- Bulk Actions -->
        @if($releaseGrade == 'later')
        <div class="p-4 border-b flex flex-wrap items-center justify-between gap-3 {{ $pendingCount > 0 ? 'bg-yellow-50' : 'bg-gray-50' }}">
            <div class="flex items-center gap-3">
                @if($pendingCount > 0)
                    <i class="fas fa-info-circle text-yellow-600"></i>
                    <span class="text-sm text-yellow-700">{{ $pendingCount }} submission(s) pending review</span>
                @else
                    <i class="fas fa-check-circle text-green-600"></i>
                    <span class="text-sm text-green-700">All submissions have been released</span>
                @endif
            </div>
            <div class="flex items-center gap-2">
                @if($pendingCount > 0)
                <button onclick="bulkRelease()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition text-sm flex items-center gap-2 shadow-sm hover:shadow-md">
                    <i class="fas fa-check-double"></i> Release All ({{ $pendingCount }})
                </button>
                @endif
                @if($releasedCount > 0)
                <button onclick="bulkUnrelease()" class="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition text-sm flex items-center gap-2 shadow-sm hover:shadow-md">
                    <i class="fas fa-undo"></i> Unrelease All ({{ $releasedCount }})
                </button>
                @endif
            </div>
        </div>
        @endif
        
        <!-- Table -->
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200" id="submissionsTable">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        @if($isQuiz)
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                        @endif
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($submissions as $index => $sub)
                    <tr class="border-t hover:bg-gray-50 transition submission-row" 
                        data-score="{{ $sub->score ?? 0 }}" 
                        data-user="{{ strtolower($sub->user_name ?? 'User #' . $sub->user_id) }}" 
                        data-id="{{ $sub->id }}"
                        data-released="{{ $sub->is_released ? 'true' : 'false' }}">
                        <td class="px-4 py-3 text-sm text-gray-400">{{ $index + 1 }}</td>
                        <td class="px-4 py-3">
                            <div class="flex items-center gap-2">
                                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                                    {{ strtoupper(substr($sub->user_name ?? 'User', 0, 2)) }}
                                </div>
                                <div>
                                    <p class="text-sm font-medium text-gray-800">{{ $sub->user_name ?? 'User #' . $sub->user_id }}</p>
                                    <p class="text-xs text-gray-400">{{ $sub->email ?? 'No email' }}</p>
                                </div>
                            </div>
                        </td>
                        @if($isQuiz)
                        <td class="px-4 py-3">
                            @if($sub->score !== null)
                                @php
                                    // Calculate percentage from earned points
                                    $calculatedScore = $sub->total_points > 0 ? round(($sub->earned_points / $sub->total_points) * 100, 1) : 0;
                                    $scoreColor = $calculatedScore >= 80 ? 'bg-green-100 text-green-700' : ($calculatedScore >= 60 ? 'bg-blue-100 text-blue-700' : ($calculatedScore >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'));
                                @endphp
                                @if($releaseGrade == 'never')
                                    <span class="text-xs text-gray-400">Private</span>
                                @elseif($releaseGrade == 'later' && !$sub->is_released)
                                    <span class="text-xs text-yellow-600">Pending Release</span>
                                @else
                                    <span class="px-2 py-1 text-xs font-semibold rounded-full {{ $scoreColor }}">
                                        {{ number_format($calculatedScore, 1) }}%
                                    </span>
                                @endif
                            @else
                                <span class="text-xs text-gray-400">Pending</span>
                            @endif
                        </td>
                        <td class="px-4 py-3 text-sm">
                            @if($sub->score !== null)
                                <span class="text-sm font-medium text-gray-700">{{ number_format($sub->earned_points, 2) }}</span>
                                <span class="text-xs text-gray-400">/ {{ $formTotalPoints }}</span>
                            @else
                                <span class="text-sm text-gray-400">-</span>
                            @endif
                        </td>
                        @endif
                        <td class="px-4 py-3 text-sm text-gray-600">
                            <div class="flex items-center gap-1">
                                <i class="fas fa-calendar-alt text-gray-400 text-xs"></i>
                                {{ \Carbon\Carbon::parse($sub->submitted_at)->format('M d, Y') }}
                            </div>
                            <div class="text-xs text-gray-400">
                                {{ \Carbon\Carbon::parse($sub->submitted_at)->format('h:i A') }}
                            </div>
                        </td>
                        <td class="px-4 py-3">
                            @if($releaseGrade == 'never')
                                <span class="text-xs text-gray-500">Private</span>
                            @elseif($releaseGrade == 'later' && !$sub->is_released)
                                <span class="text-xs text-yellow-600">
                                    <i class="fas fa-clock mr-1"></i> Awaiting Release
                                </span>
                            @elseif($isQuiz && $sub->score !== null)
                                @php
                                    $calculatedScore = $sub->total_points > 0 ? round(($sub->earned_points / $sub->total_points) * 100, 1) : 0;
                                    $status = $calculatedScore >= 80 ? 'Excellent' : ($calculatedScore >= 60 ? 'Good' : ($calculatedScore >= 40 ? 'Average' : 'Needs Improvement'));
                                    $statusColor = $calculatedScore >= 80 ? 'text-green-600' : ($calculatedScore >= 60 ? 'text-blue-600' : ($calculatedScore >= 40 ? 'text-yellow-600' : 'text-red-600'));
                                @endphp
                                <span class="text-xs font-medium {{ $statusColor }}">
                                    <i class="fas {{ $calculatedScore >= 80 ? 'fa-star' : ($calculatedScore >= 60 ? 'fa-thumbs-up' : ($calculatedScore >= 40 ? 'fa-minus-circle' : 'fa-exclamation-triangle')) }} mr-1"></i>
                                    {{ $status }}
                                </span>
                            @elseif($isQuiz)
                                <span class="text-xs text-yellow-600">
                                    <i class="fas fa-clock mr-1"></i> Pending Review
                                </span>
                            @else
                                <span class="text-xs text-green-600">
                                    <i class="fas fa-check-circle mr-1"></i> Completed
                                </span>
                            @endif
                        </td>
                        <td class="px-4 py-3">
                            <div class="flex items-center gap-2 flex-wrap">
                                <a href="{{ route('forms.results', ['id' => $sub->form_id, 'submission_id' => $sub->id]) }}" 
                                   class="text-blue-600 hover:text-blue-800 text-sm transition flex items-center gap-1">
                                    <i class="fas fa-file-lines"></i> View
                                </a>
                                @if($releaseGrade == 'later' && $sub->score !== null)
                                    @if(!$sub->is_released)
                                    <button onclick="releaseSubmission({{ $sub->id }})" class="text-green-600 hover:text-green-800 text-sm transition flex items-center gap-1">
                                        <i class="fas fa-check-circle"></i> Release
                                    </button>
                                    @else
                                    <button onclick="unreleaseSubmission({{ $sub->id }})" class="text-gray-600 hover:text-gray-800 text-sm transition flex items-center gap-1">
                                        <i class="fas fa-undo"></i> Unrelease
                                    </button>
                                    @endif
                                @endif
                                @if(auth()->user()->canAccess('intercession', 'delete-forms'))
                                <button onclick="deleteSubmission({{ $sub->id }})" class="text-red-600 hover:text-red-700 text-sm transition flex items-center gap-1">
                                    <i class="fas fa-trash"></i>
                                </button>
                                @endif
                            </div>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="{{ $isQuiz ? 7 : 5 }}" class="px-4 py-12 text-center">
                            <div class="flex flex-col items-center justify-center">
                                <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                    <i class="fas fa-inbox text-gray-400 text-2xl"></i>
                                </div>
                                <p class="text-gray-500 font-medium">No submissions yet</p>
                                <p class="text-sm text-gray-400">Be the first to submit this form</p>
                            </div>
                        </td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        
        <!-- Footer -->
        <div class="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
            <div class="text-sm text-gray-500">
                <i class="fas fa-info-circle mr-1"></i> 
                Showing {{ count($submissions) }} submission{{ count($submissions) > 1 ? 's' : '' }}
            </div>
            <div class="flex items-center gap-3">
                <button onclick="exportSubmissions()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition text-sm flex items-center gap-2">
                    <i class="fas fa-file-csv"></i> Export CSV
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Delete Confirmation Modal -->
<div id="deleteConfirmModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div class="text-center">
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
            </div>
            <h3 class="text-lg font-bold text-gray-800 mb-2">Delete Submission?</h3>
            <p class="text-sm text-gray-600 mb-6">This action cannot be undone. The submission and all its data will be permanently removed.</p>
            <div class="flex gap-3 justify-center">
                <button onclick="closeDeleteModal()" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition">
                    Cancel
                </button>
                <button onclick="confirmDelete()" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition flex items-center gap-2">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Release Confirmation Modal -->
<div id="releaseConfirmModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div class="text-center">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fas fa-check-circle text-green-600 text-3xl"></i>
            </div>
            <h3 class="text-lg font-bold text-gray-800 mb-2">Release Submission?</h3>
            <p class="text-sm text-gray-600 mb-2">This will release the submission results to the user.</p>
            <p class="text-sm text-gray-500 mb-6">The user will be able to see their score and feedback.</p>
            <div class="flex gap-3 justify-center">
                <button onclick="closeReleaseModal()" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition">
                    Cancel
                </button>
                <button onclick="confirmRelease()" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition flex items-center gap-2">
                    <i class="fas fa-check-circle"></i> Release
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Unrelease Confirmation Modal -->
<div id="unreleaseConfirmModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div class="text-center">
            <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fas fa-lock text-yellow-600 text-3xl"></i>
            </div>
            <h3 class="text-lg font-bold text-gray-800 mb-2">Unrelease Submission?</h3>
            <p class="text-sm text-gray-600 mb-2">This will hide the submission results from the user.</p>
            <p class="text-sm text-gray-500 mb-4">The user will no longer be able to see their score and feedback.</p>
            <p class="text-xs text-yellow-600 mb-6 bg-yellow-50 px-3 py-2 rounded-lg">
                <i class="fas fa-info-circle mr-1"></i> This action can be reversed by releasing again.
            </p>
            <div class="flex gap-3 justify-center">
                <button onclick="closeUnreleaseModal()" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition">
                    Cancel
                </button>
                <button onclick="confirmUnrelease()" class="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm transition flex items-center gap-2">
                    <i class="fas fa-lock"></i> Unrelease
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Bulk Release Confirmation Modal -->
<div id="bulkReleaseConfirmModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div class="text-center">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fas fa-check-double text-green-600 text-3xl"></i>
            </div>
            <h3 class="text-lg font-bold text-gray-800 mb-2">Release ALL Pending Submissions</h3>
            <p class="text-sm text-gray-600 mb-2" id="bulkReleaseMessage">
                You are about to release <span id="bulkReleaseCount" class="font-bold text-green-600">0</span> submission(s).
            </p>
            <p class="text-sm text-gray-500 mb-6">All users will be able to see their scores and feedback.</p>
            <div class="flex gap-3 justify-center">
                <button onclick="closeBulkReleaseModal()" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition">
                    Cancel
                </button>
                <button onclick="confirmBulkRelease()" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition flex items-center gap-2">
                    <i class="fas fa-check-double"></i> Release All
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Bulk Unrelease Confirmation Modal -->
<div id="bulkUnreleaseConfirmModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
    <div class="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div class="text-center">
            <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fas fa-undo text-yellow-600 text-3xl"></i>
            </div>
            <h3 class="text-lg font-bold text-gray-800 mb-2">Unrelease ALL Submissions</h3>
            <p class="text-sm text-gray-600 mb-2" id="bulkUnreleaseMessage">
                You are about to unrelease <span id="bulkUnreleaseCount" class="font-bold text-yellow-600">0</span> submission(s).
            </p>
            <p class="text-sm text-gray-500 mb-4">All users will no longer be able to see their scores and feedback.</p>
            <p class="text-xs text-yellow-600 mb-6 bg-yellow-50 px-3 py-2 rounded-lg">
                <i class="fas fa-info-circle mr-1"></i> This action can be reversed by releasing again.
            </p>
            <div class="flex gap-3 justify-center">
                <button onclick="closeBulkUnreleaseModal()" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition">
                    Cancel
                </button>
                <button onclick="confirmBulkUnrelease()" class="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm transition flex items-center gap-2">
                    <i class="fas fa-undo"></i> Unrelease All
                </button>
            </div>
        </div>
    </div>
</div>

<script>
let deleteTargetId = null;
let releaseTargetId = null;
let unreleaseTargetId = null;

// ==================== FILTER FUNCTION ====================
function filterSubmissions() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filterScore = document.getElementById('filterScore').value;
    const filterRelease = document.getElementById('filterRelease').value;
    const rows = document.querySelectorAll('.submission-row');
    let visibleCount = 0;
    
    rows.forEach(row => {
        const user = row.dataset.user || '';
        const score = parseFloat(row.dataset.score) || 0;
        const isReleased = row.dataset.released === 'true';
        let show = true;
        
        if (searchTerm && !user.includes(searchTerm)) {
            show = false;
        }
        
        if (show && filterScore !== 'all') {
            if (filterScore === 'high' && score < 80) show = false;
            else if (filterScore === 'medium' && (score < 60 || score >= 80)) show = false;
            else if (filterScore === 'low' && (score < 40 || score >= 60)) show = false;
            else if (filterScore === 'fail' && score >= 40) show = false;
        }
        
        if (show && filterRelease !== 'all') {
            if (filterRelease === 'released' && !isReleased) show = false;
            else if (filterRelease === 'pending' && isReleased) show = false;
        }
        
        row.style.display = show ? '' : 'none';
        if (show) visibleCount++;
    });
    
    document.getElementById('resultCount').textContent = `Showing ${visibleCount} results`;
}

// ==================== RELEASE FUNCTIONS ====================
function releaseSubmission(id) {
    releaseTargetId = id;
    document.getElementById('releaseConfirmModal').classList.remove('hidden');
    document.getElementById('releaseConfirmModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeReleaseModal() {
    releaseTargetId = null;
    document.getElementById('releaseConfirmModal').classList.add('hidden');
    document.getElementById('releaseConfirmModal').style.display = 'none';
    document.body.style.overflow = '';
}

function confirmRelease() {
    if (!releaseTargetId) return;
    
    const row = document.querySelector(`.submission-row[data-id="${releaseTargetId}"]`);
    const btn = row?.querySelector('.text-green-600');
    const originalText = btn ? btn.innerHTML : '';
    
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
    }
    
    fetch(`/forms/submissions/${releaseTargetId}/release`, {
        method: 'POST',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        closeReleaseModal();
        if (data.success) {
            showNotification('âœ… Submission released successfully!', 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showNotification('âŒ Error: ' + (data.message || 'Failed to release'), 'error');
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    })
    .catch(error => {
        closeReleaseModal();
        showNotification('âŒ Error releasing submission', 'error');
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

// ==================== UNRELEASE FUNCTIONS ====================
function unreleaseSubmission(id) {
    unreleaseTargetId = id;
    document.getElementById('unreleaseConfirmModal').classList.remove('hidden');
    document.getElementById('unreleaseConfirmModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeUnreleaseModal() {
    unreleaseTargetId = null;
    document.getElementById('unreleaseConfirmModal').classList.add('hidden');
    document.getElementById('unreleaseConfirmModal').style.display = 'none';
    document.body.style.overflow = '';
}

function confirmUnrelease() {
    if (!unreleaseTargetId) return;
    
    const row = document.querySelector(`.submission-row[data-id="${unreleaseTargetId}"]`);
    const btn = row?.querySelector('.text-gray-600');
    const originalText = btn ? btn.innerHTML : '';
    
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
    }
    
    fetch(`/forms/submissions/${unreleaseTargetId}/unrelease`, {
        method: 'POST',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        closeUnreleaseModal();
        if (data.success) {
            showNotification('ðŸ”’ Submission unreleased successfully!', 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showNotification('âŒ Error: ' + (data.message || 'Failed to unrelease'), 'error');
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    })
    .catch(error => {
        closeUnreleaseModal();
        showNotification('âŒ Error unreleasing submission', 'error');
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

// ==================== BULK RELEASE FUNCTIONS ====================
function bulkRelease() {
    const pendingRows = document.querySelectorAll('.submission-row[data-released="false"]');
    const pendingCount = pendingRows.length;
    
    if (pendingCount === 0) {
        showNotification('No pending submissions to release', 'info');
        return;
    }
    
    document.getElementById('bulkReleaseCount').textContent = pendingCount;
    document.getElementById('bulkReleaseMessage').innerHTML = 
        'You are about to release <span class="font-bold text-green-600">' + pendingCount + '</span> submission(s).';
    
    document.getElementById('bulkReleaseConfirmModal').classList.remove('hidden');
    document.getElementById('bulkReleaseConfirmModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeBulkReleaseModal() {
    document.getElementById('bulkReleaseConfirmModal').classList.add('hidden');
    document.getElementById('bulkReleaseConfirmModal').style.display = 'none';
    document.body.style.overflow = '';
}

function confirmBulkRelease() {
    closeBulkReleaseModal();
    
    const btn = document.querySelector('[onclick="bulkRelease()"]');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Releasing...';
        btn.disabled = true;
    }
    
    fetch('/forms/submissions/bulk-release', {
        method: 'POST',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            form_id: {{ $form->id }}
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('âœ… ' + (data.message || 'All submissions released successfully!'), 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showNotification('âŒ Error: ' + (data.message || 'Failed to release submissions'), 'error');
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    })
    .catch(error => {
        showNotification('âŒ Error releasing submissions', 'error');
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

// ==================== BULK UNRELEASE FUNCTIONS ====================
function bulkUnrelease() {
    const releasedRows = document.querySelectorAll('.submission-row[data-released="true"]');
    const releasedCount = releasedRows.length;
    
    if (releasedCount === 0) {
        showNotification('No released submissions to unrelease', 'info');
        return;
    }
    
    document.getElementById('bulkUnreleaseCount').textContent = releasedCount;
    document.getElementById('bulkUnreleaseMessage').innerHTML = 
        'You are about to unrelease <span class="font-bold text-yellow-600">' + releasedCount + '</span> submission(s).';
    
    document.getElementById('bulkUnreleaseConfirmModal').classList.remove('hidden');
    document.getElementById('bulkUnreleaseConfirmModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeBulkUnreleaseModal() {
    document.getElementById('bulkUnreleaseConfirmModal').classList.add('hidden');
    document.getElementById('bulkUnreleaseConfirmModal').style.display = 'none';
    document.body.style.overflow = '';
}

function confirmBulkUnrelease() {
    closeBulkUnreleaseModal();
    
    const btn = document.querySelector('[onclick="bulkUnrelease()"]');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Unreleasing...';
        btn.disabled = true;
    }
    
    fetch('/forms/submissions/bulk-unrelease', {
        method: 'POST',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            form_id: {{ $form->id }}
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('ðŸ”’ ' + (data.message || 'All submissions unreleased successfully!'), 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showNotification('âŒ Error: ' + (data.message || 'Failed to unrelease submissions'), 'error');
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    })
    .catch(error => {
        showNotification('âŒ Error unreleasing submissions', 'error');
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

// ==================== EXPORT FUNCTION ====================
function exportSubmissions() {
    const rows = document.querySelectorAll('.submission-row');
    let csv = [];
    
    @if($isQuiz)
    csv.push(['#', 'User', 'Email', 'Score', 'Points', 'Submitted', 'Status', 'Released'].join(','));
    @else
    csv.push(['#', 'User', 'Email', 'Submitted'].join(','));
    @endif
    
    rows.forEach((row, index) => {
        if (row.style.display === 'none') return;
        
        const cells = row.querySelectorAll('td');
        let rowData = [];
        
        rowData.push(index + 1);
        rowData.push(`"${cells[1]?.textContent?.trim() || ''}"`);
        rowData.push(`"${cells[1]?.querySelector('.text-xs')?.textContent?.trim() || ''}"`);
        
        @if($isQuiz)
        const scoreText = cells[2]?.textContent?.trim() || '';
        rowData.push(scoreText.replace('%', ''));
        const pointsText = cells[3]?.textContent?.trim() || '';
        rowData.push(pointsText);
        const submittedText = cells[4]?.textContent?.trim() || '';
        rowData.push(submittedText);
        const statusText = cells[5]?.textContent?.trim() || '';
        rowData.push(statusText);
        const releasedText = row.dataset.released === 'true' ? 'Released' : 'Pending';
        rowData.push(releasedText);
        @else
        rowData.push(cells[2]?.textContent?.trim() || '');
        @endif
        
        csv.push(rowData.join(','));
    });
    
    const blob = new Blob(['\uFEFF' + csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'submissions_{{ $form->title }}.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification('ðŸ“Š Export completed!', 'success');
}

// ==================== DELETE FUNCTIONS ====================
function deleteSubmission(id) {
    deleteTargetId = id;
    document.getElementById('deleteConfirmModal').classList.remove('hidden');
    document.getElementById('deleteConfirmModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeDeleteModal() {
    deleteTargetId = null;
    document.getElementById('deleteConfirmModal').classList.add('hidden');
    document.getElementById('deleteConfirmModal').style.display = 'none';
    document.body.style.overflow = '';
}

function confirmDelete() {
    if (!deleteTargetId) return;
    
    const row = document.querySelector(`.submission-row[data-id="${deleteTargetId}"]`);
    const btn = row?.querySelector('.text-red-600');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
    }
    
    fetch(`/forms/submissions/${deleteTargetId}`, {
        method: 'DELETE',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        closeDeleteModal();
        if (data.success) {
            showNotification('âœ… Submission deleted successfully!', 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showNotification('âŒ Error: ' + data.message, 'error');
            if (btn) {
                btn.innerHTML = '<i class="fas fa-trash"></i>';
                btn.disabled = false;
            }
        }
    })
    .catch(error => {
        closeDeleteModal();
        showNotification('âŒ Error deleting submission', 'error');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-trash"></i>';
            btn.disabled = false;
        }
    });
}

// ==================== NOTIFICATION FUNCTION ====================
function showNotification(message, type) {
    return window.appNotify(...arguments);
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in max-w-md`;
    notification.style.backgroundColor = colors[type] || '#6b7280';
    notification.innerHTML = `
        <i class="fas ${icons[type] || 'fa-bell'} text-white"></i>
        <span class="text-white text-sm">${message}</span>
        <button onclick="this.parentElement.remove()" class="text-white/70 hover:text-white"><i class="fas fa-times"></i></button>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==================== CLOSE MODALS ON BACKGROUND CLICK ====================
document.addEventListener('click', function(e) {
    const modals = [
        'deleteConfirmModal',
        'releaseConfirmModal', 
        'unreleaseConfirmModal',
        'bulkReleaseConfirmModal',
        'bulkUnreleaseConfirmModal'
    ];
    
    modals.forEach(id => {
        const modal = document.getElementById(id);
        if (e.target === modal && modal.style.display === 'flex') {
            closeDeleteModal();
            closeReleaseModal();
            closeUnreleaseModal();
            closeBulkReleaseModal();
            closeBulkUnreleaseModal();
        }
    });
});

// ==================== CLOSE MODALS ON ESCAPE KEY ====================
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeDeleteModal();
        closeReleaseModal();
        closeUnreleaseModal();
        closeBulkReleaseModal();
        closeBulkUnreleaseModal();
    }
});

// ==================== STYLES ====================
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    .animate-slide-in {
        animation: slideIn 0.3s ease-out;
    }
`;
document.head.appendChild(style);
</script>

<style>
tbody tr {
    transition: background-color 0.2s ease;
}

.bg-white.rounded-lg {
    transition: all 0.2s ease;
}
.bg-white.rounded-lg:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.modal .bg-white {
    animation: modalPop 0.3s ease-out;
}

@keyframes modalPop {
    from { transform: scale(0.9); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}
</style>
@endsection

