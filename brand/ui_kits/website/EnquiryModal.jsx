// Booking enquiry modal — interactive form using core components.
function EnquiryModal({ open, trip, onClose }) {
  const { Button, Input, Eyebrow, Badge } = window.RockbustersDesignSystem_5b5bc2;
  const { Ic } = window;
  const [sent, setSent] = React.useState(false);
  React.useEffect(() => { if (open) setSent(false); }, [open, trip]);
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--surface-card)", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: 460, overflow: "hidden", boxShadow: "var(--shadow-lg)" }}
      >
        <div style={{ background: "var(--rb-black)", backgroundImage: "url(../../assets/pattern-white.png)", backgroundSize: "cover", color: "#fff", padding: "var(--space-6)", position: "relative" }}>
          <button onClick={onClose} aria-label="Close" style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", color: "#fff", cursor: "pointer", display: "inline-flex" }}>
            <Ic name="x" size={22} color="#fff" />
          </button>
          <Eyebrow color="var(--rb-red)">Book a camp</Eyebrow>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 900, textTransform: "uppercase", fontSize: 28, lineHeight: 0.95, letterSpacing: "-0.01em", margin: "var(--space-3) 0 0" }}>
            {trip ? trip.name : "Find your next project"}
          </h3>
          {trip && (
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              <Badge variant="red">{trip.discipline}</Badge>
              <Badge variant="outline" style={{ color: "#fff", boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.5)" }}>{trip.len}</Badge>
            </div>
          )}
        </div>

        {sent ? (
          <div style={{ padding: "var(--space-7) var(--space-6)", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "var(--radius-pill)", background: "var(--rb-red)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "var(--space-4)" }}>
              <Ic name="check" size={28} color="#fff" />
            </div>
            <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 800, textTransform: "uppercase", fontSize: 22, margin: "0 0 8px" }}>You're on the list</h4>
            <p style={{ color: "var(--text-secondary)", fontSize: "var(--fs-small)", margin: "0 0 var(--space-5)" }}>A coach will be in touch. Now go get strong.</p>
            <Button variant="dark" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); setSent(true); }}
            style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
          >
            <Input label="Name" placeholder="Alex Honnold" required />
            <Input label="Email" type="email" placeholder="you@send.it" required />
            <Input label="Hardest redpoint" placeholder="e.g. 7b+" hint="Don't sandbag yourself — it helps us match a coach." />
            <Button variant="primary" type="submit" fullWidth size="lg">Send enquiry</Button>
          </form>
        )}
      </div>
    </div>
  );
}
Object.assign(window, { EnquiryModal });
