# Backlog API Server

Express + MongoDB API for the backlog frontend.

## Setup

1. Copy `.env.example` to `.env`.
2. Update `MONGODB_URI` if needed.
3. Install dependencies:

```bash
pnpm install
```

4. Run server:

```bash
pnpm dev
```

Server default URL: `http://localhost:5000`

## Endpoints

### Health

- `GET /api/health`

### Tasks

- `GET /api/tasks`
  - Query params (optional): `service`, `priority`, `assignedTo`, `status`
  - Example: `/api/tasks?service=Orders%20Service&priority=High`

- `GET /api/tasks/stats`
  - Same optional query params as list endpoint
  - Returns:
    - `totalTasks`
    - `completedTasks`
    - `remainingTasks`
    - `totalStoryPoints`

- `POST /api/tasks`
  - Body fields:
    - `id`
    - `service`
    - `task`
    - `priority` (`High` | `Medium` | `Low`)
    - `sp`
    - `rationale`
    - `assignedTo`
    - `status` (`Completed` | `Pending`)

- `PATCH /api/tasks/:mongoId`
  - Partially updates task by Mongo document id (`_id`)

- `DELETE /api/tasks/:mongoId`
  - Deletes task by Mongo document id (`_id`)

### Seed Initial Data

- `POST /api/tasks/seed`
  - Clears existing tasks and inserts starter backlog rows.

## Frontend Integration Notes

- Use `GET /api/tasks` to populate the table.
- Use `GET /api/tasks/stats` to populate the stat cards.
- Pass selected filter values as query params to both endpoints.
