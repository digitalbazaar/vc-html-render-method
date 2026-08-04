/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {HtmlRenderer} from '@digitalbazaar/vc-html-renderer';

const READY_TEMPLATE =
  'data:text/html,<h1>x</h1>' +
  '<script>window.renderMethodReady()</script>';

function makeCredential({template = READY_TEMPLATE} = {}) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'],
    type: ['VerifiableCredential'],
    credentialSubject: {name: 'Ada'},
    renderMethod: {
      type: 'TemplateRenderMethod', renderSuite: 'html', template
    }
  };
}

describe('lifecycle', function() {
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

  it('emits a loaded event', async () => {
    handle = new HtmlRenderer().render({mount, credential: makeCredential()});
    let loaded = false;
    handle.on('loaded', () => {
      loaded = true;
    });
    await handle.ready;
    await new Promise(resolve => setTimeout(resolve, 100));
    loaded.should.equal(true);
  });

  it('off() stops delivering an event', async () => {
    handle = new HtmlRenderer().render({mount, credential: makeCredential()});
    let removed = 0;
    let kept = 0;
    const onRemoved = () => {
      removed++;
    };
    handle.on('resize', onRemoved);
    handle.on('resize', () => {
      kept++;
    });
    handle.off('resize', onRemoved);
    await handle.ready;
    await new Promise(resolve => setTimeout(resolve, 300));
    removed.should.equal(0);
    kept.should.be.above(0);
  });

  it('reuses one renderer instance for multiple renders', async () => {
    const renderer = new HtmlRenderer();
    const mountA = document.createElement('div');
    const mountB = document.createElement('div');
    document.body.appendChild(mountA);
    document.body.appendChild(mountB);
    const a = renderer.render({mount: mountA, credential: makeCredential()});
    const b = renderer.render({mount: mountB, credential: makeCredential()});
    await Promise.all([a.ready, b.ready]);
    a.should.not.equal(b);
    should.exist(mountA.querySelector('iframe'));
    should.exist(mountB.querySelector('iframe'));
    a.destroy();
    b.destroy();
    mountA.remove();
    mountB.remove();
  });

  it('rejects ready when destroyed before it settles', async () => {
    // never signals, and waitForReady disables the load fallback
    const credential = makeCredential({template: 'data:text/html,<h1>x</h1>'});
    handle = new HtmlRenderer({waitForReady: true, timeout: 5000})
      .render({mount, credential});
    let error;
    const settled = handle.ready.catch(e => {
      error = e;
    });
    handle.destroy();
    await settled;
    should.exist(error);
    error.message.should.include('destroyed');
    handle = null;
  });
});
