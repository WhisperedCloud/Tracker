-- Each person's custom order of tasks on the subject page (ids, main tasks
-- and subtasks together; each list is ordered within its own parent).
-- Kept on the profile like subject_order, so it follows the person across
-- sign-outs and devices. Safe to run more than once.
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS task_order UUID[] NOT NULL DEFAULT '{}';
