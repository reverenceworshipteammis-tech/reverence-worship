import { MusicClient } from "@/components/music-client";
import { getUserPermissionSet, permissionSetHas, requirePageAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateValue(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function MusicPage() {
  const user = await requirePageAccess("music-ministry");
  const permissions = await getUserPermissionSet(user);
  const canManage = permissionSetHas(permissions, "music-ministry", "view");

  const [playlists, songs, gallery, singers, serviceTeams, boardItems, youtubeVideos, featuredImages, actionPlans] = await Promise.all([
    prisma.playlist.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        songs: {
          orderBy: { displayOrder: "asc" },
          include: { song: true },
        },
      },
    }),
    prisma.song.findMany({
      orderBy: { title: "asc" },
    }),
    canManage ? prisma.photoGallery.findMany({
      orderBy: { createdAt: "desc" },
    }) : Promise.resolve([]),
    canManage ? prisma.user.findMany({
      where: {
        membershipType: "permanent",
        status: "active",
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        membershipType: true,
        voicePart: true,
        singerLevel: true,
      },
    }) : Promise.resolve([]),
    canManage ? prisma.serviceTeam.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        members: {
          orderBy: [{ teamNumber: "asc" }, { id: "asc" }],
          include: { user: true },
        },
      },
    }) : Promise.resolve([]),
    canManage ? prisma.publicBoardItem.findMany({
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    }) : Promise.resolve([]),
    canManage ? prisma.landingYoutubeVideo.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }) : Promise.resolve([]),
    canManage ? prisma.landingFeaturedImage.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }) : Promise.resolve([]),
    canManage ? prisma.actionPlan.findMany({
      where: { department: "music-ministry" },
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
      include: {
        creator: { select: { name: true } },
        tasks: { orderBy: [{ deadline: "asc" }, { createdAt: "asc" }] },
      },
    }) : Promise.resolve([]),
  ]);

  return (
    <MusicClient
      canManage={canManage}
      playlists={playlists.map((playlist) => ({
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        createdAt: formatDate(playlist.createdAt),
        songs: playlist.songs.map(({ song }) => ({
          id: song.id,
          title: song.title,
          artist: song.artist,
          keySignature: song.keySignature,
          tempo: song.tempo,
          lyrics: song.lyrics,
          youtubeLink: song.youtubeLink,
          assignedSinger: song.assignedSinger,
        })),
      }))}
      songs={songs.map((song) => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        keySignature: song.keySignature,
        tempo: song.tempo,
        lyrics: song.lyrics,
        youtubeLink: song.youtubeLink,
        assignedSinger: song.assignedSinger,
      }))}
      gallery={gallery.map((photo) => ({
        id: photo.id,
        title: photo.title,
        imagePath: photo.imagePath,
        description: photo.description,
        eventDate: photo.eventDate ? formatDate(photo.eventDate) : null,
        category: photo.category,
        tags: photo.tags,
        altText: photo.altText,
        createdAt: formatDate(photo.createdAt),
        createdAtValue: photo.createdAt.toISOString(),
      }))}
      singers={singers.map((singer) => ({
        id: singer.id,
        name: singer.name,
        email: singer.email,
        membershipType: singer.membershipType,
        voicePart: singer.voicePart,
        singerLevel: singer.singerLevel,
      }))}
      serviceTeams={serviceTeams.map((team) => ({
        id: team.id,
        serviceName: team.serviceName,
        serviceDate: team.serviceDate ? formatDate(team.serviceDate) : null,
        serviceDateValue: team.serviceDate?.toISOString().slice(0, 10) ?? "",
        numberOfTeams: team.numberOfTeams,
        createdAt: formatDate(team.createdAt),
        members: team.members.map((member) => ({
          id: member.id,
          teamNumber: member.teamNumber,
          voicePart: member.voicePart,
          performanceLevel: member.performanceLevel,
          user: member.user
            ? {
                id: member.user.id,
                name: member.user.name,
                email: member.user.email,
              }
            : null,
        })),
      }))}
      boardItems={boardItems.map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        type: item.type,
        eventDate: item.eventDate ? formatDateTime(item.eventDate) : null,
        eventDateValue: item.eventDate ? item.eventDate.toISOString().slice(0, 16) : "",
        isPublished: item.isPublished,
        isPinned: item.isPinned,
      }))}
      youtubeVideos={youtubeVideos.map((video) => ({
        id: video.id,
        title: video.title,
        youtubeId: video.youtubeId,
        isPublished: video.isPublished,
        sortOrder: video.sortOrder,
      }))}
      featuredImages={featuredImages.map((image) => ({
        id: image.id,
        title: image.title,
        imagePath: image.imagePath,
        description: image.description,
        isPublished: image.isPublished,
        isHero: image.isHero,
        sortOrder: image.sortOrder,
      }))}
      actionPlans={actionPlans.map((plan) => ({
        id: plan.id,
        title: plan.title,
        description: plan.description,
        startDate: formatDate(plan.startDate),
        startDateRaw: formatDateValue(plan.startDate),
        dueDate: formatDate(plan.dueDate),
        dueDateRaw: formatDateValue(plan.dueDate),
        status: plan.status,
        progress: plan.progress,
        year: plan.year,
        createdByName: plan.creator?.name ?? "System",
        createdAt: formatDate(plan.createdAt),
        tasks: plan.tasks.map((task) => ({
          id: task.id,
          actionPlanId: task.actionPlanId,
          taskName: task.taskName,
          activity: task.activity,
          targetMilestone: task.targetMilestone,
          estimatedBudget: Number(task.estimatedBudget ?? 0),
          startDate: task.startDate ? formatDate(task.startDate) : "",
          startDateRaw: formatDateValue(task.startDate),
          deadline: task.deadline ? formatDate(task.deadline) : "",
          deadlineRaw: formatDateValue(task.deadline),
          priority: task.priority ?? "medium",
          progress: task.progress,
          status: task.status,
        })),
      }))}
    />
  );
}
