const supabase = require('../config/supabase'); // Make sure this path matches your setup!

// 1. Add Menu Item
exports.addMenuItem = async (req, res) => {
  try {
    const { restaurant_id, name, description, price, category, image_url } = req.body;
    const { data, error } = await supabase
      .from('menu_items')
      .insert([{ restaurant_id, name, description, price, category, image_url }])
      .select();

    if (error) throw error;
    res.status(201).json({ message: 'Menu item added successfully!', data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 2. Get All Menu Items (Can optionally filter by restaurant_id)
exports.getMenuItems = async (req, res) => {
  try {
    const { restaurant_id } = req.query; // e.g., /api/menu?restaurant_id=123
    
    let query = supabase.from('menu_items').select('*');
    if (restaurant_id) {
      query = query.eq('restaurant_id', restaurant_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
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

    const { data, error } = await supabase
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
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(200).json({ message: 'Menu item deleted successfully!' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};