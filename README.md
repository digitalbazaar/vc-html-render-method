# @digitalbazaar/vc-html-renderer

Render a Verifiable Credential's **HTML Render Method** inside a nested,
sandboxed iframe — framework-agnostic, and without changing the consuming app's
own Content-Security-Policy.

This library implements the `html` render suite of the
[W3C VC Render Method specification](https://w3c.github.io/vc-render-method/#the-html-render-suite):
an issuer-supplied HTML/CSS/JS template is rendered against a filtered copy of
the credential, fully isolated from the host application.

## Why a nested iframe?

- The spec requires the page hosting the template to set a strict CSP
(`frame-src 'none'`). Applying that to a whole application would break other
`<iframe src>`-based features (for example CHAPI).
- This library instead places the spec's "host page" role inside an iframe it
owns, so the strict policy is scoped to that subtree and the consuming app's
CSP is never touched.

```text
App (any CSP; CHAPI <iframe src> keeps working)
  |-> host frame (library-owned; srcdoc)  CSP: frame-src 'none'
        |-> template frame  sandbox="allow-scripts", opaque origin
              CSP: default-src data: 'unsafe-inline'
              -> issuer HTML + filtered credential
```

The issuer template runs at an opaque origin under `allow-scripts` with no
network access; it cannot reach the host frame or the application.

## Install

```sh
npm install @digitalbazaar/vc-html-renderer
```

## Usage

```js
import {HtmlRenderer, supportsHtml} from '@digitalbazaar/vc-html-renderer';

if(supportsHtml({credential})) {
  const handle = new HtmlRenderer().render({
    mount: document.querySelector('#slot'),
    credential
  });

  // resolves when rendered
  await handle.ready;
  // frame auto-sizes to content
  handle.on('resize', ({height}) => {});
  // tear down when done
  handle.destroy();
}
```

The template runs at an opaque origin under `sandbox="allow-scripts"` with no
network access, so it cannot reach the host frame or the application. Before the
template runs, the credential is filtered to the render method's `renderProperty`
JSON pointers — the template only sees the fields the issuer exposed.

## Configuration

`new HtmlRenderer(options)` holds defaults for every render:

| Option | Type | Default | Description |
|---|---|---|---|
| `timeout` | `number` | `10000` | Milliseconds to wait for a ready/error signal before rejecting; `0` disables. |
| `sandbox` | `string` | `'allow-scripts'` | `sandbox` attribute for the template frame. |
| `waitForReady` | `boolean` | `false` | Require an explicit `renderMethodReady()`; do not treat frame `load` as success. |
| `signalGrace` | `number` | `250` | Milliseconds after `load` to wait for an explicit signal before treating load as success. |

`render({mount, credential, renderMethod?})` returns a handle
(`renderMethod` defaults to the first HTML render method on the credential):

| Member | Description |
|---|---|
| `handle.ready` | Promise that resolves on success; rejects on error, timeout, or `destroy()`. |
| `handle.element` | The rendered `<iframe>` element. |
| `handle.on(type, fn)` / `off(type, fn)` | Events: `ready`, `error` (`Error`), `resize` (`{width, height}`), `loaded`. |
| `handle.destroy()` | Remove the iframe and listeners; reject `ready` if still pending. |

A render method's `outputPreference.style` (`width`/`height`) is honored as a
fixed box; otherwise the frame auto-sizes to its content.

## Conformance

Conforms to the inline HTML render suite of the
[specification](https://w3c.github.io/vc-render-method/#the-html-render-suite)
(experimental, under active development):

- Security: host `frame-src 'none'`, template `sandbox="allow-scripts"`, wrapper
  `default-src data: 'unsafe-inline'`, no navigation/network/host access.
- Wrapper: headless template with the credential in an `application/vc` data
  block.
- Selective disclosure via `selectJsonLd` over `renderProperty`.
- `renderMethodReady()` handshake over a `MessageChannel`.
- `outputPreference.style` sizing preference.

## Roadmap

- Remote `template` fetch — only inline `data:` templates are supported today.
- `digestMultibase` template integrity verification (multibase `u`, SHA-2-256).
- The `template` map form `{id, mediaType, digestMultibase}`.
- `outputPreference.accessMode` and preferred `mediaType`.

## License

TBD.
