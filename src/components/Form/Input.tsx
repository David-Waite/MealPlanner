import React from "react";
import styles from "./Form.module.css";

// We'll pass all standard <input> props
type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input: React.FC<InputProps> = (props) => {
  return <input className={styles.input} {...props} />;
};
