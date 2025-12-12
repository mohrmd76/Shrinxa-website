// Shared Supabase auth helper for Shrinxa

const SUPABASE_URL = "https://fgrjojxwevllnjdixiyd.supabase.co";
const SUPABASE_KEY = "sb_publishable_k5D9JKO5lMCHlju-WhlSAQ_XEiEruT_";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Get current user (returns user or null)
async function getCurrentUser() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) {
    console.error("getCurrentUser error:", error.message);
    return null;
  }
  return data.user;
}

// Require user to be logged in, otherwise redirect to login page
async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  return user;
}

// Logout and go back to home page
async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}
