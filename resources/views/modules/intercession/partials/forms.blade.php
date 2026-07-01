<div class="bg-white rounded-xl shadow-md p-6">
    
    @php
        $canViewForms = auth()->check() && auth()->user()->canAccess('intercession', 'view-forms');
        $canCreateForms = auth()->check() && auth()->user()->canAccess('intercession', 'create-forms');
        $canManageForms = auth()->check() && auth()->user()->canAccess('intercession', 'manage-forms');
        $canEditForms = auth()->check() && auth()->user()->canAccess('intercession', 'edit-forms');
        $canDeleteForms = auth()->check() && auth()->user()->canAccess('intercession', 'delete-forms');
        $canPublishForms = auth()->check() && auth()->user()->canAccess('intercession', 'publish-forms');
        $canViewResults = auth()->check() && auth()->user()->canAccess('intercession', 'view-results');
        $isSuperAdmin = auth()->check() && auth()->user()->isSuperAdmin();
    @endphp

    {{-- Stats --}}
    @if($canViewForms)
    <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="bg-blue-50 rounded-xl p-4 text-center">
            <p class="text-3xl font-bold text-blue-600">{{ $stats['total_forms'] ?? 0 }}</p>
            <p class="text-xs text-gray-600">TOTAL FORMS</p>
        </div>
        <div class="bg-green-50 rounded-xl p-4 text-center">
            <p class="text-3xl font-bold text-green-600">{{ $stats['my_attempts'] ?? 0 }}</p>
            <p class="text-xs text-gray-600">MY ATTEMPTS</p>
        </div>
        <div class="bg-purple-50 rounded-xl p-4 text-center">
            <p class="text-3xl font-bold text-purple-600">{{ number_format($stats['best_avg'] ?? 0, 1) }}%</p>
            <p class="text-xs text-gray-600">BEST AVG</p>
        </div>
    </div>
    @endif

    {{-- Form Actions --}}
    <div class="flex justify-between items-center mb-6">
        <div class="flex gap-2 flex-wrap">
            @if($canViewForms)
            <button onclick="showFormSection('available')" id="form-section-available" class="section-btn px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white">
                Available Forms
            </button>
            @endif
            
            @if($canViewResults)
            <button onclick="showFormSection('results')" id="form-section-results" class="section-btn px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700">
                My Results
            </button>
            @endif
            
            @if($canManageForms || $isSuperAdmin)
            <button onclick="showFormSection('manage')" id="form-section-manage" class="section-btn px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700">
                Manage Forms
            </button>
            @endif
            @if($canViewResults || $isSuperAdmin)
<button onclick="showFormSection('reports')" id="form-section-reports" class="section-btn px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700">
    <i class="fas fa-chart-bar mr-1"></i> Reports
</button>
@endif
        </div>
        
        {{-- Create Form Button --}}
        @if($canCreateForms || $isSuperAdmin)
        <a href="{{ route('forms.manage.create') }}" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition">
            <i class="fas fa-plus mr-1"></i> Create Form
        </a>
        @endif
    </div>

    {{-- Available Forms Section --}}
    @if($canViewForms)
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
                $questionsCount = count($questions);
                $createdDate = isset($form->created_at) ? \Carbon\Carbon::parse($form->created_at)->format('F j, Y') : 'Date unknown';
                $hasTaken = isset($mySubmissions) && $mySubmissions->contains('form_id', $form->id);
                
                // Determine button state
                $buttonDisabled = $hasTaken && $limitOneResponse;
                $buttonText = $hasTaken ? ($limitOneResponse ? 'Already Submitted' : 'Submit Again') : 'Take Form';
                $buttonColor = $buttonDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700';
            @endphp
            @if($isPublished)
            <div class="border rounded-lg p-4 mb-4 hover:shadow-lg transition-all duration-300">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                            <h4 class="font-semibold text-gray-800 text-lg">{{ $form->title }}</h4>
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
                        <p class="text-sm text-gray-600 mb-2">{{ Str::limit($form->description ?? 'No description', 150) }}</p>
                        <div class="flex flex-wrap gap-4 text-xs text-gray-500">
                            <span class="flex items-center gap-1">
                                <i class="fas fa-question-circle text-blue-500"></i>
                                {{ $questionsCount }} {{ Str::plural('question', $questionsCount) }}
                            </span>
                            <span class="flex items-center gap-1">
                                <i class="fas fa-calendar-alt text-gray-400"></i>
                                Created: {{ $createdDate }}
                            </span>
                            @if(isset($form->updated_at) && $form->updated_at != $form->created_at)
                            <span class="flex items-center gap-1">
                                <i class="fas fa-edit text-gray-400"></i>
                                Updated: {{ \Carbon\Carbon::parse($form->updated_at)->format('F j, Y') }}
                            </span>
                            @endif
                        </div>
                    </div>
                    <div class="ml-4">
                        @if($buttonDisabled)
                            <button disabled class="{{ $buttonColor }} text-white px-5 py-2 rounded-lg text-sm flex items-center gap-2 opacity-70">
                                <i class="fas fa-check-circle"></i> {{ $buttonText }}
                            </button>
                        @else
                            <a href="{{ route('forms.take', $form->id) }}" class="{{ $buttonColor }} text-white px-5 py-2 rounded-lg text-sm transition flex items-center gap-2">
                                <i class="fas fa-pen-alt"></i> {{ $buttonText }}
                            </a>
                        @endif
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
@if($canViewResults)
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
            $questionsCount = count($questions);
            
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
            $allowPartialPoints = true;
            
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
                                    $earnedPoints += ($correctSelected / $totalCorrect) * $points;
                                } elseif (!$allowPartialPoints && $correctSelected == $totalCorrect) {
                                    $earnedPoints += $points;
                                }
                            }
                        }
                    } elseif ($questionType == 'short_answer' || $questionType == 'paragraph') {
                        if (isset($question['correctAnswer']) && $question['correctAnswer'] !== '') {
                            if (strtolower(trim($answer)) == strtolower(trim($question['correctAnswer']))) {
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
                                        $earnedPoints += ($correctCount / count($correctRowAnswers)) * ($points / count($rows));
                                    } elseif (!$allowPartialPoints && $correctCount == count($correctRowAnswers)) {
                                        $earnedPoints += $points / count($rows);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            $earnedPoints = round($earnedPoints, 2);
            $displayScore = $totalPoints > 0 ? round(($earnedPoints / $totalPoints) * 100, 1) : ($submission->score ?? 0);
            $formattedScore = number_format($displayScore, 1);
            
            // Status based on score
            $status = $displayScore >= 80 ? 'Excellent' : ($displayScore >= 60 ? 'Good' : ($displayScore >= 40 ? 'Average' : 'Needs Improvement'));
            $statusColor = $displayScore >= 80 ? 'text-green-600' : ($displayScore >= 60 ? 'text-blue-600' : ($displayScore >= 40 ? 'text-yellow-600' : 'text-red-600'));
            $statusIcon = $displayScore >= 80 ? 'fa-star' : ($displayScore >= 60 ? 'fa-thumbs-up' : ($displayScore >= 40 ? 'fa-minus-circle' : 'fa-exclamation-triangle'));
        @endphp
        <div class="border rounded-lg p-4 mb-3 hover:shadow-md transition">
            <div class="flex justify-between items-center">
                <div>
                    <h4 class="font-semibold text-gray-800">{{ $submission->form->title ?? 'Form' }}</h4>
                    <div class="flex gap-3 mt-1 text-xs text-gray-500">
                        <span><i class="fas fa-question-circle"></i> {{ $questionsCount }} questions</span>
                        <span><i class="fas fa-calendar"></i> {{ isset($submission->submitted_at) ? \Carbon\Carbon::parse($submission->submitted_at)->format('M d, Y') : 'N/A' }}</span>
                        <span><i class="fas fa-star {{ $statusColor }}"></i> {{ $status }}</span>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-2xl font-bold {{ $statusColor }}">{{ $formattedScore }}%</p>
                    <div class="flex items-center justify-end gap-2">
                        <span class="text-xs text-gray-400">{{ number_format($earnedPoints, 1) }} / {{ $totalPoints }} pts</span>
                        <button onclick="viewFormResult({{ $submission->form_id ?? 0 }}, {{ $submission->id ?? 0 }})" 
                                class="text-xs text-blue-600 hover:underline flex items-center gap-1">
                            View Details <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
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
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Questions</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submissions</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Limit</th>
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
                        $questionsCount = count($questions);
                        $submissionsCount = DB::table('form_submissions')->where('form_id', $form->id)->count();
                    @endphp
                    <tr class="border-t hover:bg-gray-50" id="form-row-{{ $form->id }}">
                        <td class="px-4 py-3">
                            <div>
                                <p class="font-medium text-gray-800">{{ $form->title }}</p>
                                <p class="text-xs text-gray-500">{{ Str::limit($form->description ?? '', 50) }}</p>
                            </div>
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-500 text-center">{{ $questionsCount }}</td>
                        <td class="px-4 py-3">
                            <span id="status-badge-{{ $form->id }}" class="px-2 py-1 text-xs rounded-full 
                                {{ $isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500' }}">
                                {{ $isPublished ? 'Published' : 'Draft' }}
                            </span>
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-500 text-center">{{ $submissionsCount }}</td>
                        <td class="px-4 py-3">
                            <span class="px-2 py-1 text-xs rounded-full {{ $limitOneResponse ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500' }}">
                                {{ $limitOneResponse ? '1 Response' : 'Multiple' }}
                            </span>
                        </td>
                        <td class="px-4 py-3">
                            <div class="flex gap-2 flex-wrap">
                                
                                
                                @if($canPublishForms || $isSuperAdmin)
                                <button onclick="togglePublish({{ $form->id }})" 
                                    id="publish-btn-{{ $form->id }}"
                                    class="px-2 py-1 text-xs rounded transition
                                        {{ $isPublished ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200' }}">
                                    {{ $isPublished ? 'Unpublish' : 'Publish' }}
                                </button>
                                @endif
                                
                                @if($canEditForms || $isSuperAdmin)
                                <button onclick="editForm({{ $form->id }})" class="text-blue-600 hover:text-blue-800" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                @endif
                                
                                @if($canViewResults || $isSuperAdmin)
                                <button onclick="viewSubmissions({{ $form->id }})" class="text-purple-600 hover:text-purple-800" title="Submissions">
                                    <i class="fas fa-users"></i>
                                </button>
                                @endif
                                
                                @if($canDeleteForms || $isSuperAdmin)
                                <button onclick="deleteForm({{ $form->id }})" class="text-red-600 hover:text-red-800" title="Delete">
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
@if($canViewResults || $isSuperAdmin)
<div id="reports-section" class="form-section hidden">
    @include('modules.intercession.forms.reports')
</div>
@endif

</div>

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
        publishBtn.textContent = originalText;
        
        if (data.success) {
            const isPublished = data.is_published;
            const statusBadge = document.getElementById(`status-badge-${formId}`);
            
            if (isPublished) {
                publishBtn.textContent = 'Unpublish';
                publishBtn.classList.remove('bg-green-100', 'text-green-700');
                publishBtn.classList.add('bg-yellow-100', 'text-yellow-700');
                statusBadge.textContent = 'Published';
                statusBadge.classList.remove('bg-gray-100', 'text-gray-500');
                statusBadge.classList.add('bg-green-100', 'text-green-700');
                showNotification('Form published successfully!', 'success');
            } else {
                publishBtn.textContent = 'Publish';
                publishBtn.classList.remove('bg-yellow-100', 'text-yellow-700');
                publishBtn.classList.add('bg-green-100', 'text-green-700');
                statusBadge.textContent = 'Draft';
                statusBadge.classList.remove('bg-green-100', 'text-green-700');
                statusBadge.classList.add('bg-gray-100', 'text-gray-500');
                showNotification('Form unpublished', 'info');
            }
            
            refreshAvailableForms();
            refreshManageRow(formId, data.form);
        } else {
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
        const statusBadge = document.getElementById(`status-badge-${formId}`);
        
        if (statusBadge) {
            statusBadge.textContent = isPublished ? 'Published' : 'Draft';
            statusBadge.className = `px-2 py-1 text-xs rounded-full ${isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`;
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
                    
                    const createdDate = form.created_at ? new Date(form.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Date unknown';
                    const hasTaken = data.mySubmissions && data.mySubmissions.includes(form.id);
                    const limitOneResponse = settings && settings.limit_one_response !== false;
                    const description = form.description || 'No description';
                    
                    const buttonDisabled = hasTaken && limitOneResponse;
                    const buttonText = hasTaken ? (limitOneResponse ? 'Already Submitted' : 'Submit Again') : 'Take Form';
                    const buttonColor = buttonDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700';
                    
                    html += `
                        <div class="border rounded-lg p-4 mb-4 hover:shadow-lg transition-all duration-300">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <div class="flex items-center gap-2 mb-2">
                                        <h4 class="font-semibold text-gray-800 text-lg">${escapeHtml(form.title)}</h4>
                                        ${hasTaken ? `<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full"><i class="fas fa-check-circle"></i> Completed</span>` : ''}
                                        ${limitOneResponse ? `<span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"><i class="fas fa-lock"></i> Limit 1</span>` : ''}
                                    </div>
                                    <p class="text-sm text-gray-600 mb-2">${escapeHtml(description.substring(0, 150))}</p>
                                    <div class="flex flex-wrap gap-4 text-xs text-gray-500">
                                        <span class="flex items-center gap-1"><i class="fas fa-question-circle text-blue-500"></i> ${questionsCount} ${questionsCount === 1 ? 'question' : 'questions'}</span>
                                        <span class="flex items-center gap-1"><i class="fas fa-calendar-alt text-gray-400"></i> Created: ${createdDate}</span>
                                    </div>
                                </div>
                                <div class="ml-4">
                                    ${buttonDisabled ? 
                                        `<button disabled class="${buttonColor} text-white px-5 py-2 rounded-lg text-sm flex items-center gap-2 opacity-70">
                                            <i class="fas fa-check-circle"></i> ${buttonText}
                                        </button>` :
                                        `<a href="/forms/${form.id}/take" class="${buttonColor} text-white px-5 py-2 rounded-lg text-sm transition flex items-center gap-2">
                                            <i class="fas fa-pen-alt"></i> ${buttonText}
                                        </a>`
                                    }
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
    const savedSection = localStorage.getItem('activeFormSection');
    
    let allowedSection = 'available';
    
    @if(isset($canViewForms) && $canViewForms)
        allowedSection = 'available';
    @elseif(isset($canViewResults) && $canViewResults)
        allowedSection = 'results';
    @elseif((isset($canManageForms) && $canManageForms) || (isset($isSuperAdmin) && $isSuperAdmin))
        allowedSection = 'manage';
    @endif
    
    // Determine which section to show
    let sectionToShow = allowedSection;
    if (savedSection === 'results' && isset($canViewResults) && $canViewResults) {
        sectionToShow = 'results';
    } else if (savedSection === 'manage' && ((isset($canManageForms) && $canManageForms) || (isset($isSuperAdmin) && $isSuperAdmin))) {
        sectionToShow = 'manage';
    } else if (savedSection === 'reports' && ((isset($canViewResults) && $canViewResults) || (isset($isSuperAdmin) && $isSuperAdmin))) {
        sectionToShow = 'reports';
    }
    
    const availableSection = document.getElementById('available-forms-section');
    const resultsSection = document.getElementById('results-section');
    const manageSection = document.getElementById('manage-section');
    const reportsSection = document.getElementById('reports-section');
    
    if (availableSection) availableSection.classList.add('hidden');
    if (resultsSection) resultsSection.classList.add('hidden');
    if (manageSection) manageSection.classList.add('hidden');
    if (reportsSection) reportsSection.classList.add('hidden');
    
    if (sectionToShow === 'results' && resultsSection) {
        resultsSection.classList.remove('hidden');
    } else if (sectionToShow === 'manage' && manageSection) {
        manageSection.classList.remove('hidden');
    } else if (sectionToShow === 'reports' && reportsSection) {
        reportsSection.classList.remove('hidden');
        // If switching to reports, refresh the data
        if (typeof applyReportFilters === 'function') {
            setTimeout(applyReportFilters, 300);
        }
    } else if (availableSection) {
        availableSection.classList.remove('hidden');
    }
    
    const availableBtn = document.getElementById('form-section-available');
    const resultsBtn = document.getElementById('form-section-results');
    const manageBtn = document.getElementById('form-section-manage');
    const reportsBtn = document.getElementById('form-section-reports');
    
    [availableBtn, resultsBtn, manageBtn, reportsBtn].forEach(btn => {
        if (btn) {
            btn.classList.remove('bg-blue-600', 'text-white');
            btn.classList.add('bg-gray-200', 'text-gray-700');
        }
    });
    
    const activeButton = document.getElementById(`form-section-${sectionToShow}`);
    if (activeButton) {
        activeButton.classList.remove('bg-gray-200', 'text-gray-700');
        activeButton.classList.add('bg-blue-600', 'text-white');
    }
});

// ==================== EXPOSE FUNCTIONS GLOBALLY ====================
window.showFormSection = showFormSection;
window.refreshAvailableForms = refreshAvailableForms;
</script>


