<div id="app-dialog" class="fixed inset-0 z-[9999] hidden items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
    <div class="w-full max-w-md overflow-hidden rounded-[1.75rem] bg-white shadow-[0_35px_100px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/80">
        <div class="border-b border-slate-100 px-8 pb-5 pt-8 text-center">
            <div id="app-dialog-icon-wrap" class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                <i id="app-dialog-icon" class="fas fa-circle-info text-2xl"></i>
            </div>
            <h3 id="app-dialog-title" class="text-2xl font-semibold tracking-tight text-slate-900">Notice</h3>
        </div>

        <div class="px-8 py-6">
            <p id="app-dialog-message" class="text-center text-sm leading-6 text-slate-600"></p>

            <div id="app-dialog-prompt-wrap" class="mt-5 hidden">
                <label id="app-dialog-prompt-label" class="mb-2 block text-sm font-medium text-slate-700"></label>
                <textarea
                    id="app-dialog-input"
                    rows="4"
                    class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                ></textarea>
            </div>
        </div>

        <div class="border-t border-slate-100 px-8 py-6">
            <div class="flex items-center justify-center gap-3">
                <button
                    type="button"
                    id="app-dialog-cancel"
                    class="hidden rounded-2xl bg-slate-100 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    id="app-dialog-confirm"
                    class="rounded-2xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-600/25 transition hover:bg-sky-700"
                >
                    OK
                </button>
            </div>
        </div>
    </div>
</div>

<div id="app-toast-container" class="pointer-events-none fixed right-4 top-4 z-[9998] flex w-full max-w-sm flex-col gap-3 px-4 sm:px-0"></div>

<script>
(function () {
    if (window.appDialogService) {
        return;
    }

    const dialog = document.getElementById('app-dialog');
    const titleEl = document.getElementById('app-dialog-title');
    const messageEl = document.getElementById('app-dialog-message');
    const iconWrap = document.getElementById('app-dialog-icon-wrap');
    const iconEl = document.getElementById('app-dialog-icon');
    const promptWrap = document.getElementById('app-dialog-prompt-wrap');
    const promptLabel = document.getElementById('app-dialog-prompt-label');
    const promptInput = document.getElementById('app-dialog-input');
    const cancelBtn = document.getElementById('app-dialog-cancel');
    const confirmBtn = document.getElementById('app-dialog-confirm');
    const toastContainer = document.getElementById('app-toast-container');

    if (!dialog || !titleEl || !messageEl || !iconWrap || !iconEl || !promptWrap || !promptLabel || !promptInput || !cancelBtn || !confirmBtn || !toastContainer) {
        return;
    }

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
            iconWrap: 'bg-amber-50 text-amber-600',
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

    const notificationThemes = {
        success: {
            shell: 'border-emerald-200 bg-white text-slate-800',
            accent: 'bg-emerald-500',
            icon: 'fa-circle-check text-emerald-600',
        },
        error: {
            shell: 'border-rose-200 bg-white text-slate-800',
            accent: 'bg-rose-500',
            icon: 'fa-circle-xmark text-rose-600',
        },
        warning: {
            shell: 'border-amber-200 bg-white text-slate-800',
            accent: 'bg-amber-500',
            icon: 'fa-triangle-exclamation text-amber-600',
        },
        info: {
            shell: 'border-sky-200 bg-white text-slate-800',
            accent: 'bg-sky-500',
            icon: 'fa-circle-info text-sky-600',
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
                    return;
                }

                confirmBtn.focus();
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

    function normalizeNotificationArgs(first, second) {
        const knownTypes = ['success', 'error', 'warning', 'info'];
        if (knownTypes.includes(String(first)) && !knownTypes.includes(String(second))) {
            return { message: second || '', type: first };
        }

        return { message: first || '', type: second || 'info' };
    }

    function toastClass(type) {
        const theme = notificationThemes[type] || notificationThemes.info;
        return theme;
    }

    function renderToast(message, type = 'info') {
        const theme = toastClass(type);
        const toast = document.createElement('div');
        toast.className = `pointer-events-auto flex overflow-hidden rounded-2xl border shadow-[0_12px_40px_rgba(15,23,42,0.12)] ${theme.shell}`;
        toast.innerHTML = `
            <div class="w-1.5 ${theme.accent}"></div>
            <div class="flex min-w-0 flex-1 items-start gap-3 px-4 py-3">
                <div class="mt-0.5 shrink-0">
                    <i class="fas ${theme.icon} text-base"></i>
                </div>
                <div class="min-w-0 flex-1">
                    <p class="text-sm leading-5">${message}</p>
                </div>
                <button type="button" class="ml-2 shrink-0 text-slate-400 transition hover:text-slate-600" aria-label="Dismiss notification">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        const dismiss = () => {
            toast.classList.add('opacity-0', 'translate-y-1');
            toast.style.transition = 'opacity 180ms ease, transform 180ms ease';
            window.setTimeout(() => toast.remove(), 180);
        };

        const closeButton = toast.querySelector('button');
        closeButton?.addEventListener('click', dismiss);

        toastContainer.appendChild(toast);
        window.setTimeout(dismiss, 3200);
        return toast;
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

    window.appAlert = function (message, title = 'Notice') {
        return openDialog({
            mode: 'alert',
            title,
            message,
            confirmText: 'OK',
        });
    };

    window.appConfirm = function (message, title = 'Confirm', confirmText = 'OK', cancelText = 'Cancel', mode = 'confirm') {
        return openDialog({
            mode,
            title,
            message,
            confirmText,
            cancelText,
        });
    };

    window.appPrompt = function (message, title = 'Input', promptLabel = 'Response', placeholder = '', defaultValue = '') {
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
    };

    window.appNotify = function (first, second = 'info') {
        const { message, type } = normalizeNotificationArgs(first, second);
        return renderToast(String(message), type);
    };

    window.showNotification = window.showNotification || function (first, second = 'info') {
        return window.appNotify(first, second);
    };

    window.disciplineAlert = window.disciplineAlert || function (message, title = 'Notice') {
        return window.appAlert(message, title);
    };

    window.disciplineConfirm = window.disciplineConfirm || function (message, title = 'Confirm', confirmText = 'OK', cancelText = 'Cancel', mode = 'confirm') {
        return window.appConfirm(message, title, confirmText, cancelText, mode);
    };

    window.disciplinePrompt = window.disciplinePrompt || function (message, title = 'Input', promptLabel = 'Response', placeholder = '', defaultValue = '') {
        return window.appPrompt(message, title, promptLabel, placeholder, defaultValue);
    };

    function forceHideModal(modal) {
        if (!modal) {
            return;
        }

        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.style.setProperty('display', 'none', 'important');
        modal.style.removeProperty('visibility');
        modal.style.removeProperty('pointer-events');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    window.forceHideModal = window.forceHideModal || forceHideModal;
    window.closeModal = window.closeModal || function (modalId) {
        forceHideModal(document.getElementById(modalId) || document.querySelector(`[data-modal-id="${modalId}"]`));
    };

    document.addEventListener('click', function (event) {
        const closeButton = event.target.closest?.('[data-modal-close]');
        if (!closeButton) {
            return;
        }

        const modalId = closeButton.getAttribute('data-modal-close');
        const modal = modalId
            ? document.getElementById(modalId) || document.querySelector(`[data-modal-id="${modalId}"]`)
            : closeButton.closest('.modal');

        if (!modal) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        forceHideModal(modal);
    });

    window.confirmSubmit = function (event, message, title = 'Confirm', confirmText = 'OK', cancelText = 'Cancel', mode = 'confirm') {
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }

        const form = event && event.target && typeof event.target.closest === 'function'
            ? event.target.closest('form')
            : event && event.target && event.target.tagName === 'FORM'
                ? event.target
                : null;

        window.appConfirm(message, title, confirmText, cancelText, mode).then((confirmed) => {
            if (!confirmed || !form) {
                return;
            }

            if (typeof form.submit === 'function') {
                form.submit();
            }
        });

        return false;
    };

    window.appDialogService = true;
})();
</script>
