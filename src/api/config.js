const API_BASE =
  import.meta.env.VITE_AUTH_BASE_URL?.trim() ||
  "https://uatauthbckend.karatly.net";

export default API_BASE;
