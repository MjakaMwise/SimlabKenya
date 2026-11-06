// Synthetic reference solutions: spectral parameters are educational, not certified data.
const uvProfiles={uv:{name:'UV reference A · synthetic',peak:275,width:19,epsilon:12000,color:'#cebfea'},orange:{name:'Orange reference B · synthetic',peak:430,width:35,epsilon:18000,color:'#f2b55d'},blue:{name:'Blue reference C · synthetic',peak:630,width:42,epsilon:40000,color:'#6baed6'}};
Object.assign(uvProfiles,{
  drugParacetamol:{name:'Paracetamol · teaching profile',peak:243,width:15,epsilon:12000,color:'#e1f2ef'},
  drugCaffeine:{name:'Caffeine · teaching profile',peak:271,width:17,epsilon:10500,color:'#e1f2ef'},
  ionPhosphate:{name:'Orthophosphate · developed molybdenum blue',peak:650,width:36,epsilon:22000,color:'#6baed6'},
  ionNitrate:{name:'Nitrate · developed azo dye',peak:543,width:24,epsilon:28000,color:'#e795b7'},
  ionNitrite:{name:'Nitrite · developed azo dye',peak:543,width:24,epsilon:28000,color:'#e795b7'},
  ionSilica:{name:'Reactive silica · developed molybdate blue',peak:810,width:38,epsilon:13000,color:'#6baed6'}
});
const uvDefault=()=>({power:false,ready:false,blank:null,wavelength:430,start:350,end:750,path:1,material:'quartz',solvent:'water',selected:'',loaded:null,vials:[],records:[],nextSpectrumId:1,overlayIds:null,peakChoice:null,scan:null,result:null,message:'Prepare samples, click Auto zero, then Run.',prep:{name:'Standard',type:'standard',profile:'orange',stock:100,aliquot:1,final:25,dilution:1}});
let uv=uvDefault();try{const s=JSON.parse(localStorage.getItem('simlab-uv-v1'));if(s)uv={...uv,...s,power:false,ready:false,blank:null,loaded:null,message:'Saved samples and results restored. Click Auto zero before running.'};}catch{}
let uvBusy=false,uvTimer=null,uvActiveRun=null;
const uvScanDurationMs=30000;
function uvSave(){try{localStorage.setItem('simlab-uv-v1',JSON.stringify(uv));}catch{}}
function uvRefresh(save=true){if(save)uvSave();if(page==='uvvis')render();}
function uvSignature(){return JSON.stringify([uv.path,uv.material,uv.solvent,uv.start,uv.end]);}
function uvKey(profile){return JSON.stringify([profile,uv.wavelength,uv.path,uv.material,uv.solvent]);}
function uvEpsilon(profile,w){const p=uvProfiles[profile];return p.epsilon*Math.exp(-.5*((w-p.peak)/p.width)**2);}
function uvAbs(v,w){return uvEpsilon(v.profile,w)*uv.path*v.concentration*1e-6;}
function uvValidRange(a,b){return Number.isFinite(a)&&Number.isFinite(b)&&a>=200&&b<=900&&a<=b&&(uv.material==='quartz'||a>=350);}
function uvFit(points){if(new Set(points.map(p=>p.concentration)).size<3)return null;const n=points.length,x=points.reduce((s,p)=>s+p.concentration,0)/n,y=points.reduce((s,p)=>s+p.a,0)/n;const xx=points.reduce((s,p)=>s+(p.concentration-x)**2,0),xy=points.reduce((s,p)=>s+(p.concentration-x)*(p.a-y),0);if(!xx)return null;const slope=xy/xx,intercept=y-slope*x,ss=points.reduce((s,p)=>s+(p.a-y)**2,0),err=points.reduce((s,p)=>s+(p.a-(slope*p.concentration+intercept))**2,0);return {slope,intercept,r2:ss?1-err/ss:1,min:Math.min(...points.map(p=>p.concentration)),max:Math.max(...points.map(p=>p.concentration))};}
function uvSameCalibrationConditions(record,profile){
  return record.profile===profile&&record.path===uv.path&&record.material===uv.material&&record.solvent===uv.solvent;
}
function uvRecordAbsorbance(record,wavelength){
  if(record.wavelength===wavelength)return record.a;
  const spectrum=record.spectrum;
  if(!spectrum?.values?.length)return null;
  const offset=wavelength-spectrum.start;
  if(offset<0||offset>spectrum.values.length-1)return null;
  const lower=Math.floor(offset),upper=Math.ceil(offset);
  return spectrum.values[lower]+(spectrum.values[upper]-spectrum.values[lower])*(offset-lower);
}
function uvStandards(profile){
  return uv.records.filter(record=>record.type==='standard'&&uvSameCalibrationConditions(record,profile))
    .map(record=>({...record,a:uvRecordAbsorbance(record,uv.wavelength)}))
    .filter(record=>Number.isFinite(record.a)&&record.a>=0&&record.a<=2);
}
function uvCalibrationPeak(profile){
  const peaks=uv.records.filter(record=>record.type==='standard'&&uvSameCalibrationConditions(record,profile))
    .flatMap(record=>record.peaks||[])
    .filter(([wavelength,absorbance])=>wavelength>=uv.start&&wavelength<=uv.end&&absorbance>0&&absorbance<=2);
  return peaks.reduce((best,peak)=>!best||peak[1]>best[1]?peak:best,null);
}
function uvCheck(scan=false){if(!uv.ready)return 'Power on and wait for lamp stabilization.';if(!uv.loaded)return 'Load a vial into the cuvette holder.';if(uv.loaded.solvent!==uv.solvent)return 'The loaded vial solvent does not match the method solvent.';if(!uv.blank||uv.blank!==uvSignature())return 'Load a matching solvent blank and click Blank / zero first.';if(!uvValidRange(scan?uv.start:uv.wavelength,scan?uv.end:uv.wavelength))return 'Use 200–900 nm with quartz, or 350–900 nm with the teaching glass cuvette. Scan start must not exceed end.';return '';}
function uvPlot(points,xlabel,ylabel,color='#087e67',dots=false,fit=null,bounds=null){if(!points.length&&!bounds)return '<p class="muted">No data yet.</p>';let xmin=bounds?.start??Math.min(...points.map(p=>p[0])),xmax=bounds?.end??Math.max(...points.map(p=>p[0]));if(xmax===xmin)xmax=xmin+1;const ymax=Math.max(.1,bounds?.maxAbsorbance??0,...points.map(p=>p[1]))*1.12;const X=x=>55+(x-xmin)/(xmax-xmin)*660,Y=y=>235-y/ymax*200;return `<svg viewBox="0 0 760 280" role="img" aria-label="${xlabel} versus ${ylabel}" class="uv-chart"><path d="M55 25V235H725" fill="none" stroke="#b5c6bd"/>${[0,.25,.5,.75,1].map(t=>`<text x="48" y="${Y(ymax*t)+4}" text-anchor="end">${(ymax*t).toFixed(2)}</text>`).join('')}${[0,.25,.5,.75,1].map(t=>`<text x="${55+t*660}" y="252" text-anchor="middle">${(xmin+t*(xmax-xmin)).toFixed(0)}</text>`).join('')}${dots?points.map(p=>`<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="4" fill="${color}"/>`).join(''):`<polyline points="${points.map(p=>`${X(p[0])},${Y(p[1])}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5"/>`}${fit?`<path d="M${X(fit.min)} ${Y(fit.slope*fit.min+fit.intercept)} L${X(fit.max)} ${Y(fit.slope*fit.max+fit.intercept)}" stroke="${color}" stroke-width="1.5" fill="none"/>`: ''}<text x="390" y="274" text-anchor="middle">${xlabel}</text><text x="58" y="17">${ylabel}</text></svg>`;}
function uvField(label,key,value,min,max,step='any'){return `<label>${label}<input data-uv="${key}" type="number" value="${value}" min="${min}" max="${max}" step="${step}"></label>`;}
function uvSelect(label,key,value,options){return `<label>${label}<select data-uv="${key}">${options.map(([v,t])=>`<option value="${v}" ${v===value?'selected':''}>${t}</option>`).join('')}</select></label>`;}
let uvActiveTab='samples';
function uvTabs(sections){
  const tabs=sections.map(([key,label])=>{
    const active=key===uvActiveTab;
    return `<button type="button" class="bench-task-button" id="uv-tab-${key}" role="tab" data-uv-tab="${key}" aria-controls="uv-panel-${key}" aria-selected="${active}" tabindex="${active?0:-1}">${label}</button>`;
  }).join('');
  const panels=sections.map(([key,label,content])=>
    `<section class="uv-tab-panel" id="uv-panel-${key}" role="tabpanel" aria-labelledby="uv-tab-${key}" tabindex="0" ${key===uvActiveTab?'':'hidden'}><h2>${label}</h2>${content}</section>`).join('');
  return `<section class="panel uv-panel uv-tab-workspace"><div class="uv-tablist" role="tablist" aria-label="UV–Vis workspace">${tabs}</div>${panels}</section>`;
}
function uvBindTabs(){
  const tabs=[...document.querySelectorAll('[data-uv-tab]')];
  function activate(index){
    uvActiveTab=tabs[index].dataset.uvTab;
    tabs.forEach((tab,i)=>{
      tab.setAttribute('aria-selected',String(i===index));
      tab.tabIndex=i===index?0:-1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden=i!==index;
    });
    tabs[index].focus();
  }
  tabs.forEach((tab,index)=>{
    tab.onclick=()=>activate(index);
    tab.onkeydown=event=>{
      const targets={ArrowLeft:(index+tabs.length-1)%tabs.length,ArrowRight:(index+1)%tabs.length,Home:0,End:tabs.length-1};
      if(!Object.hasOwn(targets,event.key))return;
      event.preventDefault();
      activate(targets[event.key]);
    };
  });
}
function uvVisible(){
  const queued=uv.vials.filter(vial=>vial.queued!==false);
  const review=uvBusy?'':uvOverlayPanel();
  const prep=uv.prep;
  const profile=uv.loaded?.profile||prep.profile;
  const standards=uvStandards(profile);
  const fit=uvFit(standards);
  const calibrationPeak=uvCalibrationPeak(profile);
  const disabled=uvBusy?'disabled':'';
  const nm=(value,places=0)=>value==null?'—':value.toFixed(places);
  const vial=uv.loaded;
  const cellColour=uvProfiles[vial?.profile]?.color||'#e1f2ef';
  const settings=`<div class="uv-optics" role="img" aria-label="Light travels from the lamps through the monochromator and cuvette to the detector">
    <span>☀<small>D₂ / tungsten lamps</small></span><b aria-hidden="true">→</b>
    <span>◈<small>Monochromator</small></span><b aria-hidden="true">→</b>
    <span class="uv-cell" style="--sample:${cellColour}">▯<small>${esc(vial?.name||'Empty cuvette holder')}</small></span><b aria-hidden="true">→</b>
    <span>▥<small>Detector</small></span>
  </div><fieldset ${disabled}><div class="uv-fields">
    ${uvField('Measurement wavelength / nm','wavelength',uv.wavelength,200,900,1)}
    ${uvField('Optical path / cm','path',uv.path,.1,5)}
    ${uvSelect('Cuvette','material',uv.material,[['quartz','Quartz · UV, visible and near-IR'],['glass','Glass · visible and near-IR']])}
    ${uvSelect('Method solvent','solvent',uv.solvent,[['water','Water'],['ethanol','Ethanol'],['phosphate78','Phosphate buffer · pH 7.8'],['phosphateReagent','Phosphate method reagent blank'],['nitrogenReagent','Nitrate / nitrite method reagent blank'],['silicaReagent','Silica method reagent blank']])}
    <p>Scan range: <b>${uv.start}–${uv.end} nm</b>. Change it with Baseline.</p>
    </div><button class="btn secondary small" data-uv-action="peak">Use last scan maximum as measurement wavelength</button></fieldset>
    <p>Auto zero uses a blank with the current solvent and cuvette settings. After changing either, or the optical path, zero again.</p>`;
  const preparation=`<button class="btn secondary small" type="button" data-go="analysislibrary">Open analytical library</button><fieldset ${disabled}><div class="uv-fields">
    <label>Vial name<input data-uv-prep="name" value="${esc(prep.name)}" maxlength="60"></label>
    ${uvSelect('Reference solution','prep.profile',prep.profile,Object.entries(uvProfiles).map(([key,value])=>[key,value.name]))}
    ${uvSelect('Sample role','prep.type',prep.type,[['standard','Calibration standard'],['unknown','Unknown sample']])}
    ${uvField('Stock concentration / µM','prep.stock',prep.stock,0,100000)}
    ${uvField('Stock aliquot / mL','prep.aliquot',prep.aliquot,.001,10000)}
    ${uvField('Final volume / mL','prep.final',prep.final,.001,10000)}
    ${uvField('Prior dilution factor','prep.dilution',prep.dilution,1,100000)}
    </div><div class="ch-actions"><button class="btn" data-uv-action="prepare">Add sample to table</button>
    <button class="btn secondary" data-uv-action="practice">Create practice set</button></div></fieldset>
    <p>Prepared concentration uses C₂ = C₁V₁ / V₂. The practice set adds five standards and one unknown. The table hides unknown concentrations.</p>`;
  const rows=uv.vials.map((vial,index)=>`<tr>
    <td><input type="checkbox" aria-label="Include sample ${index+1} in run" data-uv-queue="${vial.id}" ${vial.queued!==false?'checked':''} ${disabled}></td>
    <td>${index+1}</td><td>${esc(vial.name)}</td><td>${vial.type}</td><td>${esc(vial.solvent)}</td>
    <td>${vial.type==='standard'?nm(vial.concentration,4):'—'}</td>
    <td><button class="btn secondary small" type="button" data-uv-row="load" data-vial="${vial.id}" ${disabled}>Load only</button>
    <button class="btn secondary small" type="button" data-uv-row="remove" data-vial="${vial.id}" ${disabled}>Remove</button></td></tr>`).join('');
  const samples=`<p>Check the samples to run them in table order. <b>Load only</b> selects a single vial. Add standards before unknowns for calibration.</p>
    <div class="uv-table"><table class="table"><thead><tr><th>Run</th><th>#</th><th>Sample</th><th>Role</th><th>Solvent</th><th>Known µM</th><th>Actions</th></tr></thead>
    <tbody>${rows||'<tr><td colspan="7">No samples yet. Open Prepare samples to add a vial.</td></tr>'}</tbody></table></div>`;
  const data=`<div class="ch-actions"><button class="btn secondary small" data-uv-action="export">Export CSV</button><button class="btn secondary small" data-uv-action="clear-runs" ${disabled||(!uv.records.length?'disabled':'')}>Clear all run data</button></div>
    <div class="uv-table"><table class="table"><thead><tr><th>Sample</th><th>Role</th><th>Measurement / nm</th><th>Absorbance / A</th><th>Detected peaks / nm and A</th><th>Original unknown / µM</th><th>Notes</th><th>Action</th></tr></thead>
    <tbody>${uv.records.slice().reverse().map((record,index)=>`<tr><td>${esc(record.name)}</td><td>${record.type}</td>
    <td>${nm(record.wavelength)}</td><td>${nm(record.a,4)}</td><td>${record.peaks?.map(peak=>nm(peak[0])+' nm · '+nm(peak[1],4)+' A').join('<br>')||'—'}</td>
    <td>${nm(record.calculated,4)}</td><td>${esc(record.note||'')}</td><td><button class="btn secondary small" type="button" data-uv-delete-record="${uv.records.length-1-index}" aria-label="Delete run for ${esc(record.name)}" ${disabled}>Delete</button></td></tr>`).join('')||'<tr><td colspan="8">No samples have been run.</td></tr>'}</tbody></table></div>`;
  const calibration=`<p>${esc(uvProfiles[profile].name)} · ${uv.wavelength} nm · ${standards.length} measured standards</p>
    <p>All standards use absorbance at the same wavelength. When you change wavelength, saved scans that cover it are reused.</p>
    ${calibrationPeak?`<button class="btn secondary small" type="button" data-uv-action="calibration-peak" ${disabled}>Calibrate at standard peak · ${calibrationPeak[0]} nm</button>`:''}
    ${fit&&fit.slope<=1e-8?'<p class="notice">The absorbance response is too small at this wavelength. Choose a detected standard peak within the scan range.</p>':''}
    ${uvPlot(standards.map(record=>[record.concentration,record.a]),'Concentration / µM','Absorbance / A','#087e67',true,fit)}
    ${fit?`<p>Slope ${fit.slope.toFixed(6)} A/µM · R² ${fit.r2.toFixed(6)} · range ${fit.min.toFixed(2)}–${fit.max.toFixed(2)} µM</p>`:'<p>Run three or more distinct standard concentrations under the same conditions.</p>'}
    <details><summary>Unknown answer key</summary>${uv.vials.filter(vial=>vial.type==='unknown').map(vial=>`<p>${esc(vial.name)} · ${nm(vial.concentration*vial.dilution,4)} µM before dilution</p>`).join('')}</details>`;
  return `${head('VIRTUAL INSTRUMENT','UV–Visible spectroscopy','Prepare samples, scan each spectrum in about 30 seconds, and quantify unknowns against measured standards.')}
    <section class="panel uv-panel uv-live">
      <div class="sectionhead"><h2>${review?'Spectrum review':'Live wavelength scan'}</h2><span class="statbadge">${uvBusy?'RUNNING':uv.blank===uvSignature()?'ZEROED':'AUTO ZERO REQUIRED'}</span></div>
      ${review||`<div id="uvLivePlot">${uvLivePlotHtml()}</div>`}
      <div class="ch-actions"><button class="btn secondary" data-uv-action="autozero" ${disabled}>Auto zero</button>
      <button class="btn secondary" id="uvBaselineOpen" type="button" ${disabled}>Baseline</button>
      <button class="btn" data-uv-action="${uvActiveRun?'stop':'run'}" ${!uvActiveRun&&(uvBusy||!queued.length)?'disabled':''}>${uvActiveRun?'Stop':'Run'+(queued.length?' ('+queued.length+')':'')}</button></div>
      <p class="notice" id="uvLiveStatus" role="status">${esc(uv.message)}</p>
      <dialog class="uv-baseline-dialog" id="uvBaselineDialog" aria-labelledby="uvBaselineTitle">
        <form id="uvBaselineForm">
          <h2 id="uvBaselineTitle">Baseline scan range</h2>
          <p>Set the wavelength range for the sample scan and its matching solvent blank. If the measurement wavelength is outside the range, SIMLAB moves it to the midpoint.</p>
          <div class="uv-fields">
            <label>Start wavelength / nm<input name="start" type="number" min="${uv.material==='quartz'?200:350}" max="899" step="1" value="${uv.start}" required></label>
            <label>End wavelength / nm<input name="end" type="number" min="${uv.material==='quartz'?201:351}" max="900" step="1" value="${uv.end}" required></label>
          </div>
          <p class="muted">Blank: ${esc(uv.solvent)} · ${uv.material} · ${uv.path} cm</p>
          <p id="uvBaselineError" role="alert"></p>
          <div class="ch-actions"><button class="btn secondary" type="button" id="uvBaselineCancel">Cancel</button>
            <button class="btn" type="submit">Set range and collect baseline</button></div>
        </form>
      </dialog>
    </section>
    ${uvTabs([
      ['samples','Sample run table · '+queued.length+' selected',samples],
      ['prepare','Prepare samples',preparation],
      ['method','Instrument settings',settings],
      ['results','Run data &amp; detected peaks · '+uv.records.length,data],
      ['calibration','Calibration &amp; unknowns',calibration],
      ['help','Run guide','<ol><li>Set the solvent and measurement wavelength in Instrument settings. Use Baseline to choose the scan range.</li><li>Prepare vials and check the rows to run.</li><li>Click Auto zero, then Run. Open Run data &amp; detected peaks to review the results.</li></ol><p>The reference profiles use synthetic Gaussian bands. The drug and inorganic profiles use published wavelengths and simulated absorbance. Inorganic vials represent colour-developed solutions. See Drugs &amp; organic analysis for source conditions.</p>'],
      ['reset','Reset session','<p>Clear the sample table, all UV–Vis run data, spectra, calibration and settings on this device. Export your run data first if you want a copy.</p><button class="btn secondary" type="button" data-uv-action="reset">Clear UV–Vis session and start new</button>']
    ])}`;
}
function uvAddVial(v){if(uv.vials.length>=30)throw Error('Rack is full (30 vials). Reloading keeps saved vials.');v.id='uv'+Date.now()+Math.random().toString(36).slice(2,7);uv.vials.push(v);uv.selected=v.id;}
function uvBind(){if(page!=='uvvis')return;uvBindOverlay();uvBindBaseline();
  document.querySelectorAll('[data-uv-delete-record]').forEach(button=>button.onclick=()=>uvDeleteRuns(Number(button.dataset.uvDeleteRecord)));document.querySelectorAll('[data-uv],[data-uv-prep]').forEach(el=>el.onchange=()=>{const k=el.dataset.uv||'prep.'+el.dataset.uvPrep;let val=el.type==='number'?Number(el.value):el.value;if(el.type==='number'&&(!Number.isFinite(val)||el.value.trim()===''||val<Number(el.min)||val>Number(el.max))){uv.message='Enter a finite value within the displayed input limits.';uvRefresh();return;}if(k.startsWith('prep.'))uv.prep[k.slice(5)]=val;else{uv[k]=val;uv.result=null;}uvRefresh();});uvBindTabs();
document.querySelectorAll('[data-uv-queue]').forEach(control=>control.onchange=()=>{
  const vial=uv.vials.find(item=>item.id===control.dataset.uvQueue);
  if(vial)vial.queued=control.checked;
  uvRefresh();
});
document.querySelectorAll('[data-uv-row]').forEach(button=>button.onclick=()=>{
  const vial=uv.vials.find(item=>item.id===button.dataset.vial);
  if(!vial||uvBusy)return;
  uv.selected=vial.id;
  if(button.dataset.uvRow==='load'){
    for(const item of uv.vials)item.queued=item===vial;
    uvAction('load');
  }else uvAction('remove');
});document.querySelectorAll('[data-uv-action]').forEach(b=>b.onclick=()=>uvAction(b.dataset.uvAction));}
function uvRecordCurrent(peaks=[],spectrum=null){const v=uv.loaded,a=v.type==='blank'?0:uvAbs(v,uv.wavelength),r={name:v.name,type:v.type,profile:v.profile,key:uvKey(v.profile),concentration:v.type==='standard'?v.concentration:null,a,wavelength:uv.wavelength,path:uv.path,solvent:uv.solvent,material:uv.material,calculated:null,peaks,note:'Measured against the solvent blank.',time:new Date().toISOString()};if(a>2)r.note='Above 2 A: dilute the sample and repeat. Excluded from calibration.';else if(v.type==='unknown'){const fit=uvFit(uvStandards(v.profile));if(!fit||fit.slope<=1e-8)r.note='A usable calibration with three distinct measured levels is required.';else{const c=(a-fit.intercept)/fit.slope;if(c<fit.min||c>fit.max)r.note='Outside the measured calibration range: prepare suitable standards or dilute and repeat.';else{r.calculated=c*v.dilution;r.note=`Cuvette concentration ${c.toFixed(4)} µM × prior dilution ${v.dilution} = original ${r.calculated.toFixed(4)} µM.`;}}}if(spectrum){r.spectrum=spectrum;r.spectrumId=uv.nextSpectrumId++;}uv.records.push(r);uv.records=uv.records.slice(-200);uv.result=r;uv.message=r.note;}
function uvAction(action){if(action==='reset'){uvResetSession();return;}if(action==='stop'){uvStopRun();return;}if(action==='clear-runs'){uvDeleteRuns();return;}if(uvBusy&&action!=='export')return;try{if(action==='autozero')uvAutoZero();
else if(action==='run')uvRunQueue();
else if(action==='power'){uv.power=!uv.power;uv.ready=false;uv.blank=null;if(uv.power){uvBusy=true;uv.message='Lamp stabilization in progress (accelerated)…';uvTimer=setTimeout(()=>{uv.ready=true;uvBusy=false;uv.message='Lamps ready. Load solvent blank, then Blank / zero.';uvRefresh();},1600);}else uv.message='Instrument powered off.';}
else if(action==='blank-vial'){uv.loaded={name:uv.solvent+' solvent blank',type:'blank',solvent:uv.solvent};uv.result=null;uv.message='Solvent blank loaded. Close the virtual holder by clicking Blank / zero.';}
else if(action==='blank'){if(!uv.ready)throw Error('Power on and wait for the lamps.');if(uv.loaded?.type!=='blank'||uv.loaded.solvent!==uv.solvent)throw Error('Load a matching solvent blank first.');uv.blank=uvSignature();uv.message='Baseline collected across the cuvette operating range. Blank set to 0 A / 100%T.';}
else if(action==='prepare'){const p=uv.prep;if(!(p.stock>0&&p.aliquot>0&&p.final>=p.aliquot&&p.dilution>=1))throw Error('Use positive stock and aliquot; final volume must be at least the aliquot, and dilution factor ≥1.');uvAddVial({name:p.name.trim()||'Prepared vial',type:p.type,profile:p.profile,solvent:uv.solvent,concentration:p.stock*p.aliquot/p.final,dilution:p.type==='unknown'?p.dilution:1});uv.message='Sample added to the run table. Auto zero, then click Run.';}
else if(action==='practice'){if(uv.vials.length>24)throw Error('Practice set needs six free vial positions.');const profile=uv.prep.profile,peak=uvProfiles[profile].peak;uv.wavelength=peak;uv.start=peak<350?Math.max(200,peak-50):peak>=750?peak-70:350;uv.end=peak<350?peak+80:peak>=750?Math.min(900,peak+70):750;uv.material='quartz';uv.path=1;for(const c of [2,5,10,15,20])uvAddVial({name:'Standard '+c+' µM',type:'standard',profile,concentration:c,solvent:uv.solvent,dilution:1});uvAddVial({name:'Unknown '+String.fromCharCode(65+Math.floor(Math.random()*26)),type:'unknown',profile,concentration:7+Math.random()*6,solvent:uv.solvent,dilution:1});uv.message='Practice vials ready. Auto zero, then click Run to measure the queued standards and unknown.';}
else if(action==='remove'){const id=uv.selected;if(!uv.vials.some(v=>v.id===id))throw Error('Select a vial to remove.');uv.vials=uv.vials.filter(v=>v.id!==id);uv.selected='';if(uv.loaded?.id===id)uv.loaded=null;uv.message='Vial removed from rack. Notebook measurements retained.';}
else if(action==='load'){const v=uv.vials.find(v=>v.id===uv.selected);if(!v)throw Error('Select a prepared vial.');uv.loaded={...v};uv.result=null;uv.message=v.name+' loaded into the holder.';}
else if(action==='measure'){const error=uvCheck();if(error)throw Error(error);uvRecordCurrent();}
else if(action==='scan'){const error=uvCheck(true);if(error)throw Error(error);if(uv.loaded.type==='blank')throw Error('Load a prepared sample for its spectrum.');const v={...uv.loaded},from=uv.start,to=uv.end;uv.scan={name:v.name,path:uv.path,solvent:uv.solvent,points:[]};uvBusy=true;let w=from;uvTimer=setInterval(()=>{for(let i=0;i<8&&w<=to;i++,w+=1)uv.scan.points.push([w,uvAbs(v,w)]);if(w>to){clearInterval(uvTimer);uvBusy=false;uv.message='Scan complete. Select the maximum wavelength, then measure standards at the same settings.';}uvRefresh();},45);}
else if(action==='calibration-peak'){const peak=uvCalibrationPeak(uv.loaded?.profile||uv.prep.profile);if(!peak)throw Error('Run a standard with a detectable peak in the scan range.');uv.wavelength=peak[0];uv.result=null;uv.message='Calibration wavelength set to '+peak[0]+' nm using saved standard scans.';}
else if(action==='peak'){if(!uv.scan?.points.length||uvBusy)throw Error('Complete a wavelength scan first.');const peak=uv.scan.points.reduce((p,q)=>q[1]>p[1]?q:p);if(peak[1]<=0)throw Error('No absorbing peak found.');uv.wavelength=peak[0];uv.result=null;uv.message='Measurement wavelength set to '+peak[0]+' nm.';}
else if(action==='export'){const rows=[['Vial','Role','Reference','Wavelength_nm','Path_cm','Solvent','Known_concentration_uM','Absorbance','Transmittance_percent','Original_unknown_uM','Peak_wavelengths_nm','Peak_absorbances_A','Note','Timestamp'],...uv.records.map(r=>[r.name,r.type,r.profile||'',r.wavelength,r.path,r.solvent,r.concentration??'',r.a,100*10**(-r.a),r.calculated??'',r.peaks?.map(peak=>peak[0]).join(' | ')||'',r.peaks?.map(peak=>peak[1]).join(' | ')||'',r.note,r.time])];const csv=rows.map(r=>r.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const link=document.createElement('a');link.href=url;link.download='SIMLAB-UV-Visible.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
}catch(e){uv.message=e.message;}uvRefresh();}

function uvAutoZero(){
  const zero=()=>{
    uv.power=true;
    uv.ready=true;
    uv.blank=uvSignature();
    uv.loaded={name:uv.solvent+' solvent blank',type:'blank',solvent:uv.solvent};
    uv.result=null;
    uvBusy=false;
    uv.message='Auto zero complete. Run the selected samples.';
    uvRefresh();
  };
  if(uv.ready){zero();return;}
  uvBusy=true;
  uv.power=true;
  uv.message='Stabilizing the lamp and collecting the solvent blank…';
  uvTimer=setTimeout(zero,1600);
}
function uvDetectedPeaks(points){
  return points.filter((point,index)=>index>0&&index<points.length-1&&point[1]>0&&
    point[1]>points[index-1][1]&&point[1]>=points[index+1][1]);
}
function uvLivePlotHtml(){
  const label=uv.scan?esc(uv.scan.name)+' · '+esc(uv.scan.solvent):'The spectrum will appear here as a sample runs.';
  const progress=uvActiveRun?.progress;
  const progressLabel=progress==null?'':` · ${Math.floor(progress*100)}% of this sample`;
  return `<p>${label}${progressLabel}</p>${uvPlot(uv.scan?.points||[],'Wavelength / nm','Absorbance / A','#087e67',false,null,uvActiveRun?.bounds)}`;
}
function uvPaintLiveScan(){
  if(page!=='uvvis')return;
  const plot=document.getElementById('uvLivePlot');
  const status=document.getElementById('uvLiveStatus');
  if(plot)plot.innerHTML=uvLivePlotHtml();
  if(status&&status.textContent!==uv.message)status.textContent=uv.message;
}
function uvRunQueue(){
  const queue=uv.vials.filter(vial=>vial.queued!==false);
  if(!queue.length)throw Error('Select at least one sample in the run table.');
  if(!uv.ready||uv.blank!==uvSignature())throw Error('Click Auto zero with the current method settings before running samples.');
  if(!uvValidRange(uv.start,uv.end)||!uvValidRange(uv.wavelength,uv.wavelength))
    throw Error('Check the scan range and measurement wavelength against the cuvette range.');
  if(uv.wavelength<uv.start||uv.wavelength>uv.end)
    throw Error('Set a measurement wavelength within the baseline scan range in Instrument settings.');
  if(queue.some(vial=>vial.solvent!==uv.solvent))
    throw Error('All selected samples must use the method solvent. Uncheck any samples prepared in another solvent.');
  if(queue.some(vial=>!uvProfiles[vial.profile]||!Number.isFinite(vial.concentration)))
    throw Error('A selected vial has incomplete preparation data.');
  uvBusy=true;
  let index=0,wavelength,startedAt;
  const run={completed:[],lastScan:uv.scan};
  uvActiveRun=run;
  function loadNext(){
    const vial=queue[index];
    uv.loaded={...vial};
    uv.selected=vial.id;
    uv.scan={name:vial.name,path:uv.path,solvent:uv.solvent,points:[]};
    wavelength=uv.start;
    startedAt=performance.now();
    run.progress=0;
    const peak=uvProfiles[vial.profile].peak;
    run.bounds={start:uv.start,end:uv.end,maxAbsorbance:uvAbs(vial,Math.max(uv.start,Math.min(uv.end,peak)))};
    uv.message='Running '+(index+1)+' of '+queue.length+' · '+vial.name;
  }
  loadNext();
  uvTimer=setInterval(()=>{
    run.progress=Math.min(1,(performance.now()-startedAt)/uvScanDurationMs);
    const reached=run.progress===1?uv.end:Math.floor(uv.start+(uv.end-uv.start)*run.progress);
    for(;wavelength<=reached;wavelength++)uv.scan.points.push([wavelength,uvAbs(uv.loaded,wavelength)]);
    if(run.progress<1){uvPaintLiveScan();return;}
    const points=uv.scan.points;
    uvRecordCurrent(uvDetectedPeaks(points),{start:points[0][0],values:points.map(point=>Number(point[1].toPrecision(8)))});
    run.completed.push(uv.result.spectrumId);
    run.lastScan=uv.scan;
    uvSave();
    index++;
    if(index<queue.length){loadNext();uvPaintLiveScan();return;}
    clearInterval(uvTimer);
    uvBusy=false;
    uvActiveRun=null;
    uv.overlayIds=run.completed;
    uv.peakChoice=null;
    uv.message='Run complete. '+queue.length+' sample'+(queue.length===1?'':'s')+' recorded. Open Run data & detected peaks.';
    uvRefresh();
  },100);
}

const uvTraceColours=['#087e67','#2759a8','#b34d17','#983e8e','#75621b','#007485','#b02e49','#5d4ab2'];
function uvSpectrumPoints(record){
  return record.spectrum.values.map((absorbance,index)=>[record.spectrum.start+index,absorbance]);
}
function uvOverlayPlot(traces,selected){
  let min=Infinity,max=-Infinity,highest=.001;
  for(const {record} of traces){
    min=Math.min(min,record.spectrum.start);
    max=Math.max(max,record.spectrum.start+record.spectrum.values.length-1);
    for(const absorbance of record.spectrum.values)highest=Math.max(highest,absorbance);
  }
  if(!traces.length)return '<p>Select completed spectra to display the overlay.</p>';
  const width=Math.max(1,max-min),ceiling=highest*1.1;
  const x=wavelength=>58+(wavelength-min)/width*640;
  const y=absorbance=>230-absorbance/ceiling*208;
  const ticks=Array.from({length:5},(_,index)=>{
    const ratio=index/4,wavelength=min+width*ratio,absorbance=ceiling*ratio;
    return `<path d="M58 ${y(absorbance)}H698" stroke="#d7e5df"/>
      <text x="51" y="${y(absorbance)+4}" text-anchor="end">${absorbance.toPrecision(2)}</text>
      <text x="${x(wavelength)}" y="247" text-anchor="middle">${Math.round(wavelength)}</text>`;
  }).join('');
  const curves=traces.map(({record,colour})=>{
    const points=uvSpectrumPoints(record).map(([wavelength,absorbance])=>x(wavelength).toFixed(2)+','+y(absorbance).toFixed(2)).join(' ');
    return `<polyline points="${points}" fill="none" stroke="${colour}" stroke-width="2.4"/>`;
  }).join('');
  const markers=traces.map(({record,colour})=>record.peaks.map(([wavelength,absorbance],index)=>{
    const active=selected?.record.spectrumId===record.spectrumId&&selected.index===index;
    const label=record.name+' · '+wavelength+' nm · '+absorbance.toFixed(4)+' A';
    return `<circle class="uv-peak-marker" cx="${x(wavelength)}" cy="${y(absorbance)}" r="${active?7:5}" fill="${colour}" stroke="${active?'#17252d':'white'}" stroke-width="2"
      role="button" tabindex="0" data-uv-peak="${record.spectrumId}:${index}" aria-label="${esc(label)}" aria-pressed="${active}"><title>${esc(label)}</title></circle>`;
  }).join('')).join('');
  return `<svg class="uv-chart" viewBox="0 0 725 270" role="group" aria-label="Overlaid absorbance spectra">
    ${ticks}<path d="M58 22V230H698" fill="none" stroke="#748e83"/>
    ${curves}${markers}<text x="378" y="265" text-anchor="middle">Wavelength / nm</text>
    <text transform="translate(13 126) rotate(-90)" text-anchor="middle">Absorbance / A</text></svg>`;
}
function uvOverlayPanel(){
  const available=uv.records.filter(record=>record.spectrum?.values?.length);
  if(!available.length)return '';
  const checked=uv.overlayIds??available.slice(-6).map(record=>record.spectrumId);
  const traces=available.filter(record=>checked.includes(record.spectrumId))
    .map((record,index)=>({record,colour:uvTraceColours[index%uvTraceColours.length]}));
  const peaks=traces.flatMap(({record})=>record.peaks.map((peak,index)=>({record,peak,index,key:record.spectrumId+':'+index})));
  const selected=peaks.find(item=>item.key===uv.peakChoice)||peaks[0];
  const choices=available.map(record=>{
    const trace=traces.find(item=>item.record===record);
    return `<label><input type="checkbox" data-uv-overlay="${record.spectrumId}" ${trace?'checked':''}>
      <i style="background:${trace?.colour||'#b9c8c2'}"></i><span>${esc(record.name)} <small>· run ${record.spectrumId}</small></span></label>`;
  }).join('');
  const details=selected?`<dl class="uv-peak-details"><dt>Sample</dt><dd>${esc(selected.record.name)}</dd>
    <dt>Peak wavelength</dt><dd>${selected.peak[0]} nm</dd>
    <dt>Peak absorbance</dt><dd>${selected.peak[1].toFixed(4)} A</dd>
    <dt>Solvent and path</dt><dd>${esc(selected.record.solvent)} · ${selected.record.path} cm</dd></dl>
    ${uvPlot(uvSpectrumPoints(selected.record).filter(([wavelength])=>Math.abs(wavelength-selected.peak[0])<=12),'Wavelength / nm','Absorbance / A')}`
    :'<p>No interior peaks were detected in the displayed scans. Check the selected spectra and scan range.</p>';
  return `<div class="uv-review">
    <div class="uv-overlay"><h3>Spectrum overlay</h3>${uvOverlayPlot(traces,selected)}
      <div class="uv-overlay-list" aria-label="Spectra to overlay">${choices}</div></div>
    <div class="uv-inspector"><h3>Peak inspector</h3><p class="muted">Select a marker in the overlay or choose a peak below.</p>
      ${peaks.length?`<label>Detected peak<select id="uvPeakChoice">${peaks.map(item=>`<option value="${item.key}" ${item===selected?'selected':''}>${esc(item.record.name)} · run ${item.record.spectrumId} · ${item.peak[0]} nm</option>`).join('')}</select></label>`:''}
      ${details}</div></div>`;
}
function uvBindOverlay(){
  document.querySelectorAll('[data-uv-overlay]').forEach(control=>control.onchange=()=>{
    const available=uv.records.filter(record=>record.spectrum?.values?.length);
    const chosen=new Set(uv.overlayIds??available.slice(-6).map(record=>record.spectrumId));
    const id=Number(control.dataset.uvOverlay);
    if(control.checked)chosen.add(id);else chosen.delete(id);
    uv.overlayIds=[...chosen];
    uvRefresh();
    document.querySelector('[data-uv-overlay="'+id+'"]')?.focus();
  });
  const select=document.getElementById('uvPeakChoice');
  if(select)select.onchange=()=>{
    uv.peakChoice=select.value;
    uvRefresh();
    document.getElementById('uvPeakChoice')?.focus();
  };
  document.querySelectorAll('[data-uv-peak]').forEach(marker=>{
    const choose=()=>{
      uv.peakChoice=marker.dataset.uvPeak;
      uvRefresh();
      document.querySelector('[data-uv-peak="'+uv.peakChoice+'"]')?.focus();
    };
    marker.onclick=choose;
    marker.onkeydown=event=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();choose();}
    };
  });
}
function uvResetSession(){
  clearInterval(uvTimer);
  clearTimeout(uvTimer);
  uvTimer=null;
  uvBusy=false;
  uvActiveRun=null;
  uv=uvDefault();
  uvActiveTab='samples';
  uv.message='New UV–Vis session ready. Prepare samples, then click Auto zero.';
  uvRefresh();
}

function uvBindBaseline(){
  const dialog=document.getElementById('uvBaselineDialog');
  const form=document.getElementById('uvBaselineForm');
  const error=document.getElementById('uvBaselineError');
  document.getElementById('uvBaselineOpen').onclick=()=>{
    error.textContent='';
    form.elements.start.value=uv.start;
    form.elements.end.value=uv.end;
    dialog.showModal();
  };
  document.getElementById('uvBaselineCancel').onclick=()=>dialog.close();
  form.onsubmit=event=>{
    event.preventDefault();
    const start=form.elements.start.valueAsNumber,end=form.elements.end.valueAsNumber;
    if(!uvSetBaselineRange(start,end)){
      error.textContent='Enter whole wavelengths within the cuvette range. End must be greater than start.';
      return;
    }
    dialog.close();
    uvAction('autozero');
  };
}
function uvSetBaselineRange(start,end){
  if(!Number.isInteger(start)||!Number.isInteger(end)||start>=end||!uvValidRange(start,end))return false;
  uv.start=start;
  uv.end=end;
  if(uv.wavelength<start||uv.wavelength>end)uv.wavelength=Math.round((start+end)/2);
  return true;
}
function uvStopRun(){
  if(!uvActiveRun)return;
  const {completed,lastScan}=uvActiveRun;
  clearInterval(uvTimer);
  uvTimer=null;
  uvActiveRun=null;
  uvBusy=false;
  uv.scan=lastScan;
  uv.loaded=null;
  if(completed.length){
    uv.overlayIds=completed;
    uv.peakChoice=null;
  }
  uv.message='Run stopped. '+completed.length+' completed sample'+(completed.length===1?' was':'s were')+' kept. The incomplete scan was discarded.';
  uvRefresh();
}

function uvDeleteRuns(index){
  if(uvBusy||!uv.records.length)return;
  const clearAll=index===undefined;
  if(!clearAll&&(!Number.isInteger(index)||!uv.records[index]))return;
  const question=clearAll?'Delete all saved UV–Vis runs, spectra and calibration data?':'Delete the saved run for '+uv.records[index].name+'?';
  if(!window.confirm(question))return;
  if(clearAll)uv.records=[];
  else uv.records.splice(index,1);
  const retained=new Set(uv.records.map(record=>record.spectrumId));
  if(uv.overlayIds)uv.overlayIds=uv.overlayIds.filter(id=>retained.has(id));
  if(uv.overlayIds?.length===0)uv.overlayIds=null;
  uv.peakChoice=null;
  uv.scan=null;
  uv.result=null;
  uv.message=clearAll?'All saved run data cleared. Your sample table is ready for another run.':'Saved run deleted. Calibration now uses the remaining standards.';
  uvRefresh();
}
