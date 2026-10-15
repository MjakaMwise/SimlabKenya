/* eslint-disable @typescript-eslint/no-explicit-any */
/* Animated line-art science icons and the shape + icon "objects" used by the
   programs timeline, Ocean Shujaa timeline and program pop-up.
   Ported from the static SIM-Lab Kenya design; each icon returns an SVG string. */
import { PCOL, PROGRAMS, FR, MORPH } from "./data";

let SU = 0;
export const nextId = () => ++SU;
const AN=(a,v,d,x='')=>`<animate attributeName="${a}" values="${v}" dur="${d}s" repeatCount="indefinite" ${x}/>`;
const AT=(t,v,d,x='')=>`<animateTransform attributeName="transform" type="${t}" values="${v}" dur="${d}s" repeatCount="indefinite" ${x}/>`;
const ES='calcMode="spline" keyTimes="0;.5;1" keySplines=".45 0 .55 1;.45 0 .55 1"';
const sineP=(x0,x1,y,amp,len,ph,n=30)=>{let d='';for(let k=0;k<=n;k++){const x=x0+(x1-x0)*k/n;d+=(k?'L':'M')+x.toFixed(1)+' '+(y+amp*Math.sin((x-x0)/len*2*Math.PI+ph)).toFixed(1)}return d};
const PH=(n)=>Array.from({length:n+1},(_,k)=>2*Math.PI*k/n);
const typ=str=>(u,A)=>{
  const size=str.length>5?13:str.length>3?16:str.length>2?19:22,c=`tc${u}`;
  let t='';str.split(/(_\d+|\^\d+)/).forEach(p=>{if(!p)return;if(p[0]==='_')t+=`<tspan dy="${size*.28}" font-size="${size*.62}">${p.slice(1)}</tspan><tspan dy="${-size*.28}"></tspan>`;else if(p[0]==='^')t+=`<tspan dy="${-size*.35}" font-size="${size*.62}">${p.slice(1)}</tspan><tspan dy="${size*.35}"></tspan>`;else t+=p});
  const kt='keyTimes="0;.35;.82;.9;1"';
  return `<defs><clipPath id="${c}"><rect x="0" y="0" height="48" width="${A?0:48}">${A?AN('width','0;48;48;0;0',5.5,kt):''}</rect></clipPath></defs><g clip-path="url(#${c})"><text class="sct" x="24" y="24" text-anchor="middle" dominant-baseline="central" font-size="${size}">${t}</text></g>${A?`<rect class="cur" x="0" y="${24-size*.6}" width="1.8" height="${size*1.2}">${AN('x','0;46;46;0;0',5.5,kt)}${AN('opacity','1;1;1;0;0',5.5,kt)}</rect>`:''}`;
};
const bubbles=(A,xs,y0,y1)=>xs.map((x,k)=>`<circle cx="${x}" cy="${y0}" r="1.2" fill="#fff" stroke="none">${A?AN('cy',`${y0};${y1}`,1.8,`begin="${-k*.6}s"`)+AN('opacity','0;1;0',1.8,`begin="${-k*.6}s"`):''}</circle>`).join('');
const springD=s=>{const P=[[24,5],[24,5+5*s],[15,5+8.5*s],[33,5+14*s],[15,5+19.5*s],[33,5+25*s],[15,5+30.5*s],[24,5+34*s],[24,5+38*s]];return 'M'+P.map(p=>p[0]+' '+p[1].toFixed(1)).join('L')};
export const SCI: [string, (u: number, A: boolean) => string][] = [
 ['bio',(u,A)=>`<g${A?' class="swim"':''}><g transform="rotate(-22 24 24)"><rect x="6" y="17" width="28" height="14" rx="7"/><path d="M34 24c3-4 5 4 8 0s3 3 5 0">${A?AN('d','M34 24c3-4 5 4 8 0s3 3 5 0;M34 24c3 4 5-4 8 0s3-3 5 0;M34 24c3-4 5 4 8 0s3 3 5 0','.9'):''}</path><path d="M13 17v-4M19 17v-4M25 17v-4M13 31v4M19 31v4M25 31v4"/><circle cx="15" cy="24" r="1.3">${A?AN('cx','15;17;15','2.6'):''}</circle><circle cx="22" cy="22" r="1.3">${A?AN('cy','22;25;22','3.1'):''}</circle><circle cx="26" cy="26" r="1.3">${A?AN('cx','26;23;26','2.2'):''}</circle></g></g>`],
 ['phy',(u,A)=>[0,60,120].map((r,i)=>`<g transform="rotate(${r} 24 24)"><ellipse cx="24" cy="24" rx="18" ry="7"/><circle r="2" fill="#fff" stroke="none" ${A?'':'cx="42" cy="24"'}>${A?`<animateMotion dur="${[2.4,3.1,3.8][i]}s" begin="${-i}s" repeatCount="indefinite" path="M6 24a18 7 0 1 0 36 0a18 7 0 1 0 -36 0"/>`:''}</circle></g>`).join('')+`<circle cx="24" cy="24" r="2.6">${A?AN('r','2.6;3.6;2.6',1.6):''}</circle>`],
 ['chem',(u,A)=>{const c=`fc${u}`,ky='keyTimes="0;.08;.5;.78;1"',v='44;44;31;31;44';return `<defs><clipPath id="${c}"><path d="M21.4 18.5L10.4 38a3 3 0 0 0 2.6 4.5h22.8A3 3 0 0 0 38.2 38L26.6 18.5z"/></clipPath></defs><g clip-path="url(#${c})"><rect x="6" y="${A?44:32}" width="36" height="20" fill="#fff" fill-opacity=".4" stroke="none">${A?AN('y',v,6,ky):''}</rect><rect x="6" y="${A?44:32}" width="36" height="1.4" fill="#fff" stroke="none">${A?AN('y',v,6,ky):''}</rect>${bubbles(A,[19,24,29],41,28)}</g><path d="M19 6h10M21 6v12L10 38a3 3 0 0 0 2.6 4.5h22.8A3 3 0 0 0 38 38L27 18V6"/>`}],
 ['txt',typ('H_2O')],
 ['bio',(u,A)=>`<g transform="rotate(-35 24 24)"><g>${A?AT('rotate','0 24 24;7 24 24;0 24 24;-7 24 24;0 24 24',4):''}<path d="M13 21h22M13 27h22"/><circle cx="9.5" cy="19.5" r="4"/><circle cx="9.5" cy="28.5" r="4"/><circle cx="38.5" cy="19.5" r="4"/><circle cx="38.5" cy="28.5" r="4"/>${A?`<path d="M22 21l2.4 3.2-3.6 1.8 3 3" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1">${AN('stroke-dashoffset','1;1;0;0;1',4,'keyTimes="0;.2;.4;.7;1"')}</path>`:''}</g></g>`],
 ['phy',(u,A)=>`<path d="M10 8h8v16a6 6 0 0 0 12 0V8h8v16a14 14 0 0 1-28 0zM10 14h8M30 14h8"/><path d="M14 6C14-1 34-1 34 6" stroke-dasharray="3 3">${A?AN('stroke-dashoffset','0;-12',.9):''}</path><path d="M11 4.5C9-7 39-7 37 4.5" stroke-dasharray="3 4" stroke-opacity=".7">${A?AN('stroke-dashoffset','0;-14',1.2):''}</path>`],
 ['chem',(u,A)=>`<path d="M24 6l15 9v18l-15 9-15-9V15z"/><circle cx="24" cy="24" r="8" stroke-dasharray="${A?'4.2 3':'none'}">${A?AT('rotate','0 24 24;360 24 24',7):''}</circle>`],
 ['bio',(u,A)=>{const X=(y,ph)=>24+11*Math.sin(2*Math.PI*(y-6)/24+ph),pa=ph=>{let d='';for(let y=6;y<=42.01;y+=1.5)d+=(y>6?'L':'M')+X(y,ph).toFixed(1)+' '+y;return d},F=PH(12);
   const st=s=>`<path d="${pa(s)}">${A?AN('d',F.map(p=>pa(p+s)).join(';'),3.6):''}</path>`;
   const rg=[10,16,22,28,34,40].map(y=>`<line y1="${y}" y2="${y}" x1="${X(y,0).toFixed(1)}" x2="${X(y,Math.PI).toFixed(1)}" stroke-opacity=".75">${A?AN('x1',F.map(p=>X(y,p).toFixed(1)).join(';'),3.6)+AN('x2',F.map(p=>X(y,p+Math.PI).toFixed(1)).join(';'),3.6):''}</line>`).join('');
   return st(0)+st(Math.PI)+rg}],
 ['phy',(u,A)=>{const d=(v?:any,kt?:any)=>A?`pathLength="1" stroke-dasharray="1"`:'',an=(vals,kt)=>A?AN('stroke-dashoffset',vals,4,`keyTimes="${kt}"`):'';return `<path d="M24 8l16 28H8z"/><path d="M3 30l13-5" ${d()}>${an('1;0;0;0;1','0;.25;.4;.85;1')}</path><path d="M31 30l13 3" ${d()}>${an('1;1;0;0;1','0;.25;.45;.85;1')}</path><path d="M31 30l13 8" ${d()}>${an('1;1;0;0;1','0;.3;.5;.85;1')}</path><path d="M31 30l13-2" ${d()}>${an('1;1;0;0;1','0;.35;.55;.85;1')}</path>`}],
 ['txt',typ('NaCl')],
 ['bio',(u,A)=>`<circle cx="24" cy="24" r="17">${A?AN('r','17;17.9;17',3):''}</circle><circle cx="21" cy="22" r="6">${A?AN('r','6;7;6',2.2):''}</circle><circle cx="21" cy="22" r="1.6"/><ellipse cx="33" cy="31" rx="4.5" ry="2.6">${A?AT('translate','0 0;-3 -4;-8 -2;-4 3;0 0',6):''}</ellipse><path d="M30 13c3 0 5 2 6 5"/>`],
 ['phy',(u,A)=>`<path d="M10 6h28"/><g>${A?AT('rotate','-28 24 6;28 24 6;-28 24 6',2.6,ES):''}<path d="M24 6V33"/><circle cx="24" cy="37.5" r="4.5"/></g><path d="M11 38a27 27 0 0 0 26 0" stroke-dasharray="2 3" stroke-opacity=".6"/>`],
 ['inst',(u,A)=>`<g>${A?AT('translate','0 0;-1.4 -2.2;0 0',3.2,ES):''}<path d="M20 6l9 3-6 17-9-3z"/></g><path d="M27 22c9 3 10 15 2 18M12 42h26M12 33h12M18 33v9"/><circle cx="18" cy="30.8" r="1.4" fill="#fff" stroke="none">${A?AN('opacity','.2;1;.2',1.6):''}</circle>`],
 ['chem',(u,A)=>{const c=`bc${u}`,ky='keyTimes="0;.08;.5;.78;1"',v='40;40;19;19;40';return `<defs><clipPath id="${c}"><path d="M14.8 9V38a2.4 2.4 0 0 0 2.4 2.4h13.6a2.4 2.4 0 0 0 2.4-2.4V9z"/></clipPath></defs><g clip-path="url(#${c})"><rect x="12" y="${A?40:22}" width="24" height="30" fill="#fff" fill-opacity=".38" stroke="none">${A?AN('y',v,6.5,ky):''}</rect><rect x="12" y="${A?40:22}" width="24" height="1.4" fill="#fff" stroke="none">${A?AN('y',v,6.5,ky):''}</rect>${bubbles(A,[20,25,30],38,22)}</g><path d="M12 8h24M14 8v30a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V8M14 16h6M14 24h6M14 32h6"/>`}],
 ['txt',typ('E=mc^2')],
 ['bio',(u,A)=>`<g>${A?AT('rotate','0 24 24;360 24 24',16):''}<circle cx="24" cy="24" r="9"/><path d="M24 15v-3M24 33v3M15 24h-3M33 24h3M30.4 17.6l2.2-2.2M17.6 30.4l-2.2 2.2M30.4 30.4l2.2 2.2M17.6 17.6l-2.2-2.2"/>${[[24,9],[24,39],[9,24],[39,24],[34.6,13.4],[13.4,34.6],[34.6,34.6],[13.4,13.4]].map(([x,y],k)=>`<circle cx="${x}" cy="${y}" r="2.4">${A?AN('r','2.4;3.5;2.4',1.8,`begin="${-k*.22}s"`):''}</circle>`).join('')}</g>`],
 ['phy',(u,A)=>{const S=[1,.7,1.12,1],sp=A?S.map(springD).join(';'):springD(1);return `<path d="${springD(1)}">${A?AN('d',sp,3.4,'calcMode="spline" keyTimes="0;.3;.7;1" keySplines=".4 0 .6 1;.4 0 .6 1;.4 0 .6 1"'):''}</path><rect x="17" y="43" width="14" height="4" rx="1">${A?AN('y',S.map(s=>(5+38*s).toFixed(1)).join(';'),3.4,'calcMode="spline" keyTimes="0;.3;.7;1" keySplines=".4 0 .6 1;.4 0 .6 1;.4 0 .6 1"'):''}</rect><path d="M17 4h14"/>`}],
 ['chem',(u,A)=>{const c1=`t1${u}`,c2=`t2${u}`,k='keyTimes="0;.5;1"';return `<defs><clipPath id="${c1}"><path d="M12.8 9V36a3.7 3.7 0 0 0 7.4 0V9z"/></clipPath><clipPath id="${c2}"><path d="M27.8 9V36a3.7 3.7 0 0 0 7.4 0V9z"/></clipPath></defs><g clip-path="url(#${c1})"><rect x="10" y="${A?26:24}" width="14" height="30" fill="#fff" fill-opacity=".38" stroke="none">${A?AN('y','27;17;27',3.4,k):''}</rect>${bubbles(A,[16,19],36,20)}</g><g clip-path="url(#${c2})"><rect x="25" y="${A?20:22}" width="14" height="30" fill="#fff" fill-opacity=".38" stroke="none">${A?AN('y','18;28;18',3.4,k):''}</rect>${bubbles(A,[31,34],36,20)}</g><path d="M12 8v28a4.5 4.5 0 0 0 9 0V8M10 8h13M27 8v28a4.5 4.5 0 0 0 9 0V8M25 8h13"/>`}],
 ['txt',typ('CO_2')],
 ['bio',(u,A)=>`<ellipse cx="24" cy="31" rx="17" ry="6"/><path d="M7 31v-7c0-3.5 7.5-6 17-6s17 2.500 17 6v7"/>${[[19,25,2.4,0],[28,23,1.8,1.4],[25,29,1.8,2.6],[14,28,1.5,3.8]].map(([x,y,r,b])=>`<circle cx="${x}" cy="${y}" r="${A?0:r}">${A?AN('r',`0;${r};${r};0`,5,`begin="${-b}s" keyTimes="0;.3;.8;1"`):''}</circle>`).join('')}`],
 ['phy',(u,A)=>`<path d="M24 5c11 8 11 30 0 38C13 35 13 13 24 5z"/><path d="M2 24h44" stroke-opacity=".5" stroke-dasharray="1 3"/><g stroke-dasharray="3 3"><path d="M2 15H21M2 33H21M26 16L40 24M26 32L40 24">${A?AN('stroke-dashoffset','0;-12',.8):''}</path></g><circle cx="40" cy="24" r="2.2" fill="#fff" stroke="none">${A?AN('r','1.6;3;1.6',1.2):''}</circle>`],
 ['chem',(u,A)=>`<g class="${A?'flame':''}"><path d="M24 5c4 6 6 9 4 13a6 6 0 0 1-8 0c-2-4 0-7 4-13z"/><path d="M24 13c2 3 3 4 2 6a3 3 0 0 1-4 0c-1-2 0-3 2-6z"/></g>${A?`<path class="smoke" d="M24 14c-2-3 2-5 0-9" stroke-opacity=".8"/><path class="spark" d="M24 13v8M20 17h8M21.2 14.2l5.6 5.6M26.8 14.2l-5.6 5.6" stroke-width="1.2"/>`:''}<path d="M21 24v16M27 24v16M15 42h18M18 24h12"/>`],
 ['bio',(u,A)=>{const d=(a?:any)=>A?`pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"`:'',an=(vals,kt)=>A?AN('stroke-dashoffset',vals,5,`keyTimes="${kt}"`):'';return `<path d="M9 39C9 22 19 11 38 9c0 18-10 29-27 29" ${d()}>${an('1;0;0;1;1','0;.35;.8;.92;1')}</path><path d="M9 39c6-10 12-16 20-20" ${d()}>${an('1;1;0;0;1','0;.3;.55;.8;1')}</path><path d="M9 39l-3 4" ${d()}>${an('1;0;0;1;1','0;.1;.8;.92;1')}</path>`}],
 ['phy',(u,A)=>{const F=PH(14);return `<rect x="5" y="10" width="38" height="28" rx="3"/><path d="M9 24h30M24 13v22" stroke-dasharray="2 3" stroke-opacity=".55"/><path d="${sineP(9,39,24,9,15,0)}">${A?AN('d',F.map(p=>sineP(9,39,24,9,15,-p)).join(';'),2.6):''}</path><path d="${sineP(9,39,24,4.5,7.5,0)}" stroke-opacity=".5">${A?AN('d',F.map(p=>sineP(9,39,24,4.5,7.5,-p)).join(';'),1.9):''}</path>`}],
 ['chem',(u,A)=>`<g>${A?AT('rotate','0 24 23;360 24 23',14):''}<circle cx="14" cy="32" r="5"/><circle cx="30" cy="30" r="4"/><circle cx="36" cy="14" r="4"/><circle cx="18" cy="14" r="5"/><path d="M19 31.4L26 30.5M31.4 26.3L34.6 17.7M21 18L27.6 26.8M16.9 18.9L15.1 27.1"/></g>`],
 ['chem',(u,A)=>{const c=`sc${u}`;return `<defs><clipPath id="${c}"><rect x="8" y="8" width="32" height="32" rx="3"/></clipPath></defs><rect x="8" y="8" width="32" height="32" rx="3"/><text class="sct" x="24" y="27" text-anchor="middle" font-size="16">Au</text><text class="sct" x="12" y="17" font-size="6">79</text><text class="sct" x="24" y="36" text-anchor="middle" font-size="5.5">197.0</text>${A?`<g clip-path="url(#${c})"><rect x="-24" y="0" width="9" height="48" fill="#fff" fill-opacity=".4" stroke="none" transform="skewX(-20)">${AN('x','-24;60;60',3.6,'keyTimes="0;.5;1"')}</rect></g>`:''}`}],
 ['phy',(u,A)=>`<path d="M20 8a4 4 0 0 1 8 0v20a8 8 0 1 1-8 0zM32 12h4M32 18h4M32 24h4"/><line x1="24" y1="36" x2="24" y2="${A?32:20}" stroke-width="3.2">${A?AN('y2','32;13;32',4.4,ES):''}</line><circle cx="24" cy="36" r="3.4" fill="#fff" stroke="none">${A?AN('r','3.2;3.8;3.2',1.4):''}</circle>`],
 ['inst',(u,A)=>`<g>${A?AT('rotate','-9 24 33;8 24 33;-9 24 33',5,ES):''}<path d="M5 28l26-14 4 8-26 14zM31 14l4 8"/></g><path d="M24 33v9M17 43h14"/><path d="M38 8v6M35 11h6" stroke-width="1.4">${A?AN('stroke-opacity','1;.1;1',1.7):''}</path><path d="M42 20v4M40 22h4" stroke-width="1.2">${A?AN('stroke-opacity','.2;1;.2',2.3):''}</path>`],
 ['txt',(u,A)=>`<text class="sct" x="24" y="16" text-anchor="middle" dominant-baseline="central" font-size="19">pH</text><path d="M7 35h34M7 30v10M41 30v10" stroke-opacity=".75"/><circle cx="${A?9:24}" cy="35" r="3.4" fill="#fff" stroke="none">${A?AN('cx','9;39;9',5,ES):''}</circle>`],
 ['txt',typ('F=ma')],
 ['txt',typ('Fe')],
 ['txt',typ('v=λf')]
];
export const SCIA=!matchMedia('(prefers-reduced-motion:reduce)').matches;
export function sciSvg(i,cx,cy,s){
  const it=SCI[i%SCI.length],sc=s/48,tr=`translate(${(cx-s/2).toFixed(1)} ${(cy-s/2).toFixed(1)}) scale(${sc.toFixed(3)})`,u=++SU;
  return `<g class="ic" data-x="${cx.toFixed(1)}" data-y="${cy.toFixed(1)}"><g class="sci" transform="${tr}">${it[1](u,SCIA)}</g></g>`;
}

export const FRI={hex:{x:.085,b:.88},bio:{x:.11,b:.88},orb:{x:.05,b:.9}};
export function objHtml(p){return objHtmlC(PCOL[p],FR[p],MORPH[p],PROGRAMS[p][0])}
export function objHtmlC(c,f,icons,label){
  const u=++SU,g=`og${u}`;
  const grad=`<defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:color-mix(in srgb,${c} 88%,#fff)"/><stop offset="1" style="stop-color:color-mix(in srgb,${c} 45%,#06222f)"/></linearGradient></defs>`;
  let fr='';
  if(f==='hex'){const hx='M220 112L170 198.6L70 198.6L20 112L70 25.4L170 25.4Z';
    fr=`<path class="fr-fill" d="${hx}" transform="translate(0 12)" style="fill:color-mix(in srgb,${c} 38%,#021018)"/><path class="fr-fill" d="${hx}" fill="url(#${g})"/><path class="fr-fill" d="M208 112L164 188 76 188 32 112 76 36 164 36Z" style="fill:none;stroke:rgba(255,255,255,.28);stroke-width:2"/><path class="fr-draw" pathLength="1" d="${hx}" style="stroke:${c}"/>`}
  else if(f==='bio'){const bl='M120 22C168 14 214 50 220 100S196 190 142 210 48 208 28 158 36 70 70 40 98 26 120 22Z';
    fr=`<path class="fr-fill" d="${bl}" fill="url(#${g})"/><circle class="fr-fill" cx="46" cy="42" r="15" fill="url(#${g})"/><circle class="fr-fill" cx="196" cy="34" r="13" fill="url(#${g})"/><path class="fr-draw" pathLength="1" d="${bl}" style="stroke:${c}"/><path class="fr-draw" pathLength="1" d="M58 52L74 72M186 44L170 62" style="stroke:${c}"/><circle class="fr-draw" pathLength="1" cx="46" cy="42" r="15" style="stroke:${c}"/><circle class="fr-draw" pathLength="1" cx="196" cy="34" r="13" style="stroke:${c}"/>`}
  else{fr=`<circle class="fr-fill" cx="120" cy="120" r="64" fill="url(#${g})"/>`+[0,60,120].map((r,i)=>`<g transform="rotate(${r} 120 120)"><ellipse class="fr-draw" pathLength="1" cx="120" cy="120" rx="108" ry="40" style="stroke:${c}"/><circle class="fr-fill" r="6" fill="#fcb415" ${SCIA?'':'cx="228" cy="120"'}>${SCIA?`<animateMotion dur="${[4.2,5.6,6.8][i]}s" begin="${-i*1.3}s" repeatCount="indefinite" path="M12 120a108 40 0 1 0 216 0a108 40 0 1 0 -216 0"/>`:''}</circle></g>`).join('')}
  const ic=icons.map((k,j)=>`<g class="mi${j===0?' act':''}"><g class="sci" transform="translate(66 66) scale(2.25)">${SCI[k][1](++SU,SCIA)}</g></g>`).join('');
  return `<svg viewBox="0 0 240 240" class="tl-fr" data-f="${f}" role="img" aria-label="${label} illustration">${grad}${fr}${ic}</svg>`;
}

export function atomSvg(){
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches,T=418,c=T/2;
  const rr=(x,y,w,h,r,rev)=>rev
    ?`M${x+r} ${y}A${r} ${r} 0 0 0 ${x} ${y+r}V${y+h-r}A${r} ${r} 0 0 0 ${x+r} ${y+h}H${x+w-r}A${r} ${r} 0 0 0 ${x+w} ${y+h-r}V${y+r}A${r} ${r} 0 0 0 ${x+w-r} ${y}Z`
    :`M${x+r} ${y}H${x+w-r}A${r} ${r} 0 0 1 ${x+w} ${y+r}V${y+h-r}A${r} ${r} 0 0 1 ${x+w-r} ${y+h}H${x+r}A${r} ${r} 0 0 1 ${x} ${y+h-r}V${y+r}A${r} ${r} 0 0 1 ${x+r} ${y}Z`;
  const rings=[
    {rot:-4,x:18,y:18,w:T-36,h:T-36,r:46,rev:false,cls:'ring-a',els:[{dur:7,begin:0},{dur:7,begin:-3.5}],fill:'#fcb415'},
    {rot:3,x:3,y:3,w:T-6,h:T-6,r:56,rev:true,cls:'ring-b',els:[{dur:11,begin:-2}],fill:'#5dade2'}];
  return `<svg class="atom" viewBox="0 0 ${T} ${T}" aria-hidden="true">`+rings.map(g=>{
    const d=rr(g.x,g.y,g.w,g.h,g.r,g.rev);
    return `<g transform="rotate(${g.rot} ${c} ${c})"><path class="${g.cls}" d="${d}"/>`+g.els.map((e,k)=>[[7,1],[5,.45],[3.4,.22]].map(([r,o],j)=>`<circle class="el" r="${r}" fill="${g.fill}" fill-opacity="${o}"${j?'':' data-main="1"'} ${reduce?`cx="${g.x+g.w*(.3+k*.4)}" cy="${g.y}"`:''}>${reduce?'':`<animateMotion dur="${e.dur}s" begin="${e.begin-j*.12}s" repeatCount="indefinite" path="${d}"/>`}</circle>`).join('')).join('')+'</g>';
  }).join('')+'</svg>';
}
