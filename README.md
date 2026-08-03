# @bedrock/web-vc-html-renderer

Render a Verifiable Credential's **HTML Render Method** inside a nested,
sandboxed iframe — framework-agnostic, and without changing the consuming app's
own Content-Security-Policy.

This library implements the `html` render suite of the
[W3C VC Render Method specification](https://w3c.github.io/vc-render-method/#the-html-render-suite):
an issuer-supplied HTML/CSS/JS template is rendered against a filtered copy of
the credential, fully isolated from the host application.
