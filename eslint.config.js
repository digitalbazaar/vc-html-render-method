/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import browserConfig from '@digitalbazaar/eslint-config/browser-recommended';

export default [
  {
    ignores: ['dist/**']
  },
  ...browserConfig,
  {
    // browser test specs also use mocha + chai `should` globals
    files: ['test/web/**/*.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        before: 'readonly',
        after: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        should: 'readonly'
      }
    }
  }
];
