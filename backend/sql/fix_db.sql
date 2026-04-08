-- 1. Add full_name to existing users table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='full_name') THEN
        ALTER TABLE users ADD COLUMN full_name VARCHAR(255) NOT NULL DEFAULT '';
    END IF;
END $$;

-- 2. Seed routes
INSERT INTO route (route_code, route_name, start_point, end_point) VALUES
('R101', 'Downtown Express', 'North Terminal', 'South CBD'),
('R205', 'University Loop', 'Tech Park', 'University Campus'),
('R300', 'Airport Shuttle', 'Central Hub', 'International Airport')
ON CONFLICT (route_code) DO NOTHING;

-- 3. Seed vehicles
INSERT INTO vehicle (registration_no, capacity, model, status) VALUES
('BUS-A01', 50, 'Volvo 9700', 'ACTIVE'),
('BUS-A02', 40, 'Scania Touring', 'ACTIVE'),
('BUS-B15', 30, 'Mercedes-Benz Sprinter', 'ACTIVE')
ON CONFLICT (registration_no) DO NOTHING;

-- 4. Seed basic staff for testing purposes mapped to a fake user or just as staff
INSERT INTO staff (full_name, phone, staff_type, license_no, is_active) VALUES
('John Driver', '555-0101', 'DRIVER', 'DL-12345', TRUE),
('Sarah Driver', '555-0102', 'DRIVER', 'DL-67890', TRUE),
('Mike Conductor', '555-0103', 'CONDUCTOR', 'C-1001', TRUE),
('Lisa Conductor', '555-0104', 'CONDUCTOR', 'C-1002', TRUE)
ON CONFLICT (license_no) DO NOTHING;
