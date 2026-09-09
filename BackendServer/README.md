# Rennto - Backend Server

The core **RESTful API** and **Real-Time WebSocket** backend for the **Rennto** Housing & Accommodation Management Platform. Powered by **Django 6.0**, **Django REST Framework**, **Django Channels**, and **PostgreSQL/Redis**, this backend handles multi-property accommodation workflows, owner and tenant onboarding, room/bed allocations, rent payments, vacate approvals, complaint handling, SMS OTP authentication, and push notifications.

---

## 📌 Table of Contents

- [Architecture & Design](#-architecture--design)
- [Tech Stack & Libraries](#-tech-stack--libraries)
- [Directory Structure](#-directory-structure)
- [Services Layer Overview](#-services-layer-overview)
- [Prerequisites](#-prerequisites)
- [Environment Configuration (`.env`)](#-environment-configuration-env)
- [Installation & Local Setup](#-installation--local-setup)
- [Management Commands & Utility Scripts](#-management-commands--utility-scripts)
- [API Endpoints Overview](#-api-endpoints-overview)
- [WebSockets & Real-Time Communication](#-websockets--real-time-communication)
- [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## 🏗️ Architecture & Design

The backend follows a clean, decoupled service-oriented architecture:
- **Presentation Layer**: Django REST Framework Views (`views.py`) and Serializers (`serializers.py`).
- **Service Layer (`HAC/services/`)**: Encapsulates all business logic, validation rules, transactional state transitions, and third-party integrations.
- **Data Layer**: Django ORM Models (`models.py`) connected to PostgreSQL / SQLite.
- **Asynchronous & Real-Time Layer**: Django Channels (`consumers.py`, `routing.py`), ASGI/Daphne server, and Redis channel layer.

---

## 🛠️ Tech Stack & Libraries

### Core Frameworks
- **Python**: 3.12+
- **Django**: 6.0
- **Django REST Framework (DRF)**: 3.17
- **Django Channels**: 4.3 (ASGI / WebSockets)
- **Daphne**: 4.2 (ASGI server) & **Gunicorn**: 26.0 (WSGI server)

### Database & Cache
- **PostgreSQL**: `psycopg2-binary` driver
- **SQLite**: Local development fallback
- **Redis**: `redis`, `channels_redis` for WebSocket message broadcasting and OTP caching

### Authentication & Third-Party Integrations
- **SimpleJWT / PyJWT**: JSON Web Token issuance and authentication
- **2Factor API**: Integration for SMS OTP delivery (`https://2factor.in`)
- **AWS S3**: `boto3`, `django-storages` for property images and document uploads
- **Pillow**: Image processing and thumbnail handling
- **Django CORS Headers**: `django-cors-headers` for cross-origin request handling

---

## 📁 Directory Structure

```
BackendServer/
├── BMS/                    # Building Management System app / configuration
├── HAC/                    # Housing & Accommodation Management (Core App)
│   ├── migrations/         # Django database migrations
│   ├── services/           # Service-oriented business logic layer
│   │   ├── auth_service.py              # OTP, JWT, Admin & User Auth
│   │   ├── bed_service.py               # Bed allocation & status management
│   │   ├── common_service.py            # Shared utility functions
│   │   ├── dashboard_service.py         # Admin & Owner analytics service
│   │   ├── existing_tenant_service.py   # Existing tenant records manager
│   │   ├── expense_service.py           # Property expense tracker
│   │   ├── facility_service.py          # Amenities & facilities manager
│   │   ├── hostel_change_service.py     # Room/hostel transfer requests
│   │   ├── issue_service.py             # Complaints & ticketing service
│   │   ├── layout_service.py            # Building floor plan & layout service
│   │   ├── mail_service.py              # Email notification service
│   │   ├── notification_service.py      # App alert notifications service
│   │   ├── owner_service.py             # Property owner management service
│   │   ├── payment_service.py           # Rent & deposit payment processing
│   │   ├── property_service.py          # Hostel, Apartment, Commercial listings
│   │   ├── request_service.py           # Advance booking & request workflows
│   │   ├── tenant_service.py            # Tenant registration & onboarding
│   │   └── vacate_service.py            # Vacate request approval service
│   ├── admin.py            # Django Admin site customization
│   ├── apps.py             # App configuration
│   ├── consumers.py        # Django Channels WebSocket handlers
│   ├── jwt_utils.py        # JWT token generation utilities
│   ├── mail_service.py     # Mail sender helper
│   ├── middleware.py       # Custom request/response middleware
│   ├── models.py           # Database schema definition
│   ├── push_notifications.py # FCM / Expo Push Notifications engine
│   ├── routing.py          # WebSocket URL routing definitions
│   ├── serializers.py      # DRF request/response serializers
│   ├── signals.py          # Django model event signals
│   ├── urls.py             # REST API endpoint route mappings
│   └── views.py            # API ViewSets and View Controllers
├── .env                    # Environment variables file
├── manage.py               # Django CLI entry point
├── manage_admin.py         # Utility script for admin creation & password reset
├── check_payments.py       # Audit script for payment records
├── check_schema.py         # Database schema validator
├── requirements.txt        # Python package dependencies
└── test_e2e_rennto_audit.py # End-to-end audit test script
```

---

## ⚙️ Services Layer Overview

The backend uses a service-oriented pattern inside `HAC/services/`:

| Service | Primary Responsibility |
| :--- | :--- |
| **`auth_service.py`** | Handles SMS OTP generation via 2Factor API, demo mode OTPs (`2121`), tenant & owner login, admin phone verification, and JWT issuance. |
| **`property_service.py`** | Manages property listings (Hostels, Apartments, Commercial spaces), location geocoding, building specs, and image attachments. |
| **`layout_service.py`** | Dynamically constructs and updates floor plans, rooms, flats, sections, and bed assignments. |
| **`bed_service.py`** | Manages bed availability states (`available`, `booked`, `occupied`, `maintenance`). |
| **`tenant_service.py`** | Handles tenant onboarding, identity proof verification, and agreement generation. |
| **`owner_service.py`** | Manages owner registration, bank account details, and UPI information. |
| **`payment_service.py`** | Processes rent transactions, advance booking fees, security deposits, and ledger updates. |
| **`vacate_service.py`** | Handles tenant vacate requests, move-out dates, and deposit refunds. |
| **`issue_service.py`** | Manages complaint ticketing between tenants, property owners, and admins. |
| **`dashboard_service.py`** | Calculates occupancy rates, monthly revenues, and admin metrics. |

---

## 📋 Prerequisites

- **Python**: Version 3.12 or higher
- **PostgreSQL**: Version 14 or higher (or SQLite for local development)
- **Redis**: Server v6+ (required for WebSockets and OTP cache)
- **Virtual Environment**: `venv` or `virtualenv`

---

## 🔐 Environment Configuration (`.env`)

Create a `.env` file in the root `BackendServer` directory:

```env
# Django Settings
SECRET_KEY=your-super-secret-django-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,192.168.88.43

# Database Configuration (PostgreSQL)
DB_NAME=rennto_db
DB_USER=postgres
DB_PASSWORD=your-db-password
DB_HOST=localhost
DB_PORT=5432

# Redis Cache & WebSockets Channel Layer
REDIS_URL=redis://127.0.0.1:6379/1

# 2Factor SMS OTP Service
TWO_FACTOR_API_KEY=your-2factor-api-key

# AWS S3 Storage (Optional for local media uploads)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_STORAGE_BUCKET_NAME=rennto-media-bucket
AWS_S3_REGION_NAME=ap-south-1

# Push Notifications
FCM_SERVER_KEY=your-fcm-server-key
```

---

## 🚀 Installation & Local Setup

### 1. Navigate to Backend Server
```bash
cd BackendServer
```

### 2. Create and Activate Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux / macOS
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run Database Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 5. Create Admin Account
To create a platform administrator:
```bash
python manage_admin.py
```
Follow the interactive prompts to set up an admin phone number and password.

### 6. Run Local Development Server

#### Option A: Standard Django Development Server (WSGI)
```bash
python manage.py runserver 0.0.0.0:8000
```

#### Option B: Daphne ASGI Server (Required for WebSockets)
```bash
daphne -b 0.0.0.0 -p 8000 BMS.asgi:application
```

---

## 🛠️ Management Commands & Utility Scripts

| Command / Script | Purpose |
| :--- | :--- |
| `python manage.py runserver` | Starts local Django development HTTP server. |
| `python manage.py migrate` | Applies pending database schema migrations. |
| `python manage_admin.py` | Command-line tool to list admins, create new admins, or reset admin passwords. |
| `python check_payments.py` | Audit script to check payment transaction consistency. |
| `python check_schema.py` | Validates database tables and model schemas. |
| `python test_e2e_rennto_audit.py` | Executes end-to-end integration and API audit tests. |

---

## 🔌 API Endpoints Overview

Core API routes are defined in `HAC/urls.py`:

### Authentication & Users
- `POST /api/auth/send-otp/` - Request SMS OTP for login/register
- `POST /api/auth/verify-otp/` - Verify OTP and receive JWT access/refresh tokens
- `POST /api/auth/admin-login/` - Admin authentication endpoint

### Property & Layout Management
- `GET /api/properties/` - List registered properties (Hostel, Apartment, Commercial)
- `POST /api/properties/` - Create a new property listing with images
- `GET /api/properties/{id}/layout/` - Fetch building layout (floors, rooms, beds)
- `POST /api/properties/{id}/update-layout/` - Update floor and room setup

### Bookings & Occupancy
- `POST /api/bookings/advance/` - Submit advance room/bed booking
- `POST /api/bookings/vacate/` - Submit vacate request
- `GET /api/bookings/owner-requests/` - Fetch pending owner approval requests

### Payments
- `POST /api/payments/create-order/` - Initiate payment transaction
- `POST /api/payments/verify/` - Verify Razorpay payment signature
- `GET /api/payments/history/` - Retrieve payment transaction ledger

---

## 📡 WebSockets & Real-Time Communication

- **ASGI Application**: `BMS/asgi.py`
- **Routing**: `HAC/routing.py`
- **Consumer**: `HAC/consumers.py` (`RenntoConsumer`)
- **Use Cases**:
  - Live bed state updates when booked by tenants.
  - Real-time notification popups on the Admin Panel and Mobile App.
  - Instant complaint status updates.

---

## ❓ Troubleshooting & FAQs

#### 1. Demo Mode OTP Issues
- If `demo_mode_enabled` is set to `True` in `SystemSettings`, use OTP **`2121`** for configured demo mobile numbers.

#### 2. SMS OTP Not Received
- Ensure `TWO_FACTOR_API_KEY` is configured in your `.env` file.
- Verify the phone number is 10 digits without country code.

#### 3. Redis Connection Error
- Ensure Redis server is running locally (`redis-server`) or update `REDIS_URL` in `.env`.
