import { supabase } from "../supabaseClient.js";

// Elements
const tbody = document.querySelector("#inventoryTable tbody");

async function loadInventory() {
  if (!tbody) return;

  // Only active + not deleted products
  const { data, error } = await supabase
    .from("products")
    .select("id, name, stock_on_hand, cost_product, cost_import, cost_total, deleted_at, active")
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
      <td>${escapeHtml(p.name || "")}</td>
      <td><input data-field="stock_on_hand" data-id="${p.id}" type="number" step="1" value="${num(p.stock_on_hand)}" style="width:110px"></td>
      <td><input data-field="cost_product" data-id="${p.id}" type="number" step="0.0001" value="${num4(p.cost_product)}" style="width:140px"></td>
      <td><input data-field="cost_import" data-id="${p.id}" type="number" step="0.0001" value="${num4(p.cost_import)}" style="width:140px"></td>
      <td><input type="number" step="0.0001" value="${num4(p.cost_total)}" style="width:140px" disabled></td>
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

// Run
loadInventory();
