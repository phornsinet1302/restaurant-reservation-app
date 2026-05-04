const supabase = require('../config/supabase');
const { supabaseAdmin } = require('../config/supabase');

// 1. GET ALL TABLES (Public - Customers and merchants can view)
exports.getAllTables = async (req, res) => {
  const { restaurant_id } = req.query;
  
  try {
    if (!restaurant_id) {
      return res.status(400).json({ error: 'restaurant_id is required' });
    }

    console.log(`📋 [getAllTables] Fetching tables for restaurant: ${restaurant_id}`);

    // Get all tables — use admin client to bypass RLS on server-side requests
    const { data, error } = await supabaseAdmin
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurant_id)
      .order('table_number', { ascending: true });

    if (error) {
      console.error('❌ Error fetching tables:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log(`✅ Found ${data?.length || 0} tables for restaurant ${restaurant_id}`);
    res.status(200).json(data || []);
  } catch (error) {
    console.error('❌ Error in getAllTables:', error);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
};

// 2. CREATE TABLE (Protected - Merchant only)
exports.createTable = async (req, res) => {
  try {
    const { restaurant_id, table_number, capacity, status } = req.body;

    console.log('\n🔧 [createTable] REQUEST RECEIVED');
    console.log('   Body:', { restaurant_id, table_number, capacity });
    console.log('   Auth user:', req.user?.id ? `✓ ${req.user.id}` : '❌ null');

    // Validation
    if (!restaurant_id || !table_number || !capacity) {
      return res.status(400).json({ error: 'Missing required fields: restaurant_id, table_number, capacity' });
    }

    if (table_number <= 0) {
      return res.status(400).json({ error: 'Table number must be greater than 0' });
    }

    if (capacity <= 0) {
      return res.status(400).json({ error: 'Capacity must be greater than 0' });
    }

    // FIRST: Check for duplicates BEFORE any other checks
    console.log(`\n📋 [Step 1] Checking for existing table #${table_number} in restaurant ${restaurant_id}`);
    
    const { data: existingTables, error: checkError } = await supabaseAdmin
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurant_id)
      .eq('table_number', table_number);

    console.log(`   Query error: ${checkError?.message || 'none'}`);
    console.log(`   Found: ${existingTables?.length || 0} existing tables with this number`);

    if (existingTables && existingTables.length > 0) {
      console.error(`❌ DUPLICATE FOUND: Table #${table_number} already exists!`);
      console.error(`   Existing ID: ${existingTables[0].id}`);
      console.error(`   Status: ${existingTables[0].status}`);
      
      return res.status(409).json({
        success: false,
        error: `Table ${table_number} already exists for this restaurant`,
        duplicate: true,
        existingTable: existingTables[0]
      });
    }

    console.log(`✅ No duplicates - safe to create`);

    // Verify restaurant exists
    console.log(`\n📋 [Step 2] Verifying restaurant exists`);
    const { data: restaurant, error: restError } = await supabaseAdmin
      .from('restaurants')
      .select('id, merchant_id, name')
      .eq('id', restaurant_id)
      .single();

    if (restError || !restaurant) {
      console.error('❌ Restaurant not found:', restaurant_id);
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    console.log(`✅ Restaurant found: ${restaurant.name}`);

    // Create table
    console.log(`\n📋 [Step 3] Creating table...`);
    const { data, error } = await supabaseAdmin
      .from('tables')
      .insert([
        {
          restaurant_id,
          table_number,
          capacity,
          status: status || 'available'
        }
      ])
      .select();

    if (error) {
      console.error('❌ INSERT ERROR:', error.message);
      console.error('   Code:', error.code);
      
      // Double-check if this is a unique constraint violation
      if (error.code === '23505' || error.message.includes('unique') || error.message.includes('duplicate')) {
        console.error(`🚨 DUPLICATE CAUGHT BY DATABASE!`);
        return res.status(409).json({
          success: false,
          error: `Table ${table_number} already exists (caught by database)`,
          duplicate: true,
          dbError: error.code
        });
      }
      
      return res.status(400).json({ error: error.message });
    }

    console.log(`✅ Table created successfully!`);
    console.log(`   ID: ${data[0].id}`);
    console.log(`   Number: ${data[0].table_number}`);
    console.log(`   Capacity: ${data[0].capacity}`);
    
    res.status(201).json(data);

  } catch (error) {
    console.error('❌ EXCEPTION in createTable:', error.message);
    console.error('   Stack:', error.stack);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
};

// 3. UPDATE TABLE (Protected - Merchant only)
exports.updateTable = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Table ID is required' });
    }

    console.log(`📝 [updateTable] Updating table ${id}:`, updates);

    // Get the table to verify ownership
    const { data: table, error: tableError } = await supabaseAdmin
      .from('tables')
      .select('id, restaurant_id')
      .eq('id', id)
      .single();

    if (tableError || !table) {
      console.error('❌ Table not found:', id);
      return res.status(404).json({ error: 'Table not found' });
    }

    // Get restaurant to verify merchant ownership
    const { data: restaurant } = await supabaseAdmin
      .from('restaurants')
      .select('merchant_id')
      .eq('id', table.restaurant_id)
      .single();

    if (restaurant && req.user?.id && restaurant.merchant_id !== req.user.id) {
      console.error('❌ Unauthorized: User is not the restaurant owner');
      return res.status(403).json({ error: 'Not authorized to update this table' });
    }

    // Update table
    const { data, error } = await supabaseAdmin
      .from('tables')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('❌ Error updating table:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log(`✅ Table updated successfully:`, data[0]);
    res.status(200).json(data);
  } catch (error) {
    console.error('❌ Error in updateTable:', error);
    res.status(500).json({ error: 'Failed to update table' });
  }
};

// 4. DELETE TABLE (Protected - Merchant only)
exports.deleteTable = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Table ID is required' });
    }

    console.log(`🗑️ [deleteTable] Deleting table: ${id}`);

    // Get the table to verify ownership
    const { data: table, error: tableError } = await supabaseAdmin
      .from('tables')
      .select('id, restaurant_id')
      .eq('id', id)
      .single();

    if (tableError || !table) {
      console.error('❌ Table not found:', id);
      return res.status(404).json({ error: 'Table not found' });
    }

    // Get restaurant to verify merchant ownership
    const { data: restaurant } = await supabaseAdmin
      .from('restaurants')
      .select('merchant_id')
      .eq('id', table.restaurant_id)
      .single();

    if (restaurant && req.user?.id && restaurant.merchant_id !== req.user.id) {
      console.error('❌ Unauthorized: User is not the restaurant owner');
      return res.status(403).json({ error: 'Not authorized to delete this table' });
    }

    // Delete table
    const { data, error } = await supabaseAdmin
      .from('tables')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      console.error('❌ Error deleting table:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log(`✅ Table deleted successfully:`, id);
    res.status(200).json({ message: "Table successfully deleted.", data });
  } catch (error) {
    console.error('❌ Error in deleteTable:', error);
    res.status(500).json({ error: 'Failed to delete table' });
  }
};