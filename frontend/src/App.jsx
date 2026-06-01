import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Edit3,
  PackagePlus,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Users,
  X,
  Package,
  Mail,
  Phone,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { api } from "./api/client";

const emptyProduct = { name: "", sku: "", price: "", quantity_in_stock: "" };
const emptyCustomer = { full_name: "", email: "", phone: "" };

const navItems = [
  { id: "products", label: "Products", icon: Boxes },
  { id: "customers", label: "Customers", icon: Users },
  { id: "orders", label: "Orders", icon: ClipboardList },
];

function money(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value || 0));
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value) {
  return /^\+?[1-9]\d{9,14}$/.test(value.replace(/[\s-]/g, ""));
}

function getStockLevel(qty) {
  if (qty <= 5) return "critical";
  if (qty <= 20) return "low";
  return "good";
}

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/* ==============================
   SMALL REUSABLE COMPONENTS
   ============================== */

function Message({ message, type, onClose }) {
  if (!message) return null;
  const Icon = type === "error" ? AlertCircle : CheckCircle2;
  return (
    <div className={`toast ${type}`} role="status">
      <Icon size={18} />
      <span>{message}</span>
      <button className="toast-close" onClick={onClose} title="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function PanelTitle({ icon: Icon, title }) {
  return (
    <div className="panel-title">
      <Icon size={20} />
      <h2>{title}</h2>
    </div>
  );
}

/* ==============================
   MAIN APP
   ============================== */

function App() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [activeTab, setActiveTab] = useState("products");
  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingProductId, setEditingProductId] = useState(null);
  const [customerForm, setCustomerForm] = useState(emptyCustomer);
  const [orderForm, setOrderForm] = useState({ customer_id: "", items: [{ product_id: "", quantity: 1 }] });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [message, setMessage] = useState(null);

  const lowStockCount = dashboard?.low_stock_products?.length ?? 0;
  const isInitialLoading = loading && !hasLoaded;
  const isBusy = loading || Boolean(actionLoading);

  /* --- Data fetching --- */
  async function loadData() {
    setLoading(true);
    try {
      const nextData = await api.getBootstrap();
      setProducts(nextData.products);
      setCustomers(nextData.customers);
      setOrders(nextData.orders);
      setDashboard(nextData.dashboard);
      setHasLoaded(true);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  /* Auto-dismiss messages after 5 seconds */
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  const orderPreviewTotal = useMemo(() => {
    return orderForm.items.reduce((total, item) => {
      const product = products.find((candidate) => candidate.id === Number(item.product_id));
      return total + Number(product?.price || 0) * Number(item.quantity || 0);
    }, 0);
  }, [orderForm.items, products]);

  function showSuccess(text) {
    setMessage({ type: "success", text });
  }

  function showError(error) {
    setMessage({ type: "error", text: error.message });
  }

  /* --- Product handlers --- */
  async function handleProductSubmit(event) {
    event.preventDefault();
    setActionLoading(editingProductId ? "Updating product" : "Creating product");
    try {
      const payload = {
        ...productForm,
        price: Number(productForm.price),
        quantity_in_stock: Number(productForm.quantity_in_stock),
      };
      if (editingProductId) {
        await api.updateProduct(editingProductId, payload);
        showSuccess("Product updated");
      } else {
        await api.createProduct(payload);
        showSuccess("Product created");
      }
      setProductForm(emptyProduct);
      setEditingProductId(null);
      await loadData();
    } catch (error) {
      showError(error);
    } finally {
      setActionLoading(null);
    }
  }

  function startProductEdit(product) {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      sku: product.sku,
      price: product.price,
      quantity_in_stock: product.quantity_in_stock,
    });
  }

  /* --- Customer handlers --- */
  async function handleCustomerSubmit(event) {
    event.preventDefault();
    if (!isValidEmail(customerForm.email)) {
      setMessage({ type: "error", text: "Please enter a valid email address." });
      return;
    }
    if (!isValidPhone(customerForm.phone)) {
      setMessage({ type: "error", text: "Phone number must be 10 to 15 digits and may start with +." });
      return;
    }
    setActionLoading("Creating customer");
    try {
      await api.createCustomer(customerForm);
      setCustomerForm(emptyCustomer);
      showSuccess("Customer created");
      await loadData();
    } catch (error) {
      showError(error);
    } finally {
      setActionLoading(null);
    }
  }

  /* --- Order handlers --- */
  async function handleOrderSubmit(event) {
    event.preventDefault();
    setActionLoading("Creating order");
    try {
      await api.createOrder({
        customer_id: Number(orderForm.customer_id),
        items: orderForm.items.map((item) => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
        })),
      });
      setOrderForm({ customer_id: "", items: [{ product_id: "", quantity: 1 }] });
      showSuccess("Order created and stock updated");
      await loadData();
    } catch (error) {
      showError(error);
    } finally {
      setActionLoading(null);
    }
  }

  /* --- Generic delete --- */
  async function removeRecord(action, successText) {
    const label = successText.replace("deleted", "deleting");
    setActionLoading(label.charAt(0).toUpperCase() + label.slice(1));
    try {
      await action();
      showSuccess(successText);
      await loadData();
    } catch (error) {
      showError(error);
    } finally {
      setActionLoading(null);
    }
  }

  function updateOrderItem(index, key, value) {
    const items = orderForm.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item));
    setOrderForm({ ...orderForm, items });
  }

  /* ==============================
     RENDER
     ============================== */
  return (
    <div className="layout">
      {isInitialLoading && <LoadingScreen />}
      {actionLoading && <ActionOverlay label={actionLoading} />}

      {/* ---- SIDEBAR ---- */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Package size={22} />
          </div>
          <div>
            <h1>StockFlow</h1>
            <p>Inventory Manager</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              {item.id === "products" && lowStockCount > 0 && (
                <span className="nav-badge">{lowStockCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="refresh-btn" onClick={loadData} disabled={isBusy}>
            <RefreshCw className={loading ? "spin" : ""} size={16} />
            <span>{loading ? "Syncing…" : "Refresh Data"}</span>
          </button>
        </div>
      </aside>

      {/* ---- MAIN CONTENT ---- */}
      <main className="main-content">
        <header className="page-header">
          <p className="greeting">Dashboard</p>
          <h2>Inventory & Order Management</h2>
        </header>

        <Message message={message?.text} type={message?.type} onClose={() => setMessage(null)} />

        {/* Stats Grid */}
        <section className="stats-grid" aria-label="Dashboard summary">
          <StatCard icon={Boxes} label="Products" value={dashboard?.total_products ?? products.length} gradient="purple" />
          <StatCard icon={Users} label="Customers" value={dashboard?.total_customers ?? customers.length} gradient="blue" />
          <StatCard icon={ClipboardList} label="Orders" value={dashboard?.total_orders ?? orders.length} gradient="emerald" />
          <StatCard icon={AlertCircle} label="Low Stock" value={lowStockCount} gradient="amber" tone="warning" />
        </section>

        {/* Tab Content */}
        <div className="content-section" key={activeTab}>
          {activeTab === "products" && (
            <section className="workspace two-column">
              <form className="panel" onSubmit={handleProductSubmit}>
                <PanelTitle icon={PackagePlus} title={editingProductId ? "Update Product" : "Add Product"} />
                <Field label="Product Name">
                  <input required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="Enter product name" />
                </Field>
                <Field label="SKU / Code">
                  <input required value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} placeholder="e.g. SKU-001" />
                </Field>
                <div className="form-grid">
                  <Field label="Price (₹)">
                    <input required type="number" min="0.01" step="0.01" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} placeholder="0.00" />
                  </Field>
                  <Field label="Stock Qty">
                    <input required type="number" min="0" value={productForm.quantity_in_stock} onChange={(e) => setProductForm({ ...productForm, quantity_in_stock: e.target.value })} placeholder="0" />
                  </Field>
                </div>
                <div className="actions">
                  <button className="primary" type="submit" disabled={isBusy}>
                    <Save className={actionLoading?.toLowerCase().includes("product") ? "spin-soft" : ""} size={18} />
                    <span>{editingProductId ? "Save Changes" : "Create Product"}</span>
                  </button>
                  {editingProductId && (
                    <button type="button" disabled={isBusy} onClick={() => { setEditingProductId(null); setProductForm(emptyProduct); }}>
                      <X size={18} />
                      <span>Cancel</span>
                    </button>
                  )}
                </div>
              </form>
              <ProductList products={products} onEdit={startProductEdit} onDelete={(id) => removeRecord(() => api.deleteProduct(id), "Product deleted")} />
            </section>
          )}

          {activeTab === "customers" && (
            <section className="workspace two-column">
              <form className="panel" onSubmit={handleCustomerSubmit}>
                <PanelTitle icon={Users} title="Add Customer" />
                <Field label="Full Name">
                  <input required value={customerForm.full_name} onChange={(e) => setCustomerForm({ ...customerForm, full_name: e.target.value })} placeholder="John Doe" />
                </Field>
                <Field label="Email Address">
                  <input required type="email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} placeholder="john@example.com" />
                </Field>
                <Field label="Phone Number">
                  <input required inputMode="tel" pattern="^\\+?[1-9][0-9\\s-]{9,18}$" title="Use 10 to 15 digits. Country code may start with +." value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} placeholder="+91 9876543210" />
                </Field>
                <button className="primary" type="submit" disabled={isBusy}>
                  <Plus className={actionLoading?.toLowerCase().includes("customer") ? "spin-soft" : ""} size={18} />
                  <span>Create Customer</span>
                </button>
              </form>
              <CustomerList customers={customers} onDelete={(id) => removeRecord(() => api.deleteCustomer(id), "Customer deleted")} />
            </section>
          )}

          {activeTab === "orders" && (
            <section className="workspace two-column">
              <form className="panel" onSubmit={handleOrderSubmit}>
                <PanelTitle icon={ClipboardList} title="Create Order" />
                <Field label="Customer">
                  <select required value={orderForm.customer_id} onChange={(e) => setOrderForm({ ...orderForm, customer_id: e.target.value })}>
                    <option value="">Select customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>{customer.full_name}</option>
                    ))}
                  </select>
                </Field>
                {orderForm.items.map((item, index) => (
                  <div className="order-line" key={index}>
                    <Field label="Product">
                      <select required value={item.product_id} onChange={(e) => updateOrderItem(index, "product_id", e.target.value)}>
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>{product.name} ({product.quantity_in_stock} left)</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Qty">
                      <input required type="number" min="1" value={item.quantity} onChange={(e) => updateOrderItem(index, "quantity", e.target.value)} />
                    </Field>
                  </div>
                ))}
                <div className="actions split">
                  <button type="button" disabled={isBusy} onClick={() => setOrderForm({ ...orderForm, items: [...orderForm.items, { product_id: "", quantity: 1 }] })}>
                    <Plus size={18} />
                    <span>Add Line</span>
                  </button>
                  <strong>{money(orderPreviewTotal)}</strong>
                </div>
                <button className="primary" type="submit" disabled={isBusy}>
                  <Save className={actionLoading?.toLowerCase().includes("order") ? "spin-soft" : ""} size={18} />
                  <span>Place Order</span>
                </button>
              </form>
              <OrderList orders={orders} onDelete={(id) => removeRecord(() => api.deleteOrder(id), "Order deleted")} />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

/* ==============================
   LOADING & OVERLAY COMPONENTS
   ============================== */

function LoadingScreen() {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-brand">
        <div className="loading-logo">
          <Package size={32} />
        </div>
        <h2>StockFlow</h2>
        <p>Preparing your workspace…</p>
        <div className="loading-bar" />
      </div>
    </div>
  );
}

function ActionOverlay({ label }) {
  return (
    <div className="action-overlay" role="status" aria-live="polite">
      <div className="action-spinner" />
      <strong>{label}…</strong>
    </div>
  );
}

/* ==============================
   STAT CARD
   ============================== */

function StatCard({ icon: Icon, label, value, gradient, tone }) {
  return (
    <article className={`stat-card ${tone ?? ""}`}>
      <div className={`stat-icon ${gradient}`}>
        <Icon size={22} />
      </div>
      <div className="stat-info">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

/* ==============================
   DATA LIST COMPONENTS
   ============================== */

function ProductList({ products, onEdit, onDelete }) {
  return (
    <section className="panel list-panel">
      <PanelTitle icon={Boxes} title="Products" />
      <div className="data-table">
        {products.map((product) => {
          const level = getStockLevel(product.quantity_in_stock);
          return (
            <div className="data-row" key={product.id}>
              <div className="row-primary">
                <strong>{product.name}</strong>
                <span>{product.sku}</span>
              </div>
              <span className="row-price">{money(product.price)}</span>
              <span className={`stock-badge ${level}`}>
                {product.quantity_in_stock} in stock
              </span>
              <div className="row-actions">
                <button className="action-btn" title="Edit product" onClick={() => onEdit(product)}><Edit3 size={16} /></button>
                <button className="action-btn danger" title="Delete product" onClick={() => onDelete(product.id)}><Trash2 size={16} /></button>
              </div>
            </div>
          );
        })}
        {!products.length && (
          <div className="empty-state">
            <div className="empty-icon"><Boxes size={24} /></div>
            <p>No products yet</p>
            <span className="empty-hint">Create your first product using the form</span>
          </div>
        )}
      </div>
    </section>
  );
}

function CustomerList({ customers, onDelete }) {
  return (
    <section className="panel list-panel">
      <PanelTitle icon={Users} title="Customers" />
      <div className="data-table">
        {customers.map((customer) => (
          <div className="customer-row" key={customer.id}>
            <div className="avatar">{getInitials(customer.full_name)}</div>
            <div className="customer-info">
              <strong>{customer.full_name}</strong>
              <span>{customer.email}</span>
            </div>
            <span className="customer-phone">{customer.phone}</span>
            <div className="row-actions">
              <button className="action-btn danger" title="Delete customer" onClick={() => onDelete(customer.id)}><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
        {!customers.length && (
          <div className="empty-state">
            <div className="empty-icon"><Users size={24} /></div>
            <p>No customers yet</p>
            <span className="empty-hint">Add your first customer using the form</span>
          </div>
        )}
      </div>
    </section>
  );
}

function OrderList({ orders, onDelete }) {
  return (
    <section className="panel list-panel">
      <PanelTitle icon={ClipboardList} title="Orders" />
      <div className="order-list">
        {orders.map((order) => (
          <article className="order-card" key={order.id}>
            <div className="order-header">
              <div>
                <strong>Order #{order.id}</strong>
                <span>{order.customer?.full_name}</span>
              </div>
              <div className="order-total-area">
                <span className="order-status">Completed</span>
                <span className="order-amount">{money(order.total_amount)}</span>
                <button className="action-btn danger" title="Delete order" onClick={() => onDelete(order.id)}><Trash2 size={16} /></button>
              </div>
            </div>
            {order.items.map((item) => (
              <div className="order-item" key={item.id}>
                <span>{item.product?.name}</span>
                <span>{item.quantity} × {money(item.unit_price)}</span>
              </div>
            ))}
          </article>
        ))}
        {!orders.length && (
          <div className="empty-state">
            <div className="empty-icon"><ClipboardList size={24} /></div>
            <p>No orders yet</p>
            <span className="empty-hint">Place your first order using the form</span>
          </div>
        )}
      </div>
    </section>
  );
}

export default App;
