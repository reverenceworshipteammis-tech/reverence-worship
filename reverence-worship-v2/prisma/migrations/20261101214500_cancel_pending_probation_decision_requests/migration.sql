-- Final probation decisions (completion/termination) no longer require a
-- separate administrator approval. Cancel any decision requests that are
-- still waiting for approval so the affected probations can be decided
-- directly.
UPDATE "probation_decision_requests"
SET
  "status" = 'cancelled',
  "reviewed_at" = CURRENT_TIMESTAMP,
  "review_comments" = 'Cancelled automatically: final decisions no longer require approval.'
WHERE "status" = 'pending';
