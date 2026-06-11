// services/apiClient.ts

const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app/";
const BASE_URL = `${API_BASE}/api`;

export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}, isFormData = false) => {
  const token = localStorage.getItem("token");
  
  const headers: HeadersInit = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  // Only set Content-Type to JSON if we are NOT sending FormData (like images).
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }
  return data;
};
