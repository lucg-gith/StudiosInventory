-- Enable Row Level Security on all tables
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Equipment Policies (Read: Everyone, Write: Authenticated)
CREATE POLICY "Equipment viewable by everyone"
    ON equipment FOR SELECT
    USING (true);

CREATE POLICY "Equipment editable by authenticated users"
    ON equipment FOR ALL
    USING (auth.role() = 'authenticated');

-- Equipment Units Policies
CREATE POLICY "Equipment units viewable by everyone"
    ON equipment_units FOR SELECT
    USING (true);

CREATE POLICY "Equipment units editable by authenticated users"
    ON equipment_units FOR ALL
    USING (auth.role() = 'authenticated');

-- Events Policies
CREATE POLICY "Events viewable by everyone"
    ON events FOR SELECT
    USING (true);

CREATE POLICY "Events creatable by authenticated users"
    ON events FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Events editable by creator"
    ON events FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Events deletable by creator"
    ON events FOR DELETE
    USING (auth.uid() = created_by);

-- Transactions Policies
CREATE POLICY "Transactions viewable by everyone"
    ON transactions FOR SELECT
    USING (true);

CREATE POLICY "Transactions creatable by authenticated users"
    ON transactions FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Maintenance Logs Policies
CREATE POLICY "Maintenance logs viewable by everyone"
    ON maintenance_logs FOR SELECT
    USING (true);

CREATE POLICY "Maintenance logs creatable by authenticated users"
    ON maintenance_logs FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Maintenance logs editable by authenticated users"
    ON maintenance_logs FOR UPDATE
    USING (auth.role() = 'authenticated');

-- User Profiles Policies
CREATE POLICY "Profiles viewable by authenticated users"
    ON user_profiles FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id);
