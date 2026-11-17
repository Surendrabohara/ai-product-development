# Task Manager — Product Requirements Document

## 1. Project Overview

**Project name:** Task Manager  
**Project type:** Full-stack web application  
**Primary goal:** Build a simple, functional task management application that allows users to create, view, complete, and delete tasks. The application uses a React frontend, a Cloudflare Worker REST API, and a Cloudflare D1 database.

The project demonstrates an AI-assisted product development workflow, from defining requirements and selecting technologies to implementation, testing, documentation, and potential deployment.

## 2. Problem Statement

Users need a straightforward way to keep track of tasks without the complexity of a full project management system. The application should provide a simple interface for recording tasks, viewing existing tasks, tracking completion, and removing tasks that are no longer needed.

The application should also demonstrate a complete frontend-to-backend workflow with persistent database storage and a clearly defined REST API.

## 3. Target Users

The application is designed for individuals who need a lightweight task tracking tool.

Typical users may want to:
- Record tasks they need to complete.
- Add descriptions to provide additional context.
- Review their task list.
- Mark tasks as completed.
- Remove tasks they no longer need.

### User access model

The current version does not require authentication or user accounts. All users access the same shared task list. Tasks are not separated by user.

## 4. Functional Requirements

### FR-01: View Tasks

- The application must retrieve and display tasks from the backend.
- Tasks must be ordered from newest to oldest.
- Each task must display its title, optional description, completion status, and creation information where supported by the interface.
- The application must provide a meaningful empty state when no tasks exist.
- The interface must handle loading and API error states appropriately.

### FR-02: Create Tasks

- Users must be able to create a task through the frontend.
- A task must have a title.
- The title must contain between 1 and 200 characters after trimming leading and trailing whitespace.
- A task may include an optional description of up to 2,000 characters.
- The backend must reject a missing, empty, or whitespace-only title with HTTP 400.
- A successful creation request must return HTTP 201 and the created task.
- Newly created tasks must appear in the task list without requiring a manual page refresh.

### FR-03: Complete or Reopen Tasks

- Users must be able to mark a task as completed.
- Users must be able to change a completed task back to incomplete.
- The frontend must send the updated completion status to the backend.
- The backend must accept a Boolean `completed` value.
- Invalid completion values must return HTTP 400.
- A successful update must return HTTP 200 and the updated task.
- Changes must persist after refreshing the page.

### FR-04: Delete Tasks

- Users must be able to delete an existing task.
- A successful deletion must return HTTP 204 with an empty response body.
- A request to delete a nonexistent task must return HTTP 404.
- Deleted tasks must no longer appear in the task list after the interface refreshes its data.

### FR-05: REST API

The backend must expose the following endpoints:

| Method | Endpoint | Expected behavior |
|---|---|---|
| GET | `/api/tasks` | Return all tasks, newest first; HTTP 200 |
| POST | `/api/tasks` | Create a task; HTTP 201 |
| PATCH | `/api/tasks/:id` | Update completion status; HTTP 200 |
| DELETE | `/api/tasks/:id` | Delete a task; HTTP 204 |

Additional API requirements:

- Invalid task input must return an appropriate HTTP 400 response.
- Requests for nonexistent task IDs must return HTTP 404 where applicable.
- API responses must use consistent JSON structures for successful reads, creations, and updates.
- Deletion responses must not include a response body.
- The API must support the cross-origin requests required by the local frontend.

## 5. Non-Functional Requirements

### NFR-01: Usability

- The interface must be simple and understandable for first-time users.
- Creating, completing, and deleting tasks must require minimal interaction.
- Validation errors must be clear enough for users to correct their input.
- The layout must remain usable at common desktop and mobile screen sizes.

### NFR-02: Persistence

- Tasks must be stored in Cloudflare D1 rather than only in browser memory.
- Task data and completion status must remain available after a page refresh.
- Database operations must use the persistent database as the source of truth.

### NFR-03: Maintainability

- The frontend and backend must be organized into separate directories.
- API routes and database operations must be implemented in a clear, maintainable structure.
- The code must use TypeScript where configured.
- Setup, execution, API usage, and deployment instructions must be documented.

### NFR-04: Reliability and Validation

- The backend must validate input independently of frontend validation.
- The API must handle invalid input and missing records without returning misleading success responses.
- The frontend must handle API failures without silently treating failed operations as successful.

### NFR-05: Cloud Deployment Compatibility

- The backend must be compatible with Cloudflare Workers.
- The database must use Cloudflare D1.
- The frontend must use React and Vite.
- The application must provide a documented path toward deployment on Cloudflare.

Production deployment is a separate step and should only be considered complete after the deployed application has been verified.

### NFR-06: Local Development

- The frontend and backend must be runnable independently during development.
- Local database migrations must be documented.
- Developers must be able to verify API behavior using command-line HTTP requests or an equivalent API client.

## 6. Data Model

Each task contains the following logical fields:

| Field | Type | Description |
|---|---|---|
| `id` | String | Unique task identifier |
| `title` | String | Required task title |
| `description` | String or null | Optional task description |
| `completed` | Boolean in API | Whether the task is complete |
| `createdAt` | String | Task creation timestamp |

The D1 database stores the completion flag as an integer (`0` or `1`) and the creation timestamp as text. The API exposes the completion flag as a JSON Boolean and uses the camelCase field `createdAt`.

## 7. Technology Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Cloudflare Workers
- **API style:** REST
- **Database:** Cloudflare D1, backed by SQLite-compatible SQL
- **Development tooling:** npm and Wrangler
- **Version control:** Git, if configured for the project

## 8. Project Structure

The project is organized into the following main components:

- `web/` — frontend application and its dependencies
- `worker/` — backend API, database configuration, migrations, and its dependencies
- `README.md` — project overview, setup instructions, API documentation, verification commands, and deployment guidance

The frontend and backend have separate package configurations. Commands should be run from the appropriate directory.

## 9. Acceptance Criteria

The application is considered functionally complete for the current prototype when the following checks pass:

- [ ] The frontend loads and retrieves tasks from the API.
- [ ] Users can create a task with a valid title.
- [ ] Empty and whitespace-only titles are rejected.
- [ ] Optional task descriptions are supported.
- [ ] New tasks appear at the top of the list.
- [ ] Users can mark tasks complete and reopen them.
- [ ] Users can delete tasks.
- [ ] Task data and completion changes persist after a page refresh.
- [ ] The API returns HTTP 200 for successful list retrieval.
- [ ] The API returns HTTP 201 for successful task creation.
- [ ] The API returns HTTP 200 for successful completion updates.
- [ ] The API returns HTTP 204 with an empty body for successful deletion.
- [ ] Invalid input returns HTTP 400.
- [ ] Requests involving nonexistent task IDs return HTTP 404 where specified.
- [ ] The frontend build completes successfully.
- [ ] The backend TypeScript check completes successfully.
- [ ] The README explains local setup, API usage, and the deployment process.

## 10. Current Scope and Limitations

The current application focuses on core task management.

The following features are outside the current scope:

- User registration and authentication
- Separate task lists for different users
- Task priorities, categories, and due dates
- Search, sorting controls, and advanced filtering
- Collaboration, sharing permissions, and notifications
- A production deployment that has not yet been independently verified

These features may be considered in future iterations if the requirements expand.

## 11. Definition of Done

The prototype is ready for review when the core task management workflow works end to end, data persists in D1, API validation and error handling behave as specified, local verification checks pass, and the project documentation is complete.

Production readiness additionally requires reviewing security, access controls, deployment configuration, error monitoring, and the behavior of the live application.
