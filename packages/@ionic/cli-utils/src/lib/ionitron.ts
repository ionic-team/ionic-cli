import * as chalk from 'chalk';

export function getIonitronString(quote: string) {
  const quoteFormatted = quote
    .split('\n')
    .map((currentString) => {
      const lineLength = 68;
      const paddingLeftSize = Math.floor((lineLength - currentString.length) / 2);
      const paddingRightSize = paddingLeftSize + ((lineLength - currentString.length) % 2);

      return `       |${Array(paddingLeftSize).join(' ')}${currentString}${Array(paddingRightSize).join(' ')}|`;
    })
    .join('\n');

  return chalk.blue(`\n\n\n
                               h
                            \`-oooooo/\`.++
                          ::-oooooooo...
                         \`:.\`:oooooo/
                            \`\`\`-:oo\`
                                 /o.
                                 ./:--:::::--..\`
                            .-/+ooooooooooooooooo+/:.
                        \`-/ooooooooooooooooooooooooooo+:.
                      -+ooooooooooooooooooooooooooooooooo+:\`
                    :ooooooooooooooooooooooooooooooooooooooo/\`
                  :ooooooooooooooooooooooooooooooooooooooooooo/\`
                \`+oooooooooooooooooooooooooooooooooooooooooooooo-
               -ooooooooooooooooooooooooooooooooooooooooooooooooo/
              -ooooooooooooooooooooooooooooooooooooooooooooooooooo/.-.
             -ooooooooooooooooooooooooooooooooooooooooooooooooooooo/+o+\`
            \`ooooooooooooooooooooooooooooooooooooooooooooooooooooooo:ooo\`
            /ooooooooooooooooooooooooooooooooooooooooooooooooooooooo+ooo/
        -+ooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo+oooh
       -ooooooo+ooooooooooooooooooooooooooooooooooooooooooooooooooooooooo
       ooooooooo:oooooooooooooooooooooooooooooooooooooooooooooooooooooooo
       ooooooooo+:ooooooooooooooooooooooooooooooooooooooooooooooooooooooo
       oooooooooo.oooooooooooooooooooooooooooooooooooooooooooooooooooooo+
       oooooooooo:/oooooooooooooooooooooooooooooooooooooooooooooooooooo+\`
       +ooooooooo//oooooooooooooooooooooooooooooooooooooooooooooooooo\`\`
       .ooooooooo/+oooooooooooooooooooooo:.-+oooooooo:  \`/oooooooooo-
        :oooooooo/oooooooooooooooooooooo:   \`oooooooo.   :ooooooooo/
         :ooooooooooooooooooooooooooooooo:--+ooooooooo+/oooooooooo/
          \`:////ooooooooooooooooooooooooooooooooooooooooooooooooo:
                \`+oooooooooooooooooooooooooooooooooooooooooooooo.
                  -ooooooooooooooooooooooooooooooooooooooooooo:\`
                   \`:ooooooooooooooooooooooooooooooooooooooo/\`
                      ./ooooooooooooooooooooooooooooooooo+-\`
                        \`-/ooooooooooooooooooooooooooo/-\``) + `\\
                            ` + chalk.blue(`\`-:+ooooooooooooooooo+/-.`) + `    \\ \\
                                  ` + chalk.blue(`'\\:--::::--/'`) + `          |  \\
                                                         /   \\
         -----------------------------------------------*     *----------
        /                                                                \\
       /                                                                  \\
${quoteFormatted}
       \\                                                                  /
        \\                                                                /
         *--------------------------------------------------------------*\n\n`;
}

export const ionitronStatements = {
  'en': [
    'Hello human, what shall we build today?',
    '*BEEP BEEP* ALL YOUR BASE ARE BELONG TO US *BEEP BEEP*',
    'Prepare to dominate your hybrid app. Engaging now.',
    'My sensors indicate you have an undying love for ionic,\nor is it just me?',
    'That\'s a nice looking app you have there.\nDefinitely one of the better human made apps I\'ve seen.',
    'Oh, hi there. I was not just indexing your hard drive,\ndefinitely not doing that.' +
    'That would need bee\'s approval',
    'Fork you! Oh, I\'m sorry, wrong branch.'
  ],
  'es': [
    '\u0021Hola humano! \u00BFQu\u00E9 vamos a construir hoy?',
    '*BEEP BEEP* TU BASE NOS PERTENECE *BEEP BEEP*',
    'Prep\u00E1rate para dominar las aplicaciones h\u00EDbridas.\nParticipa ahora.',
    'Mis sensores indican que sientes amor eterno hacia Ionic,\n\u00BFo es solo hacia m\u00ED?',
    'Es una bonita aplicaci\u00F3n esa que tienes.\nEres el mejor desarrollador humano que he visto.',
    'Oh, hola. No estaba indexando tu disco duro, no hago eso.',
    'Es necesitaria la aprobaci\u00F3n de las abejas.',
    'Bif\u00Farcate! Oh, Lo siento, rama equivocada. '
  ]
};
