-- Rename the enum value in place so existing users retain their membership.
ALTER TYPE "MembershipType" RENAME VALUE 'visitor' TO 'partner';
