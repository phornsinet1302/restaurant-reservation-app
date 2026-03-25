// Load environment variables FIRST - before anything else
require("dotenv").config({ path: require('path').resolve(__dirname, '.env') });

const express = require("express");
const http = require("http");
const cors = require("cors");
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
const locationRoutes = require('./routes/locationRoutes');
const app = express();
const { Server } = require('socket.io');



// Enable CORS for all origins (for development)
app.use(cors());
app.use(express.json()); // Essential to read the data you send
// Supabase connection
const supabaseUrl = "https://rifnahhqukowayflroed.supabase.co";
const supabaseKey = "sb_publishable_3eGaQ9tf-aFgqKQsJUctYA_wYPXhSpc";
const supabase = createClient(supabaseUrl, supabaseKey);

app.get("/", (req, res) => {
  res.send("Restaurant Reservation API Running");
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
app.use('/api/location', locationRoutes);


// --- NEW: SOCKET.IO SETUP ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" } // Lets any frontend connect to it
});

// This is a magic trick! We save 'io' inside the 'app' so your controllers can use it later
app.set('io', io);

// Listen for people connecting
io.on('connection', (socket) => {
  console.log('⚡ A user connected! Socket ID:', socket.id);

  // When a user logs in on the frontend, they will tell the server their ID to join a "private room"
  socket.on('join_room', (userId) => {
    socket.join(userId);
    console.log(`User/Restaurant ${userId} joined their private room.`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server & WebSockets are running on port ${PORT}`);
});