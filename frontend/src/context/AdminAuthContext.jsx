import { createContext, useContext, useState, useEffect } from "react";
import { API_URL } from "../hooks/useApi";

const AdminAuthContext = createContext();

export const useAdminAuth = () => useContext(AdminAuthContext);

export const AdminAuthProvider = ({ children }) => {
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem("adminToken"));
  const [isAdminAuth, setIsAdminAuth] = useState(!!localStorage.getItem("adminToken"));

  useEffect(() => {
    if (adminToken) {
      localStorage.setItem("adminToken", adminToken);
      setIsAdminAuth(true);
    } else {
      localStorage.removeItem("adminToken");
      setIsAdminAuth(false);
    }
  }, [adminToken]);

  const loginAdmin = async (adminId, password) => {
    try {
      const res = await fetch(`${API_URL}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId, password })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to login");

      setAdminToken(data.data.token);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const logoutAdmin = () => {
    setAdminToken(null);
  };

  const updateAdminToken = (token) => {
    setAdminToken(token || null);
  };

  const fetchAdmin = async (endpoint, options = {}) => {
    const token = localStorage.getItem("adminToken");
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (res.status === 401 || res.status === 403) {
      logoutAdmin();
      throw new Error("Admin session expired. Please log in again.");
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Request failed");

    return data;
  };

  return (
    <AdminAuthContext.Provider value={{ isAdminAuth, adminToken, loginAdmin, logoutAdmin, fetchAdmin, updateAdminToken }}>
      {children}
    </AdminAuthContext.Provider>
  );
};
