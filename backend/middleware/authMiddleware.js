const supabase = require('../config/supabase');

const protect = async (req, res, next) => {
  try {
    console.log('\n=== AUTH MIDDLEWARE START ===');
    const authHeader = req.headers.authorization;
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.log('❌ FAILED: No authorization header');
      return res.status(401).json({ error: "No authorization header. Please login." });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token extracted from header');
    
    if (!token) {
      console.log('❌ FAILED: No token in Authorization header');
      return res.status(401).json({ error: "No token provided in Authorization header." });
    }

    console.log('Token length:', token.length);
    console.log('Token first 30 chars:', token.substring(0, 30));
    console.log('Token last 10 chars:', '...' + token.substring(token.length - 10));
    console.log('Verifying token with Supabase...');
    
    // Verify token using Supabase's getUser method
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('❌ Supabase token verification failed:', error?.message || 'No user returned');
      console.log('=== AUTH MIDDLEWARE END (FAILED) ===\n');
      return res.status(401).json({ error: "Invalid token. Please login again." });
    }

    // Set user with verified data from Supabase
    req.user = {
      id: user.id,
      email: user.email || null,
      role: user.user_metadata?.role || 'customer'
    };

    console.log('✓ Token verified successfully');
    console.log('✓ User ID:', req.user.id);
    console.log('✓ User email:', req.user.email);
    console.log('=== AUTH MIDDLEWARE END (SUCCESS) ===\n');
    
    next();
  } catch (err) {
    console.error('❌ Auth middleware error:', err.message);
    console.log('=== AUTH MIDDLEWARE END (ERROR) ===\n');
    
    if (err.message?.includes('expired')) {
      return res.status(401).json({ error: "Token expired. Please login again." });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: "Invalid token. Please login again." });
    }
    
    res.status(500).json({ error: "Authentication error: " + err.message });
  }
};

module.exports = { protect };