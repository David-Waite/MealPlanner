import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { friendshipConverter } from "../lib/firestoreTypes";
import { useAuth } from "../context/AuthContext";

/**
 * Returns the count of incoming pending friend requests for the current user.
 * Updates in real-time via onSnapshot. Returns 0 when unauthenticated.
 */
export function useFriendsPending(): number {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }

    const q = query(
      collection(db, "friendships").withConverter(friendshipConverter),
      where("userIds", "array-contains", user.uid),
      where("status", "==", "pending")
    );

    const unsub = onSnapshot(q, (snap) => {
      const incoming = snap.docs
        .map((d) => d.data())
        .filter((f) => f.requesterId !== user.uid);
      setCount(incoming.length);
    });

    return unsub;
  }, [user]);

  return count;
}
