import { useSearchParams } from "react-router-dom";
import { PageHead, Go, WaBtn, CallBtn } from "@/site/ui";
import { EMAIL } from "@/site/data";

const STEPS = [
  "We'll contact you within 24 hours to confirm your order.",
  "We'll verify product availability and confirm the final price.",
  "We'll arrange payment and delivery or pickup details.",
];

const OrderConfirmation = () => {
  const [params] = useSearchParams();
  const orderNumber = params.get("order") || "N/A";

  return (
    <>
      <PageHead title="Order Placed" sub="Thank you! We've received your request." />
      <section className="sec">
        <div className="wrap" style={{ maxWidth: 720, textAlign: "center" }}>
          <div className="ordno">Order number<b>{orderNumber}</b></div>
          <p className="lede" style={{ margin: "0 auto 32px" }}>
            We'll contact you within 24 hours to confirm availability and arrange payment.
          </p>
          <div className="sec-card" style={{ textAlign: "left", marginBottom: 28 }}>
            <h2>What happens next?</h2>
            <ol className="steps">
              {STEPS.map((t, i) => <li key={t}><i>{i + 1}</i><p>{t}</p></li>)}
            </ol>
          </div>
          <div className="card" style={{ background: "var(--panel2)", border: 0, marginBottom: 28 }}>
            <h3 style={{ color: "var(--head)", marginBottom: 12 }}>Need help?</h3>
            <div className="row" style={{ justifyContent: "center" }}>
              <WaBtn label="WhatsApp" />
              <CallBtn label="Call us" />
              <a className="btn out" href={`mailto:${EMAIL}`}>Email us</a>
            </div>
          </div>
          <div className="row" style={{ justifyContent: "center" }}>
            <Go to="/shop" cls="go" arrow>Continue shopping</Go>
            <Go to="/" cls="out">Back to home</Go>
          </div>
        </div>
      </section>
    </>
  );
};

export default OrderConfirmation;
