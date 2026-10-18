import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { PageHead } from "@/site/ui";
import { useSite } from "@/site/SiteContext";
import { useSchoolAuth } from "@/hooks/useSchoolAuth";
import { IMG } from "@/site/data";

interface Student {
  id: string;
  name: string;
  age: number | null;
  grade: string | null;
  level: string;
  guardianName: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
  notes: string | null;
}

const STUDENT_LEVELS: [string, string][] = [
  ["primary", "Primary"], ["junior_secondary", "Junior secondary"], ["senior_secondary", "Senior secondary"],
  ["college", "College"], ["other", "Other"],
];
const levelLabel = (v: string) => STUDENT_LEVELS.find(([k]) => k === v)?.[1] ?? v.replace(/_/g, " ");

const STATUS_TEXT: Record<string, string> = {
  pending: "Pending review. We will confirm your school's places shortly.",
  confirmed: "Confirmed. Your school's places in Ocean Shujaa are secured.",
  waitlisted: "Waitlisted. We will contact you as soon as places open.",
  cancelled: "Cancelled.",
};

const BULK_HEADER = "name, age, grade, level, guardian name, guardian phone, guardian email";

/** Parse pasted rows ("name, age, grade, level, guardian, phone, email"; tabs also work, so a spreadsheet paste is fine). */
const parseBulk = (text: string, fallbackLevel: string) => {
  const rows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: Record<string, unknown>[] = [];
  rows.forEach((line, i) => {
    const c = line.split(/\t|,/).map((x) => x.trim());
    if (i === 0 && /^name$/i.test(c[0])) return; // header row
    const lvl = (c[3] ?? "").toLowerCase().replace(/\s+/g, "_");
    out.push({
      name: c[0], age: c[1] || null, grade: c[2] || null,
      level: STUDENT_LEVELS.some(([k]) => k === lvl) ? lvl : fallbackLevel,
      guardianName: c[4] || null, guardianPhone: c[5] || null, guardianEmail: c[6] || null,
    });
  });
  return out;
};

const csvCell = (v: unknown) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};

const StudentForm = ({ initial, busy, submitLabel, onSubmit, onCancel }: {
  initial?: Student; busy: boolean; submitLabel: string;
  onSubmit: (body: Record<string, unknown>) => void; onCancel?: () => void;
}) => {
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const v = (n: string) => (f.elements.namedItem(n) as HTMLInputElement).value.trim();
    onSubmit({
      name: v("name"), age: v("age") || null, grade: v("grade"), level: v("level"),
      guardianName: v("guardianName"), guardianPhone: v("guardianPhone"), guardianEmail: v("guardianEmail"), notes: v("notes"),
    });
  };
  return (
    <form className="reg-form" onSubmit={submit}>
      <div className="two">
        <label>Student name<input type="text" name="name" required minLength={2} maxLength={120} defaultValue={initial?.name} /></label>
        <label>Age<input type="number" name="age" min={3} max={99} defaultValue={initial?.age ?? ""} /></label>
      </div>
      <div className="two">
        <label>Class / grade<input type="text" name="grade" maxLength={40} defaultValue={initial?.grade ?? ""} /></label>
        <label>Level
          <select name="level" required defaultValue={initial?.level ?? ""}>
            <option value="" disabled>Select level</option>
            {STUDENT_LEVELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
      </div>
      <div className="two">
        <label>Parent / guardian name<input type="text" name="guardianName" maxLength={120} defaultValue={initial?.guardianName ?? ""} /></label>
        <label>Guardian phone<input type="tel" name="guardianPhone" maxLength={25} defaultValue={initial?.guardianPhone ?? ""} /></label>
      </div>
      <label>Guardian email<input type="email" name="guardianEmail" maxLength={160} defaultValue={initial?.guardianEmail ?? ""} /></label>
      <label>Notes (allergies, accessibility needs, etc.)<textarea name="notes" maxLength={1000} defaultValue={initial?.notes ?? ""} /></label>
      <div className="reg-actions">
        <button className="btn go" type="submit" disabled={busy}>{busy ? "Saving..." : submitLabel}</button>
        {onCancel && <button className="btn out" type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
};

const SchoolPortal = () => {
  const { toast } = useSite();
  const { school, api, signOut } = useSchoolAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<"none" | "add" | "bulk" | "password">("none");
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [bulkLevel, setBulkLevel] = useState("primary");

  const load = useCallback(async () => {
    try {
      setStudents((await api<{ students: Student[] }>("/students")).students);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not load your students.");
    } finally {
      setLoading(false);
    }
  }, [api, toast]);

  useEffect(() => { if (school) load(); }, [school, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? students.filter((s) => [s.name, s.grade, s.guardianName, s.guardianPhone].some((f) => f?.toLowerCase().includes(q))) : students;
  }, [students, search]);

  if (!school) return <Navigate to="/school/login" replace />;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e) { toast(e instanceof Error ? e.message : "Something went wrong. Please try again."); } finally { setBusy(false); }
  };

  const add = (body: Record<string, unknown>) => run(async () => {
    const { student } = await api<{ student: Student }>("/students", { body });
    setStudents((s) => [student, ...s]);
    setPanel("none");
    toast(`${student.name} added.`);
  });

  const save = (id: string) => (body: Record<string, unknown>) => run(async () => {
    const { student } = await api<{ student: Student }>(`/students/${id}`, { method: "PATCH", body });
    setStudents((s) => s.map((x) => (x.id === id ? student : x)));
    setEditing(null);
    toast("Student updated.");
  });

  const remove = (s: Student) => {
    if (!confirm(`Remove ${s.name} from your school's registration?`)) return;
    run(async () => {
      await api(`/students/${s.id}`, { method: "DELETE" });
      setStudents((x) => x.filter((y) => y.id !== s.id));
      toast(`${s.name} removed.`);
    });
  };

  const bulkAdd = () => run(async () => {
    const list = parseBulk(bulkText, bulkLevel);
    if (!list.length) return toast("Paste at least one student first.");
    const { students: created } = await api<{ students: Student[] }>("/students/bulk", { body: { students: list } });
    setStudents((s) => [...created, ...s]);
    setBulkText("");
    setPanel("none");
    toast(`${created.length} students added.`);
  });

  const changePassword = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const val = (n: string) => (f.elements.namedItem(n) as HTMLInputElement).value;
    if (val("newPassword") !== val("confirm")) return toast("The two passwords do not match.");
    run(async () => {
      await api("/change-password", { body: { currentPassword: val("currentPassword"), newPassword: val("newPassword") } });
      toast("Password changed. Please sign in again.");
      signOut();
    });
  };

  const exportCsv = () => {
    const head = ["name", "age", "grade", "level", "guardianName", "guardianPhone", "guardianEmail", "notes"] as const;
    const csv = [head.join(","), ...students.map((s) => head.map((h) => csvCell(s[h])).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${school.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-students.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggle = (p: typeof panel) => { setEditing(null); setPanel((cur) => (cur === p ? "none" : p)); };

  return (
    <>
      <PageHead title={school.name} sub="School portal: add and manage your students for Ocean Shujaa." img={IMG.a3} />
      <section className="sec">
        <div className="wrap portal">
          <div className="portal-top">
            <div className="portal-card">
              <span className="mono">Registration status</span>
              <h3><span className={`pill pill-${school.status}`}>{school.status}</span></h3>
              <p>{STATUS_TEXT[school.status]}</p>
            </div>
            <div className="portal-card">
              <span className="mono">Students</span>
              <h3>{students.length}</h3>
              <p>{school.adminName} · {school.adminEmail}</p>
            </div>
          </div>

          <div className="portal-bar">
            <button className="btn go" type="button" onClick={() => toggle("add")}>Add student</button>
            <button className="btn out" type="button" onClick={() => toggle("bulk")}>Add many</button>
            <button className="btn out" type="button" onClick={exportCsv} disabled={!students.length}>Download list</button>
            <button className="btn out" type="button" onClick={() => toggle("password")}>Change password</button>
            <button className="btn out" type="button" onClick={signOut}>Sign out</button>
          </div>

          {panel === "add" && (
            <div className="portal-panel"><h3>Add a student</h3><StudentForm busy={busy} submitLabel="Add student" onSubmit={add} onCancel={() => setPanel("none")} /></div>
          )}

          {panel === "bulk" && (
            <div className="portal-panel">
              <h3>Add many students</h3>
              <p className="reg-note">One student per line, in this order: <code>{BULK_HEADER}</code>. Only the name is required. You can paste straight from a spreadsheet.</p>
              <div className="reg-form">
                <label>Default level (when a row has none)
                  <select value={bulkLevel} onChange={(e) => setBulkLevel(e.target.value)}>
                    {STUDENT_LEVELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </label>
                <label>Students<textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder={"Amina Hassan, 12, Grade 6, primary, Fatma Hassan, 0712345678"} /></label>
                <div className="reg-actions">
                  <button className="btn go" type="button" disabled={busy || !bulkText.trim()} onClick={bulkAdd}>{busy ? "Adding..." : "Add students"}</button>
                  <button className="btn out" type="button" onClick={() => setPanel("none")}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {panel === "password" && (
            <div className="portal-panel">
              <h3>Change password</h3>
              <form className="reg-form" onSubmit={changePassword}>
                <label>Current password<input type="password" name="currentPassword" required autoComplete="current-password" /></label>
                <div className="two">
                  <label>New password (8+ characters)<input type="password" name="newPassword" required minLength={8} maxLength={128} autoComplete="new-password" /></label>
                  <label>Confirm new password<input type="password" name="confirm" required minLength={8} maxLength={128} autoComplete="new-password" /></label>
                </div>
                <div className="reg-actions"><button className="btn go" type="submit" disabled={busy}>Change password</button></div>
              </form>
            </div>
          )}

          <div className="portal-list">
            <div className="portal-search">
              <input type="text" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search students" />
            </div>
            {loading && <p className="portal-empty">Loading...</p>}
            {!loading && !filtered.length && (
              <p className="portal-empty">{students.length ? "No students match your search." : "No students yet. Use “Add student” or “Add many” to get started."}</p>
            )}
            {filtered.map((s) => (
              <div className="student" key={s.id}>
                {editing === s.id ? (
                  <StudentForm initial={s} busy={busy} submitLabel="Save changes" onSubmit={save(s.id)} onCancel={() => setEditing(null)} />
                ) : (
                  <>
                    <div className="student-main">
                      <strong>{s.name}</strong>
                      <span>{[levelLabel(s.level), s.grade, s.age != null && `${s.age} yrs`].filter(Boolean).join(" · ")}</span>
                      {(s.guardianName || s.guardianPhone) && <span>Guardian: {[s.guardianName, s.guardianPhone].filter(Boolean).join(" · ")}</span>}
                      {s.notes && <span>Note: {s.notes}</span>}
                    </div>
                    <div className="student-actions">
                      <button className="btn out" type="button" onClick={() => { setPanel("none"); setEditing(s.id); }}>Edit</button>
                      <button className="btn out" type="button" onClick={() => remove(s)} disabled={busy}>Remove</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <p className="reg-alt">Need help? <Link to="/contact">Contact the SIM-Lab team</Link> or call 0702 129 911.</p>
        </div>
      </section>
    </>
  );
};

export default SchoolPortal;
