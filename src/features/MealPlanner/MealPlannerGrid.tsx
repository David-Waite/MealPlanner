import React from "react";
import { useAppState, useAppDispatch } from "../../context/hooks";
import { MealSlot } from "./MealSlot";
import styles from "./MealPlannerGrid.module.css";

// Helper to generate a list of dates
const getDays = (startDate: Date, count: number): Date[] => {
  const days = [];
  let currentDate = new Date(startDate);
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
  const dispatch = useAppDispatch(); // <-- NEW

  // For Stage 1, we'll just show 7 days starting from today.
  const days = getDays(new Date(), 7);

  const gridStyle = {
    gridTemplateColumns: `150px repeat(${mealColumns.length}, 1fr)`,
  } as React.CSSProperties;

  // --- NEW Date Selection Handler ---
  const handleDayClick = (dayString: string, e: React.MouseEvent) => {
    const isSelected = selectedDates.includes(dayString);

    if (!e.shiftKey) {
      // Regular click: select only this day
      dispatch({
        type: "SET_SELECTED_DATES",
        payload: isSelected ? [] : [dayString],
      });
    } else {
      // Shift click: toggle this day
      if (isSelected) {
        dispatch({
          type: "SET_SELECTED_DATES",
          payload: selectedDates.filter((d) => d !== dayString),
        });
      } else {
        dispatch({
          type: "SET_SELECTED_DATES",
          payload: [...selectedDates, dayString],
        });
      }
    }
  };

  return (
    <div className={styles.gridContainer}>
      <div className={styles.gridHeader} style={gridStyle}>
        <div className={styles.headerCell}>Day</div>
        {mealColumns.map((colName) => (
          <div key={colName} className={styles.headerCell}>
            {colName}
          </div>
        ))}
      </div>

      <div className={styles.gridBody}>
        <div className={styles.gridBodyContent} style={gridStyle}>
          {days.map((day) => {
            const dayString = toISODateString(day); // 'YYYY-MM-DD'
            const isSelected = selectedDates.includes(dayString); // <-- NEW

            return (
              <React.Fragment key={dayString}>
                {/* Day Header Cell (Y-Axis) */}
                <div
                  className={`${styles.dayCell} ${styles.cell} ${
                    isSelected ? styles.dayCellSelected : "" // <-- NEW CLASS
                  }`}
                  onClick={(e) => handleDayClick(dayString, e)} // <-- NEW HANDLER
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
