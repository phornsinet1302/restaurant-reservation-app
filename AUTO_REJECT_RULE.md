# Auto-Reject Booking Rule

## Feature Overview
When a merchant confirms ONE booking for a table at a specific date/time, all OTHER pending bookings for that **same table, date, and time slot** are automatically rejected.

## Business Logic

### Scenario
- **Customer A** books Table 5 on April 10 at 7:30 PM ✅ Pending
- **Customer B** books Table 5 on April 10 at 7:30 PM ✅ Pending
- **Customer C** books Table 5 on April 10 at 7:30 PM ✅ Pending

### When Merchant Confirms Customer A:
1. ✅ Customer A's booking → **Confirmed**
2. ❌ Customer B's booking → **Rejected** (Automatic)
3. ❌ Customer C's booking → **Rejected** (Automatic)
4. 🔒 Table 5 → **Occupied**

### What Customers B & C Receive:
- 📧 **Email Notification**
  - Subject: "❌ Your Booking Was Rejected"
  - Message: Explains table slot was taken, suggests trying different time
  
- 🔔 **In-App Notification**
  - Title: "❌ Booking Rejected"
  - Message: "Your reservation was rejected. The table slot was taken by another customer."

- ⚡ **Real-Time WebSocket Update**
  - Status changes to "rejected" immediately
  - Reason: "Table slot was taken by another customer"

## Implementation

### Backend Changes
**File:** `backend/controllers/merchantController.js`

**New Helper Function:** `autoRejectConflictingBookings()`
- Triggered when merchant confirms a booking
- Finds all OTHER pending bookings with same: restaurant, table, date, time
- Updates their status to "rejected"
- Sends notifications via:
  - Database notifications (notifications table)
  - Email (Nodemailer)
  - WebSocket (Socket.IO real-time)

**Integration Point:** `confirmReservation()` endpoint
- After updating reservation status to "confirmed"
- Calls `autoRejectConflictingBookings()`
- Passes confirmed reservation data and Socket.IO instance

### API Response

```javascript
// When confirming booking:
POST /api/bookings/:id/confirm

// Response includes:
{
  message: "Confirmed and email sent!",
  data: {
    id: "0aa17b81-e097-4e1b-8e0d-e437b2aa651f",
    status: "confirmed",
    ...
  }
  // Note: Other bookings are rejected silently (customers notified separately)
}
```

## Console Logs
When auto-reject runs, you'll see:

```
✅ Reservation confirmed: booking-id-123
🔍 Looking for conflicting bookings for table table-id-456 on 2026-04-10 at 13:30
📋 Found 2 conflicting bookings
🗑️ Rejecting conflicting booking conflict-booking-id-1
✅ Rejection email sent to customer@email.com
🔔 WebSocket notification sent to customer-id-1
✅ Booking conflict-booking-id-1 rejected and customer notified
🗑️ Rejecting conflicting booking conflict-booking-id-2
✅ Rejection email sent to customer2@email.com
🔔 WebSocket notification sent to customer-id-2
✅ Booking conflict-booking-id-2 rejected and customer notified
✅ All 2 conflicting bookings have been rejected
```

## Database Actions
1. **reservations table**
   - Conflicting bookings: `status` = "rejected"
   - `rejection_reason` = "Table slot was taken by another customer"

2. **notifications table**
   - New notifications: type = "booking_rejected"
   - Sent to conflicting customers (not merchant)

3. **tables table**
   - Confirmed booking's table: `status` = "occupied"
   - Released when customer cancels or booking expires

## Edge Cases Handled
✅ No conflicting bookings → No action needed  
✅ Booking already rejected → Only pending ones are rejected  
✅ Same restaurant, different tables → Not rejected  
✅ Same table, different times → Not rejected  
✅ Same table, different dates → Not rejected  
✅ WebSocket unavailable → Email and DB still work  

## Testing Steps

1. **Create 3 bookings** for same table/date/time
2. **Merchant confirms** the first booking
3. **Check:**
   - ✅ First booking: status = "confirmed"
   - ✅ Second & third bookings: status = "rejected"
   - ✅ Customers 2 & 3 receive rejection emails
   - ✅ Table status: "occupied"
   - ✅ Real-time notifications appear in frontend

## Future Enhancements
- Allow merchant to select which booking to confirm (currently first confirmed wins)
- Queue system: Auto-accept next pending booking when table becomes available
- Overbooking percentage: Allow 10% overbooking for no-shows
- Manual override: Allow merchant to explicitly confirm multiple bookings for same slot
