// ============================================
// STOCK OPERATIONS PAGE
// ============================================

async function stockIn() {
  const item = document.getElementById("stockInItem")?.value.trim();
  const qty = parseInt(document.getElementById("stockInQty")?.value);
  const location = document.getElementById("stockInLocation")?.value.trim();
  if (!item || isNaN(qty) || qty <= 0 || !location) return alert("Fill all fields");

  try {
    const res = await apiFetch(`${API_BASE}/transactions/stock-in`, {
      method: "POST",
      body: JSON.stringify({ item, qty, location })
    });
    if (res.ok) {
      alert("Stock added!");
      clearStockIn();
      return;
    }
  } catch (e) {}
  // ডেমো
  clearStockIn();
  alert("Stock added! (Demo)");
}
function clearStockIn() {
  document.getElementById("stockInItem").value = "";
  document.getElementById("stockInQty").value = "";
  document.getElementById("stockInLocation").value = "";
}

async function stockOut() {
  const item = document.getElementById("stockOutItem")?.value.trim();
  const qty = parseInt(document.getElementById("stockOutQty")?.value);
  const location = document.getElementById("stockOutLocation")?.value.trim();
  const reason = document.getElementById("stockOutReason")?.value.trim() || "sale";
  if (!item || isNaN(qty) || qty <= 0 || !location) return alert("Fill all fields");

  try {
    const res = await apiFetch(`${API_BASE}/transactions/stock-out`, {
      method: "POST",
      body: JSON.stringify({ item, qty, location, reason })
    });
    if (res.ok) {
      alert("Stock removed!");
      clearStockOut();
      return;
    }
  } catch (e) {}
  clearStockOut();
  alert("Stock removed! (Demo)");
}
function clearStockOut() {
  document.getElementById("stockOutItem").value = "";
  document.getElementById("stockOutQty").value = "";
  document.getElementById("stockOutLocation").value = "";
  document.getElementById("stockOutReason").value = "";
}

async function stockTransfer() {
  const item = document.getElementById("transferItem")?.value.trim();
  const qty = parseInt(document.getElementById("transferQty")?.value);
  const from = document.getElementById("transferFrom")?.value.trim();
  const to = document.getElementById("transferTo")?.value.trim();
  if (!item || isNaN(qty) || qty <= 0 || !from || !to) return alert("Fill all fields");

  try {
    const res = await apiFetch(`${API_BASE}/transactions/transfer`, {
      method: "POST",
      body: JSON.stringify({ item, qty, from, to })
    });
    if (res.ok) {
      alert("Stock transferred!");
      clearTransfer();
      return;
    }
  } catch (e) {}
  clearTransfer();
  alert("Stock transferred! (Demo)");
}
function clearTransfer() {
  document.getElementById("transferItem").value = "";
  document.getElementById("transferQty").value = "";
  document.getElementById("transferFrom").value = "";
  document.getElementById("transferTo").value = "";
}

window.stockIn = stockIn;
window.stockOut = stockOut;
window.stockTransfer = stockTransfer;