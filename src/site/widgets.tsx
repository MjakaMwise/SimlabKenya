/* The four interactive experiments on The Bench. Each is a simplified model. */
import { useState } from "react";

/* ---------- A. pH flask ---------- */
const PHST: [number, number[]][] = [[0,[215,38,61]],[2,[225,48,48]],[3,[242,107,33]],[4,[246,162,30]],[5,[242,212,31]],[6,[168,207,58]],[7,[63,174,73]],[8,[31,162,154]],[9,[43,120,194]],[10,[61,79,179]],[12,[106,63,160]],[14,[110,50,150]]];
function phColor(v: number) {
  let a = PHST[0], b = PHST[PHST.length - 1];
  for (let i = 0; i < PHST.length - 1; i++) {
    if (v >= PHST[i][0] && v <= PHST[i + 1][0]) { a = PHST[i]; b = PHST[i + 1]; break; }
  }
  const t = (v - a[0]) / ((b[0] - a[0]) || 1);
  return `rgb(${[0, 1, 2].map((k) => Math.round(a[1][k] + (b[1][k] - a[1][k]) * t)).join(",")})`;
}
const PHGRAD = "linear-gradient(90deg," + PHST.map((s) => `rgb(${s[1].join(",")}) ${((s[0] / 14) * 100).toFixed(1)}%`).join(",") + ")";
const SUBS: [string, number, string][] = [['Stomach acid',1.5,'Strong enough to dissolve some metals. The stomach lining renews itself to survive it.'],['Lemon juice',2,'Citric acid. This is why it cleans limescale off a kettle.'],['Vinegar',2.9,'Acetic acid, about 5% in the bottle. A cheap descaler and food preservative.'],['Tomato',4.5,'Mildly acidic, which is why tomato sauce can taste sharp in aluminium pans.'],['Black coffee',5,'Roasting makes acids that give coffee its bright, sour edge.'],['Pure water',7,'Neutral. Hydrogen and hydroxide ions are equal at 1 in 10 million each.'],['Seawater',8.1,'The Indian Ocean off Mombasa sits near here. A fall of just 0.1 means about 26% more hydrogen ions. Try the ocean experiment.'],['Baking soda',8.3,'Sodium bicarbonate. Mildly basic, it neutralises acid and makes cakes rise.'],['Hand soap',9.5,'Basic. The high pH helps break down grease.'],['Ammonia',11.5,'Strongly basic household cleaner. Never mix it with bleach.'],['Bleach',12.5,'Very basic and a strong oxidiser. Handled by adults only.']];
const sup = (n: number) => String(n).replace(/-/g, "−").replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[d]);

export function PhWidget() {
  const [v, setV] = useState(7);
  const c = phColor(v);
  const e = -v;
  const hText = Math.pow(10, e % 1 === 0 ? 0 : e - Math.floor(e)).toFixed(1).replace(".0", "") + " × 10" + sup(Math.floor(e)) + " mol/L";
  let best = -1, bd = 0.35;
  SUBS.forEach((s, i) => { const d = Math.abs(s[1] - v); if (d < bd) { bd = d; best = i; } });
  const say = best >= 0 ? SUBS[best][2] : v < 7
    ? "Each step down the scale is ten times more hydrogen ions. Slide to a sample or pick one below."
    : "Each step up the scale is ten times fewer hydrogen ions. Slide to a sample or pick one below.";
  return (
    <div className="scr">
      <div className="bar"><span>Universal indicator</span><span>Experiment A</span></div>
      <div className="bd">
        <div className="split2">
          <svg className="flask" viewBox="0 0 200 240" aria-hidden="true">
            <defs><clipPath id="sl-fc"><path d="M82 24H118V94L172 196Q182 214 162 214H38Q18 214 28 196L82 94Z" /></clipPath></defs>
            <g clipPath="url(#sl-fc)">
              <rect x="0" y="148" width="200" height="100" fill={c} />
              <g className="wave"><path d="M-30 140q13-9 26 0t26 0 26 0 26 0 26 0 26 0 26 0 26 0 26 0V160H-30z" fill={c} /></g>
              <g fill="#fff" opacity=".7">
                <circle className="bub" cx="70" cy="200" r="4" />
                <circle className="bub" cx="104" cy="204" r="3" style={{ animationDelay: "-1s" }} />
                <circle className="bub" cx="130" cy="198" r="5" style={{ animationDelay: "-2s" }} />
              </g>
            </g>
            <path d="M82 24H118V94L172 196Q182 214 162 214H38Q18 214 28 196L82 94Z" fill="none" stroke="#e8f2f7" strokeWidth="3" strokeLinejoin="round" />
            <path d="M74 24H126" stroke="#e8f2f7" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <div>
            <div className="ro"><span>{v.toFixed(1)}</span><small>pH</small></div>
            <dl className="kv">
              <dt>[H<sup>+</sup>]</dt><dd>{hText}</dd>
              <dt>reads as</dt><dd>{v < 6.5 ? "acidic" : v > 7.5 ? "basic" : "near neutral"}</dd>
              <dt>sample</dt><dd>{best >= 0 ? `${SUBS[best][0]} (${SUBS[best][1]})` : "between samples"}</dd>
            </dl>
          </div>
        </div>
        <input type="range" min={0} max={14} step={0.1} value={v} onChange={(ev) => setV(+ev.target.value)} aria-label="pH value" style={{ "--trk": PHGRAD } as React.CSSProperties} />
        <div className="axis"><span>0 acid</span><span>7</span><span>14 base</span></div>
        <p className="say">{say}</p>
        <div className="chips">
          {SUBS.map((s, i) => (
            <button key={s[0]} className="chip" aria-pressed={i === best} onClick={() => setV(s[1])}>{s[0]}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- B. Powers of ten ---------- */
const SCALE: [number, string, string][] = [[1.5,'A student, 1.5 m','Where we start. Everything else on this scale fits inside a classroom.'],[3e-3,'An ant, 3 mm','Small enough to ignore, big enough to see its legs.'],[7e-5,'Width of a human hair, 70 µm','The thinnest thing most people can see unaided.'],[7e-6,'A red blood cell, 7 µm','Needs a school microscope.'],[2e-6,'A bacterium (E. coli), 2 µm','Some cause disease, many help digestion.'],[1e-7,'A virus, about 100 nm','Too small for light microscopes to resolve in detail.'],[2e-8,'A green-synthesised silver nanoparticle, about 20 nm','Made in a flask from silver nitrate and a plant extract. This is the scale of the Nanotechnology program.'],[2e-9,'DNA double helix, 2 nm wide','Your instructions for building you.'],[3e-10,'A water molecule, 0.3 nm','Three atoms. We have reached the end of this scale.']];
const HAIR = 7e-5;
const fmt = (m: number) => {
  const u: [number, string][] = [[1,"m"],[1e-2,"cm"],[1e-3,"mm"],[1e-6,"µm"],[1e-9,"nm"],[1e-12,"pm"]];
  let k = u[0];
  for (const x of u) { if (m >= x[0] * 0.99) { k = x; break; } k = x; }
  const v = m / k[0];
  return (v >= 10 ? v.toFixed(0) : v.toFixed(1)).replace(/\.0$/, "") + " " + k[1];
};
const POS = [[50,52],[28,34],[72,36],[34,68],[68,66],[50,30],[22,58],[78,56],[50,74]];

export function ScaleWidget() {
  const [z, setZ] = useState(0);
  const pivot = Math.pow(10, -z / 10), fov = pivot * 6;
  let best = 0, bd = 1e9;
  SCALE.forEach((s, i) => { const d = Math.abs(Math.log10(s[0]) - Math.log10(pivot)); if (d < bd) { bd = d; best = i; } });
  const s = SCALE[best];
  const extra = s[0] < HAIR ? ` That is about ${Math.round(HAIR / s[0]).toLocaleString("en")} times thinner than a hair.` : "";
  return (
    <div className="scr">
      <div className="bar"><span>Powers of ten</span><span>Experiment B</span></div>
      <div className="bd">
        <div className="field">
          {SCALE.map((it, i) => {
            const f = it[0] / fov, p = POS[i % POS.length];
            return (
              <div key={i} className="o" style={{ opacity: f > 0.012 && f < 0.9 ? 1 : 0, width: `${f * 100}%`, height: "auto", aspectRatio: "1", minWidth: "4px", left: `${p[0]}%`, top: `${p[1]}%` }}>
                <i style={{ display: f > 0.05 ? "block" : "none", top: f > 0.15 ? "50%" : "100%", translate: f > 0.15 ? "-50% -50%" : "-50% 4px" }}>
                  {it[1].split(",")[0].replace(/^A (green-synthesised )?/, "").replace(/^An? /, "")}
                </i>
              </div>
            );
          })}
          <div className="fov"><u></u><span>field of view {fmt(fov)}</span></div>
        </div>
        <input type="range" min={0} max={100} step={0.5} value={z} onChange={(ev) => setZ(+ev.target.value)} aria-label="Zoom level" style={{ "--trk": "linear-gradient(90deg,#2b78c2,#5dade2,#fcb415)" } as React.CSSProperties} />
        <div className="axis"><span>1 m</span><span>1 mm</span><span>1 &micro;m</span><span>1 nm</span></div>
        <div className="ro" style={{ marginTop: 12, fontSize: "clamp(1.3rem,3vw,1.8rem)" }}><span>{s[1]}</span></div>
        <p className="say">{s[2] + extra}</p>
      </div>
    </div>
  );
}

/* ---------- C. CO2 and the sea ---------- */
const phOf = (p: number) => 8.2 - 0.65 * Math.log10(p / 280);
const OC_X = [60, 110, 160, 215, 265, 320, 365], OC_H = [70, 95, 60, 100, 75, 90, 55];

export function OceanWidget() {
  const [p, setP] = useState(420);
  const ph = phOf(p), idx = Math.max(0, Math.min(1, (ph - 7.85) / (8.2 - 7.85)));
  const hPct = Math.round((Math.pow(10, 8.2 - ph) - 1) * 100);
  const k = 0.45 + 0.55 * idx;
  const say = p <= 300 ? "Before industry, seawater near the surface was about pH 8.2."
    : p <= 440 ? "Today the ocean has absorbed a large share of the CO₂ we emit. Its pH has fallen by about 0.1, which is roughly 30% more hydrogen ions. Fewer carbonate ions are left for corals, oysters and sea urchins to build with."
    : p <= 620 ? "At double the pre-industrial CO₂, reef builders would spend more energy growing the same skeleton, and some shells would start to thin."
    : "In this scenario, shells and coral skeletons build slowly and can dissolve. Reefs and the fisheries that depend on them would be at serious risk.";
  const chips: [string, number][] = [["Pre-industrial", 280], ["Today", 420], ["Doubled", 560], ["High-emission 2100", 900]];
  return (
    <div className="scr">
      <div className="bar"><span>Seawater chemistry</span><span>Experiment C</span></div>
      <div className="bd">
        <svg viewBox="0 0 400 190" style={{ width: "100%", height: "auto", display: "block", border: "1px solid var(--scr-line)" }} aria-hidden="true">
          <defs><linearGradient id="sl-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2f86b8" /><stop offset="1" stopColor="#06303f" /></linearGradient></defs>
          <rect width="400" height="190" fill="url(#sl-sea)" />
          <path d="M0 160q40-14 80 0t80 0 80 0 80 0 80 0V190H0z" fill="#0b2a36" />
          <g stroke="#fcb415" strokeLinecap="round" fill="none">
            {OC_X.map((x, i) => {
              const hh = OC_H[i] * k;
              return <path key={i} d={`M${x} 168 V${168 - hh} M${x} ${168 - hh * 0.55} l${i % 2 ? -14 : 14} -${hh * 0.28}`} strokeWidth={3 + idx * 7} />;
            })}
          </g>
          <g fill="#06303f">
            {OC_X.map((x, i) => {
              const n = Math.round((1 - idx) * 5);
              return Array.from({ length: n }, (_, j) => (
                <circle key={`${i}-${j}`} cx={x + (j % 2 ? -2 : 2)} cy={168 - OC_H[i] * k * (0.2 + 0.16 * j)} r="1.6" />
              ));
            })}
          </g>
        </svg>
        <div className="ro" style={{ marginTop: 14 }}><span>{ph.toFixed(2)}</span><small>surface seawater pH</small></div>
        <input type="range" min={280} max={900} step={1} value={p} onChange={(ev) => setP(+ev.target.value)} aria-label="Atmospheric carbon dioxide in parts per million" style={{ "--trk": "linear-gradient(90deg,#2b78c2,#fcb415,#d7263d)" } as React.CSSProperties} />
        <div className="axis"><span>280 ppm (c.1750)</span><span>420 now</span><span>900 ppm</span></div>
        <dl className="kv">
          <dt>CO<sub>2</sub></dt><dd>{p} ppm</dd>
          <dt>[H<sup>+</sup>]</dt><dd>+{hPct}% vs c.1750</dd>
          <dt>shell building</dt><dd>illustrative index {Math.round(idx * 100)} / 100</dd>
        </dl>
        <p className="say">{say}</p>
        <div className="chips">
          {chips.map(([l, v]) => <button key={l} className="chip" aria-pressed={v === p} onClick={() => setP(v)}>{l}</button>)}
        </div>
      </div>
    </div>
  );
}

/* ---------- D. Solar panel at 4 degrees S ---------- */
const beam = (t: number) => { const a = (t - 12) * 15 * Math.PI / 180, el = Math.PI / 2 - Math.abs(a); if (el <= 0) return 0; const am = 1 / Math.sin(el); return 1.353 * Math.pow(0.7, Math.pow(am, 0.678)); };
const outp = (t: number, tilt: number) => { const a = (t - 12) * 15 * Math.PI / 180, th = tilt * Math.PI / 180; return Math.max(0, beam(t) * Math.cos(a - th)); };
const daily = (tilt: number) => { let s = 0; for (let t = 6; t < 18; t += 0.05) s += outp(t, tilt) * 0.05; return s; };
const gX = (h: number) => 30 + (h - 6) / 12 * 360, gY = (v: number) => 110 - v / 1.1 * 100;
const curve = (tl: number) => { let d = ""; for (let h = 6; h <= 18.001; h += 0.25) d += (d ? "L" : "M") + gX(h).toFixed(1) + " " + gY(outp(h, tl)).toFixed(1); return d; };
const FLAT = curve(0);

export function SunWidget() {
  const [h, setH] = useState(9);
  const [tl, setTl] = useState(0);
  const a = (h - 12) * 15 * Math.PI / 180, cx = 120, cy = 130, R = 100;
  const sx = cx + R * Math.sin(a), sy = cy - R * Math.cos(a);
  const out = outp(h, tl), dt = daily(tl), d0 = daily(0), diff = (dt / d0 - 1) * 100;
  const say = tl === 0
    ? "Flat is the reference (dashed line). Near the equator the sun crosses almost overhead, so a flat panel faces it for most of the day."
    : `Tilting ${Math.abs(tl)}° ${tl < 0 ? "east" : "west"} moves the peak toward the ${tl < 0 ? "morning" : "afternoon"} but changes the day total by ${diff.toFixed(1)}% against flat. Model: direct beam, clear sky, equinox, simplified.`;
  return (
    <div className="scr">
      <div className="bar"><span>Solar panel, 4&deg; S</span><span>Experiment D</span></div>
      <div className="bd">
        <div className="split2 split-sun">
          <svg viewBox="0 0 240 150" style={{ width: "100%", height: "auto" }} aria-hidden="true">
            <path d="M20 130A100 100 0 0 1 220 130" fill="none" stroke="#1f4a5e" strokeDasharray="3 5" />
            <line x1="10" y1="130" x2="230" y2="130" stroke="#5a8499" />
            <text x="12" y="146" fill="#8fb2c3" fontSize="9" fontFamily="monospace">EAST</text>
            <text x="198" y="146" fill="#8fb2c3" fontSize="9" fontFamily="monospace">WEST</text>
            <g transform={`translate(${cx} ${cy - 6}) rotate(${tl})`}><rect x="-38" y="-4" width="76" height="8" fill="#5dade2" stroke="#e8f2f7" /></g>
            <line x1={sx} y1={sy} x2={cx} y2={cy - 6} stroke="#fcb415" strokeWidth="2" />
            <circle cx={sx} cy={sy} r="11" fill="#fcb415" />
          </svg>
          <div>
            <div className="ro"><span>{out.toFixed(2)}</span><small>kW per m&sup2;</small></div>
            <dl className="kv">
              <dt>time</dt><dd>{String(Math.floor(h)).padStart(2, "0") + ":" + String(Math.round((h % 1) * 60)).padStart(2, "0")}</dd>
              <dt>sun height</dt><dd>{Math.max(0, 90 - Math.abs(h - 12) * 15).toFixed(0)}°</dd>
              <dt>day total</dt><dd>{dt.toFixed(2)} kWh/m²</dd>
            </dl>
          </div>
        </div>
        <label style={{ color: "var(--scr-dim)", marginTop: 14 }} htmlFor="sl-sti">Time of day</label>
        <input type="range" id="sl-sti" min={6} max={18} step={0.25} value={h} onChange={(ev) => setH(+ev.target.value)} style={{ "--trk": "linear-gradient(90deg,#1f4a5e,#fcb415 50%,#1f4a5e)" } as React.CSSProperties} />
        <div className="axis"><span>06:00</span><span>12:00</span><span>18:00</span></div>
        <label style={{ color: "var(--scr-dim)", marginTop: 6 }} htmlFor="sl-stl">Panel tilt (east &minus; / west +)</label>
        <input type="range" id="sl-stl" min={-45} max={45} step={1} value={tl} onChange={(ev) => setTl(+ev.target.value)} style={{ "--trk": "linear-gradient(90deg,#2b78c2,#1f4a5e 50%,#2b78c2)" } as React.CSSProperties} />
        <div className="axis"><span>45&deg; east</span><span>flat</span><span>45&deg; west</span></div>
        <svg viewBox="0 0 400 130" style={{ width: "100%", height: "auto", marginTop: 12, border: "1px solid var(--scr-line)" }} aria-hidden="true">
          <g stroke="#1f4a5e"><line x1="30" y1="10" x2="30" y2="110" /><line x1="30" y1="110" x2="390" y2="110" /></g>
          <g fill="#8fb2c3" fontSize="9" fontFamily="monospace">
            {[6, 9, 12, 15, 18].map((x) => (
              <text key={x} x={gX(x)} y="124" textAnchor={x === 18 ? "end" : x === 6 ? "start" : "middle"}>{String(x).padStart(2, "0")}:00</text>
            ))}
          </g>
          <path d={FLAT} fill="none" stroke="#5a8499" strokeDasharray="4 4" />
          <path d={curve(tl)} fill="none" stroke="#fcb415" strokeWidth="2.5" />
          <circle cx={gX(h)} cy={gY(out)} r="5" fill="#fff" stroke="#fcb415" strokeWidth="2" />
        </svg>
        <p className="say">{say}</p>
      </div>
    </div>
  );
}
