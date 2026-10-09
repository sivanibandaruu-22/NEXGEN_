
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error("Missing Supabase environment variables.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const { error } = await supabase
  .from("organizations")
  .select("id")
  .limit(1);

if (error) {
  console.error("Supabase query failed:", error.message);
  process.exit(1);
}

console.log("Supabase connection successful. No data was changed.");
