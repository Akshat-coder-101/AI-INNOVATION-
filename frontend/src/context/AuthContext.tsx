"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
  level: "beginner" | "intermediate" | "advanced";
  avatar: string;
  joinedDate: string;
}

interface AuthContextType {
  user: UserSession | null;
  login: (email: string, name?: string, level?: "beginner" | "intermediate" | "advanced") => void;
  logout: () => void;
  switchUser: (presetUser: UserSession) => void;
  isAuthenticated: boolean;
}

export const PRESET_USERS: UserSession[] = [
  {
    id: "user-pranjal",
    name: "Pranjal Mishra",
    email: "pranjal@sahayak.edu",
    role: "Full-Stack AI Learner",
    level: "advanced",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop",
    joinedDate: "Feb 2026",
  },
  {
    id: "user-aarav",
    name: "Aarav Sharma",
    email: "aarav.highschool@edu.in",
    role: "High-School STEM Student",
    level: "beginner",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop",
    joinedDate: "Jan 2026",
  },
  {
    id: "user-priya",
    name: "Dr. Priya Patel",
    email: "priya.research@mit.edu",
    role: "Postgraduate Researcher",
    level: "intermediate",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop",
    joinedDate: "Dec 2025",
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);

  useEffect(() => {
    // Load from localStorage or set default initial user
    const saved = localStorage.getItem("sahayak_user_session");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        setUser(PRESET_USERS[0]);
      }
    } else {
      // Default to Pranjal Mishra
      setUser(PRESET_USERS[0]);
      localStorage.setItem("sahayak_user_session", JSON.stringify(PRESET_USERS[0]));
    }
  }, []);

  const login = (email: string, name?: string, level: "beginner" | "intermediate" | "advanced" = "intermediate") => {
    const newUser: UserSession = {
      id: `user-${Date.now()}`,
      name: name || email.split("@")[0].replace(".", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      email,
      role: "Student Learner",
      level,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop",
      joinedDate: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    };
    setUser(newUser);
    localStorage.setItem("sahayak_user_session", JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("sahayak_user_session");
  };

  const switchUser = (presetUser: UserSession) => {
    setUser(presetUser);
    localStorage.setItem("sahayak_user_session", JSON.stringify(presetUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        switchUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
