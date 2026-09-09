# Rennto - Mobile App

A cross-platform **React Native** application built with **Expo SDK 54** for Property Owners and Tenants on the **Rennto** Housing & Accommodation Platform. This application provides real-time property discovery, room/bed bookings, online rent payments, owner property management, floor layout design, vacate approvals, complaint handling, multi-account switching, multi-language support (i18n), and push notifications.

---

## 📌 Table of Contents

- [Features Overview](#-features-overview)
  - [Owner Features](#-owner-features)
  - [Tenant Features](#-tenant-features)
  - [Cross-Platform Capabilities](#-cross-platform-capabilities)
- [Tech Stack & Libraries](#-tech-stack--libraries)
- [Directory Structure](#-directory-structure)
- [Prerequisites](#-prerequisites)
- [Environment & API Setup](#-environment--api-setup)
- [Getting Started](#-getting-started)
- [Available Scripts](#-available-scripts)
- [Key Modules & Workflows](#-key-modules--workflows)
- [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## ✨ Features Overview

### 🏠 Owner Features
- 📝 **Multi-Property Registration & Layout Designer**
  - Register **Hostels**, **Apartments**, and **Commercial** properties with multi-step registration forms.
  - Indian currency input validation & automatic formatting (`1,000`, `10,000`, `1,00,00,000`).
  - Dynamic digit restrictions per property type (Hostel: 5 digits max, Apartment: 5 digits max, Commercial: 8 digits max).
  - Interactive floor layout creator for floors, rooms, beds, flats, and commercial sections.

- 👥 **Tenant & Occupancy Management**
  - View real-time bed availability and occupancy status.
  - Approve or reject advance booking requests and vacate requests.
  - Monitor tenant KYC identity documents.

- 💰 **Payments & Financial Ledger**
  - Collect rent payments, record offline cash payments, and generate PDF transaction receipts.
  - Track property expenses (`AddExpenseScreen.js`, `OwnerExpenseHistoryScreen.js`).

- 🔄 **Multi-Account Switcher (`OwnerAccountContext`)**
  - Seamlessly switch between multiple property owner profiles without re-authenticating (`AccountSwitcherSheet.js`).

### 👤 Tenant Features
- 🔍 **Property Discovery & Search**
  - Explore Hostels, Apartments, and Commercial properties filtered by location, amenities, and property type.
  - View interactive maps (`react-native-maps`), room photos, bed options, and pricing.

- 🛌 **Instant Room & Bed Booking**
  - Book specific beds or full flats with real-time availability sync.

- 💳 **Seamless Payments**
  - Pay monthly rent, security deposits, and advance fees using **Razorpay** (UPI, Debit/Credit Card, Net Banking) or QR codes.

- 🛠️ **Complaints & Service Requests**
  - Submit maintenance requests and complaints directly to property owners.
  - Request hostel/room transfers and submit vacate notices with move-out tracking.

### 🌐 Cross-Platform Capabilities
- 🌍 **Multi-Language Support (i18n)**
  - Localization support for English, Hindi, Telugu, Tamil, Malayalam, Marathi, Punjabi, Odia, and more using `i18next`.
- 📶 **Offline & Maintenance Handling**
  - Real-time network detection (`NetworkContext`) with custom offline warning banner (`OfflineBanner.js`).
  - System maintenance mode alert banner (`MaintenanceBanner.js`).

---

## 🛠️ Tech Stack & Libraries

### Core Frameworks & Navigation
- **React Native**: 0.81 (React 19)
- **Expo SDK**: 54 (`expo`, `expo-router`, `expo-cli`)
- **React Navigation v7**: `@react-navigation/native`, `@react-navigation/stack`, `@react-navigation/bottom-tabs`

### UI, Animations & Interactivity
- **Reanimated & Gesture Handler**: `react-native-reanimated` v4, `react-native-gesture-handler`
- **Bottom Sheet**: `@gorhom/bottom-sheet`
- **Animations**: `lottie-react-native`, `expo-linear-gradient`
- **Vector Icons & SVGs**: `@expo/vector-icons`, `react-native-svg`

### Hardware & Media APIs
- **Maps & Location**: `react-native-maps`, `expo-location`
- **Pickers & Files**: `expo-image-picker`, `expo-document-picker`, `expo-camera`, `expo-file-system`
- **Push Notifications**: `expo-notifications`, `PushNotificationService.js`

### Storage & Payments
- **Storage**: `@react-native-async-storage/async-storage`
- **Payments**: `react-native-razorpay`, `react-native-qrcode-svg`
- **Network**: `axios`, `@react-native-community/netinfo`

---

## 📁 Directory Structure

```
MobileApp/
├── assets/                  # App icons, splash screens, illustration images
├── scripts/                 # Utility scripts (e.g. reset-project.js)
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── AccommodationChangeModal.js # Hostel transfer modal
│   │   ├── AccountSwitcherSheet.js    # Owner multi-account switcher sheet
│   │   ├── BlinkingBadge.js           # Status alert badge
│   │   ├── CustomCropper.js           # Image cropper
│   │   ├── LanguageSelector.js        # Language picker component
│   │   ├── MaintenanceBanner.js       # System maintenance warning banner
│   │   └── OfflineBanner.js           # Network disconnection banner
│   ├── config/
│   │   └── Api.js                 # Base API URL & fetch wrapper
│   ├── context/               # Global React state providers
│   │   ├── BookingContext.js          # Tenant booking state
│   │   ├── MaintenanceContext.js      # System maintenance state
│   │   ├── NetworkContext.js          # Real-time network status
│   │   ├── OwnerAccountContext.js     # Multi-account switcher provider
│   │   └── TenantContext.js           # Tenant session provider
│   ├── hooks/                 # Custom React hooks (useNetwork, useHostelChange)
│   ├── i18n/                  # Multi-language translation bundles (locales/)
│   ├── navigation/            # Navigation stacks & tab bar configurations
│   │   ├── MainNavigator.js           # Root navigator controller
│   │   ├── OwnerNavigaton.js          # Owner stack & bottom tabs
│   │   └── TenantNavigation.js        # Tenant stack & bottom tabs
│   ├── screens/               # Screen views
│   │   ├── auth/                  # Authentication screens
│   │   │   ├── OwnerLoginScreen.js         # Owner phone OTP login
│   │   │   ├── OwnerRegistrationScreen.js  # Multi-step property setup
│   │   │   ├── RoleSection.js              # Role selection screen
│   │   │   └── TenantRegisterScreen.js     # Tenant onboarding & login
│   │   ├── onboarding/            # Onboarding carousel screens
│   │   ├── owner/                 # Owner management screens
│   │   │   ├── AddExpenseScreen.js         # Add property expense
│   │   │   ├── OwnerEditBuildingScreen.js  # Building layout editor
│   │   │   ├── OwnerHomeScreen.js          # Main owner dashboard
│   │   │   ├── OwnerIssuesScreen.js        # Tenant issues manager
│   │   │   ├── OwnerPaymentScreen.js       # Payment collection ledger
│   │   │   ├── OwnerTenantsScreen.js       # Tenant directory
│   │   │   └── OwnerVacateRequestsScreen.js # Vacate approvals
│   │   └── tenant/                # Tenant screens
│   │       ├── ApartmentScreen.js          # Apartment property detail
│   │       ├── CommercialScreen.js         # Commercial property detail
│   │       ├── HostelScreen.js             # Hostel property detail
│   │       ├── TenantHomeScreen.js         # Tenant discovery home
│   │       ├── TenantPaymentScreen.js      # Rent payment checkout
│   │       └── TenantProfileScreen.js      # Tenant profile & requests
│   ├── services/              # API services
│   ├── theme/                 # App colors & typography design system
│   └── utils/                 # Utilities (NotificationsProxy, reportGenerator)
├── package.json               # Package manifests & scripts
├── tsconfig.json              # TypeScript configuration
└── vite.config.js             # Web bundler configuration
```

---

## 📋 Prerequisites

Before running the application, ensure you have installed:
- **Node.js**: v18.0.0 or higher
- **Expo CLI**: Installed globally or executed via `npx expo`
- **Expo Go App**: Installed on your physical iOS/Android phone, OR
- **Android Studio / Xcode**: For Android Emulator or iOS Simulator

---

## ⚙️ Environment & API Setup

API host endpoints are configured in `src/config/Api.js`.

To connect the Mobile App to your local or staging backend server:

1. Open `src/config/Api.js`.
2. Set your machine's local IP address or production URL:

```javascript
// Local LAN Development (Replace with your local IP address)
const BASE_URL = "http://192.168.88.43:8000";

// Production
// const BASE_URL = "https://api.rennto.in";

export default BASE_URL;
```

> **Note for Android Emulator**: Use `http://10.0.2.2:8000` to reach Django running on `localhost`.
> **Note for Physical Phone**: Ensure your phone and development machine are connected to the **same Wi-Fi network**.

---

## 🚀 Getting Started

### 1. Navigate to MobileApp Directory
```bash
cd MobileApp
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Expo Bundler

#### Interactive Expo Start
```bash
npm start
```

#### Start on Local Network (LAN)
```bash
npm run start:lan
```

#### Start Tunnel Mode (For testing over remote networks)
```bash
npm run tunnel
```

### 4. Launch App on Device or Emulator
- **Physical Device**: Open **Expo Go** app on your phone and scan the QR code displayed in the terminal.
- **Android Emulator**: Press `a` in the terminal output.
- **iOS Simulator**: Press `i` in the terminal output.
- **Web Browser**: Run `npm run web` or press `w` in the terminal output.

---

## 📜 Available Scripts

In the project directory, you can run:

| Command | Description |
| :--- | :--- |
| `npm start` | Launches the Expo development server with Metro bundler. |
| `npm run start:lan` | Launches Expo bundler explicitly set for local LAN IP. |
| `npm run tunnel` | Launches Expo bundler via Ngrok tunnel for remote testing. |
| `npm run android` | Runs native Android build pipeline (`expo run:android`). |
| `npm run ios` | Runs native iOS build pipeline (`expo run:ios`). |
| `npm run web` | Serves the app in web browser via Metro Web. |
| `npm run lint` | Checks code formatting and ESLint rules. |

---

## 💡 Key Modules & Workflows

### 1. Basic Rent Validation & Currency Formatting
Located in `OwnerRegistrationScreen.js`:
- Uses Indian number formatting for display (`formatIndianNumber`).
- Automatically formats digits on the fly (e.g., `1000` $\rightarrow$ `1,000`, `100000` $\rightarrow$ `1,00,000`).
- Restricts numeric digit entry according to property type:
  - **Hostel**: 5 digits max
  - **Apartment**: 5 digits max
  - **Commercial**: 8 digits max

### 2. Multi-Account Switcher (`OwnerAccountContext`)
Located in `AccountSwitcherSheet.js`:
- Enables property owners managing multiple properties/accounts to switch active context instantaneously without re-authenticating.

---

## ❓ Troubleshooting & FAQs

#### 1. Network Request Failed / Cannot connect to Backend
- Verify that your backend server (`BackendServer`) is running.
- Ensure `BASE_URL` in `src/config/Api.js` uses your computer's actual local IPv4 address (e.g. `http://192.168.x.x:8000`), NOT `localhost` when testing on a physical phone.
- Ensure your phone and PC are connected to the same Wi-Fi network.

#### 2. Metro Bundler Cache Issues
Clear Metro cache and restart Expo:
```bash
npx expo start -c
```

#### 3. Map View not displaying on Android
- Ensure Google Maps API key is configured or fallback to standard tiles in `OwnerRegistrationScreen.js` / `TenantHomeScreen.js`.
