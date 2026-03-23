import React, { useState, useEffect, useRef } from "react";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, doc, query, where, getDocs, getDoc } from "firebase/firestore";
import { db, storage } from "../../lib/firebase";
import { friendshipConverter } from "../../lib/firestoreTypes";
import type { FirestoreFriendship } from "../../lib/firestoreTypes";
import type {
  Meal,
  RecipeIngredient,
  UnitRef,
  CoreUnit,
  MetricUnit,
  CustomUnit,
} from "../../types";
import {
  METRIC_UNITS,
  IMPERIAL_UNITS,
  COOKING_UNITS,
  RECIPE_TAGS,
} from "../../types";
import { useAppState, useAppDispatch } from "../../context/hooks";
import { useAuth } from "../../context/AuthContext";
import { submitGlobalRecipe, saveRecipeToCloud, suggestRecipeUpdate } from "../../lib/cloudSync";
import { IngredientCombobox } from "./IngredientCombobox";
import { Button } from "../../components/Button/Button";
import { Input } from "../../components/Form/Input";
import { Select } from "../../components/Form/Select";
import styles from "./MealFormModal.module.css";

interface MealFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: Meal | null;
}

type FormIngredient = Omit<RecipeIngredient, "ingredientId"> & {
  tempId: string;
  ingredientId: string | null;
};

type DesktopTab = "ingredients" | "instructions" | "tags" | "sharing";

const MOBILE_STEPS = ["Details", "Ingredients", "Instructions", "Tags", "Sharing"] as const;
type MobileStepIndex = 0 | 1 | 2 | 3 | 4;

const CREATE_CUSTOM_SENTINEL = "__create_custom__";

interface NewCustomUnitDraft {
  label: string;
  metricEquivalent: string;
  metricUnit: MetricUnit;
}
const defaultDraft = (): NewCustomUnitDraft => ({ label: "", metricEquivalent: "", metricUnit: "g" });

export const MealFormModal: React.FC<MealFormModalProps> = ({ isOpen, onClose, initialData }) => {
  const { ingredients: allIngredients, customUnits } = useAppState();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  // Form state
  const [name, setName] = useState("");
  const [servings, setServings] = useState(1);
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [formIngredients, setFormIngredients] = useState<FormIngredient[]>([]);
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [friends, setFriends] = useState<Array<{ uid: string; displayName: string }>>([]);

  // Photo
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // UI
  const [desktopTab, setDesktopTab] = useState<DesktopTab>("ingredients");
  const [mobileStep, setMobileStep] = useState<MobileStepIndex>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingGlobal, setIsSubmittingGlobal] = useState(false);
  const [isSuggestingUpdate, setIsSuggestingUpdate] = useState(false);
  const [globalErrors, setGlobalErrors] = useState<string[]>([]);

  // Custom unit
  const [creatingForTempId, setCreatingForTempId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NewCustomUnitDraft>(defaultDraft());

  // ── Reset on open ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setServings(initialData.servings);
      setPhotoUrl(initialData.photoUrl || "");
      setPhotoPreview(initialData.photoUrl || "");
      setDescription(initialData.description ?? "");
      setInstructions(initialData.instructions?.length ? initialData.instructions : [""]);
      setSelectedTags(initialData.tags ?? []);
      setFormIngredients(initialData.ingredients.map((ing) => ({ ...ing, tempId: crypto.randomUUID() })));
      setSharedWith(initialData.sharedWith || []);
    } else {
      setName(""); setServings(1); setPhotoUrl(""); setPhotoPreview("");
      setDescription(""); setInstructions([""]); setSelectedTags([]);
      setFormIngredients([]); setSharedWith([]);
    }
    setPhotoFile(null); setUploadProgress(null);
    setDesktopTab("ingredients"); setMobileStep(0);
    setCreatingForTempId(null); setDraft(defaultDraft());
    setGlobalErrors([]);
  }, [initialData, isOpen]);

  // ── Load friends ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen || !user) return;
    getDocs(query(
      collection(db, "friendships").withConverter(friendshipConverter),
      where("userIds", "array-contains", user.uid),
      where("status", "==", "accepted")
    )).then(async (snap) => {
      const list = await Promise.all(
        snap.docs.map(async (d) => {
          const f = d.data() as FirestoreFriendship;
          const friendUid = f.userIds[0] === user.uid ? f.userIds[1] : f.userIds[0];
          const userSnap = await getDoc(doc(db, "users", friendUid));
          return {
            uid: friendUid,
            displayName: userSnap.exists() ? (userSnap.data() as { displayName: string }).displayName : friendUid,
          };
        })
      );
      setFriends(list);
    });
  }, [isOpen, user]);

  // ── Photo handlers ─────────────────────────────────────────────────────────

  const handlePhotoSelect = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadPhoto = (uid: string, recipeId: string): Promise<string> => {
    if (!photoFile) return Promise.resolve(photoUrl);
    const ext = photoFile.name.split(".").pop() || "jpg";
    const sRef = storageRef(storage, `recipes/${uid}/${recipeId}/photo.${ext}`);
    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(sRef, photoFile);
      task.on("state_changed",
        (snap) => setUploadProgress((snap.bytesTransferred / snap.totalBytes) * 100),
        reject,
        async () => { const url = await getDownloadURL(task.snapshot.ref); setUploadProgress(null); resolve(url); }
      );
    });
  };

  // ── Ingredient handlers ────────────────────────────────────────────────────

  const addIngredientRow = () =>
    setFormIngredients((p) => [...p, { tempId: crypto.randomUUID(), ingredientId: null, quantity: 1, unit: { type: "core", unit: "unit" } }]);

  const updateIngredient = (tempId: string, field: string, value: unknown) =>
    setFormIngredients((p) => p.map((i) => i.tempId === tempId ? { ...i, [field]: value } : i));

  const removeIngredient = (tempId: string) => {
    setFormIngredients((p) => p.filter((i) => i.tempId !== tempId));
    if (creatingForTempId === tempId) { setCreatingForTempId(null); setDraft(defaultDraft()); }
  };

  const handleUnitChange = (tempId: string, value: string) => {
    if (value === CREATE_CUSTOM_SENTINEL) { setCreatingForTempId(tempId); setDraft(defaultDraft()); return; }
    const isCustom = customUnits.some((cu) => cu.id === value);
    updateIngredient(tempId, "unit", isCustom
      ? { type: "custom", customUnitId: value } satisfies UnitRef
      : { type: "core", unit: value as CoreUnit } satisfies UnitRef);
    if (creatingForTempId === tempId) { setCreatingForTempId(null); setDraft(defaultDraft()); }
  };

  const handleAddCustomUnit = (forTempId: string) => {
    const row = formIngredients.find((i) => i.tempId === forTempId);
    if (!row?.ingredientId || !draft.label.trim()) return;
    const newUnit: CustomUnit = {
      id: crypto.randomUUID(), label: draft.label.trim(), ingredientId: row.ingredientId,
      ...(draft.metricEquivalent && { metricEquivalent: Number(draft.metricEquivalent), metricUnit: draft.metricUnit }),
    };
    dispatch({ type: "ADD_CUSTOM_UNIT", payload: newUnit });
    updateIngredient(forTempId, "unit", { type: "custom", customUnitId: newUnit.id } satisfies UnitRef);
    setCreatingForTempId(null); setDraft(defaultDraft());
  };

  const getUnitSelectValue = (unit: UnitRef) => unit.type === "core" ? unit.unit : unit.customUnitId;

  // ── Instruction handlers ───────────────────────────────────────────────────

  const updateInstruction = (idx: number, val: string) =>
    setInstructions((p) => p.map((s, i) => i === idx ? val : s));
  const addInstruction = () => setInstructions((p) => [...p, ""]);
  const removeInstruction = (idx: number) => setInstructions((p) => p.filter((_, i) => i !== idx));
  const moveInstruction = (idx: number, dir: -1 | 1) =>
    setInstructions((p) => {
      const n = [...p]; const t = idx + dir;
      if (t < 0 || t >= n.length) return p;
      [n[idx], n[t]] = [n[t], n[idx]]; return n;
    });

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const finalIngredients: RecipeIngredient[] = [];
      for (const ing of formIngredients) {
        if (!ing.ingredientId || ing.quantity <= 0) { alert("Please fill out all ingredient fields."); return; }
        finalIngredients.push({ ingredientId: ing.ingredientId, quantity: ing.quantity, unit: ing.unit });
      }
      const recipeId = initialData?.id ?? crypto.randomUUID();
      const finalPhotoUrl = photoFile && user ? await uploadPhoto(user.uid, recipeId) : photoUrl;
      const cleanedInstructions = instructions.filter((s) => s.trim());
      const mealPayload: Meal = {
        id: recipeId, name: name.trim(), servings, photoUrl: finalPhotoUrl,
        description: description.trim() || undefined,
        instructions: cleanedInstructions.length ? cleanedInstructions : undefined,
        ingredients: finalIngredients, tags: selectedTags, sharedWith,
        localUpdatedAt: Date.now(),
        globalStatus: initialData?.globalStatus, visibility: initialData?.visibility,
        bookmarkedFromId: initialData?.bookmarkedFromId, originalOwnerId: initialData?.originalOwnerId,
        rejectionReason: initialData?.rejectionReason,
      };
      dispatch({ type: initialData ? "UPDATE_MEAL" : "ADD_MEAL", payload: mealPayload });
      if (user) saveRecipeToCloud(user.uid, mealPayload, customUnits).catch(console.error);
      onClose();
    } catch (err) { console.error(err); alert("Failed to save recipe. Please try again."); }
    finally { setIsSubmitting(false); }
  };

  const handleSubmitGlobally = async () => {
    if (!initialData || !user) return;
    const errors: string[] = [];
    if (!name.trim()) errors.push("Recipe name is required.");
    if (!photoPreview && !photoUrl) errors.push("A photo is required.");
    if (!description.trim()) errors.push("A description is required.");
    if (!instructions.filter((s) => s.trim()).length) errors.push("At least one instruction step is required.");
    if (!selectedTags.length) errors.push("At least one tag is required.");
    if (!formIngredients.length) errors.push("At least one ingredient is required.");
    if (errors.length) { setGlobalErrors(errors); return; }
    setGlobalErrors([]);
    dispatch({ type: "UPDATE_MEAL", payload: { ...initialData, name, servings, photoUrl, description: description.trim(), instructions: instructions.filter((s) => s.trim()), tags: selectedTags, sharedWith, globalStatus: "pending", visibility: "global" } });
    try {
      setIsSubmittingGlobal(true);
      await submitGlobalRecipe(initialData.id, user.uid);
      onClose();
    } catch (err) { console.error(err); alert("Failed to submit globally."); }
    finally { setIsSubmittingGlobal(false); }
  };

  const handleSuggestGlobalUpdate = async () => {
    if (!initialData || !user) return;
    const errors: string[] = [];
    if (!name.trim()) errors.push("Recipe name is required.");
    if (!photoPreview && !photoUrl) errors.push("A photo is required.");
    if (!description.trim()) errors.push("A description is required.");
    if (!instructions.filter((s) => s.trim()).length) errors.push("At least one instruction step is required.");
    if (!selectedTags.length) errors.push("At least one tag is required.");
    if (!formIngredients.length) errors.push("At least one ingredient is required.");
    if (errors.length) { setGlobalErrors(errors); return; }
    setGlobalErrors([]);
    setIsSuggestingUpdate(true);
    try {
      const recipeId = initialData.id;
      const finalPhotoUrl = photoFile ? await uploadPhoto(user.uid, recipeId) : photoUrl;
      const updatedMeal: Meal = {
        ...initialData,
        name: name.trim(), servings, photoUrl: finalPhotoUrl,
        description: description.trim() || undefined,
        instructions: instructions.filter((s) => s.trim()),
        tags: selectedTags, sharedWith,
        globalStatus: "pending_update",
        localUpdatedAt: Date.now(),
      };
      dispatch({ type: "UPDATE_MEAL", payload: updatedMeal });
      await suggestRecipeUpdate(user.uid, updatedMeal, customUnits);
      onClose();
    } catch (err) { console.error(err); alert("Failed to suggest update."); }
    finally { setIsSuggestingUpdate(false); }
  };

  // ── Shared content renderers ───────────────────────────────────────────────

  const renderHero = (compact = false) => (
    <div className={`${styles.hero} ${compact ? styles.heroCompact : ""}`}>
      {/* Photo zone */}
      <div
        className={`${styles.photoZone} ${isDragging ? styles.photoZoneDragging : ""} ${photoPreview ? styles.photoZoneHasPhoto : ""}`}
        onClick={() => photoInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handlePhotoSelect(f); }}
      >
        {photoPreview ? (
          <>
            <img src={photoPreview} alt="" className={styles.photoPreview} />
            {uploadProgress !== null && (
              <div className={styles.uploadOverlay}>
                <div className={styles.uploadProgressBar}><div className={styles.uploadBarFill} style={{ width: `${uploadProgress}%` }} /></div>
                <span className={styles.uploadPct}>{Math.round(uploadProgress)}%</span>
              </div>
            )}
            <div className={styles.photoHoverOverlay}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              Change photo
            </div>
          </>
        ) : (
          <div className={styles.photoEmpty}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.photoEmptyIcon}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <span className={styles.photoEmptyTitle}>Add a photo</span>
            <span className={styles.photoEmptyHint}>Drop here or click to browse</span>
          </div>
        )}
        <input ref={photoInputRef} type="file" accept="image/*" className={styles.hiddenInput}
          onChange={(e) => e.target.files?.[0] && handlePhotoSelect(e.target.files[0])} />
      </div>

      {/* Basic info */}
      <div className={styles.basicInfo}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Recipe Name</label>
          <input className={styles.nameInput} value={name} onChange={(e) => setName(e.target.value)} placeholder="Give your recipe a name…" required />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Servings</label>
          <div className={styles.stepper}>
            <button type="button" className={styles.stepperBtn} onClick={() => setServings((s) => Math.max(1, s - 1))}>−</button>
            <span className={styles.stepperVal}>{servings}</span>
            <button type="button" className={styles.stepperBtn} onClick={() => setServings((s) => s + 1)}>+</button>
          </div>
        </div>
        <div className={`${styles.field} ${styles.fieldGrow}`}>
          <label className={styles.fieldLabel}>Description <span className={styles.optional}>(optional)</span></label>
          <textarea className={styles.descTextarea} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A short description of this recipe…" />
        </div>
      </div>
    </div>
  );

  const renderIngredients = () => (
    <div className={styles.tabPanel}>
      <div className={styles.ingredientList}>
        {formIngredients.map((ing) => {
          const customUnitsForIng = ing.ingredientId ? customUnits.filter((cu) => cu.ingredientId === ing.ingredientId) : [];
          const isCreating = creatingForTempId === ing.tempId;
          return (
            <div key={ing.tempId}>
              <div className={styles.ingredientRow}>
                <IngredientCombobox value={ing.ingredientId} ingredients={allIngredients}
                  onChange={(id) => {
                    updateIngredient(ing.tempId, "ingredientId", id);
                    updateIngredient(ing.tempId, "unit", { type: "core", unit: "unit" } satisfies UnitRef);
                    if (isCreating) { setCreatingForTempId(null); setDraft(defaultDraft()); }
                  }}
                  onNewIngredient={(ingredient) => dispatch({ type: "ADD_INGREDIENT", payload: ingredient })}
                />
                <Input type="number" min="0" step="0.01" value={ing.quantity}
                  onChange={(e) => updateIngredient(ing.tempId, "quantity", Number(e.target.value))}
                  className={styles.qtyInput} />
                <Select value={getUnitSelectValue(ing.unit)} onChange={(e) => handleUnitChange(ing.tempId, e.target.value)} className={styles.unitSel}>
                  <optgroup label="Metric">{METRIC_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</optgroup>
                  <optgroup label="Imperial">{IMPERIAL_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</optgroup>
                  <optgroup label="Cooking">{COOKING_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</optgroup>
                  {customUnitsForIng.length > 0 && <optgroup label="Custom">{customUnitsForIng.map((cu) => <option key={cu.id} value={cu.id}>{cu.label}</option>)}</optgroup>}
                  {ing.ingredientId && <optgroup label=""><option value={CREATE_CUSTOM_SENTINEL}>+ Create custom unit…</option></optgroup>}
                </Select>
                <button type="button" className={styles.removeBtn} onClick={() => removeIngredient(ing.tempId)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              {isCreating && (
                <div className={styles.customUnitCreator}>
                  <span className={styles.cuLabel}>New unit:</span>
                  <Input placeholder="Label (e.g. clove)" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} className={styles.cuLabelInput} />
                  <Input type="number" min="0" step="0.01" placeholder="Metric qty" value={draft.metricEquivalent} onChange={(e) => setDraft({ ...draft, metricEquivalent: e.target.value })} className={styles.cuEquivInput} />
                  <Select value={draft.metricUnit} onChange={(e) => setDraft({ ...draft, metricUnit: e.target.value as MetricUnit })} className={styles.cuMetricSel}>
                    {METRIC_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </Select>
                  <Button variant="primary" onClick={() => handleAddCustomUnit(ing.tempId)} disabled={!draft.label.trim()}>Add</Button>
                  <Button variant="secondary" onClick={() => { setCreatingForTempId(null); setDraft(defaultDraft()); }}>Cancel</Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button type="button" className={styles.addRowBtn} onClick={addIngredientRow}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Ingredient
      </button>
    </div>
  );

  const renderInstructions = () => (
    <div className={styles.tabPanel}>
      <div className={styles.instructionList}>
        {instructions.map((step, idx) => (
          <div key={idx} className={styles.instructionRow}>
            <span className={styles.stepBadge}>{idx + 1}</span>
            <Input value={step} onChange={(e) => updateInstruction(idx, e.target.value)} placeholder={`Step ${idx + 1}…`} className={styles.stepInput} />
            <div className={styles.stepActions}>
              <button type="button" className={styles.stepBtn} onClick={() => moveInstruction(idx, -1)} disabled={idx === 0} title="Move up">↑</button>
              <button type="button" className={styles.stepBtn} onClick={() => moveInstruction(idx, 1)} disabled={idx === instructions.length - 1} title="Move down">↓</button>
              <button type="button" className={`${styles.stepBtn} ${styles.stepBtnDanger}`} onClick={() => removeInstruction(idx)} disabled={instructions.length === 1} title="Remove">×</button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className={styles.addRowBtn} onClick={addInstruction}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Step
      </button>
    </div>
  );

  const renderTags = () => (
    <div className={styles.tabPanel}>
      <div className={styles.tagGroups}>
        {Object.entries(RECIPE_TAGS).map(([group, tags]) => (
          <div key={group} className={styles.tagGroup}>
            <span className={styles.tagGroupLabel}>{group}</span>
            <div className={styles.tagChips}>
              {tags.map((tag) => (
                <button key={tag} type="button"
                  className={`${styles.tagChip} ${selectedTags.includes(tag) ? styles.tagChipActive : ""}`}
                  onClick={() => setSelectedTags((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag])}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSharing = () => (
    <div className={styles.tabPanel}>
      {friends.length > 0 && (
        <div className={styles.sharingBlock}>
          <p className={styles.sectionMeta}>Share with friends</p>
          <div className={styles.friendList}>
            {friends.map((f) => (
              <label key={f.uid} className={styles.friendRow}>
                <input type="checkbox" checked={sharedWith.includes(f.uid)}
                  onChange={(e) => setSharedWith((p) => e.target.checked ? [...p, f.uid] : p.filter((id) => id !== f.uid))} />
                <span>{f.displayName}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      {initialData && user && (
        <div className={styles.globalBlock}>
          <p className={styles.sectionMeta}>Global Submission</p>
          {initialData.globalStatus && initialData.globalStatus !== "none" && (
            <div className={styles.statusRow}>
              <span className={`${styles.badge} ${styles[`badge_${initialData.globalStatus}`]}`}>
                {initialData.globalStatus === "approved" ? "✓ Approved — live globally"
                  : initialData.globalStatus === "pending" ? "⏳ Pending review"
                  : initialData.globalStatus === "pending_update" ? "⏳ Update pending review"
                  : "Rejected"}
              </span>
              {initialData.globalStatus === "rejected" && initialData.rejectionReason && (
                <span className={styles.rejectionNote}>Reason: {initialData.rejectionReason}</span>
              )}
            </div>
          )}
          {globalErrors.length > 0 && <ul className={styles.globalErrors}>{globalErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
          {/* Initial submission */}
          {(!initialData.globalStatus || initialData.globalStatus === "none" || initialData.globalStatus === "rejected") && (
            <>
              <p className={styles.globalHint}>Submit to be featured in the community Discover tab. It will be reviewed before going live.</p>
              <Button variant="primary" onClick={handleSubmitGlobally} disabled={isSubmittingGlobal}>
                {isSubmittingGlobal ? "Submitting…" : "Submit for Review"}
              </Button>
            </>
          )}
          {/* Suggest update on approved recipes */}
          {initialData.globalStatus === "approved" && (
            <>
              <p className={styles.globalHint}>Save your changes locally, or suggest them as an update to the global version for admin review.</p>
              <Button variant="primary" onClick={handleSuggestGlobalUpdate} disabled={isSuggestingUpdate}>
                {isSuggestingUpdate ? "Submitting…" : "Suggest Global Update"}
              </Button>
            </>
          )}
        </div>
      )}
      {friends.length === 0 && !initialData && <p className={styles.emptyNote}>Add friends to share individual recipes with them.</p>}
    </div>
  );

  // ── Early return ───────────────────────────────────────────────────────────

  if (!isOpen) return null;

  if (!user) return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dHeader}>
          <span className={styles.dTitle}>Sign in required</span>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div className={styles.dScroll} style={{ padding: "24px 28px" }}>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: 16 }}>You need to be signed in to create or edit recipes.</p>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );

  const desktopTabs: { id: DesktopTab; label: string; count?: number }[] = [
    { id: "ingredients", label: "Ingredients", count: formIngredients.length || undefined },
    { id: "instructions", label: "Instructions", count: instructions.filter((s) => s.trim()).length || undefined },
    { id: "tags", label: "Tags", count: selectedTags.length || undefined },
    { id: "sharing", label: "Sharing" },
  ];

  const submitLabel = isSubmitting
    ? uploadProgress !== null ? `Uploading ${Math.round(uploadProgress)}%…` : "Saving…"
    : initialData ? "Save Changes" : "Create Recipe";

  return (
    <div className={styles.backdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.container}>
        <form onSubmit={handleSubmit} className={styles.form}>

          {/* ================================================================
              DESKTOP LAYOUT
              ================================================================ */}
          <div className={styles.desktopLayout}>

            {/* Fixed: header */}
            <div className={styles.dHeader}>
              <span className={styles.dTitle}>{initialData ? "Edit Recipe" : "New Recipe"}</span>
              <button type="button" className={styles.closeBtn} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Fixed: hero */}
            <div className={styles.dHero}>
              {renderHero()}
            </div>

            {/* Fixed: tab bar */}
            <div className={styles.dTabBar}>
              {desktopTabs.map((tab) => (
                <button key={tab.id} type="button"
                  className={`${styles.dTabBtn} ${desktopTab === tab.id ? styles.dTabBtnActive : ""}`}
                  onClick={() => setDesktopTab(tab.id)}>
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`${styles.tabPill} ${desktopTab === tab.id ? styles.tabPillActive : ""}`}>{tab.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Scrollable: tab content */}
            <div className={styles.dScroll}>
              {desktopTab === "ingredients" && renderIngredients()}
              {desktopTab === "instructions" && renderInstructions()}
              {desktopTab === "tags" && renderTags()}
              {desktopTab === "sharing" && renderSharing()}
            </div>

            {/* Fixed: footer */}
            <div className={styles.dFooter}>
              <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={isSubmitting || !name.trim()}>{submitLabel}</Button>
            </div>
          </div>

          {/* ================================================================
              MOBILE LAYOUT  (full-screen wizard)
              ================================================================ */}
          <div className={styles.mobileLayout}>

            {/* Mobile header */}
            <div className={styles.mHeader}>
              <span className={styles.mStepCounter}>{mobileStep + 1} / {MOBILE_STEPS.length}</span>
              <span className={styles.mStepTitle}>{MOBILE_STEPS[mobileStep]}</span>
              <button type="button" className={styles.closeBtn} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Progress dots */}
            <div className={styles.mDots}>
              {MOBILE_STEPS.map((_, i) => (
                <button key={i} type="button" className={`${styles.mDot} ${i === mobileStep ? styles.mDotActive : ""} ${i < mobileStep ? styles.mDotDone : ""}`}
                  onClick={() => setMobileStep(i as MobileStepIndex)} />
              ))}
            </div>

            {/* Slider */}
            <div className={styles.mSlider}>
              {/* Step 0: Details */}
              <div className={styles.mSlide} style={{ transform: `translateX(${(0 - mobileStep) * 100}%)` }}>
                <div className={styles.mSlideInner}>{renderHero(true)}</div>
              </div>
              {/* Step 1: Ingredients */}
              <div className={styles.mSlide} style={{ transform: `translateX(${(1 - mobileStep) * 100}%)` }}>
                <div className={styles.mSlideInner}>{renderIngredients()}</div>
              </div>
              {/* Step 2: Instructions */}
              <div className={styles.mSlide} style={{ transform: `translateX(${(2 - mobileStep) * 100}%)` }}>
                <div className={styles.mSlideInner}>{renderInstructions()}</div>
              </div>
              {/* Step 3: Tags */}
              <div className={styles.mSlide} style={{ transform: `translateX(${(3 - mobileStep) * 100}%)` }}>
                <div className={styles.mSlideInner}>{renderTags()}</div>
              </div>
              {/* Step 4: Sharing */}
              <div className={styles.mSlide} style={{ transform: `translateX(${(4 - mobileStep) * 100}%)` }}>
                <div className={styles.mSlideInner}>{renderSharing()}</div>
              </div>
            </div>

            {/* Mobile footer nav */}
            <div className={styles.mFooter}>
              <button type="button" className={`${styles.mNavBtn} ${styles.mNavBack}`}
                onClick={() => setMobileStep((s) => Math.max(0, s - 1) as MobileStepIndex)}
                disabled={mobileStep === 0}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
                Back
              </button>

              {mobileStep < MOBILE_STEPS.length - 1 ? (
                <button type="button" className={`${styles.mNavBtn} ${styles.mNavNext}`}
                  onClick={() => setMobileStep((s) => Math.min(MOBILE_STEPS.length - 1, s + 1) as MobileStepIndex)}>
                  {MOBILE_STEPS[mobileStep + 1]}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              ) : (
                <button type="submit" className={`${styles.mNavBtn} ${styles.mNavSave}`} disabled={isSubmitting || !name.trim()}>
                  {submitLabel}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
              )}
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
