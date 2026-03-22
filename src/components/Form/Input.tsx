import React from "react";
import styles from "./Form.module.css";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input: React.FC<InputProps> = ({ className = "", ...props }) => {
  return <input className={`${styles.input} ${className}`} {...props} />;
};
