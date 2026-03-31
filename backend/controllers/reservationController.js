const supabase = require('../config/supabase');
const { supabaseAdmin } = require('../config/supabase');
exports.createReservation = async (req, res) => {
  try {
    const { restaurant_id, table_id, reservation_date, reservation_time, party_size, special_request } = req.body;
    
    // Validate required fields
    if (!restaurant_id || !table_id || !reservation_date || !reservation_time || !party_size) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log('Creating reservation for user:', req.user.id);
    console.log('Reservation data:', { restaurant_id, table_id, reservation_date, reservation_time, party_size });
    
    const { data, error } = await supabaseAdmin
      .from('reservations')
      .insert([{ 
        customer_id: req.user.id,
        restaurant_id, 
        table_id, 
        reservation_date, 
        reservation_time, 
        party_size,
        special_request,
        status: 'pending'
      }])
      .select();

    if (error) {
      console.error('Database error:', error);
      return res.status(400).json({ error: error.message });
    }
    
    console.log('Reservation created:', data);
    res.status(201).json(data);
  } catch (err) {
    console.error('Reservation creation error:', err);
    res.status(500).json({ error: "Failed to create reservation: " + err.message });
  }
};

// 2. GET MY RESERVATIONS (GET)
exports.getMyReservations = async (req, res) => {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, restaurants(name), tables(table_number)') 
    .eq('customer_id', req.user.id); // Looks for customer_id

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json(data);
};

// 3. GET RESERVATION DETAILS (GET)
exports.getReservationDetails = async (req, res) => {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, restaurants(*), tables(*)')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json(data);
};

// 4. UPDATE RESERVATION STATUS (PATCH)
exports.updateReservationStatus = async (req, res) => {
  const { status } = req.body; 

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .update({ status })
    .eq('id', req.params.id)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json(data);
};

// 5. CANCEL RESERVATION (DELETE)
exports.cancelReservation = async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', req.params.id)
    .eq('customer_id', req.user.id)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json({ message: "Reservation cancelled successfully.", data });
};

// 6. CHECK-IN (POST)
exports.checkIn = async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('reservations')
    .update({ status: 'completed' }) 
    .eq('id', req.params.id)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json({ message: "Check-in successful!", data });
};

// 7. SIMULATE MACHINE CONFIRMATION (POST)
// FOR TESTING ONLY - This would normally come from the machine/IoT device
exports.simulateMachineConfirmation = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { action } = req.body; // 'confirm' or 'reject'

    if (!bookingId) {
      return res.status(400).json({ error: "Booking ID is required" });
    }

    if (!action || !['confirm', 'reject'].includes(action)) {
      return res.status(400).json({ error: "Action must be 'confirm' or 'reject'" });
    }

    const status = action === 'confirm' ? 'confirmed' : 'rejected';

    const { data, error } = await supabaseAdmin
      .from('reservations')
      .update({ status })
      .eq('id', bookingId)
      .select();

    if (error) {
      console.error('Database error:', error);
      return res.status(400).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    console.log(`✓ Machine ${action}ed booking:`, bookingId);
    res.status(200).json({
      message: `Booking ${status} by machine`,
      data: data[0],
    });
  } catch (err) {
    console.error('Machine confirmation error:', err);
    res.status(500).json({ error: "Failed to process machine confirmation: " + err.message });
  }
};