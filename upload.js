const imgFile = document.getElementById("imgFile");
const btnUploadImg = document.getElementById("btnUploadImg");
const BUCKET = "product-images";

function safeName(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function uploadProductImage(productName) {
  const file = imgFile?.files?.[0];
  if (!file) throw new Error("Choose an image first.");

  // Must be logged in (authenticated) for insert policy
  const { data: sess } = await supabase.auth.getSession();
  if (!sess?.session?.user) throw new Error("Please sign in to upload images.");

  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const filename = `${safeName(productName || "product")}-${Date.now()}.${ext}`;

  const path = `products/${filename}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return pub.publicUrl;
}

btnUploadImg?.addEventListener("click", async () => {
  try {
    btnUploadImg.disabled = true;
    btnUploadImg.textContent = "Uploading...";

    // Use current name field from your form
    const productName = (document.getElementById("f_name")?.value || "").trim();
    const url = await uploadProductImage(productName);

    // Put URL into your existing Image URL field
    document.getElementById("f_image_url").value = url;

    btnUploadImg.textContent = "Uploaded ✓";
    setTimeout(() => (btnUploadImg.textContent = "Upload"), 1500);
  } catch (e) {
    alert(e?.message || String(e));
    btnUploadImg.textContent = "Upload";
  } finally {
    btnUploadImg.disabled = false;
  }
});
