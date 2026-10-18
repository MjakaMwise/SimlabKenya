import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { PageHead } from "@/site/ui";
import { useSite } from "@/site/SiteContext";
import { useSchoolAuth } from "@/hooks/useSchoolAuth";
import { IMG } from "@/site/data";

const SchoolLogin = () => {
  const { toast } = useSite();
  const { school, signIn } = useSchoolAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (school) return <Navigate to="/school/portal" replace />;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    setBusy(true);
    try {
      await signIn((f.elements.namedItem("email") as HTMLInputElement).value.trim(), (f.elements.namedItem("password") as HTMLInputElement).value);
      navigate("/school/portal");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead title="School portal" sub="Sign in to add and manage your students." img={IMG.a3} />
      <section className="sec">
        <div className="wrap reg-page">
          <form className="reg-form" onSubmit={submit}>
            <label htmlFor="l-email">Email<input type="email" id="l-email" name="email" required maxLength={160} autoComplete="email" /></label>
            <label htmlFor="l-pass">Password<input type="password" id="l-pass" name="password" required maxLength={128} autoComplete="current-password" /></label>
            <div className="reg-actions">
              <button className="btn go xl" type="submit" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
              <span className="reg-alt">New here? <Link to="/oceanshujaaregistration?type=school">Register your school</Link></span>
            </div>
          </form>
        </div>
      </section>
    </>
  );
};

export default SchoolLogin;
