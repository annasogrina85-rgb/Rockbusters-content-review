// Coaches roster + dark CTA footer.
function Coaches() {
  const { Eyebrow, Card } = window.RockbustersDesignSystem_5b5bc2;
  const { Photo } = window;
  const { coaches } = window.RB_DATA;
  return (
    <section style={{ background: "var(--surface-page)" }}>
      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "var(--space-9) var(--space-5)" }}>
        <Eyebrow>Learn from the world's best</Eyebrow>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, textTransform: "uppercase", fontSize: "var(--fs-h1)", lineHeight: 1.0, letterSpacing: "-0.01em", margin: "var(--space-3) 0 var(--space-2)", maxWidth: 680 }}>
          Tie in next to legends
        </h2>
        <p style={{ fontSize: "var(--fs-lead)", color: "var(--text-secondary)", maxWidth: 560, margin: "0 0 var(--space-7)" }}>
          Why learn from textbooks when you can get hands-on coaching, beta and inspiration from icons of the sport?
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--space-5)" }}>
          {coaches.map((c) => (
            <Card key={c.name} tone="light" padded={false} interactive>
              <Photo label="Portrait" icon="user-round" ratio="1 / 1" />
              <div style={{ padding: "var(--space-4)" }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, textTransform: "uppercase", fontSize: "var(--fs-h4)", margin: 0 }}>{c.name}</h3>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 10, color: "var(--rb-red)", margin: "6px 0 8px" }}>{c.role}</div>
                <p style={{ fontSize: "var(--fs-small)", color: "var(--text-secondary)", margin: 0, lineHeight: 1.4 }}>{c.note}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer({ onEnquire }) {
  const { Button } = window.RockbustersDesignSystem_5b5bc2;
  const { Ic } = window;
  return (
    <footer style={{ background: "var(--rb-black)", color: "var(--rb-white)" }}>
      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "var(--space-9) var(--space-5) var(--space-7)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: "var(--space-7)", alignItems: "start" }}>
          <div>
            <img src="../../assets/logo-02.png" alt="Rockbusters" style={{ height: 64, filter: "invert(1)" }} />
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "var(--fs-small)", lineHeight: 1.5, maxWidth: 320, marginTop: "var(--space-4)" }}>
              Run by climbers, for climbers. Come alone, leave with a crew.
            </p>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 11, color: "var(--rb-red)", marginBottom: "var(--space-4)" }}>Disciplines</div>
            {["Sport climbing", "Bouldering", "Trad", "Multi-pitch", "Women-only"].map((l) => (
              <a key={l} href="#" onClick={(e) => e.preventDefault()} style={{ display: "block", color: "rgba(255,255,255,0.78)", textDecoration: "none", fontSize: "var(--fs-small)", padding: "5px 0" }}>{l}</a>
            ))}
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 11, color: "var(--rb-red)", marginBottom: "var(--space-4)" }}>Ready?</div>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "var(--fs-small)", lineHeight: 1.5, marginBottom: "var(--space-4)" }}>Let's find your next project.</p>
            <Button variant="primary" onClick={onEnquire} rightIcon={<Ic name="arrow-right" size={16} />}>Book a camp</Button>
          </div>
        </div>
        <div style={{ borderTop: "1px solid var(--border-inverse)", marginTop: "var(--space-7)", paddingTop: "var(--space-5)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, color: "rgba(255,255,255,0.45)", fontSize: 12 }}>
          <span>© {new Date().getFullYear()} Rockbusters. Proud partner of 1% For The Planet.</span>
          <span style={{ display: "inline-flex", gap: "var(--space-4)" }}>
            <Ic name="instagram" size={16} /><Ic name="facebook" size={16} /><Ic name="youtube" size={16} />
          </span>
        </div>
      </div>
    </footer>
  );
}
Object.assign(window, { Coaches, Footer });
