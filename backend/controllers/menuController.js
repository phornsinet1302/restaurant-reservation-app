const supabase = require('../config/supabase');
const { supabaseAdmin } = require('../config/supabase');

// 1. Add Menu Item
exports.addMenuItem = async (req, res) => {
  try {
    let { restaurant_id, name, description, price, category, image_url, is_available } = req.body;

    console.log('📝 [addMenuItem] Request received:');
    console.log('   restaurant_id (from body):', restaurant_id);
    console.log('   name:', name);
    console.log('   price:', price);
    console.log('   category:', category);
    console.log('   user:', req.user?.id);

    // If no restaurant_id provided, resolve from the authenticated user
    if (!restaurant_id && req.user) {
      console.log('   Attempting to find restaurant for merchant:', req.user.id);
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id')
        .eq('merchant_id', req.user.id)
        .single();
      
      if (restaurantError) {
        console.error('   ❌ Error finding restaurant:', restaurantError.message);
      } else if (restaurant) {
        console.log('   ✅ Restaurant found:', restaurant.id);
        restaurant_id = restaurant.id;
      } else {
        console.log('   ⚠️  No restaurant found for this merchant');
      }
    }

    if (!restaurant_id) {
      console.error('❌ No restaurant_id after resolution');
      return res.status(400).json({ error: 'No restaurant found for your account. Please create a restaurant first.' });
    }

    const insertData = { 
      restaurant_id, 
      name, 
      description, 
      price: parseFloat(price),
      category, 
      image_url,
      is_available: is_available !== false
    };

    console.log('   Insert data:', JSON.stringify(insertData));

    const { data, error } = await supabaseAdmin
      .from('menu_items')
      .insert([insertData])
      .select();

    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }

    console.log('✅ Menu item created:', data[0]?.id);
    res.status(201).json({ message: 'Menu item added successfully!', data });
  } catch (error) {
    console.error('❌ Error in addMenuItem:', error.message);
    res.status(400).json({ error: error.message });
  }
};

// 2. Get All Menu Items (Can optionally filter by restaurant_id)
exports.getMenuItems = async (req, res) => {
  try {
    const { restaurant_id } = req.query; // e.g., /api/menu?restaurant_id=123
    
    console.log('🍽️ [getMenuItems] Query params:', { restaurant_id });
    console.log('   Request headers:', { auth: req.headers.authorization ? 'present' : 'missing' });
    
    let query = supabase.from('menu_items').select('*');
    if (restaurant_id) {
      console.log(`   Filtering by restaurant_id: ${restaurant_id}`);
      query = query.eq('restaurant_id', restaurant_id);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Error fetching menu items:', error);
      throw error;
    }

    console.log(`✅ Found ${data?.length || 0} menu items`);
    if (data && data.length > 0) {
      data.forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.name} ($${item.price}) - ${item.category}`);
      });
    }

    // Debug response before sending
    console.log('🔍 Response being sent:');
    console.log('   Type:', typeof data);
    console.log('   Is array:', Array.isArray(data));
    console.log('   Stringified:', JSON.stringify(data));

    res.status(200).json(data || []);
  } catch (error) {
    console.error('❌ Error in getMenuItems:', error.message);
    res.status(400).json({ error: error.message });
  }
};

// 3. Get Menu Item Details
exports.getMenuItemDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('menu_items')
      .select('*, restaurants(name)')
      .eq('id', id)
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 4. Update Menu Item
exports.updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body; // Allows updating price, name, is_available, etc.

    const { data, error } = await supabaseAdmin
      .from('menu_items')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.status(200).json({ message: 'Menu item updated!', data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 5. Delete Menu Item
exports.deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from('menu_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(200).json({ message: 'Menu item deleted successfully!' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};