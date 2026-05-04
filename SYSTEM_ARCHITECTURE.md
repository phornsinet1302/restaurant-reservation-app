# Restaurant Reservation App - System Architecture

## 📊 High-Level Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile Client (React Native)              │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐    │
│  │   Customers  │  │   Merchants  │  │   Stories       │    │
│  └──────────────┘  └──────────────┘  └────────────────┘    │
└────────────────────┬─────────────────────────────────────────┘
                     │ HTTP/REST + WebSocket
┌────────────────────▼─────────────────────────────────────────┐
│            Express.js Backend Server (Port 3000)              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  API Routes & Controllers                               │ │
│  │  • Auth • Restaurants • Reservations • Notifications    │ │
│  │  • Menus • Media • Reviews • Stories                    │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Socket.IO Server (Real-time Updates)                   │ │
│  │  • Booking confirmations/rejections                    │ │
│  │  • Notifications • Auto-reject rules                    │ │
│  └─────────────────────────────────────────────────────────┘ │
└────────────────────┬─────────────────────────────────────────┘
                     │ SQL / REST API
┌────────────────────▼─────────────────────────────────────────┐
│            Supabase (PostgreSQL Database)                     │
│  • Users • Restaurants • Tables • Reservations               │
│  • Notifications • Reviews • Stories • Media                 │
└──────────────────────────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
    ┌────────┐ ┌──────────┐ ┌─────────┐
    │ Google │ │ Nodemailer│ │ Storage │
    │ Maps   │ │  (SMTP)   │ │ Bucket  │
    └────────┘ └──────────┘ └─────────┘
```

---

## 🎨 Frontend Architecture

### Technology Stack
- **Framework**: React Native (Expo)
- **Routing**: Expo Router
- **State Management**: React Hooks + Context API
- **HTTP Client**: Axios
- **Real-time**: Socket.IO Client
- **Maps**: react-native-maps (Google Maps)
- **Storage**: AsyncStorage
- **Media**: Expo Image Picker, Expo Video

### Key Components/Screens

#### Customer Side
- **Restaurant Listing** - Browse restaurants with Google Maps
- **Restaurant Detail** - View menu, photos, reviews, location
- **Booking** - Select table, date, time with location tracking
- **Booking Confirmation** - Real-time status updates via WebSocket
- **Stories** - View restaurant stories (videos/images)
- **Profile** - User authentication & settings

#### Merchant Side
- **Restaurant Management** - Publish/update restaurant info
- **Booking Dashboard** - Manage incoming reservations
- **Booking Confirmation/Rejection** - With auto-reject rules
- **Manage Stories** - Upload and manage story content
- **Menu Management** - Add/edit menu items and photos

### Real-time Communication Hook
```typescript
// useBookingUpdates.ts
- Connects to Socket.IO server
- Joins customer-specific rooms
- Listens for: booking_confirmed, booking_rejected, booking_cancelled
- Auto-reconnection with exponential backoff
```

---

## 🔧 Backend Architecture

### Technology Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **WebSocket**: Socket.IO v4.8.3
- **Database ORM**: Sequelize
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Email**: Nodemailer
- **File Upload**: Multer
- **Database Client**: Supabase JS SDK

### API Routes & Controllers

| Module | Endpoints | Functions |
|--------|-----------|-----------|
| **Auth** | POST /auth/login, /auth/signup, /auth/password-reset | User authentication, JWT issuance |
| **Restaurants** | GET/POST restaurants, filters | Create/retrieve restaurant info, publish |
| **Tables** | GET/POST tables by restaurant | Manage restaurant tables |
| **Reservations** | POST /confirm, /reject, /cancel | Create and manage bookings |
| **Notifications** | GET notifications | Fetch user notifications |
| **Menus** | GET/POST menus, menu items | Restaurant menu management |
| **Media** | POST upload, GET files | Handle restaurant photos/videos |
| **Stories** | GET/POST/DELETE stories | Manage story content (24-hr expiration) |
| **Menu Photos** | POST upload, GET photos | Menu item photos |
| **Reviews** | POST/GET reviews | Customer reviews |
| **Merchant** | GET orders, statistics | Merchant dashboard data |
| **Favorites** | POST/DELETE favorites | Customer favorites |

### Core Services
1. **Authentication Service** - JWT-based, role-based access (customer/merchant)
2. **Reservation Service** - Booking logic, status management, auto-rejection
3. **Notification Service** - Database notifications + WebSocket real-time events
4. **Story Service** - 24-hour expiration, video/image support
5. **Email Service** - Booking confirmations, password resets (Nodemailer)

### Real-time WebSocket Events
```javascript
// Server emits to client rooms
socket.io('/customer-{customerId}')
  ├─ booking_confirmed
  ├─ booking_rejected
  ├─ booking_cancelled
  └─ notification

// Room-based messaging for privacy
socket.emit('join_room', customerId);
io.to(`customer-${customerId}`).emit('booking_confirmed', data);
```

---

## 🗄️ Database Schema (Supabase PostgreSQL)

### Core Tables
- **users** - Customer & merchant accounts
- **restaurants** - Restaurant profiles
- **tables** - Restaurant table inventory
- **reservations** - Booking records
- **menus** - Menu items per restaurant
- **notifications** - User notifications (history)
- **stories** - Time-limited story posts
- **reviews** - Customer reviews
- **favorites** - Customer favorite restaurants
- **media** - Restaurant photos/videos
- **menu_photos** - Menu item images

### Key Relationships
```
merchants (users with role='merchant')
    ├─ restaurants
    │   ├─ tables
    │   ├─ menus
    │   ├─ stories
    │   ├─ reviews
    │   ├─ media
    │   └─ menu_photos
    └─ reservations ◄── customers

customers (users with role='customer')
    ├─ reservations
    ├─ reviews
    ├─ favorites
    └─ notifications
```

---

## 🔐 Authentication & Security

### JWT Flow
```
1. User signup/login → Generate JWT token
2. Token stored in AsyncStorage (frontend)
3. Token sent in API headers (Authorization: Bearer {token})
4. Socket.IO auth includes token in handshake
5. Backend middleware validates JWT on all routes
```

### Password Security
- Bcrypt hashing (salt rounds)
- Password reset via email link
- Email confirmation for sensitive actions

### Role-Based Access Control
- **Customer**: Browse, book, review
- **Merchant**: Manage restaurant, view bookings, confirm/reject
- **Admin**: Full access (implied)

---

## 🌐 External Integrations

### 1. Google Maps API
- **Purpose**: Location display, distance calculation
- **Integration Points**:
  - Restaurant listing with map markers
  - Restaurant detail map view
  - Customer location tracking during booking
  - Distance display
- **API Keys**: Configured in app.json (iOS & Android)

### 2. Email Service (Nodemailer)
- **Purpose**: Booking confirmations, password resets
- **SMTP Configuration**: Environment variables
- **Templates**: Dynamic booking confirmation emails

### 3. Storage (Supabase Storage)
- **Buckets**:
  - `restaurant-videos` - Story videos
  - `restaurant-images` - Restaurant & menu photos
  - `stories` - User-uploaded stories
- **Policies**: Public read access with RLS

---

## 🔄 Key User Flows

### 1. Customer Booking Flow
```
1. Browse restaurants (with Google Maps)
2. View restaurant details
3. Select table, date, time
4. Create reservation → Backend
5. WebSocket event: booking_confirmed/rejected
6. Real-time UI update
7. Email confirmation sent
8. Notification stored in DB
```

### 2. Merchant Booking Management Flow
```
1. Receive booking notification (WebSocket)
2. View in dashboard
3. Confirm or reject
4. Auto-rejection if rules apply
5. WebSocket event sent to customer
6. Notification email sent
7. Both parties notified in real-time
```

### 3. Story Lifecycle Flow
```
1. Merchant uploads story (video/image)
2. Stored in Supabase Storage
3. DB record with 24-hr expiration
4. Customers view on restaurant detail
5. Auto-cleanup: Expires after 24 hours
6. Soft delete or archive
```

---

## 📊 Real-time Updates Architecture

### Socket.IO Implementation
```javascript
// Connection & Room Management
socket.connect() → auth with JWT
socket.emit('join_room', customerId)
socket.on('booking_confirmed', handleUpdate)

// Broadcasting
io.to(`customer-${customerId}`).emit('event', data)

// Fallback
If WebSocket fails → Email still sent, DB still updated
```

### Notification Channels
1. **Real-time** - WebSocket (Socket.IO)
2. **Persistent** - Database notifications table
3. **Email** - SMTP (Nodemailer)
4. **Hybrid** - Ensures delivery even if one channel fails

---

## 🚀 Deployment Architecture

### Current Setup (Development)
- **Frontend**: Runs on development machine (Expo CLI)
- **Backend**: Node.js on port 3000
- **Database**: Supabase cloud (managed PostgreSQL)
- **Storage**: Supabase Storage buckets

### Environment Configuration
```env
BACKEND/.env
├─ SUPABASE_URL
├─ SUPABASE_ANON_KEY
├─ SUPABASE_SERVICE_KEY
├─ EMAIL_SERVICE (SMTP)
├─ JWT_SECRET
└─ CORS_ORIGIN

FRONTEND/app.json
├─ EXPO_PUBLIC_API_BASE_URL
├─ googleMapsApiKey (iOS & Android)
└─ EXPO_PUBLIC_APP_OWNER
```

---

## 🔧 Technical Highlights

### 1. Separation of Concerns
- **Controllers** - Request handling
- **Routes** - Endpoint definitions
- **Models** - Database schemas
- **Middleware** - JWT verification, error handling

### 2. Real-time vs Traditional
- **Real-time**: Instant booking updates, notifications
- **Fallback**: Email + Database for reliability

### 3. Scalability Considerations
- Room-based Socket.IO messaging (not broadcast to all)
- Database indexing on frequently queried fields
- JWT for stateless authentication
- Async operations for heavy tasks

### 4. Error Handling
- Try-catch blocks in all endpoints
- Graceful WebSocket disconnection
- Email fallback for notification failures
- Comprehensive logging

---

## 📈 Performance & Reliability

### Caching Strategy
- AsyncStorage for user token & preferences
- In-memory socket connections (per customer)

### Database Optimization
- Indexed foreign keys
- Story auto-cleanup (24-hr TTL)
- Notification archival

### Resilience
- WebSocket auto-reconnection (up to 5 attempts)
- Email fallback for critical notifications
- Transaction rollback on errors
- Graceful degradation when external services unavailable

---

## 🎯 Key Metrics

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | React Native + Expo | Cross-platform mobile |
| Backend | Node.js + Express | API & real-time server |
| Database | PostgreSQL (Supabase) | Persistent storage |
| WebSocket | Socket.IO | Real-time updates |
| Maps | Google Maps API | Location services |
| Email | Nodemailer | Notifications |
| Storage | Supabase Storage | Media hosting |

---

## 📝 Summary

This restaurant reservation system follows a **3-tier architecture**:

1. **Presentation Layer** - React Native mobile app (iOS/Android)
2. **Application Layer** - Express.js REST API + Socket.IO WebSocket
3. **Data Layer** - PostgreSQL database with Supabase

The system emphasizes **real-time communication** through Socket.IO with **fallback mechanisms** (email + DB) for reliability. **Role-based access control** separates customer and merchant workflows, while **JWT authentication** ensures secure API access.
