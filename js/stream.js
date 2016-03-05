var FFmpeg, PassThrough, WaveformStream, debug,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

PassThrough = require("stream").PassThrough;

FFmpeg = require("fluent-ffmpeg");

debug = require("debug")("sm-waveform:stream");

module.exports = WaveformStream = (function(_super) {
  __extends(WaveformStream, _super);

  function WaveformStream(_pixelRate, _sampleRate) {
    var oddByte;
    this._pixelRate = _pixelRate;
    this._sampleRate = _sampleRate != null ? _sampleRate : 44100;
    this._samplesPerPixel = this._sampleRate / this._pixelRate;
    WaveformStream.__super__.constructor.apply(this, arguments);
    this._writableState.objectMode = false;
    this._readableState.objectMode = true;
    this._readableState.highWaterMark = 1024;
    this._buf = new PassThrough;
    this._out = new PassThrough;
    this._ffmpeg = new FFmpeg({
      source: this._buf,
      captureStderr: false
    }).addOptions(["-f s16le", "-ac 1", "-acodec pcm_s16le", "-ar " + this._sampleRate]);
    this._ffmpeg.on("start", (function(_this) {
      return function(cmd) {
        debug("ffmpeg started with " + cmd);
        _this._started = true;
        return _this.emit("_started");
      };
    })(this));
    this._ffmpeg.on("error", (function(_this) {
      return function(err) {
        if (err.code === "ENOENT") {
          debug("ffmpeg failed to start.");
          return _this.emit("error", "ffmpeg failed to start");
        } else {
          debug("ffmpeg decoding error: " + err);
          return _this.emit("error", "ffmpeg decoding error: " + err);
        }
      };
    })(this));
    this._ffmpeg.writeToStream(this._out);
    this._min = null;
    this._max = null;
    this._samples = 0;
    oddByte = null;
    this._out.on("readable", (function(_this) {
      return function() {
        var data, dataLen, i, value, _results;
        _results = [];
        while (data = _this._out.read()) {
          i = 0;
          dataLen = data.length;
          if (oddByte != null) {
            value = ((data.readInt8(0, true) << 8) | oddByte) / 256;
            oddByte = null;
            i = 1;
          } else {
            value = data.readInt16LE(0, true) / 256;
            i = 2;
          }
          _results.push((function() {
            var _results1;
            _results1 = [];
            while (true) {
              this._min = Math.min(this._min, value);
              this._max = Math.max(this._max, value);
              this._samples += 1;
              if (this._samples === this._samplesPerPixel) {
                this.push([Math.round(this._min), Math.round(this._max)]);
                this._min = null;
                this._max = null;
                this._samples = 0;
              }
              if (i >= dataLen) {
                break;
              }
              value = data.readInt16LE(i, true) / 256;
              _results1.push(i += 2);
            }
            return _results1;
          }).call(_this));
        }
        return _results;
      };
    })(this));
  }

  WaveformStream.prototype._transform = function(chunk, encoding, cb) {
    debug("_trans chunk: " + chunk.length);
    if (this._started) {
      return this._buf.write(chunk, encoding, cb);
    } else {
      return this.once("_started", (function(_this) {
        return function() {
          return _this._buf.write(chunk, encoding, cb);
        };
      })(this));
    }
  };

  WaveformStream.prototype._flush = function(cb) {
    this._buf.end();
    return this._out.once("end", (function(_this) {
      return function() {
        if (_this._samples > 0) {
          _this.push([_this._min, _this._max]);
        }
        return cb();
      };
    })(this));
  };

  return WaveformStream;

})(require("stream").Transform);

//# sourceMappingURL=stream.js.map
