const supabase = require('../config/supabase');

// 1. CREATE RESERVATION (POST)
exports.createReservation = async (req, res) => {
  const { restaurant_id, table_id, reservation_date, reservation_time, party_size, special_request } = req.body;
  
  const { data, error } = await supabase
    .from('reservations')
    .insert([{ 
      customer_id: req.user.id, // Maps the logged-in user to customer_id
      restaurant_id, 
      table_id, 
      reservation_date, 
      reservation_time, 
      party_size,               // Uses party_size
      special_request,
      status: 'pending'
    }])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
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

  const { data, error } = await supabase
    .from('reservations')
    .update({ status })
    .eq('id', req.params.id)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json(data);
};

// 5. CANCEL RESERVATION (DELETE)
exports.cancelReservation = async (req, res) => {
  const { data, error } = await supabase
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', req.params.id)
    .eq('customer_id', req.user.id) // Ensures you can only cancel YOUR reservation
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json({ message: "Reservation cancelled successfully.", data });
};

// 6. CHECK-IN (POST)
exports.checkIn = async (req, res) => {
  const { data, error } = await supabase
    .from('reservations')
    .update({ status: 'completed' }) 
    .eq('id', req.params.id)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json({ message: "Check-in successful!", data });
};