require("dotenv").config();
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

(async () => {
  // Test SELECT (should work)
  const r1 = await fetch(url + "/rest/v1/menu_items?select=*&limit=0", {
    headers: { apikey: key, Authorization: "Bearer " + key }
  });
  console.log("SELECT status:", r1.status);

  // Test INSERT
  const r2 = await fetch(url + "/rest/v1/menu_items", {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify({
      restaurant_id: "aca4d8c7-49ae-4181-ae3e-6835a2fc02aa",
      name: "Direct REST Test",
      price: 5.00,
      category: "Main"
    })
  });
  const body = await r2.text();
  console.log("INSERT status:", r2.status, body.substring(0, 200));

  // Also check: what does the restaurants table RLS look like?
  const r3 = await fetch(url + "/rest/v1/restaurants?select=*", {
    headers: { apikey: key, Authorization: "Bearer " + key }
  });
  console.log("Restaurants SELECT status:", r3.status);

  // Check users table
  const r4 = await fetch(url + "/rest/v1/users?select=id,email,role&limit=5", {
    headers: { apikey: key, Authorization: "Bearer " + key }
  });
  const usersBody = await r4.text();
  console.log("Users SELECT status:", r4.status, usersBody.substring(0, 200));

  process.exit(0);
})();
