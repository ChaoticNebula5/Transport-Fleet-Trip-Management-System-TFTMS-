-- Seed admin user for TFTMS
-- Email: hssinghlubana11@gmail.com
-- Password: Admin@321 (bcrypt hashed)
-- This runs AFTER schema.sql via Docker entrypoint ordering

-- Use pgcrypto for bcrypt hashing directly in SQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Core users
INSERT INTO users (email, full_name, password_hash, role, is_active)
VALUES (
    'hssinghlubana11@gmail.com',
    'System Administrator',
    crypt('Admin@321', gen_salt('bf', 12)),
    'ADMIN',
    TRUE
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, full_name, password_hash, role, is_active)
VALUES
    (
        'driver1@tftms.local',
        'Arjun Mehta',
        crypt('Driver@123', gen_salt('bf', 12)),
        'DRIVER',
        TRUE
    ),
    (
        'driver2@tftms.local',
        'Ravi Kumar',
        crypt('Driver@123', gen_salt('bf', 12)),
        'DRIVER',
        TRUE
    ),
    (
        'driver3@tftms.local',
        'Vikram Singh',
        crypt('Driver@123', gen_salt('bf', 12)),
        'DRIVER',
        TRUE
    ),
    (
        'driver4@tftms.local',
        'Aman Gill',
        crypt('Driver@123', gen_salt('bf', 12)),
        'DRIVER',
        TRUE
    ),
    (
        'conductor1@tftms.local',
        'Neha Sharma',
        crypt('Conductor@123', gen_salt('bf', 12)),
        'CONDUCTOR',
        TRUE
    ),
    (
        'conductor2@tftms.local',
        'Pooja Verma',
        crypt('Conductor@123', gen_salt('bf', 12)),
        'CONDUCTOR',
        TRUE
    ),
    (
        'conductor3@tftms.local',
        'Rahul Bansal',
        crypt('Conductor@123', gen_salt('bf', 12)),
        'CONDUCTOR',
        TRUE
    )
ON CONFLICT (email) DO NOTHING;

-- Routes for trip scheduling dropdown
INSERT INTO route (route_code, route_name, start_point, end_point)
VALUES
    ('R-100', 'Central City Loop', 'Central Depot', 'City Center'),
    ('R-200', 'North Connector', 'Central Depot', 'North Terminal'),
    ('R-300', 'Airport Shuttle', 'City Center', 'Airport Terminal'),
    ('R-400', 'Industrial Belt Express', 'Central Depot', 'Industrial Zone'),
    ('R-500', 'University Circular', 'University Campus', 'Central Depot')
ON CONFLICT (route_code) DO NOTHING;

-- Vehicles for trip scheduling dropdown
INSERT INTO vehicle (registration_no, capacity, model, status, fitness_expiry_date, insurance_expiry_date)
VALUES
    ('PB10-FT-1021', 42, 'Tata Starbus', 'ACTIVE', CURRENT_DATE + INTERVAL '365 days', CURRENT_DATE + INTERVAL '365 days'),
    ('PB10-FT-1132', 38, 'Ashok Leyland Cheetah', 'ACTIVE', CURRENT_DATE + INTERVAL '300 days', CURRENT_DATE + INTERVAL '300 days'),
    ('PB10-FT-1243', 40, 'Eicher Skyline', 'ACTIVE', CURRENT_DATE + INTERVAL '280 days', CURRENT_DATE + INTERVAL '280 days'),
    ('PB10-FT-1354', 45, 'Volvo 9600', 'ACTIVE', CURRENT_DATE + INTERVAL '400 days', CURRENT_DATE + INTERVAL '400 days'),
    ('PB10-FT-1465', 36, 'Force Traveller', 'ACTIVE', CURRENT_DATE + INTERVAL '250 days', CURRENT_DATE + INTERVAL '250 days')
ON CONFLICT (registration_no) DO NOTHING;

-- Staff records linked to users for driver/conductor dropdown
INSERT INTO staff (user_id, full_name, phone, staff_type, license_no, is_active)
SELECT u.user_id, u.full_name, '+91-9000000001', 'DRIVER', 'DL-DR-1001', TRUE
FROM users u
WHERE u.email = 'driver1@tftms.local'
  AND NOT EXISTS (SELECT 1 FROM staff s WHERE s.user_id = u.user_id);

INSERT INTO staff (user_id, full_name, phone, staff_type, license_no, is_active)
SELECT u.user_id, u.full_name, '+91-9000000002', 'DRIVER', 'DL-DR-1002', TRUE
FROM users u
WHERE u.email = 'driver2@tftms.local'
  AND NOT EXISTS (SELECT 1 FROM staff s WHERE s.user_id = u.user_id);

INSERT INTO staff (user_id, full_name, phone, staff_type, license_no, is_active)
SELECT u.user_id, u.full_name, '+91-9000000004', 'DRIVER', 'DL-DR-1004', TRUE
FROM users u
WHERE u.email = 'driver3@tftms.local'
    AND NOT EXISTS (SELECT 1 FROM staff s WHERE s.user_id = u.user_id);

INSERT INTO staff (user_id, full_name, phone, staff_type, license_no, is_active)
SELECT u.user_id, u.full_name, '+91-9000000005', 'DRIVER', 'DL-DR-1005', TRUE
FROM users u
WHERE u.email = 'driver4@tftms.local'
    AND NOT EXISTS (SELECT 1 FROM staff s WHERE s.user_id = u.user_id);

INSERT INTO staff (user_id, full_name, phone, staff_type, license_no, is_active)
SELECT u.user_id, u.full_name, '+91-9000000003', 'CONDUCTOR', NULL, TRUE
FROM users u
WHERE u.email = 'conductor1@tftms.local'
  AND NOT EXISTS (SELECT 1 FROM staff s WHERE s.user_id = u.user_id);

INSERT INTO staff (user_id, full_name, phone, staff_type, license_no, is_active)
SELECT u.user_id, u.full_name, '+91-9000000006', 'CONDUCTOR', NULL, TRUE
FROM users u
WHERE u.email = 'conductor2@tftms.local'
    AND NOT EXISTS (SELECT 1 FROM staff s WHERE s.user_id = u.user_id);

INSERT INTO staff (user_id, full_name, phone, staff_type, license_no, is_active)
SELECT u.user_id, u.full_name, '+91-9000000007', 'CONDUCTOR', NULL, TRUE
FROM users u
WHERE u.email = 'conductor3@tftms.local'
    AND NOT EXISTS (SELECT 1 FROM staff s WHERE s.user_id = u.user_id);
