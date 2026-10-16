import { FormEvent, useState } from "react";
import { useSite } from "@/site/SiteContext";

const LEVELS: [string, string][] = [
  ["primary", "Primary school"], ["junior_secondary", "Junior secondary"], ["senior_secondary", "Senior secondary"],
  ["college", "College"], ["group", "Science club / school group"], ["other", "Other"],
];

const RegisterForm = () => {
  const { toast } = useSite();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const v = (n: string) => (f.elements.namedItem(n) as HTMLInputElement).value.trim();
    setBusy(true);
    try {
      const res = await fetch("/api/ocean-shujaa/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantName: v("participantName"),
          participantAge: v("participantAge") || null,
          level: v("level"),
          institution: v("institution"),
          guardianName: v("guardianName"),
          guardianPhone: v("guardianPhone"),
          guardianEmail: v("guardianEmail"),
          groupSize: v("groupSize") || 1,
          notes: v("notes") || null,
          website: v("website"),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(res.status === 429 ? data.error : "Please check the form and try again.");
      }
      setDone(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not send your registration. Try WhatsApp instead.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="reg-ok" role="status">
        <h3>Registration received</h3>
        <p>Thank you. The SIM-Lab team will contact you shortly to confirm your place in Ocean Shujaa.</p>
      </div>
    );
  }

  return (
    <form className="reg-form" onSubmit={submit}>
      <div className="two">
        <label htmlFor="r-name">Participant name<input type="text" id="r-name" name="participantName" required minLength={2} maxLength={120} autoComplete="name" /></label>
        <label htmlFor="r-age">Age<input type="number" id="r-age" name="participantAge" min={3} max={99} /></label>
      </div>
      <div className="two">
        <label htmlFor="r-level">Level
          <select id="r-level" name="level" required defaultValue="">
            <option value="" disabled>Select level</option>
            {LEVELS.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
        </label>
        <label htmlFor="r-inst">School / institution<input type="text" id="r-inst" name="institution" required minLength={2} maxLength={160} /></label>
      </div>
      <div className="two">
        <label htmlFor="r-gname">Parent / guardian name<input type="text" id="r-gname" name="guardianName" required minLength={2} maxLength={120} /></label>
        <label htmlFor="r-gphone">Phone<input type="tel" id="r-gphone" name="guardianPhone" required minLength={7} maxLength={25} autoComplete="tel" /></label>
      </div>
      <div className="two">
        <label htmlFor="r-gemail">Email<input type="email" id="r-gemail" name="guardianEmail" required maxLength={160} autoComplete="email" /></label>
        <label htmlFor="r-size">Number of participants<input type="number" id="r-size" name="groupSize" min={1} max={500} defaultValue={1} /></label>
      </div>
      <label htmlFor="r-notes">Anything we should know? (optional)<textarea id="r-notes" name="notes" maxLength={2000} /></label>
      <div className="hp" aria-hidden="true"><label>Leave empty<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div><button className="btn go xl" type="submit" disabled={busy}>{busy ? "Sending..." : "Register for Ocean Shujaa"}</button></div>
    </form>
  );
};

export default RegisterForm;
