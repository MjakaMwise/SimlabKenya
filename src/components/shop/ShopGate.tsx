import { Link } from "react-router-dom";
import { PageHead, Go } from "@/site/ui";
import { useShopEnabled } from "@/hooks/useShopEnabled";

/** Renders its children only while the shop is switched on in the admin area. */
const ShopGate = ({ children }: { children: React.ReactNode }) => {
  const enabled = useShopEnabled();
  if (enabled) return <>{children}</>;
  return (
    <>
      <PageHead title="SIM-Lab Shop" sub="Educational games, merchandise and science resources." />
      <section className="sec">
        <div className="wrap shop-state">
          {enabled === null ? (
            <p>Loading...</p>
          ) : (
            <>
              <h2 className="h2" style={{ margin: 0 }}>The shop is closed</h2>
              <p>We are not taking orders right now. Please check back soon.</p>
              <Go to="/" cls="go">Back to home</Go>
            </>
          )}
        </div>
      </section>
    </>
  );
};

export default ShopGate;
