const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');

// ❌ REMOVED AsyncStorage import from here

exports.registerUser = async (req, res) => {
  try {
    const { email, password, role = 'customer', fullName, phone, dateOfBirth, bio, identity, restaurantProfile } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // 1. Hash password with bcrypt
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Create user directly in database (bypass Supabase Auth)
    const crypto = require('crypto');
    const userId = crypto.randomUUID();

    const userData = {
      id: userId,
      email: email,
      name: fullName || email.split('@')[0],
      phone: phone || null,
      role: role,
    };

    if (role === 'customer') {
      userData.date_of_birth = dateOfBirth || null;
      userData.bio = bio || null;
    }

    if (role === 'restaurant') {
      userData.legal_name = identity?.legalName || null;
      userData.dob = identity?.dob || null;
      userData.nationality = identity?.nationality || null;
      userData.city_province = identity?.cityProvince || null;
      userData.address = identity?.currentAddress || null;
    }

    // Insert user into users table
    const { data: insertedUser, error: userError } = await supabase
      .from('users')
      .insert([userData])
      .select('*');

    if (userError) {
      console.error("❌ DATABASE ERROR:", userError.message);
      return res.status(400).json({ error: "Registration failed: " + userError.message });
    }

    // Store the hashed password in the users table
    const { error: passwordError } = await supabase
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('id', userId);

    if (passwordError) {
      console.error("❌ PASSWORD STORE ERROR:", passwordError.message);
      return res.status(400).json({ error: "Failed to store password: " + passwordError.message });
    }

    // 3. If restaurant role, also create restaurant entry
    if (role === 'restaurant' && restaurantProfile) {
      const restaurantData = {
        name: restaurantProfile.nameEn,
        name_khmer: restaurantProfile.nameKh || null,
        category: restaurantProfile.category || null,
        cuisine: restaurantProfile.cuisine || null,
        address: restaurantProfile.address || null,
        phone: restaurantProfile.phone || null,
        city_province: restaurantProfile.city || null,
        maps_link: restaurantProfile.mapsLink || null,
        merchant_id: userId,
        description: `${restaurantProfile.category || ''} - ${restaurantProfile.cuisine || ''}`.trim() || null,
      };

      const { error: restaurantError } = await supabase
        .from('restaurants')
        .insert([restaurantData]);

      if (restaurantError) {
        console.error("⚠️ RESTAURANT PROFILE ERROR (non-fatal):", restaurantError.message);
        // Continue even if restaurant profile fails, user can update later
      } else {
        console.log('✅ Restaurant profile created');
      }
    }

    console.log('✅ User created in database');

    // 4. Generate JWT token for immediate use
    const token = jwt.sign(
      { id: userId, email: email, role: role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    console.log('✅ Signup successful - user created without email sending');
    
    return res.status(201).json({ 
      message: "Signup successful!",
      access_token: token,
      user: {
        id: userId,
        email: email,
        fullName,
        phone,
        dateOfBirth,
        bio,
        role
      }
    });

  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ error: "Signup failed: " + error.message });
  }
};
// @desc    Login user (with Role Detection)
exports.loginUser = async (req, res) => { 
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // 1. Fetch user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, role, name, phone, date_of_birth, bio, password_hash')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // 2. Compare password with stored hash
    const bcrypt = require('bcrypt');
    
    if (!user.password_hash) {
      console.warn('⚠️ User has no password hash:', user.email);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      console.log('❌ Password mismatch for:', user.email);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    console.log('✓ User found and password verified:', user.email);

    // 3. Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // 4. Return token and user info
    return res.status(200).json({
      message: "Logged in successfully",
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.name,
        phone: user.phone,
        dateOfBirth: user.date_of_birth,
        bio: user.bio,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
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

// 1. Get Profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch the profile and attempt to join with restaurants
    const { data: profile, error } = await supabase
      .from('users')
      .select('*, restaurants(*)') 
      .eq('id', userId)
      .single();

    if (error) throw error;

    res.status(200).json({
      success: true,
      user: profile 
    });
  } catch (error) {
    console.error("Profile Fetch Error:", error.message);
    res.status(400).json({ error: error.message });
  }
};

// 2. Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, phone, dateOfBirth, bio, restaurantData } = req.body;

    console.log('\n=== UPDATE PROFILE START ===');
    console.log('🆔 User ID:', userId);
    console.log('📝 Received data:', { fullName, phone, dateOfBirth, bio });

    // Validate date format if provided
    if (dateOfBirth) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD
      if (!dateRegex.test(dateOfBirth)) {
        console.log('❌ Invalid date format, expected YYYY-MM-DD');
        return res.status(400).json({ error: 'Invalid date format. Please use YYYY-MM-DD (e.g., 1990-03-15)' });
      }
      
      // Validate it's a valid date
      const dateObj = new Date(dateOfBirth);
      if (isNaN(dateObj.getTime())) {
        console.log('❌ Invalid date value');
        return res.status(400).json({ error: 'Invalid date value' });
      }
    }

    // Prepare update object with all available fields
    const updateData = {};
    if (fullName) updateData.name = fullName;
    if (phone) updateData.phone = phone;
    if (dateOfBirth) updateData.date_of_birth = dateOfBirth;
    if (bio) updateData.bio = bio;

    console.log('💾 Update data to save:', updateData);

    const { error: userError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (userError) {
      console.error('❌ UPDATE ERROR:', userError);
      throw userError;
    }
    console.log('✅ User updated successfully');

    // B. Update Restaurant table only if user is a merchant/restaurant
    if (restaurantData) {
      console.log('🏪 Updating restaurant data...');
      const { error: restError } = await supabase
        .from('restaurants')
        .update({
          name: restaurantData.nameEn,
          address: restaurantData.address,
          description: restaurantData.description
        })
        .eq('merchant_id', userId);

      if (restError) {
        console.error('❌ RESTAURANT UPDATE ERROR:', restError);
        throw restError;
      }
      console.log('✅ Restaurant updated successfully');
    }

    // Fetch and return the updated user profile
    console.log('📚 Fetching updated profile from database...');
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role, name, phone, date_of_birth, bio, email')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('❌ PROFILE FETCH ERROR:', profileError);
      throw profileError;
    }

    console.log('✅ Profile fetched:', profile);
    console.log('=== UPDATE PROFILE END ===\n');

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: userId,
        email: profile.email,
        role: profile.role,
        fullName: profile.name,
        phone: profile.phone,
        dateOfBirth: profile.date_of_birth,
        bio: profile.bio
      }
    });
  } catch (error) {
    console.error("\n❌ UPDATE PROFILE ERROR:", error.message);
    console.error('Full error:', error);
    console.log('=== UPDATE PROFILE END (ERROR) ===\n');
    res.status(400).json({ error: error.message });
  }
};

// @desc    Google OAuth Sign Up
exports.googleSignUp = async (req, res) => {
  try {
    const { code, redirectUri, access_token, id_token } = req.body;

    if (!code && !access_token && !id_token) {
      return res.status(400).json({ error: "code, access_token or id_token is required" });
    }

    let googleUser;

    // If code is provided, exchange it for tokens
    if (code && redirectUri) {
      try {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_WEB_CLIENT_ID,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }).toString(),
        });

        const tokens = await tokenResponse.json();
        
        if (tokens.error) {
          console.error("Token exchange error:", tokens.error);
          return res.status(400).json({ error: "Failed to exchange authorization code" });
        }

        // Get user info from id_token
        if (tokens.id_token) {
          const tokenInfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokens.id_token)}`);
          const tokenInfo = await tokenInfoResponse.json();
          googleUser = { email: tokenInfo.email, name: tokenInfo.name, id: tokenInfo.sub };
        }
      } catch (error) {
        console.error("Code exchange error:", error);
        return res.status(400).json({ error: "Failed to process authorization code" });
      }
    } else if (id_token) {
      // Verify id_token via Google's tokeninfo endpoint
      const tokenInfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(id_token)}`);
      if (!tokenInfoResponse.ok) {
        console.error("Google id_token verification failed:", tokenInfoResponse.status);
        return res.status(400).json({ error: "Failed to verify Google ID token" });
      }
      const tokenInfo = await tokenInfoResponse.json();
      googleUser = { email: tokenInfo.email, name: tokenInfo.name, id: tokenInfo.sub };
    } else if (access_token) {
      // Use access_token to fetch user info from Google
      const googleUserResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      if (!googleUserResponse.ok) {
        console.error("Google verification failed:", googleUserResponse.status, googleUserResponse.statusText);
        return res.status(400).json({ error: "Failed to verify Google token" });
      }
      googleUser = await googleUserResponse.json();
      googleUser = { email: googleUser.email, name: googleUser.name, id: googleUser.id };
    }

    if (!googleUser || !googleUser.email) {
      return res.status(400).json({ error: "Could not retrieve email from Google" });
    }

    const { email, name: fullName, id: googleId } = googleUser;

    // Check if user already exists
    const { data: existingUser, error: queryError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (!queryError && existingUser) {
      // User exists, sign them in instead
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: googleId + email + 'google'
      });

      if (signInError) {
        console.error("Sign in error for existing user:", signInError);
        // Generate JWT token as fallback
        const jwt = require('jsonwebtoken');
        const jwtToken = jwt.sign(
          { sub: existingUser.id, email: email },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '7d' }
        );

        const { data: profile } = await supabase
          .from('users')
          .select('role, name, phone, date_of_birth, bio')
          .eq('id', existingUser.id)
          .single();

        return res.status(200).json({
          message: "User already exists. Logged in successfully!",
          session: { access_token: jwtToken },
          user: {
            id: existingUser.id,
            email: email,
            role: profile?.role || 'customer',
            fullName: profile?.name,
            phone: profile?.phone,
            dateOfBirth: profile?.date_of_birth,
            bio: profile?.bio
          }
        });
      }

      return res.status(200).json({
        message: "User already exists. Logged in successfully!",
        session: signInData.session,
        user: signInData.user
      });
    }

    // Create new user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: googleId + email + 'google',
      options: {
        data: { full_name: fullName },
        emailRedirectTo: undefined,
      }
    });

    if (signUpError) {
      console.error("Google Sign Up Error:", signUpError.message);
      return res.status(400).json({ error: signUpError.message });
    }

    if (!signUpData?.user) {
      console.error("Google Sign Up: No user returned from signUp");
      return res.status(400).json({ error: "Sign up failed - no user created" });
    }

    const userId = signUpData.user.id;

    // Auto sign-in to get a valid session (signUp with email confirmation may not return a session)
    let session = signUpData.session;
    if (!session) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: googleId + email + 'google'
      });
      if (!signInError && signInData?.session) {
        session = signInData.session;
      }
    }

    // Insert into public.users
    const { error: userError } = await supabase
      .from('users')
      .insert([{
        id: userId,
        email: email,
        name: fullName || email.split('@')[0],
        role: 'customer'
      }]);

    if (userError && !userError.message.includes('duplicate')) {
      console.error("Google Sign Up DB Error:", userError.message);
      return res.status(400).json({ error: userError.message });
    }

    // Fetch the profile with all fields
    const { data: newProfile } = await supabase
      .from('users')
      .select('role, name, phone, date_of_birth, bio')
      .eq('id', userId)
      .single();

    return res.status(201).json({
      message: "Google sign up successful!",
      session: session || { access_token: require('jsonwebtoken').sign({ sub: userId, email }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' }) },
      user: {
        id: userId,
        email: email,
        role: newProfile?.role || 'customer',
        fullName: newProfile?.name,
        phone: newProfile?.phone,
        dateOfBirth: newProfile?.date_of_birth,
        bio: newProfile?.bio
      }
    });
  } catch (error) {
    console.error("Google Sign Up Error:", error);
    res.status(500).json({ error: "Google sign up failed: " + error.message });
  }
};

// @desc    Google OAuth Login
exports.googleLogin = async (req, res) => {
  try {
    const { code, redirectUri, access_token, id_token } = req.body;

    if (!code && !access_token && !id_token) {
      return res.status(400).json({ error: "code, access_token or id_token is required" });
    }

    let googleUser;

    // If code is provided, exchange it for tokens
    if (code && redirectUri) {
      try {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_WEB_CLIENT_ID,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }).toString(),
        });

        const tokens = await tokenResponse.json();
        
        if (tokens.error) {
          console.error("Token exchange error:", tokens.error);
          return res.status(400).json({ error: "Failed to exchange authorization code" });
        }

        // Get user info from id_token
        if (tokens.id_token) {
          const tokenInfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokens.id_token)}`);
          const tokenInfo = await tokenInfoResponse.json();
          googleUser = { email: tokenInfo.email, name: tokenInfo.name, id: tokenInfo.sub };
        }
      } catch (error) {
        console.error("Code exchange error:", error);
        return res.status(400).json({ error: "Failed to process authorization code" });
      }
    } else if (id_token) {
      const tokenInfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(id_token)}`);
      if (!tokenInfoResponse.ok) {
        console.error("Google id_token verification failed:", tokenInfoResponse.status);
        return res.status(400).json({ error: "Failed to verify Google ID token" });
      }
      const tokenInfo = await tokenInfoResponse.json();
      googleUser = { email: tokenInfo.email, name: tokenInfo.name, id: tokenInfo.sub };
    } else if (access_token) {
      const googleUserResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      if (!googleUserResponse.ok) {
        console.error("Google verification failed:", googleUserResponse.status, googleUserResponse.statusText);
        return res.status(400).json({ error: "Failed to verify Google token" });
      }
      googleUser = await googleUserResponse.json();
      googleUser = { email: googleUser.email, name: googleUser.name, id: googleUser.id };
    }

    if (!googleUser || !googleUser.email) {
      return res.status(400).json({ error: "Could not retrieve email from Google" });
    }

    const { email, name: fullName, id: googleId } = googleUser;

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (!existingUser) {
      return res.status(404).json({ error: "User not found. Please sign up first." });
    }

    // Sign in with password (same password as signup)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: googleId + email + 'google'
    });

    if (authError) {
      console.error("Google Login SignIn Error:", authError.message);
      // If password doesn't match, user may have signed up differently
      // Create a JWT token instead
      const jwt = require('jsonwebtoken');
      const jwtToken = jwt.sign(
        { sub: existingUser.id, email: email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      const { data: profile } = await supabase
        .from('users')
        .select('role, name, phone, date_of_birth, bio')
        .eq('id', existingUser.id)
        .single();

      return res.status(200).json({
        message: "Google login successful",
        session: { access_token: jwtToken },
        user: {
          id: existingUser.id,
          email: email,
          role: profile?.role || 'customer',
          fullName: profile?.name,
          phone: profile?.phone,
          dateOfBirth: profile?.date_of_birth,
          bio: profile?.bio
        }
      });
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('users')
      .select('role, name, phone, date_of_birth, bio')
      .eq('id', authData.user.id)
      .single();

    return res.status(200).json({
      message: "Google login successful",
      session: authData.session,
      user: {
        ...authData.user,
        role: profile?.role || 'customer',
        fullName: profile?.name,
        phone: profile?.phone,
        dateOfBirth: profile?.date_of_birth,
        bio: profile?.bio
      }
    });
  } catch (error) {
    console.error("Google Login Error:", error);
    res.status(500).json({ error: "Google login failed: " + error.message });
  }
};

// @desc    Apple OAuth Sign Up
exports.appleSignUp = async (req, res) => {
  try {
    const { identityToken, user } = req.body;

    if (!identityToken) {
      return res.status(400).json({ error: "identityToken is required" });
    }

    // Decode identity token (without verification for now - in production use Apple's public key)
    const parts = identityToken.split('.');
    if (parts.length !== 3) {
      return res.status(400).json({ error: "Invalid identity token format" });
    }

    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    } catch (e) {
      return res.status(400).json({ error: "Failed to decode identity token" });
    }

    const email = user?.email || decoded.email || 'apple-user@example.com';
    const fullName = user?.name 
      ? `${user.name.givenName || ''} ${user.name.familyName || ''}`.trim()
      : email.split('@')[0];
    const appleId = decoded.sub || 'apple-' + Date.now();

    if (!email || email === 'apple-user@example.com') {
      return res.status(400).json({ error: "Could not retrieve email from Apple" });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    let authData;
    if (existingUser) {
      // User exists, try to sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: appleId + email + 'apple'
      });

      if (signInError && !signInError.message.includes('Invalid')) {
        console.error("Apple sign in error:", signInError);
      }

      // Generate JWT token
      const jwt_token = require('jsonwebtoken');
      const token = jwt_token.sign(
        { sub: existingUser.id, email: email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      authData = {
        session: { access_token: token },
        user: { id: existingUser.id, email: email }
      };
    } else {
      // Create new user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUpWithPassword({
        email: email,
        password: appleId + email + 'apple'
      });

      if (signUpError) {
        console.error("Apple Sign Up Error:", signUpError.message);
        return res.status(400).json({ error: signUpError.message });
      }

      const userId = signUpData.user.id;

      // Insert into public.users
      const { error: userError } = await supabase
        .from('users')
        .insert([{
          id: userId,
          email: email,
          name: fullName,
          role: 'customer'
        }]);

      if (userError && !userError.message.includes('duplicate')) {
        console.error("Apple Sign Up DB Error:", userError.message);
        return res.status(400).json({ error: userError.message });
      }

      authData = signUpData;
    }

    return res.status(201).json({
      message: "Apple sign up successful!",
      session: authData.session,
      user: authData.user
    });
  } catch (error) {
    console.error("Apple Sign Up Error:", error);
    res.status(500).json({ error: "Apple sign up failed: " + error.message });
  }
};

// @desc    Apple OAuth Login
exports.appleLogin = async (req, res) => {
  try {
    const { identityToken, user } = req.body;

    if (!identityToken) {
      return res.status(400).json({ error: "identityToken is required" });
    }

    // Decode identity token
    const parts = identityToken.split('.');
    if (parts.length !== 3) {
      return res.status(400).json({ error: "Invalid identity token format" });
    }

    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    } catch (e) {
      return res.status(400).json({ error: "Failed to decode identity token" });
    }

    const email = user?.email || decoded.email || 'apple-user@example.com';
    const appleId = decoded.sub || 'apple-' + Date.now();

    if (!email || email === 'apple-user@example.com') {
      return res.status(400).json({ error: "Could not retrieve email from Apple" });
    }

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (!existingUser) {
      return res.status(404).json({ error: "User not found. Please sign up first." });
    }

    // Sign in with password (same password as signup)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: appleId + email + 'apple'
    });

    if (authError) {
      console.error("Apple Login SignIn Error:", authError.message);
      // If password doesn't match, user may have signed up differently
      // Create a JWT token instead
      const jwt = require('jsonwebtoken');
      const jwtToken = jwt.sign(
        { sub: existingUser.id, email: email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      const { data: profile } = await supabase
        .from('users')
        .select('role, name')
        .eq('id', existingUser.id)
        .single();

      return res.status(200).json({
        message: "Apple login successful",
        session: { access_token: jwtToken },
        user: {
          id: existingUser.id,
          email: email,
          role: profile?.role || 'customer',
          fullName: profile?.name,
        }
      });
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('users')
      .select('role, name')
      .eq('id', authData.user.id)
      .single();

    return res.status(200).json({
      message: "Apple login successful",
      session: authData.session,
      user: {
        ...authData.user,
        role: profile?.role || 'customer',
        fullName: profile?.name,
      }
    });
  } catch (error) {
    console.error("Apple Login Error:", error);
    res.status(500).json({ error: "Apple login failed: " + error.message });
  }
};

// @desc    Verify Email Code
exports.verifyEmailCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: "Email and code are required" });
    }

    // Get the stored verification code
    const emailController = require('./emailController');
    const storedCodeData = emailController.verificationCodes.get(email);

    // Validate the code exists and hasn't expired
    if (!storedCodeData) {
      return res.status(400).json({ error: "No verification code found. Please request a new one." });
    }

    if (Date.now() > storedCodeData.expiry) {
      // Code has expired, remove it
      emailController.verificationCodes.delete(email);
      return res.status(400).json({ error: "Verification code has expired. Please request a new one." });
    }

    // Normalize code for comparison - convert to string and trim whitespace
    const normalizedCode = String(code).trim();
    const normalizedStoredCode = String(storedCodeData.code).trim();
    
    console.log('Code verification:');
    console.log('  Received code:', `"${normalizedCode}"`, `(type: ${typeof normalizedCode}, length: ${normalizedCode.length})`);
    console.log('  Stored code:', `"${normalizedStoredCode}"`, `(type: ${typeof normalizedStoredCode}, length: ${normalizedStoredCode.length})`);
    
    // Check if the code matches
    if (normalizedCode !== normalizedStoredCode) {
      console.log('❌ Code mismatch!');
      return res.status(400).json({ error: "Invalid verification code" });
    }
    
    console.log('✓ Code matches!');

    // Remove the used code
    emailController.verificationCodes.delete(email);

    console.log('\n=== VERIFY EMAIL CODE START ===');
    console.log('Email to verify:', email);

    // Email verification is skipped - column doesn't exist in schema
    console.log('✓ Email verification skipped (using auto-verified system)');

    // Get the user from Supabase
    console.log('Fetching user data from database...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError) {
      console.error('❌ Error fetching user:', userError.message);
      return res.status(404).json({ error: "User not found: " + userError.message });
    }

    if (!userData) {
      console.error('❌ User not found in database');
      return res.status(404).json({ error: "User not found" });
    }

    console.log('✓ User found:', userData.id);

    // Create a JWT token for the user
    // This is a simple JWT token - in production, use proper key management
    const jwtSecret = process.env.JWT_SECRET || process.env.JWT_S3CRET;
    console.log('Generating JWT token...');
    console.log('JWT_SECRET env var exists:', !!process.env.JWT_SECRET);
    console.log('JWT_S3CRET env var exists:', !!process.env.JWT_S3CRET);
    console.log('Using secret:', jwtSecret ? 'YES (length: ' + jwtSecret.length + ')' : 'NO - USING DEFAULT');
    
    const tokenPayload = {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };

    let token;
    try {
      token = jwt.sign(tokenPayload, jwtSecret || 'your-secret-key-change-in-production');
      console.log('✓ JWT token generated successfully');
      console.log('Token length:', token.length);
      console.log('Token first 30 chars:', token.substring(0, 30));
    } catch (signErr) {
      console.error('❌ Error signing JWT token:', signErr.message);
      return res.status(500).json({ error: "Failed to generate authentication token: " + signErr.message });
    }

    console.log('✓ Email verified successfully for user:', userData.id);
    console.log('=== VERIFY EMAIL CODE END ===\n');

    res.status(200).json({ 
      message: "Email verified successfully",
      success: true,
      access_token: token,
      session: {
        access_token: token,
        user: {
          id: userData.id,
          email: userData.email
        }
      },
      user: {
        id: userData.id,
        email: userData.email,
        fullName: userData.name,
        phone: userData.phone,
        dateOfBirth: userData.date_of_birth,
        bio: userData.bio,
        role: userData.role
      }
    });
  } catch (error) {
    console.error("❌ Email verification error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.log('=== VERIFY EMAIL CODE END (ERROR) ===\n');
    res.status(500).json({ error: "Email verification failed: " + error.message });
  }
};

// @desc    Reset Password with token
exports.resetPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    const userId = req.user.id; // From auth middleware

    if (!password || !confirmPassword) {
      return res.status(400).json({ error: "Password and confirm password are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Update password in Supabase Auth
    const { data, error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json({ 
      message: "Password reset successfully",
      user: data.user
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ error: "Failed to reset password: " + error.message });
  }
};

// @desc    Complete profile setup after first login
exports.completeProfileSetup = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, phone, bio } = req.body;

    if (!fullName) {
      return res.status(400).json({ error: "Full name is required" });
    }

    console.log('Completing profile for user:', userId);
    console.log('Data:', { fullName, phone, bio });

    // Update user profile in Supabase
    const { data, error } = await supabase
      .from('users')
      .update({
        name: fullName,
        phone: phone || null,
      })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(400).json({ error: "Failed to update profile: " + error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      message: "Profile setup completed successfully",
      user: data[0]
    });
  } catch (error) {
    console.error("Profile Setup Error:", error);
    res.status(500).json({ error: "Failed to complete profile setup: " + error.message });
  }
};

// @desc    Verify reset code (without password)
exports.verifyResetCode = async (req, res) => {
  try {
    const { email, resetCode } = req.body;
    const emailController = require('./emailController');

    // Validate input
    if (!email || !resetCode) {
      return res.status(400).json({ error: "Email and reset code are required" });
    }

    // Check if reset code exists and is valid
    if (!emailController.resetCodes || !emailController.resetCodes.has(email)) {
      return res.status(400).json({ error: "No reset code found for this email" });
    }

    const resetCodeData = emailController.resetCodes.get(email);

    // Check if code is expired
    if (Date.now() > resetCodeData.expiry) {
      emailController.resetCodes.delete(email);
      return res.status(400).json({ error: "Reset code has expired" });
    }

    // Check if code matches
    if (resetCode.trim() !== resetCodeData.code.trim()) {
      return res.status(400).json({ error: "Invalid reset code" });
    }

    res.status(200).json({
      message: "Reset code verified successfully",
      success: true
    });
  } catch (error) {
    console.error("Verify Reset Code Error:", error);
    res.status(500).json({ error: "Failed to verify reset code: " + error.message });
  }
};

// @desc    Verify reset code and update password
exports.resetPasswordWithCode = async (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;
    const emailController = require('./emailController');

    // Validate input
    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({ error: "Email, reset code, and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Check if reset code exists and is valid
    if (!emailController.resetCodes || !emailController.resetCodes.has(email)) {
      return res.status(400).json({ error: "No reset code found for this email" });
    }

    const resetCodeData = emailController.resetCodes.get(email);

    // Check if code is expired
    if (Date.now() > resetCodeData.expiry) {
      emailController.resetCodes.delete(email);
      return res.status(400).json({ error: "Reset code has expired" });
    }

    // Check if code matches
    if (resetCode.trim() !== resetCodeData.code.trim()) {
      return res.status(400).json({ error: "Invalid reset code" });
    }

    // Find user by email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: "User not found" });
    }

    // Hash new password
    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database - using upsert to handle missing columns
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', userData.id)
      .select();

    if (updateError) {
      console.error("Password update error:", updateError);
      return res.status(400).json({ error: "Failed to update password: " + updateError.message });
    }

    // Delete used reset code
    emailController.resetCodes.delete(email);

    res.status(200).json({
      message: "Password reset successfully",
      success: true
    });
  } catch (error) {
    console.error("Reset Password with Code Error:", error);
    res.status(500).json({ error: "Failed to reset password: " + error.message });
  }
};

// @desc    Check if user profile is complete
exports.checkProfileCompletion = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('users')
      .select('id, name, phone, email, profile_completed')
      .eq('id', userId)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json({
      profileCompleted: data.profile_completed === true,
      user: data
    });
  } catch (error) {
    console.error("Check Profile Error:", error);
    res.status(500).json({ error: "Failed to check profile: " + error.message });
  }
};