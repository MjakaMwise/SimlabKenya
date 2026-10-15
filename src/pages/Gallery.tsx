import { useEffect, useState } from "react";
import { PageHead } from "@/site/ui";
import { Icon } from "@/site/Icon";
import { IMG, GAL, CATS } from "@/site/data";

const Gallery = () => {
  const [cat, setCat] = useState("All Photos");
  const [lb, setLb] = useState<number | null>(null);
  const list = GAL.filter((g) => cat === "All Photos" || g[2] === cat);
  const n = list.length;
  const step = (d: number) => setLb((i) => (i === null ? i : (i + d + n) % n));

  useEffect(() => {
    if (lb === null) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLb(null);
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lb, n]);

  const g = lb !== null ? list[lb] : null;
  return (
    <>
      <PageHead title="Gallery" sub="Moments from our workshops, presentations and holiday programs. Open any photo to enlarge it." img={IMG.h2} />
      <section className="sec">
        <div className="wrap">
          <div className="tabs" style={{ marginBottom: 32 }}>
            {CATS.map((c) => (
              <button key={c} className="tab" aria-pressed={c === cat} onClick={() => { setCat(c); setLb(null); }}>{c}</button>
            ))}
          </div>
          <div className="gal">
            {list.map((it, i) => (
              <button key={it[0]} aria-label={`Open photo: ${it[1]}`} onClick={() => setLb(i)}>
                <img src={IMG[it[0]]} alt={it[1]} loading="lazy" />
                <span className="cap">{it[1]}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
      <div id="lb" className={g ? "open" : ""} role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={(e) => { if (e.target === e.currentTarget) setLb(null); }}>
        {g && (
          <>
            <button className="x" aria-label="Close" onClick={() => setLb(null)}><Icon name="x" /></button>
            <button className="nb prev" aria-label="Previous photo" onClick={() => step(-1)}><Icon name="left" /></button>
            <figure>
              <img src={IMG[g[0]]} alt={g[1]} />
              <figcaption>{(lb as number) + 1} of {n} &middot; {g[1]}</figcaption>
            </figure>
            <button className="nb next" aria-label="Next photo" onClick={() => step(1)}><Icon name="right" /></button>
          </>
        )}
      </div>
    </>
  );
};

export default Gallery;
