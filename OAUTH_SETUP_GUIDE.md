# OAuth Integration Setup Guide

## What Was Implemented

I've integrated Google and Apple OAuth authentication into your restaurant reservation app. Here's what was done:

### Frontend Changes
- ✅ Added Google Sign In (via `expo-auth-session`)
- ✅ Added Apple Sign In (via `expo-apple-authentication`)
- ✅ Updated `signup.tsx` with Google/Apple authentication buttons
- ✅ Updated `login.tsx` with Google/Apple authentication buttons
- ✅ Added OAuth handlers and token management
- ✅ Added necessary Expo plugins and configurations
- ✅ Updated `app.json` with OAuth plugin configuration

### Backend Changes
- ✅ Added `googleSignUp()` endpoint
- ✅ Added `googleLogin()` endpoint
- ✅ Added `appleSignUp()` endpoint
- ✅ Added `appleLogin()` endpoint
- ✅ Added routes for all OAuth endpoints
- ✅ Integrated Supabase OAuth token verification

### Required Setup Steps

#### Step 1: Install Frontend Dependencies
```bash
cd frontend
npm install
# or
yarn install
```

This will install the newly added packages:
- `expo-auth-session` - For Google OAuth
- `expo-apple-authentication` - For Apple Sign In

#### Step 2: Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Google+ API
4. Create OAuth 2.0 credentials:
   - **Web Client ID**: For web/backend
   - **iOS Client ID**: For iOS app
   - **Android Client ID**: For Android app (if needed)

5. Copy the credentials to `.env` file in the frontend:
```bash
cd frontend
cp .env.example .env
```

6. Update `.env` with your Google credentials:
```
EXPO_PUBLIC_GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=YOUR_IOS_CLIENT_ID
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.10:3000
```

#### Step 3: Set Up Apple Sign In (iOS Only)

1. Go to [Apple Developer Account](https://developer.apple.com/)
2. Enable "Sign In with Apple" capability in your app ID
3. Configure return URLs in your developer account

#### Step 4: Configure Supabase OAuth

In your Supabase dashboard:

1. Go to **Authentication** → **Providers**
2. Enable **Google**:
   - Add your Google Client ID
   - Add your Google Client Secret
3. Enable **Apple**:
   - Add your Apple details

#### Step 5: Update Backend URL (if needed)

The frontend is currently hardcoded to use `http://192.168.1.10:3000`. If you're deploying to production, update:
- `signup.tsx` - Line with `http://192.168.1.10:3000/api/auth/...`
- `login.tsx` - Line with `http://192.168.1.10:3000/api/auth/...`
- `restaurant-signup.tsx` - Line with `http://192.168.1.10:3000/api/auth/...`

Or use the `.env` file with `EXPO_PUBLIC_BACKEND_URL` variable.

#### Step 6: Test the Integration

1. Start the backend:
```bash
cd backend
npm start
```

2. Start the frontend:
```bash
cd frontend
npm start
```

3. Test OAuth sign-up and login:
   - Click "Sign up with Google"
   - Click "Sign in with Apple"
   - Verify user data is stored in Supabase

## Endpoints Added

### Signup
- `POST /api/auth/google-signup` - Google sign up
- `POST /api/auth/apple-signup` - Apple sign up

### Login
- `POST /api/auth/google-login` - Google login
- `POST /api/auth/apple-login` - Apple login

## Environment Variables

Add these to `frontend/.env`:
```
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_google_ios_client_id
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_web_client_id
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.10:3000
```

## Troubleshooting

### Google Sign In Not Working
- Verify Google credentials are correct in `.env`
- Check that Google+ API is enabled in Google Cloud Console
- Ensure bundle identifier matches in Google Cloud Console

### Apple Sign In Not Working
- Apple Sign In only works on iOS devices (not simulator)
- Verify Apple developer account credentials
- Check that "Sign In with Apple" is enabled in your App ID

### Users Not Saving to Database
- Check backend logs for errors
- Verify Supabase credentials are correct
- Ensure `public.users` table has correct columns

## Files Modified

1. **frontend/app/signup.tsx** - Added Google/Apple OAuth handlers
2. **frontend/app/login.tsx** - Added Google/Apple OAuth handlers
3. **frontend/app/restaurant-signup.tsx** - Added password field and API integration
4. **frontend/app.json** - Added expo-apple-authentication plugin
5. **frontend/package.json** - Added expo-auth-session and expo-apple-authentication
6. **backend/controllers/authController.js** - Added OAuth endpoint handlers
7. **backend/routes/authRoutes.js** - Added OAuth routes
8. **frontend/.env.example** - Created environment variable template

## Next Steps

1. Complete the setup steps above
2. Test all authentication flows
3. Monitor logs for errors
4. Consider adding token refresh logic
5. Add error handling UI improvements
