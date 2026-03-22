import React, { useState, useEffect } from "react";
import { collectionGroup, query, where, getDocs, getDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { recipeConverter } from "../../lib/firestoreTypes";
import type { FirestoreRecipe } from "../../lib/firestoreTypes";
import { approveRecipe, rejectRecipe } from "../../lib/cloudSync";
import { useAuth } from "../../context/AuthContext";
import styles from "./AdminPage.module.css";

type PendingRecipe = FirestoreRecipe & { ownerDisplayName: string };

export const AdminPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [recipes, setRecipes] = useState<PendingRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);

    getDocs(
      query(
        collectionGroup(db, "recipes").withConverter(recipeConverter),
        where("globalStatus", "==", "pending")
      )
    ).then(async (snap) => {
      const pending = snap.docs.map((d) => d.data());

      // Resolve owner display names
      const ownerIds = [...new Set(pending.map((r) => r.ownerId))];
      const displayNames: Record<string, string> = {};
      await Promise.all(
        ownerIds.map(async (uid) => {
          const userSnap = await getDoc(doc(db, "users", uid));
          if (userSnap.exists()) {
            displayNames[uid] = (userSnap.data() as { displayName: string }).displayName;
          }
        })
      );

      setRecipes(
        pending.map((r) => ({
          ...r,
          ownerDisplayName: displayNames[r.ownerId] || r.ownerId,
        }))
      );
    }).catch(console.error).finally(() => setLoading(false));
  }, [isAdmin]);

  if (!user) {
    return <div className={styles.notice}>Sign in to access this page.</div>;
  }

  if (!isAdmin) {
    return <div className={styles.notice}>Access denied.</div>;
  }

  const handleApprove = async (recipeId: string, ownerId: string) => {
    setActionLoading(recipeId);
    try {
      await approveRecipe(recipeId, ownerId);
      setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    } catch (err) {
      console.error(err);
      alert("Failed to approve.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (recipeId: string, ownerId: string) => {
    setActionLoading(recipeId);
    try {
      await rejectRecipe(recipeId, ownerId, rejectReason.trim());
      setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
      setRejectingId(null);
      setRejectReason("");
    } catch (err) {
      console.error(err);
      alert("Failed to reject.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Admin — Pending Reviews</h1>

      {loading && <p className={styles.notice}>Loading…</p>}

      {!loading && recipes.length === 0 && (
        <p className={styles.notice}>No recipes pending review.</p>
      )}

      <div className={styles.recipeList}>
        {recipes.map((recipe) => (
          <div key={recipe.id} className={styles.recipeCard}>
            {recipe.photoUrl && (
              <img src={recipe.photoUrl} alt={recipe.name} className={styles.recipePhoto} />
            )}
            <div className={styles.recipeBody}>
              <div className={styles.recipeHeader}>
                <h2 className={styles.recipeName}>{recipe.name}</h2>
                <span className={styles.recipeAuthor}>by {recipe.ownerDisplayName}</span>
              </div>

              {recipe.description && (
                <p className={styles.recipeDescription}>{recipe.description}</p>
              )}

              {recipe.tags.length > 0 && (
                <div className={styles.tagRow}>
                  {recipe.tags.map((tag) => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
              )}

              {recipe.instructions.length > 0 && (
                <ol className={styles.instructions}>
                  {recipe.instructions.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              )}

              <div className={styles.actions}>
                <button
                  className={styles.approveBtn}
                  onClick={() => handleApprove(recipe.id, recipe.ownerId)}
                  disabled={actionLoading === recipe.id}
                >
                  {actionLoading === recipe.id ? "…" : "Approve"}
                </button>
                <button
                  className={styles.rejectBtn}
                  onClick={() => {
                    setRejectingId(recipe.id);
                    setRejectReason("");
                  }}
                  disabled={actionLoading === recipe.id}
                >
                  Reject
                </button>
              </div>

              {rejectingId === recipe.id && (
                <div className={styles.rejectForm}>
                  <textarea
                    className={styles.rejectTextarea}
                    placeholder="Optional rejection reason…"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                  />
                  <div className={styles.rejectActions}>
                    <button
                      className={styles.rejectConfirmBtn}
                      onClick={() => handleReject(recipe.id, recipe.ownerId)}
                      disabled={actionLoading === recipe.id}
                    >
                      {actionLoading === recipe.id ? "Rejecting…" : "Confirm Rejection"}
                    </button>
                    <button
                      className={styles.cancelBtn}
                      onClick={() => setRejectingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
