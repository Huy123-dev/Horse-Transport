# Equideli demo runbook

## 1. Current readiness

This workspace is **not ready for a verified multi-role end-to-end demo**. The runtime probe on 2026-10-22 found both `localhost:3000` and `localhost:8080` unavailable.

- ADMIN login/dashboard were verified in an earlier run on 2026-10-21; they were not re-verified in the current runtime.
- CUSTOMER, Logistics Manager, Specialist, Fleet Coordinator, and Driver/Escort credentials have not been validated in this run.
- Request create/review and operational updates have not been executed because they persist to SQL Server and a verified account/test-data plan is not available.
- Assignment APIs and Fleet Coordinator controls now exist in source but have not been tested against a running backend. Driver/Escort scoped reads, review history, document verification, readiness rules, and delivery signature upload remain gaps. See [demo-flow-implementation.md](./demo-flow-implementation.md) and [api-mapping.md](./api-mapping.md).

Do not describe an untested mutation as completed. Use a dedicated disposable demo database only when explicitly configured; this runbook never resets, seeds, or cleans SQL Server data.

## 2. Prerequisites

- Java 17 or newer for the Spring Boot project.
- Node.js/npm and the dependencies already installed in `frontend`.
- SQL Server running with the existing `HorseTransportManagementDB` and locally configured datasource credentials.
- The backend and frontend ports are available: backend `8080`, frontend `3000`.
- Use only demo accounts whose passwords were issued through the trusted local setup. This document records no passwords, JWTs, or database secrets.

## 3. Start services

Start the backend in one PowerShell terminal:

```powershell
Set-Location C:\Equideli\backend
.\gradlew.bat bootRun
```

Start the frontend in a second terminal:

```powershell
Set-Location C:\Equideli\frontend
npm run dev
```

Open `http://localhost:3000`. The Vite frontend API base defaults to `http://localhost:8080/api`; if overridden, set `VITE_API_BASE_URL` in the local frontend environment before starting Vite. Do not put secrets in this public variable.

The backend currently has no dedicated health endpoint. Do not use `GET /` as a health check; Spring Security may return 401. Use a known credential in the login screen and, after login, verify the authenticated session through the application (`GET /api/auth/me`).

## 4. Accounts and roles

The database inventory previously found:

| Email | Role in database inventory | Credential status |
|---|---|---|
| `admin@example.com` | ADMIN | Login and browser redirect verified |
| `customer@example.com` | CUSTOMER | Email/role found; password not verified |
| `logistics.manager@example.com` | LOGISTICS_MANAGER | Email/role found; password not verified |
| `specialist@example.com` | TRANSPORT_SPECIALIST | Email/role found; password not verified |
| `fleet.coordinator@example.com` | FLEET_COORDINATOR | Email/role found; password not verified |
| `driver@example.com` | DRIVER_ESCORT | Email/role found; password not verified |
| `escort.vet@example.com` | DRIVER_ESCORT | Email/role found; password not verified |

The database also contains ADMIN, which is outside the five business roles in the requirements. Do not change roles or passwords to make the demo work.

## 5. Verified read-only demo path

The login checkbox stores the access token in localStorage when selected; otherwise it uses sessionStorage for the current browser tab. The API client reads either store and clears both on HTTP 401.

1. Sign in as the verified ADMIN account in the frontend.
2. The internal dashboard reads requests, plans, and incidents from Spring APIs and displays their actual counts.
3. Open the displayed request records to inspect backend data. Do not approve/reject them in the shared demo database.
4. Use transport plan, inspection, asset, incident, and invoice views only with roles authorized by `SecurityConfig`.
5. To validate the session, reload the page. The frontend sends the stored Bearer token to `/api/auth/me`; expired/invalid tokens are cleared on 401.

Observed read-only API counts for the current demo database during the audit: 3 transport requests, 2 transport plans, 3 inspections, 3 assets, 1 incident, and 2 invoices. Counts can change as records change; they are not seeded by the frontend.

## 6. Multi-role workflow — only after credentials and test data are approved

1. **Customer:** verify a CUSTOMER credential, view only owned horses/requests, create a request, and record the returned request ID. The request creation call persists a SQL Server row.
2. **Logistics Manager:** verify a manager credential, open that same ID, then approve with optional `estimatedAmount` or reject with a reason. Do not use ADMIN as a substitute for the manager role.
3. **Transport Specialist:** verify specialist credentials and use an existing inspection ID to change inspection status; this is a persistent mutation.
4. **Fleet Coordinator:** verify coordinator credentials and create a plan only for an approved request. Assignment create/cancel is available in source; test it only against a confirmed disposable demo database. Readiness is not yet complete.
5. **Driver/Escort:** do not attempt the current dashboard/trip flow. The backend does not expose plan/log reads scoped by assignment; frontend intentionally blocks those reads.
6. **Customer:** sign back in and verify only the customer's own request and related plan data.

Stop before a write if the account, ownership, request state, or test database is uncertain. Never manufacture an ID, role, assignment, location, or successful result.

## 7. Troubleshooting

- **Login returns 400:** inspect that the frontend sends JSON fields `email` and `password` with `Content-Type: application/json`. The prior generic 400 was caused by an escaped PowerShell probe body, not the frontend. Invalid/missing fields are validation errors.
- **Login returns 401:** credentials are invalid or the account was not found; both use a generic response. Verify credentials through the trusted environment owner, not by changing database values.
- **Protected API returns 401:** authenticate again; the frontend clears its local token when it receives 401.
- **Protected API returns 403:** the current role lacks permission. Do not bypass the UI guard or alter role assignments to work around it.
- **API unavailable/CORS:** confirm both services are running on the documented ports and the browser origin is allowed by backend CORS. Do not change backend startup configuration without approval.
- **Dashboard counts differ:** refresh and compare against authorized GET responses; records are live, not hardcoded.

## 8. Checks

```powershell
Set-Location C:\Equideli\backend
.\gradlew.bat build
```

```powershell
Set-Location C:\Equideli\frontend
npm run build
npm run lint
npm run typecheck
```

The frontend now builds with Vite and runs TypeScript validation as part of the production build. The 46 Next.js API handlers and Prisma source were removed; the SQLite files in `db/` were not deleted. Build/typecheck/lint last passed on 2026-10-25, but API and browser runtime were not verified in that run. See the API mapping for current scope and historical runtime results.

## 9. Cleanup and data safety

- No cleanup command is provided; do not delete demo requests, users, horses, invoices, plans, or documents.
- Sign out through the UI to clear the local login token.
- Stop locally started dev servers with Ctrl+C in their own terminals.
- Never run `npm run db:reset`, seed scripts, migrations, or destructive SQL against the shared database as part of this demo.
