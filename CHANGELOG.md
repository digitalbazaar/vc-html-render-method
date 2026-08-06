# @digitalbazaar/vc-html-render-method ChangeLog

## 0.1.0 - 2026-XX-XX

- Initial release: render Verifiable Credential HTML Render Methods in a
  nested, sandboxed iframe (framework-agnostic; the consuming app's CSP is
  untouched).
- `HtmlRenderer` render API: a `ready` promise, `resize`/`error`/`loaded`
  events, and `destroy()`.
- Selective disclosure (`renderProperty` via `selectJsonLd`),
  `renderMethodReady()` over a `MessageChannel`, and `outputPreference.style`
  sizing.
