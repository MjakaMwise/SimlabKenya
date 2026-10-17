import { useMemo } from "react";
import { Icon } from "@/site/Icon";
import { SectionHead, IconCards, CheckList, RegisterBtn } from "@/site/ui";
import { Timeline, TLItem } from "@/site/Timeline";
import { objHtmlC } from "@/site/sci";
import { IMG, EMAIL, OS_DAYS } from "@/site/data";

const LABS: [string, string, string][] = [
  ["waves", "Environmental", "#2f7fd8"], ["bacteria", "Microbiology", "#d9568f"], ["fish", "Fisheries & marine biology", "#13a8c4"],
  ["flask", "Chemistry", "#8a63d2"], ["leaf", "Soil", "#2fa66a"], ["tag", "Food analysis", "#f08a24"], ["atom", "Advanced instrumental", "#5dade2"],
];

const OceanShujaa = () => {
  const days: TLItem[] = useMemo(
    () =>
      OS_DAYS.map((D, i) => ({
        id: `day${i}`,
        color: D.c,
        objHtml: objHtmlC(D.c, D.f, D.icons, "Day " + (i + 1)),
        box: (
          <>
            <div className="mono">Day {i + 1} &middot; {D.where}</div>
            <h3>{D.t}</h3>
            <p className="d">{D.d}</p>
          </>
        ),
      })),
    []
  );
  return (
    <>
      <section className="os-hero">
        <div className="bgimg"><img src={IMG.a3} alt="" /></div>
        <div className="hexbg" />
        <div className="os-waves" aria-hidden="true">
          <svg viewBox="0 0 2880 160" preserveAspectRatio="none">
            <path className="wv wv1" d="M0 80C240 30 480 30 720 80S1200 130 1440 80 1920 30 2160 80 2640 130 2880 80V160H0Z" />
            <path className="wv wv2" d="M0 100C240 60 480 60 720 100S1200 140 1440 100 1920 60 2160 100 2640 140 2880 100V160H0Z" />
            <path className="wv wv3" d="M0 120C240 95 480 95 720 120S1200 145 1440 120 1920 95 2160 120 2640 145 2880 120V160H0Z" />
          </svg>
        </div>
        <div className="wrap">
          <div>
            <span className="pill">NEW HOLIDAY PROGRAM</span>
            <h1 className="os-title"><img src={IMG.ostl} alt="Ocean Shujaa" width={704} height={477} /></h1>
            <div className="os-sub">From the Ocean to the Laboratory</div>
            <p className="lead2">Explore the wonders of our blue planet. Discover marine life, investigate ocean waters, explore mangrove forests, and uncover how science can protect our oceans and climate.</p>
            <div className="row">
              <RegisterBtn label="Register Now" />
              <a className="btn lt" href="tel:+254702129911"><Icon name="phone" />0702 129 911</a>
            </div>
            <div className="os-facts"><span>5 days</span><span>Primary to college</span><span>IOME001 Innovation Hub, Mombasa</span><span>Field + partner laboratories</span></div>
          </div>
          <figure className="os-poster">
            <img src={IMG.os} alt="Ocean Shujaa holiday program poster: Dive into discovery. Explore the wonders of our blue planet, discover marine life, investigate ocean waters, explore mangrove forests and uncover how science can protect our oceans and climate. simlabkenya.co.ke/oceanshujaa" />
          </figure>
        </div>
      </section>

      <section className="sec">
        <div className="wrap cols">
          <div>
            <div className="mono">Background</div>
            <h2 className="h2" style={{ marginTop: 8 }}>Real Ocean Science, Not Just Theory</h2>
            <p className="lede" style={{ marginBottom: 16 }}>Ocean Shujaa is a five-day practical science and environmental education program that exposes students to the science of the ocean, marine life, fisheries, mangroves, environmental pollution and climate change.</p>
            <p style={{ color: "var(--dim)", marginBottom: 16 }}>Students move beyond the classroom: they observe, sample, analyse, interpret and report real environmental data. The program uses SIM-Lab's access to analytical and scientific laboratories in Mombasa, so students see how professional scientists investigate environmental and biological systems.</p>
            <p className="note">Hosted at IOME001 Innovation Hub. Activities are customised to each group's age and learning level.</p>
          </div>
          <div>
            <div className="mono">Who it is for</div>
            <div className="os-who">
              {["Primary schools", "Junior secondary", "Senior secondary", "Colleges", "Science clubs", "Other educational groups"].map((x) => <span key={x}>{x}</span>)}
            </div>
            <div className="os-tag"><b>Learn the Ocean.</b><b>Analyse the Ocean.</b><b>Protect the Ocean.</b></div>
          </div>
        </div>
      </section>

      <section className="sec alt">
        <div className="wrap">
          <SectionHead title="What Ocean Shujaa Sets Out to Do" lede="Ten objectives, from ocean chemistry to careers in science." />
          <IconCards cls="g5" items={[
            ["waves", "Why oceans matter", "Introduce students to the importance of oceans and marine ecosystems.", "#2f7fd8"],
            ["globe", "Ocean chemistry and climate", "Show how pH, alkalinity and CO₂ absorption help the ocean regulate climate.", "#13a8c4"],
            ["flask", "Sampling in the field", "Expose students to practical environmental sampling and in-situ analysis.", "#22a06b"],
            ["target", "Laboratory techniques", "Water, microbiological, fisheries, soil and plant analysis methods.", "#8a63d2"],
            ["users", "Fish anatomy and health", "Explore fish anatomy, fish health and parasites.", "#d9568f"],
            ["leaf", "Mangrove ecosystems", "Mangrove soils and their role in storing carbon.", "#2fa66a"],
            ["atom", "Mangrove phytochemistry", "Phytochemical analysis of mangrove plants and selected traits of mangrove honey.", "#f08a24"],
            ["bulb", "Pollution and climate", "How ocean pollution relates to climate change.", "#5dade2"],
            ["pen", "Scientific skills", "Observation, analysis, reporting and presentation.", "#0d5672"],
            ["award", "STEM careers", "Inspire students to pursue STEM and environmental research.", "#f2a71b"],
          ]} />
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <SectionHead title="Five Days, From the Ocean to the Laboratory" lede="Scroll to follow the week, from the classroom to the field, into the lab and out to your own conclusions." />
          <Timeline items={days} />
        </div>
      </section>

      <section className="cta">
        <div className="hexbg" />
        <div className="wrap">
          <span className="pill">MULTI-LABORATORY APPROACH</span>
          <h2>One Question, Many Laboratories</h2>
          <p>Different analyses happen at specialised laboratories in Mombasa, depending on the equipment and expertise each needs. Students see how modern research brings different experts and techniques together to answer one scientific question.</p>
          <div className="labs">
            {LABS.map(([i, n, c]) => (
              <div className="lab" key={n} style={{ "--c": c } as React.CSSProperties}><Icon name={i} /><span>{n}</span></div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap cols">
          <div>
            <div className="mono">Expected outcomes</div>
            <h2 className="h2" style={{ marginTop: 8 }}>What Students Leave With</h2>
            <p className="lede">By the end of the week, students should have gained:</p>
          </div>
          <div>
            <CheckList items={[
              "Practical laboratory and field experience",
              "A basic understanding of environmental sampling and analysis",
              "Experience interpreting scientific results",
              "Better scientific communication and reporting skills",
              "Greater awareness of ocean conservation and climate change",
              "Exposure to professional laboratories and scientists",
              "More interest in STEM education and careers",
              "A chance to develop their own projects on climate change, ocean pollution, marine ecosystems, fisheries or mangrove conservation",
              "A real environmental challenge to investigate scientifically, with practical solutions to protect the marine environment",
              "A chance to present their projects to scientists, educators and other stakeholders for feedback",
            ]} />
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="hexbg" />
        <div className="wrap">
          <span className="pill">JOIN OCEAN SHUJAA</span>
          <h2>Learn the Ocean. Analyse the Ocean. Protect the Ocean.</h2>
          <div className="os-flow">
            {["Classroom", "Field", "Laboratory", "Conclusions"].map((x, k) => (
              <span key={x} style={{ display: "contents" }}><span>{x}</span>{k < 3 && <i aria-hidden="true">&rarr;</i>}</span>
            ))}
          </div>
          <p>Students finish with presentations, reflection and an Ocean Shujaa certificate.</p>
          <div className="row">
            <RegisterBtn label="Register Now" />
            <a className="btn call" href="tel:+254702129911"><Icon name="phone" />Call 0702 129 911</a>
            <a className="btn lt" href={`mailto:${EMAIL}?subject=Ocean%20Shujaa%20Registration`}><Icon name="mail" />Email</a>
          </div>
          <p style={{ margin: "22px auto 0", fontSize: ".95rem" }}>
            {EMAIL} &middot; 0702 129 911 &middot;{" "}
            <a href="https://simlabkenya.co.ke/oceanshujaa" target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)" }}>simlabkenya.co.ke/oceanshujaa</a>
          </p>
        </div>
      </section>
    </>
  );
};

export default OceanShujaa;
