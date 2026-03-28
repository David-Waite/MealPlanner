import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

interface AuthContextValue {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAdmin: false,
  loading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("[AuthContext] onAuthStateChanged fired. user:", firebaseUser ? firebaseUser.uid : "null");
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          console.log("[AuthContext] Fetching user doc for isAdmin check...");
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          const adminFlag = snap.exists() && snap.data()?.isAdmin === true;
          console.log("[AuthContext] User doc exists:", snap.exists(), "| isAdmin field:", snap.data()?.isAdmin, "| resolved isAdmin:", adminFlag);
          setIsAdmin(adminFlag);
        } catch (err) {
          console.error("[AuthContext] Failed to fetch user doc:", err);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
