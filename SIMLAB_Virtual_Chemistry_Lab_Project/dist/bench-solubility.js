/* Dilute aqueous ion-exchange fallback for imported reagent formulas. */
const solubilityCations = {
  Li:1, Na:1, K:1, Rb:1, Cs:1, NH4:1, Ag:1, Mg:2, Ca:2, Sr:2, Ba:2,
  Zn:2, Mn:2, Co:2, Ni:2, Cu:2, Fe:2, 'Fe:III':3, Al:3, Pb:2, Hg2:2
};
const solubilityAnions = {
  NO3:1, Cl:1, Br:1, I:1, SO4:2, CO3:2, PO4:3, OH:1, S:2, C2H3O2:1, CrO4:2, O:2
};
const solubilityAlways = new Set(['Li','Na','K','Rb','Cs','NH4']);
const solubilityHalides = new Set(['Cl','Br','I']);
// Selected teaching constants at 25 °C: OpenStax Chemistry 2e, Appendix J.
const solubilityConstants = {
  AgCl:1.6e-10, AgBr:5e-13, AgI:1.5e-16, Ag2SO4:1.2e-5,
  PbCl2:1.6e-5, PbBr2:4.6e-6, PbI2:1.4e-8, PbSO4:1.3e-8,
  Hg2Cl2:1.1e-18, Hg2Br2:1.3e-22, BaSO4:2.3e-8, SrSO4:3.2e-7,
  CaCO3:8.7e-9, BaCO3:1.6e-9, SrCO3:7e-10, ZnCO3:2e-10,
  BaCrO4:8.5e-11, PbCrO4:2e-16, Ag2CrO4:9e-12, SrCrO4:3.6e-5,
  'Ca(OH)2':1.3e-6, 'Mg(OH)2':8.9e-12, 'Cu(OH)2':2.2e-20,
  'Fe(OH)2':1.8e-15, 'Fe(OH)3':4e-38, 'Ni(OH)2':1.6e-16
};
const solubilityColours = {
  AgCl:'#f4f1e9', AgBr:'#fff0c3', AgI:'#f0e49c', PbCl2:'#f2eee6', PbBr2:'#f4f1e9',
  PbI2:'#f3d93f', BaSO4:'#f4f1e9', SrSO4:'#f4f1e9', PbSO4:'#f3f0e9', CaSO4:'#f4f1e9',
  CaCO3:'#f2f0e8', BaCO3:'#f2f0e8', SrCO3:'#f2f0e8', ZnCO3:'#f2f0e8',
  BaCrO4:'#ebdb62', PbCrO4:'#f3d93f', Ag2CrO4:'#9d583b', PbS:'#252329', CuS:'#252329',
  'Cu(OH)2':'#97c7e4','Fe(OH)2':'#a1b994','Fe(OH)3':'#9d583b','Mg(OH)2':'#f2f0e8'
};

const solubilityAtomicMasses = {H:1.008,Li:6.94,C:12.011,N:14.007,O:15.999,Na:22.990,Mg:24.305,Al:26.982,
  P:30.974,S:32.06,Cl:35.45,K:39.098,Ca:40.078,Cr:51.996,Mn:54.938,Fe:55.845,Co:58.933,Ni:58.693,
  Cu:63.546,Zn:65.38,Br:79.904,Sr:87.62,Ag:107.868,I:126.904,Cs:132.905,Ba:137.327,Rb:85.468,
  Pb:207.2,Hg:200.592};
function solubilityFormulaMass(formula) {
  const normalized=String(formula||'').replace(/[₀-₉]/g,digit=>'₀₁₂₃₄₅₆₇₈₉'.indexOf(digit)).replace(/\s+/g,'');
  const tokens=normalized.match(/[A-Z][a-z]?|\d+|[()]/g)||[];
  if(tokens.join('')!==normalized||!tokens.length)return null;
  let index=0,valid=true;
  const group=()=>{let mass=0;while(index<tokens.length&&tokens[index]!==')'){
    if(tokens[index]==='('){index++;const nested=group();if(tokens[index]!==')'){valid=false;return mass;}index++;const multiplier=/^\d+$/.test(tokens[index]||'')?Number(tokens[index++]):1;mass+=nested*multiplier;continue;}
    const element=tokens[index++];if(!(element in solubilityAtomicMasses)){valid=false;return mass;}
    const count=/^\d+$/.test(tokens[index]||'')?Number(tokens[index++]):1;mass+=solubilityAtomicMasses[element]*count;
  }return mass;};
  const mass=group();return valid&&index===tokens.length?mass:null;
}

function solubilityFormulaKey(value) {
  const normalized = String(value).replace(/[₀-₉]/g, digit => '₀₁₂₃₄₅₆₇₈₉'.indexOf(digit)).replace(/\s+/g,'');
  const expanded = normalized.replace(/\(((?:[A-Z][a-z]?\d*)+)\)(\d+)/g, (_, group, count) =>
    group.replace(/([A-Z][a-z]?)(\d*)/g, (_, element, n) => element + Number(n || 1)*Number(count)));
  const tokens = [...expanded.matchAll(/([A-Z][a-z]?)(\d*)/g)];
  if (!tokens.length || tokens.map(token => token[0]).join('') !== expanded) return '';
  const atoms = new Map();
  for (const [,element,digits] of tokens) {
    const count = Number(digits || 1);
    if (!Number.isSafeInteger(count) || count < 1 || count > 100) return '';
    atoms.set(element,(atoms.get(element)||0)+count);
  }
  return [...atoms].sort(([a],[b])=>a.localeCompare(b)).map(([element,count])=>element+count).join('');
}
function solubilitySalt(cation,anion) {
  const positive=solubilityCations[cation], negative=solubilityAnions[anion];
  let divisor=Math.min(positive,negative);
  while (positive%divisor || negative%divisor) divisor--;
  const c=negative/divisor, a=positive/divisor;
  const symbol=cation.split(':')[0];
  const group=(ion,count)=>count===1?ion:(/^[A-Z][a-z]?$/.test(ion)?ion:'('+ion+')')+count;
  const formula=group(symbol,c)+group(anion,a);
  let rule='soluble';
  if (anion==='O') rule='conditional';
  else if (solubilityAlways.has(cation)||anion==='NO3') rule='soluble';
  else if ((solubilityHalides.has(anion)&&['Ag','Pb','Hg2'].includes(cation)) ||
    (anion==='SO4'&&['Ca','Sr','Ba','Pb','Ag','Hg2'].includes(cation)) ||
    (anion==='OH'&&['Ca','Sr'].includes(cation)) || (anion==='C2H3O2'&&cation==='Ag')) rule='sparingly soluble';
  else if (['CO3','PO4','S','CrO4'].includes(anion) || (anion==='OH'&&cation!=='Ba')) rule='low solubility';
  if ((anion==='S'&&['Mg','Ca','Sr','Ba','Al','Fe:III'].includes(cation)) ||
      (anion==='OH'&&['Ag','Hg2'].includes(cation)) ||
      (anion==='CO3'&&['Al','Fe:III','Cu'].includes(cation)) ||
      (anion==='I'&&['Cu','Fe:III','Hg2'].includes(cation))) rule='conditional';
  return {cation,anion,c,a,formula,rule,ksp:solubilityConstants[formula]};
}
const solubilityFormulaIndex=new Map();
for (const cation of Object.keys(solubilityCations)) {
  for (const anion of Object.keys(solubilityAnions)) {
    const salt=solubilitySalt(cation,anion);
    const key=solubilityFormulaKey(salt.formula);
    solubilityFormulaIndex.set(key,solubilityFormulaIndex.has(key)?null:salt);
  }
}
function solubilityLookup(formula) {
  return solubilityFormulaIndex.get(solubilityFormulaKey(formula));
}
function solubilityImportedPrediction(items,conditions) {
  const base={product:'Solubility prediction unavailable',equation:'',color:'#d9e3e5',solutionColor:'#d9e3e5',
    precipitate:false,gas:null,status:'unsupported'};
  const unavailable=note=>({...base,note});
  const entries=benchEntries(items);
  if (entries.some(entry=>entry.mass>0&&!entry.solidDissolved)) return unavailable('Use prepared aqueous solutions for ion exchange.');
  const volume=entries.reduce((sum,entry)=>sum+entry.volume/1000,0);
  const salts=new Map();
  for (const entry of entries) {
    if (entry.type==='water') continue;
    const salt=solubilityLookup(entry.f);
    if (!salt||!Number.isFinite(entry.c)||entry.c<0||entry.c>1||!Number.isFinite(entry.n))
      return unavailable('Use recognized simple ionic formulas and measured dilute aqueous concentrations (up to 1 mol/L).');
    if (!entry.n) continue;
    if (salt.rule!=='soluble' && !(salt.ksp && salt.rule!=='conditional' &&
      (salt.c*entry.c)**salt.c*(salt.a*entry.c)**salt.a<=salt.ksp))
      return unavailable(salt.formula+' cannot be assumed fully dissolved at the entered concentration.');
    const stored=salts.get(salt.formula);
    salts.set(salt.formula,{...salt,moles:(stored?.moles||0)+entry.n});
  }
  if (salts.size!==2||!(volume>0)) return unavailable('Mix two different supported aqueous salts to predict ion-exchange products.');
  if (Math.abs((conditions.temperature??25)-25)>10) return unavailable('This rule model applies near room temperature.');
  const [first,second]=salts.values();
  const crosses=first.cation===second.cation||first.anion===second.anion?[]:[
    solubilitySalt(first.cation,second.anion),solubilitySalt(second.cation,first.anion)
  ];
  const cations=new Map(),anions=new Map();
  for (const salt of salts.values()) {
    cations.set(salt.cation,(cations.get(salt.cation)||0)+salt.c*salt.moles/volume);
    anions.set(salt.anion,(anions.get(salt.anion)||0)+salt.a*salt.moles/volume);
  }
  if (anions.has('OH')&&cations.has('NH4')) return unavailable('Ammonium and hydroxide require an acid–base model.');
  if (crosses.some(salt=>salt.rule==='conditional')) return unavailable('An ion pair can undergo competing chemistry, so simple solubility rules cannot resolve this mixture.');
  const ionProduct=salt=>cations.get(salt.cation)**salt.c*anions.get(salt.anion)**salt.a;
  if ([first,second].some(salt=>salt.rule!=='soluble'&&ionProduct(salt)>salt.ksp))
    return unavailable('A starting salt may also precipitate through a common-ion effect. This requires a coupled equilibrium model.');
  if (crosses.some(salt=>salt.anion==='OH'&&['Al','Zn','Pb'].includes(salt.cation)&&
    anions.get('OH')>salt.a/salt.c*cations.get(salt.cation)))
    return unavailable('Excess hydroxide can redissolve this solid. The result depends on complex-ion equilibria.');
  const solids=crosses.filter(salt=>salt.rule!=='soluble'&&(!salt.ksp||ionProduct(salt)>salt.ksp));
  if (!solids.length) return {...base,product:'Ions remain dissolved',equation:'No net ionic precipitation reaction.',
    note:crosses.length?'Possible ion pairings: '+crosses.map(salt=>salt.formula).join(' and ')+'. Both remain dissolved by the rule or the calculated ion product.':'The salts share an ion. No new ion pairing is predicted.',
    status:'qualitative'};
  if (solids.length>1) return {...base,product:'Multiple possible solids',status:'qualitative',
    note:solids.map(salt=>salt.formula).join(' and ')+' are candidates. Competing precipitation requires a coupled equilibrium model.'};
  const solid=solids[0], colour=solubilityColours[solid.formula]||'#cbd4d8';
  const ion=(formula,charge,count)=> (count===1?'':count+' ')+formula+'^'+(Math.abs(charge)===1?'':Math.abs(charge))+(charge>0?'+':'−')+'(aq)';
  const other=crosses.find(salt=>salt!==solid);
  const cationMoles=(cations.get(solid.cation)||0)*volume,anionMoles=(anions.get(solid.anion)||0)*volume,
    maximumMoles=Math.min(cationMoles/solid.c,anionMoles/solid.a),
    molarMass=solubilityFormulaMass(solid.formula);
  let precipitateMoles=maximumMoles,basis='Stoichiometric maximum; assumes complete precipitation because no Ksp value is available for this solid.';
  if(Number.isFinite(solid.ksp)){
    let low=0,high=maximumMoles;
    const ionProductAt=extent=>Math.max(0,(cationMoles-solid.c*extent)/volume)**solid.c*
      Math.max(0,(anionMoles-solid.a*extent)/volume)**solid.a;
    for(let i=0;i<90;i++){const mid=(low+high)/2;if(ionProductAt(mid)>solid.ksp)low=mid;else high=mid;}
    precipitateMoles=(low+high)/2;
    basis=`Estimated equilibrium amount from the listed Ksp (${solid.ksp.toExponential(2)}) at 25 °C; ideal concentrations, no activity correction.`;
  }
  const limiting= cationMoles/solid.c<=anionMoles/solid.a ? solid.cation+' ion' : solid.anion+' ion';
  const precipitateQuantitation=molarMass&&precipitateMoles>0?{available:true,formula:solid.formula,molarMass,moles:precipitateMoles,
    mass:precipitateMoles*molarMass,basis,limiting,reactants:[
      {type:solid.cation+' ion',coefficient:solid.c,moles:cationMoles},
      {type:solid.anion+' ion',coefficient:solid.a,moles:anionMoles}
    ]}:null;
  return {...base,product:solid.formula+(solid.ksp?' precipitate':' possible precipitate'),
    equation:ion(solid.cation.split(':')[0],solubilityCations[solid.cation],solid.c)+' + '+ion(solid.anion,-solubilityAnions[solid.anion],solid.a)+' → '+solid.formula+'(s)',
    note:solid.formula+' is '+solid.rule+'. '+(solid.ksp?'After mixing, the estimated ion product exceeds Ksp. ':'The general rule flags a possible solid. Exact onset and yield are unavailable. ')+
      (other.rule==='soluble'?'The ions in '+other.formula+' remain aqueous. ':'The other ion pair, '+other.formula+', is below its saturation threshold. ')+
      (!solubilityColours[solid.formula]?'The solid is drawn in a neutral tint because its colour is not assigned.':''),
    color:colour,precipitate:true,precipitateColor:colour,status:'qualitative',precipitateQuantitation};
}
