# User Registration & Profile Enhancement

## Changes Made

### 1. **Frontend - Two-Step Registration Process**

#### File: `frontend/app/signup.tsx`

**What Changed:**
- Registration is now split into **2 steps**:
  - **Step 1**: Email & Password
  - **Step 2**: Full Name & Phone Number

**User Flow:**
```
Step 1: Enter Email + Password → Click "Next"
         ↓
Step 2: Enter Full Name + Phone → Click "Complete Sign Up"
```

**New Fields Collected:**
- `fullName` - User's actual name (required)
- `phone` - User's phone number (required)

**Benefits:**
- ✅ User completes profile during signup
- ✅ Profile information is immediately saved to database
- ✅ Better user experience with progressive form

---

### 2. **Backend - Enhanced User Registration**

#### File: `backend/controllers/authController.js`

**Changes in `registerUser` function:**
- Now accepts `phone` parameter from frontend
- Saves full user profile to `public.users` table:
  - `name` - User's full name
  - `phone` - User's phone number
  - `email` - User's email
  - `role` - User type (customer/restaurant)
  - Plus any identity/restaurant fields

**Database Insertion:**
```javascript
const userData = {
  id: userId,
  email: email,
  name: fullName,
  phone: phone,  // ← NEW
  role: role,
};
```

---

### 3. **Database - Add Phone Column**

#### File: `database/migrations/002_add_phone_field.sql`

**Migration Script:**
```sql
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
```

**What it Does:**
- Adds `phone` column to `users` table if it doesn't exist
- VARCHAR(20) supports international phone formats

---

## How to Apply Changes

### Step 1: Run Database Migration
```bash
# Run this migration in Supabase SQL Editor or via psql
psql -h <supabase-host> -d <database> -f database/migrations/002_add_phone_field.sql
```

Or **manually in Supabase Console:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy the SQL from `002_add_phone_field.sql`
3. Click "Run"
4. Verify: Check the `users` table schema - should see `phone` column

### Step 2: Test the New Registration Flow

1. **Start mobile app:**
   ```bash
   cd frontend
   npm start
   ```

2. **Click "Create an account"**

3. **Step 1 - Enter credentials:**
   - Email: test@example.com
   - Password: password123

4. **Click "Next"** → Goes to Step 2

5. **Step 2 - Enter profile:**
   - Full Name: John Doe
   - Phone: +1234567890

6. **Click "Complete Sign Up"** → User registered with profile

---

## Data Flow

### Registration Request
```json
{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "John Doe",
  "phone": "+1234567890",
  "role": "customer"
}
```

### Database Storage
```
users table:
├─ id: uuid (from Supabase Auth)
├─ email: "user@example.com"
├─ name: "John Doe"
├─ phone: "+1234567890"
├─ role: "customer"
└─ created_at: timestamp
```

### Response to Frontend
```json
{
  "message": "Signup successful!",
  "session": { "access_token": "..." },
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "phone": "+1234567890"
  }
}
```

---

## Profile Access

Once registered, users can access stored profile via:

**Get Profile Endpoint:**
```
GET /api/auth/me
Authorization: Bearer <token>

Response:
{
  "id": "uuid",
  "email": "user@example.com",
  "fullName": "John Doe",
  "phone": "+1234567890",
  "role": "customer"
}
```

---

## Next Steps

You can now:

1. ✅ **View saved profiles** in Supabase (users table)
2. ✅ **Display profile info** in account/profile screens
3. ✅ **Allow profile editing** with `/api/auth/update-profile`
4. ✅ **Use phone for SMS notifications** (optional future feature)

---

## Troubleshooting

### "Column 'phone' doesn't exist" Error
- Make sure you ran the migration (002_add_phone_field.sql)
- Or manually add via Supabase SQL Editor

### Phone Field Showing as NULL
- User may have registered before phone field was added
- Run an update query to add placeholder values if needed

### User Not Seeing Step 2
- Clear app cache: `npm start -- --clear`
- Restart the dev server

---

## Files Modified

✅ `frontend/app/signup.tsx` - Two-step registration UI
✅ `backend/controllers/authController.js` - Phone field handling
✅ `database/migrations/002_add_phone_field.sql` - Database schema

---

Done! 🎉 New users now provide complete profile information during signup.
