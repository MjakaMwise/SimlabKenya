import { FormEvent, useState } from "react";
import { useSite } from "@/site/SiteContext";

const LEVELS: [string, string][] = [
  ["primary", "Primary school"], ["junior_secondary", "Junior secondary"], ["senior_secondary", "Senior secondary"],
  ["college", "College"], ["group", "Science club / school group"], ["other", "Other"],
];

type Mode = "individual" | "group";

const RegisterForm = ({ mode = "individual" }: { mode?: Mode }) => {
  const group = mode === "group";
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
          participantAge: group ? null : v("participantAge") || null,
          level: v("level"),
          institution: v("institution"),
          guardianName: v("guardianName"),
          guardianPhone: v("guardianPhone"),
          guardianEmail: v("guardianEmail"),
          groupSize: group ? v("groupSize") : 1,
          registrationType: mode,
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
      toast(err instanceof Error ? err.message : "Could not send your registration. Please try again or call 0702 129 911.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="reg-ok" role="status">
        <h3>Registration received</h3>
        <p>Thank you. The SIM-Lab team will contact you shortly to confirm {group ? "your group's places" : "your place"} in Ocean Shujaa.</p>
      </div>
    );
  }

  return (
    <form className="reg-form" onSubmit={submit}>
      <div className="two">
        {group ? (
          <>
            <label htmlFor="r-name">Group / club name<input type="text" id="r-name" name="participantName" required minLength={2} maxLength={120} /></label>
            <label htmlFor="r-size">Number of participants<input type="number" id="r-size" name="groupSize" min={2} max={500} defaultValue={5} required /></label>
          </>
        ) : (
          <>
            <label htmlFor="r-name">Participant name<input type="text" id="r-name" name="participantName" required minLength={2} maxLength={120} autoComplete="name" /></label>
            <label htmlFor="r-age">Age<input type="number" id="r-age" name="participantAge" min={3} max={99} /></label>
          </>
        )}
      </div>
      <div className="two">
        <label htmlFor="r-level">Level
          <select id="r-level" name="level" required defaultValue="">
            <option value="" disabled>Select level</option>
            {LEVELS.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
        </label>
        <label htmlFor="r-inst">{group ? "School / organisation" : "School / institution"}<input type="text" id="r-inst" name="institution" required minLength={2} maxLength={160} /></label>
      </div>
      <div className="two">
        <label htmlFor="r-gname">{group ? "Group leader / teacher name" : "Parent / guardian name"}<input type="text" id="r-gname" name="guardianName" required minLength={2} maxLength={120} /></label>
        <label htmlFor="r-gphone">Phone<input type="tel" id="r-gphone" name="guardianPhone" required minLength={7} maxLength={25} autoComplete="tel" /></label>
      </div>
      <div className="two">
        <label htmlFor="r-gemail">Email<input type="email" id="r-gemail" name="guardianEmail" required maxLength={160} autoComplete="email" /></label>
      </div>
      <label htmlFor="r-notes">Anything we should know? (optional)<textarea id="r-notes" name="notes" maxLength={2000} /></label>
      <div className="hp" aria-hidden="true"><label>Leave empty<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div><button className="btn go xl" type="submit" disabled={busy}>{busy ? "Sending..." : group ? "Register our group" : "Register for Ocean Shujaa"}</button></div>
    </form>
  );
};

export default RegisterForm;
