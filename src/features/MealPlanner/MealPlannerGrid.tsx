import React from "react";
import { useAppState, useAppDispatch } from "../../context/hooks";
import { useAuth } from "../../context/AuthContext";
import type { PlannedMeal, PlannedSnack } from "../../types";
import { saveMealColumns, renameMealColumnInCloud, removeMealColumnFromCloud } from "../../lib/cloudSync";
import { MealSlot } from "./MealSlot";
import styles from "./MealPlannerGrid.module.css";

// Helper to format date to 'YYYY-MM-DD'
const toISODateString = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

// --- Row height calculation ---
// Card height: 72px, stack overlap: 28px → each extra card adds 44px of row height.
// Base height accommodates up to 3 stacked cards + padding.
const BASE_ROW_HEIGHT = 175;
const EXTRA_PER_CARD = 44; // (72px card - 28px overlap)

function getMaxSlotCount(
  dateStr: string,
  mealColumns: string[],
  plan: PlannedMeal[],
  snacks: PlannedSnack[]
): number {
  let max = 0;
  for (const col of mealColumns) {
    const count =
      plan.filter((p) => p.date === dateStr && p.mealType === col).length +
      snacks.filter((s) => s.date === dateStr && s.mealType === col).length;
    if (count > max) max = count;
  }
  return max;
}

function getRowHeight(
  dateStr: string,
  mealColumns: string[],
  plan: PlannedMeal[],
  snacks: PlannedSnack[]
): number {
  const max = getMaxSlotCount(dateStr, mealColumns, plan, snacks);
  if (max <= 3) return BASE_ROW_HEIGHT;
  return BASE_ROW_HEIGHT + (max - 3) * EXTRA_PER_CARD;
}

export const MealPlannerGrid: React.FC = () => {
  const { mealColumns, selectedDates, plan, snacks } = useAppState();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  // --- VIRTUALIZATION CONSTANTS ---
  const OVERSCAN = 2;
  const TOTAL_DAYS = 10000;
  const START_OFFSET_INDEX = 5000; // Index representing "Today"

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [viewportHeight, setViewportHeight] = React.useState(600);

  // On mount, scroll to today
  React.useLayoutEffect(() => {
    if (containerRef.current) {
      const initialScroll = START_OFFSET_INDEX * BASE_ROW_HEIGHT;
      containerRef.current.scrollTop = initialScroll;
      setScrollTop(initialScroll);
      setViewportHeight(containerRef.current.clientHeight);
    }
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  React.useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setViewportHeight(containerRef.current.clientHeight);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- VISIBLE RANGE (based on BASE_ROW_HEIGHT for simplicity) ---
  const startIndex = Math.max(0, Math.floor(scrollTop / BASE_ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    TOTAL_DAYS - 1,
    Math.floor((scrollTop + viewportHeight) / BASE_ROW_HEIGHT) + OVERSCAN
  );

  // Build visible items with cumulative top positions using actual row heights
  const visibleItems: {
    index: number;
    date: Date;
    dateString: string;
    top: number;
    height: number;
  }[] = [];

  const todayString = toISODateString(new Date());

  let currentTop = startIndex * BASE_ROW_HEIGHT;
  for (let i = startIndex; i <= endIndex; i++) {
    const date = new Date();
    const dayOffset = i - START_OFFSET_INDEX;
    date.setDate(date.getDate() + dayOffset);
    const dateString = toISODateString(date);
    const rowHeight = getRowHeight(dateString, mealColumns, plan, snacks);

    visibleItems.push({ index: i, date, dateString, top: currentTop, height: rowHeight });
    currentTop += rowHeight;
  }

  // --- Column resize (local state only) ---
  const [columnWidths, setColumnWidths] = React.useState<number[] | null>(null);
  const headerRef = React.useRef<HTMLDivElement>(null);

  // Reset widths whenever columns are added or removed
  React.useEffect(() => {
    setColumnWidths(null);
  }, [mealColumns.length]);

  const handleResizeStart = (colIdx: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let currentWidths: number[];
    if (columnWidths) {
      currentWidths = [...columnWidths];
    } else {
      const cells = headerRef.current?.querySelectorAll<HTMLElement>("[data-col-index]");
      if (!cells || cells.length === 0) return;
      currentWidths = Array.from(cells).map((el) => el.getBoundingClientRect().width);
    }

    const startX = e.clientX;
    const startWidth = currentWidths[colIdx];

    const onMouseMove = (moveE: MouseEvent) => {
      const delta = moveE.clientX - startX;
      const newWidths = [...currentWidths];
      newWidths[colIdx] = Math.max(80, startWidth + delta);
      setColumnWidths(newWidths);
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const gridStyle = {
    gridTemplateColumns: columnWidths
      ? `150px ${columnWidths.map((w) => `${w}px`).join(" ")}`
      : `150px repeat(${mealColumns.length}, 1fr)`,
  } as React.CSSProperties;

  // --- Column management ---
  const [editingColIndex, setEditingColIndex] = React.useState<number | null>(null);
  const [editingColValue, setEditingColValue] = React.useState("");

  const handleAddColumn = () => {
    const newColumns = [...mealColumns, "New Column"];
    dispatch({ type: "ADD_MEAL_COLUMN", payload: { name: "New Column" } });
    if (user) saveMealColumns(user.uid, newColumns).catch(console.error);
    setEditingColIndex(mealColumns.length);
    setEditingColValue("New Column");
  };

  const handleDeleteColumn = (colName: string) => {
    const hasItems =
      plan.some((p) => p.mealType === colName) ||
      snacks.some((s) => s.mealType === colName);
    if (
      hasItems &&
      !window.confirm(
        `"${colName}" has planned items. Removing it will delete them. Continue?`
      )
    )
      return;
    const newColumns = mealColumns.filter((c) => c !== colName);
    dispatch({ type: "REMOVE_MEAL_COLUMN", payload: { name: colName } });
    if (user) {
      Promise.all([
        saveMealColumns(user.uid, newColumns),
        removeMealColumnFromCloud(user.uid, colName),
      ]).catch(console.error);
    }
  };

  const startRename = (idx: number, currentName: string) => {
    setEditingColIndex(idx);
    setEditingColValue(currentName);
  };

  const commitRename = (idx: number) => {
    const newName = editingColValue.trim();
    if (newName && newName !== mealColumns[idx] && !mealColumns.includes(newName)) {
      const oldName = mealColumns[idx];
      const newColumns = mealColumns.map((c, i) => (i === idx ? newName : c));
      dispatch({ type: "RENAME_MEAL_COLUMN", payload: { oldName, newName } });
      if (user) {
        Promise.all([
          saveMealColumns(user.uid, newColumns),
          renameMealColumnInCloud(user.uid, oldName, newName),
        ]).catch(console.error);
      }
    }
    setEditingColIndex(null);
  };

  // --- Drag Selection State ---
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStartDay, setDragStartDay] = React.useState<string | null>(null);
  const [dragMode, setDragMode] = React.useState<"select" | "deselect">("select");
  const [initialSelectedDuringDrag, setInitialSelectedDuringDrag] = React.useState<string[]>([]);

  const getRange = (d1Str: string, d2Str: string): string[] => {
    const d1 = new Date(d1Str);
    const d2 = new Date(d2Str);
    const start = d1 < d2 ? d1 : d2;
    const end = d1 < d2 ? d2 : d1;
    const range: string[] = [];
    const current = new Date(start);
    let safety = 0;
    while (current <= end && safety < 366) {
      range.push(toISODateString(current));
      current.setDate(current.getDate() + 1);
      safety++;
    }
    return range;
  };

  const handleDayMouseDown = (dateString: string, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (e.shiftKey) {
      handleDayClick(dateString, e);
      return;
    }
    const isSelected = selectedDates.includes(dateString);
    setInitialSelectedDuringDrag(selectedDates);
    setIsDragging(true);
    setDragStartDay(dateString);
    setDragMode(isSelected ? "deselect" : "select");
    handleDayClick(dateString, e);
  };

  const handleDayMouseEnter = (dateString: string) => {
    if (!isDragging || !dragStartDay) return;
    const range = getRange(dragStartDay, dateString);
    let newSelected: string[];
    if (dragMode === "select") {
      newSelected = Array.from(new Set([...initialSelectedDuringDrag, ...range]));
    } else {
      const rangeSet = new Set(range);
      newSelected = initialSelectedDuringDrag.filter((d) => !rangeSet.has(d));
    }
    dispatch({ type: "SET_SELECTED_DATES", payload: newSelected });
  };

  React.useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
      setDragStartDay(null);
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const handleDayClick = (
    clickedDayString: string,
    e: React.MouseEvent | React.KeyboardEvent
  ) => {
    const isSelected = selectedDates.includes(clickedDayString);
    if (!e.shiftKey) {
      const newSelectedDates = isSelected
        ? selectedDates.filter((d) => d !== clickedDayString)
        : [...selectedDates, clickedDayString];
      dispatch({ type: "SET_SELECTED_DATES", payload: newSelectedDates });
    } else {
      if (selectedDates.length === 0) return;
      const lastSelected = selectedDates[selectedDates.length - 1];
      const range = getRange(lastSelected, clickedDayString);
      const newSelectedDatesSet = new Set([...selectedDates, ...range]);
      dispatch({ type: "SET_SELECTED_DATES", payload: Array.from(newSelectedDatesSet) });
    }
  };

  return (
    <div className={styles.gridContainer}>
      {/* Sticky column header */}
      <div className={styles.gridHeader} style={gridStyle} ref={headerRef}>
        <div className={styles.headerCell}>Day</div>
        {mealColumns.map((colName, idx) => (
          <div key={colName} className={styles.headerCell} data-col-index={idx}>
            {editingColIndex === idx ? (
              <input
                className={styles.headerCellInput}
                value={editingColValue}
                autoFocus
                onChange={(e) => setEditingColValue(e.target.value)}
                onBlur={() => commitRename(idx)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename(idx);
                  if (e.key === "Escape") setEditingColIndex(null);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className={styles.headerCellName}
                onDoubleClick={() => startRename(idx, colName)}
                title="Double-click to rename"
              >
                {colName}
              </span>
            )}
            {mealColumns.length > 1 && (
              <button
                className={styles.deleteColBtn}
                onClick={() => handleDeleteColumn(colName)}
                title={`Remove "${colName}"`}
              >
                ×
              </button>
            )}
            <div
              className={styles.resizeHandle}
              onMouseDown={(e) => handleResizeStart(idx, e)}
            />
          </div>
        ))}
      </div>

      {/* Add column button — floats over top-right of header */}
      <button
        className={styles.addColumnBtn}
        onClick={handleAddColumn}
        title="Add column"
      >
        +
      </button>

      {/* Scrollable body */}
      <div className={styles.gridBody} ref={containerRef} onScroll={handleScroll}>
        {/* Phantom gives the scrollbar its total size */}
        <div
          className={styles.virtualPhantom}
          style={{ height: `${TOTAL_DAYS * BASE_ROW_HEIGHT}px` }}
        >
          {visibleItems.map(({ date, dateString, top, height }) => {
            const isSelected = selectedDates.includes(dateString);
            const isToday = dateString === todayString;
            const isPast = dateString < todayString;

            const rowStyle: React.CSSProperties = {
              ...gridStyle,
              top: `${top}px`,
              height: `${height}px`,
            };

            return (
              <div
                key={dateString}
                className={`${styles.virtualRow} ${isPast ? styles.virtualRowPast : ""}`}
                style={rowStyle}
              >
                {/* Day label cell */}
                <div
                  className={`${styles.dayCell} ${styles.cell} ${
                    isSelected ? styles.dayCellSelected : ""
                  } ${isToday ? styles.dayCellToday : ""}`}
                  onMouseDown={(e) => handleDayMouseDown(dateString, e)}
                  onMouseEnter={() => handleDayMouseEnter(dateString)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleDayClick(dateString, e);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                >
                  {isToday && <div className={styles.dayCellTodayLabel}>Today</div>}
                  <div>
                    {date.toLocaleDateString("en-US", { weekday: "long" })}
                  </div>
                  <div className={styles.dayCellDate}>
                    {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                </div>

                {/* Meal slots */}
                {mealColumns.map((mealType) => (
                  <MealSlot
                    key={`${dateString}-${mealType}`}
                    date={dateString}
                    mealType={mealType}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
