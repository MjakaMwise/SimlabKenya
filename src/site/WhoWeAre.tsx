/* "Who We Are": the logo and copy rise into place as the section scrolls into view. */
import { useEffect, useMemo, useRef } from "react";
import { Go } from "./ui";
import { IMG } from "./data";
import { atomSvg } from "./sci";

export function WhoWeAre() {
  const secRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const atom = useMemo(() => atomSvg(), []);

  useEffect(() => {
    const sec = secRef.current as HTMLElement, logo = logoRef.current as HTMLElement;
    const items = [...sec.querySelectorAll("[data-rv]")] as HTMLElement[];
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const ease=t=>1-Math.pow(1-t,3),cl=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  let tick=false;
  const upd=()=>{tick=false;
    if(reduce){logo.style.transform='';logo.style.opacity='';items.forEach(e=>{e.style.transform='';e.style.opacity=''});return}
    const vh=innerHeight,r=sec.getBoundingClientRect(),b=cl((vh-r.top)/(vh*.8)),e=ease(b),past=cl(-r.top,0,r.height),fade=cl((past-r.height*.5)/(r.height*.5))*.55,grid=logo.offsetParent as HTMLElement,space=sec.offsetHeight-((grid?grid.offsetTop:0)+logo.offsetTop+logo.offsetHeight),maxDy=Math.max(0,space-80),dy=Math.min(maxDy,(1-e)*170+past*.3);
    logo.style.transform=`translate3d(0,${dy.toFixed(1)}px,0) rotate(${((1-e)*-7).toFixed(2)}deg) scale(${(.88+.12*e).toFixed(3)})`;
    logo.style.opacity=(e*(1-fade)).toFixed(3);
    items.forEach((el,i)=>{const l=ease(cl(b*1.35-i*.2));el.style.transform=`translate3d(0,${((1-l)*80+past*.08).toFixed(1)}px,0)`;el.style.opacity=l.toFixed(3)});
  };
  const whoFn=()=>{if(!tick){tick=true;requestAnimationFrame(upd)}};
  window.addEventListener('scroll',whoFn,{passive:true});window.addEventListener('resize',whoFn);upd();
    return () => {
      window.removeEventListener("scroll", whoFn);
      window.removeEventListener("resize", whoFn);
    };
  }, []);

  return (
    <section className="sec alt who" ref={secRef}>
      <div className="wrap who-grid">
        <div className="who-logo" ref={logoRef}>
          <img src={IMG.logo} alt="SIM-Lab Kenya logo: a flask inside a circle above the words SIM-Lab, Science in Motion" />
          <span dangerouslySetInnerHTML={{ __html: atom }} />
        </div>
        <div className="who-t">
          <h2 className="h2" data-rv>Who We Are</h2>
          <p className="lede" data-rv style={{ marginBottom: 22 }}>
            SIM-Lab is a science-based innovation lab bridging the gap between classroom learning and real-world application. Incubated under IOME001 Innovation Hub, we transform classroom concepts into practical skills.
          </p>
          <p className="note" data-rv style={{ marginBottom: 26 }}>
            Mombasa gives students a coral reef, mangroves and strong sun year round within reach. Few places give a shorter line from a textbook to the field.
          </p>
          <div data-rv>
            <Go to="/about" cls="pri" arrow>Learn More</Go>
          </div>
        </div>
      </div>
    </section>
  );
}
