import { MetadataGroup } from '@ionic/cli-framework';
import { mkdirp, pathExists, tmpfilepath, unlink, writeFile } from '@ionic/utils-fs';
import { prettyPath } from '@ionic/utils-terminal';
import * as lodash from 'lodash';
import * as path from 'path';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '../../definitions';
import { input, strong } from '../../lib/color';
import { DEFAULT_CONFIG_DIRECTORY } from '../../lib/config';
import { FatalException } from '../../lib/errors';

import { SSLBaseCommand } from './base';

const DEFAULT_BITS = '2048';
const DEFAULT_COUNTRY_NAME = 'US';
const DEFAULT_STATE_OR_PROVINCE_NAME = 'Wisconsin';
const DEFAULT_LOCALITY_NAME = 'Madison';
const DEFAULT_ORGANIZATION_NAME = 'Ionic';
const DEFAULT_COMMON_NAME = 'localhost';

interface OpenSSLConfig {
  bits: string;
  countryName: string;
  stateOrProvinceName: string;
  localityName: string;
  organizationName: string;
  commonName: string;
}

export class SSLGenerateCommand extends SSLBaseCommand implements CommandPreRun {
  getDefaultSslDirectory() {
    return this.project ? path.resolve(this.project.directory, '.ionic', 'ssl') :
      path.resolve(DEFAULT_CONFIG_DIRECTORY, 'ssl');
  }

  getDefaultKeyPath() {
    return path.resolve(this.getDefaultSslDirectory(), 'key.pem');
  }

  getDefaultCertPath() {
    return path.resolve(this.getDefaultSslDirectory(), 'cert.pem');
  }

  async getMetadata(): Promise<CommandMetadata> {
    const defaultSslDirectory = prettyPath(this.getDefaultSslDirectory())
    const defaultKeyPath = prettyPath(this.getDefaultKeyPath());
    const defaultCertPath = prettyPath(this.getDefaultCertPath());

    return {
      name: 'generate',
      type: 'project',
      summary: 'Generates an SSL key & certificate',
      // TODO: document how to add trusted certs
      description: `
Uses OpenSSL to create a self-signed certificate for ${strong('localhost')} (by default).

After the certificate is generated, you will still need to add it to your system or browser as a trusted certificate.

The default directory for ${input('--key-path')} and ${input('--cert-path')} is ${input(defaultSslDirectory)}.

Deprecated. Developers should generate an SSL certificate locally and then configure it using their project tooling such as Vite or Angular CLI.
      `,
      options: [
        {
          name: 'key-path',
          summary: 'Destination of private key file',
          default: defaultKeyPath,
          spec: { value: 'path' },
        },
        {
          name: 'cert-path',
          summary: 'Destination of certificate file',
          default: defaultCertPath,
          spec: { value: 'path' },
        },
        {
          name: 'country-name',
          summary: 'The country name (C) of the SSL certificate',
          default: DEFAULT_COUNTRY_NAME,
          groups: [MetadataGroup.ADVANCED],
          spec: { value: 'C' },
        },
        {
          name: 'state-or-province-name',
          summary: 'The state or province name (ST) of the SSL certificate',
          default: DEFAULT_STATE_OR_PROVINCE_NAME,
          groups: [MetadataGroup.ADVANCED],
          spec: { value: 'ST' },
        },
        {
          name: 'locality-name',
          summary: 'The locality name (L) of the SSL certificate',
          default: DEFAULT_LOCALITY_NAME,
          groups: [MetadataGroup.ADVANCED],
          spec: { value: 'L' },
        },
        {
          name: 'organization-name',
          summary: 'The organization name (O) of the SSL certificate',
          default: DEFAULT_ORGANIZATION_NAME,
          groups: [MetadataGroup.ADVANCED],
          spec: { value: 'O' },
        },
        {
          name: 'common-name',
          summary: 'The common name (CN) of the SSL certificate',
          default: DEFAULT_COMMON_NAME,
          groups: [MetadataGroup.ADVANCED],
          spec: { value: 'CN' },
        },
        {
          name: 'bits',
          summary: 'Number of bits in the key',
          aliases: ['b'],
          default: DEFAULT_BITS,
          groups: [MetadataGroup.ADVANCED],
        },
      ],
      groups: [MetadataGroup.DEPRECATED],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    await this.checkForOpenSSL();
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic ssl generate')} outside a project directory.`);
    }

    const keyPath = path.resolve(options['key-path'] ? String(options['key-path']) : this.getDefaultKeyPath());
    const keyPathDir = path.dirname(keyPath);
    const certPath = path.resolve(options['cert-path'] ? String(options['cert-path']) : this.getDefaultCertPath());
    const certPathDir = path.dirname(certPath);

    const bits = options['bits'] ? String(options['bits']) : DEFAULT_BITS;
    const countryName = options['country-name'] ? String(options['country-name']) : DEFAULT_COUNTRY_NAME;
    const stateOrProvinceName = options['state-or-province-name'] ? String(options['state-or-province-name']) : DEFAULT_STATE_OR_PROVINCE_NAME;
    const localityName = options['locality-name'] ? String(options['locality-name']) : DEFAULT_LOCALITY_NAME;
    const organizationName = options['organization-name'] ? String(options['organization-name']) : DEFAULT_ORGANIZATION_NAME;
    const commonName = options['common-name'] ? String(options['common-name']) : DEFAULT_COMMON_NAME;

    await this.ensureDirectory(keyPathDir);
    await this.ensureDirectory(certPathDir);

    const overwriteKeyPath = await this.checkExistingFile(keyPath);
    const overwriteCertPath = await this.checkExistingFile(certPath);

    if (overwriteKeyPath) {
      await unlink(keyPath);
    }

    if (overwriteCertPath) {
      await unlink(certPath);
    }

    const cnf = { bits, countryName, stateOrProvinceName, localityName, organizationName, commonName };
    const cnfPath = await this.writeConfig(cnf);

    await this.env.shell.run('openssl', ['req', '-x509', '-newkey', `rsa:${bits}`, '-nodes', '-subj', this.formatSubj(cnf), '-reqexts', 'SAN', '-extensions', 'SAN', '-config', cnfPath, '-days', '365', '-keyout', keyPath, '-out', certPath], {});

    this.env.log.nl();

    this.env.log.rawmsg(
      `Key:  ${strong(prettyPath(keyPath))}\n` +
      `Cert: ${strong(prettyPath(certPath))}\n\n`
    );

    this.env.log.ok('Generated key & certificate!');
  }

  private formatSubj(cnf: OpenSSLConfig) {
    const subjNames = new Map([
      ['countryName', 'C'],
      ['stateOrProvinceName', 'ST'],
      ['localityName', 'L'],
      ['organizationName', 'O'],
      ['commonName', 'CN'],
    ]);

    return '/' + lodash.toPairs(cnf).filter(([k]) => subjNames.has(k)).map(([k, v]) => `${subjNames.get(k)}=${v}`).join('/');
  }

  private async ensureDirectory(p: string) {
    if (!(await pathExists(p))) {
      await mkdirp(p, 0o700 as any);
      this.env.log.msg(`Created ${strong(prettyPath(p))} directory for you.`);
    }
  }

  private async checkExistingFile(p: string): Promise<boolean | undefined> {
    if (await pathExists(p)) {
      const confirm = await this.env.prompt({
        type: 'confirm',
        name: 'confirm',
        message: `Key ${strong(prettyPath(p))} exists. Overwrite?`,
      });

      if (confirm) {
        return true;
      } else {
        throw new FatalException(`Not overwriting ${strong(prettyPath(p))}.`);
      }
    }
  }

  private async writeConfig({ bits, countryName, stateOrProvinceName, localityName, organizationName, commonName }: OpenSSLConfig): Promise<string> {
    const cnf = `
[req]
default_bits       = ${bits}
distinguished_name = req_distinguished_name

[req_distinguished_name]
countryName                = ${countryName}
stateOrProvinceName        = ${stateOrProvinceName}
localityName               = ${localityName}
organizationName           = ${organizationName}
commonName                 = ${commonName}

[SAN]
subjectAltName=DNS:${commonName}
`.trim();

    const p = tmpfilepath('ionic-ssl');
    await writeFile(p, cnf, { encoding: 'utf8' });
    return p;
  }
}
