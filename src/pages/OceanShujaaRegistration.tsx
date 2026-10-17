import { PageHead } from "@/site/ui";
import RegisterForm from "@/site/RegisterForm";
import { IMG } from "@/site/data";

const OceanShujaaRegistration = () => (
  <>
    <PageHead title="Register for Ocean Shujaa" sub="Fill in the form and we will contact you to confirm your place." img={IMG.a3} />
    <section className="sec">
      <div className="wrap reg-page">
        <RegisterForm />
      </div>
    </section>
  </>
);

export default OceanShujaaRegistration;
