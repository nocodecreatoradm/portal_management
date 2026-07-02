-- Add visit_not_performed and visit_not_performed_reason to hiyari_hatto_reports
-- These fields allow marking that the visit protocol was not performed, with a reason

ALTER TABLE hiyari_hatto_reports
  ADD COLUMN IF NOT EXISTS visit_not_performed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS visit_not_performed_reason text;
