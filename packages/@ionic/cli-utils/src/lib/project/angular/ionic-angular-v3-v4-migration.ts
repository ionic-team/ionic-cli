import * as path from 'path';

import chalk from 'chalk';
import * as Debug from 'debug';
import stringWidth = require('string-width');
import { fsReadFile, readDir } from '@ionic/cli-framework/utils/fs';
import { prettyPath } from '@ionic/cli-framework/utils/format';

const debug = Debug('ionic:cli-utils:lib:project:angular:ionic-angular-v3-v4-migration');

export interface MigrationRule {
  name: string;
  regex: RegExp;
  replacement: string;
  url?: string;
  tagNameChanged?: boolean;
}

export interface MigrationFile {
  name: string;
  occurrences: {
    rule: MigrationRule;
    matches: string[];
  }[];
}

export interface Diagnosis {
  affected: boolean;
  files: Map<string, MigrationFile>;
}

export async function compileMessage(diagnosis: Diagnosis): Promise<string> {
  let msg = 'Detected non-migrated syntax.\n';

  for (const [ , file ] of diagnosis.files) {
    const header = `File: ${chalk.bold(prettyPath(file.name))} (${file.occurrences.length} occurrence${file.occurrences.length === 1 ? '' : 's'})`;
    msg += `${header}\n${chalk.dim('-').repeat(stringWidth(header))}\n\n`;

    for (const { rule, matches } of file.occurrences) {
      msg += (
        `Rule: ${chalk.bold(rule.name)}\n` +
        (rule.url ? `Docs: ${chalk.bold(rule.url)}\n` : '') +
        '\n'
      );

      if (rule.tagNameChanged) {
        msg += chalk.yellow(`${chalk.bold('Warning')}: Tag names changed. Don't forget to update the closing tags!\n\n`);
      }

      for (const i in matches) {
        const match = matches[i];

        msg += (
          `${chalk.red(match)}\n` +
          `${chalk.green(match.replace(rule.regex, rule.replacement))}\n` +
          '\n'
        );
      }
    }
  }

  return msg.trim();
}

export async function diagnose(srcDir: string): Promise<Diagnosis> {
  const sourceFiles = (await readDir(srcDir, { recursive: true })).filter(item => path.extname(item) === '.html' || path.extname(item) === '.ts');

  const files: Map<string, MigrationFile> = new Map();

  for (const filePath of sourceFiles) {
    debug(`Checking ${filePath}`);

    const fileContents = await fsReadFile(filePath, { encoding: 'utf8' });

    for (const rule of MIGRATION_RULES) {
      const matches = fileContents.match(rule.regex);

      if (matches) {
        let file = files.get(filePath);

        if (!file) {
          file = { name: filePath, occurrences: [{ rule, matches }] };
        }

        files.set(filePath, file);
      }
    }
  }

  return {
    affected: files.size > 0,
    files,
  };
}

/**
 * Thank you Amit Moryossef for the original rules:
 * https://github.com/AmitMY/ionic-migration-v4/blob/master/migrate.js
 */
const MIGRATION_RULES: MigrationRule[] = [
  {
    name: 'button[ion-button] -> ion-button',
    regex: /<button([\s\S]*?) ion-button([\s\S]*?)>/g,
    replacement: '<ion-button$1$2>',
    url: 'https://github.com/ionic-team/ionic/blob/master/angular/BREAKING.md#button',
    tagNameChanged: true,
  },
  {
    name: 'a[ion-button] -> ion-button',
    regex: /<a([\s\S]*?) ion-button([\s\S]*?)>/g,
    replacement: '<ion-button href$1$2>',
    url: 'https://github.com/ionic-team/ionic/blob/master/angular/BREAKING.md#button',
    tagNameChanged: true,
  },
  {
    name: 'button[ion-item] -> ion-item button',
    regex: /<button([\s\S]*?) ion-item([\s\S]*?)>/g,
    replacement: '<ion-item button$1$2>',
    url: 'https://github.com/ionic-team/ionic/blob/master/angular/BREAKING.md#item',
    tagNameChanged: true,
  },
  {
    name: 'a[ion-item] -> ion-item (no href)',
    regex: /<a((?!.*href))([\s\S]*?) ion-item([\s\S]*?)>/g,
    replacement: '<ion-item href$1$2$3>',
    url: 'https://github.com/ionic-team/ionic/blob/master/angular/BREAKING.md#item',
    tagNameChanged: true,
  },
  {
    name: 'a[ion-item] -> ion-item (href after ion-item)',
    regex: /<a([\s\S]*?) ion-item([\s\S]*?) href(="[\s\S]+?")?([\s\S]*?)>/g,
    replacement: '<ion-item$1$2 href$3$4>',
    url: 'https://github.com/ionic-team/ionic/blob/master/angular/BREAKING.md#item',
    tagNameChanged: true,
  },
  {
    name: 'a[ion-item] -> ion-item (href before ion-item)',
    regex: /<a([\s\S]*?) href(="[\s\S]+?")?([\s\S]*?) ion-item([\s\S]*?)>/g,
    replacement: '<ion-item$1 href$2$3$4>',
    url: 'https://github.com/ionic-team/ionic/blob/master/angular/BREAKING.md#item',
    tagNameChanged: true,
  },
  {
    name: 'ion-chip ion-button -> ion-chip ion-chip-button',
    regex: /<ion-chip>([\s\S]*?)<ion-button([\s\S]*?)>/g,
    replacement: '<ion-chip>$1<ion-chip-button$2>',
    url: 'https://github.com/ionic-team/ionic/blob/master/angular/BREAKING.md#chip',
    tagNameChanged: true,
  },
  // {
  //   name: "Fab",
  //   regex: /<button([\s\S]*?) ion-fab([\s\S]*?)<\/button>/g,
  // },
  // {
  //   name: "Icon Slot (left|start)",
  //   regex: /(icon-start|icon-left)/g,
  // },
  // {
  //   name: "Icon Slot (right|end)",
  //   regex: /(icon-end|icon-right)/g,
  // },
  // {
  //   name: "Item Slot (left|start)",
  //   regex: /(item-start|item-left)/g,
  // },
  // {
  //   name: "Item Slot (right|end)",
  //   regex: /(item-end|item-right)/g,
  // },
  // {
  //   name: "Select Option (ion-option)",
  //   regex: /<ion-option([\s\S]*?)<\/ion-option>/g,
  // },
  // {
  //   name: "Radio group attribute [radio-group]",
  //   regex: /<(.*?) ([\s\S]*?)radio-group([\s\S]*?)>([\s\S]*?)<\/\1>/g,
  // },
  // {
  //   name: "Ion-Buttons (start)",
  //   regex: /<ion-buttons([\s\S]*?) start([\s\S]*?)<\/ion-buttons>/g,
  // },
  // {
  //   name: "Ion-Buttons (end)",
  //   regex: /<ion-buttons([\s\S]*?) end([\s\S]*?)<\/ion-buttons>/g,
  // },
  // {
  //   name: "Ion-Buttons (left)",
  //   regex: /<ion-buttons([\s\S]*?) left([\s\S]*?)<\/ion-buttons>/g,
  // },
  // {
  //   name: "Ion-Buttons (right)",
  //   regex: /<ion-buttons([\s\S]*?) right([\s\S]*?)<\/ion-buttons>/g,
  // }
];
