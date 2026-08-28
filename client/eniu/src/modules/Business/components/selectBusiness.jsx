import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Building2,
  Check,
  ChevronDown,
  Lock,
  Plus,
} from "lucide-react";

import { usePlan } from "../../auth/hooks/usePlan";
import { useBusiness } from "../services/useBusiness";

function resolvePhotoUrl(photoUrl) {
  if (!photoUrl || photoUrl.startsWith("http")) return photoUrl;

  try {
    return `${new URL(import.meta.env.VITE_API_URL).origin}${photoUrl}`;
  } catch {
    return photoUrl;
  }
}

function BusinessAvatar({ business, className, iconSize = 18 }) {
  const photoUrl = resolvePhotoUrl(business?.photo_url);

  return (
    <div className={`shrink-0 overflow-hidden bg-[#FFE05A] text-[#111111] ${className}`}>
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={`Foto de ${business.name}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center">
          <Building2 size={iconSize} />
        </span>
      )}
    </div>
  );
}

export default function BusinessSelector({ onCreateBusiness }) {
  const [isOpen, setIsOpen] = useState(false);
  const { limits, isWithin } = usePlan();
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const {
    businesses,
    selectedBusiness,
    selectBusiness,
    isLoadingBusinesses,
  } = useBusiness();

  const isBusinessPage = location.pathname
    .toLowerCase()
    .startsWith("/dashboard/business/");

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function handleSelectBusiness(businessId) {
    selectBusiness(businessId);
    setIsOpen(false);
    navigate(`/dashboard/business/${businessId}`);
  }

  function handleCreateBusiness() {
    setIsOpen(false);
    onCreateBusiness();
  }

  if (isLoadingBusinesses) {
    return (
      <div className="mx-4 h-16 animate-pulse rounded-xl bg-[#2A2A2A]" />
    );
  }

  if (businesses.length === 0) {
    return (
      <button
        type="button"
        onClick={onCreateBusiness}
        className="  flex h-full w-full cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#FFE05A]/60  text-left text-[#FFE05A] hover:bg-[#FFE05A]/10"
      >
        <Plus size={18} />

        <div>
          <p className="text-xs text-[#D9D9D9]">Negocio</p>
          <p className="text-sm font-semibold">Crea tu negocio</p>
        </div>
      </button>
    );
  }

  return (
    <div ref={dropdownRef} className="relative w-full h-full">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className={`flex h-full w-full cursor-pointer items-center gap-3 rounded-xl px-4 text-left transition ${
          isBusinessPage
            ? "bg-[#FFE05A] text-[#111111]"
            : "bg-[#2A2A2A] text-[#FFFDF5] hover:bg-[#353535]"
        }`}
      >
        <BusinessAvatar
          business={selectedBusiness}
          className="h-9 w-9 rounded-lg"
        />

        <div className="min-w-0 flex-1">
          <p
            className={`text-xs ${
              isBusinessPage ? "text-[#555555]" : "text-[#D9D9D9]"
            }`}
          >
            Negocio actual
          </p>

          <p className="truncate text-sm font-semibold">
            {selectedBusiness?.name}
          </p>
        </div>

        <ChevronDown
          size={16}
          className={`transition ${
            isBusinessPage ? "text-[#111111]" : "text-[#D9D9D9]"
          } ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-full overflow-hidden rounded-xl border border-[#3A3A3A] bg-[#2A2A2A] p-1 shadow-xl">
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#D9D9D9]">
            Mis negocios
          </p>

          {businesses.map((business) => {
            const isSelected =
              business.id === selectedBusiness?.id;

            return (
              <button
                key={business.id}
                type="button"
                onClick={() =>
                  handleSelectBusiness(business.id)
                }
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition cursor-pointer ${
                  isSelected
                    ? "bg-[#FFE05A] font-semibold text-[#111111]"
                    : "text-[#FFFDF5] hover:bg-[#3A3A3A]"
                }`}
              >
                <BusinessAvatar
                  business={business}
                  className="h-7 w-7 rounded-md"
                  iconSize={15}
                />

                <span className="min-w-0 flex-1 truncate">
                  {business.name}
                </span>

                {isSelected && <Check size={16} />}
              </button>
            );
          })}

          <div className="my-1 border-t border-[#444444]" />

          {isWithin(businesses.length, limits.max_businesses) ? (
            <button
              type="button"
              onClick={handleCreateBusiness}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#FFE05A] transition hover:bg-[#3A3A3A] cursor-pointer"
            >
              <Plus size={16} />
              Crear otro negocio
            </button>
          ) : (
            <p className="flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-[#AAAAAA]">
              <Lock size={16} className="mt-0.5 shrink-0" />
              Tu plan actual permite {limits.max_businesses === 1 ? "un negocio" : `${limits.max_businesses} negocios`}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
