import { createContext, useContext } from "react";

export interface SiteCtx {
  /** Open the program pop-up. `full` shows the learn list and bench note (used on the programs page). */
  openPop: (i: number, btn: HTMLElement | null, full: boolean) => void;
  toast: (message: string) => void;
  /** Open the Ocean Shujaa registration modal. */
  openRegister: () => void;
}

export const SiteContext = createContext<SiteCtx>({ openPop: () => {}, toast: () => {}, openRegister: () => {} });
export const useSite = () => useContext(SiteContext);
