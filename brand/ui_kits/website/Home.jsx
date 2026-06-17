// Home: hero, stats band, "what we cover", philosophy.
function Hero({ onEnquire, onNav }) {
  const { Button, Eyebrow } = window.RockbustersDesignSystem_5b5bc2;
  const { Photo, Ic } = window;
  return (
    <section
      style={{
        background: "var(--rb-black)",
        backgroundImage: "url(../../assets/pattern-white.png)",
        backgroundSize: "cover",
        color: "var(--rb-white)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "var(--space-9) var(--space-5)", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "var(--space-8)", alignItems: "center" }}>
        <div>
          <Eyebrow color="var(--rb-red)">A community of climbers</Eyebrow>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, textTransform: "uppercase", fontSize: "clamp(40px, 6vw, 80px)", lineHeight: 0.92, letterSpacing: "-0.02em", margin: "var(--space-4) 0 0" }}>
            Climb better,<br />harder <span style={{ color: "var(--rb-red)" }}>&amp; more.</span>
          </h1>
          <p style={{ fontSize: "var(--fs-lead)", lineHeight: 1.5, color: "rgba(255,255,255,0.78)", maxWidth: 480, margin: "var(--space-5) 0 0" }}>
            We don't just sell climbing holidays. We live, breathe, and bleed this sport — coaching camps and road trips run by the planet's best climbers.
          </p>
          <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-6)", flexWrap: "wrap" }}>
            <Button variant="primary" size="lg" onClick={onEnquire} rightIcon={<Ic name="arrow-right" size={18} />}>Start sending</Button>
            <Button variant="outline-invert" size="lg" onClick={() => onNav("trips")}>View the lineup</Button>
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <Photo label="Athlete on rock" icon="image" ratio="3 / 4" style={{ borderRadius: "var(--radius-lg)" }} />
          <img src="../../assets/climb-hard-sleep.png" alt="Climb. Hard. Eat. Sleep. Climb. Again." style={{ position: "absolute", bottom: -18, left: -18, width: 200, filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.6))" }} />
        </div>
      </div>
    </section>
  );
}

function StatsBand() {
  const { Stat } = window.RockbustersDesignSystem_5b5bc2;
  const items = [
    { value: "1:6", label: "Coach to climbers" },
    { value: "100%", label: "Rock time, dawn–dusk" },
    { value: "30+", label: "Pro coaches" },
    { value: "1%", label: "For the Planet" },
  ];
  return (
    <section style={{ background: "var(--rb-red)", color: "var(--rb-white)" }}>
      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "var(--space-7) var(--space-5)", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-5)" }}>
        {items.map((i) => (
          <Stat key={i.label} value={i.value} label={i.label} accent={false} />
        ))}
      </div>
    </section>
  );
}

function Cover() {
  const { Eyebrow, Card } = window.RockbustersDesignSystem_5b5bc2;
  const { Ic } = window;
  const cols = [
    { icon: "move", title: "Movement & technique", items: ["Footwork & body tension", "Drop-knees, flagging & hooks", "Flow, momentum & pacing"] },
    { icon: "brain", title: "Mental & tactics", items: ["Overcoming fear of falling", "Head game & visualization", "Onsight vs. redpoint strategy"] },
    { icon: "shield", title: "Safety & systems", items: ["Flawless lead belaying", "Trad gear & anchor building", "Multi-pitch & DWS safety"] },
  ];
  return (
    <section style={{ background: "var(--surface-page)" }}>
      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "var(--space-9) var(--space-5)" }}>
        <Eyebrow>Every single aspect</Eyebrow>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, textTransform: "uppercase", fontSize: "var(--fs-h1)", lineHeight: 1.0, letterSpacing: "-0.01em", margin: "var(--space-4) 0 var(--space-7)", maxWidth: 640 }}>
          We break down your climbing from the inside out
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-5)" }}>
          {cols.map((c) => (
            <Card key={c.title} tone="subtle" style={{ padding: "var(--space-6)" }}>
              <div style={{ width: 44, height: 44, borderRadius: "var(--radius-pill)", background: "var(--rb-red)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ic name={c.icon} size={22} color="#fff" />
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, textTransform: "uppercase", fontSize: "var(--fs-h4)", margin: "var(--space-4) 0 var(--space-3)" }}>{c.title}</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {c.items.map((it) => (
                  <li key={it} style={{ display: "flex", gap: 8, fontSize: "var(--fs-small)", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                    <Ic name="check" size={16} color="var(--rb-red)" /> {it}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Philosophy({ onEnquire }) {
  const { Button, Eyebrow } = window.RockbustersDesignSystem_5b5bc2;
  return (
    <section style={{ background: "var(--rb-black)", backgroundImage: "url(../../assets/pattern-white.png)", backgroundSize: "cover", color: "var(--rb-white)" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "var(--space-9) var(--space-5)", textAlign: "center" }}>
        <Eyebrow color="var(--rb-red)" style={{ justifyContent: "center" }}>Our philosophy</Eyebrow>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 900, textTransform: "uppercase", fontSize: "clamp(36px,5vw,64px)", lineHeight: 0.95, letterSpacing: "-0.02em", margin: "var(--space-4) 0 var(--space-5)" }}>
          Play hard.<br /><span style={{ color: "var(--rb-red)" }}>Work harder.</span>
        </h2>
        <p style={{ fontSize: "var(--fs-lead)", lineHeight: 1.55, color: "rgba(255,255,255,0.8)", margin: "0 auto var(--space-6)" }}>
          Climbing is frustrating, painful, and mentally exhausting. Nothing worth doing comes easy. But giving your absolute best shot, over and over, is the only way to grow — and it makes that post-session beer taste unforgettable.
        </p>
        <Button variant="primary" size="lg" onClick={onEnquire}>Stop wishing, start sending</Button>
      </div>
    </section>
  );
}

Object.assign(window, { Hero, StatsBand, Cover, Philosophy });
