-- 1. v_trip_summary

CREATE OR REPLACE VIEW v_trip_summary AS
SELECT
    t.trip_id,
    t.trip_date,
    t.shift,
    t.status,
    r.route_code,
    r.route_name,
    v.registration_no,
    s.full_name AS driver_name,
    t.actual_start_time_verified,
    t.actual_end_time_verified,
    (t.odometer_end_verified - t.odometer_start_verified) AS distance_travelled
FROM trip t
JOIN route r ON t.route_id = r.route_id
JOIN vehicle v ON t.vehicle_id = v.vehicle_id
JOIN staff s ON t.driver_staff_id = s.staff_id;



-- 2. v_vehicle_utilization

CREATE OR REPLACE VIEW v_vehicle_utilization AS
SELECT
    v.vehicle_id,
    v.registration_no,
    COUNT(t.trip_id) AS total_trips,
    SUM(
        COALESCE(t.odometer_end_verified - t.odometer_start_verified, 0)
    ) AS total_distance,
    MIN(t.trip_date) AS first_trip_date,
    MAX(t.trip_date) AS last_trip_date
FROM vehicle v
LEFT JOIN trip t ON v.vehicle_id = t.vehicle_id
GROUP BY v.vehicle_id, v.registration_no;



-- 3. v_incident_summary

CREATE OR REPLACE VIEW v_incident_summary AS
SELECT
    r.route_code,
    r.route_name,
    i.severity,
    COUNT(i.incident_id) AS incident_count
FROM incident i
JOIN trip t ON i.trip_id = t.trip_id
JOIN route r ON t.route_id = r.route_id
GROUP BY r.route_code, r.route_name, i.severity;
