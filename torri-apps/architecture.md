# Project Architecture

> *A concise, living document describing the high-level structure and rationale of your system.*

---

## 1. Overview

- **Project Name:** torri-apps
- **Version:** (Leave as is)
- **Last Updated:** (Leave as is)
- **Authors / Maintainers:** (Leave as is)

**Purpose:**
> A multi-tenant salon management system with a web admin panel and mobile applications. It helps salon owners manage appointments, services, professionals, and clients.

---

## 2. Domain Context

- **Business Domain:** Salon Management
- **Key Entities & Workflows:**
  - **Tenant:** Represents an individual salon or business using the system. Each tenant has its own isolated data.
  - **User:** Represents individuals who can log in to the system, such as salon staff or administrators.
  - **Professional:** Represents service providers within a salon (e.g., stylists, therapists).
  - **Service:** Represents the services offered by a salon (e.g., haircut, manicure).
  - **Client:** Represents customers of the salon.
  - **Appointment:** Represents a scheduled booking for a client with a professional for one or more services.
  - **Primary Workflow 1 (Appointment Booking):** Client selects Service(s) & Professional → System checks Professional's Availability → Client confirms Appointment Slot → Appointment is Created.
  - **Primary Workflow 2 (Admin Management):** Admin manages Tenants, Users, Services, Professionals, and monitors overall system activity.

**Boundaries & Assumptions:**
> This system covers salon operations like appointment scheduling, staff and service management, and client relationship management. It assumes tenants operate independently. It does not cover advanced accounting, payroll, or extensive inventory management beyond basic service-related needs.

---

## 3. Goals & Constraints

- **Functional Goals:**
  1. Provide a multi-tenant platform for salons to manage their operations.
  2. Allow clients to book appointments through a mobile application.
  3. Enable salon administrators to manage services, professionals, clients, and appointments via a web interface.
  4. Support white-labeling for mobile applications.
- **Non-Functional Requirements:**
  - **Performance:** Backend APIs should respond within an acceptable timeframe (e.g., <500ms for most requests). Mobile and web apps should load quickly.
  - **Scalability:** The system should be able to handle a growing number of tenants, users, and appointments.
  - **Availability / Uptime:** Aim for high availability for production environments.
  - **Security:** Protect sensitive user and client data. Implement proper authentication and authorization.
  - **Compliance:** (Leave as is, depends on specific regional requirements like GDPR, HIPAA if applicable)

---

## 4. High-Level Diagram

![System Context Diagram](torri-apps/docs/diagrams/system_context_diagram.png)

> _A simple box-and-arrow diagram illustrating external systems (e.g., potential payment gateway), user roles (Admin, Salon Staff, Client), and major components (Backend, Web Admin, Mobile App). A placeholder path is provided; the actual diagram needs to be created and stored._

---

## 5. Component Breakdown

| Component            | Responsibility                                  | Tech / Frameworks             | Notes / Links                     |
|----------------------|-------------------------------------------------|-------------------------------|-----------------------------------|
| **Backend**          | Business logic, data access, API services       | Python, FastAPI, SQLAlchemy, Alembic, Pydantic, Celery, Redis | `torri-apps/Backend`              |
| **Web Admin**        | Admin UI, tenant management, salon operations   | React, Vite, Tailwind CSS, Zustand, React Router, Axios, React Query | `torri-apps/Web-admin`            |
| **Mobile Client Core**| Client-facing UI for appointment booking        | React Native, React Navigation, NativeWind, Tamagui, Axios, Zustand | `torri-apps/Mobile-client-core`   |
| **Mobile Client Configs**| White-label configurations for mobile apps    | JSON configurations           | `torri-apps/Mobile-client-configs`|
| **Database**         | Persistent storage for all tenants and system data | PostgreSQL (implied by psycopg2-binary), MySQL (mentioned in requirements) | Schemas: `public`, tenant-specific schemas |
| **Message Broker**   | Asynchronous tasks (e.g., notifications)        | Redis (with Celery)           | Used by Backend                   |

---

## 6. Data Model Summary

| Entity       | Attributes (examples)                     | Relations (examples)                      |
|--------------|-------------------------------------------|-------------------------------------------|
| **Tenant**   | id, name, domain                          | 1:N → Users, 1:N → Professionals, 1:N → Services, 1:N → Clients, 1:N → Appointments |
| **User**     | id, email, password_hash, role, tenant_id | N:1 → Tenant                              |
| **Professional**| id, name, email, tenant_id             | N:1 → Tenant, 1:N → Appointments, N:M → Services |
| **Service**  | id, name, duration, price, tenant_id      | N:1 → Tenant, N:M → Professionals         |
| **Client**   | id, name, phone_number, email, tenant_id  | N:1 → Tenant, 1:N → Appointments          |
| **Appointment**| id, client_id, professional_id, service_id, start_time, end_time, status, tenant_id | N:1 → Client, N:1 → Professional, N:1 → Service, N:1 → Tenant |

> _This is a simplified model. Detailed ERD should be created and linked, e.g., [diagrams/erd.png]._

---

## 7. External Integrations

| Service      | Purpose                  | Protocol / API                  | Location / Docs                 |
|--------------|--------------------------|---------------------------------|---------------------------------|
| *(Potential Payment Gateway)* | *(e.g., Payment processing)* | *(e.g., REST JSON)*            | *(e.g., https://stripe.com/docs/api)* |
| *(Potential Notification Service)*| *(e.g., Email/SMS notifications)*| *(e.g., SMTP / REST)*        | *(e.g., https://sendgrid.com/docs)*|

> _No explicit external integrations found yet beyond standard library/framework interactions. This section is a placeholder for future integrations._

---

## 8. Deployment & Environments

- **Environments:** `dev` | `staging` | `prod` (Assumed standard practice)
- **Containerization:** (Likely Docker, but no Dockerfiles explicitly listed in root or component roots by `ls()`. Further investigation needed if Dockerfiles exist deeper.)
- **Orchestration:** (Unknown, could be Kubernetes, Docker Swarm, or simpler setups)
- **CI/CD:** GitHub Actions (`.github/workflows/`, `torri-apps/.github/Workflows/`)
- **Secrets Management:** (Unknown, common tools include Vault, AWS Secrets Manager, environment variables)

---

## 9. Observability

- **Logging:** Backend logs (`audit.log`, `backend.log`, `server.log`). Specific strategies for centralized logging (e.g., ELK, Loki) are not detailed.
- **Metrics:** (Unknown, common tools include Prometheus, Grafana)
- **Tracing:** (Unknown, common tools include OpenTelemetry, Jaeger, Zipkin)
- **Alerts:** (Unknown)

---

## 10. Glossary

| Term           | Definition                                                |
|----------------|-----------------------------------------------------------|
| **Tenant**     | An isolated customer (salon) and its data within the multi-tenant system. |
| **White-labeling** | Process of customizing the mobile app's branding for different tenants. |
| **FastAPI**    | A modern, fast (high-performance) web framework for building APIs with Python. |
| **React Native**| A framework for building native mobile apps using React and JavaScript. |
| **SQLAlchemy** | A SQL toolkit and Object-Relational Mapper (ORM) for Python. |
| **Alembic**    | A lightweight database migration tool for SQLAlchemy. |
| **Celery**     | An asynchronous task queue/job queue based on distributed message passing. |

---

> _⌨️ Store this file alongside your code, and update it whenever architecture or dependencies change._
