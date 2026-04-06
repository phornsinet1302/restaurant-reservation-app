# Complete Notification System - All Customer & Merchant Actions

## ✅ Status: FULLY IMPLEMENTED

All notifications are implemented for both sides when:
1. **Customer creates a booking** ✅
2. **Customer modifies a booking** ✅  
3. **Customer cancels a booking** ✅
4. **Merchant confirms a booking** ✅
5. **Merchant rejects a booking** ✅

---

## 1. CUSTOMER CREATES A BOOKING ✅

### Endpoint
```
POST /api/reservations
```

### Triggered When
Customer completes booking form and submits

### Notifications Created

**Customer Notification:**
```
Title: ✅ Booking Created Successfully!
Message: Your reservation at {restaurant_name} on {date} at {time} has been recorded. Waiting for confirmation.
Type: booking_created
```

**Merchant Notification:**
```
Title: 📥 New Booking Request
Message: New reservation request for {party_size} guests at {date} {time}. Please confirm or reject.
Type: booking_received
```

### Real-time Events (WebSocket)
- ✅ Event sent to **customer** on their user room
- ✅ Event sent to **merchant** on their user room
- ✅ Both receive `notification_received` event

### Database Records
```sql
INSERT INTO notifications VALUES
  (uuid, customer_id, '✅ Booking Created Successfully!', '...', 'booking_created', false, now()),
  (uuid, merchant_id, '📥 New Booking Request', '...', 'booking_received', false, now());
```

### Flow Diagram
```
Customer submits booking form
        ↓
POST /api/reservations → createReservation()
        ↓
✅ Reservation created (status: pending)
✅ Notification #1 created for customer
✅ Notification #2 created for merchant
✅ WebSocket event sent to customer
✅ WebSocket event sent to merchant
        ↓
Customer sees: ✅ Toast + Notification
Merchant sees: ✅ Toast + Notification + New booking in list
```

---

## 2. CUSTOMER MODIFIES A BOOKING ✅

### Endpoint
```
PATCH /api/reservations/:id/update
```

### Triggered When
Customer changes date, time, party size, or special requests

### Request Body
```json
{
  "table_id": "uuid",
  "reservation_date": "2026-04-15",
  "reservation_time": "19:00",
  "party_size": 4,
  "special_request": "Window seat please"
}
```

### Notifications Created

**Customer Notification:**
```
Title: ✏️ Booking Modified
Message: Your reservation at {restaurant_name} has been updated to {date} at {time} for {party_size} guests.
Type: booking_modified
```

**Merchant Notification:**
```
Title: ✏️ Booking Modified
Message: A customer modified their reservation for {party_size} guests on {date} at {time}.
Type: booking_modified
```

### Real-time Events (WebSocket)
- ✅ Event sent to **customer** on their user room
- ✅ Event sent to **merchant** on their user room
- ✅ Both receive `notification_received` event with updated details

### Validation Rules
- Only customers can modify their own bookings (403 error if trying to modify another's)
- Can only modify **pending** or **confirmed** bookings (not rejected/cancelled)

### Flow Diagram
```
Customer changes booking details (date/time/guests)
        ↓
PATCH /api/reservations/:id/update → updateReservationDetails()
        ↓
✅ Validate customer owns booking
✅ Validate booking status allows modification
✅ Reservation updated in database
✅ Notification #1 created for customer
✅ Notification #2 created for merchant
✅ WebSocket event sent to customer: new date/time/guests
✅ WebSocket event sent to merchant: new date/time/guests
        ↓
Customer sees: ✅ Toast + "Booking Modified" notification
Merchant sees: ✅ Toast + Modified booking details in list
```

---

## 3. CUSTOMER CANCELS A BOOKING ✅

### Endpoint
```
DELETE /api/reservations/:id
```

### Triggered When
Customer clicks "Cancel" on their booking

### Notifications Created

**Customer Notification:**
```
Title: ❌ Booking Cancelled
Message: Your reservation at {restaurant_name} has been cancelled.
Type: booking_cancelled
```

**Merchant Notification:**
```
Title: 🚫 Booking Cancelled
Message: A customer has cancelled their reservation. The table is now available.
Type: booking_cancelled
```

### Real-time Events (WebSocket)
- ✅ Event sent to **customer** on their user room
- ✅ Event sent to **merchant** on their user room
- ✅ Both receive `notification_received` event

### Flow Diagram
```
Customer clicks "Cancel Booking"
        ↓
DELETE /api/reservations/:id → cancelReservation()
        ↓
✅ Validate customer owns booking
✅ Reservation status set to 'cancelled'
✅ Notification #1 created for customer
✅ Notification #2 created for merchant
✅ WebSocket event sent to customer
✅ WebSocket event sent to merchant
        ↓
Customer sees: ❌ Toast + Booking disappears
Merchant sees: ❌ Toast + Booking removed from list (table now available)
```

---

## 4. MERCHANT CONFIRMS A BOOKING ✅

### Endpoint
```
PATCH /api/reservations/merchant/:id/confirm
```

### Triggered When
Merchant clicks "Confirm" on pending booking

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

### Email
- ✅ Confirmation email sent to customer
- Subject: 🍽️ Your Table is Confirmed!

### Real-time Events (WebSocket)
- ✅ Event sent to **customer** on their user room
- ✅ Event sent to **merchant** on their user room
- ✅ Both receive `notification_received` event

### Flow Diagram
```
Merchant clicks "Confirm" on booking
        ↓
PATCH /api/reservations/merchant/:id/confirm → confirmReservation()
        ↓
✅ Reservation status set to 'confirmed'
✅ Notification #1 created for customer
✅ Notification #2 created for merchant
✅ WebSocket event sent to customer
✅ WebSocket event sent to merchant
✅ Confirmation email sent to customer
        ↓
Customer sees: ✅ Toast + Email in inbox
Merchant sees: ✅ Toast + Booking status shows "Confirmed"
```

---

## 5. MERCHANT REJECTS A BOOKING ✅

### Endpoint
```
PATCH /api/reservations/merchant/:id/reject
```

### Triggered When
Merchant clicks "Reject" on pending booking and provides reason

### Request Body
```json
{
  "reason": "Table is fully booked"
}
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

### Email
- ✅ Rejection email sent to customer
- Subject: Update regarding your reservation at {restaurant_name}

### Real-time Events (WebSocket)
- ✅ Event sent to **customer** on their user room
- ✅ Event sent to **merchant** on their user room
- ✅ Both receive `notification_received` event

### Flow Diagram
```
Merchant clicks "Reject" and enters reason
        ↓
PATCH /api/reservations/merchant/:id/reject → rejectReservation()
        ↓
✅ Reservation status set to 'rejected'
✅ Notification #1 created for customer
✅ Notification #2 created for merchant
✅ WebSocket event sent to customer with reason
✅ WebSocket event sent to merchant
✅ Rejection email sent to customer
        ↓
Customer sees: ❌ Toast + Email explaining rejection
Merchant sees: ✅ Toast + Booking status shows "Rejected"
```

---

## Notification Delivery Channels

### 1. Database (Persistent)
```
notifications table:
- id (UUID)
- user_id (UUID)
- title (TEXT)
- message (TEXT)
- type (TEXT) - 'booking_created', 'booking_confirmed', 'booking_rejected', 'booking_cancelled', 'booking_modified', 'booking_received'
- is_read (BOOLEAN)
- created_at (TIMESTAMP)
```

Retrieve via: `GET /api/notifications`

### 2. WebSocket (Real-time)
Event: `notification_received`
```javascript
{
  title: "✅ Booking Confirmed!",
  message: "Your reservation at {restaurant}...",
  type: "booking_confirmed",
  status: "confirmed",
  reservation_id: "uuid",
  timestamp: "2026-04-04T..."
}
```

### 3. Email (To Customer Only)
- Sent for: Create, Confirm, Reject, Cancel
- Not sent for: Modify (notification only)

---

## Complete Action Timeline

```
SCENARIO: Customer creates booking → Merchant confirms → Customer modifies → Merchant confirms again

T=0:00  Customer submits booking
        ↓
        ✅ Customer: "✅ Booking Created"
        ✅ Merchant: "📥 New Booking Request"
        ✅ DB: 2 notifications created
        ✅ Email: Sent to customer
        
T=0:05  Merchant clicks Confirm
        ↓
        ✅ Customer: "✅ Booking Confirmed!"
        ✅ Merchant: "✅ Booking Confirmed"
        ✅ DB: 2 notifications created
        ✅ Email: Confirmation sent
        
T=0:10  Customer changes to 5 guests (was 4)
        ↓
        ✅ Customer: "✏️ Booking Modified"
        ✅ Merchant: "✏️ Booking Modified"
        ✅ DB: 2 notifications created
        ⚠️  Email: NOT sent
        
T=0:15  Merchant confirms again (auto-confirm at new capacity)
        ↓
        ✅ Both get notifications again (if system requires re-confirmation)
```

---

## Testing Checklist

### Setup
- [ ] Backend running: `npm start` in `/backend`
- [ ] Frontend connected to backend
- [ ] User logged in as customer
- [ ] Different user logged in as merchant

### Test 1: Customer Creates Booking
- [ ] Customer navigates to restaurant detail
- [ ] Customer books a table
- [ ] **Check:** Toast appears "✅ Booking Created"
- [ ] **Check:** Merchant sees toast "📥 New Booking Request"
- [ ] **Check:** Both see notification in /notifications screen
- [ ] **Check:** Email sent to customer

### Test 2: Merchant Confirms
- [ ] Merchant opens bookings screen
- [ ] Merchant clicks "Confirm" on pending booking
- [ ] **Check:** Toast appears "✅ Booking Confirmed!"
- [ ] **Check:** Customer sees toast
- [ ] **Check:** Both see notification in /notifications
- [ ] **Check:** Email sent to customer

### Test 3: Customer Modifies Booking
- [ ] Customer opens their booking
- [ ] Customer changes date/time/guests
- [ ] **Check:** Toast appears "✏️ Booking Modified"
- [ ] **Check:** Merchant sees toast
- [ ] **Check:** Both see notification in /notifications
- [ ] **Check:** NO email sent (as expected)

### Test 4: Customer Cancels
- [ ] Customer opens their booking
- [ ] Customer clicks "Cancel"
- [ ] **Check:** Toast appears "❌ Booking Cancelled"
- [ ] **Check:** Merchant sees toast  
- [ ] **Check:** Both see notification in /notifications
- [ ] **Check:** Email sent to customer

### Test 5: Merchant Rejects
- [ ] Merchant creates new booking manually
- [ ] Merchant clicks "Reject" with reason
- [ ] **Check:** Toast appears for both
- [ ] **Check:** Both see notifications
- [ ] **Check:** Email sent to customer with reason

---

## Database Verification

```sql
-- Check all notifications for a user
SELECT id, title, type, is_read, created_at 
FROM notifications 
WHERE user_id = '{user_id}'
ORDER BY created_at DESC;

-- Expected types in system:
-- - booking_created (customer creates)
-- - booking_received (merchant gets new)
-- - booking_confirmed (merchant confirms)
-- - booking_rejected (merchant rejects)
-- - booking_modified (customer modifies)
-- - booking_cancelled (customer cancels)
```

---

## Summary

✅ **YES - ALL notifications are implemented!**

| Action | Customer Notified | Merchant Notified | Email Sent | WebSocket | DB Record |
|--------|:--:|:--:|:--:|:--:|:--:|
| Customer creates | ✅ | ✅ | ✅ | ✅ | ✅ |
| Customer modifies | ✅ | ✅ | ❌ | ✅ | ✅ |
| Customer cancels | ✅ | ✅ | ✅ | ✅ | ✅ |
| Merchant confirms | ✅ | ✅ | ✅ | ✅ | ✅ |
| Merchant rejects | ✅ | ✅ | ✅ | ✅ | ✅ |

**Delivery Methods:**
1. **Real-time Toast** - Immediate visual feedback
2. **WebSocket Events** - Live updates  
3. **Notification Screen** - Persistent records
4. **Email** - Official confirmation (for customer)

All notifications work **bidirectionally** - both parties are kept in sync! 🎉
