import React from "react";
import styles from "./Form.module.css";

interface FormGroupProps {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}

// A simple component to wrap a <label> and <input>
export const FormGroup: React.FC<FormGroupProps> = ({
  label,
  htmlFor,
  children,
}) => {
  return (
    <div className={styles.formGroup}>
      <label htmlFor={htmlFor} className={styles.label}>
        {label}
      </label>
      {children}
    </div>
  );
};
