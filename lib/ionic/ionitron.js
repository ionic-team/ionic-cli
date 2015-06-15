var colors = require('colors'),
    path = require('path'),
    fs = require('fs');

var ionitronStatements = [
    'Hello human, what shall we build today?',
    '*BEEP BEEP* ALL YOUR BASE ARE BELONG TO US *BEEP BEEP*',
    'Prepare to dominate your hybrid app. Engaging now.',
    'My sensors indicate you have an undying love for ionic,         |\n       |  or is it just me?\t\t\t\t\t\t',
    'That\'s a nice looking app you have there. \t\t\t  |\n       |  Definitely one of the better human made apps I\'ve seen.\t',
    'Oh, hi there. I was just not indexing your hard drive,          |\n       |  definitely not doing that.                                    ',
    'That would need bee\'s approval',
    'Fork you! Oh, I\'m sorry, wrong branch.'
];

var ionitronStatements_es = [
    '\u0021Hola humano! \u00BFQu\u00E9 vamos a construir hoy?',
    '*BEEP BEEP* TU BASE NOS PERTENECE *BEEP BEEP*',
    'Prep\u00E1rate para dominar las aplicaciones h\u00EDbridas.               |\n       |  Participa ahora.\t\t\t\t\t\t',
    'Mis sensores indican que sientes amor eterno hacia Ionic,       |\n       |  \u00BFo es solo hacia m\u00ED?\t\t\t\t\t\t',
    'Es una bonita aplicaci\u00F3n esa que tienes.  \t\t\t  |\n       |  Eres el mejor desarrollador humano que he visto.\t\t',
    'Oh, hola. No estaba indexando tu disco duro, no hago eso.',
    'Es necesitaria la aprobaci\u00F3n de las abejas.',
    'Bif\u00Farcate! Oh, Lo siento, rama equivocada. '
];

var ionictronAsciiFile = 'ionitron.txt';

module.exports.print = function print(lang) {

    var ionitronPath = path.join(__dirname, 'assets', ionictronAsciiFile);
    var contents = fs.readFileSync(ionitronPath, 'utf8');
    var messageContent;

    switch (lang) {
        case 'es':
            //Replace the 'h' (antenna) by Ñ hahaha'
            contents = contents.replace('h', '\u00D1');
            messageContent = [ionitronStatements_es[Math.floor(Math.random() * (ionitronStatements_es.length - 0) + 0)]].join('');
            break;
        default:
            messageContent = [ionitronStatements[Math.floor(Math.random() * (ionitronStatements.length - 0) + 0)]].join('');
    }

    var replaceString = '@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@';
    // console.log(messageContent.length, replaceString.length)
    if (messageContent.length < replaceString.length) {
        var diff = (replaceString.length) - messageContent.length;
        var i = 0;
        // console.log(diff, i)
        while (i < diff) {
            messageContent = messageContent + ' ';
            i++;
        }
    }
    contents = contents.replace(replaceString, messageContent)
    console.log(contents.cyan);
    return;
}
