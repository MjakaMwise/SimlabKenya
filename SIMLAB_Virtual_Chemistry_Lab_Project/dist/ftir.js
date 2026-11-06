/* Representative teaching bands. Reference links lead to experimental spectra. */
const ftirSamples={
  ethanol:{name:'Ethanol',formula:'C₂H₆O',cas:'64175',bands:[
    [3340,190,.65,'Broad alcohol O–H stretch'],[2970,25,.28,'Aliphatic C–H stretch'],[2880,24,.19,'Aliphatic C–H stretch'],[1450,22,.16,'C–H bending'],[1050,28,.68,'Alcohol C–O stretch']]},
  acetone:{name:'Acetone',formula:'C₃H₆O',cas:'67641',bands:[
    [2970,27,.22,'Aliphatic C–H stretch'],[1715,19,.95,'Ketone C=O stretch'],[1420,24,.20,'Methyl bending'],[1360,22,.24,'Methyl bending'],[1220,26,.42,'Fingerprint band']]},
  toluene:{name:'Toluene',formula:'C₇H₈',cas:'108883',bands:[
    [3030,18,.20,'Aromatic C–H stretch'],[2920,25,.20,'Methyl C–H stretch'],[1605,15,.29,'Aromatic ring stretch'],[1495,17,.37,'Aromatic ring vibration'],[730,16,.59,'Aromatic C–H out-of-plane bend'],[695,12,.60,'Aromatic C–H out-of-plane bend']]},
  acetic:{name:'Ethanoic acid',formula:'C₂H₄O₂',cas:'64197',bands:[
    [2970,245,.52,'Broad carboxylic acid O–H envelope'],[1710,25,.92,'Carboxylic acid C=O stretch'],[1420,24,.21,'O–H bending region'],[1250,30,.47,'Acid C–O stretch'],[930,24,.22,'Fingerprint band']]}
};
Object.assign(ftirSamples,{
  paracetamol:{name:'Paracetamol',formula:'C₈H₉NO₂',cas:'103902',solid:true,bands:[
    [3325,48,.42,'O–H / N–H stretching region'],[3160,65,.24,'Hydrogen-bonded stretching region'],[1650,18,.83,'Amide C=O stretch'],[1610,15,.34,'Aromatic ring stretch'],[1510,16,.58,'Aromatic / amide region'],[1245,20,.41,'Phenolic C–O region'],[835,13,.43,'Aromatic C–H bend']]},
  caffeine:{name:'Caffeine',formula:'C₈H₁₀N₄O₂',cas:'58082',solid:true,bands:[
    [2955,23,.20,'Methyl C–H stretch'],[1700,18,.88,'Carbonyl stretching band'],[1655,18,.72,'Carbonyl stretching band'],[1550,15,.43,'Heterocyclic ring vibration'],[1240,18,.32,'Fingerprint band'],[745,14,.28,'Fingerprint band']]},
  methanol:{name:'Methanol',formula:'CH₄O',cas:'67561',bands:[
    [3330,190,.70,'Broad alcohol O–H stretch'],[2940,23,.30,'Methyl C–H stretch'],[2830,23,.21,'Methyl C–H stretch'],[1450,25,.24,'Methyl bending'],[1035,27,.74,'Alcohol C–O stretch']]},
  ethylAcetate:{name:'Ethyl acetate',formula:'C₄H₈O₂',cas:'141786',bands:[
    [2985,25,.23,'Aliphatic C–H stretch'],[1740,20,.93,'Ester C=O stretch'],[1370,21,.25,'Methyl bending'],[1240,25,.61,'Ester C–O stretching region'],[1050,24,.45,'Ester C–O stretching region']]}
});
const ftirReference=sample=>'https://webbook.nist.gov/cgi/cbook.cgi?ID=C'+sample.cas+'&Mask=80';
const ftirDefaults=()=>({sample:'ethanol',resolution:4,scans:16,display:'transmittance',runs:[],overlays:[],referenceColours:{}});
let ftir=ftirDefaults();
try{
  const saved=JSON.parse(localStorage.getItem('simlab-ftir-v1')||'null');
  if(saved)ftir={...ftir,...saved};
}catch{}
let ftirBackground=null,ftirTimer=null,ftirProgress=0,ftirBusy='',ftirPeak=0;
let ftirTab='sample',ftirView='sample';
let ftirStatus='Collect a background with an empty, clean ATR crystal.';
const ftirKey=()=>String(ftir.resolution);
function ftirSave(){try{localStorage.setItem('simlab-ftir-v1',JSON.stringify(ftir));}catch{}}
function ftirSpectrum(sample,resolution,scans,reference=false){
  const points=[];
  for(let wavenumber=4000;wavenumber>=650;wavenumber-=resolution){
    const signal=sample.bands.reduce((sum,[center,width,height])=>
      sum+height*Math.exp(-.5*((wavenumber-center)/Math.hypot(width,resolution/2))**2),0);
    const noise=reference?0:(Math.sin(wavenumber*1.83)+Math.sin(wavenumber*.71))*.0018/Math.sqrt(scans);
    points.push([wavenumber,Number(Math.max(0,signal+noise).toFixed(5))]);
  }
  return points;
}
function ftirPeaks(sample,points){
  return sample.bands.map(([center,width,,label])=>{
    const nearby=points.filter(([wavenumber])=>Math.abs(wavenumber-center)<=Math.min(30,width));
    const peak=nearby.reduce((best,point)=>!best||point[1]>best[1]?point:best,null);
    return peak&&{wavenumber:peak[0],absorbance:peak[1],label};
  }).filter(Boolean).sort((a,b)=>b.wavenumber-a.wavenumber);
}
const ftirReferenceColours=['#c05316','#2456c0','#a02381','#846200','#006f94','#c02c45','#663cb1','#5d4a37'];
function ftirReferenceColour(id){
  const custom=ftir.referenceColours?.[id];
  return /^#[0-9a-f]{6}$/i.test(custom||'')?custom:ftirReferenceColours[Object.keys(ftirSamples).indexOf(id)];
}
const ftirReferenceTraces=Object.fromEntries(Object.entries(ftirSamples).map(([id,sample])=>[id,ftirSpectrum(sample,4,1,true)]));
function ftirPlot(run){
  const references=ftir.overlays.filter(id=>ftirReferenceTraces[id]);
  const x=wavenumber=>55+(4000-wavenumber)/3350*660;
  const absorbanceMode=ftir.display==='absorbance';
  const maximum=absorbanceMode?Math.max(1,...(run?.points||[]).map(point=>point[1]),...references.flatMap(id=>ftirReferenceTraces[id].map(point=>point[1])))*1.08:100;
  const y=value=>225-value/maximum*190;
  const convert=value=>absorbanceMode?value:100*10**(-value);
  const trace=points=>points.map(([wavenumber,value])=>x(wavenumber).toFixed(2)+','+y(convert(value)).toFixed(2)).join(' ');
  const points=trace(run?.points||[]);
  const selected=run?.peaks[ftirPeak];
  const label=absorbanceMode?'Absorbance / A':'Transmittance / %';
  return `<svg class="uv-chart" viewBox="0 0 760 270" role="img" aria-label="FTIR ${label} versus descending wavenumber">
    ${[0,.25,.5,.75,1].map(f=>`<path d="M55 ${y(maximum*f)}H715" stroke="#d7e5df"/><text x="49" y="${y(maximum*f)+4}" text-anchor="end">${(maximum*f).toFixed(absorbanceMode?2:0)}</text>`).join('')}
    <path d="M55 32V225H715" fill="none" stroke="#748e83"/>
    ${[4000,3500,3000,2500,2000,1500,1000,650].map(value=>`<text x="${x(value)}" y="244" text-anchor="middle">${value}</text>`).join('')}
    <polyline points="${points}" fill="none" stroke="#087e67" stroke-width="2.2"/>
    ${references.map(id=>`<polyline points="${trace(ftirReferenceTraces[id])}" fill="none" stroke="${ftirReferenceColour(id)}" stroke-width="2.2" stroke-dasharray="5 4"/>`).join('')}
    ${selected?`<circle cx="${x(selected.wavenumber)}" cy="${y(convert(selected.absorbance))}" r="5" fill="#a54c25"/>`:''}
    <text x="55" y="18">${label}</text><text x="385" y="263" text-anchor="middle">Wavenumber / cm⁻¹</text>
  </svg>`;
}
function ftirBackgroundPlot(){
  const x=wavenumber=>55+(4000-wavenumber)/3350*660;
  const y=intensity=>225-intensity*190;
  const points=ftirBackground.points.map(([wavenumber,intensity])=>x(wavenumber).toFixed(2)+','+y(intensity).toFixed(2)).join(' ');
  return `<svg class="uv-chart" viewBox="0 0 760 270" role="img" aria-label="Simulated single-beam clean ATR crystal background">
    ${[0,.25,.5,.75,1].map(value=>`<path d="M55 ${y(value)}H715" stroke="#d7e5df"/><text x="49" y="${y(value)+4}" text-anchor="end">${Math.round(100*value)}</text>`).join('')}
    <path d="M55 32V225H715" fill="none" stroke="#748e83"/>
    ${[4000,3500,3000,2500,2000,1500,1000,650].map(value=>`<text x="${x(value)}" y="244" text-anchor="middle">${value}</text>`).join('')}
    <polyline points="${points}" fill="none" stroke="#3155a4" stroke-width="2.2"/>
    <text x="55" y="18">Relative detector signal / %</text><text x="385" y="263" text-anchor="middle">Wavenumber / cm⁻¹</text>
  </svg>`;
}
function ftirCollectBackground(resolution){
  const points=[];
  for(let wavenumber=4000;wavenumber>=650;wavenumber-=resolution){
    const envelope=.35+.60*Math.exp(-.5*((wavenumber-2180)/1120)**2);
    points.push([wavenumber,envelope]);
  }
  return {key:String(resolution),resolution,points};
}
function ftirOverlayLegend(run){
  const sample=run?'<span><i style="border-color:#087e67"></i>Sample · '+esc(ftirSamples[run.sample].name)+'</span>':'';
  const refs=Object.entries(ftirSamples).map(([id,item])=>ftir.overlays.includes(id)
    ? '<span><i class="ftir-reference-key" style="border-color:'+ftirReferenceColour(id)+'"></i>'+esc(item.name)+' reference</span>'
    : '').join('');
  return '<div class="ftir-overlay-legend" id="ftirOverlayLegend" aria-label="Spectrum legend">'+sample+refs+'</div>';
}
function ftirPage(){
  const run=ftir.runs.at(-1),sample=ftirSamples[ftir.sample],peak=run?.peaks[ftirPeak];
  const showBackground=ftirView==='background'&&ftirBackground;
  const references=`<div class="ftir-references"><h3>Reference spectrum overlays</h3>
        <p class="muted">Dashed traces are teaching references. Use the NIST links for experimental spectra.</p><button class="btn secondary small" type="button" data-ftir="overlay">View overlaid spectra</button>
        <div class="ftir-reference-list">${Object.entries(ftirSamples).map(([id,item])=>`<div><label><input type="checkbox" data-ftir-reference="${id}" ${ftir.overlays.includes(id)?'checked':''}><i style="border-color:${ftirReferenceColour(id)}"></i>${esc(item.name)}</label><input type="color" data-ftir-colour="${id}" value="${ftirReferenceColour(id)}" aria-label="${esc(item.name)} reference colour"><a href="${ftirReference(item)}" target="_blank" rel="noopener">NIST ↗</a></div>`).join('')}</div></div>`;
  return `${head('VIRTUAL INSTRUMENT','ATR–FTIR spectroscopy','Collect a background, acquire a spectrum, and compare characteristic infrared bands.')}
  <section class="panel uv-panel">
    <div class="sectionhead"><h2>${showBackground?'Background · clean ATR crystal':ftir.overlays.length?'Overlaid spectra':run?'Spectrum · '+esc(ftirSamples[run.sample].name):'Infrared spectrum'}</h2><span class="statbadge" id="ftirStatusBadge">${ftirBusy?'ACQUIRING':ftirBackground?.key===ftirKey()?'BACKGROUND READY':'BACKGROUND REQUIRED'}</span></div>
    <div class="ftir-layout">
      <div><div id="ftirPlot">${showBackground?ftirBackgroundPlot():ftirPlot(run)}</div>
        ${showBackground?'':ftirOverlayLegend(run)}

      </div>
      <div class="ftir-inspector">${showBackground?`<h3>What the background shows</h3><p>Simulated single-beam detector signal from the clean crystal with no sample. The signal varies with wavenumber.</p><p>Resolution: ${ftirBackground.resolution} cm⁻¹. The instrument uses a matching background to reference the sample measurement.</p>`:`<h3>Band inspector</h3>
      ${run?`<label>Detected band<select id="ftirPeak">${run.peaks.map((band,index)=>`<option value="${index}" ${index===ftirPeak?'selected':''}>${band.wavenumber} cm⁻¹ · ${esc(band.label)}</option>`).join('')}</select></label>
        ${peak?`<p><b>${peak.wavenumber} cm⁻¹</b> · ${peak.absorbance.toFixed(3)} A · ${(100*10**(-peak.absorbance)).toFixed(1)} %T</p>`:''}
        <a href="${ftirReference(ftirSamples[run.sample])}" target="_blank" rel="noopener">Compare with NIST IR spectrum ↗</a>`:'<p>Acquire a sample spectrum to inspect its characteristic bands.</p>'}`}
      </div>
    </div>
    <div class="ch-actions"><button class="btn secondary" type="button" data-ftir="background" ${ftirBusy?'disabled':''}>Collect background</button>
    ${ftirBackground?`<button class="btn secondary" type="button" data-ftir="view" ${ftirBusy?'disabled':''}>${showBackground?'Show sample &amp; overlays':'Show background'}</button>`:''}
    <button class="btn" type="button" data-ftir="${ftirBusy?'stop':'run'}">${ftirBusy?'Stop':'Run sample'}</button></div>
    <p class="notice" id="ftirStatus" role="status">${esc(ftirStatus)}</p>
    <progress id="ftirProgress" max="100" value="${ftirProgress}" ${ftirBusy?'':'hidden'} aria-label="Acquisition progress"></progress>
  </section>
  <section class="panel uv-panel uv-tab-workspace">
    <div class="uv-tablist" role="tablist" aria-label="FTIR workspace">
      ${[['sample','Sample and acquisition'],['references','Reference spectrum overlays'],['notebook','Acquisition notebook']].map(([id,label])=>`<button type="button" class="bench-task-button" id="ftir-tab-${id}" role="tab" data-ftir-tab="${id}" aria-selected="${ftirTab===id}" aria-controls="ftir-panel-${id}" tabindex="${ftirTab===id?0:-1}">${label}</button>`).join('')}
    </div>
    <section class="uv-tab-panel" id="ftir-panel-sample" role="tabpanel" aria-labelledby="ftir-tab-sample" ${ftirTab==='sample'?'':'hidden'}>
    <fieldset ${ftirBusy?'disabled':''}><div class="uv-fields">
      <label>ATR sample<select id="ftirSample">${Object.entries(ftirSamples).map(([id,item])=>`<option value="${id}" ${id===ftir.sample?'selected':''}>${item.name} · ${item.formula}</option>`).join('')}</select></label>
      <label>Resolution / cm⁻¹<select id="ftirResolution">${[2,4,8,16].map(value=>`<option ${value===ftir.resolution?'selected':''}>${value}</option>`).join('')}</select></label>
      <label>Co-added scans<select id="ftirScans">${[4,8,16,32].map(value=>`<option ${value===ftir.scans?'selected':''}>${value}</option>`).join('')}</select></label>
      <label>Display<select id="ftirDisplay"><option value="transmittance" ${ftir.display==='transmittance'?'selected':''}>% Transmittance</option><option value="absorbance" ${ftir.display==='absorbance'?'selected':''}>Absorbance</option></select></label>
    </div></fieldset>
    <p>Use a clean ATR crystal for the background, then ${sample.solid?'press the solid sample against the crystal using the ATR pressure arm.':'place the selected liquid sample in contact with the crystal.'} Changing resolution requires a fresh background.</p>
    <p class="muted">The model uses representative bands and simulated intensities. Each co-added scan contributes to the full spectrum. Compare with the experimental reference for the actual sample conditions.</p>
    <a href="${ftirReference(sample)}" target="_blank" rel="noopener">Selected sample reference ↗</a>
  </section>
  <section class="uv-tab-panel" id="ftir-panel-references" role="tabpanel" aria-labelledby="ftir-tab-references" ${ftirTab==='references'?'':'hidden'}>${references}</section>
  <section class="uv-tab-panel" id="ftir-panel-notebook" role="tabpanel" aria-labelledby="ftir-tab-notebook" ${ftirTab==='notebook'?'':'hidden'}>
    <div class="ch-actions"><button class="btn secondary small" data-ftir="export" ${run?'':'disabled'}>Export latest spectrum CSV</button>
    <button class="btn secondary small" data-ftir="clear" ${run&&!ftirBusy?'':'disabled'}>Clear saved runs</button></div>
    <div class="uv-table"><table class="table"><thead><tr><th>Sample</th><th>Resolution / cm⁻¹</th><th>Scans</th><th>Bands / cm⁻¹</th></tr></thead><tbody>
      ${ftir.runs.slice().reverse().map(record=>`<tr><td>${ftirSamples[record.sample].name}</td><td>${record.resolution}</td><td>${record.scans}</td><td>${record.peaks.map(band=>band.wavenumber).join(', ')}</td></tr>`).join('')||'<tr><td colspan="4">No samples run yet.</td></tr>'}
    </tbody></table></div></section></section>`;
}
function ftirRefresh(){ftirSave();if(page==='ftir')render();}
function ftirAcquire(kind){
  if(ftirBusy)return;
  if(kind==='run'&&ftirBackground?.key!==ftirKey()){
    ftirStatus='Collect a background with the current resolution before running a sample.';
    ftirRefresh();
    return;
  }
  if(kind==='run')ftirView='sample';
  ftirBusy=kind;
  ftirProgress=0;
  const {sample,resolution,scans}=ftir;
  const start=performance.now(),duration=kind==='background'?1600:1200+scans*150;
  ftirStatus=kind==='background'?'Collecting clean crystal background…':'Acquiring '+ftirSamples[sample].name+' across the full spectrum…';
  ftirRefresh();
  ftirTimer=setInterval(()=>{
    ftirProgress=Math.min(100,Math.floor(100*(performance.now()-start)/duration));
    if(page==='ftir'){
      const progress=document.getElementById('ftirProgress');
      if(progress)progress.value=ftirProgress;
    }
    if(ftirProgress<100)return;
    clearInterval(ftirTimer);
    ftirTimer=null;
    ftirBusy='';
    if(kind==='background'){
      ftirBackground=ftirCollectBackground(resolution);
      ftirView='background';
      ftirStatus='Background ready. The clean crystal trace is displayed. Select a sample and run.';
    }else{
      const points=ftirSpectrum(ftirSamples[sample],resolution,scans);
      ftir.runs.push({sample,resolution,scans,points,peaks:ftirPeaks(ftirSamples[sample],points)});
      ftir.runs=ftir.runs.slice(-30);
      ftirPeak=0;
      ftirStatus='Spectrum ready. Select a characteristic band to inspect it.';
    }
    ftirRefresh();
  },100);
}
function ftirExport(){
  const run=ftir.runs.at(-1);
  if(!run)return;
  const csv=['Wavenumber_cm-1,Absorbance,Transmittance_percent',...run.points.map(([w,a])=>[w,a,(100*10**(-a)).toFixed(4)].join(','))].join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  const link=document.createElement('a');link.href=url;link.download='SIMLAB-FTIR-'+run.sample+'.csv';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function ftirBind(){
  if(page!=='ftir')return;
  const tabs=[...document.querySelectorAll('[data-ftir-tab]')];
  function activate(index){
    ftirTab=tabs[index].dataset.ftirTab;
    tabs.forEach((tab,i)=>{
      tab.setAttribute('aria-selected',String(index===i));
      tab.tabIndex=index===i?0:-1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden=index!==i;
    });
    tabs[index].focus();
  }
  tabs.forEach((tab,index)=>{
    tab.onclick=()=>activate(index);
    tab.onkeydown=event=>{
      const next={ArrowLeft:(index+tabs.length-1)%tabs.length,ArrowRight:(index+1)%tabs.length,Home:0,End:tabs.length-1};
      if(!Object.hasOwn(next,event.key))return;
      event.preventDefault();
      activate(next[event.key]);
    };
  });
  document.querySelectorAll('[data-ftir-reference]').forEach(control=>control.onchange=()=>{
    const id=control.dataset.ftirReference;
    const overlays=new Set(ftir.overlays);
    if(control.checked)overlays.add(id);else overlays.delete(id);
    ftir.overlays=[...overlays];
    ftirView='sample';
    ftirRefresh();
    document.querySelector('[data-ftir-reference="'+id+'"]')?.focus();
  });
  document.querySelectorAll('[data-ftir-colour]').forEach(control=>control.oninput=()=>{
    const id=control.dataset.ftirColour;
    if(!/^#[0-9a-f]{6}$/i.test(control.value))return;
    ftir.referenceColours[id]=control.value;
    ftirSave();
    const swatch=control.parentElement.querySelector('label i');
    if(swatch)swatch.style.borderColor=control.value;
    if(ftirView!=='background'||!ftirBackground){
      const run=ftir.runs.at(-1);
      document.getElementById('ftirPlot').innerHTML=ftirPlot(run);
      const legend=document.getElementById('ftirOverlayLegend');
      if(legend)legend.outerHTML=ftirOverlayLegend(run);
    }
  });
  const bind=(id,callback)=>{const node=document.getElementById(id);if(node)node.onchange=()=>callback(node.value);};
  bind('ftirSample',value=>{ftir.sample=value;ftirRefresh();});
  bind('ftirResolution',value=>{ftir.resolution=Number(value);ftirBackground=null;ftirStatus='Resolution changed. Collect a new background.';ftirRefresh();});
  bind('ftirScans',value=>{ftir.scans=Number(value);ftirRefresh();});
  bind('ftirDisplay',value=>{ftir.display=value;ftirRefresh();});
  bind('ftirPeak',value=>{ftirPeak=Number(value);ftirRefresh();document.getElementById('ftirPeak')?.focus();});
  document.querySelectorAll('[data-ftir]').forEach(button=>button.onclick=()=>{
    const action=button.dataset.ftir;
    if(action==='overlay'){ftirView='sample';ftirTab='references';ftirRefresh();document.getElementById('ftirPlot')?.scrollIntoView({block:'nearest'});return;}
    if(action==='view'&&!ftirBusy){ftirView=ftirView==='background'?'sample':'background';ftirRefresh();return;}
    if(action==='background'||action==='run'){ftirAcquire(action);return;}
    if(action==='stop'){
      clearInterval(ftirTimer);ftirTimer=null;ftirBusy='';ftirProgress=0;
      ftirStatus='Acquisition stopped. Completed spectra are kept.';ftirRefresh();
    }else if(action==='export')ftirExport();
    else if(action==='clear'&&!ftirBusy&&window.confirm('Delete all saved FTIR runs?')){
      ftir.runs=[];ftirPeak=0;ftirStatus='FTIR notebook cleared.';ftirRefresh();
    }
  });
}
