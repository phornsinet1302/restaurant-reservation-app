const supabase = require('../config/supabase');

// 1. Get Dashboard Overview (Total stats for the merchant)
exports.getDashboardOverview = async (req, res) => {
  try {
    const merchant_id = req.user.id; // From the logged-in user token

    // A. Find the restaurant owned by this merchant
    const { data: restaurant, error: restErr } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('merchant_id', merchant_id)
      .single();

    if (restErr || !restaurant) {
        return res.status(404).json({ error: "No restaurant found for this merchant account." });
    }

    // B. Get total number of reservations
    const { count: resCount, error: resErr } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurant.id);

    // C. Get total number of menu items
    const { count: menuCount, error: menuErr } = await supabase
      .from('menu_items')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurant.id);

    // D. Send back a beautiful summary package
    res.status(200).json({
      restaurant_name: restaurant.name,
      total_reservations: resCount || 0,
      total_menu_items: menuCount || 0
    });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 2. Get All Reservations (Merchant View)
exports.getAllReservations = async (req, res) => {
  try {
    const merchant_id = req.user.id;

    // Find the merchant's restaurant ID first
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('merchant_id', merchant_id)
      .single();

    if (!restaurant) return res.status(404).json({ error: "Restaurant not found." });

    // Fetch all reservations for THEIR restaurant
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('reservation_time', { ascending: true });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 3. Confirm Reservation (Merchant)
exports.confirmReservation = async (req, res) => {
  try {
    const { id } = req.params; // The reservation ID from the URL

    const { data, error } = await supabase
      .from('reservations')
      .update({ status: 'confirmed' })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.status(200).json({ message: "Reservation confirmed successfully!", data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};