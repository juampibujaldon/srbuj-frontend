import { apiJson } from "./client";

const BASE = "/api/user";

export async function registerUser({ username, email, password, role = "user" }) {
  return apiJson(`${BASE}/register/`, {
    method: "POST",
    auth: false,
    json: {
      username,
      email,
      password,
      password2: password,
      role,
    },
  });
}

export async function loginUser({ username, password }) {
  return apiJson(`${BASE}/login/`, {
    method: "POST",
    auth: false,
    json: { username, password },
  });
}

export async function fetchProfile() {
  return apiJson(`${BASE}/profile/`, {
    method: "GET",
  });
}

export async function logoutUser() {
  return apiJson(`${BASE}/logout/`, {
    method: "POST",
  });
}
