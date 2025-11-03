import React from "react";
import { Button } from "../../components/Button/Button";

interface ShoppingListButtonProps {
  onClick: () => void;
}

export const ShoppingListButton: React.FC<ShoppingListButtonProps> = ({
  onClick,
}) => {
  return <Button onClick={onClick}>View Shopping List</Button>;
};
