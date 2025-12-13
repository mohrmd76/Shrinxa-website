console.log("AUTH.JS IS LOADED ✅");
// auth.js — New file + ONLY point 1 (auto navbar UI updater)

(function () {
  // Always expose Auth first (so login.html never breaks)
  const api = {};
  window.Auth = api;
  window.ShrinxaAuth = api;

  const SUPABASE_URL = "https://fgrjojxwevllnjdixiyd.supabase.co";
  const SUPABASE_KEY = "sb_publishable_k5D9JKO5lMCHlju-WhlSAQ_XEiEruT_";

  let supabaseClient = null;

  try {
    if (window.supabase && window.supabase.createClient) {
      supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );
    }
  } catch (e) {}

  api.supabaseClient = supabaseClient;

  function needClient() {
    if (!supabaseClient) {
      throw new Error("Supabase not loaded");
    }
    return supabaseClient;
  }

  // ---------- AUTH CORE ----------

  api.signIn = async (email, password) => {
    const c = needClient();
    const { data, error } = await c.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  api.getSession = async () => {
    const c = needClient();
    const { data } = await c.auth.getSession();
    return data.session ?? null;
  };

  api.getCurrentUser = async () => {
    const session = await api.getSession();
    if (session?.user) return session.user;

    const c = needClient();
    const { data } = await c.auth.getUser();
    return data.user ?? null;
  };

  api.requireAuth = async (redirectTo = "login.html") => {
    const user = await api.getCurrentUser();
    if (!user) {
      window.location.href = redirectTo;
      return null;
    }
    return user;
  };

  api.signOut = async () => {
    const c = needClient();
    await c.auth.signOut();
  };

  api.logout = async (redirectTo = "index.html") => {
    await api.signOut();
    window.location.href = redirectTo;
  };

  // ---------- PROFILE ----------

  api.signUpWithProfile = async (payload) => {
    const c = needClient();
    const {
      email, password, full_name, company, phone, address, city, province,
    } = payload || {};

    const { data, error } = await c.auth.signUp({
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
  };

  api.getProfileFromUser = (user) => {
    const m = user?.user_metadata || {};
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
  };

  api.updateProfileMetadata = async (profilePatch) => {
    const c = needClient();
    const { data, error } = await c.auth.updateUser({
      data: { ...(profilePatch || {}) },
    });
    if (error) throw error;
    return data;
  };

  // ---------- POINT 1: AUTO NAVBAR UI UPDATER ----------

  api.initNavAuthUI = async () => {
    let session = null;
    try { session = await api.getSession(); } catch (_) {}

    const user = session?.user ?? null;

    const signins = document.querySelectorAll(".nav-signin");
    const userMenu = document.getElementById("user-menu");
    const userMenuName = document.getElementById("userMenuName");

    if (user) {
      const p = api.getProfileFromUser(user);
      signins.forEach(el => (el.style.display = "none"));
      if (userMenu) userMenu.style.display = "flex";
      if (userMenuName) {
        userMenuName.textContent = p.full_name
          ? "Hi " + p.full_name
          : "Hi " + (user.email || "User");
      }
    } else {
      signins.forEach(el => (el.style.display = ""));
      if (userMenu) userMenu.style.display = "none";
    }
  };

  // Auto run on page load
  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
      try { api.initNavAuthUI(); } catch (_) {}
    });
  }

  // Auto update on login / logout
  try {
    if (supabaseClient) {
      supabaseClient.auth.onAuthStateChange(() => {
        try { api.initNavAuthUI(); } catch (_) {}
      });
    }
  } catch (_) {}
})();
