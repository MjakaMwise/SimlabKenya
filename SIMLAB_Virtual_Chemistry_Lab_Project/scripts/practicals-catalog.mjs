import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const read = name => readFileSync('dist/' + name, 'utf8');
const get = (file, start, end, variable) => {
  const source = read(file);
  return runInNewContext(source.slice(source.indexOf(start), source.indexOf(end)) + '\n' + variable);
};
const register = (file, start, end, fn) => {
  const source = read(file);
  return source.slice(source.indexOf(start), source.indexOf(end)) + '\n' + fn + '();';
};

const reagentRows = get('index.html', 'const reagents=', 'function reagentOptions', 'reagents');
runInNewContext(register('food-tests.js', 'function registerFoodReagents', 'function foodResult', 'registerFoodReagents')
  + '\n' + register('reaction-effects.js', 'function registerDemoReagents', 'function demo', 'registerDemoReagents'), {reagents:reagentRows});
const bench = reagentRows.map(([id, detail, type, group]) => {
  const defaultC = Number(detail.match(/([\d.]+)\s*M\b/)?.[1]) || null;
  return {id, name:id, formula:detail.split('·')[0].trim(), group, unit:type === 'potassiumMetal' ? 'g' : 'mL', molar:defaultC !== null, defaultC};
});
const chromatography = get('chromatography.js', 'const CH_COMPOUNDS=', 'const CH_UNKNOWNS=', 'CH_COMPOUNDS').map(({id,name,formula})=>({id,name,formula}));
const gc = get('gc-fid.js', 'const GC_COMPOUNDS=', 'const GC_COLUMNS=', 'GC_COMPOUNDS')
  .map(({id, name, formula}) => ({id, name, formula, unit:'mg/mL'}));
const uvvis = Object.entries(get('uv-visible.js', 'const uvProfiles=', 'const uvDefault=', 'uvProfiles'))
  .map(([id, {name,peak,molarMass,spectrumSource}]) => ({id,name,peak,molarMass,spectrumSource,unit:'µM'}));
const titrationModes = get('index.html', 'const titrations=', 'function esc(', 'titrations');
const linkedMethods = get('bench-titration.js', 'const benchTitInstrumentPairs', 'const benchTitChem', 'benchTitInstrumentPairs');
const titration = [
  ['HCl','Hydrochloric acid',['NaOH']], ['NaOH','Sodium hydroxide',['HCl','H2SO4']],
  ['H2SO4','Sulfuric acid',['NaOH']], ['CH3COOH','Ethanoic acid',['NaOH']],
  ['Na2CO3','Sodium carbonate',['HCl']], ['NaHCO3','Sodium hydrogencarbonate',['HCl']],
  ['KHC8H4O4','Potassium hydrogen phthalate',['NaOH']]
].map(([id,name,references]) => ({id,name,references,kind:'acid',unit:'mL',molar:true}));
for (const [kind,[analyte,titrant,note]] of Object.entries(linkedMethods)) {
  const method = titrationModes[kind];
  titration.push({id:analyte,name:method.analyteReagent,references:[titrant],kind,note,unit:'mL',molar:true,
    defaultC:method.conc * method.expected * method.stoich / method.sample},
    ...(!titration.some(item=>item.id===titrant)?[{id:titrant,name:method.titrantReagent,references:[],kind,unit:'mL',molar:true,defaultC:method.conc}]:[]));
}

export const stations = {bench:'Open Reaction Bench',titration:'Titration',instrumentation:'GC / MS acquisition',uvvis:'UV–Visible',aas:'Atomic Absorption (AAS)',qual:'Qualitative Analysis',water:'Water Analysis',electrochem:'Electrochemistry',physchem:'Physical Chemistry',gravimetric:'Gravimetric Analysis',chromatography:'Chromatography',massspec:'MS Data Analysis',ftir:'FTIR Spectroscopy'};
export const titrationMethods = Object.fromEntries(Object.entries(titrationModes).map(([kind,method])=>[kind,method.name]));
export const catalog = {bench,titration,instrumentation:gc,uvvis,chromatography};
