import * as osSpy from 'os';
import { getSuitableNetworkInterfaces } from '../network';

describe('@ionic/cli-utils', () => {

  describe('lib/utils/network', () => {

    describe('getSuitableNetworkInterfaces', () => {

      const networkInterfaces1 = {};

      const networkInterfaces2 = {
        lo: [
          { internal: true, family: 'IPv4' },
        ],
        eth0: [
          { internal: false, family: 'IPv6' },
        ],
      };

      const networkInterfaces3 = {
        lo: [
          ...networkInterfaces2.lo,
        ],
        eth0: [
          { internal: false, family: 'IPv4' },
          ...networkInterfaces2.eth0,
        ],
      };

      it('should return empty array if no network interfaces', () => {
        spyOn(osSpy, 'networkInterfaces').and.callFake(() => networkInterfaces1);
        const result = getSuitableNetworkInterfaces();
        expect(result).toEqual([]);
      });

      it('should return empty array if unsuitable network interfaces found', () => {
        spyOn(osSpy, 'networkInterfaces').and.callFake(() => networkInterfaces2);
        const result = getSuitableNetworkInterfaces();
        expect(result).toEqual([]);
      });

      it('should find the suitable network interface', () => {
        spyOn(osSpy, 'networkInterfaces').and.callFake(() => networkInterfaces3);
        const result = getSuitableNetworkInterfaces();
        expect(result.length).toEqual(1);
        expect(result[0].deviceName).toEqual('eth0');
      });

    });

  });

});
