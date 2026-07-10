@extends('layouts.app')

@section('title', ($managerReviewMode ?? false) ? (($managerReadOnly ?? false) ? 'View Submission' : 'Review Submission') : 'Form Results')
@section('page-title', ($managerReviewMode ?? false) ? (($managerReadOnly ?? false) ? 'View Submission' : 'Review Submission') : 'Form Results')

@section('content')
<div class="results-page max-w-6xl mx-auto py-5 px-3 sm:px-5">
    @php
        $settings = json_decode($form->settings, true) ?? [];
        $limitOneResponse = $settings['limit_one_response'] ?? true;
        $isViewingOwnSubmission = (int) ($submission->user_id ?? 0) === (int) auth()->id();
        $canSubmitAnotherResponse = !($managerReviewMode ?? false) && $isViewingOwnSubmission && !$limitOneResponse;

        if (!function_exists('renderRichResultText')) {
            function renderRichResultText($text) {
                $text = (string) $text;
                if (preg_match('/<\/?[a-z][\s\S]*>/i', $text)) {
                    return strip_tags($text, '<b><strong><i><em><u><br><div><p>');
                }
                $text = e($text);
                $text = preg_replace('/\*\*(.+?)\*\*/s', '<strong>$1</strong>', $text);
                $text = preg_replace('/__(.+?)__/s', '<u>$1</u>', $text);
                $text = preg_replace('/\*(.+?)\*/s', '<em>$1</em>', $text);
                return nl2br($text);
            }
        }
    @endphp
    
    <!-- Back Button -->
    <div class="mb-4">
        <a href="{{ ($managerReviewMode ?? false)
                ? route('forms.manage.submissions', $form->id)
                : route('intercession.index') . '#forms-tab' }}"
            class="inline-flex items-center text-gray-600 hover:text-blue-600 transition">
            <i class="fas fa-arrow-left mr-2"></i>
            {{ ($managerReviewMode ?? false) ? 'Back to Submissions' : 'Back to My Results' }}
        </a>
    </div>
    
    <!-- Results Card -->
    <div class="results-shell bg-white rounded-2xl border border-gray-200 overflow-hidden">
        
        <!-- Header -->
        <div class="results-header bg-blue-600 px-5 sm:px-7 py-6">
            <div class="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div>
                    <h1 class="text-2xl font-bold text-white">{{ $form->title }}</h1>
                    <p class="text-blue-100 text-sm mt-1">
                        {{ $userName }} <span class="mx-1">•</span>
                        {{ ($managerReviewMode ?? false)
                            ? (($managerReadOnly ?? false) ? 'Manager View · Read only' : 'Manager Review')
                            : 'Form Results' }}
                    </p>
                </div>
                <div class="text-right">
                    @if(isset($submission) && isset($submission->submitted_at))
                    <p class="text-blue-200 text-xs">Submitted</p>
                    <p class="text-white text-sm font-medium">{{ \Carbon\Carbon::parse($submission->submitted_at)->format('M d, Y h:i A') }}</p>
                    @if($canSubmitAnotherResponse)
                        <a href="{{ route('forms.take', $form->id) }}"
                           class="mt-3 inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/25">
                            <i class="fas fa-rotate-right"></i>
                            Submit another response
                        </a>
                    @endif
                    @endif
                </div>
            </div>
        </div>

        <!-- Score Summary -->
        @php
            // Get settings
            $settings = $settings ?? (json_decode($form->settings, true) ?? []);
            $isQuiz = $settings['is_quiz'] ?? false;
            $releaseGrade = $settings['release_grade'] ?? 'immediately';
            $allowViewResponse = $settings['allow_view_response'] ?? true;
            $limitOneResponse = $settings['limit_one_response'] ?? true;
            $allowPartialPoints = $settings['allow_partial_points'] ?? true;
            $manualGrades = json_decode($submission->manual_grades ?? '[]', true) ?: [];
            $isViewingOwnSubmission = (int) ($submission->user_id ?? 0) === (int) auth()->id();
            $canManuallyGrade = ($managerReviewMode ?? false) && !$isViewingOwnSubmission && (
                auth()->user()->isSuperAdmin()
                || auth()->user()->canAccess('intercession', 'manage-forms')
            );
            
            // Check if submission is released - Check BOTH column types
            $isReleased = false;
            if (isset($submission)) {
                if (isset($submission->released_at) && $submission->released_at !== null) {
                    $isReleased = true;
                }
                if (isset($submission->is_released) && $submission->is_released == true) {
                    $isReleased = true;
                }
            }
            
            // Determine if score and answers should be shown
            $showScore = false;
            $showAnswers = false;
            
            if ($releaseGrade == 'immediately') {
                $showScore = true;
                $showAnswers = true;
            } elseif ($releaseGrade == 'later') {
                if ($isReleased) {
                    $showScore = true;
                    $showAnswers = true;
                } else {
                    $showScore = false;
                    $showAnswers = false;
                }
            } elseif ($releaseGrade == 'never') {
                $showScore = false;
                $showAnswers = false;
            } else {
                $showScore = $isReleased || $releaseGrade == 'immediately';
                $showAnswers = $isReleased || $releaseGrade == 'immediately';
            }

            $canReviewResponses = auth()->user()->isSuperAdmin()
                || auth()->user()->canAccess('intercession', 'manage-forms')
                || auth()->user()->canAccess('intercession', 'view-results');
            if ($managerReviewMode ?? false) {
                $showScore = true;
                $showAnswers = true;
            } else {
                $showAnswers = $showAnswers && ($allowViewResponse || $canReviewResponses);
            }
            
            // Check for multiple submissions
            $submissionCount = 0;
            if ($isQuiz && !request()->filled('submission_id')) {
                $submissionCount = DB::table('form_submissions')
                    ->where('form_id', $form->id)
                    ->where('user_id', auth()->id())
                    ->count();
            }
            
            // Calculate total possible points - SKIP SECTIONS
            $totalPossiblePoints = 0;
            $earnedPoints = 0;
            $totalQuestionsCount = 0;
            $questionScores = [];
            
            foreach ($questions as $index => $question) {
                $questionType = $question['type'] ?? 'short_answer';
                if ($questionType == 'title_section' || $questionType == 'section_break') {
                    continue;
                }
                
                $totalQuestionsCount++;
                $points = isset($question['points']) ? (int)$question['points'] : 1;
                $totalPossiblePoints += $points;
                
                $answerKey = 'question_' . $index;
                $answer = $answers[$answerKey] ?? null;
                
                // For grid questions, collect ALL answers with the question prefix
                $gridAnswers = null;
                if ($questionType == 'multiple_choice_grid' || $questionType == 'checkbox_grid') {
                    $gridAnswers = [];
                    $rows = $question['rows'] ?? [];
                    foreach ($rows as $rowIndex => $row) {
                        $rowKey = 'question_' . $index . '_' . $rowIndex;
                        if (isset($answers[$rowKey])) {
                            $gridAnswers[$rowKey] = $answers[$rowKey];
                        }
                    }
                    if (empty($gridAnswers) && is_array($answer)) {
                        $gridAnswers = $answer;
                    }
                }
                
                $questionEarnedPoints = 0;
                $isCorrect = false;
                $correctDisplay = '';
                $userAnswerDisplay = '';
                $isPartiallyCorrect = false;
                $storedRows = null;
                $storedColumns = null;
                $manualDecision = $manualGrades[$index]['decision'] ?? null;
                
                // Format user answer for display
                if (is_array($answer)) {
                    $userAnswerDisplay = implode(', ', $answer);
                } else {
                    $userAnswerDisplay = $answer ?: 'Not answered';
                }
                
                // If it's a grid question and we have grid answers, format display properly
                if ($questionType == 'multiple_choice_grid' || $questionType == 'checkbox_grid') {
                    if (!empty($gridAnswers) && is_array($gridAnswers)) {
                        $displayParts = [];
                        $rows = $question['rows'] ?? [];
                        foreach ($gridAnswers as $key => $value) {
                            $rowIndex = str_replace('question_' . $index . '_', '', $key);
                            $rowLabel = isset($rows[$rowIndex]) ? $rows[$rowIndex] : 'Row ' . ($rowIndex + 1);
                            if (is_array($value)) {
                                $displayParts[] = $rowLabel . ': ' . implode(', ', $value);
                            } else {
                                $displayParts[] = $rowLabel . ': ' . $value;
                            }
                        }
                        if (!empty($displayParts)) {
                            $userAnswerDisplay = implode('; ', $displayParts);
                        }
                    }
                }
                
                // Handle different question types
                if ($questionType == 'multiple_choice' || $questionType == 'dropdown') {
                    // DEBUG: Check if correct answer exists
                    if (isset($question['correctAnswer']) && $question['correctAnswer'] !== '') {
                        $correctDisplay = $question['correctAnswer'];
                        if ($answer == $question['correctAnswer']) {
                            $isCorrect = true;
                            $questionEarnedPoints = $points;
                        }
                    }
                } elseif ($questionType == 'checkboxes') {
                    if (isset($question['correctAnswers']) && is_array($question['correctAnswers']) && !empty($question['correctAnswers'])) {
                        $correctDisplay = implode(', ', $question['correctAnswers']);
                        $correctAnswers = array_values(array_unique($question['correctAnswers']));
                        $userAnswers = is_array($answer) ? array_values(array_unique($answer)) : [];
                        
                        if (!empty($userAnswers)) {
                            $totalCorrect = count($correctAnswers);
                            $correctSelected = count(array_intersect($userAnswers, $correctAnswers));
                            $incorrectSelected = count(array_diff($userAnswers, $correctAnswers));
                            $isExactMatch = $correctSelected === $totalCorrect && $incorrectSelected === 0 && count($userAnswers) === $totalCorrect;
                            
                            if ($allowPartialPoints) {
                                if ($correctSelected > 0 && $totalCorrect > 0) {
                                    $questionEarnedPoints = ($correctSelected / $totalCorrect) * $points;
                                } else {
                                    $questionEarnedPoints = 0;
                                }
                                $questionEarnedPoints = round($questionEarnedPoints, 2);
                                
                                if ($questionEarnedPoints > 0 && !$isExactMatch) {
                                    $isPartiallyCorrect = true;
                                }
                            } else {
                                if ($isExactMatch) {
                                    $questionEarnedPoints = $points;
                                    $isCorrect = true;
                                } else {
                                    $questionEarnedPoints = 0;
                                }
                            }
                            
                            if ($isExactMatch) {
                                $isCorrect = true;
                            }
                        }
                    }
                } elseif ($questionType == 'short_answer' || $questionType == 'paragraph') {
                    if (isset($question['correctAnswer']) && $question['correctAnswer'] !== '') {
                        $correctDisplay = $question['correctAnswer'];
                        if (strtolower(trim((string) $answer)) == strtolower(trim((string) $question['correctAnswer']))) {
                            $isCorrect = true;
                            $questionEarnedPoints = $points;
                        }
                    }
                } elseif ($questionType == 'date' || $questionType == 'time') {
                    if (isset($question['correctAnswer']) && $question['correctAnswer'] !== '') {
                        $correctDisplay = $question['correctAnswer'];
                        if ($answer == $question['correctAnswer']) {
                            $isCorrect = true;
                            $questionEarnedPoints = $points;
                        }
                    }
                } elseif ($questionType == 'linear_scale') {
                    if (isset($question['correctAnswer']) && $question['correctAnswer'] !== '') {
                        $correctDisplay = $question['correctAnswer'];
                        if ($answer == $question['correctAnswer']) {
                            $isCorrect = true;
                            $questionEarnedPoints = $points;
                        }
                    } else {
                        if ($answer !== null && $answer !== '') {
                            $questionEarnedPoints = $points;
                            $isCorrect = true;
                        }
                    }
                } elseif ($questionType == 'rating') {
                    if (isset($question['correctAnswer']) && $question['correctAnswer'] !== '') {
                        $correctDisplay = $question['correctAnswer'];
                        if ($answer == $question['correctAnswer']) {
                            $isCorrect = true;
                            $questionEarnedPoints = $points;
                        }
                    } else {
                        if ($answer !== null && $answer !== '') {
                            $questionEarnedPoints = $points;
                            $isCorrect = true;
                        }
                    }
                } elseif ($questionType == 'multiple_choice_grid') {
                    $rows = $question['rows'] ?? [];
                    $columns = $question['columns'] ?? [];
                    $correctAnswers = $question['correctAnswers'] ?? [];
                    $storedRows = $rows;
                    $storedColumns = $columns;
                    
                    if (!empty($correctAnswers) && is_array($correctAnswers)) {
                        $gridEarned = 0;
                        $totalCorrect = 0;
                        $correctSelected = 0;
                        $allCorrect = true;
                        $correctDisplayParts = [];
                        
                        foreach ($rows as $rowIndex => $row) {
                            $rowKey = 'question_' . $index . '_' . $rowIndex;
                            $userRowAnswer = $gridAnswers[$rowKey] ?? null;
                            $correctRowAnswer = $correctAnswers[$rowIndex] ?? null;
                            
                            if ($correctRowAnswer !== null && $correctRowAnswer !== '') {
                                $correctDisplayParts[] = $row . ': ' . $correctRowAnswer;
                                
                                $correct = is_array($correctRowAnswer) ? array_values(array_unique($correctRowAnswer)) : [];
                                $selected = is_array($userRowAnswer) ? array_values(array_unique($userRowAnswer)) : [];
                                $rowCorrectCount = count(array_intersect($selected, $correct));
                                $rowIncorrectCount = count(array_diff($selected, $correct));
                                $rowExact = $rowCorrectCount === count($correct)
                                    && $rowIncorrectCount === 0
                                    && count($selected) === count($correct);

                                $totalCorrect += count($correct);
                                $correctSelected += $rowCorrectCount;
                                if (!$rowExact) {
                                    $allCorrect = false;
                                }
                            }
                        }

                        $correctDisplay = implode(', ', $correctDisplayParts);
                        if ($allowPartialPoints) {
                            $questionEarnedPoints = $totalCorrect > 0 && $correctSelected > 0
                                ? round(($correctSelected / $totalCorrect) * $points, 2)
                                : 0;
                        } else {
                            $questionEarnedPoints = $allCorrect && $totalCorrect > 0 ? $points : 0;
                            if ($questionEarnedPoints > 0) {
                                $isCorrect = true;
                            }
                        }
                        $isCorrect = $allCorrect && $questionEarnedPoints > 0;
                        $isPartiallyCorrect = $questionEarnedPoints > 0 && !$isCorrect;
                    }
                } elseif ($questionType == 'checkbox_grid') {
                    $rows = $question['rows'] ?? [];
                    $columns = $question['columns'] ?? [];
                    $correctAnswers = $question['correctAnswers'] ?? [];
                    $storedRows = $rows;
                    $storedColumns = $columns;
                    
                    if (!empty($correctAnswers) && is_array($correctAnswers)) {
                        $totalCorrect = 0;
                        $correctSelected = 0;
                        $allCorrect = true;
                        $correctDisplayParts = [];
                        
                        foreach ($rows as $rowIndex => $row) {
                            $rowKey = 'question_' . $index . '_' . $rowIndex;
                            $userRowAnswers = isset($gridAnswers[$rowKey]) ? (array)$gridAnswers[$rowKey] : [];
                            $correctRowAnswers = array_values(array_unique((array) ($correctAnswers[$rowIndex] ?? [])));
                            
                            if (!empty($correctRowAnswers)) {
                                $correctDisplayParts[] = $row . ': ' . implode(', ', $correctRowAnswers);
                                
                                $selected = array_values(array_unique($userRowAnswers));
                                $rowCorrectCount = count(array_intersect($selected, $correctRowAnswers));
                                $rowIncorrectCount = count(array_diff($selected, $correctRowAnswers));
                                $rowExact = $rowCorrectCount === count($correctRowAnswers)
                                    && $rowIncorrectCount === 0
                                    && count($selected) === count($correctRowAnswers);

                                $totalCorrect += count($correctRowAnswers);
                                $correctSelected += $rowCorrectCount;
                                if (!$rowExact) {
                                    $allCorrect = false;
                                }
                            }
                        }
                        $correctDisplay = implode(', ', $correctDisplayParts);
                        if ($allowPartialPoints) {
                            $questionEarnedPoints = $totalCorrect > 0 && $correctSelected > 0
                                ? round(($correctSelected / $totalCorrect) * $points, 2)
                                : 0;
                        } else {
                            $questionEarnedPoints = $allCorrect && $totalCorrect > 0 ? $points : 0;
                        }
                        $isCorrect = $allCorrect && $questionEarnedPoints > 0;
                        $isPartiallyCorrect = $questionEarnedPoints > 0 && !$isCorrect;
                    }
                }

                if ($manualDecision === 'correct') {
                    $questionEarnedPoints = $points;
                    $isCorrect = true;
                    $isPartiallyCorrect = false;
                } elseif ($manualDecision === 'incorrect') {
                    $questionEarnedPoints = 0;
                    $isCorrect = false;
                    $isPartiallyCorrect = false;
                }
                
                $earnedPoints += $questionEarnedPoints;
                
                $questionScores[$index] = [
                    'earned' => $questionEarnedPoints,
                    'total' => $points,
                    'is_correct' => $isCorrect,
                    'is_partial' => $isPartiallyCorrect ?? false,
                    'correct_display' => $correctDisplay,
                    'user_answer' => $userAnswerDisplay,
                    'type' => $questionType,
                    'grid_answers' => $gridAnswers,
                    'rows' => $storedRows,
                    'columns' => $storedColumns,
                    'manual_decision' => $manualDecision,
                ];
            }
            
            $earnedPoints = round($earnedPoints, 2);
            $scorePercentage = $totalPossiblePoints > 0 ? min(100, max(0, ($earnedPoints / $totalPossiblePoints) * 100)) : 0;
            
            
            
            // Get release status message
            $releaseStatusMessage = '';
            $releaseStatusIcon = '';
           
        @endphp

        @if($managerReviewMode ?? false)
        <div class="mx-5 sm:mx-7 mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div class="flex items-start gap-3">
                <i class="fas fa-user-check mt-0.5 text-blue-600"></i>
                <div>
                    <p class="text-sm font-semibold text-blue-900">
                        {{ ($managerReadOnly ?? false) ? 'Submission details' : 'Manager review' }}
                    </p>
                    <p class="mt-1 text-xs leading-5 text-blue-700">
                        @if($managerReadOnly ?? false)
                            This is your own submission. You may inspect the answers and score here, but manual grading is disabled.
                        @else
                            Review each submitted answer, override automatic grading where necessary, then return to Submissions to release the result.
                        @endif
                    </p>
                </div>
            </div>
        </div>
        @endif

        <!-- Multiple Submissions Notice -->
        @if($isQuiz && $submissionCount > 1 && !isset($submission_id))
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mx-6 mt-4 flex items-center gap-3">
                <i class="fas fa-info-circle text-blue-500"></i>
                <span class="text-sm text-blue-700">
                    Showing latest submission ({{ $submissionCount }} total submissions)
                </span>
                @if($canReviewResponses)
                    <a href="{{ route('forms.manage.submissions', $form->id) }}" class="text-sm text-blue-600 hover:underline ml-auto">
                        View all submissions
                    </a>
                @endif
            </div>
        @endif
        
        <!-- Release Status Banner -->
        @php $resultReleasedToUser = $releaseGrade === 'immediately' || $isReleased; @endphp
        <div class="px-5 sm:px-7 py-3 border-b flex items-start sm:items-center gap-3 {{ $resultReleasedToUser ? 'bg-green-50' : 'bg-yellow-50' }}">
            <i class="fas {{ $releaseStatusIcon }} {{ $resultReleasedToUser ? 'text-green-500' : 'text-yellow-500' }}"></i>
            <span class="text-sm {{ $resultReleasedToUser ? 'text-green-700' : 'text-yellow-700' }}">
              
                @if($isQuiz && $releaseGrade == 'later' && $isReleased)
                    <span class="text-xs text-green-600 ml-2">
                        <i class="fas fa-check-circle mr-1"></i> Score released
                    </span>
                @endif
            </span>
        </div>
        
        <div class="results-summary bg-slate-50 px-5 sm:px-7 py-6 border-b">
            @if($showScore)
                <div class="summary-grid grid grid-cols-1 sm:grid-cols-1 gap-3">
                    <div class="summary-card rounded-xl border border-gray-200 bg-white p-4">
                        <p class="text-gray-600 text-sm">Points</p>
                        <p class="mt-1 text-3xl font-bold text-green-600">
                            {{ number_format($earnedPoints, 1) }}/{{ rtrim(rtrim(number_format($totalPossiblePoints, 2, '.', ''), '0'), '.') }}
                        </p>
                    </div>
                </div>
                
                <div class="mt-4">
                    <div class="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{{ number_format($scorePercentage, 1) }}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2.5">
                        <div class="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style="width: {{ $scorePercentage }}%"></div>
                    </div>
                </div>
            @else
                <div class="text-center py-6">
                    <i class="fas fa-clock text-yellow-400 text-5xl mb-3"></i>
                    <p class="text-gray-500 text-lg font-medium">Results are pending review</p>
                    @if($releaseGrade == 'later')
                        <p class="text-sm text-gray-400 mt-1">Your results will be available after manual review</p>
                        <div class="mt-4 inline-flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-lg">
                            <i class="fas fa-clock text-yellow-600"></i>
                            <span class="text-sm text-yellow-700">Please check back later</span>
                        </div>
                    @endif
                </div>
            @endif
        </div>
        
        <!-- Questions & Answers -->
        @if($showAnswers)
            <div class="responses-section bg-slate-50 p-4 sm:p-7">
                <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                    <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <i class="fas fa-list-check text-blue-600"></i>
                        Your Responses
                    </h2>
                    <span class="text-sm text-gray-500">{{ number_format($earnedPoints, 1) }} / {{ $totalPossiblePoints }} points</span>
                </div>
                
                <div class="space-y-5">
                    @foreach($questions as $index => $question)
                        @php
                            $questionType = $question['type'] ?? 'short_answer';
                            $isSection = ($questionType == 'title_section' || $questionType == 'section_break');
                        @endphp
                        
                        @if($isSection)
                            @php
                                $sectionTitle = $question['title'] ?? 'Section';
                                $sectionDescription = $question['description'] ?? '';
                            @endphp
                            <div class="bg-gray-100 rounded-xl p-5 border-l-4 border-indigo-500">
                                <h3 class="text-xl font-bold text-gray-800">{{ $sectionTitle }}</h3>
                                @if($sectionDescription)
                                    <p class="text-gray-600 text-sm mt-1">{{ $sectionDescription }}</p>
                                @endif
                                @if($questionType == 'section_break')
                                    <div class="mt-3 pt-3 border-t border-gray-300">
                                        
                                    </div>
                                @endif
                            </div>
                        @else
                            @php
                                $questionText = $question['text'] ?? $question['title'] ?? $question['question'] ?? 'Question';
                                $questionPoints = isset($question['points']) ? (int)$question['points'] : 1;
                                
                                $answerKey = 'question_' . $index;
                                $answer = $answers[$answerKey] ?? null;
                                
                                // Get grid answers
                                $gridAnswers = null;
                                if ($questionType == 'multiple_choice_grid' || $questionType == 'checkbox_grid') {
                                    $gridAnswers = [];
                                    $rows = $question['rows'] ?? [];
                                    foreach ($rows as $rowIndex => $row) {
                                        $rowKey = 'question_' . $index . '_' . $rowIndex;
                                        if (isset($answers[$rowKey])) {
                                            $gridAnswers[$rowKey] = $answers[$rowKey];
                                        }
                                    }
                                    if (empty($gridAnswers) && is_array($answer)) {
                                        $gridAnswers = $answer;
                                    }
                                }
                                
                                $qData = $questionScores[$index] ?? [
                                    'earned' => 0,
                                    'total' => $questionPoints,
                                    'is_correct' => false,
                                    'is_partial' => false,
                                    'correct_display' => '',
                                    'user_answer' => 'Not answered',
                                    'type' => $questionType,
                                    'grid_answers' => null,
                                    'rows' => null,
                                    'columns' => null
                                ];
                                
                                $isCorrect = $qData['is_correct'];
                                $isPartial = $qData['is_partial'] ?? false;
                                $correctDisplay = $qData['correct_display'];
                                $userAnswerDisplay = $qData['user_answer'];
                                $earned = $qData['earned'];
                                $total = $qData['total'];
                                $rows = $qData['rows'] ?? null;
                                $columns = $qData['columns'] ?? null;
                                $manualDecision = $qData['manual_decision'] ?? null;

                                $hasAnswer = false;
                                if ($questionType == 'multiple_choice_grid' || $questionType == 'checkbox_grid') {
                                    foreach ((array) $gridAnswers as $gridValue) {
                                        $values = is_array($gridValue) ? $gridValue : [$gridValue];
                                        if (count(array_filter($values, fn ($value) => $value !== null && $value !== '')) > 0) {
                                            $hasAnswer = true;
                                            break;
                                        }
                                    }
                                } elseif (is_array($answer)) {
                                    $hasAnswer = count(array_filter($answer, fn ($value) => $value !== null && $value !== '')) > 0;
                                } else {
                                    $hasAnswer = $answer !== null && $answer !== '';
                                }
                                
                                // Use grid answers if available
                                if (!empty($gridAnswers) && ($questionType == 'multiple_choice_grid' || $questionType == 'checkbox_grid')) {
                                    $rows = $rows ?? $qData['rows'] ?? [];
                                    $columns = $columns ?? $qData['columns'] ?? [];
                                }
                                
                                $statusBadge = '';
                                $statusBadgeColor = '';
                                
                                // For multiple choice and dropdown, always show status
                                if (!$hasAnswer) {
                                    $statusBadge = 'No answer provided';
                                    $statusBadgeColor = 'bg-slate-100 text-slate-600';
                                } elseif (($questionType == 'multiple_choice' || $questionType == 'dropdown') && $correctDisplay !== '') {
                                    if ($isCorrect) {
                                        $statusBadge = 'Correct';
                                        $statusBadgeColor = 'bg-green-100 text-green-700';
                                    } else {
                                        $statusBadge = 'Incorrect';
                                        $statusBadgeColor = 'bg-red-100 text-red-700';
                                    }
                                } elseif ($correctDisplay) {
                                    if ($isCorrect) {
                                        $statusBadge = 'Correct';
                                        $statusBadgeColor = 'bg-green-100 text-green-700';
                                    } elseif ($isPartial) {
                                        $statusBadge = 'Partial';
                                        $statusBadgeColor = 'bg-yellow-100 text-yellow-700';
                                    } else {
                                        $statusBadge = 'Incorrect';
                                        $statusBadgeColor = 'bg-red-100 text-red-700';
                                    }
                                }
                            @endphp
                            
                            <div class="response-card border border-gray-200 bg-white rounded-xl p-4 sm:p-5 transition-all">
                                <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                                    <div class="flex items-start gap-3">
                                        <div>
                                            <h3 class="font-semibold text-gray-800">{!! renderRichResultText($questionText) !!}</h3>
                                            @if($statusBadge)
                                            <span class="inline-block mt-1 text-xs px-2 py-0.5 rounded-full {{ $statusBadgeColor }}">
                                                {{ $statusBadge }}
                                            </span>
                                            @endif
                                        </div>
                                    </div>
                                    
                                    @if($isQuiz)
                                        <div class="flex items-center gap-1 flex-shrink-0 ml-2">
                                            @if($questionType == 'checkboxes' || $questionType == 'multiple_choice_grid' || $questionType == 'checkbox_grid')
                                                <span class="text-xs {{ !$hasAnswer ? 'text-slate-500' : ($earned > 0 ? 'text-green-600' : 'text-red-600') }} font-medium">
                                                    {{ number_format($earned, 1) }}/{{ $total }} pts
                                                </span>
                                            @elseif($questionType == 'linear_scale' || $questionType == 'rating')
                                                @if(!$hasAnswer)
                                                    <span class="text-xs text-slate-500 font-medium">No answer</span>
                                                @elseif($correctDisplay && !$isCorrect)
                                                    <i class="fas fa-times-circle text-red-500"></i>
                                                    <span class="text-xs text-red-600 font-medium">0 pts</span>
                                                @else
                                                    <i class="fas fa-check-circle text-green-500"></i>
                                                    <span class="text-xs text-green-600 font-medium">+{{ $total }} pts</span>
                                                @endif
                                            @elseif($questionType == 'multiple_choice' || $questionType == 'dropdown')
                                                @if(!$hasAnswer)
                                                    <span class="text-xs text-slate-500 font-medium">No answer</span>
                                                @elseif($correctDisplay === '')
                                                    <span class="text-xs text-gray-500 font-medium"></span>
                                                @elseif($isCorrect)
                                                    <i class="fas fa-check-circle text-green-500"></i>
                                                    <span class="text-xs text-green-600 font-medium">+{{ $total }} pts</span>
                                                @else
                                                    <i class="fas fa-times-circle text-red-500"></i>
                                                    <span class="text-xs text-red-600 font-medium">0 pts</span>
                                                @endif
                                            @else
                                                @if(!$hasAnswer)
                                                    <span class="text-xs text-slate-500 font-medium">No answer</span>
                                                @elseif($isCorrect)
                                                    <i class="fas fa-check-circle text-green-500"></i>
                                                    <span class="text-xs text-green-600 font-medium">+{{ $total }} pts</span>
                                                @else
                                                    <i class="fas fa-times-circle text-red-500"></i>
                                                    <span class="text-xs text-red-600 font-medium">0 pts</span>
                                                @endif
                                            @endif
                                        </div>
                                    @endif
                                </div>
                                
                                <div class="response-content sm:ml-10">
                                    <!-- User's Answer -->
                                    <div class="mb-2">
                                    
                                        <div class="bg-gray-50 rounded-lg p-3 
                                            {{ $correctDisplay ? ($isCorrect ? 'border-l-4 border-green-500' : ($isPartial ? 'border-l-4 border-yellow-500' : 'border-l-4 border-red-500')) : '' }}">
                                            
                                            @if(!$hasAnswer)
                                                <p class="flex items-center gap-2 text-slate-500 italic">
                                                    <i class="far fa-circle"></i>
                                                    <span>No answer provided</span>
                                                </p>
                                            @elseif($questionType == 'checkboxes' && is_array($answer))
                                                @if(!empty($answer))
                                                    @php
                                                        $checkboxCorrectAnswers = array_map('strval', (array) ($question['correctAnswers'] ?? []));
                                                    @endphp
                                                    <ul class="space-y-1">
                                                        @foreach($answer as $selectedOption)
                                                            @php
                                                                $selectedIsCorrect = in_array((string) $selectedOption, $checkboxCorrectAnswers, true);
                                                            @endphp
                                                            <li class="flex items-center gap-2 text-sm {{ $selectedIsCorrect ? 'text-green-700' : 'text-red-700' }}">
                                                                <i class="fas {{ $selectedIsCorrect ? 'fa-check-circle text-green-600' : 'fa-times-circle text-red-600' }}"></i>
                                                                <span>{{ $selectedOption }}</span>
                                                            </li>
                                                        @endforeach
                                                    </ul>
                                                @endif
                                            @elseif(($questionType == 'multiple_choice' || $questionType == 'dropdown') && $answer !== null)
                                                <p class="flex items-center gap-2 {{ $correctDisplay !== '' ? ($isCorrect ? 'text-green-700' : 'text-red-700') : 'text-gray-700' }}">
                                                    @if($correctDisplay !== '')
                                                        <i class="fas {{ $isCorrect ? 'fa-check-circle text-green-600' : 'fa-times-circle text-red-600' }}"></i>
                                                    @endif
                                                    <span>{{ $answer }}</span>
                                                </p>
                                            @elseif($questionType == 'linear_scale' || $questionType == 'rating')
                                                <p class="flex items-center gap-2 {{ $correctDisplay ? ($isCorrect ? 'text-green-700' : 'text-red-700') : 'text-gray-700' }}">
                                                    @if($correctDisplay)
                                                        <i class="fas {{ $isCorrect ? 'fa-check-circle text-green-600' : 'fa-times-circle text-red-600' }}"></i>
                                                    @endif
                                                    <span>{{ $userAnswerDisplay ?: 'Not answered' }}</span>
                                                </p>
                                            @elseif(($questionType == 'multiple_choice_grid' || $questionType == 'checkbox_grid') && $hasAnswer && $rows && $columns)
                                                <div class="overflow-x-auto">
                                                    <table class="min-w-full border rounded-lg text-sm">
                                                        <thead>
                                                            <tr class="bg-gray-100">
                                                                <th class="px-3 py-2 text-left font-medium text-gray-700">Row</th>
                                                                @foreach($columns as $col)
                                                                    <th class="px-3 py-2 text-center font-medium text-gray-700">{{ $col }}</th>
                                                                @endforeach
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            @foreach($rows as $rowIndex => $row)
                                                                <tr class="border-t">
                                                                    <td class="px-3 py-2 font-medium text-gray-700">{{ $row }}</td>
                                                                    @foreach($columns as $col)
                                                                        @php
                                                                            $rowKey = 'question_' . $index . '_' . $rowIndex;
                                                                            $isChecked = false;
                                                                            if ($questionType == 'multiple_choice_grid') {
                                                                                $userValue = $gridAnswers[$rowKey] ?? null;
                                                                                $isChecked = ($userValue == $col);
                                                                                $correctRowValues = [(string) (($question['correctAnswers'][$rowIndex] ?? null))];
                                                                            } else {
                                                                                $userRowAnswers = isset($gridAnswers[$rowKey]) ? (array)$gridAnswers[$rowKey] : [];
                                                                                $isChecked = in_array($col, $userRowAnswers);
                                                                                $correctRowValues = array_map('strval', (array) ($question['correctAnswers'][$rowIndex] ?? []));
                                                                            }
                                                                            $checkedIsCorrect = $isChecked && in_array((string) $col, $correctRowValues, true);
                                                                        @endphp
                                                                        <td class="px-3 py-2 text-center">
                                                                            @if($isChecked)
                                                                                @if($checkedIsCorrect)
                                                                                    <span class="text-green-600" title="Correct answer"><i class="fas fa-check-circle"></i></span>
                                                                                @else
                                                                                    <span class="text-red-600" title="Incorrect answer"><i class="fas fa-times-circle"></i></span>
                                                                                @endif
                                                                            @else
                                                                                <span class="text-gray-300"><i class="far fa-circle"></i></span>
                                                                            @endif
                                                                        </td>
                                                                    @endforeach
                                                                </tr>
                                                            @endforeach
                                                        </tbody>
                                                    </table>
                                                </div>
                                            @else
                                                <p class="flex items-start gap-2 {{ $correctDisplay ? ($isCorrect ? 'text-green-700' : 'text-red-700') : 'text-gray-700' }}">
                                                    @if($correctDisplay)
                                                        <i class="fas {{ $isCorrect ? 'fa-check-circle text-green-600' : 'fa-times-circle text-red-600' }} mt-1"></i>
                                                    @endif
                                                    <span>{{ $userAnswerDisplay ?: 'Not answered' }}</span>
                                                </p>
                                            @endif
                                        </div>
                                    </div>

                                    @if($canManuallyGrade)
                                    <div class="manual-review-box mb-3 rounded-lg border border-blue-100 bg-blue-50/60 p-3">
                                        <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
                                            <p class="text-xs font-semibold text-slate-700">
                                                <i class="fas fa-user-check mr-1 text-blue-600"></i> Human review
                                            </p>
                                            @if($manualDecision)
                                            <span class="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-blue-700">
                                                Manually marked {{ $manualDecision }}
                                            </span>
                                            @else
                                            <span class="text-[10px] text-slate-500">Using automatic grading</span>
                                            @endif
                                        </div>
                                        <div class="flex flex-wrap gap-2">
                                            <button type="button"
                                                onclick="gradeSubmissionQuestion({{ $submission->id }}, {{ $index }}, 'correct', this)"
                                                class="rounded-lg px-3 py-1.5 text-xs font-semibold transition {{ $manualDecision === 'correct' ? 'bg-green-600 text-white' : 'bg-white text-green-700 border border-green-200 hover:bg-green-50' }}">
                                                <i class="fas fa-check mr-1"></i> Correct
                                            </button>
                                            <button type="button"
                                                onclick="gradeSubmissionQuestion({{ $submission->id }}, {{ $index }}, 'incorrect', this)"
                                                class="rounded-lg px-3 py-1.5 text-xs font-semibold transition {{ $manualDecision === 'incorrect' ? 'bg-red-600 text-white' : 'bg-white text-red-700 border border-red-200 hover:bg-red-50' }}">
                                                <i class="fas fa-times mr-1"></i> Incorrect
                                            </button>
                                            @if($manualDecision)
                                            <button type="button"
                                                onclick="gradeSubmissionQuestion({{ $submission->id }}, {{ $index }}, 'auto', this)"
                                                class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
                                                <i class="fas fa-rotate-left mr-1"></i> Use automatic
                                            </button>
                                            @endif
                                        </div>
                                    </div>
                                    @endif
                                    
                                    <!-- Correct Answer - ALWAYS SHOW for multiple choice and dropdown -->
                                    @if($isQuiz && ($questionType == 'multiple_choice' || $questionType == 'dropdown') && $correctDisplay !== '')
                                        <div class="mb-2">
                                            <p class="text-xs text-green-600 mb-1">
                                                <i class="fas fa-check-circle mr-1"></i> Correct Answer:
                                            </p>
                                            <div class="bg-green-50 rounded-lg p-3">
                                                <p class="text-green-700">{{ $correctDisplay ?: 'Not set' }}</p>
                                            </div>
                                        </div>
                                    @elseif($correctDisplay && $isQuiz)
                                        <div class="mb-2">
                                            <p class="text-xs text-green-600 mb-1">
                                                <i class="fas fa-check-circle mr-1"></i> Correct Answer:
                                            </p>
                                            <div class="bg-green-50 rounded-lg p-3">
                                                @if($questionType == 'checkboxes')
                                                    <ul class="list-disc list-inside space-y-0.5">
                                                        @foreach(explode(', ', $correctDisplay) as $correctOption)
                                                            <li class="text-green-700 text-sm">{{ $correctOption }}</li>
                                                        @endforeach
                                                    </ul>
                                                @elseif(($questionType == 'multiple_choice_grid' || $questionType == 'checkbox_grid') && $rows && $columns)
                                                    @php
                                                        $correctAnswers = $question['correctAnswers'] ?? [];
                                                    @endphp
                                                    <div class="overflow-x-auto">
                                                        <table class="min-w-full border rounded-lg text-sm">
                                                            <thead>
                                                                <tr class="bg-gray-100">
                                                                    <th class="px-3 py-2 text-left font-medium text-gray-700">Row</th>
                                                                    @if($questionType == 'multiple_choice_grid')
                                                                        <th class="px-3 py-2 text-center font-medium text-green-600">Correct Answer</th>
                                                                    @else
                                                                        <th class="px-3 py-2 text-center font-medium text-green-600">Correct Answers</th>
                                                                    @endif
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                @foreach($rows as $rowIndex => $row)
                                                                    <tr class="border-t">
                                                                        <td class="px-3 py-2 font-medium text-gray-700">{{ $row }}</td>
                                                                        <td class="px-3 py-2 text-center">
                                                                            @php
                                                                                $correctRowAnswer = $correctAnswers[$rowIndex] ?? null;
                                                                            @endphp
                                                                            @if($questionType == 'multiple_choice_grid')
                                                                                <span class="text-green-700 font-medium">{{ $correctRowAnswer ?? '-' }}</span>
                                                                            @else
                                                                                @if(!empty($correctRowAnswer) && is_array($correctRowAnswer))
                                                                                    <span class="text-green-700 font-medium">{{ implode(', ', $correctRowAnswer) }}</span>
                                                                                @else
                                                                                    <span class="text-gray-400">-</span>
                                                                                @endif
                                                                            @endif
                                                                        </td>
                                                                    </tr>
                                                                @endforeach
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                @else
                                                    <p class="text-green-700">{{ $correctDisplay }}</p>
                                                @endif
                                            </div>
                                        </div>
                                    @endif
                                    
                                    
                                    
                                    <div class="mt-2">
                                        <span class="text-xs text-gray-400">
                                            <i class="fas fa-tag mr-1"></i> 
                                            {{ ucfirst(str_replace('_', ' ', $questionType)) }}
                                            @if($isQuiz && isset($question['points']) && $question['points'] > 0)
                                            • {{ $question['points'] }} point{{ $question['points'] > 1 ? 's' : '' }}
                                            @endif
                                        </span>
                                    </div>
                                </div>
                            </div>
                        @endif
                    @endforeach
                </div>
            </div>
        @elseif(!$showScore && $releaseGrade == 'later')
           
        @else
            <div class="p-6 text-center py-12">
                @if($releaseGrade == 'never')
                    <p class="text-sm text-gray-400 mt-1">This form is set to never release results</p>
                @elseif($showScore && !$showAnswers)
                    <i class="fas fa-eye-slash text-gray-300 text-3xl mb-3"></i>
                    <p class="text-sm text-gray-500">Detailed responses are not available for this form.</p>
                @endif
            </div>
        @endif
        
        
        
    </div>
</div>

<style>
.results-shell { box-shadow:0 18px 50px rgba(15,23,42,.07); }
.summary-card { box-shadow:0 3px 12px rgba(15,23,42,.035); }
.response-card:hover { border-color:#bfdbfe; box-shadow:0 8px 24px rgba(37,99,235,.06); }
.responses-section table { border-collapse:collapse; }
.responses-section table th,
.responses-section table td { border:1px solid #e5e7eb; padding:8px 12px; }
.responses-section ul.list-disc { padding-left:1.5rem; }
.responses-section ul.list-disc li { margin-bottom:2px; }
@media(max-width:640px) {
    .response-content { margin-left:0; }
}

@media print {
    .results-header {
        background:#2563eb !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .bg-gray-50, .bg-blue-50, .bg-green-50, .bg-gray-100 {
        background: #f9fafb !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .results-shell,.summary-card,.response-card { box-shadow:none !important; }
    .no-print {
        display: none !important;
    }
}
</style>
<script>
async function gradeSubmissionQuestion(submissionId, questionIndex, decision, button) {
    const originalContent = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const response = await fetch(`/forms/submissions/${submissionId}/grade`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
            },
            body: JSON.stringify({
                question_index: questionIndex,
                decision: decision
            })
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Unable to save the manual grade.');
        }

        window.appNotify(data.message, 'success');
        window.location.reload();
    } catch (error) {
        button.disabled = false;
        button.innerHTML = originalContent;
        window.appNotify(error.message, 'error');
    }
}

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.responses-section .text-gray-400').forEach(function (element) {
        element.textContent = element.textContent.replace(/\u00e2\u20ac\u00a2/g, '\u2022');
    });
});
</script>
@endsection
