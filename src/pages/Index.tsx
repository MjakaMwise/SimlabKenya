import { Link } from "react-router-dom";
import { Icon } from "@/site/Icon";
import { Go, Cta, SectionHead, Reveal } from "@/site/ui";
import { HexHero } from "@/site/HexHero";
import { WhoWeAre } from "@/site/WhoWeAre";
import { IMG } from "@/site/data";

const STATS = [["500+", "Students Trained"], ["20+", "Partner Schools"], ["100+", "Innovation Projects"], ["5+", "Years Excellence"]];
const TRY: [string, string, string, string, string, string][] = [
  ["flask", "#5dade2", "Why does lemon juice clean a kettle?", "Acids and bases explain cleaning, cooking, digestion and the sea. Slide the pH and watch the indicator change.", "/bench#ph", "Run the pH flask"],
  ["atom", "#13a8c4", "How small is a nanoparticle?", "Zoom from a student down to a water molecule, ten times at a time, and see where our plant-made silver sits.", "/bench#scale", "Zoom in"],
  ["waves", "#2f7fd8", "What is CO₂ doing to the Indian Ocean?", "Raise atmospheric carbon dioxide and see seawater chemistry and reef-building respond.", "/bench#ocean", "Acidify the ocean"],
  ["sun", "#f08a24", "Which way should a solar panel face in Mombasa?", "Move the sun across the sky, tilt the panel and compare the day's energy with a flat one.", "/bench#sun", "Aim the panel"],
];
const TILES: [string, string, string, string][] = [
  ["Our Programs", "Explore STEM courses", "/programs", IMG.a1],
  ["Gallery", "See our activities", "/gallery", IMG.a2],
  ["Contact Us", "Get in touch", "/contact", IMG.h2],
];

const Index = () => (
  <>
    <section className="hero">
      <div className="bgimg"><img src={IMG.k} alt="A student demonstrating an experiment at a SIM-Lab workshop" /></div>
      <div className="hexbg" />
      <div className="glow" />
      <i className="orb o1" /><i className="orb o2" /><i className="orb o3" />
      <div className="wrap one">
        <div>
          <div className="eyebrow">Science in Motion</div>
          <h1>SIM-Lab <em>Kenya</em></h1>
          <p className="sub">Empowering a new generation of science-minded individuals driving innovation and sustainable development in Kenya and beyond</p>
          <div className="row">
            <Go to="/programs" cls="lt xl">Explore Programs</Go>
          </div>
          <div className="stats">
            {STATS.map(([v, l]) => <div key={l}><b>{v}</b><span>{l}</span></div>)}
          </div>
          <Reveal className="hero-os">
            <img src={IMG.ostl} alt="Ocean Shujaa" width={704} height={477} />
            <Go to="/oceanshujaa" cls="go xl">Register Now</Go>
          </Reveal>
        </div>
      </div>
    </section>

    <WhoWeAre />
    <HexHero />

    <section className="sec">
      <div className="wrap">
        <SectionHead title="Science You Can Try" lede="Four questions our students work on, each with a hands-on experiment you can run right here." />
        <div className="g g4">
          {TRY.map(([ic, c, t, d, to, l]) => (
            <div key={t}>
              <div className="ico" style={{ "--c": c } as React.CSSProperties}><Icon name={ic} /></div>
              <h3>{t}</h3>
              <p>{d}</p>
              <p style={{ marginTop: 12 }}><Link to={to}><mark>{l}</mark></Link></p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <Cta
      pill="NEW HOLIDAY PROGRAM"
      title="Ocean Shujaa: From the Ocean to the Laboratory"
      text="Five days of real ocean science. Sample the sea and the mangroves, analyse your samples in professional labs in Mombasa, then present your findings. For primary school to college students."
    >
      <Go to="/oceanshujaa" cls="go xl">Explore Ocean Shujaa</Go>
    </Cta>

    <section className="sec">
      <div className="wrap">
        <div className="tiles">
          {TILES.map(([t, d, to, im]) => (
            <Link key={t} className="tile" to={to}>
              <img src={im} alt="" loading="lazy" />
              <span><b>{t}</b><small>{d}</small></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  </>
);

export default Index;
