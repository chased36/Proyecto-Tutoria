"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { User } from "./auth";

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        if (userData.id && userData.email) {
          setUser(userData);
          if (typeof document !== "undefined") {
            document.cookie = `user=${savedUser}; path=/; max-age=86400`;
          }
        } else {
          localStorage.removeItem("user");
          if (typeof document !== "undefined") {
            document.cookie =
              "user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          }
        }
      }
    } catch (error) {
      console.error("Error parsing saved user:", error);
      localStorage.removeItem("user");
      if (typeof document !== "undefined") {
        document.cookie =
          "user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
    }
    setIsLoading(false);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user") {
        if (e.newValue) {
          try {
            const userData = JSON.parse(e.newValue);
            setUser(userData);
          } catch (error) {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const login = (user: User) => {
    setUser(user);
    const userString = JSON.stringify(user);
    localStorage.setItem("user", userString);
    if (typeof document !== "undefined") {
      document.cookie = `user=${userString}; path=/; max-age=86400`;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    if (typeof document !== "undefined") {
      document.cookie = "user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
