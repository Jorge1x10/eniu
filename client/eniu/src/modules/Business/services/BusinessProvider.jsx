import { useEffect, useState } from "react";
import { BusinessContext } from "../context/BusinessContext";
import { useApi } from "../../auth/services/useApi";

export function BusinessProvider({ children }) {
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(true);

  const { get } = useApi("businesses");

  useEffect(() => {
    const controller = new AbortController();

    async function loadBusinesses() {
      const response = await get({ signal: controller.signal });

      if (response.aborted) return;

      if (!response.ok) {
        setBusinesses([]);
        setSelectedBusiness(null);
        setIsLoadingBusinesses(false);
        return;
      }

      const receivedBusinesses = response.data.businesses || [];

      setBusinesses(receivedBusinesses);

      const savedBusinessId = localStorage.getItem(
        "selected_business_id"
      );

      const savedBusiness = receivedBusinesses.find(
        (business) => business.id === savedBusinessId
      );

      const initialBusiness =
        savedBusiness || receivedBusinesses[0] || null;

      setSelectedBusiness(initialBusiness);

      if (initialBusiness) {
        localStorage.setItem(
          "selected_business_id",
          initialBusiness.id
        );
      } else {
        localStorage.removeItem("selected_business_id");
      }

      setIsLoadingBusinesses(false);
    }

    const taskId = window.setTimeout(loadBusinesses, 0);
    return () => {
      window.clearTimeout(taskId);
      controller.abort();
    };
  }, [get]);

  function selectBusiness(businessId) {
    const business = businesses.find(
      (item) => item.id === businessId
    );

    if (!business) return;

    setSelectedBusiness(business);
    localStorage.setItem("selected_business_id", business.id);
  }

  function addBusiness(business) {
    setBusinesses((current) => [...current, business]);
    setSelectedBusiness(business);
    localStorage.setItem("selected_business_id", business.id);
  }

  function updateBusiness(updatedBusiness) {
    setBusinesses((current) =>
      current.map((business) =>
        business.id === updatedBusiness.id ? updatedBusiness : business
      )
    );
    setSelectedBusiness((current) =>
      current?.id === updatedBusiness.id ? updatedBusiness : current
    );
  }

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        selectedBusiness,
        isLoadingBusinesses,
        selectBusiness,
        addBusiness,
        updateBusiness,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}
