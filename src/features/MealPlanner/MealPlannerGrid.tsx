import React from "react";
import { useAppState, useAppDispatch } from "../../context/hooks";
import { MealSlot } from "./MealSlot";
import styles from "./MealPlannerGrid.module.css";


// Helper to format date to 'YYYY-MM-DD'
const toISODateString = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

export const MealPlannerGrid: React.FC = () => {
  const { mealColumns, selectedDates } = useAppState();
  const dispatch = useAppDispatch();

  // --- VIRTUALIZATION CONSTANTS ---
  const ROW_HEIGHT = 120; // px
  const OVERSCAN = 2; // Extra rows to render above/below
  // Total span: let's do ~30 years (10k days)
  // Center it so we can scroll up ~15 years and down ~15 years
  const TOTAL_DAYS = 10000;
  const START_OFFSET_INDEX = 5000; // Index representing "Today"

  // Ref for the scrolling container
  const containerRef = React.useRef<HTMLDivElement>(null);

  // State for virtualization
  const [scrollTop, setScrollTop] = React.useState(0);
  const [viewportHeight, setViewportHeight] = React.useState(600); // Default estimate

  // On mount, scroll to center
  React.useLayoutEffect(() => {
    if (containerRef.current) {
      // Calculate where "today" is
      const initialScroll = START_OFFSET_INDEX * ROW_HEIGHT;
      containerRef.current.scrollTop = initialScroll;
      setScrollTop(initialScroll);
      setViewportHeight(containerRef.current.clientHeight);
    }
  }, []);

  // Update scroll top on scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Update viewport height on resize
  React.useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setViewportHeight(containerRef.current.clientHeight);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- CALCULATE VISIBLE RANGE ---
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    TOTAL_DAYS - 1,
    Math.floor((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN
  );

  // Generate the visible items
  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const date = new Date();
    // Calculate date relative to today based on index offset
    // index 5000 = 0 days diff
    const dayOffset = i - START_OFFSET_INDEX;
    date.setDate(date.getDate() + dayOffset);
    visibleItems.push({
      index: i,
      date: date,
      dateString: toISODateString(date),
    });
  }

  const gridStyle = {
    gridTemplateColumns: `150px repeat(${mealColumns.length}, 1fr)`,
  } as React.CSSProperties;

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
    // Safety limit to prevent infinite loops (max 1 year range)
    let safety = 0;
    while (current <= end && safety < 366) {
      range.push(toISODateString(current));
      current.setDate(current.getDate() + 1);
      safety++;
    }
    return range;
  };

  const handleDayMouseDown = (dateString: string, e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only

    if (e.shiftKey) {
      handleDayClick(dateString, e);
      return;
    }

    const isSelected = selectedDates.includes(dateString);
    const mode = isSelected ? "deselect" : "select";
    
    setInitialSelectedDuringDrag(selectedDates);
    setIsDragging(true);
    setDragStartDay(dateString);
    setDragMode(mode);

    // Initial toggle for the clicked day
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

  // --- Date Selection Handler (Unchanged Logic, updated var names) ---
  const handleDayClick = (clickedDayString: string, e: React.MouseEvent | React.KeyboardEvent) => {
    // Note: Range selection logic relies on 'displayedDayStrings'.
    // Since we are virtualized, we can't easily count on visual order of *all* items for a huge range.
    // But for a reasonable range select, we can infer indices or just use dates.
    // For simplicity, I'll stick to the existing logic but adapt it to just handle the toggle/add
    // properly. Shift-click across a HUGE virtual range might be tricky,
    // let's simplify for now: Range select works if we just parse dates.

    const isSelected = selectedDates.includes(clickedDayString);

    if (!e.shiftKey) {
      // Standard Toggle
      let newSelectedDates: string[];
      if (isSelected) {
        newSelectedDates = selectedDates.filter((d) => d !== clickedDayString);
      } else {
        newSelectedDates = [...selectedDates, clickedDayString];
      }
      dispatch({ type: "SET_SELECTED_DATES", payload: newSelectedDates });
    } else {
      // Simplified Shift-Click:
      // 1. Find the latest selected date (if any) as anchor
      if (selectedDates.length === 0) return;

      const lastSelected = selectedDates[selectedDates.length - 1]; // Naive anchor
      const range = getRange(lastSelected, clickedDayString);

       // Merge
       const newSelectedDatesSet = new Set([...selectedDates, ...range]);
       dispatch({ type: "SET_SELECTED_DATES", payload: Array.from(newSelectedDatesSet) });
    }
  };

  return (
    <div className={styles.gridContainer}>
      {/* --- STICKY HEADER --- */}
      <div className={styles.gridHeader} style={gridStyle}>
        <div className={styles.headerCell}>Day</div>
        {mealColumns.map((colName) => (
          <div key={colName} className={styles.headerCell}>
            {colName}
          </div>
        ))}
      </div>

      {/* --- SCROLLABLE BODY --- */}
      <div
        className={styles.gridBody}
        ref={containerRef}
        onScroll={handleScroll}
      >
        {/* Phantom Container */}
        <div
          className={styles.virtualPhantom}
          style={{ height: `${TOTAL_DAYS * ROW_HEIGHT}px` }}
        >
          {visibleItems.map(({ index, date, dateString }) => {
            const isSelected = selectedDates.includes(dateString);

            // Absolute positioning for the row
            const rowStyle: React.CSSProperties = {
                ...gridStyle,
                top: `${index * ROW_HEIGHT}px`,
                height: `${ROW_HEIGHT}px`,
            };

            return (
              <div
                key={dateString}
                className={styles.virtualRow}
                style={rowStyle}
              >
                {/* Day Header Cell (Y-Axis) */}
                <div
                  className={`${styles.dayCell} ${styles.cell} ${
                    isSelected ? styles.dayCellSelected : ""
                  }`}
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
                  <div>
                    {date.toLocaleDateString("en-US", { weekday: "long" })}
                  </div>
                  <div className={styles.dayCellDate}>
                    {date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>

                {/* Meal Slots */}
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
