import React, { useState, useRef, useEffect } from "react";
import styles from "./AccountDropdown.module.css";

interface AccountDropdownProps {
  displayName: string | null;
  email: string | null;
  isAdmin: boolean;
  pendingFriendCount: number;
  onFriends: () => void;
  onAdmin: () => void;
  onSignOut: () => void;
}

function getInitials(displayName: string | null, email: string | null): string {
  if (displayName) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

export const AccountDropdown: React.FC<AccountDropdownProps> = ({
  displayName,
  email,
  isAdmin,
  pendingFriendCount,
  onFriends,
  onAdmin,
  onSignOut,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const initials = getInitials(displayName, email);
  const label = displayName || email || "Account";

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        className={styles.avatarBtn}
        onClick={() => setOpen((p) => !p)}
        title="Account"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className={styles.initials}>{initials}</span>
        {pendingFriendCount > 0 && (
          <span className={styles.notifDot}>{pendingFriendCount}</span>
        )}
      </button>

      {open && (
        <div className={styles.dropdown}>
          {/* User info */}
          <div className={styles.userInfo}>
            <div className={styles.avatarLarge}>{initials}</div>
            <div className={styles.userText}>
              <span className={styles.userName}>{label}</span>
              {displayName && email && (
                <span className={styles.userEmail}>{email}</span>
              )}
            </div>
          </div>

          <div className={styles.divider} />

          {/* Actions */}
          <button
            className={styles.item}
            onClick={() => { setOpen(false); onFriends(); }}
          >
            <span className={styles.itemIcon}>👥</span>
            <span className={styles.itemLabel}>Friends</span>
            {pendingFriendCount > 0 && (
              <span className={styles.badge}>{pendingFriendCount}</span>
            )}
          </button>

          {isAdmin && (
            <button
              className={`${styles.item} ${styles.itemAdmin}`}
              onClick={() => { setOpen(false); onAdmin(); }}
            >
              <span className={styles.itemIcon}>⚙️</span>
              <span className={styles.itemLabel}>Admin Panel</span>
            </button>
          )}

          <div className={styles.divider} />

          <button
            className={`${styles.item} ${styles.itemSignOut}`}
            onClick={() => { setOpen(false); onSignOut(); }}
          >
            <span className={styles.itemIcon}>🚪</span>
            <span className={styles.itemLabel}>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
};
