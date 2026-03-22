import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { migrateLocalToCloud, syncFromCloud, CLOUD_SYNCED_KEY } from "../../lib/cloudSync";
import { useAppState, useAppDispatch } from "../../context/hooks";
import { Modal } from "../../components/Modal/Modal";
import { Button } from "../../components/Button/Button";
import { Input } from "../../components/Form/Input";
import { FormGroup } from "../../components/Form/FormGroup";
import styles from "./AuthModal.module.css";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = "signin" | "signup";

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const [tab, setTab] = useState<Tab>("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sign in fields
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Sign up fields
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");

  const clearError = () => setError(null);

  const handleTabChange = (t: Tab) => {
    setTab(t);
    clearError();
  };

  // --- Sign In ---
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearError();
    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        signInEmail,
        signInPassword
      );
      const uid = credential.user.uid;

      // Only sync if this device hasn't synced for this account yet
      if (localStorage.getItem(CLOUD_SYNCED_KEY) !== uid) {
        const merged = await syncFromCloud(uid, state.meals, state.customUnits);
        dispatch({ type: "MERGE_CLOUD_DATA", payload: merged });
      }

      onClose();
    } catch (err: any) {
      console.error("[AuthModal] Sign in error:", err);
      setError(friendlyAuthError(err.code));
    } finally {
      setLoading(false);
    }
  };

  // --- Sign Up ---
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearError();
    try {
      // Check username uniqueness
      const usernameQuery = query(
        collection(db, "users"),
        where("username", "==", username.trim().toLowerCase())
      );
      const usernameSnap = await getDocs(usernameQuery);
      if (!usernameSnap.empty) {
        setError("That username is already taken. Please choose another.");
        setLoading(false);
        return;
      }

      // Create Firebase Auth account
      const credential = await createUserWithEmailAndPassword(
        auth,
        signUpEmail,
        signUpPassword
      );
      const { user } = credential;

      // Set displayName on auth profile
      await updateProfile(user, { displayName: displayName.trim() });

      // Write user document to Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        username: username.trim().toLowerCase(),
        displayName: displayName.trim(),
        email: signUpEmail,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Migrate all local data to Firestore
      await migrateLocalToCloud(user.uid, state);

      onClose();
    } catch (err: any) {
      console.error("[AuthModal] Sign up error:", err);
      setError(friendlyAuthError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tab === "signin" ? "Sign in" : "Create account"}
    >
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === "signin" ? styles.tabActive : ""}`}
          onClick={() => handleTabChange("signin")}
        >
          Sign in
        </button>
        <button
          className={`${styles.tab} ${tab === "signup" ? styles.tabActive : ""}`}
          onClick={() => handleTabChange("signup")}
        >
          Create account
        </button>
      </div>

      {tab === "signin" ? (
        <form className={styles.form} onSubmit={handleSignIn}>
          {error && <div className={styles.error}>{error}</div>}
          <FormGroup label="Email">
            <Input
              type="email"
              value={signInEmail}
              onChange={(e) => setSignInEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </FormGroup>
          <FormGroup label="Password">
            <Input
              type="password"
              value={signInPassword}
              onChange={(e) => setSignInPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </FormGroup>
          <div className={styles.footer}>
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </div>
        </form>
      ) : (
        <form className={styles.form} onSubmit={handleSignUp}>
          {error && <div className={styles.error}>{error}</div>}
          <FormGroup label="Display name">
            <Input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              required
              autoComplete="name"
            />
          </FormGroup>
          <FormGroup label="Username">
            <Input
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))
              }
              placeholder="e.g. davidcooks"
              required
              autoComplete="username"
            />
          </FormGroup>
          <FormGroup label="Email">
            <Input
              type="email"
              value={signUpEmail}
              onChange={(e) => setSignUpEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </FormGroup>
          <FormGroup label="Password">
            <Input
              type="password"
              value={signUpPassword}
              onChange={(e) => setSignUpPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </FormGroup>
          <div className={styles.footer}>
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

// Maps Firebase auth error codes to user-friendly messages
function friendlyAuthError(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    default:
      return "Something went wrong. Please try again.";
  }
}
