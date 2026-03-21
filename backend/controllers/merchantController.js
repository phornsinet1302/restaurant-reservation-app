const supabase = require('../config/supabase');
const sendEmail = require('../utils/emailService');

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
    const { id } = req.params;

    // 1. Update the reservation
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .update({ status: 'confirmed' })
      .eq('id', id)
      .select()
      .single();

    if (resError) throw resError;

    // 2. Fetch the email from your 'users' table (since 'profiles' doesn't exist)
    const { data: userData, error: userError } = await supabase
      .from('users') // Changed from profiles to users
      .select('email')
      .eq('id', reservation.customer_id) 
      .single();

    // 3. Send the email if user was found
    if (userData && userData.email) {
      const subject = "🍽️ Your Table is Confirmed!";
      const body = `<h2>Success!</h2><p>Your reservation is confirmed.</p>`;
      try {
        await sendEmail(userData.email, subject, body);
        console.log("✅ NODEMAILER SUCCESS: Email sent to", userData.email);
      } catch (err) {
        console.error("❌ NODEMAILER FAILED:", err.message);
        // This will tell you EXACTLY why Gmail is saying no.
      }
    }

    // 4. Send the real-time notification (Socket.IO)
    const io = req.app.get('io');
    io.to(reservation.customer_id).emit('reservation_updated', { 
        message: "✅ Confirmed!", 
        reservation 
    });

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

    // 1. Update the reservation status in the database
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .update({ status: 'rejected' }) // Matches your UI 'Decline' logic
      .eq('id', id)
      .select()
      .single(); // Returns the updated object directly

    if (resError) throw resError;
    if (!reservation) return res.status(404).json({ message: "Reservation not found." });

    // 2. Fetch the customer's email from the 'users' table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', reservation.customer_id)
      .single();

    // 3. Send the rejection email if we found the user
    if (userData && userData.email) {
      const emailSubject = "Update regarding your reservation";
      const emailBody = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #d9534f;">Reservation Update</h2>
          <p>We're sorry, but the restaurant is unable to confirm your reservation at this time.</p>
          <p><strong>Date:</strong> ${reservation.reservation_date}</p>
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

    // 4. Fire the Socket.IO event for real-time UI update
    const io = req.app.get('io');
    io.to(reservation.customer_id).emit('reservation_updated', {
      message: "❌ Sorry, your reservation was rejected.",
      reservation: reservation
    });

    res.status(200).json({ message: "Reservation rejected and email sent.", data: reservation });
  } catch (error) {
    console.error("Error in rejectReservation:", error.message);
    res.status(400).json({ error: error.message });
  }
};