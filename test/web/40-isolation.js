/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {HtmlRenderer} from '@bedrock/web-vc-html-renderer';

// a template that probes its own isolation, then reports to `window.top`:
//  - can it read `window.top` / the parent host frame? (must not)
//  - do `fetch` and `<iframe src>` trip the template-frame CSP? (must)
const ISOLATION_TEMPLATE = 'data:text/html,' + `
<script>
window.__violations = [];
document.addEventListener('securitypolicyviolation', function(e) {
  window.__violations.push(e.violatedDirective);
});
</script>
<script>
(function() {
  var d = {reachedTop: false, reachedParent: false};
  try { void window.top.location.href; d.reachedTop = true; } catch(e) {}
  try { void window.parent.document; d.reachedParent = true; } catch(e) {}
  fetch('https://example.com/x').catch(function() {});
  var f = document.createElement('iframe');
  f.src = 'https://example.com/';
  document.body.appendChild(f);
  setTimeout(function() {
    d.violations = window.__violations.slice();
    window.top.postMessage({__iso: d}, '*');
    window.renderMethodReady();
  }, 100);
})();
</script>`;

const ISOLATION_CREDENTIAL = {
  '@context': ['https://www.w3.org/ns/credentials/v2'],
  type: ['VerifiableCredential'],
  credentialSubject: {name: 'Ada'},
  renderMethod: {
    type: 'TemplateRenderMethod', renderSuite: 'html',
    template: ISOLATION_TEMPLATE
  }
};

describe('isolation', function() {
  let mount;
  let handle;
  let diag;

  before(async function() {
    mount = document.createElement('div');
    document.body.appendChild(mount);
    // render, and resolve once the template reports its probe results
    diag = await new Promise(resolve => {
      // the template posts to `window.top`; under karma the spec runs in an
      // iframe, so listen on the top window (same-origin) rather than `window`
      function onMessage(event) {
        if(event.data && event.data.__iso) {
          window.top.removeEventListener('message', onMessage);
          // clone into this realm: the payload comes from `window.top`, so its
          // arrays lack this realm's chai `should` augmentation otherwise
          resolve(JSON.parse(JSON.stringify(event.data.__iso)));
        }
      }
      window.top.addEventListener('message', onMessage);
      handle = new HtmlRenderer().render({
        mount, credential: ISOLATION_CREDENTIAL
      });
    });
  });

  after(function() {
    if(handle) {
      handle.destroy();
      handle = null;
    }
    if(mount && mount.parentNode) {
      mount.parentNode.removeChild(mount);
    }
    mount = null;
  });

  it('cannot read window.top', function() {
    diag.reachedTop.should.equal(false);
  });

  it('cannot read the parent host frame', function() {
    diag.reachedParent.should.equal(false);
  });

  it('is blocked from network fetch by CSP', function() {
    diag.violations.should.include('connect-src');
  });

  it('is blocked from framing external content by CSP', function() {
    diag.violations.should.include('frame-src');
  });
});
