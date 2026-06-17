// Trips lineup with working discipline filter.
function TripCard({ trip, onEnquire }) {
  const { Card, Badge, Eyebrow, Button } = window.RockbustersDesignSystem_5b5bc2;
  const { Photo, Ic } = window;
  return (
    <Card tone="light" padded={false} interactive style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative" }}>
        <Photo label={trip.country} icon="mountain" ratio="16 / 10" />
        <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6 }}>
          <Badge variant="red">{trip.discipline}</Badge>
          {trip.women && <Badge variant="black">Women-only</Badge>}
        </div>
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          <Badge variant="black" shape="square">{trip.grade}</Badge>
        </div>
      </div>
      <div style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", flex: 1 }}>
        <Eyebrow>{trip.level}</Eyebrow>
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, textTransform: "uppercase", fontSize: "var(--fs-h4)", margin: "var(--space-3) 0 var(--space-2)" }}>{trip.name}</h3>
        <p style={{ fontSize: "var(--fs-small)", color: "var(--text-secondary)", lineHeight: 1.45, margin: 0, flex: 1 }}>{trip.blurb}</p>
        <div style={{ display: "flex", gap: "var(--space-4)", margin: "var(--space-4) 0", fontSize: 12, color: "var(--text-muted)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Ic name="calendar" size={14} /> {trip.len}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Ic name="user-round" size={14} /> {trip.coach}</span>
        </div>
        <Button variant="dark" size="sm" fullWidth onClick={onEnquire}>Enquire</Button>
      </div>
    </Card>
  );
}

function Lineup({ onEnquire, compact }) {
  const { Eyebrow, Tag } = window.RockbustersDesignSystem_5b5bc2;
  const { trips, disciplines } = window.RB_DATA;
  const [filter, setFilter] = React.useState("All");
  const shown = trips.filter((t) => filter === "All" || t.discipline === filter);

  return (
    <section style={{ background: "var(--surface-subtle)" }}>
      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "var(--space-9) var(--space-5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "var(--space-4)" }}>
          <div>
            <Eyebrow>What we do</Eyebrow>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, textTransform: "uppercase", fontSize: "var(--fs-h1)", lineHeight: 1.0, letterSpacing: "-0.01em", margin: "var(--space-3) 0 0" }}>The lineup</h2>
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            {disciplines.map((d) => (
              <Tag key={d} active={filter === d} onClick={() => setFilter(d)}>{d}</Tag>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "var(--space-5)", marginTop: "var(--space-7)" }}>
          {shown.map((t) => (
            <TripCard key={t.id} trip={t} onEnquire={() => onEnquire(t)} />
          ))}
        </div>
      </div>
    </section>
  );
}
Object.assign(window, { Lineup, TripCard });
