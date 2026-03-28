import { useContext } from "react";
import { AppStateContext, AppDispatchContext, AppLoadingContext } from "./context";

export const useAppState = () => useContext(AppStateContext);
export const useAppDispatch = () => useContext(AppDispatchContext);
export const useAppLoading = () => useContext(AppLoadingContext);
