@import url("https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap");

* {
  box-sizing: border-box;
}

html,
body {
  padding: 0;
  margin: 0;
  background: #edeae2;
  color: #21231f;
  font-family: "IBM Plex Sans", sans-serif;
}

::placeholder {
  color: #a6a296;
}

button {
  font-family: inherit;
}

button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid #34506b;
  outline-offset: 1px;
}

@media print {
  .no-print {
    display: none !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
  }
}

/* ---- Responsive layout helpers ---- */
.field-row {
  display: flex;
  gap: 12px;
}
.field-row > * {
  flex: 1 1 140px;
  min-width: 0;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.material-grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
  margin-bottom: 6px;
}

.material-grid-3b {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 6px;
  align-items: center;
}

@media (max-width: 520px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 420px) {
  .field-row {
    flex-wrap: wrap;
  }
  .material-grid-3 {
    grid-template-columns: 1fr 1fr;
  }
  .material-grid-3b {
    grid-template-columns: 1fr 1fr;
  }
  .material-grid-3b > button {
    grid-column: span 2;
    justify-self: end;
  }
}
