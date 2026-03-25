const supabase = require('../config/supabase');
const { validateCoordinates, formatLocation, calculateDistance } = require('../utils/locationService');

// @desc Get restaurant location
exports.getRestaurantLocation = async (req, res) => {
  try {
    const { restaurant_id } = req.params;

    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, latitude, longitude, address')
      .eq('id', restaurant_id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.status(200).json({
      success: true,
      location: formatLocation(data),
    });
  } catch (error) {
    console.error('Get location error:', error.message);
    res.status(500).json({ error: 'Failed to fetch location' });
  }
};

// @desc Update restaurant location (merchant only)
exports.updateRestaurantLocation = async (req, res) => {
  try {
    const { restaurant_id } = req.params;
    const { latitude, longitude, address, placeId } = req.body;

    // Validate coordinates
    const coords = validateCoordinates(latitude, longitude);

    // Verify restaurant belongs to this merchant
    const { data: restaurant, error: fetchError } = await supabase
      .from('restaurants')
      .select('merchant_id')
      .eq('id', restaurant_id)
      .single();

    if (fetchError || !restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    if (restaurant.merchant_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized. You can only update your own restaurant location.' });
    }

    // Update location
    const updateData = {
      latitude: coords.latitude,
      longitude: coords.longitude,
    };

    if (address) updateData.address = address;
    if (placeId) updateData.place_id = placeId;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('restaurants')
      .update(updateData)
      .eq('id', restaurant_id)
      .select();

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      location: formatLocation(data[0]),
    });
  } catch (error) {
    console.error('Update location error:', error.message);

    if (error.message.includes('Latitude') || error.message.includes('Longitude')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to update location' });
  }
};

// @desc Get nearby restaurants
exports.getNearbyRestaurants = async (req, res) => {
  try {
    const { latitude, longitude, radius = 5 } = req.query;

    // Validate user location
    const userCoords = validateCoordinates(latitude, longitude);

    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select('id, name, address, latitude, longitude, rating, reviews_count')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (error) throw error;

    // Filter by radius
    const nearby = restaurants
      .map((restaurant) => {
        const distance = calculateDistance(
          userCoords.latitude,
          userCoords.longitude,
          restaurant.latitude,
          restaurant.longitude
        );

        return {
          ...restaurant,
          distance: Math.round(distance * 100) / 100, // Round to 2 decimals
          latitude: parseFloat(restaurant.latitude),
          longitude: parseFloat(restaurant.longitude),
        };
      })
      .filter((restaurant) => restaurant.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    res.status(200).json({
      success: true,
      count: nearby.length,
      radius,
      restaurants: nearby,
    });
  } catch (error) {
    console.error('Nearby restaurants error:', error.message);

    if (error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to fetch nearby restaurants' });
  }
};

// @desc Get distance between two locations
exports.getDistance = async (req, res) => {
  try {
    const { fromLat, fromLng, toLat, toLng } = req.query;

    const fromCoords = validateCoordinates(fromLat, fromLng);
    const toCoords = validateCoordinates(toLat, toLng);

    const distanceKm = calculateDistance(
      fromCoords.latitude,
      fromCoords.longitude,
      toCoords.latitude,
      toCoords.longitude
    );

    res.status(200).json({
      success: true,
      distance: {
        kilometers: Math.round(distanceKm * 100) / 100,
        miles: Math.round((distanceKm * 0.621371) * 100) / 100,
      },
    });
  } catch (error) {
    console.error('Distance calculation error:', error.message);

    if (error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to calculate distance' });
  }
};
