import { useContext } from "react";
import { BusinessContext } from "../context/BusinessContext";

export function useBusiness() {
  const context = useContext(BusinessContext);

  if (!context) {
    throw new Error(
      "useBusiness debe utilizarse dentro de BusinessProvider"
    );
  }

  return context;
}