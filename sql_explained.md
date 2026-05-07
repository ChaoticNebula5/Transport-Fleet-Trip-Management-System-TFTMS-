# TFTMS — Complete SQL Folder Explained

> This document covers **every table, trigger, procedure, function, view, and seed record** in `backend/sql/`, explaining *what* it does, *why* it exists, and *how* the pieces connect.

---

## Execution Order

When Docker starts Postgres, the init scripts run in this order:

```
schema.sql → seed.sql → triggers.sql → procedures.sql → views.sql
```

1. **schema.sql** — Creates all 13 tables (the skeleton)
2. **seed.sql** — Inserts demo users, vehicles, routes, and staff (the initial data)
3. **triggers.sql** — Attaches automatic audit logging to 6 tables
4. **procedures.sql** — Creates reusable business-logic routines
5. **views.sql** — Creates 3 pre-built "virtual tables" for reporting

---

## Part 1: Tables (schema.sql)

### The Big Picture

```
users ─────────┬──── staff (driver/conductor profiles)
               │
               └──── trip (who started / verified it)
                       ├── trip_stop_event (boarding at each stop)
                       └── incident (breakdowns, accidents)

route ──── stop (ordered list of stops on a route)
  │
  ├── passenger_route_mapping (which passenger boards where)
  ├── route_assignment (which vehicle+crew runs this route)
  └── trip (a specific run of the route)

vehicle ──── maintenance_log (service history)
          └── trip

audit_log (auto-filled by triggers — never written to directly by app code)
```

---

### Table 1: `users` ✅ ACTIVELY USED

> **Implementation Status:** Fully used — API endpoints for login/register, JWT auth, role-based access control. Frontend login page, admin panel, driver/conductor dashboards all hit this table.

| Column | Type | Purpose |
|---|---|---|
| `user_id` | SERIAL PK | Auto-incrementing ID |
| `email` | VARCHAR(255) UNIQUE | Login identifier |
| `full_name` | VARCHAR(255) | Display name |
| `password_hash` | TEXT | bcrypt hash (never plain text) |
| `role` | VARCHAR(50) | `ADMIN`, `DRIVER`, or `CONDUCTOR` |
| `is_active` | BOOLEAN | Soft-delete flag |
| `created_at` | TIMESTAMP | Auto-set on creation |

**Why it exists:** Every person who logs into the system is a `user`. The `role` field controls what they can see/do in the frontend. Drivers and conductors have limited access; admins can manage everything.

**Key idea:** `users` is the **authentication** table. It stores login credentials. The `staff` table (below) stores the **operational profile** of a driver/conductor, and links back here via `user_id`.

---

### Table 2: `staff` ✅ ACTIVELY USED (no dedicated CRUD)

> **Implementation Status:** Fully used in business logic — staff records are queried during trip creation (driver/conductor dropdowns via `GET /trips/lookup/staff`), trip start/end validation, and incident reporting. However, there is **no dedicated Staff management page** in the frontend. Staff rows are auto-created by the `lookup_staff` endpoint when a user with role DRIVER/CONDUCTOR exists but has no staff record yet (backfill pattern). No separate staff CRUD UI.

| Column | Type | Purpose |
|---|---|---|
| `staff_id` | SERIAL PK | Auto-incrementing ID |
| `user_id` | FK → users | Links to the login account |
| `full_name` | VARCHAR(255) | Name (denormalized for convenience) |
| `phone` | VARCHAR(20) | Contact number |
| `staff_type` | VARCHAR(50) | `DRIVER` or `CONDUCTOR` |
| `license_no` | VARCHAR(100) UNIQUE | Driving license (only for drivers) |
| `is_active` | BOOLEAN | Soft-delete flag |

**Why it exists:** Separates *login identity* (users) from *operational identity* (staff). A user might exist without being staff (e.g., an admin). Staff records hold transport-specific info like license numbers and phone numbers.

**Key idea:** `staff.user_id` → `users.user_id` is a **one-to-one** relationship. When a trip is created, you assign `driver_staff_id` and `conductor_staff_id` from this table.

---

### Table 3: `vehicle` ⚠️ NO DEDICATED CRUD

> **Implementation Status:** ⚠️ Vehicle data is **read** in multiple places — trip creation dropdown (`GET /trips/lookup/vehicles`), `v_vehicle_utilization` view for reports, incident snapshots, and dashboard stats. However, there is **no Vehicle management page** in the frontend and **no CRUD API endpoints** (no create/update/delete vehicle). Vehicles exist only via seed data. To add/edit vehicles you'd need direct DB access.

| Column | Type | Purpose |
|---|---|---|
| `vehicle_id` | SERIAL PK | Auto-incrementing ID |
| `registration_no` | VARCHAR(50) UNIQUE | License plate (e.g., `PB10-FT-1021`) |
| `capacity` | INTEGER, CHECK > 0 | Max passengers |
| `model` | VARCHAR(100) | Bus model name |
| `status` | VARCHAR(50) | `ACTIVE`, `UNDER_MAINTENANCE`, etc. |
| `fitness_expiry_date` | DATE | Government fitness certificate expiry |
| `insurance_expiry_date` | DATE | Insurance policy expiry |

**Why it exists:** Tracks the fleet. You can't schedule a trip without assigning a vehicle.

**Key constraints:**
- `capacity > 0` — Can't have a zero-capacity vehicle
- `registration_no UNIQUE` — No duplicate plates

---

### Table 4: `route` ⚠️ NO DEDICATED CRUD

> **Implementation Status:** ⚠️ Route data is **read** in multiple places — trip creation dropdown (`GET /trips/lookup/routes`), all 3 reporting views, and incident snapshots. However, there is **no Route management page** in the frontend and **no CRUD API endpoints** (no create/update/delete route). Routes exist only via seed data. Like vehicles, adding/editing routes requires direct DB access.

| Column | Type | Purpose |
|---|---|---|
| `route_id` | SERIAL PK | Auto-incrementing ID |
| `route_code` | VARCHAR(50) UNIQUE | Short code like `R-100` |
| `route_name` | VARCHAR(255) | Human name like "Central City Loop" |
| `start_point` | VARCHAR(255) | Where the route begins |
| `end_point` | VARCHAR(255) | Where the route ends |

**Why it exists:** Defines the path a bus follows. Every trip runs on a specific route.

---

### Table 5: `stop` ⚠️ BACKEND-ONLY

> **Implementation Status:** ⚠️ The `stop` table is referenced by the backend stop-event endpoint (`POST /{trip_id}/stops/{stop_id}`), which validates that a stop belongs to the trip's route. However, **there is no frontend UI** to manage stops (no CRUD page) and **no frontend button** to record stop events. Stops exist only via direct DB inserts — no seed data for stops is provided either.

| Column | Type | Purpose |
|---|---|---|
| `stop_id` | SERIAL PK | Auto-incrementing ID |
| `route_id` | FK → route (CASCADE) | Which route this stop belongs to |
| `stop_name` | VARCHAR(255) | Name of the stop |
| `sequence_no` | INTEGER, CHECK > 0 | Order on the route (1st stop, 2nd stop...) |
| `latitude` | NUMERIC | GPS coordinate |
| `longitude` | NUMERIC | GPS coordinate |

**Key constraint:** `UNIQUE(route_id, sequence_no)` — No two stops can have the same position on the same route.

**Why it exists:** A route is made up of ordered stops. During a trip, the system records boarding/alighting at each stop via `trip_stop_event`.

**CASCADE:** If a route is deleted, all its stops are automatically deleted too.

---

### Table 6: `passenger` ⚠️ NOT IMPLEMENTED

> **Implementation Status:** ❌ **Schema + ORM model exist, but NO API endpoint, NO router, NO frontend page, and NO seed data.** The `Passenger` SQLAlchemy model is defined in `models/passenger.py` and imported in `models/__init__.py`, but nothing in the app ever queries or writes to this table. It's a planned feature for passenger registration that was never built.

| Column | Type | Purpose |
|---|---|---|
| `passenger_id` | SERIAL PK | Auto-incrementing ID |
| `passenger_identifier` | VARCHAR(100) UNIQUE | ID card / enrollment number |
| `full_name` | VARCHAR(255) | Name |
| `category` | VARCHAR(100) | `STUDENT`, `EMPLOYEE`, etc. |
| `contact_phone` | VARCHAR(20) | Phone |
| `emergency_contact` | VARCHAR(20) | Emergency phone |
| `is_active` | BOOLEAN | Soft-delete flag |

**Why it exists:** Registers people who ride the buses. They are NOT users (they don't log in). They are mapped to routes via the next table.

---

### Table 7: `passenger_route_mapping` ⚠️ NOT IMPLEMENTED

> **Implementation Status:** ❌ **Schema + ORM model exist, but NO API endpoint, NO router, NO frontend page, and NO seed data.** Same as `passenger` — the `PassengerRouteMapping` model is defined but never used anywhere in the application. This was planned to map passengers to their boarding stops/routes/shifts.

| Column | Type | Purpose |
|---|---|---|
| `mapping_id` | SERIAL PK | Auto-incrementing ID |
| `passenger_id` | FK → passenger (CASCADE) | Which passenger |
| `route_id` | FK → route | Which route they take |
| `stop_id` | FK → stop | Which stop they board at |
| `shift` | VARCHAR(50) | `MORNING`, `EVENING`, etc. |
| `effective_from` | DATE | When this assignment starts |
| `effective_to` | DATE (nullable) | When it ends (NULL = still active) |

**Why it exists:** Maps "Passenger X boards at Stop Y on Route Z during the morning shift." This is how the system knows expected ridership.

---

### Table 8: `route_assignment` ⚠️ NOT IMPLEMENTED

> **Implementation Status:** ❌ **Schema + ORM model exist, but NO API endpoint, NO router, and NO frontend page.** The `RouteAssignment` model is defined and imported, but there is no endpoint to create or query assignments. Trips are scheduled manually by selecting vehicle/driver directly instead of auto-filling from assignments. The audit trigger IS attached to this table though — so if rows were ever inserted, they would be logged.

| Column | Type | Purpose |
|---|---|---|
| `assignment_id` | SERIAL PK | Auto-incrementing ID |
| `route_id` | FK → route | Which route |
| `vehicle_id` | FK → vehicle | Which bus |
| `driver_staff_id` | FK → staff | Which driver |
| `conductor_staff_id` | FK → staff (nullable) | Which conductor |
| `effective_from` | DATE | Start date |
| `effective_to` | DATE (nullable) | End date |

**Why it exists:** This is the **scheduling** table. It says "Vehicle X with Driver Y runs Route Z from this date." When a trip is created, the system can auto-fill vehicle/driver from this table.

---

### Table 9: `trip` ⭐ (The Core Table) ✅ ACTIVELY USED

> **Implementation Status:** Fully used — this is the heart of the system. API endpoints handle the full lifecycle (create/start/end-request/verify). The `close_trip_verify` procedure operates on this table. All 3 views query it. Audit triggers log every change.

| Column | Type | Purpose |
|---|---|---|
| `trip_id` | SERIAL PK | Auto-incrementing ID |
| `route_id` | FK → route | Which route |
| `vehicle_id` | FK → vehicle | Which bus |
| `driver_staff_id` | FK → staff | Which driver |
| `conductor_staff_id` | FK → staff | Which conductor |
| `trip_date` | DATE | Date of trip |
| `shift` | VARCHAR(50) | `MORNING` / `EVENING` |
| `status` | VARCHAR(50) | See lifecycle below |
| **Claimed values** | | |
| `actual_start_time` | TIMESTAMP | Driver claims "I started at X" |
| `actual_end_time_claimed` | TIMESTAMP | Driver claims "I ended at X" |
| `odometer_start_claimed` | NUMERIC | Driver claims start odometer |
| `odometer_end_claimed` | NUMERIC | Driver claims end odometer |
| `started_by_user_id` | FK → users | Who pressed "Start Trip" |
| `end_requested_by_user_id` | FK → users | Who pressed "End Trip" |
| `end_requested_at` | TIMESTAMP | When end was requested |
| **Verified values** | | |
| `actual_start_time_verified` | TIMESTAMP | Admin-verified start time |
| `actual_end_time_verified` | TIMESTAMP | Admin-verified end time |
| `odometer_start_verified` | NUMERIC | Admin-verified start odometer |
| `odometer_end_verified` | NUMERIC | Admin-verified end odometer |
| `verified_by_user_id` | FK → users | Which admin verified |
| `verified_at` | TIMESTAMP | When verification happened |

**Key constraint:** `UNIQUE(route_id, trip_date, shift)` — Only one trip per route per shift per day.

**Trip Status Lifecycle:**

```
PLANNED → IN_PROGRESS → END_REQUESTED → COMPLETED
                                      → CANCELLED
```

1. **PLANNED** — Admin schedules the trip
2. **IN_PROGRESS** — Driver starts the trip (fills claimed start time + odometer)
3. **END_REQUESTED** — Driver finishes and requests closure (fills claimed end time + odometer)
4. **COMPLETED** — Admin verifies and closes (fills verified values via `close_trip_verify` procedure)
5. **CANCELLED** — Trip was called off

**Why claimed vs verified?** This is a **two-step verification** system. The driver reports their readings, then an admin independently verifies them. This prevents odometer fraud and time manipulation.

---

### Table 10: `trip_stop_event` ⚠️ BACKEND-ONLY

> **Implementation Status:** ⚠️ The backend endpoint `POST /{trip_id}/stops/{stop_id}` exists and works, but there is **NO button, form, or UI in the frontend** to call it. The frontend only *displays* aggregated stop data (`stop_count`, `total_boarded`) in the Reports page, which comes from the reports API — not from this endpoint. You can only record stop events via Postman/curl, not through the app. Audit trigger is attached.

| Column | Type | Purpose |
|---|---|---|
| `event_id` | SERIAL PK | Auto-incrementing ID |
| `trip_id` | FK → trip (CASCADE) | Which trip |
| `stop_id` | FK → stop | Which stop |
| `arrived_at` | TIMESTAMP | When bus arrived |
| `departed_at` | TIMESTAMP | When bus left |
| `boarded_count` | INTEGER, CHECK ≥ 0 | Passengers who got on |
| `alighted_count` | INTEGER, CHECK ≥ 0 | Passengers who got off |

**Key constraint:** `UNIQUE(trip_id, stop_id)` — Each stop is visited once per trip.

**Why it exists:** Granular tracking of what happened at every stop during a trip. Used to calculate ridership, identify busy stops, and track punctuality.

---

### Table 11: `incident` ✅ ACTIVELY USED

> **Implementation Status:** Used via `POST /{trip_id}/incident` endpoint and `v_incident_summary` view in the reports API. Drivers/conductors can report incidents during a trip, and the admin dashboard shows incident analytics.

| Column | Type | Purpose |
|---|---|---|
| `incident_id` | SERIAL PK | Auto-incrementing ID |
| `trip_id` | FK → trip (CASCADE) | Which trip |
| `severity` | VARCHAR(50) | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `category` | VARCHAR(100) | `BREAKDOWN`, `ACCIDENT`, etc. |
| `description` | TEXT | What happened |
| `encountered_by_staff_id` | FK → staff | Who reported it |
| `encountered_by_full_name` | VARCHAR(255) | Denormalized name |
| `route_id_snapshot` | INTEGER | Route ID at time of incident |
| `route_code_snapshot` | VARCHAR(50) | Route code at time of incident |
| `route_name_snapshot` | VARCHAR(255) | Route name at time of incident |
| `trip_snapshot` | JSONB | Full trip state frozen as JSON |
| `reported_at` | TIMESTAMP | When reported |
| `reported_by_user_id` | FK → users | Which user submitted it |

**Why snapshots?** If you later edit the route name or trip details, the incident record still shows the *original* data at the time of the incident. This is critical for legal/audit purposes. The `JSONB trip_snapshot` captures the entire trip row as a JSON object.

---

### Table 12: `maintenance_log` ⚠️ PARTIALLY IMPLEMENTED

> **Implementation Status:** ⚠️ **Schema + ORM model + audit trigger exist, but NO dedicated API endpoint and NO frontend page.** The table is created, the audit trigger is attached (so any changes would be logged), but there's no way to add or view maintenance records through the app. It would need a CRUD router to be functional.

| Column | Type | Purpose |
|---|---|---|
| `maintenance_id` | SERIAL PK | Auto-incrementing ID |
| `vehicle_id` | FK → vehicle (CASCADE) | Which vehicle |
| `maintenance_date` | DATE | When serviced |
| `type` | VARCHAR(100) | `OIL_CHANGE`, `TYRE_REPLACEMENT`, etc. |
| `cost` | NUMERIC, CHECK ≥ 0 | Cost of service |
| `notes` | TEXT | Details |

**Why it exists:** Service history for each vehicle. Helps track expenses and schedule preventive maintenance.

---

### Table 13: `audit_log` ✅ ACTIVELY USED (via triggers)

> **Implementation Status:** The table itself is fully used — it gets auto-populated by the 6 audit triggers on every INSERT/UPDATE/DELETE. However, there is **NO API endpoint to read/query** audit logs from the frontend. The data is there in the DB but can only be accessed via direct SQL queries, not through the app UI.

| Column | Type | Purpose |
|---|---|---|
| `audit_id` | SERIAL PK | Auto-incrementing ID |
| `entity_name` | VARCHAR(100) | Table name (e.g., `trip`) |
| `entity_id` | INTEGER | PK of the affected row |
| `action` | VARCHAR(50) | `INSERT`, `UPDATE`, or `DELETE` |
| `changed_by_user_id` | FK → users (nullable) | Who did it |
| `changed_at` | TIMESTAMP | When |
| `before_data` | JSONB | Row state BEFORE the change |
| `after_data` | JSONB | Row state AFTER the change |

**Why it exists:** This table is **never written to by application code**. It's populated automatically by **triggers**. Every change to critical tables is logged here for accountability.

---

## Part 2: Seed Data (seed.sql)

### What It Does

Populates the database with demo data so the app works immediately after setup.

### Step-by-step Flow:

1. **Enable pgcrypto** — `CREATE EXTENSION IF NOT EXISTS pgcrypto;` adds bcrypt hashing support directly in SQL.

2. **Create Admin User** — Inserts admin with email `hssinghlubana11@gmail.com`, password `Admin@321` (bcrypt-hashed). `ON CONFLICT DO NOTHING` makes it safe to re-run.

3. **Create Driver Users (4)** — `driver1@tftms.local` through `driver4@tftms.local`, all with password `Driver@123`.

4. **Create Conductor Users (3)** — `conductor1@tftms.local` through `conductor3@tftms.local`, all with password `Conductor@123`.

5. **Create Routes (5)** — R-100 through R-500 (Central City Loop, North Connector, Airport Shuttle, Industrial Belt Express, University Circular).

6. **Create Vehicles (5)** — Five buses with Punjab registration plates, different models and capacities (36–45 seats). All `ACTIVE` with future fitness/insurance dates.

7. **Create Staff Records (7)** — Links each driver/conductor user to a `staff` record. Uses a `SELECT ... FROM users WHERE email = '...'` subquery to dynamically grab the `user_id`. The `NOT EXISTS` check prevents duplicate staff rows.

**Key pattern in staff inserts:**
```sql
INSERT INTO staff (user_id, full_name, phone, staff_type, license_no, is_active)
SELECT u.user_id, u.full_name, '+91-9000000001', 'DRIVER', 'DL-DR-1001', TRUE
FROM users u
WHERE u.email = 'driver1@tftms.local'
  AND NOT EXISTS (SELECT 1 FROM staff s WHERE s.user_id = u.user_id);
```
This is an **INSERT-SELECT** pattern — it reads from `users` and inserts into `staff` in one statement. The `NOT EXISTS` subquery acts as an idempotency guard.

---

## Part 3: Triggers (triggers.sql)

### The Audit Trigger Function

One **generic trigger function** (`audit_trigger()`) handles all 6 tables. Here's how it works:

```
Any INSERT/UPDATE/DELETE on a watched table
        ↓
    audit_trigger() fires
        ↓
    Detects which table (TG_TABLE_NAME)
        ↓
    Extracts the entity PK (trip_id, vehicle_id, etc.)
        ↓
    Inserts a row into audit_log with:
      - entity_name = table name
      - entity_id = primary key value
      - action = INSERT / UPDATE / DELETE
      - before_data = to_jsonb(OLD)  ← row before change
      - after_data = to_jsonb(NEW)   ← row after change
        ↓
    Returns NEW (for INSERT/UPDATE) or OLD (for DELETE)
```

### Special Variables Used:
- `TG_TABLE_NAME` — Postgres provides this automatically; it's the name of the table that fired the trigger
- `TG_OP` — The operation type (`INSERT`, `UPDATE`, `DELETE`)
- `OLD` — The row *before* the change (NULL for INSERT)
- `NEW` — The row *after* the change (NULL for DELETE)
- `to_jsonb()` — Converts a row record into a JSON object

### Tables with Triggers Attached:

| # | Table | Trigger Name |
|---|---|---|
| 1 | `trip` | `trip_audit_trigger` |
| 2 | `vehicle` | `vehicle_audit_trigger` |
| 3 | `route_assignment` | `route_assignment_audit_trigger` |
| 4 | `incident` | `incident_audit_trigger` |
| 5 | `maintenance_log` | `maintenance_log_audit_trigger` |
| 6 | `trip_stop_event` | `trip_stop_event_audit_trigger` |

All triggers fire **AFTER** the operation, on **EACH ROW**.

### Example Flow:
```
Admin updates trip status from PLANNED → IN_PROGRESS
    ↓
trip_audit_trigger fires
    ↓
audit_trigger() runs:
  - TG_TABLE_NAME = 'trip'
  - TG_OP = 'UPDATE'
  - v_entity_id = NEW.trip_id
  - before_data = {"status": "PLANNED", ...}
  - after_data = {"status": "IN_PROGRESS", ...}
    ↓
Row inserted into audit_log automatically
```

---

## Part 4: Procedures & Functions (procedures.sql)

### 1. `close_trip_verify` (PROCEDURE) ✅ ACTIVELY USED

> **Implementation Status:** Called from the trip verification endpoint (`trip.py` line 380) via `CALL close_trip_verify(...)`. This is the only procedure that's actually invoked by the backend.

**Purpose:** Admin verifies and finalizes a completed trip.

**Parameters:**
- `p_trip_id` — Which trip
- `p_verified_by` — User ID of the verifying admin
- `p_end_time` — Verified end time
- `p_odometer_end` — Verified end odometer

**Flow:**
```
1. SELECT the trip row with FOR UPDATE (locks it to prevent concurrent modification)
2. Check trip exists             → if not, RAISE EXCEPTION 'Trip not found'
3. Check status = END_REQUESTED  → if not, RAISE EXCEPTION
4. Check start odometer verified → if not, RAISE EXCEPTION
5. UPDATE the trip:
   - status → 'COMPLETED'
   - actual_end_time_verified → p_end_time
   - odometer_end_verified → p_odometer_end
   - verified_by_user_id → p_verified_by
   - verified_at → CURRENT_TIMESTAMP
```

**Key concept — `FOR UPDATE`:** This is a **row-level lock**. It prevents two admins from verifying the same trip at the same time (race condition). The lock is released when the transaction commits.

**Key concept — Validation before mutation:** The procedure validates 3 preconditions before making any changes. This is a **defensive programming** pattern.

---

### 2. `calculate_trip_distance` (FUNCTION) ⚠️ NOT USED IN APP

> **Implementation Status:** ❌ **Created in SQL but never called from any backend endpoint.** The distance calculation is instead done inline in the `v_trip_summary` view (`odometer_end_verified - odometer_start_verified`). This function exists as a standalone utility but the app never invokes `SELECT calculate_trip_distance(...)`.

**Purpose:** Returns the distance (in km) a trip covered.

**How:** `odometer_end_verified - odometer_start_verified`

**Returns:** A single NUMERIC value.

**Error handling:** If either odometer value is NULL (trip not verified yet), it raises an exception.

**Difference from a procedure:** A FUNCTION returns a value. A PROCEDURE does not. You call this like:
```sql
SELECT calculate_trip_distance(42);  -- returns e.g., 35.5
```

---

### 3. `batch_cancel_old_planned_trips` (PROCEDURE) ⚠️ NOT USED IN APP

> **Implementation Status:** ❌ **Created in SQL but never called from any backend endpoint or scheduled job.** No cron job or API endpoint invokes `CALL batch_cancel_old_planned_trips()`. It exists as a ready-to-use housekeeping utility, but would need a cron/scheduler integration to run automatically.

**Purpose:** Housekeeping — cancels all PLANNED trips whose date has already passed.

**Flow:**
```
1. Loop through all trips WHERE status = 'PLANNED' AND trip_date < today
2. For each trip:
   - TRY: UPDATE status → 'CANCELLED'
   - CATCH: If it fails, log a NOTICE and continue to the next trip
3. End loop
```

**Key concept — Exception-safe loop:** The inner `BEGIN...EXCEPTION...END` block inside the loop means if one trip fails to cancel (e.g., a constraint violation), it **doesn't abort the entire batch**. It logs a warning and moves to the next trip. This is called a **savepoint pattern** in PL/pgSQL.

**When this runs:** Typically called by a scheduled job (cron) or manually by an admin.

---

## Part 5: Views (views.sql)

Views are **virtual tables** — they don't store data. They're saved SQL queries that you SELECT from like a table.

### 1. `v_trip_summary` ✅ ACTIVELY USED

> **Implementation Status:** Queried by the reports API (`GET /reports/trip-summary`) in `reports.py`. Used to power the trip summary report on the admin dashboard.

**Purpose:** One-stop view for trip reports.

**Joins:** `trip` → `route` → `vehicle` → `staff`

**Columns returned:**
| Column | Source |
|---|---|
| `trip_id`, `trip_date`, `shift`, `status` | trip |
| `route_code`, `route_name` | route |
| `registration_no` | vehicle |
| `driver_name` | staff.full_name |
| `actual_start_time_verified` | trip |
| `actual_end_time_verified` | trip |
| `distance_travelled` | Calculated: `odometer_end_verified - odometer_start_verified` |

**Why it exists:** Instead of writing a 4-table JOIN every time you need trip data, you just `SELECT * FROM v_trip_summary`.

---

### 2. `v_vehicle_utilization` ✅ ACTIVELY USED

> **Implementation Status:** Queried by the reports API (`GET /reports/vehicle-utilization`) in `reports.py`. Used for fleet usage analytics on the admin dashboard.

**Purpose:** Fleet utilization dashboard.

**Joins:** `vehicle` LEFT JOIN `trip`

**Columns returned:**
| Column | Meaning |
|---|---|
| `vehicle_id`, `registration_no` | Which vehicle |
| `total_trips` | COUNT of all trips |
| `total_distance` | SUM of verified odometer differences |
| `first_trip_date` | Earliest trip |
| `last_trip_date` | Most recent trip |

**Why LEFT JOIN?** So vehicles with zero trips still appear (with `total_trips = 0`). An INNER JOIN would hide unused vehicles.

---

### 3. `v_incident_summary` ✅ ACTIVELY USED

> **Implementation Status:** Queried by the reports API (`GET /reports/incident-summary`) in `reports.py`. Shows incident counts grouped by route and severity.

**Purpose:** Incident analytics per route.

**Joins:** `incident` → `trip` → `route`

**Columns returned:**
| Column | Meaning |
|---|---|
| `route_code`, `route_name` | Which route |
| `severity` | Incident severity level |
| `incident_count` | How many incidents at this severity |
| `latest_reported_at` | Most recent incident |

**Grouped by:** route + severity. So you see one row per route per severity level.

**Use case:** "Route R-300 has 5 HIGH severity incidents" — helps identify dangerous routes.

---

## Overall System Flow (How Everything Connects)

```
                        SETUP PHASE
                        ═══════════
        schema.sql creates tables
              ↓
        seed.sql inserts demo data
              ↓
        triggers.sql attaches audit logging
              ↓
        procedures.sql creates business logic
              ↓
        views.sql creates reporting queries


                      RUNTIME FLOW
                      ════════════

   Admin schedules trip (INSERT into trip, status=PLANNED)
        ↓ audit_trigger fires → audit_log row created
   
   Driver starts trip (UP DATE trip, status=IN_PROGRESS,
                        fills claimed start time + odometer)
        ↓ audit_trigger fires → audit_log row created
   
   At each stop, conductor records boarding/alighting
        (INSERT into trip_stop_event)
        ↓ audit_trigger fires → audit_log row created
   
   If incident occurs → INSERT into incident (with snapshots)
        ↓ audit_trigger fires → audit_log row created
   
   Driver finishes → UPDATE trip, status=END_REQUESTED
        ↓ audit_trigger fires → audit_log row created
   
   Admin verifies → CALL close_trip_verify(...)
        → Validates preconditions
        → UPDATE trip, status=COMPLETED
        ↓ audit_trigger fires → audit_log row created
   
   Reporting dashboards query views:
        v_trip_summary        → Trip reports
        v_vehicle_utilization → Fleet usage
        v_incident_summary    → Safety analytics
   
   Nightly cleanup:
        CALL batch_cancel_old_planned_trips()
        → Cancels stale PLANNED trips
```

---

## Quick Reference: PL/pgSQL Concepts Used

| Concept | Where Used | What It Means |
|---|---|---|
| `SERIAL PRIMARY KEY` | All tables | Auto-incrementing integer ID |
| `REFERENCES ... ON DELETE CASCADE` | stop, trip_stop_event, incident, maintenance_log | Delete child rows when parent is deleted |
| `CHECK (...)` | vehicle.capacity, trip_stop_event counts, maintenance_log.cost | Enforces data validity at DB level |
| `UNIQUE(...)` | stop(route_id, sequence_no), trip(route_id, trip_date, shift) | Prevents duplicate combinations |
| `ON CONFLICT DO NOTHING` | seed.sql | Makes INSERT idempotent (safe to re-run) |
| `FOR UPDATE` | close_trip_verify | Row-level lock for concurrency safety |
| `TG_TABLE_NAME`, `TG_OP` | audit_trigger | Postgres-provided trigger context variables |
| `to_jsonb(OLD/NEW)` | audit_trigger | Converts row to JSON for audit storage |
| `RAISE EXCEPTION` | procedures | Aborts transaction with error message |
| `RAISE NOTICE` | batch_cancel | Logs a warning without aborting |
| `BEGIN...EXCEPTION...END` | batch_cancel loop | Savepoint pattern for error isolation |
| `CREATE OR REPLACE` | All procedures/functions/views | Safely re-create without DROP |
| `RETURNS TRIGGER` | audit_trigger | Special return type for trigger functions |
| `COALESCE(x, 0)` | v_vehicle_utilization | Returns 0 if x is NULL |
| `JSONB` | incident.trip_snapshot, audit_log | Binary JSON storage for flexible data |
