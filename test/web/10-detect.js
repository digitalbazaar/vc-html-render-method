/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {
  filterCredential, findHtmlRenderMethod, findHtmlRenderMethods, supportsHtml
} from '@bedrock/web-vc-html-renderer';

const HTML_RENDER_METHOD = {
  type: 'TemplateRenderMethod',
  renderSuite: 'html',
  renderProperty: ['/issuer/name', '/credentialSubject/name'],
  template: 'data:text/html,<h1>hi</h1>'
};

function makeCredential({renderMethod} = {}) {
  const credential = {
    '@context': ['https://www.w3.org/ns/credentials/v2'],
    type: ['VerifiableCredential'],
    issuer: {id: 'did:example:123', name: 'The Issuer'},
    credentialSubject: {name: 'Ada', secret: 'do-not-expose'}
  };
  if(renderMethod) {
    credential.renderMethod = renderMethod;
  }
  return credential;
}

describe('detection', function() {
  describe('supportsHtml()', function() {
    it('returns true for an html render method', async () => {
      const credential = makeCredential({renderMethod: HTML_RENDER_METHOD});
      supportsHtml({credential}).should.equal(true);
    });
    it('returns true when render methods are an array', async () => {
      const credential = makeCredential({
        renderMethod: [
          {type: 'SvgRenderingTemplate2024', template: '<svg/>'},
          HTML_RENDER_METHOD
        ]
      });
      supportsHtml({credential}).should.equal(true);
    });
    it('returns false when there is no render method', async () => {
      supportsHtml({credential: makeCredential()}).should.equal(false);
    });
    it('returns false for a non-html render suite', async () => {
      const credential = makeCredential({
        renderMethod: {type: 'SvgRenderingTemplate2024', template: '<svg/>'}
      });
      supportsHtml({credential}).should.equal(false);
    });
    it('returns false for a TemplateRenderMethod with a non-html renderSuite',
      async () => {
        const credential = makeCredential({
          renderMethod: {type: 'TemplateRenderMethod', renderSuite: 'svg',
            template: 'x'}
        });
        supportsHtml({credential}).should.equal(false);
      });
  });

  describe('findHtmlRenderMethod() / findHtmlRenderMethods()', function() {
    it('finds the first html render method', async () => {
      const credential = makeCredential({
        renderMethod: [
          {type: 'SvgRenderingTemplate2024', template: '<svg/>'},
          HTML_RENDER_METHOD
        ]
      });
      const renderMethod = findHtmlRenderMethod({credential});
      should.exist(renderMethod);
      renderMethod.renderSuite.should.equal('html');
    });
    it('returns null when none match', async () => {
      const renderMethod = findHtmlRenderMethod({credential: makeCredential()});
      should.equal(renderMethod, null);
    });
    it('returns all html render methods', async () => {
      const credential = makeCredential({
        renderMethod: [HTML_RENDER_METHOD, HTML_RENDER_METHOD]
      });
      findHtmlRenderMethods({credential}).length.should.equal(2);
    });
  });

  describe('filterCredential()', function() {
    it('selects only the renderProperty fields', async () => {
      const credential = makeCredential({renderMethod: HTML_RENDER_METHOD});
      const filtered = filterCredential({
        credential, renderMethod: HTML_RENDER_METHOD
      });
      filtered.issuer.name.should.equal('The Issuer');
      filtered.credentialSubject.name.should.equal('Ada');
      should.equal(filtered.credentialSubject.secret, undefined);
    });
    it('returns the whole credential when renderProperty is absent',
      async () => {
        const renderMethod = {
          type: 'TemplateRenderMethod', renderSuite: 'html',
          template: 'data:text/html,<h1>hi</h1>'
        };
        const credential = makeCredential({renderMethod});
        const filtered = filterCredential({credential, renderMethod});
        filtered.credentialSubject.secret.should.equal('do-not-expose');
      });
  });
});
