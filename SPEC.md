# Citywire Studios Inventory System - Technical Specification

## Project Overview
A professional equipment inventory management system for Citywire Studios built with React 18, TypeScript, Tailwind CSS, and Supabase.

## Core Features

### 1. Authentication System
- Email/password authentication via Supabase Auth
- User profile management with roles (user/manager)
- Auto-created user profiles on signup
- Session persistence

**Files:**
- `src/components/auth/AuthForm.tsx` - Login/signup form
- `src/hooks/use-auth.ts` - Authentication hook

### 2. Equipment Management (Non-Serialized Tracking)
- Equipment grouped by category (Camera, Audio, Lighting, Support)
- Each equipment type has multiple individual units
- Real-time availability tracking
- Three unit statuses: `available`, `in_use`, `maintenance`

**Files:**
- `src/components/dashboard/EquipmentList.tsx` - Equipment catalog display
- `src/hooks/use-equipment.ts` - Equipment data management

**Database Tables:**
- `equipment` - Equipment types (e.g., "Sony FX3")
- `equipment_units` - Individual units (e.g., "Unit 1", "Unit 2")

### 3. Check-Out/Check-In Flow

#### Check-Out
1. User selects equipment from catalog
2. Specifies quantity needed
3. Selects existing project or creates new one
4. Sets start date
5. System auto-assigns available units
6. Transaction logged as `CHECK_OUT`
7. Units marked as `in_use`

#### Check-In
1. User views current gear
2. Selects equipment to return
3. Sets return date
4. Optional: Report maintenance issues with photo
5. Units marked as `available` or `maintenance`
6. Transaction logged as `CHECK_IN`

**Files:**
- `src/components/checkout/CheckOutModal.tsx` - Check-out modal
- `src/components/dashboard/CheckInModal.tsx` - Check-in modal
- `src/components/dashboard/CurrentGear.tsx` - User's checked-out equipment
- `src/hooks/use-transactions.ts` - Transaction management

**Database Tables:**
- `events` - Projects/possession windows
- `transactions` - Audit trail (CHECK_OUT/CHECK_IN)

### 4. Maintenance Management

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

### 5. Transaction History
- Complete audit trail of all check-outs/check-ins
- Searchable by equipment, project, or user
- Shows type, equipment, unit, user, project, timestamp
- Limited to last 100 transactions for performance

**Files:**
- `src/components/history/TransactionHistory.tsx`

### 6. Dashboard & Navigation
- Three main views: Inventory, History, Maintenance (managers only)
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
  - Authentication
  - Real-time subscriptions
  - File storage
  - Row Level Security (RLS)

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
equipment_id: uuid (FK → equipment)
unit_number: text (e.g., "Unit 1")
current_status: enum (available|in_use|maintenance)
created_at, updated_at: timestamp
```

**events**
```sql
id: uuid (PK)
project_name: text
start_date: timestamp
end_date: timestamp (nullable)
created_by: uuid (FK → auth.users)
created_at, updated_at: timestamp
```

**transactions**
```sql
id: uuid (PK)
unit_id: uuid (FK → equipment_units)
user_id: uuid (FK → auth.users)
event_id: uuid (FK → events)
type: enum (CHECK_OUT|CHECK_IN)
timestamp: timestamp
notes: text (nullable)
```

**maintenance_logs**
```sql
id: uuid (PK)
unit_id: uuid (FK → equipment_units)
reporter_id: uuid (FK → auth.users)
description: text
image_url: text (nullable)
location_held: text (nullable)
status: text (default: 'pending')
created_at: timestamp
resolved_at: timestamp (nullable)
```

**user_profiles**
```sql
id: uuid (PK, FK → auth.users)
email: text
full_name: text (nullable)
role: text (default: 'user')
created_at, updated_at: timestamp
```

### Seed Data
Sample equipment in categories:
- **Cameras:** Sony FX3, Sony FX6, Canon R5, Blackmagic Pocket 6K
- **Audio:** Rode NTG3, Sennheiser MKE 600, Zoom H6, Wireless Lav Kit
- **Lighting:** Aputure 300d II, Aputure 120d II, Nanlite PavoTube, Godox SL-60W
- **Support:** Manfrotto Tripod, DJI Ronin RS3, Slider, C-Stand

Each equipment has units auto-generated (Unit 1, Unit 2, etc.)

## Project Structure

```
StudiosInventory-v01/
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql      # Database schema
│       ├── 002_rls_policies.sql        # Row Level Security
│       └── 003_seed_data.sql           # Sample equipment
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   └── AuthForm.tsx            # Login/signup
│   │   ├── ui/                         # Shadcn components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── select.tsx
│   │   │   ├── toast.tsx
│   │   │   └── toaster.tsx
│   │   ├── dashboard/
│   │   │   ├── DashboardLayout.tsx     # Main layout
│   │   │   ├── EquipmentList.tsx       # Equipment catalog
│   │   │   ├── CurrentGear.tsx         # User's gear
│   │   │   └── CheckInModal.tsx        # Return equipment
│   │   ├── checkout/
│   │   │   └── CheckOutModal.tsx       # Check out equipment
│   │   ├── maintenance/
│   │   │   └── MaintenancePortal.tsx   # Manager view
│   │   └── history/
│   │       └── TransactionHistory.tsx  # Audit trail
│   ├── hooks/
│   │   ├── use-auth.ts                 # Authentication
│   │   ├── use-equipment.ts            # Equipment data
│   │   ├── use-events.ts               # Projects/events
│   │   ├── use-transactions.ts         # Check-out/in
│   │   └── use-toast.ts                # Notifications
│   ├── lib/
│   │   ├── supabase.ts                 # Supabase client
│   │   └── utils.ts                    # Helpers
│   ├── types/
│   │   ├── database.ts                 # Supabase types
│   │   └── index.ts                    # App types
│   ├── App.tsx                         # Main app component
│   ├── main.tsx                        # Entry point
│   └── index.css                       # Global styles
├── index.html                          # HTML template
├── package.json                        # Dependencies
├── vite.config.ts                      # Vite config
├── tailwind.config.js                  # Tailwind config
├── tsconfig.json                       # TypeScript config
├── .env.example                        # Environment template
└── README.md                           # Documentation
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

## Key User Flows

### First-Time Setup
1. Create Supabase project
2. Run migrations (`001_initial_schema.sql`, `002_rls_policies.sql`, `003_seed_data.sql`)
3. Create storage bucket `maintenance-images` (public read)
4. Copy `.env.example` to `.env` and add Supabase credentials
5. Run `npm install`
6. Run `npm run dev`
7. Create first user account

### Daily Operations

**Check Out Equipment:**
1. Navigate to Inventory tab
2. Search or browse equipment
3. Click "Check Out" on desired item
4. Select quantity, project, and start date
5. Confirm - units auto-assigned and marked in_use

**Return Equipment:**
1. View "My Current Gear" section
2. Click "Return Equipment"
3. Set return date
4. Optionally report issues with photo
5. Confirm - units returned to available or maintenance

**Manager Tasks:**
1. Navigate to Maintenance tab (managers only)
2. Review pending issues with photos/descriptions
3. Mark as resolved when fixed
4. Units automatically return to available

**View History:**
1. Navigate to History tab
2. Search transactions by equipment/project/user
3. See complete audit trail with timestamps

## Environment Variables

Required in `.env` file:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Security Features

### Row Level Security (RLS)
- All tables protected by RLS policies
- Equipment/units: Viewable by all, editable by authenticated
- Events: Viewable by all, editable by creator
- Transactions: Viewable by all, creatable by authenticated
- Maintenance: Viewable by all, editable by authenticated
- Profiles: Viewable by authenticated, self-editable only

### Authentication
- Supabase Auth with email/password
- Session persistence
- Auto-logout on token expiry
- No passwords stored client-side

### Data Validation
- TypeScript type checking
- Form validation on all inputs
- Image upload size limits (handled by Supabase Storage)
- SQL injection prevention (via Supabase client)

## Real-Time Features

### Live Updates
- Equipment availability updates via Postgres subscriptions
- Multiple users see live stock changes
- Transaction history auto-refreshes

### Implemented in:
- `use-equipment.ts` hook subscribes to `equipment` and `equipment_units` changes

## Performance Optimizations

### Data Fetching
- Equipment units joined with equipment in single query
- Transaction history limited to 100 recent entries
- Indexed database columns (equipment_id, unit_id, user_id, etc.)

### Caching
- React state caching for equipment, events, transactions
- Supabase session caching
- Manual refresh triggers when needed

## Future Enhancements

- QR code scanning for equipment lookup
- Email notifications for overdue returns
- Equipment reservation system
- Advanced analytics and reports
- Mobile app (React Native)
- Calendar integration
- Barcode/RFID support
- Export to CSV/Excel
- Equipment usage statistics
- Custom fields per equipment type

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

### Deployment Options
- Vercel (recommended)
- Netlify
- AWS Amplify
- Any static hosting service

### Supabase Setup Steps
1. Create project on supabase.com
2. Go to SQL Editor
3. Run migration files in order (001, 002, 003)
4. Go to Storage
5. Create bucket: `maintenance-images` (public)
6. Go to Settings → API
7. Copy project URL and anon key to `.env`

## Troubleshooting

### Common Issues

**Build fails with TypeScript errors:**
- Run `npm run build` to see specific errors
- Check `tsconfig.json` settings
- Ensure all imports use correct paths

**Authentication not working:**
- Verify `.env` has correct Supabase credentials
- Check Supabase Auth is enabled
- Confirm RLS policies are applied

**Images not uploading:**
- Verify `maintenance-images` bucket exists
- Check bucket is set to public
- Ensure file size is under Supabase limits

**Equipment not showing:**
- Run seed data migration (`003_seed_data.sql`)
- Check RLS policies allow SELECT
- Verify Supabase connection in browser console

## License
Internal use only - Citywire Financial Publishers Ltd.

---

**Last Updated:** 2026-02-11
**Version:** 1.0.0
