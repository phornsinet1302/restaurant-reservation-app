/**
 * Location Service - Handles location-related operations
 * Converts between different location formats and validates coordinates
 */

// Validate latitude and longitude
const validateCoordinates = (latitude, longitude) => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng)) {
    throw new Error('Invalid latitude or longitude format');
  }

  if (lat < -90 || lat > 90) {
    throw new Error('Latitude must be between -90 and 90');
  }

  if (lng < -180 || lng > 180) {
    throw new Error('Longitude must be between -180 and 180');
  }

  return { latitude: lat, longitude: lng };
};

// Calculate distance between two coordinates (in kilometers)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Format location for response
const formatLocation = (location) => {
  return {
    latitude: parseFloat(location.latitude),
    longitude: parseFloat(location.longitude),
    address: location.address || null,
    placeId: location.place_id || null,
  };
};

module.exports = {
  validateCoordinates,
  calculateDistance,
  formatLocation,
};
