# Demo Data Setup Guide

This guide will help you populate the inventory system with demo data to test all features.

## Quick Start

### Step 1: Sign Up
1. Open the app at http://localhost:5174
2. Sign up with your email and password
3. You'll be automatically logged in

### Step 2: Run the Demo Data Seed
```bash
npm run seed-demo
```

This will create:
- **8 equipment types** (cameras, audio, lighting, support gear)
- **20+ equipment units** with unique unit numbers
- **2 sample projects/events** with AM/PM time periods
- **4 checked-out items** assigned to you for testing

## What You Can Test

### ✅ Feature 1: AM/PM Time Tracking
- **My Current Gear**: See equipment checked out with time periods (e.g., "10 Dec (AM)")
- **Check Out**: Click any available equipment → select date + AM/PM dropdown
- **Check In**: Click "Return Equipment" → select return date + AM/PM dropdown

### ✅ Feature 2: Equipment Status Dashboard
- Click the **"Status"** tab in navigation
- See all equipment with:
  - Color-coded availability (green/yellow/red)
  - Available, in-use, and maintenance counts
  - Who currently has checked-out equipment

### ✅ Feature 3: Bulk Return
- Go to **"My Current Gear"** (Inventory tab)
- Check the checkboxes next to multiple equipment groups
- Click **"Return Selected (X)"** button
- Set one return date/time for all selected items
- Confirm to return everything at once

## Sample Data Included

### Equipment Types
1. **Cameras**: Sony FX3, Canon EOS R5
2. **Audio**: Rode NTG3, Sennheiser MKH416
3. **Lighting**: ARRI SkyPanel S60, Aputure 300D
4. **Support**: DJI Ronin RS3, Manfrotto Tripod

### Sample Projects
- "CEO Interview - Q4 2024" (started Dec 10 AM)
- "Product Launch Video" (started Dec 15 PM)

## Resetting Demo Data

If you want to start fresh:

1. Go to your Supabase dashboard
2. Navigate to Table Editor
3. Clear data from these tables (in order):
   - `transactions`
   - `equipment_units`
   - `equipment`
   - `events`
4. Run `npm run seed-demo` again

## Troubleshooting

### "No user logged in" error
- Make sure you're signed up in the app first
- The script needs an authenticated user to create events and transactions

### "Missing Supabase credentials" error
- Check that your `.env` file exists and contains:
  ```
  VITE_SUPABASE_URL=your_url_here
  VITE_SUPABASE_ANON_KEY=your_key_here
  ```

### Equipment appears but nothing is checked out
- The script checks out 4 items to the current user
- Make sure you ran the script while logged in
- Check the "Status" dashboard to see equipment status

## Next Steps

Once demo data is loaded, try:
1. Check out more equipment with different AM/PM times
2. Use bulk return to return multiple items
3. View the Status dashboard to see real-time updates
4. Check the History tab to see transaction logs
