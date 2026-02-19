-- 1. close_trip_verify

CREATE OR REPLACE PROCEDURE close_trip_verify(
    IN p_trip_id INTEGER,
    IN p_verified_by INTEGER,
    IN p_end_time TIMESTAMP,
    IN p_odometer_end NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status VARCHAR(50);
    v_start_odometer NUMERIC;
BEGIN

    SELECT status, odometer_start_verified
    INTO v_status, v_start_odometer
    FROM trip
    WHERE trip_id = p_trip_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trip not found';
    END IF;

    IF v_status <> 'END_REQUESTED' THEN
        RAISE EXCEPTION 'Trip must be END_REQUESTED to verify';
    END IF;

    IF v_start_odometer IS NULL THEN
        RAISE EXCEPTION 'Start odometer not verified';
    END IF;

    UPDATE trip
    SET
        status = 'COMPLETED',
        actual_end_time_verified = p_end_time,
        odometer_end_verified = p_odometer_end,
        verified_by_user_id = p_verified_by,
        verified_at = CURRENT_TIMESTAMP
    WHERE trip_id = p_trip_id;

END;
$$;



-- 2. calculate_trip_distance

CREATE OR REPLACE FUNCTION calculate_trip_distance(
    p_trip_id INTEGER
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    v_distance NUMERIC;
BEGIN

    SELECT
        odometer_end_verified - odometer_start_verified
    INTO v_distance
    FROM trip
    WHERE trip_id = p_trip_id;

    IF v_distance IS NULL THEN
        RAISE EXCEPTION 'Trip not verified or missing odometer values';
    END IF;

    RETURN v_distance;

END;
$$;



-- 3. batch_cancel_old_planned_trips (Cursor + SAVEPOINT)

CREATE OR REPLACE PROCEDURE batch_cancel_old_planned_trips()
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
    trip_cursor CURSOR FOR
        SELECT trip_id
        FROM trip
        WHERE status = 'PLANNED'
        AND trip_date < CURRENT_DATE;
BEGIN

    OPEN trip_cursor;

    LOOP
        FETCH trip_cursor INTO rec;
        EXIT WHEN NOT FOUND;

        BEGIN
            SAVEPOINT sp_cancel;

            UPDATE trip
            SET status = 'CANCELLED'
            WHERE trip_id = rec.trip_id;

        EXCEPTION
            WHEN OTHERS THEN
                ROLLBACK TO SAVEPOINT sp_cancel;
                RAISE NOTICE 'Failed to cancel trip %', rec.trip_id;
        END;

    END LOOP;

    CLOSE trip_cursor;

END;
$$;
