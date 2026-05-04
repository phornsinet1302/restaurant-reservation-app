# Booking Table Confirmation System - Testing Guide

## Overview
The booking system now includes a waiting confirmation flow where:
1. User creates a booking → Gets confirmation
2. User clicks "Confirm Booking" → Goes to waiting confirmation screen
3. System polls server every 3 seconds for machine confirmation
4. When machine confirms/rejects, user gets a notification
5. User can cancel the request at any time

## System Architecture

### Frontend Components
- **booking-confirmation.tsx** - Shows booking success with options to proceed or skip
  - "Confirm Booking" button → Takes to waiting confirmation screen
  - "Skip to Bookings" button → Goes directly to bookings tab

- **booking-waiting-confirmation.tsx** - Waiting/polling screen
  - Shows pulsing animation while waiting
  - Displays booking details
  - Polls reservation status every 3 seconds (default: 3000ms)
  - Max wait time: 5 minutes (300000ms)
  - Shows elapsed time
  - Can cancel request at any time

### Backend Endpoints

#### Get Reservation Status
```
GET /api/reservations/:bookingId
```
Returns the current status of a reservation (pending, confirmed, rejected, etc.)

#### Simulate Machine Confirmation (Testing Only)
```
POST /api/reservations/:bookingId/machine-confirm
Body: { "action": "confirm" } or { "action": "reject" }
```
This endpoint simulates machine confirmation/rejection. Use it to test the waiting screen.

#### Update Reservation Status
```
PATCH /api/reservations/:id/status
Body: { "status": "confirmed" }
```
Can be used to manually update booking status.

## Testing the Feature

### Prerequisites
- Backend server running
- Frontend app running
- User logged in

### Test Steps

#### Step 1: Create a Booking
1. Go to home screen → Search for a restaurant
2. Click "Book a Table"
3. Select date, time, party size, and table
4. Enter booking name and email
5. Click "Confirm Booking" button
6. You'll see the booking confirmation page with booking details

#### Step 2: Go to Waiting Confirmation
1. On the booking confirmation screen, click "Confirm Booking" button
2. You should see the waiting confirmation screen with:
   - Pulsing hourglass animation
   - "Waiting for Confirmation" message
   - Booking details card
   - "Waiting for Restaurant Response" status
   - Cancel Request button

#### Step 3: Simulate Machine Confirmation

##### Option A: Using cURL (Terminal)
```bash
# Confirm the booking
curl -X POST http://localhost:5000/api/reservations/{bookingId}/machine-confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{"action":"confirm"}'

# Reject the booking
curl -X POST http://localhost:5000/api/reservations/{bookingId}/machine-confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -d '{"action":"reject"}'
```

##### Option B: Using Postman
1. Create a POST request to: `http://localhost:5000/api/reservations/{bookingId}/machine-confirm`
2. Add header: `Content-Type: application/json`
3. Add header: `Authorization: Bearer {YOUR_TOKEN}`
4. Body (raw JSON):
```json
{
  "action": "confirm"
}
```
5. Send the request

##### Option C: Using Node.js/JavaScript
```javascript
const response = await fetch('http://localhost:5000/api/reservations/booking-id-here/machine-confirm', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token-here'
  },
  body: JSON.stringify({
    action: 'confirm' // or 'reject'
  })
});
```

#### Step 4: Observe the Result
Within 3 seconds of calling the machine confirmation endpoint, you should see:
- ✅ **If Confirmed**: Alert showing "Booking Confirmed!" with a "View Booking" button
- ❌ **If Rejected**: Alert showing "Booking Rejected" with a "Try Again" button

## Customization

### Change Polling Interval
Edit `booking-waiting-confirmation.tsx`:
```javascript
const POLLING_INTERVAL = 3000; // Change this value (milliseconds)
```

### Change Max Wait Time
Edit `booking-waiting-confirmation.tsx`:
```javascript
const MAX_WAIT_TIME = 300000; // Change this value (5 minutes = 300000ms)
```

## Future Enhancements

### Real Machine Integration
Replace the mock endpoint with real machine API:
1. Update `simulateMachineConfirmation` to call actual machine API
2. Implement webhook/push notifications for instant response (instead of polling)
3. Add machine communication protocol/SDK

### Persistent Notifications
1. Add real notification service (Firebase Cloud Messaging, OneSignal, etc.)
2. Store notification in database
3. Show notification history in app

### Booking States
Current states: pending → confirmed/rejected

Potential additional states:
- `pending` - Waiting for machine confirmation
- `confirmed` - Machine confirmed
- `checked_in` - Customer checked in
- `completed` - Reservation completed
- `cancelled` - Customer or restaurant cancelled
- `no_show` - Customer didn't show up

## Database Schema

The reservations table should have:
```sql
- id: unique identifier
- customer_id: user who made the booking
- restaurant_id: restaurant being booked
- table_id: table for the booking
- reservation_date: date of reservation
- reservation_time: time of reservation
- party_size: number of guests
- special_request: any special requests
- status: 'pending', 'confirmed', 'rejected', 'checked_in', 'completed', 'cancelled'
- created_at: timestamp
- updated_at: timestamp
```

## Troubleshooting

### Polling Not Working
- Check if backend server is running
- Check network tab in browser dev tools
- Verify booking ID is correct
- Check API response status

### Reservation Not Found Error
- Make sure booking was created successfully
- Verify booking ID from the confirmation screen
- Check if reservation exists in database

### Token Expired
- Re-login and make a new booking
- Token will be refreshed on login

### Max Wait Time Exceeded
- User will see timeout alert
- They can try again later or contact restaurant directly

## Testing Checklist

- [ ] Create new booking successfully
- [ ] See confirmation screen
- [ ] Click "Confirm Booking" and go to waiting screen
- [ ] See pulsing animation and elapsed time counter
- [ ] Call machine confirmation API with 'confirm'
- [ ] See success alert within 3 seconds
- [ ] Navigate to bookings after confirmation
- [ ] Create another booking and test 'reject' action
- [ ] See error alert for rejection
- [ ] Test canceling request from waiting screen
- [ ] Verify polling stops when status changes
- [ ] Verify timeout after 5 minutes of waiting
