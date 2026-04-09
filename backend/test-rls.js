const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const SECRET = process.env.JWT_SECRET;
const userId = "e32558f9-5847-414e-9d83-e4389810a157";

// Create a Supabase-format JWT
const token = jwt.sign({
  sub: userId,
  role: "authenticated",
  aud: "authenticated",
  iss: "supabase",
  iat: Math.floor(Date.now()/1000),
  exp: Math.floor(Date.now()/1000) + 3600,
}, SECRET);

console.log("Generated Supabase JWT");

// Create a new client with this token
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: "Bearer " + token } }
});

(async () => {
  const {data, error} = await supabase.from("menu_items").insert({
    restaurant_id: "aca4d8c7-49ae-4181-ae3e-6835a2fc02aa",
    name: "Test Auth Dish",
    description: "Testing with custom JWT",
    price: 5.00,
    category: "Main",
    is_available: true
  }).select();
  console.log("Result:", JSON.stringify(data));
  console.log("Error:", error ? error.message : "none");
  
  if (data && data[0]) {
    console.log("SUCCESS! Columns:", Object.keys(data[0]));
    // Clean up
    await supabase.from("menu_items").delete().eq("id", data[0].id);
    console.log("Cleaned up test item");
  }
  process.exit(0);
})();
