import axios from "axios";
import { useAuthStore } from "../stores/auth"; // Corrected path if store is in auth.js

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // Vite uses import.meta.env
});

api.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${accessToken}`,
      };
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
