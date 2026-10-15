import { FormEvent } from "react";
import { Icon } from "@/site/Icon";
import { PageHead, WaBtn, CallBtn } from "@/site/ui";
import { useSite } from "@/site/SiteContext";
import { EMAIL, PHONE, TEL, WEB } from "@/site/data";

const INFO: [string, string, string][] = [["mail", "#5dade2", "Email"], ["phone", "#22a06b", "Phone"], ["pin", "#d9568f", "Location"], ["clock", "#f08a24", "Working Hours"]];

const Contact = () => {
  const { toast } = useSite();

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    for (const el of f.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[required]")) {
      const bad = !el.value.trim() || (el.type === "email" && !/^\S+@\S+\.\S+$/.test(el.value));
      if (bad) {
        el.focus();
        toast(el.type === "email" ? "Enter a valid email address." : "Fill in the " + (el.closest("label")?.firstChild?.textContent || "required").toLowerCase() + " field.");
        return;
      }
    }
    // There is no contact-form backend yet, so hand the message to the visitor's email app
    // rather than pretending it was sent.
    const v = (n: string) => (f.elements.namedItem(n) as HTMLInputElement).value.trim();
    const body = `${v("message")}\n\n${v("name")}\n${v("email")}${v("phone") ? "\n" + v("phone") : ""}`;
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(v("subject"))}&body=${encodeURIComponent(body)}`;
    f.reset();
    toast("Opening your email app. If nothing opens, message us on WhatsApp.");
  };

  return (
    <>
      <PageHead title="Contact Us" sub="Ready to start your innovation journey? Get in touch!" />
      <section className="sec">
        <div className="wrap cols">
          <div>
            <h2 className="h2" style={{ fontSize: "1.8rem", marginBottom: 22 }}>Send Us a Message</h2>
            <form onSubmit={submit} noValidate>
              <div className="two">
                <label htmlFor="f-name">Full Name<input type="text" id="f-name" name="name" required autoComplete="name" /></label>
                <label htmlFor="f-email">Email<input type="email" id="f-email" name="email" required autoComplete="email" /></label>
              </div>
              <div className="two">
                <label htmlFor="f-phone">Phone<input type="tel" id="f-phone" name="phone" autoComplete="tel" /></label>
                <label htmlFor="f-subject">Subject<input type="text" id="f-subject" name="subject" required /></label>
              </div>
              <label htmlFor="f-msg">Message<textarea id="f-msg" name="message" required /></label>
              <div><button className="btn go xl" type="submit">Send Message</button></div>
              <p className="note">Sending opens your email app with the message ready to go. For a faster reply, use WhatsApp.</p>
            </form>
          </div>
          <div>
            <h2 className="h2" style={{ fontSize: "1.8rem", marginBottom: 22 }}>Contact Information</h2>
            {INFO.map(([ic, c, h]) => (
              <div className="crow" key={h}>
                <div className="ico" style={{ "--c": c } as React.CSSProperties}><Icon name={ic} /></div>
                <div>
                  <h3>{h}</h3>
                  {h === "Email" && <a href={`mailto:${EMAIL}`}>{EMAIL}</a>}
                  {h === "Phone" && (<><a href={TEL}>{PHONE}</a><a href={WEB} target="_blank" rel="noopener noreferrer">simlabkenya.co.ke</a></>)}
                  {h === "Location" && <p>IOME001 Innovation Hub, Mombasa, Kenya</p>}
                  {h === "Working Hours" && (<><p>Monday to Friday: 8:00 AM to 5:00 PM</p><p>Saturday: 9:00 AM to 1:00 PM</p></>)}
                </div>
              </div>
            ))}
            <div className="card" style={{ background: "var(--panel2)", border: 0 }}>
              <h3 style={{ color: "var(--head)", marginBottom: 12 }}>Quick Contact</h3>
              <div className="row"><WaBtn label="WhatsApp" /><CallBtn label="Call Us" /></div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Contact;
