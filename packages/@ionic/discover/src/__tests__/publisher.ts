import { Publisher, prepareInterfaces } from '../publisher';
import { NetworkInterfaceInfo } from 'os';

const os = require('os');

describe('publisher', () => {
  it('create', () => {
    const p = new Publisher('devapp', 'conference-app', 8100);
    p.on('error', () => {});
    expect((p as any).client).toBeUndefined();
    expect(p.namespace).toEqual('devapp');
    expect(p.name).toEqual('conference-app');
    expect((p as any).interval).toEqual(2000);
    expect(p.path).toEqual('/');
    expect(p.port).toEqual(8100);
    expect(p.id.length).toBeGreaterThan(0);
    expect(p.running).toBeFalsy();
  });

  it('start', async () => {
    const p = new Publisher('devapp', 'conference-app', 8100);
    p.on('error', () => {});
    await p.start();
    expect((p as any).timer).toBeDefined();
    p.stop();
    expect((p as any).timer).toBeUndefined();
  }, 1000);

  it('start/stop', async () => {
    const p = new Publisher('devapp', 'conference-app', 8100);
    p.on('error', () => {});
    await p.start();
    expect(p.running).toBeTruthy();
    expect((p as any).client).toBeDefined();

    p.stop();
    expect(p.running).toBeFalsy();
    expect((p as any).client).toBeUndefined();

  }, 1000);

  it('buildMessage', () => {
    const p = new Publisher('devapp', 'conference-app', 8100);
    p.on('error', () => {});
    (p as any).path = '/?devapp=true';
    const message = (p as any).buildMessage('192.168.0.1');
    expect(message.t).toEqual(expect.any(Number));
    const expected = {
      t: message.t,
      id: p.id,
      nspace: 'devapp',
      name: 'conference-app',
      host: os.hostname(),
      ip: '192.168.0.1',
      port: 8100,
      path: '/?devapp=true'
    };
    expect(message).toEqual(expected);
  });

});

it('prepareInterfaces', () => {
  const iface1: NetworkInterfaceInfo = {
    address: '192.168.0.2',
    netmask: '255.255.0.0',
    family: 'IPv4',
    mac: '45:45:45:45:45:45',
    internal: false,
  };
  const iface2: NetworkInterfaceInfo = { ...iface1, address: '193.168.0.3', internal: true };
  const iface3: NetworkInterfaceInfo = { ...iface1, address: '194.168.0.4', family: 'IPv6', scopeid: 0 };
  const iface4: NetworkInterfaceInfo = { ...iface1, address: '192.168.0.22' };
  const iface5: NetworkInterfaceInfo = { ...iface1, address: '195.168.0.5' };

  const output = prepareInterfaces({
    'en0': [iface1, iface2, iface3],
    'lo': [iface4, iface5]
  });

  expect(output).toEqual([{
    address: '192.168.0.2',
    broadcast: '192.168.255.255'
  }, {
    address: '193.168.0.3',
    broadcast: '193.168.255.255'
  }, {
    address: '195.168.0.5',
    broadcast: '195.168.255.255'
  }]);
});

