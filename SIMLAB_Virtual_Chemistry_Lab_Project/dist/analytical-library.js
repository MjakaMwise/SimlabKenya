const hplcTabletMethod = {
  name:'HPLC–UV', reading:'215 nm detector setting',
  setup:'C18 column at 30 °C. The study used 30:70 methanol to phosphate buffer at pH 4.0 and a flow of 1.0 mL/min.',
  preparation:'Prepare separate reference stocks in water. Powder a representative tablet sample, extract a measured portion in mobile phase, and dilute an aliquot as described in the study.',
  analysis:'Separate the formulation components and use peak areas from standards to quantify the resolved peaks.',
  source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC4870525/', citation:'Published tablet assay'
};
const hptlcTabletMethod = {
  name:'HPTLC densitometry', reading:'260 nm plate scan',
  setup:'The paper compares normal-phase and reversed-phase HPTLC on commercial combination tablets.',
  preparation:'Prepare separate standards and tablet extracts using the selected plate method in the paper. Apply measured bands alongside reference standards.',
  analysis:'Develop the plate, compare band migration with standards, then quantify resolved bands by densitometry.',
  source:'https://www.mdpi.com/1420-3049/27/2/405', citation:'Published HPTLC study'
};
const analysisCompounds = [
  {id:'paracetamol', name:'Paracetamol', aliases:'Acetaminophen', formula:'C₈H₉NO₂', category:'Drug', methods:[
    {name:'UV–Vis', reading:'243 nm absorption maximum', setup:'Reported in phosphate buffer pH 7.8.',
      preparation:'Prepare a reference stock in the same diluent and dilute to working concentrations. Use matching buffer in the quartz blank.',
      analysis:'Measure standards and a prepared sample. In mixtures with overlapping spectra, use a validated separation or multicomponent method.',
      source:'https://www.mdpi.com/2227-9717/9/8/1272', citation:'Published UV method',
      practice:{profile:'drugParacetamol', solvent:'phosphate78', start:210, end:330}},
    hplcTabletMethod,hptlcTabletMethod]},
  {id:'caffeine', name:'Caffeine', aliases:'1,3,7-trimethylxanthine', formula:'C₈H₁₀N₄O₂', category:'Organic compound / drug', methods:[
    {name:'UV–Vis', reading:'271 nm absorption maximum', setup:'Reported for the aqueous standard. The same study measured 274 nm in dichloromethane.',
      preparation:'Dilute a caffeine reference stock in distilled water. Prepare the water blank and calibration standards in the same solvent.',
      analysis:'Scan the aqueous standard, then measure the standards and unknown at the chosen wavelength.',
      source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC8163633/', citation:'Published caffeine spectra',
      practice:{profile:'drugCaffeine',solvent:'water',start:230,end:350}},
    hplcTabletMethod,hptlcTabletMethod]},
  {id:'aspirin',name:'Aspirin',aliases:'Acetylsalicylic acid',formula:'C₉H₈O₄',category:'Drug',methods:[
    {name:'UV–Vis',reading:'260–280 nm absorption band',setup:'Published study of aspirin deposit patterns. This is a band range for that study.',
      preparation:'Use freshly prepared standards and a matched solvent blank. Follow the study conditions and control hydrolysis before comparing spectra.',
      analysis:'Compare the band with reference standards. Check whether degradation products contribute to the spectrum.',
      source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC13670302/',citation:'Published aspirin UV study'}]},
  {id:'chlorpheniramine',name:'Chlorpheniramine maleate',aliases:'Chlorphenamine maleate',formula:'C₂₀H₂₃ClN₂O₄',category:'Drug',methods:[hplcTabletMethod]},
  {id:'toluene',name:'Toluene',aliases:'Methylbenzene',formula:'C₇H₈',category:'Volatile organic compound',methods:[
    {name:'GC–MS',reading:'Retention time and electron ionization mass spectrum',setup:'EPA Method 8260D includes toluene among its volatile organic analytes.',
      preparation:'For the aqueous method, use a sealed sample vial and the prescribed purge-and-trap preparation. Run blanks and calibration standards through the same preparation.',
      analysis:'Compare retention with a standard and compare the EI mass spectrum with reference data. In SIMLAB, choose a toluene sample and the MS detector to practise interpretation.',
      source:'https://www.epa.gov/hw-sw846/sw-846-test-method-8260d-volatile-organic-compounds-gas-chromatographymass-spectrometry',citation:'EPA Method 8260D',
      extra:'https://webbook.nist.gov/cgi/cbook.cgi?ID=C108883&Mask=200', station:'instrumentation'}]}
];
// IR references open the same sample in the virtual ATR station.
function analyticalIrMethod(id,cas){
  return {name:'ATR–FTIR',reading:'Infrared bands in cm⁻¹',setup:'Compare representative infrared absorption bands in the virtual ATR station with the experimental reference.',
    preparation:'Collect a background with a clean ATR crystal, then bring the liquid or solid sample into close contact with the crystal.',
    analysis:'Inspect characteristic bands and compare the fingerprint region with a reference measured under comparable conditions.',
    source:'https://webbook.nist.gov/cgi/cbook.cgi?ID=C'+cas+'&Mask=80',citation:'NIST IR spectrum',ftirSample:id};
}
for(const [id,cas] of [['toluene','108883'],['paracetamol','103902'],['caffeine','58082']]){
  analysisCompounds.find(record=>record.id===id).methods.push(analyticalIrMethod(id,cas));
}
analysisCompounds.push(
  {id:'ethanol',name:'Ethanol',aliases:'Ethyl alcohol',formula:'C₂H₆O',category:'Organic compound',methods:[analyticalIrMethod('ethanol','64175')]},
  {id:'acetone',name:'Acetone',aliases:'Propanone',formula:'C₃H₆O',category:'Organic compound',methods:[analyticalIrMethod('acetone','67641')]},
  {id:'acetic',name:'Ethanoic acid',aliases:'Acetic acid',formula:'C₂H₄O₂',category:'Organic compound',methods:[analyticalIrMethod('acetic','64197')]},
  {id:'methanol',name:'Methanol',aliases:'Methyl alcohol',formula:'CH₄O',category:'Organic compound',methods:[analyticalIrMethod('methanol','67561')]},
  {id:'ethylAcetate',name:'Ethyl acetate',aliases:'Ethyl ethanoate',formula:'C₄H₈O₂',category:'Organic compound',methods:[analyticalIrMethod('ethylAcetate','141786')]}
);
const ionChromatographyMethod = {
  name:'Ion chromatography', reading:'Suppressed conductivity detection',
  setup:'EPA 300.1 Part A separates common anions in drinking water on an anion-exchange column.',
  preparation:'Prepare calibration standards in reagent water. Follow the method’s analyte-specific preservation, filtration and dilution instructions for the sample.',
  analysis:'Compare the resolved peak with a standard and use the conductivity response for quantification. Confirm unfamiliar samples by matrix fortification.',
  source:'https://www.epa.gov/sites/default/files/2015-08/documents/method_300-1_1997.pdf', citation:'EPA Method 300.1'
};
const nitrateNitriteMethod = {
  name:'Colorimetry', reading:'Azo dye colour after diazotization and coupling',
  setup:'EPA 353.2 uses copper–cadmium reduction to convert nitrate to nitrite before automated colour development.',
  preparation:'Prepare nitrogen standards and a reagent blank. Follow the method’s sample handling and filtration guidance.',
  analysis:'Measure nitrate plus nitrite after reduction. Determine nitrite on a separate unreduced aliquot and subtract on the same mg N/L basis to obtain nitrate.',
  source:'https://www.epa.gov/sites/default/files/2015-08/documents/method_353-2_1993.pdf', citation:'EPA Method 353.2'
};
function nitrogenUvMethod(nitrate){
  return {
    name:'Colorimetry',reading:'543 nm azo dye absorption maximum',
    setup:nitrate?'USGS enzyme reduction converts nitrate to nitrite before dye development. The practice sample assumes nitrate is the only source of nitrite.':'The Griess colour reaction measures nitrite directly without a reduction step.',
    preparation:'Process the water sample, standards and reagent blank through the same colour development. The virtual vials represent prepared solutions.',
    analysis:nitrate?'Calibrate using nitrate standards. If nitrite is also present in a real sample, measure it separately and subtract on the same nitrogen basis.':'Calibrate using nitrite standards. The result is the simulated nitrite concentration.',
    source:'https://pubs.usgs.gov/sir/2013/5033/pdf/sir2013-5033.pdf',citation:'USGS colorimetric nitrate study, section 2.2',
    practice:{profile:nitrate?'ionNitrate':'ionNitrite',solvent:'nitrogenReagent',start:460,end:650}
  };
}
const analysisIons = [
  {id:'phosphate',name:'Orthophosphate',aliases:'Phosphate PO4 3- dissolved reactive phosphorus',formula:'PO₄³⁻',category:'Inorganic anion',methods:[
    {name:'Colorimetry',reading:'650 nm in the EPA 365.3 spectrophotometer procedure',
      setup:'Acidic molybdate chemistry followed by ascorbic acid reduction produces a blue complex.',
      preparation:'For dissolved orthophosphate, filter the sample through a phosphorus-free 0.45 µm filter. Treat standards, sample and blank with the same colour development steps.',
      analysis:'Use the standard curve and report as mg P/L. Measuring total phosphorus requires the digestion specified in the method.',
      source:'https://www.epa.gov/sites/default/files/2015-08/documents/method_365-3_1978.pdf',citation:'EPA Method 365.3, section 8.3',practice:{profile:'ionPhosphate',solvent:'phosphateReagent',start:530,end:760}},
    ionChromatographyMethod]},
  {id:'nitrate',name:'Nitrate',aliases:'NO3 nitrate nitrogen',formula:'NO₃⁻',category:'Inorganic anion',methods:[ionChromatographyMethod,nitrateNitriteMethod,nitrogenUvMethod(true)]},
  {id:'nitrite',name:'Nitrite',aliases:'NO2 nitrite nitrogen',formula:'NO₂⁻',category:'Inorganic anion',methods:[ionChromatographyMethod,nitrateNitriteMethod,nitrogenUvMethod(false)]},
  {id:'silicate',name:'Dissolved reactive silica',aliases:'Silicate silicates silicic acid H4SiO4 SiO2',formula:'SiO₂ (reporting basis)',category:'Dissolved inorganic species',methods:[
    {name:'Colorimetry',reading:'810 nm in the USGS tidal Potomac method',
      setup:'Acidic molybdate reacts with dissolved reactive silica. Reduction produces the blue complex measured in the cited study.',
      preparation:'Use a dissolved sample aliquot, matching silica standards and a reagent blank. Follow the study’s colour development sequence and timing.',
      analysis:'Report reactive silica on the stated SiO₂ basis. Larger silica polymers may escape detection. The virtual profile models the developed complex.',
      source:'https://pubs.usgs.gov/of/1984/0074/report.pdf',citation:'USGS tidal Potomac report, Silica section',practice:{profile:'ionSilica',solvent:'silicaReagent',start:740,end:880}}]},
  ...[
    ['chloride','Chloride','Cl⁻','Cl'],
    ['sulfate','Sulfate','SO₄²⁻','SO4 sulphate'],
    ['fluoride','Fluoride','F⁻','F'],
    ['bromide','Bromide','Br⁻','Br']
  ].map(([id,name,formula,aliases])=>({id,name,formula,aliases,category:'Inorganic anion',methods:[ionChromatographyMethod]}))
];

let analysisSelected='paracetamol';
let analysisCategory='organic';

function analyticalLibraryPage(){
  return `${head('REFERENCE & PRACTICE','Analytical library','Find a compound or ion, compare documented analytical methods, and open a compatible virtual instrument where available.')}
  <section class="panel analysis-library">
    <div class="analysis-categories" role="group" aria-label="Library section">
      <button type="button" class="bench-task-button" data-analysis-category="organic" aria-pressed="${analysisCategory==='organic'}">Drugs &amp; organic compounds</button>
      <button type="button" class="bench-task-button" data-analysis-category="inorganic" aria-pressed="${analysisCategory==='inorganic'}">Inorganic ions</button>
    </div>
    <div class="analysis-filters">
      <label>Find a compound or ion<input id="analysisQuery" type="search" placeholder="Name, synonym or formula"></label>
      <label>Instrument or method<select id="analysisMethod">
        <option value="">All methods</option>
      </select></label>
    </div>
    <div class="analysis-layout"><div id="analysisList" aria-label="Compounds"></div><div id="analysisDetail"></div></div>
    <p class="muted">Wavelengths apply to the documented solvent, matrix or detector settings. UV absorbance alone gives limited identification in mixtures. Practice spectra are synthetic, with published wavelength anchors and simulated absorbance. Inorganic UV–Vis practice uses simulated absorbance for prepared colour complexes. Results use µmol/L of analyte. Ion chromatography, HPLC and HPTLC cards are method references.</p>
    <p class="muted">Further reference: <a href="https://www.pharmaceuticalpress.com/content/clarkes-analysis-of-drugs-and-poisons/" target="_blank" rel="noopener">Clarke’s Analysis of Drugs and Poisons</a> via MedicinesComplete. The method cards cite their own public sources.</p>
  </section>`;
}
function analyticalLibraryRefresh(){
  const normalize=value=>value.toLowerCase().replace(/[₀-₉]/g,digit=>'₀₁₂₃₄₅₆₇₈₉'.indexOf(digit)).trim();
  const query=normalize(document.getElementById('analysisQuery').value);
  const methodSelect=document.getElementById('analysisMethod');
  const collection=analysisCategory==='inorganic'?analysisIons:analysisCompounds;
  const methods=[...new Set(collection.flatMap(record=>record.methods.map(method=>method.name)))];
  const filter=methods.includes(methodSelect.value)?methodSelect.value:'';
  methodSelect.innerHTML='<option value="">All methods</option>'+methods.map(name=>'<option>'+esc(name)+'</option>').join('');
  methodSelect.value=filter;
  const records=collection.filter(record=>
    normalize([record.name,record.aliases,record.formula].join(' ')).includes(query)&&
    (!filter||record.methods.some(method=>method.name===filter)));
  const selected=records.find(record=>record.id===analysisSelected)||records[0];
  const list=document.getElementById('analysisList'),detail=document.getElementById('analysisDetail');
  if(!selected){list.textContent='No entries match this search.';detail.innerHTML='';return;}
  analysisSelected=selected.id;
  list.innerHTML=records.map(record=>`<button class="analysis-compound" type="button" data-analysis-id="${record.id}" aria-pressed="${record===selected}"><b>${esc(record.name)}</b><small>${esc(record.formula)} · ${esc(record.category)}</small></button>`).join('');
  detail.innerHTML=`<h2>${esc(selected.name)} <small>${esc(selected.formula)}</small></h2><p class="muted">${esc(selected.aliases)}</p>`+
    selected.methods.filter(method=>!filter||method.name===filter).map(method=>`
    <article class="analysis-method">
      <h3>${esc(method.name)}</h3><p><b>${esc(method.reading)}</b></p><p>${esc(method.setup)}</p>
      <p><b>Sample preparation</b><br>${esc(method.preparation)}</p><p><b>Analysis</b><br>${esc(method.analysis)}</p>
      <div class="analysis-actions">
        <a href="${method.source}" target="_blank" rel="noopener">${esc(method.citation)} ↗</a>
        ${method.extra?`<a href="${method.extra}" target="_blank" rel="noopener">NIST EI spectrum ↗</a>`:''}
        ${method.practice?`<button class="btn small" type="button" data-analysis-uv="${selected.id}">Set up UV–Vis practice</button>`:''}
        ${method.ftirSample?`<button class="btn small" type="button" data-analysis-ftir="${method.ftirSample}">Open FTIR practice</button><button class="btn secondary small" type="button" data-analysis-overlay="${method.ftirSample}">Overlay FTIR reference</button>`:''}
        ${method.station?`<button class="btn small" type="button" data-analysis-station="${method.station}">Open GC workstation</button>`:''}
      </div>
    </article>`).join('');
}
function analyticalLibraryBind(){
  if(page!=='analysislibrary')return;
  const list=document.getElementById('analysisList');
  document.getElementById('analysisQuery').oninput=analyticalLibraryRefresh;
  document.getElementById('analysisMethod').onchange=analyticalLibraryRefresh;
  const categoryButtons=[...document.querySelectorAll('[data-analysis-category]')];
  categoryButtons.forEach(button=>button.onclick=()=>{
    if(analysisCategory===button.dataset.analysisCategory)return;
    analysisCategory=button.dataset.analysisCategory;
    document.getElementById('analysisQuery').value='';
    document.getElementById('analysisMethod').value='';
    for(const item of categoryButtons)item.setAttribute('aria-pressed',String(item===button));
    analyticalLibraryRefresh();
  });
  list.onclick=event=>{
    const button=event.target.closest('[data-analysis-id]');
    if(!button)return;
    analysisSelected=button.dataset.analysisId;
    analyticalLibraryRefresh();
    list.querySelector('[aria-pressed="true"]')?.focus();
  };
  document.getElementById('analysisDetail').onclick=event=>{
    const button=event.target.closest('button');
    if(button?.dataset.analysisOverlay){
      ftir.overlays=[...new Set([...ftir.overlays,button.dataset.analysisOverlay])];
      ftirTab='references';
      ftirView='sample';
      ftirSave();
      go('ftir');
      return;
    }
    if(button?.dataset.analysisFtir){if(!ftirBusy){ftir.sample=button.dataset.analysisFtir;ftirSave();}go('ftir');return;}
    if(button?.dataset.analysisStation){go(button.dataset.analysisStation);return;}
    const entry=[...analysisCompounds,...analysisIons].find(record=>record.id===button?.dataset.analysisUv);
    if(entry)openAnalyticalUv(entry);
  };
  analyticalLibraryRefresh();
}
function openAnalyticalUv(entry){
  const method=entry.methods.find(method=>method.practice);
  if(!method)return;
  if(!uvBusy){
    const {profile,solvent,start,end}=method.practice;
    Object.assign(uv,{solvent,start,end,wavelength:uvProfiles[profile].peak,material:'quartz',path:1,blank:null,loaded:null,result:null,
      message:'Teaching profile selected. Prepare your own vials or create a practice set, then zero with a matching blank.'});
    Object.assign(uv.prep,{profile,name:entry.name+' standard',type:'standard'});
    for(const vial of uv.vials)if(vial.profile!==profile||vial.solvent!==solvent)vial.queued=false;
    uvActiveTab='prepare';
    uvSave();
  }
  go('uvvis');
}
