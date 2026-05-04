# ✅ Verification Guide: Two Critical Notification Channels

## 1. 🔔 IN-APP NOTIFICATIONS SCREEN (Permanent Record)

### Files Involved
- **Frontend Component:** `frontend/app/notifications.tsx`
- **Frontend Hook:** `frontend/hooks/useNotifications.ts`
- **Backend Endpoint:** `GET /api/notifications`
- **Database Table:** `notifications`

### How It Works
```
User Action (Book/Confirm/Reject/Cancel/Modify)
    ↓
Backend creates notification record in DB
    ↓
Frontend fetches from /api/notifications endpoint
    ↓
Displays in Notifications Screen with:
  • Icon (checkmark/X/pencil/ban)
  • Title & message
  • Timestamp (e.g., "2m ago")
  • Mark as read button
  • Delete button
```

### Verification Steps

#### Step 1: Check Database Records
```sql
-- Connect to your Supabase database
SELECT 
  id,
  user_id,
  title,
  message,
  type,
  is_read,
  created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 10;

-- You should see records like:
-- ✅ Booking Created Successfully!
-- ✅ Booking Confirmed
-- ❌ Booking Rejected
-- ✏️ Booking Modified
-- 🚫 Booking Cancelled
```

#### Step 2: Check Frontend Display
1. Open app as customer or merchant
2. Navigate to `/notifications` tab
3. Should see list of all past notifications
4. Click on notification to mark as read
5. Click trash icon to delete

#### Step 3: API Test
```bash
# Fetch notifications for logged-in user
curl -X GET "http://localhost:3000/api/notifications" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Response:
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "title": "✅ Booking Confirmed",
    "message": "Your reservation at Restaurant X...",
    "type": "booking_confirmed",
    "is_read": false,
    "created_at": "2026-04-04T10:30:00Z"
  },
  ...
]
```

### Features Working
- ✅ Persistent storage (survives app close/reopen)
- ✅ Read/unread tracking
- ✅ Delete notifications
- ✅ Mark all as read
- ✅ Timestamps (relative: "2m ago", "1h ago")
- ✅ Icons by notification type
- ✅ Pull-to-refresh

---

## 2. ✉️ EMAIL NOTIFICATIONS (Official Record)

### Files Involved
- **Email Service:** `backend/utils/emailService.js`
- **Used by Controllers:** `merchantController.js`, `reservationController.js`
- **Email Provider:** Gmail (via Nodemailer)
- **Configuration:** `.env` file

### How It Works
```
User Action (Create/Confirm/Reject/Cancel)
    ↓
Backend calls sendEmail(to, subject, html)
    ↓
Gmail sends via SMTP
    ↓
Arrives in customer's inbox
```

### Email Configuration (.env)

**Required settings in `.env`:**
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
```

### Getting Gmail Credentials

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password:**
   - Go to myaccount.google.com/apppasswords
   - Select Mail and Windows Computer
   - Google generates a 16-character password
   - Copy this to `.env` as `EMAIL_PASS`
3. **Use your email** as `EMAIL_USER`

### When Emails Are Sent

| Action | Email Sent? | To | Subject |
|--------|:--:|--|--|
| Customer creates booking | ✅ | Customer | Booking confirmation |
| Customer modifies booking | ❌ | - | - |
| Customer cancels booking | ✅ | Customer | Booking cancellation |
| Merchant confirms booking | ✅ | Customer | 🍽️ Your Table is Confirmed! |
| Merchant rejects booking | ✅ | Customer | Update regarding your reservation |

### Verification Steps

#### Step 1: Check Environment Variables
```bash
# Backend root, verify .env has:
echo $EMAIL_USER
echo $EMAIL_PASS

# Should show your Gmail + app password
```

#### Step 2: Test Email Sending
Manually trigger an action in the app:

1. **Create Booking as Customer**
   - Check customer's email inbox
   - Subject: "Your table is reserved"
   - Should see booking details

2. **Merchant Confirms**
   - Email received by customer
   - Subject: "🍽️ Your Table is Confirmed!"
   - Contains confirmation details

3. **Check Server Logs**
   ```
   ✅ Email sent successfully: <message-id>
   ```

#### Step 3: Gmail Logs
1. Go to myaccount.google.com/security
2. Check "Recent security events"
3. Should see successful SMTP logins from your app

#### Step 4: Test with Endpoint (Optional)
```bash
# Create a test notification
curl -X POST "http://localhost:3000/api/notifications/test" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Email",
    "message": "This is a test email"
  }'
```

### Common Email Issues & Fixes

**Issue: Email not sending**
```
❌ Error: Invalid login / 535-5.7.8 Username and password not accepted
```
**Fix:**
- Verify 2-factor auth is enabled
- Generate NEW app password (not Gmail password)
- Update `.env` with new password
- Restart server

**Issue: Gmail blocks the attempt**
```
❌ Error: Please log in via your web browser and then try again later
```
**Fix:**
- Go to google.com/accounts/security-checkup
- Allow "Less secure app access"
- Or use Gmail App Password (recommended)

**Issue: Email marked as spam**
**Fix:**
- Add your sender address to contacts
- Check spam folder
- Gmail may initially filter automated emails

---

## 📊 Comparison Table

| Feature | 🔔 In-App Notifications | ✉️ Email |
|---------|:--:|:--:|
| **Delivery** | Instant (app open) | Minutes (email server) |
| **Works offline?** | No (needs app) | Yes (any email client) |
| **Persistent?** | ✅ Yes (forever) | ✅ Yes (mail history) |
| **Can delete?** | ✅ Yes | ✅ Yes (trash) |
| **Read/unread?** | ✅ Yes (in-app) | ✅ Yes (email) |
| **Official record?** | ✅ Yes (DB) | ✅✅ Yes (official) |
| **Works if app closed?** | ❌ No | ✅ Yes |
| **Requires internet?** | ✅ Yes (to fetch) | ✅ Yes (to send) |

---

## 🧪 Complete Testing Scenario

### Test Case: Full Booking Flow with Both Notifications

**Setup:**
- Backend running: `npm start` in `/backend`
- 2 browser windows: one logged as customer, one as merchant
- Gmail configured with `EMAIL_USER` and `EMAIL_PASS` in `.env`

**Steps:**

1. **Customer Creates Booking**
   ```
   ✅ IN-APP:  Toast "✅ Booking Created Successfully!"
   ✅ IN-APP:  Notification appears in /notifications screen
   ✅ EMAIL:   Email arrives in customer inbox
   ✅ EMAIL:   Email also in merchant inbox (if configured)
   ✅ DB:      SELECT * FROM notifications shows 2 records
   ```

2. **Merchant Opens Bookings**
   ```
   ✅ IN-APP:  Toast "📥 New Booking Request"
   ✅ IN-APP:  Notification in /notifications screen
   ✅ DB:      Notification record created for merchant
   ```

3. **Merchant Confirms Booking**
   ```
   ✅ IN-APP:  Merchant sees "✅ Booking Confirmed" toast
   ✅ IN-APP:  Customer sees "✅ Booking Confirmed!" toast
   ✅ EMAIL:   Confirmation email to customer
   ✅ DB:      2 new notification records created
   ```

4. **Customer Checks Email**
   ```
   ✅ EMAIL:   Open email inbox
   ✅ EMAIL:   Subject: "🍽️ Your Table is Confirmed!"
   ✅ EMAIL:   Contains restaurant name, date, time, party size
   ```

5. **Customer Checks Notifications Screen**
   ```
   ✅ IN-APP:  Open /notifications tab
   ✅ IN-APP:  See all past notifications
   ✅ IN-APP:  Can mark as read, delete, etc.
   ```

---

## ✅ Success Checklist

- [ ] Notifications table has records after actions
- [ ] Frontend Notifications screen loads and shows all notifications
- [ ] Can mark notifications as read
- [ ] Can delete notifications
- [ ] Pull-to-refresh works on notifications screen
- [ ] Email credentials configured in `.env`
- [ ] Emails arrive in inbox (check spam)
- [ ] Email subjects are descriptive
- [ ] Email content shows booking details
- [ ] Database queries return notification records
- [ ] API `/api/notifications` returns JSON

---

## 🔍 Troubleshooting

### In-App Notifications Not Showing
```
Issue: Navigate to /notifications but screen is empty or loading forever

Solution:
1. Check useNotifications hook is initialized
2. Verify fetchNotifications() is called
3. Check browser console for errors
4. Verify JWT token is valid
5. Check if user_id matches in database
```

### Emails Not Arriving
```
Issue: Action completed but no email received

Solution:
1. Check .env has EMAIL_USER and EMAIL_PASS
2. Check server logs for "Email sent successfully"
3. Check spam/promotions folder
4. Use Google account security check
5. Verify 2FA enabled and app password generated
6. Restart server after .env changes
```

### Both Working But Slow
```
Issue: Notifications appear but with delay

Solution:
1. Check database query performance
2. Reduce number of notifications fetched
3. Add pagination to notifications list
4. Email delay is normal (up to 1-2 minutes)
```

---

## 📈 Volume Recommendations

**In-App Notifications:**
- Keep forever (or implement cleanup after 30 days)
- Consider pagination (show 20 latest, load more)

**Emails:**
- Send for important actions only (already configured)
- Don't spam (only 1 email per action, not per channel)

---

## Summary

✅ **Both channels are fully functional:**

1. **🔔 In-App (Notifications Screen)**
   - Permanent record in database
   - Always accessible in app
   - Can be marked read/deleted
   - Perfect for app users

2. **✉️ Email**
   - Official record in inbox
   - Works even if app is closed
   - Official verification
   - Perfect for critical confirmations

**Users get best of both worlds!** 🎉
