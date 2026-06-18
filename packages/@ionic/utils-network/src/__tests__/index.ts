import osSpy from 'os';
import { getExternalIPv4Interfaces } from '../';

describe('@ionic/utils-network', () => {

  describe('getExternalIPv4Interfaces', () => {

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
      jest.spyOn(osSpy, 'networkInterfaces').mockImplementation(() => networkInterfaces1 as any);
      const result = getExternalIPv4Interfaces();
      expect(result).toEqual([]);
    });

    it('should return empty array if unsuitable network interfaces found', () => {
      jest.spyOn(osSpy, 'networkInterfaces').mockImplementation(() => networkInterfaces2 as any);
      const result = getExternalIPv4Interfaces();
      expect(result).toEqual([]);
    });

    it('should find the suitable network interface', () => {
      jest.spyOn(osSpy, 'networkInterfaces').mockImplementation(() => networkInterfaces3 as any);
      const result = getExternalIPv4Interfaces();
      expect(result.length).toEqual(1);
      expect(result[0].device).toEqual('eth0');
    });

  });

});
