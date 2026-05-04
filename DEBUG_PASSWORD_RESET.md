# Password Reset Debugging Guide

## Instructions to Debug the Issue

### 1. Check Frontend Console Logs
When you try to reset password, look for these logs in the browser/Expo console:

```
🔄 Settings Flow: Using JWT token from AsyncStorage
📱 Token check: { hasToken: true/false, tokenLength: ..., tokenPreview: '...' }
📤 Sending password reset request with token
✅ Password reset successful
❌ Password reset error
```

**What to look for:**
- Is `hasToken` true or false?
- What's the error message if it fails?

### 2. Check Backend Terminal Logs
When you submit the password reset form, check the backend terminal for:

```
=== PASSWORD RESET REQUEST ===
📋 Request details: { ... }
✓ Validation passed
✓ Password updated in database
✅ Password reset successful
❌ No userId in req.user
```

### 3. Test via cURL (Terminal)

First, get a token by logging in:
```bash
curl -X POST http://10.1.66.195:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d {\"email\":\"test@example.com\",\"password\":\"TestPassword123!\"}
```

Copy the token from response (`session.access_token`), then test reset:
```bash
curl -X POST http://10.1.66.195:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d {\"password\":\"NewPassword123!\",\"confirmPassword\":\"NewPassword123!\"}
```

### 4. Check AsyncStorage
Add this debugging code to reset-password.tsx before making the request:

```javascript
const allKeys = await AsyncStorage.getAllKeys();
console.log('📦 AsyncStorage keys:', allKeys);
const token = await AsyncStorage.getItem('token');
console.log('🔑 Token from storage:', token ? `${token.substring(0, 30)}...` : 'NULL');
const user = await AsyncStorage.getItem('user');
console.log('👤 User from storage:', user);
```

### 5. Possible Issues & Solutions

**Issue 1: Token is NULL**
- **Cause**: User's session expired or wasn't saved properly
- **Solution**: User needs to login again
- **Fix**: Clear AsyncStorage and restart app
  ```bash
  async function clearCache() {
    await AsyncStorage.clear();
  }
  ```

**Issue 2: Token is there but Authorization header malformed**
- **Cause**: Token format issue or special characters
- **Solution**: Check token length (should be long, >100 chars for JWT)
- **Fix**: Log the exact header being sent

**Issue 3: Middleware rejecting token**
- **Cause**: Token not recognized as JWT or Supabase token
- **Solution**: Check backend logs for "JWT verification failed"
- **Fix**: Ensure token matches one of the expected formats

**Issue 4: "Auth session missing" error**
- **Cause**: Token arrived but req.user.id is undefined
- **Solution**: Check if middleware is extracting user correctly
- **Fix**: Verify middleware is actually running (look for "=== AUTH MIDDLEWARE ===" logs)

### 6. What to Report

When you test this, please provide:

1. **Frontend console output** (what logs appear?)
2. **Backend terminal output** (what logs appear?)
3. **Exact error message** shown to user
4. **Token status** - does it exist in AsyncStorage?
5. **cURL test result** - does direct API call work?

This will help identify exactly where the issue is occurring.

## Quick Test Steps

1. Start backend:
   ```
   cd backend
   node server.js
   ```

2. Open frontend and login with test account

3. Go to Privacy & Security > Reset Password

4. Take screenshots of console errors

5. Share the console output logs with this information filled in
