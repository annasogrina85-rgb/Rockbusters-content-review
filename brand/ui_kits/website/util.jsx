// Shared helpers for the Rockbusters website UI kit.

// Lucide icon renderer
function Ic({ name, size = 20, color = "currentColor", strokeWidth = 2, style = {} }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current && window.lucide) {
      ref.current.innerHTML = "";
      const el = document.createElement("i");
      el.setAttribute("data-lucide", name);
      ref.current.appendChild(el);
      window.lucide.createIcons({ attrs: { width: size, height: size, stroke: color, "stroke-width": strokeWidth } });
    }
  });
  return <span ref={ref} style={{ display: "inline-flex", lineHeight: 0, ...style }} />;
}

/**
 * Honest image placeholder — no invented photography. Grungy texture + icon + label.
 * Drop real climbing photos here in production.
 */
function Photo({ label = "Photo", icon = "mountain", ratio = "4 / 3", tone = "dark", style = {} }) {
  const dark = tone === "dark";
  return (
    <div
      style={{
        position: "relative",
        aspectRatio: ratio,
        background: dark ? "var(--rb-grey-900)" : "var(--rb-grey-100)",
        backgroundImage: `url(${dark ? "../../assets/pattern-white.png" : "../../assets/pattern-dark-grey.png"})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        color: dark ? "rgba(255,255,255,0.45)" : "var(--rb-grey-500)",
        overflow: "hidden",
        ...style,
      }}
    >
      <Ic name={icon} size={26} />
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 10 }}>{label}</span>
    </div>
  );
}

Object.assign(window, { Ic, Photo });
