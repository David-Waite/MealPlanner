import React, { useState, useEffect } from "react";
import { collectionGroup, query, where, getDocs, getDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { recipeConverter, globalIngredientConverter } from "../../lib/firestoreTypes";
import type { FirestoreRecipe, GlobalIngredient } from "../../lib/firestoreTypes";
import {
  approveRecipe, rejectRecipe, rejectRecipeUpdate,
  approveSnack, rejectSnack, rejectSnackUpdate,
} from "../../lib/cloudSync";
import { useAuth } from "../../context/AuthContext";
import styles from "./AdminPage.module.css";

type PendingRecipe = FirestoreRecipe & { ownerDisplayName: string; ownerId: string };
type PendingSnack = GlobalIngredient & { ownerDisplayName: string; ownerId: string };

export const AdminPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [recipes, setRecipes] = useState<PendingRecipe[]>([]);
  const [recipeUpdates, setRecipeUpdates] = useState<PendingRecipe[]>([]);
  const [snacks, setSnacks] = useState<PendingSnack[]>([]);
  const [snackUpdates, setSnackUpdates] = useState<PendingSnack[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);

    const resolveDisplayNames = async (uids: string[]): Promise<Record<string, string>> => {
      const names: Record<string, string> = {};
      await Promise.all(
        uids.map(async (uid) => {
          const snap = await getDoc(doc(db, "users", uid));
          if (snap.exists()) names[uid] = (snap.data() as { displayName: string }).displayName;
        })
      );
      return names;
    };

    Promise.all([
      // New recipe submissions
      getDocs(query(
        collectionGroup(db, "recipes").withConverter(recipeConverter),
        where("globalStatus", "==", "pending")
      )),
      // Recipe update suggestions
      getDocs(query(
        collectionGroup(db, "recipes").withConverter(recipeConverter),
        where("globalStatus", "==", "pending_update")
      )),
      // New snack submissions
      getDocs(query(
        collectionGroup(db, "localIngredients").withConverter(globalIngredientConverter),
        where("globalStatus", "==", "pending"),
        where("isSnack", "==", true)
      )),
      // Snack update suggestions
      getDocs(query(
        collectionGroup(db, "localIngredients").withConverter(globalIngredientConverter),
        where("globalStatus", "==", "pending_update"),
        where("isSnack", "==", true)
      )),
    ]).then(async ([newRecipeSnap, updateRecipeSnap, newSnackSnap, updateSnackSnap]) => {
      const newRecipes = newRecipeSnap.docs.map((d) => d.data());
      const updateRecipes = updateRecipeSnap.docs.map((d) => d.data());
      const newSnacks = newSnackSnap.docs.map((d) => ({ ...d.data(), ownerId: d.ref.parent.parent!.id }));
      const updateSnacks = updateSnackSnap.docs.map((d) => ({ ...d.data(), ownerId: d.ref.parent.parent!.id }));

      const allUids = [...new Set([
        ...newRecipes.map((r) => r.ownerId),
        ...updateRecipes.map((r) => r.ownerId),
        ...newSnacks.map((s) => s.ownerId),
        ...updateSnacks.map((s) => s.ownerId),
      ])];
      const displayNames = await resolveDisplayNames(allUids);

      const withName = <T extends { ownerId: string }>(items: T[]) =>
        items.map((item) => ({ ...item, ownerDisplayName: displayNames[item.ownerId] || item.ownerId }));

      setRecipes(withName(newRecipes));
      setRecipeUpdates(withName(updateRecipes));
      setSnacks(withName(newSnacks));
      setSnackUpdates(withName(updateSnacks));
    }).catch(console.error).finally(() => setLoading(false));
  }, [isAdmin]);

  if (!user) return <div className={styles.notice}>Sign in to access this page.</div>;
  if (!isAdmin) return <div className={styles.notice}>Access denied.</div>;

  const handleApproveRecipe = async (recipeId: string, ownerId: string) => {
    setActionLoading(recipeId);
    try {
      await approveRecipe(recipeId, ownerId);
      setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    } catch (err) {
      console.error(err);
      alert("Failed to approve.");
    } finally { setActionLoading(null); }
  };

  const handleRejectRecipe = async (recipeId: string, ownerId: string) => {
    setActionLoading(recipeId);
    try {
      await rejectRecipe(recipeId, ownerId, rejectReason.trim());
      setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
      setRejectingId(null);
      setRejectReason("");
    } catch (err) {
      console.error(err);
      alert("Failed to reject.");
    } finally { setActionLoading(null); }
  };

  const handleApproveSnack = async (snackId: string, ownerId: string) => {
    setActionLoading(snackId);
    try {
      await approveSnack(snackId, ownerId);
      setSnacks((prev) => prev.filter((s) => s.id !== snackId));
    } catch (err) {
      console.error(err);
      alert("Failed to approve snack.");
    } finally { setActionLoading(null); }
  };

  const handleRejectSnack = async (snackId: string, ownerId: string) => {
    setActionLoading(snackId);
    try {
      await rejectSnack(snackId, ownerId);
      setSnacks((prev) => prev.filter((s) => s.id !== snackId));
      setRejectingId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to reject snack.");
    } finally { setActionLoading(null); }
  };

  const handleApproveRecipeUpdate = async (recipeId: string, ownerId: string) => {
    setActionLoading(recipeId);
    try {
      await approveRecipe(recipeId, ownerId); // same logic: copy local → global, set "approved"
      setRecipeUpdates((prev) => prev.filter((r) => r.id !== recipeId));
    } catch (err) { console.error(err); alert("Failed to approve update."); }
    finally { setActionLoading(null); }
  };

  const handleRejectRecipeUpdate = async (recipeId: string, ownerId: string) => {
    setActionLoading(recipeId);
    try {
      await rejectRecipeUpdate(recipeId, ownerId); // resets to "approved"
      setRecipeUpdates((prev) => prev.filter((r) => r.id !== recipeId));
      setRejectingId(null);
    } catch (err) { console.error(err); alert("Failed to reject update."); }
    finally { setActionLoading(null); }
  };

  const handleApproveSnackUpdate = async (snackId: string, ownerId: string) => {
    setActionLoading(snackId);
    try {
      await approveSnack(snackId, ownerId); // same logic: copy local → globalIngredients
      setSnackUpdates((prev) => prev.filter((s) => s.id !== snackId));
    } catch (err) { console.error(err); alert("Failed to approve snack update."); }
    finally { setActionLoading(null); }
  };

  const handleRejectSnackUpdate = async (snackId: string, ownerId: string) => {
    setActionLoading(snackId);
    try {
      await rejectSnackUpdate(snackId, ownerId); // resets to "approved"
      setSnackUpdates((prev) => prev.filter((s) => s.id !== snackId));
      setRejectingId(null);
    } catch (err) { console.error(err); alert("Failed to reject snack update."); }
    finally { setActionLoading(null); }
  };

  const totalPending = recipes.length + recipeUpdates.length + snacks.length + snackUpdates.length;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Admin — Pending Reviews</h1>

      {loading && <p className={styles.notice}>Loading…</p>}
      {!loading && totalPending === 0 && (
        <p className={styles.notice}>Nothing pending review.</p>
      )}

      {/* ── Pending Snacks ── */}
      {snacks.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>New Snacks ({snacks.length})</h2>
          <div className={styles.recipeList}>
            {snacks.map((snack) => (
              <div key={snack.id} className={styles.recipeCard}>
                {snack.photoUrl && (
                  <img src={snack.photoUrl} alt={snack.name} className={styles.recipePhoto} />
                )}
                <div className={styles.recipeBody}>
                  <div className={styles.recipeHeader}>
                    <h2 className={styles.recipeName}>{snack.name}</h2>
                    <span className={styles.recipeAuthor}>by {snack.ownerDisplayName}</span>
                  </div>
                  <p className={styles.recipeDescription}>
                    {snack.category} · {snack.perishable ? "Perishable" : "Non-perishable"}
                    {snack.customUnits.length > 0 && (
                      <> · Custom units: {snack.customUnits.map((u) => u.label).join(", ")}</>
                    )}
                  </p>

                  <div className={styles.actions}>
                    <button
                      className={styles.approveBtn}
                      onClick={() => handleApproveSnack(snack.id, snack.ownerId)}
                      disabled={actionLoading === snack.id}
                    >
                      {actionLoading === snack.id ? "…" : "Approve"}
                    </button>
                    <button
                      className={styles.rejectBtn}
                      onClick={() => { setRejectingId(snack.id); setRejectReason(""); }}
                      disabled={actionLoading === snack.id}
                    >
                      Reject
                    </button>
                  </div>

                  {rejectingId === snack.id && (
                    <div className={styles.rejectForm}>
                      <div className={styles.rejectActions}>
                        <button
                          className={styles.rejectConfirmBtn}
                          onClick={() => handleRejectSnack(snack.id, snack.ownerId)}
                          disabled={actionLoading === snack.id}
                        >
                          {actionLoading === snack.id ? "Rejecting…" : "Confirm Rejection"}
                        </button>
                        <button className={styles.cancelBtn} onClick={() => setRejectingId(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Suggested Snack Updates ── */}
      {snackUpdates.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>Snack Updates ({snackUpdates.length})</h2>
          <div className={styles.recipeList}>
            {snackUpdates.map((snack) => (
              <div key={snack.id} className={`${styles.recipeCard} ${styles.updateCard}`}>
                {snack.photoUrl && (
                  <img src={snack.photoUrl} alt={snack.name} className={styles.recipePhoto} />
                )}
                <div className={styles.recipeBody}>
                  <div className={styles.recipeHeader}>
                    <h2 className={styles.recipeName}>{snack.name}</h2>
                    <span className={styles.recipeAuthor}>by {snack.ownerDisplayName}</span>
                  </div>
                  <p className={styles.recipeDescription}>
                    {snack.category} · {snack.perishable ? "Perishable" : "Non-perishable"}
                    {snack.customUnits.length > 0 && (
                      <> · Custom units: {snack.customUnits.map((u) => u.label).join(", ")}</>
                    )}
                  </p>
                  <div className={styles.actions}>
                    <button className={styles.approveBtn} onClick={() => handleApproveSnackUpdate(snack.id, snack.ownerId)} disabled={actionLoading === snack.id}>
                      {actionLoading === snack.id ? "…" : "Apply Update"}
                    </button>
                    <button className={styles.rejectBtn} onClick={() => { setRejectingId(snack.id); }} disabled={actionLoading === snack.id}>
                      Discard
                    </button>
                  </div>
                  {rejectingId === snack.id && (
                    <div className={styles.rejectForm}>
                      <div className={styles.rejectActions}>
                        <button className={styles.rejectConfirmBtn} onClick={() => handleRejectSnackUpdate(snack.id, snack.ownerId)} disabled={actionLoading === snack.id}>
                          {actionLoading === snack.id ? "…" : "Confirm Discard"}
                        </button>
                        <button className={styles.cancelBtn} onClick={() => setRejectingId(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Suggested Recipe Updates ── */}
      {recipeUpdates.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>Recipe Updates ({recipeUpdates.length})</h2>
          <div className={styles.recipeList}>
            {recipeUpdates.map((recipe) => (
              <div key={recipe.id} className={`${styles.recipeCard} ${styles.updateCard}`}>
                {recipe.photoUrl && (
                  <img src={recipe.photoUrl} alt={recipe.name} className={styles.recipePhoto} />
                )}
                <div className={styles.recipeBody}>
                  <div className={styles.recipeHeader}>
                    <h2 className={styles.recipeName}>{recipe.name}</h2>
                    <span className={styles.recipeAuthor}>by {recipe.ownerDisplayName}</span>
                  </div>
                  {recipe.description && <p className={styles.recipeDescription}>{recipe.description}</p>}
                  {recipe.tags.length > 0 && (
                    <div className={styles.tagRow}>
                      {recipe.tags.map((tag) => <span key={tag} className={styles.tag}>{tag}</span>)}
                    </div>
                  )}
                  {recipe.instructions.length > 0 && (
                    <ol className={styles.instructions}>
                      {recipe.instructions.map((step, i) => <li key={i}>{step}</li>)}
                    </ol>
                  )}
                  <div className={styles.actions}>
                    <button className={styles.approveBtn} onClick={() => handleApproveRecipeUpdate(recipe.id, recipe.ownerId)} disabled={actionLoading === recipe.id}>
                      {actionLoading === recipe.id ? "…" : "Apply Update"}
                    </button>
                    <button className={styles.rejectBtn} onClick={() => { setRejectingId(recipe.id); setRejectReason(""); }} disabled={actionLoading === recipe.id}>
                      Discard
                    </button>
                  </div>
                  {rejectingId === recipe.id && (
                    <div className={styles.rejectForm}>
                      <div className={styles.rejectActions}>
                        <button className={styles.rejectConfirmBtn} onClick={() => handleRejectRecipeUpdate(recipe.id, recipe.ownerId)} disabled={actionLoading === recipe.id}>
                          {actionLoading === recipe.id ? "…" : "Confirm Discard"}
                        </button>
                        <button className={styles.cancelBtn} onClick={() => setRejectingId(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Pending Recipes ── */}
      {recipes.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>New Recipes ({recipes.length})</h2>
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
                      onClick={() => handleApproveRecipe(recipe.id, recipe.ownerId)}
                      disabled={actionLoading === recipe.id}
                    >
                      {actionLoading === recipe.id ? "…" : "Approve"}
                    </button>
                    <button
                      className={styles.rejectBtn}
                      onClick={() => { setRejectingId(recipe.id); setRejectReason(""); }}
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
                          onClick={() => handleRejectRecipe(recipe.id, recipe.ownerId)}
                          disabled={actionLoading === recipe.id}
                        >
                          {actionLoading === recipe.id ? "Rejecting…" : "Confirm Rejection"}
                        </button>
                        <button className={styles.cancelBtn} onClick={() => setRejectingId(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
