import { supabase } from "../supabaseClient.js";

// Elements
const tbody = document.querySelector("#inventoryTable tbody");

async function loadInventory() {
  if (!tbody) return;

  // Only active + not deleted products
  const { data, error } = await supabase
    .from("products")
    .select("id, name, specification, stock_on_hand, low_stock_threshold, cost_product, cost_import, cost_total, deleted_at, is_active")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) {
    alert(error.message || "Failed to load products");
    return;
  }

  tbody.innerHTML = "";
  for (const p of data || []) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>
  <div><strong>${escapeHtml(p.name || "")}</strong></div>
  <div style="font-size:12px;color:#666;">
    ${escapeHtml(p.specification || "")}
  </div>
</td>

      <td><input data-field="stock_on_hand" data-id="${p.id}" type="number" step="1" value="${num(p.stock_on_hand)}" style="width:110px"></td>
	<td><input data-field="low_stock_threshold" data-id="${p.id}" type="number" step="1" value="${num(p.low_stock_threshold)}" style="width:110px"></td>
     <td><input data-field="cost_product" data-id="${p.id}" data-spec="${escapeHtml(p.specification || "")}" type="number" step="0.0001" value="${num4(perRoll(p.cost_product, p.specification))}" style="width:140px"></td>
<td><input data-field="cost_import" data-id="${p.id}" data-spec="${escapeHtml(p.specification || "")}" type="number" step="0.0001" value="${num4(perRoll(p.cost_import, p.specification))}" style="width:140px"></td>
<td><input type="number" step="0.0001" value="${num4(perRoll(p.cost_total, p.specification))}" style="width:140px" disabled></td>
<td><input type="number" step="0.0001" value="${num4(costPerBox(p.cost_total, p.specification))}" style="width:160px" disabled></td>

    `;

    tbody.appendChild(tr);
  }

  // Attach change handler once table is built
  tbody.querySelectorAll("input[data-field]").forEach((inp) => {
    inp.addEventListener("change", onEditField);
  });
}

async function onEditField(e) {
  const input = e.target;
  const id = input.getAttribute("data-id");
  const field = input.getAttribute("data-field");

  if (!id || !field) return;

  // Parse value
  let value;
  if (field === "stock_on_hand") {
    value = parseInt(input.value, 10);
    if (!Number.isFinite(value)) value = 0;
  } else {
    value = parseFloat(input.value);
    if (!Number.isFinite(value)) value = 0;

    // IMPORTANT:
    // UI shows costs PER ROLL, but DB stores costs PER BOX.
    // So when admin edits cost_product / cost_import, convert roll -> box.
    if (field === "cost_product" || field === "cost_import") {
      const spec = input.getAttribute("data-spec") || "";
      const r = rollsPerBox(spec);
      const mult = Number.isFinite(r) && r > 0 ? r : 1;
      value = value * mult;
    }
  }


  input.disabled = true;

  const { error } = await supabase
    .from("products")
    .update({ [field]: value })
    .eq("id", id);

  input.disabled = false;

  if (error) {
    alert(error.message || "Update failed");
    return;
  }

  // Reload to reflect generated cost_total
  await loadInventory();
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function num4(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(4) : "0.0000";
}

function rollsPerBox(spec) {
  const s = String(spec || "");
  // matches "4 rolls/box" or "1 roll/box"
  const m = s.match(/(\d+)\s*rolls?\/box/i);
  return m ? parseInt(m[1], 10) : 1;
}

function perRoll(valuePerBox, spec) {
  const r = rollsPerBox(spec);
  const v = Number(valuePerBox);
  if (!Number.isFinite(v)) return 0;
  const div = Number.isFinite(r) && r > 0 ? r : 1;
  return v / div;
}


function costPerBox(costTotal, spec) {
  // IMPORTANT:
  // In your system, cost_total is already the COST PER BOX (confirmed by invoice_items.unit_cost == products.cost_total).
  // So Total Cost / Box must NOT multiply by rolls/box.
  const c = Number(costTotal);
  if (!Number.isFinite(c)) return 0;
  return c;
}


// Run
loadInventory();
