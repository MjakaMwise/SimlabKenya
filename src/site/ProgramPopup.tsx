import { useEffect, useLayoutEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { Icon } from "./Icon";
import { Go, WaBtn, CheckList } from "./ui";
import { ObjSvg } from "./ObjSvg";
import { objHtml } from "./sci";
import { PROGRAMS, PCOL } from "./data";

export interface PopReq {
  i: number;
  btn: HTMLElement | null;
  full: boolean;
  id: number;
}

const FRAC: Record<string, number> = { hex: 0.833, bio: 0.8, orb: 0.9 };
const reducedMotion = () => matchMedia("(prefers-reduced-motion:reduce)").matches;

/** Where the pop-up's shape should fly from/to so it appears to grow out of the clicked hexagon or card. */
function popFlight(src: Element, obj: Element) {
  const sr = src.getBoundingClientRect();
  const svg = obj.querySelector("svg") as SVGElement;
  const tr = svg.getBoundingClientRect();
  const frac = src.closest && src.closest(".hxw") ? FRAC[svg.dataset.f] || 1 : 1;
  return {
    dx: sr.left + sr.width / 2 - (tr.left + tr.width / 2),
    dy: sr.top + sr.height / 2 - (tr.top + tr.height / 2),
    s: sr.width / (tr.width * frac),
  };
}

export function ProgramPopup({ req, onClosed }: { req: PopReq; onClosed: () => void }) {
  const { i, btn, full } = req;
  const [tag, t, d, l, note, lt, lk] = PROGRAMS[i];
  const popRef = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const goneEl = useRef<Element | null>(null);
  const srcEl = useRef<Element | null>(null);
  const html = useRef<string>();
  if (!html.current) html.current = objHtml(i);

  const finish = () => {
    if (goneEl.current) goneEl.current.classList.remove("gone");
    goneEl.current = null;
    onClosed();
    if (btn && document.contains(btn)) btn.focus({ preventScroll: true });
  };

  const close = () => {
    const pop = popRef.current;
    if (!pop || closing.current) return;
    const obj = pop.querySelector(".pp-side .tl-obj") as HTMLElement | null;
    const src = srcEl.current;
    if (!obj || !obj.animate || !src || !document.contains(src) || reducedMotion()) {
      finish();
      return;
    }
    closing.current = true;
    const f = popFlight(src, obj);
    const fo = (dur: number, delay = 0): KeyframeAnimationOptions => ({ duration: dur, delay, fill: "forwards" });
    pop.querySelector(".pbg")!.animate([{ opacity: 1 }, { opacity: 0 }], fo(380, 60));
    pop.querySelectorAll(".pp-body>*").forEach((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], fo(160)));
    ["pp-surface", "pclose", "pp-stub"].forEach((c) => pop.querySelector("." + c)!.animate([{ opacity: 1 }, { opacity: 0 }], fo(240, 60)));
    obj.animate(
      [{ transform: "none" }, { transform: `translate(${f.dx}px,${f.dy}px) scale(${f.s})` }],
      { duration: 500, delay: 80, easing: "cubic-bezier(.5,0,.2,1)", fill: "forwards" }
    );
    setTimeout(finish, 620);
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") closeRef.current(); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);

  useLayoutEffect(() => {
    const pop = popRef.current as HTMLElement;
    const obj = pop.querySelector(".pp-side .tl-obj") as HTMLElement;
    const side = pop.querySelector(".pp-side") as HTMLElement;
    const surf = pop.querySelector(".pp-surface") as HTMLElement;
    surf.style.setProperty("--sideh", side.offsetHeight + "px");
    const row = btn && btn.closest && btn.closest(".tl-row");
    srcEl.current = (row && row.querySelector(".tl-fr")) || btn;
    (pop.querySelector(".pclose") as HTMLElement).focus({ preventScroll: true });
    if (!btn || !obj.animate || reducedMotion()) return;
    const hw = btn.closest && btn.closest(".hxw");
    if (hw) { hw.classList.add("gone"); goneEl.current = hw; }
    const f = popFlight(srcEl.current as Element, obj);
    const texts = [...pop.querySelectorAll(".pp-body>*")];
    pop.querySelector(".pbg")!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: "backwards" });
    obj.animate([{ transform: `translate(${f.dx}px,${f.dy}px) scale(${f.s})` }, { transform: "none" }], { duration: 760, easing: "cubic-bezier(.2,.85,.25,1)", fill: "backwards" });
    [surf, pop.querySelector(".pclose"), pop.querySelector(".pp-stub")].forEach((el) => el!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 420, fill: "backwards" }));
    texts.forEach((el, k) => el.animate([{ opacity: 0, transform: "translateX(28px)" }, { opacity: 1, transform: "none" }], { duration: 540, delay: 500 + k * 90, easing: "ease-out", fill: "backwards" }));
    return () => { if (goneEl.current) goneEl.current.classList.remove("gone"); };
  }, []);

  const msg = "Hello SIM-Lab, I am interested in the program: " + t;
  return (
    <div id="pop" className="open" role="dialog" aria-modal="true" aria-labelledby="pp-t" ref={popRef}>
      <div className="pbg" onClick={close} />
      <div className="pcard pc2" style={{ "--c": PCOL[i] } as CSSProperties}>
        <div className="pp-surface" />
        <button className="pclose" onClick={close} aria-label="Close details"><Icon name="x" /></button>
        <div className="pp-side">
          <i className="pp-stub" />
          <div className="tl-obj instant on"><ObjSvg html={html.current} /></div>
        </div>
        <div className="pp-body">
          <div className="mono">{tag}</div>
          <h3 id="pp-t">{t}</h3>
          <p className="d">{d}</p>
          {full && (
            <div>
              <h4>What Students Learn</h4>
              <CheckList items={l} />
            </div>
          )}
          {full && (
            <div className="bn">
              <div className="mono">Bench note</div>
              <p style={{ marginTop: 6, fontSize: ".95rem" }}>{note}</p>
            </div>
          )}
          <div className="row">
            {full ? (lk ? <span onClick={close} style={{ display: "contents" }}><Go to={lk}>{lt}</Go></span> : null) : <span onClick={close} style={{ display: "contents" }}><Go to={`/programs#prog${i}`}>Full story</Go></span>}
            <WaBtn text={msg} label="WhatsApp" />
          </div>
        </div>
      </div>
    </div>
  );
}
