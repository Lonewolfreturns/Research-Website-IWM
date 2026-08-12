import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../utils/api";

const DEFAULTS = {
  org_name: "Innovative Waste Management Lab",
  tagline: "",
  email: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  region: "",
  postal_code: "",
  country: "",
  office_hours: "",
  affiliation: "",
};

const SettingsContext = createContext({ settings: DEFAULTS, refresh: () => {}, updateSettings: () => {} });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/settings");
      setSettings({ ...DEFAULTS, ...data });
    } catch {
      /* keep defaults */
    }
  }, []);

  const updateSettings = useCallback(async (patch) => {
    const { data } = await api.put("/admin/settings", patch);
    setSettings({ ...DEFAULTS, ...data });
    return data;
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <SettingsContext.Provider value={{ settings, refresh, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

export function formatAddress(s, { joiner = ", " } = {}) {
  if (!s) return "";
  return [s.address_line1, s.address_line2, [s.city, s.region].filter(Boolean).join(", "), [s.postal_code, s.country].filter(Boolean).join(" · ")]
    .filter(Boolean).join(joiner);
}

export function locationShort(s) {
  if (!s) return "";
  return [s.city, s.region, s.country].filter(Boolean).join(" · ");
}
