import * as lodash from 'lodash';
import * as path from 'path';

import { ProjectType } from './definitions';

export const ASSETS_DIRECTORY = path.resolve(__dirname, 'assets');

export const PROJECT_FILE = process.env['IONIC_CONFIG_FILE'] ?? 'ionic.config.json';
export const PROJECT_TYPES: ProjectType[] = ['angular', 'react', 'vue', 'ionic-angular', 'ionic1', 'custom'];
export const LEGACY_PROJECT_TYPES: ProjectType[] = ['ionic-angular', 'ionic1'];
export const MODERN_PROJECT_TYPES: ProjectType[] = lodash.difference(PROJECT_TYPES, LEGACY_PROJECT_TYPES);
