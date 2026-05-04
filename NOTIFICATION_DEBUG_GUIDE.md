# Booking Notification Fix - Debugging Guide

## Problem Identified ✅
Notifications were being created in the database and emitted via WebSocket, but weren't appearing to the merchant because:
1. **WebSocket Room Mismatch**: Frontend was joining a room with `restaurantId`, but backend was sending to `merchant_id` (user ID)
2. **Missing join_room Emit**: The `useNotifications` hook wasn't properly joining the user to their private room
3. **No Visual Feedback**: Merchant bookings screen wasn't listening to notification events

## Solution Implemented ✅

### Backend Changes (merchantController.js)
✅ Added `createNotification()` helper - Creates DB records  
✅ Added `emitNotificationEvent()` helper - Sends WebSocket events  
✅ Updated `confirmReservation()` - Sends notifications to BOTH customer and merchant  
✅ Updated `rejectReservation()` - Sends notifications to BOTH customer and merchant

**Example Event Emission:**
```javascript
// Sends to merchant_id (user's private room)
io.to(merchant_id).emit('notification_received', { 
  title: '✅ Booking Confirmed',
  message: 'You confirmed the reservation...',
  type: 'booking_confirmed'
});
```

### Frontend Changes 

#### 1. useNotifications Hook (FIXED)
**File:** `frontend/hooks/useNotifications.ts`

**What Changed:**
- Now decodes JWT token to extract user ID using `atob()`
- Emits `join_room` event with user ID immediately after socket connects
- Added detailed logging for debugging
- Properly listens to `notification_received` events

**New Code Flow:**
```
1. useNotifications hook initializes Socket.IO
2. Socket connects → onConnect handler called
3. Extract user ID from JWT token: "uuid-123"
4. Emit: socket.emit('join_room', 'uuid-123')
5. Backend puts socket in room 'uuid-123'
6. When merchant confirms booking → backend sends to room 'uuid-123'
7. Socket receives 'notification_received' event
8. Add notification to state → re-render
```

#### 2. Merchant Bookings Screen (UPDATED)
**File:** `frontend/app/(merchant-tabs)/bookings.tsx`

**What Changed:**
- Added `useNotifications` hook to listen for real-time notifications
- Added `useEffect` that watches for new notifications
- Shows **Toast notification** when booking is confirmed or rejected
- Auto-refreshes booking list when notification arrives

**New UI Feedback:**
```
User Action (Merchant clicks Confirm)
    ↓
Backend confirms reservation + creates notifications
    ↓
WebSocket sends notification_received event to merchant's room
    ↓
Frontend receives event → notification state updates
    ↓
useEffect detects new notification
    ↓
ToastAndroid.show("✅ Booking Confirmed!")  ← VISIBLE TO USER
    ↓
loadData() refreshes booking list
```

---

## How to Test Notifications

### Step 1: Check Console Logs
When merchant confirms a booking, check the mobile app console for these logs:

**Backend (server logs):**
```
✅ WebSocket notification sent to uuid-123
📢 Notification created for user uuid-123: ✅ Booking Confirmed
```

**Frontend (app console):**
```
👤 User ID from token: uuid-123
🚪 Emitted join_room with user ID: uuid-123
📥 New notification received: { title: '✅ Booking Confirmed!', ... }
✅ Notification added to list
🔔 Toast shown for booking confirmation
```

### Step 2: Visual Feedback
1. Open merchant bookings screen
2. Have customer make a booking (creates pending reservation)
3. Merchant clicks "Confirm" on pending booking
4. **Expected:** 
   - ✅ Toast appears at bottom of screen saying "✅ Booking Confirmed!"
   - Booking list refreshes automatically
   - Notification shows in /notifications screen

### Step 3: Check Database
```sql
-- Query notifications table to verify records were created
SELECT 
  id,
  user_id,
  title,
  message,
  type,
  is_read,
  created_at
FROM notifications
WHERE user_id = 'merchant-uuid'
ORDER BY created_at DESC
LIMIT 5;
```

Expected Output:
```
| id | user_id | title | message | type | is_read | created_at |
|----|---------|-------|---------|------|---------|-----------|
| 1  | merch-1 | ✅ Booking Confirmed | You confirmed... | booking_confirmed | false | 2026-04-04 |
```

### Step 4: WebSocket Connection Debug

Add this to merchant bookings screen to debug:
```typescript
useEffect(() => {
  const testDebug = async () => {
    const token = await AsyncStorage.getItem('token');
    console.log('🔍 Token:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
    
    try {
      const parts = token?.split('.') || [];
      if (parts.length === 3) {
        const decoded = JSON.parse(atob(parts[1]));
        console.log('JWT Payload:', decoded);
      }
    } catch (e) {
      console.error('Failed to decode JWT:', e);
    }
  };
  testDebug();
}, []);
```

---

## Notification Flow Diagram

```
MERCHANT CONFIRMS BOOKING
        ↓
POST /api/reservations/merchant/:id/confirm
        ↓
[Backend - confirmReservation]
  ├─ Update DB: status = 'confirmed'
  ├─ Get restaurant info
  ├─ createNotification(merchant_id, '✅ Booking Confirmed', ...)
  ├─ createNotification(customer_id, '✅ Booking Confirmed!', ...)
  ├─ io.to(merchant_id).emit('notification_received', {...})
  ├─ io.to(customer_id).emit('notification_received', {...})
  └─ Send email to customer
        ↓
[Frontend - Merchant]
  ├─ Receives 'notification_received' event
  ├─ useNotifications hook adds to state
  ├─ useEffect detects new notification
  ├─ ToastAndroid.show("✅ Booking Confirmed!")  ← USER SEES THIS
  └─ loadData() refreshes bookings
        ↓
[Frontend - Customer]
  ├─ Receives 'notification_received' event
  ├─ useNotifications hook adds to state
  ├─ Notification appears in /notifications screen
  └─ Email arrives in inbox
```

---

## Common Issues & Solutions

### Issue: No toast notification appears after confirming booking

**Solution 1: Check WebSocket Connection**
```
Console should show: "🚪 Emitted join_room with user ID: xxxx"
If missing: User ID not extracted from JWT
Fix: Verify token is stored in AsyncStorage
```

**Solution 2: Check User ID Extraction**
```
If console shows: "⚠️ Could not extract user ID from token"
Fix: JWT might be malformed or missing 'sub' field
Decoded token should look like:
{
  "sub": "user-uuid-here",
  "email": "merchant@example.com",
  ...
}
```

**Solution 3: Check Database Records**
```
If notifications exist in DB but don't appear on screen:
- Check that WebSocket is actually connected
- Verify socket ID is in merchant's room
- Check firewall/network not blocking WebSocket
```

### Issue: Both merchant and customer don't see notifications

**Root Cause:** Backend `io` instance not properly initialized

**Solution:**
```javascript
// In server.js, ensure this exists:
app.set('io', io);

// And controller uses it:
const io = req.app.get('io');
io.to(userId).emit('notification_received', {...});
```

### Issue: User joins with restaurantId instead of userId

**Old Problem (FIXED):**
```javascript
// WRONG - joins with restaurant room
socket.emit('join_room', restaurantId);

// CORRECT - joins with user room  
socket.emit('join_room', userId);
```

---

## Files Modified

### Backend
- ✅ `backend/controllers/merchantController.js`
  - Added notification helpers
  - Updated confirmReservation()
  - Updated rejectReservation()

### Frontend  
- ✅ `frontend/hooks/useNotifications.ts`
  - Fixed WebSocket join_room emit
  - Added JWT decoding for user ID
  - Added detailed logging
  
- ✅ `frontend/app/(merchant-tabs)/bookings.tsx`
  - Added useNotifications hook
  - Added notification listener useEffect
  - Added ToastAndroid alerts
  - Auto-refresh on notification

---

## Testing Checklist

- [ ] Merchant has access to bookings screen
- [ ] Customer creates a booking (pending status)
- [ ] Check database: notification not yet created (correct)
- [ ] Merchant clicks "Confirm" button
- [ ] Check app console for "Emitted join_room" log
- [ ] Check app console for "New notification received" log
- [ ] **Toast appears at bottom**: "✅ Booking Confirmed!"
- [ ] Booking list refreshes and shows booking as confirmed
- [ ] Check database: 2 notifications created (merchant + customer)
- [ ] Navigate to /notifications screen: see confirmation notification
- [ ] Repeat for "Reject" action: see rejection notification

---

## Server Restart

After making these changes, restart your backend:

```bash
cd backend
npm start
```

Frontend should auto-reload (if using Expo).

---

## Success Indicators ✅

1. **Console logs** show proper room joining
2. **Toast notification** appears after confirm/reject
3. **Database records** created in notifications table
4. **Booking status** updates immediately in UI
5. **Customer email** sent with confirmation/rejection

If all 5 are working, notifications are fully functional! 🎉
