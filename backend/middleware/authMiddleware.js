const supabase = require('../config/supabase');

const protect = async (req, res, next) => {
  // 1. Get token from headers
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided. Please login." });
  }

  // 2. Verify token with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }

  // 3. Attach user to the request object so controllers can use it
  req.user = user;
  
  // 4. Move to the next function (the controller)
  next();
};

module.exports = { protect };