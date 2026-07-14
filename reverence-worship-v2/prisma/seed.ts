import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const roles = [
  {
    name: "super-admin",
    displayName: "Super Admin",
    description: "Full access to all modules.",
    isSystem: true,
  },
  {
    name: "admin",
    displayName: "Admin",
    description: "General administration access across operational modules.",
    isSystem: true,
  },
  {
    name: "music-dpt",
    displayName: "Music DPT",
    description: "Music and Evangelism department responsibilities.",
    isSystem: true,
  },
  {
    name: "social-dpt",
    displayName: "Social DPT",
    description: "Social Fellowship department responsibilities.",
    isSystem: true,
  },
  {
    name: "discipline-dpt",
    displayName: "Discipline DPT",
    description: "Discipline department responsibilities.",
    isSystem: true,
  },
  {
    name: "intercession-dpt",
    displayName: "Intercession DPT",
    description: "Intercession and Spiritual Growth department responsibilities.",
    isSystem: true,
  },
  {
    name: "member",
    displayName: "Member",
    description: "Default access for members to view, submit, and track personal activity.",
    isSystem: true,
  },
];

const modules = [
  ["dashboard", "Dashboard", "/", "LayoutDashboard"],
  ["users", "Users", "/users", "Users"],
  ["music-ministry", "Music Ministry", "/music", "Music"],
  ["intercession", "Intercession", "/intercession", "BookOpen"],
  ["social-fellowship", "Social Fellowship", "/social-fellowship", "Handshake"],
  ["discipline", "Discipline", "/discipline", "ClipboardCheck"],
  ["finance", "Finance", "/finance", "Wallet"],
  ["family", "Family", "/family", "Home"],
  ["contributions", "My Contributions", "/contributions", "HandCoins"],
  ["profile", "My Profile", "/profile", "User"],
  ["performance", "My Performance", "/performance", "BarChart3"],
  ["parent", "Parent Dashboard", "/parent", "Home"],
  ["announcements", "Announcements", "/announcements", "Megaphone"],
  ["reports", "Reports", "/reports", "BarChart3"],
  ["settings", "Settings", "/settings", "Settings"],
  ["permissions", "Permission Manager", "/permissions", "Lock"],
] as const;

type FeatureDefinition = {
  name: string;
  label: string;
  description: string;
};

const defaultFeatures = (label: string): FeatureDefinition[] => [
  { name: "view", label: `View ${label}`, description: `Open and read ${label} records.` },
  { name: "create", label: `Create ${label}`, description: `Add new ${label} records.` },
  { name: "edit", label: `Edit ${label}`, description: `Update existing ${label} records.` },
  { name: "delete", label: `Delete ${label}`, description: `Remove ${label} records.` },
  { name: "approve", label: `Approve ${label}`, description: `Approve or reject ${label} records.` },
  { name: "export", label: `Export ${label}`, description: `Download ${label} reports or files.` },
];

const featureDefinitionsByPage: Record<string, FeatureDefinition[]> = {
  dashboard: [
    { name: "view", label: "View Dashboard", description: "Open the role dashboard." },
  ],
  users: [
    { name: "view", label: "View Users", description: "See user profiles and the user list." },
    { name: "create", label: "Create Users", description: "Add a new user account." },
    { name: "edit", label: "Edit User Profiles", description: "Update member profile details." },
    { name: "edit-password", label: "Update User Passwords", description: "Change a user's password." },
    { name: "change-status", label: "Activate or Deactivate Users", description: "Approve, activate, deactivate, or reject user accounts." },
    { name: "assign-roles", label: "Assign User Roles", description: "Change the roles assigned to a user." },
    { name: "delete", label: "Delete Users", description: "Permanently remove user accounts." },
    { name: "export", label: "Export Users", description: "Download user lists or user PDF files." },
  ],
  "music-ministry": [
    { name: "view", label: "View Music DPT", description: "Open the Music and Evangelism workspace." },
    { name: "manage-songs", label: "Create and Edit Songs", description: "Add or update songs and lyrics." },
    { name: "delete-songs", label: "Delete Songs", description: "Remove songs from the song library." },
    { name: "manage-playlists", label: "Create and Edit Playlists", description: "Build and update playlists." },
    { name: "delete-playlists", label: "Delete Playlists", description: "Remove playlists." },
    { name: "manage-gallery", label: "Manage Gallery Images", description: "Add or edit public gallery images." },
    { name: "delete-gallery", label: "Delete Gallery Images", description: "Remove public gallery images." },
    { name: "manage-service-teams", label: "Generate Service Teams", description: "Create and update service team assignments." },
    { name: "manage-public-board", label: "Manage Public Board", description: "Create, publish, pin, or edit public board posts." },
    { name: "delete-public-board", label: "Delete Public Board Posts", description: "Remove public board posts." },
    { name: "manage-landing-media", label: "Manage Landing Page Media", description: "Manage YouTube videos and featured images." },
    { name: "delete-landing-media", label: "Delete Landing Page Media", description: "Remove landing page videos or featured images." },
    { name: "manage-action-plans", label: "Manage Music Action Plans", description: "Create and update Music DPT action plans." },
  ],
  intercession: [
    { name: "view", label: "View Intercession DPT", description: "Open intercession forms, reports, and Bible tools." },
    { name: "submit-forms", label: "Submit Forms", description: "Take and submit active spiritual forms." },
    { name: "create-forms", label: "Create Forms", description: "Build new spiritual forms." },
    { name: "manage-forms", label: "Manage Forms", description: "Open and manage the Intercession form list." },
    { name: "edit-forms", label: "Edit Forms", description: "Update spiritual form questions and settings." },
    { name: "publish-forms", label: "Publish Forms", description: "Publish or unpublish spiritual forms." },
    { name: "delete-forms", label: "Delete Forms", description: "Remove spiritual forms." },
    { name: "view-submissions", label: "View Form Submissions", description: "Read submitted form responses." },
    { name: "view-results", label: "View Form Results", description: "Review form responses and member results." },
    { name: "view-reports", label: "View Form Reports", description: "Open Intercession participation reports." },
    { name: "export-reports", label: "Export Form Reports", description: "Download intercession report data." },
    { name: "read-bible", label: "Read Bible", description: "Use the Bible reading tab." },
    { name: "manage-action-plans", label: "Manage Intercession Action Plans", description: "Create and update Intercession DPT action plans." },
  ],
  "social-fellowship": [
    { name: "view", label: "View Social Fellowship", description: "Open families, users, tasks, and action plans." },
    { name: "manage-families", label: "Create and Edit Families", description: "Create families and update family information." },
    { name: "delete-families", label: "Delete Families", description: "Remove family groups." },
    { name: "manage-family-members", label: "Manage Family Members", description: "Add, remove, or update family members." },
    { name: "manage-family-tasks", label: "Manage Family Tasks", description: "Create and update family tasks." },
    { name: "delete-family-tasks", label: "Delete Family Tasks", description: "Remove family tasks." },
    { name: "manage-action-plans", label: "Manage Social Action Plans", description: "Create and update Social Fellowship action plans." },
  ],
  discipline: [
    { name: "view", label: "View Discipline DPT", description: "Open discipline, attendance, and permissions." },
    { name: "mark-attendance", label: "Mark Attendance", description: "Create and update attendance sessions." },
    { name: "complete-attendance", label: "Complete Attendance Sessions", description: "Lock completed attendance sessions." },
    { name: "delete-attendance", label: "Delete Attendance Sessions", description: "Remove attendance sessions and records." },
    { name: "create-permission-requests", label: "Create Permission Requests", description: "Record a permission request." },
    { name: "approve-permission-requests", label: "Approve Permission Requests", description: "Approve or reject member permission requests." },
    { name: "delete-permission-requests", label: "Delete Permission Requests", description: "Remove permission request records." },
    { name: "record-discipline", label: "Record Discipline", description: "Create discipline records." },
    { name: "resolve-discipline", label: "Resolve Discipline Records", description: "Resolve or close discipline records." },
    { name: "delete-discipline", label: "Delete Discipline Records", description: "Remove discipline records." },
    { name: "manage-action-plans", label: "Manage Discipline Action Plans", description: "Create and update Discipline DPT action plans." },
  ],
  finance: [
    { name: "view", label: "View Finance DPT", description: "Open financial contribution, payment, sponsor, and expense tabs." },
    { name: "manage-settings", label: "Manage Finance Settings", description: "Update financial term settings." },
    { name: "manage-contributions", label: "Manage Contributions", description: "Create and update member contribution commitments." },
    { name: "delete-contributions", label: "Delete Contributions", description: "Remove contribution records." },
    { name: "manage-payments", label: "Manage Payments", description: "Create and update payments." },
    { name: "delete-payments", label: "Delete Payments", description: "Remove payment records." },
    { name: "manage-sponsors", label: "Manage Sponsors", description: "Create and update sponsor records." },
    { name: "delete-sponsors", label: "Delete Sponsors", description: "Remove sponsor records." },
    { name: "manage-expenses", label: "Manage Expenses", description: "Create and update expense requests." },
    { name: "approve-expenses", label: "Approve Expenses", description: "Approve or reject expenses." },
    { name: "delete-expenses", label: "Delete Expenses", description: "Remove expense records." },
    { name: "manage-action-plans", label: "Manage Finance Action Plans", description: "Create and update Finance DPT action plans." },
  ],
  family: [
    { name: "view", label: "View My Family", description: "Open family details." },
  ],
  contributions: [
    { name: "view", label: "View My Contributions", description: "Open personal contribution records." },
    { name: "create", label: "Record My Contribution", description: "Submit personal contribution information." },
  ],
  profile: [
    { name: "view", label: "View My Profile", description: "Open personal profile." },
    { name: "edit", label: "Edit My Profile", description: "Update personal profile details." },
  ],
  performance: [
    { name: "view", label: "View My Performance", description: "Open personal attendance, contribution, and discipline performance." },
  ],
  parent: [
    { name: "view", label: "View Parent Dashboard", description: "Open parent dashboard and child activity." },
  ],
  announcements: [
    { name: "view", label: "View Announcements", description: "Open announcements." },
    { name: "create", label: "Create Announcements", description: "Create a new announcement." },
    { name: "edit", label: "Edit Announcements", description: "Update announcements." },
    { name: "delete", label: "Delete Announcements", description: "Remove announcements." },
    { name: "publish", label: "Publish Announcements", description: "Publish or schedule announcements." },
  ],
  reports: defaultFeatures("Reports"),
  settings: [
    { name: "view", label: "View Settings", description: "Open system settings." },
    { name: "edit", label: "Edit Settings", description: "Update system settings." },
  ],
  permissions: [
    { name: "view", label: "View Permission Manager", description: "Open roles and permissions." },
    { name: "create-roles", label: "Create Roles", description: "Create custom roles." },
    { name: "edit-roles", label: "Edit Roles", description: "Update role names and descriptions." },
    { name: "delete-roles", label: "Delete Roles", description: "Remove custom roles." },
    { name: "assign-permissions", label: "Assign Role Permissions", description: "Change what each role can access." },
    { name: "import-export", label: "Import or Export Permissions", description: "Import or export role permission files." },
  ],
};

async function main() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {
        displayName: role.displayName,
        description: role.description,
        isSystem: role.isSystem,
      },
      create: role,
    });
  }

  await prisma.page.createMany({
    data: modules.map(([name, label, href, icon], index) => ({
      name,
      label,
      href,
      icon,
      sortOrder: index + 1,
      isActive: true,
    })),
    skipDuplicates: true,
  });

  const [allRoles, pages] = await Promise.all([
    prisma.role.findMany({ where: { name: { in: roles.map((role) => role.name) } } }),
    prisma.page.findMany({ where: { name: { in: modules.map(([name]) => name) } } }),
  ]);
  const roleByName = new Map(allRoles.map((role) => [role.name, role]));
  const pageByName = new Map(pages.map((page) => [page.name, page]));

  const superAdminRole = roleByName.get("super-admin");
  if (!superAdminRole) throw new Error("Super Admin role was not created.");

  for (const page of pages) {
    const definitions = featureDefinitionsByPage[page.name] ?? defaultFeatures(page.label);
    const currentFeatureNames = definitions.map((feature) => feature.name);

    await prisma.feature.deleteMany({
      where: {
        pageId: page.id,
        name: { notIn: currentFeatureNames },
      },
    });

    for (const feature of definitions) {
      await prisma.feature.upsert({
        where: {
          pageId_name: {
            pageId: page.id,
            name: feature.name,
          },
        },
        update: {
          label: feature.label,
          description: feature.description,
        },
        create: {
          pageId: page.id,
          name: feature.name,
          label: feature.label,
          description: feature.description,
        },
      });
    }
  }

  const features = await prisma.feature.findMany({
    where: { pageId: { in: pages.map((page) => page.id) } },
  });

  await prisma.rolePageFeature.createMany({
    data: features.map((feature) => ({
      roleId: superAdminRole.id,
      pageId: feature.pageId,
      featureId: feature.id,
    })),
    skipDuplicates: true,
  });

  const featuresByPage = new Map<number, typeof features>();
  for (const feature of features) {
    featuresByPage.set(feature.pageId, [...(featuresByPage.get(feature.pageId) ?? []), feature]);
  }

  const permissionsByRole: Record<string, string[]> = {
    admin: modules.map(([name]) => name).filter((name) => name !== "permissions" && name !== "settings"),
    "music-dpt": ["dashboard", "music-ministry", "announcements", "profile", "performance"],
    "social-dpt": ["dashboard", "social-fellowship", "announcements", "profile", "performance"],
    "discipline-dpt": ["dashboard", "discipline", "announcements", "profile", "performance"],
    "intercession-dpt": ["dashboard", "intercession", "announcements", "profile", "performance"],
    member: ["family", "contributions", "profile", "performance", "intercession"],
  };

  for (const [roleName, pageNames] of Object.entries(permissionsByRole)) {
    const role = roleByName.get(roleName);
    if (!role) continue;

    const roleFeatures = pageNames.flatMap((pageName) => {
      const page = pageByName.get(pageName);
      if (!page) return [];
      return (featuresByPage.get(page.id) ?? [])
        .filter((feature) => {
          if (roleName === "member") return ["view", "create", "submit-forms", "read-bible"].includes(feature.name);
          if (["profile", "performance"].includes(pageName)) return feature.name === "view" || feature.name === "edit";
          return true;
        })
        .map((feature) => ({
          roleId: role.id,
          pageId: feature.pageId,
          featureId: feature.id,
        }));
    });

    if (roleFeatures.length > 0) {
      await prisma.rolePageFeature.createMany({
        data: roleFeatures,
        skipDuplicates: true,
      });
    }
  }

  console.log(
    `Seeded ${roles.length} roles, ${pages.length} pages, ${features.length} features, and default role permissions.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
