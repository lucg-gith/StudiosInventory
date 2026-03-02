-- ============================================================
-- Citywire Studios Inventory — Full Equipment Seed
-- Run this in Supabase Dashboard > SQL Editor
--
-- This script:
--   1. Deletes ALL existing equipment data (cascades to units,
--      transactions, and maintenance_logs via ON DELETE CASCADE)
--   2. Inserts the complete real inventory (41 types, ~82 units)
--   3. Auto-generates individual unit rows for each equipment type
--
-- ⚠️  Events and user_profiles are NOT affected.
-- ============================================================

-- Step 1: Clear existing equipment (CASCADE handles children)
DELETE FROM equipment;

-- Step 2: Insert all equipment types
INSERT INTO equipment (name, category, total_quantity) VALUES
  -- Camera (6 types, 11 units)
  ('Sony FX3',       'Camera', 2),
  ('Sony FX6',       'Camera', 5),
  ('Sony A6500',     'Camera', 1),
  ('Sony A7S',       'Camera', 1),
  ('Sony A7V',       'Camera', 1),
  ('Sony A7III',     'Camera', 1),

  -- Audio (6 types, 14 units)
  ('Recorder H4',                  'Audio', 1),
  ('Recorder H6',                  'Audio', 1),
  ('Blue Sennheiser Handheld',     'Audio', 1),
  ('XLR Cable',                    'Audio', 4),
  ('Podcast Mic',                  'Audio', 2),
  ('Blue Sennheiser Lavalier Kit', 'Audio', 5),

  -- Lens (7 types, 11 units)
  ('Sony 70-200',    'Lens', 2),
  ('Sigma 24-70',    'Lens', 2),
  ('Tamron 17-28',   'Lens', 1),
  ('Tamron 28-75',   'Lens', 1),
  ('Tamron 70-180',  'Lens', 2),
  ('Sony 18-105',    'Lens', 1),
  ('Canon 70-200',   'Lens', 2),

  -- Tripod (4 types, 9 units)
  ('Tripod Miller',           'Tripod', 4),
  ('Light Tripod Manfrotto',  'Tripod', 2),
  ('Small Tripod',            'Tripod', 1),
  ('Medium Tripod',           'Tripod', 2),

  -- Light (3 types, 5 units)
  ('Godox Light',        'Light', 2),
  ('Godox Umbrella',     'Light', 1),
  ('Aperture Old Light', 'Light', 2),

  -- Extension Cable (3 types, 6 units)
  ('4 Plug Extension Long', 'Extension Cable', 1),
  ('4 Plug Extension',      'Extension Cable', 4),
  ('2 Plug Extension',      'Extension Cable', 1),

  -- Accessories (1 type, 2 units)
  ('Metabones', 'Accessories', 2),

  -- SD Card (3 types, 9 units)
  ('128 Kingston SD Card', 'SD Card', 4),
  ('256 Kingston SD Card', 'SD Card', 2),
  ('128 Sandisk SD Card',  'SD Card', 3),

  -- Batteries (6 types, 15 units)
  ('Big Sony',              'Batteries', 1),
  ('Big Sony Swit',         'Batteries', 3),
  ('Small Sony',            'Batteries', 5),
  ('Sony NP-FZ100 Black',  'Batteries', 4),
  ('Sony NP-FZ100 White',  'Batteries', 1),
  ('Sony NP-FZ100 Brown',  'Batteries', 1),

  -- Case (2 types, 5 units)
  ('Big PeliCase',   'Case', 2),
  ('Small PeliCase', 'Case', 3);

-- Step 3: Auto-generate individual unit rows
DO $$
DECLARE
    equip RECORD;
    i INTEGER;
BEGIN
    FOR equip IN SELECT id, total_quantity FROM equipment LOOP
        FOR i IN 1..equip.total_quantity LOOP
            INSERT INTO equipment_units (equipment_id, unit_number, current_status)
            VALUES (equip.id, 'Unit ' || i, 'available');
        END LOOP;
    END LOOP;
END $$;

-- Verify
SELECT
  count(*) AS equipment_types,
  sum(total_quantity) AS total_units,
  count(DISTINCT category) AS categories
FROM equipment;
