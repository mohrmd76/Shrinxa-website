import { supabase } from "../supabaseClient.js";
window.supabaseClient = supabase;

const loading = document.getElementById("loading");
const denied = document.getElementById("denied");
const admin = document.getElementById("admin");
const adminEmail = document.getElementById("adminEmail");
const logoutBtn = document.getElementById("logoutBtn");

// if page doesn't have admin layout, STOP (do nothing)
if (!loading || !denied || !admin || !adminEmail || !logoutBtn) {
  // allow admin pages that worked before to keep working
} else {
  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "../login.html";
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, is_admin")
      .eq("email", user.email)
      .maybeSingle();

    loading.classList.add("hidden");

    if (!profile || !profile.is_admin) {
      denied.classList.remove("hidden");
      return;
    }

    adminEmail.textContent = profile.email || user.email;
    admin.classList.remove("hidden");
  }

  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "../login.html";
  });

  checkAdmin();
}
