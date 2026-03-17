const supabase = require('../config/supabase'); // Make sure this path is correct for your setup

// 1. GET ALL TABLES (Public - so customers can see them)
exports.getAllTables = async (req, res) => {
  // Optional: Allow filtering by restaurant_id via query (e.g., ?restaurant_id=123)
  const { restaurant_id } = req.query;
  
  let query = supabase.from('tables').select('*');
  
  if (restaurant_id) {
    query = query.eq('restaurant_id', restaurant_id);
  }

  const { data, error } = await query;

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json(data);
};

// 2. CREATE TABLE (Protected - Merchant only)
exports.createTable = async (req, res) => {
  const { restaurant_id, table_number, capacity, status } = req.body;

  const { data, error } = await supabase
    .from('tables')
    .insert([
      { 
        restaurant_id, 
        table_number, 
        capacity, 
        status: status || 'available' // Defaults to available if not provided
      }
    ])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
};

// 3. UPDATE TABLE (Protected - Merchant only)
exports.updateTable = async (req, res) => {
  const { id } = req.params; // Get the table ID from the URL
  const updates = req.body;  // What needs to be changed (e.g., status to "unavailable")

  const { data, error } = await supabase
    .from('tables')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json(data);
};

// 4. DELETE TABLE (Protected - Merchant only)
exports.deleteTable = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('tables')
    .delete()
    .eq('id', id)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json({ message: "Table successfully deleted.", data });
};