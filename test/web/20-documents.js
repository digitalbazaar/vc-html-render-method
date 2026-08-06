/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {createHostDocument, createTemplateDocument}
  from '@digitalbazaar/vc-html-render-method';

const CREDENTIAL = {
  '@context': ['https://www.w3.org/ns/credentials/v2'],
  type: ['VerifiableCredential'],
  issuer: {id: 'did:example:123', name: 'The Issuer'},
  credentialSubject: {name: 'Ada', secret: 'do-not-expose'}
};

function htmlRenderMethod({template, renderProperty} = {}) {
  const renderMethod = {
    type: 'TemplateRenderMethod',
    renderSuite: 'html',
    template: template || 'data:text/html,<h1>hi</h1>'
  };
  if(renderProperty) {
    renderMethod.renderProperty = renderProperty;
  }
  return renderMethod;
}

describe('documents', function() {
  describe('createTemplateDocument()', function() {
    it('applies the template-frame CSP', async () => {
      const renderMethod = htmlRenderMethod();
      const doc =
        createTemplateDocument({credential: CREDENTIAL, renderMethod});
      doc.should.include(`default-src data: 'unsafe-inline'`);
    });
    it('embeds the credential in an application/vc data block', async () => {
      const renderMethod = htmlRenderMethod();
      const doc =
        createTemplateDocument({credential: CREDENTIAL, renderMethod});
      doc.should.include('type="application/vc"');
    });
    it('embeds only the filtered credential fields', async () => {
      const renderMethod = htmlRenderMethod({renderProperty: ['/issuer/name']});
      const doc =
        createTemplateDocument({credential: CREDENTIAL, renderMethod});
      doc.should.include('The Issuer');
      doc.should.not.include('do-not-expose');
    });
    it('includes the template markup in the body', async () => {
      const renderMethod = htmlRenderMethod({
        template: 'data:text/html,<h1>PLAIN</h1>'
      });
      const doc =
        createTemplateDocument({credential: CREDENTIAL, renderMethod});
      doc.should.include('<h1>PLAIN</h1>');
    });
    it('decodes a base64 data: URL template', async () => {
      const template = 'data:text/html;base64,' + btoa('<h1>B64</h1>');
      const renderMethod = htmlRenderMethod({template});
      const doc =
        createTemplateDocument({credential: CREDENTIAL, renderMethod});
      doc.should.include('<h1>B64</h1>');
    });
    it('treats a non-data: string as raw HTML', async () => {
      const renderMethod = htmlRenderMethod({template: '<h1>RAW</h1>'});
      const doc =
        createTemplateDocument({credential: CREDENTIAL, renderMethod});
      doc.should.include('<h1>RAW</h1>');
    });
    it('neutralizes `</script>` in credential values', async () => {
      const credential = {
        ...CREDENTIAL,
        credentialSubject: {name: 'Ada', evil: '</script><img src=x>'}
      };
      // no renderProperty -> the whole credential is embedded
      const renderMethod = htmlRenderMethod();
      const doc = createTemplateDocument({credential, renderMethod});
      doc.should.include('\\u003c/script');
      doc.should.not.include('<img src=x>');
    });
    it('throws when the template is not a string', async () => {
      const fn = () => createTemplateDocument({
        credential: CREDENTIAL,
        renderMethod: {type: 'TemplateRenderMethod', renderSuite: 'html'}
      });
      fn.should.throw(TypeError);
    });
  });

  describe('createHostDocument()', function() {
    it('applies the host-frame CSP with frame-src none', async () => {
      const doc = createHostDocument();
      doc.should.include(`frame-src 'none'`);
      doc.should.include(`default-src 'none'`);
    });
    it('sets up a MessageChannel in the controller', async () => {
      createHostDocument().should.include('MessageChannel');
    });
  });
});
