# Google Maps Integration - Quick Reference

## 🚀 Quick Start Checklist

- [ ] Create Google Cloud project and enable APIs
- [ ] Get Android and iOS API keys
- [ ] Update `frontend/app.json` with API keys
- [ ] Run database migration (SQL file)
- [ ] Restart backend server
- [ ] Test APIs with curl/Postman
- [ ] Integrate components into pages
- [ ] Build and test on device

## 📦 Installed Packages
```json
{
  "react-native-maps": "latest",
  "expo-location": "latest"
}
```

## 🗂️ File Structure
```
restaurant-reservation-app/
├── backend/
│   ├── controllers/locationController.js
│   ├── routes/locationRoutes.js
│   ├── utils/locationService.js
│   └── server.js (updated)
├── frontend/
│   ├── components/
│   │   ├── RestaurantMap.tsx
│   │   ├── LocationPicker.tsx
│   │   └── LocationTracking.tsx
│   ├── screens/Merchant/UpdateLocationScreen.tsx
│   ├── app/booking-confirmation-example.tsx
│   └── app.json (updated)
├── database/
│   └── migrations/001_add_location_fields.sql
├── GOOGLE_MAPS_SETUP.md
└── GOOGLE_MAPS_INTEGRATION_COMPLETE.md
```

## 🔑 Key Components

| Component | Purpose | Usage |
|-----------|---------|-------|
| `RestaurantMap` | Display restaurant location | Restaurant detail, booking confirmation |
| `LocationPicker` | Pick/update restaurant location | Merchant settings |
| `LocationTracking` | Real-time tracking | Booking confirmation page |

## 📡 API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/location/restaurant/:id` | No | Get restaurant location |
| PATCH | `/api/location/restaurant/:id` | Yes | Update location (merchant) |
| GET | `/api/location/nearby` | No | Find nearby restaurants |
| GET | `/api/location/distance` | No | Calculate distance |

## 🔐 Environment Variables

### Backend .env
```env
GOOGLE_MAPS_API_KEY=your_key_here
```

### Frontend .env
```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
```

## 💻 Code Snippets

### Fetch and Display Location
```tsx
const [location, setLocation] = useState(null);

useEffect(() => {
  axios.get(`/api/location/restaurant/${restaurantId}`)
    .then(res => setLocation(res.data.location));
}, [restaurantId]);

return <RestaurantMap location={location} />;
```

### Update Restaurant Location
```tsx
const handleLocationUpdate = async (location) => {
  const token = await AsyncStorage.getItem('token');
  const response = await axios.patch(
    `/api/location/restaurant/${restaurantId}`,
    location,
    { headers: { Authorization: `Bearer ${token}` } }
  );
};
```

### Get Nearby Restaurants
```tsx
const getNearby = async (lat, lng) => {
  const response = await axios.get('/api/location/nearby', {
    params: { latitude: lat, longitude: lng, radius: 5 }
  });
  return response.data.restaurants;
};
```

### Calculate Distance
```tsx
const getDistance = async (from, to) => {
  const response = await axios.get('/api/location/distance', {
    params: {
      fromLat: from.latitude,
      fromLng: from.longitude,
      toLat: to.latitude,
      toLng: to.longitude
    }
  });
  return response.data.distance;
};
```

## 🧪 Testing APIs

```bash
# Test restaurant location endpoint
curl http://localhost:3000/api/location/restaurant/restaurant-uuid

# Test update endpoint (requires token)
curl -X PATCH http://localhost:3000/api/location/restaurant/restaurant-uuid \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 37.7749,
    "longitude": -122.4194,
    "address": "San Francisco"
  }'

# Test nearby restaurants
curl "http://localhost:3000/api/location/nearby?latitude=37.7749&longitude=-122.4194&radius=5"

# Test distance calculation
curl "http://localhost:3000/api/location/distance?fromLat=37.7749&fromLng=-122.4194&toLat=37.7849&toLng=-122.4094"
```

## ⚙️ Configuration Steps

1. **Google Cloud Setup**
   - Create project at console.cloud.google.com
   - Enable Maps SDK for Android/iOS
   - Create API keys
   - Set API restrictions

2. **App Configuration**
   ```json
   // Update app.json
   {
     "plugins": [
       ["react-native-maps", {
         "googleMapsApiKey": "YOUR_KEY"
       }]
     ],
     "ios": {
       "config": {
         "googleMapsApiKey": "YOUR_KEY"
       }
     }
   }
   ```

3. **Database Migration**
   ```sql
   -- Run in Supabase SQL Editor
   [Copy contents from 001_add_location_fields.sql]
   ```

4. **Restart Services**
   ```bash
   # Backend
   npm run dev

   # Frontend  
   npm start
   ```

## 🐛 Debugging

### Map Not Loading
```tsx
// Add error handling
<MapView
  onError={(error) => console.log('Map error:', error)}
/>
```

### Location Permission Issues
```tsx
// Request permission explicitly
const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== 'granted') {
  Alert.alert('Permission denied');
}
```

### Network Errors
```tsx
// Add timeout and retry logic
axios.get(url, { timeout: 10000 })
  .catch(error => {
    if (error.code === 'ECONNABORTED') {
      console.log('Request timeout');
    }
  });
```

## 📚 Documentation Links

- **Setup Guide**: [GOOGLE_MAPS_SETUP.md](./GOOGLE_MAPS_SETUP.md)
- **Integration Details**: [GOOGLE_MAPS_INTEGRATION_COMPLETE.md](./GOOGLE_MAPS_INTEGRATION_COMPLETE.md)
- **React Native Maps**: https://github.com/react-native-maps/react-native-maps
- **Expo Location**: https://docs.expo.dev/versions/latest/sdk/location/

## 🆘 Need Help?

1. Check `GOOGLE_MAPS_SETUP.md` for detailed setup
2. Review example files in `frontend/`
3. Check backend logs: `npm run dev`
4. Verify API keys and permissions
5. Test endpoints with curl before integration

---

**Last Updated**: March 25, 2026
**Status**: ✅ Ready to Integrate
