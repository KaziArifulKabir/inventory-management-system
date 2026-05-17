// ============================================
// LOCATIONS PAGE
// ============================================

document.addEventListener("DOMContentLoaded", loadLocations);

async function loadLocations() {
  try {
    const res = await apiFetch(`${API_BASE}/locations`);
    if (res.ok) {
      const locs = await res.json();
      renderLocations(locs);
      return;
    }
  } catch (e) {}
  // ডেমো
  renderLocations([
    { name: "Main Warehouse", type: "warehouse", capacity: 1000, stockCount: 34, manager: "Admin" },
    { name: "Store A", type: "store", capacity: 500, stockCount: 45, manager: "Manager" }
  ]);
}

function renderLocations(locs) {
  const tbody = document.getElementById("locationsTable");
  tbody.innerHTML = locs.map(loc => `
    <tr>
      <td>${loc.name}</td><td>${loc.type}</td><td>${loc.capacity || 0}</td><td>${loc.stockCount || 0}</td><td>${loc.manager || '-'}</td>
    </tr>`).join("");
}

async function addLocation() {
  const name = document.getElementById("locName")?.value.trim();
  const type = document.getElementById("locType")?.value;
  const capacity = parseInt(document.getElementById("locCapacity")?.value);
  const manager = document.getElementById("locManager")?.value.trim();
  if (!name || isNaN(capacity)) return alert("Fill name and capacity");

  try {
    const res = await apiFetch(`${API_BASE}/locations`, {
      method: "POST",
      body: JSON.stringify({ name, type, capacity, manager })
    });
    if (res.ok) {
      toggleModal('addLocationModal');
      loadLocations();
      return;
    }
  } catch (e) {}
  toggleModal('addLocationModal');
  loadLocations();
  alert("Location added! (Demo)");
}

window.addLocation = addLocation;
window.loadLocations = loadLocations;