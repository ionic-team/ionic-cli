import * as expressType from 'express';
import * as globWatcherType from 'glob-watcher';
import * as opnType from 'opn';
import * as proxyMiddlewareType from 'proxy-middleware';
import * as tinylrType from 'tiny-lr';
import * as xml2jsType from 'xml2js';

export function load(modulePath: 'express'): typeof expressType;
export function load(modulePath: 'glob-watcher'): typeof globWatcherType;
export function load(modulePath: 'opn'): typeof opnType;
export function load(modulePath: 'proxy-middleware'): typeof proxyMiddlewareType;
export function load(modulePath: 'tiny-lr'): typeof tinylrType;
export function load(modulePath: 'xml2js'): typeof xml2jsType;
export function load(modulePath: string): any {
  return require(modulePath);
}
