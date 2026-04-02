const supabase = require('../config/supabase');
const { supabaseAdmin } = require('../config/supabase');
exports.createReservation = async (req, res) => {
  try {
    const { restaurant_id, table_id, reservation_date, reservation_time, party_size, special_request, customer_name, customer_email } = req.body;
    
    console.log('📋 [createReservation] Incoming request:');
    console.log('   Customer ID:', req.user.id);
    console.log('   Restaurant ID:', restaurant_id);
    console.log('   Table ID:', table_id);
    console.log('   Date:', reservation_date);
    console.log('   Time:', reservation_time);
    console.log('   Party Size:', party_size);
    console.log('   Customer Name:', customer_name);
    console.log('   Customer Email:', customer_email);
    
    // ===== COMPREHENSIVE VALIDATION =====
    const errors = [];
    
    // Required fields
    if (!restaurant_id) errors.push('restaurant_id is required');
    if (!table_id) errors.push('table_id is required');
    if (!reservation_date) errors.push('reservation_date is required');
    if (!reservation_time) errors.push('reservation_time is required');
    if (!party_size) errors.push('party_size is required');
    
    // Customer info fields
    if (!customer_name || !customer_name.trim()) errors.push('customer_name is required');
    if (!customer_email || !customer_email.trim()) errors.push('customer_email is required');
    
    // Validate email format
    if (customer_email && customer_email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customer_email.trim())) {
        errors.push('customer_email must be a valid email address');
      }
    }
    
    // Validate party size
    if (party_size && (party_size < 1 || party_size > 100)) {
      errors.push('party_size must be between 1 and 100');
    }
    
    // Validate date format (YYYY-MM-DD)
    if (reservation_date && !/^\d{4}-\d{2}-\d{2}$/.test(reservation_date)) {
      errors.push('reservation_date must be in YYYY-MM-DD format');
    }
    
    // Validate time format (HH:MM or HH:MM:SS)
    if (reservation_time && !/^\d{2}:\d{2}(:\d{2})?$/.test(reservation_time)) {
      errors.push('reservation_time must be in HH:MM or HH:MM:SS format');
    }
    
    if (errors.length > 0) {
      console.log('❌ Validation errors:');
      errors.forEach(e => console.log('   -', e));
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors 
      });
    }
    
    console.log('✅ All validations passed');

    // Verify restaurant exists
    console.log('   🔍 Verifying restaurant exists...');
    const { data: restaurantData, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .eq('id', restaurant_id)
      .single();
    
    if (restaurantError || !restaurantData) {
      console.log('   ❌ Restaurant not found:', restaurantError?.message);
      return res.status(400).json({ error: 'Restaurant not found' });
    }
    console.log('   ✅ Restaurant verified');

    // Verify table exists and belongs to restaurant
    console.log('   🔍 Verifying table exists and belongs to restaurant...');
    const { data: tableData, error: tableError } = await supabaseAdmin
      .from('tables')
      .select('id, restaurant_id, capacity, status')
      .eq('id', table_id)
      .eq('restaurant_id', restaurant_id)
      .single();
    
    if (tableError || !tableData) {
      console.log('   ❌ Table not found or does not belong to restaurant:', tableError?.message);
      return res.status(400).json({ error: 'Table not found for this restaurant' });
    }
    
    if (tableData.status !== 'available') {
      console.log('   ❌ Table is not available. Status:', tableData.status);
      return res.status(409).json({ error: `Table is not available (status: ${tableData.status})` });
    }
    
    if (tableData.capacity < party_size) {
      console.log(`   ⚠️ Party size (${party_size}) exceeds table capacity (${tableData.capacity})`);
      return res.status(400).json({ error: `Party size exceeds table capacity (${tableData.capacity} seats)` });
    }
    console.log('   ✅ Table verified and has sufficient capacity');

    console.log('   📝 Creating reservation record...');
    
    // First, ensure customer exists in users table
    console.log('   🔍 Verifying customer exists in users table...');
    const { data: customerData, error: customerCheckError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('id', req.user.id)
      .single();
    
    if (customerCheckError || !customerData) {
      console.log('   ⚠️ Customer not found in users table, creating...');
      
      // Auto-create user in users table
      const { data: newUser, error: createUserError } = await supabaseAdmin
        .from('users')
        .insert([{
          id: req.user.id,
          email: req.user.email,
          role: 'customer',
          full_name: customer_name || null,
          created_at: new Date().toISOString()
        }])
        .select();
      
      if (createUserError) {
        console.log('   ❌ Failed to create user:', createUserError.message);
        return res.status(500).json({ 
          error: 'Failed to create user record. Please contact support.',
          details: createUserError.message
        });
      }
      console.log('   ✅ User created successfully');
    } else {
      console.log('   ✅ Customer verified in users table');
    }

    // Now create the reservation
    const reservationData = { 
      customer_id: req.user.id,
      restaurant_id, 
      table_id, 
      reservation_date, 
      reservation_time, 
      party_size,
      status: 'pending'
    };
    
    // Add special request if provided
    if (special_request && special_request.trim()) {
      reservationData.special_request = special_request.trim();
    }
    
    // Add customer info
    if (customer_name && customer_name.trim()) {
      reservationData.customer_name = customer_name.trim();
    }
    if (customer_email && customer_email.trim()) {
      reservationData.customer_email = customer_email.trim();
    }
    
    const { data, error } = await supabaseAdmin
      .from('reservations')
      .insert([reservationData])
      .select();

    if (error) {
      console.error('   ❌ Database error:', error.message);
      // If error mentions customer_name or customer_email columns don't exist,
      // provide helpful message
      if (error.message.includes('customer_name') || error.message.includes('customer_email')) {
        console.error('   ⚠️ Migration not applied yet. Please apply migration 023 to the database.');
        return res.status(500).json({ 
          error: 'Database schema not updated. Please contact administrator.',
          details: 'Migration 023_add_customer_info_to_reservations.sql needs to be applied'
        });
      }
      return res.status(400).json({ error: error.message });
    }
    
    console.log('   ✅ Reservation created successfully!');
    console.log('   Reservation ID:', data[0]?.id);
    
    res.status(201).json(data);
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
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