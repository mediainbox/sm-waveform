import WaveformStream from './stream';
import * as _ from 'lodash';

import { Options, defaultOptions } from './options';


const debug = require('debug')('sm-waveform');

/*
Readable audio streams go in, waveform JSON comes out.
*/

export default class Waveform {
  opts: Options;

  private _samples: number[];
  private _errored: boolean;

  constructor(stream, opts, cb) {
    this.opts = {
      ...defaultOptions,
      ...opts,
    };

    this._errored = false;

    this._samples = [];
    const ws = new WaveformStream(this.opts);

    ws.on("readable", () => {
      return (() => {
        let px;
        const result = [];
        while ((px = ws.read())) {
          result.push(this._samples.push(px));
        }
        return result;
      })();
    });

    ws.on("error", err => {
      // need to abort cleanly... not this...
      cb(err);
      return this._errored = true;
    });

    ws.once("end", () => {
      debug("Waveform got stream end");
      // we've got our output
      if (!this._errored) { return cb(null, this); }
    });

    stream.pipe(ws);
  }

  //----------

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
