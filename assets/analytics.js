/* Shrinxa Internal Analytics (no outside tools)
   - visitor_id stored in localStorage
   - session_id rotates after 30 min inactivity
   - sends page_view + click events to Supabase Edge Function
*/
(function () {
  const STORAGE_VISITOR = "shrinxa_visitor_id";
  const STORAGE_SESSION = "shrinxa_session_id";
  const STORAGE_LAST_ACTIVITY = "shrinxa_last_activity_ts";
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  // IMPORTANT: Replace with YOUR Supabase Project URL (same as in Secrets)
  const SUPABASE_URL = "https://fgrjojxwevllnjdixiyd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncmpvanh3ZXZsbG5qZGl4aXlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODU4MjgsImV4cCI6MjA4MTA2MTgyOH0.DfqCgNf_GpnaMqFbePxCrwNcRJbptiS9fzdSwpj6lbQ";

  // Edge Function endpoint
  const TRACK_URL = `${SUPABASE_URL}/functions/v1/track-analytics-event`;

  function now() {
    return Date.now();
  }

  function uuidLike() {
    // lightweight random id (not a real UUID, but good enough for anonymous tracking)
    return "id_" + Math.random().toString(16).slice(2) + "_" + Math.random().toString(16).slice(2);
  }

  function getOrCreateVisitorId() {
    let v = localStorage.getItem(STORAGE_VISITOR);
    if (!v) {
      v = uuidLike();
      localStorage.setItem(STORAGE_VISITOR, v);
    }
    return v;
  }

  function getOrCreateSessionId() {
    const last = Number(localStorage.getItem(STORAGE_LAST_ACTIVITY) || "0");
    const current = now();

    let s = localStorage.getItem(STORAGE_SESSION);

    // New session if missing OR timed out
    if (!s || !last || current - last > SESSION_TIMEOUT_MS) {
      s = uuidLike();
      localStorage.setItem(STORAGE_SESSION, s);
    }

    localStorage.setItem(STORAGE_LAST_ACTIVITY, String(current));
    return s;
  }

  function touchActivity() {
    localStorage.setItem(STORAGE_LAST_ACTIVITY, String(now()));
  }

  function safeText(str, maxLen) {
    if (!str || typeof str !== "string") return "";
    const s = str.trim();
    return s.length > maxLen ? s.slice(0, maxLen) : s;
  }

  function buildEventPayload(event_name, metadata) {
    const visitor_id = getOrCreateVisitorId();
    const session_id = getOrCreateSessionId();

    return {
      actor_type: "customer",
      visitor_id,
      session_id,
      event_name: safeText(event_name, 120),
      page_path: safeText(location.pathname + location.search + location.hash, 500),
      referrer: safeText(document.referrer || "", 800),
      // device_type will be derived server-side if missing/invalid
      metadata: metadata && typeof metadata === "object" ? metadata : {},
    };
  }

  async function sendEvent(event_name, metadata) {
    // If developer forgot to set SUPABASE_URL, do nothing safely
    if (!SUPABASE_URL || SUPABASE_URL === "REPLACE_WITH_YOUR_SUPABASE_URL") return;

    try {
      const payload = buildEventPayload(event_name, metadata);

      await fetch(TRACK_URL, {
        method: "POST",
	headers: {
  "Content-Type": "application/json",
  "apikey": SUPABASE_ANON_KEY,
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
},

        body: JSON.stringify(payload),
        keepalive: true, // helps send on page unload
      });
    } catch (e) {
      // silent fail by design (analytics must never break the site)
    }
  }

  // 1) Track page view
  window.addEventListener("load", function () {
    sendEvent("page_view", {
      title: safeText(document.title || "", 200),
    });
  });

  // 2) Track clicks (buttons + links + anything clickable)
  document.addEventListener("click", function (ev) {
    touchActivity();

    const target = ev.target;
    if (!target) return;

    const el = target.closest("a, button, [role='button'], [data-track]");
    if (!el) return;

    const tag = (el.tagName || "").toLowerCase();
    const text = safeText(el.textContent || "", 200);
    const id = safeText(el.id || "", 120);
    const cls = safeText(el.className || "", 200);

    const href = tag === "a" ? safeText(el.getAttribute("href") || "", 500) : "";

    // If element has data-track="pay_now_click" it will use that event_name
    const customEventName = safeText(el.getAttribute("data-track") || "", 120);
    const eventName = customEventName || "click";

    sendEvent(eventName, {
      tag,
      text,
      id,
      class: cls,
      href,
    });
  });

  // 3) Update activity on navigation-ish events
  window.addEventListener("scroll", touchActivity, { passive: true });
  window.addEventListener("keydown", touchActivity, { passive: true });
})();
