# Booking Notification System - Merchant Actions

## Overview
When a merchant confirms or rejects a booking, both the **customer** and **merchant** receive notifications through multiple channels.

---

## Notification Channels

### 1. **Database Notifications** 📊
- Stored in `notifications` table
- Persisted for later retrieval
- Includes: `title`, `message`, `type`, `is_read` flag
- Can be fetched via `/api/notifications` endpoint

### 2. **Real-time WebSocket Events** ⚡
- Powered by Socket.IO
- Immediate delivery to connected users
- Event name: `notification_received`
- Includes: `title`, `message`, `status`, `reservation_id`, `timestamp`

### 3. **Email** 📧
- Sent to customer only
- Uses configured email service
- HTML formatted with reservation details

---

## Flow: Merchant Confirms Booking ✅

### Endpoint
```
PATCH /api/reservations/merchant/:reservationId/confirm
```

### Database Changes
```
reservations.status: 'pending' → 'confirmed'
```

### Notifications Created

**Customer Notification:**
```
Title: ✅ Booking Confirmed!
Message: Your reservation at {restaurant_name} on {date} at {time} has been confirmed!
Type: booking_confirmed
```

**Merchant Notification:**
```
Title: ✅ Booking Confirmed
Message: You confirmed the reservation for {party_size} guests on {date} at {time}
Type: booking_confirmed
```

### Events Emitted
- Customer receives: `notification_received` + old `reservation_updated`
- Merchant receives: `notification_received`

### Email
- Recipient: Customer email
- Subject: 🍽️ Your Table is Confirmed!
- Body: Restaurant name included

---

## Flow: Merchant Rejects Booking ❌

### Endpoint
```
PATCH /api/reservations/merchant/:reservationId/reject
```

### Database Changes
```
reservations.status: 'pending' → 'rejected'
```

### Notifications Created

**Customer Notification:**
```
Title: ❌ Booking Rejected
Message: Your reservation at {restaurant_name} on {date} at {time} has been rejected. Please try another time.
Type: booking_rejected
```

**Merchant Notification:**
```
Title: ✅ Booking Rejected
Message: You rejected the reservation for {party_size} guests on {date} at {time}
Type: booking_rejected
```

### Events Emitted
- Customer receives: `notification_received` + old `reservation_updated`
- Merchant receives: `notification_received`

### Email
- Recipient: Customer email
- Subject: Update regarding your reservation at {restaurant_name}
- Body: HTML formatted with date, time, and reason

---

## Frontend Integration

### Listening for Real-time Notifications
```javascript
// Connect to Socket.IO
const socket = io('http://localhost:5000');

// Listen for notifications
socket.on('notification_received', (notification) => {
  console.log('🔔 Notification:', notification.title);
  console.log('   Message:', notification.message);
  console.log('   Status:', notification.status);
  
  // Update UI here
  // - Show toast/alert
  // - Refresh reservation list
  // - Update badge counter
});

// Listen for old-style events (backward compatibility)
socket.on('reservation_updated', (data) => {
  console.log('Reservation updated:', data.message);
});
```

### Fetching Notifications from Database
```javascript
// GET all notifications for current user
fetch('/api/notifications', {
  headers: { 'Authorization': 'Bearer TOKEN' }
})
.then(res => res.json())
.then(notifications => {
  // notifications = [{id, user_id, title, message, type, is_read, created_at}, ...]
});

// Mark notification as read
fetch('/api/notifications/:id/read', {
  method: 'PATCH',
  headers: { 'Authorization': 'Bearer TOKEN' }
});
```

---

## Database Schema

### notifications table
```sql
Column              Type        Description
-------             ----        -----------
id                  UUID        Primary key
user_id             UUID        User receiving notification
title               TEXT        Notification title (with emoji)
message             TEXT        Notification body
type                TEXT        'booking_confirmed', 'booking_rejected', etc.
is_read             BOOLEAN     Whether user has read it
created_at          TIMESTAMP   When notification was created
```

---

## Testing Checklist

- [ ] Merchant confirms booking (Customer sees notification in app)
- [ ] Merchant confirms booking (Merchant sees notification)
- [ ] Merchant rejects booking (Customer sees notification)
- [ ] Merchant rejects booking (Merchant sees notification)
- [ ] Notifications appear in real-time (WebSocket)
- [ ] Notifications persist in database
- [ ] Notification emails sent to customer
- [ ] Notifications show correct restaurant name, date, time
- [ ] Notification counter/badge updates correctly
- [ ] Mark as read functionality works

---

## Troubleshooting

### Notifications not appearing
1. Check WebSocket connection: `socket.connected`
2. Verify user is logged in (has JWT token)
3. Check database for notification records
4. Enable debug logging: Check browser console

### Emails not being sent
1. Verify email service is configured in `.env`
2. Check server logs for NODEMAILER errors
3. Verify customer email is valid in database

### Socket.IO not connecting
1. Check that server has `io` instance: `req.app.get('io')`
2. Verify Socket.IO middleware is registered in server setup
3. Check CORS settings allow this origin

---

## API Endpoints Reference

| Method | Endpoint                              | Purpose                  |
|--------|---------------------------------------|--------------------------|
| PATCH  | `/api/reservations/merchant/:id/confirm` | Confirm booking          |
| PATCH  | `/api/reservations/merchant/:id/reject`  | Reject booking           |
| GET    | `/api/notifications`                 | Get user's notifications |
| PATCH  | `/api/notifications/:id/read`        | Mark as read             |
| PATCH  | `/api/notifications/read-all`        | Mark all as read         |
| DELETE | `/api/notifications/:id`             | Delete notification      |

---

## Response Examples

### Confirm Booking Success
```json
{
  "message": "Confirmed and email sent!",
  "data": {
    "id": "uuid",
    "status": "confirmed",
    "reservation_date": "2026-04-10",
    "reservation_time": "19:00",
    "customer_id": "user-uuid",
    "restaurant_id": "restaurant-uuid"
  }
}
```

### Reject Booking Success
```json
{
  "message": "Reservation rejected and email sent.",
  "data": {
    "id": "uuid",
    "status": "rejected",
    "reservation_date": "2026-04-10",
    "reservation_time": "19:00",
    "customer_id": "user-uuid"
  }
}
```

---

## Summary

✅ **Fully implemented two-way notification system** for booking confirmations/rejections
- Database notifications for persistence
- Real-time WebSocket events for instant updates
- Email notifications for customer communication
- Both customer and merchant receive notifications
- Status updates logged and tracked
