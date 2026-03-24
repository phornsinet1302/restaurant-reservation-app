const supabase = require('../config/supabase');

// --- CUSTOMER ACTIONS (Public) ---

// 1. Search & Get All (SRS 3.1.3)
exports.getRestaurants = async (req, res) => {
  const { search } = req.query;
  let query = supabase.from('restaurants').select('*');
  if (search) query = query.ilike('name', `%${search}%`);
  
  const { data, error } = await query;
  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json(data);
};

// 2. Get Details & Menu (SRS 3.1.4)
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

// --- MERCHANT ACTIONS (Protected) ---

// 3. Create Restaurant (Merchant Phase 2)
exports.createRestaurant = async (req, res) => {
  const { name, description, address, opening_hours } = req.body;
  const { data, error } = await supabase.from('restaurants').insert([
    { name, description, address, opening_hours, merchant_id: req.user.id }
  ]).select();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
};

// 4. Update Restaurant (Merchant Phase 10)
exports.updateRestaurant = async (req, res) => {
  const { data, error } = await supabase
    .from('restaurants')
    .update(req.body)
    .eq('id', req.params.id)
    .eq('merchant_id', req.user.id);

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json({ message: "Updated successfully" });
};

// GET Menu Items (SRS 3.1.4)
exports.getRestaurantMenu = async (req, res) => {
  const { id } = req.params; // restaurant ID
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', id);

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json(data);
};

// GET Tables (SRS 3.2.4)
exports.getRestaurantTables = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .eq('restaurant_id', id);

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json(data);
};

// GET Media (SRS Phase 8 - Only shows stories < 24h old)
exports.getRestaurantMedia = async (req, res) => {
  try {
    const { id } = req.params; // restaurant ID
    const currentTime = new Date().toISOString();

    const { data, error } = await supabase
      .from('restaurant_media')
      .select('*')
      .eq('restaurant_id', id)
      .gt('expires_at', currentTime); // Only get media where expiration is in the future

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// POST Media (Merchant Phase 10 - For uploading stories)
exports.uploadMedia = async (req, res) => {
  try {
    const { restaurantId, mediaUrl, mediaType } = req.body;

    const { data, error } = await supabase
      .from('restaurant_media')
      .insert([{ 
        restaurant_id: restaurantId, 
        media_url: mediaUrl, 
        media_type: mediaType 
      }])
      .select();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};