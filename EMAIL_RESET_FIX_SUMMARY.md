# Password Reset Email Fix - Summary

## Problem
When users attempted to send a password reset code, they were not receiving the email.

## Root Causes Identified and Fixed

### 1. **Circular Require Issue** ❌ → ✅
**Location**: [backend/controllers/emailController.js](backend/controllers/emailController.js) Line 124

**Problem**:
```javascript
// BEFORE (Inside sendPasswordResetEmail function)
const emailController = require('./emailController');
if (!emailController.resetCodes) {
  emailController.resetCodes = new Map();
}
emailController.resetCodes.set(email, resetCodeData);
```

This was a circular dependency - the file was requiring itself, which could cause undefined behavior and prevent the resetCodes Map from being properly initialized.

**Solution**: 
- Moved `resetCodes` Map to module level (top of file)
- Removed the circular require
- Used the module-level `resetCodes` directly

### 2. **Missing Module Exports** ❌ → ✅
**Location**: [backend/controllers/emailController.js](backend/controllers/emailController.js) 

**Problem**:
The `resetCodes` Map was not exported, making it inaccessible to other controllers like `authController.js`.

**Solution**:
```javascript
// ADDED at end of file
exports.resetCodes = resetCodes;
```

### 3. **Unnecessary Duplicate Transporter** ❌ → ✅
**Location**: [backend/controllers/emailController.js](backend/controllers/emailController.js) Lines 132-139

**Problem**:
```javascript
// BEFORE - Creating duplicate transporter
const transporter = require('nodemailer').createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
```

The function was creating a new transporter each time instead of reusing the one defined at the module level (lines 4-10).

**Solution**:
Removed the duplicate transporter creation and used the module-level transporter already defined.

## Changes Made

### File: `backend/controllers/emailController.js`

**Change 1: Add resetCodes Map to module level**
```javascript
// In-memory storage for verification codes and reset codes (in production, use Redis or database)
const verificationCodes = new Map();
const resetCodes = new Map();  // ← ADDED
```

**Change 2: Remove circular require and duplicate transporter**
```javascript
// REMOVED:
// const emailController = require('./emailController');
// if (!emailController.resetCodes) {
//   emailController.resetCodes = new Map();
// }
// const transporter = require('nodemailer').createTransport({...});

// REPLACED WITH:
resetCodes.set(email, resetCodeData);  // Use module-level resetCodes
// Use existing module-level transporter
```

**Change 3: Export resetCodes for use in authController**
```javascript
// Export verificationCodes and resetCodes for use in other controllers
exports.verificationCodes = verificationCodes;
exports.resetCodes = resetCodes;  // ← ADDED
```

## Email Configuration

Email credentials are properly configured in `.env`:
- `EMAIL_USER`: phorn.sinet24@kit.edu.kh
- `EMAIL_PASS`: kvychearfuplnjce (Gmail app password)

## How It Works Now

1. **User requests password reset**: POST `/api/auth/send-password-reset-email`
2. **System verifies user exists** in the database
3. **Generates 6-digit reset code**
4. **Stores code in resetCodes Map** with 1-hour expiry
5. **Sends email** with the reset code using Gmail SMTP
6. **User receives email** with code and instructions
7. **User verifies code**: POST `/api/auth/verify-reset-code`
8. **User resets password**: POST `/api/auth/reset-password-with-code`

## Testing

To verify the fix works:

```bash
# 1. Start the backend server
cd backend
npm start

# 2. Request password reset for an existing user email
curl -X POST http://localhost:3000/api/auth/send-password-reset-email \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# 3. Check email for reset code (or dev response for testing)
```

## Development Mode Features

The code includes development-friendly features:
- If email sending fails, the code is still returned in the response for testing
- Console logs show detailed information about the reset code generation
- Dev mode message indicates whether email was sent or service is unavailable

## Next Steps / Considerations

1. **Production**: Move verification and reset codes from memory to Redis or database
2. **Email Service**: Consider using SendGrid or AWS SES for production reliability
3. **Rate Limiting**: Add rate limiting to password reset endpoint to prevent abuse
4. **Expiry Management**: Implement proper cleanup of expired codes

---
**Fix Completed**: ✅ Password reset emails should now be sent successfully
