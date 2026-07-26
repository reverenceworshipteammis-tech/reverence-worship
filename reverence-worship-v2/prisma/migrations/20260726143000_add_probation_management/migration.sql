CREATE TYPE "ProbationState" AS ENUM ('active', 'extended', 'completed', 'terminated');
CREATE TYPE "ProbationDecisionType" AS ENUM ('completed', 'terminated');
CREATE TYPE "ProbationDecisionStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

ALTER TABLE "users"
ADD COLUMN "session_version" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "probations" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "original_start_date" DATE NOT NULL,
    "original_expected_end_date" DATE NOT NULL,
    "current_expected_end_date" DATE NOT NULL,
    "state" "ProbationState" NOT NULL DEFAULT 'active',
    "assigned_admin_id" INTEGER NOT NULL,
    "member_visible_summary" TEXT,
    "confidential_comments" TEXT,
    "final_decision_comments" TEXT,
    "decision_date" TIMESTAMP(3),
    "decided_by_id" INTEGER,
    "created_by_id" INTEGER NOT NULL,
    "updated_by_id" INTEGER NOT NULL,
    "member_role_removed_on_enrollment" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "probations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "probations_date_order_check" CHECK ("original_expected_end_date" >= "original_start_date"),
    CONSTRAINT "probations_current_end_check" CHECK ("current_expected_end_date" >= "original_start_date")
);

CREATE TABLE "probation_extensions" (
    "id" SERIAL NOT NULL,
    "probation_id" INTEGER NOT NULL,
    "previous_expected_end_date" DATE NOT NULL,
    "new_expected_end_date" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "comments" TEXT,
    "extended_by_id" INTEGER NOT NULL,
    "extension_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "probation_extensions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "probation_extensions_date_order_check" CHECK ("new_expected_end_date" > "previous_expected_end_date")
);

CREATE TABLE "probation_decision_requests" (
    "id" SERIAL NOT NULL,
    "probation_id" INTEGER NOT NULL,
    "requested_state" "ProbationDecisionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "comments" TEXT NOT NULL,
    "status" "ProbationDecisionStatus" NOT NULL DEFAULT 'pending',
    "requested_by_id" INTEGER NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by_id" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "review_comments" TEXT,

    CONSTRAINT "probation_decision_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "probations_user_id_state_idx" ON "probations"("user_id", "state");
CREATE INDEX "probations_assigned_admin_id_state_idx" ON "probations"("assigned_admin_id", "state");
CREATE INDEX "probations_state_current_expected_end_date_idx" ON "probations"("state", "current_expected_end_date");
CREATE UNIQUE INDEX "probations_one_open_per_user_key"
ON "probations"("user_id")
WHERE "state" IN ('active', 'extended');

CREATE INDEX "probation_extensions_probation_id_extension_date_idx"
ON "probation_extensions"("probation_id", "extension_date");

CREATE INDEX "probation_decision_requests_probation_id_requested_at_idx"
ON "probation_decision_requests"("probation_id", "requested_at");
CREATE INDEX "probation_decision_requests_status_requested_at_idx"
ON "probation_decision_requests"("status", "requested_at");
CREATE INDEX "probation_decision_requests_requested_by_id_idx"
ON "probation_decision_requests"("requested_by_id");
CREATE UNIQUE INDEX "probation_decision_requests_one_pending_key"
ON "probation_decision_requests"("probation_id")
WHERE "status" = 'pending';

ALTER TABLE "probations"
ADD CONSTRAINT "probations_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "probations"
ADD CONSTRAINT "probations_assigned_admin_id_fkey"
FOREIGN KEY ("assigned_admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "probations"
ADD CONSTRAINT "probations_decided_by_id_fkey"
FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "probations"
ADD CONSTRAINT "probations_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "probations"
ADD CONSTRAINT "probations_updated_by_id_fkey"
FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "probation_extensions"
ADD CONSTRAINT "probation_extensions_probation_id_fkey"
FOREIGN KEY ("probation_id") REFERENCES "probations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "probation_extensions"
ADD CONSTRAINT "probation_extensions_extended_by_id_fkey"
FOREIGN KEY ("extended_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "probation_decision_requests"
ADD CONSTRAINT "probation_decision_requests_probation_id_fkey"
FOREIGN KEY ("probation_id") REFERENCES "probations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "probation_decision_requests"
ADD CONSTRAINT "probation_decision_requests_requested_by_id_fkey"
FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "probation_decision_requests"
ADD CONSTRAINT "probation_decision_requests_reviewed_by_id_fkey"
FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "roles" ("name", "display_name", "description", "is_system", "updated_at")
VALUES (
    'probation-member',
    'Probation Member',
    'Normal member dashboard access while membership probation is being evaluated.',
    true,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("name") DO UPDATE SET
    "display_name" = EXCLUDED."display_name",
    "description" = EXCLUDED."description",
    "is_system" = true,
    "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "pages" ("name", "label", "description", "icon", "href", "sort_order", "is_active", "updated_at")
VALUES (
    'probation',
    'Probation',
    'Manage membership probation periods, monitoring, extensions, and decisions.',
    'UserRoundCheck',
    '/probation',
    7,
    true,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("name") DO UPDATE SET
    "label" = EXCLUDED."label",
    "description" = EXCLUDED."description",
    "icon" = EXCLUDED."icon",
    "href" = EXCLUDED."href",
    "is_active" = true,
    "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "features" ("page_id", "name", "label", "description", "updated_at")
SELECT page."id", feature."name", feature."label", feature."description", CURRENT_TIMESTAMP
FROM "pages" page
CROSS JOIN (
    VALUES
        ('view', 'View Probation Members', 'Open the probation dashboard and member records.'),
        ('enroll', 'Enroll Probation Members', 'Start a member''s probation period.'),
        ('update', 'Update Probation Details', 'Update the assigned administrator and member-visible summary.'),
        ('view-confidential-comments', 'View Confidential Review Comments', 'Read and update confidential probation comments.'),
        ('extend', 'Extend Probation', 'Extend an open probation period with a required reason.'),
        ('complete', 'Request Probation Completion', 'Request assigned-administrator approval to complete probation.'),
        ('terminate', 'Request Probation Termination', 'Request assigned-administrator approval to terminate probation.'),
        ('reopen', 'Reopen Closed Probation', 'Reopen a completed or terminated probation record without separate administrator approval.'),
        ('export', 'Export Probation Reports', 'Download probation monitoring reports.')
) AS feature("name", "label", "description")
WHERE page."name" = 'probation'
ON CONFLICT ("page_id", "name") DO UPDATE SET
    "label" = EXCLUDED."label",
    "description" = EXCLUDED."description",
    "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "role_page_features" ("role_id", "page_id", "feature_id")
SELECT role."id", page."id", feature."id"
FROM "roles" role
JOIN "pages" page ON page."name" = 'probation'
JOIN "features" feature ON feature."page_id" = page."id"
WHERE role."name" IN ('admin', 'discipline-dpt')
ON CONFLICT DO NOTHING;

INSERT INTO "role_page_features" ("role_id", "page_id", "feature_id")
SELECT probation_role."id", permissions."page_id", permissions."feature_id"
FROM "roles" probation_role
JOIN "roles" member_role ON member_role."name" = 'member'
JOIN "role_page_features" permissions ON permissions."role_id" = member_role."id"
WHERE probation_role."name" = 'probation-member'
ON CONFLICT DO NOTHING;

INSERT INTO "system_settings" ("key", "value", "group", "updated_at")
VALUES ('probation_default_duration_days', '90'::jsonb, 'probation', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
