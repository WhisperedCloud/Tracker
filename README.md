# TaskSync – Personal & Team Task Management Platform

TaskSync is a modern, responsive web-based SaaS platform that unifies **personal daily task management** with **team-based project and subtask collaboration**.

Built using **React.js (JavaScript) with Vite**, **Tailwind CSS**, **Shadcn-style UI components**, and backed by **Supabase PostgreSQL & Realtime**.

---

## 🚀 Key Features

### 1. Unified Personal & Team Workspaces
- **My Tasks**: Dedicated personal productivity workspace with **List View**, **Kanban Board**, and **Calendar View**. Includes daily productivity metrics (Total, Completed, Pending, Overdue, and Completion Percentage).
- **Team Workspaces**: Multiple team memberships per user, customizable workspace hubs with Team Dashboard, Members, Projects, Tasks, Activity Feed, and Team Velocity Reports.

### 2. Advanced Task Distribution & Hierarchical Subtasks
- **Parent & Subtask Management**: Break down complex project epics into granular subtasks (e.g. Website Development &rarr; UI/UX Design, Frontend, Backend API, Database Integration, Testing & Deployment).
- **Assignee, Deadline & Priority Controls**: Track progress per subtask with start dates, deadlines, and urgency levels.

### 3. Automatic Project Progress Calculation
- Formula:
  $$\text{Project Progress} = \left(\frac{\text{Completed Subtasks}}{\text{Total Subtasks}}\right) \times 100$$
- Modifying project progress manually is locked out—it strictly computes from verified completed subtasks.

### 4. Comprehensive Task Review Workflow
- **State transitions**: `To Do` &rarr; `In Progress` &rarr; `Under Review` &rarr; `Changes Requested` &rarr; `Completed` (or `Blocked`).
- Members submit tasks for review upon completion.
- Team leaders can **Approve** (transitions to Completed with confetti celebration) or **Request Changes** (prompts for feedback comments).

### 5. Smart Team Workload Balancer
- Rule-based bandwidth analyzer displaying:
  - Active assignments per member
  - Overdue task counts
  - Workload tier: **Low Workload**, **Balanced**, **High Workload**, **Overloaded**
  - Next upcoming deadlines
- Automatically recommends the optimal assignee with lowest current active load and zero overdue bottlenecks.
- Leader retains full final assignment authority.

### 6. In-App Notifications & Realtime Collaboration
- Real-time alerts for task assignments, submissions for review, change requests, deadline warnings, and comments.
- Task detail modals featuring comments stream, file attachment uploads, and audit trail activity logs.

### 7. Recharts Analytics & Visual Reports
- Sprint and delivery velocity trends.
- Member workload scorecards.
- Status distribution donut charts and project completion bar charts.

---

## 🛠️ Technology Stack

- **Frontend**: React 18 with Vite
- **Language**: JavaScript (ES Modules)
- **Styling**: Tailwind CSS with custom theme design tokens
- **UI Components**: Shadcn UI-inspired modular components
- **Backend & Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth (with 1-click Demo Role Switcher)
- **Realtime**: Supabase Realtime Channels
- **Visualizations**: Recharts
- **Icons**: Lucide React
- **Deployment**: Vercel configured (`vercel.json`)

---

## 👥 User Roles & Permissions

1. **Admin**:
   - Oversees the complete platform, user directory, teams, and security permissions.
2. **Team Leader**:
   - Creates teams, invites members, allocates projects, breaks down tasks into subtasks, reviews submissions, and approves/requests changes.
3. **Team Member**:
   - Manages personal tasks, executes assigned team subtasks, submits tasks for review, participates in discussions, and tracks productivity.

---

## 📦 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Build for Production
```bash
npm run build
```

---

## 🗄️ Supabase PostgreSQL Setup

The complete production-ready PostgreSQL database schema is provided in `supabase/schema.sql`.

### Setup Steps:
1. Create a free project on [Supabase](https://supabase.com).
2. Go to **SQL Editor** &rarr; **New Query**.
3. Copy and run the entire script from `supabase/schema.sql`.
4. Copy your **Project URL** and **Anon Public Key** from **Project Settings &rarr; API**.
5. Update your `.env` file:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_DEMO_MODE=false
```
6. If no Supabase credentials are configured, TaskSync operates in **Interactive Live Demo Mode** with realistic seed data and localStorage reactivity.

---

## 🚢 Deployment to Vercel

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. Import the project into [Vercel](https://vercel.com).
3. The included `vercel.json` ensures all client-side routes rewrite seamlessly to `/index.html`.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Vercel Environment Variables.
5. Deploy!
