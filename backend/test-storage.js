require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');

async function testSupabaseStorage() {
  try {
    console.log('🔍 Testing Supabase Storage configuration...\n');

    // Test 1: Check if bucket exists
    console.log('1️⃣  Checking if "restaurant-media" bucket exists...');
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
      return;
    }

    const bucket = buckets.find((b) => b.name === 'restaurant-media');
    if (bucket) {
      console.log('   ✅ Bucket found');
      console.log('   - Name:', bucket.name);
      console.log('   - Public:', bucket.public);
      console.log('   - ID:', bucket.id);
    } else {
      console.log('   ❌ Bucket "restaurant-media" not found');
      console.log('   Available buckets:', buckets.map((b) => b.name).join(', '));
      return;
    }

    // Test 2: Try to upload a test file
    console.log('\n2️⃣  Attempting to upload a test file...');
    const testFileName = `test/video_${Date.now()}.txt`;
    const testContent = Buffer.from('Test video upload - ' + new Date().toISOString());

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('restaurant-media')
      .upload(testFileName, testContent, {
        contentType: 'text/plain',
        upsert: false,
      });

    if (uploadError) {
      console.error('   ❌ Upload failed:', uploadError);
      return;
    }

    console.log('   ✅ File uploaded successfully');
    console.log('   - File path:', uploadData.path);

    // Test 3: Get public URL
    console.log('\n3️⃣  Getting public URL...');
    const { data: publicData } = supabaseAdmin.storage
      .from('restaurant-media')
      .getPublicUrl(testFileName);

    console.log('   ✅ Public URL generated');
    console.log('   - URL:', publicData.publicUrl);

    // Test 4: Delete test file
    console.log('\n4️⃣  Cleaning up test file...');
    const { error: deleteError } = await supabaseAdmin.storage
      .from('restaurant-media')
      .remove([testFileName]);

    if (deleteError) {
      console.error('   ⚠️  Error deleting test file:', deleteError);
    } else {
      console.log('   ✅ Test file deleted');
    }

    console.log('\n✅ Supabase Storage is properly configured!');
    console.log('   Videos can be uploaded to: https://your-project.supabase.co/storage/v1/object/public/restaurant-media/');

  } catch (error) {
    console.error('\n❌ Storage test error:', error.message);
  }
}

testSupabaseStorage();
