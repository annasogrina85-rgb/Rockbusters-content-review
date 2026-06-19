Filter / category chip — for discipline filters (Sport, Bouldering, Trad…) or selectable lists.

```jsx
<Tag active onClick={() => {}}>Sport climbing</Tag>
<Tag>Bouldering</Tag>
```

Outline by default; fills ink-black when `active`. Pass `onClick` (or `as="button"`) to make it interactive — it then darkens on hover.
