<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Reverence Worship - Login</title>
    <link rel="icon" type="image/png" href="{{ asset('images/logo.png') }}">
    <link rel="apple-touch-icon" href="{{ asset('images/logo.png') }}">

    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <style>
        * {
            box-sizing: border-box;
        }

        body {
            min-height: 100vh;
            margin: 0;
            font-family: 'DM Sans', system-ui, sans-serif;
            background:
                radial-gradient(circle at top left, rgba(37, 99, 235, 0.18), transparent 32rem),
                linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
            color: #0f172a;
        }

        .auth-shell {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }

        .auth-card {
            width: 100%;
            max-width: 1040px;
            min-height: 640px;
            display: grid;
            grid-template-columns: 0.86fr 1.14fr;
            overflow: hidden;
            background: #f8fafc;
            border: 1px solid rgba(37, 99, 235, 0.22);
            border-radius: 1.25rem;
            box-shadow: 0 24px 70px rgba(30, 64, 175, 0.16);
        }

        .brand-panel {
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 2rem;
            background: linear-gradient(145deg, #0f2f7a 0%, #1d4ed8 58%, #1e40af 100%);
            color: #ffffff;
        }

        .form-panel {
            position: relative;
            background:
                radial-gradient(circle at 100% 0, rgba(59, 130, 246, 0.14), transparent 18rem),
                linear-gradient(145deg, #ffffff 0%, #eff6ff 100%);
        }

        .form-panel::before {
            content: '';
            position: absolute;
            inset: 0 auto 0 0;
            width: 5px;
            background: linear-gradient(#60a5fa, #1d4ed8);
        }

        .form-panel > div { position: relative; z-index: 1; }

        .brand-mark {
            width: 3rem;
            height: 3rem;
            border-radius: 0.9rem;
            background: rgba(255, 255, 255, 0.14);
            border: 1px solid rgba(255, 255, 255, 0.22);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        .field {
            width: 100%;
            height: 2.65rem;
            border: 1px solid #d1d5db;
            border-radius: 0.65rem;
            background: rgba(255, 255, 255, 0.72);
            padding: 0 2.45rem;
            font-size: 0.875rem;
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .field:focus {
            outline: none;
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
        }

        .field-icon {
            position: absolute;
            top: 50%;
            left: 0.85rem;
            transform: translateY(-50%);
            color: #9ca3af;
            font-size: 0.85rem;
        }

        .password-toggle {
            position: absolute;
            top: 50%;
            right: 0.55rem;
            transform: translateY(-50%);
            width: 1.9rem;
            height: 1.9rem;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 0;
            border-radius: 0.5rem;
            background: transparent;
            color: #6b7280;
            cursor: pointer;
        }

        .password-toggle:hover {
            background: #f3f4f6;
            color: #2563eb;
        }

        h1, h2 { font-family: 'Playfair Display', serif; }
        .primary-action { background:#2563eb; }
        .primary-action:hover { background:#1d4ed8; }
        .auth-link { color:#2563eb; }
        .auth-link:hover { color:#1d4ed8; }
        .brand-subtitle { color:#bfdbfe; }
        .back-home { color:rgba(255,255,255,.72); transition:color .15s ease; }
        .back-home:hover { color:#ffffff; }

        .alert {
            border-radius: 0.75rem;
            animation: slideIn 0.2s ease-out;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-6px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @media (max-width: 768px) {
            .auth-shell {
                align-items: flex-start;
                padding: 0.75rem;
            }

            .auth-card {
                min-height: auto;
                grid-template-columns: 1fr;
                border-radius: 1rem;
            }

            .brand-panel {
                min-height: auto;
                padding: 1rem;
                display: block;
            }

            .brand-mark {
                width: 2.5rem;
                height: 2.5rem;
                border-radius: 0.75rem;
            }

            .mobile-hide {
                display: none;
            }

            .auth-card section {
                padding: 1rem;
            }
        }
    </style>
</head>
<body>
    <main class="auth-shell">
        <section class="auth-card">
            <aside class="brand-panel">
                <a href="{{ route('home') }}" class="flex items-center gap-3" aria-label="Back to Reverence Worship home">
                    <div class="brand-mark">
                        <img src="{{ asset('images/logo.png') }}" alt="Reverence Worship" class="w-full h-full object-contain p-1">
                    </div>
                    <div>
                        <p class="text-lg font-extrabold tracking-wide">REVERENCE</p>
                        <p class="text-xs brand-subtitle">Worship Team</p>
                    </div>
                </a>

                <div class="max-w-sm mobile-hide">
                    <h1 class="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Serve with a faithful heart</h1>
                    <p class="mt-3 text-sm leading-6 text-white/85">
                        "Whatever you do, work at it with all your heart, as working for the Lord."
                    </p>
                    <p class="mt-2 text-xs brand-subtitle">Colossians 3:23</p>
                </div>

                <div class="border-t border-white/20 pt-4 mobile-hide">
                    <p class="text-sm text-white/85">Psalm 95:6</p>
                    <p class="mt-1 text-xs leading-5 text-white/60">Come, let us bow down in worship, let us kneel before the Lord our Maker.</p>
                    <a href="{{ route('home') }}" class="back-home inline-flex items-center gap-2 mt-4 text-xs"><i class="fas fa-arrow-left"></i> Back to Home</a>
                </div>
            </aside>

            <section class="form-panel flex items-center justify-center p-5 sm:p-7 lg:p-8">
                <div class="w-full max-w-md">
                    <div class="mb-5 flex items-center justify-between gap-4">
                        <h2 class="text-2xl font-extrabold text-gray-900">Sign In</h2>
                        <a href="{{ route('home') }}" class="auth-link inline-flex items-center gap-2 rounded-full border border-blue-800/20 bg-white/60 px-3 py-2 text-xs font-semibold hover:bg-white transition">
                            <i class="fas fa-arrow-left"></i>
                            <span>Back to Home</span>
                        </a>
                    </div>

                    @if(session('success'))
                        <div class="alert bg-green-50 border border-green-200 text-green-700 px-4 py-3 mb-4 text-sm flex items-start gap-2">
                            <i class="fas fa-check-circle mt-0.5"></i>
                            <div class="flex-1">{{ session('success') }}</div>
                            <button onclick="this.parentElement.remove()" class="text-green-500 hover:text-green-700">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    @endif

                    @if(session('warning'))
                        <div class="alert bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 mb-4 text-sm flex items-start gap-2">
                            <i class="fas fa-clock mt-0.5"></i>
                            <div class="flex-1">{{ session('warning') }}</div>
                            <button onclick="this.parentElement.remove()" class="text-amber-500 hover:text-amber-700">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    @endif

                    @if(session('error'))
                        <div class="alert bg-red-50 border border-red-200 text-red-700 px-4 py-3 mb-4 text-sm flex items-start gap-2">
                            <i class="fas fa-exclamation-circle mt-0.5"></i>
                            <div class="flex-1">{{ session('error') }}</div>
                            <button onclick="this.parentElement.remove()" class="text-red-500 hover:text-red-700">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    @endif

                    @if($errors->any())
                        <div class="alert bg-red-50 border border-red-200 text-red-700 px-4 py-3 mb-4 text-sm">
                            <div class="flex gap-2">
                                <i class="fas fa-exclamation-circle mt-0.5"></i>
                                <div>
                                    @foreach($errors->all() as $error)
                                        <p class="mb-1 last:mb-0">{{ $error }}</p>
                                    @endforeach
                                </div>
                            </div>
                        </div>
                    @endif

                    <form method="POST" action="{{ route('login') }}" class="space-y-4">
                        @csrf

                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                            <div class="relative">
                                <i class="fas fa-envelope field-icon"></i>
                                <input type="email" name="email" required
                                    class="field @error('email') border-red-500 @enderror"
                                    placeholder="name@example.com"
                                    value="{{ old('email') }}">
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                            <div class="relative">
                                <i class="fas fa-lock field-icon"></i>
                                <input type="password" name="password" required
                                    id="passwordField"
                                    class="field @error('password') border-red-500 @enderror"
                                    placeholder="Enter password">
                                <button type="button" id="togglePassword" class="password-toggle" aria-label="Toggle password visibility">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>

                        <button type="submit" class="primary-action w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg text-white text-sm font-bold transition">
                            <i class="fas fa-right-to-bracket"></i>
                            Sign In
                        </button>
                    </form>

                    <div class="flex items-center gap-3 my-5">
                        <div class="h-px flex-1 bg-gray-200"></div>
                        <span class="text-xs font-medium text-gray-400">or</span>
                        <div class="h-px flex-1 bg-gray-200"></div>
                    </div>

                    <a href="{{ route('google.login') }}" class="w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                        <i class="fab fa-google text-red-500"></i>
                        Continue with Google
                    </a>

                    <p class="mt-5 text-center text-sm text-gray-500">
                        Need an account?
                        <a href="{{ route('register') }}" class="auth-link font-semibold">Create one</a>
                    </p>
                </div>
            </section>
        </section>
    </main>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const togglePassword = document.getElementById('togglePassword');
            const passwordField = document.getElementById('passwordField');

            if (togglePassword && passwordField) {
                togglePassword.addEventListener('click', function() {
                    const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
                    passwordField.setAttribute('type', type);

                    const icon = this.querySelector('i');
                    if (icon) {
                        icon.classList.toggle('fa-eye');
                        icon.classList.toggle('fa-eye-slash');
                    }
                });
            }
        });

        setTimeout(function() {
            document.querySelectorAll('.alert').forEach(function(alert) {
                alert.style.opacity = '0';
                alert.style.transition = 'opacity 0.25s ease';
                setTimeout(function() {
                    if (alert.parentElement) alert.remove();
                }, 250);
            });
        }, 5000);
    </script>
</body>
</html>
