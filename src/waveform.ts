import * as _ from 'lodash';
import WaveformStream from './stream';
import { Options, defaultOptions } from './options';

const debug = require('debug')('sm-waveform');

export default class Waveform {
  opts: Options;

  private _samples: number[] = [];
  private _errored = false;

  constructor(stream, opts, cb) {
    this.opts = {
      ...defaultOptions,
      ...opts,
    };

    const ws = new WaveformStream(this.opts);

    ws.on('readable', () => {
      let px;
      while ((px = ws.read())) {
        this._samples.push(px);
      }
    });

    ws.on('error', err => {
      debug('Waveform error', err);

      this._errored = true;
      cb(err);
    });

    ws.once('end', () => {
      debug('Waveform end event');

      if (!this._errored) {
        cb(null, this);
      }
    });

    stream.pipe(ws);
  }

  asJSON() {
    return {
      sample_rate: this.opts.sampleRate,
      samples_per_pixel: this.opts.sampleRate / this.opts.pixelRate,
      bits: 16,
      length: this._samples.length,
      data: _.flatten(this._samples)
    };
  }
}
