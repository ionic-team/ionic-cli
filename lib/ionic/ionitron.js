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

var ionictronAsciiFile = 'ionitron.txt';

module.exports.print = function print() {
  var ionitronPath = path.join(__dirname, 'assets', ionictronAsciiFile);
  var contents = fs.readFileSync(ionitronPath, 'utf8');
  var messageContent = [ionitronStatements[Math.floor(Math.random() * (ionitronStatements.length - 0) + 0)]].join('');
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
