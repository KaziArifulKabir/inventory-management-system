// ============================================
// REPORTS PAGE SCRIPTS
// ============================================

let myChart = null;

document.addEventListener("DOMContentLoaded", () => {
  loadDynamicChart();  // API থেকে ডেটা এনে চার্ট বানাও
});

// -------------- Dynamic Chart (লাইভ ক্যাটাগরি) --------------
async function loadDynamicChart() {
  const ctx = document.getElementById("salesChart");
  if (!ctx) return;

  try {
    const res = await apiFetch(`${API_BASE}/products`);
    if (!res.ok) throw new Error("Failed to fetch products");
    const products = await res.json();

    // ক্যাটাগরি-ভিত্তিক কাউন্ট বের করো
    const categoryMap = {};
    products.forEach(p => {
      const cat = p.category || "Uncategorized";
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });

    const labels = Object.keys(categoryMap);
    const data = Object.values(categoryMap);
    const backgroundColors = [
      "#00bcd4", "#4caf50", "#ff9800", "#9c27b0", "#f44336", "#3f51b5", "#ffeb3b", "#795548", "#607d8b"
    ]; // প্রয়োজনে আরও রঙ যোগ করতে পারো

    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Products by Category",
          data: data,
          backgroundColor: backgroundColors.slice(0, labels.length),
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' }
        }
      }
    });
  } catch (e) {
    console.error("Chart load error:", e);
    // API ব্যর্থ হলে ডেমো দেখাবে (optional)
    loadDemoChart();
  }
}

function loadDemoChart() {
  const ctx = document.getElementById("salesChart");
  if (!ctx) return;
  const labels = ["Electronics", "Clothing", "Hardware"];
  const data = [2, 1, 1];
  if (myChart) myChart.destroy();
  myChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Products by Category (Demo)",
        data: data,
        backgroundColor: ["#00bcd4", "#4caf50", "#ff9800"],
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' } }
    }
  });
}

// -------------- CSV Generator Helper --------------
function downloadCSV(filename, rows) {
  const csvContent = "\uFEFF" + rows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

// -------------- Export Stock Report --------------
async function exportStockReport() {
  try {
    const res = await apiFetch(`${API_BASE}/products`);
    if (!res.ok) throw new Error("Failed to fetch");
    const products = await res.json();
    const headers = ["Name", "SKU", "Price", "Stock", "Reorder Level", "Category", "Location", "Value"];
    const rows = [headers.join(",")];
    products.forEach(p => {
      const value = (p.price * p.stock).toFixed(2);
      rows.push(`"${p.name}","${p.sku}",${p.price},${p.stock},${p.reorder_level},"${p.category}","${p.location}",${value}`);
    });
    downloadCSV("stock_report.csv", rows);
  } catch (e) {
    alert("Could not export stock report. Make sure backend is running.");
  }
}

// -------------- Export Transaction Report --------------
async function exportTransactionReport() {
  try {
    const res = await apiFetch(`${API_BASE}/transactions?limit=1000`);
    if (!res.ok) throw new Error("Failed to fetch");
    const txs = await res.json();
    const headers = ["Type", "Product", "SKU", "Quantity", "From", "To", "Reason", "Date"];
    const rows = [headers.join(",")];
    txs.forEach(tx => {
      rows.push(`"${tx.type}","${tx.product_name}","${tx.product_sku}",${tx.quantity},"${tx.from_location || ''}","${tx.to_location || ''}","${tx.reason || ''}","${new Date(tx.created_at).toLocaleString()}"`);
    });
    downloadCSV("transaction_history.csv", rows);
  } catch (e) {
    alert("Could not export transactions. Make sure backend is running.");
  }
}

// -------------- Show Low Stock Items (Modal) --------------
async function showLowStock() {
  try {
    const res = await apiFetch(`${API_BASE}/products`);
    if (!res.ok) throw new Error("Failed to fetch");
    const products = await res.json();
    const lowStockItems = products.filter(p => p.stock <= p.reorder_level);
    const tbody = document.getElementById("lowStockTableBody");
    if (!tbody) return;
    if (lowStockItems.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No low stock items found.</td></tr>';
    } else {
      tbody.innerHTML = lowStockItems.map(p => `
        <tr>
          <td>${p.name}</td>
          <td>${p.sku}</td>
          <td style="color:#ff4757;font-weight:bold;">${p.stock}</td>
          <td>${p.reorder_level}</td>
          <td>${p.location || '-'}</td>
        </tr>
      `).join("");
    }
    toggleModal("lowStockModal");
  } catch (e) {
    alert("Could not load low stock items. Backend may be down.");
  }
}

// -------------- Button mapping (overwrite existing) --------------
function exportReport(type) {
  if (type === 'stock') {
    exportStockReport();
  } else if (type === 'transaction') {
    exportTransactionReport();
  }
}

// গ্লোবাল এক্সপোজ
window.exportReport = exportReport;
window.showLowStock = showLowStock;
window.loadDynamicChart = loadDynamicChart;