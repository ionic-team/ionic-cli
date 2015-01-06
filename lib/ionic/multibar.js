var ProgressBar = require('progress');

function Multibar(stream) {
  this.stream     = stream || process.stderr;
  this.cursor     = 0;
  this.bars       = [];
  this.terminates = 0;
}

Multibar.prototype = {
  newBar: function(schema, options) {
    options.stream = this.stream;
    var bar = new ProgressBar(schema, options);
    this.bars.push(bar);
    var index = this.bars.length - 1;

    // alloc line
    this.move(index);
    this.stream.write('\n');
    this.cursor ++;

    // replace original
    var self  = this;
    bar.otick = bar.tick;
    bar.oterminate = bar.terminate;
    bar.tick = function(value, options) {
      self.tick(index, value, options);
    }
    bar.terminate = function() {
      self.terminates++;
      if (self.terminates == self.bars.length) {
        self.terminate();
      }
    }

    return bar;
  },

  terminate: function() {
    this.move(this.bars.length);
    this.stream.clearLine();
    this.stream.cursorTo(0);
  },

  move: function(index) {
    if (!this.stream.isTTY) return;
    this.stream.moveCursor(0, index - this.cursor);
    this.cursor = index;
  },

  tick: function(index, value, options) {
    var bar = this.bars[index];
    if (bar) {
      this.move(index);
      bar.otick(value, options);
    }
  }
}

// var mbars = new Multibar();
// var bars  = [];

// function addBar() {
//   bars.push(mbars.newBar('  :title [:bar] :percent', {
//       complete: '='
//     , incomplete: ' '
//     , width: 30
//     , total: 100
//   }));
//   return bars[bars.length - 1];
// }

// function forward() {
//   for (var i = 0; i < bars.length; i++) {
//     bars[i].tick(1, { title: 'forward: ' });
//   }
//   if (bars[0].curr > 60) {
//     addBar().tick(bars[0].curr);
//     backward();
//   } else {
//     setTimeout(forward, 20);
//   }
// }

// function backward() {
//   for (var i = 0; i < bars.length; i++) {
//     bars[i].tick(-1, { title: 'backward: ' });
//   }
//   if (bars[0].curr == 0) {
//     mbars.terminate();
//     console.log("End all");
//   } else {
//     setTimeout(backward, 20);
//   }
// }

// for(var i = 0; i < 5; i++) {
//   addBar();
// }

// forward();

module.exports = new Multibar();
