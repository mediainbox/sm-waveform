var Waveform, WaveformStream, fs, path, s;

WaveformStream = require("./stream");

Waveform = require("./waveform");

fs = require("fs");

path = require("path");

s = fs.createReadStream(path.resolve(__dirname, "../test/files/mp3-44100-128-s.mp3"));

new Waveform(s, (function(_this) {
  return function(err, waveform) {
    if (err) {
      throw err;
    }
    return process.stdout.write(JSON.stringify(waveform.asJSON()) + "\n");
  };
})(this));

//# sourceMappingURL=example.js.map
