/*!
 * Copyright (c) 2026 Digital Bazaar, Inc.
 */
import {config} from '@bedrock/core';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// run the browser specs under `web/`
config.karma.suites['vc-html-renderer'] =
  path.join('web', '**', '*.js');

// resolve the linked library (`file:..`) and its deps for the browser bundle
config.karma.config.webpack.resolve = {
  modules: [
    'node_modules',
    path.resolve(__dirname, '..', 'node_modules'),
    path.resolve(__dirname, 'node_modules')
  ],
  fallback: {
    crypto: false
  }
};
