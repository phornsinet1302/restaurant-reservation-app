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

    console.log(`📸 [uploadMenuPhoto] Received request`);
    console.log(`   Restaurant ID: ${restaurantId}`);
    console.log(`   Merchant ID: ${merchantId}`);
    console.log(`   File present: ${!!req.file}`);
    console.log(`   Request body keys:`, Object.keys(req.body));
    console.log(`   title: "${title}" (type: ${typeof title})`);
    console.log(`   description: "${description}" (type: ${typeof description})`);
    console.log(`   display_order: "${display_order}" (type: ${typeof display_order}), parsed: ${parseInt(display_order) || 'NaN'}`);

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
      .select('id, display_order, photo_url')
      .eq('restaurant_id', restaurantId)
      .order('display_order', { ascending: false });

    if (countError) {
      console.error('❌ Error fetching existing photos:', countError);
      return res.status(400).json({ error: countError.message });
    }

    console.log(`   Existing photos: ${existingPhotos?.length || 0}`);
    if (existingPhotos && existingPhotos.length > 0) {
      existingPhotos.forEach((p, i) => {
        console.log(`      Photo ${i + 1}: id=${p.id}, display_order=${p.display_order}`);
      });
    }

    // Get next display order - use explicit order if provided, otherwise max + 1
    let nextOrder = 1;
    if (existingPhotos && existingPhotos.length > 0) {
      const maxOrder = Math.max(...existingPhotos.map(p => p.display_order || 0));
      nextOrder = maxOrder + 1;
    }
    
    // If explicit display_order provided, use it
    if (display_order) {
      nextOrder = parseInt(display_order);
    }

    console.log(`   Target display_order: ${nextOrder}`);
    
    // Check if a photo already exists at this display_order
    console.log(`   Checking for existing photo at display_order: ${nextOrder}`);
    const existingAtOrder = existingPhotos?.find(p => {
      console.log(`      Comparing: p.display_order=${p.display_order} vs nextOrder=${nextOrder}, match=${p.display_order === nextOrder}`);
      return p.display_order === nextOrder;
    });
    
    console.log(`   Result: ${existingAtOrder ? 'FOUND existing photo' : 'NO existing photo'}`);
    
    if (existingAtOrder) {
      console.log(`   ℹ️ Photo exists at order ${nextOrder}, will replace it`);
      console.log(`      Existing photo ID: ${existingAtOrder.id}`);
      console.log(`      Existing photo URL: ${existingAtOrder.photo_url}`);
      
      // Delete the old photo's storage file
      try {
        if (existingAtOrder.photo_url) {
          const filePath = existingAtOrder.photo_url.split('/storage/v1/object/public/menu-photos/')[1];
          if (filePath) {
            console.log(`      Deleting old storage file: ${filePath}`);
            const deleteResult = await supabaseAdmin.storage.from('menu-photos').remove([filePath]);
            console.log(`      Storage delete result:`, deleteResult);
          }
        }
      } catch (deleteErr) {
        console.warn(`   ⚠️ Failed to delete old storage file:`, deleteErr.message);
      }
      
      // Delete the old photo record from database
      console.log(`   Deleting DB record for photo ID: ${existingAtOrder.id}`);
      const { error: deleteError, data: deleteData } = await supabaseAdmin
        .from('menu_photos')
        .delete()
        .eq('id', existingAtOrder.id);
      
      if (deleteError) {
        console.error('❌ Failed to delete old photo record:', deleteError);
        return res.status(400).json({ error: 'Failed to replace existing photo: ' + deleteError.message });
      }
      console.log(`   ✅ Old photo deleted successfully`);
      console.log(`      Delete result:`, deleteData);
    }

    // Check if we're adding a new photo (not replacing)
    if (!existingAtOrder && existingPhotos && existingPhotos.length >= 3) {
      console.error('❌ Maximum 3 photos per restaurant already reached');
      return res.status(400).json({ error: 'Maximum 3 photos per restaurant allowed. Please delete a photo first.' });
    }
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

    // Save to database with calculated display_order
    const insertPayload = {
      restaurant_id: restaurantId,
      photo_url: publicUrl.publicUrl,
      title: title || 'Menu Item',
      description: description || '',
      display_order: nextOrder,
    };
    
    console.log(`   Inserting photo record:`);
    console.log(`      restaurant_id: ${insertPayload.restaurant_id}`);
    console.log(`      photo_url: ${insertPayload.photo_url.substring(0, 80)}...`);
    console.log(`      title: ${insertPayload.title}`);
    console.log(`      display_order: ${insertPayload.display_order}`);
    
    const { data: photo, error: dbError } = await supabaseAdmin
      .from('menu_photos')
      .insert([insertPayload])
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database insert error:');
      console.error(`   Code: ${dbError.code}`);
      console.error(`   Message: ${dbError.message}`);
      console.error(`   Details: ${JSON.stringify(dbError.details)}`);
      // Try to clean up storage upload
      try {
        await supabaseAdmin.storage.from('menu-photos').remove([filePath]);
        console.log('   Cleaned up storage file after DB error');
      } catch (cleanupErr) {
        console.warn('   Failed to cleanup storage file:', cleanupErr.message);
      }
      return res.status(400).json({ error: dbError.message, details: dbError.details });
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
