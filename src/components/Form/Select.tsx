import React from "react";
import styles from "./Form.module.css";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select: React.FC<SelectProps> = ({ children, className = "", ...props }) => {
  return (
    <select className={`${styles.input} ${className}`} {...props}>
      {children}
    </select>
  );
};
