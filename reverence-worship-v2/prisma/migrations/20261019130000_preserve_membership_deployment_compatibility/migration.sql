-- Older deployments still decode the stored enum value as "visitor".
-- Keep that storage value compatible; Prisma maps it to Partner in the new app.
-- Renaming in place preserves every user's membership and enum identity.
ALTER TYPE "MembershipType" RENAME VALUE 'partner' TO 'visitor';
