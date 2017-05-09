"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const ionic_1 = require("../packages/ionic");
const cli_utils_1 = require("../packages/cli-utils");
const stripAnsi = cli_utils_1.load('strip-ansi');
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const env = yield ionic_1.generateIonicEnvironment(process.argv.slice(2), process.env);
        const mPath = path.resolve(__dirname, '..', 'packages');
        const ionicModules = (yield cli_utils_1.readDir(mPath))
            .filter(m => m.startsWith('cli-plugin-'))
            .map(m => require(path.resolve(mPath, m)));
        for (let mod of ionicModules) {
            cli_utils_1.installPlugin(env, mod);
        }
        const nsPath = path.resolve(__dirname, '..', 'docs', 'index.md');
        const nsDoc = formatIonicPage(env.namespace);
        yield cli_utils_1.fsMkdirp(path.dirname(nsPath));
        yield cli_utils_1.fsWriteFile(nsPath, nsDoc, { encoding: 'utf8' });
        const commands = env.namespace.getCommandMetadataList().filter(cmd => cmd.visible !== false);
        const commandPromises = commands.map((cmd) => __awaiter(this, void 0, void 0, function* () {
            if (!cmd.fullName) {
                console.error(`${cmd.name} has no fullName`);
                return;
            }
            const cmdPath = path.resolve(__dirname, '..', 'docs', ...cmd.fullName.split(' '), 'index.md');
            const cmdDoc = formatCommandDoc(cmd);
            yield cli_utils_1.fsMkdirp(path.dirname(cmdPath));
            yield cli_utils_1.fsWriteFile(cmdPath, cmdDoc, { encoding: 'utf8' });
        }));
        yield Promise.all(commandPromises);
        yield copyToIonicSite(commands);
        env.close();
    });
}
run().then(() => console.log('done!')).catch(err => console.error(err));
function formatIonicPage(ns) {
    let headerLine = formatNamespaceHeader(ns);
    function listCommandLink(cmdData) {
        if (!cmdData.fullName) {
            console.error(`${cmdData.name} has no fullName`);
            return;
        }
        return `[${cmdData.fullName}](${path.join(...cmdData.fullName.split(' '))}) | ${stripAnsi(cmdData.description)}`;
    }
    const commands = ns.getCommandMetadataList();
    return `${headerLine}

The Ionic CLI is your go-to tool for developing Ionic apps. You can follow CLI
development on [Github](https://github.com/driftyco/ionic-cli).

## Installation

Please make sure
[Node](https://ionicframework.com/docs/resources/what-is/#node) 6+ and
[NPM](https://ionicframework.com/docs/resources/what-is/#npm) 3+ are
installed.

Then, install the CLI globally (you may need sudo):

\`\`\`bash
$ npm install -g ionic@latest
\`\`\`

## Getting Started

Start a new Ionic project using \`ionic start\`:

\`\`\`bash
ionic start myNewProject tabs
cd ./myNewProject
\`\`\`

This will create a new app named \`myNewProject\`. Once you \`cd\` into your
project's directory, a few new commands become available to you, such as
\`serve\`:

\`\`\`bash
ionic serve
\`\`\`

## Commands

Here is a full list of Ionic commands. You can also see the list on the command
line with \`ionic --help\`.

Command | Description
------- | -----------
${commands.filter(cmd => cmd.visible !== false).map(listCommandLink).join(`
`)}
`;
}
function formatNamespaceHeader(ns) {
    return `---
layout: fluid/docs_base
category: cli
id: cli-intro
title: Ionic CLI Documentation
---

# ${ns.name}
`;
}
function formatCommandHeader(cmd) {
    if (!cmd.fullName) {
        console.error(`${cmd.name} has no fullName`);
        return;
    }
    return `---
layout: fluid/docs_base
category: cli
id: cli-${cmd.fullName.split(' ').join('-')}
command_name: ${cmd.fullName}
title: ${cmd.fullName}
header_sub_title: Ionic CLI
---

# \`$ ${cmd.fullName}\`

`;
}
function formatCommandDoc(cmdMetadata) {
    let description = stripAnsi(cmdMetadata.description).split('\n').join('\n  ');
    return formatCommandHeader(cmdMetadata) +
        formatName(cmdMetadata.fullName || '', description) +
        formatSynopsis(cmdMetadata.inputs, cmdMetadata.fullName) +
        formatDescription(cmdMetadata.inputs, cmdMetadata.options, description) +
        formatExamples(cmdMetadata.exampleCommands, cmdMetadata.fullName);
}
function formatName(fullName, description) {
    return description;
}
function formatSynopsis(inputs, commandName) {
    const headerLine = `## Synopsis`;
    const usageLine = `${commandName} ${(inputs || [])
        .map(input => {
        if (input.validators && input.validators.includes(cli_utils_1.validators.required)) {
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
function formatDescription(inputs = [], options = [], description = '') {
    const headerLine = `## Details`;
    function inputLineFn(input, index) {
        const name = input.name;
        const description = stripAnsi(input.description);
        const optionList = `\`${name}\``;
        return `${optionList} | ${description}`;
    }
    ;
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
    }
    ;
    return `
${headerLine}

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
function copyToIonicSite(commands) {
    return __awaiter(this, void 0, void 0, function* () {
        const ionicSitePath = path.resolve(__dirname, '..', '..', 'ionic-site');
        let dirData = yield cli_utils_1.fsStat(ionicSitePath);
        if (!dirData.size) {
            // ionic-site not present, fail silently
            return;
        }
        // get a list of commands for the nav
        yield cli_utils_1.fsWriteFile(path.resolve(ionicSitePath, 'content', '_data', 'cliData.json'), JSON.stringify(commands.map((command) => {
            return {
                id: `cli-${command.fullName.split(' ').join('-')}`,
                name: command.fullName,
                url: command.fullName.split(' ').join('/')
            };
        }).sort((a, b) => a.name.localeCompare(b.name))), { encoding: 'utf8' });
        return cli_utils_1.copyDirectory(path.resolve(__dirname, '..', 'docs'), path.resolve(ionicSitePath, 'content', 'docs', 'cli'));
    });
}
