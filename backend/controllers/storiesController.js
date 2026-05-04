const supabase = require('../config/supabase');
const { supabaseAdmin } = require('../config/supabase');

// Get active stories for a restaurant (24h old or newer)
exports.getRestaurantStories = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const now = new Date().toISOString();

    console.log(`\n📖 [getRestaurantStories] API CALLED`);
    console.log(`   Fetching stories for restaurant: ${restaurantId}`);
    console.log(`   Current time: ${now}`);

    // Use supabaseAdmin to bypass RLS
    const { data, error } = await supabaseAdmin
      .from('stories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .gt('expires_at', now)
      .order('created_at', { ascending: false });

    console.log(`   Found ${data?.length || 0} active stories`);
    if (data && data.length > 0) {
      data.forEach((story, idx) => {
        const expiresAt = new Date(story.expires_at);
        const isExpired = expiresAt < new Date(now);
        console.log(`   Story ${idx + 1}: id=${story.id}, expires_at=${story.expires_at}, isExpired=${isExpired}`);
      });
    } else {
      console.log(`   ⚠️ No active stories found for restaurant ${restaurantId}`);
    }

    if (error) {
      console.error('❌ Error fetching stories:', error);
      return res.status(400).json({ error: error.message });
    }
    
    console.log(`✅ Returning ${(data || []).length} stories`);
    res.status(200).json(data || []);
  } catch (error) {
    console.error('❌ Error fetching stories:', error);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
};

// Get all active stories for customer feed (from subscribed/nearby restaurants)
exports.getAllActiveStories = async (req, res) => {
  try {
    const now = new Date().toISOString();
    const nowTime = new Date();
    console.log('📖 [getAllActiveStories] Fetching active stories...');
    console.log(`   Current server time: ${now}`);
    console.log(`   Current time (ms): ${nowTime.getTime()}`);

    // Get all published restaurants
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('id, name, phone')
      .eq('is_published', true);

    console.log(`📖 Found ${restaurants?.length || 0} published restaurants`);
    if (restaurantsError) {
      console.error('❌ Error fetching restaurants:', restaurantsError);
      return res.status(400).json({ error: restaurantsError.message });
    }

    if (!restaurants || restaurants.length === 0) {
      console.log('📖 No published restaurants found');
      return res.status(200).json([]);
    }

    // Get all active stories (not expired)
    const restaurantIds = restaurants.map(r => r.id);
    console.log(`📖 Fetching stories for ${restaurantIds.length} restaurants, current time: ${now}`);
    console.log(`📖 Looking in restaurants: ${restaurantIds.join(', ')}`);
    
    // First, get ALL stories to debug
    const { data: allStories, error: allStoriesError } = await supabase
      .from('stories')
      .select('id, restaurant_id, image_url, video_url, title, description, created_at, expires_at');
    
    console.log(`📖 Total stories in DB: ${allStories?.length || 0}`);
    if (allStories && allStories.length > 0) {
      allStories.forEach(story => {
        const expiresAt = new Date(story.expires_at);
        const currentDate = new Date(now);
        const isExpired = expiresAt < currentDate;
        const timeLeftMs = expiresAt.getTime() - currentDate.getTime();
        const timeLeftHours = Math.round(timeLeftMs / (1000 * 60 * 60));
        console.log(`   Story ${story.id}:`);
        console.log(`      restaurant_id: ${story.restaurant_id}`);
        console.log(`      created_at: ${story.created_at}`);
        console.log(`      expires_at: ${story.expires_at} (expires in ${timeLeftHours}h)`);
        console.log(`      isExpired: ${isExpired} (expires_at ${isExpired ? '<' : '>'} now)`);
      });
    }
    
    const { data: stories, error: storiesError } = await supabase
      .from('stories')
      .select('id, restaurant_id, image_url, video_url, title, description, created_at, expires_at')
      .in('restaurant_id', restaurantIds)
      .gt('expires_at', now);

    console.log(`📖 Found ${stories?.length || 0} active stories`);
    if (storiesError) {
      console.error('❌ Error fetching stories:', storiesError);
      return res.status(400).json({ error: storiesError.message });
    }

    // Group stories by restaurant
    const result = restaurants
      .map(restaurant => ({
        ...restaurant,
        stories: (stories || []).filter(story => story.restaurant_id === restaurant.id),
      }))
      .filter(restaurant => restaurant.stories.length > 0)
      .sort((a, b) => {
        const aLatest = Math.max(...a.stories.map(s => new Date(s.created_at).getTime()));
        const bLatest = Math.max(...b.stories.map(s => new Date(s.created_at).getTime()));
        return bLatest - aLatest;
      });

    console.log(`📖 Returning ${result.length} restaurants with stories`);
    result.forEach((r, idx) => {
      console.log(`   Restaurant ${idx + 1}: "${r.name}" - ${r.stories.length} stories`);
      r.stories.forEach((s, sIdx) => {
        console.log(`      Story ${sIdx + 1}: "${s.title}" (expires in ${Math.round((new Date(s.expires_at) - new Date(now)) / (1000 * 60 * 60))}h)`);
      });
    });
    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Error fetching all stories:', error);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
};

// Create a new story (merchant only)
exports.createStory = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { restaurantId, imageUrl, title, description, videoUrl } = req.body;

    // Verify the restaurant belongs to this merchant
    console.log('📖 Creating story for restaurant:', restaurantId);
    console.log('   Merchant ID:', merchantId);

    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id, merchant_id, is_published')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      console.error('❌ Restaurant not found:', restaurantError);
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    console.log(`   Restaurant is_published: ${restaurant.is_published}`);

    if (restaurant.merchant_id !== merchantId) {
      console.error('❌ Unauthorized - merchant does not own this restaurant');
      return res.status(403).json({ error: 'Unauthorized - you do not own this restaurant' });
    }

    // Create the story
    const now = new Date();
    const createdAt = now.toISOString(); // Explicit UTC timestamp
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

    console.log(`   Current time: ${now.toISOString()} (ms: ${now.getTime()})`);
    console.log(`   Created at: ${createdAt}`);
    console.log(`   Expires at: ${expiresAt.toISOString()} (ms: ${expiresAt.getTime()})`);
    console.log(`   Expires in: 24h`);

    const { data, error } = await supabaseAdmin
      .from('stories')
      .insert([
        {
          restaurant_id: restaurantId,
          image_url: imageUrl,
          video_url: videoUrl || null,
          title: title || '',
          description: description || '',
          created_at: createdAt, // Explicit UTC timestamp
          expires_at: expiresAt.toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error('❌ Story creation error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ Story created:', data[0]?.id);
    res.status(201).json({
      success: true,
      message: 'Story posted successfully (expires in 24h)',
      data: data[0],
    });
  } catch (error) {
    console.error('❌ Error creating story:', error);
    res.status(500).json({ error: 'Failed to create story: ' + error.message });
  }
};

// Delete a story (merchant only)
exports.deleteStory = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { storyId } = req.params;

    // Get the story and verify ownership
    const { data: story, error: storyError } = await supabaseAdmin
      .from('stories')
      .select('id, restaurant_id, image_url, video_url, restaurants(merchant_id)')
      .eq('id', storyId)
      .single();

    if (storyError || !story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Verify ownership
    if (story.restaurants.merchant_id !== merchantId) {
      return res.status(403).json({ error: 'Unauthorized - you cannot delete this story' });
    }

    console.log(`📖 Deleting story: ${storyId}`);

    // Delete storage files (image and video)
    if (story.image_url && !story.image_url.startsWith('file://')) {
      try {
        const imagePath = story.image_url.split('/storage/v1/object/public/stories/')[1];
        if (imagePath) {
          console.log(`   Deleting image: ${imagePath}`);
          await supabaseAdmin.storage.from('stories').remove([imagePath]);
        }
      } catch (err) {
        console.warn(`   ⚠️ Failed to delete image file:`, err.message);
      }
    }

    if (story.video_url && !story.video_url.startsWith('file://')) {
      try {
        const videoPath = story.video_url.split('/storage/v1/object/public/stories/')[1];
        if (videoPath) {
          console.log(`   Deleting video: ${videoPath}`);
          await supabaseAdmin.storage.from('stories').remove([videoPath]);
        }
      } catch (err) {
        console.warn(`   ⚠️ Failed to delete video file:`, err.message);
      }
    }

    // Delete the story record from database
    const { error: deleteError } = await supabaseAdmin
      .from('stories')
      .delete()
      .eq('id', storyId);

    if (deleteError) {
      return res.status(400).json({ error: deleteError.message });
    }

    console.log('✅ Story and storage files deleted:', storyId);
    res.status(200).json({ success: true, message: 'Story deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting story:', error);
    res.status(500).json({ error: 'Failed to delete story: ' + error.message });
  }
};

// Get merchant's own stories (for managing)
exports.getMerchantStories = async (req, res) => {
  try {
    const merchantId = req.user.id;

    // Get all restaurants for this merchant with their stories
    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .select(`
        id,
        name,
        stories (
          id,
          image_url,
          title,
          description,
          created_at,
          expires_at
        )
      `)
      .eq('merchant_id', merchantId)
      .order('created_at', { foreignTable: 'stories', ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    res.status(200).json(data || []);
  } catch (error) {
    console.error('Error fetching merchant stories:', error);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
};
