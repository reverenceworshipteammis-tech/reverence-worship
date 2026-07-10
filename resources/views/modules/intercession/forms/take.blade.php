@extends('layouts.app')

@section('title', $form->title)

@section('content')
@php
$hasSubmitted = DB::table('form_submissions')
->where('form_id', $form->id)
->where('user_id', auth()->id())
->exists();

// Get settings with defaults
$settings = json_decode($form->settings, true) ?? [];
$showProgressBar = $settings['show_progress_bar'] ?? false;
$shuffleQuestions = $settings['shuffle_questions'] ?? false;
$limitOneResponse = $settings['limit_one_response'] ?? true;
$isQuiz = $settings['is_quiz'] ?? false;
$confirmationMessage = $settings['confirmation_message'] ?? 'Your response has been recorded.';
$showQuestionNumbers = $settings['show_question_numbers'] ?? false;
$onePageAtATime = $settings['one_page_at_a_time'] ?? false;
$showTimer = $settings['show_timer'] ?? false;
$timeLimit = $settings['time_limit'] ?? 30;
$requireLogin = $settings['require_login'] ?? true;
$allowEditing = $settings['allow_editing'] ?? false;
$releaseGrade = $settings['release_grade'] ?? 'immediately';
$allowViewResponse = $settings['allow_view_response'] ?? true;
$allowPartialPoints = $settings['allow_partial_points'] ?? true;

if (!function_exists('renderFormattedText')) {
    function renderFormattedText($text) {
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

// Determine if correct answers should be shown on the form
$showCorrectAnswers = ($releaseGrade == 'immediately');

// Shuffle questions if enabled - preserve original indices
$displayQuestions = $questions;
if ($shuffleQuestions) {
$keys = array_keys($questions);
shuffle($keys);
$shuffled = [];
foreach ($keys as $key) {
$shuffled[$key] = $questions[$key];
}
$displayQuestions = $shuffled;
}

// Check if user is logged in for require_login
$isLoggedIn = auth()->check();
@endphp

@if($hasSubmitted && $limitOneResponse)
<div class="max-w-4xl mx-auto py-8 px-4">
    <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <i class="fas fa-info-circle text-yellow-500 text-4xl mb-3"></i>
        <h2 class="text-xl font-bold text-yellow-700 mb-2">Already Submitted</h2>
        <p class="text-gray-600 mb-4">You have already submitted this form. Only one response is allowed per user.</p>
        <a href="{{ route('intercession.index') }}#forms-tab" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-block">
            Back to Forms
        </a>
    </div>
</div>
@elseif($requireLogin && !$isLoggedIn)
<div class="max-w-4xl mx-auto py-8 px-4">
    <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <i class="fas fa-lock text-yellow-500 text-4xl mb-3"></i>
        <h2 class="text-xl font-bold text-yellow-700 mb-2">Login Required</h2>
        <p class="text-gray-600 mb-4">You must be logged in to submit this form.</p>
        <a href="{{ route('login') }}" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-block">
            <i class="fas fa-sign-in-alt mr-2"></i> Login
        </a>
    </div>
</div>
@else
<style>
    .take-form-shell { box-shadow:0 18px 50px rgba(15,23,42,.08); }
    .take-question { background:#fff; border:1px solid #e2e8f0; }
    .take-question:focus-within { border-color:#93c5fd; box-shadow:0 0 0 3px rgba(37,99,235,.08); }
    .auto-grow-textarea {
        overflow: hidden;
        resize: none;
    }
    @media (max-width:640px) {
        .take-form-header, .take-form-body, .take-form-footer { padding-left:1rem; padding-right:1rem; }
        .take-question { padding:1rem; }
        .take-answer { margin-left:0 !important; }
        .take-form-footer > div { align-items:stretch; flex-direction:column; }
        .take-form-footer button { justify-content:center; width:100%; }
    }
</style>
<div class="max-w-5xl mx-auto py-5 sm:py-8 px-3 sm:px-4">
    <div class="take-form-shell bg-white rounded-2xl border border-gray-200 overflow-hidden">

        {{-- Timer Display --}}
        @if($showTimer)
        <div class="bg-red-50 border-b border-red-200 px-8 py-3 flex items-center justify-between">
            <div class="flex items-center gap-2 text-red-700">
                <i class="fas fa-clock"></i>
                <span class="text-sm font-medium">Time Remaining:</span>
            </div>
            <div id="timerDisplay" class="text-red-700 font-bold text-lg">
                <span id="timerMinutes">{{ $timeLimit }}</span>:<span id="timerSeconds">00</span>
            </div>
            <div class="text-xs text-red-500">
                <i class="fas fa-exclamation-circle"></i> Form will auto-submit when time expires
            </div>
        </div>
        @endif

        {{-- Form Header with Gradient --}}
        <div class="take-form-header bg-blue-600 px-8 py-6">
            <div class="flex justify-between items-center text-white">
                <a href="{{ route('intercession.index') }}#forms-tab" class="text-white/80 hover:text-white transition flex items-center gap-2">
                    <i class="fas fa-arrow-left"></i> Back to Forms
                </a>
                <div class="flex items-center gap-2 text-sm">
                    <i class="fas fa-file-alt"></i>
                    <span>Form</span>
                </div>
            </div>
            <div class="mt-4">
                <h1 class="text-3xl font-bold text-white mb-2">{{ $form->title }}</h1>
                <p class="text-indigo-100 whitespace-pre-line">{{ $form->description }}</p>
            </div>
        </div>

        {{-- Release Grade Notice --}}
        @if($isQuiz && $releaseGrade != 'immediately')
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mx-8 mt-4 flex items-center gap-3">
            <i class="fas fa-info-circle text-yellow-500"></i>
            <span class="text-sm text-yellow-700">
                @if($releaseGrade == 'later')
                Your score will be released after manual review.
                @elseif($releaseGrade == 'never')
                Your score will not be shown.
                @endif
            </span>
        </div>
        @endif

        {{-- Progress Bar (only if enabled) --}}
        @if($showProgressBar)
        <div class="px-8 pt-6">
            <div class="flex justify-between text-sm text-gray-600 mb-2">
                <span>Your Progress</span>
                <span id="progressPercent" class="font-semibold text-indigo-600">0%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
                <div id="progressBar" class="bg-indigo-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>
        </div>
        @endif

        {{-- Auto-save indicator --}}
        <div id="autoSaveIndicator" class="hidden fixed bottom-4 right-4 bg-green-500 text-white px-3 py-2 rounded-lg shadow-lg text-sm z-50">
            <i class="fas fa-check-circle mr-1"></i> Draft saved
        </div>

        {{-- Form Body --}}
        <form method="POST" action="{{ route('forms.submit', $form->id) }}" id="formSubmission">
            @csrf

            <div class="take-form-body p-8 space-y-6 bg-slate-50" id="formContainer">
                @php
                $totalQuestions = count($displayQuestions);
                $questionCounter = 0;
                $pageCounter = 1;
                $questionsPerPage = $onePageAtATime ? 5 : PHP_INT_MAX;
                $questionIndex = 0;
                @endphp

                {{-- Start first page --}}
                <div class="form-page" data-page="1" style="{{ $onePageAtATime ? '' : 'display: block;' }}">

                    @foreach($displayQuestions as $originalIndex => $question)
                    @php
                    $questionText = $question['text'] ?? $question['title'] ?? $question['question'] ?? 'Question';
                    $isRequired = $question['required'] ?? false;
                    $questionType = $question['type'] ?? 'short_answer';
                    $options = $question['options'] ?? [];
                    $min = $question['min'] ?? 1;
                    $max = $question['max'] ?? 5;
                    $minLabel = $question['minLabel'] ?? '';
                    $maxLabel = $question['maxLabel'] ?? '';
                    $rows = $question['rows'] ?? [];
                    $columns = $question['columns'] ?? [];
                    $points = $question['points'] ?? 1;
                    $correctAnswers = $question['correctAnswers'] ?? [];
                    $correctAnswer = $question['correctAnswer'] ?? '';

                    // Count correct answers for checkboxes and checkbox grids
                    $correctAnswerCount = isset($correctAnswers) && is_array($correctAnswers) ? count($correctAnswers) : 0;
                    
                    // For checkbox grid, count total correct answers across all rows
                    $totalGridCorrect = 0;
                    if ($questionType == 'checkbox_grid' && isset($correctAnswers) && is_array($correctAnswers)) {
                        foreach ($correctAnswers as $rowAnswers) {
                            if (is_array($rowAnswers)) {
                                $totalGridCorrect += count($rowAnswers);
                            }
                        }
                    }

                    $isSection = ($questionType === 'section_break' || $questionType === 'title_section');

                    if ($onePageAtATime && $questionIndex > 0 && $questionIndex % $questionsPerPage == 0 && !$isSection) {
                    echo '</div>
                <div class="form-page" data-page="' . ($pageCounter + 1) . '" style="display: none;">';
                    $pageCounter++;
                    }
                    $questionIndex++;
                    @endphp

                    @if($isSection)
                    <div class="section-card bg-gray-50 rounded-xl p-6 border-l-4 border-indigo-500">
                        <h2 class="text-2xl font-bold text-gray-800 leading-relaxed">{!! renderFormattedText($questionText) !!}</h2>
                        @if(!empty($question['description']))
                        <p class="text-gray-600 mt-2 leading-relaxed">{!! renderFormattedText($question['description']) !!}</p>
                        @endif
                        @if($questionType === 'section_break')
                        <div class="mt-4 border-t border-gray-300 pt-4">
                          
                        </div>
                        @endif
                    </div>
                    @else
                    @php $questionCounter++; @endphp
                    <div class="question-card take-question rounded-xl p-6 transition-all duration-300" data-question="{{ $originalIndex }}">
                        <div class="flex items-start justify-between mb-4">
                            <div class="flex items-center gap-3">
                                <label class="text-lg font-semibold text-gray-800 leading-relaxed block">
                                    {!! renderFormattedText($questionText) !!}
                                    @if($isRequired)
                                    <span class="text-red-500 text-sm ml-1">*</span>
                                    @endif
                                </label>
                            </div>
                        </div>

                        <div class="take-answer">
                            @if($questionType == 'short_answer')
                            <input type="text"
                                name="question_{{ $originalIndex }}"
                                class="question-input w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                placeholder="Type your answer here..."
                                {{ $isRequired ? 'required' : '' }}
                                data-question-index="{{ $originalIndex }}">

                            @elseif($questionType == 'paragraph')
                            <textarea name="question_{{ $originalIndex }}"
                                rows="4"
                                class="question-input auto-grow-textarea w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                placeholder="Write your detailed answer here..."
                                {{ $isRequired ? 'required' : '' }}
                                data-question-index="{{ $originalIndex }}"
                                oninput="autoResizeTextarea(this)"></textarea>

                            @elseif($questionType == 'multiple_choice')
                            <div class="space-y-3">
                                @foreach($options as $option)
                                <label class="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-indigo-50 transition group">
                                    <input type="radio"
                                        name="question_{{ $originalIndex }}"
                                        value="{{ $option }}"
                                        class="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                                        {{ $isRequired ? 'required' : '' }}
                                        data-question-index="{{ $originalIndex }}">
                                    <span class="ml-3 text-gray-700 group-hover:text-indigo-700">{{ $option }}</span>
                                    @if($isQuiz && $showCorrectAnswers && $correctAnswer == $option)
                                    <span class="ml-auto text-xs text-green-600">
                                        
                                    </span>
                                    @endif
                                </label>
                                @endforeach
                            </div>

                            @elseif($questionType == 'checkboxes')
                            <div class="space-y-3">
                                @php
                                    $maxSelectable = $correctAnswerCount > 0 ? $correctAnswerCount : 0;
                                @endphp
                                <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                                    <p class="text-xs text-gray-500 flex items-center gap-1">
                                        <i class="fas fa-info-circle text-blue-400"></i>
                                        @if($correctAnswerCount > 0)
                                            <span class="font-medium text-indigo-600">Select {{ $correctAnswerCount }}</span>
                                            <span class="text-gray-400 text-[10px]">({{ $correctAnswerCount }} of {{ count($options) }} options)</span>
                                        @else
                                            Select all that apply
                                        @endif
                                    </p>
                                    @if($correctAnswerCount > 0)
                                    <div class="flex items-center gap-2">
                                        <span class="text-xs text-gray-500">Selected:</span>
                                        <span id="selectedCount_{{ $originalIndex }}" class="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">0</span>
                                        <span class="text-xs text-gray-400">/ {{ $correctAnswerCount }}</span>
                                    </div>
                                    @endif
                                </div>
                                <div class="space-y-3" id="checkboxGroup_{{ $originalIndex }}">
                                    @foreach($options as $option)
                                    <label class="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-indigo-50 transition group checkbox-option" 
                                           data-question="{{ $originalIndex }}" data-value="{{ $option }}">
                                        <input type="checkbox"
                                            name="question_{{ $originalIndex }}[]"
                                            value="{{ $option }}"
                                            class="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 checkbox-input"
                                            data-question-index="{{ $originalIndex }}"
                                            data-max-select="{{ $maxSelectable }}"
                                            {{ $isRequired ? 'required' : '' }}
                                            onchange="handleCheckboxChange(this, {{ $originalIndex }}, {{ $maxSelectable }})">
                                        <span class="ml-3 text-gray-700 group-hover:text-indigo-700">{{ $option }}</span>
                                        @if($isQuiz && $showCorrectAnswers && in_array($option, $correctAnswers))
                                        <span class="ml-auto text-xs text-green-600">
                                            
                                        </span>
                                        @endif
                                    </label>
                                    @endforeach
                                </div>
                                @if($correctAnswerCount > 0)
                                <div id="checkboxWarning_{{ $originalIndex }}" class="hidden mt-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-start gap-2">
                                    <i class="fas fa-exclamation-triangle text-amber-500 mt-0.5"></i>
                                    <span id="warningMessage_{{ $originalIndex }}">Please select {{ $correctAnswerCount }}</span>
                                </div>
                                @endif
                            </div>

                            @elseif($questionType == 'dropdown')
                            <select name="question_{{ $originalIndex }}"
                                class="question-input w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                {{ $isRequired ? 'required' : '' }}
                                data-question-index="{{ $originalIndex }}">
                                <option value="">Select an option</option>
                                @foreach($options as $option)
                                <option value="{{ $option }}">{{ $option }}</option>
                                @endforeach
                            </select>

                            @elseif($questionType == 'linear_scale')
                            <div class="flex flex-wrap items-center justify-between gap-2 mt-2">
                                <span class="text-sm text-gray-500">{{ $minLabel ?: $min }}</span>
                                <div class="flex flex-wrap gap-3">
                                    @for($i = $min; $i <= $max; $i++)
                                        <label class="flex flex-col items-center cursor-pointer">
                                        <input type="radio"
                                            name="question_{{ $originalIndex }}"
                                            value="{{ $i }}"
                                            class="w-5 h-5 text-indigo-600"
                                            {{ $isRequired ? 'required' : '' }}
                                            data-question-index="{{ $originalIndex }}">
                                        <span class="text-sm mt-1 font-medium">{{ $i }}</span>
                                        @if($isQuiz && $showCorrectAnswers && $correctAnswer == $i)
                                        <span class="text-xs text-green-600"></span>
                                        @endif
                                        </label>
                                        @endfor
                                </div>
                                <span class="text-sm text-gray-500">{{ $maxLabel ?: $max }}</span>
                            </div>

                            @elseif($questionType == 'rating')
                            <div class="flex flex-wrap gap-4">
                                @for($i = 1; $i <= $max; $i++)
                                    <label class="flex flex-col items-center cursor-pointer hover:scale-110 transition">
                                    <input type="radio"
                                        name="question_{{ $originalIndex }}"
                                        value="{{ $i }}"
                                        class="hidden star-radio"
                                        {{ $isRequired ? 'required' : '' }}
                                        data-question-index="{{ $originalIndex }}">
                                    <i class="far fa-star text-3xl text-yellow-400 hover:text-yellow-500 transition star-icon" data-value="{{ $i }}"></i>
                                    <span class="text-xs text-gray-500 mt-1">{{ $i }}</span>
                                    @if($isQuiz && $showCorrectAnswers && $correctAnswer == $i)
                                    <span class="text-xs text-green-600"></span>
                                    @endif
                                    </label>
                                    @endfor
                            </div>

                            @elseif($questionType == 'date')
                            <input type="date"
                                name="question_{{ $originalIndex }}"
                                class="question-input w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                {{ $isRequired ? 'required' : '' }}
                                data-question-index="{{ $originalIndex }}">

                            @elseif($questionType == 'time')
                            <input type="time"
                                name="question_{{ $originalIndex }}"
                                class="question-input w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                {{ $isRequired ? 'required' : '' }}
                                data-question-index="{{ $originalIndex }}">

                            @elseif($questionType == 'multiple_choice_grid')
                            <div class="overflow-x-auto">
                                <table class="min-w-full border rounded-lg">
                                    <thead>
                                        <tr class="bg-gray-100">
                                            <th class="px-4 py-2 text-left text-sm font-medium text-gray-700"></th>
                                            @foreach($columns as $col)
                                            <th class="px-4 py-2 text-center text-sm font-medium text-gray-700">{{ $col }}</th>
                                            @endforeach
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @foreach($rows as $rowIndex => $row)
                                        <tr class="border-t">
                                            <td class="px-4 py-2 text-sm font-medium text-gray-700">{{ $row }}</td>
                                            @foreach($columns as $colIndex => $col)
                                            <td class="px-4 py-2 text-center">
                                                <input type="radio"
                                                    name="question_{{ $originalIndex }}_{{ $rowIndex }}"
                                                    value="{{ $col }}"
                                                    class="w-4 h-4 text-indigo-600"
                                                    {{ $isRequired ? 'required' : '' }}
                                                    data-question-index="{{ $originalIndex }}">
                                            </td>
                                            @endforeach
                                        </tr>
                                        @endforeach
                                    </tbody>
                                </table>
                            </div>

                            @elseif($questionType == 'checkbox_grid')
                            <div class="space-y-3">
                                @php
                                    $gridCorrectCount = 0;
                                    if (isset($correctAnswers) && is_array($correctAnswers)) {
                                        foreach ($correctAnswers as $rowAnswers) {
                                            if (is_array($rowAnswers)) {
                                                $gridCorrectCount += count($rowAnswers);
                                            }
                                        }
                                    }
                                    $maxSelectableGrid = $gridCorrectCount > 0 ? $gridCorrectCount : 0;
                                @endphp
                                <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                                    <p class="text-xs text-gray-500 flex items-center gap-1">
                                        <i class="fas fa-info-circle text-blue-400"></i>
                                        @if($gridCorrectCount > 0)
                                            <span class="font-medium text-indigo-600">Select {{ $gridCorrectCount }} across all rows</span>
                                        @else
                                            Select all that apply
                                        @endif
                                    </p>
                                    @if($gridCorrectCount > 0)
                                    <div class="flex items-center gap-2">
                                        <span class="text-xs text-gray-500">Selected:</span>
                                        <span id="gridSelectedCount_{{ $originalIndex }}" class="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">0</span>
                                        <span class="text-xs text-gray-400">/ {{ $gridCorrectCount }}</span>
                                    </div>
                                    @endif
                                </div>
                                <div class="overflow-x-auto">
                                    <table class="min-w-full border rounded-lg">
                                        <thead>
                                            <tr class="bg-gray-100">
                                                <th class="px-4 py-2 text-left text-sm font-medium text-gray-700"></th>
                                                @foreach($columns as $col)
                                                <th class="px-4 py-2 text-center text-sm font-medium text-gray-700">{{ $col }}</th>
                                                @endforeach
                                            </tr>
                                        </thead>
                                        <tbody>
                                            @foreach($rows as $rowIndex => $row)
                                            <tr class="border-t">
                                                <td class="px-4 py-2 text-sm font-medium text-gray-700">{{ $row }}</td>
                                                @foreach($columns as $colIndex => $col)
                                                <td class="px-4 py-2 text-center">
                                                    <input type="checkbox"
                                                        name="question_{{ $originalIndex }}_{{ $rowIndex }}[]"
                                                        value="{{ $col }}"
                                                        class="w-4 h-4 text-indigo-600 rounded grid-checkbox-input"
                                                        data-question-index="{{ $originalIndex }}"
                                                        data-row-index="{{ $rowIndex }}"
                                                        data-max-select="{{ $maxSelectableGrid }}"
                                                        onchange="handleGridCheckboxChange(this, {{ $originalIndex }}, {{ $maxSelectableGrid }})">
                                                </td>
                                                @endforeach
                                            </tr>
                                            @endforeach
                                        </tbody>
                                    </table>
                                </div>
                                @if($gridCorrectCount > 0)
                                <div id="gridWarning_{{ $originalIndex }}" class="hidden mt-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-start gap-2">
                                    <i class="fas fa-exclamation-triangle text-amber-500 mt-0.5"></i>
                                    <span id="gridWarningMessage_{{ $originalIndex }}">Please select {{ $gridCorrectCount }} across all rows.</span>
                                </div>
                                @endif
                            </div>
                            @endif
                        </div>
                    </div>
                    @endif
                    @endforeach

                </div>

                @if($onePageAtATime && $pageCounter > 1)
                <div class="flex justify-between items-center mt-6 pt-4 border-t">
                    <button type="button" id="prevPageBtn" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition disabled:opacity-50" disabled>
                        <i class="fas fa-arrow-left mr-1"></i> Previous
                    </button>
                    <span id="pageIndicator" class="text-sm text-gray-500">Page 1 of {{ $pageCounter }}</span>
                    <button type="button" id="nextPageBtn" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                        Next <i class="fas fa-arrow-right ml-1"></i>
                    </button>
                </div>
                @endif
            </div>

            <div class="take-form-footer bg-white px-8 py-6 border-t">
                <div class="flex justify-between items-center">
                    <div class="text-sm text-gray-500">
                    
                        @if($allowEditing)
                        <span class="ml-2 text-xs text-blue-600">(Editing allowed after submission)</span>
                        @endif
                        @if($isQuiz && $allowPartialPoints)
                      
                        @endif
                    </div>
                    <button type="submit" id="submitBtn" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition flex items-center gap-2">
                        <i class="fas fa-paper-plane"></i> Submit
                    </button>
                </div>
            </div>
        </form>
    </div>
</div>
@endif

<script>
    // ==================== CONSTANTS ====================
    const totalQuestions = {{ $totalQuestions }};
    const showProgressBar = {{ $showProgressBar ? 'true' : 'false' }};
    const showTimer = {{ $showTimer ? 'true' : 'false' }};
    const timeLimit = {{ $timeLimit }};
    const onePageAtATime = {{ $onePageAtATime ? 'true' : 'false' }};
    const totalPages = {{ $pageCounter ?? 1 }};
    const allowEditing = {{ $allowEditing ? 'true' : 'false' }};
    const allowPartialPoints = {{ $allowPartialPoints ? 'true' : 'false' }};
    const releaseGrade = '{{ $releaseGrade }}';
    const showCorrectAnswers = {{ $showCorrectAnswers ? 'true' : 'false' }};

    // ==================== VARIABLES ====================
    let autoSaveTimer = null;
    let isSubmitting = false;
    let timerInterval = null;
    let timeRemaining = timeLimit * 60;
    let currentPage = 1;

    // ==================== TIMER ====================
    if (showTimer) {
        function startTimer() {
            timerInterval = setInterval(function() {
                timeRemaining--;
                const minutes = Math.floor(timeRemaining / 60);
                const seconds = timeRemaining % 60;
                const minutesEl = document.getElementById('timerMinutes');
                const secondsEl = document.getElementById('timerSeconds');
                if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
                if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
                
                if (timeRemaining < 30) {
                    const timerDisplay = document.getElementById('timerDisplay');
                    if (timerDisplay) timerDisplay.classList.add('text-red-600', 'animate-pulse');
                }
                if (timeRemaining <= 0) {
                    clearInterval(timerInterval);
                    appAlert('Time is up! Your form will be submitted automatically.');
                    document.getElementById('formSubmission').submit();
                }
            }, 1000);
        }
        document.addEventListener('DOMContentLoaded', function() {
            startTimer();
        });
    }

    // ==================== PAGE NAVIGATION ====================
    if (onePageAtATime) {
        const pages = document.querySelectorAll('.form-page');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const pageIndicator = document.getElementById('pageIndicator');

        function showPage(pageNumber) {
            pages.forEach((page, index) => {
                page.style.display = (index + 1 === pageNumber) ? 'block' : 'none';
            });
            currentPage = pageNumber;
            if (prevBtn) prevBtn.disabled = pageNumber === 1;
            if (nextBtn) nextBtn.disabled = pageNumber === totalPages;
            if (pageIndicator) pageIndicator.textContent = `Page ${pageNumber} of ${totalPages}`;
            document.getElementById('formContainer').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
        if (nextBtn) nextBtn.addEventListener('click', function() {
            if (currentPage < totalPages) showPage(currentPage + 1);
        });
        if (prevBtn) prevBtn.addEventListener('click', function() {
            if (currentPage > 1) showPage(currentPage - 1);
        });
        showPage(1);
    }

    // ==================== PROGRESS TRACKING ====================
    function updateProgress() {
        if (!showProgressBar) return;

        let answeredCount = 0;
        let questionCount = 0;

        @foreach($displayQuestions as $index => $question)
        @php
        $questionType = $question['type'] ?? 'short_answer';
        $isSection = ($questionType === 'section_break' || $questionType === 'title_section');
        $originalIndex = $index;
        @endphp
        @if(!$isSection)
        questionCount++;
        @if($questionType == 'multiple_choice' || $questionType == 'linear_scale' || $questionType == 'rating' || $questionType == 'dropdown')
        const radioGroup{{ $originalIndex }} = document.querySelectorAll('input[name="question_{{ $originalIndex }}"]');
        let isAnswered{{ $originalIndex }} = false;
        radioGroup{{ $originalIndex }}.forEach(function(input) {
            if (input.checked) isAnswered{{ $originalIndex }} = true;
        });
        if (isAnswered{{ $originalIndex }}) answeredCount++;
        @elseif($questionType == 'checkboxes')
        const checkGroup{{ $originalIndex }} = document.querySelectorAll('input[name="question_{{ $originalIndex }}[]"]:checked');
        if (checkGroup{{ $originalIndex }}.length > 0) answeredCount++;
        @elseif($questionType == 'multiple_choice_grid')
        const gridRadios{{ $originalIndex }} = document.querySelectorAll('input[name^="question_{{ $originalIndex }}_"]:checked');
        if (gridRadios{{ $originalIndex }}.length > 0) answeredCount++;
        @elseif($questionType == 'checkbox_grid')
        const gridCheckboxes{{ $originalIndex }} = document.querySelectorAll('input[name^="question_{{ $originalIndex }}_"][type="checkbox"]:checked');
        if (gridCheckboxes{{ $originalIndex }}.length > 0) answeredCount++;
        @else
        const inputField{{ $originalIndex }} = document.querySelector('input[name="question_{{ $originalIndex }}"]:not([type="checkbox"]):not([type="radio"]), textarea[name="question_{{ $originalIndex }}"], select[name="question_{{ $originalIndex }}"]');
        if (inputField{{ $originalIndex }}) {
            const val{{ $originalIndex }} = inputField{{ $originalIndex }}.value;
            if (val{{ $originalIndex }} !== null && val{{ $originalIndex }} !== undefined && val{{ $originalIndex }} !== '') {
                if (typeof val{{ $originalIndex }} === 'string' && val{{ $originalIndex }}.trim() !== '') {
                    answeredCount++;
                } else if (Array.isArray(val{{ $originalIndex }}) && val{{ $originalIndex }}.length > 0) {
                    answeredCount++;
                }
            }
        }
        @endif
        @endif
        @endforeach

        const progressBar = document.getElementById('progressBar');
        const progressPercent = document.getElementById('progressPercent');
        const percentage = questionCount > 0 ? Math.round((answeredCount / questionCount) * 100) : 0;
        if (progressBar) progressBar.style.width = percentage + '%';
        if (progressPercent) progressPercent.textContent = percentage + '%';
    }

    // ==================== AUTO-SAVE ====================
    function autoSaveForm() {
        if (isSubmitting) return;
        const formData = {};
        
        @foreach($displayQuestions as $index => $question)
        @php
        $questionType = $question['type'] ?? 'short_answer';
        $isSection = ($questionType === 'section_break' || $questionType === 'title_section');
        $originalIndex = $index;
        @endphp
        @if(!$isSection)
        @if($questionType == 'multiple_choice' || $questionType == 'linear_scale' || $questionType == 'rating' || $questionType == 'dropdown')
        const radio{{ $originalIndex }} = document.querySelector('input[name="question_{{ $originalIndex }}"]:checked');
        formData['question_{{ $originalIndex }}'] = radio{{ $originalIndex }} ? radio{{ $originalIndex }}.value : null;
        @elseif($questionType == 'checkboxes')
        const checkboxes{{ $originalIndex }} = document.querySelectorAll('input[name="question_{{ $originalIndex }}[]"]:checked');
        formData['question_{{ $originalIndex }}'] = Array.from(checkboxes{{ $originalIndex }}).map(function(cb) { return cb.value; });
        @elseif($questionType == 'multiple_choice_grid')
        const gridInputs{{ $originalIndex }} = document.querySelectorAll('input[name^="question_{{ $originalIndex }}_"]:checked');
        const gridData{{ $originalIndex }} = {};
        gridInputs{{ $originalIndex }}.forEach(function(input) {
            gridData{{ $originalIndex }}[input.name] = input.value;
        });
        formData['question_{{ $originalIndex }}'] = gridData{{ $originalIndex }};
        @elseif($questionType == 'checkbox_grid')
        const gridCheckboxes{{ $originalIndex }} = document.querySelectorAll('input[name^="question_{{ $originalIndex }}_"][type="checkbox"]:checked');
        const gridData{{ $originalIndex }} = {};
        gridCheckboxes{{ $originalIndex }}.forEach(function(input) {
            if (!gridData{{ $originalIndex }}[input.name]) {
                gridData{{ $originalIndex }}[input.name] = [];
            }
            gridData{{ $originalIndex }}[input.name].push(input.value);
        });
        formData['question_{{ $originalIndex }}'] = gridData{{ $originalIndex }};
        @else
        const inputField{{ $originalIndex }} = document.querySelector('input[name="question_{{ $originalIndex }}"], textarea[name="question_{{ $originalIndex }}"], select[name="question_{{ $originalIndex }}"]');
        formData['question_{{ $originalIndex }}'] = inputField{{ $originalIndex }} ? inputField{{ $originalIndex }}.value : '';
        @endif
        @endif
        @endforeach
        
        formData['form_id'] = {{ $form->id }};
        formData['timestamp'] = new Date().toISOString();
        localStorage.setItem('form_auto_save_{{ $form->id }}', JSON.stringify(formData));
        showAutoSaveIndicator();
    }

    function showAutoSaveIndicator() {
        const indicator = document.getElementById('autoSaveIndicator');
        if (indicator) {
            indicator.classList.remove('hidden');
            setTimeout(function() {
                indicator.classList.add('hidden');
            }, 2000);
        }
    }

    async function loadAutoSavedData() {
        const saved = localStorage.getItem('form_auto_save_{{ $form->id }}');
        if (saved) {
            try {
                const formData = JSON.parse(saved);
                if (await appConfirm('You have a saved draft. Do you want to continue where you left off?')) {
                    @foreach($displayQuestions as $index => $question)
                    @php
                    $questionType = $question['type'] ?? 'short_answer';
                    $isSection = ($questionType === 'section_break' || $questionType === 'title_section');
                    $originalIndex = $index;
                    @endphp
                    @if(!$isSection)
                    @if($questionType == 'multiple_choice' || $questionType == 'linear_scale' || $questionType == 'rating' || $questionType == 'dropdown')
                    if (formData['question_{{ $originalIndex }}']) {
                        const radio = document.querySelector('input[name="question_{{ $originalIndex }}"][value="' + formData['question_{{ $originalIndex }}'] + '"]');
                        if (radio) radio.checked = true;
                    }
                    @elseif($questionType == 'checkboxes')
                    if (formData['question_{{ $originalIndex }}'] && Array.isArray(formData['question_{{ $originalIndex }}'])) {
                        document.querySelectorAll('input[name="question_{{ $originalIndex }}[]"]').forEach(function(cb) {
                            cb.checked = formData['question_{{ $originalIndex }}'].includes(cb.value);
                        });
                    }
                    @elseif($questionType == 'multiple_choice_grid')
                    if (formData['question_{{ $originalIndex }}'] && typeof formData['question_{{ $originalIndex }}'] === 'object') {
                        const gridData = formData['question_{{ $originalIndex }}'];
                        Object.keys(gridData).forEach(function(name) {
                            const input = document.querySelector('input[name="' + name + '"][value="' + gridData[name] + '"]');
                            if (input) input.checked = true;
                        });
                    }
                    @elseif($questionType == 'checkbox_grid')
                    if (formData['question_{{ $originalIndex }}'] && typeof formData['question_{{ $originalIndex }}'] === 'object') {
                        const gridData = formData['question_{{ $originalIndex }}'];
                        Object.keys(gridData).forEach(function(name) {
                            gridData[name].forEach(function(value) {
                                const input = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
                                if (input) input.checked = true;
                            });
                        });
                    }
                    @else
                    const inputField{{ $originalIndex }} = document.querySelector('input[name="question_{{ $originalIndex }}"], textarea[name="question_{{ $originalIndex }}"], select[name="question_{{ $originalIndex }}"]');
                    if (inputField{{ $originalIndex }} && formData['question_{{ $originalIndex }}'] !== undefined && formData['question_{{ $originalIndex }}'] !== null) {
                        inputField{{ $originalIndex }}.value = formData['question_{{ $originalIndex }}'];
                    }
                    @endif
                    @endif
                    @endforeach
                    updateProgress();
                    showNotification('Draft loaded successfully!', 'success');
                }
            } catch (e) {
                console.log('Error loading saved data:', e);
            }
        }
    }

    function showNotification(message, type) {
    return window.appNotify(...arguments);
        const notification = document.createElement('div');
        var bgClass = 'bg-blue-500';
        if (type === 'success') bgClass = 'bg-green-500';
        else if (type === 'error') bgClass = 'bg-red-500';
        notification.className = 'fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg text-white z-50 transition-all duration-300 ' + bgClass;
        notification.innerHTML = message;
        document.body.appendChild(notification);
        setTimeout(function() {
            notification.remove();
        }, 3000);
    }

    // ==================== CHECKBOX HANDLING ====================
    function handleCheckboxChange(checkbox, questionIndex, maxSelect) {
        if (maxSelect === undefined || maxSelect === null) {
            maxSelect = parseInt(checkbox.dataset.maxSelect) || 0;
        }
        
        const group = document.querySelectorAll('input[name="question_' + questionIndex + '[]"]');
        const checkedCount = document.querySelectorAll('input[name="question_' + questionIndex + '[]"]:checked').length;
        const selectedCountSpan = document.getElementById('selectedCount_' + questionIndex);
        const warningDiv = document.getElementById('checkboxWarning_' + questionIndex);
        const warningMessage = document.getElementById('warningMessage_' + questionIndex);
        
        // Update selected count
        if (selectedCountSpan) {
            selectedCountSpan.textContent = checkedCount;
        }
        
        // If maxSelect is 0, allow unlimited selections
        if (maxSelect === 0) {
            group.forEach(function(cb) {
                cb.disabled = false;
                var option = cb.closest('.checkbox-option');
                if (option) {
                    option.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            });
            if (warningDiv) {
                warningDiv.classList.add('hidden');
            }
            updateProgress();
            if (autoSaveTimer) clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(autoSaveForm, 1000);
            return;
        }
        
        // Check if max reached
        if (checkedCount >= maxSelect) {
            group.forEach(function(cb) {
                if (!cb.checked) {
                    cb.disabled = true;
                    var option = cb.closest('.checkbox-option');
                    if (option) {
                        option.classList.add('opacity-50', 'cursor-not-allowed');
                    }
                }
            });
            if (warningDiv && warningMessage) {
                warningDiv.classList.remove('hidden');
                warningMessage.textContent = ' You have selected ' + checkedCount + ' of ' + maxSelect + '.';
            }
        } else {
            group.forEach(function(cb) {
                cb.disabled = false;
                var option = cb.closest('.checkbox-option');
                if (option) {
                    option.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            });
            if (warningDiv) {
                warningDiv.classList.add('hidden');
            }
        }
        
        // If checked count is less than max, show warning
        if (checkedCount < maxSelect && checkedCount > 0) {
            if (warningDiv && warningMessage) {
                warningDiv.classList.remove('hidden');
                warningMessage.textContent = 'Please select ' + maxSelect + ' You have selected ' + checkedCount + ' of ' + maxSelect + '.';
            }
        } else if (checkedCount === 0) {
            if (warningDiv) {
                warningDiv.classList.add('hidden');
            }
        }
        
        updateProgress();
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(autoSaveForm, 1000);
    }

    // ==================== CHECKBOX GRID HANDLING ====================
    function handleGridCheckboxChange(checkbox, questionIndex, maxSelect) {
        if (maxSelect === undefined || maxSelect === null) {
            maxSelect = parseInt(checkbox.dataset.maxSelect) || 0;
        }
        
        const group = document.querySelectorAll('input[name^="question_' + questionIndex + '_"][type="checkbox"]');
        const checkedCount = document.querySelectorAll('input[name^="question_' + questionIndex + '_"][type="checkbox"]:checked').length;
        const selectedCountSpan = document.getElementById('gridSelectedCount_' + questionIndex);
        const warningDiv = document.getElementById('gridWarning_' + questionIndex);
        const warningMessage = document.getElementById('gridWarningMessage_' + questionIndex);
        
        // Update selected count
        if (selectedCountSpan) {
            selectedCountSpan.textContent = checkedCount;
        }
        
        // If maxSelect is 0, allow unlimited selections
        if (maxSelect === 0) {
            group.forEach(function(cb) {
                cb.disabled = false;
            });
            if (warningDiv) {
                warningDiv.classList.add('hidden');
            }
            updateProgress();
            if (autoSaveTimer) clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(autoSaveForm, 1000);
            return;
        }
        
        // Check if max reached
        if (checkedCount >= maxSelect) {
            group.forEach(function(cb) {
                if (!cb.checked) {
                    cb.disabled = true;
                }
            });
            if (warningDiv && warningMessage) {
                warningDiv.classList.remove('hidden');
                warningMessage.textContent = ' You have selected ' + checkedCount + ' of ' + maxSelect + '.';
            }
        } else {
            group.forEach(function(cb) {
                cb.disabled = false;
            });
            if (warningDiv) {
                warningDiv.classList.add('hidden');
            }
        }
        
        // If checked count is less than max, show warning
        if (checkedCount < maxSelect && checkedCount > 0) {
            if (warningDiv && warningMessage) {
                warningDiv.classList.remove('hidden');
                warningMessage.textContent = ' Please select ' + maxSelect + ' You have selected ' + checkedCount + ' of ' + maxSelect + '.';
            }
        } else if (checkedCount === 0) {
            if (warningDiv) {
                warningDiv.classList.add('hidden');
            }
        }
        
        updateProgress();
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(autoSaveForm, 1000);
    }

    // ==================== VALIDATE CHECKBOXES ON SUBMIT ====================
    function validateCheckboxes() {
        var isValid = true;
        var errorMessages = [];
        
        @foreach($displayQuestions as $index => $question)
        @php
        $questionType = $question['type'] ?? 'short_answer';
        $isSection = ($questionType === 'section_break' || $questionType === 'title_section');
        $originalIndex = $index;
        $correctAnswers = $question['correctAnswers'] ?? [];
        $correctAnswerCount = isset($correctAnswers) && is_array($correctAnswers) ? count($correctAnswers) : 0;
        @endphp
        @if(!$isSection && $questionType == 'checkboxes' && $correctAnswerCount > 0)
        var checkboxes_{{ $originalIndex }} = document.querySelectorAll('input[name="question_{{ $originalIndex }}[]"]:checked');
        var checkedCount_{{ $originalIndex }} = checkboxes_{{ $originalIndex }}.length;
        
        @endif
        @if(!$isSection && $questionType == 'checkbox_grid' && $correctAnswerCount > 0)
        var gridCheckboxes_{{ $originalIndex }} = document.querySelectorAll('input[name^="question_{{ $originalIndex }}_"][type="checkbox"]:checked');
        var gridCheckedCount_{{ $originalIndex }} = gridCheckboxes_{{ $originalIndex }}.length;
       
        @endif
        @endforeach
        
        if (!isValid) {
            appAlert(' ' + errorMessages.join('\n\n'));
            return false;
        }
        return true;
    }

    // ==================== EVENT LISTENERS ====================
    document.addEventListener('DOMContentLoaded', function() {
        updateProgress();
        loadAutoSavedData();
        document.querySelectorAll('.auto-grow-textarea').forEach(function(textarea) {
            autoResizeTextarea(textarea);
        });
        
        // Add validation to form submit
        const form = document.getElementById('formSubmission');
        if (form) {
            form.addEventListener('submit', function(e) {
                if (!validateCheckboxes()) {
                    e.preventDefault();
                    return false;
                }
            });
        }
    });

    function autoResizeTextarea(textarea) {
        if (!textarea) return;
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    // Add input event listeners for auto-save
    document.querySelectorAll('input, textarea, select').forEach(function(input) {
        input.addEventListener('change', function() {
            if (autoSaveTimer) clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(autoSaveForm, 1000);
            updateProgress();
        });
        input.addEventListener('keyup', function() {
            if (autoSaveTimer) clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(autoSaveForm, 1000);
            updateProgress();
        });
    });

    // ==================== STAR RATING ====================
    document.querySelectorAll('.star-icon').forEach(function(star) {
        star.addEventListener('click', function() {
            var value = this.dataset.value;
            var radio = this.parentElement.querySelector('.star-radio');
            if (radio) radio.checked = true;
            var container = this.closest('.flex');
            var allStars = container.querySelectorAll('.star-icon');
            allStars.forEach(function(s, idx) {
                if (idx < value) {
                    s.classList.remove('far');
                    s.classList.add('fas');
                } else {
                    s.classList.remove('fas');
                    s.classList.add('far');
                }
            });
            updateProgress();
            if (autoSaveTimer) clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(autoSaveForm, 1000);
        });
    });

    // ==================== CLEAR AUTO-SAVE ====================
    function clearAutoSave() {
        localStorage.removeItem('form_auto_save_{{ $form->id }}');
    }

    // ==================== FORM SUBMISSION ====================
    document.getElementById('formSubmission').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Final validation before submission
        if (!validateCheckboxes()) {
            return;
        }
        
        var submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        if (timerInterval) clearInterval(timerInterval);
        
        var formData = new FormData(this);
        fetch(this.action, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },
            body: formData
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            if (data.success) {
                clearAutoSave();
                const submissionQuery = data.submission_id ? `?submission_id=${data.submission_id}` : '';
                window.location.href = `/forms/${data.form_id}/results${submissionQuery}`;
            } else {
                appAlert('Error: ' + data.message);
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Form';
            }
        })
        .catch(function(error) {
            console.error('Error:', error);
            appAlert('Error submitting form. Please try again.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Form';
        });
    });

    // ==================== STYLES FOR DISABLED CHECKBOXES ====================
    var checkboxStyles = document.createElement('style');
    checkboxStyles.textContent = `
        .checkbox-option.opacity-50 {
            opacity: 0.5;
        }
        .checkbox-option.cursor-not-allowed {
            cursor: not-allowed;
        }
        .checkbox-option input:disabled + span {
            color: #9ca3af;
        }
        .checkbox-option:hover input:disabled + span {
            color: #9ca3af;
        }
        input[type="checkbox"]:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    `;
    document.head.appendChild(checkboxStyles);
</script>

<style>
    .question-card {
        transition: all 0.3s ease;
    }
    .question-card:hover {
        transform: translateX(5px);
    }
    .section-card {
        transition: all 0.3s ease;
    }
    .question-input:focus {
        outline: none;
        border-color: #6366f1;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }
    .star-icon {
        cursor: pointer;
        transition: transform 0.2s ease;
    }
    .star-icon:hover {
        transform: scale(1.2);
    }
    input[type="radio"]:checked + span {
        color: #4f46e5;
        font-weight: 500;
    }
    #progressBar {
        transition: width 0.3s ease-in-out;
    }
    #autoSaveIndicator {
        transition: all 0.3s ease;
    }
    .form-page {
        animation: fadeIn 0.3s ease-in-out;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
    .animate-pulse {
        animation: pulse 1s ease-in-out infinite;
    }
</style>
@endsection
