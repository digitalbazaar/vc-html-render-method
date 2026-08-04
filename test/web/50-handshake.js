/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {HtmlRenderer} from '@bedrock/web-vc-html-renderer';

// never calls renderMethodReady()
const NO_SIGNAL_TEMPLATE = 'data:text/html,<h1>no signal</h1>';
// signals synchronously during parse (before the port is transferred)
const SYNC_READY_TEMPLATE =
  'data:text/html,<h1>x</h1>' +
  '<script>window.renderMethodReady()</script>';
// signals after a short delay
const DELAYED_READY_TEMPLATE =
  'data:text/html,<script>' +
  'setTimeout(function() { window.renderMethodReady(); }, 100)</script>';

function makeCredential({template}) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'],
    type: ['VerifiableCredential'],
    credentialSubject: {name: 'Ada'},
    renderMethod: {
      type: 'TemplateRenderMethod', renderSuite: 'html', template
    }
  };
}

describe('handshake', function() {
  let mount;
  let handle;

  beforeEach(() => {
    mount = document.createElement('div');
    document.body.appendChild(mount);
  });

  afterEach(() => {
    if(handle) {
      handle.destroy();
      handle = null;
    }
    if(mount && mount.parentNode) {
      mount.parentNode.removeChild(mount);
    }
    mount = null;
  });

  it('resolves via the load fallback when the template does not signal',
    async () => {
      const credential = makeCredential({template: NO_SIGNAL_TEMPLATE});
      handle = new HtmlRenderer().render({mount, credential});
      const result = await handle.ready;
      result.should.equal(handle);
    });

  it('buffers a synchronous renderMethodReady() before the port arrives',
    async () => {
      const credential = makeCredential({template: SYNC_READY_TEMPLATE});
      // waitForReady disables the load fallback, so resolution can only come
      // from the pre-port signal being buffered and later flushed
      handle = new HtmlRenderer({waitForReady: true, timeout: 2000})
        .render({mount, credential});
      const result = await handle.ready;
      result.should.equal(handle);
    });

  it('rejects on timeout when waitForReady and no signal arrives',
    async () => {
      const credential = makeCredential({template: NO_SIGNAL_TEMPLATE});
      handle = new HtmlRenderer({waitForReady: true, timeout: 500})
        .render({mount, credential});
      let error;
      try {
        await handle.ready;
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.message.should.include('Timed out');
    });

  it('resolves under waitForReady once the template signals', async () => {
    const credential = makeCredential({template: DELAYED_READY_TEMPLATE});
    handle = new HtmlRenderer({waitForReady: true, timeout: 2000})
      .render({mount, credential});
    const result = await handle.ready;
    result.should.equal(handle);
  });
});
