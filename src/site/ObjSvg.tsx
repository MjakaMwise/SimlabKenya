import { useEffect, useRef } from "react";
import { SCIA } from "./sci";

/** Renders a program/day "object" SVG (shape + icons) and cycles its icons every few seconds. */
export function ObjSvg({ html, delay = 0 }: { html: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!SCIA || !ref.current) return;
    const icons = [...ref.current.querySelectorAll(".mi")];
    if (icons.length < 2) return;
    let i = 0;
    let iv: ReturnType<typeof setInterval> | undefined;
    const to = setTimeout(() => {
      iv = setInterval(() => {
        icons[i].classList.remove("act");
        i = (i + 1) % icons.length;
        icons[i].classList.add("act");
      }, 3300);
    }, delay);
    return () => {
      clearTimeout(to);
      if (iv) clearInterval(iv);
    };
  }, [html, delay]);
  return <div ref={ref} style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: html }} />;
}
