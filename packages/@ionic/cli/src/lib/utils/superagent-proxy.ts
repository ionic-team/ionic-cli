/**
 * (The MIT License)
 *
 * Copyright (c) 2013 Nathan Rajlich <nathan@tootallnate.net>
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * This is a fork of the original source, upgraded to proxy-agent v6 and TypeScript.
 * Original source: https://github.com/TooTallNate/superagent-proxy/blob/ef2cc112926b574547cf2f765ae3dfd80bdeb9a0/index.js
 *
 */
import { ProxyAgent } from 'proxy-agent';
import { debug as Debug } from 'debug';
import { SuperAgent, SuperAgentRequest } from 'superagent';

const debug = Debug('superagent-proxy');

/**
 * Adds a `.proxy(uri)` function to the "superagent" module's Request class.
 *
 * ``` js
 * var request = require('superagent');
 * require('superagent-proxy')(request);
 *
 * request
 *   .get(uri)
 *   .proxy(uri)
 *   .end(fn);
 * ```
 *
 * Or, you can pass in a `superagent.Request` instance, and it's like calling the
 * `.proxy(uri)` function on it, but without extending the prototype:
 *
 * ``` js
 * var request = require('superagent');
 * var proxy = require('superagent-proxy');
 *
 * proxy(request.get(uri), uri).end(fn);
 * ```
 *
 * @param {Object} superagent The `superagent` exports object
 * @api public
 */

export default function setup(superagent: any, uri?: string): SuperAgent<SuperAgentRequest> & { proxy: (uri?: string) => SuperAgent<SuperAgentRequest> } {
  const Request = superagent.Request;
  if (Request) {
    // the superagent exports object - extent Request with "proxy"
    Request.prototype.proxy = proxy;
    return superagent;
  } else {
    // assume it's a `superagent.Request` instance
    return proxy.call(superagent, uri);
  }
}

/**
 * Sets the proxy server to use for this HTTP(s) request.
 *
 * @param {String} uri proxy url
 * @api public
 */

function proxy(this: any, uri?: string) {
  debug('Request#proxy(%o)', uri);
  // we need to observe the `url` field from now on... Superagent sometimes
  // re-uses the `req` instance but changes its `url` field (i.e. in the case of
  // a redirect), so when that happens we need to potentially re-set the proxy
  // agent
  setupUrl(this);

  // attempt to get a proxying `http.Agent` instance
  const agent = new ProxyAgent(uri !== undefined ? { getProxyForUrl: () => uri } : {});

  // if we have an `http.Agent` instance then call the .agent() function
  if (agent) this.agent(agent);

  // store the proxy URI in case of changes to the `url` prop in the future
  this._proxyUri = uri;

  return this;
}

/**
 * Sets up a get/set descriptor for the `url` property of the provided `req`
 * Request instance. This is so that we can re-run the "proxy agent" logic when
 * the `url` field is changed, i.e. during a 302 Redirect scenario.
 *
 * @api private
 */

function setupUrl(req: any): void {
  var desc = Object.getOwnPropertyDescriptor(req, 'url');
  if (desc?.get == getUrl && desc?.set == setUrl) return; // already patched

  // save current value
  req._url = req.url;

  if (desc) {
    desc.get = getUrl;
    desc.set = setUrl;
    delete desc.value;
    delete desc.writable;

    Object.defineProperty(req, 'url', desc);
    debug('patched superagent Request "url" property for changes');
  }
}

/**
 * `url` property getter.
 *
 * @api protected
 */

function getUrl(this: any): string {
  return this._url;
}

/**
 * `url` property setter.
 *
 * @api protected
 */

function setUrl(this: any, v: string): void {
  debug('set `.url`: %o', v);
  this._url = v;
  proxy.call(this, this._proxyUri);
}
