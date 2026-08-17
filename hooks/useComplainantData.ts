"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Complainant } from "@/lib/types";

const STORAGE_KEY = "HassMelden_user_data";
const DEBOUNCE_MS = 500;

export const EMPTY_COMPLAINANT: Complainant = {
  fullName: "",
  street: "",
  zip: "",
  city: "",
  email: "",
  phone: "",
  addressDisclosure: "full",
  deliveryNote: "",
};

function splitLegacyZipCity(zipCity: string): { zip: string; city: string } {
  const trimmed = zipCity.trim();
  const match = trimmed.match(/^(\d{5})\s*(.*)$/);
  if (match) {
    return { zip: match[1], city: match[2].trim() };
  }
  return { zip: "", city: trimmed };
}

function normalizeComplainant(parsed: Partial<Complainant> & { zipCity?: string }): Complainant {
  let zip = parsed.zip ?? "";
  let city = parsed.city ?? "";
  if ((!zip || !city) && parsed.zipCity) {
    const split = splitLegacyZipCity(parsed.zipCity);
    zip = zip || split.zip;
    city = city || split.city;
  }
  return {
    fullName: parsed.fullName ?? "",
    street: parsed.street ?? "",
    zip,
    city,
    email: parsed.email ?? "",
    phone: parsed.phone ?? "",
    addressDisclosure:
      parsed.addressDisclosure === "protected" ? "protected" : "full",
    deliveryNote: parsed.deliveryNote ?? "",
  };
}

function readStored(): Complainant | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<Complainant> & { zipCity?: string };
    return normalizeComplainant(parsed);
  } catch {
    return null;
  }
}

export function useComplainantData() {
  const [complainant, setComplainant] =
    useState<Complainant>(EMPTY_COMPLAINANT);
  const [persistLocally, setPersistLocally] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = readStored();
    if (stored) {
      setComplainant(stored);
      setPersistLocally(true);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (!persistLocally) {
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(complainant));
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [complainant, persistLocally, hydrated]);

  const updateField = useCallback(
    <K extends keyof Complainant>(key: K, value: Complainant[K]) => {
      setComplainant((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const clearData = useCallback(() => {
    setComplainant(EMPTY_COMPLAINANT);
    setPersistLocally(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const replaceComplainant = useCallback((data: Complainant) => {
    setComplainant(normalizeComplainant(data));
  }, []);

  const setPersist = useCallback((enabled: boolean) => {
    setPersistLocally(enabled);
    if (!enabled) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return {
    complainant,
    updateField,
    replaceComplainant,
    persistLocally,
    setPersist,
    clearData,
    hydrated,
  };
}
