PassThrough     = require("stream").PassThrough
FFmpeg          = require "fluent-ffmpeg"

debug = require("debug")("sm-waveform:stream")

module.exports = class WaveformStream extends require("stream").Transform
    constructor: (@_pixelRate,@_sampleRate=44100) ->
        @_samplesPerPixel = @_sampleRate / @_pixelRate

        super

        # We input buffers and output objects
        @_writableState.objectMode = false
        @_readableState.objectMode = true
        @_readableState.highWaterMark = 1024

        @_buf = new PassThrough
        @_out = new PassThrough

        @_ffmpeg = new FFmpeg( source:@_buf, captureStderr:false ).addOptions ["-f s16le","-ac 1","-acodec pcm_s16le","-ar #{@_sampleRate}"]

        @_ffmpeg.on "start", (cmd) =>
            debug "ffmpeg started with #{ cmd }"
            @_started = true
            @emit "_started"

        @_ffmpeg.on "error", (err) =>
            if err.code == "ENOENT"
                debug "ffmpeg failed to start."
                @emit "error", "ffmpeg failed to start"
            else
                debug "ffmpeg decoding error: #{ err }"
                @emit "error", "ffmpeg decoding error: #{err}"

        @_ffmpeg.writeToStream @_out

        # these will be reset each time we cross samples per pixel
        @_min = null
        @_max = null
        @_samples = 0

        oddByte = null

        @_out.on "readable", =>
            while data = @_out.read()
                #debug "out read: #{data.length}"
                i = 0
                dataLen = data.length

                if oddByte?
                    value = ((data.readInt8(0, true) << 8) | oddByte) / 256;
                    oddByte = null
                    i = 1
                else
                    value = data.readInt16LE(0, true) / 256
                    i = 2

                loop
                    @_min = Math.min(@_min,value)
                    @_max = Math.max(@_max,value)
                    @_samples += 1

                    if @_samples == @_samplesPerPixel
                        @push [Math.round(@_min),Math.round(@_max)]
                        @_min = null
                        @_max = null
                        @_samples = 0

                    break if i >= dataLen

                    value = data.readInt16LE(i, true) / 256
                    i += 2

    #----------

    _transform: (chunk,encoding,cb) ->
        debug "_trans chunk: #{chunk.length}"
        if @_started
            @_buf.write chunk, encoding, cb
        else
            @once "_started", =>
                @_buf.write chunk, encoding, cb

    #----------

    _flush: (cb) ->
        @_buf.end()

        @_out.once "end", =>
            if @_samples > 0
                @push [@_min,@_max]

            cb()

    #----------