-- ============================================================
-- Citywire Studios Inventory - Full Database Reset & Seed
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. DROP existing tables (cascade to remove dependencies)
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS maintenance_logs CASCADE;
DROP TABLE IF EXISTS equipment_units CASCADE;
DROP TABLE IF EXISTS units CASCADE;             -- old table name
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS equipment_models CASCADE;  -- old table name
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Drop old types if they exist
DROP TYPE IF EXISTS unit_status CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;

-- Drop old triggers/functions if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- ============================================================
-- 2. CREATE SCHEMA (from 001_initial_schema.sql)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Equipment Categories (Master List)
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    total_quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual Equipment Units
CREATE TYPE unit_status AS ENUM ('available', 'in_use', 'maintenance');

CREATE TABLE equipment_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    unit_number TEXT NOT NULL,
    current_status unit_status DEFAULT 'available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(equipment_id, unit_number)
);

-- Events/Projects (Possession Windows)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_name TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transaction Types
CREATE TYPE transaction_type AS ENUM ('CHECK_OUT', 'CHECK_IN');

-- Transactions (Audit Trail)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES equipment_units(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Maintenance Logs
CREATE TABLE maintenance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES equipment_units(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES auth.users(id),
    description TEXT NOT NULL,
    image_url TEXT,
    location_held TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- User Profiles (Extended user data)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_equipment_units_equipment_id ON equipment_units(equipment_id);
CREATE INDEX idx_equipment_units_status ON equipment_units(current_status);
CREATE INDEX idx_transactions_unit_id ON transactions(unit_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_event_id ON transactions(event_id);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp DESC);
CREATE INDEX idx_maintenance_logs_unit_id ON maintenance_logs(unit_id);
CREATE INDEX idx_maintenance_status ON maintenance_logs(status);
CREATE INDEX idx_events_end_date ON events(end_date);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipment_units_updated_at BEFORE UPDATE ON equipment_units
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 3. RLS POLICIES (from 002_rls_policies.sql)
-- ============================================================

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Equipment: readable by all, editable by authenticated
CREATE POLICY "Equipment viewable by everyone" ON equipment FOR SELECT USING (true);
CREATE POLICY "Equipment editable by authenticated" ON equipment FOR ALL USING (auth.role() = 'authenticated');

-- Equipment Units: same as equipment
CREATE POLICY "Units viewable by everyone" ON equipment_units FOR SELECT USING (true);
CREATE POLICY "Units editable by authenticated" ON equipment_units FOR ALL USING (auth.role() = 'authenticated');

-- Events: viewable by all, creatable by authenticated, editable by creator
CREATE POLICY "Events viewable by everyone" ON events FOR SELECT USING (true);
CREATE POLICY "Events creatable by authenticated" ON events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Events editable by creator" ON events FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Events deletable by creator" ON events FOR DELETE USING (auth.uid() = created_by);

-- Transactions: viewable by all, creatable by authenticated
CREATE POLICY "Transactions viewable by everyone" ON transactions FOR SELECT USING (true);
CREATE POLICY "Transactions creatable by authenticated" ON transactions FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Maintenance: viewable by all, creatable/updatable by authenticated
CREATE POLICY "Maintenance viewable by everyone" ON maintenance_logs FOR SELECT USING (true);
CREATE POLICY "Maintenance creatable by authenticated" ON maintenance_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Maintenance updatable by authenticated" ON maintenance_logs FOR UPDATE USING (auth.role() = 'authenticated');

-- User Profiles: viewable by authenticated, self-editable
CREATE POLICY "Profiles viewable by authenticated" ON user_profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Profiles insertable by system" ON user_profiles FOR INSERT WITH CHECK (true);

-- ============================================================
-- 4. SEED DATA (Citywire Studios full inventory)
-- ============================================================

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

-- Create individual units for each equipment item
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

-- ============================================================
-- 5. CREATE PROFILES FOR EXISTING AUTH USERS
-- ============================================================
-- If you already have users signed up, this creates their profiles
INSERT INTO user_profiles (id, email, full_name)
SELECT id, email, raw_user_meta_data->>'full_name'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Done!
SELECT 'Schema created, RLS applied, and data seeded successfully!' AS status;
