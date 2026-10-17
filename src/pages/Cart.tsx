import { Link } from "react-router-dom";
import { PageHead, Go } from "@/site/ui";
import { useCart } from "@/hooks/useCart";

const Cart = () => {
  const { items, removeItem, updateQuantity, getTotal } = useCart();

  return (
    <>
      <PageHead title="Shopping Cart" sub="Review your items before checking out." />
      <section className="sec">
        <div className="wrap">
          <div className="crumbs"><Link to="/">Home</Link>/<Link to="/shop">Shop</Link>/<span>Cart</span></div>
          {items.length === 0 ? (
            <div className="shop-state">
              <h2 className="h2" style={{ margin: 0 }}>Your cart is empty</h2>
              <p>Looks like you haven't added any items yet.</p>
              <Go to="/shop" cls="go">Browse products</Go>
            </div>
          ) : (
            <div className="cart-grid">
              <div>
                {items.map((item) => (
                  <div className="citem" key={`${item.id}-${item.size || "default"}`}>
                    <img src={item.image_url} alt={item.name} />
                    <div>
                      <div className="top">
                        <div>
                          <h3>{item.name}</h3>
                          {item.size && <p className="hint">Size: {item.size}</p>}
                        </div>
                        <b style={{ fontFamily: "var(--display)" }}>KES {(item.price * item.quantity).toLocaleString()}</b>
                      </div>
                      <div className="bot">
                        <div className="qty">
                          <button type="button" aria-label="Decrease quantity" onClick={() => updateQuantity(item.id, item.quantity - 1, item.size)}>−</button>
                          <span>{item.quantity}</span>
                          <button type="button" aria-label="Increase quantity" onClick={() => updateQuantity(item.id, item.quantity + 1, item.size)}>+</button>
                        </div>
                        <button type="button" className="linkbtn" onClick={() => removeItem(item.id, item.size)}>Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
                <Go to="/shop" cls="out">Continue shopping</Go>
              </div>
              <aside className="sum">
                <h2>Order Summary</h2>
                <div className="ln"><span>Subtotal</span><span>KES {getTotal().toLocaleString()}</span></div>
                <div className="ln"><span>Delivery</span><span>Confirmed after contact</span></div>
                <div className="ln tot"><span>Total</span><span>KES {getTotal().toLocaleString()}</span></div>
                <Go to="/checkout" cls="go xl" arrow>Checkout</Go>
              </aside>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default Cart;
