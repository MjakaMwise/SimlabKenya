import { useState } from "react";
import { PageHead, WaBtn, CallBtn } from "@/site/ui";
import { Icon } from "@/site/Icon";
import { IMG, FAQ as FAQS } from "@/site/data";

const FAQ = () => {
  const [openSet, setOpenSet] = useState<Set<string>>(new Set(["0-0"]));
  const toggle = (k: string) =>
    setOpenSet((s) => {
      const nx = new Set(s);
      if (nx.has(k)) nx.delete(k); else nx.add(k);
      return nx;
    });
  return (
    <>
      <PageHead title="Frequently Asked Questions" sub="Answers about registration, payment, programs and partnerships" img={IMG.a1} />
      <section className="sec">
        <div className="wrap">
          {FAQS.map(([t, qs], ci) => (
            <div className="faqcat" key={t}>
              <h2>{t}</h2>
              {qs.map(([q, a], qi) => {
                const k = `${ci}-${qi}`, o = openSet.has(k);
                return (
                  <div className="q" data-open={o} key={q}>
                    <button aria-expanded={o} onClick={() => toggle(k)}>{q}<Icon name="down" /></button>
                    <div className="a">{a}</div>
                  </div>
                );
              })}
            </div>
          ))}
          <div className="faqcat" style={{ textAlign: "center" }}>
            <h2>Still have questions?</h2>
            <div className="row" style={{ justifyContent: "center", marginTop: 14 }}>
              <WaBtn label="Chat on WhatsApp" />
              <CallBtn label="Call Us" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default FAQ;
