"use client";

import {
  normalizeProjectionBackgroundEffects,
  projectionMediaBrightnessPercent,
  type ProjectionBackgroundEffects,
  type ProjectionBackgroundMedia,
} from "@/lib/projection-runtime";

function motionDuration(speed: number) {
  return `${Math.max(10, 42 - speed * 0.3).toFixed(1)}s`;
}

export function ProjectionBackgroundLayer({
  background,
  media,
  effects,
  playVideo = true,
  animate = true,
  contentLength = 0,
  className = "",
}: {
  background: string;
  media: ProjectionBackgroundMedia;
  effects?: Partial<ProjectionBackgroundEffects> | null;
  playVideo?: boolean;
  animate?: boolean;
  contentLength?: number;
  className?: string;
}) {
  const normalized = normalizeProjectionBackgroundEffects(effects);
  const automaticDimming = normalized.autoDimming ? Math.min(20, Math.max(0, Math.round((contentLength - 80) / 14))) : 0;
  const effectiveDimming = Math.min(80, normalized.dimming + automaticDimming);
  const animationName = animate ? normalized.motion === "drift" ? "projection-background-drift" : normalized.motion === "zoom" ? "projection-background-zoom" : undefined : undefined;
  const filter = [
    `brightness(${projectionMediaBrightnessPercent(media.brightness)}%)`,
    `saturate(${normalized.saturation}%)`,
    normalized.blur ? `blur(${normalized.blur}px)` : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={`pointer-events-none absolute inset-0 isolate overflow-hidden bg-black ${className}`} aria-hidden="true">
      <div
        className="absolute -inset-[5%] will-change-transform"
        style={{
          background,
          filter,
          animationName,
          animationDuration: motionDuration(normalized.motionSpeed),
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
          animationDirection: "alternate",
        }}
      >
        {media.type !== "none" && media.url ? media.type === "video" ? playVideo ? (
          <video key={media.url} src={media.url} autoPlay muted loop playsInline preload="auto" className="size-full bg-black" style={{ objectFit: media.fit }} />
        ) : null : (
          // A plain image supports device-local blob URLs and externally hosted backgrounds.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media.url} alt="" className="size-full bg-black" style={{ objectFit: media.fit }} />
        ) : null}
      </div>

      {normalized.tintStrength ? <span className="absolute inset-0 mix-blend-color" style={{ background: normalized.tintColor, opacity: normalized.tintStrength / 100 }} /> : null}
      {effectiveDimming ? <span className="absolute inset-0 bg-black" style={{ opacity: effectiveDimming / 100 }} /> : null}
      {normalized.ambience === "particles" ? <span className="projection-background-particles absolute -inset-[15%] opacity-70" style={{ animationPlayState: animate ? "running" : "paused" }} /> : null}
      {normalized.ambience === "rays" ? <span className="projection-background-rays absolute -inset-[35%] opacity-50" style={{ animationPlayState: animate ? "running" : "paused" }} /> : null}
      {normalized.vignette ? <span className="absolute inset-0" style={{ boxShadow: `inset 0 0 ${Math.round(10 + normalized.vignette * 1.5)}px ${Math.round(normalized.vignette * 0.42)}px rgba(0,0,0,${Math.min(0.86, normalized.vignette / 112)})` }} /> : null}
    </div>
  );
}
