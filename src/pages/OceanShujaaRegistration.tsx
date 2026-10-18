import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHead } from "@/site/ui";
import RegisterForm from "@/site/RegisterForm";
import SchoolRegisterForm from "@/site/SchoolRegisterForm";
import { IMG } from "@/site/data";

const TYPES = [
  { id: "individual", label: "Individual", sub: "Register one learner." },
  { id: "group", label: "Group", sub: "A club or class registering together." },
  { id: "school", label: "School", sub: "Register your school, then add and manage your students from your own portal." },
] as const;
type Type = (typeof TYPES)[number]["id"];

const OceanShujaaRegistration = () => {
  const [params] = useSearchParams();
  const initial = TYPES.find((t) => t.id === params.get("type"))?.id ?? "individual";
  const [type, setType] = useState<Type>(initial);
  const current = TYPES.find((t) => t.id === type)!;

  return (
    <>
      <PageHead title="Register for Ocean Shujaa" sub="Choose how you are registering and we will contact you to confirm your place." img={IMG.a3} />
      <section className="sec">
        <div className="wrap reg-page">
          <div className="tabs reg-tabs" role="group" aria-label="Registration type">
            {TYPES.map((t) => (
              <button key={t.id} type="button" className="tab" aria-pressed={type === t.id} onClick={() => setType(t.id)}>{t.label}</button>
            ))}
          </div>
          <p className="reg-sub">{current.sub}</p>
          {type === "school" ? <SchoolRegisterForm /> : <RegisterForm key={type} mode={type} />}
        </div>
      </section>
    </>
  );
};

export default OceanShujaaRegistration;
