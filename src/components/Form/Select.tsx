import React from "react";
import styles from "./Form.module.css";

// We'll pass all standard <select> props
type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select: React.FC<SelectProps> = ({ children, ...props }) => {
  return (
    <select className={styles.input} {...props}>
      {children}
    </select>
  );
};
