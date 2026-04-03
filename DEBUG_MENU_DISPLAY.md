# Menu Display Debugging Guide

## Problem
Menu items are successfully saved to the database and the backend returns them correctly, but they're not displaying on the merchant Menu screen.

**Backend Status**: ✅ Working (returns 3 items)
**Frontend Status**: 🔄 Items not displaying

---

## Quick Test: API Endpoint

Run this command in the backend directory to test the menu endpoint directly:

```bash
node test-menu-endpoint.js
```

This will:
1. Test `GET /api/menu` (no filter)
2. Test `GET /api/menu?restaurant_id={id}` (with filter)
3. Show the exact response structure

---

## Frontend Debugging Steps

### Step 1: Check the Enhanced Logs

1. **Start the app** (run expo)
2. **Log in as merchant** with your test account
3. **Navigate to Menu tab**
4. **Open the console** (Expo DevTools or device logs)
5. **Look for logs starting with these patterns**:
   ```
   📋 [loadData] Loading merchant menu...
   ✅ Restaurant found: {id}
   🍽️  Fetching menu items for restaurant: {id}
   📊 [loadData] Full response:
   📊 [loadData] Response data:
   📊 [loadData] Response data type:
   📊 [loadData] Is array?
   📊 [loadData] Response keys:
   ✅ Found X menu items:
   ```

### Step 2: Analyze the Logs

**Expected Logs** (if working):
```
✅ Found 3 menu items: [{...}, {...}, {...}]
```

**Red Flags**:
- Response data is an empty array `[]` → Check if restaurant_id matches
- Response data is `null` → Check if endpoint is being called
- Response data is an object instead of array → Check response format
- Error in logs → Check authentication/permissions

### Step 3: Check Network Request

**Using Expo DevTools:**
1. Enable Network debugging in console
2. Look for the GET request to `/api/menu?restaurant_id=...`
3. Check:
   - Request URL is correct
   - Authorization header is present
   - Response status is 200
   - Response body contains items

---

## Possible Issues & Fixes

### Issue 1: Empty Response Array
**Cause**: Restaurant ID mismatch or no items in database for that restaurant

**Fix**:
- Verify the restaurant ID from the "Restaurant found:" log
- Go to backend: `node check-restaurants.js` to see all restaurants
- Verify items are in database for that restaurant_id
- Check if restaurant_id is stored correctly when items were created

### Issue 2: Response Not an Array
**Cause**: Backend response format is different than expected

**Fix**:
- The improved frontend code now handles multiple formats
- Check logs for "Unable to extract items from response"
- If you see this, share the response structure logged

### Issue 3: Authentication Error
**Cause**: Authorization header missing or token invalid

**Fix**:
- Check backend log for "❌ Error loading menu:"
- Verify token is being sent in Authorization header
- Try logging out and back in
- Check if token has expired

### Issue 4: 404 or Route Not Found
**Cause**: Request going to wrong endpoint

**Fix**:
- Verify URL in logs shows: `http://localhost:3000/api/menu?restaurant_id=...`
- Check if backend is running on correct port
- Verify API_CONFIG.BASE_URL is correct in frontend/app/config/apiConfig.ts

---

## What to Do Next

1. **Run the test endpoint** script and share output
2. **Check frontend console logs** when navigating to Menu and share any error logs
3. **Verify database** has items for the target restaurant

---

## Database Verification

Run this in backend directory:

```bash
node debug-db.js
```

Look for menu items associated with your restaurant_id.

---

## Backend Diagnostic Logs

The backend should be logging:
```
🍽️ [getMenuItems] Query params: { restaurant_id: '...' }
✅ Found X menu items
   1. Name ($price) - category
   2. ...
```

If you see this in backend logs but frontend shows 0 items, it's a **frontend parsing issue**.
The enhanced frontend code should now handle this.

---

## Manual Test with curl

If backend is running on localhost:3000:

```bash
curl "http://localhost:3000/api/menu"
curl "http://localhost:3000/api/menu?restaurant_id={your-restaurant-id}"
```

This will show exact response format without axios wrapper.

---

## Files Modified This Session

1. **frontend/app/(merchant-tabs)/menu.tsx**
   - Added enhanced logging to show response structure
   - Added defensive parsing for multiple response formats
   - Better error reporting

2. **backend/test-menu-endpoint.js** (NEW)
   - Use to test endpoint directly

---

## Next Steps

Once you've run these diagnostics:
1. Share the logs from console
2. Share the output from `test-menu-endpoint.js`
3. We can pinpoint exactly where the issue is
