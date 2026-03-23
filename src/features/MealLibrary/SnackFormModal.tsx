import React, { useState, useEffect, useRef, useMemo } from "react";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../lib/firebase";
import type { Ingredient, IngredientCategory } from "../../types";
import { CATEGORY_ORDER } from "../../types";
import { useAppState, useAppDispatch } from "../../context/hooks";
import { useAuth } from "../../context/AuthContext";
import {
  saveLocalIngredient,
  updateLocalIngredient,
  submitSnackForReview,
  suggestSnackUpdate,
} from "../../lib/cloudSync";
import type { GlobalIngredient } from "../../lib/firestoreTypes";
import styles from "./SnackFormModal.module.css";

interface CustomUnitRow {
  tempId: string;
  label: string;
  metricEquivalent: string;
  metricUnit: "g" | "ml";
}

interface SnackFormModalProps {
  initialData?: Ingredient | null;  // provided for edit mode
  onClose: () => void;
}

export const SnackFormModal: React.FC<SnackFormModalProps> = ({ initialData, onClose }) => {
  const { ingredients } = useAppState();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  const isEditing = !!initialData;

  // ── Core fields ──
  const [name, setName] = useState("");
  const [category, setCategory] = useState<IngredientCategory>("Snacks");
  const [perishable, setPerishable] = useState(false);
  const [customUnits, setCustomUnits] = useState<CustomUnitRow[]>([]);
  const [linkedIngredientId, setLinkedIngredientId] = useState<string | null>(null);

  // ── Photo ──
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── Name autocomplete ──
  const [nameSearch, setNameSearch] = useState("");
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const nameRef = useRef<HTMLDivElement>(null);

  // ── UI state ──
  const [saving, setSaving] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [suggestingUpdate, setSuggestingUpdate] = useState(false);
  const [error, setError] = useState("");

  // ── Populate from initialData on mount ──
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setNameSearch(initialData.name);
      setCategory(initialData.category);
      setPerishable(initialData.perishable);
      setPhotoUrl(initialData.photoUrl ?? "");
      setPhotoPreview(initialData.photoUrl ?? "");
      setLinkedIngredientId(initialData.id);
      setCustomUnits(
        (initialData.customUnits ?? []).map((cu) => ({
          tempId: cu.id,
          label: cu.label,
          metricEquivalent: cu.metricEquivalent != null ? String(cu.metricEquivalent) : "",
          metricUnit: (cu.metricUnit as "g" | "ml") ?? "g",
        }))
      );
    }
  }, [initialData]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showNameDropdown) return;
    const handler = (e: MouseEvent) => {
      if (nameRef.current && !nameRef.current.contains(e.target as Node)) {
        setShowNameDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showNameDropdown]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── Name autocomplete results ──
  const nameSuggestions = useMemo(() => {
    const q = nameSearch.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return ingredients
      .filter((i) => i.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [ingredients, nameSearch]);

  const handleSelectSuggestion = (ing: Ingredient) => {
    setName(ing.name);
    setNameSearch(ing.name);
    setCategory(ing.category);
    setPerishable(ing.perishable);
    setPhotoUrl(ing.photoUrl ?? "");
    setPhotoPreview(ing.photoUrl ?? "");
    setLinkedIngredientId(ing.id);
    setCustomUnits(
      (ing.customUnits ?? []).map((cu) => ({
        tempId: cu.id,
        label: cu.label,
        metricEquivalent: cu.metricEquivalent != null ? String(cu.metricEquivalent) : "",
        metricUnit: (cu.metricUnit as "g" | "ml") ?? "g",
      }))
    );
    setShowNameDropdown(false);
    setError("");
  };

  // ── Photo handlers ──
  const applyPhotoFile = (file: File) => {
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handlePhotoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applyPhotoFile(file);
  };

  const handlePhotoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPhoto(false);
    // Only intercept image drops, not snack drags
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) applyPhotoFile(file);
  };

  const uploadPhoto = async (ingredientId: string): Promise<string> => {
    if (!photoFile) return photoUrl;
    if (!user) throw new Error("Must be signed in to upload a photo.");
    const path = `ingredients/${user.uid}/${ingredientId}/photo_${Date.now()}`;
    const fileRef = storageRef(storage, path);
    const task = uploadBytesResumable(fileRef, photoFile);
    return new Promise((resolve, reject) => {
      task.on(
        "state_changed",
        (snap) => setUploadProgress((snap.bytesTransferred / snap.totalBytes) * 100),
        reject,
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          setUploadProgress(null);
          resolve(url);
        }
      );
    });
  };

  // ── Custom units ──
  const addUnitRow = () =>
    setCustomUnits((prev) => [
      ...prev,
      { tempId: crypto.randomUUID(), label: "", metricEquivalent: "", metricUnit: "g" },
    ]);

  const updateUnit = (tempId: string, field: keyof CustomUnitRow, value: string) =>
    setCustomUnits((prev) =>
      prev.map((u) => (u.tempId === tempId ? { ...u, [field]: value } : u))
    );

  const removeUnit = (tempId: string) =>
    setCustomUnits((prev) => prev.filter((u) => u.tempId !== tempId));

  // ── Save ──
  const handleSave = async () => {
    const trimmedName = name.trim() || nameSearch.trim();
    if (!trimmedName) { setError("Name is required."); return; }

    const ingredientId = linkedIngredientId ?? crypto.randomUUID();

    const builtUnits = customUnits
      .filter((u) => u.label.trim())
      .map((u) => ({
        id: u.tempId,
        label: u.label.trim(),
        ingredientId,
        ...(u.metricEquivalent && !isNaN(parseFloat(u.metricEquivalent))
          ? { metricEquivalent: parseFloat(u.metricEquivalent), metricUnit: u.metricUnit as "g" | "ml" }
          : {}),
      }));

    setSaving(true);
    try {
      const finalPhotoUrl = await uploadPhoto(ingredientId);

      const firestoreIngredient: GlobalIngredient = {
        id: ingredientId,
        name: trimmedName,
        category,
        perishable,
        isSnack: true,
        photoUrl: finalPhotoUrl || null,
        bookmarkedFromId: initialData?.bookmarkedFromId ?? null,
        globalStatus: initialData?.globalStatus ?? "none",
        customUnits: builtUnits,
      };

      const stateIngredient: Ingredient = {
        id: ingredientId,
        name: trimmedName,
        category,
        perishable,
        isSnack: true,
        photoUrl: finalPhotoUrl || undefined,
        source: "local",
        bookmarkedFromId: initialData?.bookmarkedFromId,
        globalStatus: initialData?.globalStatus ?? "none",
        customUnits: builtUnits,
      };

      if (isEditing) {
        dispatch({ type: "UPDATE_INGREDIENT", payload: stateIngredient });
        if (user) await updateLocalIngredient(user.uid, firestoreIngredient);
      } else {
        dispatch({ type: "ADD_INGREDIENT", payload: stateIngredient });
        builtUnits.forEach((cu) => dispatch({ type: "ADD_CUSTOM_UNIT", payload: cu }));
        if (user) await saveLocalIngredient(user.uid, firestoreIngredient);
      }

      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Suggest global update ──
  const handleSuggestUpdate = async () => {
    if (!initialData || !user) return;
    const trimmedName = name.trim() || nameSearch.trim();
    if (!trimmedName) { setError("Name is required."); return; }

    const ingredientId = initialData.id;
    setSuggestingUpdate(true);
    try {
      const finalPhotoUrl = await uploadPhoto(ingredientId);
      const builtUnits = customUnits
        .filter((u) => u.label.trim())
        .map((u) => ({
          id: u.tempId,
          label: u.label.trim(),
          ingredientId,
          ...(u.metricEquivalent && !isNaN(parseFloat(u.metricEquivalent))
            ? { metricEquivalent: parseFloat(u.metricEquivalent), metricUnit: u.metricUnit as "g" | "ml" }
            : {}),
        }));

      const firestoreIngredient: GlobalIngredient = {
        id: ingredientId,
        name: trimmedName,
        category,
        perishable,
        isSnack: true,
        photoUrl: finalPhotoUrl || null,
        bookmarkedFromId: initialData.bookmarkedFromId ?? null,
        globalStatus: "pending_update",
        customUnits: builtUnits,
      };

      await suggestSnackUpdate(user.uid, firestoreIngredient);

      const stateIngredient: Ingredient = {
        ...initialData,
        name: trimmedName,
        category,
        perishable,
        photoUrl: finalPhotoUrl || undefined,
        globalStatus: "pending_update",
        customUnits: builtUnits,
      };
      dispatch({ type: "UPDATE_INGREDIENT", payload: stateIngredient });
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to suggest update. Please try again.");
    } finally {
      setSuggestingUpdate(false);
    }
  };

  // ── Submit for review ──
  const handleSubmitForReview = async () => {
    if (!initialData || !user) return;
    setSubmittingReview(true);
    try {
      await submitSnackForReview(user.uid, initialData.id);
      dispatch({
        type: "UPDATE_INGREDIENT",
        payload: { ...initialData, globalStatus: "pending" },
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to submit for review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const alreadySubmitted = initialData?.globalStatus === "pending" || initialData?.globalStatus === "approved" || initialData?.globalStatus === "pending_update";
  const isApproved = initialData?.globalStatus === "approved";
  const hasPendingUpdate = initialData?.globalStatus === "pending_update";

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title}>{isEditing ? "Edit Snack" : "New Snack"}</h3>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <div className={styles.body}>
          {/* Name with autocomplete */}
          <div className={styles.field} ref={nameRef}>
            <label className={styles.label}>Name</label>
            <input
              className={styles.input}
              placeholder="e.g. Protein Bar, Blueberries…"
              value={nameSearch}
              onChange={(e) => {
                setNameSearch(e.target.value);
                setName(e.target.value);
                setLinkedIngredientId(null);
                setShowNameDropdown(true);
                setError("");
              }}
              onFocus={() => setShowNameDropdown(true)}
              autoFocus={!isEditing}
            />
            {showNameDropdown && nameSuggestions.length > 0 && (
              <div className={styles.nameDropdown}>
                <div className={styles.nameDropdownHint}>Upgrade an existing ingredient to a snack</div>
                {nameSuggestions.map((ing) => (
                  <button
                    key={ing.id}
                    type="button"
                    className={styles.nameDropdownItem}
                    onMouseDown={() => handleSelectSuggestion(ing)}
                  >
                    <span className={styles.dropdownIngName}>{ing.name}</span>
                    <span className={styles.dropdownIngCat}>{ing.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category + Perishable */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Category</label>
              <select
                className={styles.select}
                value={category}
                onChange={(e) => setCategory(e.target.value as IngredientCategory)}
              >
                {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Perishable</label>
              <button
                type="button"
                className={`${styles.toggle} ${perishable ? styles.toggleOn : ""}`}
                onClick={() => setPerishable((p) => !p)}
              >
                {perishable ? "Yes" : "No"}
              </button>
            </div>
          </div>

          {/* Photo upload */}
          <div className={styles.field}>
            <label className={styles.label}>Photo <span className={styles.optional}>(optional)</span></label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className={styles.hiddenInput}
              onChange={handlePhotoInput}
            />
            <div
              className={`${styles.photoZone} ${isDraggingPhoto ? styles.photoZoneDragging : ""} ${photoPreview ? styles.photoZoneHasImage : ""}`}
              onClick={() => photoInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingPhoto(true); }}
              onDragLeave={() => setIsDraggingPhoto(false)}
              onDrop={handlePhotoDrop}
            >
              {photoPreview ? (
                <>
                  <img src={photoPreview} alt="preview" className={styles.photoPreview} />
                  <div className={styles.photoOverlay}>Change photo</div>
                </>
              ) : (
                <div className={styles.photoPlaceholder}>
                  <span className={styles.photoIcon}>📷</span>
                  <span className={styles.photoText}>Click or drag to upload</span>
                </div>
              )}
            </div>
            {uploadProgress !== null && (
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${uploadProgress}%` }} />
              </div>
            )}
          </div>

          {/* Custom units */}
          <div className={styles.field}>
            <div className={styles.unitsHeader}>
              <label className={styles.label}>Custom Units</label>
              <button type="button" className={styles.addUnitBtn} onClick={addUnitRow}>
                + Add Unit
              </button>
            </div>
            {customUnits.length === 0 && (
              <p className={styles.unitsHint}>e.g. "1 bar" = 45g, "1 packet" = 30g</p>
            )}
            {customUnits.map((u) => (
              <div key={u.tempId} className={styles.unitRow}>
                <input
                  className={`${styles.input} ${styles.unitLabel}`}
                  placeholder="Label (e.g. bar)"
                  value={u.label}
                  onChange={(e) => updateUnit(u.tempId, "label", e.target.value)}
                />
                <input
                  className={`${styles.input} ${styles.unitQty}`}
                  type="number"
                  placeholder="Amount"
                  value={u.metricEquivalent}
                  onChange={(e) => updateUnit(u.tempId, "metricEquivalent", e.target.value)}
                />
                <select
                  className={styles.select}
                  value={u.metricUnit}
                  onChange={(e) => updateUnit(u.tempId, "metricUnit", e.target.value as "g" | "ml")}
                >
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                </select>
                <button type="button" className={styles.removeUnitBtn} onClick={() => removeUnit(u.tempId)}>
                  &times;
                </button>
              </div>
            ))}
          </div>

          {error && <p className={styles.error}>{error}</p>}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {/* Left side: global status actions */}
          {isEditing && user && (
            <div>
              {/* Not yet submitted */}
              {!alreadySubmitted && (
                <button
                  className={styles.reviewBtn}
                  onClick={handleSubmitForReview}
                  disabled={submittingReview}
                >
                  {submittingReview ? "Submitting…" : "Submit for review"}
                </button>
              )}
              {/* Pending initial review */}
              {initialData?.globalStatus === "pending" && (
                <span className={styles.statusBadge}>⏳ Pending review</span>
              )}
              {/* Approved — offer to suggest updates */}
              {isApproved && (
                <button
                  className={styles.reviewBtn}
                  onClick={handleSuggestUpdate}
                  disabled={suggestingUpdate}
                >
                  {suggestingUpdate ? "Submitting…" : "Suggest global update"}
                </button>
              )}
              {/* Update already pending */}
              {hasPendingUpdate && (
                <span className={styles.statusBadge}>⏳ Update pending review</span>
              )}
            </div>
          )}
          <div className={styles.footerRight}>
            <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={saving || uploadProgress !== null}
            >
              {saving ? "Saving…" : isEditing ? "Save Local" : "Add Snack"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
