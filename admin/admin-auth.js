import { supabase } from "../supabaseClient.js";
window.supabaseClient = supabase;

const loading = document.getElementById("loading");
const denied = document.getElementById("denied");
const admin = document.getElementById("admin");
const adminEmail = document.getElementById("adminEmail");
const logoutBtn = document.getElementById("logoutBtn");

async function checkAdmin() {
  // 1) Must be logged in
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    window.location.href = "../login.html";
    return;
  }

  // 2) Check admin flag
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("email, is_admin, blocked")
    .eq("id", user.id)
    .single();

  loading.classList.add("hidden");

  if (error || !profile || profile.blocked || !profile.is_admin) {
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
