const supabase = require('../config/supabase');

exports.getMyNotifications = async (req, res) => {
  try {
    const user_id = req.user.id; 

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.status(200).json({ message: 'Notification marked as read.', data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const user_id = req.user.id;

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user_id)
      .eq('is_read', false) 
      .select();

    if (error) throw error;
    res.status(200).json({ message: 'All notifications marked as read.', data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 4. Delete Notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(200).json({ message: 'Notification deleted successfully!' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// --- BONUS: Test Route to easily generate dummy notifications ---
exports.createTestNotification = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { title, message } = req.body;

    const { data, error } = await supabase
      .from('notifications')
      .insert([{ user_id, title, message }])
      .select();

    if (error) throw error;
    res.status(201).json({ message: 'Test notification created!', data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};