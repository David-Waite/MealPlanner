import React from "react";
import styles from "./Avatar.module.css";

interface AvatarProps {
  initials: string;
  bgColor: string;
  selected?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  initials,
  bgColor,
  selected = false,
}) => {
  // Use a CSS variable to pass the color prop
  const style = { "--avatar-bg": bgColor } as React.CSSProperties;

  return (
    <div
      className={`${styles.avatar} ${selected ? styles.selected : ""}`}
      style={style}
    >
      {initials}
    </div>
  );
};
