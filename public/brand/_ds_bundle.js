/* @ds-bundle: {"format":3,"namespace":"RockbustersDesignSystem_5b5bc2","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Eyebrow","sourcePath":"components/core/Eyebrow.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"Stat","sourcePath":"components/core/Stat.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"8494c6776a74","components/core/Button.jsx":"ea3d12f8b837","components/core/Card.jsx":"73bc9c6b20c6","components/core/Eyebrow.jsx":"8c30ed1817ca","components/core/IconButton.jsx":"afba4597e426","components/core/Input.jsx":"22d86e039011","components/core/Stat.jsx":"a84a4c4e6c5f","components/core/Tag.jsx":"805c0ccfdaa2","ui_kits/website/Coaches.jsx":"0b7dd003cf2c","ui_kits/website/EnquiryModal.jsx":"99f59b899647","ui_kits/website/Header.jsx":"a6018f3170fb","ui_kits/website/Home.jsx":"8b2964e24ed4","ui_kits/website/Lineup.jsx":"546d77140632","ui_kits/website/data.js":"162360e4fe3a","ui_kits/website/util.jsx":"a8bcae730891"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.RockbustersDesignSystem_5b5bc2 = window.RockbustersDesignSystem_5b5bc2 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Small status/label badge. Uppercase, tight, pill or square.
 */
function Badge({
  variant = "red",
  shape = "pill",
  children,
  style = {},
  ...rest
}) {
  const variants = {
    red: {
      background: "var(--color-accent)",
      color: "var(--color-on-accent)"
    },
    black: {
      background: "var(--rb-black)",
      color: "var(--rb-white)"
    },
    outline: {
      background: "transparent",
      color: "var(--text-primary)",
      boxShadow: "inset 0 0 0 var(--border-width-bold) var(--border-strong)"
    },
    light: {
      background: "var(--rb-grey-100)",
      color: "var(--text-primary)"
    }
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "0.35em",
      fontFamily: "var(--font-display)",
      fontWeight: "var(--fw-bold)",
      fontSize: "0.6875rem",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      lineHeight: 1,
      padding: "0.4em 0.75em",
      borderRadius: shape === "pill" ? "var(--radius-pill)" : "var(--radius-sm)",
      whiteSpace: "nowrap",
      ...variants[variant],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Rockbusters Button — bold, uppercase, pill. Red is the primary weapon.
 */
function Button({
  variant = "primary",
  size = "md",
  type = "button",
  disabled = false,
  fullWidth = false,
  leftIcon = null,
  rightIcon = null,
  children,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: {
      fontSize: "0.75rem",
      padding: "0.5rem 1rem",
      gap: "0.4rem"
    },
    md: {
      fontSize: "0.8125rem",
      padding: "0.75rem 1.6rem",
      gap: "0.5rem"
    },
    lg: {
      fontSize: "0.9375rem",
      padding: "1rem 2.2rem",
      gap: "0.6rem"
    }
  };
  const variants = {
    primary: {
      background: "var(--color-accent)",
      color: "var(--color-on-accent)",
      border: "var(--border-width-bold) solid var(--color-accent)"
    },
    dark: {
      background: "var(--rb-black)",
      color: "var(--rb-white)",
      border: "var(--border-width-bold) solid var(--rb-black)"
    },
    outline: {
      background: "transparent",
      color: "var(--text-primary)",
      border: "var(--border-width-bold) solid var(--border-strong)"
    },
    "outline-invert": {
      background: "transparent",
      color: "var(--rb-white)",
      border: "var(--border-width-bold) solid var(--rb-white)"
    },
    ghost: {
      background: "transparent",
      color: "var(--text-accent)",
      border: "var(--border-width-bold) solid transparent"
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    className: `rb-btn rb-btn--${variant}`,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: sizes[size].gap,
      fontFamily: "var(--font-display)",
      fontWeight: "var(--fw-bold)",
      textTransform: "uppercase",
      letterSpacing: "var(--ls-button)",
      lineHeight: 1,
      borderRadius: "var(--radius-pill)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.4 : 1,
      width: fullWidth ? "100%" : "auto",
      transition: "transform var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-standard), box-shadow var(--dur-fast)",
      ...sizes[size],
      ...variants[variant],
      ...style
    }
  }, rest), leftIcon, children, rightIcon);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Surface container. `tone` sets the register; `interactive` enables hover-lift.
 */
function Card({
  tone = "light",
  interactive = false,
  padded = true,
  children,
  style = {},
  ...rest
}) {
  const tones = {
    light: {
      background: "var(--surface-card)",
      color: "var(--text-primary)",
      border: "var(--border-width) solid var(--border-default)"
    },
    subtle: {
      background: "var(--surface-subtle)",
      color: "var(--text-primary)",
      border: "var(--border-width) solid var(--border-default)"
    },
    dark: {
      background: "var(--rb-black)",
      color: "var(--rb-white)",
      border: "none"
    },
    red: {
      background: "var(--color-accent)",
      color: "var(--color-on-accent)",
      border: "none"
    }
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    className: interactive ? "rb-card--interactive" : undefined,
    style: {
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
      padding: padded ? "var(--space-5)" : 0,
      ...tones[tone],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Eyebrow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Overline / kicker. Wide-tracked uppercase, red by default, with a tick mark.
 */
function Eyebrow({
  tick = true,
  color,
  as = "div",
  children,
  style = {},
  ...rest
}) {
  const Comp = as;
  return /*#__PURE__*/React.createElement(Comp, _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "0.6em",
      fontFamily: "var(--font-display)",
      fontWeight: "var(--fw-bold)",
      textTransform: "uppercase",
      letterSpacing: "var(--ls-eyebrow)",
      fontSize: "var(--fs-eyebrow)",
      color: color || "var(--text-accent)",
      ...style
    }
  }, rest), tick && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: "1.75em",
      height: "var(--border-width-heavy)",
      background: "currentColor",
      display: "inline-block"
    }
  }), children);
}
Object.assign(__ds_scope, { Eyebrow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Eyebrow.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Square-ish pill icon button. Pass a Lucide icon (or any node) as children.
 */
function IconButton({
  variant = "solid",
  size = "md",
  type = "button",
  disabled = false,
  "aria-label": ariaLabel,
  children,
  style = {},
  ...rest
}) {
  const dim = {
    sm: 32,
    md: 40,
    lg: 48
  }[size];
  const variants = {
    solid: {
      background: "var(--color-accent)",
      color: "var(--color-on-accent)",
      border: "none"
    },
    dark: {
      background: "var(--rb-black)",
      color: "var(--rb-white)",
      border: "none"
    },
    outline: {
      background: "transparent",
      color: "var(--text-primary)",
      border: "var(--border-width-bold) solid var(--border-strong)"
    },
    ghost: {
      background: "transparent",
      color: "var(--text-primary)",
      border: "none"
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    "aria-label": ariaLabel,
    className: `rb-iconbtn rb-iconbtn--${variant}`,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: dim,
      height: dim,
      borderRadius: "var(--radius-pill)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.4 : 1,
      ...variants[variant],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Text input with optional label. Crisp border, red focus ring.
 */
function Input({
  label,
  id,
  type = "text",
  invalid = false,
  hint,
  style = {},
  ...rest
}) {
  const inputId = id || (label ? `rb-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "0.4rem",
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: "var(--fw-bold)",
      textTransform: "uppercase",
      letterSpacing: "var(--ls-eyebrow)",
      fontSize: "var(--fs-eyebrow)",
      color: "var(--text-primary)"
    }
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    type: type,
    className: "rb-input",
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "var(--fs-body)",
      color: "var(--text-primary)",
      background: "var(--surface-card)",
      padding: "0.75rem 1rem",
      borderRadius: "var(--radius-md)",
      border: `var(--border-width-bold) solid ${invalid ? "var(--color-accent)" : "var(--border-default)"}`,
      width: "100%"
    }
  }, rest)), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-small)",
      color: invalid ? "var(--text-accent)" : "var(--text-secondary)"
    }
  }, hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/Stat.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Big numeric flex stat — "100%", "1:6", "30+". Number shouts, label whispers.
 */
function Stat({
  value,
  label,
  accent = true,
  align = "left",
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      textAlign: align,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: "var(--fw-black)",
      fontSize: "var(--fs-display-2)",
      lineHeight: 0.9,
      letterSpacing: "var(--ls-display)",
      color: accent ? "var(--text-accent)" : "inherit"
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-2)",
      fontFamily: "var(--font-display)",
      fontWeight: "var(--fw-bold)",
      textTransform: "uppercase",
      letterSpacing: "var(--ls-eyebrow)",
      fontSize: "var(--fs-eyebrow)",
      color: "inherit",
      opacity: 0.7
    }
  }, label));
}
Object.assign(__ds_scope, { Stat });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Stat.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Filter / category tag. Sentence-or-upper case, selectable. Optional onClick.
 */
function Tag({
  active = false,
  as = "span",
  onClick,
  children,
  style = {},
  ...rest
}) {
  const interactive = typeof onClick === "function" || as === "button";
  const Comp = as;
  return /*#__PURE__*/React.createElement(Comp, _extends({
    onClick: onClick,
    className: interactive ? "rb-tag--button" : undefined,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "0.4em",
      fontFamily: "var(--font-body)",
      fontWeight: "var(--fw-semibold)",
      fontSize: "0.8125rem",
      letterSpacing: "0.01em",
      lineHeight: 1,
      padding: "0.5em 0.9em",
      borderRadius: "var(--radius-pill)",
      border: "var(--border-width) solid var(--border-default)",
      background: active ? "var(--rb-ink)" : "transparent",
      color: active ? "var(--rb-white)" : "var(--text-primary)",
      borderColor: active ? "var(--rb-ink)" : "var(--border-default)",
      cursor: interactive ? "pointer" : "default",
      whiteSpace: "nowrap",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Coaches.jsx
try { (() => {
// Coaches roster + dark CTA footer.
function Coaches() {
  const {
    Eyebrow,
    Card
  } = window.RockbustersDesignSystem_5b5bc2;
  const {
    Photo
  } = window;
  const {
    coaches
  } = window.RB_DATA;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--surface-page)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-max)",
      margin: "0 auto",
      padding: "var(--space-9) var(--space-5)"
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Learn from the world's best"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      textTransform: "uppercase",
      fontSize: "var(--fs-h1)",
      lineHeight: 1.0,
      letterSpacing: "-0.01em",
      margin: "var(--space-3) 0 var(--space-2)",
      maxWidth: 680
    }
  }, "Tie in next to legends"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--fs-lead)",
      color: "var(--text-secondary)",
      maxWidth: 560,
      margin: "0 0 var(--space-7)"
    }
  }, "Why learn from textbooks when you can get hands-on coaching, beta and inspiration from icons of the sport?"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
      gap: "var(--space-5)"
    }
  }, coaches.map(c => /*#__PURE__*/React.createElement(Card, {
    key: c.name,
    tone: "light",
    padded: false,
    interactive: true
  }, /*#__PURE__*/React.createElement(Photo, {
    label: "Portrait",
    icon: "user-round",
    ratio: "1 / 1"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      textTransform: "uppercase",
      fontSize: "var(--fs-h4)",
      margin: 0
    }
  }, c.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      fontSize: 10,
      color: "var(--rb-red)",
      margin: "6px 0 8px"
    }
  }, c.role), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--fs-small)",
      color: "var(--text-secondary)",
      margin: 0,
      lineHeight: 1.4
    }
  }, c.note)))))));
}
function Footer({
  onEnquire
}) {
  const {
    Button
  } = window.RockbustersDesignSystem_5b5bc2;
  const {
    Ic
  } = window;
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: "var(--rb-black)",
      color: "var(--rb-white)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-max)",
      margin: "0 auto",
      padding: "var(--space-9) var(--space-5) var(--space-7)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.4fr 1fr 1fr",
      gap: "var(--space-7)",
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-02.png",
    alt: "Rockbusters",
    style: {
      height: 64,
      filter: "invert(1)"
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "rgba(255,255,255,0.6)",
      fontSize: "var(--fs-small)",
      lineHeight: 1.5,
      maxWidth: 320,
      marginTop: "var(--space-4)"
    }
  }, "Run by climbers, for climbers. Come alone, leave with a crew.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.12em",
      fontSize: 11,
      color: "var(--rb-red)",
      marginBottom: "var(--space-4)"
    }
  }, "Disciplines"), ["Sport climbing", "Bouldering", "Trad", "Multi-pitch", "Women-only"].map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      display: "block",
      color: "rgba(255,255,255,0.78)",
      textDecoration: "none",
      fontSize: "var(--fs-small)",
      padding: "5px 0"
    }
  }, l))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.12em",
      fontSize: 11,
      color: "var(--rb-red)",
      marginBottom: "var(--space-4)"
    }
  }, "Ready?"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "rgba(255,255,255,0.6)",
      fontSize: "var(--fs-small)",
      lineHeight: 1.5,
      marginBottom: "var(--space-4)"
    }
  }, "Let's find your next project."), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: onEnquire,
    rightIcon: /*#__PURE__*/React.createElement(Ic, {
      name: "arrow-right",
      size: 16
    })
  }, "Book a camp"))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid var(--border-inverse)",
      marginTop: "var(--space-7)",
      paddingTop: "var(--space-5)",
      display: "flex",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 12,
      color: "rgba(255,255,255,0.45)",
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 ", new Date().getFullYear(), " Rockbusters. Proud partner of 1% For The Planet."), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      gap: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "instagram",
    size: 16
  }), /*#__PURE__*/React.createElement(Ic, {
    name: "facebook",
    size: 16
  }), /*#__PURE__*/React.createElement(Ic, {
    name: "youtube",
    size: 16
  })))));
}
Object.assign(window, {
  Coaches,
  Footer
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Coaches.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/EnquiryModal.jsx
try { (() => {
// Booking enquiry modal — interactive form using core components.
function EnquiryModal({
  open,
  trip,
  onClose
}) {
  const {
    Button,
    Input,
    Eyebrow,
    Badge
  } = window.RockbustersDesignSystem_5b5bc2;
  const {
    Ic
  } = window;
  const [sent, setSent] = React.useState(false);
  React.useEffect(() => {
    if (open) setSent(false);
  }, [open, trip]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 100,
      background: "rgba(0,0,0,0.72)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      background: "var(--surface-card)",
      borderRadius: "var(--radius-lg)",
      width: "100%",
      maxWidth: 460,
      overflow: "hidden",
      boxShadow: "var(--shadow-lg)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--rb-black)",
      backgroundImage: "url(../../assets/pattern-white.png)",
      backgroundSize: "cover",
      color: "#fff",
      padding: "var(--space-6)",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Close",
    style: {
      position: "absolute",
      top: 16,
      right: 16,
      background: "transparent",
      border: "none",
      color: "#fff",
      cursor: "pointer",
      display: "inline-flex"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "x",
    size: 22,
    color: "#fff"
  })), /*#__PURE__*/React.createElement(Eyebrow, {
    color: "var(--rb-red)"
  }, "Book a camp"), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 900,
      textTransform: "uppercase",
      fontSize: 28,
      lineHeight: 0.95,
      letterSpacing: "-0.01em",
      margin: "var(--space-3) 0 0"
    }
  }, trip ? trip.name : "Find your next project"), trip && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    variant: "red"
  }, trip.discipline), /*#__PURE__*/React.createElement(Badge, {
    variant: "outline",
    style: {
      color: "#fff",
      boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.5)"
    }
  }, trip.len))), sent ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-7) var(--space-6)",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 56,
      height: 56,
      borderRadius: "var(--radius-pill)",
      background: "var(--rb-red)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "check",
    size: 28,
    color: "#fff"
  })), /*#__PURE__*/React.createElement("h4", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      textTransform: "uppercase",
      fontSize: 22,
      margin: "0 0 8px"
    }
  }, "You're on the list"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--text-secondary)",
      fontSize: "var(--fs-small)",
      margin: "0 0 var(--space-5)"
    }
  }, "A coach will be in touch. Now go get strong."), /*#__PURE__*/React.createElement(Button, {
    variant: "dark",
    onClick: onClose
  }, "Done")) : /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      setSent(true);
    },
    style: {
      padding: "var(--space-6)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Name",
    placeholder: "Alex Honnold",
    required: true
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Email",
    type: "email",
    placeholder: "you@send.it",
    required: true
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Hardest redpoint",
    placeholder: "e.g. 7b+",
    hint: "Don't sandbag yourself \u2014 it helps us match a coach."
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    type: "submit",
    fullWidth: true,
    size: "lg"
  }, "Send enquiry"))));
}
Object.assign(window, {
  EnquiryModal
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/EnquiryModal.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Header.jsx
try { (() => {
// Sticky site header with nav + CTA. Recreation of the Rockbusters site chrome.
function Header({
  onNav,
  active,
  onEnquire
}) {
  const {
    Button
  } = window.RockbustersDesignSystem_5b5bc2;
  const links = [{
    id: "home",
    label: "Home"
  }, {
    id: "trips",
    label: "Trips"
  }, {
    id: "coaches",
    label: "Coaches"
  }];
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const root = document.getElementById("rb-scroll");
    const onScroll = () => setScrolled((root ? root.scrollTop : window.scrollY) > 12);
    (root || window).addEventListener("scroll", onScroll);
    return () => (root || window).removeEventListener("scroll", onScroll);
  }, []);
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 50,
      background: "var(--rb-black)",
      borderBottom: scrolled ? "1px solid var(--border-inverse)" : "1px solid transparent",
      transition: "border-color var(--dur-normal)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-max)",
      margin: "0 auto",
      padding: "0 var(--space-5)",
      height: 72,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#home",
    onClick: e => {
      e.preventDefault();
      onNav("home");
    },
    style: {
      display: "inline-flex",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-03.png",
    alt: "Rockbusters",
    style: {
      height: 40
    }
  })), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-6)"
    }
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l.id,
    href: `#${l.id}`,
    onClick: e => {
      e.preventDefault();
      onNav(l.id);
    },
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      fontSize: 13,
      textDecoration: "none",
      color: active === l.id ? "var(--rb-red)" : "var(--rb-white)"
    }
  }, l.label)), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    onClick: onEnquire
  }, "Book a camp"))));
}
Object.assign(window, {
  Header
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Header.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Home.jsx
try { (() => {
// Home: hero, stats band, "what we cover", philosophy.
function Hero({
  onEnquire,
  onNav
}) {
  const {
    Button,
    Eyebrow
  } = window.RockbustersDesignSystem_5b5bc2;
  const {
    Photo,
    Ic
  } = window;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--rb-black)",
      backgroundImage: "url(../../assets/pattern-white.png)",
      backgroundSize: "cover",
      color: "var(--rb-white)",
      position: "relative",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-max)",
      margin: "0 auto",
      padding: "var(--space-9) var(--space-5)",
      display: "grid",
      gridTemplateColumns: "1.1fr 0.9fr",
      gap: "var(--space-8)",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    color: "var(--rb-red)"
  }, "A community of climbers"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 900,
      textTransform: "uppercase",
      fontSize: "clamp(40px, 6vw, 80px)",
      lineHeight: 0.92,
      letterSpacing: "-0.02em",
      margin: "var(--space-4) 0 0"
    }
  }, "Climb better,", /*#__PURE__*/React.createElement("br", null), "harder ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--rb-red)"
    }
  }, "& more.")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--fs-lead)",
      lineHeight: 1.5,
      color: "rgba(255,255,255,0.78)",
      maxWidth: 480,
      margin: "var(--space-5) 0 0"
    }
  }, "We don't just sell climbing holidays. We live, breathe, and bleed this sport \u2014 coaching camps and road trips run by the planet's best climbers."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-3)",
      marginTop: "var(--space-6)",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    onClick: onEnquire,
    rightIcon: /*#__PURE__*/React.createElement(Ic, {
      name: "arrow-right",
      size: 18
    })
  }, "Start sending"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline-invert",
    size: "lg",
    onClick: () => onNav("trips")
  }, "View the lineup"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement(Photo, {
    label: "Athlete on rock",
    icon: "image",
    ratio: "3 / 4",
    style: {
      borderRadius: "var(--radius-lg)"
    }
  }), /*#__PURE__*/React.createElement("img", {
    src: "../../assets/climb-hard-sleep.png",
    alt: "Climb. Hard. Eat. Sleep. Climb. Again.",
    style: {
      position: "absolute",
      bottom: -18,
      left: -18,
      width: 200,
      filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.6))"
    }
  }))));
}
function StatsBand() {
  const {
    Stat
  } = window.RockbustersDesignSystem_5b5bc2;
  const items = [{
    value: "1:6",
    label: "Coach to climbers"
  }, {
    value: "100%",
    label: "Rock time, dawn–dusk"
  }, {
    value: "30+",
    label: "Pro coaches"
  }, {
    value: "1%",
    label: "For the Planet"
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--rb-red)",
      color: "var(--rb-white)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-max)",
      margin: "0 auto",
      padding: "var(--space-7) var(--space-5)",
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "var(--space-5)"
    }
  }, items.map(i => /*#__PURE__*/React.createElement(Stat, {
    key: i.label,
    value: i.value,
    label: i.label,
    accent: false
  }))));
}
function Cover() {
  const {
    Eyebrow,
    Card
  } = window.RockbustersDesignSystem_5b5bc2;
  const {
    Ic
  } = window;
  const cols = [{
    icon: "move",
    title: "Movement & technique",
    items: ["Footwork & body tension", "Drop-knees, flagging & hooks", "Flow, momentum & pacing"]
  }, {
    icon: "brain",
    title: "Mental & tactics",
    items: ["Overcoming fear of falling", "Head game & visualization", "Onsight vs. redpoint strategy"]
  }, {
    icon: "shield",
    title: "Safety & systems",
    items: ["Flawless lead belaying", "Trad gear & anchor building", "Multi-pitch & DWS safety"]
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--surface-page)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-max)",
      margin: "0 auto",
      padding: "var(--space-9) var(--space-5)"
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Every single aspect"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      textTransform: "uppercase",
      fontSize: "var(--fs-h1)",
      lineHeight: 1.0,
      letterSpacing: "-0.01em",
      margin: "var(--space-4) 0 var(--space-7)",
      maxWidth: 640
    }
  }, "We break down your climbing from the inside out"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "var(--space-5)"
    }
  }, cols.map(c => /*#__PURE__*/React.createElement(Card, {
    key: c.title,
    tone: "subtle",
    style: {
      padding: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      borderRadius: "var(--radius-pill)",
      background: "var(--rb-red)",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: c.icon,
    size: 22,
    color: "#fff"
  })), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      textTransform: "uppercase",
      fontSize: "var(--fs-h4)",
      margin: "var(--space-4) 0 var(--space-3)"
    }
  }, c.title), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: "none",
      padding: 0,
      margin: 0,
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-2)"
    }
  }, c.items.map(it => /*#__PURE__*/React.createElement("li", {
    key: it,
    style: {
      display: "flex",
      gap: 8,
      fontSize: "var(--fs-small)",
      color: "var(--text-secondary)",
      lineHeight: 1.4
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "check",
    size: 16,
    color: "var(--rb-red)"
  }), " ", it))))))));
}
function Philosophy({
  onEnquire
}) {
  const {
    Button,
    Eyebrow
  } = window.RockbustersDesignSystem_5b5bc2;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--rb-black)",
      backgroundImage: "url(../../assets/pattern-white.png)",
      backgroundSize: "cover",
      color: "var(--rb-white)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 820,
      margin: "0 auto",
      padding: "var(--space-9) var(--space-5)",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    color: "var(--rb-red)",
    style: {
      justifyContent: "center"
    }
  }, "Our philosophy"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 900,
      textTransform: "uppercase",
      fontSize: "clamp(36px,5vw,64px)",
      lineHeight: 0.95,
      letterSpacing: "-0.02em",
      margin: "var(--space-4) 0 var(--space-5)"
    }
  }, "Play hard.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--rb-red)"
    }
  }, "Work harder.")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--fs-lead)",
      lineHeight: 1.55,
      color: "rgba(255,255,255,0.8)",
      margin: "0 auto var(--space-6)"
    }
  }, "Climbing is frustrating, painful, and mentally exhausting. Nothing worth doing comes easy. But giving your absolute best shot, over and over, is the only way to grow \u2014 and it makes that post-session beer taste unforgettable."), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    onClick: onEnquire
  }, "Stop wishing, start sending")));
}
Object.assign(window, {
  Hero,
  StatsBand,
  Cover,
  Philosophy
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Home.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Lineup.jsx
try { (() => {
// Trips lineup with working discipline filter.
function TripCard({
  trip,
  onEnquire
}) {
  const {
    Card,
    Badge,
    Eyebrow,
    Button
  } = window.RockbustersDesignSystem_5b5bc2;
  const {
    Photo,
    Ic
  } = window;
  return /*#__PURE__*/React.createElement(Card, {
    tone: "light",
    padded: false,
    interactive: true,
    style: {
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement(Photo, {
    label: trip.country,
    icon: "mountain",
    ratio: "16 / 10"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 12,
      left: 12,
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    variant: "red"
  }, trip.discipline), trip.women && /*#__PURE__*/React.createElement(Badge, {
    variant: "black"
  }, "Women-only")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 12,
      right: 12
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    variant: "black",
    shape: "square"
  }, trip.grade))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-5)",
      display: "flex",
      flexDirection: "column",
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, trip.level), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      textTransform: "uppercase",
      fontSize: "var(--fs-h4)",
      margin: "var(--space-3) 0 var(--space-2)"
    }
  }, trip.name), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--fs-small)",
      color: "var(--text-secondary)",
      lineHeight: 1.45,
      margin: 0,
      flex: 1
    }
  }, trip.blurb), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-4)",
      margin: "var(--space-4) 0",
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "calendar",
    size: 14
  }), " ", trip.len), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "user-round",
    size: 14
  }), " ", trip.coach)), /*#__PURE__*/React.createElement(Button, {
    variant: "dark",
    size: "sm",
    fullWidth: true,
    onClick: onEnquire
  }, "Enquire")));
}
function Lineup({
  onEnquire,
  compact
}) {
  const {
    Eyebrow,
    Tag
  } = window.RockbustersDesignSystem_5b5bc2;
  const {
    trips,
    disciplines
  } = window.RB_DATA;
  const [filter, setFilter] = React.useState("All");
  const shown = trips.filter(t => filter === "All" || t.discipline === filter);
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--surface-subtle)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-max)",
      margin: "0 auto",
      padding: "var(--space-9) var(--space-5)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end",
      flexWrap: "wrap",
      gap: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, null, "What we do"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      textTransform: "uppercase",
      fontSize: "var(--fs-h1)",
      lineHeight: 1.0,
      letterSpacing: "-0.01em",
      margin: "var(--space-3) 0 0"
    }
  }, "The lineup")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-2)",
      flexWrap: "wrap"
    }
  }, disciplines.map(d => /*#__PURE__*/React.createElement(Tag, {
    key: d,
    active: filter === d,
    onClick: () => setFilter(d)
  }, d)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
      gap: "var(--space-5)",
      marginTop: "var(--space-7)"
    }
  }, shown.map(t => /*#__PURE__*/React.createElement(TripCard, {
    key: t.id,
    trip: t,
    onEnquire: () => onEnquire(t)
  })))));
}
Object.assign(window, {
  Lineup,
  TripCard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Lineup.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/data.js
try { (() => {
// Rockbusters website UI kit — fake content sourced from the brand "About us" copy.
window.RB_DATA = {
  trips: [{
    id: 1,
    name: "Kalymnos Sport Camp",
    discipline: "Sport",
    level: "All levels",
    grade: "5c–8a",
    country: "Greece",
    len: "7 days",
    women: false,
    coach: "Klemen Becan",
    blurb: "Tufas, caves and endless single-pitch on the Aegean's most generous limestone."
  }, {
    id: 2,
    name: "Siurana Pro Clinic",
    discipline: "Sport",
    level: "Advanced",
    grade: "7a–8c",
    country: "Spain",
    len: "6 days",
    women: false,
    coach: "Daila Ojeda",
    blurb: "Crimp hard on vertical Catalan classics with a redpoint-focused pro coach."
  }, {
    id: 3,
    name: "Fontainebleau Bouldering",
    discipline: "Bouldering",
    level: "Intermediate",
    grade: "5–7a",
    country: "France",
    len: "5 days",
    women: false,
    coach: "Dave Graham",
    blurb: "Movement mastery on the sandstone that wrote the book on bouldering."
  }, {
    id: 4,
    name: "Women Crush Mallorca",
    discipline: "Sport",
    level: "Beginner–Int.",
    grade: "5a–7a",
    country: "Spain",
    len: "7 days",
    women: true,
    coach: "Alizée Dufraisse",
    blurb: "High-vibe, women-only sport climbing and a little deep-water solo."
  }, {
    id: 5,
    name: "Dolomites Multi-Pitch",
    discipline: "Multi-pitch",
    level: "Advanced",
    grade: "Up to 6c",
    country: "Italy",
    len: "8 days",
    women: false,
    coach: "Edu Marín",
    blurb: "Big walls, complex logistics and self-rescue on legendary alpine rock."
  }, {
    id: 6,
    name: "Learn to Lead — Arco",
    discipline: "Beginner",
    level: "Beginner",
    grade: "4–6a",
    country: "Italy",
    len: "5 days",
    women: false,
    coach: "Adam Ondra",
    blurb: "Plastic to plastic-free. Safe, seamless transition onto real rock."
  }, {
    id: 7,
    name: "Trad Foundations — Peak",
    discipline: "Trad",
    level: "Intermediate",
    grade: "VS–E2",
    country: "UK",
    len: "6 days",
    women: false,
    coach: "Klemen Becan",
    blurb: "Fast, bomber gear placement and anchor building on gritstone."
  }, {
    id: 8,
    name: "DWS Sardinia",
    discipline: "Bouldering",
    level: "All levels",
    grade: "Any",
    country: "Italy",
    len: "5 days",
    women: false,
    coach: "Daila Ojeda",
    blurb: "No ropes, warm water, pure send. Deep-water solo done right."
  }],
  disciplines: ["All", "Sport", "Bouldering", "Trad", "Multi-pitch", "Beginner"],
  coaches: [{
    name: "Adam Ondra",
    role: "Sport · Multi-pitch",
    note: "First 9c. Onsight machine."
  }, {
    name: "Daila Ojeda",
    role: "Sport · Redpoint",
    note: "Endurance & tactics specialist."
  }, {
    name: "Klemen Becan",
    role: "Sport · Trad",
    note: "Three decades, every style."
  }, {
    name: "Dave Graham",
    role: "Bouldering",
    note: "Movement & power genius."
  }, {
    name: "Edu Marín",
    role: "Multi-pitch · Big wall",
    note: "Big-wall logistics master."
  }, {
    name: "Alizée Dufraisse",
    role: "Sport · Coaching",
    note: "Mental game & technique."
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/data.js", error: String((e && e.message) || e) }); }

// ui_kits/website/util.jsx
try { (() => {
// Shared helpers for the Rockbusters website UI kit.

// Lucide icon renderer
function Ic({
  name,
  size = 20,
  color = "currentColor",
  strokeWidth = 2,
  style = {}
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current && window.lucide) {
      ref.current.innerHTML = "";
      const el = document.createElement("i");
      el.setAttribute("data-lucide", name);
      ref.current.appendChild(el);
      window.lucide.createIcons({
        attrs: {
          width: size,
          height: size,
          stroke: color,
          "stroke-width": strokeWidth
        }
      });
    }
  });
  return /*#__PURE__*/React.createElement("span", {
    ref: ref,
    style: {
      display: "inline-flex",
      lineHeight: 0,
      ...style
    }
  });
}

/**
 * Honest image placeholder — no invented photography. Grungy texture + icon + label.
 * Drop real climbing photos here in production.
 */
function Photo({
  label = "Photo",
  icon = "mountain",
  ratio = "4 / 3",
  tone = "dark",
  style = {}
}) {
  const dark = tone === "dark";
  return /*#__PURE__*/React.createElement("div", {
    style: {
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
      ...style
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: icon,
    size: 26
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.12em",
      fontSize: 10
    }
  }, label));
}
Object.assign(window, {
  Ic,
  Photo
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/util.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Eyebrow = __ds_scope.Eyebrow;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Stat = __ds_scope.Stat;

__ds_ns.Tag = __ds_scope.Tag;

})();
