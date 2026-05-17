// ============================================
// COMMON FUNCTIONS - InventoryPro
// ============================================

const API_BASE = "/api";

async function apiFetch(url, options = {}) {
  const fetchOptions = {
    ...options,
    credentials: "include",
    headers: options.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json", ...options.headers }
  };
  const res = await fetch(url, fetchOptions);
  if (res.status === 401) {
    window.location.href = "/login.html";
    return;
  }
  return res;
}

function toggleModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = modal.style.display === "flex" ? "none" : "flex";
  }
}

// মডাল বাইরে ক্লিক করলে বন্ধ
window.addEventListener("load", () => {
  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.style.display = "none";
    });
  });
});

window.toggleModal = toggleModal;
window.apiFetch = apiFetch;