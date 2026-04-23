const supabase = require('../config/supabase');
const { supabaseAdmin } = require('../config/supabase');

/**
 * Shape a DB row + joined user into the response we want the client to see.
 */
const USER_SELECT = 'id, name, profile_picture_url';

function formatReview(row) {
  const user = row.users || null;
  return {
    id: row.id,
    restaurant_id: row.restaurant_id,
    user_id: row.user_id,
    rating: row.rating,
    comment: row.comment,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user: user
      ? {
          id: user.id,
          full_name: user.name || 'Guest',
          avatar_url: user.profile_picture_url || null,
        }
      : null,
  };
}

/**
 * GET /api/reviews/:restaurant_id
 * Public - no auth required.
 * Returns { reviews, summary: { total, average, distribution } }
 */
exports.listByRestaurant = async (req, res) => {
  try {
    const restaurant_id = (req.params.restaurant_id || '').trim();
    if (!restaurant_id) {
      return res.status(400).json({ error: 'Restaurant ID is required' });
    }

    const { data, error } = await supabase
      .from('reviews')
      .select('id, restaurant_id, user_id, rating, comment, created_at, updated_at, users:user_id (id, name, profile_picture_url)')
      .eq('restaurant_id', restaurant_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const reviews = (data || []).map(formatReview);
    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0);
    const average = total > 0 ? Number((sum / total).toFixed(2)) : 0;

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of reviews) {
      const k = Math.round(Number(r.rating));
      if (distribution[k] != null) distribution[k] += 1;
    }

    res.status(200).json({
      reviews,
      summary: { total, average, distribution },
    });
  } catch (error) {
    console.error('❌ listByRestaurant error:', error.message);
    res.status(400).json({ error: error.message });
  }
};

/**
 * POST /api/reviews/:restaurant_id
 * Auth required. Body: { rating: 1..5, comment?: string }
 * Upserts so a user always has exactly one review per restaurant.
 */
exports.upsertReview = async (req, res) => {
  try {
    const user_id = req.user.id;
    const restaurant_id = (req.params.restaurant_id || '').trim();
    const rawRating = Number(req.body?.rating);
    const comment = (req.body?.comment ?? '').toString().trim();

    if (!restaurant_id) {
      return res.status(400).json({ error: 'Restaurant ID is required' });
    }
    if (!Number.isFinite(rawRating) || rawRating < 1 || rawRating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }
    const rating = Math.round(rawRating);
    if (comment.length > 2000) {
      return res.status(400).json({ error: 'Comment must be 2000 characters or fewer' });
    }

    // Make sure the restaurant exists to give a clean error.
    const { data: rest, error: restErr } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .eq('id', restaurant_id)
      .single();
    if (restErr || !rest) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const payload = {
      restaurant_id,
      user_id,
      rating,
      comment: comment || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('reviews')
      .upsert(payload, { onConflict: 'restaurant_id,user_id' })
      .select('id, restaurant_id, user_id, rating, comment, created_at, updated_at, users:user_id (id, name, profile_picture_url)')
      .single();

    if (error) throw error;

    // Keep restaurants.rating in sync with the new average (best-effort).
    try {
      const { data: allRatings } = await supabaseAdmin
        .from('reviews')
        .select('rating')
        .eq('restaurant_id', restaurant_id);
      if (allRatings && allRatings.length > 0) {
        const avg = allRatings.reduce((a, r) => a + Number(r.rating), 0) / allRatings.length;
        await supabaseAdmin
          .from('restaurants')
          .update({ rating: Number(avg.toFixed(2)) })
          .eq('id', restaurant_id);
      }
    } catch (syncErr) {
      console.warn('⚠️ Could not sync restaurants.rating:', syncErr.message);
    }

    res.status(200).json({ message: 'Review saved', review: formatReview(data) });
  } catch (error) {
    console.error('❌ upsertReview error:', error.message);
    res.status(400).json({ error: error.message });
  }
};

/**
 * DELETE /api/reviews/:review_id
 * Auth required. Only the owner can delete.
 */
exports.deleteReview = async (req, res) => {
  try {
    const user_id = req.user.id;
    const review_id = (req.params.review_id || '').trim();
    if (!review_id) {
      return res.status(400).json({ error: 'Review ID is required' });
    }

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('reviews')
      .select('id, user_id, restaurant_id')
      .eq('id', review_id)
      .single();
    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Review not found' });
    }
    if (existing.user_id !== user_id) {
      return res.status(403).json({ error: 'You can only delete your own review' });
    }

    const { error } = await supabaseAdmin
      .from('reviews')
      .delete()
      .eq('id', review_id);

    if (error) throw error;

    // Keep restaurants.rating in sync (best-effort).
    try {
      const { data: allRatings } = await supabaseAdmin
        .from('reviews')
        .select('rating')
        .eq('restaurant_id', existing.restaurant_id);
      const avg = allRatings && allRatings.length > 0
        ? allRatings.reduce((a, r) => a + Number(r.rating), 0) / allRatings.length
        : null;
      await supabaseAdmin
        .from('restaurants')
        .update({ rating: avg != null ? Number(avg.toFixed(2)) : null })
        .eq('id', existing.restaurant_id);
    } catch (syncErr) {
      console.warn('⚠️ Could not sync restaurants.rating:', syncErr.message);
    }

    res.status(200).json({ message: 'Review deleted' });
  } catch (error) {
    console.error('❌ deleteReview error:', error.message);
    res.status(400).json({ error: error.message });
  }
};

/**
 * GET /api/reviews/:restaurant_id/mine
 * Auth required. Returns the caller's review for this restaurant, or null.
 */
exports.getMyReview = async (req, res) => {
  try {
    const user_id = req.user.id;
    const restaurant_id = (req.params.restaurant_id || '').trim();
    if (!restaurant_id) {
      return res.status(400).json({ error: 'Restaurant ID is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('id, restaurant_id, user_id, rating, comment, created_at, updated_at, users:user_id (id, name, profile_picture_url)')
      .eq('restaurant_id', restaurant_id)
      .eq('user_id', user_id)
      .maybeSingle();

    if (error) throw error;
    res.status(200).json({ review: data ? formatReview(data) : null });
  } catch (error) {
    console.error('❌ getMyReview error:', error.message);
    res.status(400).json({ error: error.message });
  }
};
