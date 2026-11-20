const encoder = new TextEncoder();
const decoder = new TextDecoder();
const hex = bytes => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
const digest = async value => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
const opaque = () => crypto.randomUUID().replaceAll('-', '');
const tokenPattern = /^[a-f0-9]{32}$/;
const noStore = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const json = (data, status = 200, headers = {}) => Response.json(data, {status, headers:{...noStore, ...headers}});
function fail(status, message) { throw Object.assign(new Error(message), { status }); }
let aasClaimColumnsReady, rosterEmailColumnReady;
async function ensureTeacherRosterTables(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS teacher_roster_folders (
    id TEXT PRIMARY KEY, teacher_id TEXT NOT NULL, label TEXT NOT NULL COLLATE NOCASE, created INTEGER NOT NULL,
    UNIQUE(teacher_id, label)
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS teacher_roster_students (
    id TEXT PRIMARY KEY, teacher_id TEXT NOT NULL, folder_id TEXT NOT NULL REFERENCES teacher_roster_folders(id),
    name TEXT NOT NULL COLLATE NOCASE, class_group TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL,
    UNIQUE(teacher_id, folder_id, name)
  )`).run();
  if(!rosterEmailColumnReady)rosterEmailColumnReady=(async()=>{
    try { await db.prepare("ALTER TABLE teacher_roster_students ADD COLUMN email TEXT NOT NULL DEFAULT ''").run(); }
    catch(error){if(!/duplicate column name/i.test(String(error.message||error)))throw error;}
  })().catch(error=>{rosterEmailColumnReady=null;throw error;});
  await rosterEmailColumnReady;
  await db.prepare(`CREATE TABLE IF NOT EXISTS teacher_aas_assignments (
    id TEXT PRIMARY KEY, teacher_id TEXT NOT NULL, folder_id TEXT, student_id TEXT,
    student_name TEXT NOT NULL, student_email TEXT NOT NULL DEFAULT '', student_group TEXT NOT NULL DEFAULT '', folder_label TEXT NOT NULL DEFAULT '',
    assignment_title TEXT NOT NULL, element TEXT NOT NULL, sample_label TEXT NOT NULL,
    concentration REAL NOT NULL, signal REAL NOT NULL, code TEXT NOT NULL, created INTEGER NOT NULL,
    claimed_user_id TEXT, claimed_at INTEGER
  )`).run();
  if(!aasClaimColumnsReady)aasClaimColumnsReady=(async()=>{
    for(const [column,type] of [['claimed_user_id','TEXT'],['claimed_at','INTEGER'],['student_email',"TEXT NOT NULL DEFAULT ''"]]){
      try { await db.prepare(`ALTER TABLE teacher_aas_assignments ADD COLUMN ${column} ${type}`).run(); }
      catch(error){if(!/duplicate column name/i.test(String(error.message||error)))throw error;}
    }
  })().catch(error=>{aasClaimColumnsReady=null;throw error;});
  await aasClaimColumnsReady;
  await db.prepare('CREATE INDEX IF NOT EXISTS roster_students_by_teacher_folder ON teacher_roster_students(teacher_id, folder_id, name)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS aas_assignments_by_teacher_created ON teacher_aas_assignments(teacher_id, created DESC)').run();
}
let legacySubmissionBackfill;
async function backfillLegacySubmissions(db) {
  if (!legacySubmissionBackfill) legacySubmissionBackfill = db.prepare(`
    INSERT OR IGNORE INTO practical_submissions (id, student_id, attempt, report, submitted)
    SELECT lower(hex(randomblob(16))), s.id, 1, s.report, s.submitted
    FROM practical_students s
    WHERE s.report IS NOT NULL AND s.submitted IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM practical_submissions x WHERE x.student_id = s.id)
  `).run().catch(error=>{legacySubmissionBackfill=null;throw error;});
  await legacySubmissionBackfill;
}
function clean(value, max, label, required = true) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
    fail(400, 'Enter a valid ' + label + ' (up to ' + max + ' characters).');
  }
  return value.trim();
}
async function readBody(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) fail(415, 'Use JSON.');
  const reader = request.body?.getReader();
  let body = '', size = 0;
  while (reader) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 64000) { await reader.cancel(); fail(413, 'This record is too large.'); }
    body += decoder.decode(value, {stream:true});
  }
  try {
    const value = JSON.parse(body + decoder.decode());
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  } catch {}
  fail(400, 'Invalid request.');
}
function number(value, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    fail(400, 'Check the quantities and concentrations in your sample.');
  }
  return value;
}
function practicalUvMethod(input, profile, amount) {
  const compoundName = profile.id==='teacherUnknown' ? clean(input.compoundName,160,'teacher’s compound name') : undefined;
  const solvent = input.solvent;
  if (!['water','ethanol','phosphate78','phosphateReagent','nitrogenReagent','silicaReagent'].includes(solvent)) fail(400, 'Choose a supported UV–Vis solvent.');
  const dilution = number(input.dilution, 1, 100000);
  let prepared = amount, preparation = {kind:'solution'};
  if (input.preparation === 'solid') {
    const mass = number(input.mass, 0.000001, 1000000);
    const volume = number(input.volume, 0.000001, 1000000);
    const molarMass = number(input.molarMass, 0.001, 1000000);
    prepared = mass * 1000000 / (volume * molarMass);
    preparation = {kind:'solid',mass,volume,molarMass};
  }
  const concentration = number(prepared / dilution, 0.000001, 100000);
  const wavelengths = Array.isArray(input.wavelengths) && input.wavelengths.length
    ? [...new Set(input.wavelengths.map(value=>number(value, 200, 900)))] : [profile.peak];
  if (wavelengths.length > 8 || wavelengths.some(value=>!Number.isInteger(value))) fail(400, 'Choose up to eight whole-number wavelengths from 200 to 900 nm.');
  const low = input.low === null ? null : number(input.low, 0.000001, 100000);
  const high = input.high === null ? null : number(input.high, 0.000001, 100000);
  if ((low===null)!==(high===null) || low!==null&&(low>=high||concentration<low||concentration>high)) {
    fail(400, 'Enter both calibration limits and make sure they bracket the diluted sample concentration.');
  }
  return {solvent,dilution,wavelengths,low,high,concentration,preparation,...(compoundName?{compoundName}:{})};
}
function sampleRecipe(station, rows) {
  if (!Array.isArray(rows) || rows.length > 8) fail(400, 'Choose up to eight sample components.');
  if (!rows.length) return [];
  if (!Object.hasOwn(catalog, station)) fail(400, 'Use a question-only practical for this workstation.');
  if (station === 'chromatography' && (rows.length < 2 || rows.length > catalog.chromatography.length)) fail(400, 'Choose two to four distinct TLC compounds.');
  if (station === 'titration' && rows.length !== 2 && !(rows.length === 1 && rows[0]?.id === 'NaOCl')) fail(400, 'Choose an unknown and reference titrant, or send a sodium hypochlorite unknown on its own.');
  const seen = new Set();
  const recipe = rows.map(row => {
    const id = clean(row?.id, 200, 'reagent');
    let custom = null;
    if (station === 'bench' && row.custom) {
      const name = clean(row.custom.name, 200, 'chemical name');
      const formula = clean(row.custom.formula, 120, 'chemical formula');
      if (/[<>&"'·\r\n]/.test(name + formula)) fail(400, 'Use plain text in custom chemical names and formulas.');
      custom = {name, formula};
    }
    const label = station==='uvvis' && row.label!==undefined ? clean(row.label,70,'UV sample label',false) : '';
    const key = station==='uvvis' ? label.toLowerCase() : custom ? JSON.stringify(custom) : id;
    if (key && seen.has(key)) fail(400, station==='uvvis'?'Use a different label for each unknown.':'Choose each reagent once.');
    if(key)seen.add(key);
    const reagent = custom ? {unit:'mL',molar:true} : catalog[station].find(item => item.id === id);
    if (!reagent) fail(400, 'Choose a reagent supported at this workstation.');
    if(id==='teacherUnknown'&&station==='uvvis'&&!row.uv)fail(400,'Enter a name for the teacher’s compound.');
    if (station==='uvvis' && row.uv?.preparation==='solid') return {id,amount:null,concentration:null,...(label?{label}:{}),uv:practicalUvMethod(row.uv,reagent,null)};
    const amount = station === 'chromatography' ? null : number(row.amount, 0.001, station === 'bench' ? reagent.unit === 'g' ? 0.25 : 250 : station === 'titration' ? 1000 : station === 'uvvis' ? 100000 : 20);
    if (station === 'bench' && reagent.unit === 'mL' && Math.abs(amount * 10 - Math.round(amount * 10)) > 0.000001) fail(400, 'Measure liquids to the nearest 0.1 mL.');
    const concentration = reagent.molar ? number(row.concentration, 0.000001, station === 'titration' ? 1 : 10) : null;
    if(station==='uvvis' && row.uv) return {id,amount,concentration,...(label?{label}:{}),uv:practicalUvMethod(row.uv,reagent,amount)};
    return {id, amount, concentration, ...(custom ? {custom} : {})};
  });
  if (station === 'titration' && recipe.length === 2 && !catalog.titration.find(item => item.id === recipe[0].id)?.references.includes(recipe[1].id)) {
    fail(400, 'Select a compatible reference titrant.');
  }
  if (station === 'bench' && recipe.reduce((total, row) => total + ((row.custom || catalog.bench.find(item => item.id === row.id).unit === 'mL') ? row.amount : 0), 0) > 99.5) {
    fail(400, 'Keep the combined liquid volume at or below 99.5 mL for the 100 mL beaker.');
  }
  return recipe;
}
async function api(request, env, path) {
  const id = request.headers.get('oai-authenticated-user-id');
  if (!id) fail(401, 'Sign in with ChatGPT to use practicals.');
  const email = request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
  const allowed = !!email && (env.SIMLAB_TEACHER_EMAILS || '').toLowerCase().split(',').map(item => item.trim()).includes(email);
  const db = env.DB;
  const now = Date.now();
  const post = request.method === 'POST';
  if (post && request.headers.get('origin') !== new URL(request.url).origin) fail(403, 'Open SIMLAB directly to make this change.');

  if (path === 'session' || path === 'teacher' || path.startsWith('teacher/') || path === 'student' || /^student\/[a-f0-9]{32}(?:\/(?:draft|submit))?$/.test(path)) {
    await backfillLegacySubmissions(db);
  }
  const teacherRecord = await db.prepare('SELECT 1 FROM teacher_accounts WHERE user_id = ?').bind(id).first();
  // Existing allowlisted teachers keep access. Other signed-in users can opt in
  // by creating a workspace; all teacher records remain scoped to their user ID.
  const teacher = allowed || !!teacherRecord;
  if (path === 'session' && !post) return json({teacher: !!teacher, teacherAccount: !!teacher, catalog, stations, titrationMethods});
  if (path === 'teacher/register' && post) {
    await db.prepare('INSERT OR IGNORE INTO teacher_accounts (user_id, email, created) VALUES (?, ?, ?)')
      .bind(id, email || '', now).run();
    return json({teacher: true}, 201);
  }
  if (path.startsWith('teacher/roster/')) {
    if (!teacher) fail(403, 'Create a teacher workspace to continue.');
    await ensureTeacherRosterTables(db);
    if (path === 'teacher/roster/folders' && post) {
      const input = await readBody(request), label = clean(input.label, 80, 'folder label');
      const folderId = opaque();
      try {
        await db.prepare('INSERT INTO teacher_roster_folders (id, teacher_id, label, created) VALUES (?, ?, ?, ?)')
          .bind(folderId, id, label, now).run();
      } catch { fail(409, 'A folder with that label already exists. Choose a different label.'); }
      return json({id:folderId,label,created:now},201);
    }
    if (path === 'teacher/roster/students' && post) {
      const input = await readBody(request);
      if (!Array.isArray(input.students) || !input.students.length || input.students.length > 200) fail(400, 'Paste between 1 and 200 student names.');
      const folderId = clean(input.folderId, 32, 'student folder');
      const folder = await db.prepare('SELECT id FROM teacher_roster_folders WHERE id = ? AND teacher_id = ?').bind(folderId,id).first();
      if (!folder) fail(404, 'Choose one of your folders.');
      let added = 0, updatedEmails = 0;
      for (const student of input.students) {
        const name = clean(student?.name, 100, 'student name');
        const group = clean(student?.group ?? '', 60, 'class or group', false);
        const email = clean(student?.email ?? '',254,'student email',false).toLowerCase();
        if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Enter a valid email for '+name+'.');
        const result = await db.prepare('INSERT OR IGNORE INTO teacher_roster_students (id, teacher_id, folder_id, name, class_group, email, created) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .bind(opaque(),id,folderId,name,group,email,now).run();
        added += Number(result.meta?.changes || 0);
        if(!Number(result.meta?.changes||0)&&email){const updated=await db.prepare('UPDATE teacher_roster_students SET email = ? WHERE teacher_id = ? AND folder_id = ? AND name = ? COLLATE NOCASE AND email <> ?').bind(email,id,folderId,name,email).run();updatedEmails+=Number(updated.meta?.changes||0);}
      }
      const total = await db.prepare('SELECT COUNT(*) AS count FROM teacher_roster_students WHERE teacher_id = ? AND folder_id = ?').bind(id,folderId).first();
      return json({added,duplicates:input.students.length-added,updatedEmails,total:Number(total?.count||0)});
    }
    if (path === 'teacher/roster/update' && post) {
      const input=await readBody(request), studentId=clean(input.studentId,32,'student record ID');
      const name=clean(input.name,100,'student name'), group=clean(input.group ?? '',60,'class or group',false), email=clean(input.email ?? '',254,'student email',false).toLowerCase();
      if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Enter a valid student email.');
      const student=await db.prepare('SELECT id, folder_id FROM teacher_roster_students WHERE id = ? AND teacher_id = ?').bind(studentId,id).first();
      if(!student)fail(404,'That student is no longer in your roster.');
      const duplicate=await db.prepare('SELECT id FROM teacher_roster_students WHERE teacher_id = ? AND folder_id = ? AND name = ? COLLATE NOCASE AND id <> ?').bind(id,student.folder_id,name,studentId).first();
      if(duplicate)fail(409,'That name is already in this class.');
      await db.prepare('UPDATE teacher_roster_students SET name = ?, class_group = ?, email = ? WHERE id = ? AND teacher_id = ?').bind(name,group,email,studentId,id).run();
      return json({updated:true});
    }
    if (path === 'teacher/roster/remove' && post) {
      const input=await readBody(request), folderId=clean(input.folderId,32,'student folder');
      if(!Array.isArray(input.studentIds)||!input.studentIds.length||input.studentIds.length>200)fail(400,'Select at least one student to remove.');
      const folder=await db.prepare('SELECT id FROM teacher_roster_folders WHERE id = ? AND teacher_id = ?').bind(folderId,id).first();
      if(!folder)fail(404,'Choose one of your folders.');
      const ids=[...new Set(input.studentIds.map(value=>clean(value,32,'student record ID')))];
      const placeholders=ids.map(()=>'?').join(',');
      const result=await db.prepare(`DELETE FROM teacher_roster_students WHERE teacher_id = ? AND folder_id = ? AND id IN (${placeholders})`).bind(id,folderId,...ids).run();
      return json({removed:Number(result.meta?.changes||0)});
    }
    if (path === 'teacher/roster/move' && post) {
      const input = await readBody(request), folderId = clean(input.folderId,32,'destination folder');
      if (!Array.isArray(input.studentIds) || !input.studentIds.length || input.studentIds.length > 200) fail(400,'Select at least one student to move.');
      const folder = await db.prepare('SELECT id FROM teacher_roster_folders WHERE id = ? AND teacher_id = ?').bind(folderId,id).first();
      if (!folder) fail(404,'Choose one of your folders.');
      const ids=[...new Set(input.studentIds.map(value=>clean(value,32,'student record ID')))];
      let moved=0;
      for(const studentId of ids){
        const result=await db.prepare('UPDATE OR IGNORE teacher_roster_students SET folder_id = ? WHERE teacher_id = ? AND id = ?').bind(folderId,id,studentId).run();
        moved+=Number(result.meta?.changes||0);
      }
      return json({moved,skipped:ids.length-moved});
    }
    fail(404, 'Roster action unavailable.');
  }
  if (path === 'student/aas-claim' && post) {
    await ensureTeacherRosterTables(db);
    const input=await readBody(request),assignmentId=clean(input.assignmentId,32,'AAS assignment ID'),code=clean(input.code,4096,'AAS assignment code');
    const assignment=await db.prepare('SELECT claimed_user_id, claimed_at FROM teacher_aas_assignments WHERE id = ? AND code = ?').bind(assignmentId,code).first();
    if(!assignment)fail(404,'This AAS assignment link is invalid or no longer available.');
    if(assignment.claimed_user_id&&assignment.claimed_user_id!==id)fail(409,'This AAS assignment has already been claimed by another student account. Ask your teacher for help.');
    const claimedAt=Number(assignment.claimed_at)||now;
    await db.prepare('UPDATE teacher_aas_assignments SET claimed_user_id = ?, claimed_at = ? WHERE id = ? AND code = ? AND (claimed_user_id IS NULL OR claimed_user_id = ?)')
      .bind(id,claimedAt,assignmentId,code,id).run();
    const confirmed=await db.prepare('SELECT claimed_user_id, claimed_at FROM teacher_aas_assignments WHERE id = ? AND code = ?').bind(assignmentId,code).first();
    if(!confirmed||confirmed.claimed_user_id!==id)fail(409,'This AAS assignment has already been claimed by another student account. Ask your teacher for help.');
    return json({claimed:true,claimedAt:Number(confirmed.claimed_at)||now});
  }
  if (path === 'teacher/aas-assignments') {
    if (!teacher) fail(403, 'Create a teacher workspace to continue.');
    await ensureTeacherRosterTables(db);
    if (!post) {
      const result=await db.prepare('SELECT id, folder_id AS folderId, student_id AS studentId, student_name AS studentName, student_email AS studentEmail, student_group AS studentGroup, folder_label AS folderLabel, assignment_title AS assignmentTitle, element, sample_label AS sampleLabel, concentration, signal, code, created AS createdAt, CASE WHEN claimed_user_id IS NOT NULL THEN 1 ELSE 0 END AS claimed, claimed_at AS claimedAt FROM teacher_aas_assignments WHERE teacher_id = ? ORDER BY created DESC').bind(id).all();
      return json({assignments:result.results});
    }
    const input=await readBody(request),records=input.assignments;
    if(!Array.isArray(records)||!records.length||records.length>300)fail(400,'Save between 1 and 300 AAS student assignments.');
    const ranges={Cu:[0.05,5],Fe:[0.1,10],Zn:[0.02,2],Ca:[0.2,20],Pb:[0.005,0.5]},statements=[];
    for(const record of records){
      const assignmentId=clean(record?.id,32,'assignment ID'),studentId=clean(record?.studentId||'',32,'student ID',false),folderId=clean(record?.folderId||'',32,'student folder ID',false);
      const studentName=clean(record?.studentName,100,'student name'),studentEmail=clean(record?.studentEmail||'',254,'student email',false).toLowerCase(),studentGroup=clean(record?.studentGroup||'',60,'class or group',false),folderLabel=clean(record?.folderLabel||'',80,'folder label',false);
      if(studentEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail))fail(400,'Enter a valid student email.');
      const title=clean(record?.assignmentTitle,120,'assignment title'),element=clean(record?.element,2,'element'),sampleLabel=clean(record?.sampleLabel,40,'unknown label');
      if(!ranges[element])fail(400,'Choose a supported AAS element.');
      const concentration=Number(record?.concentration),signal=Number(record?.signal);
      if(!Number.isFinite(concentration)||concentration<ranges[element][0]||concentration>ranges[element][1])fail(400,'The AAS target concentration is outside the teaching range.');
      if(!Number.isFinite(signal)||signal<=0||signal>20)fail(400,'The AAS signal is outside the supported range.');
      const code=clean(record?.code,4096,'assignment code');
      if(studentId){
        const savedStudent=await db.prepare('SELECT folder_id, name, class_group FROM teacher_roster_students WHERE id = ? AND teacher_id = ?').bind(studentId,id).first();
        if(!savedStudent)fail(404,'A selected student is no longer in your roster.');
        if(folderId&&savedStudent.folder_id!==folderId)fail(400,'The selected student does not belong to that folder.');
      }
      if(folderId){const savedFolder=await db.prepare('SELECT label FROM teacher_roster_folders WHERE id = ? AND teacher_id = ?').bind(folderId,id).first();if(!savedFolder)fail(404,'Choose one of your student folders.');}
      statements.push(db.prepare(`INSERT OR REPLACE INTO teacher_aas_assignments
        (id, teacher_id, folder_id, student_id, student_name, student_email, student_group, folder_label, assignment_title, element, sample_label, concentration, signal, code, created)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(assignmentId,id,folderId||null,studentId||null,studentName,studentEmail,studentGroup,folderLabel,title,element,sampleLabel,concentration,signal,code,Number(record.createdAt)||now));
    }
    for(let offset=0;offset<statements.length;offset+=50)await db.batch(statements.slice(offset,offset+50));
    const saved=await db.prepare('SELECT id, folder_id AS folderId, student_id AS studentId, student_name AS studentName, student_email AS studentEmail, student_group AS studentGroup, folder_label AS folderLabel, assignment_title AS assignmentTitle, element, sample_label AS sampleLabel, concentration, signal, code, created AS createdAt, CASE WHEN claimed_user_id IS NOT NULL THEN 1 ELSE 0 END AS claimed, claimed_at AS claimedAt FROM teacher_aas_assignments WHERE teacher_id = ? ORDER BY created DESC').bind(id).all();
    return json({assignments:saved.results},201);
  }
  if (path === 'teacher' && !post) {
    if (!teacher) fail(403, 'Create a teacher workspace to continue.');
    await ensureTeacherRosterTables(db);
    const [practicals, students, questionSets, submissions, rosterFolders, rosterStudents, aasAssignments] = await db.batch([
      db.prepare('SELECT id, title, station, label, questions, recipe, created FROM practicals WHERE teacher_id = ? ORDER BY created DESC').bind(id),
      db.prepare('SELECT s.id, s.practical_id, s.name, s.class_group, s.invite, s.user_id IS NOT NULL AS claimed, s.report, s.submitted FROM practical_students s JOIN practicals p ON p.id = s.practical_id WHERE p.teacher_id = ?').bind(id),
      db.prepare('SELECT id, title, station, label, questions, recipe, created FROM teacher_question_sets WHERE teacher_id = ? ORDER BY created DESC').bind(id),
      db.prepare('SELECT x.id, x.student_id, x.attempt, x.report, x.submitted FROM practical_submissions x JOIN practical_students s ON s.id = x.student_id JOIN practicals p ON p.id = s.practical_id WHERE p.teacher_id = ? ORDER BY x.submitted DESC').bind(id),
      db.prepare('SELECT id, label, created FROM teacher_roster_folders WHERE teacher_id = ? ORDER BY lower(label)').bind(id),
      db.prepare('SELECT id, folder_id, name, class_group, email, created FROM teacher_roster_students WHERE teacher_id = ? ORDER BY lower(name)').bind(id),
      db.prepare('SELECT id, folder_id AS folderId, student_id AS studentId, student_name AS studentName, student_email AS studentEmail, student_group AS studentGroup, folder_label AS folderLabel, assignment_title AS assignmentTitle, element, sample_label AS sampleLabel, concentration, signal, code, created AS createdAt, CASE WHEN claimed_user_id IS NOT NULL THEN 1 ELSE 0 END AS claimed, claimed_at AS claimedAt FROM teacher_aas_assignments WHERE teacher_id = ? ORDER BY created DESC').bind(id)
    ]);
    return json({practicals:practicals.results, students:students.results, questionSets:questionSets.results, submissions:submissions.results, rosterFolders:rosterFolders.results, rosterStudents:rosterStudents.results, aasAssignments:aasAssignments.results});
  }
  if (path === 'teacher/questions' && post) {
    if (!teacher) fail(403, 'Create a teacher workspace to continue.');
    const input = await readBody(request);
    const station = input.station;
    if (!Object.hasOwn(stations, station)) fail(400, 'Choose a supported workstation.');
    const title = clean(input.title, 120, 'question set title');
    const recipe = sampleRecipe(station, input.recipe);
    const label = recipe.length ? clean(input.label || 'Unknown A', 70, 'unknown label') : '';
    const questions = clean(input.questions, 8000, 'question set');
    const setId = opaque();
    await db.prepare('INSERT INTO teacher_question_sets (id, teacher_id, title, station, label, questions, recipe, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(setId, id, title, station, label, questions, JSON.stringify(recipe), now).run();
    return json({id:setId, title, station, label, questions, recipe, created:now}, 201);
  }
  if (path === 'teacher' && post) {
    if (!teacher) fail(403, 'Create a teacher workspace to continue.');
    const input = await readBody(request);
    const station = input.station;
    if (!Object.hasOwn(stations, station)) fail(400, 'Choose a supported workstation.');
    const title = clean(input.title, 120, 'practical title');
    const recipe = sampleRecipe(station, input.recipe);
    const label = recipe.length ? clean(input.label, 70, 'unknown label') : '';
    const questions = clean(input.questions, 8000, 'practical question');
    if (!Array.isArray(input.students) || !input.students.length || input.students.length > 60) fail(400, 'Enter 1–60 students.');
    const practical = opaque();
    const students = await Promise.all(input.students.map(async student=>{
      const name = clean(student?.name, 100, 'student name');
      const group = clean(student?.group ?? '', 60, 'class or group', false);
      const invite = opaque();
      return {id:opaque(),name,class_group:group,invite_hash:await digest(invite),invite};
    }));
    await db.batch([
      db.prepare('INSERT INTO practicals VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(practical,id,title,station,label,questions,JSON.stringify(recipe),now),
      db.prepare(`INSERT INTO practical_students (id, practical_id, name, class_group, invite_hash, invite)
        SELECT json_extract(value,'$.id'), ?, json_extract(value,'$.name'), json_extract(value,'$.class_group'),
          json_extract(value,'$.invite_hash'), json_extract(value,'$.invite') FROM json_each(?)`).bind(practical,JSON.stringify(students))
    ]);
    return json({id:practical,links:students.map(({name,invite})=>({name,invite}))}, 201);
  }
  if (path === 'claim' && post) {
    const {invite} = await readBody(request);
    if (!tokenPattern.test(invite)) fail(400, 'Invalid assignment link.');
    const claimed = await db.prepare('UPDATE practical_students SET user_id = ? WHERE invite_hash = ? AND (user_id IS NULL OR user_id = ?) RETURNING id').bind(id,await digest(invite),id).first();
    if (!claimed) fail(404, 'This assignment link is unavailable or has already been claimed by another account.');
    return json(claimed);
  }
  if (path === 'student' && !post) {
    const results = await db.prepare('SELECT s.id, s.name, s.report, s.submitted, d.content AS draft, d.updated AS draft_updated, p.title, p.station, p.label, p.questions FROM practical_students s JOIN practicals p ON p.id = s.practical_id LEFT JOIN practical_student_drafts d ON d.student_id = s.id AND d.user_id = s.user_id WHERE s.user_id = ? ORDER BY p.created DESC').bind(id).all();
    return json({assignments:results.results});
  }
  const match = path.match(/^student\/([a-f0-9]{32})(?:\/(draft|submit))?$/);
  if (match) {
    const studentId = match[1], action = match[2] || '';
    if (!post && !action) {
      const [recordResult, draftResult, submissionsResult] = await db.batch([
        db.prepare('SELECT s.name, s.report, s.submitted, p.title, p.station, p.label, p.questions, p.recipe FROM practical_students s JOIN practicals p ON p.id = s.practical_id WHERE s.id = ? AND s.user_id = ?').bind(studentId,id),
        db.prepare('SELECT content, updated FROM practical_student_drafts WHERE student_id = ? AND user_id = ?').bind(studentId,id),
        db.prepare('SELECT attempt, report, submitted FROM practical_submissions WHERE student_id = ? ORDER BY attempt DESC').bind(studentId)
      ]);
      const record = recordResult.results[0];
      if (!record) fail(404, 'Assignment unavailable.');
      const recipe = JSON.parse(record.recipe).map(item=>{
        if (!item.uv) return item;
        const {preparation,compoundName,...method} = item.uv;
        return {...item,uv:method};
      });
      return json({...record,recipe,draft:draftResult.results[0]?.content||null,draft_updated:draftResult.results[0]?.updated||null,
        submissions:submissionsResult.results.map(item=>({...item,report:JSON.parse(item.report)}))});
    }
    if (!post || !action) fail(405, 'Use the matching save or submit action.');
    const input = await readBody(request);
    const report = {notes:clean(input.notes||'', 12000, action==='submit'?'practical response':'draft response', false), readings:clean(input.readings || '', 16000, 'recorded readings', false)};
    if(action==='submit'&&!report.notes.trim()&&!report.readings.trim())fail(400,'Add measurements or observations before sending the report.');
    const owned = await db.prepare('SELECT id FROM practical_students WHERE id = ? AND user_id = ?').bind(studentId,id).first();
    if (!owned) fail(404, 'Assignment unavailable.');
    if (action === 'draft') {
      await db.prepare(`INSERT INTO practical_student_drafts (student_id, user_id, content, updated) VALUES (?, ?, ?, ?)
        ON CONFLICT(student_id) DO UPDATE SET user_id = excluded.user_id, content = excluded.content, updated = excluded.updated WHERE practical_student_drafts.user_id = excluded.user_id`)
        .bind(studentId,id,JSON.stringify(report),now).run();
      return json({saved:now});
    }
    const previous = await db.prepare('SELECT COALESCE(MAX(attempt), 0) AS attempt FROM practical_submissions WHERE student_id = ?').bind(studentId).first();
    const attempt = Number(previous?.attempt||0)+1;
    await db.batch([
      db.prepare('UPDATE practical_students SET report = ?, submitted = ? WHERE id = ? AND user_id = ?').bind(JSON.stringify(report),now,studentId,id),
      db.prepare('INSERT INTO practical_submissions (id, student_id, attempt, report, submitted) VALUES (?, ?, ?, ?, ?)').bind(opaque(),studentId,attempt,JSON.stringify(report),now),
      db.prepare('DELETE FROM practical_student_drafts WHERE student_id = ? AND user_id = ?').bind(studentId,id)
    ]);
    return json({submitted:now,attempt});
  }
  fail(404, 'Endpoint unavailable.');
}

const types = {html:'text/html', js:'text/javascript', css:'text/css', txt:'text/plain'};
export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/api/practicals/')) {
      if (!['GET', 'POST'].includes(request.method)) return json({error:'Method not allowed.'},405);
      try { return await api(request, env, path.slice('/api/practicals/'.length)); }
      catch (error) {
        if (!error.status) console.error('Practicals request failed', error.message);
        return json({error:error.status ? error.message : 'The practicals service is unavailable. Try again shortly.'}, error.status || 500);
      }
    }
    const key = path === '/' ? '/index.html' : path;
    if (!Object.hasOwn(assets, key) || !['GET','HEAD'].includes(request.method)) return new Response('Not found', {status:404});
    const type = types[key.split('.').pop()] || 'application/octet-stream';
    return new Response(request.method === 'HEAD' ? null : assets[key], {headers:{...noStore,'Content-Type':type+'; charset=utf-8'}});
  }
};

