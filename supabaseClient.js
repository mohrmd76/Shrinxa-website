// supabaseClient.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1?bundle";

// ✅ Replace these with your own project values:
const SUPABASE_URL = "https://fgrjojxwevllnjdixiyd.supabase.co";
const SUPABASE_ANON_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncmpvanh3ZXZsbG5qZGl4aXlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODU4MjgsImV4cCI6MjA4MTA2MTgyOH0.DfqCgNf_GpnaMqFbePxCrwNcRJbptiS9fzdSwpj6lbQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
