import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSite } from "@/site/SiteContext";
import { useSchoolAuth } from "@/hooks/useSchoolAuth";

const SCHOOL_TYPES: [string, string][] = [
  ["primary", "Primary school"], ["junior_secondary", "Junior secondary"], ["senior_secondary", "Senior secondary"],
  ["mixed", "Primary and secondary"], ["college", "College"], ["other", "Other"],
];

const SchoolRegisterForm = () => {
  const { toast } = useSite();
  const { register } = useSchoolAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const v = (n: string) => (f.elements.namedItem(n) as HTMLInputElement).value.trim();
    if (v("password") !== (f.elements.namedItem("confirm") as HTMLInputElement).value) {
      return toast("The two passwords do not match.");
    }
    setBusy(true);
    try {
      await register({
        schoolName: v("schoolName"),
        schoolType: v("schoolType"),
        county: v("county"),
        adminName: v("adminName"),
        adminEmail: v("adminEmail"),
        adminPhone: v("adminPhone"),
        password: (f.elements.namedItem("password") as HTMLInputElement).value,
        website: v("website"),
      });
      navigate("/school/portal");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not register your school. Please try again or call 0702 129 911.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="reg-form" onSubmit={submit}>
      <p className="reg-note">Register your school once as the school administrator. You will get a portal where you can add and manage your students.</p>
      <div className="two">
        <label htmlFor="s-name">School name<input type="text" id="s-name" name="schoolName" required minLength={2} maxLength={160} autoComplete="organization" /></label>
        <label htmlFor="s-type">School type
          <select id="s-type" name="schoolType" required defaultValue="">
            <option value="" disabled>Select type</option>
            {SCHOOL_TYPES.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
        </label>
      </div>
      <div className="two">
        <label htmlFor="s-county">County<input type="text" id="s-county" name="county" required minLength={2} maxLength={80} /></label>
        <label htmlFor="s-admin">School administrator name<input type="text" id="s-admin" name="adminName" required minLength={2} maxLength={120} autoComplete="name" /></label>
      </div>
      <div className="two">
        <label htmlFor="s-email">Email (used to sign in)<input type="email" id="s-email" name="adminEmail" required maxLength={160} autoComplete="email" /></label>
        <label htmlFor="s-phone">Phone<input type="tel" id="s-phone" name="adminPhone" required minLength={7} maxLength={25} autoComplete="tel" /></label>
      </div>
      <div className="two">
        <label htmlFor="s-pass">Password (8+ characters)<input type="password" id="s-pass" name="password" required minLength={8} maxLength={128} autoComplete="new-password" /></label>
        <label htmlFor="s-pass2">Confirm password<input type="password" id="s-pass2" name="confirm" required minLength={8} maxLength={128} autoComplete="new-password" /></label>
      </div>
      <div className="hp" aria-hidden="true"><label>Leave empty<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div className="reg-actions">
        <button className="btn go xl" type="submit" disabled={busy}>{busy ? "Registering..." : "Register school"}</button>
        <span className="reg-alt">Already registered? <Link to="/school/login">Sign in to your school portal</Link></span>
      </div>
    </form>
  );
};

export default SchoolRegisterForm;
