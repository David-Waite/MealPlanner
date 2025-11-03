import React from "react";
import { useAppState, useAppDispatch } from "../../context/hooks";
import { MealSlot } from "./MealSlot";
import styles from "./MealPlannerGrid.module.css";

// Helper to generate a list of dates
const getDays = (startDate: Date, count: number): Date[] => {
  const days = [];
  const currentDate = new Date(startDate);
  for (let i = 0; i < count; i++) {
    days.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return days;
};

// Helper to format date to 'YYYY-MM-DD'
const toISODateString = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

export const MealPlannerGrid: React.FC = () => {
  const { mealColumns, selectedDates } = useAppState();
  const dispatch = useAppDispatch();

  // We need the list of days for our logic
  const days = getDays(new Date(), 7);
  // And a list of just the date strings in order
  const displayedDayStrings = days.map(toISODateString);

  const gridStyle = {
    gridTemplateColumns: `150px repeat(${mealColumns.length}, 1fr)`,
  } as React.CSSProperties;

  // --- NEW Date Selection Handler ---
  const handleDayClick = (clickedDayString: string, e: React.MouseEvent) => {
    const isSelected = selectedDates.includes(clickedDayString);

    if (!e.shiftKey) {
      // --- REGULAR CLICK (Toggle) ---
      // This is the new toggle logic
      let newSelectedDates: string[];
      if (isSelected) {
        newSelectedDates = selectedDates.filter((d) => d !== clickedDayString);
      } else {
        newSelectedDates = [...selectedDates, clickedDayString];
      }
      dispatch({ type: "SET_SELECTED_DATES", payload: newSelectedDates });
    } else {
      // --- SHIFT CLICK (Range Select) ---

      // 1. Find the "anchor" (the first selected day in the list)
      let anchorIndex = -1;
      for (let i = 0; i < displayedDayStrings.length; i++) {
        if (selectedDates.includes(displayedDayStrings[i])) {
          anchorIndex = i;
          break; // Found the top-most selected day
        }
      }

      // 2. If no anchor, treat as a normal click
      if (anchorIndex === -1) {
        let newSelectedDates: string[];
        if (isSelected) {
          newSelectedDates = selectedDates.filter(
            (d) => d !== clickedDayString
          );
        } else {
          newSelectedDates = [...selectedDates, clickedDayString];
        }
        dispatch({ type: "SET_SELECTED_DATES", payload: newSelectedDates });
        return;
      }

      // 3. Find the clicked index
      const clickedIndex = displayedDayStrings.indexOf(clickedDayString);

      // 4. Determine the range
      const startIndex = Math.min(anchorIndex, clickedIndex);
      const endIndex = Math.max(anchorIndex, clickedIndex);

      // 5. Get all days within that range
      const rangeToSelect = displayedDayStrings.slice(startIndex, endIndex + 1);

      // 6. Merge with existing selection (using a Set to avoid duplicates)
      const newSelectedDatesSet = new Set(selectedDates);
      rangeToSelect.forEach((day) => newSelectedDatesSet.add(day));

      dispatch({
        type: "SET_SELECTED_DATES",
        payload: Array.from(newSelectedDatesSet),
      });
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
      <div className={styles.gridBody}>
        <div className={styles.gridBodyContent} style={gridStyle}>
          {days.map((day) => {
            const dayString = toISODateString(day); // 'YYYY-MM-DD'
            const isSelected = selectedDates.includes(dayString);

            return (
              <React.Fragment key={dayString}>
                {/* Day Header Cell (Y-Axis) */}
                <div
                  className={`${styles.dayCell} ${styles.cell} ${
                    isSelected ? styles.dayCellSelected : ""
                  }`}
                  onClick={(e) => handleDayClick(dayString, e)} // <-- This now uses our new logic
                >
                  <div>
                    {day.toLocaleDateString("en-US", { weekday: "long" })}
                  </div>
                  <div className={styles.dayCellDate}>
                    {day.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>

                {/* Meal Slots */}
                {mealColumns.map((mealType) => (
                  <MealSlot
                    key={mealType}
                    date={dayString}
                    mealType={mealType}
                  />
                ))}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
