const supabase = require('../config/supabase');
const { supabaseAdmin } = require('../config/supabase');

// 1. Add a restaurant to favorites
exports.addFavorite = async (req, res) => {
  try {
    const user_id = req.user.id;
    const restaurant_id = (req.params.restaurant_id || '').trim();

    if (!restaurant_id) {
      return res.status(400).json({ error: 'Restaurant ID is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('favorites')
      .insert([{ user_id, restaurant_id }])
      .select();

    // If they already favorited it, the UNIQUE rule will throw an error code "23505"
    if (error && error.code === '23505') {
      return res.status(400).json({ message: "Restaurant is already in your favorites!" });
    }
    if (error) throw error;

    res.status(201).json({ message: "Added to favorites!", data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 2. Remove a restaurant from favorites
exports.removeFavorite = async (req, res) => {
  try {
    const user_id = req.user.id;
    const restaurant_id = (req.params.restaurant_id || '').trim(); // Sanitized

    if (!restaurant_id) {
      return res.status(400).json({ error: 'Restaurant ID is required' });
    }

    const { error } = await supabaseAdmin
      .from('favorites')
      .delete()
      .match({ user_id, restaurant_id });

    if (error) throw error;

    res.status(200).json({ message: "Removed from favorites." });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 3. Get all of MY favorite restaurants
exports.getMyFavorites = async (req, res) => {
  try {
    const user_id = req.user.id;

    // We use *, restaurants(*) to pull the actual restaurant details, not just the ID!
    const { data, error } = await supabase
      .from('favorites')
      .select('*, restaurants(name, location)')
      .eq('user_id', user_id);

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};