# Google Maps Integration Setup Guide

## Overview
This guide explains how to integrate Google Maps into your Restaurant Reservation App for location tracking and display.

## Features Integrated
1. **Restaurant Location Display** - Show restaurant location on a map
2. **Location Tracking** - Track customer location relative to the restaurant
3. **Location Picker** - Allow merchants to set/update their restaurant location
4. **Distance Calculation** - Calculate distance between customer and restaurant
5. **Nearby Restaurants** - Find restaurants near the user's location

## Prerequisites
- Google Cloud Account
- Google Maps API enabled
- Expo project configured

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable these APIs:
   - **Maps SDK for Android**
   - **Maps SDK for iOS**
   - **Maps JavaScript API**
   - **Geocoding API**

## Step 2: Create API Keys

### For Android:
1. Go to **Credentials** in Google Cloud Console
2. Click **Create Credentials** > **API Key**
3. Copy the API key

### For iOS:
1. Create another API key using the same steps
2. Restrict it to iOS apps if desired

## Step 3: Configure app.json

Add the following to your `frontend/app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-maps",
        {
          "googleMapsApiKey": "YOUR_ANDROID_API_KEY"
        }
      ]
    ],
    "ios": {
      "config": {
        "googleMapsApiKey": "YOUR_IOS_API_KEY"
      }
    }
  }
}
```

Replace `YOUR_ANDROID_API_KEY` and `YOUR_IOS_API_KEY` with your actual API keys.

## Step 4: Update .env File

Create or update `.env` files:

### Backend (.env)
```
GOOGLE_MAPS_API_KEY=your_api_key_here
```

### Frontend (.env)
```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

## Step 5: Database Schema Updates Required

The restaurants table needs these new columns:

```sql
ALTER TABLE restaurants ADD COLUMN latitude DECIMAL(10, 8);
ALTER TABLE restaurants ADD COLUMN longitude DECIMAL(11, 8);
ALTER TABLE restaurants ADD COLUMN address VARCHAR(255);
ALTER TABLE restaurants ADD COLUMN place_id VARCHAR(255);
ALTER TABLE restaurants ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
```

Execute this in your Supabase SQL editor.

## API Endpoints Available

### 1. Get Restaurant Location
```
GET /api/location/restaurant/:restaurant_id
```
Returns the location of a specific restaurant.

### 2. Update Restaurant Location (Merchant Only)
```
PATCH /api/location/restaurant/:restaurant_id
Headers: Authorization: Bearer {token}
Body: {
  "latitude": 37.7749,
  "longitude": -122.4194,
  "address": "San Francisco, CA",
  "placeId": "optional_google_place_id"
}
```

### 3. Get Nearby Restaurants
```
GET /api/location/nearby?latitude=37.7749&longitude=-122.4194&radius=5
```
Returns restaurants within specified radius (km).

### 4. Calculate Distance
```
GET /api/location/distance?fromLat=37.7749&fromLng=-122.4194&toLat=37.7849&toLng=-122.4094
```
Returns distance in kilometers and miles.

## Components Usage

### RestaurantMap Component
Display a static restaurant location on a map.

```tsx
import RestaurantMap from '@/components/RestaurantMap';

<RestaurantMap
  location={{
    latitude: 37.7749,
    longitude: -122.4194,
    address: 'San Francisco, CA',
    name: 'Restaurant Name'
  }}
  height={300}
/>
```

### LocationPicker Component
Allow merchants to pick and set their restaurant location.

```tsx
import LocationPicker from '@/components/LocationPicker';

<LocationPicker
  onLocationSelected={(location) => {
    // Handle selected location
    console.log(location);
  }}
/>
```

### LocationTracking Component
Show customer their location relative to the restaurant.

```tsx
import LocationTracking from '@/components/LocationTracking';

<LocationTracking
  restaurantId="restaurant-uuid"
  restaurantName="Restaurant Name"
/>
```

## Permission Requirements

### Android (AndroidManifest.xml)
Already handled by `expo-location`, but make sure these are present:
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

### iOS (Info.plist)
Already handled by Expo, but check:
- `NSLocationWhenInUseUsageDescription`
- `NSLocationAlwaysAndWhenInUseUsageDescription`

These are automatically added by `expo-location`.

## Integration Points

### 1. Restaurant Detail Page
Add `RestaurantMap` to show location when viewing details:

```tsx
import RestaurantMap from '@/components/RestaurantMap';

// In your restaurant detail component
const [location, setLocation] = useState(null);

useEffect(() => {
  // Fetch restaurant location from API
  const fetchLocation = async () => {
    const response = await axios.get(`/api/location/restaurant/${restaurantId}`);
    setLocation(response.data.location);
  };
  fetchLocation();
}, [restaurantId]);

<RestaurantMap location={location} height={350} />
```

### 2. Booking Confirmation Page
Add `LocationTracking` to track location during/after booking:

```tsx
import LocationTracking from '@/components/LocationTracking';

<LocationTracking 
  restaurantId={bookingData.restaurantId}
  restaurantName={bookingData.restaurantName}
/>
```

### 3. Merchant Profile/Settings
Add `LocationPicker` to allow location updates:

```tsx
import LocationPicker from '@/components/LocationPicker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const handleLocationUpdate = async (location) => {
  try {
    const token = await AsyncStorage.getItem('token');
    await axios.patch(
      `/api/location/restaurant/${restaurantId}`,
      location,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    Alert.alert('Success', 'Location updated successfully');
  } catch (error) {
    Alert.alert('Error', 'Failed to update location');
  }
};

<LocationPicker onLocationSelected={handleLocationUpdate} />
```

## Troubleshooting

### Maps not showing
1. Check that API keys are correctly set in `app.json`
2. Verify APIs are enabled in Google Cloud Console
3. Check that you have internet connectivity
4. Rebuild the app: `expo prebuild --clean`

### Location permission denied
1. Check app permissions in device settings
2. Request permission explicitly in code
3. iOS: Check Info.plist for location descriptions

### Distance showing 0
1. Verify both locations have valid coordinates
2. Check backend location validation
3. Ensure database has latitude/longitude values

### Slow map rendering
1. Reduce marker count  
2. Use simpler polyline patterns
3. Adjust map region sensitivity
4. Consider using map clustering for many markers

## Best Practices

1. **Always validate coordinates** before storing
2. **Cache location data** to reduce API calls
3. **Update location periodically** but not too frequently (every 10-30 seconds)
4. **Show user feedback** during location operations
5. **Handle errors gracefully** with user-friendly messages
6. **Request permissions** only when needed
7. **Stop tracking** when leaving the tracking screen

## Security Considerations

1. **Restrict API Keys** in Google Cloud Console:
   - Set application restrictions
   - Set API restrictions
2. **Never expose API keys** in client-side code (use environment variables)
3. **Validate coordinates** on backend before storing
4. **Use HTTPS** for all location requests
5. **Implement rate limiting** on location endpoints

## Next Steps

1. Set up Google Cloud project and get API keys
2. Update `app.json` with your API keys
3. Execute SQL migrations to add location columns
4. Integrate components into relevant pages
5. Test on both Android and iOS devices
6. Configure API key restrictions for production

