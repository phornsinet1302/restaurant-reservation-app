require("dotenv").config();
const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const authRoutes = require('./routes/authRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');

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
