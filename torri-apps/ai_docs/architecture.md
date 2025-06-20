# Project Architecture
## 1. Overview

- **Project Name:** torri-apps
- **Version:** In development
- **Last Updated:** In development

**Purpose:**  
> A salon management system with a web admin panel and mobile applications. It helps salon owners manage appointments, services, professionals, and clients.

## 2. Domain Context

- **Business Domain:** Salon Management
- **Key Entities & Workflows:**  
  - **Tenant:** Represents an individual salon or business using the system.
  - **User:** Represents individuals who can log in to the system, such as salon staff or administrators.
  - **Professional:** Represents service providers within a salon (e.g., stylists, therapists).
  - **Service:** Represents the services offered by a salon (e.g., haircut, manicure).
  - **Client:** Represents customers of the salon.
  - **Appointment:** Represents a scheduled booking for a client with a professional for one or more services.
  - **Primary Workflow 1 (Appointment Booking):** Client selects Service(s) & Professional → System checks Professional's Availability → Client confirms Appointment Slot → Appointment is Created.
  - **Primary Workflow 2 (Admin Management):** Admin manages Tenants, Users, Services, Professionals, and monitors overall system activity.

**Boundaries & Assumptions:**  
> This system covers salon operations like appointment scheduling, staff and service management, and client relationship management.

---

## 3. Goals & Constraints

- **Functional Goals:**  
  1. Provide a platform for salons to manage their operations.
  2. Allow clients to book appointments through a mobile application.
  3. Enable salon administrators to manage services, professionals, clients, and appointments via a web interface.
  4. Support white-labeling for mobile applications.
- **Non-Functional Requirements:**  
  - **Performance:** Backend APIs should respond within an acceptable timeframe (e.g., <500ms for most requests). Mobile and web apps should load quickly.
  - **Scalability:** The system should be able to handle a growing number of users, and appointments.
  - **Availability / Uptime:** Aim for high availability for production environments.
  - **Security:** Protect sensitive user and client data. Implement proper authentication and authorization.
---

## 4. High-Level Diagram
---

## 5. Component Breakdown

| Component            | Responsibility                                  | Tech / Frameworks             | Notes / Links                     |
|----------------------|-------------------------------------------------|-------------------------------|-----------------------------------|
| **Backend**          | Business logic, data access, API services       | Python, FastAPI, SQLAlchemy, Alembic, Pydantic | `torri-apps/Backend`              |
| **Web Admin**        | Admin UI, tenant management, salon operations   | React, Vite, Tailwind CSS, Zustand, React Router, Axios, React Query | `torri-apps/Web-admin`            |
| **Mobile Client Core**| Client-facing UI for appointment booking        | React Native, React Navigation, NativeWind, Tamagui, Axios, Zustand | `torri-apps/Mobile-client-core`   |
| **Mobile Client Configs**| White-label configurations for mobile apps    | JSON configurations           | `torri-apps/Mobile-client-configs`|
| **Database**         | Persistent storage for each tenant and system data | PostgreSQL | Single schema architecture with `public` schema |
| **Message Broker**   | Asynchronous tasks (e.g., notifications)        | Redis (with Celery)           | Used by Backend                   |

---

## 6. Data Model Summary

| Entity       | Attributes (examples)                     | Relations (examples)                      |
|--------------|-------------------------------------------|-------------------------------------------|
| **Tenant**   | id, name, domain                          | 1:N → Users, 1:N → Professionals, 1:N → Services, 1:N → Clients, 1:N → Appointments |
| **User**     | id, email, password_hash, role |                               |
| **Professional**| id, name, email             | 1:N → Appointments, N:M → Services |
| **Service**  | id, name, duration, price      | N:M → Professionals         |
| **Client**   | id, name, phone_number, email  | 1:N → Appointments          |
| **Appointment**| id, client_id, professional_id, service_id, start_time, end_time, status | N:1 → Client, N:1 → Professional, N:1 → Service |

---

## 7. External Integrations

| Service      | Purpose                  | Protocol / API                  | Location / Docs                 |
|--------------|--------------------------|---------------------------------|---------------------------------|
| *(Potential Payment Gateway)* | *(e.g., Payment processing)* | *(e.g., REST JSON)*            | *(e.g., https://stripe.com/docs/api)* |
| *(Potential Notification Service)*| *(e.g., Email/SMS notifications)*| *(e.g., SMTP / REST)*        | *(e.g., https://sendgrid.com/docs)*|

> _No explicit external integrations found yet beyond standard library/framework interactions. This section is a placeholder for future integrations._

---

## 8. Deployment & Environments

- **Environments:** `dev` | `staging` | `prod` (only have dev for now)
- **Containerization:** TBD
- **Orchestration:** TBD
- **CI/CD:** GitHub Actions (`.github/workflows/`, `torri-apps/.github/Workflows/`)
- **Secrets Management:** TBD

---

## 9. Observability

- **Logging:** TBD
- **Metrics:** (TBD, common tools include Prometheus, Grafana)
- **Tracing:** (TBD, common tools include OpenTelemetry, Jaeger, Zipkin)
- **Alerts:** (TBD)

---

## 10. Glossary

| Term           | Definition                                                |
|----------------|-----------------------------------------------------------|
| **Tenant**     | An customer (salon) and its data within the database schema. |
| **White-labeling** | Process of customizing the mobile app's branding for different tenants. |
| **FastAPI**    | A modern, fast (high-performance) web framework for building APIs with Python. |
| **React Native**| A framework for building native mobile apps using React and JavaScript. |
| **SQLAlchemy** | A SQL toolkit and Object-Relational Mapper (ORM) for Python. |
| **Alembic**    | A lightweight database migration tool for SQLAlchemy. |
| **Celery**     | An asynchronous task queue/job queue based on distributed message passing. |

---
