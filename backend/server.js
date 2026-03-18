require("dotenv").config();
const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const authRoutes = require('./routes/authRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const tableRoutes = require('./routes/tableRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const menuRoutes = require('./routes/menuRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const merchantRoutes = require('./routes/merchantRoutes');
const favoritesRoutes = require('./routes/favoritesRoutes');
const app = express();
app.use(express.json());
app.use(express.json()); // Essential to read the data you send
app.use('/api/auth', authRoutes);


// Supabase connection
const supabaseUrl = "https://rifnahhqukowayflroed.supabase.co";
const supabaseKey = "sb_publishable_3eGaQ9tf-aFgqKQsJUctYA_wYPXhSpc";
const supabase = createClient(supabaseUrl, supabaseKey);

app.get("/", (req, res) => {
  res.send("Restaurant Reservation API Running");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

app.use('/api/auth', authRoutes); 
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/merchant', merchantRoutes);
app.use('/api/favorites', favoritesRoutes);