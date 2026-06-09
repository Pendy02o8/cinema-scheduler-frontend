# Cinema Scheduler Frontend Specification

## Project Overview

This project is a Cinema Employee Scheduling System.

The system is designed for a cinema scheduling manager to manage:

* Employees
* Employee Availability
* Positions
* Weekly Schedules
* Schedule Assignments
* Work Hour Statistics
* Understaffing / Overstaffing Checks

This is a single-user internal management system.

---

# Tech Stack

Frontend:

* React
* TypeScript
* Vite
* Material UI (MUI)
* React Router DOM
* Axios

Backend:

* Spring Boot
* Java
* MySQL
* Swagger

Backend Base URL:

http://localhost:8080

---

# Development Rules

## General

* Use TypeScript everywhere.
* Use functional components.
* Use React Hooks.
* Use MUI components.
* Do not use Redux.
* Do not introduce unnecessary complexity.
* Keep components reusable and modular.

## Folder Structure

src/

├── api/

├── components/

├── layouts/

├── pages/

├── services/

├── types/

├── routes/

├── App.tsx

└── main.tsx

---

# Application Layout

Use a dashboard-style layout.

## Sidebar Menu

1. Employee Management
2. Availability Management
3. Position Management
4. Weekly Schedule Management
5. Work Hour Statistics
6. Understaffing Check
7. Overstaffing Check

## Top App Bar

Display:

Cinema Scheduler System

---

# Database Structure

## Employee

Represents cinema employees.

Fields:

* id
* name
* jobTitle
* isActive
* note
* createdAt
* updatedAt

Example:

{
"id": 8,
"name": "晚班A",
"jobTitle": "晚班工讀生",
"isActive": true
}

---

## Availability

Represents employee available working periods.

Fields:

* id
* employee
* weekday
* startTime
* endTime

Relationship:

Many Availability -> One Employee

---

## Position

Represents cinema positions.

Fields:

* id
* name
* isRequired
* createdAt
* updatedAt

Current Positions:

| ID | Name  |
| -- | ----- |
| 8  | 1F+公關 |
| 9  | 3F    |
| 10 | 票房    |
| 11 | 販賣    |
| 12 | 開機+輪休 |
| 13 | 關機+輪休 |
| 14 | 票+販   |

Required Positions:

8
9
10
11
12
13

Optional Position:

14

---

## WeeklySchedule

Represents a schedule week.

Fields:

* id
* startDate
* endDate
* status

Example:

{
"id":2,
"startDate":"2026-04-27",
"endDate":"2026-05-03",
"status":"DRAFT"
}

---

## PositionRequirement

Represents required staffing for a position.

Fields:

* id
* position
* startTime
* endTime
* requiredCount

Current Requirements:

1F+公關
11:20 - 23:00

3F
09:50 - 23:00

票房
09:50 - 23:00

販賣
09:20 - 23:00

開機+輪休
08:50 - 15:00

關機+輪休
17:20 - 23:00

---

## ScheduleAssignment

Represents an actual assigned shift.

Fields:

* id
* date
* employee
* position
* startTime
* endTime
* note

Example:

{
"id":10,
"date":"2026-05-19",
"employee":"晚班A",
"position":"1F+公關",
"startTime":"16:50",
"endTime":"23:00",
"note":"晚班"
}

---

# Business Rules

## Employee Scheduling

An employee cannot have overlapping shifts.

Validation Rule:

newStart < existingEnd
AND
newEnd > existingStart

If true:

Scheduling conflict.

---

## Position Assignment

Multiple employees can be assigned to the same position.

Example:

販賣 can have multiple workers.

This is allowed.

---

## Understaffing Check

The backend already provides understaffing validation.

Frontend only needs:

* Display results
* Show missing periods
* Highlight affected positions

No frontend calculation.

---

## Overstaffing Check

The backend already provides overstaffing validation.

Frontend only needs:

* Display results
* Show excess periods
* Highlight affected positions

No frontend calculation.

---

# Work Hour Rules

Work hours are displayed in 0.5 hour increments.

Rounding:

Round to nearest 0.5 hour.

Break Rule:

If continuous work duration >= 4 hours

Deduct:

30 minutes

If duration < 4 hours

No deduction

Examples:

17:20 ~ 23:00

Displayed:

5.0 hours

---

# Existing Backend APIs

## Employees

GET /api/employees

GET /api/employees/{id}

POST /api/employees

PUT /api/employees/{id}

DELETE /api/employees/{id}

---

## Availability

GET /api/availability

GET /api/availability/employee/{employeeId}

POST /api/availability

PUT /api/availability/{id}

DELETE /api/availability/{id}

---

## Positions

GET /api/positions

POST /api/positions

PUT /api/positions/{id}

DELETE /api/positions/{id}

---

## Weekly Schedules

GET /api/weekly-schedules

POST /api/weekly-schedules

PUT /api/weekly-schedules/{id}

DELETE /api/weekly-schedules/{id}

---

## Position Requirements

GET /api/position-requirements

POST /api/position-requirements

PUT /api/position-requirements/{id}

DELETE /api/position-requirements/{id}

---

## Schedule Assignments

GET /api/schedule-assignments

POST /api/schedule-assignments

PUT /api/schedule-assignments/{id}

DELETE /api/schedule-assignments/{id}

---

# Development Priority

Build in the following order.

Phase 1

* Layout
* Routing
* Sidebar
* Top Bar

Phase 2

* Employee Management

Features:

* List
* Create
* Edit
* Delete

Phase 3

* Availability Management

Features:

* Employee Availability CRUD

Phase 4

* Position Management

Features:

* Position CRUD

Phase 5

* Weekly Schedule Management

Features:

* Weekly Schedule CRUD

Phase 6

* Schedule Assignment Management

Features:

* Assign employee to position

Phase 7

* Work Hour Statistics

Features:

* Employee work hour summary

Phase 8

* Understaffing / Overstaffing Reports

Display backend validation results.

---

# Important

Before implementing any feature:

1. Create TypeScript interfaces.
2. Create service layer.
3. Create API layer.
4. Use MUI DataGrid or Table.
5. Keep UI simple and maintainable.
6. Stop after completing each phase and wait for confirmation before continuing.
