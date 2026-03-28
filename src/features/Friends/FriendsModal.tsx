import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, getDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { friendshipConverter } from "../../lib/firestoreTypes";
import type { FirestoreFriendship, FirestoreUser } from "../../lib/firestoreTypes";
import { useAuth } from "../../context/AuthContext";
import { Modal } from "../../components/Modal/Modal";
import { Button } from "../../components/Button/Button";
import { Input } from "../../components/Form/Input";
import {
  searchUsersByUsername,
  sendFriendRequest,
  respondToFriendRequest,
  setShareAll,
} from "../../lib/cloudSync";
import styles from "./Friends.module.css";

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = "friends" | "requests" | "find";

export const FriendsModal: React.FC<FriendsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("friends");

  // All friendships for the current user (from onSnapshot)
  const [friendships, setFriendships] = useState<FirestoreFriendship[]>([]);

  // Resolved display names & usernames for friend UIDs
  const [profiles, setProfiles] = useState<Record<string, { displayName: string; username: string }>>({});

  // Find tab state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FirestoreUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  // Loading state for individual actions (keyed by friendship/user id)
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Real-time friendships subscription
  useEffect(() => {
    if (!isOpen || !user) return;

    const q = query(
      collection(db, "friendships").withConverter(friendshipConverter),
      where("userIds", "array-contains", user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      setFriendships(snap.docs.map((d) => d.data()));
    });

    return unsub;
  }, [isOpen, user]);

  // Resolve display names for any unknown friend UIDs
  useEffect(() => {
    if (!user) return;

    const unknownUids = [
      ...new Set(
        friendships
          .flatMap((f) => f.userIds as string[])
          .filter((uid) => uid !== user.uid && !profiles[uid])
      ),
    ];

    if (unknownUids.length === 0) return;

    Promise.all(
      unknownUids.map(async (uid) => {
        const snap = await getDoc(doc(db, "users", uid));
        return snap.exists()
          ? { uid, data: snap.data() as { displayName: string; username: string } }
          : null;
      })
    ).then((results) => {
      const newProfiles: typeof profiles = {};
      results.forEach((r) => {
        if (r) newProfiles[r.uid] = { displayName: r.data.displayName, username: r.data.username };
      });
      setProfiles((prev) => ({ ...prev, ...newProfiles }));
    });
  }, [friendships, user, profiles]);

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSearchResults([]);
      setSentRequests(new Set());
    }
  }, [isOpen]);

  if (!user) return null;

  // --- Derived state ---
  const pendingIncoming = friendships.filter(
    (f) => f.status === "pending" && f.requesterId !== user.uid
  );
  const pendingOutgoing = friendships.filter(
    (f) => f.status === "pending" && f.requesterId === user.uid
  );
  const accepted = friendships.filter((f) => f.status === "accepted");

  const existingPartnerUids = new Set(
    friendships.flatMap((f) => f.userIds as string[]).filter((uid) => uid !== user.uid)
  );

  const getFriendUid = (f: FirestoreFriendship) =>
    f.userIds[0] === user.uid ? f.userIds[1] : f.userIds[0];

  const getDisplayName = (uid: string) => profiles[uid]?.displayName || uid;
  const getUsername = (uid: string) => profiles[uid]?.username;

  // --- Handlers ---
  const handleSearch = async () => {
    if (!user || searchQuery.trim().length < 2) return;
    setSearching(true);
    try {
      const results = await searchUsersByUsername(searchQuery, user.uid);
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (targetUid: string) => {
    if (!user) return;
    setActionLoading(targetUid);
    try {
      await sendFriendRequest(user.uid, targetUid);
      setSentRequests((prev) => new Set([...prev, targetUid]));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRespond = async (friendshipId: string, accept: boolean) => {
    setActionLoading(friendshipId);
    try {
      await respondToFriendRequest(friendshipId, accept);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleShareAll = async (f: FirestoreFriendship) => {
    if (!user) return;
    const friendUid = getFriendUid(f);
    const iAmSharing = !!f.shareAll[user.uid];
    setActionLoading(f.id + "-share");
    try {
      await setShareAll(f.id, user.uid, friendUid, !iAmSharing);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Friends">
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === "friends" ? styles.tabActive : ""}`}
          onClick={() => setTab("friends")}
        >
          Friends
          {accepted.length > 0 && (
            <span className={styles.tabCount}>{accepted.length}</span>
          )}
        </button>
        <button
          className={`${styles.tab} ${tab === "requests" ? styles.tabActive : ""}`}
          onClick={() => setTab("requests")}
        >
          Requests
          {pendingIncoming.length > 0 && (
            <span className={styles.tabBadge}>{pendingIncoming.length}</span>
          )}
        </button>
        <button
          className={`${styles.tab} ${tab === "find" ? styles.tabActive : ""}`}
          onClick={() => setTab("find")}
        >
          Find
        </button>
      </div>

      <div className={styles.tabContent}>
        {/* ── Friends tab ── */}
        {tab === "friends" && (
          <div className={styles.section}>
            {accepted.length === 0 ? (
              <p className={styles.empty}>
                No friends yet. Use "Find" to search for people to add.
              </p>
            ) : (
              accepted.map((f) => {
                const friendUid = getFriendUid(f);
                const iAmSharing = !!f.shareAll[user.uid];
                const theyAreSharing = !!f.shareAll[friendUid];
                return (
                  <div key={f.id} className={styles.friendRow}>
                    <div className={styles.friendAvatar}>
                      {getDisplayName(friendUid).charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.friendInfo}>
                      <span className={styles.friendName}>{getDisplayName(friendUid)}</span>
                      {getUsername(friendUid) && (
                        <span className={styles.friendHandle}>@{getUsername(friendUid)}</span>
                      )}
                      {theyAreSharing && (
                        <span className={styles.sharingBadge}>Sharing recipes with you</span>
                      )}
                    </div>
                    <label className={styles.shareToggle}>
                      <input
                        type="checkbox"
                        checked={iAmSharing}
                        disabled={actionLoading === f.id + "-share"}
                        onChange={() => handleToggleShareAll(f)}
                      />
                      <span>Share my recipes</span>
                    </label>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Requests tab ── */}
        {tab === "requests" && (
          <div className={styles.section}>
            {pendingIncoming.length === 0 && pendingOutgoing.length === 0 ? (
              <p className={styles.empty}>No pending friend requests.</p>
            ) : (
              <>
                {pendingIncoming.length > 0 && (
                  <>
                    <div className={styles.sectionLabel}>Incoming</div>
                    {pendingIncoming.map((f) => (
                      <div key={f.id} className={styles.requestRow}>
                        <div className={styles.requestInfo}>
                          <span className={styles.requestName}>{getDisplayName(f.requesterId)}</span>
                          {getUsername(f.requesterId) && (
                            <span className={styles.requestHandle}>@{getUsername(f.requesterId)}</span>
                          )}
                        </div>
                        <div className={styles.requestActions}>
                          <Button
                            variant="primary"
                            disabled={actionLoading === f.id}
                            onClick={() => handleRespond(f.id, true)}
                          >
                            Accept
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={actionLoading === f.id}
                            onClick={() => handleRespond(f.id, false)}
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {pendingOutgoing.length > 0 && (
                  <>
                    <div className={styles.sectionLabel} style={{ marginTop: pendingIncoming.length > 0 ? "var(--spacing-4)" : undefined }}>
                      Sent
                    </div>
                    {pendingOutgoing.map((f) => {
                      const targetUid = getFriendUid(f);
                      return (
                        <div key={f.id} className={styles.requestRow}>
                          <div className={styles.requestInfo}>
                            <span className={styles.requestName}>{getDisplayName(targetUid)}</span>
                            {getUsername(targetUid) && (
                              <span className={styles.requestHandle}>@{getUsername(targetUid)}</span>
                            )}
                          </div>
                          <span className={styles.pendingBadge}>Pending</span>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Find tab ── */}
        {tab === "find" && (
          <div className={styles.section}>
            <div className={styles.searchRow}>
              <Input
                type="text"
                placeholder="Search by username…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button
                variant="primary"
                onClick={handleSearch}
                disabled={searching || searchQuery.trim().length < 2}
              >
                {searching ? "…" : "Search"}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className={styles.searchResults}>
                {searchResults.map((u) => {
                  const alreadyConnected = existingPartnerUids.has(u.uid);
                  const justSent = sentRequests.has(u.uid);
                  return (
                    <div key={u.uid} className={styles.userRow}>
                      <div className={styles.userAvatar}>
                        {u.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.userInfo}>
                        <span className={styles.userName}>{u.displayName}</span>
                        <span className={styles.userHandle}>@{u.username}</span>
                      </div>
                      {alreadyConnected || justSent ? (
                        <span className={styles.pendingBadge}>
                          {justSent ? "Request sent" : "Connected"}
                        </span>
                      ) : (
                        <Button
                          variant="primary"
                          disabled={actionLoading === u.uid}
                          onClick={() => handleSendRequest(u.uid)}
                        >
                          Add
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {searchResults.length === 0 &&
              searchQuery.trim().length >= 2 &&
              !searching && (
                <p className={styles.empty}>No users found for "{searchQuery}".</p>
              )}
          </div>
        )}
      </div>
    </Modal>
  );
};
