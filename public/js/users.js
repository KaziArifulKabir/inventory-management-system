// ============================================
// USERS PAGE
// ============================================

document.addEventListener("DOMContentLoaded", loadUsers);

async function loadUsers() {
  try {
    const res = await apiFetch(`${API_BASE}/users`);
    if (res.ok) {
      const users = await res.json();
      renderUsers(users);
      return;
    }
  } catch (e) {}
  // ডেমো
  renderUsers([{
    owner_name: "Admin", shop_name: "Demo Shop", email: "admin@demo.com",
    username: "admin", user_id: "admin001", role: "admin", created_at: new Date()
  }]);
}

function renderUsers(users) {
  const tbody = document.getElementById("usersTable");
  tbody.innerHTML = users.map(u => `
    <tr>
      <td>${u.owner_name || ''}</td><td>${u.shop_name || ''}</td><td>${u.email}</td>
      <td>${u.username}</td><td>${u.user_id}</td><td>${u.role}</td>
      <td>${new Date(u.created_at).toLocaleDateString()}</td>
    </tr>`).join("");
}

window.loadUsers = loadUsers;