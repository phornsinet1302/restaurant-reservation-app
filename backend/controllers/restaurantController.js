const supabase = require('../config/supabase');

exports.getRestaurants = async (req, res) => {
  const { search, filter } = req.query;
  
  try {
    let query = supabase.from('restaurants').select('*');
    
    // Search by name or address/location
    if (search) {
      const searchTerm = `%${search}%`;
      // Use OR filter to search in both name and address
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .or(`name.ilike.${searchTerm},address.ilike.${searchTerm}`);
      
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json(data);
    }
    
    // Get all restaurants if no search
    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json(data);
  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ error: "Search failed" });
  }
};

exports.getRestaurantDetails = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('restaurants')
    .select('*, menu_items(*), tables(*)')
    .eq('id', id)
    .single();

  if (error) return res.status(404).json({ error: "Not found" });
  res.status(200).json(data);
};


exports.createRestaurant = async (req, res) => {
  const { name, description, address, opening_hours } = req.body;
  const { data, error } = await supabase.from('restaurants').insert([
    { name, description, address, opening_hours, merchant_id: req.user.id }
  ]).select();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
};


exports.updateRestaurant = async (req, res) => {
  const { data, error } = await supabase
    .from('restaurants')
    .update(req.body)
    .eq('id', req.params.id)
    .eq('merchant_id', req.user.id);

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json({ message: "Updated successfully" });
};


exports.getRestaurantMenu = async (req, res) => {
  const { id } = req.params; 
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', id);

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json(data);
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

