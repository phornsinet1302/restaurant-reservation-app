const supabase = require('../config/supabase');

// 1. Get Restaurant Media (Gallery & Active Stories)
exports.getRestaurantMedia = async (req, res) => {
  try {
    const { restaurant_id } = req.query; 
    if (!restaurant_id) return res.status(400).json({ error: "restaurant_id is required" });

    // Fetch media. In a real production app, you would filter out expired stories here!
    const { data, error } = await supabase
      .from('restaurant_media')
      .select('*')
      .eq('restaurant_id', restaurant_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 2. Upload Standard Media (Permanent Photo/Video)
exports.uploadMedia = async (req, res) => {
  try {
    const { restaurant_id, media_url, media_type } = req.body;
    console.log("=== DEBUG: VARIABLES ===", { restaurant_id, media_url, media_type });

    const { data, error } = await supabase
      .from('restaurant_media')
      .insert([{ 
        restaurant_id, 
        media_url, 
        media_type 
      }])
      .select();

    if (error) throw error;
    res.status(201).json({ message: 'Media uploaded successfully!', data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 3. Upload a Story (Disappears in 24 hours)
exports.uploadStory = async (req, res) => {
  try {
    const { restaurant_id, media_url, media_type } = req.body;
    
    // Calculate expiration time (24 hours from right now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('restaurant_media')
      .insert([{ 
        restaurant_id, 
        media_url, 
        media_type, 
        is_story: true, 
        expires_at: expiresAt 
      }])
      .select();

    if (error) throw error;
    res.status(201).json({ message: 'Story posted! It will disappear in 24 hours.', data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 4. Delete Media
exports.deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('restaurant_media')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(200).json({ message: 'Media deleted successfully!' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};