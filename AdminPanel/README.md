# Rennto - Admin Panel

A modern, responsive administrative web application for the **Rennto** Housing & Accommodation Platform. Built with **React 19**, **Vite**, and **Chart.js**, this dashboard provides system administrators with real-time controls to manage property owners, tenants, listings, bookings, payments, complaints, system reports, and global platform configurations.

---

## 📌 Table of Contents

- [Features](#-features)
- [Tech Stack & Dependencies](#-tech-stack--dependencies)
- [Directory Structure](#-directory-structure)
- [Prerequisites](#-prerequisites)
- [Environment Configuration](#-environment-configuration)
- [Getting Started](#-getting-started)
- [Available Scripts](#-available-scripts)
- [API & WebSocket Integration](#-api--websocket-integration)
- [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## ✨ Features

- 🔐 **Admin Authentication & Authorization**
  - Secure phone/OTP and password-based admin login.
  - JWT Bearer token storage in local storage with automatic token refresh and safe HTTP interceptor (`fetchWithAuth`).

- 📊 **Executive Dashboard & Analytics**
  - Real-time performance indicators (Total Revenue, Active Owners, Total Tenants, Total Properties, Occupancy Rates).
  - Interactive charts powered by **Chart.js** (Revenue trends, Property distribution, Monthly growth).
  - Live activity feed tracking recent bookings, payments, and system alerts.

- 🏢 **Property Owner Management (`Owners.jsx`)**
  - Owner onboarding approval workflow.
  - Detailed profile inspect modal (`OwnerDetailsModal.jsx`) showing bank details, UPI ID, linked properties, and active listings.

- 🏘️ **Property Directory & Layouts (`Properties.jsx`)**
  - Complete catalog of registered Hostels, Apartments, and Commercial properties.
  - Granular floor, room, flat, and bed occupancy management (`PropertyDetails.jsx`).

- 📑 **Bookings & Requests (`Bookings.jsx`)**
  - Overview of advance booking requests and vacate requests.
  - Approval, rejection, and room allocation tools.

- 💳 **Payments & Financial Ledger (`Payments.jsx`)**
  - Comprehensive log of all rent payments, security deposits, and advance bookings.
  - Transaction status filtering (Completed, Pending, Failed).

- 🚨 **Complaints & Dispute Resolution (`Complaints.jsx`)**
  - Incident ticket tracking submitted by tenants or owners.
  - Status updates (Pending, In Progress, Resolved).

- 📈 **Reports & Exporting (`Reports.jsx`)**
  - Downloadable platform reports for revenue, property occupancy, and active accounts.

- ⚙️ **System Settings & Maintenance (`Settings.jsx`)**
  - Toggle platform-wide **Demo Mode** and demo phone numbers.
  - Enable/disable global Maintenance Banners.
  - Configure automated SMS and push notification rules.

---

## 🛠️ Tech Stack & Dependencies

### Core Frameworks & Tools
- **React 19** (`react`, `react-dom`): UI component library.
- **Vite 8** (`vite`): Next-generation frontend build tool with HMR (Hot Module Replacement).
- **React Router v7** (`react-router-dom`): SPA routing and layout management.

### UI & Visualization
- **Chart.js & React-ChartJS-2** (`chart.js`, `react-chartjs-2`): Interactive canvas charts.
- **React Icons** (`react-icons`): Icon library (FontAwesome, Material, Ionicons).
- **Vanilla CSS**: Clean, custom responsive design (`App.css`, `index.css`).

### State & Context
- **NotificationContext**: App-wide real-time notification dispatch and alert toasts.

---

## 📁 Directory Structure

```
AdminPanel/
├── public/                  # Static assets & favicon
├── src/
│   ├── assets/              # Logos, images, vector assets
│   ├── components/          # Reusable UI components
│   │   ├── ActivityTable.jsx      # Recent system activity table
│   │   ├── ChartsSection.jsx      # Chart.js analytics grid
│   │   ├── Header.jsx             # Admin topbar with profile & notifications
│   │   ├── OwnerDetailsModal.jsx  # Detailed owner inspector modal
│   │   ├── PropertyDetails.jsx    # Property floor/room viewer
│   │   ├── Sidebar.jsx            # Main navigation sidebar
│   │   └── StatsCards.jsx         # Metric summary cards
│   ├── config/
│   │   └── Api.js                 # Base REST URL, WS URL & fetchWithAuth helper
│   ├── context/
│   │   └── NotificationContext.jsx # Real-time alerts context
│   ├── pages/                 # Main route screens
│   │   ├── Bookings.jsx           # Booking requests page
│   │   ├── Complaints.jsx         # Support tickets page
│   │   ├── Dashboard.jsx          # Main overview dashboard
│   │   ├── Login.jsx              # Admin authentication screen
│   │   ├── Owners.jsx             # Property owners management
│   │   ├── Payments.jsx           # Financial transactions ledger
│   │   ├── Profile.jsx            # Admin profile settings
│   │   ├── Properties.jsx         # Property directory & room manager
│   │   ├── Reports.jsx            # Reports generation page
│   │   ├── Settings.jsx           # System configuration page
│   │   └── Tenants.jsx            # Tenant directory & status
│   ├── styles/                # Component styles
│   ├── App.css                # Global dashboard layout styles
│   ├── App.jsx                # Router setup & authenticated layout
│   ├── index.css              # Reset & base CSS tokens
│   └── main.jsx               # React DOM entry point
├── eslint.config.js          # ESLint setup
├── index.html                 # HTML template entry point
├── package.json               # NPM dependencies & scripts
└── vite.config.js             # Vite configuration
```

---

## 📋 Prerequisites

Ensure you have the following installed on your local machine:
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher (or `yarn` / `pnpm`)
- **Backend Server**: Running instance of `BackendServer` (Django REST backend)

---

## ⚙️ Environment Configuration

API endpoints are configured in `src/config/Api.js`.

To connect the Admin Panel to your running backend:

1. Open `src/config/Api.js`.
2. Update `BASE_URL` to point to your backend server:

```javascript
// Local Development
const BASE_URL = "http://localhost:8000";

// Production / Remote Server
// const BASE_URL = "https://api.rennto.in";

export const WS_BASE_URL = BASE_URL.replace("http://", "ws://").replace("https://", "wss://");
```

---

## 🚀 Getting Started

### 1. Clone & Navigate to AdminPanel
```bash
cd AdminPanel
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
The application will start at `http://localhost:5173` (or the URL provided in the console).

### 4. Build for Production
```bash
npm run build
```
The output static bundle will be created in the `dist/` directory.

### 5. Preview Production Build Locally
```bash
npm run preview
```

---

## 📜 Available Scripts

In the project directory, you can run:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Launches the Vite local development server with HMR. |
| `npm run build` | Compiles and optimizes the app for production in `dist/`. |
| `npm run preview` | Serves the production build locally for verification. |
| `npm run lint` | Runs ESLint to check for code quality and formatting issues. |

---

## 🔌 API & WebSocket Integration

- **`fetchWithAuth(url, options)`**:
  - Automatically retrieves `adminToken` or `token` from `localStorage`.
  - Attaches `Authorization: Bearer <token>` header to outgoing HTTP requests.
  - Handles HTTP status codes gracefully without causing page reload loops.
- **WebSockets (`WS_BASE_URL`)**:
  - Connects to Django Channels WebSocket endpoints for real-time notification streams.

---

## ❓ Troubleshooting & FAQs

#### 1. CORS Error when calling Backend API
- Ensure the `BackendServer` `django-cors-headers` config includes `http://localhost:5173` in `CORS_ALLOWED_ORIGINS` or has `CORS_ALLOW_ALL_ORIGINS = True` in development.

#### 2. Unauthorized (401) on Admin Endpoints
- Make sure you log in via `Login.jsx` using a valid admin phone number registered in the backend (`ADMIN_PHONES`).
- Verify that `adminToken` is successfully stored in browser `localStorage`.

#### 3. WebSocket Connection Failed
- Check that Redis and Daphne/Django Channels are running on the backend server.
