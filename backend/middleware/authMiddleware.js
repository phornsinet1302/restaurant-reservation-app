const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: "No authorization header. Please login." });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided in Authorization header." });
    }

    // Get JWT secret from environment
    const jwtSecret = process.env.JWT_SECRET;
    
    // Try JWT verification FIRST
    if (jwtSecret) {
      try {
        const decoded = jwt.verify(token, jwtSecret);
        // Accept both custom JWT shape ({ id }) and Supabase-like shape ({ sub })
        const userId = decoded.id || decoded.sub;
        if (!userId) {
          return res.status(401).json({ error: "Invalid token payload. Missing user id." });
        }
        req.user = {
          id: userId,
          email: decoded.email || null,
          role: decoded.role || decoded.user_metadata?.role || 'customer'
        };
        return next();
      } catch (jwtErr) {
        // JWT failed, will try Supabase below
      }
    }

    // If JWT fails or no secret, try Supabase verification
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired token. Please login again." });
    }

    req.user = {
      id: user.id,
      email: user.email || null,
      role: user.user_metadata?.role || 'customer'
    };

    next();
  } catch (err) {
    console.error('\n❌ Auth middleware error:', err.message);
    console.error('Error stack:', err.stack);
    console.log('╔════════════════════════════════════════╗');
    console.log('║ ❌ AUTH MIDDLEWARE ERROR              ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    if (err.message?.includes('expired')) {
      return res.status(401).json({ error: "Token expired. Please login again." });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: "Invalid token. Please login again." });
    }
    
    res.status(500).json({ error: "Authentication error: " + err.message });
  }
};

module.exports = { protect };