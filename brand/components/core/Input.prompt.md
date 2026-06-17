Text input for forms (booking enquiry, newsletter). Uppercase label, 2px border, red focus ring.

```jsx
<Input label="Email" type="email" placeholder="you@send.it" />
<Input label="Phone" invalid hint="Required" />
```

Pass `invalid` for error state (red border + red hint). Use the standard `placeholder`, `value`, `onChange` props.
