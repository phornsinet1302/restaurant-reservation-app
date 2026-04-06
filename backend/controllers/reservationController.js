const supabase = require('../config/supabase');
const { supabaseAdmin } = require('../config/supabase');

// ==================== HELPER FUNCTION - CREATE NOTIFICATIONS ====================
const createNotification = async (userId, title, message, type = 'booking') => {
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert([{
        user_id: userId,
        title,
        message,
        type,
        is_read: false,
      }])
      .select();
    
    if (error) {
      console.error('⚠️ Failed to create notification:', error.message);
      return null;
    }
    
    console.log(`📢 Notification created for user ${userId}: ${title}`);
    return data[0];
  } catch (err) {
    console.error('⚠️ Notification creation error:', err.message);
    return null;
  }
};

// ==================== HELPER FUNCTION - EMIT WEBSOCKET EVENTS ====================
const emitNotificationEvent = (io, userId, title, message, data = {}) => {
  if (!io) return;
  
  io.to(userId).emit('notification_received', {
    title,
    message,
    type: 'alert',
    timestamp: new Date().toISOString(),
    ...data
  });
  
  console.log(`📡 WebSocket notification sent to ${userId}`);
};

// ==================== HELPER FUNCTION - SEND BOOKING CONFIRMATION EMAIL ====================
const sendBookingConfirmationEmail = async (customerEmail, customerName, restaurantName, reservationDate, reservationTime, partySize, tableNumber = 'TBD', specialRequest = '') => {
  try {
    const sendEmail = require('../utils/emailService');
    
    const specialRequestSection = specialRequest ? `
      <p><strong>Special Request:</strong> ${specialRequest}</p>
    ` : '';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
        <h2 style="color: #D4A574;">Booking Confirmation</h2>
        <p>Hi ${customerName},</p>
        <p>Thank you for your reservation! We're excited to serve you.</p>
        
        <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #D4A574; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Reservation Details</h3>
          <p><strong>Restaurant:</strong> ${restaurantName}</p>
          <p><strong>Date:</strong> ${reservationDate}</p>
          <p><strong>Time:</strong> ${reservationTime}</p>
          <p><strong>Party Size:</strong> ${partySize} guests</p>
          <p><strong>Table:</strong> ${tableNumber}</p>
          ${specialRequestSection}
        </div>
        
        <p>Please arrive 5-10 minutes before your reservation time. If you need to cancel or modify your reservation, please do so at least 24 hours in advance.</p>
        
        <p>If you have any questions, please contact the restaurant directly.</p>
        
        <p>Best regards,<br/>Restaurant Reservation Team</p>
      </div>
    `;
    
    await sendEmail(customerEmail, `Booking Confirmation - ${restaurantName}`, html);
    console.log(`✅ Booking confirmation email sent to ${customerEmail}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send booking confirmation email to ${customerEmail}:`, error.message);
    // Don't fail the entire request if email fails
    return false;
  }
};

// ==================== HELPER FUNCTION - SEND BOOKING CONFIRMED EMAIL ====================
const sendBookingConfirmedEmail = async (customerEmail, customerName, restaurantName, reservationDate, reservationTime, partySize) => {
  try {
    const sendEmail = require('../utils/emailService');
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
        <h2 style="color: #27AE60;">✅ Booking Confirmed!</h2>
        <p>Hi ${customerName},</p>
        <p>Great news! Your reservation has been confirmed by the restaurant.</p>
        
        <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #27AE60; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Reservation Details</h3>
          <p><strong>Restaurant:</strong> ${restaurantName}</p>
          <p><strong>Date:</strong> ${reservationDate}</p>
          <p><strong>Time:</strong> ${reservationTime}</p>
          <p><strong>Party Size:</strong> ${partySize} guests</p>
        </div>
        
        <p>Your table is reserved and ready for you. Please arrive on time for your reservation.</p>
        
        <p>Thank you for choosing us!<br/>Restaurant Reservation Team</p>
      </div>
    `;
    
    await sendEmail(customerEmail, `Booking Confirmed - ${restaurantName}`, html);
    console.log(`✅ Booking confirmed email sent to ${customerEmail}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send booking confirmed email to ${customerEmail}:`, error.message);
    return false;
  }
};

// ==================== HELPER FUNCTION - SEND BOOKING REJECTED EMAIL ====================
const sendBookingRejectedEmail = async (customerEmail, customerName, restaurantName, reservationDate, reservationTime, rejectionReason = '') => {
  try {
    const sendEmail = require('../utils/emailService');
    
    const reasonSection = rejectionReason ? `
      <p><strong>Reason:</strong> ${rejectionReason}</p>
    ` : '';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
        <h2 style="color: #E74C3C;">❌ Booking Rejected</h2>
        <p>Hi ${customerName},</p>
        <p>Unfortunately, your reservation request has been rejected by the restaurant.</p>
        
        <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #E74C3C; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Reservation Details</h3>
          <p><strong>Restaurant:</strong> ${restaurantName}</p>
          <p><strong>Date:</strong> ${reservationDate}</p>
          <p><strong>Time:</strong> ${reservationTime}</p>
          ${reasonSection}
        </div>
        
        <p>You can try booking another date/time or contact the restaurant directly to discuss alternatives.</p>
        
        <p>We regret that this didn't work out. Please try again!<br/>Restaurant Reservation Team</p>
      </div>
    `;
    
    await sendEmail(customerEmail, `Booking Rejected - ${restaurantName}`, html);
    console.log(`✅ Booking rejected email sent to ${customerEmail}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send booking rejected email to ${customerEmail}:`, error.message);
    return false;
  }
};

// ==================== EXISTING EXPORTS ====================
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
    
    // ===== CREATE NOTIFICATIONS FOR CUSTOMER & MERCHANT =====
    const reservationId = data[0]?.id;
    const restaurantId = restaurant_id;
    const customerId = req.user.id;
    
    // Get restaurant info for notification message
    const { data: restaurantDataForNotif } = await supabase
      .from('restaurants')
      .select('name, merchant_id')
      .eq('id', restaurantId)
      .single();
    
    if (restaurantDataForNotif) {
      // Notification for customer
      await createNotification(
        customerId,
        '✅ Booking Created Successfully!',
        `Your reservation at ${restaurantDataForNotif.name} on ${reservation_date} at ${reservation_time} has been recorded. Waiting for confirmation.`,
        'booking_created'
      );
      
      // Notification for merchant
      await createNotification(
        restaurantDataForNotif.merchant_id,
        '📥 New Booking Request',
        `New reservation request for ${party_size} guests at ${reservation_date} ${reservation_time}. Please confirm or reject.`,
        'booking_received'
      );
      
      // 📧 Send confirmation email to customer
      await sendBookingConfirmationEmail(
        customer_email,
        customer_name,
        restaurantDataForNotif.name,
        reservation_date,
        reservation_time,
        party_size,
        'TBD',
        special_request
      );
      
      // Emit WebSocket events
      const io = req.app.get('io');
      if (io) {
        emitNotificationEvent(
          io,
          customerId,
          '✅ Booking Created',
          `Your reservation at ${restaurantDataForNotif.name} is pending confirmation`
        );
        
        emitNotificationEvent(
          io,
          restaurantDataForNotif.merchant_id,
          '📥 New Booking',
          `${party_size} guests on ${reservation_date} at ${reservation_time}`
        );
      }
    }
    
    res.status(201).json(data);
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    res.status(500).json({ error: "Failed to create reservation: " + err.message });
  }
};

// 2A. GET MY RESERVATION STATS (GET - Customer booking dashboard summary)
exports.getMyReservationStats = async (req, res) => {
  try {
    const customer_id = req.user.id;
    console.log(`📊 [getMyReservationStats] Fetching stats for customer: ${customer_id}`);

    // Get all reservations for this customer
    const { data: allReservations, error: fetchError } = await supabase
      .from('reservations')
      .select('id, status')
      .eq('customer_id', customer_id);

    if (fetchError) {
      console.error('❌ Error fetching reservations:', fetchError.message);
      return res.status(400).json({ error: fetchError.message });
    }

    // Count by status
    const stats = {
      pending: 0,
      confirmed: 0,
      arrived: 0,
      completed: 0,
      rejected: 0,
      cancelled: 0
    };

    allReservations?.forEach(res => {
      if (res.status === 'pending') stats.pending++;
      else if (res.status === 'confirmed') stats.confirmed++;
      else if (res.status === 'arrived') stats.arrived++;
      else if (res.status === 'completed') stats.completed++;
      else if (res.status === 'rejected') stats.rejected++;
      else if (res.status === 'cancelled') stats.cancelled++;
    });

    console.log(`📈 Booking stats:`, stats);

    res.status(200).json(stats);
  } catch (error) {
    console.error('❌ Error in getMyReservationStats:', error.message);
    res.status(400).json({ error: error.message });
  }
};

// 2. GET MY RESERVATIONS (GET)
exports.getMyReservations = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .select('*, restaurants(name, image_url), tables(table_number)') 
      .eq('customer_id', req.user.id);

    if (error) return res.status(400).json({ error: error.message });
    
    // Debug logging
    console.log('📋 [getMyReservations] Retrieved reservations for customer:', req.user.id);
    if (data && data.length > 0) {
      console.log(`   Found ${data.length} reservations`);
      data.forEach((booking, idx) => {
        console.log(`   Booking ${idx + 1}:`);
        console.log(`     - Restaurant:`, booking.restaurants?.name);
        console.log(`     - Image URL:`, booking.restaurants?.image_url);
      });
    }
    
    res.status(200).json(data);
  } catch (err) {
    console.error('❌ Error in getMyReservations:', err.message);
    res.status(400).json({ error: err.message });
  }
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
  try {
    const reservationId = req.params.id;
    const customerId = req.user.id;

    // Get reservation details first to get restaurant_id
    const { data: reservation, error: fetchError } = await supabaseAdmin
      .from('reservations')
      .select('id, restaurant_id, customer_id')
      .eq('id', reservationId)
      .single();

    if (fetchError || !reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Verify customer owns this reservation
    if (reservation.customer_id !== customerId) {
      return res.status(403).json({ error: 'You can only cancel your own bookings' });
    }

    // Cancel the reservation
    const { data, error } = await supabaseAdmin
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', reservationId)
      .select();

    if (error) return res.status(400).json({ error: error.message });

    // Get restaurant and merchant info for notifications
    const { data: restaurantCancelInfo } = await supabase
      .from('restaurants')
      .select('name, merchant_id')
      .eq('id', reservation.restaurant_id)
      .single();

    // Create notifications
    if (restaurantCancelInfo) {
      // Notification for customer
      await createNotification(
        customerId,
        '❌ Booking Cancelled',
        `Your reservation at ${restaurantCancelInfo.name} has been cancelled.`,
        'booking_cancelled'
      );
      
      // Notification for merchant
      await createNotification(
        restaurantCancelInfo.merchant_id,
        '🚫 Booking Cancelled',
        `A customer has cancelled their reservation. The table is now available.`,
        'booking_cancelled'
      );
    }

    // Emit WebSocket events to notify both customer and merchant
    const io = req.app.get('io');
    if (io && reservation && restaurantCancelInfo) {
      const merchantId = restaurantCancelInfo.merchant_id;
      
      // Notify merchant of cancellation
      emitNotificationEvent(
        io,
        merchantId,
        '🚫 Booking Cancelled',
        `A customer cancelled their reservation. Table now available.`,
        { status: 'cancelled', reservation_id: reservationId, action: 'cancelled_by_customer' }
      );
      
      // Notify customer of cancellation
      emitNotificationEvent(
        io,
        customerId,
        '❌ Booking Cancelled',
        `Your reservation at ${restaurantCancelInfo.name} has been cancelled.`,
        { status: 'cancelled', reservation_id: reservationId }
      );
      
      console.log('📡 WebSocket events sent for customer cancellation');
    }

    res.status(200).json({ message: "Reservation cancelled successfully.", data });
  } catch (err) {
    console.error('❌ Error cancelling reservation:', err.message);
    res.status(500).json({ error: 'Failed to cancel reservation: ' + err.message });
  }
};

// 5b. UPDATE RESERVATION DETAILS (PATCH - Customer updates booking details)
exports.updateReservationDetails = async (req, res) => {
  try {
    const { id: reservationId } = req.params;
    const customerId = req.user.id;

    console.log('✏️ [updateReservationDetails] Reservation ID:', reservationId, 'Customer ID:', customerId);

    // Validate input
    const { table_id, reservation_date, reservation_time, party_size, special_request } = req.body;

    if (!table_id || !reservation_date || !reservation_time || !party_size) {
      return res.status(400).json({ error: 'Missing required fields: table_id, reservation_date, reservation_time, party_size' });
    }

    // Get existing reservation to verify it belongs to the customer
    const { data: existingReservation, error: fetchError } = await supabaseAdmin
      .from('reservations')
      .select('id, customer_id, restaurant_id, status, table_id')
      .eq('id', reservationId)
      .single();

    if (fetchError || !existingReservation) {
      console.log('❌ Reservation not found');
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Verify customer owns this reservation
    if (existingReservation.customer_id !== customerId) {
      console.log('❌ Customer does not own this reservation');
      return res.status(403).json({ error: 'You can only modify your own bookings' });
    }

    // Only allow modification for pending or confirmed status
    if (!['pending', 'confirmed'].includes(existingReservation.status)) {
      console.log('❌ Cannot modify reservation with status:', existingReservation.status);
      return res.status(400).json({ error: 'Can only modify pending or confirmed bookings' });
    }

    // Update the reservation
    const { data: updatedData, error: updateError } = await supabaseAdmin
      .from('reservations')
      .update({
        table_id,
        reservation_date,
        reservation_time,
        party_size,
        special_request: special_request || null,
      })
      .eq('id', reservationId)
      .select();

    if (updateError) {
      console.log('❌ Update error:', updateError.message);
      return res.status(400).json({ error: updateError.message });
    }

    console.log('✅ Reservation updated successfully');
    
    // Get restaurant and merchant info for notifications
    const { data: restaurantModifyInfo } = await supabase
      .from('restaurants')
      .select('name, merchant_id')
      .eq('id', existingReservation.restaurant_id)
      .single();
    
    const restaurantName = restaurantModifyInfo?.name || 'Restaurant';
    const merchantId = restaurantModifyInfo?.merchant_id;
    
    // Create notifications for customer and merchant
    await createNotification(
      customerId,
      '✏️ Booking Modified',
      `Your reservation at ${restaurantName} has been updated to ${reservation_date} at ${reservation_time} for ${party_size} guests.`,
      'booking_modified'
    );
    
    if (merchantId) {
      await createNotification(
        merchantId,
        '✏️ Booking Modified',
        `A customer modified their reservation for ${party_size} guests on ${reservation_date} at ${reservation_time}.`,
        'booking_modified'
      );
    }
    
    // Emit WebSocket events to notify both customer and merchant
    const io = req.app.get('io');
    if (io && existingReservation && restaurantModifyInfo) {
      const merchantId = restaurantModifyInfo.merchant_id;
      
      // Notify merchant of modification
      emitNotificationEvent(
        io,
        merchantId,
        '✏️ Booking Modified',
        `A customer modified their reservation for ${party_size} guests on ${reservation_date} at ${reservation_time}.`,
        { status: updatedData[0]?.status, reservation_id: reservationId, action: 'modified', newDate: reservation_date, newTime: reservation_time }
      );
      
      // Notify customer of modification
      emitNotificationEvent(
        io,
        customerId,
        '✏️ Booking Modified',
        `Your reservation at ${restaurantName} has been updated to ${reservation_date} at ${reservation_time} for ${party_size} guests.`,
        { status: updatedData[0]?.status, reservation_id: reservationId, action: 'modified', newDate: reservation_date, newTime: reservation_time, newGuests: party_size }
      );
      
      console.log('📡 WebSocket events sent for booking modification');
    }
    
    res.status(200).json(updatedData);
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    res.status(500).json({ error: 'Failed to update reservation: ' + err.message });
  }
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

// ===== MERCHANT ENDPOINTS =====

// 8. GET MERCHANT'S PENDING RESERVATIONS (GET)
exports.getMerchantPendingReservations = async (req, res) => {
  try {
    const merchantId = req.user.id;

    console.log('📋 [getMerchantPendingReservations] Merchant ID:', merchantId);

    // Get merchant's restaurant
    const { data: restaurantData, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .eq('merchant_id', merchantId)
      .single();

    if (restaurantError || !restaurantData) {
      console.log('❌ Restaurant not found for merchant');
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const restaurantId = restaurantData.id;

    // Get all reservations for this restaurant
    const { data, error } = await supabaseAdmin
      .from('reservations')
      .select('*, tables(table_number)')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('❌ Query error:', error.message);
      return res.status(400).json({ error: error.message });
    }

    console.log(`✅ Found ${data.length} reservations`);
    res.status(200).json(data);
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    res.status(500).json({ error: "Failed to fetch reservations: " + err.message });
  }
};

// 9. MERCHANT CONFIRMS RESERVATION (PATCH)
// When confirmed, the table is locked (set to occupied)
exports.merchantConfirmReservation = async (req, res) => {
  try {
    const { id: reservationId } = req.params;
    const merchantId = req.user.id;

    console.log('✅ [merchantConfirmReservation] Reservation ID:', reservationId, 'Merchant ID:', merchantId);

    // Get reservation first (with table_id)
    const { data: reservationData, error: reservationError } = await supabaseAdmin
      .from('reservations')
      .select('id, restaurant_id, status, table_id, customer_id, customer_email, customer_name, party_size, reservation_date, reservation_time')
      .eq('id', reservationId)
      .single();

    if (reservationError || !reservationData) {
      console.log('❌ Reservation not found');
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Check if merchant owns the restaurant
    const { data: restaurantData, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id, merchant_id')
      .eq('id', reservationData.restaurant_id)
      .single();

    if (restaurantError || !restaurantData) {
      console.log('❌ Restaurant not found');
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    if (restaurantData.merchant_id !== merchantId) {
      console.log('❌ Unauthorized - merchant does not own this restaurant');
      return res.status(403).json({ error: 'You do not have permission to confirm this reservation' });
    }

    // Update reservation status to confirmed
    const { data, error } = await supabaseAdmin
      .from('reservations')
      .update({
        status: 'confirmed',
        merchant_confirmed_at: new Date().toISOString()
      })
      .eq('id', reservationId)
      .select();

    if (error) {
      console.log('❌ Database error:', error.message);
      return res.status(400).json({ error: error.message });
    }

    // Lock the table by setting status to occupied
    if (reservationData.table_id) {
      console.log('   🔒 Locking table:', reservationData.table_id);
      const { error: tableError } = await supabaseAdmin
        .from('tables')
        .update({ status: 'occupied' })
        .eq('id', reservationData.table_id);

      if (tableError) {
        console.log('   ⚠️  Warning: Table could not be locked:', tableError.message);
        // Don't fail the whole request if table update fails
      } else {
        console.log('   ✅ Table locked successfully');
      }
    }

    console.log('✅ Reservation confirmed successfully');
    
    // Get restaurant name for notification
    const { data: restaurantConfirmInfo } = await supabase
      .from('restaurants')
      .select('name')
      .eq('id', reservationData.restaurant_id)
      .single();
    
    const restaurantName = restaurantConfirmInfo?.name || 'Restaurant';
    
    // Create notifications for merchant and customer
    await createNotification(
      merchantId,
      '✅ Booking Confirmed',
      `You confirmed a reservation for ${reservationData.party_size} guests on ${reservationData.reservation_date} at ${reservationData.reservation_time}.`,
      'booking_confirmed'
    );
    
    await createNotification(
      reservationData.customer_id,
      '✅ Booking Confirmed!',
      `Your reservation at ${restaurantName} on ${reservationData.reservation_date} at ${reservationData.reservation_time} has been confirmed!`,
      'booking_confirmed'
    );
    
    // 📧 Send confirmation email to customer
    if (reservationData.customer_email) {
      await sendBookingConfirmedEmail(
        reservationData.customer_email,
        reservationData.customer_name || 'Valued Guest',
        restaurantName,
        reservationData.reservation_date,
        reservationData.reservation_time,
        reservationData.party_size
      );
    }
    
    // Emit WebSocket event to notify merchant AND customer in real-time
    const io = req.app.get('io');
    if (io && reservationData) {
      const restaurantId = reservationData.restaurant_id;
      const customerId = reservationData.customer_id;
      
      // Notify merchant
      io.to(restaurantId).emit('reservation_updated', {
        id: reservationId,
        status: 'confirmed',
        action: 'confirmed',
        message: 'A booking has been confirmed'
      });
      console.log('📡 WebSocket event sent to restaurant:', restaurantId);
      
      // Notify customer
      io.to(customerId).emit('booking_confirmed', {
        id: reservationId,
        status: 'confirmed',
        action: 'confirmed',
        message: '✅ Your booking has been confirmed by the restaurant!'
      });
      console.log('📡 WebSocket event sent to customer:', customerId);
      
      // 📢 Broadcast table status change in REAL-TIME to all clients
      io.emit('table_status_updated', {
        table_id: reservationData.table_id,
        status: 'occupied',
        restaurant_id: reservationData.restaurant_id,
        timestamp: new Date().toISOString(),
        reservation_id: reservationId
      });
      console.log('📡 Broadcasted table_status_updated event for table:', reservationData.table_id);
    }
    
    res.status(200).json({ message: 'Reservation confirmed', data: data[0] });
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    res.status(500).json({ error: "Failed to confirm reservation: " + err.message });
  }
};

// 10. MERCHANT REJECTS RESERVATION (PATCH)
exports.merchantRejectReservation = async (req, res) => {
  try {
    const { id: reservationId } = req.params;
    const { reason } = req.body;
    const merchantId = req.user.id;

    console.log('❌ [merchantRejectReservation] Reservation ID:', reservationId, 'Reason:', reason);

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    // Get reservation first
    const { data: reservationData, error: reservationError } = await supabaseAdmin
      .from('reservations')
      .select('id, restaurant_id, status, customer_id, customer_email, customer_name, reservation_date, reservation_time, table_id')
      .eq('id', reservationId)
      .single();

    if (reservationError || !reservationData) {
      console.log('❌ Reservation not found');
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Check if merchant owns the restaurant
    const { data: restaurantData, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id, merchant_id')
      .eq('id', reservationData.restaurant_id)
      .single();

    if (restaurantError || !restaurantData) {
      console.log('❌ Restaurant not found');
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    if (restaurantData.merchant_id !== merchantId) {
      console.log('❌ Unauthorized - merchant does not own this restaurant');
      return res.status(403).json({ error: 'You do not have permission to reject this reservation' });
    }

    // Update reservation status to rejected
    const { data, error } = await supabaseAdmin
      .from('reservations')
      .update({
        status: 'rejected',
        rejection_reason: reason.trim(),
        merchant_rejected_at: new Date().toISOString()
      })
      .eq('id', reservationId)
      .select();

    if (error) {
      console.log('❌ Database error:', error.message);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ Reservation rejected successfully');
    
    // Release table back to available status
    if (reservationData.table_id) {
      console.log('   🔓 Releasing table:', reservationData.table_id);
      const { error: tableError } = await supabaseAdmin
        .from('tables')
        .update({ status: 'available' })
        .eq('id', reservationData.table_id);

      if (tableError) {
        console.log('   ⚠️  Warning: Table could not be released:', tableError.message);
      } else {
        console.log('   ✅ Table released successfully');
      }
    }
    
    // Get restaurant name for notification
    const { data: restaurantRejectInfo } = await supabase
      .from('restaurants')
      .select('name')
      .eq('id', reservationData.restaurant_id)
      .single();
    
    const restaurantName = restaurantRejectInfo?.name || 'Restaurant';
    
    // Create notifications for merchant and customer
    await createNotification(
      merchantId,
      '❌ Booking Rejected',
      `You rejected a reservation. Reason: ${reason.trim()}`,
      'booking_rejected'
    );
    
    await createNotification(
      reservationData.customer_id,
      '❌ Booking Rejected',
      `Your reservation at ${restaurantName} has been rejected. Reason: ${reason.trim()}`,
      'booking_rejected'
    );
    
    // 📧 Send rejection email to customer
    if (reservationData.customer_email) {
      await sendBookingRejectedEmail(
        reservationData.customer_email,
        reservationData.customer_name || 'Valued Guest',
        restaurantName,
        reservationData.reservation_date,
        reservationData.reservation_time,
        reason.trim()
      );
    }
    
    // Emit WebSocket event to notify merchant AND customer in real-time
    const io = req.app.get('io');
    if (io && reservationData) {
      const restaurantId = reservationData.restaurant_id;
      const customerId = reservationData.customer_id;
      
      io.to(restaurantId).emit('reservation_updated', {
        id: reservationId,
        status: 'rejected',
        action: 'rejected',
        message: 'Your booking has been rejected'
      });
      
      // Notify customer
      io.to(customerId).emit('booking_rejected', {
        id: reservationId,
        status: 'rejected',
        action: 'rejected',
        message: '❌ Your booking has been rejected by the restaurant',
        reason: reason.trim()
      });
      console.log('📡 WebSocket event sent for rejection - merchant and customer');
      
      // 📢 Broadcast table status change in REAL-TIME
      io.emit('table_status_updated', {
        table_id: reservationData.table_id,
        status: 'available',
        restaurant_id: reservationData.restaurant_id,
        timestamp: new Date().toISOString(),
        reservation_id: reservationId,
        reason: 'booking_rejected'
      });
      console.log('📡 Broadcasted table_status_updated event for table:', reservationData.table_id);
    }
    
    res.status(200).json({ message: 'Reservation rejected', data: data[0] });
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    res.status(500).json({ error: "Failed to reject reservation: " + err.message });
  }
};

// 11. MERCHANT CANCELS RESERVATION (PATCH)
exports.merchantCancelReservation = async (req, res) => {
  try {
    const { id: reservationId } = req.params;
    const { reason } = req.body;
    const merchantId = req.user.id;

    console.log('🚫 [merchantCancelReservation] Reservation ID:', reservationId, 'Reason:', reason);

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Cancellation reason is required' });
    }

    // Get reservation first
    const { data: reservationData, error: reservationError } = await supabaseAdmin
      .from('reservations')
      .select('id, restaurant_id, status')
      .eq('id', reservationId)
      .single();

    if (reservationError || !reservationData) {
      console.log('❌ Reservation not found');
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Check if merchant owns the restaurant
    const { data: restaurantData, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id, merchant_id')
      .eq('id', reservationData.restaurant_id)
      .single();

    if (restaurantError || !restaurantData) {
      console.log('❌ Restaurant not found');
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    if (restaurantData.merchant_id !== merchantId) {
      console.log('❌ Unauthorized - merchant does not own this restaurant');
      return res.status(403).json({ error: 'You do not have permission to cancel this reservation' });
    }

    // Update reservation status to cancelled
    const { data, error } = await supabaseAdmin
      .from('reservations')
      .update({
        status: 'cancelled',
        cancellation_reason: reason.trim()
      })
      .eq('id', reservationId)
      .select();

    if (error) {
      console.log('❌ Database error:', error.message);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ Reservation cancelled successfully');
    
    // Emit WebSocket event to notify about cancellation
    const io = req.app.get('io');
    if (io && reservationData) {
      const restaurantId = reservationData.restaurant_id;
      io.to(restaurantId).emit('reservation_updated', {
        id: reservationId,
        status: 'cancelled',
        action: 'cancelled',
        message: 'A booking has been cancelled'
      });
      console.log('📡 WebSocket event sent for cancellation');
    }
    
    res.status(200).json({ message: 'Reservation cancelled', data: data[0] });
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    res.status(500).json({ error: "Failed to cancel reservation: " + err.message });
  }
};

// 12. MERCHANT MARKS GUEST ARRIVED (PATCH)
// Called by merchant when guest arrives at restaurant
exports.customerMarkArrived = async (req, res) => {
  try {
    const { id: reservationId } = req.params;
    const userId = req.user.id;

    console.log('🚗 [markArrived] Reservation ID:', reservationId, 'User ID:', userId);

    // Get reservation with restaurant info
    const { data: reservationData, error: reservationError } = await supabaseAdmin
      .from('reservations')
      .select('id, restaurant_id, status, table_id')
      .eq('id', reservationId)
      .single();

    if (reservationError || !reservationData) {
      console.log('❌ Reservation not found');
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Verify merchant owns the restaurant
    const { data: restaurantData, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id, merchant_id')
      .eq('id', reservationData.restaurant_id)
      .single();

    if (restaurantError || !restaurantData) {
      console.log('❌ Restaurant not found');
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    if (restaurantData.merchant_id !== userId) {
      console.log('❌ Unauthorized - user does not own this restaurant');
      return res.status(403).json({ error: 'You do not have permission to update this reservation' });
    }

    if (reservationData.status !== 'confirmed') {
      console.log('❌ Reservation must be confirmed before marking as arrived');
      return res.status(400).json({ error: 'Reservation must be confirmed first' });
    }

    // Update reservation status to arrived
    const { data, error } = await supabaseAdmin
      .from('reservations')
      .update({
        status: 'arrived'
      })
      .eq('id', reservationId)
      .select();

    if (error) {
      console.log('❌ Database error:', error.message);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ Reservation marked as arrived');
    res.status(200).json({ message: 'Reservation marked as arrived', data: data[0] });
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    res.status(500).json({ error: "Failed to mark reservation as arrived: " + err.message });
  }
};

// 13. MERCHANT MARKS GUEST COMPLETED (PATCH)
// When this is called, the table becomes available again
exports.customerMarkCompleted = async (req, res) => {
  try {
    const { id: reservationId } = req.params;
    const userId = req.user.id;

    console.log('✅ [markCompleted] Reservation ID:', reservationId, 'User ID:', userId);

    // Get reservation with restaurant info
    const { data: reservationData, error: reservationError } = await supabaseAdmin
      .from('reservations')
      .select('id, restaurant_id, status, table_id')
      .eq('id', reservationId)
      .single();

    if (reservationError || !reservationData) {
      console.log('❌ Reservation not found');
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Verify merchant owns the restaurant
    const { data: restaurantData, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id, merchant_id')
      .eq('id', reservationData.restaurant_id)
      .single();

    if (restaurantError || !restaurantData) {
      console.log('❌ Restaurant not found');
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    if (restaurantData.merchant_id !== userId) {
      console.log('❌ Unauthorized - user does not own this restaurant');
      return res.status(403).json({ error: 'You do not have permission to update this reservation' });
    }

    if (reservationData.status !== 'arrived') {
      console.log('❌ Reservation must be marked as arrived before completing');
      return res.status(400).json({ error: 'Reservation must be marked as arrived first' });
    }

    // Update reservation status to completed
    const { data, error } = await supabaseAdmin
      .from('reservations')
      .update({
        status: 'completed'
      })
      .eq('id', reservationId)
      .select();

    if (error) {
      console.log('❌ Database error:', error.message);
      return res.status(400).json({ error: error.message });
    }

    // Release the table back to available status
    if (reservationData.table_id) {
      console.log('   🔓 Releasing table:', reservationData.table_id);
      const { error: tableError } = await supabaseAdmin
        .from('tables')
        .update({ status: 'available' })
        .eq('id', reservationData.table_id);

      if (tableError) {
        console.log('   ⚠️  Warning: Table status could not be updated:', tableError.message);
        // Don't fail the request if table update fails
      } else {
        console.log('   ✅ Table released to available');
      }
    }

    console.log('✅ Reservation completed successfully');
    
    // Emit WebSocket event to notify about completion
    const io = req.app.get('io');
    if (io && reservationData) {
      const restaurantId = reservationData.restaurant_id;
      io.to(restaurantId).emit('reservation_updated', {
        id: reservationId,
        status: 'completed',
        action: 'completed',
        message: 'A booking has been marked as completed'
      });
      console.log('📡 WebSocket event sent for completion');
    }
    
    res.status(200).json({ message: 'Reservation completed', data: data[0] });
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    res.status(500).json({ error: "Failed to mark reservation as completed: " + err.message });
  }
};

// 14. MERCHANT MARKS GUEST AS ARRIVED (PATCH)
exports.merchantMarkArrived = async (req, res) => {
  try {
    const { id: reservationId } = req.params;
    const merchantId = req.user.id;

    console.log('🚗 [merchantMarkArrived] Reservation ID:', reservationId, 'Merchant ID:', merchantId);

    // Get reservation first
    const { data: reservationData, error: reservationError } = await supabaseAdmin
      .from('reservations')
      .select('id, restaurant_id, status, table_id')
      .eq('id', reservationId)
      .single();

    if (reservationError || !reservationData) {
      console.log('❌ Reservation not found');
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Check if merchant owns the restaurant
    const { data: restaurantData, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id, merchant_id')
      .eq('id', reservationData.restaurant_id)
      .single();

    if (restaurantError || !restaurantData) {
      console.log('❌ Restaurant not found');
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    if (restaurantData.merchant_id !== merchantId) {
      console.log('❌ Unauthorized - merchant does not own this restaurant');
      return res.status(403).json({ error: 'You do not have permission to mark this reservation as arrived' });
    }

    if (reservationData.status !== 'confirmed') {
      console.log('❌ Reservation must be confirmed before marking as arrived');
      return res.status(400).json({ error: 'Reservation must be confirmed first' });
    }

    // Update reservation status to arrived
    const { data, error } = await supabaseAdmin
      .from('reservations')
      .update({
        status: 'arrived'
      })
      .eq('id', reservationId)
      .select();

    if (error) {
      console.log('❌ Database error:', error.message);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ Reservation marked as arrived');
    
    // Emit WebSocket event to notify about arrival
    const io = req.app.get('io');
    if (io && reservationData) {
      const restaurantId = reservationData.restaurant_id;
      io.to(restaurantId).emit('reservation_updated', {
        id: reservationId,
        status: 'arrived',
        action: 'arrived',
        message: 'Guest has arrived'
      });
      console.log('📡 WebSocket event sent for guest arrival');
    }
    
    res.status(200).json({ message: 'Reservation marked as arrived', data: data[0] });
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    res.status(500).json({ error: "Failed to mark reservation as arrived: " + err.message });
  }
};

// 15. MERCHANT MARKS GUEST AS COMPLETED (PATCH)
// When this is called, the table becomes available again
exports.merchantMarkCompleted = async (req, res) => {
  try {
    const { id: reservationId } = req.params;
    const merchantId = req.user.id;

    console.log('✅ [merchantMarkCompleted] Reservation ID:', reservationId, 'Merchant ID:', merchantId);

    // Get reservation first
    const { data: reservationData, error: reservationError } = await supabaseAdmin
      .from('reservations')
      .select('id, restaurant_id, status, table_id')
      .eq('id', reservationId)
      .single();

    if (reservationError || !reservationData) {
      console.log('❌ Reservation not found');
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Check if merchant owns the restaurant
    const { data: restaurantData, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id, merchant_id')
      .eq('id', reservationData.restaurant_id)
      .single();

    if (restaurantError || !restaurantData) {
      console.log('❌ Restaurant not found');
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    if (restaurantData.merchant_id !== merchantId) {
      console.log('❌ Unauthorized - merchant does not own this restaurant');
      return res.status(403).json({ error: 'You do not have permission to mark this reservation as completed' });
    }

    if (reservationData.status !== 'arrived') {
      console.log('❌ Reservation must be marked as arrived before completing');
      return res.status(400).json({ error: 'Reservation must be marked as arrived first' });
    }

    // Update reservation status to completed
    const { data, error } = await supabaseAdmin
      .from('reservations')
      .update({
        status: 'completed'
      })
      .eq('id', reservationId)
      .select();

    if (error) {
      console.log('❌ Database error:', error.message);
      return res.status(400).json({ error: error.message });
    }

    // Release the table back to available status
    if (reservationData.table_id) {
      console.log('   🔓 Releasing table:', reservationData.table_id);
      const { error: tableError } = await supabaseAdmin
        .from('tables')
        .update({ status: 'available' })
        .eq('id', reservationData.table_id);

      if (tableError) {
        console.log('   ⚠️  Warning: Table status could not be updated:', tableError.message);
        // Don't fail the request if table update fails
      } else {
        console.log('   ✅ Table released to available');
      }
    }

    // Fetch customer ID for notification
    const { data: reservationDetailData } = await supabaseAdmin
      .from('reservations')
      .select('customer_id')
      .eq('id', reservationId)
      .single();

    if (reservationDetailData) {
      const customerId = reservationDetailData.customer_id;
      
      // Fetch restaurant name for notification message
      const { data: restaurantCompletedData } = await supabaseAdmin
        .from('restaurants')
        .select('name')
        .eq('id', reservationData.restaurant_id)
        .single();

      const restaurantName = restaurantCompletedData?.name || 'Restaurant';

      // Create notification for customer
      await createNotification(
        customerId,
        '✅ Booking Completed',
        `Your booking at ${restaurantName} has been marked as completed.`,
        'booking_completed'
      );

      // Create notification for merchant
      await createNotification(
        merchantId,
        '✅ Booking Completed',
        `You have marked the booking as completed.`,
        'booking_completed'
      );

      // Get IO instance from app
      const io = req.app.get('io');
      if (io) {
        // Emit to customer
        emitNotificationEvent(
          io,
          customerId,
          '✅ Booking Completed',
          `Your booking at ${restaurantName} has been marked as completed.`,
          {
            type: 'booking_completed',
            reservationId: reservationId,
            restaurantName: restaurantName
          }
        );

        // Emit to merchant (via restaurant room)
        io.to(`restaurant_${reservationData.restaurant_id}`).emit('reservation_updated', {
          type: 'booking_completed',
          reservationId: reservationId,
          message: 'Booking marked as completed'
        });
      }
    }

    console.log('✅ Reservation completed successfully');
    res.status(200).json({ message: 'Reservation completed', data: data[0] });
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    res.status(500).json({ error: "Failed to mark reservation as completed: " + err.message });
  }
};