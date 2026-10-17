import { useEffect, useState } from "react";
import { PageHead } from "@/site/ui";
import ProductCard, { Product } from "@/components/shop/ProductCard";

const Shop = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setProducts(d || []))
      .catch((e) => console.error("Error fetching products:", e))
      .finally(() => setLoading(false));
  }, []);

  const categories = [...new Set(products.map((p) => p.category))];

  return (
    <>
      <PageHead title="SIM-Lab Shop" sub="Educational games, merchandise and science resources." />
      <section className="sec">
        <div className="wrap">
          {loading ? (
            <div className="shop-state"><p>Loading products...</p></div>
          ) : categories.length === 0 ? (
            <div className="shop-state"><p>No products are available right now. Please check back soon.</p></div>
          ) : (
            categories.map((c) => (
              <div key={c}>
                <h2 className="shop-cat">{c}</h2>
                <div className="shop-grid">
                  {products.filter((p) => p.category === c).map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
};

export default Shop;
