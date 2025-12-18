// invoice.js (Supabase + render)
// IMPORTANT: Put your Supabase URL + anon key in supabaseClient.js
import { supabase } from "./supabaseClient.js";

const $ = (id) => document.getElementById(id);

function money(n, currency = "USD") {
  const v = Number(n || 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(v);
}

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("en-CA"); // YYYY-MM-DD style
}

function qparam(name) {
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
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
  $("invoiceNumber").textContent = inv.invoice_number || inv.number || "INV-";
  $("invoiceDate").textContent = fmtDate(inv.invoice_date || inv.date);

  // Seller (optional)
  if (inv.seller_name) $("sellerName").textContent = inv.seller_name;
  if (inv.seller_tagline) $("sellerTag").textContent = inv.seller_tagline;
  if (inv.seller_email) $("sellerEmail").textContent = inv.seller_email;

  // Bill To
  const billLines = [
    inv.bill_to_name,
    inv.bill_to_company,
    inv.bill_to_address && `Address: ${inv.bill_to_address}`,
    inv.bill_to_postal && `Postal Code: ${inv.bill_to_postal}`,
    inv.bill_to_email,
    inv.bill_to_phone,
  ].filter(Boolean);

  $("billTo").innerHTML = billLines.map(s => `<div>${escapeHtml(String(s))}</div>`).join("");

  // Payment block
  const payLines = [
    inv.payment_method || "Pay on delivery",
    inv.payment_terms || "Payment due on delivery",
  ].filter(Boolean);
  $("paymentBlock").innerHTML = payLines.map(s => `<div>${escapeHtml(String(s))}</div>`).join("");

  // Items
  const tb = $("itemsTbody");
  tb.innerHTML = "";
  items.forEach(it => tb.appendChild(lineItemRow(it)));

  // Totals
  const currency = inv.currency || (items[0]?.currency) || "USD";
  const subtotal = Number(inv.subtotal ?? items.reduce((a, it) => a + (Number(it.line_total) || (Number(it.qty||it.quantity||0) * Number(it.unit_price||it.price||0))), 0));
  const delivery = Number(inv.delivery ?? 0);
  const taxRate = Number(inv.tax_rate ?? 0.13);
  const tax = Number(inv.tax ?? (subtotal + delivery) * taxRate);
  const total = Number(inv.total ?? (subtotal + delivery + tax));

  $("subtotal").textContent = money(subtotal, currency);
  $("delivery").textContent = inv.delivery_note
    ? `${money(delivery, currency)} (${inv.delivery_note})`
    : money(delivery, currency);

  const taxPct = Math.round(taxRate * 10000) / 100;
  $("taxLabel").textContent = `${inv.tax_name || "HST"} (${taxPct}%)`;
  $("tax").textContent = money(tax, currency);
  $("grandTotal").textContent = money(total, currency);

  if (inv.terms_text) $("termsText").innerHTML = escapeHtml(inv.terms_text).replace(/\n/g, "<br>");

  $("generatedAt").textContent = new Date().toLocaleString();
  $("pageHint").textContent = `Invoice #: ${inv.invoice_number || inv.number || ""}`;
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadInvoice() {
  const invoiceId = qparam("id");          // preferred (UUID)
  const invoiceNumber = qparam("inv");     // optional (INV-xxxxx)

  if (!invoiceId && !invoiceNumber) {
    $("invoiceRoot").insertAdjacentHTML(
      "afterbegin",
      `<div style="margin-bottom:12px;padding:10px;border:1px solid #fca5a5;background:#fff1f2;border-radius:10px;">
        Missing invoice id. Open like: <b>invoice.html?id=YOUR_UUID</b> or <b>invoice.html?inv=INV-xxxxx</b>
      </div>`
    );
    return;
  }

  // 1) Fetch invoice
  let invQuery = supabase.from("invoices").select("*").limit(1);
  invQuery = invoiceId ? invQuery.eq("id", invoiceId) : invQuery.eq("invoice_number", invoiceNumber);
  const { data: invRows, error: invErr } = await invQuery;

  if (invErr || !invRows?.length) {
    console.error(invErr);
    alert("Invoice not found in Supabase.");
    return;
  }
  const inv = invRows[0];

  // 2) Fetch items
  const { data: items, error: itemsErr } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", inv.id)
    .order("sort_order", { ascending: true });

  if (itemsErr) {
    console.error(itemsErr);
    alert("Failed to load invoice items.");
    return;
  }

  renderInvoice(inv, items || []);
}

$("btnPrint").addEventListener("click", () => window.print());
$("btnReload").addEventListener("click", () => loadInvoice());

loadInvoice();
