import { useMemo } from "react";
import { PageHead, Cta, WaBtn, Go } from "@/site/ui";
import { Icon } from "@/site/Icon";
import { Timeline, TLItem } from "@/site/Timeline";
import { objHtml } from "@/site/sci";
import { useSite } from "@/site/SiteContext";
import { IMG, PROGRAMS, PCOL, GLOSS } from "@/site/data";

const Programs = () => {
  const { openPop } = useSite();
  const items: TLItem[] = useMemo(
    () =>
      PROGRAMS.map((P, i) => ({
        id: `prog${i}`,
        color: PCOL[i],
        objHtml: objHtml(i),
        box: (
          <>
            <div className="mono">{P[0]}</div>
            <h3>{P[1]}</h3>
            <p className="d">{P[2]}</p>
            <div className="row">
              <button className="btn go more" aria-haspopup="dialog" aria-label={`More about ${P[0]}`} onClick={(e) => openPop(i, e.currentTarget, true)}>
                More <Icon name="arrow" />
              </button>
              <WaBtn text={"Hello SIM-Lab, I am interested in the program: " + P[1]} label="WhatsApp" />
            </div>
          </>
        ),
      })),
    [openPop]
  );
  return (
    <>
      <PageHead title="Our Programs" sub="Follow the line: eight hands-on programs, each with the science behind it. Scroll to draw the path." img={IMG.a1} />
      <section className="sec">
        <div className="wrap">
          <Timeline items={items} />
        </div>
      </section>
      <section className="sec alt">
        <div className="wrap cols">
          <div>
            <h2 className="h2">Words You Will Hear in the Lab</h2>
            <p className="lede">Short definitions for parents and students new to the topics.</p>
          </div>
          <dl className="gl">
            {GLOSS.map(([a, b]) => (
              <div key={a}><dt>{a}</dt><dd>{b}</dd></div>
            ))}
          </dl>
        </div>
      </section>
      <Cta pill="FLEXIBLE OPTIONS" title="At Our Hub or at Your School" text="Programs run as one-off workshops or ongoing sessions, in Mombasa or at partner schools.">
        <WaBtn label="WhatsApp Us" />
        <Go to="/contact" cls="lt">Contact Form</Go>
      </Cta>
    </>
  );
};

export default Programs;
