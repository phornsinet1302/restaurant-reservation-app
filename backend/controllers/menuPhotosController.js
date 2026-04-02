const supabase = require('../config/supabase');
const { supabaseAdmin } = require('../config/supabase');
const multer = require('multer');

// Get menu photos for a restaurant
exports.getMenuPhotos = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    console.log(`📸 [getMenuPhotos] Fetching photos for restaurant: ${restaurantId}`);

    const { data, error } = await supabase
      .from('menu_photos')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('❌ Error fetching photos:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log(`✅ Found ${data?.length || 0} photos`);
    res.status(200).json({ data: data || [], success: true });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
};

// Upload menu photo
exports.uploadMenuPhoto = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { restaurantId } = req.params;
    const { title, description, display_order } = req.body;

    console.log(`📸 [uploadMenuPhoto] Uploading for restaurant: ${restaurantId}`);
    console.log(`   Merchant ID: ${merchantId}`);
    console.log(`   File present: ${!!req.file}`);
    console.log(`   Body: title=${title}, display_order=${display_order}`);

    if (!req.file) {
      console.error('❌ No file provided in request');
      console.error('   Request headers:', Object.keys(req.headers));
      console.error('   Request body:', req.body);
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log(`   File size: ${req.file.size} bytes`);
    console.log(`   File mimetype: ${req.file.mimetype}`);

    // Verify ownership
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id, merchant_id')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    if (restaurant.merchant_id !== merchantId) {
      return res.status(403).json({ error: 'Unauthorized - this is not your restaurant' });
    }

    // Check if max 3 photos already exists
    const { data: existingPhotos, error: countError } = await supabaseAdmin
      .from('menu_photos')
      .select('id', { count: 'exact' })
      .eq('restaurant_id', restaurantId);

    if (!countError && existingPhotos && existingPhotos.length >= 3) {
      return res.status(400).json({ error: 'Maximum 3 photos per restaurant allowed' });
    }

    // Upload to Supabase Storage
    const photoId = Math.random().toString(36).substring(2, 15);
    const filePath = `restaurant-${restaurantId}/menu-${photoId}.jpg`;

    console.log(`   Uploading to storage: ${filePath}`);

    const { error: uploadError } = await supabaseAdmin.storage
      .from('menu-photos')
      .upload(filePath, req.file.buffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      return res.status(400).json({ error: 'Failed to upload image to storage' });
    }

    // Get public URL
    const { data: publicUrl } = supabaseAdmin.storage
      .from('menu-photos')
      .getPublicUrl(filePath);

    console.log(`   Public URL: ${publicUrl.publicUrl}`);

    // Get next display order
    const nextOrder = display_order || (existingPhotos?.length || 0) + 1;

    // Save to database
    const { data: photo, error: dbError } = await supabaseAdmin
      .from('menu_photos')
      .insert([
        {
          restaurant_id: restaurantId,
          photo_url: publicUrl.publicUrl,
          title: title || 'Menu Item',
          description: description || '',
          display_order: Math.min(nextOrder, 3),
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      // Try to clean up storage upload
      await supabaseAdmin.storage.from('menu-photos').remove([filePath]);
      return res.status(400).json({ error: dbError.message });
    }

    console.log('✅ Photo uploaded successfully:', photo.id);
    res.status(200).json({
      success: true,
      photo: photo,
      message: 'Photo uploaded successfully',
    });
  } catch (error) {
    console.error('❌ Error uploading photo:', error);
    res.status(500).json({ error: 'Failed to upload photo: ' + error.message });
  }
};

// Delete menu photo
exports.deleteMenuPhoto = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { photoId } = req.params;

    console.log(`🗑️ [deleteMenuPhoto] Deleting photo: ${photoId}`);

    // Get photo and verify ownership
    const { data: photo, error: photoError } = await supabaseAdmin
      .from('menu_photos')
      .select('id, photo_url, restaurants(merchant_id)')
      .eq('id', photoId)
      .single();

    if (photoError || !photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    if (photo.restaurants.merchant_id !== merchantId) {
      return res.status(403).json({ error: 'Unauthorized - you cannot delete this photo' });
    }

    // Delete from storage
    if (photo.photo_url) {
      try {
        const filePath = photo.photo_url.split('/storage/v1/object/public/menu-photos/')[1];
        if (filePath) {
          console.log(`   Deleting from storage: ${filePath}`);
          await supabaseAdmin.storage.from('menu-photos').remove([filePath]);
        }
      } catch (err) {
        console.warn(`   ⚠️ Failed to delete storage file:`, err.message);
      }
    }

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('menu_photos')
      .delete()
      .eq('id', photoId);

    if (deleteError) {
      return res.status(400).json({ error: deleteError.message });
    }

    console.log('✅ Photo deleted successfully');
    res.status(200).json({ success: true, message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting photo:', error);
    res.status(500).json({ error: 'Failed to delete photo: ' + error.message });
  }
};

// Update photo order
exports.updatePhotoOrder = async (req, res) => {
  try {
    const merchantId = req.user.id;
    const { photoId } = req.params;
    const { displayOrder, title, description } = req.body;

    console.log(`📸 [updatePhotoOrder] Updating photo: ${photoId}`);

    // Get photo and verify ownership
    const { data: photo, error: photoError } = await supabaseAdmin
      .from('menu_photos')
      .select('id, restaurants(merchant_id)')
      .eq('id', photoId)
      .single();

    if (photoError || !photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    if (photo.restaurants.merchant_id !== merchantId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update database
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('menu_photos')
      .update({
        display_order: displayOrder || undefined,
        title: title || undefined,
        description: description || undefined,
      })
      .eq('id', photoId)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    console.log('✅ Photo updated successfully');
    res.status(200).json({ success: true, photo: updated });
  } catch (error) {
    console.error('❌ Error updating photo:', error);
    res.status(500).json({ error: 'Failed to update photo: ' + error.message });
  }
};
