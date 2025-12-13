console.log("AUTH.JS IS LOADED ✅");

// Shared Supabase auth helper for Shrinxa (Option 3: store profile in Auth user_metadata)
// - Uses ONLY Supabase Auth (no public.profiles writes) to avoid RLS issues.
// - Your signup form should collect: full_name, company, phone, address, city, province, email, password.
//
// IMPORTANT: Keep SECRET keys off the front-end. Use only the publishable/anon key here.

const SUPABASE_URL = "https://fgrjojxwevllnjdixiyd.supabase.co";
const SUPABASE_KEY = "sb_publishable_k5D9JKO5lMCHlju-WhlSAQ_XEiEruT_";

// Requires <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> BEFORE this file.
// If this file loads before supabase-js, auth will not work.
if (!window.supabase || !window.supabase.createClient) {
  console.error(
    "[ShrinxaAuth] Supabase library not found. Make sure supabase-js loads BEFORE auth.js:\n" +
    '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n' +
    '<script src="auth.js"></script>'
  );
}

// Create client (will be undefined if supabase-js isn't loaded)
const supabaseClient = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// ---------- Basics ----------

async function getCurrentUser() {
  if (!supabaseClient) return null;

  // Prefer session user (fast + works on refresh)
  const session = await getSession();
  if (session?.user) return session.user;

  // Fallback
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) {
    console.error("getCurrentUser:", error.message);
    return null;
  }
  return data.user ?? null;
}

async function getSession() {
  if (!supabaseClient) return null;

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
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  window.location.href = redirectTo;
}

// ---------- Auth actions ----------

async function signIn(email, password) {
  if (!supabaseClient) throw new Error("Supabase client not initialized. Check script load order.");

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

// Option 3: Store profile fields in Auth user_metadata (no profiles table insert)
async function signUpWithProfile(payload) {
  if (!supabaseClient) throw new Error("Supabase client not initialized. Check script load order.");

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
  if (!supabaseClient) throw new Error("Supabase client not initialized. Check script load order.");

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


// ---------- Optional UI binding (multi-page) ----------
// If your pages have:
// - a Sign in link with class "nav-signin"
// - a user menu container with id "user-menu" (and optional span id "userMenuName")
// this will automatically show/hide them based on Supabase session.
function initNavAuthUI() {
  if (!supabaseClient) return;

  const signins = document.querySelectorAll(".nav-signin");
  const userMenu = document.getElementById("user-menu");
  const userMenuName = document.getElementById("userMenuName");

  const apply = async () => {
    // ✅ Use session on every load (this is what fixes “refresh but not logged in” UI)
    const session = await getSession();
    const user = session?.user ?? null;

    if (user) {
      const p = getProfileFromUser(user);
      signins.forEach(el => el.style.display = "none");
      if (userMenu) userMenu.style.display = "flex";
      if (userMenuName) {
        userMenuName.textContent = p.full_name
          ? ("Hi " + p.full_name)
          : ("Hi " + (user.email || "Customer"));
      }
    } else {
      signins.forEach(el => el.style.display = "");
      if (userMenu) userMenu.style.display = "none";
    }
  };

  // initial
  apply();

  // live updates
  try {
    supabaseClient.auth.onAuthStateChange(() => apply());
  } catch (e) {}
}

// Auto-run on every page (safe: does nothing if elements not present)
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    try { initNavAuthUI(); } catch (e) {}
  });
}

// Expose
window.ShrinxaAuth.initNavAuthUI = initNavAuthUI;
