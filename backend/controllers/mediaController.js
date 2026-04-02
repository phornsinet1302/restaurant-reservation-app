const { supabase, supabaseAdmin } = require('../config/supabase');
const fs = require('fs');
const path = require('path');

// Upload video file to Supabase Storage
exports.uploadVideoFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`;

    console.log('🎥 [uploadVideoFile] Uploading video to stories bucket...');
    console.log('   File name:', req.file.originalname);
    console.log('   File size:', req.file.size, 'bytes');
    console.log('   Storage path:', fileName);

    // Upload to Supabase Storage - stories bucket
    const { data, error } = await supabaseAdmin.storage
      .from('stories')
      .upload(fileName, req.file.buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'video/mp4',
      });

    if (error) {
      console.error('❌ Upload failed:', error);
      return res.status(400).json({ error: error.message });
    }

    // Get public URL
    const { data: publicData } = supabaseAdmin.storage
      .from('stories')
      .getPublicUrl(fileName);

    const videoUrl = publicData.publicUrl;
    console.log('✅ Video uploaded successfully to stories bucket');
    console.log('   Public URL:', videoUrl.substring(0, 60) + '...');

    res.status(200).json({
      message: 'Video uploaded successfully',
      video_url: videoUrl,
      file_path: fileName,
    });
  } catch (error) {
    console.error('❌ Video upload error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Upload image file for menu items or media
exports.uploadImageFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

    console.log('🖼️  [uploadImageFile] Uploading image to restaurant-media bucket...');
    console.log('   File name:', req.file.originalname);
    console.log('   File size:', req.file.size, 'bytes');
    console.log('   Storage path:', fileName);

    // Upload to Supabase Storage - restaurant-media bucket
    const { data, error } = await supabaseAdmin.storage
      .from('restaurant-media')
      .upload(fileName, req.file.buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg',
      });

    if (error) {
      console.error('❌ Upload failed:', error);
      return res.status(400).json({ error: error.message });
    }

    // Get public URL
    const { data: publicData } = supabaseAdmin.storage
      .from('restaurant-media')
      .getPublicUrl(fileName);

    const imageUrl = publicData.publicUrl;
    console.log('✅ Image uploaded successfully to restaurant-media bucket');
    console.log('   Public URL:', imageUrl.substring(0, 60) + '...');

    res.status(200).json({
      message: 'Image uploaded successfully',
      image_url: imageUrl,
      file_path: fileName,
    });
  } catch (error) {
    console.error('❌ Image upload error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.getRestaurantMedia = async (req, res) => {
  try {
    const { restaurant_id } = req.query; 
    if (!restaurant_id) return res.status(400).json({ error: "restaurant_id is required" });

    // Fetch media from restaurant_media table
    const { data, error } = await supabase
      .from('restaurant_media')
      .select('*')
      .eq('restaurant_id', restaurant_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Also get stories from stories table
    const { data: storiesData, error: storiesError } = await supabase
      .from('stories')
      .select('id, restaurant_id, image_url, title, description, created_at, expires_at')
      .eq('restaurant_id', restaurant_id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (storiesError) throw storiesError;

    // Combine both, marking stories
    const combinedData = [
      ...(storiesData || []).map(story => ({ ...story, is_story: true, media_type: 'image', media_url: story.image_url, headline: story.title, caption: story.description })),
      ...(data || [])
    ];

    res.status(200).json(combinedData);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 2. Upload Standard Media (Permanent Photo/Video)
exports.uploadMedia = async (req, res) => {
  try {
    const { restaurant_id, media_url, media_type } = req.body;
    console.log("=== DEBUG: VARIABLES ===", { restaurant_id, media_url, media_type });

    const { data, error } = await supabaseAdmin
      .from('restaurant_media')
      .insert([{ 
        restaurant_id, 
        media_url, 
        media_type 
      }])
      .select();

    if (error) throw error;
    res.status(201).json({ message: 'Media uploaded successfully!', data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 3. Upload a Story (Disappears in 24 hours)
exports.uploadStory = async (req, res) => {
  try {
    const { restaurant_id, media_url, video_url, headline, caption } = req.body;
    
    console.log('📖 [uploadStory] Creating story with:');
    console.log('   restaurant_id:', restaurant_id);
    console.log('   media_url:', media_url ? media_url.substring(0, 60) + '...' : 'none');
    console.log('   video_url:', video_url ? video_url.substring(0, 60) + '...' : 'none');
    console.log('   headline:', headline);
    console.log('   caption:', caption);
    
    // Verify restaurant exists
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, is_published, merchant_id')
      .eq('id', restaurant_id)
      .single();
    
    if (restaurantError || !restaurant) {
      console.error('❌ Restaurant not found:', restaurantError?.message);
      return res.status(404).json({ error: 'Restaurant not found', details: restaurantError?.message });
    }
    
    console.log(`   ✅ Restaurant found: ${restaurant.name}`);
    console.log(`      Published: ${restaurant.is_published}`);
    console.log(`      Merchant ID: ${restaurant.merchant_id}`);
    
    // Calculate expiration time (24 hours from right now) and creation time
    const now = new Date();
    const createdAt = now.toISOString(); // Explicit UTC timestamp
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    console.log('   created_at:', createdAt);
    console.log('   expires_at:', expiresAt);

    const { data, error } = await supabaseAdmin
      .from('stories')
      .insert([{ 
        restaurant_id, 
        image_url: media_url,
        video_url: video_url || null,
        title: headline || '', 
        description: caption || '', 
        created_at: createdAt, // Explicit UTC timestamp
        expires_at: expiresAt 
      }])
      .select();

    if (error) {
      console.error('❌ Error creating story:', error);
      console.error('   Error message:', error.message);
      console.error('   Error code:', error.code);
      console.error('   Error details:', error.details);
      return res.status(400).json({ 
        error: error.message,
        code: error.code,
        details: error.details
      });
    }
    
    console.log('✅ Story created successfully:', data[0]?.id);
    res.status(201).json({ 
      message: 'Story posted! It will disappear in 24 hours.', 
      data 
    });
  } catch (error) {
    console.error('❌ Story creation failed:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// 4. Delete Media
exports.deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from('restaurant_media')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(200).json({ message: 'Media deleted successfully!' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};