# Citywire Studios Inventory System - Technical Specification

## Project Overview
A professional equipment inventory management system for Citywire Studios built with React 18, TypeScript, Tailwind CSS, and Supabase. Deployed on Vercel with auto-deploy from GitHub.

## Core Features

### 1. Authentication System
- Email/password authentication via Supabase Auth
- User profile management with roles (user/manager)
- Auto-created user profiles on signup
- Session persistence
- Password reset via email (Supabase `resetPasswordForEmail`)
- URL cleanup after auth redirects (strips hash fragments and error params)

**Files:**
- `src/components/auth/AuthForm.tsx` - Login/signup/forgot-password form
- `src/hooks/use-auth.ts` - Authentication hook (signIn, signUp, signOut, resetPassword)

### 2. Equipment Management (Non-Serialized Tracking)
- Equipment grouped by category (Camera, Audio, Lens, Tripod, Light, Extension Cable, Accessories, SD Card, Batteries, Case)
- Each equipment type has multiple individual units
- Real-time availability tracking
- Four unit statuses: `available`, `in_use`, `maintenance`, `broken`
- Full CRUD via Equipment Manager (manager role)

**Files:**
- `src/components/dashboard/EquipmentList.tsx` - Equipment catalog display
- `src/components/equipment-manager/EquipmentManager.tsx` - Add/edit/delete equipment & units
- `src/hooks/use-equipment.ts` - Equipment data management + CRUD mutations

**Database Tables:**
- `equipment` - Equipment types (e.g., "Sony FX3")
- `equipment_units` - Individual units (e.g., "Unit 1", "Unit 2")

### 3. Check-Out/Check-In Flow

#### Check-Out (Single Item)
1. User selects equipment from catalog
2. Specifies quantity needed
3. Selects existing project or creates new one
4. Sets start date + AM/PM, return date + AM/PM
5. Overlap warnings shown if dates conflict with other users
6. System auto-assigns available units
7. Transaction logged as `CHECK_OUT`, units marked `in_use`

#### Check-Out (Equipment Case - Batch)
1. User adds items to "Equipment Case" (soft reservation)
2. Case stored as real-time reservations in DB (visible to other users)
3. User sets dates for the entire case
4. Overlap warnings shown for conflicting bookings
5. All items checked out in one batch operation
6. Case auto-clears after 8 hours if not checked out

#### Check-In
1. User views current gear in "My Gear" card
2. Selects equipment to return (single or bulk)
3. Sets return date + AM/PM
4. Optional: Report maintenance issues with photo
5. Units marked as `available` or `maintenance`
6. Transaction logged as `CHECK_IN`

**Files:**
- `src/components/checkout/CheckOutModal.tsx` - Single-item check-out modal with overlap warnings
- `src/components/checkout/EquipmentCase.tsx` - Batch checkout drawer with date propagation + overlap warnings
- `src/components/dashboard/CheckInModal.tsx` - Single-item check-in modal
- `src/components/dashboard/BulkCheckInModal.tsx` - Bulk return modal
- `src/components/dashboard/CurrentGear.tsx` - User's checked-out equipment
- `src/hooks/use-transactions.ts` - Transaction management

**Database Tables:**
- `events` - Projects/possession windows (start_date, end_date, AM/PM in notes JSON)
- `transactions` - Audit trail (CHECK_OUT/CHECK_IN)

### 4. Equipment Case & Soft Reservations
- Real-time soft locks backed by `reservations` table
- Cross-user visibility via Supabase Realtime subscriptions
- Items in another user's case reduce displayed availability
- Heartbeat extends `expires_at` every 2 minutes while case is active
- Auto-clear after 8 hours with toast notification
- Date-aware: reservations with `start_date`/`end_date` only block availability during that range
- Reservations without dates block immediately (items just added to case)

**Files:**
- `src/hooks/use-reservations.ts` - Reservation CRUD, heartbeat, auto-clear, date updates
- `src/components/checkout/EquipmentCase.tsx` - Case UI drawer

**Database Table:**
- `reservations` - Soft locks with TTL, user_id, equipment_id, quantity, start_date, end_date

### 5. Date-Aware Availability & Overlap Detection
- Future bookings don't block today's availability
- Equipment booked for Mar 18-25 stays "available" until Mar 18
- Overlap detection warns users when their dates conflict with:
  - Other users' active checkouts
  - Other users' dated reservations
- Warnings shown as orange banners (non-blocking, user can proceed)
- Overlap formula: `A_start <= B_end AND A_end >= B_start`

**Files:**
- `src/hooks/use-date-availability.ts` - Central overlap detection + date-aware availability logic
- `src/types/index.ts` - `DateOverlap` interface

### 6. Kits Dashboard (My Gear + Team Kits)
- Horizontal scrollable carousel on the Inventory view
- First card: "My Gear" showing current user's checked-out equipment
- Remaining cards: Team members' kits (other users with checked-out equipment)
- Scroll arrows for navigation
- Grouped by user from `equipmentStatus` data

**Files:**
- `src/components/dashboard/CurrentGear.tsx` - My Gear card
- `src/components/dashboard/TeamKitsCarousel.tsx` - Team kit cards + `groupByUser` helper

### 7. Maintenance Management

#### Reporting
- Flag equipment during check-in or separately
- Description, location, and photo upload
- Supabase Storage for images
- Auto-status change to `maintenance`
- Removed from available stock

#### Manager Portal
- View all maintenance issues (pending/resolved)
- See reporter, description, location, photos
- Mark issues as resolved
- Units returned to `available` when all issues resolved

**Files:**
- `src/components/maintenance/MaintenancePortal.tsx` - Manager view
- Maintenance reporting integrated in `CheckInModal.tsx`

**Database Tables:**
- `maintenance_logs` - Issue tracking with image URLs
- Supabase Storage bucket: `maintenance-images`

### 8. Equipment Status Dashboard
- Real-time overview of all equipment showing availability and current holders
- Color-coded status: green (available), yellow (partial), red (all out)
- Per-equipment breakdown: total, available, in-use, maintenance counts
- Lists users who currently have equipment checked out
- Category ordering: camera, audio, lens, tripod, light, extension cable, accessories, sd card, batteries, case

**Files:**
- `src/components/dashboard/EquipmentStatusDashboard.tsx`
- `src/hooks/use-equipment-status.ts`

### 9. Transaction History
- Complete audit trail of all check-outs/check-ins
- Searchable by equipment, project, or user
- Shows type, equipment, unit, user, project, timestamp
- Limited to last 100 transactions for performance
- User profiles fetched separately (PostgREST FK workaround)

**Files:**
- `src/components/history/TransactionHistory.tsx`

### 10. Dashboard & Navigation
- Four main views: Inventory, Status, History, Maintenance (managers only)
- Header with user info and sign-out
- Tab navigation between views
- Citywire branding (red #A7001E, off-black #1E0F1C)

**Files:**
- `src/components/dashboard/DashboardLayout.tsx`
- `src/App.tsx` - Main application component

## Tech Stack

### Frontend
- **React 18.3.1** - UI framework
- **TypeScript 5.3.3** - Type safety
- **Vite 5.0.12** - Build tool
- **Tailwind CSS 3.4.1** - Styling
- **Shadcn/ui** - Component library (via Radix UI)
- **Lucide React** - Icons

### Backend
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Authentication (email/password + password reset)
  - Real-time subscriptions
  - File storage
  - Row Level Security (RLS)

### Deployment
- **Vercel** - Hosting with auto-deploy from GitHub
- **vercel.json** - SPA rewrite rule for client-side routing

### Key Dependencies
- `@supabase/supabase-js` - Supabase client
- `@radix-ui/*` - Headless UI components
- `class-variance-authority` - Component variants
- `clsx` + `tailwind-merge` - Conditional classes
- `date-fns` - Date formatting

## Database Schema

### Tables

**equipment**
```sql
id: uuid (PK)
name: text (e.g., "Sony FX3")
category: text (e.g., "Camera")
total_quantity: integer
created_at, updated_at: timestamp
```

**equipment_units**
```sql
id: uuid (PK)
equipment_id: uuid (FK -> equipment, CASCADE)
unit_number: text (e.g., "Unit 1")
current_status: enum (available|in_use|maintenance|broken)
created_at, updated_at: timestamp
```

**events**
```sql
id: uuid (PK)
project_name: text
start_date: timestamp
end_date: timestamp (nullable)
created_by: uuid (FK -> auth.users)
notes: text (JSON with start_time_period, end_time_period)
created_at, updated_at: timestamp
```

**transactions**
```sql
id: uuid (PK)
unit_id: uuid (FK -> equipment_units, CASCADE)
user_id: uuid (FK -> auth.users)
event_id: uuid (FK -> events, CASCADE)
type: enum (CHECK_OUT|CHECK_IN)
timestamp: timestamp
notes: text (nullable)
```

**reservations**
```sql
id: uuid (PK)
user_id: uuid (FK -> auth.users)
equipment_id: uuid (FK -> equipment)
quantity: integer
expires_at: timestamp
start_date: timestamp (nullable)
end_date: timestamp (nullable)
created_at: timestamp
UNIQUE(user_id, equipment_id)
```

**maintenance_logs**
```sql
id: uuid (PK)
unit_id: uuid (FK -> equipment_units, CASCADE)
reporter_id: uuid (FK -> auth.users)
description: text
image_url: text (nullable)
location_held: text (nullable)
status: text (default: 'pending')
created_at: timestamp
resolved_at: timestamp (nullable)
```

**user_profiles**
```sql
id: uuid (PK, FK -> auth.users)
email: text
full_name: text (nullable)
role: text (default: 'user')
created_at, updated_at: timestamp
```

### Indexes
```sql
idx_reservations_dates ON reservations(equipment_id, start_date, end_date)
  WHERE start_date IS NOT NULL AND end_date IS NOT NULL
```

## Project Structure

```
StudiosInventory-v01/
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       └── 003_seed_data.sql
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   └── AuthForm.tsx            # Login/signup/forgot-password
│   │   ├── ui/                         # Shadcn components
│   │   │   ├── button.tsx, input.tsx, label.tsx
│   │   │   ├── card.tsx, dialog.tsx, select.tsx
│   │   │   └── toast.tsx, toaster.tsx
│   │   ├── dashboard/
│   │   │   ├── DashboardLayout.tsx     # Main layout
│   │   │   ├── EquipmentList.tsx       # Equipment catalog
│   │   │   ├── CurrentGear.tsx         # My Gear card
│   │   │   ├── TeamKitsCarousel.tsx    # Team kits carousel
│   │   │   ├── EquipmentStatusDashboard.tsx  # Status overview
│   │   │   ├── CheckInModal.tsx        # Return equipment
│   │   │   └── BulkCheckInModal.tsx    # Bulk return
│   │   ├── checkout/
│   │   │   ├── CheckOutModal.tsx       # Single-item checkout + overlap warnings
│   │   │   └── EquipmentCase.tsx       # Batch checkout drawer + overlap warnings
│   │   ├── equipment-manager/
│   │   │   └── EquipmentManager.tsx    # CRUD for equipment & units
│   │   ├── maintenance/
│   │   │   └── MaintenancePortal.tsx   # Manager view
│   │   └── history/
│   │       └── TransactionHistory.tsx  # Audit trail
│   ├── hooks/
│   │   ├── use-auth.ts                 # Authentication + password reset
│   │   ├── use-equipment.ts            # Equipment CRUD
│   │   ├── use-equipment-status.ts     # Status dashboard data
│   │   ├── use-events.ts               # Projects/events
│   │   ├── use-transactions.ts         # Check-out/in
│   │   ├── use-reservations.ts         # Soft reservations + heartbeat + auto-clear
│   │   ├── use-date-availability.ts    # Overlap detection + date-aware availability
│   │   └── use-toast.ts                # Notifications
│   ├── lib/
│   │   ├── supabase.ts                 # Supabase client
│   │   └── utils.ts                    # Helpers
│   ├── types/
│   │   ├── database.ts                 # Supabase types
│   │   └── index.ts                    # App types (DateOverlap, CaseItem, etc.)
│   ├── App.tsx                         # Main app component
│   ├── main.tsx                        # Entry point
│   └── index.css                       # Global styles
├── vercel.json                         # SPA rewrite rule
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── .env.example
```

## Design System

### Citywire Brand Colors
- **Primary Red:** `#A7001E` - CTAs, highlights, branding
- **Off-Black:** `#1E0F1C` - Text, dark UI elements
- **White:** `#FFFFFF` - Backgrounds
- **Black:** `#000000` - Strong contrast

### Typography
- **Headings:** Red Hat Display (400, 600, 700)
- **Body:** Red Hat Text (400, 600, 700)
- **Supplementary:** Inter (400)

### Design Principles
- High-contrast dashboard interface
- Clean, professional aesthetic
- Minimalist with clear hierarchy
- Fully responsive (desktop, tablet, mobile)

## Key Technical Patterns

### PostgREST FK Workaround
`transactions.user_id` references `auth.users(id)`, NOT `user_profiles(id)`. PostgREST cannot auto-detect this indirect relationship, so joins like `.select('*, user_profiles(*)')` silently return null.

**Fix:** Fetch transactions with `.select('*')`, then query `user_profiles` separately by `user_id`. Use `Promise.all()` to parallelize.

Applied in:
- `src/components/history/TransactionHistory.tsx`
- `src/hooks/use-equipment-status.ts`
- `src/hooks/use-date-availability.ts`

### Mutation + Manual Refetch
Supabase Realtime subscriptions are unreliable as the sole UI update mechanism. After every successful mutation, call the fetch function manually:
```typescript
const { error } = await supabase.from('table').insert({...});
if (!error) await fetchData(); // Always refetch after mutation
```

### Date Range Overlap Detection
Two date ranges [A_start, A_end] and [B_start, B_end] overlap when:
```
A_start <= B_end AND A_end >= B_start
```
Implemented in `use-date-availability.ts` with day-level granularity (AM/PM ignored for overlap purposes).

### Reservation Lifecycle
1. User adds item to case -> `upsertReservation()` creates row with `expires_at` (30min TTL)
2. Heartbeat extends `expires_at` every 2 minutes while case has items
3. User sets dates -> `updateReservationDates()` batch-updates all user's reservations
4. Checkout -> `clearMyReservations()` deletes all reservation rows
5. Auto-clear after 8 hours if not checked out

## Security Features

### Row Level Security (RLS)
- All tables protected by RLS policies
- Equipment/units: Viewable by all, editable by authenticated
- Events: Viewable by all, editable by creator
- Transactions: Viewable by all, creatable by authenticated
- Maintenance: Viewable by all, editable by authenticated
- Profiles: Viewable by authenticated, self-editable only
- Reservations: Viewable by all authenticated, editable by owner

### Authentication
- Supabase Auth with email/password
- Password reset via email link
- Session persistence
- Auto-logout on token expiry
- Auth URL fragment cleanup after redirect
- No passwords stored client-side

## Real-Time Features

### Live Updates
- Equipment availability updates via Postgres subscriptions
- Reservation changes sync across all connected users
- Transaction history auto-refreshes
- Equipment status dashboard updates live

### Subscriptions
- `use-equipment.ts` → `equipment` and `equipment_units` changes
- `use-reservations.ts` → `reservations` table changes

## Build & Deployment

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
# Output: dist/ directory
```

### Deployment (Vercel)
1. Push to GitHub (master branch)
2. Vercel auto-deploys from GitHub
3. Environment variables set in Vercel dashboard:
   - `VITE_SUPABASE_URL` - Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
4. `vercel.json` handles SPA routing (all routes -> index.html)

### Supabase Setup
1. Create project on supabase.com
2. Run migration files in SQL Editor (001, 002, 003)
3. Run additional migrations for reservations table
4. Create storage bucket: `maintenance-images` (public)
5. Copy project URL and anon key to environment variables

## Future Enhancements

- QR code scanning for equipment lookup
- Email notifications for overdue returns
- Advanced analytics and reports
- Mobile app (React Native)
- Calendar integration
- Barcode/RFID support
- Export to CSV/Excel
- Equipment usage statistics
- Custom fields per equipment type

## License
Internal use only - Citywire Financial Publishers Ltd.

---

**Last Updated:** 2026-03-06
**Version:** 2.0.0
