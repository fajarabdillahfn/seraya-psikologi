-- Persist the approved non-clinical intake snapshot separately from legacy short_message.
ALTER TABLE booking ADD COLUMN intake_topics TEXT NOT NULL DEFAULT '[]';
ALTER TABLE booking ADD COLUMN intake_problem_description TEXT;
ALTER TABLE booking ADD COLUMN intake_expected_outcome TEXT;
ALTER TABLE booking ADD COLUMN intake_returning_client INTEGER NOT NULL DEFAULT 0 CHECK (intake_returning_client IN (0,1));

CREATE INDEX IF NOT EXISTS idx_booking_intake_topics ON booking(intake_topics);

-- Existing rows predate the required launch intake and remain incomplete for review.
UPDATE booking SET intake_topics = '[]' WHERE intake_topics IS NULL;
