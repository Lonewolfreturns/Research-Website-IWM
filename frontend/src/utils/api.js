import axios from "axios";

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "");
export const API_BASE = `${BACKEND_URL}/api`;

// Broadcast so AuthContext can drop its session state when the token is rejected.
export const AUTH_EXPIRED_EVENT = "iwm:auth-expired";

export const api = axios.create({ baseURL: API_BASE });

const TOKEN_KEY = "iwm_admin_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      const hadToken = Boolean(getToken());
      setToken(null);
      if (hadToken) window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    return Promise.reject(err);
  }
);

// Build a full URL for a stored file path served by the backend proxy.
export function fileUrl(storagePath) {
  if (!storagePath) return "";
  if (/^https?:\/\//i.test(storagePath)) return storagePath;
  return `${API_BASE}/files/${storagePath}`;
}

// Upload a file straight to S3 via a presigned URL; returns the public URL to store.
export async function uploadViaPresign(file, folder = "uploads") {
  const { data } = await api.post("/admin/uploads/presign", {
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    folder,
  });
  // Note: plain axios (not `api`) — no auth header, no baseURL, or the S3 signature breaks.
  await axios.put(data.uploadUrl, file, {
    headers: { "Content-Type": data.contentType },
  });
  return data.publicUrl;
}
