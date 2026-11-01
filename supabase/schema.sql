-- TaskSync Production PostgreSQL Schema for Supabase
-- Covers all required tables, foreign keys, indexes, triggers, and Row Level Security (RLS) policies.

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'team_member' CHECK (role IN ('admin', 'team_leader', 'team_member')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to create a profile automatically when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, avatar_url, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'team_member')
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Teams Table
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    avatar_url TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Team Members Table
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'leader', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- 5. Team Invitations Table
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

-- 6. Projects Table
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

-- 7. Tasks Table (supports parent_task_id for nested subtasks & review workflow)
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

-- 8. Personal Tasks Table
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

-- 9. Task Comments Table
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Task Attachments Table
CREATE TABLE IF NOT EXISTS public.task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    file_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Task Activity Log Table
CREATE TABLE IF NOT EXISTS public.task_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Notifications Table
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

-- Indexes for lightning fast lookups & Realtime filtering
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_team ON public.projects(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_team ON public.tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_personal_tasks_user ON public.personal_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_task ON public.task_activity(task_id);

-- Enable Row Level Security (RLS) on all tables
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

-- Helper RLS function to check if current user is member of a team
CREATE OR REPLACE FUNCTION public.is_team_member(team_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = team_uuid AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper RLS function to check if current user is leader or admin of a team
CREATE OR REPLACE FUNCTION public.is_team_leader_or_admin(team_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = team_uuid AND user_id = auth.uid() AND role IN ('leader', 'admin')
    ) OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

-- Teams Policies
CREATE POLICY "Users can view teams they belong to"
    ON public.teams FOR SELECT
    TO authenticated
    USING (public.is_team_member(id) OR created_by = auth.uid());

CREATE POLICY "Authenticated users can create teams"
    ON public.teams FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Team leaders and creators can update team"
    ON public.teams FOR UPDATE
    TO authenticated
    USING (created_by = auth.uid() OR public.is_team_leader_or_admin(id));

-- Team Members Policies
CREATE POLICY "Members can view members of their teams"
    ON public.team_members FOR SELECT
    TO authenticated
    USING (public.is_team_member(team_id));

CREATE POLICY "Team leaders can add or invite members"
    ON public.team_members FOR INSERT
    TO authenticated
    WITH CHECK (public.is_team_leader_or_admin(team_id) OR user_id = auth.uid());

CREATE POLICY "Team leaders can remove members or users can leave"
    ON public.team_members FOR DELETE
    TO authenticated
    USING (public.is_team_leader_or_admin(team_id) OR user_id = auth.uid());

-- Team Invitations Policies
CREATE POLICY "View invitations for my teams or matching my email"
    ON public.team_invitations FOR SELECT
    TO authenticated
    USING (
        public.is_team_leader_or_admin(team_id) OR 
        email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Leaders can insert invitations"
    ON public.team_invitations FOR INSERT
    TO authenticated
    WITH CHECK (public.is_team_leader_or_admin(team_id));

CREATE POLICY "Update invitations on accept or reject"
    ON public.team_invitations FOR UPDATE
    TO authenticated
    USING (
        public.is_team_leader_or_admin(team_id) OR 
        email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    );

-- Projects Policies
CREATE POLICY "Team members can view team projects"
    ON public.projects FOR SELECT
    TO authenticated
    USING (public.is_team_member(team_id));

CREATE POLICY "Team leaders can create projects"
    ON public.projects FOR INSERT
    TO authenticated
    WITH CHECK (public.is_team_leader_or_admin(team_id));

CREATE POLICY "Team leaders can update projects"
    ON public.projects FOR UPDATE
    TO authenticated
    USING (public.is_team_leader_or_admin(team_id));

CREATE POLICY "Team leaders can delete projects"
    ON public.projects FOR DELETE
    TO authenticated
    USING (public.is_team_leader_or_admin(team_id));

-- Tasks Policies
CREATE POLICY "Team members can view team tasks"
    ON public.tasks FOR SELECT
    TO authenticated
    USING (public.is_team_member(team_id));

CREATE POLICY "Team leaders can create tasks"
    ON public.tasks FOR INSERT
    TO authenticated
    WITH CHECK (public.is_team_leader_or_admin(team_id));

CREATE POLICY "Assigned members or leaders can update tasks"
    ON public.tasks FOR UPDATE
    TO authenticated
    USING (
        assigned_to = auth.uid() OR 
        public.is_team_leader_or_admin(team_id)
    );

CREATE POLICY "Team leaders can delete tasks"
    ON public.tasks FOR DELETE
    TO authenticated
    USING (public.is_team_leader_or_admin(team_id));

-- Personal Tasks Policies
CREATE POLICY "Users can only view their own personal tasks"
    ON public.personal_tasks FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own personal tasks"
    ON public.personal_tasks FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own personal tasks"
    ON public.personal_tasks FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own personal tasks"
    ON public.personal_tasks FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Task Comments Policies
CREATE POLICY "Team members can view task comments"
    ON public.task_comments FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_comments.task_id AND public.is_team_member(t.team_id)
        )
    );

CREATE POLICY "Team members can post comments"
    ON public.task_comments FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_comments.task_id AND public.is_team_member(t.team_id)
        )
    );

-- Task Attachments Policies
CREATE POLICY "Team members can view attachments"
    ON public.task_attachments FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_attachments.task_id AND public.is_team_member(t.team_id)
        )
    );

CREATE POLICY "Team members can upload attachments"
    ON public.task_attachments FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_attachments.task_id AND public.is_team_member(t.team_id)
        )
    );

-- Task Activity Policies
CREATE POLICY "Team members can view task activity"
    ON public.task_activity FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_activity.task_id AND public.is_team_member(t.team_id)
        )
    );

CREATE POLICY "Team members can insert task activity"
    ON public.task_activity FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_activity.task_id AND public.is_team_member(t.team_id)
        )
    );

-- Notifications Policies
CREATE POLICY "Users can only view their own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications (mark read)"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Authenticated users or system can insert notifications"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Enable Realtime replication on tasks, comments, and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
