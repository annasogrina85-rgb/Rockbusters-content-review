Bold uppercase pill button for primary actions — use the red `primary` variant once per view as the hero CTA.

```jsx
<Button variant="primary" size="lg" rightIcon={<ArrowRight size={18} />}>
  Find your next project
</Button>
```

Variants: `primary` (red), `dark` (black), `outline` (on light), `outline-invert` (on dark/photo), `ghost` (link-like). Sizes: `sm` / `md` / `lg`. Props: `fullWidth`, `disabled`, `leftIcon`, `rightIcon`. Label text should be short and active — verbs, climbing voice ("Start sending", "Book a camp"). Hover darkens + lifts 1px; press scales to 0.97.
