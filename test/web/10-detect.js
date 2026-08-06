/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {
  filterCredential, findHtmlRenderMethod, findHtmlRenderMethods, supportsHtml
} from '@digitalbazaar/vc-html-render-method';

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
    it('selects a nested field and drops its unselected siblings',
      async () => {
        const credential = {
          '@context': ['https://www.w3.org/ns/credentials/v2'],
          type: ['VerifiableCredential'],
          issuer: {id: 'did:example:123', name: 'The Issuer'},
          credentialSubject: {
            name: 'Ada',
            secret: 'do-not-expose',
            address: {city: 'London', zip: 'EC1', country: 'UK'}
          }
        };
        const renderMethod = {
          type: 'TemplateRenderMethod', renderSuite: 'html',
          renderProperty: ['/credentialSubject/address/city'],
          template: 'data:text/html,<h1>hi</h1>'
        };
        const filtered = filterCredential({credential, renderMethod});
        // the selected leaf is present
        filtered.credentialSubject.address.city.should.equal('London');
        // unselected siblings at every level are gone
        should.equal(filtered.credentialSubject.address.zip, undefined);
        should.equal(filtered.credentialSubject.address.country, undefined);
        should.equal(filtered.credentialSubject.name, undefined);
        should.equal(filtered.credentialSubject.secret, undefined);
        should.equal(filtered.issuer, undefined);
        // JSON-LD type is always propagated
        filtered.type.should.include('VerifiableCredential');
      });
    it('selects one array element and compacts the array', async () => {
      const credential = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['VerifiableCredential'],
        credentialSubject: {
          name: 'Ada',
          degrees: [
            {type: 'BachelorDegree', name: 'CS'},
            {type: 'MasterDegree', name: 'Math'}
          ]
        }
      };
      const renderMethod = {
        type: 'TemplateRenderMethod', renderSuite: 'html',
        renderProperty: ['/credentialSubject/degrees/1/name'],
        template: 'data:text/html,<h1>hi</h1>'
      };
      const filtered = filterCredential({credential, renderMethod});
      // only the selected element survives, and the array is made dense
      filtered.credentialSubject.degrees.length.should.equal(1);
      filtered.credentialSubject.degrees[0].name.should.equal('Math');
      // the element's type is carried along
      filtered.credentialSubject.degrees[0].type.should.equal('MasterDegree');
    });
  });
});
