// ============================================
// PROFILE PAGE SCRIPTS (Editable)
// ============================================

let currentUser = null;

document.addEventListener("DOMContentLoaded", loadProfile);

async function loadProfile() {
  try {
    const res = await apiFetch(`${API_BASE}/profile`);
    if (res.ok) {
      currentUser = await res.json();
      renderProfile(currentUser);
      return;
    }
  } catch (e) {}
  // fallback demo
  document.getElementById("profDisplayName").innerText = "Offline";
}

function renderProfile(user) {
  document.getElementById("profOwnerName").innerText = user.owner_name || "—";
  document.getElementById("profShopName").innerText = user.shop_name || "—";
  document.getElementById("profEmail").innerText = user.email || "—";
  document.getElementById("profUsername").innerText = user.username || "—";
  document.getElementById("profUserId").innerText = user.user_id || "—";
  document.getElementById("profRoleBadge").innerText = user.role || "user";
  document.getElementById("profDisplayName").innerText = user.owner_name || user.username || "User";
  document.getElementById("profileInitials").innerText = (user.owner_name || user.username || "U").substring(0,2).toUpperCase();
  document.getElementById("profFooterRole").innerText = user.role || "user";
  document.getElementById('profileLastUpdated').innerText = new Date().toLocaleString();
}

// Toggle edit mode
let editMode = false;

function toggleEditMode() {
  editMode = !editMode;
  const spans = document.querySelectorAll('.profile-value');
  const inputs = document.querySelectorAll('.profile-input');
  const editBtn = document.getElementById('editProfileBtn');
  const saveBtn = document.getElementById('saveProfileBtn');
  const cancelBtn = document.getElementById('cancelEditBtn');

  if (editMode) {
    // Edit mode ON -> hide spans, show inputs, populate inputs
    spans.forEach(span => span.style.display = 'none');
    inputs.forEach(input => input.style.display = 'block');
    editBtn.style.display = 'none';
    saveBtn.style.display = 'inline-block';
    cancelBtn.style.display = 'inline-block';

    // Populate input fields from currentUser
    document.getElementById('editOwnerName').value = currentUser.owner_name || '';
    document.getElementById('editShopName').value = currentUser.shop_name || '';
    document.getElementById('editEmail').value = currentUser.email || '';
    document.getElementById('editUsername').value = currentUser.username || '';
    document.getElementById('editUserId').value = currentUser.user_id || '';
  } else {
    // Edit mode OFF -> show spans, hide inputs
    spans.forEach(span => span.style.display = '');
    inputs.forEach(input => input.style.display = 'none');
    editBtn.style.display = 'inline-block';
    saveBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
  }
}

// Save profile
async function saveProfile() {
  const updatedData = {
    owner_name: document.getElementById('editOwnerName').value.trim(),
    shop_name: document.getElementById('editShopName').value.trim(),
    email: document.getElementById('editEmail').value.trim(),
    username: document.getElementById('editUsername').value.trim(),
    user_id: document.getElementById('editUserId').value.trim()
  };

  // Basic validation
  if (!updatedData.email || !updatedData.username || !updatedData.user_id) {
    alert('Email, Username, and User ID are required');
    return;
  }

  try {
    const res = await apiFetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    });

    const data = await res.json();
    if (res.ok && data.success) {
      alert('Profile updated successfully!');
      // Reload user data
      await loadProfile();
      toggleEditMode(); // exit edit mode
    } else {
      alert(data.message || 'Failed to update profile');
    }
  } catch (e) {
    alert('Error updating profile. Check backend.');
  }
}

// Expose to global (if needed)
window.toggleEditMode = toggleEditMode;
window.saveProfile = saveProfile;