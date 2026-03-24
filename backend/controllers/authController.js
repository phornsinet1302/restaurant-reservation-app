const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');

// @desc     Register new user
exports.registerUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Registering email:', email);

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) throw error;

    res.status(201).json({ 
      message: "User created! Please check your email for confirmation.", 
      user: data.user 
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(400).json({ error: error.message });
  }
};

// @desc     Login user
exports.loginUser = async (req, res) => { 
  try {
    const { email, password } = req.body;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return res.status(401).json({ error: error.message });

    // This data.session contains your access_token and refresh_token
    return res.status(200).json({
      message: "Logged in",
      session: data.session, 
      user: data.user
    });
  } catch (error) {
    res.status(500).json({ error: "Server error during login" });
  }
};

// @desc     Refresh Session Token
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required" });
  }

  const { data, error } = await supabase.auth.refreshSession({ 
    refresh_token: refreshToken 
  });

  if (error) {
    return res.status(401).json({ error: error.message });
  }

  return res.status(200).json({
    message: "Token refreshed successfully",
    session: data.session,
    user: data.user,
  });
};

// @desc     Information endpoint
exports.loginInfo = (req, res) => {
  res.json({
    message: 'Use POST /api/auth/login with JSON { email, password }',
  });
};

exports.logoutUser = async (req, res) => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ message: "Logged out successfully" });
};

exports.getProfile = async (req, res) => {
  // The middleware already attached the user to req.user!
  res.status(200).json({ 
    message: "Profile fetched successfully",
    user: req.user 
  });
};

// @desc     Get current user profile
exports.getProfile = async (req, res) => {
  // req.user was set by our middleware security guard
  res.status(200).json({
    success: true,
    user: req.user
  });
};

exports.updateProfile = async (req, res) => {
  try {
    const { fullName } = req.body;
    
    // Extract the token from the "Authorization: Bearer <token>" header
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Pass the token inside the 'jwt' field to fix the "Auth session missing" error
    const { data, error } = await supabase.auth.updateUser(
      { data: { full_name: fullName } },
      { jwt: token } 
    );

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: data.user
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};