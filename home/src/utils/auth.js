// src/utils/auth.js
const KEY = "users";

export function loadUsers() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveUsers(users) {
  localStorage.setItem(KEY, JSON.stringify(users));
}

export function addUser({ username, email, password, role = "user" }) {
  const users = loadUsers();
  const exists = users.some(
    (u) =>
      u.email?.toLowerCase() === email.toLowerCase() ||
      u.username?.toLowerCase() === username.toLowerCase()
  );
  if (exists) {
    throw new Error("Ya existe un usuario con ese email o nombre de usuario.");
  }
  const newUser = {
    id: Date.now(),
    username,
    email,
    password, // ⚠️ DEMO: en producción
  };
  users.push(newUser);
  saveUsers(users);
  return newUser;
}

export function findUser(login, password) {
  const users = loadUsers();
  return users.find(
    (u) =>
      (u.email?.toLowerCase() === login.toLowerCase() ||
        u.username?.toLowerCase() === login.toLowerCase()) &&
      u.password === password
  );
}
