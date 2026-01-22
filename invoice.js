// invoice.js (Supabase + render) — SAFE VERSION (won't crash if an element is missing)


const $ = (id) => document.getElementById(id);

function money(n, currency = "USD") {
  const v = Number(n || 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(v);
}

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("en-CA"); // YYYY-MM-DD
}

function qparam(name) {
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function setHtml(id, value) {
  const el = $(id);
  if (el) el.innerHTML = value;
}

function lineItemRow(item) {
  const tr = document.createElement("tr");

  const tdItem = document.createElement("td");
  const name = document.createElement("div");
  name.className = "item-name";
  name.textContent = item.item_name || item.product_name || "Item";

  const desc = document.createElement("div");
  desc.className = "item-desc";
  desc.textContent = item.item_desc || item.description || "";

  tdItem.appendChild(name);
  if (desc.textContent.trim()) tdItem.appendChild(desc);

  const tdQty = document.createElement("td");
  tdQty.className = "col-qty";
  tdQty.textContent = item.qty ?? item.quantity ?? 0;

  const tdPrice = document.createElement("td");
  tdPrice.className = "col-price";
  tdPrice.textContent = money(item.unit_price ?? item.price ?? 0, item.currency || "USD");

  const tdTotal = document.createElement("td");
  tdTotal.className = "col-total";
  const lt = (item.qty ?? item.quantity ?? 0) * (item.unit_price ?? item.price ?? 0);
  tdTotal.textContent = money(item.line_total ?? lt, item.currency || "USD");

  tr.append(tdItem, tdQty, tdPrice, tdTotal);
  return tr;
}

function renderInvoice(inv, items) {
  setText("invoiceNumber", inv.invoice_number || inv.number || "INV-");
  setText("invoiceDate", fmtDate(inv.invoice_date || inv.date));

  // Seller (optional)
  if (inv.seller_name) setText("sellerName", inv.seller_name);
  if (inv.seller_tagline) setText("sellerTag", inv.seller_tagline);
  if (inv.seller_email) setText("sellerEmail", inv.seller_email);

  // Bill To
  const billLines = [
    inv.bill_to_name,
    inv.bill_to_company,
    inv.bill_to_address && `Address: ${inv.bill_to_address}`,
    inv.bill_to_postal && `Postal Code: ${inv.bill_to_postal}`,
    inv.bill_to_email,
    inv.bill_to_phone,
  ].filter(Boolean);

  setHtml("billTo", billLines.map(s => `<div>${escapeHtml(s)}</div>`).join(""));

 // Payment block
const isPaid = String(inv.payment_status || "").toLowerCase() === "paid";

const payLines = isPaid
  ? ["Payment Method:", "Paid"]
  : ["Payment Method:", "Pay Later (On Delivery)"];

setHtml("paymentBlock", payLines.map(s => `<div>${escapeHtml(s)}</div>`).join(""));

const disclaimer = document.getElementById("payLaterDisclaimer");
if (disclaimer) disclaimer.style.display = isPaid ? "none" : "block";
const termsText = document.getElementById("termsText");
if (termsText) termsText.style.display = isPaid ? "none" : "block";

// Hide only the terms text, keep the thank-you line visible
const termsTitle = document.getElementById("termsTitle");
if (termsTitle) termsTitle.style.display = isPaid ? "none" : "inline";


  // Items
  const tb = $("itemsTbody");
  if (tb) {
    tb.innerHTML = "";
    (items || []).forEach(it => tb.appendChild(lineItemRow(it)));
  }

  // Totals
  const currency = inv.currency || (items?.[0]?.currency) || "USD";
  const subtotal =
    Number(
      inv.subtotal ??
      (items || []).reduce((a, it) => {
        const qty = Number(it.qty ?? it.quantity ?? 0);
        const price = Number(it.unit_price ?? it.price ?? 0);
        const lt = Number(it.line_total) || (qty * price);
        return a + (Number.isFinite(lt) ? lt : 0);
      }, 0)
    );

  const delivery = Number(inv.delivery ?? 0);
  const taxRate = Number(inv.tax_rate ?? 0.13);
  const tax = Number(inv.tax ?? (subtotal + delivery) * taxRate);
  const total = Number(inv.total ?? (subtotal + delivery + tax));

  setText("subtotal", money(subtotal, currency));
  setText(
    "delivery",
    inv.delivery_note ? `${money(delivery, currency)} (${inv.delivery_note})` : money(delivery, currency)
  );

  const taxPct = Math.round(taxRate * 10000) / 100;
  setText("taxLabel", `${inv.tax_name || "HST"} (${taxPct}%)`);
  setText("tax", money(tax, currency));
  setText("grandTotal", money(total, currency));

  if (inv.terms_text) setHtml("termsText", escapeHtml(inv.terms_text).replace(/\n/g, "<br>"));

  setText("generatedAt", `Generated on: ${new Date().toLocaleString()}`);
  setText("pageHint", `Invoice #: ${inv.invoice_number || inv.number || ""}`);
}

async function loadInvoice() {
  const invoiceId = qparam("id");      // UUID
  const invoiceNumber = qparam("inv") || qparam("invoice_no") || qparam("invoice_number"); // optional INV-xxxx

  if (!invoiceId && !invoiceNumber) {
    const root = $("invoiceRoot");
    if (root) {
      root.insertAdjacentHTML(
        "afterbegin",
        `<div style="margin-bottom:12px;padding:10px;border:1px solid #fca5a5;background:#fff1f2;border-radius:10px;">
          Missing invoice id. Open like: <b>invoice.html?id=YOUR_UUID</b> or <b>invoice.html?inv=INV-xxxxx</b>
        </div>`
      );
    }
    return;
  }

 // 1) Fetch invoice + items via public Supabase Edge Function (works without login)
const url = new URL("https://fgrjojxwevllnjdixiyd.functions.supabase.co/invoice-public");
if (invoiceId) url.searchParams.set("id", invoiceId);
if (!invoiceId && invoiceNumber) url.searchParams.set("inv", invoiceNumber);

const res = await fetch(url.toString());


  const text = await res.text();
  let payload = null;
  try { payload = JSON.parse(text); } catch (_) { payload = null; }

  if (!res.ok || !payload?.ok) {
    console.error("invoice-public error:", payload || text);
    alert(payload?.message || "Invoice could not be loaded. Please contact support.");
    return;
  }

  renderInvoice(payload.invoice, payload.items || []);
}

function init() {
  // Bind buttons safely (won't crash if IDs don't exist)
  const btnPrint = $("btnPrint");
  if (btnPrint) btnPrint.addEventListener("click", () => window.print());

  const btnReload = $("btnReload");
  if (btnReload) btnReload.addEventListener("click", () => loadInvoice());

  // Start
  loadInvoice();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
