-- 1. USERS
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- 2. STAFF
CREATE TABLE staff (
    staff_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    staff_type VARCHAR(50),
    license_no VARCHAR(100) UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);


-- 3. VEHICLE
CREATE TABLE vehicle (
    vehicle_id SERIAL PRIMARY KEY,
    registration_no VARCHAR(50) UNIQUE NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    model VARCHAR(100),
    status VARCHAR(50) NOT NULL,
    fitness_expiry_date DATE,
    insurance_expiry_date DATE
);


-- 4. ROUTE
CREATE TABLE route (
    route_id SERIAL PRIMARY KEY,
    route_code VARCHAR(50) UNIQUE NOT NULL,
    route_name VARCHAR(255) NOT NULL,
    start_point VARCHAR(255) NOT NULL,
    end_point VARCHAR(255) NOT NULL
);


-- 5. STOP
CREATE TABLE stop (
    stop_id SERIAL PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES route(route_id) ON DELETE CASCADE,
    stop_name VARCHAR(255) NOT NULL,
    sequence_no INTEGER NOT NULL CHECK (sequence_no > 0),
    latitude NUMERIC,
    longitude NUMERIC,
    UNIQUE(route_id, sequence_no)
);


-- 6. PASSENGER
CREATE TABLE passenger (
    passenger_id SERIAL PRIMARY KEY,
    passenger_identifier VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    contact_phone VARCHAR(20),
    emergency_contact VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);


-- 7. PASSENGER_ROUTE_MAPPING
CREATE TABLE passenger_route_mapping (
    mapping_id SERIAL PRIMARY KEY,
    passenger_id INTEGER NOT NULL REFERENCES passenger(passenger_id) ON DELETE CASCADE,
    route_id INTEGER NOT NULL REFERENCES route(route_id),
    stop_id INTEGER NOT NULL REFERENCES stop(stop_id),
    shift VARCHAR(50) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE
);


-- 8. ROUTE_ASSIGNMENT
CREATE TABLE route_assignment (
    assignment_id SERIAL PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES route(route_id),
    vehicle_id INTEGER NOT NULL REFERENCES vehicle(vehicle_id),
    driver_staff_id INTEGER NOT NULL REFERENCES staff(staff_id),
    conductor_staff_id INTEGER REFERENCES staff(staff_id),
    effective_from DATE NOT NULL,
    effective_to DATE
);


-- 9. TRIP
CREATE TABLE trip (
    trip_id SERIAL PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES route(route_id),
    vehicle_id INTEGER NOT NULL REFERENCES vehicle(vehicle_id),
    driver_staff_id INTEGER NOT NULL REFERENCES staff(staff_id),
    conductor_staff_id INTEGER REFERENCES staff(staff_id),
    trip_date DATE NOT NULL,
    shift VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,

    actual_start_time TIMESTAMP,
    actual_end_time_claimed TIMESTAMP,
    odometer_start_claimed NUMERIC,
    odometer_end_claimed NUMERIC,

    started_by_user_id INTEGER REFERENCES users(user_id),
    end_requested_by_user_id INTEGER REFERENCES users(user_id),
    end_requested_at TIMESTAMP,

    actual_start_time_verified TIMESTAMP,
    actual_end_time_verified TIMESTAMP,
    odometer_start_verified NUMERIC,
    odometer_end_verified NUMERIC,

    verified_by_user_id INTEGER REFERENCES users(user_id),
    verified_at TIMESTAMP,

    UNIQUE(route_id, trip_date, shift)
);


-- 10. TRIP_STOP_EVENT
CREATE TABLE trip_stop_event (
    event_id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL REFERENCES trip(trip_id) ON DELETE CASCADE,
    stop_id INTEGER NOT NULL REFERENCES stop(stop_id),
    arrived_at TIMESTAMP,
    departed_at TIMESTAMP,
    boarded_count INTEGER NOT NULL CHECK (boarded_count >= 0),
    alighted_count INTEGER NOT NULL CHECK (alighted_count >= 0),
    UNIQUE(trip_id, stop_id)
);


-- 11. INCIDENT
CREATE TABLE incident (
    incident_id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL REFERENCES trip(trip_id) ON DELETE CASCADE,
    severity VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    encountered_by_staff_id INTEGER REFERENCES staff(staff_id),
    encountered_by_full_name VARCHAR(255),
    route_id_snapshot INTEGER,
    route_code_snapshot VARCHAR(50),
    route_name_snapshot VARCHAR(255),
    trip_snapshot JSONB,
    reported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reported_by_user_id INTEGER REFERENCES users(user_id)
);


-- 12. MAINTENANCE_LOG
CREATE TABLE maintenance_log (
    maintenance_id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicle(vehicle_id) ON DELETE CASCADE,
    maintenance_date DATE NOT NULL,
    type VARCHAR(100) NOT NULL,
    cost NUMERIC CHECK (cost >= 0),
    notes TEXT
);


-- 13. AUDIT_LOG
CREATE TABLE audit_log (
    audit_id SERIAL PRIMARY KEY,
    entity_name VARCHAR(100) NOT NULL,
    entity_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL,
    changed_by_user_id INTEGER REFERENCES users(user_id),
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    before_data JSONB,
    after_data JSONB
);
