-- TaskSync update, November 2026
--   1. Subject status follows its tasks automatically (with an optional manual override)
--   2. Each person's custom subject order is saved to their profile
--   3. Edit/delete permissions for comments, attachments, answers and study logs
--
-- Safe to run more than once. The same statements are at the end of schema.sql.

-- ---------------------------------------------------------------------------
-- 1. Automatic subject status
-- ---------------------------------------------------------------------------

-- TRUE when someone picked the status by hand; the status then stays as
-- chosen until they switch it back to automatic.
ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS status_manual BOOLEAN NOT NULL DEFAULT FALSE;

-- Work items are the tasks of a subject that have no subtasks of their own
-- (a main task with subtasks is represented by its subtasks).
--   none, or none started  -> Planning
--   all completed          -> Completed
--   anything else          -> In Progress
-- Mirrors computeSubjectStatus() in src/lib/subjects.js.
CREATE OR REPLACE FUNCTION public.compute_project_status(project_uuid UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    WITH items AS (
        SELECT t.status
        FROM public.tasks t
        WHERE t.project_id = project_uuid
          AND NOT EXISTS (SELECT 1 FROM public.tasks c WHERE c.parent_task_id = t.id)
    )
    SELECT CASE
        WHEN COUNT(*) = 0 THEN 'Planning'
        WHEN COUNT(*) FILTER (WHERE status = 'Completed') = COUNT(*) THEN 'Completed'
        WHEN COUNT(*) FILTER (WHERE status <> 'To Do') > 0 THEN 'In Progress'
        ELSE 'Planning'
    END
    FROM items;
$$;

-- Keep an automatic subject's status correct whenever the subject is saved.
CREATE OR REPLACE FUNCTION public.apply_project_status()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT NEW.status_manual THEN
        NEW.status := public.compute_project_status(NEW.id);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_project_status ON public.projects;
CREATE TRIGGER apply_project_status
    BEFORE INSERT OR UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.apply_project_status();

-- Recalculate the subject whenever one of its tasks is added, changed,
-- moved or deleted. Runs as the definer so an assignee who may not edit the
-- subject still moves its status along.
CREATE OR REPLACE FUNCTION public.refresh_project_status()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    affected UUID[];
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        affected := array_append(affected, OLD.project_id);
    END IF;
    IF TG_OP IN ('UPDATE', 'INSERT') THEN
        affected := array_append(affected, NEW.project_id);
    END IF;

    UPDATE public.projects p
    SET status = public.compute_project_status(p.id),
        updated_at = NOW()
    WHERE p.id = ANY (affected)
      AND NOT p.status_manual
      AND p.status IS DISTINCT FROM public.compute_project_status(p.id);

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS refresh_project_status ON public.tasks;
CREATE TRIGGER refresh_project_status
    AFTER INSERT OR DELETE OR UPDATE OF status, project_id, parent_task_id ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.refresh_project_status();

-- Existing subjects: keep deliberate On Hold / Cancelled choices as manual,
-- and recalculate the rest from their tasks (the BEFORE trigger does it).
-- Only runs while no subject has been switched over yet.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.projects WHERE status_manual) THEN
        UPDATE public.projects SET status_manual = TRUE WHERE status IN ('On Hold', 'Cancelled');
    END IF;
END $$;
UPDATE public.projects SET status = status WHERE NOT status_manual;

-- ---------------------------------------------------------------------------
-- 2. Custom subject order, per person (kept across sign-outs and devices)
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS subject_order UUID[] NOT NULL DEFAULT '{}';

-- ---------------------------------------------------------------------------
-- 3. Edit and delete permissions
-- ---------------------------------------------------------------------------

ALTER TABLE public.task_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- The task's creator or an organizer of its group.
CREATE OR REPLACE FUNCTION public.can_manage_task(task_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_uuid
          AND (t.created_by = auth.uid() OR public.is_team_leader_or_admin(t.team_id))
    );
$$;

-- Same check for a storage path "<task id>/<file>".
CREATE OR REPLACE FUNCTION public.can_manage_task_path(object_path TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
    task_uuid UUID;
BEGIN
    BEGIN
        task_uuid := split_part(object_path, '/', 1)::UUID;
    EXCEPTION WHEN others THEN
        RETURN FALSE;
    END;
    RETURN public.can_manage_task(task_uuid);
END;
$$;

-- Comments: authors edit their own; authors and task managers delete.
DROP POLICY IF EXISTS "Authors edit their comments" ON public.task_comments;
CREATE POLICY "Authors edit their comments"
    ON public.task_comments FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Authors and task managers delete comments" ON public.task_comments;
CREATE POLICY "Authors and task managers delete comments"
    ON public.task_comments FOR DELETE TO authenticated
    USING (user_id = auth.uid() OR public.can_manage_task(task_id));

-- Attachments: the uploader or a task manager removes them.
DROP POLICY IF EXISTS "Uploaders and task managers delete attachments" ON public.task_attachments;
CREATE POLICY "Uploaders and task managers delete attachments"
    ON public.task_attachments FOR DELETE TO authenticated
    USING (uploaded_by = auth.uid() OR public.can_manage_task(task_id));

DROP POLICY IF EXISTS "Task managers can delete attachment files" ON storage.objects;
CREATE POLICY "Task managers can delete attachment files"
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'task-attachments' AND public.can_manage_task_path(name)
    );

-- Answers: authors edit their own.
DROP POLICY IF EXISTS "Authors edit their answers" ON public.answers;
CREATE POLICY "Authors edit their answers"
    ON public.answers FOR UPDATE TO authenticated
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- Study logs: people correct their own entries.
DROP POLICY IF EXISTS "Users edit their own logs" ON public.study_logs;
CREATE POLICY "Users edit their own logs"
    ON public.study_logs FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid() AND (team_id IS NULL OR public.is_team_member(team_id)));
