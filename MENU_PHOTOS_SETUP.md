# Menu Photos Feature - Complete Setup Guide

## Database Setup

### 1. Run this SQL Migration
Location: `database/migrations/021_create_menu_photos_table.sql`

**What it does:**
- Creates `menu_photos` table to store top 3 menu pictures per restaurant
- Max 3 photos per restaurant (display_order 1-3)
- Each photo has: URL, title, description, and order
- Includes Row Level Security (RLS) policies:
  - Merchants can upload/manage their own photos
  - Customers see only photos from published restaurants
  - Public access to view published restaurant photos

**Schema:**
```sql
menu_photos:
├─ id (UUID) - Primary Key
├─ restaurant_id (UUID) - Foreign Key to restaurants
├─ photo_url (TEXT) - Supabase Storage URL
├─ title (VARCHAR) - Photo title/caption
├─ description (TEXT) - Photo description
├─ display_order (INT) - Order 1-3
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)
```

### 2. Execute in Supabase
1. Go to Supabase Dashboard
2. SQL Editor
3. Paste entire SQL migration content
4. Click "Run"
5. Verify: You should see "Success" message

---

## What's Next (To Be Implemented)

### Backend Endpoints Needed
```
POST   /api/menu-photos/:restaurantId      - Upload photo
GET    /api/menu-photos/:restaurantId      - Get restaurant's photos
DELETE /api/menu-photos/:photoId           - Delete photo
PUT    /api/menu-photos/:photoId           - Update photo order/title
```

### Frontend Changes Needed
**Merchant Side (Upload):**
- Add "Menu Photos" section to restaurant-listing.tsx
- Photo picker interface (limit 3 photos)
- Display order selector
- Delete/update UI

**Customer Side (View):**
- Fetch menu_photos in restaurant-detail.tsx
- Display in "Photos" section (horizontal scroll)
- Show title/description on tap

### Storage Structure
- Bucket: `menu-photos`
- Path format: `/restaurant-{id}/photo-{photoId}.jpg`

---

## Features Overview
✅ Upload up to 3 menu photos
✅ Custom display order
✅ Photo titles and descriptions
✅ Auto-delete on restaurant deletion
✅ RLS security policies
✅ Merchant-only management
✅ Customer public view

---

## Next Steps
1. ✅ Run SQL migration in Supabase
2. Create backend endpoints
3. Create merchant upload UI
4. Integrate into customer restaurant view
5. Test end-to-end
