-- Migration: Fix Maintenance Log Update Policy
-- Date: 2025-02-25
-- Description: Restrict maintenance log updates to original reporter only
-- Security Fix: Prevents users from modifying other users' maintenance reports

-- Drop the existing overly-permissive policy
DROP POLICY IF EXISTS "Maintenance updatable by authenticated" ON maintenance_logs;

-- Create new restrictive policy: only the reporter can update their own logs
CREATE POLICY "Maintenance updatable by reporter" ON maintenance_logs
FOR UPDATE
USING (auth.uid() = reporter_id);

-- Note: Users can still:
-- - INSERT new maintenance logs (mark equipment broken)
-- - SELECT all maintenance logs (view history)
-- - Only the original reporter can UPDATE their log
