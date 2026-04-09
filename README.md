# Restaurant Reservation App

A full-stack restaurant reservation system built with **Expo React Native** (frontend) and **Express.js + Supabase** (backend). Supports both **customer** and **restaurant owner (merchant)** roles.

---

## Prerequisites

- **Node.js** v18+ installed ([download](https://nodejs.org))
- **Expo Go** app installed on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- Mac and phone **on the same Wi-Fi network**

---

## Project Structure

```
restaurant-reservation-app/
├── backend/          # Express.js API server (port 3000)
│   ├── controllers/  # Route handlers
│   ├── routes/       # API routes
│   ├── middleware/    # Auth middleware
│   ├── server.js     # Entry point
│   └── .env          # Backend secrets (Supabase keys)
├── frontend/         # Expo React Native app (port 8081)
│   ├── app/          # Screens (file-based routing via expo-router)
│   ├── components/   # Reusable components
│   ├── constants/    # Colors, config
│   ├── hooks/        # Custom hooks
│   ├── assets/       # Images, fonts
│   └── .env          # Frontend env vars (Google OAuth, backend URL)
└── database/         # SQL scripts
```

---

## How to Run

### Step 1: Get Your Local IP

Open Terminal and run:

```bash
ipconfig getifaddr en0
```

Note the IP (e.g. `10.1.66.92`). Your phone must be on the same Wi-Fi.

### Step 2: Update Frontend `.env`

Edit `frontend/.env` and set the backend URL to your IP:

```
EXPO_PUBLIC_BACKEND_URL=http://YOUR_IP:3000
```

> **Important:** Every time your Wi-Fi/IP changes, you must update this value and restart Expo with `--clear`.

### Step 3: Install Dependencies (first time only)

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Step 4: Start the Backend

```bash
cd backend
node server.js
```

You should see:
```
✅ Supabase Configuration Loaded
Server & WebSockets are running on port 3000
```

### Step 5: Start the Frontend

Open a **new terminal tab**:

```bash
cd frontend
npx expo start --clear
```

A QR code will appear in the terminal.

### Step 6: Open on Your Phone

- **iOS**: Open the Camera app → scan the QR code → tap the Expo Go banner
- **Android**: Open Expo Go app → tap "Scan QR code" → scan it

---

## Quick Restart (after IP change)

```bash
# 1. Get new IP
ipconfig getifaddr en0

# 2. Update frontend/.env with new IP
# EXPO_PUBLIC_BACKEND_URL=http://NEW_IP:3000

# 3. Kill old processes
lsof -ti :3000 | xargs kill -9 2>/dev/null
lsof -ti :8081 | xargs kill -9 2>/dev/null

# 4. Start backend (terminal 1)
cd backend && node server.js

# 5. Start frontend (terminal 2)
cd frontend && npx expo start --clear
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `timeout of 15000ms exceeded` | IP changed — update `frontend/.env` and restart with `--clear` |
| `Cannot determine Expo SDK version` | Make sure you're in the `frontend/` directory, not the root |
| `Port 3000 already in use` | Run `lsof -ti :3000 \| xargs kill -9` then restart backend |
| Google login fails | Check IP in `.env` matches your current network, restart with `--clear` |
| App shows white screen | Check terminal for JS errors, try pressing `r` to reload |

---

## Accounts & Roles

- **Customer**: Sign up normally → gets customer dashboard with search, bookings, favorites
- **Restaurant Owner (Merchant)**: Sign up via restaurant signup → gets merchant dashboard with tables, menu, reservations management

