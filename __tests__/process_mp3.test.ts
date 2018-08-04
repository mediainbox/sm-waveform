import * as path from 'path';
import * as fs from 'fs';
import Waveform from '../src/waveform';
//import mp3result from './files/mp3-44100-128-s_result.json';

const mp3path = path.resolve(__dirname, './files/mp3-44100-128-s.mp3');
const mp3result = require('./files/mp3-44100-128-s_result.json');

describe('Tests', () => {
  it('Generates proper waveform', done => {
    const stream = fs.createReadStream(mp3path);

    new Waveform(stream, {}, (err, waveform) => {
      if (err) {
        done(err);
      }

      expect(waveform.asJSON()).toEqual(mp3result);
      done();
    });
  });
});
