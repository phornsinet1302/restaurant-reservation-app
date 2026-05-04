require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');

async function setupStoriesBucket() {
  try {
    console.log('🔧 Setting up Supabase Storage bucket for stories...\n');

    // Create the bucket
    console.log('1️⃣  Creating "stories" bucket...');
    const { data: createData, error: createError } = await supabaseAdmin.storage.createBucket(
      'stories',
      {
        public: true, // Make bucket public so videos can be accessed
      }
    );

    if (createError) {
      // If bucket already exists, that's fine
      if (createError.message.includes('already exists')) {
        console.log('   ℹ️  Bucket already exists');
      } else {
        console.error('   ❌ Error creating bucket:', createError.message);
        return;
      }
    } else {
      console.log('   ✅ Bucket created successfully');
      console.log('   - Name: stories');
      console.log('   - Public: true');
    }

    // Test: List buckets
    console.log('\n2️⃣  Verifying bucket...');
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();

    if (listError) {
      console.error('   ❌ Error listing buckets:', listError);
      return;
    }

    const bucket = buckets.find((b) => b.name === 'stories');
    if (bucket) {
      console.log('   ✅ Bucket verified');
      console.log('   - ID:', bucket.id);
      console.log('   - Public:', bucket.public);
    } else {
      console.log('   ❌ Bucket still not found');
      console.log('   Available buckets:', buckets.map((b) => b.name).join(', '));
      return;
    }

    // Test upload
    console.log('\n3️⃣  Testing file upload...');
    const testFile = Buffer.from('Test file - ' + new Date().toISOString());
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('stories')
      .upload(`test/test_${Date.now()}.txt`, testFile, {
        contentType: 'text/plain',
        upsert: false,
      });

    if (uploadError) {
      console.error('   ❌ Upload failed:', uploadError);
      return;
    }

    console.log('   ✅ Test upload successful');
    console.log('   - Path:', uploadData.path);

    // Get public URL
    const { data: publicData } = supabaseAdmin.storage
      .from('stories')
      .getPublicUrl(uploadData.path);

    console.log('\n4️⃣  Public URL for story videos:');
    const baseUrl = publicData.publicUrl.split('/test/')[0];
    console.log('   ' + baseUrl + '/{video_filename}');

    // Cleanup
    console.log('\n5️⃣  Cleaning up test file...');
    await supabaseAdmin.storage
      .from('stories')
      .remove([uploadData.path]);
    console.log('   ✅ Test file deleted');

    console.log('\n✅ Stories bucket is ready for video uploads!');
    console.log('\n📝 Summary:');
    console.log('   - Bucket: stories');
    console.log('   - Public: Yes');
    console.log('   - Purpose: Store story videos');
    console.log('   - Upload endpoint: /api/media/upload-video');

  } catch (error) {
    console.error('\n❌ Setup error:', error.message);
  }
}

setupStoriesBucket();
