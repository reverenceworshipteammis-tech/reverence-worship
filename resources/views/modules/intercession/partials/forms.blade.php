<div class="bg-white rounded-xl shadow-md p-6">
    
    @php
        $canViewForms = auth()->check() && auth()->user()->canAccess('intercession', 'view-forms');
        $canCreateForms = auth()->check() && auth()->user()->canAccess('intercession', 'create-forms');
        $canManageForms = auth()->check() && auth()->user()->canAccess('intercession', 'manage-forms');
        $canEditForms = auth()->check() && auth()->user()->canAccess('intercession', 'edit-forms');
        $canDeleteForms = auth()->check() && auth()->user()->canAccess('intercession', 'delete-forms');
        $canPublishForms = auth()->check() && auth()->user()->canAccess('intercession', 'publish-forms');
        $canViewResults = auth()->check() && auth()->user()->canAccess('intercession', 'view-results');
        $canViewReports = auth()->check() && auth()->user()->canAccess('intercession', 'view-reports');
        $canExportReports = auth()->check() && auth()->user()->canAccess('intercession', 'export-reports');
        $isSuperAdmin = auth()->check() && auth()->user()->isSuperAdmin();
        $canBrowseForms = auth()->check();
        $canViewOwnResults = auth()->check();
        $availableCount = collect($availableForms ?? [])->count();
        $myResultsCount = collect($mySubmissions ?? [])->count();
        $managedFormsCount = collect($allForms ?? [])->count();
    @endphp

    {{-- Form Actions --}}
    <div class="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 mb-6">
        <div class="grid w-full grid-cols-2 gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 sm:inline-flex sm:w-auto">
            @if($canBrowseForms)
            <button onclick="showFormSection('available')" id="form-section-available" class="section-btn whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white">
                <i class="fas fa-clipboard-list mr-1.5"></i> Available
            </button>
            @endif
            
            @if($canViewOwnResults)
            <button onclick="showFormSection('results')" id="form-section-results" class="section-btn whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium text-gray-600">
                <i class="fas fa-chart-line mr-1.5"></i> My Results
            </button>
            @endif
            
            @if($canManageForms || $isSuperAdmin)
            <button onclick="showFormSection('manage')" id="form-section-manage" class="section-btn whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium text-gray-600">
                <i class="fas fa-sliders-h mr-1.5"></i> Manage
            </button>
            @endif
            @if($canViewReports || $isSuperAdmin)
            <button onclick="showFormSection('reports')" id="form-section-reports" class="section-btn whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium text-gray-600">
                <i class="fas fa-chart-bar mr-1.5"></i> Reports
            </button>
            @endif
        </div>
        
        {{-- Create Form Button --}}
        @if($canCreateForms || $isSuperAdmin)
        <a href="{{ route('forms.manage.create') }}" class="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
            <i class="fas fa-plus mr-1"></i> Create Form
        </a>
        @endif
    </div>

    {{-- Available Forms Section --}}
    @if($canBrowseForms)
    <div id="available-forms-section" class="form-section">
        <h3 class="text-lg font-bold mb-4">Available Forms</h3>
        <div id="available-forms-list">
            @forelse($availableForms ?? [] as $form)
            @php
                $formSettings = is_string($form->settings) ? json_decode($form->settings, true) : ($form->settings ?? []);
                $isPublished = $formSettings['is_published'] ?? false;
                $limitOneResponse = $formSettings['limit_one_response'] ?? true;
                
                // Handle questions properly
                $questions = $form->questions ?? [];
                if (is_string($questions)) {
                    $questions = json_decode($questions, true) ?? [];
                }
                if (!is_array($questions)) {
                    $questions = [];
                }
                $questionsCount = collect($questions)->reject(fn($question) => in_array($question['type'] ?? '', ['title_section', 'section_break']))->count();
                $createdDate = isset($form->created_at) ? \Carbon\Carbon::parse($form->created_at)->format('F j, Y') : 'Date unknown';
                $latestSubmission = isset($mySubmissions) ? $mySubmissions->firstWhere('form_id', $form->id) : null;
                $hasTaken = !is_null($latestSubmission);
                $cardUrl = $hasTaken
                    ? route('forms.results', ['id' => $form->id, 'submission_id' => $latestSubmission->id])
                    : route('forms.take', $form->id);
                
            @endphp
            @if($isPublished)
            <div
                class="available-form-card rounded-xl p-4 sm:p-5 mb-3 transition-all duration-200 cursor-pointer hover:shadow-md hover:border-blue-200"
                role="button"
                tabindex="0"
                onclick="window.location.href='{{ $cardUrl }}'"
                onkeydown="if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); window.location.href='{{ $cardUrl }}'; }"
                aria-label="{{ $hasTaken ? 'View results for ' . $form->title : 'Open form ' . $form->title }}"
                >
                <div class="grid grid-cols-1 sm:grid-cols-[minmax(0,520px)_auto] sm:items-center gap-3 sm:gap-6">
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 mb-2">
                            <h4 class="font-semibold text-slate-800 text-base sm:text-lg">{{ $form->title }}</h4>
                            @if($hasTaken)
                            <span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                <i class="fas fa-check-circle"></i> Completed
                            </span>
                            @endif
                            @if($limitOneResponse)
                            <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                <i class="fas fa-lock"></i> Limit 1
                            </span>
                            @endif
                        </div>
                    </div>
                </div>
            </div>
            @endif
            @empty
            <div class="text-center py-12">
                <i class="fas fa-file-alt text-5xl text-gray-300 mb-3"></i>
                <p class="text-gray-500">No forms available</p>
                
            </div>
            @endforelse
        </div>
    </div>
    @endif

   {{-- My Results Section --}}
@if($canViewOwnResults)
<div id="results-section" class="form-section hidden">
    <h3 class="text-lg font-bold mb-4">My Results</h3>
    <div id="results-list">
        @forelse($mySubmissions ?? [] as $submission)
        @php
            // Get questions from the form - handle both string and array
            $questions = [];
            if (isset($submission->form) && isset($submission->form->questions)) {
                if (is_string($submission->form->questions)) {
                    $questions = json_decode($submission->form->questions, true) ?? [];
                } elseif (is_array($submission->form->questions)) {
                    $questions = $submission->form->questions;
                }
            }
            if (!is_array($questions)) {
                $questions = [];
            }
            $questionsCount = collect($questions)->reject(fn($question) => in_array($question['type'] ?? '', ['title_section', 'section_break']))->count();
            
            // Get answers from the submission - handle both string and array
            $answers = [];
            if (isset($submission->answers)) {
                if (is_string($submission->answers)) {
                    $answers = json_decode($submission->answers, true) ?? [];
                } elseif (is_array($submission->answers)) {
                    $answers = $submission->answers;
                }
            }
            if (!is_array($answers)) {
                $answers = [];
            }
            
            // Recalculate score using the same logic as results page
            $totalPoints = 0;
            $earnedPoints = 0;
            $resultSettings = isset($submission->form)
                ? (is_string($submission->form->settings) ? json_decode($submission->form->settings, true) : ($submission->form->settings ?? []))
                : [];
            $allowPartialPoints = $resultSettings['allow_partial_points'] ?? true;
            $releaseGrade = $resultSettings['release_grade'] ?? 'immediately';
            $isReleased = !empty($submission->released_at) || !empty($submission->is_released);
            $showResultScore = $releaseGrade === 'immediately' || ($releaseGrade === 'later' && $isReleased);
            $submissionManualGrades = json_decode($submission->manual_grades ?? '[]', true) ?: [];
            
            if (!empty($questions) && !empty($answers)) {
                foreach($questions as $index => $question) {
                    $questionType = $question['type'] ?? 'short_answer';
                    
                    // Skip sections
                    if ($questionType == 'title_section' || $questionType == 'section_break') {
                        continue;
                    }
                    
                    $points = isset($question['points']) ? (int)$question['points'] : 1;
                    $totalPoints += $points;
                    
                    $answerKey = 'question_' . $index;
                    $answer = $answers[$answerKey] ?? null;
                    
                    // Calculate earned points based on question type
                    if ($questionType == 'multiple_choice' || $questionType == 'dropdown') {
                        if (isset($question['correctAnswer']) && $question['correctAnswer'] !== '') {
                            if ($answer == $question['correctAnswer']) {
                                $earnedPoints += $points;
                            }
                        }
                    } elseif ($questionType == 'checkboxes') {
                        if (isset($question['correctAnswers']) && is_array($question['correctAnswers']) && !empty($question['correctAnswers'])) {
                            $correctAnswers = array_values(array_unique($question['correctAnswers']));
                            $userAnswers = is_array($answer) ? array_values(array_unique($answer)) : [];
                            
                            if (!empty($userAnswers)) {
                                $totalCorrect = count($correctAnswers);
                                $correctSelected = count(array_intersect($userAnswers, $correctAnswers));
                                $isExactMatch = $correctSelected === $totalCorrect
                                    && count($userAnswers) === $totalCorrect;
                                
                                if ($allowPartialPoints && $correctSelected > 0) {
                                    $earnedPoints += ($correctSelected / $totalCorrect) * $points;
                                } elseif (!$allowPartialPoints && $isExactMatch) {
                                    $earnedPoints += $points;
                                }
                            }
                        }
                    } elseif ($questionType == 'short_answer' || $questionType == 'paragraph') {
                        if (isset($question['correctAnswer']) && $question['correctAnswer'] !== '') {
                            if (strtolower(trim((string) $answer)) == strtolower(trim((string) $question['correctAnswer']))) {
                                $earnedPoints += $points;
                            }
                        }
                    } elseif ($questionType == 'date' || $questionType == 'time') {
                        if (isset($question['correctAnswer']) && $question['correctAnswer'] !== '') {
                            if ($answer == $question['correctAnswer']) {
                                $earnedPoints += $points;
                            }
                        }
                    } elseif ($questionType == 'linear_scale' || $questionType == 'rating') {
                        if ($answer !== null && $answer !== '') {
                            $earnedPoints += $points;
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
                                        $earnedPoints += $points / count($rows);
                                    }
                                }
                            }
                        }
                    } elseif ($questionType == 'checkbox_grid') {
                        if (isset($question['correctAnswers']) && is_array($question['correctAnswers'])) {
                            $rows = $question['rows'] ?? [];
                            $gridAnswers = is_array($answer) ? $answer : [];
                            $totalCorrect = 0;
                            $correctSelected = 0;
                            $allExact = true;

                            foreach ($rows as $rowIndex => $row) {
                                $rowKey = 'question_' . $index . '_' . $rowIndex;
                                $userRowAnswers = isset($gridAnswers[$rowKey]) ? (array)$gridAnswers[$rowKey] : [];
                                $correctRowAnswers = array_values(array_unique((array) ($question['correctAnswers'][$rowIndex] ?? [])));

                                if (!empty($correctRowAnswers)) {
                                    $userRowAnswers = array_values(array_unique($userRowAnswers));
                                    $correctCount = count(array_intersect($correctRowAnswers, $userRowAnswers));
                                    $incorrectCount = count(array_diff($userRowAnswers, $correctRowAnswers));
                                    $rowExact = $correctCount === count($correctRowAnswers)
                                        && $incorrectCount === 0
                                        && count($userRowAnswers) === count($correctRowAnswers);

                                    $totalCorrect += count($correctRowAnswers);
                                    $correctSelected += $correctCount;
                                    if (!$rowExact) {
                                        $allExact = false;
                                    }
                                }
                            }

                            if ($allowPartialPoints) {
                                if ($totalCorrect > 0 && $correctSelected > 0) {
                                    $earnedPoints += ($correctSelected / $totalCorrect) * $points;
                                }
                            } elseif ($allExact && $totalCorrect > 0) {
                                $earnedPoints += $points;
                            }
                        }
                    }
                }
            }
            
            $earnedPoints = round($earnedPoints, 2);
            $displayPoints = number_format($earnedPoints, 1);
            $displayTotalPoints = rtrim(rtrim(number_format($totalPoints, 2, '.', ''), '0'), '.');
            if (!empty($submissionManualGrades) && $submission->score !== null) {
                $earnedPoints = $totalPoints > 0
                    ? round(((float) $submission->score / 100) * $totalPoints, 2)
                    : 0;
                $displayPoints = number_format($earnedPoints, 1);
            }
            
        @endphp
        <div class="border rounded-lg p-3 sm:p-4 mb-3 hover:shadow-md transition cursor-pointer"
             role="button"
             tabindex="0"
             onclick="viewFormResult({{ $submission->form_id ?? 0 }}, {{ $submission->id ?? 0 }})"
             onkeydown="if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); viewFormResult({{ $submission->form_id ?? 0 }}, {{ $submission->id ?? 0 }}); }"
             aria-label="View details for {{ $submission->form->title ?? 'Form result' }}">
            <div class="grid grid-cols-1 sm:grid-cols-[minmax(0,420px)_auto] sm:items-center gap-3 sm:gap-6">
                <div>
                    <h4 class="font-semibold text-gray-800">{{ $submission->form->title ?? 'Form' }}</h4>
                    <div class="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                        <span>
                            <i class="fas fa-calendar-check"></i>
                            Submitted {{ isset($submission->submitted_at) ? \Carbon\Carbon::parse($submission->submitted_at)->format('M d, Y \a\t h:i A') : 'N/A' }}
                        </span>
                    </div>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                    @if($showResultScore)
                    <p class="text-xl font-bold text-blue-700">{{ $displayPoints }} / {{ $displayTotalPoints }}</p>
                    @elseif($releaseGrade === 'later')
                    <p class="text-sm font-semibold text-amber-600"><i class="fas fa-clock mr-1"></i> Pending review</p>
                    @else
                    <p class="text-sm font-semibold text-gray-500"><i class="fas fa-lock mr-1"></i> Score private</p>
                    @endif
                </div>
            </div>
        </div>
        @empty
        <div class="text-center py-12">
            <i class="fas fa-chart-line text-5xl text-gray-300 mb-3"></i>
            <p class="text-gray-500">No results yet</p>
            <p class="text-xs text-gray-400 mt-1">Complete a form to see your results here</p>
        </div>
        @endforelse
    </div>
</div>
@endif
    {{-- Manage Forms Section --}}
    @if($canManageForms || $isSuperAdmin)
    <div id="manage-section" class="form-section hidden">
        <h3 class="text-lg font-bold mb-4">Manage Forms</h3>
        <div class="intercession-responsive-table overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submissions</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody id="manage-forms-body">
                    @foreach($allForms ?? [] as $form)
                    @php
                        $formSettings = is_string($form->settings) ? json_decode($form->settings, true) : ($form->settings ?? []);
                        $isPublished = $formSettings['is_published'] ?? false;
                        $limitOneResponse = $formSettings['limit_one_response'] ?? true;
                        
                        // Handle questions properly
                        $questions = $form->questions ?? [];
                        if (is_string($questions)) {
                            $questions = json_decode($questions, true) ?? [];
                        }
                        if (!is_array($questions)) {
                            $questions = [];
                        }
                        $questionsCount = collect($questions)->reject(fn($question) => in_array($question['type'] ?? '', ['title_section', 'section_break']))->count();
                        $submissionsCount = $form->submissions_count ?? 0;
                        $createdDate = isset($form->created_at) ? \Carbon\Carbon::parse($form->created_at)->format('F j, Y') : 'Date unknown';
                        $updatedDate = isset($form->updated_at) ? \Carbon\Carbon::parse($form->updated_at)->format('F j, Y') : null;
                    @endphp
                    <tr class="border-t hover:bg-gray-50 cursor-pointer" id="form-row-{{ $form->id }}" onclick="editForm({{ $form->id }})" role="button" tabindex="0" aria-label="Edit form {{ $form->title }}">
                        <td class="px-4 py-3" data-label="Form">
                            <div>
                                <p class="font-medium text-gray-800">{{ $form->title }}</p>
                                <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                    <span class="flex items-center gap-1">
                                        <i class="fas fa-calendar-alt text-gray-400"></i>
                                        Created: {{ $createdDate }}
                                    </span>
                                    @if($updatedDate && $updatedDate !== $createdDate)
                                    <span class="flex items-center gap-1">
                                        <i class="fas fa-edit text-gray-400"></i>
                                        Updated: {{ $updatedDate }}
                                    </span>
                                    @endif
                                </div>
                            </div>
                        </td>
                        <td class="px-4 py-3" data-label="Status">
                            @if($canPublishForms || $isSuperAdmin)
                                <button onclick="event.stopPropagation(); togglePublish({{ $form->id }})" 
                                    id="publish-btn-{{ $form->id }}"
                                    class="px-2 py-1 text-xs rounded-full transition whitespace-nowrap
                                        {{ $isPublished ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200' }}">
                                    {{ $isPublished ? 'Unpublish' : 'Publish' }}
                                </button>
                            @else
                                <span id="status-badge-{{ $form->id }}" class="px-2 py-1 text-xs rounded-full 
                                    {{ $isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500' }}">
                                    {{ $isPublished ? 'Published' : 'Draft' }}
                                </span>
                            @endif
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-500 text-center" data-label="Submissions">{{ $submissionsCount }}</td>
                        <td class="px-4 py-3" data-label="Actions">
                            <div class="flex gap-2 flex-wrap">
                                <button type="button"
                                    onclick="event.stopPropagation(); duplicateForm({{ $form->id }})"
                                    class="text-sky-600 hover:text-sky-800"
                                    title="Duplicate form">
                                    <i class="fas fa-copy"></i>
                                </button>

                                @if($canViewResults || $canManageForms || $isSuperAdmin)
                                <button onclick="event.stopPropagation(); viewSubmissions({{ $form->id }})" class="text-purple-600 hover:text-purple-800" title="Submissions">
                                    <i class="fas fa-users"></i>
                                </button>
                                @endif
                                
                                @if($canDeleteForms || $isSuperAdmin)
                                <button onclick="event.stopPropagation(); deleteForm({{ $form->id }})" class="text-red-600 hover:text-red-800" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                                @endif
                            </div>
                        </td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    </div>
    @endif
    {{-- Reports Section --}}
@if($canViewReports || $isSuperAdmin)
<div id="reports-section" class="form-section hidden">
    @include('modules.intercession.forms.reports')
</div>
@endif

</div>

<style>
.available-form-card {
    border:1px solid #e5eaf0;
    background:linear-gradient(135deg,#fff 0%,#fbfdff 100%);
    box-shadow:0 2px 8px rgba(15,23,42,.025);
}
#available-forms-list {
    padding:.75rem;
    border-radius:.875rem;
    background:#f8fafc;
}
.available-form-card:hover {
    border-color:#cbdcf8;
    box-shadow:0 8px 24px rgba(37,99,235,.055);
}
.section-count {
    min-width:1.25rem;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    background:#e2e8f0;
    color:#334155;
    font-weight:700;
}
.section-btn.bg-blue-600 .section-count {
    background:rgba(255,255,255,.22);
    color:#fff;
}
@media(max-width:639px) {
    #forms-tab > .bg-white { padding:.75rem; }
    .intercession-responsive-table { overflow:visible; }
    .intercession-responsive-table table,
    .intercession-responsive-table tbody { display:block; width:100%; }
    .intercession-responsive-table thead { display:none; }
    .intercession-responsive-table tbody { display:grid; gap:.75rem; }
    .intercession-responsive-table tbody tr {
        display:block;
        overflow:hidden;
        border:1px solid #e2e8f0;
        border-radius:.75rem;
        background:#fff;
    }
    .intercession-responsive-table tbody td {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:1rem;
        width:100%;
        padding:.65rem .8rem;
        border:0;
        border-bottom:1px solid #f1f5f9;
        text-align:right;
    }
    .intercession-responsive-table tbody td:last-child { border-bottom:0; }
    .intercession-responsive-table tbody td::before {
        content:attr(data-label);
        flex:0 0 38%;
        color:#64748b;
        font-size:.7rem;
        font-weight:600;
        text-align:left;
        text-transform:uppercase;
    }
    .intercession-responsive-table tbody td[data-label="Form"] { display:block; text-align:left; }
    .intercession-responsive-table tbody td[data-label="Form"]::before { display:none; }
    .intercession-responsive-table tbody td[data-label="Actions"] > div { justify-content:flex-end; }
    .intercession-responsive-table tbody td[colspan] { display:block; text-align:center; }
    .intercession-responsive-table tbody td[colspan]::before { display:none; }
}
</style>

<script>
// ==================== SHOW FORM SECTION ====================
function showFormSection(section) {
    let elementId = '';
    if (section === 'available') {
        elementId = 'available-forms-section';
    } else if (section === 'results') {
        elementId = 'results-section';
    } else if (section === 'manage') {
        elementId = 'manage-section';
    } else if (section === 'reports') {
        elementId = 'reports-section';
    }
    
    // Hide all sections
    const availableSection = document.getElementById('available-forms-section');
    const resultsSection = document.getElementById('results-section');
    const manageSection = document.getElementById('manage-section');
    const reportsSection = document.getElementById('reports-section');
    
    if (availableSection) availableSection.classList.add('hidden');
    if (resultsSection) resultsSection.classList.add('hidden');
    if (manageSection) manageSection.classList.add('hidden');
    if (reportsSection) reportsSection.classList.add('hidden');
    
    // Show active section
    const activeSection = document.getElementById(elementId);
    if (activeSection) {
        activeSection.classList.remove('hidden');
    }
    
    // Update button styles
    const availableBtn = document.getElementById('form-section-available');
    const resultsBtn = document.getElementById('form-section-results');
    const manageBtn = document.getElementById('form-section-manage');
    const reportsBtn = document.getElementById('form-section-reports');
    
    // Reset all buttons
    [availableBtn, resultsBtn, manageBtn, reportsBtn].forEach(btn => {
        if (btn) {
            btn.classList.remove('bg-blue-600', 'text-white');
            btn.classList.add('bg-gray-200', 'text-gray-700');
        }
    });
    
    // Highlight active button
    const activeButton = document.getElementById(`form-section-${section}`);
    if (activeButton) {
        activeButton.classList.remove('bg-gray-200', 'text-gray-700');
        activeButton.classList.add('bg-blue-600', 'text-white');
    }
    
    // Save to localStorage
    localStorage.setItem('activeFormSection', section);
    
    // If switching to reports, refresh the data
    if (section === 'reports' && typeof applyReportFilters === 'function') {
        setTimeout(applyReportFilters, 300);
    }
}

// ==================== VIEW FUNCTIONS ====================
window.viewForm = function(id) {
    window.location.href = `/forms/${id}/take`;
};

window.editForm = function(id) {
    window.location.href = `/forms/manage/${id}/edit`;
};

window.viewSubmissions = function(id) {
    window.location.href = `/forms/manage/${id}/submissions`;
};

window.duplicateForm = async function(id) {
    try {
        const response = await fetch(`/forms/manage/${id}/duplicate`, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        });

        const data = await response.json();
        if (data.success) {
            showNotification('Form duplicated successfully!', 'success');
            if (data.redirect_url) {
                window.location.href = data.redirect_url;
            } else if (data.form_id) {
                window.location.href = `/forms/manage/${data.form_id}/edit`;
            }
        } else {
            showNotification('Error: ' + (data.message || 'Unable to duplicate form'), 'error');
        }
    } catch (error) {
        console.error('Duplicate error:', error);
        showNotification('Error duplicating form', 'error');
    }
};

window.viewFormResult = function(formId, submissionId) {
    if (formId && submissionId) {
        window.location.href = `/forms/${formId}/results?submission_id=${submissionId}`;
    } else {
        showNotification('Error: Unable to view results', 'error');
    }
};

// ==================== TOGGLE PUBLISH ====================
window.togglePublish = function(formId) {
    const publishBtn = document.getElementById(`publish-btn-${formId}`);
    if (!publishBtn) return;
    const originalText = publishBtn.textContent;
    publishBtn.disabled = true;
    publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    const formData = new FormData();
    formData.append('_token', document.querySelector('meta[name="csrf-token"]').content);
    
    fetch(`/forms/manage/${formId}/toggle-publish`, {
        method: 'POST',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        publishBtn.disabled = false;
        
        if (data.success) {
            const isPublished = data.is_published;
            
            if (isPublished) {
                publishBtn.textContent = 'Unpublish';
                publishBtn.classList.remove('bg-green-100', 'text-green-700');
                publishBtn.classList.add('bg-yellow-100', 'text-yellow-700');
                showNotification('Form published successfully!', 'success');
            } else {
                publishBtn.textContent = 'Publish';
                publishBtn.classList.remove('bg-yellow-100', 'text-yellow-700');
                publishBtn.classList.add('bg-green-100', 'text-green-700');
                showNotification('Form unpublished', 'info');
            }
            
            refreshAvailableForms();
            refreshManageRow(formId, data.form);
        } else {
            publishBtn.textContent = originalText;
            showNotification('Error: ' + (data.message || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        publishBtn.disabled = false;
        publishBtn.textContent = originalText;
        showNotification('Error toggling publish status', 'error');
    });
};

function refreshManageRow(formId, formData) {
    const row = document.getElementById(`form-row-${formId}`);
    if (!row) return;
    
    if (formData) {
        const isPublished = formData.settings && formData.settings.is_published;
        const publishBtn = document.getElementById(`publish-btn-${formId}`);
        
        if (publishBtn) {
            publishBtn.textContent = isPublished ? 'Unpublish' : 'Publish';
            publishBtn.className = `px-2 py-1 text-xs rounded-full transition whitespace-nowrap ${isPublished ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`;
        }
    }
}

// ==================== REFRESH AVAILABLE FORMS ====================
function refreshAvailableForms() {
    const container = document.getElementById('available-forms-list');
    if (!container) return;
    
    container.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin text-gray-400"></i> Loading...</div>';
    
    fetch('/forms/available-forms', {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            if (data.forms && data.forms.length > 0) {
                let html = '';
                let hasPublishedForms = false;
                
                data.forms.forEach(form => {
                    let settings = form.settings;
                    if (typeof settings === 'string') {
                        try {
                            settings = JSON.parse(settings);
                        } catch(e) {
                            settings = {};
                        }
                    }
                    
                    const isPublished = settings && settings.is_published;
                    if (!isPublished) return;
                    
                    hasPublishedForms = true;
                    
                    let questionsCount = 0;
                    if (form.questions) {
                        if (typeof form.questions === 'string') {
                            try {
                                questionsCount = JSON.parse(form.questions || '[]').length;
                            } catch(e) {
                                questionsCount = 0;
                            }
                        } else if (Array.isArray(form.questions)) {
                            questionsCount = form.questions.length;
                        }
                    }
                    
                    const latestSubmissionId = data.mySubmissionIds ? data.mySubmissionIds[form.id] : null;
                    const hasTaken = Boolean(latestSubmissionId);
                    const limitOneResponse = settings && settings.limit_one_response !== false;
                    const cardUrl = hasTaken ? `/forms/${form.id}/results?submission_id=${latestSubmissionId}` : `/forms/${form.id}/take`;
                    
                    html += `
                        <div class="available-form-card rounded-xl p-4 sm:p-5 mb-3 transition-all duration-200 cursor-pointer hover:shadow-md hover:border-blue-200"
                            role="button"
                            tabindex="0"
                            onclick="window.location.href='${cardUrl}'"
                            onkeydown="if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); window.location.href='${cardUrl}'; }"
                            aria-label="${hasTaken ? 'View results for ' + escapeHtml(form.title) : 'Open form ' + escapeHtml(form.title)}">
                            <div class="grid grid-cols-1 sm:grid-cols-[minmax(0,520px)_auto] sm:items-center gap-3 sm:gap-6">
                                <div class="min-w-0">
                                    <div class="flex items-center gap-2 mb-2">
                                        <h4 class="font-semibold text-slate-800 text-base sm:text-lg">${escapeHtml(form.title)}</h4>
                                        ${hasTaken ? `<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full"><i class="fas fa-check-circle"></i> Completed</span>` : ''}
                                        ${limitOneResponse ? `<span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"><i class="fas fa-lock"></i> Limit 1</span>` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                if (hasPublishedForms) {
                    container.innerHTML = html;
                } else {
                    container.innerHTML = `
                        <div class="text-center py-12">
                            <i class="fas fa-file-alt text-5xl text-gray-300 mb-3"></i>
                            <p class="text-gray-500">No forms available</p>
                            ${data.canCreate ? `<a href="/forms/manage/create" class="inline-block mt-3 text-blue-600 hover:text-blue-800 text-sm"><i class="fas fa-plus"></i> Create your first form</a>` : ''}
                        </div>
                    `;
                }
            } else {
                container.innerHTML = `
                    <div class="text-center py-12">
                        <i class="fas fa-file-alt text-5xl text-gray-300 mb-3"></i>
                        <p class="text-gray-500">No forms available</p>
                        ${data.canCreate ? `<a href="/forms/manage/create" class="inline-block mt-3 text-blue-600 hover:text-blue-800 text-sm"><i class="fas fa-plus"></i> Create your first form</a>` : ''}
                    </div>
                `;
            }
        } else {
            container.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-exclamation-circle text-5xl text-red-300 mb-3"></i>
                    <p class="text-gray-500">Error loading forms</p>
                    <button onclick="refreshAvailableForms()" class="mt-3 text-blue-600 hover:text-blue-800 text-sm">
                        <i class="fas fa-sync"></i> Try again
                    </button>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error refreshing forms:', error);
        container.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-exclamation-circle text-5xl text-red-300 mb-3"></i>
                <p class="text-gray-500">Error loading forms</p>
                <button onclick="refreshAvailableForms()" class="mt-3 text-blue-600 hover:text-blue-800 text-sm">
                    <i class="fas fa-sync"></i> Try again
                </button>
            </div>
        `;
    });
}

// ==================== DELETE FORM ====================
window.deleteForm = async function(id) {
    if (!(await appConfirm('Delete this form? All responses will be lost forever.'))) {
        return;
    }

        fetch(`/forms/manage/${id}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Form deleted successfully!', 'success');
                const row = document.getElementById(`form-row-${id}`);
                if (row) {
                    row.style.opacity = '0';
                    row.style.transition = 'opacity 0.3s';
                    setTimeout(() => {
                        row.remove();
                        refreshAvailableForms();
                    }, 300);
                } else {
                    location.reload();
                }
            } else {
                showNotification('Error deleting form', 'error');
            }
        });
};

// ==================== NOTIFICATION ====================
window.showNotification = function(message, type) {
    return window.appNotify(...arguments);
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-4 py-2.5 rounded-lg shadow-lg text-white z-50 transition-all duration-300 ${colors[type] || 'bg-gray-700'} flex items-center gap-2`;
    notification.innerHTML = `
        <i class="fas ${icons[type] || 'fa-bell'}"></i>
        <span class="text-sm">${message}</span>
        <button onclick="this.parentElement.remove()" class="text-white/70 hover:text-white ml-2">Ã—</button>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
};

// ==================== ESCAPE HTML ====================
window.escapeHtml = function(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

// ==================== DOM READY ====================
document.addEventListener('DOMContentLoaded', function() {
    const requestedSection = new URLSearchParams(window.location.search).get('form_section');
    const savedSection = localStorage.getItem('activeFormSection');

    const permittedSections = {
        available: @json((bool) $canBrowseForms),
        results: @json((bool) $canViewOwnResults),
        manage: @json((bool) ($canManageForms || $isSuperAdmin)),
        reports: @json((bool) ($canViewReports || $isSuperAdmin))
    };

    const defaultSection = Object.keys(permittedSections).find(section => permittedSections[section]);
    const sectionToShow = requestedSection && permittedSections[requestedSection]
        ? requestedSection
        : (savedSection && permittedSections[savedSection] ? savedSection : defaultSection);

    if (sectionToShow) {
        showFormSection(sectionToShow);
    }

    if (requestedSection) {
        setTimeout(function() {
            const cleanUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, '', cleanUrl);
        }, 0);
    }
});

// ==================== EXPOSE FUNCTIONS GLOBALLY ====================
window.showFormSection = showFormSection;
window.refreshAvailableForms = refreshAvailableForms;
</script>
