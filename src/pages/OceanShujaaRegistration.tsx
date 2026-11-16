import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "@/site/site.css";
import { useSchoolAuth } from "@/hooks/useSchoolAuth";
import { IMG } from "@/site/data";

type Kind = "individual" | "group" | "school";

interface Option { value: string; label: string; hint?: string }
interface Step {
  id: string;
  title: string;
  hint?: string;
  type: "text" | "email" | "tel" | "number" | "password" | "textarea" | "choice";
  options?: Option[];
  optional?: boolean;
  min?: number;
  max?: number;
  defaultValue?: string;
  autoComplete?: string;
  /** Returns an error message, or null when the answer is fine. */
  check?: (v: string, all: Record<string, string>) => string | null;
}

const LEVELS: Option[] = [
  { value: "primary", label: "Primary school" },
  { value: "junior_secondary", label: "Junior secondary" },
  { value: "senior_secondary", label: "Senior secondary" },
  { value: "college", label: "College" },
  { value: "group", label: "Science club / school group" },
  { value: "other", label: "Other" },
];
const SCHOOL_TYPES: Option[] = [
  { value: "primary", label: "Primary school" },
  { value: "junior_secondary", label: "Junior secondary" },
  { value: "senior_secondary", label: "Senior secondary" },
  { value: "mixed", label: "Primary and secondary" },
  { value: "college", label: "College" },
  { value: "other", label: "Other" },
];

const KINDS: { id: Kind; label: string; hint: string }[] = [
  { id: "individual", label: "Individual", hint: "Register one learner." },
  { id: "group", label: "Group", hint: "A club or class registering together." },
  { id: "school", label: "School", hint: "Register your school, then add and manage students from your own portal." },
];

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const phoneOk = (v: string) => /^[0-9+\-()\s]{7,25}$/.test(v);
const email = (id: string, title: string, hint?: string): Step => ({
  id, title, hint, type: "email", autoComplete: "email", check: (v) => (emailOk(v) ? null : "Enter a valid email address."),
});
const phone = (id: string, title: string, hint?: string): Step => ({
  id, title, hint, type: "tel", autoComplete: "tel", check: (v) => (phoneOk(v) ? null : "Enter a valid phone number."),
});
const text = (id: string, title: string, hint?: string, autoComplete?: string): Step => ({
  id, title, hint, type: "text", autoComplete, min: 2, max: 160,
});
const notes: Step = { id: "notes", title: "Anything we should know?", hint: "Allergies, accessibility needs or questions. You can skip this.", type: "textarea", optional: true, max: 2000 };

const FLOWS: Record<Kind, Step[]> = {
  individual: [
    text("name", "What is the participant's name?", undefined, "name"),
    { id: "age", title: "How old are they?", type: "number", optional: true, min: 3, max: 99 },
    { id: "level", title: "Which level are they at?", type: "choice", options: LEVELS },
    text("institution", "Which school or institution?"),
    text("guardian", "Parent or guardian's name?", undefined, "name"),
    phone("phone", "Their phone number?", "We will use this to confirm the place."),
    email("email", "Their email address?", "Confirmation and payment details are sent here."),
    notes,
  ],
  group: [
    text("name", "What is the group or club called?"),
    { id: "size", title: "How many participants?", type: "number", min: 2, max: 500, defaultValue: "5" },
    { id: "level", title: "Which level are they at?", type: "choice", options: LEVELS },
    text("institution", "Which school or organisation?"),
    text("guardian", "Group leader or teacher's name?", undefined, "name"),
    phone("phone", "Their phone number?", "We will use this to confirm your places."),
    email("email", "Their email address?", "Confirmation and payment details are sent here."),
    notes,
  ],
  school: [
    text("schoolName", "What is your school called?", undefined, "organization"),
    { id: "schoolType", title: "What type of school is it?", type: "choice", options: SCHOOL_TYPES },
    text("county", "Which county is it in?"),
    text("adminName", "Your name, as school administrator?", "You will manage the school's students from your portal.", "name"),
    email("adminEmail", "Your email address?", "You will use this to sign in to your school portal."),
    phone("adminPhone", "Your phone number?"),
    { id: "password", title: "Choose a password", hint: "At least 8 characters.", type: "password", autoComplete: "new-password", check: (v) => (v.length >= 8 ? null : "Use at least 8 characters.") },
    { id: "confirm", title: "Confirm your password", type: "password", autoComplete: "new-password", check: (v, all) => (v === all.password ? null : "The two passwords do not match.") },
  ],
};

const validate = (s: Step, raw: string, all: Record<string, string>): string | null => {
  const v = s.type === "password" ? raw : raw.trim();
  if (!v) return s.optional ? null : s.type === "choice" ? "Choose one to continue." : "This one is needed to continue.";
  if (s.type === "number") {
    const n = Number(v);
    if (!Number.isInteger(n) || (s.min != null && n < s.min) || (s.max != null && n > s.max)) return `Enter a whole number from ${s.min} to ${s.max}.`;
  } else if (s.type !== "choice" && s.min != null && v.length < s.min) return `Use at least ${s.min} characters.`;
  return s.check?.(v, all) ?? null;
};

const OceanShujaaRegistration = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { register } = useSchoolAuth();
  const preset = KINDS.find((k) => k.id === params.get("type"))?.id ?? null;
  const [kind, setKind] = useState<Kind | null>(preset);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [hp, setHp] = useState("");
  const field = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  const steps = kind ? FLOWS[kind] : [];
  const step: Step | undefined = steps[i];
  // step -1 is the "who are you registering" question
  const pos = kind ? i + 1 : 0;
  const total = steps.length + 1 || 4;
  const value = step ? answers[step.id] ?? step.defaultValue ?? "" : "";
  const last = !!kind && i === steps.length - 1;
  const stepKey = kind ? `${kind}-${i}` : "kind";

  useEffect(() => { field.current?.focus({ preventScroll: true }); }, [stepKey]);
  useEffect(() => { window.scrollTo(0, 0); }, [stepKey, done]);

  const progress = done ? 100 : (pos / total) * 100;
  const set = (v: string) => { setError(null); setAnswers((a) => ({ ...a, [step!.id]: v })); };

  // Straight to the program page; history is empty when the form was opened from a shared link.
  const leave = () => { if (window.history.state?.idx > 0) navigate(-1); else navigate("/oceanshujaa"); };

  const back = () => {
    setError(null);
    if (i > 0) setI(i - 1);
    else if (kind && !preset) setKind(null);
    else leave();
  };

  const submit = async (all: Record<string, string>) => {
    setBusy(true);
    setError(null);
    try {
      if (kind === "school") {
        await register({
          schoolName: all.schoolName.trim(), schoolType: all.schoolType, county: all.county.trim(),
          adminName: all.adminName.trim(), adminEmail: all.adminEmail.trim(), adminPhone: all.adminPhone.trim(),
          password: all.password, website: hp,
        });
        navigate("/school/portal");
        return;
      }
      const group = kind === "group";
      const res = await fetch("/api/ocean-shujaa/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantName: all.name.trim(),
          participantAge: group ? null : all.age?.trim() || null,
          level: all.level,
          institution: all.institution.trim(),
          guardianName: all.guardian.trim(),
          guardianPhone: all.phone.trim(),
          guardianEmail: all.email.trim(),
          groupSize: group ? all.size ?? "5" : 1,
          registrationType: kind,
          notes: all.notes?.trim() || null,
          website: hp,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(res.status === 429 ? data.error : "Please check your answers and try again.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your registration. Please try again or call 0702 129 911.");
    } finally {
      setBusy(false);
    }
  };

  const next = (override?: string) => {
    if (!step) return;
    const v = override ?? value;
    const msg = validate(step, v, answers);
    if (msg) return setError(msg);
    const all = { ...answers, [step.id]: v };
    setAnswers(all);
    setError(null);
    if (last) submit(all); else setI(i + 1);
  };

  const onSubmit = (e: FormEvent) => { e.preventDefault(); next(); };

  const summary = useMemo(() => (kind ? KINDS.find((k) => k.id === kind)!.label : ""), [kind]);

  return (
    <div className="sl rw">
      <div className="rw-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <header className="rw-top">
        {!done ? (
          <button type="button" className="rw-link" onClick={back} aria-label="Go back">← Back</button>
        ) : <span />}
        <Link to="/" className="rw-brand"><img src={IMG.logo} alt="" /><b>SIM-Lab</b></Link>
        <button type="button" className="rw-link" onClick={leave} aria-label="Close registration">✕</button>
      </header>

      <main className="rw-main">
        {done ? (
          <div className="rw-step" role="status">
            <p className="rw-eyebrow">Ocean Shujaa</p>
            <h1>Registration received</h1>
            <p className="rw-hint">Thank you. The SIM-Lab team will contact you shortly to confirm {kind === "group" ? "your group's places" : "your place"}.</p>
            <Link className="btn go xl" to="/">Back to home</Link>
          </div>
        ) : !kind ? (
          <div className="rw-step" key="kind">
            <p className="rw-eyebrow">Ocean Shujaa · Step 1 of {total}</p>
            <h1>Who are you registering?</h1>
            <div className="rw-choices">
              {KINDS.map((k) => (
                <button key={k.id} type="button" className="rw-choice" onClick={() => { setKind(k.id); setI(0); }}>
                  <b>{k.label}</b><span>{k.hint}</span>
                </button>
              ))}
            </div>
            <p className="rw-alt">Already registered your school? <Link to="/school/login">Sign in to your school portal</Link></p>
          </div>
        ) : (
          <form className="rw-step" key={stepKey} onSubmit={onSubmit} noValidate>
            <p className="rw-eyebrow">{summary} · Step {pos + 1} of {total}</p>
            <h1>{step!.title}</h1>
            {step!.hint && <p className="rw-hint">{step!.hint}</p>}

            {step!.type === "choice" ? (
              <div className="rw-choices" role="radiogroup" aria-label={step!.title}>
                {step!.options!.map((o) => (
                  <button
                    key={o.value} type="button" role="radio" aria-checked={value === o.value}
                    className={`rw-choice ${value === o.value ? "on" : ""}`}
                    onClick={() => { set(o.value); next(o.value); }}
                  >
                    <b>{o.label}</b>
                  </button>
                ))}
              </div>
            ) : step!.type === "textarea" ? (
              <textarea ref={field} className="rw-input" value={value} maxLength={step!.max} onChange={(e) => set(e.target.value)} aria-label={step!.title} />
            ) : (
              <input
                ref={field} className="rw-input" type={step!.type} value={value} onChange={(e) => set(e.target.value)}
                maxLength={step!.max && step!.type !== "number" ? step!.max : undefined}
                min={step!.type === "number" ? step!.min : undefined} max={step!.type === "number" ? step!.max : undefined}
                autoComplete={step!.autoComplete} aria-label={step!.title} aria-invalid={!!error} inputMode={step!.type === "number" ? "numeric" : undefined}
              />
            )}

            {error && <p className="rw-error" role="alert">{error}</p>}

            {/* spam trap: real people never see or fill this */}
            <div className="hp" aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none" }}><label>Leave empty<input type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} /></label></div>

            <div className="rw-actions">
              {step!.type === "choice" && !last ? <span /> : (
                <button className="btn go xl" type="submit" disabled={busy}>
                  {busy ? "Sending..." : last ? (kind === "school" ? "Register school" : "Submit registration") : !value && step!.optional ? "Skip" : "Continue"}
                </button>
              )}
              {step!.type !== "textarea" && !(step!.type === "choice") && <span className="rw-key">press <kbd>Enter ↵</kbd></span>}
            </div>
          </form>
        )}
      </main>
    </div>
  );
};

export default OceanShujaaRegistration;
