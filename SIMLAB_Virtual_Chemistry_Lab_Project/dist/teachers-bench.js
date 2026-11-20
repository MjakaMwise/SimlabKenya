'use strict';
const practicalStations = ()=>practical.session.stations;
const practical = {session:null, roster:null, assignments:[], selected:null, sort:'name', filter:'', active:null, drafts:new Map()};
const practicalHeader = () => head('SIMLAB CLASSROOM','Practical assignments','Collect your sample, record your findings, and hand in your report.');
const physicsQuestionMarker='[[SIMLAB_PHYSICS_VALUES]]';
function splitPhysicsQuestion(question=''){
  const text=String(question||''), start=text.lastIndexOf(physicsQuestionMarker);
  if(start<0)return {instructions:text,physics:null};
  const end=text.indexOf('[[/SIMLAB_PHYSICS_VALUES]]',start+physicsQuestionMarker.length);
  if(end<0)return {instructions:text,physics:null};
  try {
    const physics=JSON.parse(text.slice(start+physicsQuestionMarker.length,end).trim());
    return {instructions:text.slice(0,start).trimEnd(),physics};
  } catch { return {instructions:text,physics:null}; }
}
function packPhysicsQuestion(question,physics){
  const instructions=splitPhysicsQuestion(question).instructions.trim();
  return physics?instructions+'\n\n'+physicsQuestionMarker+'\n'+JSON.stringify(physics)+'\n[[/SIMLAB_PHYSICS_VALUES]]':instructions;
}
function physicsQuestionValuesHtml(physics){
  if(!physics?.values)return '';
  const v=physics.values, title={gas:'Gas laws',kinetics:'Reaction kinetics',gibbs:'Gibbs free energy',bomb:'Bomb calorimeter'}[physics.topic]||'Physical chemistry';
  const row=(label,initial,final,unit)=>{
    if((initial===undefined||initial==='')&&(final===undefined||final===''))return '';
    const shown=value=>value===undefined||value===''?'—':value;
    return '<tr><th>'+esc(label)+'</th><td>Initial: '+esc(shown(initial))+(initial!==''&&initial!==undefined?' '+esc(unit||''):'')+'</td><td>Final: '+esc(shown(final))+(final!==''&&final!==undefined?' '+esc(unit||''):'')+'</td></tr>';
  };
  const scalar=(label,key,unit)=>v[key]!==undefined&&v[key]!==''?'<tr><th>'+esc(label)+'</th><td colspan="2">'+esc(v[key])+(unit?' '+esc(unit):'')+'</td></tr>':'';
  let rows='';
  if(physics.topic==='gas'){
    rows+=scalar('Gas law','gasLaw','')
      +row('Pressure (P)',v.pressureInitial,v.pressureFinal,v.pressureUnit||'kPa')
      +row('Volume (V)',v.volumeInitial,v.volumeFinal,v.volumeUnit||'L')
      +row('Temperature (T)',v.temperatureInitial,v.temperatureFinal,v.temperatureUnit||'K')
      +row('Amount of gas (n)',v.amountInitial,v.amountFinal,v.amountUnit||'mol')
      +scalar('Heat capacity ratio (γ)','gamma','');
  }else if(physics.topic==='kinetics'){
    rows+=scalar('Reaction order','order','')
      +row('Concentration [A]',v.concentrationInitial,v.concentrationFinal,'mol/L')
      +row('Time',v.timeInitial,v.timeFinal,v.timeUnit||'s')
      +row('Temperature',v.temperatureInitial,v.temperatureFinal,v.temperatureUnit||'K')
      +scalar('Activation energy (Eₐ)','activationEnergy','kJ/mol')
      +scalar('Rate constant at 298.15 K (k₂₉₈)','rateConstant',v.rateConstantUnit||'s⁻¹')
      +scalar('Catalyst','catalyst','');
  }else if(physics.topic==='gibbs'){
    rows+=scalar('Enthalpy change (ΔH)','deltaH','kJ/mol')
      +scalar('Entropy change (ΔS)','deltaS','J/(mol·K)')
      +row('Temperature (T)',v.temperatureInitial,v.temperatureFinal,v.temperatureUnit||'K');
  }else if(physics.topic==='bomb'){
    rows+=scalar('Sample mass','bombMass','g')+scalar('Calorimeter constant','bombConstant','kJ/K')
      +scalar('Initial temperature, T₁','bombStartTemp','°C')+scalar('Final thermometer reading for student to record, T₂','bombEndTemp','°C')
      +scalar('Ignition-wire correction','bombFuseJ','J')+scalar('Acid-formation corrections','bombAcidJ','J');
  }
  return rows?'<section class="physics-given-values"><h3>Given physical-chemistry values · '+esc(title)+'</h3><table class="table"><thead><tr><th>Variable</th><th>Initial</th><th>Final</th></tr></thead><tbody>'+rows+'</tbody></table></section>':'';
}
function practicalQuestionHtml(question){
  const parts=splitPhysicsQuestion(question);
  return '<pre class="practical-instructions">'+esc(parts.instructions)+'</pre>'+physicsQuestionValuesHtml(parts.physics);
}
function physicsQuestionValuesText(physics){
  if(!physics?.values)return '';
  const v=physics.values, title={gas:'Gas laws',kinetics:'Reaction kinetics',gibbs:'Gibbs free energy',bomb:'Bomb calorimeter'}[physics.topic]||'Physical chemistry', lines=['Given physical-chemistry values · '+title];
  const pair=(label,key,unitKey,fallback)=>{
    const initial=v[key+'Initial'], final=v[key+'Final'];
    if((initial===undefined||initial==='')&&(final===undefined||final===''))return;
    const unit=v[unitKey]||fallback;
    lines.push(label+': initial '+(initial===undefined||initial===''?'—':initial)+(initial!==''&&initial!==undefined?' '+unit:'')+'; final '+(final===undefined||final===''?'—':final)+(final!==''&&final!==undefined?' '+unit:''));
  };
  const scalar=(label,key,unit)=>{if(v[key]!==undefined&&v[key]!=='')lines.push(label+': '+v[key]+(unit?' '+unit:''));};
  if(physics.topic==='gas'){
    scalar('Gas law','gasLaw','');pair('Pressure (P)','pressure','pressureUnit','kPa');pair('Volume (V)','volume','volumeUnit','L');pair('Temperature (T)','temperature','temperatureUnit','K');pair('Amount of gas (n)','amount','amountUnit','mol');scalar('Heat capacity ratio (γ)','gamma','');
  }else if(physics.topic==='kinetics'){
    scalar('Reaction order','order','');pair('Concentration [A]','concentration','','mol/L');pair('Time','time','timeUnit','s');pair('Temperature','temperature','temperatureUnit','K');scalar('Activation energy (Eₐ)','activationEnergy','kJ/mol');scalar('Rate constant at 298.15 K (k₂₉₈)','rateConstant',v.rateConstantUnit||'s⁻¹');scalar('Catalyst','catalyst','');
  }else if(physics.topic==='gibbs'){
    scalar('Enthalpy change (ΔH)','deltaH','kJ/mol');scalar('Entropy change (ΔS)','deltaS','J/(mol·K)');pair('Temperature (T)','temperature','temperatureUnit','K');
  }else if(physics.topic==='bomb'){
    scalar('Sample mass','bombMass','g');scalar('Calorimeter constant','bombConstant','kJ/K');scalar('Initial temperature, T₁','bombStartTemp','°C');scalar('Final thermometer reading for student to record, T₂','bombEndTemp','°C');scalar('Ignition-wire correction','bombFuseJ','J');scalar('Acid-formation corrections','bombAcidJ','J');
  }
  return lines.slice(1).length?lines.join('\n'):'';
}
function physicalValueInput(key,label,unit){
  return '<label>'+esc(label)+'<input type="number" step="any" data-pc-field="'+esc(key)+'">'+(unit?'<small>'+esc(unit)+'</small>':'')+'</label>';
}
function physicalUnitSelect(key,label,units,selected){
  return '<label>'+esc(label)+'<select data-pc-field="'+esc(key)+'">'+units.map(unit=>'<option value="'+esc(unit)+'" '+(unit===selected?'selected':'')+'>'+esc(unit)+'</option>').join('')+'</select></label>';
}
function physicalReadingPair(key,label,units,selected){
  return '<fieldset class="physical-reading-pair"><legend>'+esc(label)+'</legend><div class="practical-grid">'
    +physicalValueInput(key+'Initial','Initial reading')+physicalValueInput(key+'Final','Final reading')
    +physicalUnitSelect(key+'Unit','Units',units,selected)+'</div></fieldset>';
}
function physicalQuestionFieldsMarkup(){
  return '<fieldset id="physicalQuestionValues" hidden><legend>Physical-chemistry values for students</legend>'
    +'<p class="muted">Figures are optional. Enter any values you want to give students; leave the fields blank if you want them to interpret the question and enter the data themselves.</p>'
    +'<label>Question area<select name="physicalTopic"><option value="gas">Gas laws</option><option value="kinetics">Reaction kinetics</option><option value="gibbs">Gibbs free energy</option><option value="bomb">Bomb calorimeter</option></select></label>'
    +'<div data-physical-fields="gas"><label>Gas law<select data-pc-field="gasLaw"><option>Boyle’s law</option><option>Charles’s law</option><option>Gay-Lussac’s law</option><option>Avogadro’s law</option><option>Ideal gas equation</option></select></label>'
    +physicalReadingPair('pressure','Pressure (P)',['kPa','Pa','atm','bar'],'kPa')
    +physicalReadingPair('volume','Volume (V)',['L','mL','m³'],'L')
    +physicalReadingPair('temperature','Temperature (T)',['K','°C'],'K')
    +physicalReadingPair('amount','Amount of gas (n)',['mol'],'mol')
    +'<div class="practical-grid">'+physicalValueInput('gamma','Heat capacity ratio (γ)','optional; ideal diatomic gas ≈ 1.4')+'</div></div>'
    +'<div data-physical-fields="kinetics" hidden><div class="practical-grid">'
    +'<label>Reaction order<select data-pc-field="order"><option value="0">Zero order</option><option value="1" selected>First order</option><option value="2">Second order</option></select></label>'
    +physicalValueInput('activationEnergy','Activation energy (Eₐ)','kJ/mol')
    +physicalValueInput('rateConstant','Rate constant at 298.15 K (k₂₉₈)')
    +physicalUnitSelect('rateConstantUnit','Rate-constant units',['s⁻¹','mol L⁻¹ s⁻¹','L mol⁻¹ s⁻¹'],'s⁻¹')
    +physicalUnitSelect('catalyst','Catalyst condition',['Not specified','No catalyst','With catalyst'],'Not specified')+'</div>'
    +physicalReadingPair('concentration','Concentration [A]',['mol/L'],'mol/L')
    +physicalReadingPair('time','Time',['s','min'],'s')
    +physicalReadingPair('temperature','Temperature',['K','°C'],'K')+'</div>'
    +'<div data-physical-fields="gibbs" hidden><div class="practical-grid">'
    +physicalValueInput('deltaH','Enthalpy change (ΔH)','kJ/mol')
    +physicalValueInput('deltaS','Entropy change (ΔS)','J/(mol·K)')+'</div>'
    +physicalReadingPair('temperature','Temperature (T)',['K','°C'],'K')+'</div>'
    +'<div data-physical-fields="bomb" hidden><div class="practical-grid">'
    +physicalValueInput('bombMass','Sample mass','g')+physicalValueInput('bombConstant','Calorimeter constant','kJ/K')
    +physicalValueInput('bombFuseJ','Ignition-wire correction','J')+physicalValueInput('bombAcidJ','Acid-formation corrections','J')+'</div>'
    +physicalValueInput('bombStartTemp','Initial temperature, T₁','°C')+physicalValueInput('bombEndTemp','Final thermometer reading, T₂ (student records)','°C')+'<p class="muted bomb-temperature-help">This value is shown on the student’s thermometer after the simulated run. The student must enter and record T₂ before the energy result is calculated.</p></div>'
    +'<section class="teacher-physical-answer"><h3>Teacher answer check</h3><p>Optional: enter figures above and calculate expected results before sharing the question. This answer check is not shown to students.</p>'
    +'<label>Gas process for expected-work calculation<select data-teacher-work-process><option value="adiabatic">Reversible adiabatic</option><option value="isothermal">Reversible isothermal</option><option value="constant-pressure">Constant pressure</option></select></label>'
    +'<button type="button" class="btn secondary small" data-calculate-physical-answer>Calculate expected results</button><div data-physical-answer-output aria-live="polite"></div></section></fieldset>';
}
function teacherPhysicalAnswerHtml(topic, panel, process){
  const val=key=>{const field=panel.querySelector('[data-pc-field="'+key+'"]');return field?field.value.trim():''},num=key=>val(key)===''?null:Number(val(key)),unit=key=>val(key+'Unit');
  const shown=(label,value,u)=>'<tr><th>'+esc(label)+'</th><td>'+esc(Number(value).toPrecision(6))+(u?' '+esc(u):'')+'</td></tr>';
  if(topic==='gas'){
    const pFactor={Pa:.001,kPa:1,atm:101.325,bar:100}[unit('pressure')]||1,vFactor={L:1,mL:.001,'m³':1000}[unit('volume')]||1,tToK=(x)=>unit('temperature')==='°C'?x+273.15:x;
    const p1=num('pressureInitial')===null?null:num('pressureInitial')*pFactor,p2=num('pressureFinal')===null?null:num('pressureFinal')*pFactor,v1In=num('volumeInitial')===null?null:num('volumeInitial')*vFactor,v2In=num('volumeFinal')===null?null:num('volumeFinal')*vFactor,t1=num('temperatureInitial')===null?null:tToK(num('temperatureInitial')),t2=num('temperatureFinal')===null?null:tToK(num('temperatureFinal')),n1=num('amountInitial'),n2=num('amountFinal'),gamma=num('gamma')||1.4,R=8.314462618;
    let v1=v1In,v2=v2In;
    if(v1===null&&p1>0&&t1>0&&n1>0)v1=n1*R*t1/p1;
    if(v2===null&&v1>0&&p1>0&&p2>0){if(process==='adiabatic')v2=v1*Math.pow(p1/p2,1/gamma);else if(process==='isothermal')v2=p1*v1/p2;else if(t1>0&&t2>0)v2=v1*t2/t1;}
    let work=null;if(v1>0&&v2>0){if(process==='adiabatic'&&p1>0&&p2>0)work=(p1*v1-p2*v2)/(gamma-1);else if(process==='isothermal'&&n1>0&&t1>0)work=n1*R*t1*Math.log(v2/v1);else if(process==='constant-pressure'&&p1>0)work=p1*(v2-v1);}
    let rows='';if(v1>0)rows+=shown('Initial volume V₁',v1,'L');if(v2>0)rows+=shown('Final volume V₂',v2,'L');if(work!==null&&Number.isFinite(work))rows+=shown('Work done by gas',work,'J');
    if(!rows)return '<p class="muted">Enter enough gas figures to calculate an answer. For V₁, provide n₁, P₁, and T₁. For adiabatic V₂ and work, also provide P₂ and γ (or use the default γ = 1.4).</p>';
    return '<h4>Expected gas-law results</h4><table class="table"><tbody>'+rows+'</tbody></table><p class="muted">Assumptions: ideal gas; work is positive when done by the gas; γ = '+esc(gamma)+' for the selected work process.</p>';
  }
  if(topic==='bomb'){
    const mass=num('bombMass'),C=num('bombConstant'),t1=num('bombStartTemp'),t2=num('bombEndTemp'),fuse=num('bombFuseJ')||0,acid=num('bombAcidJ')||0;
    if(!(mass>0&&C>0&&t1!==null&&t2!==null&&t2>t1))return '<p class="muted">Enter sample mass, calorimeter constant, and initial and final temperatures to calculate the expected combustion energy.</p>';
    const qCal=C*(t2-t1)*1000,energy=qCal-fuse-acid;if(!(energy>0))return '<p class="muted">The corrections must be smaller than the measured heat absorbed by the calorimeter.</p>';
    return '<h4>Expected bomb-calorimeter results</h4><table class="table"><tbody>'+shown('Temperature rise',t2-t1,'°C')+shown('Heat absorbed by calorimeter',qCal/1000,'kJ')+shown('Heat released by sample',-energy/1000,'kJ')+shown('Specific energy released',energy/1000/mass,'kJ/g')+shown('ΔUcomb per gram',-energy/1000/mass,'kJ/g')+'</tbody></table><p class="muted">Assumes constant volume; the bomb-calorimeter energy equivalent includes the calorimeter assembly.</p>';
  }
  if(topic==='gibbs'){
    const H=num('deltaH'),S=num('deltaS'),unitT=unit('temperature'),tA=num('temperatureInitial'),tB=num('temperatureFinal'),toK=x=>x===null?null:unitT==='°C'?x+273.15:x;
    if(H===null||S===null||tA===null)return '<p class="muted">Enter ΔH, ΔS, and an initial temperature to calculate ΔG.</p>';
    let rows=shown('ΔG at initial temperature',H-toK(tA)*S/1000,'kJ mol⁻¹');if(tB!==null)rows+=shown('ΔG at final temperature',H-toK(tB)*S/1000,'kJ mol⁻¹');return '<h4>Expected Gibbs free-energy results</h4><table class="table"><tbody>'+rows+'</tbody></table><p class="muted">ΔG = ΔH − TΔS; entropy is converted from J to kJ.</p>';
  }
  const order=num('order'),c0=num('concentrationInitial'),timeRaw=num('timeFinal')??num('timeInitial'),time=timeRaw===null?null:timeRaw*(unit('time')==='min'?60:1),tempRaw=num('temperatureInitial'),temperature=tempRaw===null?null:unit('temperature')==='°C'?tempRaw+273.15:tempRaw,Ea=num('activationEnergy'),kRef=num('rateConstant');
  if(order===null||c0===null||time===null||temperature===null||Ea===null||kRef===null)return '<p class="muted">Enter reaction order, initial concentration, time, temperature, activation energy, and reference rate constant to calculate the expected kinetics result.</p>';
  let k=kRef*Math.exp(-Ea*1000/8.314462618*(1/temperature-1/298.15)),c=order===0?Math.max(0,c0-k*time):order===1?c0*Math.exp(-k*time):c0/(1+k*c0*time),rate=k*Math.pow(c,order);
  return '<h4>Expected kinetics results</h4><table class="table"><tbody>'+shown('Rate constant at entered temperature',k,'')+shown('Concentration at entered time',c,'mol/L')+shown('Instantaneous rate',rate,'')+'</tbody></table><p class="muted">Calculated using the selected integrated rate law and Arrhenius temperature dependence.</p>';
}
const practicalSignIn = () => '<a class="btn" target="_top" href="/signin-with-chatgpt?return_to='+encodeURIComponent(location.pathname+location.search)+'">Sign in with ChatGPT</a>';
async function practicalApi(path, data) {
  const response = await fetch('/api/practicals/'+path, data === undefined ? {} : {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)
  });
  const result = await response.json().catch(()=>({error:'The classroom service is unavailable.'}));
  if (!response.ok) throw Object.assign(new Error(result.error), {status:response.status});
  return result;
}
async function practicalRefresh() {
  const root = $('#practicalWorkspace');
  if (!root) return;
  try {
    practical.session = await practicalApi('session');
    if (page === 'teachers') {
      practical.roster = practical.session.teacher ? await practicalApi('teacher') : null;
      if (root.isConnected) practicalTeacher(root);
    } else {
      const assignments=(await practicalApi('student')).assignments;
      practical.assignments=await Promise.all(assignments.map(async item=>({...item,...await practicalApi('student/'+item.id)})));
      if (root.isConnected) practicalStudent(root);
    }
  } catch (error) {
    if (root.isConnected) root.innerHTML = '<p class="notice">'+esc(error.message)+'</p>'+(error.status===401?practicalSignIn():'');
  }
}
function practicalPage() {
  return (page === 'teachers' ? head('SIMLAB CLASSROOM','Teachers Bench','Prepare practical samples and organize student work.') : practicalHeader())
    +'<section class="panel practical-panel" id="practicalWorkspace"><p role="status">Connecting to the classroom…</p></section>';
}
function practicalBind() {
  if (page === 'teachers' || page === 'practicals') practicalRefresh();
  if (practical.active?.station === page && !$('#practicalStationBanner')) {
    const banner = document.createElement('aside');
    banner.id = 'practicalStationBanner';
    banner.className = 'notice practical-banner';
    banner.innerHTML = '<b>'+esc(practical.active.label||'Class practical')+'</b><span>'+esc(practical.active.title)+'</span><button class="btn secondary small" type="button">Return to practical report</button>';
    banner.querySelector('button').onclick = ()=>go('practicals');
    $('#content').prepend(banner);
  }
}
function practicalStatus(root, message) { const status = root.querySelector('[data-practical-status]'); if (status) status.textContent = message; }
function practicalJob(root, button, action) {
  if (button) button.disabled = true;
  practicalStatus(root, 'Working…');
  Promise.resolve().then(action).catch(error=>practicalStatus(root,error.message)).finally(()=>{if(button)button.disabled=false;});
}
function practicalTabs(labels) {
  return '<div class="practical-tabs" role="tablist" aria-label="Teachers Bench sections">'+Object.entries(labels).map(([id,label])=>
    '<button type="button" id="teacher-tab-'+id+'" role="tab" aria-controls="teacher-panel-'+id+'" aria-selected="false" tabindex="-1">'+label+'</button>').join('')+'</div>';
}
function practicalTabPanel(id,content) {
  return '<section id="teacher-panel-'+id+'" data-teacher-panel="'+id+'" role="tabpanel" aria-labelledby="teacher-tab-'+id+'" hidden>'+content+'</section>';
}
function practicalBindTabs(root, initial) {
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const panels = [...root.querySelectorAll('[data-teacher-panel]')];
  function select(id, focus=false) {
    tabs.forEach(tab=>{
      const selected=tab.id==='teacher-tab-'+id;
      tab.setAttribute('aria-selected',String(selected));
      tab.tabIndex=selected?0:-1;
      if (selected && focus) tab.focus();
    });
    panels.forEach(panel=>{panel.hidden=panel.dataset.teacherPanel!==id;});
  }
  tabs.forEach((tab,index)=>{
    const id=tab.id.slice('teacher-tab-'.length);
    tab.onclick=()=>select(id);
    tab.onkeydown=event=>{
      const offsets={ArrowLeft:-1,ArrowRight:1};
      const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:
        Object.hasOwn(offsets,event.key)?(index+offsets[event.key]+tabs.length)%tabs.length:null;
      if (next===null) return;
      event.preventDefault();
      select(tabs[next].id.slice('teacher-tab-'.length),true);
    };
  });
  select(initial);
  return select;
}
function practicalUvFields(){
  return '<div class="practical-grid" style="grid-column:1/-1" data-uv-method>'
    +'<label data-uv-custom-name hidden>Teacher’s compound name<input data-uv-compound maxlength="160"></label><p data-uv-custom-note hidden>Uses a generic simulated spectrum. Use published data to guide your method.</p>'
    +'<label>Sample label<input data-uv-sample-label maxlength="70" placeholder="Optional · assigned automatically"></label>'
    +'<label>Preparation<select data-uv-prepare><option value="solution">Enter solution concentration</option><option value="solid">Dissolve a weighed solid</option></select></label>'
    +'<label>Solvent / blank<select data-uv-solvent><option value="water">Water</option><option value="ethanol">Ethanol</option><option value="phosphate78">Phosphate buffer pH 7.8</option><option value="phosphateReagent">Phosphate reagent blank</option><option value="nitrogenReagent">Nitrate / nitrite reagent blank</option><option value="silicaReagent">Silica reagent blank</option></select></label>'
    +'<label data-uv-solid hidden>Solid mass (mg)<input type="number" data-uv-mass step="any" min=".000001" value="1"></label>'
    +'<label data-uv-solid hidden>Final solution volume (mL)<input type="number" data-uv-volume step="any" min=".000001" value="100"></label>'
    +'<label data-uv-solid hidden>Molar mass (g/mol)<input type="number" data-uv-molar step="any" min=".001"></label>'
    +'<label>Dilution factor before measurement<input type="number" data-uv-dilution min="1" step="any" value="1"></label>'
    +'<label>Measurement wavelengths (nm)<input data-uv-wavelengths placeholder="e.g. 260, 271" maxlength="40"></label>'
    +'<label>Calibration minimum (µM)<input data-uv-low type="number" min=".000001" step="any" placeholder="Optional"></label>'
    +'<label>Calibration maximum (µM)<input data-uv-high type="number" min=".000001" step="any" placeholder="Optional"></label>'
    +'<p data-uv-preview class="notice"></p><div><label>Compound name for literature search<input type="search" maxlength="160" data-uv-search-name placeholder="Type any compound name"></label><a data-uv-literature target="_blank" rel="noopener">Search published UV absorbance</a><br><a data-uv-source target="_blank" rel="noopener" hidden>Open reference spectrum</a></div></div>';
}
function practicalUvInput(row){
  const value=key=>row.querySelector('[data-uv-'+key+']').value.trim();
  const optional=key=>value(key)===''?null:Number(value(key));
  return {compoundName:value('compound'),preparation:value('prepare'),mass:optional('mass'),volume:optional('volume'),molarMass:optional('molar'),
    solvent:value('solvent'),dilution:optional('dilution'),low:optional('low'),high:optional('high'),
    wavelengths:value('wavelengths').split(/[\s,]+/).filter(Boolean).map(Number)};
}
function practicalBindUvPreparation(row, amount){
  const get=key=>row.querySelector('[data-uv-'+key+']');
  function preview(){
    const input=practicalUvInput(row), solid=input.preparation==='solid';
    amount.disabled=solid;
    amount.closest('label').hidden=solid;
    row.querySelectorAll('[data-uv-solid]').forEach(label=>{
      label.hidden=!solid;
      label.querySelector('input').disabled=!solid;
      label.querySelector('input').required=solid;
    });
    const prepared=solid?input.mass*1e6/(input.volume*input.molarMass):Number(amount.value);
    const measurement=prepared/input.dilution;
    get('preview').textContent=Number.isFinite(measurement)&&measurement>0
      ? 'Teacher preview · '+prepared.toPrecision(5)+' µM prepared · '+measurement.toPrecision(5)+' µM in cuvette'
      : 'Enter positive preparation values to preview the concentration.';
  }
  row.addEventListener('input',preview);
  get('prepare').onchange=preview;
  return profile=>{
    get('molar').value=profile.molarMass??'';
    get('wavelengths').placeholder=String(profile.peak);
    const search = get('search-name');
    const compound=get('compound'), custom=profile.id==='teacherUnknown';
    get('custom-name').hidden=!custom;
    get('custom-note').hidden=!custom;
    compound.disabled=!custom;
    compound.required=custom;
    search.placeholder=profile.name.split(' · ')[0];
    const updateSearch=()=>{
      const name=search.value.trim()||(custom?compound.value.trim():'')||search.placeholder;
      get('literature').href='https://scholar.google.com/scholar?q='+encodeURIComponent(name+' UV–Vis absorbance spectrum molar absorptivity');
    };
    search.oninput=updateSearch;
    compound.oninput=updateSearch;
    search.onkeydown=event=>{
      if(event.key!=='Enter')return;
      event.preventDefault();
      get('literature').click();
    };
    updateSearch();
    const source=get('source');
    source.hidden=!profile.spectrumSource;
    if(profile.spectrumSource)source.href=profile.spectrumSource;
    preview();
  };
}
function practicalTeacher(root) {
  if (!practical.session.teacher) {
    root.innerHTML = '<section class="practical-onboarding"><h2>Create your teacher workspace</h2>'
      +'<p>Your account will own its practicals, saved questions and student submissions. Students join each practical through a personal link from you.</p>'
      +'<button class="btn" type="button" data-create-teacher-workspace>Create teacher workspace</button>'
      +'<p role="status" data-practical-status></p></section>';
    const button=root.querySelector('[data-create-teacher-workspace]');
    button.onclick=()=>practicalJob(root,button,async()=>{
      await practicalApi('teacher/register',{});
      await practicalRefresh();
    });
    return;
  }
  const create = '<h2>Create a practical</h2><div class="practical-grid"><label>Practical title<input name="title" maxlength="120" required></label><label>Unknown sample label<input name="label" maxlength="70" value="Unknown A" required></label><label>Workstation<select name="station">'
    +Object.entries(practicalStations()).map(([key,name])=>'<option value="'+key+'">'+name+'</option>').join('')
    +'<option value="aas">Atomic absorption (AAS)</option>'
    +'</select></label></div><label>Instructions and questions<textarea name="questions" rows="5" maxlength="8000" required placeholder="Type your question here. Structured figures are optional; leave them blank if students should interpret the question and enter the data themselves."></textarea></label>'
    +physicalQuestionFieldsMarkup()
    +'<fieldset id="practicalAasUnknownFields" hidden><legend>AAS unknown preparation</legend><p class="muted">Add one or more elements with target concentrations. Each element gets its own code because AAS requires a matching lamp, method and calibration. Choose students across folders; switching folders keeps earlier selections.</p><div data-practical-aas-fields></div><button type="button" class="btn secondary small" data-add-aas-element>Add another element</button><details class="teacher-aas-tools"><summary>Saved AAS assignments and student results</summary><section class="teacher-aas-assignments"><h3>Saved assignments</h3><div data-aas-teacher-assignments></div></section><section class="teacher-aas-review"><h3>Review a student result</h3><label>Student result code<textarea data-aas-review-code rows="4" placeholder="Paste the result code returned by the student"></textarea></label><button type="button" class="btn secondary" data-aas-review-submit>Review result</button></section><section class="teacher-aas-assignments"><h3>Student results</h3><div data-aas-teacher-reviews></div></section></details></fieldset><div data-practical-aas-links hidden></div>'
    +'<label class="practical-sample-toggle"><span>Include a prepared sample</span><input type="checkbox" name="withSample" checked></label><p class="muted" id="practicalStationHint"></p><fieldset id="practicalSampleFields"><legend>Sample preparation</legend><p class="muted" id="practicalRecipeHint"></p><label id="practicalTitrationMethod">Titration method<select name="titrationMethod">'+Object.entries(practical.session.titrationMethods).map(([key,name])=>'<option value="'+esc(key)+'">'+esc(name)+'</option>').join('')+'</select></label><label id="practicalTitrationReference"><span>Supply the reference titrant with this sample</span><input type="checkbox" name="includeReference"></label><div id="practicalUvSampleTable" hidden></div><div id="practicalRecipe"></div><button type="button" class="btn secondary small" data-add-component>Add reagent</button></fieldset>'
    +'<fieldset class="teacher-assignment-roster"><legend>Select from My students</legend><p class="muted">Choose a folder, then select the students who should receive this practical. Practical links support up to 60 students each.</p><label>Student folder<select data-assignment-folder></select></label><div data-assignment-students></div></fieldset>'
    +'<label>Additional students<textarea name="students" rows="4" maxlength="9500" placeholder="Name | class/group | email"></textarea></label><p class="muted">Use one student per line. Selecting a student from My students automatically uses the saved email. If no students are selected or entered, one claimable link will be created.</p>'
    +'<div class="practical-actions"><button class="btn">Create practical and student links</button><button type="button" class="btn secondary" data-save-question-set>Save questions and sample as a reusable set</button></div>';
  const questionSets = '<h2>Question sets and assigned questions</h2><p class="muted">Saved sets keep the instructions, workstation, optional sample recipe and physical-chemistry values. You can reuse them when creating another practical.</p><div id="practicalQuestionSets"></div>';
  const roster = '<div class="practical-heading"><h2>Student submissions</h2><button type="button" class="btn secondary small" data-refresh-teacher-roster>Refresh claim status</button><label>Sort by <select data-roster-sort><option value="name">Student name</option><option value="group">Class or group</option><option value="status">Submission status</option><option value="recent">Latest submission</option></select></label></div>'
    +'<label>Filter by student, class, or practical<input data-roster-filter type="search"></label><div id="practicalRoster"></div>';
  const myStudents = '<h2>My students</h2><p class="muted">Keep a reusable list of students, organized in folders such as class, year, or course. Paste one student per line as <code>Name | class/group | email</code>. Email is optional.</p>'
    +'<div class="teacher-roster-tools"><form data-create-roster-folder><label>New folder label<input name="label" maxlength="80" required placeholder="e.g. Form 3 Chemistry"></label><button class="btn secondary">Create folder</button></form>'
    +'<form data-import-roster-students><label>Import into folder<select name="folderId" data-roster-folder required></select></label><label>Paste student list<textarea name="students" rows="7" maxlength="16000" required placeholder="Amina Hassan | Form 3A | amina@example.com&#10;Brian Otieno | Form 3A | brian@example.com&#10;Name | class/group | email"></textarea></label><button class="btn">Add students</button></form></div>'
    +'<section class="teacher-roster-list"><div class="practical-heading"><h3>Students in folder</h3><label>Folder<select data-roster-view-folder></select></label></div><div data-roster-student-list></div></section>';
  root.innerHTML='<div class="practical-heading">'+practicalTabs({create:'Create practical',questions:'My questions',import:'Import reagents',students:'My students',roster:'Student submissions'})
    +'</div><p role="status" data-practical-status></p>'
    +'<form class="practical-form" id="practicalForm">'+practicalTabPanel('create',create)
    +practicalTabPanel('import',practicalImportHtml())+'</form>'
    +practicalTabPanel('questions',questionSets)
    +practicalTabPanel('students',myStudents)
    +practicalTabPanel('roster','<div id="practicalNewLinks" hidden></div>'+roster);
  const selectTab = practicalBindTabs(root,'create');
  const form = root.querySelector('form'), rows = root.querySelector('#practicalRecipe');
  const add = root.querySelector('[data-add-component]');
  const aasApi=window.simlabAasTeacher;
  const aasFieldList=root.querySelector('[data-practical-aas-fields]');
  const aasAddElement=root.querySelector('[data-add-aas-element]');
  const aasAssignmentsTarget=root.querySelector('[data-aas-teacher-assignments]');
  const aasReviewButton=root.querySelector('[data-aas-review-submit]');
  const aasReviewCode=root.querySelector('[data-aas-review-code]');
  const aasReviewsTarget=root.querySelector('[data-aas-teacher-reviews]');
  const aasElements=aasApi?.elements||[];
  aasApi?.restoreAssignments(practical.roster?.aasAssignments||[]);
  function aasShareLink(code){const returnTo=location.pathname+'?aas='+encodeURIComponent(code);return location.origin+'/signin-with-chatgpt?return_to='+encodeURIComponent(returnTo);}
  async function copyAasText(value,field,successMessage){
    try{
      if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);practicalStatus(root,successMessage);return;}
    }catch{}
    if(field){
      field.hidden=false;field.value=value;
      try{field.focus({preventScroll:true});}catch{try{field.focus();}catch{}}
      try{field.select();}catch{}
      try{field.setSelectionRange(0,field.value.length);}catch{}
      try{if(document.execCommand?.('copy')){practicalStatus(root,successMessage);return;}}catch{}
      practicalStatus(root,'The text is selected. Press Ctrl+C to copy it.');return;
    }
    practicalStatus(root,'Select the text from its box and press Ctrl+C.');
  }
  function updateAasTeacherRange(row,resetInvalid=false){
    const selector=row.querySelector('[data-practical-aas-element]'),concentration=row.querySelector('[data-practical-aas-concentration]'),range=row.querySelector('[data-practical-aas-range]');
    const element=aasElements.find(item=>item.symbol===selector.value);
    if(!element)return;
    concentration.min=element.range[0];concentration.max=element.range[1];
    const value=Number(concentration.value);
    if(resetInvalid||!Number.isFinite(value)||value<element.range[0]||value>element.range[1])concentration.value=element.suggested;
    range.textContent='Valid '+element.name+' concentration range: '+element.range[0]+'–'+element.range[1]+' mg/L.';
  }
  function addAasElementRow(symbol='Cu'){
    const row=document.createElement('div');row.className='teacher-aas-element-row';
    row.innerHTML='<label>Element<select data-practical-aas-element></select></label><label>Assigned concentration (mg/L)<input data-practical-aas-concentration type="number" step="any" required></label><button type="button" class="btn secondary small" data-remove-aas-element>Remove element</button><p class="muted" data-practical-aas-range></p>';
    const selector=row.querySelector('[data-practical-aas-element]');
    selector.innerHTML=aasElements.map(item=>'<option value="'+esc(item.symbol)+'" '+(item.symbol===symbol?'selected':'')+'>'+esc(item.name)+' ('+esc(item.symbol)+')</option>').join('');
    selector.onchange=()=>updateAasTeacherRange(row,true);
    row.querySelector('[data-remove-aas-element]').onclick=()=>{if(aasFieldList.children.length>1){row.remove();updateAasElementControls();}};
    aasFieldList.append(row);updateAasTeacherRange(row,true);updateAasElementControls();return row;
  }
  function updateAasElementControls(){
    const rows=[...aasFieldList.children],used=rows.map(row=>row.querySelector('[data-practical-aas-element]').value);
    rows.forEach(row=>{const selector=row.querySelector('[data-practical-aas-element]');[...selector.options].forEach(option=>option.disabled=option.value!==selector.value&&used.includes(option.value));row.querySelector('[data-remove-aas-element]').hidden=rows.length===1;});
    aasAddElement.disabled=rows.length>=aasElements.length;
  }
  function collectAasElements(){return [...aasFieldList.children].map(row=>({element:row.querySelector('[data-practical-aas-element]').value,concentration:row.querySelector('[data-practical-aas-concentration]').value}));
  }
  function renderAasAssignments(){
    const assignments=aasApi?.getAssignments()||[];
    aasAssignmentsTarget.innerHTML=assignments.length?assignments.map(item=>{
      const rosterStudent=(practical.roster?.rosterStudents||[]).find(student=>student.id===item.studentId);
      const email=item.studentEmail||rosterStudent?.email||'';
      return '<details class="teacher-aas-assignment"><summary>'+esc(item.assignmentTitle||item.sampleLabel)+' · '+esc(item.element)+(item.studentName?' · '+esc(item.studentName):'')+' · answer key '+Number(item.concentration).toLocaleString()+' mg/L</summary><p>Saved '+new Date(item.createdAt).toLocaleString()+(item.folderLabel?' · Folder: '+esc(item.folderLabel):'')+(item.studentGroup?' · '+esc(item.studentGroup):'')+(email?' · '+esc(email):'')+'</p><label>Short student code<textarea readonly rows="2">'+esc(item.code)+'</textarea></label><button type="button" class="btn secondary small" data-copy-aas-assignment="'+esc(item.id)+'">Copy code</button><label>Student assignment link<input type="text" readonly hidden data-assignment-link aria-label="Student assignment link"></label><button type="button" class="btn secondary small" data-copy-aas-link="'+esc(item.id)+'">Copy link</button>'+practicalEmailAssignmentAction(email,item.studentName||'student',item.assignmentTitle||'AAS assignment',aasShareLink(item.code))+'</details>';
    }).join(''):'<p class="muted">No AAS assignments saved yet.</p>';
    aasAssignmentsTarget.querySelectorAll('[data-copy-aas-assignment]').forEach(button=>button.onclick=()=>{
      const assignment=assignments.find(item=>item.id===button.dataset.copyAasAssignment);
      if(assignment)copyAasText(assignment.code,button.closest('.teacher-aas-assignment')?.querySelector('textarea'),'Short AAS code copied.');
    });
    aasAssignmentsTarget.querySelectorAll('[data-copy-aas-link]').forEach(button=>button.onclick=()=>{const assignment=assignments.find(item=>item.id===button.dataset.copyAasLink);if(assignment)copyAasText(aasShareLink(assignment.code),button.closest('.teacher-aas-assignment')?.querySelector('[data-assignment-link]'),'Student AAS link copied.');});
    practicalBindEmailActions(aasAssignmentsTarget);
    aasReviewsTarget.innerHTML=(aasApi?.getReviews()||[]).length?(aasApi.getReviews()).map(item=>{const assignment=assignments.find(record=>record.id===item.assignmentId);return '<article class="teacher-aas-review-item"><b>'+esc(item.studentName||'Student')+' · '+esc(item.sampleId||'Unknown')+'</b><span>'+esc(item.element||'')+' · measured '+Number(item.result).toFixed(3)+' mg/L'+(assignment?' · target '+Number(assignment.concentration).toLocaleString()+' mg/L':'')+'</span><small>'+(assignment?(100*Number(item.result)/Number(assignment.concentration)).toFixed(1)+'% recovery':'Answer key not found on this device')+'</small></article>';}).join(''):'<p class="muted">No student results reviewed yet.</p>';
  }
  addAasElementRow();aasAddElement.onclick=()=>{const used=new Set(collectAasElements().map(item=>item.element));const next=aasElements.find(item=>!used.has(item.symbol));if(next)addAasElementRow(next.symbol);};
  renderAasAssignments();
  const aasLinks=root.querySelector('[data-practical-aas-links]');
  function bindPracticalAasCopyButtons(){
    aasLinks.querySelectorAll('[data-copy-practical-aas]').forEach(button=>button.onclick=()=>{
      const assignment=(aasApi?.getAssignments()||[]).find(item=>item.id===button.dataset.copyPracticalAas);
      if(assignment)copyAasText(assignment.code,button.closest('.teacher-aas-assignment')?.querySelector('textarea'),'Short AAS code copied for '+button.dataset.studentName+'.');
    });
    aasLinks.querySelectorAll('[data-copy-practical-aas-link]').forEach(button=>button.onclick=()=>{
      const assignment=(aasApi?.getAssignments()||[]).find(item=>item.id===button.dataset.copyPracticalAasLink);
      if(assignment)copyAasText(aasShareLink(assignment.code),button.closest('.teacher-aas-assignment')?.querySelector('[data-assignment-link]'),'Student AAS link copied for '+button.dataset.studentName+'.');
    });
    practicalBindEmailActions(aasLinks);
  }
  aasReviewButton.onclick=()=>practicalJob(root,aasReviewButton,async()=>{
    if(!aasApi)throw Error('AAS unknown service is not ready. Reload Teachers Bench and try again.');
    const result=aasApi.reviewSubmission(aasReviewCode.value);
    aasReviewCode.value='';renderAasAssignments();practicalRoster(root);
    practicalStatus(root,result.matched?'Student result reviewed; matching teacher answer key found.':'Student result reviewed. Matching teacher answer key is not available on this device.');
  });
  const catalog = {...practical.session.catalog};
  chemicalRestoreImports();
  catalog.bench = [...catalog.bench, ...reagents.filter(r=>r[2]==='publicationCustom').map((r,i)=>({
    id:'custom-'+i,name:r[0]+' · '+r[1],group:'Imported chemicals',unit:'mL',molar:true,defaultC:r[6],
    custom:{name:r[0],formula:r[1]}
  }))];
  const physicsPanel=root.querySelector('#physicalQuestionValues'), physicsTopic=form.elements.physicalTopic;
  const selectedRosterStudents=new Set();
  const assignmentFolder=root.querySelector('[data-assignment-folder]');
  const assignmentStudentList=root.querySelector('[data-assignment-students]');
  function renderAssignmentPicker(){
    const folders=practical.roster?.rosterFolders||[];
    assignmentFolder.innerHTML=folders.length?folders.map(folder=>'<option value="'+esc(folder.id)+'">'+esc(folder.label)+'</option>').join(''):'<option value="">No student folders yet</option>';
    const folderId=assignmentFolder.value;
    const students=(practical.roster?.rosterStudents||[]).filter(student=>student.folder_id===folderId);
    assignmentStudentList.innerHTML=students.length?'<div class="teacher-roster-checks"><label class="teacher-roster-check teacher-roster-select-all"><input type="checkbox" data-assignment-select-all> Select all in this folder</label>'+students.map(student=>'<label class="teacher-roster-check"><input type="checkbox" data-assignment-student="'+esc(student.id)+'" '+(selectedRosterStudents.has(student.id)?'checked':'')+'><span><b>'+esc(student.name)+'</b>'+(student.class_group?'<small>'+esc(student.class_group)+'</small>':'')+'<small>'+esc(student.email||'Email not added')+'</small></span></label>').join('')+'</div>':'<p class="muted">'+(folders.length?'This folder has no students yet.':'Create a folder and add students in My students.')+'</p>';
    assignmentStudentList.querySelectorAll('[data-assignment-student]').forEach(check=>check.onchange=()=>{
      if(check.checked&&selectedRosterStudents.size>=60){check.checked=false;practicalStatus(root,'Select up to 60 students for one practical.');return;}
      check.checked?selectedRosterStudents.add(check.dataset.assignmentStudent):selectedRosterStudents.delete(check.dataset.assignmentStudent);
    });
    const all=assignmentStudentList.querySelector('[data-assignment-select-all]');
    if(all)all.onchange=()=>{assignmentStudentList.querySelectorAll('[data-assignment-student]').forEach(check=>{check.checked=all.checked;check.onchange();});};
  }
  assignmentFolder.onchange=renderAssignmentPicker;
  renderAssignmentPicker();
  function prepareFreshAssignment(stationValue){
    form.reset();
    selectedRosterStudents.clear();
    form.elements.station.value=stationValue||form.elements.station.options[0]?.value||'bench';
    form.elements.station.dispatchEvent(new Event('change',{bubbles:true}));
    form.elements.title.value='';
    form.elements.questions.value='';
    form.elements.students.value='';
    renderAssignmentPicker();
    if(form.elements.station.value==='aas'){
      aasFieldList.replaceChildren();
      addAasElementRow();
      aasLinks.hidden=true;
      aasLinks.replaceChildren();
    }
    selectTab('create',true);
    practicalStatus(root,'The previous assignment is saved. Set up the next assignment below.');
    form.elements.title.focus();
  }
  const folderOptions=()=>'<option value="">Choose a folder</option>'+(practical.roster?.rosterFolders||[]).map(folder=>'<option value="'+esc(folder.id)+'">'+esc(folder.label)+'</option>').join('');
  const createFolderForm=root.querySelector('[data-create-roster-folder]');
  const importRosterForm=root.querySelector('[data-import-roster-students]');
  const rosterFolderSelect=root.querySelector('[data-roster-folder]');
  const rosterViewFolder=root.querySelector('[data-roster-view-folder]');
  const rosterStudentList=root.querySelector('[data-roster-student-list]');
  function renderRosterManager(){
    const folders=practical.roster?.rosterFolders||[];
    rosterFolderSelect.innerHTML=folderOptions();
    const current=rosterViewFolder.value;
    rosterViewFolder.innerHTML=folderOptions();
    if(current&&folders.some(folder=>folder.id===current))rosterViewFolder.value=current;
    else if(folders.length)rosterViewFolder.value=folders[0].id;
    const folderId=rosterViewFolder.value;
    const students=(practical.roster?.rosterStudents||[]).filter(student=>student.folder_id===folderId);
    if(!folders.length){rosterStudentList.innerHTML='<p class="muted">Create your first folder to start building your student list.</p>';return;}
    rosterStudentList.innerHTML='<form class="teacher-roster-add-one" data-roster-add-one><label>Student name<input name="name" maxlength="100" required placeholder="Student name"></label><label>Class or group<input name="group" maxlength="60" placeholder="Optional"></label><label>Student email<input name="email" type="email" maxlength="254" placeholder="Optional"></label><button class="btn">Add to this class</button></form>'
      +(students.length?'<p class="teacher-roster-count">Showing all '+students.length+' student'+(students.length===1?'':'s')+' in this folder.</p><form data-roster-student-actions><div class="teacher-roster-table-wrap"><table class="teacher-roster-edit-table"><thead><tr><th><input type="checkbox" data-roster-select-all aria-label="Select all students"></th><th>#</th><th>Student name</th><th>Class or group</th><th>Email</th><th>Action</th></tr></thead><tbody>'+students.map((student,index)=>'<tr data-edit-roster-student="'+esc(student.id)+'"><td><input type="checkbox" name="studentId" value="'+esc(student.id)+'" aria-label="Select '+esc(student.name)+'"></td><td class="teacher-roster-row-number">'+(index+1)+'</td><td><input name="name" aria-label="Student name" value="'+esc(student.name)+'" maxlength="100" required></td><td><input name="group" aria-label="Class or group" value="'+esc(student.class_group||'')+'" maxlength="60"></td><td><input name="email" type="email" aria-label="Student email" value="'+esc(student.email||'')+'" maxlength="254"></td><td><button class="btn secondary small" type="button" data-save-roster-student>Save</button></td></tr>').join('')+'</tbody></table></div><div class="teacher-roster-move"><button class="btn secondary" name="action" value="remove">Remove selected</button><label>Move selected to<select name="folderId">'+folders.filter(folder=>folder.id!==folderId).map(folder=>'<option value="'+esc(folder.id)+'">'+esc(folder.label)+'</option>').join('')+'</select></label><button class="btn secondary" name="action" value="move" '+(folders.length<2?'disabled':'')+'>Move selected</button></div></form>':'<p class="muted">No students in this class yet. Add one above or paste a list.</p>');
    const addOneForm=rosterStudentList.querySelector('[data-roster-add-one]');
    addOneForm.onsubmit=event=>{event.preventDefault();practicalJob(root,event.submitter,async()=>{
      const name=addOneForm.elements.name.value.trim(),group=addOneForm.elements.group.value.trim(),email=addOneForm.elements.email.value.trim();
      const result=await practicalApi('teacher/roster/students',{folderId,students:[{name,group,email}]});
      practical.roster=await practicalApi('teacher');renderRosterManager();renderAssignmentPicker();
      practicalStatus(root,result.added?'Student added to this class.':result.updatedEmails?'Existing student email updated.':'That student is already in this class.');
    });};
    rosterStudentList.querySelectorAll('[data-save-roster-student]').forEach(button=>button.onclick=()=>{const row=button.closest('[data-edit-roster-student]');practicalJob(root,button,async()=>{
      await practicalApi('teacher/roster/update',{studentId:row.dataset.editRosterStudent,name:row.querySelector('[name="name"]').value.trim(),group:row.querySelector('[name="group"]').value.trim(),email:row.querySelector('[name="email"]').value.trim()});
      practical.roster=await practicalApi('teacher');renderRosterManager();renderAssignmentPicker();
      practicalStatus(root,'Student details updated.');
    });});
    const actionsForm=rosterStudentList.querySelector('[data-roster-student-actions]');
    if(actionsForm){
      const selectAll=actionsForm.querySelector('[data-roster-select-all]');
      selectAll.onchange=()=>actionsForm.querySelectorAll('[name="studentId"]').forEach(check=>check.checked=selectAll.checked);
      actionsForm.onsubmit=event=>{event.preventDefault();practicalJob(root,event.submitter,async()=>{
      const studentIds=[...actionsForm.querySelectorAll('[name="studentId"]:checked')].map(item=>item.value);
      if(!studentIds.length)throw Error('Select at least one student.');
      if(event.submitter?.value==='remove'){
        const result=await practicalApi('teacher/roster/remove',{folderId,studentIds});
        practical.roster=await practicalApi('teacher');renderRosterManager();renderAssignmentPicker();
        practicalStatus(root,result.removed+' student(s) removed from this class.');
      }else{
        if(!actionsForm.elements.folderId.value)throw Error('Create another folder before moving students.');
        const result=await practicalApi('teacher/roster/move',{studentIds,folderId:actionsForm.elements.folderId.value});
        practical.roster=await practicalApi('teacher');renderRosterManager();renderAssignmentPicker();
        practicalStatus(root,result.skipped?result.moved+' student(s) moved; '+result.skipped+' duplicate(s) stayed in the original folder.':result.moved+' student(s) moved.');
      }
      });};
    }
  }
  createFolderForm.onsubmit=event=>{event.preventDefault();practicalJob(root,event.submitter,async()=>{
    const label=createFolderForm.elements.label.value.trim();
    await practicalApi('teacher/roster/folders',{label});
    practical.roster=await practicalApi('teacher');renderRosterManager();renderAssignmentPicker();
    createFolderForm.reset();practicalStatus(root,'Folder created.');
  });};
  importRosterForm.onsubmit=event=>{event.preventDefault();practicalJob(root,event.submitter,async()=>{
    const folderId=importRosterForm.elements.folderId.value;
    if(!folderId)throw Error('Create and choose a folder before importing students.');
    const students=importRosterForm.elements.students.value.split(/\r?\n/).filter(line=>line.trim()).map(line=>{const [name,group='',email='']=line.split('|');return{name:name.trim(),group:group.trim(),email:email.trim()};});
    if(!students.length)throw Error('Paste at least one student name.');
    if(students.length>200)throw Error('Import up to 200 students at a time.');
    const result=await practicalApi('teacher/roster/students',{folderId,students});
    practical.roster=await practicalApi('teacher');renderRosterManager();renderAssignmentPicker();
    importRosterForm.elements.students.value='';practicalStatus(root,result.added+' student(s) added'+(result.updatedEmails?', '+result.updatedEmails+' existing email(s) updated.':'')+(result.duplicates?', '+result.duplicates+' duplicate(s) skipped.':'.'));
  });};
  rosterViewFolder.onchange=renderRosterManager;
  renderRosterManager();
  function updatePhysicalTopic(){
    physicsPanel.querySelectorAll('[data-physical-fields]').forEach(panel=>{panel.hidden=panel.dataset.physicalFields!==physicsTopic.value;});
  }
  function collectPhysicalQuestionData(){
    if(form.elements.station.value!=='physchem')return null;
    const panel=physicsPanel.querySelector('[data-physical-fields="'+physicsTopic.value+'"]');
    const values={};
    panel.querySelectorAll('[data-pc-field]').forEach(field=>{values[field.dataset.pcField]=field.value;});
    return {topic:physicsTopic.value,values};
  }
  function restorePhysicalQuestionData(data){
    if(!data||!['gas','kinetics','gibbs','bomb'].includes(data.topic))return;
    physicsTopic.value=data.topic;
    updatePhysicalTopic();
    const panel=physicsPanel.querySelector('[data-physical-fields="'+data.topic+'"]');
    Object.entries(data.values||{}).forEach(([key,value])=>{
      const field=panel.querySelector('[data-pc-field="'+key+'"]');
      if(field&&value!==undefined&&value!==null)field.value=value;
    });
  }
  const questionTextForSave=()=>{
    const question=packPhysicsQuestion(form.elements.questions.value,collectPhysicalQuestionData());
    if(question.length>8000)throw Error('Shorten the instructions or remove some given values. The saved question limit is 8,000 characters.');
    return question;
  };
  physicsTopic.onchange=updatePhysicalTopic;
  updatePhysicalTopic();
  const physicalAnswerButton=physicsPanel.querySelector('[data-calculate-physical-answer]');
  physicalAnswerButton.onclick=()=>{
    const answer=physicsPanel.querySelector('[data-physical-answer-output]');
    answer.innerHTML=teacherPhysicalAnswerHtml(physicsTopic.value,physicsPanel,physicsPanel.querySelector('[data-teacher-work-process]').value);
  };
  const sampleTable = root.querySelector('#practicalUvSampleTable');
  let editedUvRow = null;
  function updateUvTable(){
    const samples = Array.from(rows.children);
    if(!samples.includes(editedUvRow))editedUvRow=samples[0]||null;
    for(const row of samples)row.hidden=row!==editedUvRow;
    const baseLabel=form.elements.label.value.trim()||'Unknown';
    const list=samples.map((row,index)=>{
      const label=row.querySelector('[data-uv-sample-label]').value.trim()||(samples.length===1?baseLabel:baseLabel+' '+(index+1));
      const profile=row.querySelector('.practical-reagent').selectedOptions[0]?.textContent||'';
      const compound=row.querySelector('[data-uv-compound]');
      const analyte=compound.disabled?profile:compound.value.trim()||profile;
      return '<tr><td>'+esc(label)+'</td><td>'+esc(analyte)+'</td><td><button type="button" class="btn secondary small" data-edit-uv="'+index+'">'
        +(row===editedUvRow?'Editing':'Edit')+'</button></td></tr>';
    }).join('');
    sampleTable.innerHTML='<table class="table"><thead><tr><th>Sample</th><th>Analyte</th><th>Action</th></tr></thead><tbody>'+list+'</tbody></table>';
  }
  form.elements.label.addEventListener('input',()=>{if(form.elements.station.value==='uvvis')updateUvTable();});
  sampleTable.onclick=event=>{
    const button=event.target.closest('[data-edit-uv]');
    if(!button)return;
    editedUvRow=rows.children[Number(button.dataset.editUv)];
    updateUvTable();
    editedUvRow.querySelector('[data-uv-sample-label]').focus();
  };
  form.addEventListener('invalid',event=>{
    const field=event.target;
    const row=field.closest('.practical-component');
    if(form.elements.station.value==='uvvis'&&row?.hidden){editedUvRow=row;updateUvTable();}
    const label=field.closest('label')?.textContent.trim()||'the highlighted field';
    practicalStatus(root,'Check '+label+': '+field.validationMessage);
  },true);
  function component(preferred) {
    const station = form.elements.station.value;
    const row = document.createElement('div');
    row.className = 'practical-component';
    row.innerHTML = '<label>'+ (station==='titration'?(rows.childElementCount?'Known titrant':'Unknown analyte'):station==='chromatography'?'TLC compound':'Reagent or profile')
      +'<select class="practical-reagent"></select></label><label><span class="practical-unit">Amount</span><input class="practical-amount" type="number" step="any" required></label><label class="practical-molar">Stock concentration (mol/L)<input class="practical-conc" type="number" step="any" min=".000001" value=".1"></label>'
      +'<button type="button" class="btn secondary small">Remove</button>';
    if(station==='uvvis')row.insertAdjacentHTML('beforeend',practicalUvFields());
    const select = row.querySelector('select');
    const amount = row.querySelector('.practical-amount'), conc = row.querySelector('.practical-conc');
    const updateUv=station==='uvvis'?practicalBindUvPreparation(row,amount):null;
    const index = rows.childElementCount;
    function options(preferredId) {
      const first = rows.querySelector('select');
      const accepted = station === 'titration' && index === 1 ? catalog.titration.find(item=>item.id===first.value)?.references : null;
      const list = station==='titration'
        ? catalog.titration.filter(item=>accepted ? accepted.includes(item.id) : item.kind===form.elements.titrationMethod.value && item.references.length)
        : catalog[station];
      const prior = preferredId || select.value;
      const option = item=>'<option value="'+esc(item.id)+'">'+esc(item.name)+'</option>';
      select.innerHTML = station==='bench'
        ? [...new Set(list.map(item=>item.group))].map(group=>'<optgroup label="'+esc(group)+'">'+list.filter(item=>item.group===group).map(option).join('')+'</optgroup>').join('')
        : list.map(option).join('');
      select.value = list.some(item=>item.id===prior) ? prior : list.find(item=>![...rows.querySelectorAll('select')].some(s=>s!==select&&s.value===item.id))?.id || list[0].id;
      update();
    }
    function update() {
      const reagent = catalog[station].find(item=>item.id===select.value);
      if (station==='chromatography') {
        amount.closest('label').hidden=true;
        amount.disabled=true;
        conc.closest('label').hidden=true;
        return;
      }
      const unit = reagent.unit;
      row.querySelector('.practical-unit').textContent = (unit==='mg/mL'||unit==='µM'?'Concentration':'Amount')+' ('+unit+')';
      row.querySelector('.practical-molar').hidden = !reagent.molar;
      conc.required = !!reagent.molar;
      const method = form.elements.titrationMethod.value;
      conc.value = station==='titration' && method==='hypochlorite' && index===1 ? .1 : reagent.defaultC ?? .1;
      conc.max = station==='titration'?1:10;
      amount.min = station==='bench'&&unit==='mL'?.1:.001;
      amount.step = station==='bench'&&unit==='mL'?.1:'any';
      amount.max = unit==='g'?.25:station==='bench'?99.5:station==='instrumentation'?20:station==='titration'?1000:100000;
      if (!amount.value || +amount.value>+amount.max) amount.value = unit==='g'?.05:unit==='mg/mL'?.5:station==='titration'?100:10;
      updateUv?.(reagent);
      if (station==='titration' && index===0) rows.children[1]?.updateOptions();
    }
    row.updateOptions = options;
    if(station==='uvvis')row.activateUvEditor=()=>{editedUvRow=row;updateUvTable();};
    select.onchange = ()=>{row.edited=true;update();if(station==='uvvis')updateUvTable();};
    if(station==='uvvis')row.addEventListener('input',()=>updateUvTable());
    amount.oninput = conc.oninput = ()=>{row.edited=true;};
    row.querySelector('button').hidden = station==='titration';
    row.querySelector('button').onclick = ()=>{if(rows.childElementCount>1) row.remove(); add.disabled=false;if(station==='uvvis')updateUvTable();};
    options(preferred);
    rows.append(row);
    if(station==='uvvis'){editedUvRow=row;updateUvTable();}
    add.disabled = rows.childElementCount >= (station==='chromatography' ? catalog.chromatography.length : 8);
    return row;
  }
  function stationChanged() {
    const station = form.elements.station.value;
    const aasMode=station==='aas';
    rows.replaceChildren();
    const aasFields=root.querySelector('#practicalAasUnknownFields');
    aasFields.hidden=!aasMode;aasFields.disabled=!aasMode;
    sampleVisibility();
    aasLinks.hidden=true;
    root.querySelector('[data-save-question-set]').hidden=aasMode;
    form.querySelector('.practical-actions>.btn').textContent=aasMode?'Save AAS assignment & create student links':'Create practical and student links';
    form.elements.questions.required=!aasMode;
    sampleTable.hidden=station!=='uvvis';
    physicsPanel.hidden=station!=='physchem';
    updatePhysicalTopic();
    const method = form.elements.titrationMethod;
    method.closest('label').hidden=station!=='titration';
    method.disabled=station!=='titration';
    if(station!=='titration') form.elements.includeReference.closest('label').hidden=true;
    const supported = Object.hasOwn(catalog,station);
    const toggle = form.elements.withSample;
    toggle.disabled = !supported;
    toggle.checked = supported;
    $('#practicalStationHint').textContent = supported ? '' : 'Students will open this workstation and follow your instructions to set up the practical.';
    sampleVisibility();
    if (!supported) return;
    component();
    if (station==='titration') updateReferenceChoice(true);
    if (station==='chromatography') component();
    updateTitrationHint();
    add.textContent=station==='uvvis'?'Add unknown':station==='chromatography'?'Add compound':'Add reagent';
    add.hidden = station==='titration';
    $('#practicalRecipeHint').textContent = {
      bench:'Components arrive in one beaker. Built-in reagents include food tests, indicators, buffers and demo chemicals. Use Import reagents to add a custom solution or select previously imported chemicals.',
      titration:practicalTitrationHint(),
      instrumentation:'Add GC library compounds at their final vial concentrations. The regular GC compound controls can reveal the recipe.',
      chromatography:'Choose two to four distinct compounds. Students receive a coded mixture and can spot it with individual standards or an all-standards lane. This TLC model compares Rf values for identification.',
      uvvis:'Prepare up to eight separately labelled unknowns. Set the wavelengths and calibration range in µM for the cuvette after any dilution. Published spectra are references and the simulation uses its teaching profile.'
    }[station];
  }
  function practicalTitrationHint(){
    const method = form.elements.titrationMethod.value;
    const note = catalog.titration.find(item=>item.kind===method&&item.note)?.note;
    if (method==='hypochlorite' && !form.elements.includeReference.checked) {
      return 'Set the concentration and volume of the sodium hypochlorite unknown. Students select their own titrant and flask reagents. Put your procedure in the instructions.';
    }
    return 'Set the volume and concentration of each bottle. Students see the analyte identity and the titrant concentration. The unknown concentration stays hidden.'+(note?' '+note:'');
  }
  function updateTitrationHint(){
    if(form.elements.station.value==='titration') $('#practicalRecipeHint').textContent=practicalTitrationHint();
  }
  function updateReferenceChoice(reset=false){
    const reference = form.elements.includeReference;
    const optional = form.elements.titrationMethod.value==='hypochlorite';
    reference.closest('label').hidden=!optional;
    if(reset) reference.checked=!optional;
    if(reference.checked && rows.children.length===1) component();
    if(!reference.checked && rows.children.length===2) rows.lastElementChild.remove();
    updateTitrationHint();
  }
  form.elements.includeReference.onchange=()=>updateReferenceChoice();
  form.elements.titrationMethod.onchange=()=>{
    rows.replaceChildren();
    component();
    updateReferenceChoice(true);
  };
  function sampleVisibility() {
    const enabled = form.elements.withSample.checked;
    const aasMode=form.elements.station.value==='aas';
    const fields = $('#practicalSampleFields');
    fields.hidden = !enabled||aasMode;
    fields.disabled = !enabled||aasMode;
    form.elements.label.closest('label').hidden = aasMode?false:!enabled;
    form.elements.label.disabled = !aasMode&&!enabled;
    form.elements.withSample.closest('label').hidden=aasMode;
  }
  form.elements.withSample.onchange = sampleVisibility;
  add.onclick = ()=>{component().edited=true;};
  const importer = practicalBindImport(form,catalog,rows,component,sampleVisibility,selectTab);
  form.elements.station.onchange = ()=>{
    stationChanged();
    if(form.elements.station.value!=='aas')importer.selectSource(form.elements.station.value);
  };
  stationChanged();
  if(form.elements.station.value!=='aas')importer.selectSource(form.elements.station.value);
  const currentRecipe = ()=>form.elements.withSample.checked ? [...rows.children].map(row=>{
    const station=form.elements.station.value, id=row.querySelector('select').value;
    const custom=catalog[station].find(item=>item.id===id)?.custom;
    return {id,custom,amount:+row.querySelector('.practical-amount').value,concentration:+row.querySelector('.practical-conc').value,
      ...(station==='uvvis'?{label:row.querySelector('[data-uv-sample-label]').value,uv:practicalUvInput(row)}:{})};
  }) : [];
  const saveQuestionSet = async payload=>{
    await practicalApi('teacher/questions',payload);
    practical.roster=await practicalApi('teacher');
    practicalQuestionSets(root,selectTab,loadQuestionSet);
    practicalStatus(root,'Question set saved. You can reopen it from My questions.');
  };
  function loadQuestionSet(item){
    const recipe=typeof item.recipe==='string'?JSON.parse(item.recipe):item.recipe||[];
    const questionParts=splitPhysicsQuestion(item.questions||'');
    if(item.station==='bench')recipe.forEach(entry=>{
      if(entry.custom&&!catalog.bench.some(reagent=>reagent.id===entry.id))catalog.bench.push({id:entry.id,name:entry.custom.name+' · '+entry.custom.formula,group:'Imported chemicals',unit:'mL',molar:true,defaultC:entry.concentration||.1,custom:entry.custom});
    });
    form.elements.title.value=item.title||'';
    form.elements.label.value=item.label||'Unknown A';
    form.elements.questions.value=questionParts.instructions;
    form.elements.station.value=item.station;
    if(item.station==='titration'&&recipe.length){
      const mode=catalog.titration.find(entry=>entry.id===recipe[0].id)?.kind;
      if(mode)form.elements.titrationMethod.value=mode;
    }
    stationChanged();
    restorePhysicalQuestionData(questionParts.physics);
    importer.selectSource(item.station);
    form.elements.withSample.checked=recipe.length>0;
    sampleVisibility();
    rows.replaceChildren();
    recipe.forEach((entry,index)=>{
      const row=index===0?component(entry.id):component(entry.id);
      row.updateOptions(entry.id);
      if(entry.amount!==null&&entry.amount!==undefined)row.querySelector('.practical-amount').value=entry.amount;
      if(entry.concentration!==null&&entry.concentration!==undefined)row.querySelector('.practical-conc').value=entry.concentration;
      if(item.station==='uvvis'&&entry.uv){
        const uv=entry.uv;
        const put=(key,value)=>{const field=row.querySelector('[data-uv-'+key+']');if(field&&value!==null&&value!==undefined)field.value=Array.isArray(value)?value.join(', '):value;};
        const solid=uv.preparation?.kind==='solid';
        put('compound',uv.compoundName);put('prepare',solid?'solid':'solution');put('mass',uv.preparation?.mass);put('volume',uv.preparation?.volume);put('molar',uv.preparation?.molarMass);
        put('solvent',uv.solvent);put('dilution',uv.dilution);put('low',uv.low);put('high',uv.high);put('wavelengths',uv.wavelengths);put('sample-label',entry.label);
        if(!solid&&uv.concentration&&uv.dilution)row.querySelector('.practical-amount').value=uv.concentration*uv.dilution;
        row.activateUvEditor?.();
      }
    });
    if(!recipe.length&&Object.hasOwn(catalog,item.station))component();
    if(item.station==='titration'&&recipe.length===2){
      while(rows.children.length<2)component(recipe[rows.children.length]?.id);
      recipe.forEach((entry,index)=>{const row=rows.children[index];row.updateOptions(entry.id);row.querySelector('.practical-amount').value=entry.amount;row.querySelector('.practical-conc').value=entry.concentration;});
    }
    selectTab('create',true);
    practicalStatus(root,'Question set opened. Review it, then edit or create a new assignment.');
  }
  root.querySelector('[data-save-question-set]').onclick=event=>practicalJob(root,event.currentTarget,async()=>{
    if(!form.elements.title.value.trim()){form.elements.title.focus();throw Error('Enter a practical title to name this question set.');}
    const label=form.elements.withSample.checked?form.elements.label.value:'', recipe=currentRecipe();
    await saveQuestionSet({title:form.elements.title.value.trim(),label,station:form.elements.station.value,questions:questionTextForSave(),recipe});
  });
  practicalQuestionSets(root,selectTab,loadQuestionSet);
  form.onsubmit = event=>{
    event.preventDefault();
    if (root.querySelector('#teacher-panel-create').hidden) return;
    practicalJob(root,event.submitter,async()=>{
      const fields = new FormData(form);
      const students = fields.get('students').split(/\r?\n/).filter(line=>line.trim()).map(line=>{
        const [name,group='',email=''] = line.split('|');
        return {name:name.trim(),group:group.trim(),email:email.trim()};
      });
      const savedStudents=(practical.roster?.rosterStudents||[]).filter(student=>selectedRosterStudents.has(student.id)).map(student=>{const folder=(practical.roster?.rosterFolders||[]).find(item=>item.id===student.folder_id);return{id:student.id,name:student.name,group:student.class_group||'',email:student.email||'',folderId:student.folder_id||'',folderLabel:folder?.label||''};});
      const uniqueStudents=new Map();
      [...savedStudents,...students].forEach(student=>{const key=student.id?'id:'+student.id:'name:'+student.name.trim().toLocaleLowerCase();if(student.name.trim())uniqueStudents.set(key,{...student,name:student.name.trim(),group:(student.group||'').trim(),email:(student.email||'').trim()});});
      const finalStudents=[...uniqueStudents.values()];
      if(finalStudents.some(student=>student.email&&(student.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email))))throw Error('Check the email address entered for each student.');
      if(fields.get('station')==='aas'){
        if(!aasApi)throw Error('AAS unknown service is not ready. Reload Teachers Bench and try again.');
        if(!finalStudents.length)throw Error('Select at least one student from My students or enter a student name to receive the AAS unknown.');
        if(finalStudents.length>60)throw Error('Create AAS unknowns for up to 60 students at a time.');
        const analytes=collectAasElements();
        if(!analytes.length)throw Error('Add at least one element and target concentration.');
        if(new Set(analytes.map(item=>item.element)).size!==analytes.length)throw Error('Choose a different element for each AAS method row.');
        const label=String(fields.get('label')||'').trim();
        const title=String(fields.get('title')||'AAS assignment').trim(),issued=[];
        finalStudents.forEach((student,index)=>analytes.forEach(analyte=>{
          const suffix=analyte.element+String(index+1).padStart(2,'0');
          const sampleLabel=label.slice(0,40-suffix.length-1).trimEnd()+' '+suffix;
          const assignment=aasApi.createAssignment({sampleLabel,element:analyte.element,concentration:analyte.concentration,studentName:student.name,studentGroup:student.group,folderLabel:student.folderLabel||'',assignmentTitle:title});
          issued.push({student,assignment});
        }));
        const saved=await practicalApi('teacher/aas-assignments',{assignments:issued.map(({student,assignment})=>({...assignment,studentId:student.id||'',folderId:student.folderId||'',studentEmail:student.email||''}))});
        practical.roster.aasAssignments=saved.assignments;
        aasApi.restoreAssignments(saved.assignments);
        renderAasAssignments();
        aasLinks.hidden=false;
        aasLinks.innerHTML='<h3>AAS assignment saved to Teachers Bench · student links ready</h3><p class="muted">Saved with the selected class folders. Each student and element has a separate method link; students must recalibrate when changing elements. Email assignment opens a draft for you to review and send.</p>'
          +issued.map(({student,assignment})=>'<article class="teacher-aas-assignment"><b>'+esc(student.name)+(student.group?' · '+esc(student.group):'')+(student.folderLabel?' · '+esc(student.folderLabel):'')+'</b><span>'+esc(title)+' · '+esc(assignment.sampleLabel)+' · '+esc(assignment.element)+' · answer key '+Number(assignment.concentration).toLocaleString()+' mg/L</span><label>Short assignment code<textarea readonly rows="2">'+esc(assignment.code)+'</textarea></label><button type="button" class="btn secondary small" data-copy-practical-aas="'+esc(assignment.id)+'" data-student-name="'+esc(student.name)+'">Copy code</button><label>Student link<input type="text" readonly hidden data-assignment-link aria-label="Student assignment link"></label><button type="button" class="btn secondary small" data-copy-practical-aas-link="'+esc(assignment.id)+'" data-student-name="'+esc(student.name)+'">Copy link</button>'+practicalEmailAssignmentAction(student.email,student.name,title,aasShareLink(assignment.code))+'</article>').join('');
        aasLinks.insertAdjacentHTML('beforeend','<button type="button" class="btn" data-practical-new-assignment>Prepare another assignment</button>');
        bindPracticalAasCopyButtons();
        aasLinks.querySelector('[data-practical-new-assignment]').onclick=()=>prepareFreshAssignment('aas');
        aasLinks.scrollIntoView({block:'nearest',behavior:'smooth'});
        practicalStatus(root,'Saved '+issued.length+' AAS student assignment'+(issued.length===1?'':'s')+' across '+analytes.length+' element'+(analytes.length===1?'':'s')+'.');
        return;
      }
      if(!finalStudents.length)finalStudents.push({name:'Student',group:''});
      const recipe = currentRecipe();
      const created=await practicalApi('teacher',{title:fields.get('title'),label:fields.get('label'),station:fields.get('station'),questions:questionTextForSave(),students:finalStudents,recipe});
      const links=root.querySelector('#practicalNewLinks');
      links.hidden=false;
      links.innerHTML='<h2>Student links for '+esc(fields.get('title'))+'</h2><p>Copy a link or open a prefilled email draft for each student. Review the message and send it from your email app.</p>'
        +created.links.map((student,index)=>practicalLinkHtml(student.invite,student.name,finalStudents[index]?.email||'',String(fields.get('title')||'Your practical'))).join('')
        +'<button type="button" class="btn" data-practical-new-assignment>Prepare another assignment</button>';
      links.querySelector('[data-practical-new-assignment]').onclick=()=>prepareFreshAssignment();
      practicalBindLinks(links);
      selectTab('roster',true);
      practicalStatus(root,'Practical created. Copy the student links below.');
      try {practical.roster=await practicalApi('teacher');practicalRoster(root);}
      catch {practicalStatus(root,'Practical created. Your new links are below. Reopen Teachers Bench to refresh the roster.');}
    });
  };
  const sort = root.querySelector('[data-roster-sort]'), filter = root.querySelector('[data-roster-filter]');
  sort.value = practical.sort;
  filter.value = practical.filter;
  sort.onchange = ()=>{practical.sort=sort.value; practicalRoster(root);};
  filter.oninput = ()=>{practical.filter=filter.value; practicalRoster(root);};
  root.querySelector('[data-refresh-teacher-roster]').onclick=event=>practicalJob(root,event.currentTarget,async()=>{
    practical.roster=await practicalApi('teacher');
    aasApi?.restoreAssignments(practical.roster.aasAssignments||[]);
    renderAasAssignments();practicalRoster(root);
    practicalStatus(root,'Student assignment claim and submission status refreshed.');
  });
  practicalRoster(root);
}
function practicalImportHtml() {
  return '<div class="practical-import"><h2>Import reagents</h2>'
    +'<p>Browse workstation libraries and choose a reagent to use in the recipe or reference in the instructions.</p>'
    +'<div class="practical-grid"><label>Source workstation<select data-import-source>'
    +Object.entries(practicalStations()).map(([id,name])=>'<option value="'+esc(id)+'">'+esc(name)+'</option>').join('')
    +'</select></label><label>Find reagent<input type="search" data-import-filter placeholder="Name or formula"></label>'
    +'<label>Reagent or reference<select data-import-reagent></select></label></div>'
    +'<div class="practical-actions"><button type="button" class="btn small" data-import-use>Use in recipe</button>'
    +'<button type="button" class="btn secondary small" data-import-reference>Add to instructions</button></div>'
    +'<p data-import-info class="muted"></p>'
    +'<section data-import-custom><h3>Create or modify an Open Reaction Bench reagent</h3>'
    +'<p>Copy the selected identity or enter a name and formula. Custom identities use the reaction bench’s supported chemistry and solubility rules.</p>'
    +'<button type="button" class="btn secondary small" data-import-copy>Copy selected identity</button>'
    +'<div class="practical-grid"><label>Name<input data-import-name maxlength="200"></label><label>Formula<input data-import-formula maxlength="120"></label>'
    +'<label>Stock concentration (mol/L)<input data-import-conc type="number" min=".000001" max="10" step="any" value=".1"></label></div>'
    +'<button type="button" class="btn small" data-import-save>Add custom solution to recipe</button></section>'
    +'<p role="status" data-practical-status></p></div>';
}
function practicalReagentReferences(station,catalog) {
  if (catalog[station]) return catalog[station];
  const entries = {
    ftir:()=>Object.entries(ftirSamples).map(([id,sample])=>({id,name:sample.name,formula:sample.formula})),
    massspec:()=>MS_LIBRARY,
    qual:()=>[...qualitativeElements.map(el=>({name:el.name,formula:el.symbol})),...ionQualTests,...gasQualTests],
    electrochem:()=>electroMetals.map(metal=>({name:metal.name,formula:metal.ion})),
    water:()=>catalog.bench.filter(item=>['edta','buffer','hardnessIndicator','calcium','magnesium','water'].includes(reagents.find(r=>r[0]===item.id)?.[2])),
    gravimetric:()=>catalog.bench,
    physchem:()=>[]
  };
  return entries[station]().map(item=>({...item,name:item.name||item.title}));
}
function practicalBindImport(form,catalog,rows,component,sampleVisibility) {
  const panel = form.querySelector('.practical-import');
  const get = key=>panel.querySelector('[data-import-'+key+']');
  const source = get('source'), filter = get('filter'), reagent = get('reagent');
  const target = ()=>form.elements.station.value;
  const normalize = value=>chemicalQueryNormal(value).replace(/\s*\(simulated\)$/i,'').toLowerCase();
  let list = [], copiedRecipeId = null;
  function identity(item) {
    return item.formula || item.custom?.formula || (source.value==='titration'?item.id:'')
      || reagents.find(row=>row[0]===item.id)?.[1]?.split('·')[0]?.trim() || '';
  }
  function candidates(item) {
    return (catalog[target()]||[]).filter(candidate=>
      (source.value===target() && candidate.id===item.id)
      || normalize(candidate.name)===normalize(item.name));
  }
  function selection() {
    return list[reagent.value];
  }
  function updateActions() {
    const item = selection();
    const compatible = item && candidates(item).length>0;
    get('use').disabled = !compatible;
    get('reference').disabled = !item;
    get('copy').disabled = !item;
    get('custom').hidden = target()!=='bench';
    get('info').textContent = !list.length
      ? source.value==='physchem' ? 'Physical Chemistry uses model parameters instead of reagent stocks.' : 'No matching materials in this library.'
      : compatible ? 'Adjust amount or concentration in the recipe wherever the workstation supports it.'
        : 'Use this material as an instruction reference. The selected destination has no matching recipe entry.';
  }
  function refresh() {
    const query = normalize(filter.value);
    list = practicalReagentReferences(source.value,catalog).filter(item=>
      [item.name,identity(item)].some(value=>normalize(value).includes(query)));
    reagent.innerHTML = list.map((item,index)=>'<option value="'+index+'">'+esc(item.name)+(identity(item)?' · '+esc(identity(item)):'')+'</option>').join('');
    updateActions();
  }
  panel.addEventListener('keydown',event=>{if (event.key==='Enter' && event.target.matches('input')) event.preventDefault();});
  function use(item, replaceId) {
    const selects = [...rows.querySelectorAll('.practical-reagent')];
    let row = selects.find(select=>select.value===item.id)?.closest('.practical-component');
    if (!row && replaceId) {
      row=selects.find(select=>select.value===replaceId)?.closest('.practical-component');
      row?.updateOptions(item.id);
    }
    if (!row && target()==='titration') {
      const method = form.elements.titrationMethod;
      if (method.value!==item.kind) {
        method.value=item.kind;
        method.onchange();
      }
      if(!item.references.length && rows.children.length===1){
        form.elements.includeReference.checked=true;
        form.elements.includeReference.onchange();
      }
      const slot = rows.children[item.references.length?0:1];
      if (!Array.from(slot.querySelector('select').options).some(option=>option.value===item.id)) throw Error('Choose an analyte compatible with this reference titrant.');
      slot.updateOptions(item.id);
      row = slot;
    }
    if (!row && !['uvvis','titration'].includes(target())) {
      row=selects.map(select=>select.closest('.practical-component')).find(entry=>!entry.edited);
      row?.updateOptions(item.id);
    }
    if (!row && target()==='uvvis') {
      row = selects[0].closest('.practical-component');
      row.updateOptions(item.id);
    }
    if (!row) {
      const limit = target()==='chromatography' ? catalog.chromatography.length : 8;
      if (selects.length>=limit) throw Error('The recipe is full. Remove a component before importing another.');
      row = component(item.id);
    }
    row.activateUvEditor?.();
    row.edited=true;
    form.elements.withSample.checked=true;
    sampleVisibility();
    selectTab('create');
    const concentration = row.querySelector('.practical-conc');
    (concentration.required ? concentration : row.querySelector('.practical-reagent')).focus();
    practicalStatus(form.closest('#practicalWorkspace'),item.name+' selected in the recipe.');
    return row;
  }
  source.onchange = ()=>{filter.value='';refresh();};
  filter.oninput = refresh;
  reagent.onchange = updateActions;
  get('use').onclick = ()=>{
    const item = selection();
    if (!item) return;
    try {use(candidates(item)[0]);} catch (error) {practicalStatus(panel,error.message);}
  };
  get('reference').onclick = ()=>{
    const item = selection();
    if (!item) return;
    const instructions = form.elements.questions;
    const line = 'Material / reference: '+item.name+(identity(item)?' ('+identity(item)+')':'')+' · '+practicalStations()[source.value];
    const next = instructions.value ? instructions.value+'\n'+line : line;
    if(next.length>instructions.maxLength){practicalStatus(panel,'The instructions are full. Shorten them before adding another reference.');return;}
    instructions.value=next;
    selectTab('create');
    instructions.focus();
    practicalStatus(form.closest('#practicalWorkspace'),'Reference added to the instructions.');
  };
  get('copy').onclick = ()=>{
    const item = selection();
    copiedRecipeId=candidates(item)[0]?.id ?? null;
    get('name').value=item.custom?.name||item.name;
    get('formula').value=identity(item);
    get('conc').value=item.defaultC??.1;
    get('name').focus();
  };
  get('save').onclick = ()=>{
    const name=get('name').value.trim(),formula=get('formula').value.trim(),concentration=+get('conc').value;
    if(!name||!formula||/[<>&"'·]/.test(name+formula)||!Number.isFinite(concentration)||concentration<.000001||concentration>10){
      practicalStatus(panel,'Enter a plain-text name and formula, and a concentration from 0.000001 to 10 mol/L.');
      return;
    }
    let item=catalog.bench.find(entry=>entry.custom?.name===name&&entry.custom.formula===formula);
    const newItem=!item;
    if(newItem) {
      item={id:'teacher-'+crypto.randomUUID(),name:name+' · '+formula,group:'Imported chemicals',unit:'mL',molar:true,defaultC:concentration,custom:{name,formula}};
      catalog.bench.push(item);
    }
    try {
      const row=use(item,copiedRecipeId);
      copiedRecipeId=item.id;
      row.querySelector('.practical-conc').value=concentration;
      refresh();
    } catch (error) {
      if(newItem) catalog.bench.pop();
      practicalStatus(panel,error.message);
    }
  };
  return {selectSource(station){copiedRecipeId=null;source.value=station;filter.value='';refresh();}};
}
function practicalQuestionSets(root,selectTab,loadQuestionSet){
  const target=root.querySelector('#practicalQuestionSets');
  if(!target||!practical.roster)return;
  const saved=practical.roster.questionSets||[], assigned=practical.roster.practicals||[];
  const recipeForSave=item=>{
    const recipe=typeof item.recipe==='string'?JSON.parse(item.recipe):item.recipe||[];
    if(item.station!=='uvvis')return recipe;
    return recipe.map(entry=>{
      const uv=entry.uv||{},prep=uv.preparation||{},solid=prep.kind==='solid';
      return {...entry,amount:solid?null:(uv.concentration||entry.amount)*(uv.dilution||1),
        uv:{...uv,preparation:solid?'solid':'solution',mass:prep.mass,volume:prep.volume,molarMass:prep.molarMass,compoundName:uv.compoundName}};
    });
  };
  const savedHtml=saved.length?saved.map(item=>{
    const recipe=typeof item.recipe==='string'?JSON.parse(item.recipe):item.recipe||[];
    return '<article class="practical-question-card"><div class="practical-heading"><h3>'+esc(item.title)+'</h3><span class="eyebrow">'+esc(practicalStations()[item.station]||item.station)+'</span></div>'
      +(item.label?'<p><b>Sample:</b> '+esc(item.label)+(recipe.length?' · '+recipe.length+' component(s)':'')+'</p>':'')
      +'<details><summary>View saved instructions and questions</summary>'+practicalQuestionHtml(item.questions)+'</details>'
      +'<button type="button" class="btn secondary small" data-open-question="'+esc(item.id)+'">Open in practical builder</button></article>';
  }).join(''):'<p class="muted">No saved question sets yet. Save one from the practical builder or from an existing assignment.</p>';
  const assignedHtml=assigned.length?assigned.map(item=>{
    const recipe=typeof item.recipe==='string'?JSON.parse(item.recipe):item.recipe||[];
    return '<article class="practical-question-card"><div class="practical-heading"><h3>'+esc(item.title)+'</h3><span class="eyebrow">'+esc(practicalStations()[item.station]||item.station)+'</span></div>'
      +(item.label?'<p><b>Sample:</b> '+esc(item.label)+(recipe.length?' · '+recipe.length+' component(s)':'')+'</p>':'')
      +'<details><summary>View questions sent to students</summary>'+practicalQuestionHtml(item.questions)+'</details>'
      +'<button type="button" class="btn secondary small" data-save-assigned="'+esc(item.id)+'">Save as a reusable set</button></article>';
  }).join(''):'<p class="muted">You have not assigned a practical yet.</p>';
  target.innerHTML='<h3>Saved question sets</h3>'+savedHtml+'<h3>Questions already assigned</h3>'+assignedHtml;
  target.querySelectorAll('[data-open-question]').forEach(button=>button.onclick=()=>{
    const item=saved.find(entry=>entry.id===button.dataset.openQuestion);
    if(item)loadQuestionSet(item);
  });
  target.querySelectorAll('[data-save-assigned]').forEach(button=>button.onclick=()=>{
    const item=assigned.find(entry=>entry.id===button.dataset.saveAssigned);
    if(!item)return;
    practicalJob(root,button,async()=>{
      await practicalApi('teacher/questions',{title:item.title,label:item.label,station:item.station,questions:item.questions,recipe:recipeForSave(item)});
      practical.roster=await practicalApi('teacher');
      practicalQuestionSets(root,selectTab,loadQuestionSet);
      practicalStatus(root,'Assigned questions saved as a reusable set.');
    });
  });
}
function practicalEmailAssignmentAction(email,name,title,url){
  const recipient=email?'<span class="practical-email-recipient">To <b>'+esc(email)+'</b></span>':'<label>Student email<input type="email" autocomplete="email" placeholder="Enter student email" data-assignment-email></label>';
  return '<div class="practical-email-action">'+recipient
    +'<button type="button" class="btn secondary small" data-email-assignment data-student-email="'+esc(email||'')+'" data-student-name="'+esc(name||'student')+'" data-assignment-title="'+esc(title||'Your practical')+'" data-assignment-url="'+esc(url)+'">Email assignment</button><span class="muted" role="status" data-email-status></span></div>';
}
function practicalLinkHtml(invite,name,email='',title='Your practical'){
  const url=new URL('/',location.origin);
  url.searchParams.set('practical',invite);
  return '<div class="practical-link"><label>'+esc(name)+' · assignment link<input readonly value="'+esc(url.href)+'"></label>'
    +'<button type="button" class="btn secondary small" data-copy-invite>Copy link</button>'+practicalEmailAssignmentAction(email,name,title,url.href)+'</div>';
}
function practicalBindLinks(container){
  container.querySelectorAll('[data-copy-invite]').forEach(button=>button.onclick=async()=>{
    const input=button.parentElement.querySelector('input');
    try {await navigator.clipboard.writeText(input.value);button.textContent='Copied';}
    catch {input.focus();input.select();button.textContent='Copy selected URL';}
  });
  practicalBindEmailActions(container);
}
function practicalBindEmailActions(container){
  container.querySelectorAll('[data-email-assignment]').forEach(button=>button.onclick=()=>{
    const panel=button.closest('.practical-email-action'),input=panel?.querySelector('[data-assignment-email]'),status=panel?.querySelector('[data-email-status]'),email=(button.dataset.studentEmail||input?.value||'').trim();
    if(!email){if(status)status.textContent='Enter this student’s email address first.';input?.focus();return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){if(status)status.textContent='Enter a valid email address.';input?.focus();return;}
    const subject='SIMLAB assignment: '+button.dataset.assignmentTitle;
    const body='Hello '+button.dataset.studentName+',\n\nYour SIMLAB practical assignment is ready. Open this link, sign in with your student account, and claim the assignment:\n\n'+button.dataset.assignmentUrl+'\n\nPlease use the same account when returning to your work.';
    if(status)status.textContent='Opening a prefilled email draft. Review it and press Send in your email app.';
    location.href='mailto:'+encodeURIComponent(email)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
  });
}
function practicalRoster(root) {
  const target = root.querySelector('#practicalRoster');
  const records=practical.roster.practicals||[],aasAssignments=practical.roster.aasAssignments||[];
  const byId = Object.fromEntries(records.map(record=>[record.id,record]));
  const status = student=>student.submitted?'Submitted':student.claimed?'Claimed':'Awaiting claim';
  const sorters = {name:()=>0,group:(a,b)=>a.class_group.localeCompare(b.class_group),status:(a,b)=>status(a).localeCompare(status(b)),recent:(a,b)=>(b.submitted||0)-(a.submitted||0)};
  const students = (practical.roster.students||[]).filter(s=>[s.name,s.class_group,byId[s.practical_id]?.title].join(' ').toLowerCase().includes(practical.filter.trim().toLowerCase()))
    .sort((a,b)=>sorters[practical.sort](a,b)||a.name.localeCompare(b.name));
  const aasReviews=window.simlabAasTeacher?.getReviews?.()||[];
  const filteredAas=aasAssignments.filter(item=>[item.studentName,item.studentGroup,item.folderLabel,item.assignmentTitle,item.sampleLabel,item.element].join(' ').toLowerCase().includes(practical.filter.trim().toLowerCase()));
  const aasStatus=item=>{
    const claimed=!!Number(item.claimed)||item.claimed===true,reviewed=aasReviews.some(review=>review.assignmentId===item.id);
    return (claimed?'Claimed':'Not claimed')+' · '+(reviewed?'result reviewed':'awaiting result');
  };
  filteredAas.sort((a,b)=>{
    if(practical.sort==='name')return a.studentName.localeCompare(b.studentName)||a.assignmentTitle.localeCompare(b.assignmentTitle);
    if(practical.sort==='group')return (a.studentGroup||a.folderLabel||'').localeCompare(b.studentGroup||b.folderLabel||'')||a.studentName.localeCompare(b.studentName);
    if(practical.sort==='status')return aasStatus(a).localeCompare(aasStatus(b))||a.studentName.localeCompare(b.studentName);
    return Number(b.createdAt||0)-Number(a.createdAt||0);
  });
  if (!students.length&&!filteredAas.length) { target.innerHTML = '<p class="muted">No assignments match this view.</p>'; return; }
  target.innerHTML = (students.length?'<div class="ch-scroll"><table class="table"><thead><tr><th>Student</th><th>Class</th><th>Practical</th><th>Status</th><th>Assignment / report</th></tr></thead><tbody>'
    +students.map(student=>{
      const record = byId[student.practical_id];
      const report = student.report ? JSON.parse(student.report) : null;
      const history = (practical.roster.submissions||[]).filter(item=>item.student_id===student.id).sort((a,b)=>b.attempt-a.attempt);
      return '<tr><td>'+esc(student.name)+'</td><td>'+esc(student.class_group||'—')+'</td><td>'+esc(record.title)+'</td><td>'+status(student)+(student.submitted?'<br><small>'+esc(new Date(student.submitted).toLocaleString())+'</small>':'')+'</td><td>'
        +(student.claimed?'':practicalLinkHtml(student.invite,student.name))
        +(report?'<details><summary>Read latest report</summary><pre>'+esc(practicalReportText({...record,name:student.name},report))+'</pre></details>':'')
        +(history.length?'<details><summary>Submission history ('+history.length+')</summary>'+history.map(item=>'<details class="practical-submission"><summary>Attempt '+item.attempt+' · '+esc(new Date(item.submitted).toLocaleString())+'</summary><pre>'+esc(practicalReportText({...record,name:student.name},typeof item.report==='string'?JSON.parse(item.report):item.report))+'</pre></details>').join('')+'</details>':'')+'</td></tr>';
    }).join('')+'</tbody></table></div>':'<p class="muted">No regular practical assignments match this view.</p>')
    +'<section class="teacher-aas-submissions"><h3>AAS unknown assignments</h3>'
    +(filteredAas.length?'<div class="ch-scroll"><table class="table"><thead><tr><th>Student</th><th>Class / folder</th><th>Assignment</th><th>Status</th><th>Assignment / result</th></tr></thead><tbody>'
      +filteredAas.map(item=>{
        const review=aasReviews.find(entry=>entry.assignmentId===item.id);
        const group=item.studentGroup||item.folderLabel||'—';
        const claimedAt=Number(item.claimedAt);
        return '<tr><td>'+esc(item.studentName||'Student')+'</td><td>'+esc(group)+'</td><td>'+esc(item.assignmentTitle||'AAS unknown')+'</td><td>'+esc(aasStatus(item))+'<br><small>Issued '+esc(new Date(Number(item.createdAt)||Date.now()).toLocaleString())+'</small>'+(claimedAt?'<br><small>Claimed '+esc(new Date(claimedAt).toLocaleString())+'</small>':'')+'</td><td><details><summary>'+esc(item.element)+' · '+esc(item.sampleLabel)+'</summary><p>Target: '+Number(item.concentration).toLocaleString()+' mg/L</p>'+(review?'<p>Student result: '+Number(review.result).toFixed(3)+' mg/L · absorbance '+Number(review.absorbance).toFixed(4)+' · R² '+Number(review.r2).toFixed(4)+'</p>':'<p class="muted">Waiting for the student result code to be reviewed in the AAS assignment area.</p>')+'</details></td></tr>';
      }).join('')+'</tbody></table></div>':'<p class="muted">No AAS unknown assignments match this view.</p>')+'</section>';
  practicalBindLinks(target);
}
function practicalReportText(record, report) {
  const parts=splitPhysicsQuestion(record.questions);
  return [record.title,'Student: '+record.name,'Workstation: '+practicalStations()[record.station],...(record.label?['Sample: '+record.label]:[]),'','Instructions and questions',parts.instructions,...(physicsQuestionValuesText(parts.physics)?['',physicsQuestionValuesText(parts.physics)]:[]),'','Readings',report.readings||'—','','Observations and answers',report.notes||'—'].join('\n');
}
function practicalStudent(root) {
  const invite = new URLSearchParams(location.search).get('practical');
  const list = practical.assignments;
  const record = list.find(item=>item.id===practical.selected) || list[0];
  root.innerHTML = (invite?'<div class="notice practical-heading"><span>Sign in with your student account, then claim this personal assignment link. Use the same account when you return to your work.</span><button class="btn" type="button" data-practical-claim>Claim assignment</button></div>':'')
    +'<p role="status" data-practical-status></p>'
    +(list.length?'<label>Your practicals<select data-practical-select>'+list.map(item=>'<option value="'+item.id+'" '+(item===record?'selected':'')+'>'+esc(item.title)+(item.label?' · '+esc(item.label):'')+'</option>').join('')+'</select></label>':'<p class="muted">New student? Sign in with ChatGPT using your own account, then open the personal practical link from your teacher and claim it. Your saved work will be available when you sign in with that same account.</p>');
  const claim = root.querySelector('[data-practical-claim]');
  if (claim) claim.onclick = ()=>practicalJob(root,claim,async()=>{
    const result = await practicalApi('claim',{invite});
    practical.selected=result.id;
    const url=new URL(location.href); url.searchParams.delete('practical'); history.replaceState(null,'',url);
    await practicalRefresh();
  });
  if (!record) return;
  root.querySelector('[data-practical-select]').onchange = event=>{
    const next=event.target.value;
    practicalJob(root,event.target,async()=>{
      clearTimeout(saveTimer);await saveDraft();practical.selected=next;practicalStudent(root);
    });
  };
  const savedDraft=record.draft?(typeof record.draft==='string'?JSON.parse(record.draft):record.draft):null;
  const draft = practical.drafts.get(record.id) || savedDraft || (record.report ? JSON.parse(record.report) : {notes:'',readings:''});
  draft.notes=String(draft.notes||'');draft.readings=String(draft.readings||'');
  practical.drafts.set(record.id,draft);
  root.insertAdjacentHTML('beforeend','<h2>'+esc(record.title)+'</h2><p class="muted">'+esc(practicalStations()[record.station])+(record.label?' · '+esc(record.label):'')+'</p>'+practicalQuestionHtml(record.questions)
    +'<p class="notice">Your work is private to you while it is a draft. The teacher receives it only after you choose “Send to teacher.” You can save, review, edit, and redo it first.</p>'
    +'<div class="practical-actions"><button type="button" class="btn" data-practical-load>'+(record.label?'Load sample at workstation':'Open workstation')+'</button>'
    +(record.label?'<button type="button" class="btn secondary" data-practical-read>Bring in latest readings</button>':'')+'</div>'
    +'<form class="practical-form"><label>Measurements and units<textarea name="readings" rows="5" maxlength="16000" placeholder="Record your values or bring them in from the station.">'+esc(draft.readings)+'</textarea></label>'
    +'<label>Observations and answers<textarea name="notes" rows="8" maxlength="12000">'+esc(draft.notes)+'</textarea></label>'
    +'<p role="status" data-draft-status>'+(record.draft_updated?'Saved draft · '+esc(new Date(record.draft_updated).toLocaleString()):'Not saved yet')+'</p>'
    +'<div class="practical-actions"><button type="button" class="btn" data-practical-save>Save work</button><button type="button" class="btn secondary" data-practical-review>Review before sending</button><button type="button" class="btn secondary" data-practical-download>Download report</button><button type="button" class="btn secondary" data-practical-print>Print report</button></div></form>'
    +'<section class="practical-review" data-practical-review-panel hidden><h3>Review your work</h3><pre data-practical-preview></pre><div class="practical-actions"><button type="button" class="btn secondary" data-practical-edit>Back to edit / redo</button><button type="button" class="btn" data-practical-submit>Send to teacher</button></div></section>'
    +(record.submitted?'<p class="notice">Latest submission sent '+esc(new Date(record.submitted).toLocaleString())+'. You can revise your work and send another attempt.</p>':'')
    +((record.submissions||[]).length?'<details><summary>My previous submissions ('+record.submissions.length+')</summary>'+record.submissions.map(item=>'<details class="practical-submission"><summary>Attempt '+item.attempt+' · '+esc(new Date(item.submitted).toLocaleString())+'</summary><pre>'+esc(practicalReportText(record,typeof item.report==='string'?JSON.parse(item.report):item.report))+'</pre></details>').join('')+'</details>':''));
  const form = root.querySelector('form');
  const review=root.querySelector('[data-practical-review-panel]'), status=root.querySelector('[data-draft-status]');
  let saveTimer;
  const updateDraft=()=>{draft.notes=form.elements.notes.value;draft.readings=form.elements.readings.value;};
  const saveDraft=async()=>{
    clearTimeout(saveTimer);
    updateDraft();
    const result=await practicalApi('student/'+record.id+'/draft',draft);
    status.textContent='Saved for revision · '+new Date(result.saved).toLocaleString();
  };
  form.oninput=()=>{
    updateDraft();status.textContent='Unsaved changes';clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>saveDraft().catch(error=>status.textContent='Could not save: '+error.message),800);
  };
  root.querySelector('[data-practical-save]').onclick=event=>practicalJob(root,event.currentTarget,saveDraft);
  root.querySelector('[data-practical-review]').onclick=event=>practicalJob(root,event.currentTarget,async()=>{
    clearTimeout(saveTimer);await saveDraft();
    root.querySelector('[data-practical-preview]').textContent=practicalReportText(record,draft);
    const hasWork=!!(draft.notes.trim()||draft.readings.trim());
    form.hidden=true;review.hidden=false;review.querySelector('[data-practical-submit]').disabled=!hasWork;
    practicalStatus(root,hasWork?'Review your report. Go back to edit or redo it before sending.':'Add measurements or observations before sending this report.');
  });
  root.querySelector('[data-practical-edit]').onclick=()=>{review.hidden=true;form.hidden=false;form.elements.notes.focus();};
  root.querySelector('[data-practical-submit]').onclick=event=>practicalJob(root,event.currentTarget,async()=>{
    clearTimeout(saveTimer);
    updateDraft();
    if(!draft.notes.trim()&&!draft.readings.trim())throw Error('Add measurements or observations before sending the report.');
    await practicalApi('student/'+record.id+'/submit',draft);
    practical.drafts.delete(record.id);
    await practicalRefresh();
    practicalStatus(root,'Your report has been sent to the teacher. You can revise and submit another attempt later.');
  });
  root.querySelector('[data-practical-load]').onclick=event=>practicalJob(root,event.currentTarget,async()=>{
    if (practical.active?.id===record.id) {go(record.station);return;}
    if (!record.label) {
      if(record.station==='physchem'){practicalLoad(record);return;}
      window.classroomPhysicsTask=null;
      practical.active=record;practical.selected=record.id;go(record.station);return;
    }
    const sample=await practicalApi('student/'+record.id);
    practicalLoad({...record,...sample});
  });
  const read = root.querySelector('[data-practical-read]');
  if (read) read.onclick=()=>{
    try {draft.readings=practicalReadings(record.id); form.elements.readings.value=draft.readings; form.oninput(); practicalStatus(root,'Readings added. Review and edit them before sending.');}
    catch(error) {practicalStatus(root,error.message);}
  };
  const reportText=()=>practicalReportText(record,draft);
  root.querySelector('[data-practical-download]').onclick=()=>{
    const url=URL.createObjectURL(new Blob([reportText()],{type:'text/plain;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='SIMLAB-practical-report.txt';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  root.querySelector('[data-practical-print]').onclick=()=>{
    const sheet=document.createElement('pre');sheet.className='practical-print';sheet.textContent=reportText();
    document.body.append(sheet);
    window.addEventListener('afterprint',()=>sheet.remove(),{once:true});
    window.print();
  };
}
function practicalLoad(record) {
  const {id, station, label, recipe} = record;
  const active = {id, station, label, title:record.title};
  window.classroomPhysicsTask=null;
  if (station==='bench') {
    const components = recipe.map(item=>{
      if (!item.custom) return {...item,index:reagents.findIndex(reagent=>reagent[0]===item.id && reagent[2]!=='publicationCustom')};
      const {name, formula} = item.custom;
      let index = reagents.findIndex(r=>r[0]===name && r[1]===formula && r[2]==='publicationCustom');
      if (index<0) {
        index = reagents.length;
        reagents.push([name,formula,'publicationCustom','Custom reagents','#d9e3e5','appearance unmodelled',item.concentration,{source:'Teacher-supplied identity'}]);
      }
      return {...item,index};
    });
    if (components.some(item=>item.index<0)) throw Error('A reagent in this sample is unavailable.');
    gcBenchTab='reaction';
    go('bench');
    addApparatus('beaker');
    const vessel = selectedEquipment();
    vessel.benchReagentName = label;
    for (const item of components) {
      $('#pourConcentration').value = item.concentration ?? 0.1;
      if (!addReagentToVessel(vessel,item.index,item.amount)) throw Error('The sample could not fit in the vessel.');
    }
    active.vessel = vessel.id;
  } else if (station==='titration') {
    const [flask,burette] = recipe.map((item,index)=>{
      const name = practical.session.catalog.titration.find(reagent=>reagent.id===item.id).name;
      return {id:benchTitId(),name:index===0?label:name+' reference',chemical:name,formula:item.id,
        role:index===0?'unknown':'known',truthC:item.concentration,assignedC:index===0?null:item.concentration,
        remaining:item.amount,initialVolume:item.amount,verified:true,sourceLabel:'Teachers Bench',createdAt:Date.now(),...(recipe.length===1?{classroomAssignment:id}:{})};
    });
    if(!burette) {
      benchTitTab='open';
      const assigned = benchTitState.samples.find(bottle=>bottle.classroomAssignment===id) || flask;
      if(assigned===flask) benchTitState.samples.push(assigned);
      benchTitChoice={mode:'assay',flask:assigned.id,burette:''};
      benchTitSave();
      practical.active=active;
      practical.selected=id;
      go(station);
      return;
    }
    benchTitState.samples.push(flask,burette);
    const error = benchTitStart('assay',flask.id,burette.id);
    if (error) {benchTitState.samples.splice(-2,2);throw Error(error);}
    benchTitChoice.mode='assay'; benchTitChoice.flask=flask.id; benchTitChoice.burette=burette.id;
    benchTitTab='setup';
    active.session = titration.benchSession.id;
  } else if (station==='instrumentation') {
    if (gcLocked() || gseq.active) throw Error('Finish the current GC run or sequence before loading this sample.');
    gc.mix = Object.fromEntries(recipe.map(item=>[item.id,item.amount]));
    gc.sample = 'custom';
    gc.sampleLoaded = true;
    gcal.loaded = null;
    active.previousRun = gc.run;
    active.mix = JSON.stringify(gcSamples().map(component=>[component.id,component.concentration]));
    gc.message = label+' loaded. Set the method, prepare the detector, and inject.';
    gcSave();
  } else if (station==='chromatography') {
    if (ch.running || ch.spotting>=0) throw Error('Finish developing or spotting the current plate before loading this sample.');
    chLoadAssignment(id,label,recipe.map(item=>item.id));
  } else if (station==='physchem') {
    const parts=splitPhysicsQuestion(record.questions||'');
    active.instructions=parts.instructions;
    active.physics=parts.physics;
    window.loadPhysicalChemAssignment?.(active);
  } else if (station==='uvvis') {
    if (uvBusy) throw Error('Finish the current UV–Vis scan before loading this sample.');
    const samples = recipe.map((item,index)=>{
      const peak=uvProfiles[item.id].peak;
      const method=item.uv||{solvent:'water',concentration:item.amount,dilution:1,wavelengths:[peak],low:null,high:null};
      const {solvent,concentration,dilution,wavelengths,low,high}=method;
      return {name:item.label||(recipe.length===1?label:label+' '+(index+1)),type:'unknown',profile:item.id,solvent,
        concentration,dilution,queued:false,assignmentId:id,assignmentSample:index,practicalMethod:{wavelengths,low,high}};
    });
    const existing = uv.vials.filter(vial=>vial.assignmentId===id);
    const missing = samples.filter(sample=>!existing.some(vial=>vial.assignmentSample===sample.assignmentSample));
    if(uv.vials.length+missing.length>30)throw Error('Free space in the UV–Vis rack before loading these samples.');
    for(const sample of missing)uvAddVial(sample);
    const assigned = uv.vials.filter(vial=>vial.assignmentId===id);
    active.vials=assigned.map(vial=>vial.id);
    uvSelectAssignedVial(assigned.find(vial=>vial.assignmentSample===0));
    uvSave();
  }
  practical.active=active;
  practical.selected=id;
  go(station);
}
function practicalReadings(id) {
  const active = practical.active;
  const unavailable = 'Run this assigned sample first, or enter the readings manually.';
  if (active?.id!==id) throw Error(unavailable);
  const fmt = (number, places=3) => Number.isFinite(number) ? number.toFixed(places) : '—';
  if (active.station==='bench') {
    const vessel = apparatus.find(item=>item.id===active.vessel);
    if (!vessel?.mixed) throw Error(unavailable);
    const result = {...predictMixture(vessel.contents,vessel),...analyzeVessel(vessel)};
    return [result.product,result.equation,result.note,Number.isFinite(result.pH)?'Modeled pH '+fmt(result.pH,2):''].filter(Boolean).join('\n');
  }
  if (active.station==='titration' && titration.benchSession && (titration.benchSession.id===active.session || titration.benchSession.flask.classroomAssignment===id)) {
    ttEnsureRuns();
    const runs = titration.runs;
    if (!runs?.length) throw Error('Record at least one titre at the station first.');
    return runs.map((run,i)=>{
      const result = benchTitRun(run);
      return 'Trial '+(i+1)+': aliquot '+fmt(run.sampleVol)+' mL, titre '+fmt(run.titre)+' mL, calculated concentration '+fmt(result?.concentration,6)+' mol/L';
    }).join('\n');
  }
  if (active.station==='instrumentation' && gc.run?.completed && gc.run!==active.previousRun) {
    const mix = JSON.stringify(gc.run.components.map(component=>[component.id,component.concentration]));
    if (mix!==active.mix) throw Error('The latest GC run uses a different mixture.');
    return gc.run.peaks.map((peak,i)=>'Peak '+(i+1)+': tR '+fmt(peak.tr)+' min, area '+fmt(peak.area)+', height '+fmt(peak.height)).join('\n') || 'No resolved peaks in this run.';
  }
  if (active.station==='chromatography' && ch.progress===1 && ch.lanes.some(lane=>lane?.assignment===id)) {
    return ['Mobile phase: '+chSolvent(), 'Solvent front: 7.00 cm',
      ...chRows().filter(row=>!row.unknown || row.assignment===id).map(row=>
        'Lane '+row.lane+' · '+row.label+' · '+row.spot+': '+fmt(row.distance,2)+' cm, Rf '+fmt(row.rf,2)
        +(row.unknown ? ' · Standard matches: '+(chStandardMatches(row.rf).join(', ')||'none') : ''))
    ].join('\n');
  }
  if (active.station==='uvvis') {
    const results = new Map();
    for(const record of uv.records)if(active.vials.includes(record.practicalVial))results.set(record.practicalVial+'-'+record.wavelength,record);
    if (!results.size) throw Error(unavailable);
    return [...results.values()].map(result=>result.name+' · Absorbance '+fmt(result.a)+' A at '+result.wavelength+' nm · '+result.note).join('\n');
  }
  throw Error(unavailable);
}
function practicalStart() {
  if (new URLSearchParams(location.search).has('practical')) go('practicals');
}


