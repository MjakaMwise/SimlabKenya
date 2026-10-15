import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "./Icon";
import { IMG, PHONE, TEL } from "./data";

/** One-time launch notice for Ocean Shujaa, shown on the home page. */
export function Announcement({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const prev = useRef<Element | null>(document.activeElement);
  const closing = useRef(false);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    try { sessionStorage.setItem("annOS", "1"); } catch { /* storage unavailable */ }
    setOpen(false);
    setTimeout(() => {
      document.documentElement.style.overflow = "";
      onDone();
      const p = prev.current as HTMLElement | null;
      if (p && p.focus) p.focus();
    }, 350);
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); closeRef.current(); } };
    document.addEventListener("keydown", key, true);
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        setOpen(true);
        (ref.current?.querySelector(".ann-x") as HTMLElement | null)?.focus({ preventScroll: true });
      });
    });
    return () => {
      document.removeEventListener("keydown", key, true);
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
      document.documentElement.style.overflow = "";
    };
  }, []);

  return (
    <div
      className={`ann${open ? " open" : ""}`}
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="New holiday program: Ocean Shujaa"
      onClick={(e) => { if (e.target === ref.current) close(); }}
    >
      <div className="ann-card">
        <button className="ann-x" onClick={close} aria-label="Close"><Icon name="x" /></button>
        <span className="pill">NEW HOLIDAY PROGRAM</span>
        <img className="ann-title" src={IMG.ost} alt="Ocean Shujaa" width={704} height={477} />
        <div className="ann-sub">From the Ocean to the Laboratory</div>
        <p>Five days of real ocean science: marine life, ocean water testing, mangroves, plastic pollution and climate change, in the field and in partner laboratories.</p>
        <div className="ann-facts"><span>5 days</span><span>Primary to college</span><span>IOME001 Innovation Hub, Mombasa</span></div>
        <div className="ann-row">
          <Link className="btn go" to="/ocean-shujaa" onClick={close}>Explore Ocean Shujaa</Link>
          <a className="btn call" href={TEL}><Icon name="phone" />{PHONE}</a>
        </div>
        <button className="ann-later" onClick={close}>Maybe later</button>
        <svg className="ann-wave" viewBox="0 0 500 54" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 22C80 6 160 6 250 22S420 38 500 22V54H0Z" />
          <path d="M0 32C90 20 170 20 250 32S410 44 500 32V54H0Z" />
          <path d="M0 42C90 34 170 34 250 42S410 50 500 42V54H0Z" />
        </svg>
      </div>
    </div>
  );
}
