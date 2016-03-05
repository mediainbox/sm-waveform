var Waveform, WaveformStream, debug, util, _;

WaveformStream = require("./stream");

_ = require('underscore');

util = require('util');

debug = require("debug")("sm-waveform:waveform");


/*
Readable audio streams go in, waveform JSON comes out.
 */

module.exports = Waveform = (function() {
  Waveform.prototype.DefaultOpts = {
    pixelRate: 20,
    sampleRate: 44100
  };

  function Waveform(stream, opts, cb) {
    var ws;
    if (_.isFunction(opts)) {
      cb = opts;
      opts = null;
    }
    this.opts = _.defaults(opts || {}, this.DefaultOpts);
    cb = _.once(cb);
    debug("New waveform with opts: " + (util.inspect(this.opts)));
    this._errored = false;
    this._samples = [];
    ws = new WaveformStream(this.opts.pixelRate, this.opts.sampleRate);
    ws.on("readable", (function(_this) {
      return function() {
        var px, _results;
        _results = [];
        while (px = ws.read()) {
          _results.push(_this._samples.push(px));
        }
        return _results;
      };
    })(this));
    ws.on("error", (function(_this) {
      return function(err) {
        cb(err);
        return _this._errored = true;
      };
    })(this));
    ws.once("end", (function(_this) {
      return function() {
        debug("Waveform got stream end");
        if (!_this._errored) {
          return cb(null, _this);
        }
      };
    })(this));
    stream.pipe(ws);
  }

  Waveform.prototype.asJSON = function() {
    return {
      sample_rate: this.opts.sampleRate,
      samples_per_pixel: this.opts.sampleRate / this.opts.pixelRate,
      bits: 16,
      length: this._samples.length,
      data: _.flatten(this._samples)
    };
  };

  return Waveform;

})();

//# sourceMappingURL=waveform.js.map
