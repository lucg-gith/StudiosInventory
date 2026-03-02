# Citywire Studios Inventory System

A professional equipment inventory management system for Citywire Studios. Built with React 19, TypeScript, Tailwind CSS, and Supabase.

## Overview

This application provides a comprehensive solution for managing studio equipment inventory, tracking gear possession, and logging maintenance issues. The system uses **non-serialized tracking**, meaning users search for equipment types (e.g., "Sony FX3") and the system automatically assigns available units.

## Key Features

### 1. Equipment Management
- **Non-Serialized Tracking**: Search by equipment name, system shows available quantity and assigns units automatically
- **Real-time Availability**: See current stock levels at a glance
- **Unit-Level Tracking**: Each physical item (Unit 1, 2, 3, etc.) tracked individually

### 2. Possession Tracking (Events)
- **Project-Based Events**: Track when gear leaves and returns to the studio
- **Possession Windows**: Record start date (when gear leaves) and end date (when gear returns)
- **On-the-Fly Event Creation**: Create new projects during checkout flow
- **Current Custody Dashboard**: See who has what equipment right now

### 3. Maintenance Management
- **Issue Reporting**: Flag broken or damaged equipment with detailed descriptions
- **Image Upload**: Attach photos of damage via Supabase Storage
- **Location Tracking**: Record where flagged equipment is held (e.g., "Desk 4")
- **Automatic Status Update**: Flagged items removed from available stock
- **Manager Portal**: Dedicated view for reviewing maintenance issues

### 4. User Management
- **Supabase Authentication**: Simple email/password or magic link login
- **Role-Based Access**: Different views for users vs. managers
- **Transaction History**: Complete audit trail of all check-outs and check-ins

## Design Identity

### Citywire Brand Colors
- **Primary Red**: `#A7001E` - Main brand color for CTAs and highlights
- **Off-Black**: `#1E0F1C` - Text and dark UI elements
- **White**: `#FFFFFF` - Backgrounds
- **Black**: `#000000` - Strong contrast elements

### Typography
- **Red Hat Display**: Headings (weights: 400, 600, 700)
- **Red Hat Text**: Body text (weights: 400, 600, 700)
- **Inter**: Secondary/supplementary font (weight: 400)

### Design Principles
- High-contrast, dashboard-style interface
- Clean, professional aesthetic
- Minimalist approach with clear information hierarchy
- Responsive across desktop, tablet, and mobile

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Styling**: Tailwind CSS + Shadcn/ui components
- **Backend**: Supabase (Auth, Database, Storage)
- **Build Tool**: Vite
- **Icons**: Lucide React

## Data Schema

### Equipment
```typescript
{
  id: uuid
  name: string           // e.g., "Sony FX3"
  category: string       // e.g., "Camera", "Audio", "Lighting"
  total_quantity: number
}
```

### Individual Units
```typescript
{
  id: uuid
  equipment_id: uuid     // References equipment
  unit_number: string    // e.g., "Unit 1", "Unit 2"
  current_status: enum   // 'available' | 'in_use' | 'maintenance'
}
```

### Events (Projects)
```typescript
{
  id: uuid
  project_name: string
  start_date: timestamp  // When gear leaves studio
  end_date: timestamp    // When gear returns (or null if ongoing)
}
```

### Transactions (Audit Trail)
```typescript
{
  id: uuid
  unit_id: uuid
  user_id: uuid
  event_id: uuid
  type: enum            // 'CHECK_OUT' | 'CHECK_IN'
  timestamp: timestamp
}
```

### Maintenance Logs
```typescript
{
  id: uuid
  unit_id: uuid
  reporter_id: uuid
  description: text
  image_url: string     // Supabase Storage URL
  location_held: string // e.g., "Desk 4", "Shelf B"
  created_at: timestamp
}
```

## Project Structure

```
StudiosInventory-v01/
├── src/
│   ├── components/
│   │   ├── ui/              # Shadcn/ui reusable components
│   │   ├── dashboard/       # Dashboard components
│   │   ├── checkout/        # Check-out modal and forms
│   │   └── maintenance/     # Maintenance portal components
│   ├── pages/               # Main page components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities and Supabase client
│   ├── types/               # TypeScript type definitions
│   └── styles/              # Global styles
├── public/                  # Static assets
└── supabase/
    └── migrations/          # Database migration files
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   cd StudiosInventory-v01
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run database migrations**

   Use the Supabase CLI or dashboard to run migrations in `/supabase/migrations`

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**

   Navigate to `http://localhost:5173`

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Adding Shadcn/ui Components

This project uses Shadcn/ui for component library. To add new components:

```bash
npx shadcn-ui@latest add [component-name]
```

## Core User Flows

### 1. Check Out Equipment
1. User clicks "Check Out" from dashboard
2. Modal opens with search for equipment
3. System shows available quantity
4. User selects quantity needed
5. User selects existing event or creates new one
6. User sets possession start date
7. System auto-assigns available units
8. Transaction logged, units marked as "in_use"

### 2. Check In Equipment
1. User views "My Current Gear"
2. Clicks "Return" on item
3. Sets return date
4. Option to flag maintenance issues
5. System marks units as "available"
6. Check-in transaction logged

### 3. Report Maintenance Issue
1. User searches for equipment unit
2. Clicks "Report Issue"
3. Enters description
4. Uploads photo (optional)
5. Specifies current location
6. Unit automatically marked as "maintenance"
7. Removed from available stock

### 4. Manager Maintenance Review
1. Manager accesses maintenance portal
2. Views all flagged equipment
3. See photos and descriptions
4. Can update status or assign repairs

## Deployment

### Build for Production
```bash
npm run build
```

The build output will be in the `dist/` directory, ready for deployment to any static hosting service (Vercel, Netlify, etc.).

### Supabase Setup
1. Create a new Supabase project
2. Run the SQL migrations from `/supabase/migrations`
3. Enable Authentication (Email/Password or Magic Link)
4. Set up Storage bucket for maintenance images
5. Configure Row Level Security policies

## Security Considerations

- All database access controlled via Supabase Row Level Security (RLS)
- Authentication required for all operations
- Image uploads validated and size-limited
- Environment variables for sensitive credentials
- No direct database access from frontend

## Future Enhancements

- QR code scanning for quick equipment lookup
- Email notifications for overdue returns
- Equipment reservation system
- Advanced reporting and analytics
- Mobile app version
- Integration with calendar systems
- Barcode/RFID support for serialized tracking

## Support

For issues or questions, contact the Citywire Studios IT team.

## License

Internal use only - Citywire Financial Publishers Ltd.