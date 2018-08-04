import { PassThrough, Transform } from 'stream';
import * as FFmpeg from 'fluent-ffmpeg';
import { defaultOptions, Options } from './options';

const debug = require("debug")("sm-waveform");

enum Status {
  INIT = 'INIT',
  STARTED = 'STARTED',
  ERRORED = 'ERRORED',
  ENDED = 'ENDED'
}

export default class WaveformStream extends Transform {

  private options: Options;
  private ffmpeg: any;

  private status: Status = Status.INIT;

  private _buf: PassThrough;
  private _out: PassThrough;

  private _min: number;
  private _max: number;
  private _samples: number;

  constructor(passedOptions: Options = {}) {
    super({
      writableObjectMode: false,
      readableObjectMode: true,
      highWaterMark: 1024,
    });

    this.options = {
      ...defaultOptions,
      ...passedOptions,
    };

    this._buf = new PassThrough;
    this._out = new PassThrough;


    // @ts-ignore
    this.ffmpeg = new FFmpeg({
      source: this._buf,
    })
      .addOptions(["-f s16le","-ac 1","-acodec pcm_s16le",`-ar ${this.options.sampleRate}`]);

    this.ffmpeg.on("start", cmd => {
      debug(`ffmpeg started with ${ cmd }`);
      this.status = Status.STARTED;
      return this.emit("_started");
    });

    this.ffmpeg.on("error", err => {
      if (err.code === "ENOENT") {
        debug("ffmpeg failed to start.");
        return this.emit("error", "ffmpeg failed to start");
      } else {
        debug(`ffmpeg decoding error: ${ err }`);
        return this.emit("error", `ffmpeg decoding error: ${err}`);
      }
    });

    this.ffmpeg.pipe(this._out, { end: true })


    // these will be reset each time we cross samples per pixel
    this._min = null;
    this._max = null;
    this._samples = 0;

    let oddByte = null;

    this._out.on("readable", () => {

        let data;
        const result = [];

        while ((data = this._out.read())) {
          var value;
          var i = 0;
          var dataLen = data.length;

          if (oddByte != null) {
            value = ((data.readInt8(0, true) << 8) | oddByte) / 256;
            oddByte = null;
            i = 1;
          } else {
            value = data.readInt16LE(0, true) / 256;
            i = 2;
          }

          result.push((() => {
            const result1 = [];

            while (true) {
              this._min = Math.min(this._min,value);
              this._max = Math.max(this._max,value);
              this._samples += 1;

              if (this._samples === this.getSamplesPerPixel()) {
                this.push([Math.round(this._min) || 0 ,Math.round(this._max) || 0]);
                this._min = null;
                this._max = null;
                this._samples = 0;
              }

              if (i >= dataLen) { break; }

              value = data.readInt16LE(i, true) / 256;
              result1.push(i += 2);
            }
            return result1;

          })());
        }

        return result;


    });
  }

  //----------

  _transform(chunk,encoding,cb) {
    debug(`_trans chunk: ${chunk.length}`);

    if (this.status === Status.STARTED) {
      return this._buf.write(chunk, encoding, cb);
    } else {
      return this.once("_started", () => {
        return this._buf.write(chunk, encoding, cb);
      });
    }
  }

  //----------

  _flush(cb) {
    this._buf.end();

    return this._out.once("end", () => {
      if (this._samples > 0) {
        this.push([this._min, this._max]);
      }

      return cb();
    });
  }

  getSamplesPerPixel() {
    const { pixelRate, sampleRate } = this.options;

    return sampleRate / pixelRate;
  }
}
