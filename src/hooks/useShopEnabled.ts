import { useEffect, useState } from "react";

/** Whether the shop is switched on (set by an admin). `null` while loading. */
export const useShopEnabled = (): boolean | null => {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : { shop_enabled: false }))
      .then((d) => setEnabled(!!d.shop_enabled))
      .catch(() => setEnabled(false));
  }, []);
  return enabled;
};
