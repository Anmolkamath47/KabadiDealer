# Kabadidealer (Dealer / Collector Partner Application)

> **Kabadidealer** is an enterprise-grade, dedicated partner web application for scrap dealers and recycling collectors. Built with real-time Socket.IO dispatching, audio siren alarms, interactive Leaflet GPS navigation, 4-digit doorstep OTP verification, digital scale weighment settlement, and rate card management.

---

## 🚀 Key Highlights & Architecture

- **Completely Isolated Architecture**: Standalone Dealer application in `/kabadidealer` with its own Express + TypeScript backend (Port `5001`), Vite + React + Tailwind frontend (Port `5174`), in-memory MongoDB fallback with pre-seeded dealer profiles, and standalone Socket.IO server.
- **Audible Emergency Siren Alert**: Uses the browser Web Audio API oscillator synthesis (`650Hz` <-> `920Hz`) for zero-dependency, ultra-crisp audio alarms on incoming pickup requests with 60s countdown timer.
- **Interactive Live Map & GPS**: Real-time Leaflet tracking with dealer truck icon, customer home pin, dynamic ETA, and live location updates.
- **Doorstep OTP Handshake**: Secure 4-digit OTP verification preventing unauthorized order completions.
- **Digital Scale Calculator**: Dynamic multi-item scale weighment entry with instant rate multiplication, total payout computation, and digital invoice generation.
- **Cross-App Communication**: Direct REST webhook integration and Socket.IO event synchronization with Kabadiwala consumer backend.

---

## 🛠️ Tech Stack & Directory Structure

```
kabadidealer/
├── backend/
│   ├── src/
│   │   ├── config/          # Environment variables & MongoDB Connection
│   │   ├── controllers/     # Auth, Dealer, Order, and Internal Webhook Controllers
│   │   ├── middleware/      # JWT Auth, Internal Auth, Request Validation, Error Handler
│   │   ├── models/          # Dealer, DealerOrder Mongoose Models
│   │   ├── routes/          # Express API route modules
│   │   ├── services/        # Order Lifecycle Engine, Cross-App Webhooks, Auth Services
│   │   ├── sockets/         # Real-time Socket.IO dispatch manager
│   │   ├── tests/           # Automated end-to-end test suite (20/20 test cases)
│   │   ├── app.ts           # Express App setup
│   │   └── server.ts        # HTTP + WebSocket Server on Port 5001
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    ├── src/
    │   ├── components/      # Header, BottomNav, Toast, Modals, Live Map, Simulator
    │   ├── context/         # DealerAuthContext, DealerOrderContext
    │   ├── pages/           # Splash, Login, OTP, Duty Home, Map, Rates, History, Profile
    │   ├── services/        # Axios API, Web Audio Siren, Map, Sockets, Simulator
    │   ├── types/           # TypeScript interfaces & Enums
    │   ├── App.tsx          # Route Guards & Global Alert Modals
    │   ├── main.tsx         # Root mounting point
    │   └── index.css        # Tailwind & Leaflet styles
    ├── package.json
    └── vite.config.ts
```

---

## 🔌 Port & Network Configuration

| Application | Service | Local URL | Port |
| :--- | :--- | :--- | :--- |
| **Kabadidealer** | Frontend Partner App | `http://localhost:5174` | `5174` |
| **Kabadidealer** | Backend & Socket.IO | `http://localhost:5001` | `5001` |
| **Kabadiwala** | Consumer Web App | `http://localhost:5173` | `5173` |
| **Kabadiwala** | Backend & Socket.IO | `http://localhost:5000` | `5000` |

---

## 🔑 Default Partner Credentials (Pre-seeded)

| Phone | Name | Business | Area | Vehicle |
| :--- | :--- | :--- | :--- | :--- |
| `9876543210` | Ramesh Kumar | Ramesh Green Recycling | Connaught Place, New Delhi | DL 1AA 1234 |
| `9876543211` | Suresh Verma | Verma Scrap & Metals | Karol Bagh, New Delhi | DL 1BB 5678 |

> **OTP for all demo logins**: `1234`

---

## 🔄 Order Lifecycle State Machine

```
[PENDING] (Customer books pickup)
   │
   ▼
[ACCEPTED] (Dealer hears siren, views scrap items, accepts booking within 60s)
   │
   ▼
[DEALER_EN_ROUTE] (Dealer taps 'Start Navigation', sends live GPS coords to customer)
   │
   ▼
[ARRIVED / OTP_PENDING] (Dealer reaches customer doorstep, asks customer for 4-digit OTP)
   │
   ▼
[OTP_VERIFIED] (OTP verified; digital scale weighment starts for paper, metals, plastics)
   │
   ▼
[COMPLETED] (Final certified weight recorded, total payout generated and settled)
```

---

## 🧪 Automated Backend Test Suite

Run backend tests:
```bash
cd backend
npm test
```
*Result: 20 passed / 0 failed across Auth, Duty Status, Booking Dispatch, Sockets, OTP Verification, and Order Settlement.*

---

## 🌐 Running Locally

1. **Start Backend Server**:
   ```bash
   cd kabadidealer/backend
   npm run dev
   ```
   *Runs on `http://localhost:5001` with automated in-memory MongoDB fallback.*

2. **Start Frontend Client**:
   ```bash
   cd kabadidealer/frontend
   npm run dev
   ```
   *Runs on `http://localhost:5174`.*
