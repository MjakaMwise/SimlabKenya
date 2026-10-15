import { PageHead, Cta, Go } from "@/site/ui";
import { PhWidget, ScaleWidget, OceanWidget, SunWidget } from "@/site/widgets";
import { IMG } from "@/site/data";

const Bench = () => (
  <>
    <PageHead
      title="The Bench"
      sub="Four experiments, run in your browser. Each is a simplified model of real science from our programs. Predict what will happen, then move the slider and check yourself."
      img={IMG.h2}
    />
    <section className="sec" id="w-ph">
      <div className="wrap cols">
        <div>
          <div className="mono">Experiment A &middot; Chemistry</div>
          <h2 className="h2" style={{ marginTop: 8 }}>The pH flask</h2>
          <p className="lede" style={{ marginBottom: 16 }}>Universal indicator mixes several dyes that each change colour at a different pH, so the whole rainbow appears across the scale.</p>
          <p style={{ color: "var(--dim)", marginBottom: 14 }}>pH is a logarithmic scale. A solution at pH 3 has ten times more hydrogen ions than one at pH 4 and a hundred times more than one at pH 5.</p>
          <p className="note">Predict first: is seawater acidic or basic? Tap Seawater and check.</p>
        </div>
        <PhWidget />
      </div>
    </section>
    <section className="sec alt" id="w-scale">
      <div className="wrap cols">
        <div>
          <div className="mono">Experiment B &middot; Nanotechnology</div>
          <h2 className="h2" style={{ marginTop: 8 }}>Powers of ten</h2>
          <p className="lede" style={{ marginBottom: 16 }}>A nanometre is one billionth of a metre. Slide down the scale and the field of view shrinks ten times with every step.</p>
          <p style={{ color: "var(--dim)", marginBottom: 14 }}>Silver nanoparticles made with plant extracts sit near 20 nm. A human hair is around 70,000 nm wide, so thousands of them would fit side by side across it.</p>
          <p className="note">Notice which things disappear first as you zoom. Anything larger than the field of view drops out.</p>
        </div>
        <ScaleWidget />
      </div>
    </section>
    <section className="sec" id="w-ocean">
      <div className="wrap cols">
        <div>
          <div className="mono">Experiment C &middot; Blue economy</div>
          <h2 className="h2" style={{ marginTop: 8 }}>Carbon dioxide and the sea</h2>
          <p className="lede" style={{ marginBottom: 16 }}>The ocean absorbs a large share of the CO&#8322; we release. In water it forms carbonic acid, which lowers pH and removes the carbonate that reef builders need.</p>
          <p style={{ color: "var(--dim)", marginBottom: 14 }}>The model uses a simple fit between atmospheric CO&#8322; and surface pH. It matches the headline numbers (about 0.1 pH lost so far) but real reefs also face heat and pollution.</p>
          <p className="note">The coral index is an illustration of a trend, not a measurement of any reef.</p>
        </div>
        <OceanWidget />
      </div>
    </section>
    <section className="sec alt" id="w-sun">
      <div className="wrap cols">
        <div>
          <div className="mono">Experiment D &middot; Climate and energy</div>
          <h2 className="h2" style={{ marginTop: 8 }}>Aim the panel</h2>
          <p className="lede" style={{ marginBottom: 16 }}>Solar guides written for Europe say tilt your panel toward the equator. On the equator itself the sun passes nearly overhead, so the sums change.</p>
          <p style={{ color: "var(--dim)", marginBottom: 14 }}>The graph shows power from direct sunlight across the day. Compare your tilted panel (solid) with a flat one (dashed) and read the daily energy.</p>
          <p className="note">Try leaning the panel east, then west. What happens to the morning peak and to the day total?</p>
        </div>
        <SunWidget />
      </div>
    </section>
    <Cta pill="DO IT FOR REAL" title="Run these with a mentor in Mombasa" text="In the Ocean Shujaa holiday program, students sample real seawater and mangroves and analyse them in professional labs.">
      <Go to="/ocean-shujaa" cls="go xl">See Ocean Shujaa</Go>
    </Cta>
  </>
);

export default Bench;
