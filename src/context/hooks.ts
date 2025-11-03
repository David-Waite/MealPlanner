import { useContext } from "react";
import { AppStateContext, AppDispatchContext } from "./context";

// This hook is for accessing the state
export const useAppState = () => {
  return useContext(AppStateContext);
};

// This hook is for dispatching actions
export const useAppDispatch = () => {
  return useContext(AppDispatchContext);
};
