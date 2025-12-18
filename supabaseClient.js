// supabaseClient.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ✅ Replace these with your own project values:
const SUPABASE_URL = "PASTE_YOUR_SUPABASE_URL_HERE";
const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
