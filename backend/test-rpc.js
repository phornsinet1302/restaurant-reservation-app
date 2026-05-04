require("dotenv").config();
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

(async () => {
  // Check if there's an RPC endpoint for inserting menu items
  const endpoints = [
    "/rest/v1/rpc/add_menu_item",
    "/rest/v1/rpc/insert_menu_item", 
    "/rest/v1/rpc/create_menu_item",
  ];
  
  for (const ep of endpoints) {
    const r = await fetch(url + ep, {
      method: "POST",
      headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    console.log(ep, "->", r.status, (await r.text()).substring(0, 100));
  }

  // Try to list all available RPC functions
  const r2 = await fetch(url + "/rest/v1/", {
    headers: { apikey: key, Authorization: "Bearer " + key }
  });
  console.log("\nOpenAPI status:", r2.status);
  if (r2.status === 200) {
    const spec = await r2.json();
    const paths = Object.keys(spec.paths || {}).filter(p => p.includes("rpc"));
    console.log("RPC endpoints:", paths.length > 0 ? paths.join(", ") : "none found");
    
    // Also show table info
    const defs = Object.keys(spec.definitions || {});
    console.log("Tables:", defs.join(", "));
  }

  process.exit(0);
})();
