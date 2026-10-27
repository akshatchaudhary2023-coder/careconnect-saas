# CareConnect — Architecture, Data Model and Review Notes

## 1. System architecture

```text
Counsellor / Client / Admin
          |
          v
Responsive React + Vite web app
          |  (HTTPS in deployment)
          +------------------------------+
          |                              |
          v                              v
Supabase Auth (planned/configurable)   Supabase PostgreSQL (schema included;
                                      frontend CRUD integration pending)
                                             |
                                             v
                                  RLS / scoped access policies
```

The current local demo has browser-local sample data. The diagram represents the intended cloud architecture, not a claim that the backend is already deployed.

## 2. Core modules

- **Authentication:** demo sign-in is available; Supabase email/password sign-in can be enabled using environment variables.
- **Role and team access:** Admin, Counsellor and Client personas are represented. Production authorization must be enforced in database/API policies.
- **Appointment management:** add, search and update status for demo appointments.
- **Client directory:** add/search fictional profiles and export the directory to CSV.
- **Dashboard and reports:** summary cards and operational status counts based on the current browser dataset.
- **Privacy and administration:** reminders, team/access explanation and planned controls.

## 3. Database entities and relationships

- `centres` 1-to-many `profiles`
- `centres` 1-to-many `client_profiles`
- `profiles` (counsellor) 1-to-many `client_profiles` through `assigned_counsellor`
- `client_profiles` 1-to-many `appointments`
- `profiles` (counsellor) 1-to-many `appointments`
- `profiles` (actor) 1-to-many `audit_events`

The SQL is a starter design and must be tested in a fresh Supabase project. A production implementation should review onboarding/centre creation, role assignment, audit event generation, retention, and all RLS policies before use.

## 4. API design (logical REST contract)

These are proposed endpoints for the next backend integration phase; they are not implemented as a separate REST server in this version.

| Method | Endpoint | Purpose | Intended access |
|---|---|---|---|
| POST | `/auth/signup` | Create an account and profile | Public signup; role assignment controlled server-side |
| POST | `/auth/login` | Authenticate user | Public |
| GET | `/api/me` | Return current user's profile and role | Authenticated |
| GET | `/api/clients` | Search client directory | Admin; counsellor's assigned clients |
| POST | `/api/clients` | Create client profile | Admin / authorized staff |
| GET | `/api/clients/:id` | Read one client profile | Scoped to centre and assignment |
| PATCH | `/api/clients/:id` | Update allowed profile fields | Admin / assigned counsellor within policy |
| DELETE | `/api/clients/:id` | Deactivate/delete per retention policy | Admin only, audited |
| GET | `/api/appointments` | List sessions by date/status | Scoped to role and centre |
| POST | `/api/appointments` | Request/create a session | Admin / counsellor; client request flow needs policy |
| PATCH | `/api/appointments/:id` | Update time/status | Authorized participants; conflict validation required |
| GET | `/api/reports/summary` | Operational counts | Admin / authorized counsellor |
| GET | `/api/audit-events` | Review access/change events | Admin only |

Validation, server-side authorization, audit logging, conflict detection and error handling are required before these endpoints can be called production-ready.

## 5. Functional and non-functional requirements

### Functional
1. Users can authenticate and have a role.
2. Admin can coordinate the workspace and manage client directory entries.
3. Counsellors can review their assigned schedule and client assignments.
4. Appointments can be created and have a workflow status.
5. Users can search relevant records within their permitted scope.
6. The workspace can display operational summaries and export a demo directory.

### Non-functional
- **Security:** least privilege, RLS, secure authentication, audit trails and secret management.
- **Privacy:** minimal collection, fictional demo data, retention and deletion rules.
- **Usability:** responsive layouts, clear status indicators, accessible labels and focus states.
- **Reliability:** backups, recovery testing, monitoring and defined availability objectives.
- **Performance:** indexed query fields, pagination for large datasets and efficient filtering.
- **Maintainability:** modular React components, version control and documented setup.

## 6. Test plan

| Test | Expected result | Current status |
|---|---|---|
| Open app in demo mode | Login screen loads without cloud credentials | Verify locally |
| Enter demo workspace | Dashboard appears and demo notice is visible | Verify locally |
| Add appointment | New row appears in appointments and persists after refresh in same browser | Verify locally |
| Change appointment status | Status changes and persists locally | Verify locally |
| Search client directory | Results narrow by name/email/ID | Verify locally |
| Add fictional client | New client appears in directory | Verify locally |
| Export client CSV | Browser downloads a CSV file | Verify locally |
| Responsive layout | Main flows usable on mobile viewport | Manual test |
| Supabase sign-in | Auth works with configured project | Not verified until configured |
| RLS access tests | Each role can access only permitted rows | Not verified until configured |
| Live deployment | Public URL loads on desktop/mobile | Not verified until deployed |

## 7. Honest demo language

Say “designed,” “included in the schema,” or “planned” for cloud database CRUD, audit logging, notifications, backups, and live deployment until those are actually connected and tested. The current UI is a functional frontend prototype in demo mode, not a production counselling record system.

## 8. Social impact and responsible scope

CareConnect aims to reduce administrative friction in counselling centres so staff can coordinate appointments more consistently. Potential future improvements include low-bandwidth support, accessible UI, multilingual navigation, appointment reminders, consent-aware record access, audit review, and anonymized operational analytics. It should not rank clients, infer diagnoses, or replace professional judgement.
