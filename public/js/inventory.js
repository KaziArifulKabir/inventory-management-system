// ============================================
// INVENTORY PAGE SCRIPTS
// ============================================

let productsData = { Electronics: [], Clothing: [], Hardware: [], Food: [], Sports: [], Toys: [] };

document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  const params = new URLSearchParams(window.location.search);
  const cat = params.get("category");
  if (cat && document.getElementById("filterCategory")) {
    document.getElementById("filterCategory").value = cat;
  }
});

async function loadProducts() {
  try {
    const res = await apiFetch(`${API_BASE}/products`);
    if (res.ok) {
      const prods = await res.json();
      // খালি অবজেক্ট থেকে শুরু, যেকোনো ক্যাটাগরি নিজে থেকেই জুড়বে
      productsData = {};
      prods.forEach(p => {
        const cat = p.category || 'Uncategorized';
        if (!productsData[cat]) {
          productsData[cat] = [];
        }
        productsData[cat].push(p);
      });
    }
  } catch (e) {}
  renderProducts();
}

function getAllProducts() {
  return Object.values(productsData).flat();
}

function renderProducts() {
  const list = document.getElementById("productList");
  const filter = document.getElementById("filterCategory")?.value || "All";
  const keyword = document.getElementById("searchBox")?.value.toLowerCase() || "";
  if (!list) return;

  let products = getAllProducts();
  if (filter !== "All") {
    products = products.filter(p => p.category === filter);
  }
  if (keyword) {
    products = products.filter(p =>
      p.name?.toLowerCase().includes(keyword) ||
      p.sku?.toLowerCase().includes(keyword)
    );
  }

  document.getElementById("productTitle").innerText = products.length
    ? `Showing ${products.length} item(s)`
    : "No items.";

  list.innerHTML = products
    .map(p => {
      // ✅ p.reorder_level (ডাটাবেজের সঠিক কলাম)
      const lowStockClass = p.stock <= p.reorder_level ? 'low-stock-warning' : '';
      return `
        <div class="product-card ${lowStockClass}">
          <img src="${p.img || 'https://via.placeholder.com/150'}" alt="${p.name}">
          <h4>${p.name}</h4>
          <p><b>SKU:</b> ${p.sku}</p>
          <p><b>Price:</b> $${p.price}</p>
          <!-- এখানেও p.reorder_level -->
          <p style="color: ${p.stock <= p.reorder_level ? '#ff4757' : '#00bcd4'}"><b>Stock:</b> ${p.stock}</p>
          <p><b>Location:</b> ${p.location || '-'}</p>
          <div class="actions">
            <button class="btn-dark" onclick="sellProduct('${p.sku}')">Sell</button>
            <button class="btn-primary" onclick="editProduct('${p.sku}')">Edit</button>
            <button class="btn-danger" onclick="deleteProduct('${p.sku}')">Delete</button>
          </div>
        </div>
      `;
    })
    .join("");
}

// অ্যাড প্রোডাক্ট
async function addProduct() {
  const name = document.getElementById("pName").value.trim();
  const sku = document.getElementById("pSku").value.trim();
  const price = document.getElementById("pPrice").value;
  const stock = document.getElementById("pStock").value || 0;
  const reorder = document.getElementById("pReorder").value || 5;
  const category = document.getElementById("pCategory").value;
  const location = document.getElementById("pLocation").value.trim() || "Main Warehouse";
  const fileInput = document.getElementById("pImgFile");
  const file = fileInput?.files[0];

  if (!name || !sku || !price) {
    return alert("Name, SKU, Price required");
  }

  // ফর্ম ডাটা (ফাইল সহ) তৈরি
  const formData = new FormData();
  formData.append("name", name);
  formData.append("sku", sku);
  formData.append("price", price);
  formData.append("stock", stock);
  formData.append("reorderLevel", reorder);
  formData.append("category", category);
  formData.append("location", location);
  if (file) {
    formData.append("productImage", file);
  }

  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      credentials: 'include',
      body: formData
      // Content-Type auto-set by browser for multipart
    });
    if (res.ok) {
      toggleModal('addItemModal');
      if (typeof loadProducts === 'function') loadProducts();
      if (typeof renderProducts === 'function') renderProducts();
    } else {
      const err = await res.json();
      alert(err.message || "Failed to add product");
    }
  } catch (e) {
    console.error(e);
    alert("Error adding product");
  }
}

// সেল
async function sellProduct(sku) {
  const product = getAllProducts().find(p => p.sku === sku);
  if (!product) return alert("Product not found");
  if (product.stock <= 0) return alert("Out of stock");

  const qty = parseInt(prompt(`Enter quantity to sell (max ${product.stock}):`, 1));
  if (isNaN(qty) || qty <= 0 || qty > product.stock) return alert("Invalid quantity");

  try {
    const res = await apiFetch(`${API_BASE}/transactions/sell`, {
      method: "POST",
      body: JSON.stringify({ sku, quantity: qty })
    });
    if (res.ok) {
      alert(`Sold ${qty} ${product.name}(s)!`);
      loadProducts();
      return;
    }
  } catch (e) {}
  // ডেমো
  product.stock -= qty;
  renderProducts();
  alert(`Sold ${qty} ${product.name}(s)! (Demo)`);
}

// এডিট
async function editProduct(sku) {
  const product = getAllProducts().find(p => p.sku === sku);
  if (!product) return alert("Product not found");

  const newStock = parseInt(prompt("New stock quantity:", product.stock));
  const newPrice = parseFloat(prompt("New price:", product.price));
  const newLocation = prompt("Location:", product.location);
  if (isNaN(newStock) || isNaN(newPrice)) return alert("Invalid input");

  try {
    const res = await apiFetch(`${API_BASE}/products/${sku}`, {
      method: "PUT",
      body: JSON.stringify({ stock: newStock, price: newPrice, location: newLocation })
    });
    if (res.ok) {
      alert("Product updated!");
      loadProducts();
      return;
    }
  } catch (e) {}
  // ডেমো
  product.stock = newStock;
  product.price = newPrice;
  if (newLocation) product.location = newLocation;
  renderProducts();
  alert("Product updated! (Demo)");
}

// ডিলিট
async function deleteProduct(sku) {
  const product = getAllProducts().find(p => p.sku === sku);
  if (!product) return alert("Product not found");
  if (product.stock > 0) {
    return alert("Cannot delete product with stock > 0. Remove stock first.");
  }
  if (!confirm(`Are you sure you want to delete ${product.name}?`)) return;

  try {
    const res = await apiFetch(`${API_BASE}/products/${sku}`, {
      method: "DELETE"
    });
    if (res.ok) {
      alert("Product deleted!");
      loadProducts();
      return;
    }
  } catch (e) {}
  // ডেমো
  for (let cat in productsData) {
    const idx = productsData[cat].findIndex(p => p.sku === sku);
    if (idx !== -1) {
      productsData[cat].splice(idx, 1);
      break;
    }
  }
  renderProducts();
  alert("Product deleted! (Demo)");
}

function searchProduct() { renderProducts(); }

function showProducts(category) {
  document.getElementById("filterCategory").value = category;
  renderProducts();
}

window.addProduct = addProduct;
window.sellProduct = sellProduct;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.searchProduct = searchProduct;
window.showProducts = showProducts;
window.renderProducts = renderProducts;