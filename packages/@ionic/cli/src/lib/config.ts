import { BaseConfig, BaseConfigOptions, MetadataGroup, ParsedArgs, metadataOptionsToParseArgsOptions, parseArgs } from '@ionic/cli-framework';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

import { CommandMetadataOption, ConfigFile, CreateRequestOptions, IConfig, OAuthServerConfig } from '../definitions';

export const GLOBAL_OPTIONS: readonly CommandMetadataOption[] = [
  {
    name: 'help',
    summary: 'Display help for commands',
    aliases: ['h'],
    type: Boolean,
    groups: [MetadataGroup.HIDDEN],
  },
  {
    name: 'verbose',
    summary: 'Print debug log messages',
    type: Boolean,
  },
  {
    name: 'quiet',
    summary: 'Only print warning and error log messages',
    type: Boolean,
  },
  {
    name: 'interactive',
    summary: 'Disable interactivity such as progress indicators and prompts',
    type: Boolean,
    default: true,
  },
  {
    name: 'color',
    summary: 'Disable colors in stdout',
    type: Boolean,
    default: true,
  },
  {
    name: 'confirm',
    summary: 'Automatically answer YES to confirmation prompts',
    type: Boolean,
  },
  {
    name: 'project',
    summary: 'The project ID to use in a multi-app configuration setup',
    groups: [MetadataGroup.HIDDEN],
  },
  {
    name: 'json',
    summary: 'Use JSON when operating with stdout, if possible',
    type: Boolean,
    groups: [MetadataGroup.HIDDEN],
  },
];

export const CONFIG_FILE = 'config.json';
export const DEFAULT_CONFIG_DIRECTORY = findDefaultConfigDir();

function findDefaultConfigDir() {
  const fallback = path.resolve(os.homedir(), '.ionic');
  if (fs.existsSync(fallback)) return fallback;

  if (process.env.XDG_CONFIG_HOME) {
    return path.resolve(process.env.XDG_CONFIG_HOME, 'ionic');
  } else {
    return fallback;
  }
}

export class Config extends BaseConfig<ConfigFile> implements IConfig {
  constructor(p: string, options?: BaseConfigOptions) {
    super(p, options);

    const c = this.c as any;

    // <4.0.0 config migration
    if (c.state) {
      // start fresh
      this.c = {
        'version': '4.0.0',
        'telemetry': c.telemetry,
        'npmClient': c.npmClient,
        'interactive': c.interactive,
        'user.id': c.user && c.user.id,
        'user.email': c.user && c.user.email,
        'git.setup': c.git && c.git.setup,
        'tokens.user': c.tokens && c.tokens.user,
        'tokens.telemetry': c.tokens && c.tokens.telemetry,
        'features.ssl-commands': c.features && c.features['ssl-commands'],
      };
    }
  }

  provideDefaults(config: Partial<ConfigFile>): ConfigFile {
    return {
      'version': '4.0.0',
      'telemetry': true,
      'npmClient': 'npm',
    };
  }

  getAPIUrl(): string {
    return this.get('urls.api', 'https://api.ionicjs.com');
  }

  getDashUrl(): string {
    return this.get('urls.dash', 'https://dashboard.ionicframework.com');
  }

  getGitHost(): string {
    return this.get('git.host', 'git.ionicjs.com');
  }

  getGitPort(): number {
    return this.get('git.port', 22);
  }

  getHTTPConfig(): CreateRequestOptions {
    const { c } = this;

    return {
      userAgent: `node/superagent/Ionic CLI ${c.version}`,
      ssl: {
        cafile: c['ssl.cafile'],
        certfile: c['ssl.certfile'],
        keyfile: c['ssl.keyfile'],
      },
      proxy: c['proxy'],
    };
  }

  getOpenIDOAuthConfig(): OAuthServerConfig {
    return {
      authorizationUrl: this.get('oauth.openid.authorization_url', 'https://ionicframework.com/oauth/authorize'),
      tokenUrl: this.get('oauth.openid.token_url', 'https://api.ionicjs.com/oauth/token'),
      clientId: this.get('oauth.openid.client_id', 'cli'),
      apiAudience: this.get('oauth.openid.api_audience', 'https://api.ionicjs.com'),
    };
  }
}

export function parseGlobalOptions(pargv: string[]): ParsedArgs {
  return parseArgs(pargv, metadataOptionsToParseArgsOptions(GLOBAL_OPTIONS));
}
