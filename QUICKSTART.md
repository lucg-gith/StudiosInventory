# Quick Start Guide - Citywire Studios Inventory

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works fine)

## Setup Instructions

### 1. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be created (takes ~2 minutes)
3. Navigate to **SQL Editor** in the left sidebar
4. Create and run the following migrations in order:

**Migration 1 - Initial Schema:**

- Open [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql)
- Copy all content
- Paste into Supabase SQL Editor
- Click "Run"

**Migration 2 - Row Level Security:**

- Open [supabase/migrations/002_rls_policies.sql](supabase/migrations/002_rls_policies.sql)
- Copy all content
- Paste into Supabase SQL Editor
- Click "Run"

**Migration 3 - Seed Data:**

- Open [supabase/migrations/003_seed_data.sql](supabase/migrations/003_seed_data.sql)
- Copy all content
- Paste into Supabase SQL Editor
- Click "Run"

5. Navigate to **Storage** in the left sidebar
6. Click "Create a new bucket"
7. Name it `maintenance-images`
8. Make it **Public**
9. Click "Save"

### 2. Get Your Supabase Credentials

1. Go to **Settings** → **API** in the left sidebar
2. You'll find two values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (a long JWT token)
3. Keep these handy for the next step

### 3. Configure Environment Variables

1. In the project root, copy the example file:

   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 4. Install Dependencies

```bash
npm install
```

### 5. Run the Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173`

### 6. Create Your First Account

1. Click "Sign Up"
2. Enter your email, password, and full name
3. You'll be automatically logged in

**Note:** If you want to test manager features, you'll need to manually update your user role in Supabase:

1. Go to Supabase → **Table Editor** → **user_profiles**
2. Find your user
3. Change `role` from `user` to `manager`
4. Refresh the app - you'll now see the "Maintenance" tab

## Testing the Features

### Check Out Equipment

1. Browse the equipment catalog
2. Click "Check Out" on any item with available units
3. Select quantity, create or choose a project
4. Click "Check Out"
5. Equipment moves to "My Current Gear"

### Return Equipment

1. Go to "My Current Gear"
2. Click "Return Equipment"
3. Set return date
4. Optionally report a maintenance issue
5. Click "Check In"

### View History

1. Click the "History" tab
2. See all check-outs and check-ins
3. Search by equipment, project, or user

### Maintenance (Managers Only)

1. Update your role to `manager` (see above)
2. Click the "Maintenance" tab
3. View all reported issues
4. Click "Mark as Resolved" when fixed

## Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory.

## Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your repository
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click "Deploy"

## Common Issues

**"Missing Supabase environment variables"**

- Make sure `.env` file exists in project root
- Check that variable names start with `VITE_`
- Restart the dev server after changing `.env`

**Equipment not showing**

- Verify you ran migration #3 (seed data)
- Check Supabase Table Editor → equipment table

**Can't check out equipment**

- Verify you're logged in
- Check that equipment has available units
- Look in browser console for errors

**Images not uploading**

- Verify `maintenance-images` bucket exists
- Check bucket is set to Public
- Ensure file size is under 50MB

## Need Help?

Check the full documentation in [SPEC.md](SPEC.md) for detailed technical information about the system architecture, database schema, and all features.

---

**Enjoy managing your studio equipment!**
