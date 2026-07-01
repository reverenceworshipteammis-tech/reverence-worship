@extends('layouts.app')

@section('title', 'Edit Form')
@section('page-title', 'Edit Form')

@section('content')

<div class="min-h-screen bg-gray-50 py-6">

    <!-- Top Navigation -->
    <div class="max-w-5xl mx-auto mb-4">
        <div class="flex justify-center gap-6 text-sm font-medium text-gray-600">
            <button id="questionsNav" class="nav-tab text-indigo-600 border-b-2 border-indigo-600 pb-2">
                <i class="fas fa-list mr-1"></i> Questions
            </button>
            <button id="settingsNav" class="nav-tab hover:text-indigo-600">
                <i class="fas fa-cog mr-1"></i> Settings
            </button>
        </div>
    </div>

    <!-- Header with Back and Done buttons -->
    <div class="max-w-5xl mx-auto mb-3 flex justify-between items-center">
        <a href="{{ route('intercession.index') }}" class="inline-flex items-center text-indigo-600 hover:text-indigo-800 text-sm">
            <i class="fas fa-arrow-left mr-2"></i> Back to Manage Forms
        </a>
        <div class="flex gap-2">
            <button onclick="saveAndReturn()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
                <i class="fas fa-check"></i> Done
            </button>
        </div>
    </div>

    <!-- Auto-save indicator -->
    <div class="fixed bottom-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm hidden" id="autoSaveIndicator">
        <i class="fas fa-check-circle mr-1"></i> Auto-saved
    </div>

    <!-- ==================== QUESTIONS SECTION ==================== -->
    <div id="questionsSection">
        <!-- Form Header -->
        <div class="max-w-5xl mx-auto bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
            <div class="h-2 bg-indigo-600"></div>
            <div class="p-5">
                <input type="text" id="formTitle" value="{{ $form->title }}" placeholder="Untitled form"
                    class="w-full text-2xl font-normal border-none focus:ring-0 outline-none mb-2"
                    onchange="autoSave()">
                <input type="text" id="formDescription" value="{{ $form->description }}" placeholder="Form description"
                    class="w-full text-sm text-gray-500 border-none focus:ring-0 outline-none"
                    onchange="autoSave()">
            </div>
        </div>

        <!-- Questions Container (Sortable) -->
        <div id="questionsContainer" class="max-w-5xl mx-auto space-y-4 sortable-container"></div>

        <!-- Floating Toolbar -->
        <div class="fixed right-6 top-1/2 -translate-y-1/2 bg-white rounded-lg shadow-md p-3 flex flex-col gap-3 text-lg text-gray-500 z-10 border">
            <button onclick="addQuestion()" class="hover:text-indigo-600 transition" title="Add question">
                <i class="fas fa-plus-circle"></i>
            </button>
            <button onclick="addTitleSection()" class="hover:text-indigo-600 transition" title="Add title and description">
                <i class="fas fa-heading"></i>
            </button>
            <button onclick="addSection()" class="hover:text-indigo-600 transition" title="Add section">
                <i class="fas fa-layer-group"></i>
            </button>
        </div>
    </div>

    <!-- ==================== SETTINGS SECTION ==================== -->
    <div id="settingsSection" class="max-w-5xl mx-auto" style="display: none;">
        @include('modules.intercession.partials.settings-form')
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>
<script>
    let questionCount = 0;
    let questions = [];
    let isQuizMode = {{ ($form->settings['is_quiz'] ?? true) ? 'true' : 'false' }};
    let autoSaveTimer = null;
    let sortable = null;
    let selectedQuestionId = null;
    let isSaving = false;
    let isNewQuestion = false;
    let sectionCount = 0;

    const questionTypes = [
        { value: 'short_answer', label: 'Short answer', icon: 'fa-font' },
        { value: 'paragraph', label: 'Paragraph', icon: 'fa-paragraph' },
        { value: 'multiple_choice', label: 'Multiple choice', icon: 'fa-circle' },
        { value: 'checkboxes', label: 'Checkboxes', icon: 'fa-check-square' },
        { value: 'dropdown', label: 'Dropdown', icon: 'fa-caret-down' },
        { value: 'linear_scale', label: 'Linear scale', icon: 'fa-sliders-h' },
        { value: 'rating', label: 'Rating', icon: 'fa-star' },
        { value: 'multiple_choice_grid', label: 'Multiple choice grid', icon: 'fa-table' },
        { value: 'checkbox_grid', label: 'Checkbox grid', icon: 'fa-table' },
        { value: 'date', label: 'Date', icon: 'fa-calendar' },
        { value: 'time', label: 'Time', icon: 'fa-clock' }
    ];

    // Navigation
    document.getElementById('questionsNav').addEventListener('click', function() {
        document.getElementById('questionsSection').style.display = 'block';
        document.getElementById('settingsSection').style.display = 'none';
        updateNavActive('questionsNav');
    });

    document.getElementById('settingsNav').addEventListener('click', function() {
        document.getElementById('questionsSection').style.display = 'none';
        document.getElementById('settingsSection').style.display = 'block';
        updateNavActive('settingsNav');
    });

    function updateNavActive(activeId) {
        document.querySelectorAll('.nav-tab').forEach(function(tab) {
            tab.classList.remove('text-indigo-700', 'border-b-2', 'border-indigo-700');
            tab.classList.add('text-gray-500');
        });
        document.getElementById(activeId).classList.remove('text-gray-500');
        document.getElementById(activeId).classList.add('text-indigo-700', 'border-b-2', 'border-indigo-700');
    }

    // Settings functions - delegate to settings partial
    function showSettingsTab(tabName) {
        if (typeof window._showSettingsTab === 'function') {
            window._showSettingsTab(tabName);
            return;
        }
        
        document.querySelectorAll('.settings-content').forEach(function(c) {
            c.classList.add('hidden');
        });
        var content = document.getElementById(tabName + '-settings-content');
        if (content) content.classList.remove('hidden');
        document.querySelectorAll('.settings-nav').forEach(function(btn) {
            btn.classList.remove('border-indigo-600', 'text-indigo-600');
            btn.classList.add('border-transparent', 'text-gray-500');
        });
        var navBtn = document.getElementById(tabName + 'SettingsNav');
        if (navBtn) {
            navBtn.classList.remove('border-transparent', 'text-gray-500');
            navBtn.classList.add('border-indigo-600', 'text-indigo-600');
        }
    }

    function autoSaveSettings() {
        if (typeof window._autoSaveSettings === 'function') {
            window._autoSaveSettings();
        }
        autoSave();
    }

    function showAutoSaveIndicator() {
        var indicator = document.getElementById('autoSaveIndicator');
        indicator.classList.remove('hidden');
        setTimeout(function() {
            indicator.classList.add('hidden');
        }, 1500);
    }

    function autoSave() {
        if (isSaving || questions.length === 0) return;

        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(function() {
            if (!isNewQuestion) {
                saveForm(true);
            }
            isNewQuestion = false;
        }, 3000);
    }

    function getInsertIndex() {
        if (selectedQuestionId !== null) {
            var selectedIndex = questions.findIndex(function(q) {
                return q.id === selectedQuestionId;
            });
            if (selectedIndex !== -1) {
                return selectedIndex + 1;
            }
        }
        return questions.length;
    }

    function addTitleSection() {
        var insertIndex = getInsertIndex();
        var id = questionCount++;
        sectionCount++;
        var newSection = {
            id: id,
            type: 'title_section',
            title: 'Section ' + sectionCount,
            description: ''
        };
        questions.splice(insertIndex, 0, newSection);
        renderAllQuestions();
        isNewQuestion = true;
        autoSave();
        selectedQuestionId = id;
        selectQuestion(id);
    }

    function addSection() {
        var insertIndex = getInsertIndex();
        var id = questionCount++;
        sectionCount++;
        var newSection = {
            id: id,
            type: 'section_break',
            title: 'Section ' + sectionCount,
            description: ''
        };
        questions.splice(insertIndex, 0, newSection);
        renderAllQuestions();
        isNewQuestion = true;
        autoSave();
        selectedQuestionId = id;
        selectQuestion(id);
    }

    function addQuestion() {
        var insertIndex = getInsertIndex();
        var id = questionCount++;
        var defaultPoints = 1;
        var defaultRequired = false;

        if (document.getElementById('defaultPoints')) {
            defaultPoints = document.getElementById('defaultPoints').value || 1;
        }
        if (document.getElementById('defaultRequired')) {
            defaultRequired = document.getElementById('defaultRequired').checked || false;
        }

        var newQuestion = {
            id: id,
            text: '',
            type: 'short_answer',
            required: defaultRequired,
            points: defaultPoints,
            correctAnswer: '',
            correctAnswers: [],
            options: ['Option 1'],
            rows: ['Row 1'],
            columns: ['Column 1'],
            requireOnePerRow: false,
            min: 1,
            max: 5,
            minLabel: '',
            maxLabel: ''
        };
        questions.splice(insertIndex, 0, newQuestion);
        renderAllQuestions();
        isNewQuestion = true;
        autoSave();
        selectedQuestionId = id;
        selectQuestion(id);
    }

    function loadQuestions() {
        var existingQuestions = @json($form->questions ?? []);
        
        var questionsData = existingQuestions;
        if (typeof existingQuestions === 'string') {
            try {
                questionsData = JSON.parse(existingQuestions);
            } catch (e) {
                questionsData = [];
            }
        }
        
        if (questionsData && Array.isArray(questionsData) && questionsData.length > 0) {
            questionsData.forEach(function(q, index) {
                var questionType = q.type || 'short_answer';
                var isSection = (questionType === 'title_section' || questionType === 'section_break');
                
                if (isSection) {
                    sectionCount++;
                }
                
                // Parse correctAnswers
                var correctAnswers = q.correctAnswers || [];
                if (typeof correctAnswers === 'string') {
                    try {
                        correctAnswers = JSON.parse(correctAnswers);
                    } catch (e) {
                        correctAnswers = [];
                    }
                }
                
                // For grid questions, correctAnswers might be an object
                if (questionType === 'multiple_choice_grid' || questionType === 'checkbox_grid') {
                    if (typeof correctAnswers === 'object' && !Array.isArray(correctAnswers)) {
                        // Keep as object for grid
                    } else if (Array.isArray(correctAnswers)) {
                        // Convert array to object for grid
                        var gridCorrect = {};
                        if (correctAnswers.length > 0) {
                            correctAnswers.forEach(function(ans, idx) {
                                gridCorrect[idx] = ans;
                            });
                        }
                        correctAnswers = gridCorrect;
                    }
                } else if (!Array.isArray(correctAnswers)) {
                    correctAnswers = [];
                }
                
                var question = {
                    id: questionCount++,
                    type: questionType,
                    text: q.text || '',
                    title: q.title || '',
                    description: q.description || '',
                    imageUrl: q.imageUrl || '',
                    altText: q.altText || '',
                    required: q.required || false,
                    points: q.points || 1,
                    correctAnswer: q.correctAnswer || '',
                    correctAnswers: correctAnswers,
                    options: q.options || (questionType === 'multiple_choice' || questionType === 'checkboxes' || questionType === 'dropdown' ? ['Option 1'] : null),
                    rows: q.rows || (questionType === 'multiple_choice_grid' || questionType === 'checkbox_grid' ? ['Row 1'] : null),
                    columns: q.columns || (questionType === 'multiple_choice_grid' || questionType === 'checkbox_grid' ? ['Column 1'] : null),
                    requireOnePerRow: q.requireOnePerRow || false,
                    min: q.min || 1,
                    max: q.max || 5,
                    minLabel: q.minLabel || '',
                    maxLabel: q.maxLabel || ''
                };
                questions.push(question);
            });
            renderAllQuestions();
        } else {
            addQuestion();
        }
    }

    function renderAllQuestions() {
        var container = document.getElementById('questionsContainer');
        container.innerHTML = '';
        questions.forEach(function(q) {
            renderQuestion(q);
        });
        if (sortable) sortable.destroy();
        sortable = new Sortable(container, {
            handle: '.drag-handle',
            animation: 150,
            onEnd: function() {
                var newOrder = [];
                document.querySelectorAll('.sortable-item').forEach(function(el) {
                    var id = parseInt(el.getAttribute('data-id'));
                    var question = questions.find(function(q) {
                        return q.id === id;
                    });
                    if (question) newOrder.push(question);
                });
                questions = newOrder;
                autoSave();
            }
        });
    }

    function selectQuestion(questionId) {
        selectedQuestionId = questionId;
        document.querySelectorAll('.sortable-item').forEach(function(el) {
            el.classList.remove('ring-2', 'ring-indigo-500');
        });
        var selectedEl = document.querySelector('.sortable-item[data-id="' + questionId + '"]');
        if (selectedEl) {
            selectedEl.classList.add('ring-2', 'ring-indigo-500');
        }
    }

    function renderQuestion(q) {
        var container = document.getElementById('questionsContainer');
        var div = document.createElement('div');
        div.setAttribute('data-id', q.id);
        div.className = 'sortable-item cursor-pointer';
        div.onclick = function(e) {
            e.stopPropagation();
            selectQuestion(q.id);
        };

        if (q.type === 'title_section') {
            div.className += ' bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden';
            div.innerHTML = '<div class="drag-handle cursor-move bg-gray-50 py-1 text-center border-b"><i class="fas fa-grip-horizontal text-gray-400 text-sm"></i></div>' +
                '<div class="p-5"><div class="flex justify-end mb-2"><i class="fas fa-trash text-sm text-gray-400 cursor-pointer hover:text-red-600" onclick="event.stopPropagation(); deleteQuestion(' + q.id + ')"></i></div>' +
                '<input type="text" value="' + escapeHtml(q.title) + '" placeholder="Section title" onchange="updateAndAutoSave(\'titleSection\', ' + q.id + ', \'title\', this.value)" class="w-full text-xl font-medium border-0 focus:ring-0 outline-none mb-2">' +
                '<input type="text" value="' + escapeHtml(q.description) + '" placeholder="Section description" onchange="updateAndAutoSave(\'titleSection\', ' + q.id + ', \'description\', this.value)" class="w-full text-sm text-gray-500 border-0 focus:ring-0 outline-none"></div>';
        } else if (q.type === 'section_break') {
            div.className += ' relative';
            div.innerHTML = '<div class="drag-handle cursor-move absolute left-1/2 -translate-x-1/2 -top-2 z-10 bg-white px-3 rounded-full shadow text-xs"><i class="fas fa-grip-horizontal text-gray-400"></i></div>' +
                '<div class="bg-gray-50 py-5 px-6 rounded-xl border border-gray-200 text-center"><div class="flex justify-end mb-2"><i class="fas fa-trash text-sm text-gray-400 cursor-pointer hover:text-red-600" onclick="event.stopPropagation(); deleteQuestion(' + q.id + ')"></i></div>' +
                '<i class="fas fa-layer-group text-2xl text-gray-400 mb-2"></i>' +
                '<input type="text" value="' + escapeHtml(q.title) + '" placeholder="Section title" onchange="updateAndAutoSave(\'sectionBreak\', ' + q.id + ', \'title\', this.value)" class="text-lg font-medium border-0 bg-transparent focus:ring-0 outline-none text-center w-full">' +
                '<input type="text" value="' + escapeHtml(q.description) + '" placeholder="Section description" onchange="updateAndAutoSave(\'sectionBreak\', ' + q.id + ', \'description\', this.value)" class="text-sm text-gray-500 border-0 bg-transparent focus:ring-0 outline-none text-center w-full mt-1">' +
                '<div class="border-t border-gray-300 my-3"></div><p class="text-xs text-gray-400">After section break</p></div>';
        } else {
            div.className += ' bg-white border border-gray-200 rounded-xl shadow-sm relative overflow-hidden';
            div.id = 'question-' + q.id;
            div.innerHTML = '<div class="drag-handle cursor-move bg-gray-50 py-1 text-center border-b"><i class="fas fa-grip-horizontal text-gray-400 text-sm"></i><span class="text-xs text-gray-400 ml-1">Drag</span></div>' +
                '<div class="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" style="top: 30px;"></div>' +
                '<div class="p-5"><div class="grid grid-cols-12 gap-4 items-start">' +
                '<div class="col-span-7"><input type="text" value="' + escapeHtml(q.text) + '" placeholder="Question" onchange="updateAndAutoSave(\'questionText\', ' + q.id + ', null, this.value)" class="w-full text-xl border-0 border-b border-gray-300 focus:ring-0 focus:border-gray-500 bg-gray-50 px-3 py-2"></div>' +
                '<div class="col-span-4"><select onchange="changeQuestionType(' + q.id + ', this.value)" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">' +
                questionTypes.map(function(t) {
                    return '<option value="' + t.value + '" ' + (q.type === t.value ? 'selected' : '') + '>' + t.label + '</option>';
                }).join('') +
                '</select></div></div>' +
                (isQuizMode ? '<div class="mt-3 flex items-center gap-3 bg-gray-50 p-2 rounded-lg"><div class="flex items-center gap-2"><span class="text-xs text-gray-600">Points:</span><input type="number" value="' + (q.points || 1) + '" min="0" max="100" onchange="updateAndAutoSave(\'points\', ' + q.id + ', null, this.value)" class="w-16 px-2 py-1 border rounded-md text-sm text-center"></div></div>' : '') +
                '<div id="options-' + q.id + '" class="mt-5">' + renderOptionsByType(q) + '</div>' +
                '<div class="border-t mt-5 pt-4 flex justify-end items-center gap-4">' +
                '<i class="fas fa-copy text-gray-500 cursor-pointer hover:text-indigo-600" onclick="event.stopPropagation(); duplicateQuestion(' + q.id + ')"></i>' +
                '<i class="fas fa-trash text-gray-500 cursor-pointer hover:text-red-600" onclick="event.stopPropagation(); deleteQuestion(' + q.id + ')"></i>' +
                '<div class="h-6 w-px bg-gray-300"></div><span class="text-xs text-gray-600">Required</span>' +
                '<label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" class="sr-only peer" ' + (q.required ? 'checked' : '') + ' onchange="updateAndAutoSave(\'required\', ' + q.id + ', null, this.checked)"><div class="w-9 h-5 bg-gray-300 rounded-full peer peer-checked:bg-indigo-600"></div><div class="absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-all peer-checked:translate-x-4"></div></label>' +
                '<i class="fas fa-ellipsis-v text-gray-400 cursor-pointer"></i>' +
                '</div></div>';
        }
        container.appendChild(div);
    }

    function renderOptionsByType(q) {
        var html = '';
        switch (q.type) {
            case 'multiple_choice':
                (q.options || ['Option 1']).forEach(function(opt, i) {
                    var escapedOpt = escapeHtml(opt);
                    html += '<div class="flex items-center gap-2 mb-2">' +
                        '<i class="fas fa-circle text-gray-400 text-xs"></i>' +
                        '<input type="text" value="' + escapedOpt + '" placeholder="Option ' + (i + 1) + '" onchange="updateAndAutoSave(\'option\', ' + q.id + ', ' + i + ', this.value)" class="flex-1 text-sm border-0 border-b border-gray-300 focus:border-indigo-500 focus:ring-0 py-1">' +
                        '<label class="flex items-center gap-1 ml-2">' +
                        '<input type="radio" name="correct_' + q.id + '" value="' + escapedOpt + '" ' + (q.correctAnswer === opt ? 'checked' : '') + ' onchange="updateAndAutoSave(\'correctAnswer\', ' + q.id + ', null, this.value)" class="w-3 h-3 text-green-600">' +
                        '<span class="text-xs text-gray-500">Correct</span></label>' +
                        '<button onclick="event.stopPropagation(); removeOption(' + q.id + ', ' + i + ')" class="text-gray-400 hover:text-red-500"><i class="fas fa-times text-xs"></i></button></div>';
                });
                html += '<div class="flex items-center gap-2 text-gray-400 mt-2"><i class="fas fa-circle text-xs"></i><span class="text-xs">Add option</span><button onclick="event.stopPropagation(); addOption(' + q.id + ')" class="text-indigo-600 text-xs hover:underline">add</button></div>';
                return html;

            case 'checkboxes':
                (q.options || ['Option 1']).forEach(function(opt, i) {
                    var escapedOpt = escapeHtml(opt);
                    var isChecked = q.correctAnswers && q.correctAnswers.includes(opt);
                    html += '<div class="flex items-center gap-2 mb-2">' +
                        '<i class="fas fa-square text-gray-400 text-xs"></i>' +
                        '<input type="text" value="' + escapedOpt + '" placeholder="Option ' + (i + 1) + '" onchange="updateAndAutoSave(\'option\', ' + q.id + ', ' + i + ', this.value)" class="flex-1 text-sm border-0 border-b border-gray-300 focus:border-indigo-500 focus:ring-0 py-1">' +
                        '<label class="flex items-center gap-1 ml-2">' +
                        '<input type="checkbox" value="' + escapedOpt + '" ' + (isChecked ? 'checked' : '') + ' onchange="updateAndAutoSave(\'correctAnswers\', ' + q.id + ', null, this.value, this.checked)" class="w-3 h-3 text-green-600 rounded">' +
                        '<span class="text-xs text-gray-500">Correct</span></label>' +
                        '<button onclick="event.stopPropagation(); removeOption(' + q.id + ', ' + i + ')" class="text-gray-400 hover:text-red-500"><i class="fas fa-times text-xs"></i></button></div>';
                });
                html += '<div class="flex items-center gap-2 text-gray-400 mt-2"><i class="fas fa-square text-xs"></i><span class="text-xs">Add option</span><button onclick="event.stopPropagation(); addOption(' + q.id + ')" class="text-indigo-600 text-xs hover:underline">add</button></div>';
                return html;

            case 'dropdown':
                (q.options || ['Option 1']).forEach(function(opt, i) {
                    var escapedOpt = escapeHtml(opt);
                    html += '<div class="flex items-center gap-2 mb-2">' +
                        '<i class="fas fa-bars text-gray-400 text-xs"></i>' +
                        '<input type="text" value="' + escapedOpt + '" placeholder="Option ' + (i + 1) + '" onchange="updateAndAutoSave(\'option\', ' + q.id + ', ' + i + ', this.value)" class="flex-1 text-sm border-0 border-b border-gray-300 focus:border-indigo-500 focus:ring-0 py-1">' +
                        '<label class="flex items-center gap-1 ml-2">' +
                        '<input type="radio" name="correct_' + q.id + '" value="' + escapedOpt + '" ' + (q.correctAnswer === opt ? 'checked' : '') + ' onchange="updateAndAutoSave(\'correctAnswer\', ' + q.id + ', null, this.value)" class="w-3 h-3 text-green-600">' +
                        '<span class="text-xs text-gray-500">Correct</span></label>' +
                        '<button onclick="event.stopPropagation(); removeOption(' + q.id + ', ' + i + ')" class="text-gray-400 hover:text-red-500"><i class="fas fa-times text-xs"></i></button></div>';
                });
                html += '<div class="flex items-center gap-2 text-gray-400 mt-2"><i class="fas fa-bars text-xs"></i><span class="text-xs">Add option</span><button onclick="event.stopPropagation(); addOption(' + q.id + ')" class="text-indigo-600 text-xs hover:underline">add</button></div>';
                return html;

            case 'short_answer':
            case 'paragraph':
                return '<div class="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">' +
                    '<span class="text-xs text-gray-500">Correct Answer:</span>' +
                    '<input type="' + (q.type === 'short_answer' ? 'text' : 'textarea') + '" placeholder="Enter correct answer..." ' +
                    (q.type === 'paragraph' ? 'rows="2"' : '') +
                    ' onchange="updateAndAutoSave(\'correctAnswer\', ' + q.id + ', null, this.value)" ' +
                    'value="' + escapeHtml(q.correctAnswer || '') + '"' +
                    ' class="flex-1 px-3 py-2 border rounded-lg text-sm border-gray-300 focus:ring-1 focus:ring-indigo-500"></div>';

            case 'date':
                return '<div class="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">' +
                    '<span class="text-xs text-gray-500">Correct Answer (Date):</span>' +
                    '<input type="date" onchange="updateAndAutoSave(\'correctAnswer\', ' + q.id + ', null, this.value)" ' +
                    'value="' + escapeHtml(q.correctAnswer || '') + '"' +
                    ' class="px-3 py-2 border rounded-lg text-sm border-gray-300 focus:ring-1 focus:ring-indigo-500"></div>';

            case 'time':
                return '<div class="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">' +
                    '<span class="text-xs text-gray-500">Correct Answer (Time):</span>' +
                    '<input type="time" onchange="updateAndAutoSave(\'correctAnswer\', ' + q.id + ', null, this.value)" ' +
                    'value="' + escapeHtml(q.correctAnswer || '') + '"' +
                    ' class="px-3 py-2 border rounded-lg text-sm border-gray-300 focus:ring-1 focus:ring-indigo-500"></div>';

            case 'linear_scale':
                return '<div class="flex flex-wrap items-center gap-4 bg-gray-50 p-3 rounded-lg">' +
                    '<div class="flex items-center gap-3">' +
                    '<span class="text-xs text-gray-500">Range:</span>' +
                    '<input type="number" value="' + (q.min || 1) + '" onchange="updateAndAutoSave(\'scaleMin\', ' + q.id + ', null, this.value)" class="w-14 px-2 py-1 border rounded-md text-sm text-center">' +
                    '<span class="text-gray-400">â†’</span>' +
                    '<input type="number" value="' + (q.max || 5) + '" onchange="updateAndAutoSave(\'scaleMax\', ' + q.id + ', null, this.value)" class="w-14 px-2 py-1 border rounded-md text-sm text-center">' +
                    '</div>' +
                    '<div class="flex items-center gap-3 border-l border-gray-300 pl-4">' +
                    '<span class="text-xs text-gray-500">Correct Value:</span>' +
                    '<input type="number" value="' + escapeHtml(q.correctAnswer || '') + '" onchange="updateAndAutoSave(\'correctAnswer\', ' + q.id + ', null, this.value)" class="w-14 px-2 py-1 border rounded-md text-sm text-center" placeholder="None">' +
                    '<span class="text-xs text-gray-400">(Leave blank for no correct answer)</span>' +
                    '</div></div>';

            case 'rating':
                var maxStars = q.max || 5;
                return '<div class="flex flex-wrap items-center gap-4 bg-gray-50 p-3 rounded-lg">' +
                    '<div class="flex items-center gap-3">' +
                    '<span class="text-xs text-gray-500">Stars:</span>' +
                    '<select onchange="updateAndAutoSave(\'ratingMax\', ' + q.id + ', null, this.value)" class="border rounded px-2 py-1 text-sm">' +
                    [1,2,3,4,5,6,7,8,9,10].map(function(n) {
                        return '<option value="' + n + '" ' + ((q.max || 5) === n ? 'selected' : '') + '>' + n + ' stars</option>';
                    }).join('') +
                    '</select>' +
                    '</div>' +
                    '<div class="flex items-center gap-3 border-l border-gray-300 pl-4">' +
                    '<span class="text-xs text-gray-500">Correct Value:</span>' +
                    '<select onchange="updateAndAutoSave(\'correctAnswer\', ' + q.id + ', null, this.value)" class="border rounded px-2 py-1 text-sm">' +
                    '<option value="">None</option>' +
                    Array.from({length: maxStars}, function(_, i) { return i + 1; }).map(function(n) {
                        return '<option value="' + n + '" ' + (q.correctAnswer == n ? 'selected' : '') + '>' + n + ' star' + (n > 1 ? 's' : '') + '</option>';
                    }).join('') +
                    '</select>' +
                    '<span class="text-xs text-gray-400">(Leave blank for no correct answer)</span>' +
                    '</div></div>';

            case 'multiple_choice_grid':
                var gridHtml = '<div class="bg-gray-50 p-3 rounded-lg">' +
                    '<div class="grid grid-cols-2 gap-4">' +
                    '<div><label class="block text-xs font-medium text-gray-700 mb-1">Rows</label>' +
                    (q.rows || ['Row 1']).map(function(r, i) {
                        return '<div class="flex items-center gap-1 mb-1"><span class="text-gray-500 w-5 text-xs">' + (i + 1) + '.</span><input type="text" value="' + escapeHtml(r) + '" onchange="updateAndAutoSave(\'row\', ' + q.id + ', ' + i + ', this.value)" class="flex-1 px-2 py-1 border rounded-lg text-xs"><button onclick="event.stopPropagation(); removeRow(' + q.id + ', ' + i + ')" class="text-red-500"><i class="fas fa-times text-xs"></i></button></div>';
                    }).join('') +
                    '<button onclick="event.stopPropagation(); addRow(' + q.id + ')" class="text-indigo-600 text-xs">+ Add row</button></div>' +
                    '<div><label class="block text-xs font-medium text-gray-700 mb-1">Columns</label>' +
                    (q.columns || ['Column 1']).map(function(c, i) {
                        return '<div class="flex items-center gap-1 mb-1"><input type="text" value="' + escapeHtml(c) + '" onchange="updateAndAutoSave(\'column\', ' + q.id + ', ' + i + ', this.value)" class="flex-1 px-2 py-1 border rounded-lg text-xs"><button onclick="event.stopPropagation(); removeColumn(' + q.id + ', ' + i + ')" class="text-red-500"><i class="fas fa-times text-xs"></i></button></div>';
                    }).join('') +
                    '<button onclick="event.stopPropagation(); addColumn(' + q.id + ')" class="text-indigo-600 text-xs">+ Add column</button></div>' +
                    '</div>' +
                    '<div class="mt-3 pt-3 border-t border-gray-200">' +
                    '<label class="block text-xs font-medium text-gray-700 mb-2">Correct Answers (per row):</label>';
                
                (q.rows || ['Row 1']).forEach(function(r, rowIndex) {
                    var rowCorrect = (q.correctAnswers && q.correctAnswers[rowIndex]) ? q.correctAnswers[rowIndex] : '';
                    gridHtml += '<div class="flex items-center gap-2 mb-1">' +
                        '<span class="text-xs font-medium text-gray-600 w-16 truncate">' + escapeHtml(r) + ':</span>' +
                        '<select onchange="updateGridCorrectAnswer(' + q.id + ', ' + rowIndex + ', this.value)" class="flex-1 px-2 py-1 border rounded-lg text-xs">' +
                        '<option value="">None</option>';
                    (q.columns || ['Column 1']).forEach(function(c) {
                        gridHtml += '<option value="' + escapeHtml(c) + '" ' + (rowCorrect === c ? 'selected' : '') + '>' + escapeHtml(c) + '</option>';
                    });
                    gridHtml += '</select></div>';
                });
                
                gridHtml += '<span class="text-xs text-gray-400">Select the correct answer for each row</span></div></div>';
                return gridHtml;

            case 'checkbox_grid':
                var checkboxGridHtml = '<div class="bg-gray-50 p-3 rounded-lg">' +
                    '<div class="grid grid-cols-2 gap-4">' +
                    '<div><label class="block text-xs font-medium text-gray-700 mb-1">Rows</label>' +
                    (q.rows || ['Row 1']).map(function(r, i) {
                        return '<div class="flex items-center gap-1 mb-1"><span class="text-gray-500 w-5 text-xs">' + (i + 1) + '.</span><input type="text" value="' + escapeHtml(r) + '" onchange="updateAndAutoSave(\'row\', ' + q.id + ', ' + i + ', this.value)" class="flex-1 px-2 py-1 border rounded-lg text-xs"><button onclick="event.stopPropagation(); removeRow(' + q.id + ', ' + i + ')" class="text-red-500"><i class="fas fa-times text-xs"></i></button></div>';
                    }).join('') +
                    '<button onclick="event.stopPropagation(); addRow(' + q.id + ')" class="text-indigo-600 text-xs">+ Add row</button></div>' +
                    '<div><label class="block text-xs font-medium text-gray-700 mb-1">Columns</label>' +
                    (q.columns || ['Column 1']).map(function(c, i) {
                        return '<div class="flex items-center gap-1 mb-1"><input type="text" value="' + escapeHtml(c) + '" onchange="updateAndAutoSave(\'column\', ' + q.id + ', ' + i + ', this.value)" class="flex-1 px-2 py-1 border rounded-lg text-xs"><button onclick="event.stopPropagation(); removeColumn(' + q.id + ', ' + i + ')" class="text-red-500"><i class="fas fa-times text-xs"></i></button></div>';
                    }).join('') +
                    '<button onclick="event.stopPropagation(); addColumn(' + q.id + ')" class="text-indigo-600 text-xs">+ Add column</button></div>' +
                    '</div>' +
                    '<div class="mt-3 pt-3 border-t border-gray-200">' +
                    '<label class="block text-xs font-medium text-gray-700 mb-2">Correct Answers (select all that apply per row):</label>';
                
                (q.rows || ['Row 1']).forEach(function(r, rowIndex) {
                    checkboxGridHtml += '<div class="mb-2">' +
                        '<span class="text-xs font-medium text-gray-600 block mb-1">' + escapeHtml(r) + ':</span>' +
                        '<div class="flex flex-wrap gap-2 ml-2">';
                    (q.columns || ['Column 1']).forEach(function(c) {
                        var isChecked = q.correctAnswers && q.correctAnswers[rowIndex] && q.correctAnswers[rowIndex].includes ? q.correctAnswers[rowIndex].includes(c) : false;
                        checkboxGridHtml += '<label class="flex items-center gap-1 cursor-pointer">' +
                            '<input type="checkbox" value="' + escapeHtml(c) + '" ' + (isChecked ? 'checked' : '') + 
                            ' onchange="updateGridCheckboxCorrect(' + q.id + ', ' + rowIndex + ', \'' + escapeHtml(c) + '\', this.checked)" ' +
                            'class="w-3 h-3 text-green-600 rounded">' +
                            '<span class="text-xs">' + escapeHtml(c) + '</span>' +
                            '</label>';
                    });
                    checkboxGridHtml += '</div></div>';
                });
                
                checkboxGridHtml += '<span class="text-xs text-gray-400">Select all correct answers for each row</span></div></div>';
                return checkboxGridHtml;

            default:
                return '<input type="text" class="w-full text-sm border-0 border-b border-gray-300" placeholder="Answer" disabled>';
        }
    }

    // Function to update grid correct answer (for multiple choice grid)
    function updateGridCorrectAnswer(id, rowIndex, value) {
        var q = questions.find(function(question) { return question.id === id; });
        if (!q) return;
        
        if (!q.correctAnswers) q.correctAnswers = {};
        q.correctAnswers[rowIndex] = value;
        autoSave();
    }

    // Function to update grid checkbox correct answers (for checkbox grid)
    function updateGridCheckboxCorrect(id, rowIndex, value, checked) {
        var q = questions.find(function(question) { return question.id === id; });
        if (!q) return;
        
        if (!q.correctAnswers) q.correctAnswers = {};
        if (!q.correctAnswers[rowIndex]) q.correctAnswers[rowIndex] = [];
        
        if (checked) {
            if (!q.correctAnswers[rowIndex].includes(value)) {
                q.correctAnswers[rowIndex].push(value);
            }
        } else {
            q.correctAnswers[rowIndex] = q.correctAnswers[rowIndex].filter(function(v) {
                return v !== value;
            });
        }
        autoSave();
    }

    function updateAndAutoSave(type, id, index, value, checked) {
        var q = questions.find(function(question) {
            return question.id === id;
        });
        if (!q) return;
        switch (type) {
            case 'questionText':
                q.text = value;
                break;
            case 'titleSection':
                q[index] = value;
                break;
            case 'sectionBreak':
                q[index] = value;
                break;
            case 'points':
                q.points = parseInt(value) || 0;
                break;
            case 'required':
                q.required = value;
                break;
            case 'option':
                if (q.options) q.options[index] = value;
                break;
            case 'correctAnswer':
                q.correctAnswer = value;
                break;
            case 'correctAnswers':
                if (!q.correctAnswers) q.correctAnswers = [];
                if (checked) {
                    if (!q.correctAnswers.includes(value)) q.correctAnswers.push(value);
                } else {
                    q.correctAnswers = q.correctAnswers.filter(function(v) {
                        return v !== value;
                    });
                }
                break;
            case 'row':
                if (q.rows) q.rows[index] = value;
                break;
            case 'column':
                if (q.columns) q.columns[index] = value;
                break;
            case 'scaleMin':
                q.min = parseInt(value);
                break;
            case 'scaleMax':
                q.max = parseInt(value);
                break;
            case 'ratingMax':
                q.max = parseInt(value);
                break;
        }
        autoSave();
    }

    function addRow(id) {
        var q = questions.find(function(question) {
            return question.id === id;
        });
        if (q) {
            if (!q.rows) q.rows = [];
            q.rows.push('Row ' + (q.rows.length + 1));
            renderAllQuestions();
            autoSave();
        }
    }

    function removeRow(id, i) {
        var q = questions.find(function(question) {
            return question.id === id;
        });
        if (q && q.rows && q.rows.length > 1) {
            q.rows.splice(i, 1);
            renderAllQuestions();
            autoSave();
        }
    }

    function addColumn(id) {
        var q = questions.find(function(question) {
            return question.id === id;
        });
        if (q) {
            if (!q.columns) q.columns = [];
            q.columns.push('Column ' + (q.columns.length + 1));
            renderAllQuestions();
            autoSave();
        }
    }

    function removeColumn(id, i) {
        var q = questions.find(function(question) {
            return question.id === id;
        });
        if (q && q.columns && q.columns.length > 1) {
            q.columns.splice(i, 1);
            renderAllQuestions();
            autoSave();
        }
    }

    function addOption(id) {
        var q = questions.find(function(question) {
            return question.id === id;
        });
        if (q && q.options) {
            q.options.push('Option ' + (q.options.length + 1));
            renderAllQuestions();
            autoSave();
        }
    }

    function removeOption(id, i) {
        var q = questions.find(function(question) {
            return question.id === id;
        });
        if (q && q.options && q.options.length > 1) {
            q.options.splice(i, 1);
            renderAllQuestions();
            autoSave();
        }
    }

    function changeQuestionType(id, type) {
        var q = questions.find(function(question) {
            return question.id === id;
        });
        if (q) {
            q.type = type;
            if (!q.options && (type === 'multiple_choice' || type === 'checkboxes' || type === 'dropdown')) q.options = ['Option 1'];
            if (type === 'multiple_choice_grid' || type === 'checkbox_grid') {
                if (!q.rows) q.rows = ['Row 1'];
                if (!q.columns) q.columns = ['Column 1'];
            }
            renderAllQuestions();
            autoSave();
        }
    }

    function duplicateQuestion(id) {
        var o = questions.find(function(question) {
            return question.id === id;
        });
        if (o) {
            var nid = questionCount++;
            var newQuestion = JSON.parse(JSON.stringify({
                ...o,
                id: nid
            }));
            var index = questions.findIndex(function(q) {
                return q.id === id;
            }) + 1;
            questions.splice(index, 0, newQuestion);
            renderAllQuestions();
            autoSave();
        }
    }

    function deleteQuestion(id) {
        var i = questions.findIndex(function(question) {
            return question.id === id;
        });
        if (i !== -1) {
            questions.splice(i, 1);
            renderAllQuestions();
            autoSave();
        }
    }

    var currentFormId = {{ $form->id }};

    function saveAndReturn() {
        saveForm(false);
    }

    function saveForm(isAutoSave) {
        if (typeof isAutoSave === 'undefined') isAutoSave = false;
        if (isSaving) return;
        isSaving = true;

        var title = document.getElementById('formTitle').value || 'Untitled form';
        var description = document.getElementById('formDescription').value || '';

        var settings = {};

        if (document.getElementById('isQuiz')) {
            settings.is_quiz = document.getElementById('isQuiz').checked;
        }

        var releaseGradeRadio = document.querySelector('input[name="release_grade"]:checked');
        if (releaseGradeRadio) {
            settings.release_grade = releaseGradeRadio.value;
        }

        if (document.getElementById('defaultPoints')) {
            settings.default_points = document.getElementById('defaultPoints').value || 1;
        }

        if (document.getElementById('allowViewResponse')) {
            settings.allow_view_response = document.getElementById('allowViewResponse').checked;
        }
        if (document.getElementById('allowEditing')) {
            settings.allow_editing = document.getElementById('allowEditing').checked;
        }
        if (document.getElementById('limitOneResponse')) {
            settings.limit_one_response = document.getElementById('limitOneResponse').checked;
        }
        if (document.getElementById('requireLogin')) {
            settings.require_login = document.getElementById('requireLogin').checked;
        }
        if (document.getElementById('confirmationMessage')) {
            settings.confirmation_message = document.getElementById('confirmationMessage').value;
        }

        if (document.getElementById('showProgressBar')) {
            settings.show_progress_bar = document.getElementById('showProgressBar').checked;
        }
        if (document.getElementById('shuffleQuestions')) {
            settings.shuffle_questions = document.getElementById('shuffleQuestions').checked;
        }
        if (document.getElementById('showQuestionNumbers')) {
            settings.show_question_numbers = document.getElementById('showQuestionNumbers').checked;
        }
        if (document.getElementById('onePageAtATime')) {
            settings.one_page_at_a_time = document.getElementById('onePageAtATime').checked;
        }
        if (document.getElementById('showTimer')) {
            settings.show_timer = document.getElementById('showTimer').checked;
        }
        if (document.getElementById('timeLimit')) {
            settings.time_limit = document.getElementById('timeLimit').value || 30;
        }

        if (document.getElementById('defaultRequired')) {
            settings.default_required = document.getElementById('defaultRequired').checked;
        }
        if (document.getElementById('publishByDefault')) {
            settings.publish_by_default = document.getElementById('publishByDefault').checked;
        }
        if (document.getElementById('allowPartialPoints')) {
            settings.allow_partial_points = document.getElementById('allowPartialPoints').checked;
        }

        if (document.getElementById('restrictByDepartment')) {
            settings.restrict_by_department = document.getElementById('restrictByDepartment').checked;
        }
        if (document.getElementById('notifyOnSubmit')) {
            settings.notify_on_submit = document.getElementById('notifyOnSubmit').checked;
        }
        if (document.getElementById('notifyUserOnReview')) {
            settings.notify_user_on_review = document.getElementById('notifyUserOnReview').checked;
        }
        if (document.getElementById('allowExport')) {
            settings.allow_export = document.getElementById('allowExport').checked;
        }
        if (document.getElementById('includeTimestamps')) {
            settings.include_timestamps = document.getElementById('includeTimestamps').checked;
        }

        var data = {
            title: title,
            description: description,
            questions: questions.map(function(q) {
                var questionData = {
                    type: q.type,
                    text: q.text || null,
                    title: q.title || null,
                    description: q.description || null,
                    imageUrl: q.imageUrl || null,
                    altText: q.altText || null,
                    options: q.options || null,
                    required: q.required || false,
                    min: q.min,
                    max: q.max,
                    rows: q.rows,
                    columns: q.columns,
                    points: q.points || 1,
                    correctAnswer: q.correctAnswer || null,
                    correctAnswers: q.correctAnswers || null
                };
                return questionData;
            }),
            settings: settings
        };

        if (!isAutoSave) {
            var btn = document.querySelector('.bg-green-600');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Saving...';
            btn.disabled = true;
        }

        fetch('/forms/manage/' + currentFormId, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
            },
            body: JSON.stringify(data)
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            isSaving = false;
            if (data.success) {
                if (isAutoSave) {
                    showAutoSaveIndicator();
                } else {
                    var btn = document.querySelector('.bg-green-600');
                    btn.innerHTML = '<i class="fas fa-check mr-1"></i> Done';
                    btn.disabled = false;
                    appConfirm('Form updated successfully! Click OK to go back to Manage Forms.').then((confirmed) => {
                        if (confirmed) {
                            window.location.href = '{{ route("intercession.index") }}';
                        }
                    });
                }
            } else {
                isSaving = false;
                if (!isAutoSave) {
                    var btn = document.querySelector('.bg-green-600');
                    btn.innerHTML = '<i class="fas fa-check mr-1"></i> Done';
                    btn.disabled = false;
                    appAlert('Error: ' + (data.message || 'Unknown error'));
                }
            }
        })
        .catch(function(error) {
            console.error('Error:', error);
            isSaving = false;
            if (!isAutoSave) {
                var btn = document.querySelector('.bg-green-600');
                btn.innerHTML = '<i class="fas fa-check mr-1"></i> Done';
                btn.disabled = false;
                appAlert('Error saving form: ' + error.message);
            }
        });
    }

    function escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Event listeners for quiz mode
    document.getElementById('isQuiz')?.addEventListener('change', function() {
        isQuizMode = this.checked;
        var quizDetails = document.getElementById('quizDetails');
        if (quizDetails) {
            quizDetails.style.display = this.checked ? 'block' : 'none';
        }
        renderAllQuestions();
        autoSave();
    });

    // Initialize
    loadQuestions();

    // Expose functions globally
    window.addQuestion = addQuestion;
    window.addTitleSection = addTitleSection;
    window.addSection = addSection;
    window.saveAndReturn = saveAndReturn;
    window.autoSave = autoSave;
    window.updateAndAutoSave = updateAndAutoSave;
    window.deleteQuestion = deleteQuestion;
    window.duplicateQuestion = duplicateQuestion;
    window.addOption = addOption;
    window.removeOption = removeOption;
    window.addRow = addRow;
    window.removeRow = removeRow;
    window.addColumn = addColumn;
    window.removeColumn = removeColumn;
    window.changeQuestionType = changeQuestionType;
    window.showSettingsTab = showSettingsTab;
    window.autoSaveSettings = autoSaveSettings;
    window.updateGridCorrectAnswer = updateGridCorrectAnswer;
    window.updateGridCheckboxCorrect = updateGridCheckboxCorrect;
</script>

<style>
    .sortable-item {
        transition: all 0.2s ease;
    }

    .sortable-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .drag-handle {
        cursor: grab;
    }

    .drag-handle:active {
        cursor: grabbing;
    }

    .question-input:focus {
        outline: none;
        border-color: #6366f1;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }
</style>
@endsection
