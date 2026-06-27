<div id="discipline-dialog" class="fixed inset-0 z-[9999] hidden items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
    <div class="w-full max-w-md overflow-hidden rounded-[1.75rem] bg-white shadow-[0_35px_100px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/80">
        <div class="border-b border-slate-100 px-8 pb-5 pt-8 text-center">
            <div id="discipline-dialog-icon-wrap" class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                <i id="discipline-dialog-icon" class="fas fa-circle-info text-2xl"></i>
            </div>
            <h3 id="discipline-dialog-title" class="text-2xl font-semibold tracking-tight text-slate-900">Notice</h3>
        </div>

        <div class="px-8 py-6">
            <p id="discipline-dialog-message" class="text-center text-sm leading-6 text-slate-600"></p>

            <div id="discipline-dialog-prompt-wrap" class="mt-5 hidden">
                <label id="discipline-dialog-prompt-label" class="mb-2 block text-sm font-medium text-slate-700"></label>
                <textarea
                    id="discipline-dialog-input"
                    rows="4"
                    class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                ></textarea>
            </div>
        </div>

        <div class="border-t border-slate-100 px-8 py-6">
            <div class="flex items-center justify-center gap-3">
                <button
                    type="button"
                    id="discipline-dialog-cancel"
                    class="hidden rounded-2xl bg-slate-100 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    id="discipline-dialog-confirm"
                    class="rounded-2xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-600/25 transition hover:bg-sky-700"
                >
                    OK
                </button>
            </div>
        </div>
    </div>
</div>

<script>
(function () {
    const dialog = document.getElementById('discipline-dialog');
    if (!dialog || window.disciplineDialog) {
        return;
    }

    const titleEl = document.getElementById('discipline-dialog-title');
    const messageEl = document.getElementById('discipline-dialog-message');
    const iconWrap = document.getElementById('discipline-dialog-icon-wrap');
    const iconEl = document.getElementById('discipline-dialog-icon');
    const promptWrap = document.getElementById('discipline-dialog-prompt-wrap');
    const promptLabel = document.getElementById('discipline-dialog-prompt-label');
    const promptInput = document.getElementById('discipline-dialog-input');
    const cancelBtn = document.getElementById('discipline-dialog-cancel');
    const confirmBtn = document.getElementById('discipline-dialog-confirm');

    let currentResolver = null;
    let currentMode = 'alert';

    const themes = {
        alert: {
            iconWrap: 'bg-sky-50 text-sky-600',
            icon: 'fas fa-circle-info',
            confirm: 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/25',
            cancel: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
        },
        confirm: {
            iconWrap: 'bg-slate-100 text-slate-700',
            icon: 'fas fa-circle-question',
            confirm: 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/25',
            cancel: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
        },
        danger: {
            iconWrap: 'bg-rose-50 text-rose-600',
            icon: 'fas fa-triangle-exclamation',
            confirm: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25',
            cancel: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
        },
        prompt: {
            iconWrap: 'bg-emerald-50 text-emerald-600',
            icon: 'fas fa-pen-to-square',
            confirm: 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/25',
            cancel: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
        },
    };

    function applyTheme(mode) {
        const theme = themes[mode] || themes.alert;
        iconWrap.className = `mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${theme.iconWrap}`;
        iconEl.className = `${theme.icon} text-2xl`;
        confirmBtn.className = `rounded-2xl px-6 py-3 text-sm font-semibold text-white shadow-lg transition ${theme.confirm}`;
        cancelBtn.className = `rounded-2xl px-5 py-3 text-sm font-medium transition ${theme.cancel}`;
    }

    function openDialog(config) {
        return new Promise((resolve) => {
            currentResolver = resolve;
            currentMode = config.mode || 'alert';

            titleEl.textContent = config.title || 'Notice';
            messageEl.textContent = config.message || '';
            applyTheme(currentMode);

            const showPrompt = currentMode === 'prompt';
            promptWrap.classList.toggle('hidden', !showPrompt);
            cancelBtn.classList.toggle('hidden', currentMode === 'alert');
            confirmBtn.textContent = config.confirmText || (showPrompt ? 'Submit' : 'OK');
            cancelBtn.textContent = config.cancelText || 'Cancel';

            if (showPrompt) {
                promptLabel.textContent = config.promptLabel || 'Response';
                promptInput.value = config.defaultValue || '';
                promptInput.placeholder = config.placeholder || '';
            }

            dialog.classList.remove('hidden');
            dialog.classList.add('flex');

            window.requestAnimationFrame(() => {
                if (showPrompt) {
                    promptInput.focus();
                    promptInput.select();
                } else {
                    confirmBtn.focus();
                }
            });
        });
    }

    function closeDialog(result) {
        dialog.classList.add('hidden');
        dialog.classList.remove('flex');

        const resolve = currentResolver;
        currentResolver = null;
        currentMode = 'alert';

        if (typeof resolve === 'function') {
            resolve(result);
        }
    }

    cancelBtn.addEventListener('click', function () {
        closeDialog(currentMode === 'prompt' ? null : false);
    });

    confirmBtn.addEventListener('click', function () {
        if (currentMode === 'prompt') {
            closeDialog(promptInput.value);
            return;
        }

        closeDialog(true);
    });

    dialog.addEventListener('click', function (event) {
        if (event.target === dialog) {
            closeDialog(currentMode === 'prompt' ? null : false);
        }
    });

    document.addEventListener('keydown', function (event) {
        if (dialog.classList.contains('hidden')) {
            return;
        }

        if (event.key === 'Escape') {
            closeDialog(currentMode === 'prompt' ? null : false);
        }
    });

    window.disciplineDialog = {
        alert(message, title = 'Notice') {
            return openDialog({
                mode: 'alert',
                title,
                message,
                confirmText: 'OK',
            });
        },
        confirm(message, title = 'Confirm', confirmText = 'OK', cancelText = 'Cancel', mode = 'confirm') {
            return openDialog({
                mode,
                title,
                message,
                confirmText,
                cancelText,
            });
        },
        prompt(message, title = 'Input', promptLabel = 'Response', placeholder = '', defaultValue = '') {
            return openDialog({
                mode: 'prompt',
                title,
                message,
                promptLabel,
                placeholder,
                defaultValue,
                confirmText: 'Submit',
                cancelText: 'Cancel',
            });
        },
    };

    window.disciplineAlert = function (message, title = 'Notice') {
        return window.disciplineDialog.alert(message, title);
    };

    window.disciplineConfirm = function (message, title = 'Confirm', confirmText = 'OK', cancelText = 'Cancel', mode = 'confirm') {
        return window.disciplineDialog.confirm(message, title, confirmText, cancelText, mode);
    };

    window.disciplinePrompt = function (message, title = 'Input', promptLabel = 'Response', placeholder = '', defaultValue = '') {
        return window.disciplineDialog.prompt(message, title, promptLabel, placeholder, defaultValue);
    };
})();
</script>
