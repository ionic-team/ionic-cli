import { Publisher, prepareInterfaces } from './publisher';
const os = require('os');

const FAKE_INTERFACE = {
  address: '192.168.0.1',
  netmask: '255.255.0.0',
  family: 'IPv4',
  mac: '45:45:45:45:45:45',
  internal: false,
  broadcast: '192.168.255.255'
};

describe('publisher', () => {
  it('create', () => {
    const p = new Publisher('devapp', 'conference-app', 8100);
    expect(p.client).toBeUndefined();
    expect(p.namespace).toBe('devapp');
    expect(p.name).toBe('conference-app');
    expect(p.interval).toBe(2000);
    expect(p.path).toBe('/');
    expect(p.port).toBe(8100);
    expect(p.id.length).toBeGreaterThan(0);
    expect(p.running).toBeFalsy();
  });

  it('start', async () => {
    const p = new Publisher('devapp', 'conference-app', 8100);
    await p.start();
    expect(p.timer).toBeDefined();
    p.stop();
    expect(p.timer).toBeUndefined();
  }, 1000);

  it('start/stop', async () => {
    const p = new Publisher('devapp', 'conference-app', 8100);
    await p.start();
    expect(p.running).toBeTruthy();
    expect(p.client).toBeDefined();

    p.stop();
    expect(p.running).toBeFalsy();
    expect(p.client).toBeUndefined();

  }, 1000);

  it('buildMessage', () => {
    const p = new Publisher('devapp', 'conference-app', 8100);
    p.path = '/?devapp=true';
    const now = Date.now();
    const message = p.buildMessage('192.168.0.1');
    const expected = 'ION_DP' + JSON.stringify({
      t: now,
      id: p.id,
      nspace: 'devapp',
      name: 'conference-app',
      host: os.hostname(),
      ip: '192.168.0.1',
      port: 8100,
      path: '/?devapp=true'
    });
    expect(message).toBe(expected);
  });

});

it('prepareInterfaces', () => {
  const iface1 = {
    address: '192.168.0.2',
    netmask: '255.255.0.0',
    family: 'IPv4',
    mac: '45:45:45:45:45:45',
    internal: false,
  };
  const iface2 = Object.assign({}, iface1);
  iface2.address = '193.168.0.3';
  iface2.internal = true;
  const iface3 = Object.assign({}, iface1);
  iface3.address = '194.168.0.4';
  iface3.family = 'IPv6';
  const iface4 = Object.assign({}, iface1);
  iface4.address = '192.168.0.22';
  const iface5 = Object.assign({}, iface1);
  iface5.address = '195.168.0.5';

  const output = prepareInterfaces({
    'en0': [iface1, iface2, iface3],
    'lo': [iface4, iface5]
  });
  expect(JSON.stringify(output)).toBe(JSON.stringify([{
    address: '192.168.0.2',
    broadcast: '192.168.255.255'
  }, {
    address: '193.168.0.3',
    broadcast: '193.168.255.255'
  }, {
    address: '195.168.0.5',
    broadcast: '195.168.255.255'
  }]));
});

