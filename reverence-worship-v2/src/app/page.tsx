import { LandingPageClient } from "@/components/landing-page-client";
import { getCurrentUser } from "@/lib/auth";
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

export default async function HomePage() {
  const user = await getCurrentUser();

  const [registrationEnabled, videos, pictures, events] = await Promise.all([
    isRegistrationEnabled(),
    prisma.landingYoutubeVideo.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 4,
    }),
    prisma.landingFeaturedImage.findMany({
      where: { isPublished: true },
      orderBy: [{ isHero: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      take: 12,
    }),
    prisma.publicBoardItem.findMany({
      where: { isPublished: true },
      orderBy: [{ isPinned: "desc" }, { eventDate: "asc" }, { createdAt: "desc" }],
      take: 6,
    }),
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
