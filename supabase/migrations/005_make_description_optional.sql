-- Make description optional in maintenance_logs table
-- This allows users to report broken equipment with just a photo or location

ALTER TABLE maintenance_logs
ALTER COLUMN description DROP NOT NULL;
