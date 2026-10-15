import { PageHead, SectionHead, IconCards, Cta, Go, Photo } from "@/site/ui";
import { IMG } from "@/site/data";

const About = () => (
  <>
    <PageHead title="About SIM-Lab Kenya" sub="Science in Motion: Transforming Education Through Innovation" img={IMG.a1} />
    <section className="sec">
      <div className="wrap cols">
        <div>
          <h2 className="h2">Who We Are</h2>
          <p className="lede" style={{ marginBottom: 16 }}>
            SIM-Lab (Science in Motion Laboratory) is a science-based innovation lab dedicated to bridging the gap between classroom learning and real-world application. Incubated under IOME001 Innovation Hub in Mombasa, we offer broad, multidisciplinary exposure across different fields, fusing academic knowledge with practical, community-centered solutions.
          </p>
          <p style={{ color: "var(--dim)" }}>
            We empower individuals, schools, and organizations by making science and technology relatable to everyday life challenges, encouraging students to think critically and innovatively. Our mission is to transform classroom concepts into practical skills, driving creativity, innovation, and sustainable development within communities.
          </p>
        </div>
        <Photo k="a2" alt="A SIM-Lab presentation on microplastics" />
      </div>
    </section>
    <section className="sec alt">
      <div className="wrap">
        <SectionHead title="How We Teach" />
        <IconCards cls="g4" items={[
          ["flask", "Hands-On Learning", "Practical experiments that bring science to life", "#5dade2"],
          ["bulb", "Innovation Focus", "Developing creative solutions to real-world problems", "#f08a24"],
          ["users", "Community Driven", "Connecting science to everyday life challenges", "#22a06b"],
          ["target", "SDG 4 Aligned", "Contributing to inclusive, equitable, quality education for all", "#8a63d2"],
        ]} />
      </div>
    </section>
    <section className="cta">
      <div className="hexbg" />
      <div className="wrap">
        <span className="pill">OUR VISION</span>
        <p className="quote">&ldquo;To inspire and empower a new generation of science-minded individuals who will drive innovation, research, and sustainable development in Kenya and beyond.&rdquo;</p>
      </div>
    </section>
    <section className="sec">
      <div className="wrap cols">
        <div>
          <h2 className="h2">A Coast That Works as a Classroom</h2>
          <p className="lede">The Indian Ocean, a fringing coral reef, mangrove forests and sun near the equator are all within a short trip. Climate, ocean health, clean energy and traditional medicine are not abstract topics here. They are the neighbourhood.</p>
        </div>
        <div className="fact">
          <div><b>4&deg;S</b><span>Latitude of Mombasa. The sun passes close to overhead for much of the year.</span></div>
          <div><b>pH 8.1</b><span>Typical surface seawater today, down from about 8.2 before industry.</span></div>
          <div><b>SDG 4</b><span>Quality education for all, the goal our work is aligned to.</span></div>
        </div>
      </div>
    </section>
    <section className="sec alt">
      <div className="wrap">
        <SectionHead title="Why Choose SIM-Lab?" />
        <IconCards items={[
          ["flask", "Practical Training", "Hands-on, practical training sessions that go beyond theory", "#5dade2"],
          ["users", "Community-Centered", "Community-centered approach with real-life applications", "#22a06b"],
          ["bulb", "Innovation Support", "Support for innovation, creativity, and entrepreneurship", "#f08a24"],
          ["hand", "Strong Partnerships", "Strong partnerships with schools, researchers, and organizations", "#2f7fd8"],
          ["cap", "Collaborative Projects", "Collaborative research projects and STEM outreach programs", "#8a63d2"],
          ["award", "Continuous Mentorship", "Ongoing mentorship and support beyond program completion", "#d9568f"],
        ]} />
      </div>
    </section>
    <Cta pill="PARTNER" title="Proud Partner of IOME001 Innovation Hub" text="Ready to start your innovation journey? Talk to the team.">
      <Go to="/ocean-shujaa" cls="go xl">Join Ocean Shujaa</Go>
      <Go to="/contact" cls="lt xl">Contact Us</Go>
    </Cta>
  </>
);

export default About;
