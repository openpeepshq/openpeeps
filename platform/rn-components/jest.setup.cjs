// React 19 act() requires the act environment flag, or it warns on every
// act(). Set it once for the whole package instead of each render test file.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
