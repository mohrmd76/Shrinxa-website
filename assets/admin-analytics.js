/* Admin Analytics (Shrinxa)
   - Runs ONLY for logged-in admin email: info@shrinxa.com
   - Sends admin events to Edge Function: track-admin-event
   - Writes to BOTH: analytics_events + audit_logs (when action/entity provided)
*/
(function () {
  const ADMIN_EMAIL = "info@shrinxa.com";
  const STORAGE_ADMIN_SESSION = "shrinxa_admin_session_id";

  const SUPABASE_URL = "https://fgrjojxwevllnjdixiyd.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncmpvanh3ZXZsbG5qZGl4aXlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODU4MjgsImV4cCI6MjA4MTA2MTgyOH0.DfqCgNf_GpnaMqFbePxCrwNcRJbptiS9fzdSwpj6lbQ";

  const TRACK_URL = `${SUPABASE_URL}/functions/v1/track-admin-event`;

  function safeText(str, maxLen) {
    if (!str || typeof str !== "string") return "";
    const s = str.trim();
    return s.length > maxLen ? s.slice(0, maxLen) : s;
  }

  function getDeviceType() {
    const ua = (navigator.userAgent || "").toLowerCase();
    if (ua.includes("ipad") || ua.includes("tablet")) return "tablet";
    if (ua.includes("mobi") || ua.includes("iphone") || ua.includes("android")) return "mobile";
    return "desktop";
  }

  function getOrCreateAdminSessionId() {
    let s = localStorage.getItem(STORAGE_ADMIN_SESSION);
    if (!s) {
      s = "admin_" + Math.random().toString(16).slice(2) + "_" + Date.now();
      localStorage.setItem(STORAGE_ADMIN_SESSION, s);
    }
    return s;
  }

  // Try to reuse the existing Supabase client created by your current auth flow
  function getSbClient() {
    return (
      window.supabaseClient ||
      (window.ShrinxaAuth && window.ShrinxaAuth.supabaseClient) ||
      (window.Auth && window.Auth.supabaseClient) ||
      window._supabase ||
      null
    );
  }

  async function getAdminSession() {
    const sb = getSbClient();
    if (!sb?.auth?.getSession) return null;
    const { data } = await sb.auth.getSession();
    const session = data?.session || null;
    if (!session?.user?.email) return null;
    if ((session.user.email || "").toLowerCase() !== ADMIN_EMAIL) return null;
    return session;
  }

  async function sendAdminEvent(payload, accessToken) {
    try {
      await fetch(TRACK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch (_) {
      // silent fail by design
    }
  }

  // Public helper you can call from admin actions anywhere:
  // window.ShrinxaAdminTrack("inventory_adjusted", { ... }, { entity, entity_id, action, before, after })
  window.ShrinxaAdminTrack = async function (eventName, metadata, audit) {
    const session = await getAdminSession();
    if (!session) return;

    const accessToken = session.access_token;

    const payload = {
      visitor_id: `admin_${session.user.id}`,
      session_id: getOrCreateAdminSessionId(),
      event_name: safeText(eventName || "admin_action", 120),
      page_path: safeText(location.pathname + location.search + location.hash, 500),
      referrer: safeText(document.referrer || "", 800),
      device_type: getDeviceType(),
      metadata: metadata && typeof metadata === "object" ? metadata : {},

      // Optional audit log fields (only inserted if entity+action exist)
      entity: audit?.entity || null,
      entity_id: audit?.entity_id || null,
      action: audit?.action || null,
      before: audit?.before || null,
      after: audit?.after || null,
    };

    await sendAdminEvent(payload, accessToken);
  };

  // Auto: admin page_view + click (ONLY when admin is logged in)
  window.addEventListener("load", async function () {
    const session = await getAdminSession();
    if (!session) return;

    window.ShrinxaAdminTrack("admin_page_view", { title: safeText(document.title || "", 200) });
  });

  document.addEventListener("click", async function (ev) {
    const session = await getAdminSession();
    if (!session) return;

    const target = ev.target;
    if (!target) return;

    const el = target.closest("a, button, [role='button'], [data-admin-track]");
    if (!el) return;

    const tag = (el.tagName || "").toLowerCase();
    const text = safeText(el.textContent || "", 200);
    const id = safeText(el.id || "", 120);
    const cls = safeText(el.className || "", 200);
    const href = tag === "a" ? safeText(el.getAttribute("href") || "", 500) : "";

    const custom = safeText(el.getAttribute("data-admin-track") || "", 120);
const eventName = custom || "admin_click";

let auditEntity = el.getAttribute("data-audit-entity");
let auditEntityId = el.getAttribute("data-audit-entity-id");
let auditAction = el.getAttribute("data-audit-action");

// HARD FALLBACK for Orders → Resend Email
if (
  !auditEntity &&
  el.classList.contains("btnResend") &&
  el.dataset.id
) {
  auditEntity = "invoice";
  auditEntityId = el.dataset.id;
  auditAction = "resend_email";
}


window.ShrinxaAdminTrack(
  eventName,
  { tag, text, id, class: cls, href },
  auditEntity && auditAction ? {
    entity: auditEntity,
    entity_id: auditEntityId || null,
    action: auditAction
  } : null
);

  });
})();
