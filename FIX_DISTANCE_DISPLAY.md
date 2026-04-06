# Fix: Distance Display in Restaurant Search

## The Issue
When searching or browsing restaurants, the **distance between restaurant and customer is not showing** (displays as "Unknown" or "—").

## Root Cause
Restaurant coordinates (latitude/longitude) are either:
1. **Not stored in the database** 
2. **NULL/empty values**
3. **Not being sent from backend**

---

## Solution: 5 Steps to Fix

### **Step 1: Restart Services with New Code**
The backend and frontend code has been updated with better logging.

```bash
# Kill existing services
taskkill /IM node.exe /F

# Terminal 1: Start Backend
cd backend && npm start

# Terminal 2: Start Frontend  
cd frontend && npm start
```

### **Step 2: Check Backend Logs**
When you search or load restaurants, look at the **backend terminal** for logs like:

```
📍 [searchRestaurants] Found 3 restaurants with coordinates
   ✅ Restaurant A: (11.5564, 104.9282)
   ⚠️  Restaurant B: NO COORDINATES
   ✅ Restaurant C: (11.5670, 104.9230)
```

**If you see "NO COORDINATES"** → Restaurant is missing coordinates in database

### **Step 3: Check Frontend Logs**
In your **Expo Go app console**, look for:

```
📍 [SearchScreen] Fetched 3 restaurants
   User location: 10.0.33.230, 10.0.33.230
   📍 Restaurant A: lat=11.5564, lon=104.9282
      ✅ Distance: 1.2km
   📍 Restaurant B: lat=null, lon=null
      ⚠️  No coordinates - distance will show as "—"
```

### **Step 4: Check Database**

If restaurants are showing NO COORDINATES, you need to add them. 

**Query to check:**
```sql
SELECT id, name, latitude, longitude FROM restaurants LIMIT 5;
```

**If coordinates are NULL**, restaurants need to be updated with coordinates.

**Manual fix (for testing):**
```sql
UPDATE restaurants 
SET latitude = 11.5564, 
    longitude = 104.9282 
WHERE id = 'restaurant-id-here';
```

### **Step 5: Proper Fix - Merchants Add Coordinates**

For production, merchants should add restaurant coordinates when registering:

**In the restaurant registration flow:**
1. Add a **Location Picker** screen
2. Merchant pins restaurant location on Google Maps
3. Latitude/Longitude coordinates are saved to database
4. Distance calculation works automatically ✅

---

## Test Manually

1. **Ensure restaurants have coordinates in database**
2. **Reload Expo Go app** (press `r` in terminal)
3. **Search for a restaurant**
4. **Watch the logs** for confirmation
5. **Distance should now show!** ✅

---

## Debugging Commands

**Check what's in the database:**
```bash
# Backend logs will show this:
📍 [searchRestaurants] Found X restaurants with coordinates
```

**If NO COORDINATES are found:** Update restaurant table with latitude/longitude values.

---

## Expected Output After Fix

**Frontend (Browse/Home Screen):**
```
Top restaurants in London
┌─────────────────────┐
│ Restaurant Name     │
│ ⭐ 4.5              │
│ ⏰ 10:00 - 22:00   │
│ 📍 2.3 km          │ ← DISTANCE SHOWS HERE ✅
└─────────────────────┘
```

**Frontend (Search Screen):**
```
Found 5 restaurant(s)
┌─────────────────────┐
│ Restaurant Name     │
│ ⭐ 4.5              │
│ ⏰ Check hours     │
│ 📍 1.8 km          │ ← DISTANCE SHOWS HERE ✅
└─────────────────────┘
```

---

## Still Not Working?

1. Check **backend logs** for "NO COORDINATES"
2. Check **database** - do restaurants have latitude/longitude?
3. Make sure **both services restarted** with new code
4. Clear app cache and reload (`r` key in Expo terminal)

Let me know what the logs show! 📍
