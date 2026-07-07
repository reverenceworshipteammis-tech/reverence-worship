<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Reverence Worship — worship, music, evangelism, events, and community.">
    <title>{{ config('app.name', 'Reverence Worship') }}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root { --ink:#0f172a; --green:#1d4ed8; --gold:#60a5fa; --cream:#eff6ff; --muted:#64748b; }
        html { font-size:14px; zoom:0.83; }
        * { box-sizing:border-box; }
        html { scroll-behavior:smooth; }
        body { margin:0; color:var(--ink); font-family:"DM Sans",sans-serif; background:#fff; }
        img { display:block; max-width:100%; }
        a { color:inherit; text-decoration:none; }
        .wrap { width:min(1080px, calc(100% - 28px)); margin:auto; }
        .nav { position:fixed; inset:0 0 auto; z-index:50; background:rgba(37,99,235,.68); backdrop-filter:blur(14px); color:#fff; border-top:1px solid rgba(147,197,253,.35); border-bottom:1px solid rgba(255,255,255,.12); box-shadow:0 8px 30px rgba(15,23,42,.07); }
        .nav-inner { min-height:64px; display:flex; align-items:center; justify-content:space-between; gap:24px; }
        .brand { display:inline-flex; align-items:center; gap:13px; }
        .brand-logo { width:42px; height:42px; object-fit:contain; border-radius:12px; background:#0f172a; border:1px solid #1e293b; padding:5px; }
        .brand-copy { display:flex; flex-direction:column; line-height:1; }
        .brand-name { color:#fff; font-size:1.15rem; font-weight:800; letter-spacing:-.025em; }
        .brand-tagline { color:#dbeafe; font-size:.64rem; font-weight:700; letter-spacing:.24em; margin-top:6px; }
        .links { display:flex; align-items:center; gap:25px; font-size:.9rem; }
        .links a:hover { color:#dbeafe; }
        .login { border:1px solid rgba(255,255,255,.48); border-radius:999px; padding:9px 18px; }
        .login:hover { border-color:#fff; background:rgba(255,255,255,.1); }
        .menu { display:none; color:#fff; border:0; background:none; font-size:1.5rem; }
        .hero { min-height:calc(100vh + 120px); display:grid; place-items:center; position:relative; color:#fff; background:#111827; overflow:hidden; }
        .hero-bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:center 35%; background:#111827; opacity:0; transition:opacity 1.2s ease; }
        .hero-bg.active { opacity:.72; }
        .hero::after { content:""; position:absolute; inset:0; background:linear-gradient(90deg,rgba(3,7,18,.86),rgba(3,7,18,.18)); }
        .hero-content { position:relative; z-index:1; padding-top:56px; max-width:680px; margin-right:auto; }
        .eyebrow { color:#bfdbfe; letter-spacing:.18em; text-transform:uppercase; font-size:.78rem; font-weight:700; }
        h1,h2 { font-family:"Playfair Display",serif; margin:0; }
        h1 { font-size:clamp(2.35rem,4.8vw,4rem); line-height:1.04; margin:15px 0 18px; }
        .hero h1 { max-width:720px; font-family:"DM Sans",sans-serif; font-weight:700; letter-spacing:-.045em; }
        .hero p { max-width:610px; font-size:1rem; line-height:1.7; color:#e2e9e5; }
        .hero-verse { max-width:610px; margin-top:14px; padding-left:14px; border-left:3px solid #93c5fd; color:#dbeafe; font-size:.84rem; line-height:1.5; }
        .hero-verse span { display:block; }
        .hero-verse strong { display:block; color:#fff; margin-top:5px; font-size:.78rem; letter-spacing:.04em; }
        .actions { display:flex; gap:12px; margin-top:24px; flex-wrap:wrap; }
        .btn { display:inline-flex; align-items:center; justify-content:center; padding:11px 20px; border-radius:999px; font-weight:700; }
        .btn-gold { background:#fff; color:#1d4ed8; }
        .btn-light { border:1px solid rgba(255,255,255,.55); color:#fff; }
        section { padding:80px 0; scroll-margin-top:70px; }
        .section-head { max-width:680px; margin-bottom:32px; }
        .section-head.center { text-align:center; margin-inline:auto; }
        h2 { font-size:clamp(1.9rem,3.4vw,2.8rem); margin:10px 0 13px; }
        .lead { color:var(--muted); line-height:1.75; }
        #about { padding:70px 0; }
        #about h2 { font-size:clamp(1.75rem,2.8vw,2.4rem); }
        .about-grid { display:grid; grid-template-columns:.9fr 1.1fr; gap:48px; align-items:center; }
        .about-quote { min-height:280px; border:1px solid #dbeafe; border-left:6px solid #2563eb; border-radius:20px; background:linear-gradient(145deg,#fff,#f8fafc); padding:42px 38px 34px; display:flex; flex-direction:column; justify-content:flex-end; position:relative; overflow:hidden; box-shadow:0 18px 45px rgba(30,64,175,.08); }
        .about-quote::before { content:"“"; position:absolute; left:30px; top:2px; color:#dbeafe; font:700 8rem/1 "Playfair Display"; }
        .about-quote blockquote { margin:0; color:#172554; font:600 1.65rem/1.4 "Playfair Display"; position:relative; }
        .about-quote cite { margin-top:18px; color:#2563eb; font-style:normal; font-size:.8rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
        .about-grid .btn-gold { background:#2563eb; color:#fff; }
        .music { background:var(--cream); }
        .video-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:25px; }
        .video { background:#fff; border-radius:18px; overflow:hidden; box-shadow:0 12px 35px rgba(18,35,29,.08); }
        .ratio { aspect-ratio:16/9; }
        iframe { width:100%; height:100%; border:0; }
        .card-body { padding:18px 20px; font-weight:700; }
        .picture-carousel { position:relative; }
        .picture-viewport {
            overflow-x:auto;
            scroll-snap-type:x mandatory;
            scroll-behavior:smooth;
            scrollbar-width:none;
            -ms-overflow-style:none;
            border-radius:24px;
            padding-bottom:8px;
        }
        .picture-viewport::-webkit-scrollbar { display:none; }
        .picture-track { display:flex; gap:18px; }
        .picture-slide {
            flex:0 0 calc((100% - 36px) / 3);
            aspect-ratio:4 / 3;
            border-radius:22px;
            overflow:hidden;
            position:relative;
            background:#e6e9e7;
            scroll-snap-align:start;
            box-shadow:0 16px 40px rgba(15,23,42,.12);
        }
        .picture-slide img { width:100%; height:100%; object-fit:cover; transition:transform .45s ease; }
        .picture-slide:hover img { transform:scale(1.04); }
        .caption {
            position:absolute;
            inset:auto 0 0;
            padding:42px 18px 16px;
            color:#fff;
            background:linear-gradient(transparent,rgba(0,0,0,.8));
        }
        .caption strong { font-size:1.02rem; letter-spacing:.01em; }
        .events { background:#172554; color:#fff; }
        .events .lead { color:#bfdbfe; }
        .event-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
        .event { padding:28px; border:1px solid rgba(255,255,255,.13); border-radius:18px; background:rgba(255,255,255,.05); }
        .event time { color:#93c5fd; font-size:.82rem; font-weight:700; }
        .event h3 { font:600 1.4rem "Playfair Display"; margin:13px 0 10px; }
        .event p { color:#dbeafe; line-height:1.65; }
        .join { text-align:center; background:linear-gradient(135deg,#dbeafe,#f8fafc); }
        .join .section-head { margin-bottom:25px; }
        .join .btn { background:var(--green); color:#fff; }
        .empty { grid-column:1/-1; padding:40px; border:1px dashed #aeb8b3; border-radius:18px; text-align:center; color:var(--muted); }
        footer { padding:64px 0 28px; background:linear-gradient(135deg,#0f2f7a 0%,#1e3a8a 58%,#172554 100%); color:#bfdbfe; }
        footer section { padding:0; scroll-margin:0; }
        .footer-grid { display:grid; grid-template-columns:1.55fr .75fr 1fr; gap:70px; }
        .footer-title { color:#fff; font:700 1.65rem "DM Sans",sans-serif; margin:0 0 25px; }
        .footer-heading { color:#fff; font-size:1rem; font-weight:700; margin:0 0 22px; }
        .footer-scripture strong { display:block; color:#fff; margin-bottom:6px; }
        .footer-scripture { max-width:550px; line-height:1.65; }
        .social-links { display:flex; gap:18px; margin-top:22px; }
        .social-links a { color:#dbeafe; font-size:1.6rem; transition:.2s; }
        .social-links a:hover { color:#fff; transform:translateY(-2px); }
        .footer-links { display:grid; gap:13px; }
        .footer-links a { width:max-content; transition:.2s; }
        .footer-links a:hover { color:#60a5fa; padding-left:3px; }
        .contact-list { display:grid; gap:16px; }
        .contact-item { display:flex; align-items:flex-start; gap:12px; line-height:1.5; }
        .contact-item i { width:18px; color:#93c5fd; margin-top:3px; }
        .footer-bottom { border-top:1px solid rgba(219,234,254,.2); margin-top:38px; padding-top:18px; display:flex; justify-content:space-between; gap:20px; font-size:.8rem; }
        @media(max-width:800px) {
            .menu { display:block; }
            .links { display:none; position:absolute; top:64px; left:0; right:0; padding:25px; background:rgba(37,99,235,.96); border-bottom:1px solid rgba(255,255,255,.14); box-shadow:0 14px 30px rgba(15,23,42,.12); flex-direction:column; align-items:flex-start; }
            .links.open { display:flex; }
            .hero { min-height:calc(100vh + 80px); }
            .about-grid,.video-grid { grid-template-columns:1fr; }
            .picture-slide { flex-basis:100%; aspect-ratio:4 / 3; }
            .event-grid { grid-template-columns:1fr; }
            section { padding:66px 0; }
            .footer-grid { grid-template-columns:1fr; gap:38px; }
            .footer-bottom { flex-direction:column; }
        }
    </style>
</head>
<body>
    <header class="nav">
        <div class="wrap nav-inner">
            <a href="#home" class="brand">
                <img src="{{ asset('images/logo.png') }}" alt="Reverence Worship logo" class="brand-logo">
                <span class="brand-copy">
                    <span class="brand-name">REVERENCE</span>
                    <span class="brand-tagline">WORSHIP TEAM</span>
                </span>
            </a>
            <button class="menu" id="menuButton" aria-label="Open navigation" aria-expanded="false">☰</button>
            <nav class="links" id="navLinks" aria-label="Primary navigation">
                <a href="#home">Home</a><a href="#about">About us</a><a href="#music">Music</a>
                <a href="#pictures">Pictures</a><a href="#events">Events</a><a href="#join">Join us</a>
                @auth
                    <a class="login" href="{{ auth()->user()->isSuperAdmin() ? route('super-admin.dashboard') : route('user.dashboard') }}">Dashboard</a>
                @else
                    <a class="login" href="{{ route('login') }}">Login</a>
                @endauth
            </nav>
        </div>
    </header>

    <main>
        <section class="hero" id="home">
            @foreach($heroPictures as $heroPicture)
                <img class="hero-bg {{ $loop->first ? 'active' : '' }}" src="{{ asset($heroPicture->image_path) }}" alt="{{ $heroPicture->title }}">
            @endforeach
            <div class="wrap">
                <div class="hero-content">
                    <div class="eyebrow">Reverence Worship Team</div>
                    <h1>A sound of faith. A life of worship.</h1>
                    <p>{{ $heroPictures->first()->description ?? 'A community serving God through worship, music, fellowship, and the message of hope.' }}</p>
                    <div class="hero-verse">
                        <span>“Let us be thankful, and so worship God acceptably with reverence and awe.”</span>
                        <strong>Hebrews 12:28</strong>
                    </div>
                    <div class="actions">
                        <a class="btn btn-gold" href="#music">Explore our music</a>
                        <a class="btn btn-light" href="#join">Join the community</a>
                    </div>
                </div>
            </div>
        </section>

        <section id="about">
            <div class="wrap about-grid">
                <aside class="about-quote">
                    <blockquote>Let everything that has breath praise the Lord.</blockquote>
                    <cite>Psalm 150:6</cite>
                </aside>
                <div>
                    <div class="eyebrow">About us</div>
                    <h2>More than music, it is our ministry.</h2>
                    <p class="lead">Reverence Worship brings singers, musicians, worshippers, and evangelists together to serve with excellence and humility. Our public board shares the latest sound, stories, and moments from our ministry.</p>
                    <a class="btn btn-gold" href="#events">See what is happening</a>
                </div>
            </div>
        </section>

        <section class="music" id="music">
            <div class="wrap">
                <div class="section-head center"><div class="eyebrow">Listen & worship</div><h2>Our music</h2><p class="lead">Published from the Music & Evangelism Public Board.</p></div>
                <div class="video-grid">
                    @forelse($videos as $video)
                        <article class="video"><div class="ratio"><iframe src="https://www.youtube-nocookie.com/embed/{{ urlencode($video->youtube_id) }}" title="{{ $video->title }}" loading="lazy" allowfullscreen></iframe></div><div class="card-body">{{ $video->title }}</div></article>
                    @empty
                        <div class="empty">New worship music will appear here when it is published on the Public Board.</div>
                    @endforelse
                </div>
            </div>
        </section>

        <section id="pictures">
            <div class="wrap">
                <div class="section-head"><div class="eyebrow">Our story in frames</div><h2>Pictures</h2><p class="lead">Moments selected and published by the Music & Evangelism team.</p></div>
                @if($pictures->isNotEmpty())
                    <div class="picture-carousel" data-picture-carousel>
                        <div class="picture-viewport" data-picture-viewport tabindex="0" aria-label="Featured pictures carousel">
                            <div class="picture-track">
                                @foreach($pictures as $picture)
                                    <figure class="picture-slide">
                                        <img src="{{ asset($picture->image_path) }}" alt="{{ $picture->title }}" loading="lazy">
                                        <figcaption class="caption">
                                            <strong>{{ $picture->title }}</strong>
                                            @if($picture->description)
                                                <br><small>{{ $picture->description }}</small>
                                            @endif
                                        </figcaption>
                                    </figure>
                                @endforeach
                            </div>
                        </div>
                    </div>
                @else
                    <div class="empty">Published pictures from the Public Board will appear here.</div>
                @endif
            </div>
        </section>

        <section class="events" id="events">
            <div class="wrap">
                <div class="section-head"><div class="eyebrow">Stay connected</div><h2>Events & updates</h2><p class="lead">The latest notices published by Music & Evangelism.</p></div>
                <div class="event-grid">
                    @forelse($events as $event)
                        <article class="event">
                            <time datetime="{{ ($event->event_date ?? $event->created_at)->toDateString() }}">
                                {{ ($event->type ?? 'update') === 'event' ? 'Event' : 'Update' }} · {{ ($event->event_date ?? $event->created_at)->format('d M Y') }}
                                @if($event->event_date) · {{ $event->event_date->format('H:i') }}@endif
                            </time>
                            <h3>{{ $event->title }}</h3>
                            <p>{{ \Illuminate\Support\Str::limit($event->content, 180) }}</p>
                        </article>
                    @empty
                        <div class="empty">Upcoming events and ministry updates will appear here.</div>
                    @endforelse
                </div>
            </div>
        </section>

        <section class="join" id="join">
            <div class="wrap">
                <div class="section-head center"><div class="eyebrow">You belong here</div><h2>Join us in worship</h2><p class="lead">Create your account to become part of the Reverence Worship community and stay connected with the ministry.</p></div>
                <a class="btn" href="{{ route('register') }}">Join Reverence Worship</a>
            </div>
        </section>
    </main>

    <footer>
        <div class="wrap">
            <div class="footer-grid">
                <section>
                    <h2 class="footer-title">Reverence Worship Team</h2>
                    <div class="footer-scripture">
                        <strong>Psalm 96:7–9</strong>
                        Give praise to the Lord, you who belong to all peoples; give glory to him and take up his praise.
                        Come and tell of his glory, you who have been called to a holy people. Give thanks to the Lord and enter his gates with praise.
                    </div>
                    <div class="social-links" aria-label="Social media">
                        <a href="https://www.instagram.com/reverenceworshipteam" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
                        <a href="https://youtube.com/@reverenceworshipteam1234?si=2yOG2-JTGfu06eaM" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><i class="fab fa-youtube"></i></a>
                        <a href="https://open.spotify.com/artist/2CqE0wMXxmVrzaOvUsWvbM" target="_blank" rel="noopener noreferrer" aria-label="Spotify"><i class="fab fa-spotify"></i></a>
                        <a href="https://music.apple.com/ca/artist/reverence-worship-team/1788741166" target="_blank" rel="noopener noreferrer" aria-label="Apple Music"><i class="fab fa-apple"></i></a>
                    </div>
                </section>

                <section>
                    <h3 class="footer-heading">Quick Links</h3>
                    <nav class="footer-links" aria-label="Footer navigation">
                        <a href="#home">Home</a>
                        <a href="#about">About Us</a>
                        <a href="#join">Join Us</a>
                        <a href="#music">Music</a>
                        <a href="#pictures">Pictures</a>
                        <a href="#events">Events</a>
                    </nav>
                </section>

                <section>
                    <h3 class="footer-heading">Contact</h3>
                    <div class="contact-list">
                        <a class="contact-item" href="mailto:worshipteamkicukiro@gmail.com">
                            <i class="fas fa-envelope"></i>
                            <span>worshipteamkicukiro@gmail.com</span>
                        </a>
                        <div class="contact-item">
                            <i class="fas fa-location-dot"></i>
                            <span>23JX +43M, Kicukiro, Kigali, Rwanda</span>
                        </div>
                        <a class="contact-item" href="tel:+250788880574">
                            <i class="fas fa-phone"></i>
                            <span>+250788880574 / 0784462768 / 0781520618</span>
                        </a>
                    </div>
                </section>
            </div>
            <div class="footer-bottom">
                <span>© {{ date('Y') }} Reverence Worship Team. All rights reserved.</span>
                <span>Built for worship, service, and community.</span>
            </div>
        </div>
    </footer>
    <script>
        const menuButton = document.getElementById('menuButton');
        const navLinks = document.getElementById('navLinks');
        menuButton.addEventListener('click', () => {
            const open = navLinks.classList.toggle('open');
            menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
            navLinks.classList.remove('open');
            menuButton.setAttribute('aria-expanded', 'false');
        }));
        const heroImages = Array.from(document.querySelectorAll('.hero-bg'));
        if (heroImages.length > 1) {
            let heroIndex = 0;
            window.setInterval(() => {
                heroImages[heroIndex].classList.remove('active');
                heroIndex = (heroIndex + 1) % heroImages.length;
                heroImages[heroIndex].classList.add('active');
            }, 10000);
        }
        const pictureViewport = document.querySelector('[data-picture-viewport]');
        if (pictureViewport) {
            const slides = Array.from(pictureViewport.querySelectorAll('.picture-slide'));
            let slideTimer = null;

            const getStep = () => {
                const slide = slides[0];
                if (!slide) return 0;
                const gap = parseFloat(getComputedStyle(pictureViewport.querySelector('.picture-track')).gap || '0') || 0;
                return slide.getBoundingClientRect().width + gap;
            };

            const maxScrollLeft = () => Math.max(0, pictureViewport.scrollWidth - pictureViewport.clientWidth - 1);

            const scrollNext = () => {
                const step = getStep();
                if (!step) return;
                const reachedEnd = pictureViewport.scrollLeft >= maxScrollLeft() - step * 0.3;
                pictureViewport.scrollTo({
                    left: reachedEnd ? 0 : pictureViewport.scrollLeft + step,
                    behavior: 'smooth',
                });
            };

            const startAutoSlide = () => {
                if (slideTimer || slides.length < 2) return;
                slideTimer = window.setInterval(scrollNext, 5000);
            };

            const stopAutoSlide = () => {
                if (!slideTimer) return;
                window.clearInterval(slideTimer);
                slideTimer = null;
            };
            pictureViewport.addEventListener('mouseenter', stopAutoSlide);
            pictureViewport.addEventListener('mouseleave', startAutoSlide);
            pictureViewport.addEventListener('focusin', stopAutoSlide);
            pictureViewport.addEventListener('focusout', startAutoSlide);
            startAutoSlide();
        }
    </script>
</body>
</html>
