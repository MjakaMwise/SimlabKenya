/* Bench preparation snapshots, conserved sample bottles and titre-based analysis. */
const benchTitInstrumentPairs = {
  redox:['FeSO4','KMnO4','Use the station’s acidified iron(II) model. Stop at the first persistent faint pink.'],
  iodine:['I2','Na2S2O3','The station models the starch endpoint. Starch is used near the endpoint; stop when the blue-black colour disappears.'],
  hypochlorite:['NaOCl','Na2S2O3','The simulated aliquot releases iodine when treated with excess potassium iodide and acetic acid. Titrate with thiosulfate, add starch near the endpoint, then continue to colourless.'],
  edta:['CaCl2','EDTA','The station models a buffered complexometric endpoint at pH 10. Watch for the change from wine red to blue.']
};
const benchTitChem={HCl:{name:'Hydrochloric acid',side:'acid'},NaOH:{name:'Sodium hydroxide',side:'base'},Na2CO3:{name:'Sodium carbonate',side:'base',primary:true},NaHCO3:{name:'Sodium bicarbonate',side:'base'},CH3COOH:{name:'Ethanoic acid',side:'acid'},H2SO4:{name:'Sulfuric acid',side:'acid'},KHC8H4O4:{name:'Potassium hydrogen phthalate',side:'acid',primary:true}};
const benchTitStocks={
  HCl:{role:'unknown',concentration:.1},
  NaOH:{role:'known',concentration:.1},
  H2SO4:{role:'unknown',concentration:.05},
  CH3COOH:{role:'unknown',concentration:.1},
  Na2CO3:{role:'unknown',concentration:.05},
  NaHCO3:{role:'unknown',concentration:.1},
  KHC8H4O4:{role:'unknown',concentration:.1},
  FeSO4:{name:'Iron(II) sulfate',role:'unknown',concentration:.1},
  KMnO4:{name:'Potassium permanganate',role:'known',concentration:.02},
  I2:{name:'Iodine solution',role:'unknown',concentration:.02},
  NaOCl:{name:'Sodium hypochlorite',role:'unknown',concentration:.04},
  Na2S2O3:{name:'Sodium thiosulfate',role:'known',concentration:.1},
  CaCl2:{name:'Calcium chloride',role:'unknown',concentration:.005},
  EDTA:{name:'EDTA solution',role:'known',concentration:.01}
};
function benchTitStockName(formula){return benchTitStocks[formula].name||benchTitChem[formula].name;}
function benchTitMethodHtml(){
 return `<div class="bench-tit-grid"><label>Experiment<select id="method">${Object.entries(titrations).map(([kind,method])=>
   `<option value="${kind}" ${kind===titration.kind?'selected':''}>${esc(method.name)}</option>`).join('')}</select></label>
   <button type="button" class="btn secondary small" data-bench-tit="open-preparations">Select prepared bottles</button></div>`;
}
function benchTitRunActions(){
 return '<div class="ch-actions"><button type="button" class="btn" data-bench-tit="start-run">Focus titration controls</button>'
   +(!titration.benchSession&&!studyState.titrationChallenge?'<button type="button" class="btn secondary" data-bench-tit="practice-sample">Use practice sample</button>':'')+'</div>';
}
function benchTitLoadPractice(){
 if(titration.benchSession||studyState.titrationChallenge||titration.kind==='hypochlorite')return false;
 if((titration.volume>0||titration.runs?.length)&&!window.confirm('Replace the current run with a practice sample?'))return false;
 const d=titrations[titration.kind];
 const analyteConc=Number((d.conc*d.expected*d.stoich/d.sample).toPrecision(12));
 titration={...freshTitration(titration.kind),prepMethod:'direct',analyteConc,deliveryStep:1};
 benchTitTab='setup';
 render();
 document.getElementById('addTitrant')?.focus();
 return true;
}
function benchTitLiveReadout(indicator){
 const volume=Number(titration.volume)||0;
 const display=volume.toLocaleString(undefined,{maximumFractionDigits:9});
 return `<div class="tit-live-readout" role="status" aria-label="Live titration observation">
   <span class="tit-colour-swatch" aria-hidden="true" style="--tit-liquid:${esc(indicator.color)}"></span>
   <div><b>${esc(display)} mL delivered</b><small>${esc(indicator.label)}</small></div></div>`;
}
function benchTitOnMethodChange(event){
 const kind=event.target.value;
 event.target.value=titration.kind;
 if(kind!==titration.kind)benchTitChoosePractice(kind);
}
function benchTitChoosePractice(kind){
  if(!Object.hasOwn(titrations,kind))return;
  if(kind==='hypochlorite'){
    benchTitActivateTab('open');
    const setup=document.getElementById('benchStockSetup');
    setup.open=true;
    const reagent=document.getElementById('benchRefChemical');
    reagent.value=benchTitBottle(benchTitChoice.flask)?.formula==='NaOCl'?'Na2S2O3':'NaOCl';
    benchTitUpdateStockFields(reagent.value);
    reagent.focus();
    return;
  }
  if((titration.runs?.length||titration.volume>0)&&!window.confirm('Switch experiments and clear the current setup?'))return;
  if(titration.benchSession)benchTitArchive();
  titration={...freshTitration(kind),prepMethod:'direct'};
  benchTitTab='setup';
  benchTitSave();
  render();
  document.getElementById('method')?.focus();
}
function benchTitUpdateStockFields(formula){
  const stock=benchTitStocks[formula];
  if(!stock)return;
  document.getElementById('benchRefC').value=stock.concentration;
  document.getElementById('benchRefRole').value=stock.role;
}
const benchTitQuickPairs=[
 {type:'Acid–base',analyte:'HCl',titrant:'NaOH'},
 {type:'Acid–base',analyte:'CH3COOH',titrant:'NaOH'},
 {type:'Acid–base',analyte:'H2SO4',titrant:'NaOH'},
 {type:'Acid–base',analyte:'NaOH',titrant:'HCl'},
 {type:'Acid–base',analyte:'Na2CO3',titrant:'HCl'},
 {type:'Acid–base',analyte:'NaHCO3',titrant:'HCl'},
 {type:'Acid–base',analyte:'KHC8H4O4',titrant:'NaOH'},
 {type:'Redox',analyte:'FeSO4',titrant:'KMnO4'},
 {type:'Iodometric',analyte:'I2',titrant:'Na2S2O3'},
 {type:'Iodometric',analyte:'NaOCl',titrant:'Na2S2O3'},
 {type:'Complexometric',analyte:'CaCl2',titrant:'EDTA'}
];
let benchTitQuickChoice={type:'Acid–base',analyte:'HCl',titrant:'NaOH',indicator:'Phenolphthalein'};
function benchTitQuickPairsFor(type,analyte){return benchTitQuickPairs.filter(p=>p.type===type&&(!analyte||p.analyte===analyte));}
function benchTitQuickDefaultConcs(pair){if(pair?.type==='Redox')return [.1,.02];if(pair?.analyte==='I2')return [.02,.1];if(pair?.analyte==='NaOCl')return [.04,.1];if(pair?.type==='Complexometric')return [.005,.01];if(pair?.analyte==='H2SO4')return [.05,.1];return [.1,.1];}
function benchTitQuickIndicators(type,pair){if(type==='Acid–base')return [pair?benchTitPair(pair.analyte,pair.titrant)?.indicator:'Phenolphthalein'].filter(Boolean);return ({'Redox':['Self-indicating (KMnO₄)'],'Iodometric':['Starch near endpoint'],'Complexometric':['Eriochrome Black T']})[type]||[];}
function benchTitQuickSync(){const type=document.getElementById('benchTitQuickType'),flask=document.getElementById('benchTitQuickFlask'),burette=document.getElementById('benchTitQuickBurette'),indicator=document.getElementById('benchTitQuickIndicator');if(!type||!flask||!burette||!indicator)return;const pairs=benchTitQuickPairsFor(type.value);const formulas=[...new Set(pairs.map(p=>p.analyte))];if(!formulas.includes(flask.value))flask.value=formulas[0]||'';flask.innerHTML=formulas.map(f=>`<option value="${f}" ${f===benchTitQuickChoice.analyte?'selected':''}>${esc(benchTitStockName(f))}</option>`).join('');benchTitQuickChoice.analyte=flask.value;const compatible=benchTitQuickPairsFor(type.value,flask.value),titrants=[...new Set(compatible.map(p=>p.titrant))];if(!titrants.includes(benchTitQuickChoice.titrant))benchTitQuickChoice.titrant=titrants[0]||'';burette.innerHTML=titrants.map(f=>`<option value="${f}" ${f===benchTitQuickChoice.titrant?'selected':''}>${esc(benchTitStockName(f))}</option>`).join('');burette.value=benchTitQuickChoice.titrant;const selected=compatible.find(p=>p.titrant===burette.value),choices=benchTitQuickIndicators(type.value,selected);if(!choices.includes(benchTitQuickChoice.indicator))benchTitQuickChoice.indicator=choices[0];indicator.innerHTML=choices.map(name=>`<option value="${esc(name)}" ${name===benchTitQuickChoice.indicator?'selected':''}>${esc(name)}</option>`).join('');indicator.value=benchTitQuickChoice.indicator;const sampleC=document.getElementById('benchTitQuickUnknownC'),titrantC=document.getElementById('benchTitQuickKnownC'),pairKey=type.value+'|'+flask.value+'|'+burette.value;if(sampleC&&titrantC&&sampleC.dataset.pairKey!==pairKey){const [a,b]=benchTitQuickDefaultConcs(selected);sampleC.value=a;titrantC.value=b;sampleC.dataset.pairKey=pairKey;titrantC.dataset.pairKey=pairKey;}}
function benchTitQuickHtml(){const types=[...new Set(benchTitQuickPairs.map(p=>p.type))];return `<section class="panel bench-tit-quick"><div class="eyebrow">TITRATION SETUP</div><h2>Choose your reagents</h2><p>Select the titration type, flask sample, burette reagent, concentrations, and indicator. The flask concentration is hidden during the run. A 25 mL aliquot and 100 mL supply bottles are prepared automatically.</p><div class="bench-tit-grid"><label>Titration type<select id="benchTitQuickType">${types.map(type=>`<option value="${type}" ${type===benchTitQuickChoice.type?'selected':''}>${esc(type)}</option>`).join('')}</select></label><label>Flask reagent<select id="benchTitQuickFlask"></select></label><label>Flask concentration (mol/L)<input id="benchTitQuickUnknownC" type="number" min="0.000001" max="1" step="any" value="0.1"></label><label>Burette reagent<select id="benchTitQuickBurette"></select></label><label>Burette concentration (mol/L)<input id="benchTitQuickKnownC" type="number" min="0.000001" max="1" step="any" value="0.1"></label><label>Indicator<select id="benchTitQuickIndicator"></select></label></div><button type="button" class="btn" data-bench-tit="quick-start">Start titration</button><p id="benchTitQuickStatus" role="status"></p></section>`;}
function benchTitQuickStart(){const status=document.getElementById('benchTitQuickStatus'),say=m=>{if(status)status.textContent=m;};const type=document.getElementById('benchTitQuickType')?.value,analyte=document.getElementById('benchTitQuickFlask')?.value,titrant=document.getElementById('benchTitQuickBurette')?.value,pair=benchTitQuickPairs.find(p=>p.type===type&&p.analyte===analyte&&p.titrant===titrant),unknownC=Number(document.getElementById('benchTitQuickUnknownC')?.value),knownC=Number(document.getElementById('benchTitQuickKnownC')?.value),indicator=document.getElementById('benchTitQuickIndicator')?.value;const reaction=pair&&benchTitPair(pair.analyte,pair.titrant);if(!pair||!reaction){say('Choose a supported flask and burette reagent combination.');return;}if(![unknownC,knownC].every(ttPositive)||unknownC>1||knownC>1){say('Enter positive concentrations up to 1 mol/L.');return;}if((titration.volume>0||titration.runs?.length)&&!window.confirm('Start this setup and replace the current titration run?'))return;if(titration.benchSession)benchTitArchive();const volume=100,add=(formula,role,C)=>{const id=benchTitId(),name=benchTitStockName(formula);benchTitState.samples.push({id,name:name+(role==='known'?' reference':' unknown'),formula,chemical:name,role,truthC:C,assignedC:role==='known'?C:null,remaining:volume,initialVolume:volume,verified:true,basis:'quick titration setup',createdAt:Date.now()});return id;};const flask=add(pair.analyte,'unknown',unknownC),burette=add(pair.titrant,'known',knownC);benchTitChoice={mode:'assay',flask,burette};const message=benchTitStart('assay',flask,burette);if(message){say(message);return;}titration.indicatorName=indicator||reaction.indicator;titration.sampleVol=Math.min(titrations[reaction.kind].sample,25);titration.benchSession.simpleSetup=true;if(reaction.kind==='acid'||reaction.kind==='edta'||(reaction.kind==='redox'&&!/self-indicating/i.test(titration.indicatorName)))titration.unknownAdditions=[{name:titration.indicatorName,amount:1,unit:'drop',kind:'indicator'}];benchTitCapture(false);benchTitTab='setup';benchTitSave();render();document.getElementById('titrationStatus').textContent='Setup ready. Deliver titrant, observe the indicator, and record the endpoint.';}
const benchHypochloriteReagents={iodide:'Potassium iodide',acid:'Acetic acid',starch:'Starch indicator'};
let benchTitTab='setup';
let benchTitState=benchTitLoad(),benchTitChoice={mode:'assay',flask:'',burette:''};
function benchTitLoad(){try{const x=JSON.parse(localStorage.getItem('simlab-bench-titration-v1')||'null');if(x?.version===1&&Array.isArray(x.samples))return x;}catch{}return {version:1,samples:[],reports:[],manualBackup:null};}
function benchTitSave(){try{localStorage.setItem('simlab-bench-titration-v1',JSON.stringify(benchTitState));}catch{}if(typeof persistWorkspace==='function')persistWorkspace();}
function benchTitId(){return 'bt'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
function benchTitBottle(id){return benchTitState.samples.find(x=>x.id===id);}
function benchTitCanon(f){return f==='KC8H5O4'?'KHC8H4O4':f;}
function benchTitSolution(a){
 if(a?.contents?.some(c=>c.type==='publicationCustom'))return {valid:false,message:'Publication/custom identities need a validated titration model. Use a supported bench reagent for quantitative acid/base import.'};if(!a||!(Number(a.volume)>0))return {valid:false,message:'Add a solution before transferring a bottle to titration.'};
 if(a.contents.some(c=>Number(c.mass)>0&&!c.solidDissolved))return {valid:false,message:'Dissolve the weighed solid before exporting a solution.'};
 if(a.contents.length>1&&!a.mixed)return {valid:false,message:'Mix the vessel before exporting a representative solution.'};
 const e=benchEntries(a.contents),active=new Map();for(const c of e){const f=benchTitCanon(c.f);if(c.type==='water')continue;if(['NaCl','KCl'].includes(f))continue;const chemical=benchTitChem[f]||benchTitStocks[f];if(!chemical)return {valid:false,message:'This preparation contains a species outside the supported titration bottle library.'};if(!Number.isFinite(c.n)||c.n<0)return {valid:false,message:'A reagent amount or concentration is missing.'};if(c.n>0)active.set(f,(active.get(f)||0)+c.n);}
 if(active.size!==1)return {valid:false,message:'Titration import needs one supported dissolved species. Use a separate vessel for each solution.'};
 const [formula,n]=[...active][0],C=n/(Number(a.volume)/1000);if(!Number.isFinite(C)||C<=0||C>1)return {valid:false,message:'The bench titration model supports positive concentrations up to 1 mol/L.'};
 const directStock=a.contents.length===1&&!a.contents[0].solidStock&&Number(a.contents[0].volume)>0,verified=!!(a.preparedAtMark||a.solutionVolumeVerified||directStock);
 return {valid:true,formula,chemical:benchTitChem[formula]||benchTitStocks[formula],concentration:C,moles:n,volume:Number(a.volume),verified};
}
function benchSampleExportControls(a){if(!transferToolIsVessel(a))return '';const p=benchTitSolution(a),name=a.benchReagentName||`${benchVesselLabel(a)} · ${p.valid?p.chemical.name:'prepared reagent'}`,role=a.benchExportRole||(p.valid&&p.chemical.primary?'known':'unknown');return `<details class="tool-preparation bench-export"><summary>Prepare / send reagent to titration</summary><label for="benchReagentName">Reagent bottle name<input id="benchReagentName" maxlength="80" value="${esc(name)}"></label><label for="benchReagentRole">Use in titration<select id="benchReagentRole"><option value="unknown" ${role==='unknown'?'selected':''}>Unknown concentration · hide in titration</option><option value="known" ${role==='known'?'selected':''}>Known concentration · reference solution</option></select></label>${p.valid?`<p>${esc(p.chemical.name)} · calculated ${ttFmt(p.concentration)} mol/L · ${p.verified?'defined stock / final-volume preparation':'approximate displayed-volume basis'}</p>`:`<p>${esc(p.message)}</p>`}<label for="benchExportVolume">Solution to transfer (mL)<input id="benchExportVolume" type="number" min="0.000001" max="${Number(a.volume)||0}" step="any" value="${Math.min(60,Number(a.volume)||0)}"></label><button type="button" class="btn small" data-bench-tit="export" ${p.valid?'':'disabled'}>Transfer bottle to titration library</button><button type="button" class="btn secondary small" data-bench-tit="open">Open titration bench</button><p id="benchExportStatus" role="status">${esc(a.benchExportMessage||'Each exported bottle keeps its own composition and remaining volume. The source vessel loses the transferred amount.')}</p><small>For a known solution from solid, dissolve below the final volume and make up in a volumetric flask, then transfer aliquots to separate beakers. Unknowns hide concentration in the titration interface. Arbitrary mixtures remain outside this acid/base import model.</small></details>`;}
function benchTitWithdraw(a,volume,total){
 const fraction=volume/total;
 a.contents=a.contents.map(c=>({...c,volume:Number(((Number(c.volume)||0)*(1-fraction)).toPrecision(14)),mass:Number(((Number(c.mass)||0)*(1-fraction)).toPrecision(14))})).filter(c=>c.volume>1e-12||c.mass>1e-12);a.volume=Number((total-volume).toPrecision(14));
}
function benchTitExport(a,name,role,volume){const p=benchTitSolution(a);if(!p.valid)return {error:p.message};if(!Number.isFinite(volume)||volume<=0||volume>p.volume)return {error:'Enter a finite transfer volume no larger than the source contents.'};if(!['known','unknown'].includes(role))return {error:'Choose known reference or unknown sample.'};if(role==='known'&&!p.verified)return {error:'A known reference needs a defined stock or final-volume preparation. Make up in a volumetric flask, then transfer the solution into your beakers.'};const sample={id:benchTitId(),name:String(name||p.chemical.name).trim().slice(0,80),formula:p.formula,chemical:p.chemical.name,role,truthC:p.concentration,assignedC:role==='known'?p.concentration:null,remaining:volume,initialVolume:volume,verified:p.verified,sourceVessel:a.id,sourceLabel:benchVesselLabel(a),sourceContents:JSON.parse(JSON.stringify(a.contents)),createdAt:Date.now(),basis:p.verified?'defined stock / final solution volume':'displayed-volume approximation'};
 benchTitWithdraw(a,volume,p.volume);a.benchReagentName=sample.name;a.benchExportRole=role;a.benchExportMessage=`Transferred ${ttFmt(volume)} mL to “${sample.name}”. ${ttFmt(a.volume)} mL remains in this vessel.`;benchTitState.samples.push(sample);benchTitSave();return {sample};}
function benchTitPair(flask,burette){for(const [kind,[analyte,titrant,note]] of Object.entries(benchTitInstrumentPairs)){
 if(flask!==analyte||burette!==titrant)continue;
 const d=titrations[kind];
 return {kind,a:d.analyteCoeff,b:d.titrantCoeff,equation:d.eq,indicator:d.ind,note};
}const key=flask+'|'+burette,pairs={
 'HCl|NaOH':[1,1,'HCl + NaOH → NaCl + H₂O','Phenolphthalein'],
 'NaOH|HCl':[1,1,'NaOH + HCl → NaCl + H₂O','Methyl orange'],
 'H2SO4|NaOH':[1,2,'H₂SO₄ + 2NaOH → Na₂SO₄ + 2H₂O','Phenolphthalein'],
 'NaOH|H2SO4':[2,1,'2NaOH + H₂SO₄ → Na₂SO₄ + 2H₂O','Methyl orange'],
 'CH3COOH|NaOH':[1,1,'CH₃COOH + NaOH → CH₃COONa + H₂O','Phenolphthalein'],
 'Na2CO3|HCl':[1,2,'Na₂CO₃ + 2HCl → 2NaCl + CO₂ + H₂O','Methyl orange'],
 'NaHCO3|HCl':[1,1,'NaHCO₃ + HCl → NaCl + CO₂ + H₂O','Methyl orange'],
 'KHC8H4O4|NaOH':[1,1,'KHC₈H₄O₄ + NaOH → KNaC₈H₄O₄ + H₂O','Phenolphthalein']};const p=pairs[key];return p?{kind:"acid",a:p[0],b:p[1],equation:p[2],indicator:p[3]}:null;}
function benchTitLibraryHtml(){const samples=benchTitState.samples,mode=benchTitChoice.mode,flasks=samples.filter(s=>s.role===(mode==='standardize'?'known':'unknown')),burettes=samples.filter(s=>s.role===(mode==='standardize'?'unknown':'known')),options=(list,selected)=>'<option value="">Choose a bottle</option>'+list.map(s=>`<option value="${s.id}" ${selected===s.id?'selected':''}>${esc(s.name)} · ${ttFmt(s.remaining)} mL</option>`).join('');return `<section class="panel bench-tit-library"><div class="bench-tit-heading"><div><div class="eyebrow">TITRATION REAGENTS</div><h2>Prepared reagent bottles</h2></div><button class="btn secondary small" type="button" data-bench-tit="bench">Return to Open Bench</button></div><p>Prepare and select solutions here, or bring in a prepared solution from the Open Bench.</p>${samples.length?`<div class="ch-scroll"><table class="table"><thead><tr><th>Bottle</th><th>Role</th><th>Concentration</th><th>Remaining</th></tr></thead><tbody>${samples.map(s=>`<tr><td>${esc(s.name)}<small>${esc(s.chemical)}</small></td><td>${s.role==='known'?'Known reference':'Unknown'}</td><td>${s.role==='known'?ttFmt(s.assignedC)+' mol/L':'Hidden · determine by titration'}</td><td>${ttFmt(s.remaining)} mL</td></tr>`).join('')}</tbody></table></div>`:'<p class="notice">No saved reagent bottles yet. Use Quick titration setup above or prepare a reagent bottle below.</p>'}<div class="bench-tit-grid"><label>Analysis<select id="benchTitMode"><option value="assay" ${mode==='assay'?'selected':''}>Analyse an unknown sample in the flask</option><option value="standardize" ${mode==='standardize'?'selected':''}>Standardise an unknown titrant in the burette</option></select></label><label>Flask solution<select id="benchTitFlask">${options(flasks,benchTitChoice.flask)}</select></label><label>Burette solution<select id="benchTitBurette">${options(burettes,benchTitChoice.burette)}</select></label></div><button type="button" class="btn" data-bench-tit="start">Load selected bottles into titration</button><p id="benchTitLibraryStatus" role="status"></p><details id="benchStockSetup" ${benchTitChoice.flask&&benchTitBottle(benchTitChoice.flask)?.formula==='NaOCl'&&!benchTitChoice.burette?'open':''}><summary>Prepare a reagent bottle</summary><div class="bench-tit-grid"><label>Stock reagent<select id="benchRefChemical">${Object.entries(benchTitStocks).map(([f,stock])=>`<option value="${f}" ${f===(benchTitBottle(benchTitChoice.flask)?.formula==='NaOCl'?'Na2S2O3':'HCl')?'selected':''}>${esc(benchTitStockName(f))}</option>`).join('')}</select></label><label>Use as<select id="benchRefRole"><option value="unknown" ${benchTitBottle(benchTitChoice.flask)?.formula==='NaOCl'?'':'selected'}>Unknown sample</option><option value="known" ${benchTitBottle(benchTitChoice.flask)?.formula==='NaOCl'?'selected':''}>Known reference</option></select></label><label>Concentration (mol/L)<input id="benchRefC" type="number" min="0.000001" max="1" step="any" value="0.1"></label><label>Bottle volume (mL)<input id="benchRefV" type="number" min="0.000001" step="any" value="100"></label></div><button type="button" class="btn soft small" data-bench-tit="reference">Prepare selected bottle</button><small>For an assigned sample, keep your teacher’s flask bottle selected and prepare the reference titrant specified in the instructions.</small></details>${titration.benchSession?'<button type="button" class="btn secondary small" data-bench-tit="manual">Return to manual preparation mode</button>':''}</section>`;}
function benchTitStart(mode,flaskId,buretteId){if(!['assay','standardize'].includes(mode))return 'Choose a supported analysis mode.';const a=benchTitBottle(flaskId),b=benchTitBottle(buretteId),p=a&&b&&benchTitPair(a.formula,b.formula);if(!a||!b||a.id===b.id)return 'Choose two different reagent bottles.';if(!p)return 'This reagent pair is not supported. Choose a compatible analyte and titrant for the selected method.';if(mode==='standardize'&&(a.role!=='known'||b.role!=='unknown')||mode==='assay'&&(a.role!=='unknown'||b.role!=='known'))return 'For analysis use an unknown flask sample and known titrant; for standardisation use a known flask reference and unknown titrant.';if(!(a.remaining>0)||!(b.remaining>0))return 'One bottle is empty. Transfer more prepared solution from the bench.';if(titration.benchSession&&titration.runs?.length)benchTitArchive();if(!titration.benchSession)benchTitState.manualBackup=JSON.parse(JSON.stringify(titration));titration={...freshTitration(p.kind),sampleVol:Math.min(p.kind==='acid'?10:titrations[p.kind].sample,a.remaining),deliveryStep:.5,benchSession:{id:benchTitId(),mode,flask:JSON.parse(JSON.stringify(a)),burette:JSON.parse(JSON.stringify(b)),pair:p,reserved:false,reservedAliquot:0,reveal:false},indicatorName:p.indicator};if(typeof studyState!=='undefined')studyState.titrationChallenge=false;benchTitCapture(false);benchTitSave();return '';}
function benchTitPreparation(){const s=titration.benchSession;if(!s)return null;return {valid:Number.isFinite(s.flask.truthC)&&s.flask.truthC>0,concentration:s.flask.truthC,moles:s.flask.truthC*s.flask.initialVolume/1000,summary:s.flask.role==='unknown'?`Bench bottle “${s.flask.name}”; concentration hidden for analysis.`:`Bench reference “${s.flask.name}”: ${ttFmt(s.flask.assignedC)} mol/L.`,message:'The bench preparation snapshot is invalid.'};}
function benchTitCapture(readDOM=true){const s=titration.benchSession;if(!s)return;const value=id=>readDOM?document.getElementById(id)?.value:undefined;for(const [field,id]of [['sampleVol','sampleVol'],['deliveryStep','step']])if(value(id)!==undefined)titration[field]=Number(value(id));for(const key of ['initialReading','finalReading'])if(value(key)!==undefined)titration[key]=value(key);titration.unknownSpecies=s.flask.chemical;titration.knownChemical=s.burette.chemical;titration.analyteCoeff=s.pair.a;titration.titrantCoeff=s.pair.b;titration.stoich=s.pair.a/s.pair.b;titration.reactionEquation=s.pair.equation;titration.titrantC=s.burette.truthC;titration.expectedSource='bench';titration.mode='simulated';titration.analyteConc='';titration.expected=ttPositive(titration.sampleVol)?s.flask.truthC*Number(titration.sampleVol)*s.pair.b/(s.burette.truthC*s.pair.a):null;return {d:titrations[titration.kind],defaultPair:false};}
function benchHypochloriteVisual(){
 const s=titration.benchSession, guide=titration.expected;
 const ratio=guide>0?titration.volume/guide:0, remaining=Math.max(0,1-ratio);
 const clear='#f7faf8', amber='#bb7834', blue='#25375d';
 const color=!s.iodineReleased?clear:s.starchAdded?mixHex(clear,blue,ttSmooth(remaining/.06)):mixHex(clear,amber,Math.sqrt(remaining));
 const label=!s.iodineReleased?'Release iodine before titrating':ratio>=1?'Colourless · endpoint or excess titrant':s.starchAdded?'Blue starch–iodine colour fades as iodine is consumed':ratio>=.85?'Pale yellow · add starch':'Amber iodine · continue titrating';
 return {name:'Starch near endpoint',profile:{start:amber,end:clear,startText:'amber iodine',endText:'colourless'},color,fraction:Math.min(1,ratio),label,plumeColor:clear,guide};
}
function benchIodineVisual(){const s=titration.benchSession,guide=titration.expected,ratio=guide>0?titration.volume/guide:0,clear='#f7faf8',amber='#bb7834',pale='#d8c17a',blue='#25375d',color=s.starchAdded?mixHex(clear,blue,ttSmooth(Math.max(0,1-ratio)/.12)):mixHex(amber,pale,ttSmooth(Math.min(1,ratio/.85))),label=s.starchAdded?(ratio>=1?'Colourless · endpoint or excess titrant':'Blue-black starch–iodine colour fades as iodine is consumed'):ratio>=.85?'Pale iodine colour · add starch now':'Amber iodine · continue titrating';return {name:'Starch near endpoint',profile:{start:amber,end:clear,startText:'amber iodine',endText:'colourless'},color,fraction:Math.min(1,ratio),label,plumeColor:clear,guide};}
function benchHypochloriteControls(s){
 if(s.pair.kind!=='hypochlorite')return '';
 const contents=[s.iodideAdded?'Potassium iodide':null,s.iodineReleased?'Acetic acid · iodine released':null,s.starchAdded?'Starch indicator':null].filter(Boolean);
 return `<section class="notice"><b>Flask reagents</b><p>Follow your practical instructions and choose each reagent when needed.</p><div class="ch-actions"><label>Reagent to add<select id="hypochloriteReagent"><option value="">Choose a reagent</option>${Object.entries(benchHypochloriteReagents).map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label><button type="button" class="btn secondary small" id="addHypochloriteReagent" ${titration.done?'disabled':''}>Add selected reagent</button></div><small>Added: ${contents.length?contents.join(' · '):'None'}</small><p><a href="https://www.epa.gov/sites/production/files/2018-01/documents/eq-12-01_.pdf" target="_blank" rel="noopener">EPA iodometric method reference</a></p></section>`;
}
function benchIodineControls(s){return `<section class="notice"><b>Flask indicator</b><p>Add starch near the endpoint, when the iodine colour has become pale. This gives a sharper blue-black to colourless endpoint.</p><button type="button" class="btn secondary small" id="addIodineStarch" ${titration.done||s.starchAdded||titration.volume<titration.expected*.85?'disabled':''}>Add starch indicator</button><small>${s.starchAdded?'Starch added. Continue dropwise to colourless.':'Starch not added yet.'}</small></section>`;}
function benchIodineAdd(){const s=titration.benchSession;if(s?.pair.kind!=='iodine'||titration.done)return 'Start an unfinished iodine titration.';if(s.starchAdded)return 'Starch is already in the flask.';if(titration.volume<titration.expected*.85)return 'Add starch after the iodine colour becomes pale near the endpoint.';s.starchAdded=true;benchTitSave();return '';}
function benchHypochloriteAdd(reagent){
 const s=titration.benchSession;
 if(s?.pair.kind!=='hypochlorite'||titration.done)return 'Start an unfinished hypochlorite titration.';
 if(!Object.hasOwn(benchHypochloriteReagents,reagent))return 'Choose a flask reagent.';
 if(!ttPositive(titration.sampleVol)||titration.sampleVol>(benchTitBottle(s.flask.id)?.remaining??0)&&!s.reserved)return 'Choose an aliquot within the available sample volume.';
 if(reagent==='iodide'){
  if(s.iodideAdded)return 'Potassium iodide is already in the flask.';
  s.iodideAdded=true;
 }else if(reagent==='acid'){
  if(s.iodineReleased)return 'Acetic acid has already been added.';
  if(!s.iodideAdded)return 'Add potassium iodide before acetic acid.';
  s.iodineReleased=true;
 }else{
  if(s.starchAdded)return 'Starch is already in the flask.';
  if(!s.iodineReleased||titration.volume<titration.expected*.85)return 'Add starch after the released iodine has faded to pale yellow.';
  s.starchAdded=true;
 }
 benchTitSave();
 return '';
}
function benchTitSetupHtml(){const s=titration.benchSession,a=benchTitBottle(s.flask.id),b=benchTitBottle(s.burette.id);return `<div class="bench-tit-run">${benchTitMethodHtml()}<h2>${s.mode==='standardize'?'Standardise the burette reagent':'Analyse the flask sample'}</h2>${benchTitRunActions()}<p><b>Flask:</b> ${esc(s.flask.name)} · ${s.flask.role==='known'?ttFmt(s.flask.assignedC)+' mol/L reference':'unknown concentration'}<br><b>Burette:</b> ${esc(s.burette.name)} · ${s.burette.role==='known'?ttFmt(s.burette.assignedC)+' mol/L reference':'unknown concentration'}</p><div class="bench-tit-grid"><label>Aliquot in flask (mL)<input id="sampleVol" type="number" min="0.000001" step="any" value="${titration.sampleVol}" ${s.reserved||s.iodineReleased?'disabled':''}></label></div><p class="notice">${esc(s.pair.equation)}<br>Flask : burette coefficients = ${s.pair.a} : ${s.pair.b}. Suggested indicator: ${esc(s.pair.indicator)}.${s.pair.note?'<br>' +esc(s.pair.note):''}</p><p>Remaining in flask-supply bottle: <b>${ttFmt(a?.remaining||0)} mL</b>. Remaining titrant: <b>${ttFmt(b?.remaining||0)} mL</b>.</p><p id="titVolumeEstimate" class="notice" ${benchTitEstimateHtml()?'':'hidden'}>${benchTitEstimateHtml()}</p><button type="button" class="btn secondary small" data-bench-tit="open-preparations">Refill from Open Bench</button></div>`;}
function benchTitrationWorkspace({visual,setup,flask,run,results,controls}){
 const session=titration.benchSession;
 const manualSetup=setup;
 if(session){
  setup=benchTitSetupHtml();
  flask=session.pair.kind==='hypochlorite'?benchHypochloriteControls(session):session.pair.kind==='iodine'?benchIodineControls(session):session.simpleSetup?
    `<section class="notice"><b>Indicator ready</b><p>${esc(titration.indicatorName)} ${/self-indicating/i.test(titration.indicatorName)?'is the titrant’s own colour; no separate indicator is added.':'was added to the flask during setup.'}</p></section>`:
    `<h2>Flask reagents</h2><label>Indicator<select id="indicatorSelect">${indicatorOptions(titration.indicatorName)}</select></label>
   <label>Amount (drops)<input id="indicatorAmount" type="number" min="1" step="1" value="1"></label>
   <button type="button" class="btn soft" id="addIndicator">Add indicator</button><div id="flaskAdditionList">${renderAdditionItems()}</div>`;
  controls=controls.replace(/id="idealEndpoint"[^>]*/, 'id="idealEndpoint" disabled hidden');
  results=results.replace(/id="completeTitration"[^>]*/,`id="completeTitration" ${titration.done||!titration.runs.length?'disabled':''}`);
 }else setup=benchTitQuickHtml();
 const moreOptions=`<details class="bench-tit-more"><summary>More options</summary>${session?'':`<details class="bench-tit-manual"><summary>Manual titration and sample preparation</summary>${manualSetup}</details>`}<details class="bench-tit-manual"><summary>Prepared reagent bottles and Open Bench transfers</summary>${benchTitLibraryHtml()+benchTitSourceHtml()}</details></details>`;
 const panels=[['setup',session?'Run':'Setup',setup],['flask','Flask reagents',flask],['results','Results',results],['open','More options',moreOptions]];
 const tabs=panels.map(([id,label])=>`<button type="button" class="bench-task-button" role="tab" data-tit-tab="${id}" id="tit-tab-${id}" aria-controls="tit-panel-${id}" aria-selected="${benchTitTab===id}" tabindex="${benchTitTab===id?0:-1}">${label}</button>`).join('');
 const dock=`<section class="tit-control-dock" aria-label="Titration controls">${controls}<p id="titrationStatus" class="titration-status" role="status">${session?'Deliver titrant gradually and record the observed endpoint.':''}</p></section>`;
 const apparatus=visual.replace('<div class="titration-layout titration-station-layout">','<div class="tit-scroll-workspace"><div class="titration-layout titration-station-layout">');
 return apparatus+`<section class="panel workpanel titration-tabs"><div class="uv-tablist" role="tablist" aria-label="Titration workspace">${tabs}</div>
 ${panels.map(([id,label,html])=>`<section id="tit-panel-${id}" class="uv-tab-panel" role="tabpanel" aria-labelledby="tit-tab-${id}" ${benchTitTab===id?'':'hidden'}>${html}</section>`) .join('')}</section><section class="panel workpanel titration-tabs" id="tit-run-settings">${run}</section></div>${dock}</div>`;
}
function benchTitActivateTab(id,focus=false){
 benchTitTab=id;
 document.querySelectorAll('[data-tit-tab]').forEach(tab=>{
  const selected=tab.dataset.titTab===id;
  tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;
  document.getElementById(tab.getAttribute('aria-controls')).hidden=!selected;
  if(selected&&focus)tab.focus();
 });
}
function benchTitBindTabs(){
 const tabs=[...document.querySelectorAll('[data-tit-tab]')];
 tabs.forEach((tab,index)=>{
  tab.onclick=()=>benchTitActivateTab(tab.dataset.titTab);
  tab.onkeydown=event=>{
   const map={ArrowLeft:(index+tabs.length-1)%tabs.length,ArrowRight:(index+1)%tabs.length,Home:0,End:tabs.length-1};
   if(!Object.hasOwn(map,event.key))return;
   event.preventDefault();benchTitActivateTab(tabs[map[event.key]].dataset.titTab,true);
  };
 });
}
function benchTitSourceVessels(){
 return typeof apparatus==='undefined'?[]:apparatus.filter(vessel=>vessel.volume>0).map(vessel=>({vessel,solution:benchTitSolution(vessel)})).filter(item=>item.solution.valid);
}
function benchTitEstimateHtml(){
 const session=titration.benchSession;
 if(!session||[session.flask,session.burette].some(bottle=>bottle.sourceLabel==='Teachers Bench'||bottle.classroomAssignment))return '';
 const estimate=titration.expected;
 if(!ttPositive(estimate))return '';
 const supply=benchTitBottle(session.burette.id)?.remaining??0;
 const delivered=Number(titration.volume)||0;
 const remaining=Math.max(0,estimate-delivered);
 return 'Estimated titrant for this aliquot: <b>'+ttFmt(estimate)+' mL</b>.'
  +(delivered>0?' Estimated remaining to equivalence: <b>'+ttFmt(remaining)+' mL</b>.':'')
  +(supply+1e-10<remaining?' Refill by at least '+ttFmt(remaining-supply)+' mL.':'')
  +' Use the observed endpoint to record your titre.';
}
function benchTitRefill(vessel,volume){
 const session=titration.benchSession;
 const bottle=session&&benchTitBottle(session.burette.id);
 if(!bottle)return 'Load a flask and burette bottle before refilling.';
 const solution=benchTitSolution(vessel);
 if(!solution.valid)return solution.message;
 if(solution.formula!==bottle.formula||!ttSameTruth(solution.concentration,bottle.truthC)||bottle.role==='known'&&!solution.verified){
  return 'Refill with the same reagent and concentration from a compatible Open Bench solution.';
 }
 if(!ttPositive(volume)||volume>solution.volume)return 'Enter a positive refill volume within the available source volume.';
 if(!Number.isFinite(bottle.remaining+volume)||!Number.isFinite(bottle.initialVolume+volume))return 'The refill volume exceeds the supported range.';
 benchTitWithdraw(vessel,volume,solution.volume);
 bottle.remaining+=volume;
 bottle.initialVolume+=volume;
 benchTitSave();
 return '';
}
function benchTitSourceHtml(){
 const sources=benchTitSourceVessels();
 if(!sources.length)return '';
 return `<section class="notice"><h3>Transfer from an Open Bench vessel</h3><div class="bench-tit-grid">
 <label>Prepared solution<select id="titSourceVessel">${sources.map(({vessel,solution})=>`<option value="${esc(vessel.id)}">${esc(benchVesselLabel(vessel))} · ${esc(solution.chemical.name)} · ${ttFmt(solution.volume)} mL</option>`).join('')}</select></label>
 <label>Destination<select id="titSourceRole"><option value="flask">Flask</option><option value="burette">Burette</option>${titration.benchSession?'<option value="refill">Refill active burette</option>':''}</select></label>
 <p class="muted">Analysis uses an unknown in the flask. Standardisation uses an unknown in the burette. Select the mode above before transferring.</p>
 <label>Transfer volume (mL)<input id="titSourceVolume" type="number" min="0.000001" step="any" value="${Math.min(25,sources[0].solution.volume)}"></label></div>
 <button type="button" class="btn small" data-bench-tit="transfer-vessel">Transfer and select bottle</button></section>`;
}
function ttDirectFields(){
 return titration.prepMethod==='direct'?`<label>Flask concentration (mol/L)<input id="analyteC" type="number" min="0.000001" step="any" value="${titration.analyteConc??''}" placeholder="Enter concentration"></label>`:'';
}
function ttReagentOptions(){
 const stockOptions=Object.keys(benchTitStocks).map(formula=>`<option value="${esc(benchTitStockName(formula))}">${esc(formula)}</option>`).join('');
 return `<datalist id="ttAnalyteOptions">${stockOptions}</datalist><datalist id="ttTitrantOptions">${stockOptions}</datalist><datalist id="ttFlaskReagents">${reagents.map(row=>`<option value="${esc(row[0])}"></option>`).join('')}</datalist>`;
}
function ttSelectedPair(analyte=titration.unknownSpecies,titrant=titration.knownChemical){
 const norm=value=>String(value||'').trim().toLowerCase().replace(/[₀-₉]/g,c=>'₀₁₂₃₄₅₆₇₈₉'.indexOf(c));
 const d=titrations[titration.kind];
 const defaults=[d.analyte.replace(/^Unknown\s+/i,''),d.analyteReagent].some(value=>norm(value)===norm(analyte))&&norm(titrant)===norm(d.titrantReagent);
 if(defaults)return {kind:titration.kind,a:d.analyteCoeff,b:d.titrantCoeff,equation:d.eq,indicator:d.ind};
 const formula=value=>Object.keys(benchTitStocks).find(key=>[key,benchTitStockName(key)].some(entry=>norm(entry)===norm(value)));
 const pair=benchTitPair(formula(analyte),formula(titrant));
 return pair?.kind===titration.kind?pair:null;
}
function ttApplySelectedPair(){
 const field=id=>document.getElementById(id);
 const pair=ttSelectedPair(field('unknownSpecies').value,field('knownChemical').value);
 if(!pair)return;
 field('analyteCoeff').value=pair.a;field('titrantCoeff').value=pair.b;field('reactionEquation').value=pair.equation;
}
function benchTitDeliver(targetVolume){const s=titration.benchSession;if(!s||titration.done)return 'Start an unfinished bench-linked experiment.';benchTitCapture();if(s.pair.kind==='hypochlorite'&&!s.iodineReleased)return 'Add iodide and acetic acid to release iodine before titrating.';const va=Number(titration.sampleVol),current=Number(titration.volume)||0,delta=targetVolume-current,a=benchTitBottle(s.flask.id),b=benchTitBottle(s.burette.id);if(!Number.isFinite(targetVolume)||targetVolume<=0||delta< -1e-12)return 'Enter a positive cumulative delivered volume. Delivered liquid cannot be returned to the bottle.';if(!ttPositive(va))return 'Enter a finite, positive aliquot volume.';if(s.reserved&&Math.abs(va-s.reservedAliquot)>1e-10)return 'Restart the current run before changing its aliquot volume.';if(!a||!b)return 'A selected bottle is no longer available.';if(!s.reserved&&va>a.remaining+1e-10)return 'Not enough sample remains for this aliquot.';if(delta>b.remaining+1e-10)return 'Not enough titrant remains. In Open Bench, choose Refill active burette.';
 if(!s.reserved){a.remaining=Math.max(0,Number((a.remaining-va).toPrecision(14)));s.reserved=true;s.reservedAliquot=va;}b.remaining=Math.max(0,Number((b.remaining-Math.max(0,delta)).toPrecision(14)));titration.volume=Number(targetVolume.toPrecision(15));titration.history.push(titration.volume);titration._mixingPending=true;benchTitSave();return '';}
function benchTitSnapshot(){const s=titration.benchSession,ref=s.mode==='standardize'?s.flask:s.burette;return {bench:true,sessionId:s.id,analysisMode:s.mode,sampleVol:Number(titration.sampleVol),titre:Number(titration.volume),referenceC:Number(ref.assignedC),analyteCoeff:s.pair.a,titrantCoeff:s.pair.b,reactionEquation:s.pair.equation,unknownSpecies:s.mode==='standardize'?s.burette.chemical:s.flask.chemical,flaskName:s.flask.name,buretteName:s.burette.name,flaskId:s.flask.id,buretteId:s.burette.id,trueConcentration:s.mode==='standardize'?s.burette.truthC:s.flask.truthC,titrantC:s.burette.truthC};}
function benchTitRun(r){if(![r.sampleVol,r.titre,r.referenceC,r.analyteCoeff,r.titrantCoeff].every(ttPositive))return null;const standardize=r.analysisMode==='standardize',referenceMoles=r.referenceC*(standardize?r.sampleVol:r.titre)/1000,unknownMoles=referenceMoles*(standardize?r.titrantCoeff/r.analyteCoeff:r.analyteCoeff/r.titrantCoeff),unknownVolume=(standardize?r.titre:r.sampleVol)/1000;return {...r,referenceMoles,unknownMoles,unknownVolume,concentration:unknownMoles/unknownVolume};}
function benchTitrationResult(){const rows=(titration.runs||[]).map(benchTitRun);if(!rows.length||rows.some(x=>!x))return null;const moles=rows.reduce((sum,r)=>sum+r.unknownMoles,0),aliquot=rows.reduce((sum,r)=>sum+r.unknownVolume,0);return {rows,moles,aliquot,concentration:moles/aliquot,same:rows.every(r=>r.sampleVol===rows[0].sampleVol&&r.referenceC===rows[0].referenceC),meanTitre:rows.reduce((sum,r)=>sum+r.titre,0)/rows.length};}
function benchTitTable(){const r=benchTitrationResult();if(!r)return '<p class="notice">Record a titre to calculate concentration from your own endpoint.</p>';return `<p class="notice">${r.rows.length} titre${r.rows.length===1?'':'s'} recorded · latest titre: <b>${ttFmt(r.rows.at(-1).titre)} mL</b></p><div class="ch-scroll"><table class="table"><thead><tr><th>Run</th><th>Titre / mL</th><th>Aliquot / mL</th><th>Reference / mol L⁻¹</th><th>Calculated / mol L⁻¹</th></tr></thead><tbody>${r.rows.map((x,i)=>`<tr><td>${i+1}</td><td>${ttFmt(x.titre)}</td><td>${ttFmt(x.sampleVol)}</td><td>${ttFmt(x.referenceC)}</td><td>${ttFmt(x.concentration)}</td></tr>`).join('')}</tbody></table></div>`;}
function benchTitCalculation(){const result=benchTitrationResult();if(!result)return '<div class="notice">Record a valid endpoint titre. No concentration is substituted for an unrecorded measurement.</div>';const r=result.rows.at(-1),s=titration.benchSession,std=s.mode==='standardize';return `<div class="resultbox calculation-breakdown"><div class="eyebrow">${std?'BURETTE REAGENT STANDARDISATION':'FLASK SAMPLE ANALYSIS'}</div><div class="big">${ttFmt(result.concentration)} mol/L</div><b>${esc(r.unknownSpecies)} · calculated from recorded titres</b>${s.pair.kind==='hypochlorite'?`<p>In the analysed sample: ${ttFmt(result.concentration*74.44)} g/L as NaOCl · ${ttFmt(result.concentration*70.90)} g/L available chlorine as Cl₂.</p>`:''}<div class="formula">${std?'Cᵦ = Cₐ × (Vₐ / Vₜ) × (b / a)':'Cₐ = Cᵦ × (Vₜ / Vₐ) × (a / b)'}</div><p>Latest run: reference moles = ${ttFmt(r.referenceC)} × (${ttFmt(std?r.sampleVol:r.titre)} / 1000) = ${ttFmt(r.referenceMoles)} mol.<br>Unknown moles = ${ttFmt(r.referenceMoles)} × ${std?r.titrantCoeff:r.analyteCoeff} / ${std?r.analyteCoeff:r.titrantCoeff} = ${ttFmt(r.unknownMoles)} mol.<br>Concentration = ${ttFmt(r.unknownMoles)} / ${ttFmt(r.unknownVolume)} L = ${ttFmt(r.concentration)} mol/L.</p>${result.rows.length>1?`<p>Combined result = Σ unknown moles / Σ corresponding unknown-solution volume = ${ttFmt(result.moles)} / ${ttFmt(result.aliquot)} = ${ttFmt(result.concentration)} mol/L. Each run keeps its own aliquot and reference concentration.</p>`:''}${titration.done?`<button class="btn secondary small" type="button" data-bench-tit="reveal">Compare with preparation value</button>${s.reveal?`<p>Simulation preparation value: ${ttFmt(r.trueConcentration)} mol/L. Relative difference: ${ttFmt(Math.abs(result.concentration/r.trueConcentration-1)<1e-10?0:100*(result.concentration/r.trueConcentration-1))}%.</p>`:''}${std?`<button class="btn small" type="button" data-bench-tit="certify" ${result.rows.length<2?'disabled':''}>Use calculated value as a working standard</button><small>Record at least two runs first. All recorded runs contribute; repeat rough or overshot titrations before assigning a working standard. The assigned value is your calculated result, not the hidden preparation value.</small>`:''}`:'<p>Complete the analysis to compare with the preparation value.</p>'}</div>`;}
function benchTitLog(){return titration.history.length?`<div class="list">${titration.history.slice(-5).reverse().map(v=>`<div class="listitem"><b>${ttFmt(v)} mL</b><span>Recorded delivery · observe indicator</span></div>`).join('')}</div>`:'<div class="empty">No titrant delivered yet. Observe the indicator and reduce the addition near its transition.</div>';}
function benchTitRestart(all=false){if(all)benchTitArchive();Object.assign(titration,{volume:0,history:[],initialReading:'',finalReading:'',runSampleKey:null,done:false});if(all){titration.runs=[];titration.titreReadings=[];}Object.assign(titration.benchSession,{reserved:false,reservedAliquot:0,reveal:false,iodideAdded:false,iodineReleased:false,starchAdded:false});benchTitSave();}
function benchTitArchive(){const r=benchTitrationResult();if(r)benchTitState.reports.push({id:benchTitId(),createdAt:Date.now(),mode:titration.benchSession.mode,rows:JSON.parse(JSON.stringify(r.rows)),concentration:r.concentration});}
function benchTitStatus(message){const el=document.getElementById('titrationStatus');if(el)el.textContent=message||'Use your recorded endpoint to determine the unknown concentration. No predicted titre is displayed.';}
function benchTitBind(){if(page!=='titration')return;benchTitBindTabs();benchTitQuickSync();if(!titration.benchSession)return;benchTitCapture();const refresh=()=>render(),error=msg=>{if(msg)benchTitStatus(msg);else refresh();};document.getElementById('addTitrant').onclick=()=>{const step=Number(document.getElementById('step').value);if(!ttPositive(step)||step<1e-9){benchTitStatus('Enter a finite positive delivery step.');return;}titration.deliveryStep=step;error(benchTitDeliver(Number(titration.volume)+step));};document.getElementById('useBuretteReadings').onclick=()=>{const a=document.getElementById('initialReading').value,b=document.getElementById('finalReading').value;if(a===''||b===''||!Number.isFinite(Number(a))||!Number.isFinite(Number(b))||Number(a)<0||Number(b)<=Number(a)){benchTitStatus('Enter finite readings with final greater than initial.');return;}error(benchTitDeliver(Number(b)-Number(a)));};const reagent=document.getElementById('addHypochloriteReagent');if(reagent)reagent.onclick=()=>error(benchHypochloriteAdd(document.getElementById('hypochloriteReagent').value));const iodineStarch=document.getElementById('addIodineStarch');if(iodineStarch)iodineStarch.onclick=()=>error(benchIodineAdd());document.getElementById('markEndpoint').onclick=()=>{if(titration.kind==='hypochlorite'&&!titration.benchSession.starchAdded)return benchTitStatus('Add starch near the endpoint before recording your titre.');if(titration.kind==='iodine'&&!titration.benchSession.starchAdded)return benchTitStatus('Add starch near the endpoint before recording your titre.');if(titration.done||!titration.benchSession.reserved||!ttPositive(titration.volume))return;const r=benchTitSnapshot();titration.runs.push(r);titration.titreReadings=titration.runs.map(x=>x.titre);benchTitRestart(false);benchTitTab='results';refresh();benchTitStatus('Titre recorded: '+ttFmt(r.titre)+' mL. The recorded value is shown under Results.');};document.getElementById('restartCurrentRun').onclick=()=>{benchTitRestart(false);refresh();};document.getElementById('resetTitration').onclick=()=>{benchTitRestart(true);refresh();};document.getElementById('completeTitration').onclick=()=>{if(!benchTitrationResult())return;titration.done=true;benchTitSave();refresh();};document.getElementById('method').onchange=benchTitOnMethodChange;const indicator=document.getElementById('indicatorSelect');if(indicator){indicator.onchange=()=>{titration.indicatorName=indicator.value;refresh();};document.getElementById('addIndicator').onclick=()=>{const amount=Number(document.getElementById('indicatorAmount').value);if(!Number.isInteger(amount)||amount<1)return benchTitStatus('Enter a positive number of indicator drops.');titration.unknownAdditions=[{name:indicator.value,amount,unit:'drops',kind:'indicator'}];benchTitSave();refresh();};document.querySelectorAll('[data-remove-addition]').forEach(button=>button.onclick=()=>{titration.unknownAdditions=[];benchTitSave();refresh();});}document.getElementById('sampleVol').onchange=e=>{if(!titration.benchSession.reserved)titration.sampleVol=Number(e.target.value);benchTitCapture();const estimate=document.getElementById('titVolumeEstimate');estimate.innerHTML=benchTitEstimateHtml();estimate.hidden=!estimate.innerHTML;benchTitStatus();};document.getElementById('idealEndpoint').disabled=true;}
function benchTitLibraryStatus(text){const e=document.getElementById('benchTitLibraryStatus');if(e)e.textContent=text;}
document.addEventListener('change',e=>{if(e.target.id==='benchRefChemical')benchTitUpdateStockFields(e.target.value);if(e.target.id==='benchTitMode'){benchTitChoice={mode:e.target.value,flask:'',burette:''};render();}if(e.target.id==='benchTitFlask')benchTitChoice.flask=e.target.value;if(e.target.id==='benchTitBurette')benchTitChoice.burette=e.target.value;if(e.target.id==='benchTitQuickType'){benchTitQuickChoice={type:e.target.value,analyte:'',titrant:'',indicator:''};benchTitQuickSync();}if(e.target.id==='benchTitQuickFlask'){benchTitQuickChoice.analyte=e.target.value;benchTitQuickChoice.titrant='';benchTitQuickChoice.indicator='';benchTitQuickSync();}if(e.target.id==='benchTitQuickBurette'){benchTitQuickChoice.titrant=e.target.value;benchTitQuickChoice.indicator='';benchTitQuickSync();}if(e.target.id==='benchTitQuickIndicator')benchTitQuickChoice.indicator=e.target.value;});
document.addEventListener('click',e=>{const control=e.target.closest?.('[data-bench-tit]'),action=control?.dataset.benchTit;if(!action)return;
 if(action==='quick-start'){benchTitQuickStart();return;}
 if(action==='start-run'){
  if(!titration.benchSession && !ttDoseReady(benchTitStatus))return;
  document.getElementById('addTitrant')?.focus();return;
 }
 if(action==='practice-sample'){benchTitLoadPractice();return;}
 if(action==='open-preparations'){benchTitActivateTab('open',true);return;}
 if(action==='open'){go('titration');return;}if(action==='bench'){go('bench');return;}
 if(action==='export'){const a=selectedEquipment(),name=document.getElementById('benchReagentName')?.value,role=document.getElementById('benchReagentRole')?.value,v=Number(document.getElementById('benchExportVolume')?.value),out=benchTitExport(a,name,role,v);if(out.error){document.getElementById('benchExportStatus').textContent=out.error;return;}redrawBench();document.getElementById('gasStatus').textContent=a.benchExportMessage;return;}
 if(action==='reference'){
  const f=document.getElementById('benchRefChemical').value,stock=benchTitStocks[f],C=Number(document.getElementById('benchRefC').value),v=Number(document.getElementById('benchRefV').value);
  if(!stock||!ttPositive(C)||C>1||!ttPositive(v)){benchTitLibraryStatus('Enter a positive concentration up to 1 mol/L and a positive bottle volume.');return;}
  const role=document.getElementById('benchRefRole').value;
  if(!['unknown','known'].includes(role)){benchTitLibraryStatus('Choose whether this bottle is an unknown or reference.');return;}
  const id=benchTitId(),known=role==='known',name=benchTitStockName(f);
  benchTitState.samples.push({id,name:name+(known?' reference':' unknown'),formula:f,chemical:name,role,truthC:C,assignedC:known?C:null,remaining:v,initialVolume:v,verified:true,basis:'declared stock preparation',createdAt:Date.now()});
  const slot=benchTitChoice.mode==='standardize'?(known?'flask':'burette'):(known?'burette':'flask');
  benchTitChoice[slot]=id;
  benchTitSave();
  render();
  benchTitLibraryStatus(name+' prepared and selected.');
  return;
 }
 if(action==='transfer-vessel'){
  const field=id=>document.getElementById(id);
  const source=benchTitSourceVessels().find(item=>item.vessel.id===field('titSourceVessel').value);
  if(!source)return;
  const destination=field('titSourceRole').value,volume=Number(field('titSourceVolume').value);
  if(destination==='refill'){
   const message=benchTitRefill(source.vessel,volume);
   if(message){benchTitLibraryStatus(message);return;}
   render();benchTitLibraryStatus('Added '+ttFmt(volume)+' mL to the active burette supply.');return;
  }
  if(!['flask','burette'].includes(destination))return;
  const role=(benchTitChoice.mode==='assay')===(destination==='flask')?'unknown':'known';
  const result=benchTitExport(source.vessel,source.solution.chemical.name,role,volume);
  if(result.error){benchTitLibraryStatus(result.error);return;}
  benchTitChoice[destination]=result.sample.id;
  render();benchTitLibraryStatus('Transferred '+ttFmt(volume)+' mL to the '+destination+' selection. Load both bottles to start.');return;
 }
 if(action==='start'){const msg=benchTitStart(document.getElementById('benchTitMode').value,document.getElementById('benchTitFlask').value,document.getElementById('benchTitBurette').value);if(msg)benchTitLibraryStatus(msg);else{benchTitTab='setup';render();}return;}
 if(action==='manual'){if(titration.benchSession)benchTitArchive();titration=benchTitState.manualBackup?JSON.parse(JSON.stringify(benchTitState.manualBackup)):freshTitration('acid');benchTitSave();render();return;}
 if(action==='reveal'){if(titration.done){titration.benchSession.reveal=true;render();}return;}
 if(action==='certify'){const r=benchTitrationResult(),s=titration.benchSession,b=s&&benchTitBottle(s.burette.id);if(!titration.done||s?.mode!=='standardize'||!r||r.rows.length<2||!b)return;b.assignedC=r.concentration;b.role='known';b.standardisation={rows:JSON.parse(JSON.stringify(r.rows)),assignedC:r.concentration,createdAt:Date.now()};benchTitSave();render();benchTitLibraryStatus(`Assigned ${ttFmt(b.assignedC)} mol/L from your recorded titres to “${b.name}”.`);}
});
function benchTitPreparationPrediction(items){const e=benchEntries(items);if(!e.some(x=>benchTitCanon(x.f)==='KHC8H4O4')||e.some(x=>x.type!=='water'&&benchTitCanon(x.f)!=='KHC8H4O4'))return null;return {product:'Potassium hydrogen phthalate reference preparation',equation:'KHC₈H₄O₄(s) → K⁺(aq) + HC₈H₄O₄⁻(aq)',note:e.some(x=>x.solidStock&&!x.solidDissolved)?'Weighed KHP is present. Add water and use Mix to dissolve measured solid.':'KHP is a monoprotic acid reference for 1:1 titration with NaOH. Other mixtures are not assigned products by this preparation rule.',color:'#f7faf8',solutionColor:'#f7faf8',precipitate:false,gas:null,status:'qualitative',foodTest:true};}
