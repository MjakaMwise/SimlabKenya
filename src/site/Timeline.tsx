/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { ObjSvg } from "./ObjSvg";
import { FRI } from "./sci";

export interface TLItem {
  id: string;
  color: string;
  box: ReactNode;
  objHtml: string;
}

/** A scroll-drawn timeline: each row pairs a text card with an animated shape. */
export function Timeline({ items }: { items: TLItem[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = ref.current;
    if (!tl) return;
    const svg = tl.querySelector(".tl-svg") as SVGSVGElement;
    const rows = [...tl.querySelectorAll(".tl-row")] as HTMLElement[];
    const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
    const cl = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
    let segs: any[] = [], nodes: any[] = [], boxes: any[] = [], objs: any[] = [], mobile = false;
    const rel = (el: Element, b: DOMRect) => {
      const r = el.getBoundingClientRect();
      return { l: r.left - b.left, r: r.right - b.left, t: r.top - b.top, b: r.bottom - b.top, w: r.width, h: r.height, cx: (r.left + r.right) / 2 - b.left, cy: (r.top + r.bottom) / 2 - b.top };
    };
    const upd = () => {
      const base = tl.getBoundingClientRect(), head = reduce ? 1e9 : innerHeight * 0.72 - base.top;
      segs.forEach((s) => {
        let f;
        if (s.k === "h") f = cl((head - (s.y1 - 36)) / 130);
        else f = cl((head - s.y1) / Math.max(1, s.y2 - s.y1));
        s.f = f;
        s.line.style.strokeDashoffset = (1 - f).toFixed(3);
        s.n1.classList.toggle("on", f > 0.02);
        s.n2.classList.toggle("on", f > 0.985);
      });
      rows.forEach((r, i) => {
        boxes[i].el.classList.toggle("on", head > boxes[i].g.t + 36);
        const h = segs.find((s) => s.k === "h" && s.i === i);
        objs[i].el.classList.toggle("on", mobile ? head > objs[i].g.t + 40 : h && h.f > 0.985);
      });
      nodes.forEach((n) => n.el.classList.toggle("on", head > n.y));
    };
    const layout = () => {
      const base = tl.getBoundingClientRect();
      mobile = base.width < 760;
      boxes = rows.map((r) => ({ el: r.querySelector(".tl-box"), g: rel(r.querySelector(".tl-box"), base) }));
      objs = rows.map((r) => {
        const s = r.querySelector(".tl-fr") as SVGElement;
        return { el: r.querySelector(".tl-obj"), g: rel(s, base), f: FRI[s.dataset.f] };
      });
      segs = []; nodes = [];
      let html = "";
      if (!mobile) {
        rows.forEach((r, i) => {
          const b = boxes[i].g, o = objs[i].g, fi = objs[i].f, left = i % 2 === 0, cy = o.t + o.h * 0.5;
          segs.push({ x1: left ? b.r : b.l, y1: cy, x2: left ? o.l + fi.x * o.w : o.r - fi.x * o.w, y2: cy, k: "h", i });
          if (i < rows.length - 1) segs.push({ x1: o.cx, y1: o.t + o.h * fi.b, x2: o.cx, y2: boxes[i + 1].g.t, k: "v", i });
        });
      } else {
        const x = 12, y1 = objs[0].g.t + objs[0].g.h * 0.5, y2 = boxes[rows.length - 1].g.b;
        segs.push({ x1: x, y1, x2: x, y2, k: "s" });
        rows.forEach((r, i) => nodes.push({ x, y: objs[i].g.t + objs[i].g.h * 0.5, i }));
      }
      segs.forEach((s, k) => {
        const d = `M${s.x1.toFixed(1)} ${s.y1.toFixed(1)}L${s.x2.toFixed(1)} ${s.y2.toFixed(1)}`;
        html += `<path class="tl-track" d="${d}"/><path class="tl-line" pathLength="1" d="${d}" data-s="${k}"/><circle class="tl-n" r="6.5" cx="${s.x1.toFixed(1)}" cy="${s.y1.toFixed(1)}" data-a="${k}"/><circle class="tl-n" r="6.5" cx="${s.x2.toFixed(1)}" cy="${s.y2.toFixed(1)}" data-b="${k}"/>`;
      });
      nodes.forEach((n, k) => {
        html += `<circle class="tl-n tl-sn" r="8" cx="${n.x}" cy="${n.y.toFixed(1)}" data-m="${k}"/>`;
      });
      svg.setAttribute("width", String(base.width));
      svg.setAttribute("height", String(base.height));
      svg.setAttribute("viewBox", `0 0 ${base.width} ${base.height}`);
      svg.innerHTML = html;
      segs.forEach((s, k) => {
        s.line = svg.querySelector(`[data-s="${k}"]`);
        s.n1 = svg.querySelector(`[data-a="${k}"]`);
        s.n2 = svg.querySelector(`[data-b="${k}"]`);
      });
      nodes.forEach((n, k) => { n.el = svg.querySelector(`[data-m="${k}"]`); });
      upd();
    };
    let rt: ReturnType<typeof setTimeout>;
    const onR = () => { clearTimeout(rt); rt = setTimeout(layout, 90); };
    const ro = new ResizeObserver(onR);
    ro.observe(tl);
    window.addEventListener("scroll", upd, { passive: true });
    window.addEventListener("resize", onR);
    let alive = true;
    layout();
    const t2 = setTimeout(layout, 400);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => alive && layout());
    return () => {
      alive = false;
      ro.disconnect();
      clearTimeout(rt);
      clearTimeout(t2);
      window.removeEventListener("scroll", upd);
      window.removeEventListener("resize", onR);
    };
  }, [items]);

  return (
    <div className="tl" ref={ref}>
      <svg className="tl-svg" aria-hidden="true" />
      {items.map((it, i) => {
        const box = (
          <div className="tl-box" style={{ "--sx": i % 2 ? "40px" : "-40px" } as React.CSSProperties}>
            <article className="pc tl-in">{it.box}</article>
          </div>
        );
        const obj = (
          <div className="tl-obj" style={{ "--c": it.color } as React.CSSProperties}>
            <div className="tl-in">
              <ObjSvg html={it.objHtml} delay={i * 500} />
            </div>
          </div>
        );
        return (
          <div className="tl-row" id={`w-${it.id}`} key={it.id} style={{ "--c": it.color } as React.CSSProperties}>
            {i % 2 ? <>{obj}{box}</> : <>{box}{obj}</>}
          </div>
        );
      })}
    </div>
  );
}
