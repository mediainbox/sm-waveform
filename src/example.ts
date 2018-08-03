import Waveform from './waveform';

const fs = require("fs");
const path = require("path");

const audioStream = fs.createReadStream(path.resolve(__dirname,"../test/files/mp3-44100-128-s.mp3"));

// set up a waveform stream that will emit at 200 pixels per second
// set up a waveform transform, set to 200px / sec

new Waveform(audioStream, (err,waveform) => {
  if (err) { throw err; }

  return process.stdout.write(JSON.stringify(waveform.asJSON()) + "\n");
});
