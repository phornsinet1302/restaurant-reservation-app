const supabase = require('../config/supabase');
const { supabaseAdmin } = require('../config/supabase');

exports.searchRestaurants = async (req, res) => {
  const { search, filter } = req.query;
  
  try {
    let restaurants;
    // Search by name or address/location
    if (search) {
      const searchTerm = `%${search}%`;
      
      // Make two separate queries instead of using .or() to avoid filter syntax issues
      const [nameQuery, addressQuery] = await Promise.all([
        supabase
          .from('restaurants')
          .select('*')
          .eq('is_published', true)
          .ilike('name', searchTerm),
        supabase
          .from('restaurants')
          .select('*')
          .eq('is_published', true)
          .ilike('address', searchTerm)
      ]);
      
      if (nameQuery.error && addressQuery.error) {
        return res.status(400).json({ error: 'Search failed' });
      }
      
      // Combine results and remove duplicates
      const nameRestaurants = nameQuery.data || [];
      const addressRestaurants = addressQuery.data || [];
      const seenIds = new Set();
      restaurants = [];
      
      for (const restaurant of [...nameRestaurants, ...addressRestaurants]) {
        if (!seenIds.has(restaurant.id)) {
          seenIds.add(restaurant.id);
          restaurants.push(restaurant);
        }
      }
    } else {
      // Get all published restaurants if no search
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('is_published', true);
        
      if (error) return res.status(400).json({ error: error.message });
      restaurants = data;
    }

    // Fetch stories, menu items, and reviews in 3 batch queries instead of N*2 individual queries
    const now = new Date().toISOString();
    const restaurantIds = restaurants.map((r) => r.id);

    const [{ data: allStories }, { data: allMenuItems }, { data: allReviews }] = await Promise.all([
      supabase
        .from('stories')
        .select('id, restaurant_id, image_url, title, description, created_at, video_url')
        .in('restaurant_id', restaurantIds)
        .gt('expires_at', now)
        .order('created_at', { ascending: false }),
      supabase
        .from('menu_items')
        .select('id, restaurant_id, name, category, price, image_url')
        .in('restaurant_id', restaurantIds)
        .eq('is_available', true),
      supabase
        .from('reviews')
        .select('restaurant_id, rating')
        .in('restaurant_id', restaurantIds),
    ]);

    // Group by restaurant_id, capping at 3 stories and 5 menu items per restaurant
    const storiesByRestaurant = {};
    for (const story of allStories || []) {
      if (!storiesByRestaurant[story.restaurant_id]) storiesByRestaurant[story.restaurant_id] = [];
      if (storiesByRestaurant[story.restaurant_id].length < 3) storiesByRestaurant[story.restaurant_id].push(story);
    }
    const menuByRestaurant = {};
    for (const item of allMenuItems || []) {
      if (!menuByRestaurant[item.restaurant_id]) menuByRestaurant[item.restaurant_id] = [];
      if (menuByRestaurant[item.restaurant_id].length < 5) menuByRestaurant[item.restaurant_id].push(item);
    }

    // Compute average rating and review count from real customer reviews
    const ratingByRestaurant = {};
    for (const review of allReviews || []) {
      if (!ratingByRestaurant[review.restaurant_id]) ratingByRestaurant[review.restaurant_id] = { sum: 0, count: 0 };
      ratingByRestaurant[review.restaurant_id].sum += Number(review.rating || 0);
      ratingByRestaurant[review.restaurant_id].count += 1;
    }

    const restaurantsWithData = restaurants.map((restaurant) => {
      const rd = ratingByRestaurant[restaurant.id];
      const computedRating = rd && rd.count > 0 ? Number((rd.sum / rd.count).toFixed(2)) : null;
      return {
        ...restaurant,
        rating: computedRating,
        reviews_count: rd ? rd.count : 0,
        stories: storiesByRestaurant[restaurant.id] || [],
        menu_items: menuByRestaurant[restaurant.id] || [],
      };
    });

    res.status(200).json(restaurantsWithData);
  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ error: "Search failed" });
  }
};

exports.getRestaurantDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return res.status(404).json({ error: "Not found" });
    
    // Fetch active stories for this restaurant
    const now = new Date().toISOString();
    const { data: stories, error: storiesError } = await supabase
      .from('stories')
      .select('id, image_url, title, description, created_at, video_url')
      .eq('restaurant_id', id)
      .gt('expires_at', now)
      .order('created_at', { ascending: false });

    // Fetch menu items for this restaurant
    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', id)
      .eq('is_available', true)
      .order('category', { ascending: true });

    console.log(`📖 [getRestaurantDetails] Restaurant: ${id}`);
    console.log(`   Stories found: ${stories?.length || 0}`);
    console.log(`   Menu items found: ${menuItems?.length || 0}`);

    res.status(200).json({
      ...data,
      stories: stories || [],
      menu_items: menuItems || []
    });
  } catch (error) {
    console.error("Error fetching restaurant details:", error);
    res.status(500).json({ error: "Failed to fetch restaurant details" });
  }
};


exports.createRestaurant = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { name, description, address, opening_hours, closing_hours, phone, category, cuisine, latitude, longitude } = req.body;
    
    console.log('🍽️ Creating restaurant for merchant:', merchantId);
    console.log('   Merchant ID length:', merchantId?.length);
    console.log('   Merchant ID type:', typeof merchantId);
    console.log('📝 Restaurant data:', { name, address, phone });

    // IMPORTANT: Ensure merchant exists in users table before foreign key constraint
    console.log('🔍 Checking if merchant exists in users table...');
    const { data: existingUser, error: selectError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', merchantId);

    console.log('   Select result:', existingUser, 'Error:', selectError);

    if (!existingUser || existingUser.length === 0) {
      console.log('⚠️  Merchant not found in users table, auto-creating...');
      const { data: insertedUser, error: userError } = await supabaseAdmin
        .from('users')
        .insert([{
          id: merchantId,
          email: req.user.email || `merchant-${merchantId}@restaurant.local`,
          role: 'restaurant'
        }])
        .select();

      if (userError) {
        console.error('❌ Failed to create merchant user:', userError.message);
        console.error('   Full error:', JSON.stringify(userError));
        return res.status(400).json({ error: 'Failed to initialize merchant account: ' + userError.message });
      }
      console.log('✅ Merchant user created:', insertedUser);
      
      // Verify the user was actually created
      const { data: verifyUser, error: verifyError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', merchantId);
      console.log('✅ Verification - User exists:', verifyUser?.length > 0, 'Error:', verifyError?.message);
    } else {
      console.log('✅ Merchant already exists in users table');
    }

    // First: Verify merchant exists one more time with explicit logging
    console.log('🔍 Final verification before insert...');
    const verifyQuery = `SELECT id FROM users WHERE id = '${merchantId}'`;
    console.log('   Query:', verifyQuery);
    
    const { data: finalVerify, error: verifyError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', merchantId);
    
    console.log('   Result:', finalVerify, 'Error:', verifyError);

    // WORKAROUND: Use direct insert with latitude/longitude properly set
    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .insert([{
        merchant_id: merchantId,
        name: name || 'Untitled Restaurant',
        description: description || '',
        address: address || '',
        opening_hours: opening_hours || '10:00AM',
        closing_hours: closing_hours || '11:00PM',
        phone: phone || '',
        category: category || '',
        cuisine: cuisine || '',
        latitude: parseFloat(latitude) || null,
        longitude: parseFloat(longitude) || null,
        is_published: false,
      }])
      .select();

    if (error) {
      console.error('❌ Restaurant creation error:', error.message);
      console.error('   Error code:', error.code);
      console.error('   Error status:', error.status);
      console.error('   Full error:', JSON.stringify(error));
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ Restaurant created:', data[0]?.id);
    res.status(201).json({
      success: true,
      message: "Restaurant created successfully",
      data: data[0]
    });
  } catch (err) {
    console.error('❌ Error creating restaurant:', err.message);
    console.error('   Error details:', err);
    res.status(500).json({ error: "Failed to create restaurant: " + err.message });
  }
};


exports.updateRestaurant = async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('restaurants')
    .update(req.body)
    .eq('id', req.params.id)
    .eq('merchant_id', req.user.id);

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json({ message: "Updated successfully" });
};


exports.getRestaurantTables = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .eq('restaurant_id', id);

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json(data);
};


exports.getRestaurantMedia = async (req, res) => {
  try {
    const { id } = req.params; 
    const currentTime = new Date().toISOString();

    const { data, error } = await supabase
      .from('restaurant_media')
      .select('*')
      .eq('restaurant_id', id)
      .gt('expires_at', currentTime); 

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ======================== MERCHANT RESTAURANT LISTING MANAGEMENT ========================

// Define required fields for publishing a restaurant
const REQUIRED_FIELDS = [
  'name',
  'description',
  'address',
  'phone',
  'category',
  'cuisine',
  'opening_hours',
  'closing_hours'
];

/**
 * @desc Get merchant's restaurant listing (for editing)
 * @route GET /api/merchant/restaurant
 * @access Private (merchant only)
 */
exports.getMerchantRestaurant = async (req, res) => {
  try {
    const merchantId = req.user.id;

    console.log('📋 Fetching merchant restaurant for merchant:', merchantId);

    // Get merchant's restaurant — use admin client to bypass RLS on server-side requests
    const { data: restaurant, error } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('merchant_id', merchantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No restaurant found, return null
        console.log('⚠️ No restaurant found for merchant:', merchantId);
        return res.status(200).json({ data: null, message: "No restaurant listing yet" });
      }
      throw error;
    }

    console.log('✅ Restaurant found:', restaurant.id);
    res.status(200).json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    console.error('❌ Error fetching merchant restaurant:', error.message);
    res.status(500).json({ error: "Failed to fetch restaurant: " + error.message });
  }
};

/**
 * @desc Update merchant's restaurant listing
 * @route PUT /api/merchant/restaurant
 * @access Private (merchant only)
 */
exports.updateMerchantRestaurant = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const updates = req.body;

    console.log('📝 Updating merchant restaurant for:', merchantId);
    console.log('📝 Updates:', Object.keys(updates));

    // First, check if restaurant exists
    const { data: existingRestaurant, error: fetchError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('merchant_id', merchantId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    // If no restaurant exists, return error
    if (!existingRestaurant) {
      console.log('❌ No restaurant found for merchant:', merchantId);
      return res.status(404).json({ error: "Restaurant not found. Please contact support." });
    }

    // Separate time_slots from the rest (handle independently so an absent column never breaks the save)
    const { time_slots, ...coreUpdates } = updates;

    // Update core restaurant fields
    const { data: updatedRestaurant, error: updateError } = await supabaseAdmin
      .from('restaurants')
      .update(coreUpdates)
      .eq('merchant_id', merchantId)
      .select('*');

    // Save time_slots (Supabase returns {data,error} — never throws, so check error explicitly)
    if (Array.isArray(time_slots)) {
      const { error: slotError } = await supabaseAdmin
        .from('restaurants')
        .update({ time_slots })
        .eq('merchant_id', merchantId);
      if (slotError) console.warn('⚠️  time_slots not saved:', slotError.message);
    }

    if (updateError) {
      console.error('❌ Update error:', updateError.message);
      throw updateError;
    }

    console.log('✅ Restaurant updated successfully');
    res.status(200).json({
      success: true,
      message: "Restaurant listing updated successfully",
      data: updatedRestaurant[0]
    });
  } catch (error) {
    console.error('❌ Error updating restaurant:', error.message);
    res.status(500).json({ error: "Failed to update restaurant: " + error.message });
  }
};

/**
 * @desc Validate if restaurant has all required fields
 * @route POST /api/merchant/restaurant/validate
 * @access Private (merchant only)
 */
exports.validateRestaurantListing = async (req, res) => {
  try {
    const merchantId = req.user.id;

    console.log('✔️ Validating merchant restaurant:', merchantId);

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('merchant_id', merchantId)
      .single();

    if (error && error.code === 'PGRST116') {
      return res.status(200).json({
        isValid: false,
        missingFields: REQUIRED_FIELDS,
        message: "Restaurant listing not found"
      });
    }

    if (error) throw error;

    // Check for missing fields
    const missingFields = REQUIRED_FIELDS.filter(field => !restaurant[field]);

    const isValid = missingFields.length === 0;

    console.log(`${isValid ? '✅' : '❌'} Validation result - Valid: ${isValid}, Missing: ${missingFields.length}`);

    res.status(200).json({
      success: true,
      isValid,
      missingFields,
      numMissing: missingFields.length,
      message: isValid 
        ? "Restaurant listing is complete and ready to publish"
        : `Missing ${missingFields.length} field(s): ${missingFields.join(', ')}`
    });
  } catch (error) {
    console.error('❌ Validation error:', error.message);
    res.status(500).json({ error: "Validation failed: " + error.message });
  }
};

/**
 * @desc Publish merchant's restaurant (make it visible to customers)
 * @route POST /api/merchant/restaurant/publish
 * @access Private (merchant only)
 */
exports.publishRestaurant = async (req, res) => {
  try {
    const merchantId = req.user.id;

    console.log('🚀 Publishing restaurant for merchant:', merchantId);

    // Get restaurant to validate
    const { data: restaurant, error: fetchError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('merchant_id', merchantId)
      .single();

    if (fetchError && fetchError.code === 'PGRST116') {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    if (fetchError) throw fetchError;

    // Check for missing required fields
    const missingFields = REQUIRED_FIELDS.filter(field => !restaurant[field]);

    if (missingFields.length > 0) {
      console.log('❌ Cannot publish - missing fields:', missingFields);
      return res.status(400).json({
        error: `Cannot publish restaurant. Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      });
    }

    // Publish restaurant
    const publishedAt = new Date().toISOString();
    const { data: updatedRestaurant, error: updateError } = await supabaseAdmin
      .from('restaurants')
      .update({
        is_published: true,
        published_at: publishedAt
      })
      .eq('merchant_id', merchantId)
      .select('*');

    if (updateError) throw updateError;

    console.log('✅ Restaurant published successfully');
    res.status(200).json({
      success: true,
      message: "Restaurant published successfully and is now visible to customers!",
      data: updatedRestaurant[0]
    });
  } catch (error) {
    console.error('❌ Error publishing restaurant:', error.message);
    res.status(500).json({ error: "Failed to publish restaurant: " + error.message });
  }
};

/**
 * @desc Unpublish merchant's restaurant (hide from customers)
 * @route POST /api/merchant/restaurant/unpublish
 * @access Private (merchant only)
 */
exports.unpublishRestaurant = async (req, res) => {
  try {
    const merchantId = req.user.id;

    console.log('🔒 Unpublishing restaurant for merchant:', merchantId);

    const { data: updatedRestaurant, error } = await supabaseAdmin
      .from('restaurants')
      .update({ is_published: false })
      .eq('merchant_id', merchantId)
      .select('*');

    if (error) throw error;

    console.log('✅ Restaurant unpublished successfully');
    res.status(200).json({
      success: true,
      message: "Restaurant is now hidden from customers",
      data: updatedRestaurant[0]
    });
  } catch (error) {
    console.error('❌ Error unpublishing restaurant:', error.message);
    res.status(500).json({ error: "Failed to unpublish restaurant: " + error.message });
  }
};

/**
 * @desc Get required fields for restaurant listing
 * @route GET /api/merchant/restaurant/required-fields
 * @access Public
 */
exports.getRequiredFields = async (req, res) => {
  res.status(200).json({
    requiredFields: REQUIRED_FIELDS,
    count: REQUIRED_FIELDS.length
  });
};

// DEBUG: Check all restaurants and their image_urls
exports.debugRestaurantImages = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, image_url, merchant_id, is_published');
    
    if (error) throw error;
    
    console.log('🔍 DEBUG: All restaurants and their image_urls:');
    data.forEach((r, idx) => {
      console.log(`   ${idx + 1}. ${r.name}`);
      console.log(`      - ID: ${r.id}`);
      console.log(`      - Image URL: ${r.image_url || '(NULL)'}`);
      console.log(`      - Published: ${r.is_published}`);
    });
    
    res.status(200).json({
      total: data.length,
      restaurants: data
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ADMIN: Set image_url for a restaurant (for testing/fixing)
exports.setRestaurantImageUrl = async (req, res) => {
  try {
    const { restaurantId, imageUrl } = req.body;
    
    if (!restaurantId || !imageUrl) {
      return res.status(400).json({ error: 'restaurantId and imageUrl are required' });
    }
    
    console.log(`📸 Setting image_url for restaurant ${restaurantId}`);
    console.log(`   New image URL: ${imageUrl}`);
    
    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .update({ image_url: imageUrl })
      .eq('id', restaurantId)
      .select();
    
    if (error) throw error;
    
    console.log(`✅ Image URL updated successfully for: ${data[0]?.name}`);
    
    res.status(200).json({
      message: 'Restaurant image_url updated successfully',
      data: data[0]
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

