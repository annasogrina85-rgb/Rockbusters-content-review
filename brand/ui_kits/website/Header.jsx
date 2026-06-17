// Sticky site header with nav + CTA. Recreation of the Rockbusters site chrome.
function Header({ onNav, active, onEnquire }) {
  const { Button } = window.RockbustersDesignSystem_5b5bc2;
  const links = [
    { id: "home", label: "Home" },
    { id: "trips", label: "Trips" },
    { id: "coaches", label: "Coaches" },
  ];
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const root = document.getElementById("rb-scroll");
    const onScroll = () => setScrolled((root ? root.scrollTop : window.scrollY) > 12);
    (root || window).addEventListener("scroll", onScroll);
    return () => (root || window).removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "var(--rb-black)",
        borderBottom: scrolled ? "1px solid var(--border-inverse)" : "1px solid transparent",
        transition: "border-color var(--dur-normal)",
      }}
    >
      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "0 var(--space-5)", height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="#home" onClick={(e) => { e.preventDefault(); onNav("home"); }} style={{ display: "inline-flex", alignItems: "center" }}>
          <img src="../../assets/logo-03.png" alt="Rockbusters" style={{ height: 40 }} />
        </a>
        <nav style={{ display: "flex", alignItems: "center", gap: "var(--space-6)" }}>
          {links.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              onClick={(e) => { e.preventDefault(); onNav(l.id); }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontSize: 13,
                textDecoration: "none",
                color: active === l.id ? "var(--rb-red)" : "var(--rb-white)",
              }}
            >
              {l.label}
            </a>
          ))}
          <Button variant="primary" size="sm" onClick={onEnquire}>Book a camp</Button>
        </nav>
      </div>
    </header>
  );
}
Object.assign(window, { Header });
