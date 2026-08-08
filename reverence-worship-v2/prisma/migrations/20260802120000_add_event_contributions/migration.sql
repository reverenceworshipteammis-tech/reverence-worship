CREATE TABLE "contribution_events" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "event_date" DATE,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "goal_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "contribution_mode" TEXT NOT NULL DEFAULT 'open',
    "suggested_amount" DECIMAL(15,2),
    "status" TEXT NOT NULL DEFAULT 'active',
    "year" INTEGER NOT NULL,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contribution_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "event_contribution_payments" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "amount" DECIMAL(15,2) NOT NULL,
    "payment_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_method" TEXT DEFAULT 'cash',
    "reference_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "notes" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_contribution_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contribution_events_year_idx" ON "contribution_events"("year");
CREATE INDEX "contribution_events_status_idx" ON "contribution_events"("status");
CREATE INDEX "contribution_events_start_date_idx" ON "contribution_events"("start_date");
CREATE INDEX "event_contribution_payments_event_id_idx" ON "event_contribution_payments"("event_id");
CREATE INDEX "event_contribution_payments_user_id_idx" ON "event_contribution_payments"("user_id");
CREATE INDEX "event_contribution_payments_payment_date_idx" ON "event_contribution_payments"("payment_date");
CREATE INDEX "event_contribution_payments_status_idx" ON "event_contribution_payments"("status");

ALTER TABLE "contribution_events"
ADD CONSTRAINT "contribution_events_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "event_contribution_payments"
ADD CONSTRAINT "event_contribution_payments_event_id_fkey"
FOREIGN KEY ("event_id") REFERENCES "contribution_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "event_contribution_payments"
ADD CONSTRAINT "event_contribution_payments_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "event_contribution_payments"
ADD CONSTRAINT "event_contribution_payments_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
