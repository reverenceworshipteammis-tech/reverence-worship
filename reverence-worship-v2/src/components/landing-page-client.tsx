"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Mail, MapPin, Menu, Phone } from "lucide-react";

type LandingVideo = {
  id: number;
  title: string;
  youtubeId: string;
};

type LandingPicture = {
  id: number;
  title: string;
  imagePath: string;
  description: string | null;
  isHero: boolean;
};

type LandingEvent = {
  id: number;
  title: string;
  content: string;
  type: string;
  label: string;
  dateTime: string;
};

type LandingPageClientProps = {
  dashboardHref: string | null;
  registrationEnabled: boolean;
  videos: LandingVideo[];
  pictures: LandingPicture[];
  events: LandingEvent[];
};

function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length - 1)}...` : value;
}

function SocialIcon({ name }: { name: "instagram" | "youtube" | "spotify" | "apple" }) {
  if (name === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="17" cy="7" r="1.2" fill="currentColor" />
      </svg>
    );
  }

  if (name === "youtube") {
    return (
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
        <path d="M21 8.2a3 3 0 0 0-2.1-2.1C17 5.6 12 5.6 12 5.6s-5 0-6.9.5A3 3 0 0 0 3 8.2 31 31 0 0 0 2.5 12a31 31 0 0 0 .5 3.8 3 3 0 0 0 2.1 2.1c1.9.5 6.9.5 6.9.5s5 0 6.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-3.8 31 31 0 0 0-.5-3.8Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="m10 9 5.2 3-5.2 3V9Z" fill="currentColor" />
      </svg>
    );
  }

  if (name === "spotify") {
    return (
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M7.8 9.3c3-.9 6.5-.5 8.8.9M8.4 12.1c2.5-.7 5.2-.4 7.1.7M9 14.8c1.9-.5 3.9-.3 5.4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path d="M15.2 4.2c.8-.9 1.3-2.1 1.2-3.2-1.2.1-2.4.8-3.2 1.7-.7.8-1.3 2-1.2 3 1.2.1 2.4-.6 3.2-1.5Z" fill="currentColor" />
      <path d="M19.7 17.2c-.5 1.1-.8 1.6-1.5 2.6-1 1.5-2.4 3.3-4.1 3.3-1.6 0-2-.9-4.1-.9-2.2 0-2.6.9-4.1.9-1.8 0-3.1-1.7-4.1-3.1C-1 15.8.4 8.3 4 8.1c1.8 0 3 .9 4 .9s2.8-1.1 4.8-.9c.8 0 3 .3 4.4 2.4-3.9 2.1-3.3 7.1.5 8.7Z" fill="currentColor" transform="translate(2 0) scale(.86)" />
    </svg>
  );
}

export function LandingPageClient({ dashboardHref, registrationEnabled, videos, pictures, events }: LandingPageClientProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const heroPictures = pictures.length > 0 ? pictures : [{ id: 0, title: "Reverence Worship", imagePath: "/logo.png", description: null, isHero: true }];
  const heroDescription = heroPictures[heroIndex]?.description || "A community serving God through worship, music, fellowship, and the message of hope.";

  useEffect(() => {
    if (heroPictures.length <= 1) return;

    const interval = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % heroPictures.length);
    }, 10000);

    return () => window.clearInterval(interval);
  }, [heroPictures.length]);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="fixed inset-x-0 top-0 z-50 border-y border-white/15 bg-blue-600/75 text-white shadow-lg backdrop-blur">
        <div className="relative mx-auto flex min-h-[58px] w-[min(100%,calc(100%-18px))] items-center gap-2 overflow-visible md:min-h-16 md:w-[min(1080px,calc(100%-28px))] md:gap-5">
          <a href="#home" className="inline-flex shrink-0 items-center gap-2 md:gap-3">
            <Image src="/logo.png" alt="Reverence Worship logo" width={42} height={42} className="size-[34px] rounded-[10px] bg-slate-900 p-1 md:size-[42px] md:rounded-xl" priority />
            <span className="leading-none">
              <span className="block text-[13px] font-extrabold tracking-tight md:text-base">REVERENCE</span>
              <span className="mt-1 block text-[8px] font-bold uppercase tracking-[0.16em] text-blue-100 md:text-[10px] md:tracking-[0.24em]">Worship Team</span>
            </span>
          </a>

          <nav
            className={`${menuOpen ? "absolute right-0 top-[calc(100%+8px)] z-60 flex w-[min(230px,calc(100vw-18px))] flex-wrap justify-end rounded-2xl border border-white/20 bg-blue-600/95 p-2.5 shadow-xl backdrop-blur" : "ml-auto flex items-center justify-end"} gap-2 whitespace-nowrap text-xs md:static md:ml-auto md:flex md:w-auto md:flex-nowrap md:items-center md:gap-6 md:border-0 md:bg-transparent md:p-0 md:text-sm md:shadow-none`}
            aria-label="Primary navigation"
          >
            <a href="#home" onClick={() => setMenuOpen(false)} className={`${menuOpen ? "inline-flex" : "hidden"} rounded-full px-2 py-1.5 hover:bg-white/10 md:inline-flex md:px-3 md:py-2`}>Home</a>
            <a href="#about" onClick={() => setMenuOpen(false)} className={`${menuOpen ? "inline-flex" : "hidden"} rounded-full px-2 py-1.5 hover:bg-white/10 md:inline-flex md:px-3 md:py-2`}>About us</a>
            <a href="#music" onClick={() => setMenuOpen(false)} className={`${menuOpen ? "inline-flex" : "hidden"} rounded-full px-2 py-1.5 hover:bg-white/10 md:inline-flex md:px-3 md:py-2`}>Music</a>
            <a href="#pictures" onClick={() => setMenuOpen(false)} className={`${menuOpen ? "inline-flex" : "hidden"} rounded-full px-2 py-1.5 hover:bg-white/10 md:inline-flex md:px-3 md:py-2`}>Pictures</a>
            <a href="#events" onClick={() => setMenuOpen(false)} className={`${menuOpen ? "inline-flex" : "hidden"} rounded-full px-2 py-1.5 hover:bg-white/10 md:inline-flex md:px-3 md:py-2`}>Events</a>
            <a href="#join" onClick={() => setMenuOpen(false)} className="inline-flex rounded-full bg-white/10 px-2 py-1.5 hover:bg-white/15 md:bg-transparent md:px-3 md:py-2">Join us</a>
            <Link href={dashboardHref ?? "/login"} className="inline-flex rounded-full border border-white/50 bg-white/10 px-2.5 py-1.5 hover:bg-white/15 md:bg-transparent md:px-4 md:py-2">
              {dashboardHref ? "Dashboard" : "Login"}
            </Link>
          </nav>

          <button type="button" onClick={() => setMenuOpen((current) => !current)} className="inline-flex size-[34px] shrink-0 items-center justify-center rounded-[10px] border border-white/25 bg-white/10 md:hidden" aria-label="Open navigation" aria-expanded={menuOpen}>
            <Menu className="size-5" aria-hidden />
          </button>
        </div>
      </header>

      <section id="home" className="relative grid min-h-[calc(100vh+90px)] place-items-center overflow-hidden bg-slate-900 text-white">
        {heroPictures.map((picture, index) => (
          <Image
            key={picture.id}
            src={picture.imagePath}
            alt={picture.title}
            fill
            sizes="100vw"
            priority={index === 0}
            className={`object-cover object-center transition-opacity duration-1000 ${index === heroIndex ? "opacity-70" : "opacity-0"}`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 to-slate-950/20" />
        <div className="relative z-10 mx-auto w-[min(1080px,calc(100%-28px))] pt-16">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">Reverence Worship Team</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-bold leading-[1.04] tracking-tight sm:text-6xl">A sound of faith. A life of worship.</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200">{heroDescription}</p>
            <div className="mt-4 max-w-2xl border-l-4 border-blue-300 pl-4 text-sm leading-6 text-blue-100">
              <span>Let us be thankful, and so worship God acceptably with reverence and awe.</span>
              <strong className="mt-1 block text-xs uppercase tracking-wide text-white">Hebrews 12:28</strong>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#music" className="rounded-full bg-white px-5 py-3 text-sm font-bold text-blue-700">Explore our music</a>
              <a href="#join" className="rounded-full border border-white/60 px-5 py-3 text-sm font-bold text-white">Join the community</a>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="scroll-mt-20 py-20">
        <div className="mx-auto grid w-[min(1080px,calc(100%-28px))] items-center gap-12 md:grid-cols-[0.9fr_1.1fr]">
          <aside className="relative flex min-h-72 flex-col justify-end overflow-hidden rounded-3xl border border-blue-100 border-l-[6px] border-l-blue-600 bg-gradient-to-br from-white to-slate-50 p-9 shadow-xl shadow-blue-950/5">
            <span className="absolute left-7 top-0 font-serif text-9xl font-bold text-blue-100">&quot;</span>
            <blockquote className="relative font-serif text-3xl font-semibold leading-snug text-blue-950">Let everything that has breath praise the Lord.</blockquote>
            <cite className="mt-5 text-xs font-bold uppercase tracking-wide not-italic text-blue-600">Psalm 150:6</cite>
          </aside>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">About us</p>
            <h2 className="mt-3 font-serif text-4xl font-bold text-slate-950">More than music, it is our ministry.</h2>
            <p className="mt-4 leading-8 text-slate-500">Reverence Worship brings singers, musicians, worshippers, and evangelists together to serve with excellence and humility. Our public board shares the latest sound, stories, and moments from our ministry.</p>
            <a href="#events" className="mt-6 inline-flex rounded-full bg-blue-600 px-5 py-3 text-sm font-bold text-white">See what is happening</a>
          </div>
        </div>
      </section>

      <section id="music" className="scroll-mt-20 bg-blue-50 py-20">
        <div className="mx-auto w-[min(1080px,calc(100%-28px))]">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Listen & worship</p>
            <h2 className="mt-3 font-serif text-4xl font-bold">Our music</h2>
            <p className="mt-3 leading-7 text-slate-500">Published from the Music & Evangelism Public Board.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {videos.length > 0 ? videos.map((video) => (
              <article key={video.id} className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-blue-950/5">
                <div className="aspect-video">
                  <iframe src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`} title={video.title} loading="lazy" allowFullScreen className="h-full w-full border-0" />
                </div>
                <div className="p-5 font-bold">{video.title}</div>
              </article>
            )) : <div className="col-span-full rounded-3xl border border-dashed border-slate-300 p-10 text-center text-slate-500">New worship music will appear here when it is published on the Public Board.</div>}
          </div>
        </div>
      </section>

      <section id="pictures" className="scroll-mt-20 py-20">
        <div className="mx-auto w-[min(1080px,calc(100%-28px))]">
          <div className="mb-10 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Our story in frames</p>
            <h2 className="mt-3 font-serif text-4xl font-bold">Pictures</h2>
            <p className="mt-3 leading-7 text-slate-500">Moments selected and published by the Music & Evangelism team.</p>
          </div>
          {pictures.length > 0 ? (
            <div className="overflow-x-auto rounded-3xl pb-2">
              <div className="flex gap-5">
                {pictures.map((picture) => (
                  <figure key={picture.id} className="relative aspect-[4/3] w-[82vw] max-w-[345px] shrink-0 overflow-hidden rounded-3xl bg-slate-200 shadow-xl shadow-slate-950/10 md:w-[calc((100%-40px)/3)]">
                    <Image src={picture.imagePath} alt={picture.title} fill sizes="(min-width: 768px) 33vw, 82vw" className="object-cover transition duration-500 hover:scale-105" />
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5 pt-14 text-white">
                      <strong>{picture.title}</strong>
                      {picture.description ? <small className="mt-1 block text-white/85">{picture.description}</small> : null}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ) : <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center text-slate-500">Published pictures from the Public Board will appear here.</div>}
        </div>
      </section>

      <section id="events" className="scroll-mt-20 bg-blue-950 py-20 text-white">
        <div className="mx-auto w-[min(1080px,calc(100%-28px))]">
          <div className="mb-10 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">Stay connected</p>
            <h2 className="mt-3 font-serif text-4xl font-bold">Events & updates</h2>
            <p className="mt-3 leading-7 text-blue-100">The latest notices published by Music & Evangelism.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {events.length > 0 ? events.map((event) => (
              <article key={event.id} className="rounded-3xl border border-white/15 bg-white/5 p-7">
                <time dateTime={event.dateTime} className="text-xs font-bold uppercase text-blue-300">{event.type} - {event.label}</time>
                <h3 className="mt-3 font-serif text-2xl font-semibold">{event.title}</h3>
                <p className="mt-3 leading-7 text-blue-100">{truncate(event.content, 180)}</p>
              </article>
            )) : <div className="col-span-full rounded-3xl border border-dashed border-white/25 p-10 text-center text-blue-100">Upcoming events and ministry updates will appear here.</div>}
          </div>
        </div>
      </section>

      <section id="join" className="scroll-mt-20 bg-gradient-to-br from-blue-100 to-slate-50 py-20 text-center">
        <div className="mx-auto w-[min(760px,calc(100%-28px))]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">You belong here</p>
          <h2 className="mt-3 font-serif text-4xl font-bold">Join us in worship</h2>
          <p className="mt-3 leading-7 text-slate-500">Create your account to become part of the Reverence Worship community and stay connected with the ministry.</p>
          {registrationEnabled ? (
            <Link href="/register" className="mt-7 inline-flex rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white">Join Reverence Worship</Link>
          ) : (
            <Link href="/login" className="mt-7 inline-flex rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white">Login</Link>
          )}
        </div>
      </section>

      <footer className="bg-gradient-to-br from-[#0f2f7a] via-blue-900 to-blue-950 pt-16 pb-7 text-blue-100">
        <div className="mx-auto w-[min(1080px,calc(100%-28px))]">
          <div className="grid gap-10 md:grid-cols-[1.55fr_0.75fr_1fr] md:gap-[70px]">
            <section>
              <h2 className="mb-6 text-[1.65rem] font-bold text-white">Reverence Worship Team</h2>
              <p className="max-w-xl leading-7">
                <strong className="mb-1.5 block text-white">Psalm 96:7-9</strong>
                Give praise to the Lord, you who belong to all peoples; give glory to him and take up his praise.
                Come and tell of his glory, you who have been called to a holy people. Give thanks to the Lord and enter his gates with praise.
              </p>
              <div className="mt-6 flex gap-[18px]" aria-label="Social media">
                <a className="grid size-8 place-items-center rounded-full border border-blue-100/25 text-xs font-bold text-blue-100 transition hover:-translate-y-0.5 hover:border-white hover:text-white" href="https://www.instagram.com/reverenceworshipteam" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <SocialIcon name="instagram" />
                </a>
                <a className="grid size-8 place-items-center rounded-full border border-blue-100/25 text-xs font-bold text-blue-100 transition hover:-translate-y-0.5 hover:border-white hover:text-white" href="https://youtube.com/@reverenceworshipteam1234?si=2yOG2-JTGfu06eaM" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                  <SocialIcon name="youtube" />
                </a>
                <a className="grid size-8 place-items-center rounded-full border border-blue-100/25 text-xs font-bold text-blue-100 transition hover:-translate-y-0.5 hover:border-white hover:text-white" href="https://open.spotify.com/artist/2CqE0wMXxmVrzaOvUsWvbM" target="_blank" rel="noopener noreferrer" aria-label="Spotify">
                  <SocialIcon name="spotify" />
                </a>
                <a className="grid size-8 place-items-center rounded-full border border-blue-100/25 text-xs font-bold text-blue-100 transition hover:-translate-y-0.5 hover:border-white hover:text-white" href="https://music.apple.com/ca/artist/reverence-worship-team/1788741166" target="_blank" rel="noopener noreferrer" aria-label="Apple Music">
                  <SocialIcon name="apple" />
                </a>
              </div>
            </section>
            <section>
              <h3 className="mb-5 font-bold text-white">Quick Links</h3>
              <nav className="grid gap-[13px]" aria-label="Footer navigation">
                <a className="w-max transition hover:pl-1 hover:text-blue-400" href="#home">Home</a>
                <a className="w-max transition hover:pl-1 hover:text-blue-400" href="#about">About Us</a>
                <a className="w-max transition hover:pl-1 hover:text-blue-400" href="#join">Join Us</a>
                <a className="w-max transition hover:pl-1 hover:text-blue-400" href="#music">Music</a>
                <a className="w-max transition hover:pl-1 hover:text-blue-400" href="#pictures">Pictures</a>
                <a className="w-max transition hover:pl-1 hover:text-blue-400" href="#events">Events</a>
              </nav>
            </section>
            <section>
              <h3 className="mb-5 font-bold text-white">Contact</h3>
              <div className="grid gap-4">
                <a className="flex items-start gap-3 leading-6" href="mailto:worshipteamkicukiro@gmail.com">
                  <Mail className="mt-1 size-[18px] shrink-0 text-blue-300" aria-hidden />
                  <span>worshipteamkicukiro@gmail.com</span>
                </a>
                <div className="flex items-start gap-3 leading-6">
                  <MapPin className="mt-1 size-[18px] shrink-0 text-blue-300" aria-hidden />
                  <span>23JX +43M, Kicukiro, Kigali, Rwanda</span>
                </div>
                <a className="flex items-start gap-3 leading-6" href="tel:+250788880574">
                  <Phone className="mt-1 size-[18px] shrink-0 text-blue-300" aria-hidden />
                  <span>+250788880574 / 0784462768 / 0781520618</span>
                </a>
              </div>
            </section>
          </div>
          <div className="mt-[38px] flex flex-col justify-between gap-5 border-t border-blue-100/20 pt-[18px] text-xs md:flex-row">
            <span>© {new Date().getFullYear()} Reverence Worship Team. All rights reserved.</span>
            <span>Built for worship, service, and community.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
