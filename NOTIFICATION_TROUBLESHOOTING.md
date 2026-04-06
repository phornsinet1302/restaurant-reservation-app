# 🔍 NOTIFICATION TROUBLESHOOTING - Customer Bookings Not Receiving Notifications

## ⚠️ CRITICAL ISSUE FOUND

**Problem**: Notifications table is missing the `type` column in Supabase!

**Fix**: Run this SQL in Supabase console to add the missing column

---

## 🚨 REQUIRED FIX: Apply Migration

### Step 1: Go to Supabase Console
1. Open https://app.supabase.com/
2. Select your project
3. Click **SQL Editor** in left sidebar
4. Click **New Query**

### Step 2: Paste and Run This SQL
```sql
-- Add missing type column to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'general';
ALTER TABLE notifications ALTER COLUMN message SET DATA TYPE TEXT;

-- Add comment
COMMENT ON COLUMN notifications.type IS 'Type of notification: booking_created, booking_confirmed, booking_rejected, etc';
```

### Step 3: Click **RUN**
You should see: ✅ Query successful

---

## After Applying Migration

Once you've run the SQL above, **restart the backend server:**

```bash
cd backend
npm start
```

Then test by making a new booking. Notifications should now be created!

---

## 🔍 Step 2: Check Database - Are Notifications Being Created?

**Run this SQL query:**
```sql
-- Connect to Supabase database
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
LIMIT 20;
```

**Expected Results After Booking:**
```
Should show AT LEAST 2 notifications:
1. For customer: "✅ Booking Created Successfully!"
2. For merchant: "📥 New Booking Request"
```

**If NO notifications appear:** Problem is in **backend** (not storing)
**If notifications exist:** Problem is in **frontend** (not displaying)

---

## 📊 Step 3: Check What Type of Notifications You're Getting

### Scenario A: NO notifications in database
**Problem:** Backend is not creating notifications

**Debug Steps:**
```
1. When customer creates booking:
   - Check backend console logs
   - Look for: "📢 Notification created for user"
   - Or error: "⚠️ Failed to create notification"
   
2. If you see "Failed to create notification":
   - This means createNotification() function failed
   - Check notification table permissions
   - Verify user_id exists in users table
```

**Check logs:**
```bash
# Look at server logs while customer books
# You should see:
# ✅ Reservation created successfully!
# 📢 Notification created for user {customer-id}
# 📢 Notification created for user {merchant-id}
```

### Scenario B: Notifications exist in database but don't show in app
**Problem:** Frontend is not fetching/displaying them

**Debug Steps:**
```
1. Open app as customer
2. Go to /notifications tab
3. Check mobile app console (F12 → Console)
4. Look for logs:
   - "📢 Fetching notifications..."
   - "✅ Fetched X notifications"
   - Or error: "❌ Error fetching notifications"
```

---

## ✉️ Step 4: Check If Emails Were Sent

### Check Gmail Inbox
1. Open customer's email inbox
2. Look for subject: "Your table is reserved" or similar
3. Check **Spam** folder (Gmail may filter)
4. Check **Promotions** tab

### Check Server Logs
Look for email sending confirmation:
```
✅ Email sent successfully: <message-id>
```

Or error:
```
❌ NODEMAILER FAILED: Invalid login
```

### If No Emails Sent:
**Most Common Issues:**
1. `.env` file missing `EMAIL_USER` or `EMAIL_PASS`
2. Gmail app password not generated
3. 2-Factor Authentication not enabled

**Fix:**
```
1. Go to myaccount.google.com/apppasswords
2. Generate new app password (16 characters)
3. Add to .env:
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=generated-16-char-password
4. Restart server: npm start
```

---

## 🔌 Step 5: Check WebSocket Connection

### Check If WebSocket is Connected
```
Open app console (F12 → Console)

Look for these logs:
✅ WebSocket connected for notifications. Socket ID: xxx
👤 User ID from token: uuid-123
🚪 Emitted join_room with user ID: uuid-123
```

### If WebSocket NOT connecting:
```
Issue: ⚠️ No token found for WebSocket setup

Solution:
1. Verify user is logged in
2. Check AsyncStorage has 'token' saved
3. Verify token is valid JWT
```

### If WebSocket connected but NOT receiving events:
```
Issue: No events received after booking created

Check:
1. Backend emits to correct merchant_id
2. Customer joined correct user room
3. Both customer and merchant have socket connections active
```

---

## 🐛 Step 6: Complete Diagnostic Test

### Test Case: Make 1 Booking and Check Everything

**As CUSTOMER:**
1. Log in to app
2. Open browser console (F12)
3. Note down your user ID from console logs
4. Make a booking
5. **CHECK:** Toast notification appears?
6. **CHECK:** Ball icon or notification badge updates?
7. Go to `/notifications` tab
8. **CHECK:** See your booking notification?

**As MERCHANT:**
1. Log in to different browser/device
2. Open console (F12)
3. Note down merchant user ID
4. **CHECK:** Receive toast "📥 New Booking Request"?
5. Go to Bookings tab
6. **CHECK:** See new pending booking?
7. Go to `/notifications` tab
8. **CHECK:** See notification about new booking?

**Check Email:**
1. Open customer's email (gmail.com)
2. **CHECK:** Reservation email received?
3. Check spam/promotions folder

**Check Database:**
```sql
-- After booking, run:
SELECT COUNT(*) as total_notifications FROM notifications;
-- Should show at least 2 new notifications created in last minute
```

---

## 🔧 Quick Fix Checklist

If notifications aren't working, try these in order:

- [ ] **1. Restart server**
  ```bash
  cd backend
  npm start
  ```

- [ ] **2. Check .env files exist**
  ```bash
  # Backend should have:
  SUPABASE_URL=...
  SUPABASE_ANON_KEY=...
  EMAIL_USER=...
  EMAIL_PASS=...
  ```

- [ ] **3. Clear browser cache**
  - Hard refresh: Ctrl+Shift+R
  - Or: F12 → Application → Clear Storage

- [ ] **4. Verify user is logged in**
  - Check token in AsyncStorage
  - Token should be JWT format (3 parts separated by .)

- [ ] **5. Check Supabase permissions**
  - Open Supabase dashboard
  - Go to SQL Editor
  - Run: `SELECT * FROM notifications LIMIT 1;`
  - Should work without errors

- [ ] **6. Test API directly**
  ```bash
  curl -X GET "http://localhost:3000/api/notifications" \
    -H "Authorization: Bearer YOUR_JWT_TOKEN"
  
  # Should return JSON array of notifications
  ```

---

## 📋 Debugging Information Collection

**When reporting the issue, collect:**

### From Backend Console:
```
When customer makes booking, show me:
[ ] Logs starting with "🔄 Loading bookings..."
[ ] Any "❌ Error" messages
[ ] Any "📢 Notification created" messages
[ ] Any "⚠️" warning messages
```

### From Frontend Console:
```
When navigating to /notifications, show me:
[ ] "📢 Fetching notifications..." log
[ ] Success or error response
[ ] Any Socket.IO connection messages
```

### From Database:
```
Run and share output:
SELECT COUNT(*) FROM notifications 
WHERE created_at > NOW() - INTERVAL '5 minutes';
```

### From Email:
```
[ ] Check Gmail inbox (including spam)
[ ] Look for sender: EMAIL_USER from .env
[ ] Check timestamp
```

---

## 🚀 Final Verification Steps

1. **Restart Everything Fresh:**
   ```bash
   # Kill any node processes
   # Restart server
   cd backend
   npm start
   
   # Restart frontend
   cd frontend
   npm start
   ```

2. **Test with Newest Booking:**
   - Make a NEW booking (don't use old ones)
   - Immediately check console for logs
   - Check database within 30 seconds
   - Wait 2 minutes for email

3. **Verify Both Users:**
   - Customer sees notification in app
   - Merchant sees notification in app
   - Both receive toast alerts
   - Email in customer inbox

---

## 🆘 Still Not Working?

**Share these details:**
1. Server startup logs (first 20 lines)
2. Frontend console logs when booking (screenshot)
3. Backend console logs when booking created (screenshot)
4. Database query result: `SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5;`
5. Check .env has EMAIL_USER and EMAIL_PASS set

With this info, we can identify exactly where notifications are failing! 🔍
