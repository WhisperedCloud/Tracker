# TaskSync: Group Study Planner

TaskSync helps students study together. A **study group** shares **subjects** (courses, exams, assignments), splits the work into **tasks**, plans **study sessions**, keeps a shared **resources library**, answers each other on a **Q&A board**, and tracks **study hours** with a focus timer. Personal to-dos sit alongside, private to each person.

Built with **React + Vite**, **Tailwind CSS** and **Supabase** (Postgres, Auth, Storage, Realtime, Edge Functions).

---

## 🚀 Features

### Study groups and subjects
- Create a study group and invite classmates by email. People who already have an account join right away; others get an invite email and link.
- Any member can add **subjects** (Course, Exam Prep, Assignment, Project, Revision, Research) and **tasks**, and assign a task to anyone in the group.
- Subject progress is worked out from completed tasks.

### Tasks and review
- `To Do` → `In Progress` → `Under Review` → `Changes Requested` → `Completed` (or `Blocked`).
- Whoever **created** a task, or a group **organizer**, reviews it: approve or request changes with feedback. Someone working on a task they did not create submits it for review. A task you created for yourself you can simply complete.
- Comments, file attachments and an activity history on every task.

### Study sessions
- Any member schedules a session: date, start time, length, place and/or meeting link, agenda, optional subject.
- Members answer **Going / Maybe / Can't**; counts and avatars update live.
- Everyone in the group gets a notification and an email. Sessions appear on the calendar and the dashboard.

### Resources library
- Share **links**, **files** (up to 50 MB, private storage, opened with a short-lived link) and written **notes**, filtered by group, subject and type, with search.

### Focus timer and study hours
- Pomodoro presets (25/5, 50/10, 90/15) or custom lengths. The timer keeps running across pages and reloads, and shows in the header.
- Finished focus blocks are logged automatically; partial blocks with **Stop & log**; time studied elsewhere with **Log time manually**.
- Today, this week, study streak, minutes per subject, and a **group leaderboard** for the last 7 days.

### Q&A board
- Ask the group a question on a subject; anyone answers; the asker or an organizer marks the **best answer**. Filter by unanswered or solved.

### Also included
- Calendar (month, week, day) with tasks, sessions and deadlines; click a day to add a personal task, group task or session.
- Personal tasks (list and board), private to you.
- Live updates for everyone in a group, in-app notifications, and email for the key events.
- Reports with real completion, on-time and throughput numbers.
- Earthy, minimalist design with light and dark modes.

### Everyone is equal
- There are no admin or special accounts. Everyone signs up the same way and can create study groups.
- Inside a group every member can add subjects, tasks, sessions, resources and questions, and invite people. You edit or delete what you created.
- The person who creates a group is its **organizer**: they can remove members and make someone else an organizer too.
- All rules are enforced by the database (row-level security), not just the UI.

---

## 🛠️ Technology Stack

- **Frontend**: React 18 with Vite
- **Language**: JavaScript (ES Modules)
- **Styling**: Tailwind CSS with custom theme design tokens
- **UI Components**: Shadcn UI-inspired modular components
- **Backend & Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth (email + password, email verification, password reset)
- **File storage**: Supabase Storage (private `task-attachments` and `study-resources` buckets, public `brand` bucket for the email logo)
- **Realtime**: Supabase Realtime Channels
- **Visualizations**: Recharts
- **Icons**: Lucide React
- **Deployment**: Vercel configured (`vercel.json`)

---

## 👥 Permissions

Every account is the same. Inside a study group:

| Action | Who |
| --- | --- |
| Create a study group | Anyone (they become its organizer) |
| Invite people | Any member |
| Add subjects, tasks, sessions, resources, questions and answers | Any member |
| Assign a task | Any member, to anyone in the group |
| Approve a task or request changes | The task's creator or an organizer |
| Edit or delete a subject, task, session, resource or question | Its creator or an organizer |
| Remove a member, make someone an organizer | Organizers |
| RSVP to a session, log study time | Each person, for themselves only |

The same rules are enforced in the database (row-level security and triggers), not only in the UI.

---

## 📦 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Connect Supabase

See "Supabase setup" below. The app needs a Supabase project to run.

### 3. Run Local Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## 🗄️ Supabase Setup

The full database setup is in `supabase/schema.sql`: tables, row-level security, triggers, the attachments storage bucket and realtime. The script is safe to re-run, so run it again whenever it changes.

1. Create a project on [Supabase](https://supabase.com).
2. Open **SQL Editor** &rarr; **New query**, paste all of `supabase/schema.sql`, and click **Run**.
3. Copy the **Project URL** and **anon public key** from **Project Settings &rarr; API** into a `.env` file (it is git-ignored):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
4. In **Authentication &rarr; URL Configuration**, set **Site URL** to where the app runs (`http://localhost:5173` locally, your Vercel URL in production) and add both to **Redirect URLs**. Email verification and password-reset links use these.
5. Restart `npm run dev`.

### Inviting people

On a study group's **Members** tab, any member enters an email. If that person already has an account they are added right away and emailed. Otherwise TaskSync creates an invitation and emails them a link. When they sign up with that email, the invitation appears on their **Study Groups** page with Accept and Decline buttons.

---

## ✉️ Email notifications

TaskSync emails people when:

| Event | Who gets the email |
| --- | --- |
| Study group created | The creator (confirmation listing who was added or invited) |
| Member added (has an account) | The added member |
| Invitation (no account yet) | The invited email address, with an Accept link |
| Subject added | Everyone in the group except whoever added it |
| Study session scheduled | Everyone in the group except whoever scheduled it |
| Task assigned or reassigned | The assignee |
| Task submitted for review | The task's creator and the group's organizers |
| Task approved / changes requested | The assignee (with the feedback) |

Emails are sent by the Supabase Edge Function in `supabase/functions/send-email` through Gmail SMTP. The app sends only the event type and record id. The function checks the caller's permission and looks up the recipients itself, so it cannot be used to email arbitrary addresses.

Setup (once):

1. On the sending Gmail account, turn on 2-Step Verification and create an App Password at https://myaccount.google.com/apppasswords.
2. Deploy the function and set its secrets:
```bash
export SUPABASE_ACCESS_TOKEN=...            # Dashboard -> Account -> Access Tokens
npx supabase functions deploy send-email --project-ref <project-ref> --use-api
npx supabase secrets set --project-ref <project-ref> \
  GMAIL_USER=sender@gmail.com GMAIL_APP_PASSWORD='xxxx xxxx xxxx xxxx' APP_URL=http://localhost:5173
```
3. Use the same Gmail account for Supabase Auth's emails (sign-up confirmation, password reset) under **Authentication → Emails → SMTP Settings**: host `smtp.gmail.com`, port `465`. Supabase's built-in mailer only delivers to members of your Supabase organization.

Gmail allows about 500 emails a day. If an email fails, the app shows "Email not sent" but keeps the change.

---

## 🎨 Design system

Earthy and minimalist: brown `#7B3F00` for actions and focus, cream `#F6F1E9` for the page, beige `#D2B48C` for borders and soft accents. Tokens are in `tailwind.config.js`. Tailwind's color names keep their meaning but are redefined as earthy tones (for example `emerald` is moss green for success and `rose` is terracotta for danger), so use the named classes rather than raw hex values.

Shared components in `src/components/ui`:

- `Select`: custom dropdown with keyboard support and type-ahead. Takes the same `<option>` children as a native select.
- `DatePicker`: used automatically by `<Input type="date">`.
- `Modal`: focus is kept inside, Escape closes only the top-most layer, and nested modals work.
- `DialogProvider` / `useDialog()`: `await confirm({...})` and `await alert({...})` in place of the browser dialogs.
- `Button`, `Input`, `Textarea`, `Card`, `Badge`, `Progress`, `Avatar`.

---

## 🚢 Deployment to Vercel

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. Import the project into [Vercel](https://vercel.com).
3. The included `vercel.json` ensures all client-side routes rewrite seamlessly to `/index.html`.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Vercel Environment Variables.
5. Set the function's `APP_URL` secret and Supabase Auth's Site URL to the Vercel URL so links in emails point to the live app.
6. Deploy!
