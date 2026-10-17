import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import "./site.css";
import { Icon } from "./Icon";
import { RegisterBtn } from "./ui";
import { MAIN_NAV, ABOUT_SUB, MORE_NAV, IMG, EMAIL, PHONE, TEL, WEB, SOCIAL, wa } from "./data";
import { SiteContext } from "./SiteContext";
import { ProgramPopup, PopReq } from "./ProgramPopup";
import LoadingScreen from "./LoadingScreen";
import { useShopEnabled } from "@/hooks/useShopEnabled";
import { useCart } from "@/hooks/useCart";

const HOME_TITLE = "SIM-Lab Kenya | Science in Motion - STEM Education & Innovation Lab";

/** Smooth blends between neighbouring sections: every boundary fades through the midpoint colour. */
function addFades(main: HTMLElement, foot: HTMLElement | null) {
  const added: HTMLElement[] = [];
  const tok = (el: Element | undefined) =>
    !el ? "var(--paper)" : el.matches("footer,.hero,.ph,.cta,.hexsec,.os-hero") ? "var(--deep)" : el.classList.contains("alt") ? "var(--panel2)" : "var(--paper)";
  const secs = [...main.children].filter((e) => e.tagName === "SECTION") as HTMLElement[];
  const all: HTMLElement[] = foot ? secs.concat([foot]) : secs;
  const add = (el: HTMLElement, cls: string, prop: string, val: string, first: boolean) => {
    const d = document.createElement("div");
    d.className = cls;
    d.setAttribute("aria-hidden", "true");
    d.style.setProperty(prop, val);
    if (first) el.prepend(d); else el.append(d);
    added.push(d);
  };
  for (let i = 0; i < all.length - 1; i++) {
    const U = all[i], L = all[i + 1], tu = tok(U), tl = tok(L);
    if (U.matches(".hero,.ph,.os-hero")) { add(U, "fadeout", "--to", tl, false); continue; }
    if (tu === tl) continue;
    const mid = `color-mix(in srgb,${tu} 50%,${tl})`;
    add(U, "fadeout2", "--to", mid, false);
    add(L, "fadein", "--from", mid, true);
  }
  return () => added.forEach((d) => d.remove());
}

export default function SiteLayout() {
  const { pathname, hash } = useLocation();
  const shopEnabled = useShopEnabled();
  const cartCount = useCart().getItemCount();
  // every page, for the title, the side menu and the footer
  const nav = useMemo<[string, string][]>(() => [
    ...MAIN_NAV, ...ABOUT_SUB, ...MORE_NAV,
    ...(shopEnabled ? ([["/shop", "Shop"], ["/cart", "Cart"]] as [string, string][]) : []),
  ], [shopEnabled]);
  const [theme, setTheme] = useState<string | undefined>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pop, setPop] = useState<PopReq | null>(null);
  // loading animation: first visit to the home page in a session
  const [loading, setLoading] = useState(() => {
    if (pathname !== "/") return false;
    try { return !sessionStorage.getItem("simlab-loaded"); } catch { return true; }
  });
  const finishLoading = useCallback(() => {
    try { sessionStorage.setItem("simlab-loaded", "true"); } catch { /* storage unavailable */ }
    setLoading(false);
  }, []);
  const [toastMsg, setToastMsg] = useState("");
  const [toastOn, setToastOn] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const popId = useRef(0);

  const toast = useCallback((m: string) => {
    setToastMsg(m);
    setToastOn(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastOn(false), 3400);
  }, []);
  const openPop = useCallback((i: number, btn: HTMLElement | null, full: boolean) => {
    setPop({ i, btn, full, id: ++popId.current });
  }, []);
  const ctx = useMemo(() => ({ openPop, toast }), [openPop, toast]);

  // page title
  useEffect(() => {
    const item = nav.find((n) => n[0] === pathname);
    document.title = pathname === "/" || !item ? HOME_TITLE : `${item[1]} | SIM-Lab Kenya`;
  }, [pathname, nav]);

  // scroll to a section (#prog3, #ph ...) or to the top on navigation; close menu and pop-up
  useEffect(() => {
    setMenuOpen(false);
    setPop(null);
    const target = hash && document.getElementById("w-" + hash.slice(1));
    if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
  }, [pathname, hash]);

  useEffect(() => {
    if (!menuOpen) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [menuOpen]);

  // fades between sections
  useLayoutEffect(() => {
    const main = document.querySelector(".sl main") as HTMLElement | null;
    if (!main) return;
    return addFades(main, document.querySelector(".sl footer"));
  }, [pathname]);

  const toggleTheme = () => {
    const dk = matchMedia("(prefers-color-scheme:dark)").matches;
    const cur = theme || (dk ? "dark" : "light");
    setTheme(cur === "dark" ? "light" : "dark");
  };

  return (
    <SiteContext.Provider value={ctx}>
      {/* outside .sl so the loader keeps its own (Tailwind) styling */}
      <AnimatePresence>{loading && <LoadingScreen onComplete={finishLoading} />}</AnimatePresence>
      <div className="sl" data-theme={theme}>
        <header>
          <div className="wrap">
            <nav className="nav" aria-label="Main">
              <Link className="brand" to="/">
                <img src={IMG.logo} alt="SIM-Lab Kenya logo" />
                <span><b>SIM-Lab</b><small>SCIENCE IN MOTION</small></span>
              </Link>
              <div className="links">
                {MAIN_NAV.map(([k, l]) => {
                  const isAbout = k === "/about";
                  const active = k === pathname || (isAbout && ABOUT_SUB.some(([p]) => p === pathname));
                  return (
                    <div key={k} className={isAbout ? "has-sub" : undefined}>
                      <Link to={k} className={`${k === "/oceanshujaa" ? "hhl " : ""}${active ? "on" : ""}`}>
                        {l}
                        {k === "/oceanshujaa" && <span className="new">NEW</span>}
                      </Link>
                      {isAbout && (
                        <div className="sub" role="menu">
                          {ABOUT_SUB.map(([sk, sl]) => <Link key={sk} to={sk} role="menuitem" className={sk === pathname ? "on" : ""}>{sl}</Link>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="tools">
                {shopEnabled && <Link to="/shop" className={`shoplink ${pathname === "/shop" ? "on" : ""}`}>Shop</Link>}
                {shopEnabled && (
                  <Link className="ib cartlink" to="/cart" aria-label={`Cart, ${cartCount} items`}>
                    <Icon name="cart" />
                    {cartCount > 0 && <span className="n">{cartCount}</span>}
                  </Link>
                )}
                <button className="ib" id="burger" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen} aria-controls="sidenav"><Icon name="menu" /></button>
              </div>
            </nav>
          </div>
        </header>

        <div id="sidebg" className={menuOpen ? "open" : ""} onClick={() => setMenuOpen(false)} />
        <aside id="sidenav" className={menuOpen ? "open" : ""} aria-label="Site menu" aria-hidden={!menuOpen} {...(!menuOpen && { inert: "" as unknown as boolean })}>
          <div className="sn-top">
            <b>Menu</b>
            <button className="ib" onClick={() => setMenuOpen(false)} aria-label="Close menu"><Icon name="x" /></button>
          </div>
          <div className="sn-links">
            {MAIN_NAV.map(([k, l]) => (
              <span key={k} style={{ display: "contents" }}>
                <Link to={k} className={k === pathname ? "on" : ""}>
                  {l}
                  {k === "/oceanshujaa" && <span className="new">NEW</span>}
                </Link>
                {k === "/about" && ABOUT_SUB.map(([sk, sl]) => <Link key={sk} to={sk} className={`subl ${sk === pathname ? "on" : ""}`}>{sl}</Link>)}
              </span>
            ))}
            {MORE_NAV.map(([k, l]) => <Link key={k} to={k} className={k === pathname ? "on" : ""}>{l}</Link>)}
            {shopEnabled && (
              <>
                <Link to="/shop" className={pathname === "/shop" ? "on" : ""}>Shop</Link>
                <Link to="/cart" className={pathname === "/cart" ? "on" : ""}>Cart{cartCount > 0 ? ` (${cartCount})` : ""}</Link>
              </>
            )}
          </div>
          <div className="sn-foot">
            <RegisterBtn label="Register for Ocean Shujaa" />
            <button className="btn out" onClick={toggleTheme}><Icon name="moon" />Toggle dark mode</button>
          </div>
        </aside>

        <main><Outlet /></main>

        <footer>
          <div className="wrap">
            <div className="fg">
              <div className="fc">
                <div className="fl">
                  <img src={IMG.logo} alt="" />
                  <div>
                    <b style={{ fontFamily: "var(--display)", fontSize: "1.5rem" }}>SIM-Lab Kenya</b>
                    <div style={{ color: "var(--sea)" }}>Science in Motion</div>
                  </div>
                </div>
                <p style={{ color: "rgba(255,255,255,.82)", marginBottom: 18, maxWidth: "46ch" }}>
                  Transforming classroom concepts into practical skills, driving creativity, innovation, and sustainable development within communities.
                </p>
                <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
                <a href={TEL}>{PHONE}</a>
                <a href={WEB} target="_blank" rel="noopener noreferrer">simlabkenya.co.ke</a>
                <span style={{ color: "rgba(255,255,255,.82)" }}>IOME001 Innovation Hub, Mombasa, Kenya</span>
              </div>
              <div>
                <h4>Quick Links</h4>
                {nav.filter(([k]) => k !== "/" && k !== "/cart").map(([k, l]) => <Link key={k} to={k}>{l === "About" ? "About Us" : l}</Link>)}
              </div>
              <div>
                <h4>Connect With Us</h4>
                <a className="btn wa" href={wa()} target="_blank" rel="noopener noreferrer" style={{ color: "#fff" }}>
                  <Icon name="chat" />Chat on WhatsApp
                </a>
                <div className="soc">
                  {SOCIAL.map((s) => (
                    <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}><Icon name={s.icon} /></a>
                  ))}
                </div>
              </div>
            </div>
            <div className="copy">&copy; {new Date().getFullYear()} SIM-Lab Kenya &middot; Science in Motion (K) Ltd &middot; Connecting science to the community.</div>
          </div>
        </footer>

        {pop && <ProgramPopup key={pop.id} req={pop} onClosed={() => setPop(null)} />}
        <div id="toast" role="status" className={toastOn ? "show" : ""}>{toastMsg}</div>
      </div>
    </SiteContext.Provider>
  );
}
