import { useEffect, useRef } from "react";
import { Icon } from "./Icon";
import RegisterForm from "./RegisterForm";

export default function RegisterModal({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
      prev?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  return (
    <div id="regmodal" role="dialog" aria-modal="true" aria-labelledby="reg-t">
      <div className="pbg" onClick={onClose} />
      <div className="pcard reg-card">
        <button ref={closeRef} className="pclose" onClick={onClose} aria-label="Close registration"><Icon name="x" /></button>
        <div className="reg-head">
          <div className="mono">OCEAN SHUJAA</div>
          <h3 id="reg-t">Register for Ocean Shujaa</h3>
          <p>Fill in the form and we will contact you to confirm your place.</p>
        </div>
        <div className="reg-body"><RegisterForm /></div>
      </div>
    </div>
  );
}
