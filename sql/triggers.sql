-- 1. audit_trigger function

CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_entity_id INTEGER;
BEGIN

    IF TG_TABLE_NAME = 'trip' THEN
        IF TG_OP = 'DELETE' THEN
            v_entity_id := OLD.trip_id;
        ELSE
            v_entity_id := NEW.trip_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'vehicle' THEN
        IF TG_OP = 'DELETE' THEN
            v_entity_id := OLD.vehicle_id;
        ELSE
            v_entity_id := NEW.vehicle_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'route_assignment' THEN
        IF TG_OP = 'DELETE' THEN
            v_entity_id := OLD.assignment_id;
        ELSE
            v_entity_id := NEW.assignment_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'incident' THEN
        IF TG_OP = 'DELETE' THEN
            v_entity_id := OLD.incident_id;
        ELSE
            v_entity_id := NEW.incident_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'maintenance_log' THEN
        IF TG_OP = 'DELETE' THEN
            v_entity_id := OLD.maintenance_id;
        ELSE
            v_entity_id := NEW.maintenance_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'trip_stop_event' THEN
        IF TG_OP = 'DELETE' THEN
            v_entity_id := OLD.event_id;
        ELSE
            v_entity_id := NEW.event_id;
        END IF;
    END IF;

    INSERT INTO audit_log (
        entity_name,
        entity_id,
        action,
        changed_by_user_id,
        changed_at,
        before_data,
        after_data
    )
    VALUES (
        TG_TABLE_NAME,
        v_entity_id,
        TG_OP,
        NULL,
        CURRENT_TIMESTAMP,
        to_jsonb(OLD),
        to_jsonb(NEW)
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;

END;
$$;



-- 2. trip trigger

CREATE TRIGGER trip_audit_trigger
AFTER INSERT OR UPDATE OR DELETE
ON trip
FOR EACH ROW
EXECUTE FUNCTION audit_trigger();



-- 3. vehicle trigger

CREATE TRIGGER vehicle_audit_trigger
AFTER INSERT OR UPDATE OR DELETE
ON vehicle
FOR EACH ROW
EXECUTE FUNCTION audit_trigger();



-- 4. route_assignment trigger

CREATE TRIGGER route_assignment_audit_trigger
AFTER INSERT OR UPDATE OR DELETE
ON route_assignment
FOR EACH ROW
EXECUTE FUNCTION audit_trigger();



-- 5. incident trigger

CREATE TRIGGER incident_audit_trigger
AFTER INSERT OR UPDATE OR DELETE
ON incident
FOR EACH ROW
EXECUTE FUNCTION audit_trigger();



-- 6. maintenance_log trigger

CREATE TRIGGER maintenance_log_audit_trigger
AFTER INSERT OR UPDATE OR DELETE
ON maintenance_log
FOR EACH ROW
EXECUTE FUNCTION audit_trigger();



-- 7. trip_stop_event trigger

CREATE TRIGGER trip_stop_event_audit_trigger
AFTER INSERT OR UPDATE OR DELETE
ON trip_stop_event
FOR EACH ROW
EXECUTE FUNCTION audit_trigger();
