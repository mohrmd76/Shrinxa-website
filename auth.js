// Shared Supabase auth helper for Shrinxa (static site)
// IMPORTANT: This uses a publishable (public) key. Do NOT put secret keys in frontend code.

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
  return data.user || null;
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

// Sign in with email/password
async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// Create account + save profile fields to `public.profiles`
async function signUpWithProfile(payload) {
  const {
    email,
    password,
    full_name,
    company,
    phone,
    address,
    city,
    province,
    postal_code,
    business_type
  } = payload;

  // 1) Create auth user
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        company,
        phone,
        address,
        city,
        province,
        postal_code,
        business_type
      }
    }
  });

  if (error) throw error;

  // 2) Upsert profile row (works even if email confirmation is required)
  const userId = data.user?.id;
  if (userId) {
    const { error: upsertError } = await supabaseClient
      .from("profiles")
      .upsert(
        {
          id: userId,
          full_name,
          company,
          phone,
          address,
          city,
          province,
          postal_code,
          business_type
        },
        { onConflict: "id" }
      );

    if (upsertError) throw upsertError;
  }

  return data;
}

// Logout and go back to home page
async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}
