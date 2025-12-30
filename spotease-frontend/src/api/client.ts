import axios from "axios";
import { queryClient } from "@/lib/queryClient";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8080",
  withCredentials: true, // Important for session cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const sessionExpired = error.response.headers["x-session-expired"];

      if (sessionExpired === "netease") {
        // NetEase session expired - only clear NetEase connection
        queryClient.setQueryData(["authStatus"], (old: {
          authenticated: boolean;
          spotifyConnected: boolean;
          neteaseConnected: boolean;
        } | undefined) => ({
          authenticated: old?.authenticated ?? false,
          spotifyConnected: old?.spotifyConnected ?? false,
          neteaseConnected: false,
        }));
        // Redirect to dashboard to show re-login option
        if (window.location.pathname !== "/dashboard") {
          window.location.href = "/dashboard";
        }
      } else {
        // General auth failure - clear all auth state
        queryClient.setQueryData(["authStatus"], {
          authenticated: false,
          spotifyConnected: false,
          neteaseConnected: false,
        });

        // Redirect to login page if not already there
        if (window.location.pathname !== "/") {
          window.location.href = "/";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
