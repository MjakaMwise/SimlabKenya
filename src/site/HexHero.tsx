/* eslint-disable @typescript-eslint/no-explicit-any */
/* "Eight Ways Into Science": a honeycomb of program hexagons surrounded by animated
   science line-art that reacts to the pointer. Geometry is measured from the DOM, so the
   field is built imperatively into a ref'd container; React owns the section and copy. */
import { useEffect, useRef } from "react";
import { Go } from "./ui";
import { iconSvg } from "./Icon";
import { PROGRAMS, PCOL, PICO } from "./data";
import { sciSvg, SCI } from "./sci";
import { useSite } from "./SiteContext";

const ic = iconSvg;

export function HexHero() {
  const secRef = useRef<HTMLElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const { openPop } = useSite();

  useEffect(() => {
    const sec = secRef.current as HTMLElement, field = fieldRef.current as any;
    let hexStop: (() => void) | null = null;
    let alive = true;
  const build=()=>{
    const S=Math.sqrt(3),W=sec.clientWidth,sr=sec.getBoundingClientRect(),cr=sec.querySelector('[data-clear]').getBoundingClientRect(),m=24;
    const Lc=cr.left-sr.left-m,Rc=cr.right-sr.left+m;
    const R=W>=1400?66:W>=1100?60:W>=900?54:W>=600?46:38;
    const SR=S*R,cH=cr.height,N=Math.max(3,Math.ceil((cH+2*(SR*2.05+40)-36)/SR));
    sec.style.setProperty('--padv',((SR*N+36-cH)/2).toFixed(1)+'px');
    const H=sec.clientHeight,Rd=R-3,cells=[],step=1.5*R,nc=Math.ceil(W/step/2)+2;
    for(let c=-nc;c<=nc;c++){const cx=W/2+c*step;if(cx<-R||cx>W+R)continue;const odd=((c%2)+2)%2===1,far=cx+R<Lc||cx-R>Rc;
      for(let r=0;r<=N;r++){const cy=SR*(.5+r)+18+(odd?SR/2:0);if(cy+SR/2>H-17)break;
        const top=cy<=SR+20,bot=H-cy<=SR+20;if(!(far||top||bot))continue;
        cells.push({cx,cy,side:top?'T':bot?'B':'S',c,far})}}
    // program cells
    const prog=new Map(),used=new Set();
    const pick=(list,targets,ids)=>targets.forEach(([tx,ty],k)=>{let best=null,bd=1e12;for(const x of list){if(used.has(x))continue;const d=(x.cx-tx)**2+(x.cy-ty)**2;if(d<bd){bd=d;best=x}}if(best){used.add(best);prog.set(best,ids[k])}});
    const ins=x=>x.cy-S*R/2>=10&&x.cy+S*R/2<=H-10&&x.cx-R>=2&&x.cx+R<=W-2;
      const hin=x=>x.cx-R>=2&&x.cx+R<=W-2;
      const farL=cells.filter(x=>x.far&&x.cx<W/2&&hin(x)),farR=cells.filter(x=>x.far&&x.cx>W/2&&hin(x));
      const iL=farL.length?Math.max(...farL.map(x=>x.cx)):null,iR=farR.length?Math.min(...farR.map(x=>x.cx)):null;
      if(W>=1000&&iL!==null&&iR!==null){
        const cy0=cr.top-sr.top+cr.height/2,inside=x=>x.cy-SR/2>=24&&x.cy+SR/2<=H-24;
        const colL=farL.filter(x=>Math.abs(x.cx-iL)<1&&inside(x)),colR=farR.filter(x=>Math.abs(x.cx-iR)<1&&inside(x)),ks=[-1.5,-.5,.5,1.5];
        pick(colL,ks.map(k=>[iL,cy0+k*SR]),[0,2,4,6]);pick(colR,ks.map(k=>[iR,cy0+k*SR]),[1,3,5,7]);
      }else{
        const T=cells.filter(x=>x.side==='T'&&hin(x)&&x.cy-SR/2>=2),Bt=cells.filter(x=>x.side==='B'&&hin(x)&&x.cy+SR/2<=H-2);
        pick(T,[.16,.39,.61,.84].map(f=>[W*f,0]),[0,1,2,3]);pick(Bt,[.16,.39,.61,.84].map(f=>[W*f,H]),[4,5,6,7]);
      }
    const w=2*Rd,h=S*Rd,lab=R>=46;let si=0,html='',svg=`<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">`;
    const pts=x=>[[1,0],[.5,.5],[-.5,.5],[-1,0],[-.5,-.5],[.5,-.5]].map(([a,b])=>(x.cx+a*Rd).toFixed(1)+','+(x.cy+b*S*Rd).toFixed(1)).join(' ');
    cells.forEach(x=>{
      if(prog.has(x)){const p=prog.get(x),tag=PROGRAMS[p][0];
        html+=`<div class="hxw" style="left:${(x.cx-Rd).toFixed(1)}px;top:${(x.cy-h/2).toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;--c:${PCOL[p]}"><button class="hx prog" data-hex="${p}" aria-haspopup="dialog" aria-label="${tag}: open details" style="--c:${PCOL[p]};--d:${(-p*1.15).toFixed(2)}s;--is:${Math.round(R*(lab?.5:.62))}px;--fs:${Math.max(9.5,R*.148).toFixed(1)}px"><span class="hx-in"><span class="hx-side"></span><span class="hx-face">${ic(PICO[p])}${lab?`<span class="hx-l">${tag}</span>`:''}</span></span></button></div>`}
      else{svg+=`<polygon class="ho" data-x="${x.cx.toFixed(1)}" data-y="${x.cy.toFixed(1)}" points="${pts(x)}"/>`;const sz=h*.42,x0=Math.max(2,x.cx-Rd*.8),x1=Math.min(W-2,x.cx+Rd*.8),y0=Math.max(2,x.cy-h*.45),y1=Math.min(H-2,x.cy+h*.45);if(x1-x0>=sz*1.02&&y1-y0>=sz*1.02)svg+=sciSvg((si++*7)%SCI.length,(x0+x1)/2,(y0+y1)/2,sz)}});
    svg+='</svg>';
    html=svg+html;
    field.innerHTML=html;
    startHexAnim(sec,field,Rd);
  };
  const hexFn=build;window.addEventListener('resize',build);
  build();requestAnimationFrame(build);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{if(alive)build()});

  function startHexAnim(sec,field,Rd){
  if(hexStop){hexStop();hexStop=null}
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  const ics=[...field.querySelectorAll('.ic')].map((g,i)=>({g,x:+g.dataset.x,y:+g.dataset.y,ph:i*1.7,sp:.55+((i*37)%10)/22,amp:Rd*(.08+((i*13)%5)*.018),sx:0,sy:0,sr:0,ss:1,spin:-1e9}));
  const hos=[...field.querySelectorAll('.ho')].map(p=>({p,x:+p.dataset.x,y:+p.dataset.y}));
  let mx=null,my=null,vis=true,raf=0;
  const move=e=>{const r=sec.getBoundingClientRect();mx=e.clientX-r.left;my=e.clientY-r.top};
  const leave=()=>{mx=my=null};
  const down=e=>{const r=sec.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top;let b=null,bd=Rd*1.1;ics.forEach(o=>{const d=Math.hypot(o.x-px,o.y-py);if(d<bd){bd=d;b=o}});if(b)b.spin=performance.now()};
  sec.addEventListener('pointermove',move);sec.addEventListener('pointerleave',leave);sec.addEventListener('pointerdown',down);
  const io=new IntersectionObserver(en=>{vis=en[0].isIntersecting;if(vis&&!raf)raf=requestAnimationFrame(loop)});io.observe(sec);
  const R=Rd*2.1,cl=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  function loop(now){
    raf=0;if(!vis)return;const t=now/1000;
    for(const o of ics){
      let tx=Math.sin(t*o.sp+o.ph)*o.amp,ty=Math.cos(t*o.sp*.8+o.ph*1.3)*o.amp,tr=Math.sin(t*o.sp*.6+o.ph)*9,ts=1;
      if(mx!==null){const dx=o.x-mx,dy=o.y-my,d=Math.hypot(dx,dy)||1;if(d<R){const f=1-d/R;tx+=dx/d*f*Rd*.36;ty+=dy/d*f*Rd*.36;tr+=f*22*Math.sign(dx||1);ts=1+f*.3}}
      const lim=Rd*.42,m=Math.hypot(tx,ty);if(m>lim){tx*=lim/m;ty*=lim/m}
      o.sx+=(tx-o.sx)*.14;o.sy+=(ty-o.sy)*.14;o.sr+=(tr-o.sr)*.14;o.ss+=(ts-o.ss)*.14;
      const sp=cl((now-o.spin)/800),extra=sp<1?360*(1-Math.pow(1-sp,3)):0;
      o.g.style.opacity=(.42+.5*(o.ss-1)/.3).toFixed(2);o.g.setAttribute('transform',`translate(${o.sx.toFixed(2)} ${o.sy.toFixed(2)}) translate(${o.x} ${o.y}) rotate(${(o.sr+extra).toFixed(2)}) scale(${o.ss.toFixed(3)}) translate(${-o.x} ${-o.y})`);
    }
    for(const h of hos){let f=0;if(mx!==null){f=cl(1-Math.hypot(h.x-mx,h.y-my)/(Rd*2.4))}h.p.style.stroke=`rgba(255,255,255,${(.18+.55*f).toFixed(3)})`;h.p.style.fill=`rgba(93,173,226,${(.16*f).toFixed(3)})`}
    raf=requestAnimationFrame(loop);
  }
  raf=requestAnimationFrame(loop);
  hexStop=()=>{cancelAnimationFrame(raf);raf=0;vis=false;io.disconnect();sec.removeEventListener('pointermove',move);sec.removeEventListener('pointerleave',leave);sec.removeEventListener('pointerdown',down)};
}

    const tilt = (e: PointerEvent) => {
      const b = (e.target as Element).closest && (e.target as Element).closest(".hx.prog") as HTMLElement;
      if (!b) return;
      const r = b.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      b.style.setProperty("--rx", (-py * 22).toFixed(1) + "deg");
      b.style.setProperty("--ry", (px * 22).toFixed(1) + "deg");
    };
    const untilt = (e: PointerEvent) => {
      const b = (e.target as Element).closest && (e.target as Element).closest(".hx.prog") as HTMLElement;
      if (b) { b.style.removeProperty("--rx"); b.style.removeProperty("--ry"); }
    };
    sec.addEventListener("pointermove", tilt);
    sec.addEventListener("pointerout", untilt);
    return () => {
      alive = false;
      window.removeEventListener("resize", hexFn);
      if (hexStop) hexStop();
      sec.removeEventListener("pointermove", tilt);
      sec.removeEventListener("pointerout", untilt);
    };
  }, []);

  return (
    <section
      className="hexsec"
      ref={secRef}
      onClick={(e) => {
        const hx = (e.target as Element).closest("[data-hex]") as HTMLElement | null;
        if (hx) openPop(+hx.dataset.hex, hx, false);
      }}
    >
      <div className="hexfield" role="group" aria-label="Explore our programs" ref={fieldRef} />
      <div className="wrap">
        <div data-clear>
          <div className="mono" style={{ color: "var(--sea)" }}>Our programs</div>
          <h2>Eight Ways Into Science</h2>
          <div className="dots" aria-hidden="true" />
          <p>Each hexagon is a program. Tap one to see what students learn, the science behind it, and the experiment to try.</p>
          <p className="hint">Tap a hexagon to explore</p>
          <div className="row" style={{ justifyContent: "center", marginTop: 22 }}>
            <Go to="/programs">View All Programs</Go>
          </div>
        </div>
      </div>
    </section>
  );
}
