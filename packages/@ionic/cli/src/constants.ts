import * as chalk from 'chalk';
import * as lodash from 'lodash';
import * as path from 'path';

import { ProjectType } from './definitions';

export const ASSETS_DIRECTORY = path.resolve(__dirname, 'assets');
export const ANGULAR_STANDALONE = 'angular-standalone';

export const PROJECT_FILE = process.env['IONIC_CONFIG_FILE'] ?? 'ionic.config.json';
export const PROJECT_TYPES: ProjectType[] = ['angular', ANGULAR_STANDALONE, 'react', 'vue', 'custom', 'vue-vite', 'react-vite'];
export const LEGACY_PROJECT_TYPES: ProjectType[] = [];
export const MODERN_PROJECT_TYPES: ProjectType[] = lodash.difference(PROJECT_TYPES, LEGACY_PROJECT_TYPES);

export const COLUMNAR_OPTIONS = { hsep: chalk.dim('-'), vsep: chalk.dim('|') };
