import * as path from 'path';
import * as fs from 'fs';
import Waveform from '../src/waveform';

const mp3path = path.resolve(__dirname, './files/mp3-44100-128-s.mp3');
const mp3result = require('./files/mp3-44100-128-s_result.json');

const aacPath = path.resolve(__dirname, './files/aac-44100-74-s.aac');
const aacResult = require('./files/aac-44100-74-s_result.json');

describe('Tests', () => {
  it('Generates proper waveform for mp3', done => {
    const stream = fs.createReadStream(mp3path);

    new Waveform(stream, {}, (err, waveform) => {
      if (err) {
        done(err);
      }

      expect(waveform.asJSON()).toEqual(mp3result);
      done();
    });
  });

  it('Generates proper waveform for aac', done => {
    const stream = fs.createReadStream(aacPath);

    new Waveform(stream, {}, (err, waveform) => {
      if (err) {
        done(err);
      }

      expect(waveform.asJSON()).toEqual(aacResult);
      done();
    });
  });
});
