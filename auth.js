// Shared Supabase auth helper for Shrinxa (Option 3: store profile in Auth user_metadata)
// - Uses ONLY Supabase Auth (no public.profiles writes) to avoid RLS issues.
// - Your signup form should collect: full_name, company, phone, address, city, province, email, password.
//
// IMPORTANT: Keep SECRET keys off the front-end. Use only the publishable/anon key here.

const SUPABASE_URL = "https://fgrjojxwevllnjdixiyd.supabase.co";
const SUPABASE_KEY = "sb_publishable_k5D9JKO5lMCHlju-WhlSAQ_XEiEruT_";

// Requires <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> BEFORE this file.
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------- Basics ----------

async function getCurrentUser() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) {
    console.error("getCurrentUser:", error.message);
    return null;
  }
  return data.user ?? null;
}

async function getSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.error("getSession:", error.message);
    return null;
  }
  return data.session ?? null;
}

async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    // Always redirect to your real login page
    window.location.href = "login.html";
    return null;
  }
  return user;
}

async function logout(redirectTo = "index.html") {
  await supabaseClient.auth.signOut();
  window.location.href = redirectTo;
}

// ---------- Auth actions ----------

async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

// Option 3: Store profile fields in Auth user_metadata (no profiles table insert)
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
    // ignore any extra fields safely
  } = payload;

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: full_name ?? "",
        company: company ?? "",
        phone: phone ?? "",
        address: address ?? "",
        city: city ?? "",
        province: province ?? "",
      },
    },
  });

  if (error) throw error;
  return data;
}

// Read profile from user_metadata
function getProfileFromUser(user) {
  const m = (user && user.user_metadata) ? user.user_metadata : {};
  return {
    id: user?.id ?? null,
    email: user?.email ?? null,
    full_name: m.full_name ?? "",
    company: m.company ?? "",
    phone: m.phone ?? "",
    address: m.address ?? "",
    city: m.city ?? "",
    province: m.province ?? "",
  };
}

// Optional: allow user to update their metadata later
async function updateProfileMetadata(profilePatch) {
  // profilePatch can include: full_name, company, phone, address, city, province
  const { data, error } = await supabaseClient.auth.updateUser({
    data: { ...profilePatch },
  });
  if (error) throw error;
  return data;
}

// ---------- Expose helpers globally ----------
window.ShrinxaAuth = {
  supabaseClient,
  getCurrentUser,
  getSession,
  requireAuth,
  logout,
  signIn,
  signUpWithProfile,
  getProfileFromUser,
  updateProfileMetadata,
};
