WaveformStream = require "./stream"
Waveform = require "./waveform"
fs = require "fs"
path = require "path"

s = fs.createReadStream(path.resolve(__dirname,"../test/files/mp3-44100-128-s.mp3"))

# set up a waveform stream that will emit at 200 pixels per second
# set up a waveform transform, set to 200px / sec

new Waveform s, (err,waveform) =>
    throw err if err

    process.stdout.write JSON.stringify(waveform.asJSON()) + "\n"
