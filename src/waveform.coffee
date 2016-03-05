WaveformStream = require "./stream"
_ = require 'underscore'
util = require 'util'

debug = require("debug")("sm-waveform:waveform")

###
Readable audio streams go in, waveform JSON comes out.
###

module.exports = class Waveform
    DefaultOpts:
        pixelRate: 20
        sampleRate: 44100

    constructor: (stream, opts, cb) ->
        if _.isFunction(opts)
            cb = opts
            opts = null

        @opts = _.defaults opts||{}, @DefaultOpts
        cb = _.once cb

        debug "New waveform with opts: #{util.inspect(@opts)}"

        @_errored = false

        @_samples = []
        ws = new WaveformStream @opts.pixelRate, @opts.sampleRate

        ws.on "readable", =>
            @_samples.push(px) while px = ws.read()

        ws.on "error", (err) =>
            # need to abort cleanly... not this...
            cb err
            @_errored = true

        ws.once "end", =>
            debug "Waveform got stream end"
            # we've got our output
            cb null, @ if !@_errored

        stream.pipe(ws)

    #----------

    asJSON: ->
        sample_rate: @opts.sampleRate
        samples_per_pixel: @opts.sampleRate / @opts.pixelRate
        bits: 16
        length: @_samples.length
        data: _.flatten(@_samples)

