@extends('layouts.app')

@section('title', 'Create Form')
@section('page-title', 'Create Form')

@section('content')

<style>
    .form-builder-page { background:#f8fafc; }
    .builder-topbar { box-shadow:0 8px 28px rgba(15,23,42,.05); }
    .builder-tools {
        position:absolute;
        z-index:20;
        top:0;
        right:-62px;
        width:52px;
        flex-direction:column;
        padding:6px;
        gap:3px;
    }
.sortable-item.toolbar-host { position:relative; overflow:visible !important; }
.builder-tools .tools-label { display:none; }
.builder-tools button {
        width:40px;
        height:40px;
        padding:0;
        justify-content:center;
        color:#475569;
        background:transparent;
        transition:transform .15s ease, background-color .15s ease, color .15s ease;
    }
    .builder-tools button .tool-text { display:none; }
    .builder-tools button:first-of-type { color:#2563eb; background:#eff6ff; }
    .builder-tools button:hover { transform:translateY(-1px); }
    @media (max-width:760px) {
        .sortable-item.toolbar-host { margin-bottom:62px; }
        .builder-tools {
            position:absolute;
            top:auto;
            right:8px;
            bottom:-54px;
            width:auto;
            flex-direction:row;
            padding:5px;
            gap:3px;
        }
        .builder-tools button { width:38px; height:38px; padding:0; }
    }
    @media (max-width:640px) {
        .builder-heading { align-items:flex-start; flex-direction:column; }
        .builder-actions, .builder-actions button { width:100%; justify-content:center; }
    }
    .auto-grow-textarea {
        overflow: hidden;
        resize: none;
    }
</style>

<div class="form-builder-page min-h-screen py-5 px-3 sm:px-5">
    <div class="builder-topbar max-w-5xl mx-auto mb-5 rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div class="builder-heading flex items-center justify-between gap-4 px-4 sm:px-5 py-4">
            <div>
                <a href="{{ route('intercession.index') }}#forms-tab" class="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-blue-600">
                    <i class="fas fa-arrow-left"></i> Manage Forms
                </a>
                <h2 class="mt-1 text-xl font-bold text-gray-900">Create a new form</h2>
                <p class="mt-1 text-xs text-gray-500">Build questions, configure responses, then save your form.</p>
            </div>
            <div class="builder-actions flex items-center gap-2">
                <button id="saveFormButton" type="button" onclick="saveForm(false)" class="inline-flex min-h-10 items-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold">
                    <i class="fas fa-check mr-2"></i> Save Form
                </button>
            </div>
        </div>
        <div class="flex gap-6 border-t border-gray-100 px-4 sm:px-5 text-sm font-semibold text-gray-500">
            <button id="questionsNav" type="button" class="nav-tab text-blue-600 border-b-2 border-blue-600 py-3">
                <i class="fas fa-list mr-1.5"></i> Questions
            </button>
            <button id="settingsNav" type="button" class="nav-tab border-b-2 border-transparent py-3 hover:text-blue-600">
                <i class="fas fa-sliders-h mr-1.5"></i> Settings
            </button>
        </div>
    </div>

    <!-- Auto-save indicator -->
    <div class="fixed bottom-4 right-4 z-50 bg-green-500 text-white px-2 py-1 rounded-full text-xs hidden" id="autoSaveIndicator">
        <i class="fas fa-check-circle mr-1"></i> Auto-saved
    </div>

    <!-- ==================== QUESTIONS SECTION ==================== -->
    <div id="questionsSection">
        <!-- Form Header -->
        <div class="max-w-5xl mx-auto bg-white rounded-xl border border-gray-200 overflow-hidden mb-4 shadow-sm">
            <div class="h-1 bg-blue-600"></div>
            <div class="p-5">
                <input type="text" id="formTitle" placeholder="Untitled form"
                    class="w-full text-2xl font-semibold text-gray-900 border-none focus:ring-0 outline-none mb-2"
                    oninput="autoSave()" maxlength="150" aria-label="Form title">
                <textarea id="formDescription" placeholder="Add a short description (optional)" rows="2"
                    class="auto-grow-textarea w-full text-lg sm:text-xl text-gray-900 border-none focus:ring-0 outline-none"
                    oninput="autoResizeTextarea(this); autoSave()" maxlength="500" aria-label="Form description"></textarea>
            </div>
        </div>

        <div id="builderTools" class="builder-tools flex items-center rounded-xl border border-gray-200 bg-white shadow-sm">
            <span class="tools-label mr-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Add</span>
            <button type="button" onclick="addQuestion()" title="Add question" aria-label="Add question" class="inline-flex items-center rounded-lg text-sm font-semibold hover:bg-blue-100"><i class="fas fa-plus"></i><span class="tool-text">Question</span></button>
            <button type="button" onclick="addTitleSection()" title="Add title and description" aria-label="Add title and description" class="inline-flex items-center rounded-lg text-sm font-medium hover:bg-gray-100"><i class="fas fa-heading"></i><span class="tool-text">Title</span></button>
            <button type="button" onclick="addSection()" title="Add section" aria-label="Add section" class="inline-flex items-center rounded-lg text-sm font-medium hover:bg-gray-100"><i class="fas fa-layer-group"></i><span class="tool-text">Section</span></button>
        </div>

        <!-- Questions Container (Sortable) -->
        <div id="questionsContainer" class="max-w-5xl mx-auto space-y-4 sortable-container"></div>
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
    let isQuizMode = true;
    let autoSaveTimer = null;
    let sortable = null;
    let selectedQuestionId = null;
    let isSaving = false;
    let isNewQuestion = false;
    let sectionCount = 1;

    function autoResizeTextarea(textarea) {
        if (!textarea) return;
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    function resizeAllAutoGrowTextareas() {
        document.querySelectorAll('.auto-grow-textarea').forEach(autoResizeTextarea);
    }

    function applyTextFormat(action, questionId) {
        const card = document.getElementById(`question-${questionId}`);
        if (!card) return;
        const editor = card.querySelector('[data-format-target="questionText"]');
        if (!editor) return;
        editor.focus();

        if (action === 'clear') {
            document.execCommand('removeFormat', false, null);
        } else {
            const command = { bold: 'bold', italic: 'italic', underline: 'underline' }[action];
            if (!command) return;
            document.execCommand(command, false, null);
        }

        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function hydrateRichTextEditors(root = document) {
        root.querySelectorAll('[data-format-target="questionText"]').forEach(function(editor) {
            if (editor.dataset.richTextLoaded === '1') return;
            const encoded = editor.getAttribute('data-rich-text') || '';
            try {
                editor.innerHTML = encoded ? decodeURIComponent(encoded) : editor.innerHTML;
            } catch (e) {}
            editor.dataset.richTextLoaded = '1';
        });
    }

    document.addEventListener('DOMContentLoaded', function() {
        resizeAllAutoGrowTextareas();
        hydrateRichTextEditors();
    });

    document.addEventListener('input', function(event) {
        if (event.target && event.target.classList && event.target.classList.contains('auto-grow-textarea')) {
            autoResizeTextarea(event.target);
        }
    });

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
    document.getElementById('questionsNav').addEventListener('click', () => {
        document.getElementById('questionsSection').style.display = 'block';
        document.getElementById('settingsSection').style.display = 'none';
        updateNavActive('questionsNav');
    });

    document.getElementById('settingsNav').addEventListener('click', () => {
        document.getElementById('questionsSection').style.display = 'none';
        document.getElementById('settingsSection').style.display = 'block';
        updateNavActive('settingsNav');
    });

    function updateNavActive(activeId) {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('text-blue-600', 'border-blue-600');
            tab.classList.add('text-gray-500', 'border-transparent');
        });
        document.getElementById(activeId).classList.remove('text-gray-500', 'border-transparent');
        document.getElementById(activeId).classList.add('text-blue-600', 'border-blue-600');
    }

    function showSettingsTab(tabName) {
        document.querySelectorAll('.settings-content').forEach(c => c.classList.add('hidden'));
        document.getElementById(`${tabName}-settings-content`).classList.remove('hidden');
        document.querySelectorAll('.settings-nav').forEach(btn => {
            btn.classList.remove('border-indigo-600', 'text-indigo-600');
            btn.classList.add('border-transparent', 'text-gray-500');
        });
        document.getElementById(`${tabName}SettingsNav`).classList.remove('border-transparent', 'text-gray-500');
        document.getElementById(`${tabName}SettingsNav`).classList.add('border-indigo-600', 'text-indigo-600');
    }

    function autoSaveSettings() {
        saveSettingsToLocal();
        autoSave();
    }

    function saveSettingsToLocal() {
        let releaseGrade = document.querySelector('input[name="release_grade"]:checked')?.value || 'immediately';
        const settings = {
            is_quiz: document.getElementById('isQuiz')?.checked ?? true,
            release_grade: releaseGrade,
            default_points: document.getElementById('defaultPoints')?.value ?? 1,
            allow_view_response: document.getElementById('allowViewResponse')?.checked ?? true,
            allow_editing: document.getElementById('allowEditing')?.checked || false,
            limit_one_response: document.getElementById('limitOneResponse')?.checked ?? true,
            show_progress_bar: document.getElementById('showProgressBar')?.checked || false,
            shuffle_questions: document.getElementById('shuffleQuestions')?.checked || false,
            confirmation_message: document.getElementById('confirmationMessage')?.value || 'Your response has been recorded.',
            default_required: document.getElementById('defaultRequired')?.checked || false,
            publish_by_default: document.getElementById('publishByDefault')?.checked || false
        };
        localStorage.setItem('form_settings', JSON.stringify(settings));
    }

    function loadSettings() {
        if (document.getElementById('allowViewResponse')) document.getElementById('allowViewResponse').checked = true;
        if (document.getElementById('allowEditing')) document.getElementById('allowEditing').checked = false;
        if (document.getElementById('limitOneResponse')) document.getElementById('limitOneResponse').checked = true;
        if (document.getElementById('shuffleQuestions')) document.getElementById('shuffleQuestions').checked = true;
        if (document.getElementById('showProgressBar')) document.getElementById('showProgressBar').checked = false;
        if (document.getElementById('isQuiz')) document.getElementById('isQuiz').checked = true;

        const saved = localStorage.getItem('form_settings');
        if (saved) {
            const s = JSON.parse(saved);
            if (document.getElementById('isQuiz')) document.getElementById('isQuiz').checked = s.is_quiz !== false;
            if (s.is_quiz !== false) document.getElementById('quizDetails')?.classList.remove('hidden');
            const radio = document.querySelector(`input[name="release_grade"][value="${s.release_grade}"]`);
            if (radio) radio.checked = true;
            if (document.getElementById('defaultPoints')) document.getElementById('defaultPoints').value = s.default_points ?? 1;
            if (document.getElementById('allowViewResponse')) document.getElementById('allowViewResponse').checked = s.allow_view_response !== false;
            if (document.getElementById('allowEditing')) document.getElementById('allowEditing').checked = s.allow_editing || false;
            if (document.getElementById('limitOneResponse')) document.getElementById('limitOneResponse').checked = s.limit_one_response !== false;
            if (document.getElementById('showProgressBar')) document.getElementById('showProgressBar').checked = s.show_progress_bar || false;
            if (document.getElementById('shuffleQuestions')) document.getElementById('shuffleQuestions').checked = s.shuffle_questions !== false;
            if (document.getElementById('confirmationMessage')) document.getElementById('confirmationMessage').value = s.confirmation_message || 'Your response has been recorded.';
            if (document.getElementById('defaultRequired')) document.getElementById('defaultRequired').checked = s.default_required || false;
            if (document.getElementById('publishByDefault')) document.getElementById('publishByDefault').checked = s.publish_by_default || false;
        }
    }

    function showAutoSaveIndicator() {
        const indicator = document.getElementById('autoSaveIndicator');
        indicator.classList.remove('hidden');
        setTimeout(() => indicator.classList.add('hidden'), 1500);
    }

    function autoSave() {
        if (isSaving || questions.length === 0) return;

        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
            if (!isNewQuestion) {
                saveForm(true);
            }
            isNewQuestion = false;
        }, 3000);
    }

    function getInsertIndex() {
        if (selectedQuestionId !== null) {
            const selectedIndex = questions.findIndex(q => q.id === selectedQuestionId);
            if (selectedIndex !== -1) {
                return selectedIndex + 1;
            }
        }
        return questions.length;
    }

    function addTitleSection() {
        const insertIndex = getInsertIndex();
        const id = questionCount++;
        sectionCount++;
        const newSection = {
            id,
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
        const insertIndex = getInsertIndex();
        const id = questionCount++;
        sectionCount++;
        const newSection = {
            id,
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
        const insertIndex = getInsertIndex();
        const id = questionCount++;
        const defaultPointsInput = document.getElementById('defaultPoints');
        const defaultPoints = defaultPointsInput && defaultPointsInput.value !== '' ? defaultPointsInput.value : 1;
        const newQuestion = {
            id,
            text: '',
            type: 'short_answer',
            required: document.getElementById('defaultRequired')?.checked || false,
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

    function renderAllQuestions() {
        const container = document.getElementById('questionsContainer');
        const toolbar = document.getElementById('builderTools');
        if (toolbar && container.contains(toolbar)) {
            document.getElementById('questionsSection').insertBefore(toolbar, container);
        }
        container.innerHTML = '';
        questions.forEach(q => renderQuestion(q));
        resizeAllAutoGrowTextareas();
        if (sortable) sortable.destroy();
        sortable = new Sortable(container, {
            handle: '.drag-handle',
            animation: 150,
            onEnd: function() {
                const newOrder = [];
                document.querySelectorAll('.sortable-item').forEach(el => {
                    const id = parseInt(el.getAttribute('data-id'));
                    const question = questions.find(q => q.id === id);
                    if (question) newOrder.push(question);
                });
                questions = newOrder;
                autoSave();
            }
        });
        if (selectedQuestionId !== null) selectQuestion(selectedQuestionId);
        resizeAllAutoGrowTextareas();
    }

    function selectQuestion(questionId) {
        selectedQuestionId = questionId;
        document.querySelectorAll('.sortable-item').forEach(el => {
            el.classList.remove('ring-2', 'ring-indigo-500');
            el.classList.remove('toolbar-host');
        });
        const selectedEl = document.querySelector(`.sortable-item[data-id="${questionId}"]`);
        if (selectedEl) {
            selectedEl.classList.add('ring-2', 'ring-indigo-500');
            selectedEl.classList.add('toolbar-host');
            selectedEl.appendChild(document.getElementById('builderTools'));
        }
    }

    function renderQuestion(q) {
        const container = document.getElementById('questionsContainer');
        const div = document.createElement('div');
        div.setAttribute('data-id', q.id);
        div.className = 'sortable-item cursor-pointer';
        div.onclick = (e) => {
            e.stopPropagation();
            selectQuestion(q.id);
        };

        if (q.type === 'title_section') {
            div.className += ' bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden';
            div.innerHTML = `<div class="drag-handle cursor-move bg-gray-50 py-1 text-center border-b"><i class="fas fa-grip-horizontal text-gray-400 text-sm"></i></div>
            <div class="p-5"><div class="flex justify-end mb-2"><i class="fas fa-trash text-sm text-gray-400 cursor-pointer hover:text-red-600" onclick="event.stopPropagation(); deleteQuestion(${q.id})"></i></div>
            <input type="text" value="${escapeHtml(q.title)}" placeholder="Section title" onchange="updateAndAutoSave('titleSection', ${q.id}, 'title', this.value)" class="w-full text-xl font-medium border-0 focus:ring-0 outline-none mb-2">
            <textarea rows="1" placeholder="Section description" oninput="autoResizeTextarea(this); updateAndAutoSave('titleSection', ${q.id}, 'description', this.value)" onchange="updateAndAutoSave('titleSection', ${q.id}, 'description', this.value)" class="auto-grow-textarea w-full text-lg sm:text-xl text-gray-900 border-0 focus:ring-0 outline-none">${escapeHtml(q.description || '')}</textarea></div>`;
        } else if (q.type === 'section_break') {
            div.className += ' relative';
            div.innerHTML = `<div class="drag-handle cursor-move absolute left-1/2 -translate-x-1/2 -top-2 z-10 bg-white px-3 rounded-full shadow text-xs"><i class="fas fa-grip-horizontal text-gray-400"></i></div>
            <div class="bg-gray-50 py-5 px-6 rounded-xl border border-gray-200 text-center"><div class="flex justify-end mb-2"><i class="fas fa-trash text-sm text-gray-400 cursor-pointer hover:text-red-600" onclick="event.stopPropagation(); deleteQuestion(${q.id})"></i></div>
            <i class="fas fa-layer-group text-2xl text-gray-400 mb-2"></i>
            <input type="text" value="${escapeHtml(q.title)}" placeholder="Section title" onchange="updateAndAutoSave('sectionBreak', ${q.id}, 'title', this.value)" class="text-lg font-medium border-0 bg-transparent focus:ring-0 outline-none text-center w-full">
            <textarea rows="1" placeholder="Section description" oninput="autoResizeTextarea(this); updateAndAutoSave('sectionBreak', ${q.id}, 'description', this.value)" onchange="updateAndAutoSave('sectionBreak', ${q.id}, 'description', this.value)" class="auto-grow-textarea text-lg sm:text-xl text-gray-900 border-0 bg-transparent focus:ring-0 outline-none text-center w-full mt-1">${escapeHtml(q.description || '')}</textarea>
            <div class="border-t border-gray-300 my-3"></div><p class="text-xs text-gray-400">After section break</p></div>`;
        } else {
            div.className += ' bg-white border border-gray-200 rounded-xl shadow-sm relative overflow-hidden';
            div.id = `question-${q.id}`;
            div.innerHTML = `<div class="drag-handle cursor-move bg-gray-50 py-1 text-center border-b"><i class="fas fa-grip-horizontal text-gray-400 text-sm"></i><span class="text-xs text-gray-400 ml-1">Drag</span></div>
            <div class="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" style="top: 30px;"></div>
            <div class="p-4 sm:p-5"><div class="grid grid-cols-12 gap-3 sm:gap-4 items-start">
                <div class="col-span-12 sm:col-span-7"><div contenteditable="true" spellcheck="false" data-format-target="questionText" data-rich-text="${encodeURIComponent(q.text || '')}" oninput="updateAndAutoSave('questionText', ${q.id}, null, this.innerHTML)" onchange="updateAndAutoSave('questionText', ${q.id}, null, this.innerHTML)" class="auto-grow-textarea w-full min-h-[2.75rem] text-lg sm:text-xl border-0 border-b border-gray-300 focus:ring-0 focus:border-gray-500 bg-gray-50 px-3 py-2 whitespace-pre-wrap break-words outline-none">${escapeHtml(q.text || '')}</div></div>
                <div class="col-span-12 sm:col-span-5"><select onchange="changeQuestionType(${q.id}, this.value)" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">${questionTypes.map(t => `<option value="${t.value}" ${q.type === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}</select></div>
            </div>
            ${isQuizMode ? `<div class="mt-3 flex items-center gap-3 bg-gray-50 p-2 rounded-lg"><div class="flex items-center gap-2"><span class="text-xs text-gray-600">Points:</span><input type="number" value="${q.points ?? 1}" min="0" max="100" oninput="updateAndAutoSave('points', ${q.id}, null, this.value)" class="w-16 px-2 py-1 border rounded-md text-sm text-center"></div></div>` : ''}
            <div id="options-${q.id}" class="mt-5">${renderOptionsByType(q)}</div>
            <div class="border-t mt-5 pt-4 flex justify-end items-center gap-4">
                <div class="flex items-center gap-1 mr-auto">
                    <button type="button" onclick="event.stopPropagation(); applyTextFormat('bold', ${q.id})" onmousedown="event.preventDefault()" title="Bold" class="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900"><i class="fas fa-bold text-xs"></i></button>
                    <button type="button" onclick="event.stopPropagation(); applyTextFormat('italic', ${q.id})" onmousedown="event.preventDefault()" title="Italic" class="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900"><i class="fas fa-italic text-xs"></i></button>
                    <button type="button" onclick="event.stopPropagation(); applyTextFormat('underline', ${q.id})" onmousedown="event.preventDefault()" title="Underline" class="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900"><i class="fas fa-underline text-xs"></i></button>
                    <button type="button" onclick="event.stopPropagation(); applyTextFormat('clear', ${q.id})" onmousedown="event.preventDefault()" title="Clear formatting" class="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900"><i class="fas fa-eraser text-xs"></i></button>
                </div>
                <i class="fas fa-copy text-gray-500 cursor-pointer hover:text-indigo-600" onclick="event.stopPropagation(); duplicateQuestion(${q.id})"></i>
                <i class="fas fa-trash text-gray-500 cursor-pointer hover:text-red-600" onclick="event.stopPropagation(); deleteQuestion(${q.id})"></i>
                <div class="h-6 w-px bg-gray-300"></div><span class="text-xs text-gray-600">Required</span>
                <label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" class="sr-only peer" ${q.required ? 'checked' : ''} onchange="updateAndAutoSave('required', ${q.id}, null, this.checked)"><div class="w-9 h-5 bg-gray-300 rounded-full peer peer-checked:bg-indigo-600"></div><div class="absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-all peer-checked:translate-x-4"></div></label>
                <i class="fas fa-ellipsis-v text-gray-400 cursor-pointer"></i>
            </div></div>`;
        }
        container.appendChild(div);
        hydrateRichTextEditors(div);
    }

    function renderOptionsByType(q) {
        switch (q.type) {
            case 'multiple_choice':
                let mcHtml = '';
                (q.options || ['Option 1']).forEach((opt, i) => {
                    const escapedOpt = escapeHtml(opt);
                    mcHtml += `<div class="flex items-center gap-2 mb-2">
                    <i class="fas fa-circle text-gray-400 text-xs"></i>
                    <input type="text" value="${escapedOpt}" placeholder="Option ${i+1}" onchange="updateAndAutoSave('option', ${q.id}, ${i}, this.value)" class="flex-1 text-lg sm:text-xl text-gray-900 border-0 border-b border-gray-300 focus:border-indigo-500 focus:ring-0 py-1">
                    <label class="flex items-center gap-1 ml-2">
                        <input type="radio" name="correct_${q.id}" value="${escapedOpt}" ${q.correctAnswer === opt ? 'checked' : ''} onchange="updateAndAutoSave('correctAnswer', ${q.id}, null, this.value)" class="w-3 h-3 text-green-600">
                        <span class="text-xs text-gray-500">Correct</span>
                    </label>
                    <button onclick="event.stopPropagation(); removeOption(${q.id}, ${i})" class="text-gray-400 hover:text-red-500"><i class="fas fa-times text-xs"></i></button>
                </div>`;
                });
                mcHtml += `<div class="flex items-center gap-2 text-gray-400 mt-2"><i class="fas fa-circle text-xs"></i><span class="text-xs">Add option</span><button onclick="event.stopPropagation(); addOption(${q.id})" class="text-indigo-600 text-xs hover:underline">add</button></div>`;
                return mcHtml;

            case 'checkboxes':
                let cbHtml = '';
                const options = q.options || ['Option 1'];
                options.forEach((opt, i) => {
                    const escapedOpt = escapeHtml(opt);
                    const isChecked = q.correctAnswers && q.correctAnswers.includes(opt);
                    cbHtml += `<div class="flex items-center gap-2 mb-2">
                    <i class="fas fa-square text-gray-400 text-xs"></i>
                    <input type="text" value="${escapedOpt}" placeholder="Option ${i+1}" onchange="updateAndAutoSave('option', ${q.id}, ${i}, this.value)" class="flex-1 text-lg sm:text-xl text-gray-900 border-0 border-b border-gray-300 focus:border-indigo-500 focus:ring-0 py-1">
                    <label class="flex items-center gap-1 ml-2">
                        <input type="checkbox" value="${escapedOpt}" ${isChecked ? 'checked' : ''} onchange="updateAndAutoSave('correctAnswers', ${q.id}, null, this.value, this.checked)" class="w-3 h-3 text-green-600 rounded">
                        <span class="text-xs text-gray-500">Correct</span>
                    </label>
                    <button onclick="event.stopPropagation(); removeOption(${q.id}, ${i})" class="text-gray-400 hover:text-red-500"><i class="fas fa-times text-xs"></i></button>
                </div>`;
                });
                cbHtml += `<div class="flex items-center gap-2 text-gray-400 mt-2"><i class="fas fa-square text-xs"></i><span class="text-xs">Add option</span><button onclick="event.stopPropagation(); addOption(${q.id})" class="text-indigo-600 text-xs hover:underline">add</button></div>`;
                return cbHtml;

            case 'dropdown':
                let ddHtml = '';
                (q.options || ['Option 1']).forEach((opt, i) => {
                    const escapedOpt = escapeHtml(opt);
                    ddHtml += `<div class="flex items-center gap-2 mb-2">
                    <i class="fas fa-bars text-gray-400 text-xs"></i>
                    <input type="text" value="${escapedOpt}" placeholder="Option ${i+1}" onchange="updateAndAutoSave('option', ${q.id}, ${i}, this.value)" class="flex-1 text-lg sm:text-xl text-gray-900 border-0 border-b border-gray-300 focus:border-indigo-500 focus:ring-0 py-1">
                    <label class="flex items-center gap-1 ml-2">
                        <input type="radio" name="correct_${q.id}" value="${escapedOpt}" ${q.correctAnswer === opt ? 'checked' : ''} onchange="updateAndAutoSave('correctAnswer', ${q.id}, null, this.value)" class="w-3 h-3 text-green-600">
                        <span class="text-xs text-gray-500">Correct</span>
                    </label>
                    <button onclick="event.stopPropagation(); removeOption(${q.id}, ${i})" class="text-gray-400 hover:text-red-500"><i class="fas fa-times text-xs"></i></button>
                </div>`;
                });
                ddHtml += `<div class="flex items-center gap-2 text-gray-400 mt-2"><i class="fas fa-bars text-xs"></i><span class="text-xs">Add option</span><button onclick="event.stopPropagation(); addOption(${q.id})" class="text-indigo-600 text-xs hover:underline">add</button></div>`;
                return ddHtml;

            case 'short_answer':
            case 'paragraph':
                return `<div class="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                <span class="text-xs text-gray-500">Correct Answer:</span>
                ${q.type === 'paragraph'
                    ? `<textarea rows="2" placeholder="Enter correct answer..." oninput="autoResizeTextarea(this); updateAndAutoSave('correctAnswer', ${q.id}, null, this.value)" onchange="updateAndAutoSave('correctAnswer', ${q.id}, null, this.value)" class="auto-grow-textarea flex-1 px-3 py-2 border rounded-lg text-lg sm:text-xl text-gray-900 border-gray-300 focus:ring-1 focus:ring-indigo-500">${escapeHtml(q.correctAnswer || '')}</textarea>`
                    : `<input type="text" placeholder="Enter correct answer..." onchange="updateAndAutoSave('correctAnswer', ${q.id}, null, this.value)" value="${escapeHtml(q.correctAnswer || '')}" class="flex-1 px-3 py-2 border rounded-lg text-lg sm:text-xl text-gray-900 border-gray-300 focus:ring-1 focus:ring-indigo-500">`
                }
            </div>`;

            case 'date':
                return `<div class="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                <span class="text-xs text-gray-500">Correct Answer (Date):</span>
                <input type="date" onchange="updateAndAutoSave('correctAnswer', ${q.id}, null, this.value)" 
                       value="${q.correctAnswer || ''}"
                       class="px-3 py-2 border rounded-lg text-lg sm:text-xl text-gray-900 border-gray-300 focus:ring-1 focus:ring-indigo-500">
            </div>`;

            case 'time':
                return `<div class="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                <span class="text-xs text-gray-500">Correct Answer (Time):</span>
                <input type="time" onchange="updateAndAutoSave('correctAnswer', ${q.id}, null, this.value)" 
                       value="${q.correctAnswer || ''}"
                       class="px-3 py-2 border rounded-lg text-lg sm:text-xl text-gray-900 border-gray-300 focus:ring-1 focus:ring-indigo-500">
            </div>`;

            case 'linear_scale':
                return `<div class="flex flex-wrap items-center gap-4 bg-gray-50 p-3 rounded-lg">
                    <div class="flex items-center gap-3">
                        <span class="text-xs text-gray-500">Range:</span>
                        <input type="number" value="${q.min || 1}" onchange="updateAndAutoSave('scaleMin', ${q.id}, null, this.value)" class="w-14 px-2 py-1 border rounded-md text-lg sm:text-xl text-gray-900 text-center">
                        <span class="text-gray-400">→</span>
                        <input type="number" value="${q.max || 5}" onchange="updateAndAutoSave('scaleMax', ${q.id}, null, this.value)" class="w-14 px-2 py-1 border rounded-md text-lg sm:text-xl text-gray-900 text-center">
                    </div>
                    <div class="flex items-center gap-3 border-l border-gray-300 pl-4">
                        <span class="text-xs text-gray-500">Correct Value:</span>
                        <input type="number" value="${q.correctAnswer || ''}" onchange="updateAndAutoSave('correctAnswer', ${q.id}, null, this.value)" class="w-14 px-2 py-1 border rounded-md text-lg sm:text-xl text-gray-900 text-center" placeholder="None">
                        <span class="text-xs text-gray-400">(Leave blank for no correct answer)</span>
                    </div>
                </div>`;

            case 'rating':
                const maxStars = q.max || 5;
                return `<div class="flex flex-wrap items-center gap-4 bg-gray-50 p-3 rounded-lg">
                    <div class="flex items-center gap-3">
                        <span class="text-xs text-gray-500">Stars:</span>
                        <select onchange="updateAndAutoSave('ratingMax', ${q.id}, null, this.value)" class="border rounded px-2 py-1 text-lg sm:text-xl text-gray-900">
                            ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}" ${(q.max || 5) === n ? 'selected' : ''}>${n} stars</option>`).join('')}
                        </select>
                    </div>
                    <div class="flex items-center gap-3 border-l border-gray-300 pl-4">
                        <span class="text-xs text-gray-500">Correct Value:</span>
                        <select onchange="updateAndAutoSave('correctAnswer', ${q.id}, null, this.value)" class="border rounded px-2 py-1 text-lg sm:text-xl text-gray-900">
                            <option value="">None</option>
                            ${Array.from({length: maxStars}, (_, i) => i + 1).map(n => `<option value="${n}" ${q.correctAnswer == n ? 'selected' : ''}>${n} star${n > 1 ? 's' : ''}</option>`).join('')}
                        </select>
                        <span class="text-xs text-gray-400">(Leave blank for no correct answer)</span>
                    </div>
                </div>`;

            case 'multiple_choice_grid':
                let gridHtml = `<div class="bg-gray-50 p-3 rounded-lg">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">Rows</label>
                            ${(q.rows || ['Row 1']).map((r,i)=>`
                                <div class="flex items-center gap-1 mb-1">
                                    <span class="text-gray-500 w-5 text-xs">${i+1}.</span>
                                    <input type="text" value="${escapeHtml(r)}" onchange="updateAndAutoSave('row', ${q.id}, ${i}, this.value)" class="flex-1 px-2 py-1 border rounded-lg text-lg sm:text-xl text-gray-900">
                                    <button onclick="event.stopPropagation(); removeRow(${q.id}, ${i})" class="text-red-500"><i class="fas fa-times text-sm"></i></button>
                                </div>
                            `).join('')}
                            <button onclick="event.stopPropagation(); addRow(${q.id})" class="text-indigo-600 text-sm">+ Add row</button>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">Columns</label>
                            ${(q.columns || ['Column 1']).map((c,i)=>`
                                <div class="flex items-center gap-1 mb-1">
                                    <input type="text" value="${escapeHtml(c)}" onchange="updateAndAutoSave('column', ${q.id}, ${i}, this.value)" class="flex-1 px-2 py-1 border rounded-lg text-lg sm:text-xl text-gray-900">
                                    <button onclick="event.stopPropagation(); removeColumn(${q.id}, ${i})" class="text-red-500"><i class="fas fa-times text-sm"></i></button>
                                </div>
                            `).join('')}
                            <button onclick="event.stopPropagation(); addColumn(${q.id})" class="text-indigo-600 text-sm">+ Add column</button>
                        </div>
                    </div>
                    <div class="mt-3 pt-3 border-t border-gray-200">
                        <label class="block text-xs font-medium text-gray-700 mb-2">Correct Answers (per row):</label>
                        ${(q.rows || ['Row 1']).map((r, rowIndex) => `
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-sm font-medium text-gray-600 w-20 truncate">${escapeHtml(r)}:</span>
                                <select onchange="updateGridCorrectAnswer(${q.id}, ${rowIndex}, this.value)" class="flex-1 px-2 py-1 border rounded-lg text-lg sm:text-xl text-gray-900">
                                    <option value="">None</option>
                                    ${(q.columns || ['Column 1']).map(c => `<option value="${escapeHtml(c)}" ${(q.correctAnswers && q.correctAnswers[rowIndex] === c) ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
                                </select>
                            </div>
                        `).join('')}
                        <span class="text-xs text-gray-400">Select the correct answer for each row</span>
                    </div>
                </div>`;
                return gridHtml;

            case 'checkbox_grid':
                let checkboxGridHtml = `<div class="bg-gray-50 p-3 rounded-lg">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">Rows</label>
                            ${(q.rows || ['Row 1']).map((r,i)=>`
                                <div class="flex items-center gap-1 mb-1">
                                    <span class="text-gray-500 w-5 text-xs">${i+1}.</span>
                                    <input type="text" value="${escapeHtml(r)}" onchange="updateAndAutoSave('row', ${q.id}, ${i}, this.value)" class="flex-1 px-2 py-1 border rounded-lg text-lg sm:text-xl text-gray-900">
                                    <button onclick="event.stopPropagation(); removeRow(${q.id}, ${i})" class="text-red-500"><i class="fas fa-times text-sm"></i></button>
                                </div>
                            `).join('')}
                            <button onclick="event.stopPropagation(); addRow(${q.id})" class="text-indigo-600 text-sm">+ Add row</button>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">Columns</label>
                            ${(q.columns || ['Column 1']).map((c,i)=>`
                                <div class="flex items-center gap-1 mb-1">
                                    <input type="text" value="${escapeHtml(c)}" onchange="updateAndAutoSave('column', ${q.id}, ${i}, this.value)" class="flex-1 px-2 py-1 border rounded-lg text-lg sm:text-xl text-gray-900">
                                    <button onclick="event.stopPropagation(); removeColumn(${q.id}, ${i})" class="text-red-500"><i class="fas fa-times text-sm"></i></button>
                                </div>
                            `).join('')}
                            <button onclick="event.stopPropagation(); addColumn(${q.id})" class="text-indigo-600 text-sm">+ Add column</button>
                        </div>
                    </div>
                    <div class="mt-3 pt-3 border-t border-gray-200">
                        <label class="block text-xs font-medium text-gray-700 mb-2">Correct Answers (select all that apply per row):</label>
                        ${(q.rows || ['Row 1']).map((r, rowIndex) => `
                            <div class="mb-2">
                                <span class="text-sm font-medium text-gray-600 block mb-1">${escapeHtml(r)}:</span>
                                <div class="flex flex-wrap gap-2 ml-2">
                                    ${(q.columns || ['Column 1']).map(c => {
                                        const isChecked = q.correctAnswers && q.correctAnswers[rowIndex] && q.correctAnswers[rowIndex].includes(c);
                                        return `
                                            <label class="flex items-center gap-1 cursor-pointer">
                                                <input type="checkbox" value="${escapeHtml(c)}" ${isChecked ? 'checked' : ''} 
                                                    onchange="updateGridCheckboxCorrect(${q.id}, ${rowIndex}, '${escapeHtml(c)}', this.checked)" 
                                                    class="w-4 h-4 text-green-600 rounded">
                                                <span class="text-sm sm:text-base text-gray-900">${escapeHtml(c)}</span>
                                            </label>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        `).join('')}
                        <span class="text-xs text-gray-400">Select all correct answers for each row</span>
                    </div>
                </div>`;
                return checkboxGridHtml;

            default:
                return `<input type="text" class="w-full text-lg sm:text-xl text-gray-900 border-0 border-b border-gray-300" placeholder="Answer" disabled>`;
        }
    }

    // Function to update grid correct answer (for multiple choice grid)
    function updateGridCorrectAnswer(id, rowIndex, value) {
        const q = questions.find(q => q.id === id);
        if (!q) return;
        
        if (!q.correctAnswers) q.correctAnswers = {};
        q.correctAnswers[rowIndex] = value;
        autoSave();
    }

    // Function to update grid checkbox correct answers (for checkbox grid)
    function updateGridCheckboxCorrect(id, rowIndex, value, checked) {
        const q = questions.find(q => q.id === id);
        if (!q) return;
        
        if (!q.correctAnswers) q.correctAnswers = {};
        if (!q.correctAnswers[rowIndex]) q.correctAnswers[rowIndex] = [];
        
        if (checked) {
            if (!q.correctAnswers[rowIndex].includes(value)) {
                q.correctAnswers[rowIndex].push(value);
            }
        } else {
            q.correctAnswers[rowIndex] = q.correctAnswers[rowIndex].filter(v => v !== value);
        }
        autoSave();
    }

    function updateAndAutoSave(type, id, index, value, checked) {
        const q = questions.find(q => q.id === id);
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
                    if (!q.correctAnswers.includes(value)) {
                        q.correctAnswers.push(value);
                    }
                } else {
                    q.correctAnswers = q.correctAnswers.filter(v => v !== value);
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
        const q = questions.find(q => q.id === id);
        if (q) {
            if (!q.rows) q.rows = [];
            q.rows.push(`Row ${q.rows.length + 1}`);
            renderAllQuestions();
            autoSave();
        }
    }

    function removeRow(id, i) {
        const q = questions.find(q => q.id === id);
        if (q && q.rows && q.rows.length > 1) {
            q.rows.splice(i, 1);
            renderAllQuestions();
            autoSave();
        }
    }

    function addColumn(id) {
        const q = questions.find(q => q.id === id);
        if (q) {
            if (!q.columns) q.columns = [];
            q.columns.push(`Column ${q.columns.length + 1}`);
            renderAllQuestions();
            autoSave();
        }
    }

    function removeColumn(id, i) {
        const q = questions.find(q => q.id === id);
        if (q && q.columns && q.columns.length > 1) {
            q.columns.splice(i, 1);
            renderAllQuestions();
            autoSave();
        }
    }

    function addOption(id) {
        const q = questions.find(q => q.id === id);
        if (q && q.options) {
            q.options.push(`Option ${q.options.length + 1}`);
            renderAllQuestions();
            autoSave();
        }
    }

    function removeOption(id, i) {
        const q = questions.find(q => q.id === id);
        if (q && q.options && q.options.length > 1) {
            q.options.splice(i, 1);
            renderAllQuestions();
            autoSave();
        }
    }

    function changeQuestionType(id, type) {
        const q = questions.find(q => q.id === id);
        if (q) {
            q.type = type;
            if (!q.options && (type === 'multiple_choice' || type === 'checkboxes' || type === 'dropdown')) {
                q.options = ['Option 1'];
            }
            if (type === 'multiple_choice_grid' || type === 'checkbox_grid') {
                if (!q.rows) q.rows = ['Row 1'];
                if (!q.columns) q.columns = ['Column 1'];
            }
            renderAllQuestions();
            autoSave();
        }
    }

    function duplicateQuestion(id) {
        const o = questions.find(q => q.id === id);
        if (o) {
            const nid = questionCount++;
            const newQuestion = JSON.parse(JSON.stringify({
                ...o,
                id: nid
            }));
            const index = questions.findIndex(q => q.id === id) + 1;
            questions.splice(index, 0, newQuestion);
            renderAllQuestions();
            autoSave();
        }
    }

    function deleteQuestion(id) {
        const i = questions.findIndex(q => q.id === id);
        if (i !== -1) {
            questions.splice(i, 1);
            renderAllQuestions();
            autoSave();
        }
    }

    let currentFormId = null;

    function saveForm(isAutoSave = false) {
        if (isSaving) return;

        const titleInput = document.getElementById('formTitle');
        const enteredTitle = titleInput.value.trim();
        if (!isAutoSave && !enteredTitle) {
            titleInput.focus();
            appAlert('Please enter a form title before saving.');
            return;
        }

        isSaving = true;
        const title = enteredTitle || 'Untitled form';
        const description = document.getElementById('formDescription').value || '';
        const publishByDefault = document.getElementById('publishByDefault')?.checked || false;

        let settings = {
            is_published: publishByDefault,
            allow_retake: false,
            show_score: true,
            allow_view_response: document.getElementById('allowViewResponse')?.checked ?? true,
            allow_editing: document.getElementById('allowEditing')?.checked || false,
            limit_one_response: document.getElementById('limitOneResponse')?.checked ?? true,
            show_progress_bar: document.getElementById('showProgressBar')?.checked || false,
            shuffle_questions: document.getElementById('shuffleQuestions')?.checked || false,
            confirmation_message: document.getElementById('confirmationMessage')?.value || 'Your response has been recorded.',
            default_required: document.getElementById('defaultRequired')?.checked || false,
            is_quiz: document.getElementById('isQuiz')?.checked ?? true,
            release_grade: document.querySelector('input[name="release_grade"]:checked')?.value || 'immediately',
            default_points: document.getElementById('defaultPoints')?.value ?? 1
        };

        const saved = localStorage.getItem('form_settings');
        if (saved) settings = {
            ...settings,
            ...JSON.parse(saved)
        };

        const data = {
            title,
            description,
            questions: questions.map(q => ({
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
                points: q.points ?? 1,
                correctAnswer: q.correctAnswer || null,
                correctAnswers: q.correctAnswers || null
            })),
            settings
        };

        let url = '{{ route("forms.manage.store") }}';
        let method = 'POST';

        if (currentFormId) {
            url = `/forms/manage/${currentFormId}`;
            method = 'PUT';
        }

        if (!isAutoSave) {
            const btn = document.getElementById('saveFormButton');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Saving...';
            btn.disabled = true;
        }

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
            },
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(data => {
            isSaving = false;
            if (data.success) {
                if (data.form_id) {
                    currentFormId = data.form_id;
                }
                if (isAutoSave) {
                    showAutoSaveIndicator();
                } else {
                    const btn = document.getElementById('saveFormButton');
                    btn.innerHTML = '<i class="fas fa-check mr-2"></i> Save Form';
                    btn.disabled = false;
                    appConfirm('Form saved successfully!').then((confirmed) => {
                        if (confirmed) {
                            window.location.href = '{{ route("intercession.index") }}#forms-tab';
                        }
                    });
                }
            } else {
                isSaving = false;
                if (!isAutoSave) {
                    const btn = document.getElementById('saveFormButton');
                    btn.innerHTML = '<i class="fas fa-check mr-2"></i> Save Form';
                    btn.disabled = false;
                    appAlert('Error: ' + (data.message || 'Unknown error'));
                }
            }
        })
        .catch(err => {
            console.error('Fetch error:', err);
            isSaving = false;
            if (!isAutoSave) {
                const btn = document.getElementById('saveFormButton');
                btn.innerHTML = '<i class="fas fa-check mr-2"></i> Save Form';
                btn.disabled = false;
                appAlert('Error saving form: ' + err.message);
            }
        });
    }

    function escapeHtml(t) {
        if (!t) return '';
        const d = document.createElement('div');
        d.textContent = t;
        return d.innerHTML;
    }

    document.getElementById('isQuiz')?.addEventListener('change', function() {
        isQuizMode = this.checked;
        document.getElementById('quizDetails').classList.toggle('hidden', !this.checked);
        renderAllQuestions();
        autoSaveSettings();
    });

    // Initialize
    loadSettings();
    addQuestion();

    // Expose functions globally
    window.addQuestion = addQuestion;
    window.addTitleSection = addTitleSection;
    window.addSection = addSection;
    window.autoSave = autoSave;
    window.saveForm = saveForm;
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
    window.updateGridCorrectAnswer = updateGridCorrectAnswer;
    window.updateGridCheckboxCorrect = updateGridCheckboxCorrect;
    window.questions = questions;
</script>
@endsection
