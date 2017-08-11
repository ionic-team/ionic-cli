import { ERROR_SSH_INVALID_PUBKEY, parsePublicKey } from '../ssh';

describe('@ionic/cli-utils', () => {

  describe('lib/ssh', () => {

    describe('parsePublicKey', () => {

      const valids = [
        'AAAAB3NzaC1yc2EAAAABJQAAAQEAiDDC3iewOnn2kXbfOu2/LdHEiTFQoJufcSBzZ0COogvehg3L72biGeQD19nNvF3Ou05II5UGxVbpQG5yYOwH42AVVZf7fqUTjQEm7ig1SLMwJ9QsGw9CVSgpgVDnm3t7mgcVyOT+sp2lYxqPLzYakVE2OSBjzBRyau210FYIxbA4s4pJlFOcfJUmrnYwibUe6JqpXrSF0H1IGRE8ZR+Ck8GVAwyiMeOK5ea1gQ50khy+KuvRG+6+lYaAsUXDGCOaZIbHJwnMuVp50sObne1doX9rhYwYWXtcjsr5U+/HGEHWi2z12vE2Cd4wirEHP3ROzsWn51hmqJj4nDvYt4MtZQ==',
        'AAAAB3NzaC1yc2EAAAADAQABAAABAQDqQmHXeWG737iR40rMO5enlhHMTGTmTi4Kehql9TxheN1PPujeBlQk6Kl0ylYDjPqqUBrSxq/tdxHyyF8h5QD+L5uO9PHyEVLoNCE0gYRhvSupf6K4EhZNz91KVYchRNZcldt6esf6KQfZIF20fNKLnIBJ5rkGO3vJJJkDZIBMH3IzMI7DUyZIA3RBE7wzfbSaZC3X87GWxS3IYM31IdFHXlKwBNFQpv4PKZ3RAeLRHpSuiyXlIuBWE7KEJCxcbDSFSTc3oFNUkwQACSfDze9Gt2T3zCowVB+G5k1pTpBunmMb6uXdzcqAzR41M2cpbbqRCpRmqzbW8psUbcsyTMM5',
      ];

      const invalids = [
        'asdf',
      ];

      const fmt = (bytes: string, annotation?: string) => `ssh-rsa ${bytes}${annotation ? ' ' + annotation : ''}`;

      it('should parse valid public keys', async () => {
        for (let valid of valids) {
          const formatted = fmt(valid, 'super');
          const results = await parsePublicKey(formatted);
          expect(results).toEqual([formatted, 'ssh-rsa', valid, 'super']);
        }
      });

      it('should parse valid public keys with no annotation', async () => {
        for (let valid of valids) {
          const formatted = fmt(valid);
          const results = await parsePublicKey(formatted);
          expect(results).toEqual([formatted, 'ssh-rsa', valid, '']);
        }
      });

      it('should throw error for invalid public keys', async () => {
        for (let valid of valids) {
          expect(() => parsePublicKey(fmt(valid)).rejects.toBe(ERROR_SSH_INVALID_PUBKEY);
        }
      });

    });

  });

});
