/**
 * StepRichEditor — a contenteditable-based step editor that supports:
 *  - Inline ingredient chips (confirmed)
 *  - @mention autocomplete dropdown with arrow-key navigation
 *  - Inline pending ingredient form (qty + unit) after @ selection
 *  - Chip removal via × button
 */

import React, {
  useRef,
  useState,
  useLayoutEffect,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { createPortal } from "react-dom";
import type { Ingredient, CustomUnit, UnitRef, CoreUnit } from "../../types";
import { METRIC_UNITS, IMPERIAL_UNITS, COOKING_UNITS } from "../../types";
import styles from "./MealFormModal.module.css";

// ── Public types ─────────────────────────────────────────────────────────────

export interface InlineStepIngredient {
  tempId: string;
  ingredientId: string;
  quantity: number;
  unit: UnitRef;
}

export interface RecipeIngredientEntry {
  ingredientId: string | null;
  quantity: number;
  unit: UnitRef;
}

export interface StepEditorHandle {
  insertIngredient: (ingredientId: string, qty: number, unit: UnitRef) => void;
}

interface Props {
  text: string;
  stepIngredients: InlineStepIngredient[];
  placeholder: string;
  allIngredients: Ingredient[];
  recipeIngredients: RecipeIngredientEntry[];
  customUnits: CustomUnit[];
  onFocus: () => void;
  onChange: (text: string, stepIngredients: InlineStepIngredient[]) => void;
}

// ── DOM helpers ──────────────────────────────────────────────────────────────

function unitLabel(unit: UnitRef, customUnits: CustomUnit[]): string {
  if (unit.type === "core") return unit.unit;
  return customUnits.find(cu => cu.id === (unit as { type: "custom"; customUnitId: string }).customUnitId)?.label ?? "unit";
}

function buildChipEl(
  tempId: string,
  ingredientId: string,
  qty: number,
  unit: UnitRef,
  ingName: string,
  uLabel: string,
): HTMLSpanElement {
  const span = document.createElement("span");
  span.dataset.ingId = ingredientId;
  span.dataset.qty = String(qty);
  span.dataset.unitType = unit.type;
  span.dataset.unitVal =
    unit.type === "core"
      ? unit.unit
      : (unit as { type: "custom"; customUnitId: string }).customUnitId;
  span.dataset.tempId = tempId;
  span.contentEditable = "false";
  span.className = styles.inlineIngChip;

  const label = document.createTextNode(`${qty} ${uLabel} ${ingName}`);
  span.appendChild(label);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.dataset.action = "remove-chip";
  btn.className = styles.inlineChipRemove;
  btn.textContent = "×";
  btn.addEventListener("mousedown", e => e.preventDefault());
  span.appendChild(btn);

  return span;
}

function extractContent(
  el: HTMLDivElement,
  allIngredients: Ingredient[],
): { text: string; stepIngredients: InlineStepIngredient[] } {
  let text = "";
  const ings: InlineStepIngredient[] = [];

  el.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? "";
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const span = node as HTMLElement;
      if (span.dataset.ingId) {
        const ingId = span.dataset.ingId;
        const name = allIngredients.find(i => i.id === ingId)?.name ?? ingId;
        text += name;
        const uType = span.dataset.unitType as "core" | "custom";
        const unit: UnitRef =
          uType === "custom"
            ? { type: "custom", customUnitId: span.dataset.unitVal! }
            : { type: "core", unit: span.dataset.unitVal as CoreUnit };
        ings.push({
          tempId: span.dataset.tempId!,
          ingredientId: ingId,
          quantity: Number(span.dataset.qty),
          unit,
        });
      }
      // pending spans are transparent to text extraction
    }
  });

  return { text: text.trim(), stepIngredients: ings };
}

// ── PendingIngForm ────────────────────────────────────────────────────────────

const PendingIngForm: React.FC<{
  ingredientId: string;
  defaultQty: number;
  defaultUnit: UnitRef;
  allIngredients: Ingredient[];
  customUnits: CustomUnit[];
  onConfirm: (qty: number, unit: UnitRef) => void;
  onCancel: () => void;
}> = ({ ingredientId, defaultQty, defaultUnit, allIngredients, customUnits, onConfirm, onCancel }) => {
  const [qty, setQty] = useState(defaultQty);
  const [unit, setUnit] = useState<UnitRef>(defaultUnit);
  const qtyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    qtyRef.current?.focus();
    qtyRef.current?.select();
  }, []);

  const ingName = allIngredients.find(i => i.id === ingredientId)?.name ?? "";
  const customUnitsForIng = customUnits.filter(cu => cu.ingredientId === ingredientId);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      onConfirm(qty, unit);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    }
  };

  const handleUnitChange = (val: string) => {
    const isCustom = customUnits.some(cu => cu.id === val);
    setUnit(
      isCustom
        ? { type: "custom", customUnitId: val }
        : { type: "core", unit: val as CoreUnit }
    );
  };

  return (
    <span className={styles.pendingIngForm} onKeyDown={handleKeyDown}>
      <span className={styles.pendingIngName}>{ingName}</span>
      <input
        ref={qtyRef}
        type="number"
        min="0.01"
        step="0.01"
        value={qty}
        onChange={e => setQty(Number(e.target.value))}
        className={styles.pendingIngQty}
      />
      <select
        value={
          unit.type === "core"
            ? unit.unit
            : (unit as { type: "custom"; customUnitId: string }).customUnitId
        }
        onChange={e => handleUnitChange(e.target.value)}
        className={styles.pendingIngUnit}
      >
        <optgroup label="Metric">
          {METRIC_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </optgroup>
        <optgroup label="Imperial">
          {IMPERIAL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </optgroup>
        <optgroup label="Cooking">
          {COOKING_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </optgroup>
        {customUnitsForIng.map(cu => (
          <option key={cu.id} value={cu.id}>{cu.label}</option>
        ))}
      </select>
      <button
        type="button"
        className={styles.pendingIngConfirm}
        onMouseDown={e => e.preventDefault()}
        onClick={() => onConfirm(qty, unit)}
        title="Confirm (Enter)"
      >✓</button>
      <button
        type="button"
        className={styles.pendingIngCancel}
        onMouseDown={e => e.preventDefault()}
        onClick={onCancel}
        title="Cancel (Esc)"
      >✗</button>
    </span>
  );
};

// ── StepRichEditor ────────────────────────────────────────────────────────────

const StepRichEditor = forwardRef<StepEditorHandle, Props>(function StepRichEditor(
  { text, stepIngredients, placeholder, allIngredients, recipeIngredients, customUnits, onFocus, onChange },
  ref,
) {
  const editorRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  // @mention tracking
  const atMentionRef = useRef<{
    node: Text;
    atStart: number;
    query: string;
  } | null>(null);

  const [dropdown, setDropdown] = useState<{
    items: { id: string; name: string }[];
    focusedIdx: number;
  } | null>(null);

  // Portal for pending ingredient inline form
  const [pendingPortal, setPendingPortal] = useState<{
    containerId: string;
    ingredientId: string;
    defaultQty: number;
    defaultUnit: UnitRef;
  } | null>(null);

  // Focused dropdown item ref (for scroll-into-view)
  const dropdownItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // ── Initialise editor DOM ─────────────────────────────────────────────────

  useLayoutEffect(() => {
    const el = editorRef.current;
    if (!el || initialized.current) return;
    initialized.current = true;

    if (text) el.appendChild(document.createTextNode(text));

    for (const si of stepIngredients) {
      el.appendChild(document.createTextNode(" "));
      const name = allIngredients.find(i => i.id === si.ingredientId)?.name ?? si.ingredientId;
      const uLabel = unitLabel(si.unit, customUnits);
      el.appendChild(buildChipEl(si.tempId, si.ingredientId, si.quantity, si.unit, name, uLabel));
    }

    if (stepIngredients.length > 0) el.appendChild(document.createTextNode(" "));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync content → parent ─────────────────────────────────────────────────

  const syncContent = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const { text: t, stepIngredients: sis } = extractContent(el, allIngredients);
    onChangeRef.current(t, sis);
  }, [allIngredients]);

  // ── Expose insertIngredient handle ────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    insertIngredient(ingredientId: string, qty: number, unit: UnitRef) {
      const el = editorRef.current;
      if (!el) return;
      const name = allIngredients.find(i => i.id === ingredientId)?.name ?? ingredientId;
      const uLabel = unitLabel(unit, customUnits);
      const tempId = crypto.randomUUID();
      el.appendChild(document.createTextNode(" "));
      el.appendChild(buildChipEl(tempId, ingredientId, qty, unit, name, uLabel));
      el.appendChild(document.createTextNode(" "));
      syncContent();
    },
  }), [allIngredients, customUnits, syncContent]);

  // ── Input handler ─────────────────────────────────────────────────────────

  const handleInput = useCallback(() => {
    const sel = window.getSelection();
    if (!sel?.rangeCount) { syncContent(); return; }
    const range = sel.getRangeAt(0);
    const node = range.startContainer;

    if (node.nodeType !== Node.TEXT_NODE) {
      setDropdown(null);
      atMentionRef.current = null;
      syncContent();
      return;
    }

    const nodeText = node.textContent ?? "";
    const offset = range.startOffset;
    const before = nodeText.slice(0, offset);
    const match = before.match(/@(\w*)$/);

    if (match) {
      atMentionRef.current = {
        node: node as Text,
        atStart: offset - match[0].length,
        query: match[1],
      };
      const items = recipeIngredients
        .filter(i => i.ingredientId)
        .map(i => ({
          id: i.ingredientId!,
          name: allIngredients.find(ai => ai.id === i.ingredientId)?.name ?? "",
        }))
        .filter(i => i.name.toLowerCase().includes(match[1].toLowerCase()));
      setDropdown({ items, focusedIdx: 0 });
    } else {
      atMentionRef.current = null;
      setDropdown(null);
    }

    syncContent();
  }, [syncContent, recipeIngredients, allIngredients]);

  // ── Keyboard handler ──────────────────────────────────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!dropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDropdown(d =>
        d ? { ...d, focusedIdx: Math.min(d.focusedIdx + 1, d.items.length - 1) } : d
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setDropdown(d =>
        d ? { ...d, focusedIdx: Math.max(d.focusedIdx - 1, 0) } : d
      );
    } else if (e.key === "Enter" && dropdown.items.length > 0) {
      e.preventDefault();
      selectIngredient(dropdown.items[dropdown.focusedIdx]?.id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDropdown(null);
      atMentionRef.current = null;
    }
  }, [dropdown]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll focused item into view
  useEffect(() => {
    if (dropdown) {
      dropdownItemRefs.current[dropdown.focusedIdx]?.scrollIntoView({ block: "nearest" });
    }
  }, [dropdown?.focusedIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Select ingredient from @mention ──────────────────────────────────────

  const selectIngredient = useCallback((ingredientId: string | undefined) => {
    if (!ingredientId) return;
    setDropdown(null);
    const mention = atMentionRef.current;
    if (!mention) return;
    atMentionRef.current = null;

    const { node, atStart, query } = mention;
    const fullText = node.textContent ?? "";
    const before = fullText.slice(0, atStart);
    const after = fullText.slice(atStart + 1 + query.length);

    const containerId = `pending-${crypto.randomUUID()}`;
    const pendingSpan = document.createElement("span");
    pendingSpan.dataset.pending = "true";
    pendingSpan.id = containerId;
    pendingSpan.contentEditable = "false";
    pendingSpan.className = styles.pendingIngSpan;

    const parent = node.parentNode!;
    parent.insertBefore(document.createTextNode(before), node);
    parent.insertBefore(pendingSpan, node);
    parent.insertBefore(document.createTextNode(after), node);
    parent.removeChild(node);

    // Compute default qty from remaining across all steps
    const masterIng = recipeIngredients.find(i => i.ingredientId === ingredientId);
    const totalUsed = stepIngredients
      .filter(si => si.ingredientId === ingredientId)
      .reduce((sum, si) => sum + si.quantity, 0);
    const remaining = (masterIng?.quantity ?? 1) - totalUsed;

    setPendingPortal({
      containerId,
      ingredientId,
      defaultQty: remaining > 0.001 ? remaining : 1,
      defaultUnit: masterIng?.unit ?? { type: "core", unit: "unit" },
    });
  }, [recipeIngredients, stepIngredients]);

  // ── Confirm / cancel pending ──────────────────────────────────────────────

  const confirmPending = useCallback(
    (containerId: string, ingredientId: string, qty: number, unit: UnitRef) => {
      const pendingEl = document.getElementById(containerId);
      if (!pendingEl) return;

      const tempId = crypto.randomUUID();
      const name = allIngredients.find(i => i.id === ingredientId)?.name ?? ingredientId;
      const uLabel = unitLabel(unit, customUnits);
      const chip = buildChipEl(tempId, ingredientId, qty, unit, name, uLabel);

      pendingEl.parentNode!.insertBefore(chip, pendingEl);
      // Add a trailing space so the cursor has somewhere to land
      pendingEl.parentNode!.insertBefore(document.createTextNode(" "), pendingEl);
      pendingEl.parentNode!.removeChild(pendingEl);

      // Move cursor to right after the chip
      const afterChip = chip.nextSibling;
      if (afterChip) {
        const range = document.createRange();
        if (afterChip.nodeType === Node.TEXT_NODE) {
          range.setStart(afterChip, 0);
        } else {
          range.setStartAfter(chip);
        }
        range.collapse(true);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }

      setPendingPortal(null);
      editorRef.current?.focus();
      syncContent();
    },
    [allIngredients, customUnits, syncContent],
  );

  const cancelPending = useCallback(
    (containerId: string) => {
      const pendingEl = document.getElementById(containerId);
      if (pendingEl) {
        // Leave cursor where pending was
        const range = document.createRange();
        range.setStartBefore(pendingEl);
        range.collapse(true);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
        pendingEl.parentNode?.removeChild(pendingEl);
      }
      setPendingPortal(null);
      editorRef.current?.focus();
      syncContent();
    },
    [syncContent],
  );

  // ── Chip removal via click ────────────────────────────────────────────────

  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.dataset.action === "remove-chip") {
      const chip = target.closest("[data-ing-id]") as HTMLElement | null;
      if (chip) {
        chip.parentNode?.removeChild(chip);
        syncContent();
      }
    }
  }, [syncContent]);

  // Prevent cursor jumping when clicking on non-editable spans
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[contenteditable="false"]')) {
      const tag = target.tagName.toLowerCase();
      if (!["input", "select", "button", "textarea"].includes(tag)) {
        e.preventDefault();
      }
    }
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  const pendingTarget =
    pendingPortal ? document.getElementById(pendingPortal.containerId) : null;

  return (
    <div className={styles.stepTextWrap}>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className={styles.stepEditor}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
      />

      {/* @mention dropdown */}
      {dropdown && dropdown.items.length > 0 && (
        <div className={styles.atMentionDropdown} role="listbox">
          {dropdown.items.map((item, i) => (
            <button
              key={item.id}
              ref={el => { dropdownItemRefs.current[i] = el; }}
              type="button"
              role="option"
              aria-selected={i === dropdown.focusedIdx}
              className={`${styles.atMentionOption} ${i === dropdown.focusedIdx ? styles.atMentionOptionFocused : ""}`}
              onMouseDown={e => { e.preventDefault(); selectIngredient(item.id); }}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}

      {/* No matches hint */}
      {dropdown && dropdown.items.length === 0 && (
        <div className={styles.atMentionDropdown}>
          <div className={styles.atMentionEmpty}>
            {recipeIngredients.some(i => i.ingredientId)
              ? "No matching ingredients"
              : "Add ingredients first"}
          </div>
        </div>
      )}

      {/* Portal: pending ingredient form renders into the contenteditable span */}
      {pendingPortal && pendingTarget &&
        createPortal(
          <PendingIngForm
            ingredientId={pendingPortal.ingredientId}
            defaultQty={pendingPortal.defaultQty}
            defaultUnit={pendingPortal.defaultUnit}
            allIngredients={allIngredients}
            customUnits={customUnits}
            onConfirm={(qty, unit) =>
              confirmPending(pendingPortal.containerId, pendingPortal.ingredientId, qty, unit)
            }
            onCancel={() => cancelPending(pendingPortal.containerId)}
          />,
          pendingTarget,
        )}
    </div>
  );
});

export default StepRichEditor;
