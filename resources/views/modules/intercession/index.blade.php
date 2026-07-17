@extends('layouts.app')

@section('title', 'Intercession & Spiritual Growth')
@section('page-title', 'Intercession & Spiritual Growth')

@section('content')
<div class="intercession-page mx-auto max-w-[1600px] space-y-4 px-2 sm:px-4 lg:px-6 py-3 sm:py-5">

    @php
        $bibleVersions = $bibleStudyVersions ?? [];
        $bibleBooks = $bibleStudyBooks ?? [];
        $bibleBookNamesRw = $bibleStudyBookNamesRw ?? [];
        $bibleChapterCounts = $bibleStudyChapterCounts ?? [];
        $bibleDefaultVersion = 'bysb';
        $bibleDefaultCompare = $bibleStudyDefaultCompare ?? '';
        $bibleDefaultBook = 'EXO';
        $bibleDefaultChapter = 27;
        $bibleDefaultLocalizedBooks = in_array($bibleDefaultVersion, ['bysb', 'bir'], true);
    @endphp

    {{-- TABS --}}
    @php
        $hasReports = auth()->check() && auth()->user()->canAccess('intercession', 'view-reports');
        // Published forms and a user's own results are available to every authenticated user.
        $hasForms = auth()->check();
        $hasActions = auth()->check() && auth()->user()->canAccess('intercession', 'view-actions');
        $hasBibleReader = auth()->check();
    @endphp

    @if($hasForms || $hasActions || $hasBibleReader)
    <div class="md:hidden rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
        <button type="button" id="intercessionMobileTabButton" class="flex h-11 w-full items-center justify-between rounded-lg px-3 text-sm font-semibold text-gray-700" aria-expanded="false">
            <span class="flex items-center gap-2">
                <i id="intercessionMobileTabIcon" class="fas fa-file-alt text-blue-600"></i>
                <span id="intercessionMobileTabLabel">Forms</span>
            </span>
            <i class="fas fa-chevron-down text-xs text-gray-400"></i>
        </button>
        <div id="intercessionMobileTabMenu" class="mt-1 hidden grid-cols-2 gap-1 border-t border-gray-100 pt-2">
            @if($hasForms)<button type="button" onclick="selectIntercessionMobileTab('forms')" class="intercession-mobile-tab-option h-10 rounded-md px-3 text-left text-sm hover:bg-gray-100" data-tab="forms" data-icon="file-alt">Forms</button>@endif
            @if($hasActions)<button type="button" onclick="selectIntercessionMobileTab('actions')" class="intercession-mobile-tab-option h-10 rounded-md px-3 text-left text-sm hover:bg-gray-100" data-tab="actions" data-icon="tasks">Action Plans</button>@endif
            @if($hasBibleReader)<button type="button" onclick="selectIntercessionMobileTab('bible-reader')" class="intercession-mobile-tab-option h-10 rounded-md px-3 text-left text-sm hover:bg-gray-100" data-tab="bible-reader" data-icon="bible">Read Bible</button>@endif
        </div>
    </div>

    <div class="hidden md:block border-b border-gray-200">
        <nav class="flex space-x-6 overflow-x-auto">
            @if($hasForms)
            <button type="button" onclick="showTab('forms')" id="tab-forms" class="tab-btn py-2 px-1 border-b-2 font-medium text-sm transition">
                <i class="fas fa-file-alt mr-2"></i>Forms
            </button>
            @endif
            
            @if($hasActions)
            <button type="button" onclick="showTab('actions')" id="tab-actions" class="tab-btn py-2 px-1 border-b-2 font-medium text-sm transition">
                <i class="fas fa-tasks mr-2"></i>Action Plans
            </button>
            @endif
            
            @if($hasBibleReader)
            <button type="button" onclick="showTab('bible-reader')" id="tab-bible-reader" class="tab-btn py-2 px-1 border-b-2 font-medium text-sm transition">
                <i class="fas fa-bible mr-2"></i>Read Bible
            </button>
            @endif
        </nav>
    </div>
    @endif

    {{-- FORMS TAB --}}
    @if($hasForms)
    <div id="forms-tab" class="tab-content">
        @include('modules.intercession.partials.forms')
    </div>
    @endif

    {{-- ACTION PLANS TAB --}}
    @if($hasActions)
    <div id="actions-tab" class="tab-content hidden">
        @include('modules.intercession.partials.actions')
    </div>
    @endif

    {{-- BIBLE READER TAB --}}
    @if($hasBibleReader)
    <div id="bible-reader-tab" class="tab-content hidden">
        <div class="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
            <div class="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_36%),linear-gradient(180deg,_#ffffff,_#f8fbff)] px-6 py-5 sm:px-8 sm:py-6 lg:px-10 lg:py-7">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                            <div class="flex items-center gap-3">
                                <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md">
                                    <i class="fas fa-book-bible"></i>
                                </div>
                                <div>
                                <h2 id="bibleReaderHeading" class="text-2xl font-bold text-slate-900">Read Bible</h2>
                                <p id="bibleReaderIntro" class="text-sm text-slate-500"></p>
                               
                                </div>
                            </div>
                        </div>
                    
                    </div>
                </div>
                <div class="px-4 sm:px-6 lg:px-8 xl:px-10">
                    <div class="mt-5 rounded-3xl border border-blue-100 bg-white/90 p-5 shadow-sm sm:p-6 lg:p-7">
                        <div class="grid gap-4 xl:grid-cols-[1.1fr_1.1fr_1.4fr_0.6fr_auto]">
                            <div>
                                <label id="biblePrimaryVersionLabel" class="mb-1 block text-sm font-semibold text-slate-900" for="biblePrimaryVersion">Translation</label>
                                <select id="biblePrimaryVersion" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                                    @foreach($bibleVersions as $key => $version)
                                        <option value="{{ $key }}" data-code="{{ $version['code'] }}" data-id="{{ $version['id'] }}" @selected($key === $bibleDefaultVersion)>{{ $version['code'] }} - {{ $version['label'] }}</option>
                                    @endforeach
                                </select>
                            </div>
                            <div>
                                <label id="bibleCompareVersionLabel" class="mb-1 block text-sm font-semibold text-slate-900" for="bibleCompareVersion">Compare</label>
                                <select id="bibleCompareVersion" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                                    <option value="">None</option>
                                    @foreach($bibleVersions as $key => $version)
                                        <option value="{{ $key }}" data-code="{{ $version['code'] }}" data-id="{{ $version['id'] }}" @selected($key === $bibleDefaultCompare)>{{ $version['code'] }} - {{ $version['label'] }}</option>
                                    @endforeach
                                </select>
                            </div>
                            <div>
                                <label id="bibleBookSelectLabel" class="mb-1 block text-sm font-semibold text-slate-900" for="bibleBookSelect">Book</label>
                                <select id="bibleBookSelect" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                                    @foreach($bibleBooks as $book)
                                        <option
                                            value="{{ $book['code'] }}"
                                            data-name-en="{{ $book['name'] }}"
                                            data-name-rw="{{ $bibleBookNamesRw[$book['code']] ?? $book['name'] }}"
                                            @selected($book['code'] === $bibleDefaultBook)
                                        >{{ $bibleDefaultLocalizedBooks ? ($bibleBookNamesRw[$book['code']] ?? $book['name']) : $book['name'] }}</option>
                                    @endforeach
                                </select>
                            </div>
                            <div>
                                <label id="bibleChapterInputLabel" class="mb-1 block text-sm font-semibold text-slate-900" for="bibleChapterInput">Chapter</label>
                                <input id="bibleChapterInput" type="number" min="1" value="{{ $bibleDefaultChapter }}" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                                <p id="bibleChapterMeta" class="mt-1 text-xs font-medium text-slate-400"></p>
                            </div>
                            <div class="flex items-start pt-7">
                                <button type="button" id="bibleReadButton" class="inline-flex w-full items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200">
                                    <i class="fas fa-search mr-2"></i><span id="bibleReadButtonText">Read</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="mx-auto mt-5 mb-6 w-full max-w-[calc(100%-3rem)] sm:max-w-[calc(100%-4rem)] lg:max-w-[calc(100%-5rem)]">
                        <label id="bibleSearchLabel" class="sr-only" for="bibleSearchInput">Search within this chapter</label>
                        <div class="flex w-full items-center gap-2 overflow-hidden rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-100 sm:gap-3 sm:px-4 sm:py-2.5 lg:px-5 lg:py-3">
                            <i class="fas fa-search text-sm text-blue-700 sm:text-sm lg:text-base"></i>
                            <input id="bibleSearchInput" type="text" placeholder="Search within this chapter (min. 2 characters)..." class="min-w-0 flex-1 border-0 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400 sm:text-xs lg:text-sm">
                        </div>
                    </div>
                </div>
            </div>

            <div class="px-6 pt-6 pb-5 sm:px-8 sm:pt-7 sm:pb-6 lg:px-10 lg:pt-8 lg:pb-7">
                <div id="bibleReaderNotice" class="hidden rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"></div>
                <div id="bibleReaderLoading" class="hidden rounded-3xl border border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500">
                    <i class="fas fa-spinner fa-spin mr-2 text-blue-700"></i><span id="bibleReaderLoadingText">Loading chapter...</span>
                </div>

                <div id="bibleReaderEmpty" class="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
                    <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl text-blue-700 shadow-sm">
                        <i class="fas fa-bible"></i>
                    </div>
                    <h3 id="bibleReaderEmptyTitle" class="mt-4 text-lg font-bold text-slate-900">Choose a passage to begin</h3>
                    <p id="bibleReaderEmptyText" class="mt-2 text-sm text-slate-500">Pick a version, compare it if you want, then press Read.</p>
                </div>

                <div id="bibleReaderResult" class="hidden">
                    <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h3 id="bibleReaderTitle" class="text-xl font-bold text-slate-900"></h3>
                            <p id="bibleReaderSubtitle" class="text-sm text-slate-500"></p>
                        </div>
                        <div id="bibleReaderMeta" class="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400"></div>
                    </div>

                    <div id="bibleReaderColumns" class="grid gap-4 xl:grid-cols-2">
                        <section id="biblePrimarySection" class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div class="mb-4 flex items-center justify-between gap-3 border-l-4 border-blue-500 pl-3">
                                <div>
                                    <h4 id="biblePrimaryHeading" class="text-lg font-bold text-slate-900"></h4>
                                    <p class="text-xs uppercase tracking-[0.24em] text-slate-400">Translation</p>
                                </div>
                                <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Primary</span>
                            </div>
                            <div id="biblePrimaryContent" class="bible-reader-content prose max-w-none"></div>
                        </section>

                        <section id="bibleCompareSection" class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div class="mb-4 flex items-center justify-between gap-3 border-l-4 border-amber-500 pl-3">
                                <div>
                                    <h4 id="bibleCompareHeading" class="text-lg font-bold text-slate-900"></h4>
                                    <p id="bibleCompareSectionLabel" class="text-xs uppercase tracking-[0.24em] text-slate-400">Compare</p>
                                </div>
                                <span id="bibleCompareBadge" class="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Compare</span>
                            </div>
                            <div id="bibleCompareContent" class="bible-reader-content prose max-w-none"></div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    </div>
    @endif

    {{-- NO PERMISSION MESSAGE --}}
    @if(!$hasForms && !$hasActions && !$hasBibleReader)
    <div class="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
        <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-lock text-gray-400 text-3xl"></i>
        </div>
        <h3 class="text-lg font-semibold text-gray-800 mb-2">No Access</h3>
        <p class="text-gray-500 text-sm">You don't have permission to view this page.</p>
        <p class="text-gray-400 text-xs mt-2">Contact your administrator to grant access.</p>
    </div>
    @endif

</div>

{{-- MODALS - Include at the bottom of the page --}}
<script>
    // Function to switch tabs with persistence
    window.showTab = function(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden');
        });

        // Remove active class from all tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('border-blue-600', 'text-blue-600');
            btn.classList.add('border-transparent', 'text-gray-500');
        });

        // Show selected tab
        const selectedTab = document.getElementById(`${tabName}-tab`);
        if (selectedTab) {
            selectedTab.classList.remove('hidden');
        }

        // Activate selected button
        const selectedBtn = document.getElementById(`tab-${tabName}`);
        if (selectedBtn) {
            selectedBtn.classList.remove('border-transparent', 'text-gray-500');
            selectedBtn.classList.add('border-blue-600', 'text-blue-600');
        }

        // Save current tab to localStorage
        localStorage.setItem('activeIntercessionTab', tabName);

        if (tabName === 'bible-reader' && typeof window.loadBibleStudyChapter === 'function') {
            window.loadBibleStudyChapter();
        }

        const mobileOption = document.querySelector(`.intercession-mobile-tab-option[data-tab="${tabName}"]`);
        const mobileLabel = document.getElementById('intercessionMobileTabLabel');
        const mobileIcon = document.getElementById('intercessionMobileTabIcon');
        if (mobileOption && mobileLabel && mobileIcon) {
            mobileLabel.textContent = mobileOption.textContent.trim();
            mobileIcon.className = `fas fa-${mobileOption.dataset.icon} text-blue-600`;
            document.querySelectorAll('.intercession-mobile-tab-option').forEach(option => {
                option.classList.toggle('bg-blue-50', option === mobileOption);
                option.classList.toggle('text-blue-700', option === mobileOption);
            });
        }
    }

    window.selectIntercessionMobileTab = function(tabName) {
        showTab(tabName);
        document.getElementById('intercessionMobileTabMenu')?.classList.add('hidden');
        document.getElementById('intercessionMobileTabButton')?.setAttribute('aria-expanded', 'false');
    }

    const bibleStudyEndpoint = @json(route('intercession.bible-study.chapter'));
    const bibleStudyVersions = @json($bibleVersions);
    const bibleStudyBooks = @json($bibleBooks);
    const bibleStudyBookNamesRw = @json($bibleBookNamesRw);
    const bibleStudyChapterCounts = @json($bibleChapterCounts);
    const bibleStudyBookLookup = Object.fromEntries(bibleStudyBooks.map(book => [book.code, book]));

    function getSelectedBibleVersion(selectId) {
        const element = document.getElementById(selectId);
        const key = element?.value || 'bysb';
        return bibleStudyVersions[key] || bibleStudyVersions.bysb;
    }

    function getSelectedBibleVersionOrNull(selectId) {
        const element = document.getElementById(selectId);
        const key = element?.value || '';
        if (!key) return null;
        return bibleStudyVersions[key] || null;
    }

    function bibleBooksShouldUseKinyarwanda() {
        const primaryVersion = getSelectedBibleVersion('biblePrimaryVersion');
        return ['BYSB', 'BIR'].includes((primaryVersion?.code || '').toUpperCase());
    }

    function getBibleChapterLabel(useKinyarwanda) {
        return useKinyarwanda ? 'Igice' : 'Chapter';
    }

    function getBibleCompareLabel(useKinyarwanda) {
        return useKinyarwanda ? 'Gereranya' : 'Compare';
    }

    function getBibleReaderCopy(useKinyarwanda) {
        if (useKinyarwanda) {
            return {
                heading: "Soma Bibiliya",
                read: "Soma",
                searchLabel: "Shakisha muri iki gice",
                searchPlaceholder: "Shakisha muri iki gice (nibura inyuguti 2)...",
                loading: "Ifungura igice...",
                emptyTitle: "Hitamo igice cyo gusoma",
                emptyText: "Hitamo Bibiliya, ugereranye niba ubishaka, hanyuma ukande Soma.",
                invalidSelection: "Hitamo Bibiliya, igitabo, n'igice bifite agaciro.",
                loadError: "Ntibishobotse gufungura igice cyatoranyijwe ubu.",
            };
        }

        return {
            heading: 'Read Bible',
            read: 'Read',
            searchLabel: 'Search within this chapter',
            searchPlaceholder: 'Search within this chapter (min. 2 characters)...',
            loading: 'Loading chapter...',
            emptyTitle: 'Choose a passage to begin',
            emptyText: 'Pick a version, compare it if you want, then press Read.',
            invalidSelection: 'Please choose a valid translation, book, and chapter.',
            loadError: 'Unable to load the selected chapter right now.',
        };
    }

    function refreshBibleReaderLabels() {
        const useKinyarwanda = bibleBooksShouldUseKinyarwanda();
        const copy = getBibleReaderCopy(useKinyarwanda);
        const readerHeading = document.getElementById('bibleReaderHeading');
        const readerIntro = document.getElementById('bibleReaderIntro');
        const primaryVersionLabel = document.getElementById('biblePrimaryVersionLabel');
        const compareVersionLabel = document.getElementById('bibleCompareVersionLabel');
        const bookSelectLabel = document.getElementById('bibleBookSelectLabel');
        const chapterInputLabel = document.getElementById('bibleChapterInputLabel');
        const compareSectionLabel = document.getElementById('bibleCompareSectionLabel');
        const compareBadge = document.getElementById('bibleCompareBadge');
        const readButtonText = document.getElementById('bibleReadButtonText');
        const searchLabel = document.getElementById('bibleSearchLabel');
        const searchInput = document.getElementById('bibleSearchInput');
        const loadingText = document.getElementById('bibleReaderLoadingText');
        const emptyTitle = document.getElementById('bibleReaderEmptyTitle');
        const emptyText = document.getElementById('bibleReaderEmptyText');

        if (readerHeading) readerHeading.textContent = copy.heading;
        if (readerIntro) readerIntro.textContent = copy.intro;
        if (primaryVersionLabel) primaryVersionLabel.textContent = useKinyarwanda ? 'Bibiliya' : 'Translation';
        if (compareVersionLabel) compareVersionLabel.textContent = getBibleCompareLabel(useKinyarwanda);
        if (bookSelectLabel) bookSelectLabel.textContent = useKinyarwanda ? 'Igitabo' : 'Book';
        if (chapterInputLabel) chapterInputLabel.textContent = getBibleChapterLabel(useKinyarwanda);
        if (compareSectionLabel) compareSectionLabel.textContent = getBibleCompareLabel(useKinyarwanda);
        if (compareBadge) compareBadge.textContent = getBibleCompareLabel(useKinyarwanda);
        if (readButtonText) readButtonText.textContent = copy.read;
        if (searchLabel) searchLabel.textContent = copy.searchLabel;
        if (searchInput) searchInput.placeholder = copy.searchPlaceholder;
        if (loadingText) loadingText.textContent = copy.loading;
        if (emptyTitle) emptyTitle.textContent = copy.emptyTitle;
        if (emptyText) emptyText.textContent = copy.emptyText;
    }

    function refreshBibleBookLabels() {
        const useKinyarwanda = bibleBooksShouldUseKinyarwanda();
        const select = document.getElementById('bibleBookSelect');
        if (!select) return;

        Array.from(select.options).forEach((option) => {
            if (useKinyarwanda) {
                option.textContent = option.dataset.nameRw || option.dataset.nameEn || option.textContent;
            } else {
                option.textContent = option.dataset.nameEn || option.dataset.nameRw || option.textContent;
            }
        });
    }

    function getBibleChapterMax(bookCode) {
        return bibleStudyChapterCounts?.[bookCode] || null;
    }

    function getBibleBookDisplayName(bookCode, versionCode) {
        const normalizedVersion = String(versionCode || '').toUpperCase();
        const book = bibleStudyBookLookup[bookCode];

        if (['BYSB', 'BIR'].includes(normalizedVersion)) {
            return bibleStudyBookNamesRw?.[bookCode] || book?.nameRw || book?.name || bookCode;
        }

        return book?.name || bibleStudyBookNamesRw?.[bookCode] || bookCode;
    }

    function syncBibleChapterInput() {
        const book = document.getElementById('bibleBookSelect');
        const chapter = document.getElementById('bibleChapterInput');
        const chapterMeta = document.getElementById('bibleChapterMeta');
        if (!book || !chapter) return;

        const useKinyarwanda = bibleBooksShouldUseKinyarwanda();
        const max = getBibleChapterMax(book.value);
        if (max) {
            chapter.max = String(max);
            chapterMeta.textContent = useKinyarwanda
                ? (max === 1 ? 'Iki gitabo gifite igice 1.' : `Iki gitabo gifite ibice ${max}.`)
                : (max === 1 ? 'This book has 1 chapter.' : `This book has ${max} chapters.`);
            if (!chapter.value || parseInt(chapter.value, 10) > max) {
                chapter.value = String(max);
            }
        } else {
            chapter.removeAttribute('max');
            if (chapterMeta) {
                chapterMeta.textContent = '';
            }
        }
    }

    function setBibleReaderState(state) {
        const loading = document.getElementById('bibleReaderLoading');
        const empty = document.getElementById('bibleReaderEmpty');
        const result = document.getElementById('bibleReaderResult');
        const notice = document.getElementById('bibleReaderNotice');

        loading?.classList.toggle('hidden', state !== 'loading');
        empty?.classList.toggle('hidden', state !== 'empty');
        result?.classList.toggle('hidden', state !== 'ready');
        notice?.classList.toggle('hidden', true);
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function applyBibleContent(container, html) {
        if (!container) return;
        container.innerHTML = html;
        container.querySelectorAll('.chapter').forEach((chapter) => chapter.classList.add('space-y-3'));
        container.querySelectorAll('.heading').forEach((heading) => {
            heading.classList.add('block', 'mb-4', 'mt-1', 'text-base', 'font-bold', 'text-slate-700');
        });
        container.querySelectorAll('.verse').forEach((verse) => {
            verse.classList.add('mb-3', 'block');
        });
        container.querySelectorAll('.verse .label').forEach((label) => {
            label.classList.add('mr-2', 'font-bold', 'text-slate-900');
        });
        container.querySelectorAll('.verse .content').forEach((content) => {
            content.classList.add('text-[20px]', 'leading-8', 'text-slate-700');
        });
        container.querySelectorAll('.p, .q').forEach((el) => {
            el.classList.add('block', 'mb-2');
        });
    }

    function filterBibleContent() {
        const query = (document.getElementById('bibleSearchInput')?.value || '').trim().toLowerCase();
        document.querySelectorAll('.bible-reader-content .verse').forEach((verse) => {
            if (!query || query.length < 2) {
                verse.classList.remove('hidden');
                return;
            }

            const text = verse.textContent.toLowerCase();
            verse.classList.toggle('hidden', !text.includes(query));
        });
    }

    async function loadBibleStudyChapter() {
        const primaryVersion = getSelectedBibleVersion('biblePrimaryVersion');
        const compareVersion = getSelectedBibleVersionOrNull('bibleCompareVersion');
        const book = document.getElementById('bibleBookSelect')?.value || 'EXO';
        const chapter = parseInt(document.getElementById('bibleChapterInput')?.value || '1', 10);
        const notice = document.getElementById('bibleReaderNotice');
        const copy = getBibleReaderCopy(bibleBooksShouldUseKinyarwanda());

        if (!primaryVersion || !book || !Number.isFinite(chapter) || chapter < 1) {
            setBibleReaderState('empty');
            if (notice) {
                notice.textContent = copy.invalidSelection;
                notice.classList.remove('hidden');
            }
            return;
        }

        setBibleReaderState('loading');

        try {
            const params = new URLSearchParams({
                version: primaryVersionKey(primaryVersion),
                book,
                chapter: String(chapter),
            });

            if (compareVersion) {
                params.set('compare', primaryVersionKey(compareVersion));
            }

            const response = await fetch(`${bibleStudyEndpoint}?${params.toString()}`, {
                headers: { 'Accept': 'application/json' },
                credentials: 'same-origin',
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to load chapter.');
            }

            renderBibleStudy(data);
        } catch (error) {
            setBibleReaderState('empty');
            if (notice) {
                notice.textContent = error?.message || copy.loadError;
                notice.classList.remove('hidden');
            }
        }
    }

    function primaryVersionKey(version) {
        if (!version) {
            return '';
        }
        return Object.entries(bibleStudyVersions).find(([, value]) => value.code === version.code)?.[0] || 'bysb';
    }

    function renderBibleStudy(data) {
        const primary = data.primary;
        const compare = data.compare;
        const title = document.getElementById('bibleReaderTitle');
        const subtitle = document.getElementById('bibleReaderSubtitle');
        const meta = document.getElementById('bibleReaderMeta');
        const primaryHeading = document.getElementById('biblePrimaryHeading');
        const compareHeading = document.getElementById('bibleCompareHeading');
        const primaryContent = document.getElementById('biblePrimaryContent');
        const compareContent = document.getElementById('bibleCompareContent');
        const compareSection = document.getElementById('bibleCompareSection');
        const primarySection = document.getElementById('biblePrimarySection');
        const columns = document.getElementById('bibleReaderColumns');

        const bookName = getBibleBookDisplayName(data.book, primary?.version?.code);
        const chapterText = `${bookName} ${data.chapter}`;
        title.textContent = chapterText;
        subtitle.textContent = `${chapterText} · ${primary.version.label}${compare ? ` vs ${compare.version.label}` : ''}`;
        meta.textContent = `${getBibleChapterLabel(['BYSB', 'BIR'].includes((primary?.version?.code || '').toUpperCase()))} ${data.chapter}`;
        subtitle.textContent = `${chapterText} - ${primary.version.label}${compare ? ` vs ${compare.version.label}` : ''}`;

        primaryHeading.textContent = `${primary.version.code} - ${primary.version.label}`;
        compareHeading.textContent = compare ? `${compare.version.code} - ${compare.version.label}` : `${primary.version.code} - ${primary.version.label}`;
        applyBibleContent(primaryContent, primary.contentHtml);
        if (compare) {
            applyBibleContent(compareContent, compare.contentHtml);
            compareSection.classList.remove('hidden');
            primarySection?.classList.remove('xl:col-span-2');
            columns?.classList.remove('xl:grid-cols-1');
            columns?.classList.add('xl:grid-cols-2');
        } else {
            compareContent.innerHTML = '';
            compareSection.classList.add('hidden');
            primarySection?.classList.add('xl:col-span-2');
            columns?.classList.remove('xl:grid-cols-2');
            columns?.classList.add('xl:grid-cols-1');
        }

        const primaryInfo = primary.version.label;
        const compareInfo = compare ? compare.version.label : primary.version.label;
        document.getElementById('bibleReaderTitle').textContent = chapterText;
        document.getElementById('bibleReaderSubtitle').textContent = `${chapterText} · ${primaryInfo}${compare ? ` vs ${compareInfo}` : ''}`;
        setBibleReaderState('ready');
        document.getElementById('bibleReaderSubtitle').textContent = `${chapterText} - ${primaryInfo}${compare ? ` vs ${compareInfo}` : ''}`;
        filterBibleContent();
    }

    window.loadBibleStudyChapter = loadBibleStudyChapter;
    window.filterBibleContent = filterBibleContent;

    window.setBibleReaderDefaults = function() {
        const primary = document.getElementById('biblePrimaryVersion');
        const compare = document.getElementById('bibleCompareVersion');
        const book = document.getElementById('bibleBookSelect');
        const chapter = document.getElementById('bibleChapterInput');

        if (primary && !primary.value) primary.value = 'bysb';
        if (compare && !compare.value) compare.value = '';
        if (book && !book.value) book.value = 'EXO';
        if (chapter && !chapter.value) chapter.value = '27';
    }

    // On page load, restore the last active tab
    document.addEventListener('DOMContentLoaded', function() {
        const mobileButton = document.getElementById('intercessionMobileTabButton');
        const mobileMenu = document.getElementById('intercessionMobileTabMenu');
        mobileButton?.addEventListener('click', function() {
            mobileMenu?.classList.toggle('hidden');
            mobileMenu?.classList.toggle('grid');
            this.setAttribute('aria-expanded', String(!mobileMenu?.classList.contains('hidden')));
        });

        const requestedTab = new URLSearchParams(window.location.search).get('tab');
        const savedTab = localStorage.getItem('activeIntercessionTab');
        const validTabs = [];
        
        @if($hasForms) validTabs.push('forms'); @endif
        @if($hasActions) validTabs.push('actions'); @endif
        @if($hasBibleReader) validTabs.push('bible-reader'); @endif

        if (requestedTab && validTabs.includes(requestedTab)) {
            showTab(requestedTab);
        } else if (savedTab && validTabs.includes(savedTab)) {
            showTab(savedTab);
        } else if (validTabs.length > 0) {
            // Default to first available tab
            showTab(validTabs[0]);
        }

        const bibleReadButton = document.getElementById('bibleReadButton');
        bibleReadButton?.addEventListener('click', loadBibleStudyChapter);
        document.getElementById('bibleSearchInput')?.addEventListener('input', filterBibleContent);
        document.getElementById('biblePrimaryVersion')?.addEventListener('change', function() {
            const compare = document.getElementById('bibleCompareVersion');
            if (compare && this.value && compare.value === this.value) {
                compare.value = this.value === 'bysb' ? 'bir' : 'bysb';
            }
            refreshBibleBookLabels();
            refreshBibleReaderLabels();
            syncBibleChapterInput();
        });
        document.getElementById('bibleCompareVersion')?.addEventListener('change', function() {
            const primary = document.getElementById('biblePrimaryVersion');
            if (primary && this.value && primary.value === this.value) {
                this.value = this.value === 'bysb' ? 'bir' : 'bysb';
            }
        });
        document.getElementById('bibleBookSelect')?.addEventListener('change', syncBibleChapterInput);
        document.getElementById('bibleSearchInput')?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                loadBibleStudyChapter();
            }
        });

        refreshBibleBookLabels();
        refreshBibleReaderLabels();
        syncBibleChapterInput();

        if (document.getElementById('bible-reader-tab') && !document.getElementById('bibleReaderResult')?.classList.contains('hidden')) {
            loadBibleStudyChapter();
        }
    });
</script>

<style>
    .tab-btn {
        transition: all 0.3s ease;
    }
    .tab-btn:hover {
        opacity: 0.8;
    }
    .bible-reader-content {
        color: #1f2937;
        font-size: 20px;
        line-height: 1.9;
    }
    .bible-reader-content .version,
    .bible-reader-content .book,
    .bible-reader-content .chapter {
        display: block;
    }
    .bible-reader-content .label {
        font-weight: 700;
        color: #0f172a;
    }
    .bible-reader-content .heading {
        display: inline-block;
        margin-bottom: 1rem;
        font-size: 1.05rem;
        font-weight: 800;
        color: #0f172a;
    }
    .bible-reader-content .verse {
        display: block;
        margin-bottom: 0.8rem;
    }
    .bible-reader-content .verse .content {
        display: inline;
    }
    .bible-reader-content .verse.hidden {
        display: none !important;
    }
    .bible-reader-content .p,
    .bible-reader-content .q {
        display: block;
    }
    #bibleReaderColumns.xl\:grid-cols-1 {
        grid-template-columns: minmax(0, 1fr);
    }
    #biblePrimarySection.xl\:col-span-2 {
        grid-column: 1 / -1;
    }
    @media(max-width:639px) {
        .intercession-page .tab-content > .bg-white { padding:.75rem; }
        .intercession-page .modal > div {
            top:0 !important;
            width:calc(100% - 1rem) !important;
            max-height:calc(100vh - 1rem);
            margin:.5rem auto !important;
            overflow-y:auto;
        }
    }
</style>
@endsection
