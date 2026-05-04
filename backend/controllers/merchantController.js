const supabase = require('../config/supabase');
const { supabaseAdmin } = require('../config/supabase');
const sendEmail = require('../utils/emailService');

// ==================== HELPER FUNCTION - CREATE NOTIFICATIONS ====================
const createNotification = async (userId, title, message, type = 'booking', relatedId = null) => {
  try {
    const row = {
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
    };
    if (relatedId) row.related_id = relatedId;

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert([row])
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

// ==================== HELPER FUNCTION - AUTO-REJECT CONFLICTING BOOKINGS ====================
const autoRejectConflictingBookings = async (confirmedReservation, io) => {
  try {
    const { restaurant_id, table_id, reservation_date, reservation_time, id: confirmed_id } = confirmedReservation;

    console.log(`🔍 Looking for conflicting bookings for table ${table_id} on ${reservation_date} at ${reservation_time}`);

    // Find all OTHER pending bookings for the same table, date, and time
    const { data: conflictingBookings, error: fetchError } = await supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('restaurant_id', restaurant_id)
      .eq('table_id', table_id)
      .eq('reservation_date', reservation_date)
      .eq('reservation_time', reservation_time)
      .eq('status', 'pending')
      .neq('id', confirmed_id); // Exclude the confirmed booking

    if (fetchError) {
      console.error('❌ Error finding conflicting bookings:', fetchError.message);
      return;
    }

    console.log(`📋 Found ${conflictingBookings?.length || 0} conflicting bookings`);

    if (!conflictingBookings || conflictingBookings.length === 0) {
      console.log('✅ No conflicting bookings to reject');
      return;
    }

    // Get restaurant name for notifications
    const { data: restaurantData } = await supabase
      .from('restaurants')
      .select('name')
      .eq('id', restaurant_id)
      .single();

    // Reject all conflicting bookings
    for (const booking of conflictingBookings) {
      console.log(`🗑️ Rejecting conflicting booking ${booking.id}`);

      // Update booking status to 'rejected'
      const { error: updateError } = await supabaseAdmin
        .from('reservations')
        .update({ 
          status: 'rejected',
          rejection_reason: 'Table slot was taken by another customer'
        })
        .eq('id', booking.id);

      if (updateError) {
        console.error(`⚠️ Failed to reject booking ${booking.id}:`, updateError.message);
        continue;
      }

      // Create rejection notification for the customer
      await createNotification(
        booking.customer_id,
        '❌ Booking Rejected',
        `Your reservation at ${restaurantData?.name} for ${reservation_date} at ${reservation_time} was rejected. The table slot was taken by another customer. Please try booking at a different time.`,
        'booking_rejected',
        booking.id
      );

      // Send WebSocket notification
      if (io) {
        emitNotificationEvent(
          io,
          booking.customer_id,
          '❌ Booking Rejected',
          `Your reservation was rejected. The table slot was taken by another customer.`,
          { status: 'rejected', reservation_id: booking.id }
        );

        io.to(booking.customer_id).emit('reservation_updated', {
          message: '❌ Rejected - Table slot taken',
          reservation: booking
        });
      }

      // Send rejection email
      const { data: customerEmail } = await supabase
        .from('users')
        .select('email')
        .eq('id', booking.customer_id)
        .single();

      if (customerEmail?.email) {
        try {
          const subject = "❌ Your Booking Was Rejected";
          const body = `<h2>Booking Rejected</h2><p>Your reservation at ${restaurantData?.name} for ${reservation_date} at ${reservation_time} was rejected because the table slot was taken by another customer.</p><p>Please try booking at a different time.</p>`;
          await sendEmail(customerEmail.email, subject, body);
          console.log(`✅ Rejection email sent to ${customerEmail.email}`);
        } catch (err) {
          console.error(`⚠️ Failed to send rejection email:`, err.message);
        }
      }

      console.log(`✅ Booking ${booking.id} rejected and customer notified`);
    }

    console.log(`✅ All ${conflictingBookings.length} conflicting bookings have been rejected`);
  } catch (error) {
    console.error('❌ Error in autoRejectConflictingBookings:', error.message);
  }
};

// 1. Get Dashboard Overview (Daily stats + weekly overview for the merchant)
exports.getDashboardOverview = async (req, res) => {
  try {
    const merchant_id = req.user.id;
    // Optional query param: ?date=2026-04-08  (defaults to today)
    const queryDate = req.query.date || new Date().toISOString().slice(0, 10);
    console.log(`\n📊 [getDashboardOverview] Merchant ID: ${merchant_id}, Date: ${queryDate}`);

    // A. Find the restaurant owned by this merchant
    const { data: restaurant, error: restErr } = await supabase
      .from('restaurants')
      .select('id, name, address')
      .eq('merchant_id', merchant_id)
      .single();

    if (restErr || !restaurant) {
        console.error(`❌ Restaurant not found for merchant ${merchant_id}`);
        return res.status(404).json({ error: "No restaurant found for this merchant account." });
    }

    console.log(`🏪 Restaurant found: ${restaurant.name} (ID: ${restaurant.id})`);

    // B. Get available dishes count (menu_items.is_available = true)
    const { count: availableCount, error: availErr } = await supabase
      .from('menu_items')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurant.id)
      .eq('is_available', true);

    if (availErr) {
      console.error('❌ Error fetching available dishes count:', availErr.message);
    }

    // Also get total menu items
    const { count: totalMenuCount } = await supabase
      .from('menu_items')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurant.id);

    console.log(`📋 Available dishes: ${availableCount || 0}, Total menu items: ${totalMenuCount || 0}`);

    // C. Get reservations for the requested date
    const { data: dayReservations, error: dayResErr } = await supabase
      .from('reservations')
      .select('id, status')
      .eq('restaurant_id', restaurant.id)
      .eq('reservation_date', queryDate);

    if (dayResErr) {
      console.error('❌ Error fetching day reservations:', dayResErr.message);
    }

    // Count by status for the requested day
    let pendingCount = 0, confirmedCount = 0, arrivedCount = 0, completedCount = 0;
    dayReservations?.forEach(r => {
      if (r.status === 'pending') pendingCount++;
      else if (r.status === 'confirmed') confirmedCount++;
      else if (r.status === 'arrived') arrivedCount++;
      else if (r.status === 'completed') completedCount++;
    });

    console.log(`📅 Stats for ${queryDate}: Pending=${pendingCount} Confirmed=${confirmedCount} Arrived=${arrivedCount} Completed=${completedCount}`);

    // D. Build weekly overview (Mon-Sun of current week)
    // Find Monday of the week containing queryDate
    const dateObj = new Date(queryDate + 'T00:00:00');
    const dayOfWeek = dateObj.getDay(); // 0=Sun ... 6=Sat
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(dateObj);
    monday.setDate(dateObj.getDate() + mondayOffset);

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDates.push(d.toISOString().slice(0, 10));
    }

    console.log(`📆 Week dates: ${weekDates.join(', ')}`);

    // Fetch all reservations for this week
    const { data: weekReservations, error: weekErr } = await supabase
      .from('reservations')
      .select('id, reservation_date, status')
      .eq('restaurant_id', restaurant.id)
      .gte('reservation_date', weekDates[0])
      .lte('reservation_date', weekDates[6]);

    // Build per-day totals
    const weeklyData = weekDates.map(date => {
      const dayBookings = weekReservations?.filter(r => r.reservation_date === date) || [];
      return {
        date,
        total: dayBookings.length,
        pending: dayBookings.filter(r => r.status === 'pending').length,
        confirmed: dayBookings.filter(r => r.status === 'confirmed').length,
        arrived: dayBookings.filter(r => r.status === 'arrived').length,
        completed: dayBookings.filter(r => r.status === 'completed').length,
      };
    });

    console.log(`📈 Weekly overview:`, weeklyData.map(d => `${d.date}:${d.total}`).join(' | '));

    // E. Send response
    res.status(200).json({
      restaurant_name: restaurant.name,
      address: restaurant.address,
      date: queryDate,
      available_dishes: availableCount || 0,
      total_menu_items: totalMenuCount || 0,
      pending_bookings: pendingCount,
      confirmed_bookings: confirmedCount,
      arrived_bookings: arrivedCount,
      completed_bookings: completedCount,
      weekly: weeklyData,
    });

  } catch (error) {
    console.error(`❌ Error in getDashboardOverview:`, error.message);
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
    const { id } = req.params;
    const merchant_id = req.user.id;

    // 1. Update the reservation
    const { data: reservation, error: resError } = await supabaseAdmin
      .from('reservations')
      .update({ status: 'confirmed' })
      .eq('id', id)
      .select()
      .single();

    if (resError) throw resError;

    console.log('✅ Reservation confirmed:', id);

    // 1.5 Update table status to "occupied" in real-time
    if (reservation.table_id) {
      console.log('🔒 [confirmReservation] Updating table status to occupied:', reservation.table_id);
      const { error: tableError } = await supabaseAdmin
        .from('tables')
        .update({ status: 'occupied' })
        .eq('id', reservation.table_id);

      if (tableError) {
        console.log('⚠️  Warning: Could not update table status:', tableError.message);
      } else {
        console.log('✅ Table marked as occupied immediately');
      }
    }

    // 1.6 AUTO-REJECT CONFLICTING BOOKINGS (if multiple bookings on same table/date/time)
    const io = req.app.get('io');
    await autoRejectConflictingBookings(reservation, io);

    // 2. Get restaurant info for notifications
    const { data: restaurantData, error: restError } = await supabase
      .from('restaurants')
      .select('name, merchant_id')
      .eq('id', reservation.restaurant_id)
      .single();

    if (restError || !restaurantData) {
      console.error('❌ Restaurant not found:', restError?.message);
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // 3. Fetch the email from 'users' table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', reservation.customer_id) 
      .single();

    // 4. Send the email to customer
    if (userData && userData.email) {
      const subject = "🍽️ Your Table is Confirmed!";
      const body = `<h2>Success!</h2><p>Your reservation at ${restaurantData.name} is confirmed.</p>`;
      try {
        await sendEmail(userData.email, subject, body);
        console.log("✅ NODEMAILER SUCCESS: Email sent to", userData.email);
      } catch (err) {
        console.error("❌ NODEMAILER FAILED:", err.message);
      }
    }

    // 5. CREATE NOTIFICATIONS FOR BOTH CUSTOMER AND MERCHANT
    // Notification for customer
    await createNotification(
      reservation.customer_id,
      '✅ Booking Confirmed!',
      `Your reservation at ${restaurantData.name} on ${reservation.reservation_date} at ${reservation.reservation_time} has been confirmed!`,
      'booking_confirmed',
      id
    );

    // Notification for merchant
    await createNotification(
      merchant_id,
      '✅ Booking Confirmed',
      `You confirmed the reservation for ${reservation.party_size} guests on ${reservation.reservation_date} at ${reservation.reservation_time}`,
      'booking_confirmed',
      id
    );

    // 6. Send real-time socket notifications to BOTH parties
    if (io) {
      // Notify customer
      emitNotificationEvent(
        io,
        reservation.customer_id,
        '✅ Booking Confirmed!',
        `Your reservation at ${restaurantData.name} has been confirmed!`,
        { status: 'confirmed', reservation_id: id }
      );

      // Notify merchant
      emitNotificationEvent(
        io,
        merchant_id,
        '✅ Booking Confirmed',
        `You confirmed the reservation`,
        { status: 'confirmed', reservation_id: id }
      );
    }

    // Also emit old-style event for backward compatibility
    if (io) {
      io.to(reservation.customer_id).emit('reservation_updated', { 
          message: "✅ Confirmed!", 
          reservation 
      });
      
      // 📢 Broadcast table status change in REAL-TIME to all clients
      io.emit('table_status_updated', {
        table_id: reservation.table_id,
        status: 'occupied',
        restaurant_id: reservation.restaurant_id,
        timestamp: new Date().toISOString(),
        reservation_id: id
      });
      
      console.log('📡 Broadcasted table_status_updated event for table:', reservation.table_id);
    }

    res.status(200).json({ message: "Confirmed and email sent!", data: reservation });
  } catch (error) {
    console.error("Error in confirmReservation:", error.message);
    res.status(400).json({ error: error.message });
  }
};

// Merchant: Reject a reservation
exports.rejectReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const merchant_id = req.user.id;

    // 1. Update the reservation status in the database
    const { data: reservation, error: resError } = await supabaseAdmin
      .from('reservations')
      .update({ status: 'rejected' })
      .eq('id', id)
      .select()
      .single();

    if (resError) throw resError;
    if (!reservation) return res.status(404).json({ message: "Reservation not found." });

    // 1.5 Release table back to available status
    if (reservation.table_id) {
      console.log('🔓 [rejectReservation] Releasing table back to available:', reservation.table_id);
      const { error: tableError } = await supabaseAdmin
        .from('tables')
        .update({ status: 'available' })
        .eq('id', reservation.table_id);

      if (tableError) {
        console.log('⚠️  Warning: Could not release table:', tableError.message);
      } else {
        console.log('✅ Table released and available immediately');
      }
    }

    // 2. Get restaurant info for notifications
    const { data: restaurantData, error: restError } = await supabase
      .from('restaurants')
      .select('name, merchant_id')
      .eq('id', reservation.restaurant_id)
      .single();

    if (restError || !restaurantData) {
      console.error('❌ Restaurant not found:', restError?.message);
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // 3. Fetch the customer's email from the 'users' table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', reservation.customer_id)
      .single();

    // 4. Send the rejection email to customer
    if (userData && userData.email) {
      const emailSubject = "Update regarding your reservation at " + restaurantData.name;
      const emailBody = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #d9534f;">Reservation Update</h2>
          <p>We're sorry, but ${restaurantData.name} is unable to confirm your reservation at this time.</p>
          <p><strong>Date:</strong> ${reservation.reservation_date}</p>
          <p><strong>Time:</strong> ${reservation.reservation_time}</p>
          <p><strong>Reason:</strong> The restaurant is currently at full capacity or has a private event.</p>
          <p>Please try another time or check out our other partner restaurants!</p>
        </div>
      `;
      try {
        const result = await sendEmail(userData.email, emailSubject, emailBody);
        console.log("✅ Nodemailer success info:", result);
      } catch (emailErr) {
        console.error("❌ NODEMAILER DIED HERE:", emailErr);
      }
    }

    // 5. CREATE NOTIFICATIONS FOR BOTH CUSTOMER AND MERCHANT
    // Notification for customer
    await createNotification(
      reservation.customer_id,
      '❌ Booking Rejected',
      `Your reservation at ${restaurantData.name} on ${reservation.reservation_date} at ${reservation.reservation_time} has been rejected. Please try another time.`,
      'booking_rejected',
      id
    );

    // Notification for merchant
    await createNotification(
      merchant_id,
      '✅ Booking Rejected',
      `You rejected the reservation for ${reservation.party_size} guests on ${reservation.reservation_date} at ${reservation.reservation_time}`,
      'booking_rejected',
      id
    );

    // 6. Send real-time socket notifications to BOTH parties
    const io = req.app.get('io');
    if (io) {
      // Notify customer
      emitNotificationEvent(
        io,
        reservation.customer_id,
        '❌ Booking Rejected',
        `Your reservation at ${restaurantData.name} has been rejected.`,
        { status: 'rejected', reservation_id: id }
      );

      // Notify merchant
      emitNotificationEvent(
        io,
        merchant_id,
        '✅ Booking Rejected',
        `You rejected the reservation`,
        { status: 'rejected', reservation_id: id }
      );
    }

    // Also emit old-style event for backward compatibility
    if (io) {
      io.to(reservation.customer_id).emit('reservation_updated', {
        message: "❌ Sorry, your reservation was rejected.",
        reservation: reservation
      });
      
      // 📢 Broadcast table status change in REAL-TIME to all clients
      io.emit('table_status_updated', {
        table_id: reservation.table_id,
        status: 'available',
        restaurant_id: reservation.restaurant_id,
        timestamp: new Date().toISOString(),
        reservation_id: id,
        reason: 'booking_rejected'
      });
      
      console.log('📡 Broadcasted table_status_updated event for table:', reservation.table_id);
    }

    res.status(200).json({ message: "Reservation rejected and email sent.", data: reservation });
  } catch (error) {
    console.error("Error in rejectReservation:", error.message);
    res.status(400).json({ error: error.message });
  }
};