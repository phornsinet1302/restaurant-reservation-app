# Restaurant Signup Integration Guide

## ✅ Changes Made

### 1. **Backend Updates** (authController.js)
When a user signs up as a restaurant (`role: 'restaurant'`), the backend now:
- ✅ Stores owner identity info in `users` table (legal_name, dob, nationality, address, etc.)
- ✅ Creates a corresponding entry in `restaurants` table with full restaurant profile data:
  - Restaurant name (English & Khmer)
  - Category and Cuisine
  - Phone number & address
  - City/Province & Google Maps link
  - Merchant ID (links to user)

### 2. **Database Migration** (006_add_restaurant_profile_fields.sql)
New columns added to `restaurants` table:
- `name_khmer` (VARCHAR 255) - Restaurant name in Khmer
- `category` (VARCHAR 100) - Type of restaurant
- `cuisine` (VARCHAR 100) - Primary cuisine type
- `phone` (VARCHAR 20) - Restaurant phone
- `city_province` (VARCHAR 100) - Location
- `maps_link` (TEXT) - Google Maps link

### 3. **Frontend Updates** (restaurant-signup.tsx)
- ✅ Updated to use `API_CONFIG` for dynamic backend URL
- ✅ Now uses environment variable `EXPO_PUBLIC_BACKEND_URL`
- ✅ Sends complete restaurant profile data to backend

## 📋 Setup Steps

### Step 1: Run Database Migration
Run this SQL in Supabase SQL Editor:

```sql
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS name_khmer VARCHAR(255);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS cuisine VARCHAR(100);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS city_province VARCHAR(100);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS maps_link TEXT;

COMMENT ON COLUMN restaurants.name_khmer IS 'Restaurant name in Khmer script';
COMMENT ON COLUMN restaurants.category IS 'Restaurant category (e.g., Khmer restaurant, Café, Bar & Grill)';
COMMENT ON COLUMN restaurants.cuisine IS 'Primary cuisine type (e.g., Asian fusion, Khmer, Chinese)';
COMMENT ON COLUMN restaurants.phone IS 'Restaurant phone number';
COMMENT ON COLUMN restaurants.city_province IS 'Restaurant city or province';
COMMENT ON COLUMN restaurants.maps_link IS 'Google Maps link for the restaurant location';
```

### Step 2: Verify Backend Configuration
Check `backend/.env`:
```bash
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
JWT_SECRET=your-secret-key
```

### Step 3: Verify Frontend Configuration
Check `frontend/.env.local`:
```bash
EXPO_PUBLIC_BACKEND_URL=http://10.1.64.40:3000
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_client_id
```

### Step 4: Restart Backend
```bash
cd backend
npm start
```

### Step 5: Test Restaurant Signup
1. Open app or run `npm start` in frontend
2. Click "Account type" → Select "Restaurant"
3. Fill all 4 steps:
   - **Step 1 (Account)**: Owner email, password, full name, phone
   - **Step 2 (Identity)**: Legal name, DOB, nationality, city, address
   - **Step 3 (Restaurant)**: Restaurant name (Khmer & English), category, cuisine, phone, address, city, Google Maps link
   - **Step 4 (Review)**: Confirm all info and submit
4. Check Supabase:
   - Verify user entry in `users` table (with legal_name, dob, nationality, etc.)
   - Verify restaurant entry in `restaurants` table (with name, category, cuisine, phone, etc.)

## 📊 Data Flow

```
Frontend (restaurant-signup.tsx)
         ↓
    Collects all info in 4 steps
         ↓
    Sends payload with:
    - email, password, role='restaurant'
    - fullName, phone
    - identity (legalName, dob, nationality, city, address)
    - restaurantProfile (nameEn, nameKh, category, cuisine, phone, address, city, mapsLink)
         ↓
Backend (authController.js)
         ↓
    Creates user in users table
    Stores password_hash
         ↓
    Creates restaurant entry in restaurants table
    Links via merchant_id
         ↓
    Returns JWT token to frontend
    User logged in automatically
```

## 💾 Database Schema

### users table (Restaurant Owner)
```
id (UUID)
email
password_hash
name (owner's full name)
phone (owner's phone)
role = 'restaurant'
legal_name
dob
nationality
city_province (owner's address city)
address (owner's current address)
created_at, updated_at
```

### restaurants table (Restaurant Details)
```
id (auto)
name (English)
name_khmer (Khmer script)
category (e.g., "Khmer restaurant")
cuisine (e.g., "Khmer, Asian fusion")
address
phone
city_province
maps_link
merchant_id (→ users.id)
description
latitude, longitude (from locations migration)
created_at, updated_at
```

## ✅ Verification Checklist

- [ ] SQL migration ran successfully (check Supabase tables)
- [ ] Backend restarted without errors
- [ ] Frontend environment variables set correctly
- [ ] Restaurant signup form loads all 4 steps
- [ ] Can submit restaurant signup
- [ ] User created in `users` table with all owner info
- [ ] Restaurant created in `restaurants` table with all restaurant info
- [ ] Can login with restaurant account
- [ ] Restaurant profile accessible via `/api/restaurants/{id}`

## 🐛 Troubleshooting

**Issue**: "Column X not found" in Supabase
- **Solution**: Ensure SQL migration ran. Check Supabase SQL history.

**Issue**: Restaurant entry not created after signup
- **Solution**: Check backend logs. Migration must complete first. May be non-fatal error.

**Issue**: Backend not connecting to frontend
- **Solution**: Verify `EXPO_PUBLIC_BACKEND_URL` matches backend IP:port (currently 10.1.64.40:3000)

**Issue**: Signup fails with "registration failed"
- **Solution**: Check backend logs for specific error. May be:
  - Missing password_hash column (needs migration)
  - Restaurant phone field requirements
  - Invalid email format

## 📱 Testing Command

```bash
# Clear app cache and restart
npm start

# Press 'i' for iOS Simulator or 'a' for Android Emulator
# Navigate to account-type → restaurant signup
```

## 🔄 Next Steps (After Verification)

1. **Restaurant Dashboard**: Create page to view/edit restaurant profile
2. **Menu Management**: Add ability to manage restaurant menu items
3. **Reservation Management**: View and manage restaurant bookings
4. **Analytics**: Track restaurant performance metrics
5. **Email Notifications**: Notify restaurant of new reservations
