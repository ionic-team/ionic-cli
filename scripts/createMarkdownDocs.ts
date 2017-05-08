import * as fs from 'fs';
import * as path from 'path';

const cliUtils = require('../packages/cli-utils');
const ionicPkg = require('../packages/ionic');

async function run() {
  const env = await ionicPkg.generateIonicEnvironment();
}

run().then(() => console.log('done!')).catch(err => console.error(err));

console.log(ionicPkg);

// const STRIP_ANSI_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

// const promises: Promise<{ commandName: string, description: string, fileName: string }>[] = [];

// plugin.namespace.getCommandMetadataList().map((cmd) => {
//   const output = formatCommandDoc(cmd).replace(STRIP_ANSI_REGEX, '');
//   const fileName = cmd.fullName.replace(/ /g, '/');
//   const filePath = path.resolve(__dirname, '..', 'docs', plugin.namespace.name === 'ionic' ? 'ionic' : `ionic/${plugin.namespace.name}`, fileName, 'index.md');

//   promises.push(cliUtils.fsMkdirp(path.dirname(filePath))
//     .then(() => {
//       return cliUtils.fsWriteFile(filePath, output);
//     })
//     .then(() => {
//       return {
//         commandName: cmd.fullName,
//         description: cmd.description,
//         fileName
//       };
//     }));
// });

// Promise.all(promises).then((fileList) => {
//   const output = formatPluginDocs(plugin, fileList);
//   const filePath = path.resolve(__dirname, '..', 'docs', plugin.namespace.name === 'ionic' ? 'ionic' : `ionic/${plugin.namespace.name}`, 'index.md');
//   return cliUtils.fsMkdirp(path.dirname(filePath)).then(() => {
//     return cliUtils.fsWriteFile(filePath, output);
//   });
// }).catch((err) => {
//   console.error(err);
//   process.exit(1);
// });


// function formatPluginDocs(plugin, listFileCommands) {
//   let headerLine = `# ${plugin.namespace.name}`;

//   function listCommandLink (cmdData) {
//     return `[${cmdData.commandName}](${path.join(cmdData.fileName, 'index.md')}) | ${cmdData.description.replace(STRIP_ANSI_REGEX, '')}`;
//   }

//   return `
// ${headerLine}

// Command | Description
// ------- | -----------
// ${listFileCommands.map(listCommandLink).join(`
// `)}
// `;
// }


// function formatCommandDoc(cmdMetadata) {
//   let description = cmdMetadata.description.replace(STRIP_ANSI_REGEX, '').split('\n').join('\n  ');

//   return formatName(cmdMetadata.fullName, description) +
//     formatSynopsis(cmdMetadata.inputs, cmdMetadata.fullName) +
//     formatDescription(cmdMetadata.inputs, cmdMetadata.options, description) +
//     formatExamples(cmdMetadata.exampleCommands, cmdMetadata.fullName);
// }

// function formatName(fullName, description) {
//   const headerLine = `## NAME`;
//   return `
// ${headerLine}
// ${fullName} -- ${description}
//   `;
// }

// function formatSynopsis(inputs, commandName) {
//   const headerLine = `## SYNOPSIS`;
//   const usageLine =
//       `${commandName} ${
//         (inputs || [])
//           .map(input => {
//             if (input.validators && input.validators.includes(cliUtils.validators.required)) {
//               return '<' + input.name + '>';
//             }
//             return '[' + input.name + ']';
//           })
//           .join(' ')}`;

//   return `
// ${headerLine}
//     $ ionic ${usageLine}
//   `;
// }


// function formatDescription(inputs = [], options = [], description = '') {
//   const headerLine = `## DESCRIPTION`;

//   function inputLineFn(input, index) {
//     const name = input.name;
//     const description = input.description;
//     const optionList = `\`${name}\``;

//     return `${optionList} | ${description}`;
//   };

//   function optionLineFn(option) {
//     const name = option.name;
//     const aliases = option.aliases;
//     const description = option.description;

//     const optionList = `\`--${name}\`` +
//       (aliases && aliases.length > 0 ? ', ' +
//        aliases
//          .map((alias) => `\`-${alias}\``)
//          .join(', ') : '');

//     return `${optionList} | ${description}`;
//   };


//   return `
// ${headerLine}
// ${description}

// ${inputs.length > 0 ? `
// Input | Description
// ----- | ----------` : ``}
// ${inputs.map(inputLineFn).join(`
// `)}

// ${options.length > 0 ? `
// Option | Description
// ------ | ----------` : ``}
// ${options.map(optionLineFn).join(`
// `)}
// `;
// }

// function formatExamples(exampleCommands, commandName) {
//   if (!Array.isArray(exampleCommands)) {
//     return '';
//   }

//   const headerLine = `## EXAMPLES`;
//   const exampleLines = exampleCommands.map(cmd => `$ ionic ${commandName} ${cmd}`);

//   return `
// ${headerLine}
//     ${exampleLines.join(`
//     `)}
// `;
// }
