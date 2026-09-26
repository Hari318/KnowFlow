import { apiFetch } from "./api";

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AccessTokenResponse {
  access_token: string;
  token_type: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  created_at: string;
}

export interface RegisterResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  created_at: string;
  invited_workspace_id: string | null;
}

export async function login(email: string, password: string) {
  const data = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    skipAuth: true,
  });
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("refresh_token", data.refresh_token);
  return data;
}

export async function register(
  email: string,
  password: string,
  first_name: string,
  last_name?: string,
  invite_token?: string
): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, first_name, last_name, invite_token }),
    skipAuth: true,
  });
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) throw new Error("No refresh token available");

  const data = await apiFetch<AccessTokenResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
    skipAuth: true,
  });

  localStorage.setItem("access_token", data.access_token);
  return data.access_token;
}

export function getMe() {
  return apiFetch<CurrentUser>("/auth/me");
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.location.href = "/login";
}