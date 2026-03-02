-- Seed Equipment Data (Citywire Studios Inventory)

-- Cameras
INSERT INTO equipment (name, category, total_quantity) VALUES
('Sony FX3', 'Camera', 2),
('Sony FX6', 'Camera', 4);

-- Audio
INSERT INTO equipment (name, category, total_quantity) VALUES
('H6', 'Audio', 1),
('Blue Sennheiser Handheld', 'Audio', 1);

-- Lenses
INSERT INTO equipment (name, category, total_quantity) VALUES
('Sony 70-200', 'Lens', 1),
('Sigma 24-70', 'Lens', 1);

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
