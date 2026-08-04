/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {HtmlRenderer} from '@digitalbazaar/vc-html-renderer';

const READY_TEMPLATE =
  'data:text/html,<h1 id="card">CARD</h1>' +
  '<script>window.renderMethodReady()</script>';

function makeCredential({
  template = READY_TEMPLATE, renderProperty, outputPreference
} = {}) {
  const renderMethod = {
    type: 'TemplateRenderMethod', renderSuite: 'html', template
  };
  if(renderProperty) {
    renderMethod.renderProperty = renderProperty;
  }
  if(outputPreference) {
    renderMethod.outputPreference = outputPreference;
  }
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'],
    type: ['VerifiableCredential'],
    issuer: {name: 'The Issuer'},
    credentialSubject: {name: 'Ada'},
    renderMethod
  };
}

describe('HtmlRenderer', function() {
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

  it('resolves ready and mounts an iframe', async () => {
    handle = new HtmlRenderer().render({mount, credential: makeCredential()});
    const result = await handle.ready;
    result.should.equal(handle);
    handle.element.tagName.should.equal('IFRAME');
    mount.contains(handle.element).should.equal(true);
  });

  it('nests a sandboxed template frame', async () => {
    handle = new HtmlRenderer().render({mount, credential: makeCredential()});
    await handle.ready;
    // the outer host frame is same-origin; read into it for the inner frame
    const innerFrame = handle.element.contentDocument.querySelector('iframe');
    should.exist(innerFrame);
    innerFrame.getAttribute('sandbox').should.equal('allow-scripts');
  });

  it('auto-sizes the frame to its content', async () => {
    handle = new HtmlRenderer().render({mount, credential: makeCredential()});
    await handle.ready;
    // allow the resize message to be applied
    await new Promise(resolve => setTimeout(resolve, 300));
    const height = parseInt(handle.element.style.height || '0', 10);
    height.should.be.above(0);
  });

  it('honors outputPreference.style as a fixed box', async () => {
    const credential = makeCredential({
      outputPreference: {style: {width: '640px', height: '480px'}}
    });
    handle = new HtmlRenderer().render({mount, credential});
    await handle.ready;
    handle.element.style.width.should.equal('640px');
    handle.element.style.height.should.equal('480px');
  });

  it('emits a resize event', async () => {
    handle = new HtmlRenderer().render({mount, credential: makeCredential()});
    let resized = false;
    handle.on('resize', () => {
      resized = true;
    });
    await handle.ready;
    await new Promise(resolve => setTimeout(resolve, 300));
    resized.should.equal(true);
  });

  it('rejects when the template signals an error', async () => {
    const template =
      'data:text/html,<script>' +
      'window.renderMethodReady(new Error("boom"))</script>';
    const credential = makeCredential({template});
    handle = new HtmlRenderer().render({mount, credential});
    let error;
    try {
      await handle.ready;
    } catch(e) {
      error = e;
    }
    should.exist(error);
    error.message.should.equal('boom');
  });

  it('throws when the credential has no html render method', async () => {
    const credential = {
      '@context': ['https://www.w3.org/ns/credentials/v2'],
      type: ['VerifiableCredential'],
      credentialSubject: {name: 'Ada'}
    };
    let error;
    try {
      new HtmlRenderer().render({mount, credential});
    } catch(e) {
      error = e;
    }
    should.exist(error);
  });

  it('throws when mount is not an element', async () => {
    let error;
    try {
      new HtmlRenderer().render({mount: null, credential: makeCredential()});
    } catch(e) {
      error = e;
    }
    should.exist(error);
    error.should.be.instanceof(TypeError);
  });

  it('destroy() removes the iframe', async () => {
    handle = new HtmlRenderer().render({mount, credential: makeCredential()});
    await handle.ready;
    handle.destroy();
    should.not.exist(mount.querySelector('iframe'));
    // already destroyed; prevent afterEach from destroying again
    handle = null;
  });
});
