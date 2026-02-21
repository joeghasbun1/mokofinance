import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "moko-finance-entries";

const CATEGORIES = {
  income: ["GCM Course", "The Vault", "DFY Services", "Retainer", "Sponsorship", "Other Income"],
  expense: ["Software/Tools", "Ads", "Content Creation", "Education", "Travel", "Team/Freelancers", "Other Expense"],
  investment: ["Equipment", "Course Development", "Marketing", "SaaS Development", "Other Investment"],
};

const CURRENCY_SYMBOL = "€";

function formatMoney(amount) {
  return `${CURRENCY_SYMBOL}${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistEntries(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error("Save failed:", e);
  }
}

export default function MokoDashboard() {
  const [entries, setEntries] = useState(() => loadEntries());
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [formData, setFormData] = useState({
    type: "income",
    category: CATEGORIES.income[0],
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const saveEntries = useCallback((newEntries) => {
    setEntries(newEntries);
    persistEntries(newEntries);
  }, []);

  const handleSubmit = () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) return;
    const entry = {
      id: editingId || Date.now().toString(),
      type: formData.type,
      category: formData.category,
      amount: parseFloat(formData.amount),
      description: formData.description,
      date: formData.date,
    };
    let updated;
    if (editingId) {
      updated = entries.map((e) => (e.id === editingId ? entry : e));
    } else {
      updated = [entry, ...entries];
    }
    saveEntries(updated);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ type: "income", category: CATEGORIES.income[0], amount: "", description: "", date: new Date().toISOString().split("T")[0] });
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (entry) => {
    setFormData({ type: entry.type, category: entry.category, amount: entry.amount.toString(), description: entry.description, date: entry.date });
    setEditingId(entry.id);
    setShowForm(true);
  };

  const deleteEntry = (id) => {
    saveEntries(entries.filter((e) => e.id !== id));
    setConfirmDelete(null);
  };

  // Filter
  const filtered = entries.filter((e) => {
    const typeMatch = filterType === "all" || e.type === filterType;
    const monthMatch = filterMonth === "all" || new Date(e.date).getMonth().toString() === filterMonth;
    return typeMatch && monthMatch;
  });

  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Stats
  const totalIncome = entries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const totalExpenses = entries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  const totalInvestments = entries.filter((e) => e.type === "investment").reduce((s, e) => s + e.amount, 0);
  const netProfit = totalIncome - totalExpenses;
  const totalOut = totalExpenses + totalInvestments;
  const roi = totalOut > 0 ? ((totalIncome - totalOut) / totalOut) * 100 : 0;

  // Monthly chart data
  const monthlyData = {};
  entries.forEach((e) => {
    const m = new Date(e.date).getMonth();
    if (!monthlyData[m]) monthlyData[m] = { income: 0, expense: 0, investment: 0 };
    monthlyData[m][e.type] += e.amount;
  });

  const activeMonths = Object.keys(monthlyData).sort((a, b) => a - b);
  const maxMonthly = Math.max(...activeMonths.map((m) => Math.max(monthlyData[m].income, monthlyData[m].expense + monthlyData[m].investment, 1)));

  const typeColors = { income: "#22c55e", expense: "#ef4444", investment: "#f59e0b" };
  const typeLabels = { income: "Income", expense: "Expense", investment: "Investment" };
  const typeBg = { income: "rgba(34,197,94,0.1)", expense: "rgba(239,68,68,0.1)", investment: "rgba(245,158,11,0.1)" };
  const typeBorder = { income: "rgba(34,197,94,0.25)", expense: "rgba(239,68,68,0.25)", investment: "rgba(245,158,11,0.25)" };

  return (
    <div style={styles.root}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.brand}>
            <div style={styles.logoMark}>M</div>
            <span style={styles.brandName}>MOKO</span>
            <span style={styles.brandSub}>Finance</span>
          </div>
          <p style={styles.headerSub}>Revenue & Investment Dashboard</p>
        </div>
        <button style={styles.addBtn} onClick={() => { resetForm(); setShowForm(true); }} onMouseEnter={(e) => { e.target.style.background = "#fff"; e.target.style.color = "#0a0a0a"; }} onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.color = "#fff"; }}>
          + Add Entry
        </button>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        {[
          { label: "Total Income", value: formatMoney(totalIncome), color: "#22c55e", icon: "↑" },
          { label: "Total Expenses", value: formatMoney(totalExpenses), color: "#ef4444", icon: "↓" },
          { label: "Investments", value: formatMoney(totalInvestments), color: "#f59e0b", icon: "◆" },
          { label: "Net Profit", value: `${netProfit >= 0 ? "" : "-"}${formatMoney(netProfit)}`, color: netProfit >= 0 ? "#22c55e" : "#ef4444", icon: "≡" },
          { label: "ROI", value: `${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%`, color: roi >= 0 ? "#22c55e" : "#ef4444", icon: "%" },
        ].map((card, i) => (
          <div key={i} style={{ ...styles.statCard, borderTop: `2px solid ${card.color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={styles.statLabel}>{card.label}</span>
              <span style={{ ...styles.statIcon, color: card.color }}>{card.icon}</span>
            </div>
            <p style={{ ...styles.statValue, color: card.color }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Monthly Chart */}
      {activeMonths.length > 0 && (
        <div style={styles.chartSection}>
          <h3 style={styles.sectionTitle}>Monthly Overview</h3>
          <div style={styles.chartWrap}>
            {activeMonths.map((m) => {
              const d = monthlyData[m];
              const incH = (d.income / maxMonthly) * 140;
              const expH = (d.expense / maxMonthly) * 140;
              const invH = (d.investment / maxMonthly) * 140;
              return (
                <div key={m} style={styles.chartCol}>
                  <div style={styles.barsWrap}>
                    <div style={{ ...styles.bar, height: incH, background: "linear-gradient(to top, #16a34a, #22c55e)", opacity: 0.9 }} title={`Income: ${formatMoney(d.income)}`} />
                    <div style={{ ...styles.bar, height: expH, background: "linear-gradient(to top, #dc2626, #ef4444)", opacity: 0.9 }} title={`Expenses: ${formatMoney(d.expense)}`} />
                    <div style={{ ...styles.bar, height: invH, background: "linear-gradient(to top, #d97706, #f59e0b)", opacity: 0.9 }} title={`Investments: ${formatMoney(d.investment)}`} />
                  </div>
                  <span style={styles.chartLabel}>{MONTHS[m]}</span>
                </div>
              );
            })}
          </div>
          <div style={styles.legend}>
            {["income", "expense", "investment"].map((t) => (
              <div key={t} style={styles.legendItem}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: typeColors[t] }} />
                <span>{typeLabels[t]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters + Transactions */}
      <div style={styles.txSection}>
        <div style={styles.txHeader}>
          <h3 style={styles.sectionTitle}>Transactions</h3>
          <div style={styles.filters}>
            <select style={styles.select} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expenses</option>
              <option value="investment">Investments</option>
            </select>
            <select style={styles.select} value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
              <option value="all">All Months</option>
              {MONTHS.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div style={styles.empty}>
            <p style={{ color: "#666", fontSize: 15 }}>No transactions yet. Click <strong>+ Add Entry</strong> to get started.</p>
          </div>
        ) : (
          <div style={styles.txList}>
            {sorted.map((entry) => (
              <div key={entry.id} style={{ ...styles.txRow, borderLeft: `3px solid ${typeColors[entry.type]}` }}>
                <div style={styles.txLeft}>
                  <div style={{ ...styles.txBadge, background: typeBg[entry.type], color: typeColors[entry.type], border: `1px solid ${typeBorder[entry.type]}` }}>
                    {typeLabels[entry.type]}
                  </div>
                  <div>
                    <p style={styles.txCat}>{entry.category}</p>
                    {entry.description && <p style={styles.txDesc}>{entry.description}</p>}
                    <p style={styles.txDate}>{formatDate(entry.date)}</p>
                  </div>
                </div>
                <div style={styles.txRight}>
                  <p style={{ ...styles.txAmount, color: typeColors[entry.type] }}>
                    {entry.type === "income" ? "+" : "-"}{formatMoney(entry.amount)}
                  </p>
                  <div style={styles.txActions}>
                    <button style={styles.actionBtn} onClick={() => startEdit(entry)} title="Edit">✎</button>
                    {confirmDelete === entry.id ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button style={{ ...styles.actionBtn, color: "#ef4444" }} onClick={() => deleteEntry(entry.id)}>✓</button>
                        <button style={styles.actionBtn} onClick={() => setConfirmDelete(null)}>✕</button>
                      </div>
                    ) : (
                      <button style={styles.actionBtn} onClick={() => setConfirmDelete(entry.id)} title="Delete">🗑</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      {entries.length > 0 && (
        <div style={styles.breakdownSection}>
          <h3 style={styles.sectionTitle}>Category Breakdown</h3>
          <div style={styles.breakdownGrid}>
            {["income", "expense", "investment"].map((type) => {
              const typeEntries = entries.filter((e) => e.type === type);
              const catTotals = {};
              typeEntries.forEach((e) => {
                catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
              });
              const total = typeEntries.reduce((s, e) => s + e.amount, 0);
              const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
              if (sortedCats.length === 0) return null;
              return (
                <div key={type} style={{ ...styles.breakdownCard, borderTop: `2px solid ${typeColors[type]}` }}>
                  <h4 style={{ ...styles.breakdownTitle, color: typeColors[type] }}>{typeLabels[type]}</h4>
                  {sortedCats.map(([cat, amt]) => {
                    const pct = total > 0 ? (amt / total) * 100 : 0;
                    return (
                      <div key={cat} style={styles.breakdownRow}>
                        <div style={styles.breakdownInfo}>
                          <span style={styles.breakdownCat}>{cat}</span>
                          <span style={styles.breakdownAmt}>{formatMoney(amt)}</span>
                        </div>
                        <div style={styles.progressBg}>
                          <div style={{ ...styles.progressFill, width: `${pct}%`, background: typeColors[type] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reset */}
      {entries.length > 0 && (
        <div style={{ textAlign: "center", padding: "24px 0 40px" }}>
          <button style={styles.resetBtn} onClick={() => {
            if (confirm("Clear all data? This cannot be undone.")) {
              localStorage.removeItem(STORAGE_KEY);
              setEntries([]);
            }
          }}>
            Reset All Data
          </button>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{editingId ? "Edit Entry" : "New Entry"}</h3>
              <button style={styles.closeBtn} onClick={resetForm}>✕</button>
            </div>

            <div style={styles.typeSelector}>
              {["income", "expense", "investment"].map((t) => (
                <button
                  key={t}
                  style={{
                    ...styles.typeBtn,
                    background: formData.type === t ? typeColors[t] : "transparent",
                    color: formData.type === t ? "#000" : "#999",
                    border: `1px solid ${formData.type === t ? typeColors[t] : "#333"}`,
                  }}
                  onClick={() => setFormData({ ...formData, type: t, category: CATEGORIES[t][0] })}
                >
                  {typeLabels[t]}
                </button>
              ))}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Category</label>
              <select style={styles.input} value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                {CATEGORIES[formData.type].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Amount ({CURRENCY_SYMBOL})</label>
              <input style={styles.input} type="number" min="0" step="0.01" placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Description (optional)</label>
              <input style={styles.input} type="text" placeholder="e.g. February GCM sales" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Date</label>
              <input style={styles.input} type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>

            <button
              style={{ ...styles.submitBtn, background: typeColors[formData.type] }}
              onClick={handleSubmit}
              onMouseEnter={(e) => { e.target.style.opacity = "0.85"; }}
              onMouseLeave={(e) => { e.target.style.opacity = "1"; }}
            >
              {editingId ? "Update Entry" : "Add Entry"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#0a0a0a",
    color: "#e5e5e5",
    fontFamily: "'DM Sans', sans-serif",
    padding: "24px 20px",
    maxWidth: 960,
    margin: "0 auto",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16 },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  logoMark: { width: 36, height: 36, background: "linear-gradient(135deg, #22c55e, #16a34a)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 18, color: "#000" },
  brandName: { fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 22, letterSpacing: 4, color: "#fff" },
  brandSub: { fontSize: 13, color: "#666", fontWeight: 400, letterSpacing: 2, textTransform: "uppercase" },
  headerSub: { fontSize: 13, color: "#555", marginTop: 6, letterSpacing: 0.5 },
  addBtn: { padding: "10px 22px", background: "transparent", color: "#fff", border: "1px solid #444", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s", letterSpacing: 0.5 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 32 },
  statCard: { background: "#111", borderRadius: 10, padding: "16px 18px" },
  statLabel: { fontSize: 12, color: "#777", textTransform: "uppercase", letterSpacing: 1, fontWeight: 500 },
  statIcon: { fontSize: 16 },
  statValue: { fontSize: 24, fontWeight: 700, marginTop: 8, fontFamily: "'Space Mono', monospace" },
  chartSection: { background: "#111", borderRadius: 12, padding: "24px", marginBottom: 32 },
  sectionTitle: { fontSize: 15, fontWeight: 600, color: "#ccc", margin: "0 0 20px", letterSpacing: 0.5 },
  chartWrap: { display: "flex", alignItems: "flex-end", gap: 16, justifyContent: "center", minHeight: 180, padding: "0 8px" },
  chartCol: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  barsWrap: { display: "flex", gap: 4, alignItems: "flex-end" },
  bar: { width: 22, borderRadius: "4px 4px 0 0", minHeight: 4, transition: "height 0.4s ease" },
  chartLabel: { fontSize: 11, color: "#666", fontWeight: 500, fontFamily: "'Space Mono', monospace" },
  legend: { display: "flex", gap: 20, justifyContent: "center", marginTop: 20 },
  legendItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#888" },
  txSection: { marginBottom: 32 },
  txHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  filters: { display: "flex", gap: 8 },
  select: { background: "#111", border: "1px solid #2a2a2a", borderRadius: 6, padding: "6px 12px", color: "#ccc", fontSize: 13, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" },
  empty: { background: "#111", borderRadius: 12, padding: 40, textAlign: "center" },
  txList: { display: "flex", flexDirection: "column", gap: 8 },
  txRow: { background: "#111", borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" },
  txLeft: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  txBadge: { fontSize: 10, padding: "3px 8px", borderRadius: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, whiteSpace: "nowrap" },
  txCat: { fontSize: 14, fontWeight: 600, color: "#ddd", margin: 0 },
  txDesc: { fontSize: 12, color: "#777", margin: "2px 0 0" },
  txDate: { fontSize: 11, color: "#555", margin: "2px 0 0", fontFamily: "'Space Mono', monospace" },
  txRight: { display: "flex", alignItems: "center", gap: 16 },
  txAmount: { fontSize: 16, fontWeight: 700, fontFamily: "'Space Mono', monospace", margin: 0, whiteSpace: "nowrap" },
  txActions: { display: "flex", gap: 4 },
  actionBtn: { background: "transparent", border: "none", color: "#666", cursor: "pointer", fontSize: 14, padding: "4px 6px", borderRadius: 4, transition: "color 0.2s" },
  breakdownSection: { marginBottom: 32 },
  breakdownGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 },
  breakdownCard: { background: "#111", borderRadius: 10, padding: "18px 20px" },
  breakdownTitle: { fontSize: 13, fontWeight: 600, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: 1 },
  breakdownRow: { marginBottom: 12 },
  breakdownInfo: { display: "flex", justifyContent: "space-between", marginBottom: 4 },
  breakdownCat: { fontSize: 13, color: "#aaa" },
  breakdownAmt: { fontSize: 13, color: "#ccc", fontFamily: "'Space Mono', monospace", fontWeight: 500 },
  progressBg: { height: 4, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2, transition: "width 0.4s ease" },
  resetBtn: { background: "transparent", border: "1px solid #333", borderRadius: 6, padding: "8px 20px", color: "#666", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 },
  modal: { background: "#111", borderRadius: 16, padding: 28, width: "100%", maxWidth: 420, border: "1px solid #222" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 },
  closeBtn: { background: "transparent", border: "none", color: "#666", fontSize: 20, cursor: "pointer", padding: 4 },
  typeSelector: { display: "flex", gap: 8, marginBottom: 20 },
  typeBtn: { flex: 1, padding: "8px 0", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s" },
  formGroup: { marginBottom: 16 },
  label: { display: "block", fontSize: 12, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 },
  input: { width: "100%", background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 8, padding: "10px 14px", color: "#eee", fontSize: 14, fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box", outline: "none" },
  submitBtn: { width: "100%", padding: "12px", borderRadius: 8, border: "none", fontSize: 15, fontWeight: 700, color: "#000", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginTop: 8, transition: "opacity 0.2s" },
};
