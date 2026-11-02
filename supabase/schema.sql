-- TaskSync PostgreSQL schema for Supabase
--
-- Safe to run on a fresh project AND to re-run on an existing one:
-- tables are created if missing, new columns are added, and every
-- function, trigger and policy is replaced with the current version.
--
-- Run it in Supabase Dashboard -> SQL Editor -> New query -> Run.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'team_member' CHECK (role IN ('admin', 'team_leader', 'team_member')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    avatar_url TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'leader', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    invitation_token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Added later: the role the invitee gets, and the team name so the invitee
-- can see which team invited them before they are a member of it.
ALTER TABLE public.team_invitations
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member'));
ALTER TABLE public.team_invitations
    ADD COLUMN IF NOT EXISTS team_name TEXT;

CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    status TEXT NOT NULL DEFAULT 'Planning' CHECK (status IN ('Planning', 'Not Started', 'In Progress', 'On Hold', 'Completed', 'Cancelled')),
    category TEXT DEFAULT 'Development',
    start_date DATE,
    due_date DATE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    status TEXT NOT NULL DEFAULT 'To Do' CHECK (status IN ('To Do', 'In Progress', 'Under Review', 'Changes Requested', 'Completed', 'Blocked')),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    start_date DATE,
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.personal_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    status TEXT NOT NULL DEFAULT 'To Do' CHECK (status IN ('To Do', 'In Progress', 'Completed')),
    due_date DATE,
    category TEXT DEFAULT 'General',
    reminder_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    file_url TEXT NOT NULL, -- storage path inside the task-attachments bucket
    file_name TEXT NOT NULL,
    file_size BIGINT,
    file_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    related_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON public.team_invitations(lower(email));
CREATE INDEX IF NOT EXISTS idx_projects_team ON public.projects(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_team ON public.tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_personal_tasks_user ON public.personal_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_task ON public.task_activity(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON public.task_attachments(task_id);

-- ---------------------------------------------------------------------------
-- Group study features: sessions, resources, focus time, Q&A
-- ---------------------------------------------------------------------------

-- Scheduled group study sessions.
CREATE TABLE IF NOT EXISTS public.study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    agenda TEXT,
    location TEXT,
    meeting_url TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 5 AND 720),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Who is coming to a session.
CREATE TABLE IF NOT EXISTS public.session_rsvps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.study_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('going', 'maybe', 'declined')),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (session_id, user_id)
);

-- Shared study material: links, uploaded files and written notes.
CREATE TABLE IF NOT EXISTS public.study_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    kind TEXT NOT NULL CHECK (kind IN ('link', 'file', 'note')),
    title TEXT NOT NULL,
    description TEXT,
    url TEXT,          -- for links
    file_path TEXT,    -- for files, inside the study-resources bucket
    file_name TEXT,
    file_size BIGINT,
    file_type TEXT,
    body TEXT,         -- for notes
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Focus timer log: minutes studied, optionally for a group and subject.
CREATE TABLE IF NOT EXISTS public.study_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    minutes INTEGER NOT NULL CHECK (minutes BETWEEN 1 AND 720),
    note TEXT,
    studied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group Q&A board.
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    body TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    accepted_answer_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_accepted_answer_fkey') THEN
        ALTER TABLE public.questions
            ADD CONSTRAINT questions_accepted_answer_fkey
            FOREIGN KEY (accepted_answer_id) REFERENCES public.answers(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_study_sessions_team ON public.study_sessions(team_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_session_rsvps_session ON public.session_rsvps(session_id);
CREATE INDEX IF NOT EXISTS idx_study_resources_team ON public.study_resources(team_id);
CREATE INDEX IF NOT EXISTS idx_study_logs_user ON public.study_logs(user_id, studied_at);
CREATE INDEX IF NOT EXISTS idx_study_logs_team ON public.study_logs(team_id, studied_at);
CREATE INDEX IF NOT EXISTS idx_questions_team ON public.questions(team_id, created_at);
CREATE INDEX IF NOT EXISTS idx_answers_question ON public.answers(question_id);

-- ---------------------------------------------------------------------------
-- Permission helpers (SECURITY DEFINER so policies can call them without
-- recursing through the policies of the tables they read)
-- ---------------------------------------------------------------------------

-- Everyone has the same account: there are no platform admins. Kept only so
-- anything created by older versions of this file still resolves.
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
    SELECT FALSE;
$$;

CREATE OR REPLACE FUNCTION public.is_team_member(team_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = team_uuid AND user_id = auth.uid()
    );
$$;

-- The group's organizers: the person who created it and anyone they promoted.
CREATE OR REPLACE FUNCTION public.is_team_leader_or_admin(team_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = team_uuid AND user_id = auth.uid() AND role IN ('leader', 'admin')
    );
$$;

-- True when the current user and another user are in at least one team together.
CREATE OR REPLACE FUNCTION public.shares_team_with(other_user UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.team_members mine
        JOIN public.team_members theirs ON theirs.team_id = mine.team_id
        WHERE mine.user_id = auth.uid() AND theirs.user_id = other_user
    );
$$;

-- Can the current user see this task (member of its team, or platform admin)?
CREATE OR REPLACE FUNCTION public.can_access_task(task_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_uuid
          AND (public.is_team_member(t.team_id))
    );
$$;

-- Storage paths look like "<task id>/<file>"; check access to that task.
CREATE OR REPLACE FUNCTION public.can_access_task_path(object_path TEXT)
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
    RETURN public.can_access_task(task_uuid);
END;
$$;

-- Storage paths in study-resources look like "<team id>/<file>".
CREATE OR REPLACE FUNCTION public.can_access_team_path(object_path TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
    team_uuid UUID;
BEGIN
    BEGIN
        team_uuid := split_part(object_path, '/', 1)::UUID;
    EXCEPTION WHEN others THEN
        RETURN FALSE;
    END;
    RETURN public.is_team_member(team_uuid);
END;
$$;

CREATE OR REPLACE FUNCTION public.session_team(session_uuid UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT team_id FROM public.study_sessions WHERE id = session_uuid;
$$;

CREATE OR REPLACE FUNCTION public.question_team(question_uuid UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT team_id FROM public.questions WHERE id = question_uuid;
$$;

CREATE OR REPLACE FUNCTION public.current_email()
RETURNS TEXT
LANGUAGE sql STABLE AS $$
    SELECT lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Create the profile when someone signs up. Every account is the same.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, avatar_url, role)
    VALUES (
        NEW.id,
        coalesce(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), split_part(NEW.email, '@', 1)),
        lower(NEW.email),
        coalesce(NEW.raw_user_meta_data ->> 'avatar_url', ''),
        'team_member'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Users may edit their own name and avatar, but not their role or email.
CREATE OR REPLACE FUNCTION public.guard_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    NEW.updated_at := NOW();
    -- Changes from the SQL editor or the service role (auth.uid() is null) pass through.
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;
    IF TG_OP = 'INSERT' THEN
        NEW.role := 'team_member';
    ELSE
        NEW.role := OLD.role;
        NEW.email := OLD.email;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_changes ON public.profiles;
CREATE TRIGGER guard_profile_changes
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_profile_changes();

-- Enforce the review workflow: the task's creator and group leaders manage a
-- task; an assignee who did not create it cannot reassign or move it, and
-- cannot approve (Completed) or request changes on it.
CREATE OR REPLACE FUNCTION public.guard_task_changes()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    NEW.updated_at := NOW();

    -- Group leaders and the person who created the task manage it fully.
    IF auth.uid() IS NULL OR public.is_team_leader_or_admin(OLD.team_id) OR OLD.created_by = auth.uid() THEN
        RETURN NEW;
    END IF;

    -- Everyone else here is the assignee: they work on it and submit it for review.
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
       OR NEW.team_id IS DISTINCT FROM OLD.team_id
       OR NEW.project_id IS DISTINCT FROM OLD.project_id
       OR NEW.parent_task_id IS DISTINCT FROM OLD.parent_task_id
       OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
        RAISE EXCEPTION 'Only the task creator or a group leader can reassign or move this task';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status IN ('Completed', 'Changes Requested') THEN
        RAISE EXCEPTION 'Only the task creator or a group leader can approve it or request changes';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_task_changes ON public.tasks;
CREATE TRIGGER guard_task_changes
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.guard_task_changes();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- Drop every existing policy on these tables so this file is the single source of truth.
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname, tablename FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('profiles', 'teams', 'team_members', 'team_invitations', 'projects', 'tasks',
                            'personal_tasks', 'task_comments', 'task_attachments', 'task_activity', 'notifications',
                            'study_sessions', 'session_rsvps', 'study_resources', 'study_logs', 'questions', 'answers')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Profiles
CREATE POLICY "Profiles are visible to signed-in users"
    ON public.profiles FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can create their own profile"
    ON public.profiles FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

CREATE POLICY "Users update their own profile"
    ON public.profiles FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Teams
CREATE POLICY "Members, creators and admins can view teams"
    ON public.teams FOR SELECT TO authenticated
    USING (public.is_team_member(id) OR created_by = auth.uid());

CREATE POLICY "Signed-in users can create teams"
    ON public.teams FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Team leaders can update the team"
    ON public.teams FOR UPDATE TO authenticated
    USING (created_by = auth.uid() OR public.is_team_leader_or_admin(id));

CREATE POLICY "Group creators can delete the group"
    ON public.teams FOR DELETE TO authenticated
    USING (created_by = auth.uid());

-- Team members
CREATE POLICY "Members can view members of their teams"
    ON public.team_members FOR SELECT TO authenticated
    USING (public.is_team_member(team_id) OR user_id = auth.uid());

-- Members add people as members; organizers can also add organizers. People
-- add themselves as the creator of a new group or by accepting an invitation.
CREATE POLICY "Members add people, users join via creation or invitation"
    ON public.team_members FOR INSERT TO authenticated
    WITH CHECK (
        public.is_team_leader_or_admin(team_id)
        -- any member can add someone as a regular member
        OR (public.is_team_member(team_id) AND role = 'member')
        OR (
            user_id = auth.uid() AND (
                EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.created_by = auth.uid())
                OR EXISTS (
                    SELECT 1 FROM public.team_invitations i
                    WHERE i.team_id = team_members.team_id
                      AND lower(i.email) = public.current_email()
                      AND i.status = 'pending'
                      AND (i.expires_at IS NULL OR i.expires_at > NOW())
                      AND i.role = team_members.role
                )
            )
        )
    );

CREATE POLICY "Leaders can change member roles"
    ON public.team_members FOR UPDATE TO authenticated
    USING (public.is_team_leader_or_admin(team_id));

CREATE POLICY "Leaders remove members, users can leave"
    ON public.team_members FOR DELETE TO authenticated
    USING (public.is_team_leader_or_admin(team_id) OR user_id = auth.uid());

-- Team invitations
CREATE POLICY "Group members and invitees can view invitations"
    ON public.team_invitations FOR SELECT TO authenticated
    USING (public.is_team_member(team_id) OR lower(email) = public.current_email());

CREATE POLICY "Group members can invite people"
    ON public.team_invitations FOR INSERT TO authenticated
    WITH CHECK (
        invited_by = auth.uid()
        AND (public.is_team_leader_or_admin(team_id) OR (public.is_team_member(team_id) AND role = 'member'))
    );

CREATE POLICY "Leaders and invitees can update invitations"
    ON public.team_invitations FOR UPDATE TO authenticated
    USING (public.is_team_leader_or_admin(team_id) OR lower(email) = public.current_email());

CREATE POLICY "Inviters and organizers can cancel invitations"
    ON public.team_invitations FOR DELETE TO authenticated
    USING (invited_by = auth.uid() OR public.is_team_leader_or_admin(team_id));

-- Projects
CREATE POLICY "Team members can view team projects"
    ON public.projects FOR SELECT TO authenticated
    USING (public.is_team_member(team_id));

CREATE POLICY "Group members can create subjects"
    ON public.projects FOR INSERT TO authenticated
    WITH CHECK (
        public.is_team_leader_or_admin(team_id)
        OR (public.is_team_member(team_id) AND created_by = auth.uid())
    );

CREATE POLICY "Creators and leaders can update subjects"
    ON public.projects FOR UPDATE TO authenticated
    USING (created_by = auth.uid() OR public.is_team_leader_or_admin(team_id));

CREATE POLICY "Creators and leaders can delete subjects"
    ON public.projects FOR DELETE TO authenticated
    USING (created_by = auth.uid() OR public.is_team_leader_or_admin(team_id));

-- Tasks
CREATE POLICY "Team members can view team tasks"
    ON public.tasks FOR SELECT TO authenticated
    USING (public.is_team_member(team_id));

-- Leaders create any task; members create tasks assigned to themselves.
-- A task's project must belong to the same team.
CREATE POLICY "Group members create tasks for anyone in the group"
    ON public.tasks FOR INSERT TO authenticated
    WITH CHECK (
        (
            public.is_team_leader_or_admin(team_id)
            OR (public.is_team_member(team_id) AND created_by = auth.uid())
        )
        AND (
            assigned_to IS NULL
            OR EXISTS (SELECT 1 FROM public.team_members m WHERE m.team_id = tasks.team_id AND m.user_id = tasks.assigned_to)
        )
        AND (
            project_id IS NULL
            OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.team_id = tasks.team_id)
        )
    );

CREATE POLICY "Assignees, creators and leaders can update tasks"
    ON public.tasks FOR UPDATE TO authenticated
    USING (assigned_to = auth.uid() OR created_by = auth.uid() OR public.is_team_leader_or_admin(team_id));

CREATE POLICY "Creators and leaders can delete tasks"
    ON public.tasks FOR DELETE TO authenticated
    USING (created_by = auth.uid() OR public.is_team_leader_or_admin(team_id));

-- Personal tasks (private to their owner)
CREATE POLICY "Users view their own personal tasks"
    ON public.personal_tasks FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users create their own personal tasks"
    ON public.personal_tasks FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update their own personal tasks"
    ON public.personal_tasks FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users delete their own personal tasks"
    ON public.personal_tasks FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Task comments
CREATE POLICY "Team members can view task comments"
    ON public.task_comments FOR SELECT TO authenticated
    USING (public.can_access_task(task_id));

CREATE POLICY "Team members can post comments"
    ON public.task_comments FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() AND public.can_access_task(task_id));

-- Task attachments
CREATE POLICY "Team members can view attachments"
    ON public.task_attachments FOR SELECT TO authenticated
    USING (public.can_access_task(task_id));

CREATE POLICY "Team members can add attachments"
    ON public.task_attachments FOR INSERT TO authenticated
    WITH CHECK (uploaded_by = auth.uid() AND public.can_access_task(task_id));

-- Task activity
CREATE POLICY "Team members can view task activity"
    ON public.task_activity FOR SELECT TO authenticated
    USING (public.can_access_task(task_id));

CREATE POLICY "Team members can log task activity"
    ON public.task_activity FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() AND public.can_access_task(task_id));

-- Notifications
CREATE POLICY "Users view their own notifications"
    ON public.notifications FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users update their own notifications"
    ON public.notifications FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users delete their own notifications"
    ON public.notifications FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- You can notify yourself, teammates, or (as admin) anyone.
CREATE POLICY "Users notify themselves and teammates"
    ON public.notifications FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR public.shares_team_with(user_id));

-- Study sessions: any member schedules; creator or leader edits/cancels
CREATE POLICY "Group members can view sessions"
    ON public.study_sessions FOR SELECT TO authenticated
    USING (public.is_team_member(team_id));

CREATE POLICY "Group members can schedule sessions"
    ON public.study_sessions FOR INSERT TO authenticated
    WITH CHECK (public.is_team_member(team_id) AND created_by = auth.uid());

CREATE POLICY "Creators and leaders can update sessions"
    ON public.study_sessions FOR UPDATE TO authenticated
    USING (created_by = auth.uid() OR public.is_team_leader_or_admin(team_id));

CREATE POLICY "Creators and leaders can cancel sessions"
    ON public.study_sessions FOR DELETE TO authenticated
    USING (created_by = auth.uid() OR public.is_team_leader_or_admin(team_id));

-- RSVPs: visible to the group; each person sets only their own
CREATE POLICY "Group members can view RSVPs"
    ON public.session_rsvps FOR SELECT TO authenticated
    USING (public.is_team_member(public.session_team(session_id)));

CREATE POLICY "Members RSVP for themselves"
    ON public.session_rsvps FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() AND public.is_team_member(public.session_team(session_id)));

CREATE POLICY "Members update their own RSVP"
    ON public.session_rsvps FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Members remove their own RSVP"
    ON public.session_rsvps FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Resources: any member shares; uploader or leader removes
CREATE POLICY "Group members can view resources"
    ON public.study_resources FOR SELECT TO authenticated
    USING (public.is_team_member(team_id));

CREATE POLICY "Group members can share resources"
    ON public.study_resources FOR INSERT TO authenticated
    WITH CHECK (public.is_team_member(team_id) AND created_by = auth.uid());

CREATE POLICY "Uploaders and leaders can edit resources"
    ON public.study_resources FOR UPDATE TO authenticated
    USING (created_by = auth.uid() OR public.is_team_leader_or_admin(team_id));

CREATE POLICY "Uploaders and leaders can remove resources"
    ON public.study_resources FOR DELETE TO authenticated
    USING (created_by = auth.uid() OR public.is_team_leader_or_admin(team_id));

-- Focus time: you log your own; groupmates see time logged for their groups
CREATE POLICY "Own logs and group logs are visible"
    ON public.study_logs FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR (team_id IS NOT NULL AND public.is_team_member(team_id)));

CREATE POLICY "Users log their own focus time"
    ON public.study_logs FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() AND (team_id IS NULL OR public.is_team_member(team_id)));

CREATE POLICY "Users delete their own logs"
    ON public.study_logs FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Q&A: any member asks and answers; author or leader edits/removes
CREATE POLICY "Group members can view questions"
    ON public.questions FOR SELECT TO authenticated
    USING (public.is_team_member(team_id));

CREATE POLICY "Group members can ask questions"
    ON public.questions FOR INSERT TO authenticated
    WITH CHECK (public.is_team_member(team_id) AND created_by = auth.uid());

CREATE POLICY "Askers and leaders can update questions"
    ON public.questions FOR UPDATE TO authenticated
    USING (created_by = auth.uid() OR public.is_team_leader_or_admin(team_id));

CREATE POLICY "Askers and leaders can delete questions"
    ON public.questions FOR DELETE TO authenticated
    USING (created_by = auth.uid() OR public.is_team_leader_or_admin(team_id));

CREATE POLICY "Group members can view answers"
    ON public.answers FOR SELECT TO authenticated
    USING (public.is_team_member(public.question_team(question_id)));

CREATE POLICY "Group members can answer"
    ON public.answers FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid() AND public.is_team_member(public.question_team(question_id)));

CREATE POLICY "Authors and leaders can delete answers"
    ON public.answers FOR DELETE TO authenticated
    USING (created_by = auth.uid() OR public.is_team_leader_or_admin(public.question_team(question_id)));

-- ---------------------------------------------------------------------------
-- File storage for task attachments (private bucket, access follows the task)
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Private bucket for shared study files; access follows group membership.
INSERT INTO storage.buckets (id, name, public)
VALUES ('study-resources', 'study-resources', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Group members can read study files" ON storage.objects;
CREATE POLICY "Group members can read study files"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'study-resources' AND public.can_access_team_path(name));

DROP POLICY IF EXISTS "Group members can upload study files" ON storage.objects;
CREATE POLICY "Group members can upload study files"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'study-resources' AND public.can_access_team_path(name));

DROP POLICY IF EXISTS "Uploaders can delete study files" ON storage.objects;
CREATE POLICY "Uploaders can delete study files"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'study-resources' AND owner = auth.uid());

-- Public bucket for brand assets used in emails (the TaskSync logo).
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand', 'brand', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Task members can read attachment files" ON storage.objects;
CREATE POLICY "Task members can read attachment files"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'task-attachments' AND public.can_access_task_path(name));

DROP POLICY IF EXISTS "Task members can upload attachment files" ON storage.objects;
CREATE POLICY "Task members can upload attachment files"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'task-attachments' AND public.can_access_task_path(name));

DROP POLICY IF EXISTS "Uploaders can delete their attachment files" ON storage.objects;
CREATE POLICY "Uploaders can delete their attachment files"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'task-attachments' AND owner = auth.uid());

-- ---------------------------------------------------------------------------
-- Realtime: stream changes on every table the app keeps live
-- ---------------------------------------------------------------------------

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['teams', 'team_members', 'team_invitations', 'projects', 'tasks', 'personal_tasks',
                               'task_comments', 'task_attachments', 'task_activity', 'notifications',
                               'study_sessions', 'session_rsvps', 'study_resources', 'study_logs', 'questions', 'answers']
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
        END IF;
    END LOOP;
END $$;

-- Existing accounts: everyone is a regular member now.
UPDATE public.profiles SET role = 'team_member' WHERE role <> 'team_member';
