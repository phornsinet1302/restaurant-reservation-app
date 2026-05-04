// Load environment variables FIRST - before anything else
require("dotenv").config({ path: require('path').resolve(__dirname, '.env') });

const express = require("express");
const http = require("http");
const cors = require("cors");
const supabase = require('./config/supabase');
const { supabaseAdmin } = require('./config/supabase');
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
const storiesRoutes = require('./routes/storiesRoutes');
const menuPhotosRoutes = require('./routes/menuPhotosRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const app = express();
const { Server } = require('socket.io');

// Enable CORS for all origins (for development)
app.use(cors());
app.use(express.json()); // Essential to read the data you send

app.get("/", (req, res) => {
  res.send("Restaurant Reservation API Running");
});

// DEBUG ENDPOINT: Check restaurant and story status
app.get("/debug/stories/:restaurantId", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    // Get restaurant
    const { data: restaurant, error: restErr } = await supabase
      .from('restaurants')
      .select('id, name, is_published')
      .eq('id', restaurantId)
      .single();
    
    // Get all stories for this restaurant
    const { data: allStories, error: storiesErr } = await supabase
      .from('stories')
      .select('id, restaurant_id, created_at, expires_at')
      .eq('restaurant_id', restaurantId);
    
    res.json({
      restaurant: restaurant || null,
      restaurant_error: restErr?.message,
      all_stories: allStories || [],
      stories_error: storiesErr?.message,
      current_time: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DEBUG ENDPOINT: Publish all unpublished restaurants for a merchant
app.post("/debug/publish-restaurants/:merchantId", async (req, res) => {
  try {
    const { merchantId } = req.params;
    
    console.log(`📢 Publishing all restaurants for merchant: ${merchantId}`);
    
    // Get all unpublished restaurants for this merchant
    const { data: unpublishedRestaurants, error: fetchError } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, is_published')
      .eq('merchant_id', merchantId)
      .eq('is_published', false);
    
    if (fetchError) {
      console.error('❌ Error fetching restaurants:', fetchError.message);
      return res.status(500).json({ error: fetchError.message });
    }
    
    if (!unpublishedRestaurants || unpublishedRestaurants.length === 0) {
      console.log('✅ No unpublished restaurants found for this merchant');
      return res.json({
        message: 'All restaurants already published or none found',
        data: []
      });
    }
    
    const restaurantIds = unpublishedRestaurants.map(r => r.id);
    console.log(`Found ${restaurantIds.length} unpublished restaurants:`, restaurantIds);
    
    // Publish all restaurants for this merchant
    const publishedAt = new Date().toISOString();
    const { data: publishedRestaurants, error: updateError } = await supabaseAdmin
      .from('restaurants')
      .update({
        is_published: true,
        published_at: publishedAt
      })
      .in('id', restaurantIds)
      .select('id, name, is_published, merchant_id');
    
    if (updateError) {
      console.error('❌ Error publishing restaurants:', updateError.message);
      return res.status(500).json({ error: updateError.message });
    }
    
    console.log(`✅ Successfully published ${publishedRestaurants.length} restaurants`);
    
    res.json({
      success: true,
      message: `Published ${publishedRestaurants.length} restaurant(s). Stories are now visible to all customers!`,
      published_restaurants: publishedRestaurants
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DEBUG ENDPOINT: Check restaurants for a merchant
app.get("/debug/check-restaurants/:merchantId", async (req, res) => {
  try {
    const { merchantId } = req.params;
    
    console.log(`\n🔍 Checking restaurants for merchant: ${merchantId}\n`);
    
    // Get all restaurants for this merchant
    const { data: restaurants, error } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, merchant_id, is_published, phone')
      .eq('merchant_id', merchantId);
    
    if (error) {
      console.error('❌ Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
    
    if (!restaurants || restaurants.length === 0) {
      console.log('⚠️  No restaurants found for this merchant');
      return res.json({
        message: 'No restaurants found for this merchant',
        restaurants: [],
        stories: []
      });
    }
    
    // Get stories for each restaurant
    const restaurantWithStories = [];
    for (const restaurant of restaurants) {
      const { data: stories, error: storiesError } = await supabaseAdmin
        .from('stories')
        .select('id, created_at, expires_at')
        .eq('restaurant_id', restaurant.id);
      
      restaurantWithStories.push({
        ...restaurant,
        stories_count: stories?.length || 0,
        stories: stories || []
      });
    }
    
    res.json({
      merchant_id: merchantId,
      total_restaurants: restaurants.length,
      restaurants: restaurantWithStories
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DEBUG ENDPOINT: Create test stories for all published restaurants
app.post("/debug/create-test-stories", async (req, res) => {
  try {
    // Get all published restaurants
    const { data: restaurants, error: restError } = await supabaseAdmin
      .from('restaurants')
      .select('id, name')
      .eq('is_published', true);

    if (restError) {
      console.error('❌ Error fetching restaurants:', restError);
      return res.status(400).json({ error: restError.message });
    }

    if (!restaurants || restaurants.length === 0) {
      return res.status(400).json({ 
        error: 'No published restaurants found. Please publish restaurants first.' 
      });
    }

    const createdStories = [];
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create test stories for each restaurant
    for (const restaurant of restaurants) {
      const { data: story, error: storyError } = await supabaseAdmin
        .from('stories')
        .insert([
          {
            restaurant_id: restaurant.id,
            image_url: 'https://images.unsplash.com/photo-1504674900967-c8fbb19521f9?w=500&h=500&fit=crop',
            title: `Check out ${restaurant.name}! 🍽️`,
            description: `Come visit us today for an amazing dining experience`,
            expires_at: expiresAt.toISOString(),
          },
        ])
        .select();

      if (!storyError && story) {
        createdStories.push({
          restaurant_id: restaurant.id,
          restaurant_name: restaurant.name,
          story_id: story[0].id,
          expires_at: expiresAt.toISOString(),
        });
        console.log(`✅ Created test story for ${restaurant.name}`);
      } else {
        console.error(`❌ Error creating story for ${restaurant.name}:`, storyError);
      }
    }

    res.json({
      success: true,
      message: `Created ${createdStories.length} test stories`,
      stories: createdStories,
    });
  } catch (error) {
    console.error('❌ Error creating test stories:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DEBUG ENDPOINT: Create test stories WITH VIDEOS for all published restaurants
app.post("/debug/create-test-stories-with-video", async (req, res) => {
  try {
    // Get all published restaurants
    const { data: restaurants, error: restError } = await supabaseAdmin
      .from('restaurants')
      .select('id, name')
      .eq('is_published', true);

    if (restError) {
      console.error('❌ Error fetching restaurants:', restError);
      return res.status(400).json({ error: restError.message });
    }

    if (!restaurants || restaurants.length === 0) {
      return res.status(400).json({ 
        error: 'No published restaurants found. Please publish restaurants first.' 
      });
    }

    const createdStories = [];
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Test video URLs (short videos under 1 minute from free sources)
    const testVideos = [
      'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ForBiggerBlazes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-library/sample/ElephantsDream.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-library/sample/BigBuckBunny.mp4',
    ];

    // Create test stories with videos for each restaurant
    for (let i = 0; i < restaurants.length; i++) {
      const restaurant = restaurants[i];
      const videoUrl = testVideos[i % testVideos.length];

      const { data: story, error: storyError } = await supabaseAdmin
        .from('stories')
        .insert([
          {
            restaurant_id: restaurant.id,
            image_url: 'https://images.unsplash.com/photo-1504674900967-c8fbb19521f9?w=500&h=500&fit=crop',
            video_url: videoUrl,
            title: `🎥 ${restaurant.name} - Video Story`,
            description: `Watch our awesome story - under 1 minute! Tap to view the video.`,
            expires_at: expiresAt.toISOString(),
          },
        ])
        .select();

      if (!storyError && story) {
        createdStories.push({
          restaurant_id: restaurant.id,
          restaurant_name: restaurant.name,
          story_id: story[0].id,
          video_url: videoUrl,
          expires_at: expiresAt.toISOString(),
        });
        console.log(`✅ Created video story for ${restaurant.name}`);
      } else {
        console.error(`❌ Error creating story for ${restaurant.name}:`, storyError);
      }
    }

    res.json({
      success: true,
      message: `Created ${createdStories.length} video stories (under 1 minute each)`,
      stories: createdStories,
    });
  } catch (error) {
    console.error('❌ Error creating video stories:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DEBUG ENDPOINT: Directly test creating a story (bypass merchant routes)
app.post("/debug/create-story-direct/:restaurantId", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { title, description, imageUrl } = req.body;

    console.log('📖 [DEBUG] Creating story directly:');
    console.log('   restaurant_id:', restaurantId);
    console.log('   title:', title);

    // Verify restaurant exists
    const { data: restaurant, error: restErr } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, is_published')
      .eq('id', restaurantId)
      .single();

    if (restErr || !restaurant) {
      console.error('❌ Restaurant not found:', restErr?.message);
      return res.status(404).json({ error: 'Restaurant not found', details: restErr });
    }

    console.log('✅ Restaurant found:', restaurant.name, 'Published:', restaurant.is_published);

    // Create story
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabaseAdmin
      .from('stories')
      .insert([
        {
          restaurant_id: restaurantId,
          image_url: imageUrl || 'https://images.unsplash.com/photo-1504674900967-c8fbb19521f9?w=500',
          title: title || 'Test Story',
          description: description || 'This is a test story',
          expires_at: expiresAt,
        },
      ])
      .select();

    if (error) {
      console.error('❌ Error creating story:', error);
      return res.status(400).json({ error: error.message, details: error });
    }

    console.log('✅ Story created successfully:', data[0]?.id);
    res.status(201).json({
      success: true,
      message: 'Story created for debugging',
      data: data[0],
    });
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DEBUG ENDPOINT: List all stories in the database
app.get("/debug/all-stories", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('stories')
      .select('id, restaurant_id, title, description, created_at, expires_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching stories:', error);
      return res. status(400).json({ error: error.message });
    }

    console.log(`📖 Found ${data?.length || 0} total stories in DB`);
    res.status(200).json({
      total: data?.length || 0,
      stories: data || [],
      current_time: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
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
app.use('/api/stories', storiesRoutes);
app.use('/api/menu-photos', menuPhotosRoutes);
app.use('/api/reviews', reviewRoutes);


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
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server & WebSockets are running on port ${PORT}`)
});