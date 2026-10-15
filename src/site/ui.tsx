/* Small presentational helpers shared by the SIM-Lab site pages. */
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { IMG, wa, TEL, PHONE } from "./data";

export const Go = ({ to, children, cls = "go", arrow }: { to: string; children: ReactNode; cls?: string; arrow?: boolean }) => (
  <Link className={`btn ${cls}`} to={to}>
    {children}
    {arrow && <Icon name="arrow" />}
  </Link>
);

export const WaBtn = ({ text, label = "Chat on WhatsApp" }: { text?: string; label?: string }) => (
  <a className="btn wa" href={wa(text)} target="_blank" rel="noopener noreferrer">
    <Icon name="chat" />
    {label}
  </a>
);

export const CallBtn = ({ label = PHONE }: { label?: string }) => (
  <a className="btn call" href={TEL}>
    <Icon name="phone" />
    {label}
  </a>
);

export const PageHead = ({ title, sub, img }: { title: string; sub: string; img?: string }) => (
  <section className="ph">
    {img && (
      <div className="img">
        <img src={img} alt="" />
      </div>
    )}
    <div className="hexbg" />
    <div className="wrap">
      <h1>{title}</h1>
      <p>{sub}</p>
    </div>
  </section>
);

export const SectionHead = ({ title, lede }: { title: string; lede?: string }) => (
  <div className="sh">
    <h2 className="h2">{title}</h2>
    <div className="dots" aria-hidden="true" />
    {lede && <p className="lede">{lede}</p>}
  </div>
);

export const Cta = ({ pill, title, text, children }: { pill: string; title: string; text?: string; children: ReactNode }) => (
  <section className="cta">
    <div className="hexbg" />
    <div className="wrap">
      <span className="pill">{pill}</span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      <div className="row">{children}</div>
    </div>
  </section>
);

export const IconCards = ({ items, cls = "" }: { items: [string, string, string, string?][]; cls?: string }) => (
  <div className={`g ${cls}`}>
    {items.map(([i, t, d, c]) => (
      <div key={t}>
        <div className="ico" style={c ? ({ "--c": c } as React.CSSProperties) : undefined}>
          <Icon name={i} />
        </div>
        <h3>{t}</h3>
        <p dangerouslySetInnerHTML={{ __html: d }} />
      </div>
    ))}
  </div>
);

export const CheckList = ({ items }: { items: string[] }) => (
  <ul className="chk">
    {items.map((x) => (
      <li key={x}>
        <Icon name="check" />
        <span>{x}</span>
      </li>
    ))}
  </ul>
);

export const Photo = ({ k, alt }: { k: string; alt: string }) => <img className="photo" src={IMG[k]} alt={alt} loading="lazy" />;
