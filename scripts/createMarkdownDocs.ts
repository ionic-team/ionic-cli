import * as path from 'path';

import { generateIonicEnvironment } from '../packages/ionic';
import {
  CommandData,
  CommandInput,
  CommandOption,
  INamespace,
  fsMkdirp,
  fsWriteFile,
  installPlugin,
  load,
  readDir,
  validators,
} from '../packages/cli-utils';

const stripAnsi = load('strip-ansi');

async function run() {
  const env = await generateIonicEnvironment(process.argv.slice(2), process.env);
  const mPath = path.resolve(__dirname, '..', 'packages');
  const ionicModules = (await readDir(mPath))
    .filter(m => m.startsWith('cli-plugin-'))
    .map(m => require(path.resolve(mPath, m)));

  for (let mod of ionicModules) {
    installPlugin(env, mod);
  }

  // const namespaces = [env.namespace, ...Array.from(env.namespace.namespaces.entries()).map(v => v[1]())];
  const namespaces = [env.namespace];
  const namespacePromises = namespaces.map(async (ns) => {
    const nsName = ns.name === 'ionic' ? '' : ns.name;
    const nsPath = path.resolve(__dirname, '..', 'docs', nsName, 'index.md');
    const nsDoc = formatNamespaceDocs(ns);

    await fsMkdirp(path.dirname(nsPath));
    await fsWriteFile(nsPath, nsDoc, { encoding: 'utf8' });
  });

  await Promise.all(namespacePromises);

  const commands = env.namespace.getCommandMetadataList().filter(cmd => cmd.visible !== false);
  const commandPromises = commands.map(async (cmd) => {
    if (!cmd.fullName) {
      console.error(`${cmd.name} has no fullName`);
      return;
    }

    const cmdPath = path.resolve(__dirname, '..', 'docs', ...cmd.fullName.split(' '), 'index.md');
    const cmdDoc = formatCommandDoc(cmd);

    await fsMkdirp(path.dirname(cmdPath));
    await fsWriteFile(cmdPath, cmdDoc, { encoding: 'utf8' });
  });

  await Promise.all(commandPromises);

  env.close();
}

run().then(() => console.log('done!')).catch(err => console.error(err));


function formatNamespaceDocs(ns) {
  let headerLine = formatNamespaceHeader(ns);

  function listCommandLink(cmdData: CommandData) {
    if (!cmdData.fullName) {
      console.error(`${cmdData.name} has no fullName`);
      return;
    }

    return `[${cmdData.fullName}](${path.join(...cmdData.fullName.split(' '), 'index.md')}) | ${stripAnsi(cmdData.description)}`;
  }

  const commands = ns.getCommandMetadataList();

  return `${headerLine}

Command | Description
------- | -----------
${commands.filter(cmd => cmd.visible !== false).map(listCommandLink).join(`
`)}
`;
}

function formatNamespaceHeader(ns: INamespace) {
  return `---
layout: fluid/docs_base
category: cli
id: cli-intro
title: Ionic CLI Documentation
---

# ${ns.name}
`;
}

function formatCommandHeader(cmd: CommandData) {
  if (!cmd.fullName) {
    console.error(`${cmd.name} has no fullName`);
    return;
  }

  return `---
layout: fluid/docs_cli_base
category: cli
id: cli-${cmd.fullName.split(' ').join('-')}
command_name: ${cmd.fullName}
title: ${cmd.fullName} Command
header_sub_title: Ionic CLI
---

# ${cmd.fullName} Command

`;
}

function formatCommandDoc(cmdMetadata: CommandData) {
  let description = stripAnsi(cmdMetadata.description).split('\n').join('\n  ');

  return formatCommandHeader(cmdMetadata) +
    formatName(cmdMetadata.fullName || '', description) +
    formatSynopsis(cmdMetadata.inputs, cmdMetadata.fullName) +
    formatDescription(cmdMetadata.inputs, cmdMetadata.options, description) +
    formatExamples(cmdMetadata.exampleCommands, cmdMetadata.fullName);
}

function formatName(fullName: string, description: string) {
  const headerLine = `## Name`;
  return `
${headerLine}

${fullName} -- ${description}
  `;
}

function formatSynopsis(inputs, commandName) {
  const headerLine = `## Synopsis`;
  const usageLine =
      `${commandName} ${
        (inputs || [])
          .map(input => {
            if (input.validators && input.validators.includes(validators.required)) {
              return '<' + input.name + '>';
            }
            return '[' + input.name + ']';
          })
          .join(' ')}`;

  return `
${headerLine}

\`\`\`bash
$ ionic ${usageLine}
\`\`\`
  `;
}


function formatDescription(inputs: CommandInput[] = [], options: CommandOption[] = [], description: string = '') {
  const headerLine = `## Description`;

  function inputLineFn(input, index) {
    const name = input.name;
    const description = stripAnsi(input.description);
    const optionList = `\`${name}\``;

    return `${optionList} | ${description}`;
  };

  function optionLineFn(option) {
    const name = option.name;
    const aliases = option.aliases;
    const description = stripAnsi(option.description);

    const optionList = `\`--${name}\`` +
      (aliases && aliases.length > 0 ? ', ' +
       aliases
         .map((alias) => `\`-${alias}\``)
         .join(', ') : '');

    return `${optionList} | ${description}`;
  };


  return `
${headerLine}

${description}

${inputs.length > 0 ? `
Input | Description
----- | ----------` : ``}
${inputs.map(inputLineFn).join(`
`)}

${options.length > 0 ? `
Option | Description
------ | ----------` : ``}
${options.map(optionLineFn).join(`
`)}
`;
}

function formatExamples(exampleCommands, commandName) {
  if (!Array.isArray(exampleCommands)) {
    return '';
  }

  const headerLine = `## Examples`;
  const exampleLines = exampleCommands.map(cmd => `$ ionic ${commandName} ${cmd}`);

  return `
${headerLine}

\`\`\`bash
${exampleLines.join('\n')}
\`\`\`
`;
}
