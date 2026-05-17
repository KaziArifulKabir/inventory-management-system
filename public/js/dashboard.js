// ============================================
// DASHBOARD PAGE SCRIPTS
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  loadGreeting();
  loadDashboardStats();
  loadRecentActivity();
});
async function loadGreeting() {
  try {
    const res = await apiFetch('/api/profile');
    if (res.ok) {
      const user = await res.json();
      document.getElementById('greetingUser').innerText = user.owner_name || user.username;
    }
  } catch(e) {}
}

async function loadDashboardStats() {
  try {
    const res = await apiFetch(`${API_BASE}/dashboard/stats`);
    if (res.ok) {
      const stats = await res.json();
      document.getElementById("totalItems").innerText = stats.totalItems || 0;
      document.getElementById("totalStock").innerText = stats.totalStock || 0;
      document.getElementById("inventoryValue").innerText = "$" + (stats.inventoryValue || 0).toLocaleString();
      document.getElementById("lowStockCount").innerText = stats.lowStockCount || 0;
      document.getElementById("transactionCount").innerText = stats.transactionCount || 0;

      // ✅ low stock badge update — return-এর আগে এখানে বসাও
      const lowCount = parseInt(document.getElementById('lowStockCount').innerText) || 0;
      const badge = document.getElementById('lowStockBadge');
      if (badge) {
        if (lowCount > 0) {
          badge.style.display = 'inline';
          badge.innerText = lowCount;
        } else {
          badge.style.display = 'none';
        }
      }

      return;   // এখন ঠিক আছে, কারণ ব্যাজ আপডেট হয়ে গেছে
    }
  } catch (e) {}
  // ডেমো ফলব্যাক (এখানেও ইচ্ছা করলে ব্যাজ আপডেট করতে পারো)
  demoStats();
}

function demoStats() {
  const demoProducts = {
    Electronics: [ { stock: 23, price: 59.99, reorderLevel: 5 }, { stock: 11, price: 129.99, reorderLevel: 3 } ],
    Clothing: [ { stock: 45, price: 19.99, reorderLevel: 10 } ],
    Hardware: [ { stock: 8, price: 12.5, reorderLevel: 2 } ]
  };
  const all = Object.values(demoProducts).flat();
  const totalStock = all.reduce((s, i) => s + i.stock, 0);
  const totalValue = all.reduce((s, i) => s + i.price * i.stock, 0);
  const lowStock = all.filter(i => i.stock <= i.reorderLevel).length;
  document.getElementById("totalItems").innerText = all.length;
  document.getElementById("totalStock").innerText = totalStock;
  document.getElementById("inventoryValue").innerText = "$" + totalValue.toFixed(2);
  document.getElementById("lowStockCount").innerText = lowStock;
  document.getElementById("transactionCount").innerText = "0";
}

async function loadRecentActivity() {
  const ul = document.getElementById("recentActivity");
  if (!ul) return;
  try {
    const res = await apiFetch(`${API_BASE}/transactions?limit=10`);
    if (res.ok) {
      const txs = await res.json();
      renderRecentActivity(txs);
      return;
    }
  } catch (e) {}
  // ডেমো ডাটাও সঠিক ফিল্ডে
  renderRecentActivity([
    {
      type: "demo",
      product_name: "Sample Item",
      quantity: 1,
      from_location: "Main",
      to_location: null,
      created_at: new Date().toISOString()
    }
  ]);
}

function renderRecentActivity(txs) {
  const ul = document.getElementById("recentActivity");
  if (!ul) return;

  if (txs.length === 0) {
    ul.innerHTML = "<li>No recent activity yet.</li>";
    return;
  }

  ul.innerHTML = txs.map(tx => {
    // টাইপ অনুযায়ী লোকেশন ও বিস্তারিত
    let details = "";
    const name = tx.product_name || "Unknown Product";
    const qty = tx.quantity || 0;
    const type = (tx.type || "").toUpperCase();
    const date = new Date(tx.created_at).toLocaleString();

    if (type === "ADD" || type === "STOCK-IN") {
      details = `${type} — ${name} (${qty} units) → ${tx.to_location || "N/A"}`;
    } else if (type === "SALE" || type === "STOCK-OUT") {
      details = `${type} — ${name} (${qty} units) from ${tx.from_location || "N/A"}`;
    } else if (type === "TRANSFER") {
      details = `${type} — ${name} (${qty} units) ${tx.from_location || "?"} → ${tx.to_location || "?"}`;
    } else {
      details = `${type} — ${name} (${qty} units)`;
    }

    return `<li>✔ ${details} [${date}]</li>`;
  }).join("");
}