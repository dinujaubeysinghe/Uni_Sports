import React, { createContext, useContext, useState, ReactNode } from "react";
import { User, UserRole } from "@/types";

const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app/";

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  loading: boolean;
  isLoading: boolean;
  updateProfile: (data: any) => Promise<{ success: boolean; message?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  deleteAccount: () => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize session from localStorage on load
  React.useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        setRole(parsedUser.role);
      } catch (e) {
        console.error("Failed to parse stored user", e);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  const switchRole = (newRole: UserRole) => setRole(newRole);

  const updateProfile = async (data: any): Promise<{ success: boolean; message?: string }> => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) return { success: false, message: json.message || 'Failed to update profile' };

      if (json.data) {
        const updatedUser = { ...user, ...json.data };
        setUser(updatedUser as User);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      return { success: true, message: json.message || 'Profile updated successfully' };
    } catch (error) {
      console.error('Update profile error', error);
      return { success: false, message: 'Network error, try again.' };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      return { success: res.ok, message: json.message || 'Failed to change password' };
    } catch (error) {
      console.error('Change password error', error);
      return { success: false, message: 'Network error, try again.' };
    }
  };

  const deleteAccount = async (): Promise<{ success: boolean; message?: string }> => {
    if (!user?.id) return { success: false, message: 'User id missing.' };
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await res.json();
      if (res.ok) {
        setUser(null);
        setRole(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return { success: true, message: json.message || 'Account deleted successfully' };
      }
      return { success: false, message: json.message || 'Failed to delete account' };
    } catch (error) {
      console.error('Delete account error', error);
      return { success: false, message: 'Network error, try again.' };
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; role?: UserRole }> => {
    
    // =========================================================================
    // REAL BACKEND LOGIN 
    // =========================================================================
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        const newToken = data.data.token;
        localStorage.setItem("token", newToken);
        localStorage.setItem("user", JSON.stringify(data.data.user));
        setToken(newToken);
        setUser(data.data.user);
        setRole(data.data.user.role);
        return { success: true, role: data.data.user.role };
      } else {
        return { success: false, error: data.message || "Invalid email or password" };
      }
    } catch (error) {
      console.error("Login Error:", error);
      return { success: false, error: "Network error, please try again later" };
    }

    // =========================================================================
    // MOCK LOGIN - COMMENTED OUT
    // Previously used mock data for development. Now using real backend.
    // =========================================================================
    /*
    return new Promise((resolve) => {
      setTimeout(() => {
        let loggedInRole: UserRole | null = null;
        
        if (email === "admin@my.sliit.lk" && password === "123456") {
          loggedInRole = "admin";
        } else if (email === "coach@my.sliit.lk" && password === "123456") {
          loggedInRole = "coach";
        } else if (
          email.endsWith("@my.sliit.lk") && 
          password === "s12345" && 
          email !== "admin@my.sliit.lk" && 
          email !== "coach@my.sliit.lk"
        ) {
          loggedInRole = "student";
        }

        if (loggedInRole) {
          const userData = mockUsers[loggedInRole];
          // Save mock session data so refresh works
          localStorage.setItem("token", "dummy-mock-token");
          localStorage.setItem("user", JSON.stringify(userData));
          
          setUser(userData);
          setRole(loggedInRole);
          resolve({ success: true, role: loggedInRole });
        } else {
          resolve({ success: false, error: "Invalid email or password" });
        }
      }, 500); // 500ms fake delay
    });
    */
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, token, login, logout, switchRole, loading, isLoading: loading, updateProfile, changePassword, deleteAccount }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }

  return context
}
