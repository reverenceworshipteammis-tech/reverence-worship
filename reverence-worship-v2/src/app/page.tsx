import { LandingPageClient } from "@/components/landing-page-client";
import { getCurrentUser } from "@/lib/auth";
import { isTransientDatabaseError, withDatabaseRetry } from "@/lib/database-retry";
import { prisma } from "@/lib/prisma";
import { isRegistrationEnabled } from "@/lib/system-settings";

function formatEventDate(date: Date | null, fallback: Date) {
  const value = date ?? fallback;

  return {
    label: new Intl.DateTimeFormat("en", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...(date
        ? {
            hour: "2-digit",
            minute: "2-digit",
          }
        : {}),
    }).format(value),
    dateTime: value.toISOString(),
  };
}

async function safePublicRead<T>(label: string, operation: () => Promise<T>, fallback: T) {
  try {
    return await withDatabaseRetry(operation, 3);
  } catch (error) {
    if (!isTransientDatabaseError(error)) {
      throw error;
    }

    console.warn(`Landing page ${label} unavailable after database retries.`);
    return fallback;
  }
}

export default async function HomePage() {
  const user = await safePublicRead("session", () => getCurrentUser(), null);

  const [registrationEnabled, videos, pictures, events] = await Promise.all([
    safePublicRead("registration setting", () => isRegistrationEnabled(), true),
    safePublicRead("videos", () =>
      prisma.landingYoutubeVideo.findMany({
        where: { isPublished: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        take: 4,
      }), []),
    safePublicRead("pictures", () =>
      prisma.landingFeaturedImage.findMany({
        where: { isPublished: true },
        orderBy: [{ isHero: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
        take: 12,
      }), []),
    safePublicRead("events", () =>
      prisma.publicBoardItem.findMany({
        where: { isPublished: true },
        orderBy: [{ isPinned: "desc" }, { eventDate: "asc" }, { createdAt: "desc" }],
        take: 6,
      }), []),
  ]);

  return (
    <LandingPageClient
      dashboardHref={user ? "/admin/dashboard" : null}
      registrationEnabled={registrationEnabled}
      videos={videos.map((video) => ({
        id: video.id,
        title: video.title,
        youtubeId: video.youtubeId,
      }))}
      pictures={pictures.map((picture) => ({
        id: picture.id,
        title: picture.title,
        imagePath: picture.imagePath,
        description: picture.description,
        isHero: picture.isHero,
      }))}
      events={events.map((event) => {
        const formatted = formatEventDate(event.eventDate, event.createdAt);

        return {
          id: event.id,
          title: event.title,
          content: event.content,
          type: event.type,
          label: formatted.label,
          dateTime: formatted.dateTime,
        };
      })}
    />
  );
}
