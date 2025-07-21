var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import require$$0 from "stream";
import require$$0$1 from "tty";
import require$$1 from "util";
import require$$0$2 from "os";
import require$$1$1 from "path";
import require$$0$3 from "fs";
import require$$1$2 from "events";
import require$$0$4 from "child_process";
function _mergeNamespaces(n, m) {
  for (var i = 0; i < m.length; i++) {
    const e = m[i];
    if (typeof e !== "string" && !Array.isArray(e)) {
      for (const k in e) {
        if (k !== "default" && !(k in n)) {
          const d = Object.getOwnPropertyDescriptor(e, k);
          if (d) {
            Object.defineProperty(n, k, d.get ? d : {
              enumerable: true,
              get: () => e[k]
            });
          }
        }
      }
    }
  }
  return Object.freeze(Object.defineProperty(n, Symbol.toStringTag, { value: "Module" }));
}
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var dist$g = {};
var dist$f = {};
Object.defineProperty(dist$f, "__esModule", { value: true });
dist$f.ByteLengthParser = void 0;
const stream_1$d = require$$0;
class ByteLengthParser extends stream_1$d.Transform {
  constructor(options) {
    super(options);
    __publicField(this, "length");
    __publicField(this, "position");
    __publicField(this, "buffer");
    if (typeof options.length !== "number") {
      throw new TypeError('"length" is not a number');
    }
    if (options.length < 1) {
      throw new TypeError('"length" is not greater than 0');
    }
    this.length = options.length;
    this.position = 0;
    this.buffer = Buffer.alloc(this.length);
  }
  _transform(chunk, _encoding, cb) {
    let cursor = 0;
    while (cursor < chunk.length) {
      this.buffer[this.position] = chunk[cursor];
      cursor++;
      this.position++;
      if (this.position === this.length) {
        this.push(this.buffer);
        this.buffer = Buffer.alloc(this.length);
        this.position = 0;
      }
    }
    cb();
  }
  _flush(cb) {
    this.push(this.buffer.slice(0, this.position));
    this.buffer = Buffer.alloc(this.length);
    cb();
  }
}
dist$f.ByteLengthParser = ByteLengthParser;
var dist$e = {};
Object.defineProperty(dist$e, "__esModule", { value: true });
dist$e.CCTalkParser = void 0;
const stream_1$c = require$$0;
class CCTalkParser extends stream_1$c.Transform {
  constructor(maxDelayBetweenBytesMs = 50) {
    super();
    __publicField(this, "array");
    __publicField(this, "cursor");
    __publicField(this, "lastByteFetchTime");
    __publicField(this, "maxDelayBetweenBytesMs");
    this.array = [];
    this.cursor = 0;
    this.lastByteFetchTime = 0;
    this.maxDelayBetweenBytesMs = maxDelayBetweenBytesMs;
  }
  _transform(buffer, encoding, cb) {
    if (this.maxDelayBetweenBytesMs > 0) {
      const now = Date.now();
      if (now - this.lastByteFetchTime > this.maxDelayBetweenBytesMs) {
        this.array = [];
        this.cursor = 0;
      }
      this.lastByteFetchTime = now;
    }
    this.cursor += buffer.length;
    Array.from(buffer).map((byte) => this.array.push(byte));
    while (this.cursor > 1 && this.cursor >= this.array[1] + 5) {
      const FullMsgLength = this.array[1] + 5;
      const frame = Buffer.from(this.array.slice(0, FullMsgLength));
      this.array = this.array.slice(frame.length, this.array.length);
      this.cursor -= FullMsgLength;
      this.push(frame);
    }
    cb();
  }
}
dist$e.CCTalkParser = CCTalkParser;
var dist$d = {};
Object.defineProperty(dist$d, "__esModule", { value: true });
dist$d.DelimiterParser = void 0;
const stream_1$b = require$$0;
let DelimiterParser$1 = class DelimiterParser extends stream_1$b.Transform {
  constructor({ delimiter, includeDelimiter = false, ...options }) {
    super(options);
    __publicField(this, "includeDelimiter");
    __publicField(this, "delimiter");
    __publicField(this, "buffer");
    if (delimiter === void 0) {
      throw new TypeError('"delimiter" is not a bufferable object');
    }
    if (delimiter.length === 0) {
      throw new TypeError('"delimiter" has a 0 or undefined length');
    }
    this.includeDelimiter = includeDelimiter;
    this.delimiter = Buffer.from(delimiter);
    this.buffer = Buffer.alloc(0);
  }
  _transform(chunk, encoding, cb) {
    let data = Buffer.concat([this.buffer, chunk]);
    let position;
    while ((position = data.indexOf(this.delimiter)) !== -1) {
      this.push(data.slice(0, position + (this.includeDelimiter ? this.delimiter.length : 0)));
      data = data.slice(position + this.delimiter.length);
    }
    this.buffer = data;
    cb();
  }
  _flush(cb) {
    this.push(this.buffer);
    this.buffer = Buffer.alloc(0);
    cb();
  }
};
dist$d.DelimiterParser = DelimiterParser$1;
var dist$c = {};
Object.defineProperty(dist$c, "__esModule", { value: true });
dist$c.InterByteTimeoutParser = void 0;
const stream_1$a = require$$0;
class InterByteTimeoutParser extends stream_1$a.Transform {
  constructor({ maxBufferSize = 65536, interval, ...transformOptions }) {
    super(transformOptions);
    __publicField(this, "maxBufferSize");
    __publicField(this, "currentPacket");
    __publicField(this, "interval");
    __publicField(this, "intervalID");
    if (!interval) {
      throw new TypeError('"interval" is required');
    }
    if (typeof interval !== "number" || Number.isNaN(interval)) {
      throw new TypeError('"interval" is not a number');
    }
    if (interval < 1) {
      throw new TypeError('"interval" is not greater than 0');
    }
    if (typeof maxBufferSize !== "number" || Number.isNaN(maxBufferSize)) {
      throw new TypeError('"maxBufferSize" is not a number');
    }
    if (maxBufferSize < 1) {
      throw new TypeError('"maxBufferSize" is not greater than 0');
    }
    this.maxBufferSize = maxBufferSize;
    this.currentPacket = [];
    this.interval = interval;
  }
  _transform(chunk, encoding, cb) {
    if (this.intervalID) {
      clearTimeout(this.intervalID);
    }
    for (let offset = 0; offset < chunk.length; offset++) {
      this.currentPacket.push(chunk[offset]);
      if (this.currentPacket.length >= this.maxBufferSize) {
        this.emitPacket();
      }
    }
    this.intervalID = setTimeout(this.emitPacket.bind(this), this.interval);
    cb();
  }
  emitPacket() {
    if (this.intervalID) {
      clearTimeout(this.intervalID);
    }
    if (this.currentPacket.length > 0) {
      this.push(Buffer.from(this.currentPacket));
    }
    this.currentPacket = [];
  }
  _flush(cb) {
    this.emitPacket();
    cb();
  }
}
dist$c.InterByteTimeoutParser = InterByteTimeoutParser;
var dist$b = {};
Object.defineProperty(dist$b, "__esModule", { value: true });
dist$b.PacketLengthParser = void 0;
const stream_1$9 = require$$0;
class PacketLengthParser extends stream_1$9.Transform {
  constructor(options = {}) {
    super(options);
    __publicField(this, "buffer");
    __publicField(this, "start");
    __publicField(this, "opts");
    const { delimiter = [170], delimiterBytes = 1, packetOverhead = 2, lengthBytes = 1, lengthOffset = 1, maxLen = 255 } = options;
    this.opts = {
      delimiter: [].concat(delimiter),
      delimiterBytes,
      packetOverhead,
      lengthBytes,
      lengthOffset,
      maxLen
    };
    this.buffer = Buffer.alloc(0);
    this.start = false;
  }
  _transform(chunk, encoding, cb) {
    for (let ndx = 0; ndx < chunk.length; ndx++) {
      const byte = chunk[ndx];
      if (true === this.start) {
        this.buffer = Buffer.concat([this.buffer, Buffer.from([byte])]);
        if (this.buffer.length >= this.opts.lengthOffset + this.opts.lengthBytes) {
          const len = this.buffer.readUIntLE(this.opts.lengthOffset, this.opts.lengthBytes);
          if (this.buffer.length == len + this.opts.packetOverhead || len > this.opts.maxLen) {
            this.push(this.buffer);
            this.buffer = Buffer.alloc(0);
            this.start = false;
          }
        }
      } else {
        this.buffer = Buffer.concat([Buffer.from([byte]), this.buffer]);
        if (this.buffer.length === this.opts.delimiterBytes) {
          const delimiter = this.buffer.readUIntLE(0, this.opts.delimiterBytes);
          if (this.opts.delimiter.includes(delimiter)) {
            this.start = true;
            this.buffer = Buffer.from([...this.buffer].reverse());
          } else {
            this.buffer = Buffer.from(this.buffer.subarray(1, this.buffer.length));
          }
        }
      }
    }
    cb();
  }
  _flush(cb) {
    this.push(this.buffer);
    this.buffer = Buffer.alloc(0);
    cb();
  }
}
dist$b.PacketLengthParser = PacketLengthParser;
var dist$a = {};
Object.defineProperty(dist$a, "__esModule", { value: true });
dist$a.ReadlineParser = void 0;
const parser_delimiter_1$1 = dist$d;
let ReadlineParser$1 = class ReadlineParser extends parser_delimiter_1$1.DelimiterParser {
  constructor(options) {
    const opts = {
      delimiter: Buffer.from("\n", "utf8"),
      encoding: "utf8",
      ...options
    };
    if (typeof opts.delimiter === "string") {
      opts.delimiter = Buffer.from(opts.delimiter, opts.encoding);
    }
    super(opts);
  }
};
dist$a.ReadlineParser = ReadlineParser$1;
var dist$9 = {};
Object.defineProperty(dist$9, "__esModule", { value: true });
dist$9.ReadyParser = void 0;
const stream_1$8 = require$$0;
class ReadyParser extends stream_1$8.Transform {
  constructor({ delimiter, ...options }) {
    if (delimiter === void 0) {
      throw new TypeError('"delimiter" is not a bufferable object');
    }
    if (delimiter.length === 0) {
      throw new TypeError('"delimiter" has a 0 or undefined length');
    }
    super(options);
    __publicField(this, "delimiter");
    __publicField(this, "readOffset");
    __publicField(this, "ready");
    this.delimiter = Buffer.from(delimiter);
    this.readOffset = 0;
    this.ready = false;
  }
  _transform(chunk, encoding, cb) {
    if (this.ready) {
      this.push(chunk);
      return cb();
    }
    const delimiter = this.delimiter;
    let chunkOffset = 0;
    while (this.readOffset < delimiter.length && chunkOffset < chunk.length) {
      if (delimiter[this.readOffset] === chunk[chunkOffset]) {
        this.readOffset++;
      } else {
        this.readOffset = 0;
      }
      chunkOffset++;
    }
    if (this.readOffset === delimiter.length) {
      this.ready = true;
      this.emit("ready");
      const chunkRest = chunk.slice(chunkOffset);
      if (chunkRest.length > 0) {
        this.push(chunkRest);
      }
    }
    cb();
  }
}
dist$9.ReadyParser = ReadyParser;
var dist$8 = {};
Object.defineProperty(dist$8, "__esModule", { value: true });
dist$8.RegexParser = void 0;
const stream_1$7 = require$$0;
class RegexParser extends stream_1$7.Transform {
  constructor({ regex, ...options }) {
    const opts = {
      encoding: "utf8",
      ...options
    };
    if (regex === void 0) {
      throw new TypeError('"options.regex" must be a regular expression pattern or object');
    }
    if (!(regex instanceof RegExp)) {
      regex = new RegExp(regex.toString());
    }
    super(opts);
    __publicField(this, "regex");
    __publicField(this, "data");
    this.regex = regex;
    this.data = "";
  }
  _transform(chunk, encoding, cb) {
    const data = this.data + chunk;
    const parts = data.split(this.regex);
    this.data = parts.pop() || "";
    parts.forEach((part) => {
      this.push(part);
    });
    cb();
  }
  _flush(cb) {
    this.push(this.data);
    this.data = "";
    cb();
  }
}
dist$8.RegexParser = RegexParser;
var dist$7 = {};
var decoder = {};
Object.defineProperty(decoder, "__esModule", { value: true });
decoder.SlipDecoder = void 0;
const stream_1$6 = require$$0;
class SlipDecoder extends stream_1$6.Transform {
  constructor(options = {}) {
    super(options);
    __publicField(this, "opts");
    __publicField(this, "buffer");
    __publicField(this, "escape");
    __publicField(this, "start");
    const { START, ESC = 219, END = 192, ESC_START, ESC_END = 220, ESC_ESC = 221 } = options;
    this.opts = {
      START,
      ESC,
      END,
      ESC_START,
      ESC_END,
      ESC_ESC
    };
    this.buffer = Buffer.alloc(0);
    this.escape = false;
    this.start = false;
  }
  _transform(chunk, encoding, cb) {
    for (let ndx = 0; ndx < chunk.length; ndx++) {
      let byte = chunk[ndx];
      if (byte === this.opts.START) {
        this.start = true;
        continue;
      } else if (void 0 == this.opts.START) {
        this.start = true;
      }
      if (this.escape) {
        if (byte === this.opts.ESC_START && this.opts.START) {
          byte = this.opts.START;
        } else if (byte === this.opts.ESC_ESC) {
          byte = this.opts.ESC;
        } else if (byte === this.opts.ESC_END) {
          byte = this.opts.END;
        } else {
          this.escape = false;
          this.push(this.buffer);
          this.buffer = Buffer.alloc(0);
        }
      } else {
        if (byte === this.opts.ESC) {
          this.escape = true;
          continue;
        }
        if (byte === this.opts.END) {
          this.push(this.buffer);
          this.buffer = Buffer.alloc(0);
          this.escape = false;
          this.start = false;
          continue;
        }
      }
      this.escape = false;
      if (this.start) {
        this.buffer = Buffer.concat([this.buffer, Buffer.from([byte])]);
      }
    }
    cb();
  }
  _flush(cb) {
    this.push(this.buffer);
    this.buffer = Buffer.alloc(0);
    cb();
  }
}
decoder.SlipDecoder = SlipDecoder;
var encoder = {};
Object.defineProperty(encoder, "__esModule", { value: true });
encoder.SlipEncoder = void 0;
const stream_1$5 = require$$0;
class SlipEncoder extends stream_1$5.Transform {
  constructor(options = {}) {
    super(options);
    __publicField(this, "opts");
    const { START, ESC = 219, END = 192, ESC_START, ESC_END = 220, ESC_ESC = 221, bluetoothQuirk = false } = options;
    this.opts = {
      START,
      ESC,
      END,
      ESC_START,
      ESC_END,
      ESC_ESC,
      bluetoothQuirk
    };
  }
  _transform(chunk, encoding, cb) {
    const chunkLength = chunk.length;
    if (this.opts.bluetoothQuirk && chunkLength === 0) {
      return cb();
    }
    const encoded = Buffer.alloc(chunkLength * 2 + 2);
    let j = 0;
    if (this.opts.bluetoothQuirk == true) {
      encoded[j++] = this.opts.END;
    }
    if (this.opts.START !== void 0) {
      encoded[j++] = this.opts.START;
    }
    for (let i = 0; i < chunkLength; i++) {
      let byte = chunk[i];
      if (byte === this.opts.START && this.opts.ESC_START) {
        encoded[j++] = this.opts.ESC;
        byte = this.opts.ESC_START;
      } else if (byte === this.opts.END) {
        encoded[j++] = this.opts.ESC;
        byte = this.opts.ESC_END;
      } else if (byte === this.opts.ESC) {
        encoded[j++] = this.opts.ESC;
        byte = this.opts.ESC_ESC;
      }
      encoded[j++] = byte;
    }
    encoded[j++] = this.opts.END;
    cb(null, encoded.slice(0, j));
  }
}
encoder.SlipEncoder = SlipEncoder;
(function(exports) {
  var __createBinding = commonjsGlobal && commonjsGlobal.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === void 0) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === void 0) k2 = k;
    o[k2] = m[k];
  });
  var __exportStar = commonjsGlobal && commonjsGlobal.__exportStar || function(m, exports2) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  __exportStar(decoder, exports);
  __exportStar(encoder, exports);
})(dist$7);
var dist$6 = {};
var utils = {};
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.convertHeaderBufferToObj = exports.HEADER_LENGTH = void 0;
  exports.HEADER_LENGTH = 6;
  const toOctetStr = (num) => {
    let str = Number(num).toString(2);
    while (str.length < 8) {
      str = `0${str}`;
    }
    return str;
  };
  const convertHeaderBufferToObj = (buf) => {
    const headerStr = Array.from(buf.slice(0, exports.HEADER_LENGTH)).reduce((accum, curr) => `${accum}${toOctetStr(curr)}`, "");
    const isVersion1 = headerStr.slice(0, 3) === "000";
    const versionNumber = isVersion1 ? 1 : "UNKNOWN_VERSION";
    const type = Number(headerStr[3]);
    const secondaryHeader = Number(headerStr[4]);
    const apid = parseInt(headerStr.slice(5, 16), 2);
    const sequenceFlags = parseInt(headerStr.slice(16, 18), 2);
    const packetName = parseInt(headerStr.slice(18, 32), 2);
    const dataLength = parseInt(headerStr.slice(-16), 2) + 1;
    return {
      versionNumber,
      identification: {
        apid,
        secondaryHeader,
        type
      },
      sequenceControl: {
        packetName,
        sequenceFlags
      },
      dataLength
    };
  };
  exports.convertHeaderBufferToObj = convertHeaderBufferToObj;
})(utils);
Object.defineProperty(dist$6, "__esModule", { value: true });
dist$6.SpacePacketParser = void 0;
const stream_1$4 = require$$0;
const utils_1 = utils;
class SpacePacketParser extends stream_1$4.Transform {
  /**
   * A Transform stream that accepts a stream of octet data and emits object representations of
   * CCSDS Space Packets once a packet has been completely received.
   * @param {Object} [options] Configuration options for the stream
   * @param {Number} options.timeCodeFieldLength The length of the time code field within the data
   * @param {Number} options.ancillaryDataFieldLength The length of the ancillary data field within the data
   */
  constructor(options = {}) {
    super({ ...options, objectMode: true });
    __publicField(this, "timeCodeFieldLength");
    __publicField(this, "ancillaryDataFieldLength");
    __publicField(this, "dataBuffer");
    __publicField(this, "headerBuffer");
    __publicField(this, "dataLength");
    __publicField(this, "expectingHeader");
    __publicField(this, "dataSlice");
    __publicField(this, "header");
    this.timeCodeFieldLength = options.timeCodeFieldLength || 0;
    this.ancillaryDataFieldLength = options.ancillaryDataFieldLength || 0;
    this.dataSlice = this.timeCodeFieldLength + this.ancillaryDataFieldLength;
    this.dataBuffer = Buffer.alloc(0);
    this.headerBuffer = Buffer.alloc(0);
    this.dataLength = 0;
    this.expectingHeader = true;
  }
  /**
   * Bundle the header, secondary header if present, and the data into a JavaScript object to emit.
   * If more data has been received past the current packet, begin the process of parsing the next
   * packet(s).
   */
  pushCompletedPacket() {
    if (!this.header) {
      throw new Error("Missing header");
    }
    const timeCode = Buffer.from(this.dataBuffer.slice(0, this.timeCodeFieldLength));
    const ancillaryData = Buffer.from(this.dataBuffer.slice(this.timeCodeFieldLength, this.timeCodeFieldLength + this.ancillaryDataFieldLength));
    const data = Buffer.from(this.dataBuffer.slice(this.dataSlice, this.dataLength));
    const completedPacket = {
      header: { ...this.header },
      data: data.toString()
    };
    if (timeCode.length > 0 || ancillaryData.length > 0) {
      completedPacket.secondaryHeader = {};
      if (timeCode.length) {
        completedPacket.secondaryHeader.timeCode = timeCode.toString();
      }
      if (ancillaryData.length) {
        completedPacket.secondaryHeader.ancillaryData = ancillaryData.toString();
      }
    }
    this.push(completedPacket);
    const nextChunk = Buffer.from(this.dataBuffer.slice(this.dataLength));
    if (nextChunk.length >= utils_1.HEADER_LENGTH) {
      this.extractHeader(nextChunk);
    } else {
      this.headerBuffer = nextChunk;
      this.dataBuffer = Buffer.alloc(0);
      this.expectingHeader = true;
      this.dataLength = 0;
      this.header = void 0;
    }
  }
  /**
   * Build the Stream's headerBuffer property from the received Buffer chunk; extract data from it
   * if it's complete. If there's more to the chunk than just the header, initiate handling the
   * packet data.
   * @param chunk -  Build the Stream's headerBuffer property from
   */
  extractHeader(chunk) {
    const headerAsBuffer = Buffer.concat([this.headerBuffer, chunk]);
    const startOfDataBuffer = headerAsBuffer.slice(utils_1.HEADER_LENGTH);
    if (headerAsBuffer.length >= utils_1.HEADER_LENGTH) {
      this.header = (0, utils_1.convertHeaderBufferToObj)(headerAsBuffer);
      this.dataLength = this.header.dataLength;
      this.headerBuffer = Buffer.alloc(0);
      this.expectingHeader = false;
    } else {
      this.headerBuffer = headerAsBuffer;
    }
    if (startOfDataBuffer.length > 0) {
      this.dataBuffer = Buffer.from(startOfDataBuffer);
      if (this.dataBuffer.length >= this.dataLength) {
        this.pushCompletedPacket();
      }
    }
  }
  _transform(chunk, encoding, cb) {
    if (this.expectingHeader) {
      this.extractHeader(chunk);
    } else {
      this.dataBuffer = Buffer.concat([this.dataBuffer, chunk]);
      if (this.dataBuffer.length >= this.dataLength) {
        this.pushCompletedPacket();
      }
    }
    cb();
  }
  _flush(cb) {
    const remaining = Buffer.concat([this.headerBuffer, this.dataBuffer]);
    const remainingArray = Array.from(remaining);
    this.push(remainingArray);
    cb();
  }
}
dist$6.SpacePacketParser = SpacePacketParser;
var serialportMock = {};
var dist$5 = {};
var src$2 = { exports: {} };
var browser$2 = { exports: {} };
var ms;
var hasRequiredMs;
function requireMs() {
  if (hasRequiredMs) return ms;
  hasRequiredMs = 1;
  var s = 1e3;
  var m = s * 60;
  var h = m * 60;
  var d = h * 24;
  var w = d * 7;
  var y = d * 365.25;
  ms = function(val, options) {
    options = options || {};
    var type = typeof val;
    if (type === "string" && val.length > 0) {
      return parse(val);
    } else if (type === "number" && isFinite(val)) {
      return options.long ? fmtLong(val) : fmtShort(val);
    }
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
    );
  };
  function parse(str) {
    str = String(str);
    if (str.length > 100) {
      return;
    }
    var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
      str
    );
    if (!match) {
      return;
    }
    var n = parseFloat(match[1]);
    var type = (match[2] || "ms").toLowerCase();
    switch (type) {
      case "years":
      case "year":
      case "yrs":
      case "yr":
      case "y":
        return n * y;
      case "weeks":
      case "week":
      case "w":
        return n * w;
      case "days":
      case "day":
      case "d":
        return n * d;
      case "hours":
      case "hour":
      case "hrs":
      case "hr":
      case "h":
        return n * h;
      case "minutes":
      case "minute":
      case "mins":
      case "min":
      case "m":
        return n * m;
      case "seconds":
      case "second":
      case "secs":
      case "sec":
      case "s":
        return n * s;
      case "milliseconds":
      case "millisecond":
      case "msecs":
      case "msec":
      case "ms":
        return n;
      default:
        return void 0;
    }
  }
  function fmtShort(ms2) {
    var msAbs = Math.abs(ms2);
    if (msAbs >= d) {
      return Math.round(ms2 / d) + "d";
    }
    if (msAbs >= h) {
      return Math.round(ms2 / h) + "h";
    }
    if (msAbs >= m) {
      return Math.round(ms2 / m) + "m";
    }
    if (msAbs >= s) {
      return Math.round(ms2 / s) + "s";
    }
    return ms2 + "ms";
  }
  function fmtLong(ms2) {
    var msAbs = Math.abs(ms2);
    if (msAbs >= d) {
      return plural(ms2, msAbs, d, "day");
    }
    if (msAbs >= h) {
      return plural(ms2, msAbs, h, "hour");
    }
    if (msAbs >= m) {
      return plural(ms2, msAbs, m, "minute");
    }
    if (msAbs >= s) {
      return plural(ms2, msAbs, s, "second");
    }
    return ms2 + " ms";
  }
  function plural(ms2, msAbs, n, name) {
    var isPlural = msAbs >= n * 1.5;
    return Math.round(ms2 / n) + " " + name + (isPlural ? "s" : "");
  }
  return ms;
}
var common$2;
var hasRequiredCommon$2;
function requireCommon$2() {
  if (hasRequiredCommon$2) return common$2;
  hasRequiredCommon$2 = 1;
  function setup(env) {
    createDebug.debug = createDebug;
    createDebug.default = createDebug;
    createDebug.coerce = coerce;
    createDebug.disable = disable;
    createDebug.enable = enable;
    createDebug.enabled = enabled;
    createDebug.humanize = requireMs();
    createDebug.destroy = destroy;
    Object.keys(env).forEach((key) => {
      createDebug[key] = env[key];
    });
    createDebug.names = [];
    createDebug.skips = [];
    createDebug.formatters = {};
    function selectColor(namespace) {
      let hash = 0;
      for (let i = 0; i < namespace.length; i++) {
        hash = (hash << 5) - hash + namespace.charCodeAt(i);
        hash |= 0;
      }
      return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
    }
    createDebug.selectColor = selectColor;
    function createDebug(namespace) {
      let prevTime;
      let enableOverride = null;
      let namespacesCache;
      let enabledCache;
      function debug2(...args) {
        if (!debug2.enabled) {
          return;
        }
        const self2 = debug2;
        const curr = Number(/* @__PURE__ */ new Date());
        const ms2 = curr - (prevTime || curr);
        self2.diff = ms2;
        self2.prev = prevTime;
        self2.curr = curr;
        prevTime = curr;
        args[0] = createDebug.coerce(args[0]);
        if (typeof args[0] !== "string") {
          args.unshift("%O");
        }
        let index2 = 0;
        args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
          if (match === "%%") {
            return "%";
          }
          index2++;
          const formatter = createDebug.formatters[format];
          if (typeof formatter === "function") {
            const val = args[index2];
            match = formatter.call(self2, val);
            args.splice(index2, 1);
            index2--;
          }
          return match;
        });
        createDebug.formatArgs.call(self2, args);
        const logFn = self2.log || createDebug.log;
        logFn.apply(self2, args);
      }
      debug2.namespace = namespace;
      debug2.useColors = createDebug.useColors();
      debug2.color = createDebug.selectColor(namespace);
      debug2.extend = extend;
      debug2.destroy = createDebug.destroy;
      Object.defineProperty(debug2, "enabled", {
        enumerable: true,
        configurable: false,
        get: () => {
          if (enableOverride !== null) {
            return enableOverride;
          }
          if (namespacesCache !== createDebug.namespaces) {
            namespacesCache = createDebug.namespaces;
            enabledCache = createDebug.enabled(namespace);
          }
          return enabledCache;
        },
        set: (v) => {
          enableOverride = v;
        }
      });
      if (typeof createDebug.init === "function") {
        createDebug.init(debug2);
      }
      return debug2;
    }
    function extend(namespace, delimiter) {
      const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
      newDebug.log = this.log;
      return newDebug;
    }
    function enable(namespaces) {
      createDebug.save(namespaces);
      createDebug.namespaces = namespaces;
      createDebug.names = [];
      createDebug.skips = [];
      const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(" ", ",").split(",").filter(Boolean);
      for (const ns of split) {
        if (ns[0] === "-") {
          createDebug.skips.push(ns.slice(1));
        } else {
          createDebug.names.push(ns);
        }
      }
    }
    function matchesTemplate(search, template) {
      let searchIndex = 0;
      let templateIndex = 0;
      let starIndex = -1;
      let matchIndex = 0;
      while (searchIndex < search.length) {
        if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
          if (template[templateIndex] === "*") {
            starIndex = templateIndex;
            matchIndex = searchIndex;
            templateIndex++;
          } else {
            searchIndex++;
            templateIndex++;
          }
        } else if (starIndex !== -1) {
          templateIndex = starIndex + 1;
          matchIndex++;
          searchIndex = matchIndex;
        } else {
          return false;
        }
      }
      while (templateIndex < template.length && template[templateIndex] === "*") {
        templateIndex++;
      }
      return templateIndex === template.length;
    }
    function disable() {
      const namespaces = [
        ...createDebug.names,
        ...createDebug.skips.map((namespace) => "-" + namespace)
      ].join(",");
      createDebug.enable("");
      return namespaces;
    }
    function enabled(name) {
      for (const skip of createDebug.skips) {
        if (matchesTemplate(name, skip)) {
          return false;
        }
      }
      for (const ns of createDebug.names) {
        if (matchesTemplate(name, ns)) {
          return true;
        }
      }
      return false;
    }
    function coerce(val) {
      if (val instanceof Error) {
        return val.stack || val.message;
      }
      return val;
    }
    function destroy() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    createDebug.enable(createDebug.load());
    return createDebug;
  }
  common$2 = setup;
  return common$2;
}
var hasRequiredBrowser$2;
function requireBrowser$2() {
  if (hasRequiredBrowser$2) return browser$2.exports;
  hasRequiredBrowser$2 = 1;
  (function(module, exports) {
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.storage = localstorage();
    exports.destroy = /* @__PURE__ */ (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      let m;
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      let index2 = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index2++;
        if (match === "%c") {
          lastC = index2;
        }
      });
      args.splice(lastC, 0, c);
    }
    exports.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports.storage.setItem("debug", namespaces);
        } else {
          exports.storage.removeItem("debug");
        }
      } catch (error) {
      }
    }
    function load() {
      let r;
      try {
        r = exports.storage.getItem("debug");
      } catch (error) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error) {
      }
    }
    module.exports = requireCommon$2()(exports);
    const { formatters } = module.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error) {
        return "[UnexpectedJSONParseError]: " + error.message;
      }
    };
  })(browser$2, browser$2.exports);
  return browser$2.exports;
}
var node$2 = { exports: {} };
var hasFlag;
var hasRequiredHasFlag;
function requireHasFlag() {
  if (hasRequiredHasFlag) return hasFlag;
  hasRequiredHasFlag = 1;
  hasFlag = (flag, argv = process.argv) => {
    const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
    const position = argv.indexOf(prefix + flag);
    const terminatorPosition = argv.indexOf("--");
    return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
  };
  return hasFlag;
}
var supportsColor_1;
var hasRequiredSupportsColor;
function requireSupportsColor() {
  if (hasRequiredSupportsColor) return supportsColor_1;
  hasRequiredSupportsColor = 1;
  const os = require$$0$2;
  const tty = require$$0$1;
  const hasFlag2 = requireHasFlag();
  const { env } = process;
  let forceColor;
  if (hasFlag2("no-color") || hasFlag2("no-colors") || hasFlag2("color=false") || hasFlag2("color=never")) {
    forceColor = 0;
  } else if (hasFlag2("color") || hasFlag2("colors") || hasFlag2("color=true") || hasFlag2("color=always")) {
    forceColor = 1;
  }
  if ("FORCE_COLOR" in env) {
    if (env.FORCE_COLOR === "true") {
      forceColor = 1;
    } else if (env.FORCE_COLOR === "false") {
      forceColor = 0;
    } else {
      forceColor = env.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(env.FORCE_COLOR, 10), 3);
    }
  }
  function translateLevel(level) {
    if (level === 0) {
      return false;
    }
    return {
      level,
      hasBasic: true,
      has256: level >= 2,
      has16m: level >= 3
    };
  }
  function supportsColor(haveStream, streamIsTTY) {
    if (forceColor === 0) {
      return 0;
    }
    if (hasFlag2("color=16m") || hasFlag2("color=full") || hasFlag2("color=truecolor")) {
      return 3;
    }
    if (hasFlag2("color=256")) {
      return 2;
    }
    if (haveStream && !streamIsTTY && forceColor === void 0) {
      return 0;
    }
    const min = forceColor || 0;
    if (env.TERM === "dumb") {
      return min;
    }
    if (process.platform === "win32") {
      const osRelease = os.release().split(".");
      if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
        return Number(osRelease[2]) >= 14931 ? 3 : 2;
      }
      return 1;
    }
    if ("CI" in env) {
      if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((sign) => sign in env) || env.CI_NAME === "codeship") {
        return 1;
      }
      return min;
    }
    if ("TEAMCITY_VERSION" in env) {
      return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
    }
    if (env.COLORTERM === "truecolor") {
      return 3;
    }
    if ("TERM_PROGRAM" in env) {
      const version = parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
      switch (env.TERM_PROGRAM) {
        case "iTerm.app":
          return version >= 3 ? 3 : 2;
        case "Apple_Terminal":
          return 2;
      }
    }
    if (/-256(color)?$/i.test(env.TERM)) {
      return 2;
    }
    if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
      return 1;
    }
    if ("COLORTERM" in env) {
      return 1;
    }
    return min;
  }
  function getSupportLevel(stream) {
    const level = supportsColor(stream, stream && stream.isTTY);
    return translateLevel(level);
  }
  supportsColor_1 = {
    supportsColor: getSupportLevel,
    stdout: translateLevel(supportsColor(true, tty.isatty(1))),
    stderr: translateLevel(supportsColor(true, tty.isatty(2)))
  };
  return supportsColor_1;
}
var hasRequiredNode$2;
function requireNode$2() {
  if (hasRequiredNode$2) return node$2.exports;
  hasRequiredNode$2 = 1;
  (function(module, exports) {
    const tty = require$$0$1;
    const util = require$$1;
    exports.init = init;
    exports.log = log;
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.destroy = util.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    );
    exports.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor = requireSupportsColor();
      if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
        exports.colors = [
          20,
          21,
          26,
          27,
          32,
          33,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          56,
          57,
          62,
          63,
          68,
          69,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          92,
          93,
          98,
          99,
          112,
          113,
          128,
          129,
          134,
          135,
          148,
          149,
          160,
          161,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          171,
          172,
          173,
          178,
          179,
          184,
          185,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          208,
          209,
          214,
          215,
          220,
          221
        ];
      }
    } catch (error) {
    }
    exports.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
        return k.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c = this.color;
        const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
        const prefix = `  ${colorCode};1m${name} \x1B[0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module.exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports.inspectOpts.hideDate) {
        return "";
      }
      return (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function log(...args) {
      return process.stderr.write(util.formatWithOptions(exports.inspectOpts, ...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function init(debug2) {
      debug2.inspectOpts = {};
      const keys = Object.keys(exports.inspectOpts);
      for (let i = 0; i < keys.length; i++) {
        debug2.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
      }
    }
    module.exports = requireCommon$2()(exports);
    const { formatters } = module.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts);
    };
  })(node$2, node$2.exports);
  return node$2.exports;
}
if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
  src$2.exports = requireBrowser$2();
} else {
  src$2.exports = requireNode$2();
}
var srcExports$2 = src$2.exports;
var __importDefault$3 = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(dist$5, "__esModule", { value: true });
dist$5.SerialPortStream = dist$5.DisconnectedError = void 0;
const stream_1$3 = require$$0;
const debug_1$2 = __importDefault$3(srcExports$2);
const debug$3 = (0, debug_1$2.default)("serialport/stream");
class DisconnectedError extends Error {
  constructor(message) {
    super(message);
    __publicField(this, "disconnected");
    this.disconnected = true;
  }
}
dist$5.DisconnectedError = DisconnectedError;
const defaultSetFlags = {
  brk: false,
  cts: false,
  dtr: true,
  rts: true
};
function allocNewReadPool(poolSize) {
  const pool = Buffer.allocUnsafe(poolSize);
  pool.used = 0;
  return pool;
}
class SerialPortStream extends stream_1$3.Duplex {
  /**
   * Create a new serial port object for the `path`. In the case of invalid arguments or invalid options, when constructing a new SerialPort it will throw an error. The port will open automatically by default, which is the equivalent of calling `port.open(openCallback)` in the next tick. You can disable this by setting the option `autoOpen` to `false`.
   * @emits open
   * @emits data
   * @emits close
   * @emits error
   */
  constructor(options, openCallback) {
    const settings = {
      autoOpen: true,
      endOnClose: false,
      highWaterMark: 64 * 1024,
      ...options
    };
    super({
      highWaterMark: settings.highWaterMark
    });
    __publicField(this, "port");
    __publicField(this, "_pool");
    __publicField(this, "_kMinPoolSpace");
    __publicField(this, "opening");
    __publicField(this, "closing");
    __publicField(this, "settings");
    if (!settings.binding) {
      throw new TypeError('"Bindings" is invalid pass it as `options.binding`');
    }
    if (!settings.path) {
      throw new TypeError(`"path" is not defined: ${settings.path}`);
    }
    if (typeof settings.baudRate !== "number") {
      throw new TypeError(`"baudRate" must be a number: ${settings.baudRate}`);
    }
    this.settings = settings;
    this.opening = false;
    this.closing = false;
    this._pool = allocNewReadPool(this.settings.highWaterMark);
    this._kMinPoolSpace = 128;
    if (this.settings.autoOpen) {
      this.open(openCallback);
    }
  }
  get path() {
    return this.settings.path;
  }
  get baudRate() {
    return this.settings.baudRate;
  }
  get isOpen() {
    var _a;
    return (((_a = this.port) == null ? void 0 : _a.isOpen) ?? false) && !this.closing;
  }
  _error(error, callback) {
    if (callback) {
      callback.call(this, error);
    } else {
      this.emit("error", error);
    }
  }
  _asyncError(error, callback) {
    process.nextTick(() => this._error(error, callback));
  }
  /**
   * Opens a connection to the given serial port.
   * @param {ErrorCallback=} openCallback - Called after a connection is opened. If this is not provided and an error occurs, it will be emitted on the port's `error` event.
   * @emits open
   */
  open(openCallback) {
    if (this.isOpen) {
      return this._asyncError(new Error("Port is already open"), openCallback);
    }
    if (this.opening) {
      return this._asyncError(new Error("Port is opening"), openCallback);
    }
    const { highWaterMark, binding, autoOpen, endOnClose, ...openOptions } = this.settings;
    this.opening = true;
    debug$3("opening", `path: ${this.path}`);
    this.settings.binding.open(openOptions).then((port) => {
      debug$3("opened", `path: ${this.path}`);
      this.port = port;
      this.opening = false;
      this.emit("open");
      if (openCallback) {
        openCallback.call(this, null);
      }
    }, (err) => {
      this.opening = false;
      debug$3("Binding #open had an error", err);
      this._error(err, openCallback);
    });
  }
  /**
   * Changes the baud rate for an open port. Emits an error or calls the callback if the baud rate isn't supported.
   * @param {object=} options Only supports `baudRate`.
   * @param {number=} [options.baudRate] The baud rate of the port to be opened. This should match one of the commonly available baud rates, such as 110, 300, 1200, 2400, 4800, 9600, 14400, 19200, 38400, 57600, or 115200. Custom rates are supported best effort per platform. The device connected to the serial port is not guaranteed to support the requested baud rate, even if the port itself supports that baud rate.
   * @param {ErrorCallback=} [callback] Called once the port's baud rate changes. If `.update` is called without a callback, and there is an error, an error event is emitted.
   * @returns {undefined}
   */
  update(options, callback) {
    if (!this.isOpen || !this.port) {
      debug$3("update attempted, but port is not open");
      return this._asyncError(new Error("Port is not open"), callback);
    }
    debug$3("update", `baudRate: ${options.baudRate}`);
    this.port.update(options).then(() => {
      debug$3("binding.update", "finished");
      this.settings.baudRate = options.baudRate;
      if (callback) {
        callback.call(this, null);
      }
    }, (err) => {
      debug$3("binding.update", "error", err);
      return this._error(err, callback);
    });
  }
  write(data, encoding, callback) {
    if (Array.isArray(data)) {
      data = Buffer.from(data);
    }
    if (typeof encoding === "function") {
      return super.write(data, encoding);
    }
    return super.write(data, encoding, callback);
  }
  _write(data, encoding, callback) {
    if (!this.isOpen || !this.port) {
      this.once("open", () => {
        this._write(data, encoding, callback);
      });
      return;
    }
    debug$3("_write", `${data.length} bytes of data`);
    this.port.write(data).then(() => {
      debug$3("binding.write", "write finished");
      callback(null);
    }, (err) => {
      debug$3("binding.write", "error", err);
      if (!err.canceled) {
        this._disconnected(err);
      }
      callback(err);
    });
  }
  _writev(data, callback) {
    debug$3("_writev", `${data.length} chunks of data`);
    const dataV = data.map((write) => write.chunk);
    this._write(Buffer.concat(dataV), "binary", callback);
  }
  _read(bytesToRead) {
    if (!this.isOpen || !this.port) {
      debug$3("_read", "queueing _read for after open");
      this.once("open", () => {
        this._read(bytesToRead);
      });
      return;
    }
    if (!this._pool || this._pool.length - this._pool.used < this._kMinPoolSpace) {
      debug$3("_read", "discarding the read buffer pool because it is below kMinPoolSpace");
      this._pool = allocNewReadPool(this.settings.highWaterMark);
    }
    const pool = this._pool;
    const toRead = Math.min(pool.length - pool.used, bytesToRead);
    const start = pool.used;
    debug$3("_read", "reading", { start, toRead });
    this.port.read(pool, start, toRead).then(({ bytesRead }) => {
      debug$3("binding.read", "finished", { bytesRead });
      if (bytesRead === 0) {
        debug$3("binding.read", "Zero bytes read closing readable stream");
        this.push(null);
        return;
      }
      pool.used += bytesRead;
      this.push(pool.slice(start, start + bytesRead));
    }, (err) => {
      debug$3("binding.read", "error", err);
      if (!err.canceled) {
        this._disconnected(err);
      }
      this._read(bytesToRead);
    });
  }
  _disconnected(err) {
    if (!this.isOpen) {
      debug$3("disconnected aborted because already closed", err);
      return;
    }
    debug$3("disconnected", err);
    this.close(void 0, new DisconnectedError(err.message));
  }
  /**
   * Closes an open connection.
   *
   * If there are in progress writes when the port is closed the writes will error.
   * @param {ErrorCallback} callback Called once a connection is closed.
   * @param {Error} disconnectError used internally to propagate a disconnect error
   */
  close(callback, disconnectError = null) {
    if (!this.isOpen || !this.port) {
      debug$3("close attempted, but port is not open");
      return this._asyncError(new Error("Port is not open"), callback);
    }
    this.closing = true;
    debug$3("#close");
    this.port.close().then(() => {
      this.closing = false;
      debug$3("binding.close", "finished");
      this.emit("close", disconnectError);
      if (this.settings.endOnClose) {
        this.emit("end");
      }
      if (callback) {
        callback.call(this, disconnectError);
      }
    }, (err) => {
      this.closing = false;
      debug$3("binding.close", "had an error", err);
      return this._error(err, callback);
    });
  }
  /**
   * Set control flags on an open port. Uses [`SetCommMask`](https://msdn.microsoft.com/en-us/library/windows/desktop/aa363257(v=vs.85).aspx) for Windows and [`ioctl`](http://linux.die.net/man/4/tty_ioctl) for OS X and Linux.
   *
   * All options are operating system default when the port is opened. Every flag is set on each call to the provided or default values. If options isn't provided default options is used.
   */
  set(options, callback) {
    if (!this.isOpen || !this.port) {
      debug$3("set attempted, but port is not open");
      return this._asyncError(new Error("Port is not open"), callback);
    }
    const settings = { ...defaultSetFlags, ...options };
    debug$3("#set", settings);
    this.port.set(settings).then(() => {
      debug$3("binding.set", "finished");
      if (callback) {
        callback.call(this, null);
      }
    }, (err) => {
      debug$3("binding.set", "had an error", err);
      return this._error(err, callback);
    });
  }
  /**
   * Returns the control flags (CTS, DSR, DCD) on the open port.
   * Uses [`GetCommModemStatus`](https://msdn.microsoft.com/en-us/library/windows/desktop/aa363258(v=vs.85).aspx) for Windows and [`ioctl`](http://linux.die.net/man/4/tty_ioctl) for mac and linux.
   */
  get(callback) {
    if (!this.isOpen || !this.port) {
      debug$3("get attempted, but port is not open");
      return this._asyncError(new Error("Port is not open"), callback);
    }
    debug$3("#get");
    this.port.get().then((status) => {
      debug$3("binding.get", "finished");
      callback.call(this, null, status);
    }, (err) => {
      debug$3("binding.get", "had an error", err);
      return this._error(err, callback);
    });
  }
  /**
   * Flush discards data received but not read, and written but not transmitted by the operating system. For more technical details, see [`tcflush(fd, TCIOFLUSH)`](http://linux.die.net/man/3/tcflush) for Mac/Linux and [`FlushFileBuffers`](http://msdn.microsoft.com/en-us/library/windows/desktop/aa364439) for Windows.
   */
  flush(callback) {
    if (!this.isOpen || !this.port) {
      debug$3("flush attempted, but port is not open");
      return this._asyncError(new Error("Port is not open"), callback);
    }
    debug$3("#flush");
    this.port.flush().then(() => {
      debug$3("binding.flush", "finished");
      if (callback) {
        callback.call(this, null);
      }
    }, (err) => {
      debug$3("binding.flush", "had an error", err);
      return this._error(err, callback);
    });
  }
  /**
     * Waits until all output data is transmitted to the serial port. After any pending write has completed it calls [`tcdrain()`](http://linux.die.net/man/3/tcdrain) or [FlushFileBuffers()](https://msdn.microsoft.com/en-us/library/windows/desktop/aa364439(v=vs.85).aspx) to ensure it has been written to the device.
    * @example
    Write the `data` and wait until it has finished transmitting to the target serial port before calling the callback. This will queue until the port is open and writes are finished.
  
    ```js
    function writeAndDrain (data, callback) {
      port.write(data);
      port.drain(callback);
    }
    ```
    */
  drain(callback) {
    debug$3("drain");
    if (!this.isOpen || !this.port) {
      debug$3("drain queuing on port open");
      this.once("open", () => {
        this.drain(callback);
      });
      return;
    }
    this.port.drain().then(() => {
      debug$3("binding.drain", "finished");
      if (callback) {
        callback.call(this, null);
      }
    }, (err) => {
      debug$3("binding.drain", "had an error", err);
      return this._error(err, callback);
    });
  }
}
dist$5.SerialPortStream = SerialPortStream;
var dist$4 = {};
var src$1 = { exports: {} };
var browser$1 = { exports: {} };
var common$1;
var hasRequiredCommon$1;
function requireCommon$1() {
  if (hasRequiredCommon$1) return common$1;
  hasRequiredCommon$1 = 1;
  function setup(env) {
    createDebug.debug = createDebug;
    createDebug.default = createDebug;
    createDebug.coerce = coerce;
    createDebug.disable = disable;
    createDebug.enable = enable;
    createDebug.enabled = enabled;
    createDebug.humanize = requireMs();
    createDebug.destroy = destroy;
    Object.keys(env).forEach((key) => {
      createDebug[key] = env[key];
    });
    createDebug.names = [];
    createDebug.skips = [];
    createDebug.formatters = {};
    function selectColor(namespace) {
      let hash = 0;
      for (let i = 0; i < namespace.length; i++) {
        hash = (hash << 5) - hash + namespace.charCodeAt(i);
        hash |= 0;
      }
      return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
    }
    createDebug.selectColor = selectColor;
    function createDebug(namespace) {
      let prevTime;
      let enableOverride = null;
      let namespacesCache;
      let enabledCache;
      function debug2(...args) {
        if (!debug2.enabled) {
          return;
        }
        const self2 = debug2;
        const curr = Number(/* @__PURE__ */ new Date());
        const ms2 = curr - (prevTime || curr);
        self2.diff = ms2;
        self2.prev = prevTime;
        self2.curr = curr;
        prevTime = curr;
        args[0] = createDebug.coerce(args[0]);
        if (typeof args[0] !== "string") {
          args.unshift("%O");
        }
        let index2 = 0;
        args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
          if (match === "%%") {
            return "%";
          }
          index2++;
          const formatter = createDebug.formatters[format];
          if (typeof formatter === "function") {
            const val = args[index2];
            match = formatter.call(self2, val);
            args.splice(index2, 1);
            index2--;
          }
          return match;
        });
        createDebug.formatArgs.call(self2, args);
        const logFn = self2.log || createDebug.log;
        logFn.apply(self2, args);
      }
      debug2.namespace = namespace;
      debug2.useColors = createDebug.useColors();
      debug2.color = createDebug.selectColor(namespace);
      debug2.extend = extend;
      debug2.destroy = createDebug.destroy;
      Object.defineProperty(debug2, "enabled", {
        enumerable: true,
        configurable: false,
        get: () => {
          if (enableOverride !== null) {
            return enableOverride;
          }
          if (namespacesCache !== createDebug.namespaces) {
            namespacesCache = createDebug.namespaces;
            enabledCache = createDebug.enabled(namespace);
          }
          return enabledCache;
        },
        set: (v) => {
          enableOverride = v;
        }
      });
      if (typeof createDebug.init === "function") {
        createDebug.init(debug2);
      }
      return debug2;
    }
    function extend(namespace, delimiter) {
      const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
      newDebug.log = this.log;
      return newDebug;
    }
    function enable(namespaces) {
      createDebug.save(namespaces);
      createDebug.namespaces = namespaces;
      createDebug.names = [];
      createDebug.skips = [];
      const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
      for (const ns of split) {
        if (ns[0] === "-") {
          createDebug.skips.push(ns.slice(1));
        } else {
          createDebug.names.push(ns);
        }
      }
    }
    function matchesTemplate(search, template) {
      let searchIndex = 0;
      let templateIndex = 0;
      let starIndex = -1;
      let matchIndex = 0;
      while (searchIndex < search.length) {
        if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
          if (template[templateIndex] === "*") {
            starIndex = templateIndex;
            matchIndex = searchIndex;
            templateIndex++;
          } else {
            searchIndex++;
            templateIndex++;
          }
        } else if (starIndex !== -1) {
          templateIndex = starIndex + 1;
          matchIndex++;
          searchIndex = matchIndex;
        } else {
          return false;
        }
      }
      while (templateIndex < template.length && template[templateIndex] === "*") {
        templateIndex++;
      }
      return templateIndex === template.length;
    }
    function disable() {
      const namespaces = [
        ...createDebug.names,
        ...createDebug.skips.map((namespace) => "-" + namespace)
      ].join(",");
      createDebug.enable("");
      return namespaces;
    }
    function enabled(name) {
      for (const skip of createDebug.skips) {
        if (matchesTemplate(name, skip)) {
          return false;
        }
      }
      for (const ns of createDebug.names) {
        if (matchesTemplate(name, ns)) {
          return true;
        }
      }
      return false;
    }
    function coerce(val) {
      if (val instanceof Error) {
        return val.stack || val.message;
      }
      return val;
    }
    function destroy() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    createDebug.enable(createDebug.load());
    return createDebug;
  }
  common$1 = setup;
  return common$1;
}
var hasRequiredBrowser$1;
function requireBrowser$1() {
  if (hasRequiredBrowser$1) return browser$1.exports;
  hasRequiredBrowser$1 = 1;
  (function(module, exports) {
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.storage = localstorage();
    exports.destroy = /* @__PURE__ */ (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      let m;
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      let index2 = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index2++;
        if (match === "%c") {
          lastC = index2;
        }
      });
      args.splice(lastC, 0, c);
    }
    exports.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports.storage.setItem("debug", namespaces);
        } else {
          exports.storage.removeItem("debug");
        }
      } catch (error) {
      }
    }
    function load() {
      let r;
      try {
        r = exports.storage.getItem("debug") || exports.storage.getItem("DEBUG");
      } catch (error) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error) {
      }
    }
    module.exports = requireCommon$1()(exports);
    const { formatters } = module.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error) {
        return "[UnexpectedJSONParseError]: " + error.message;
      }
    };
  })(browser$1, browser$1.exports);
  return browser$1.exports;
}
var node$1 = { exports: {} };
var hasRequiredNode$1;
function requireNode$1() {
  if (hasRequiredNode$1) return node$1.exports;
  hasRequiredNode$1 = 1;
  (function(module, exports) {
    const tty = require$$0$1;
    const util = require$$1;
    exports.init = init;
    exports.log = log;
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.destroy = util.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    );
    exports.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor = requireSupportsColor();
      if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
        exports.colors = [
          20,
          21,
          26,
          27,
          32,
          33,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          56,
          57,
          62,
          63,
          68,
          69,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          92,
          93,
          98,
          99,
          112,
          113,
          128,
          129,
          134,
          135,
          148,
          149,
          160,
          161,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          171,
          172,
          173,
          178,
          179,
          184,
          185,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          208,
          209,
          214,
          215,
          220,
          221
        ];
      }
    } catch (error) {
    }
    exports.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
        return k.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c = this.color;
        const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
        const prefix = `  ${colorCode};1m${name} \x1B[0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module.exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports.inspectOpts.hideDate) {
        return "";
      }
      return (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function log(...args) {
      return process.stderr.write(util.formatWithOptions(exports.inspectOpts, ...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function init(debug2) {
      debug2.inspectOpts = {};
      const keys = Object.keys(exports.inspectOpts);
      for (let i = 0; i < keys.length; i++) {
        debug2.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
      }
    }
    module.exports = requireCommon$1()(exports);
    const { formatters } = module.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts);
    };
  })(node$1, node$1.exports);
  return node$1.exports;
}
if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
  src$1.exports = requireBrowser$1();
} else {
  src$1.exports = requireNode$1();
}
var srcExports$1 = src$1.exports;
Object.defineProperty(dist$4, "__esModule", { value: true });
var debugFactory = srcExports$1;
function _interopDefaultLegacy(e) {
  return e && typeof e === "object" && "default" in e ? e : { "default": e };
}
var debugFactory__default = /* @__PURE__ */ _interopDefaultLegacy(debugFactory);
const debug$2 = debugFactory__default["default"]("serialport/binding-mock");
let ports = {};
let serialNumber = 0;
function resolveNextTick() {
  return new Promise((resolve) => process.nextTick(() => resolve()));
}
class CanceledError extends Error {
  constructor(message) {
    super(message);
    this.canceled = true;
  }
}
const MockBinding = {
  reset() {
    ports = {};
    serialNumber = 0;
  },
  // Create a mock port
  createPort(path, options = {}) {
    serialNumber++;
    const optWithDefaults = Object.assign({ echo: false, record: false, manufacturer: "The J5 Robotics Company", vendorId: void 0, productId: void 0, maxReadSize: 1024 }, options);
    ports[path] = {
      data: Buffer.alloc(0),
      echo: optWithDefaults.echo,
      record: optWithDefaults.record,
      readyData: optWithDefaults.readyData,
      maxReadSize: optWithDefaults.maxReadSize,
      info: {
        path,
        manufacturer: optWithDefaults.manufacturer,
        serialNumber: `${serialNumber}`,
        pnpId: void 0,
        locationId: void 0,
        vendorId: optWithDefaults.vendorId,
        productId: optWithDefaults.productId
      }
    };
    debug$2(serialNumber, "created port", JSON.stringify({ path, opt: options }));
  },
  async list() {
    debug$2(null, "list");
    return Object.values(ports).map((port) => port.info);
  },
  async open(options) {
    var _a;
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError('"options" is not an object');
    }
    if (!options.path) {
      throw new TypeError('"path" is not a valid port');
    }
    if (!options.baudRate) {
      throw new TypeError('"baudRate" is not a valid baudRate');
    }
    const openOptions = Object.assign({ dataBits: 8, lock: true, stopBits: 1, parity: "none", rtscts: false, xon: false, xoff: false, xany: false, hupcl: true }, options);
    const { path } = openOptions;
    debug$2(null, `open: opening path ${path}`);
    const port = ports[path];
    await resolveNextTick();
    if (!port) {
      throw new Error(`Port does not exist - please call MockBinding.createPort('${path}') first`);
    }
    const serialNumber2 = port.info.serialNumber;
    if ((_a = port.openOpt) === null || _a === void 0 ? void 0 : _a.lock) {
      debug$2(serialNumber2, "open: Port is locked cannot open");
      throw new Error("Port is locked cannot open");
    }
    debug$2(serialNumber2, `open: opened path ${path}`);
    port.openOpt = Object.assign({}, openOptions);
    return new MockPortBinding(port, openOptions);
  }
};
class MockPortBinding {
  constructor(port, openOptions) {
    this.port = port;
    this.openOptions = openOptions;
    this.pendingRead = null;
    this.isOpen = true;
    this.lastWrite = null;
    this.recording = Buffer.alloc(0);
    this.writeOperation = null;
    this.serialNumber = port.info.serialNumber;
    if (port.readyData) {
      const data = port.readyData;
      process.nextTick(() => {
        if (this.isOpen) {
          debug$2(this.serialNumber, "emitting ready data");
          this.emitData(data);
        }
      });
    }
  }
  // Emit data on a mock port
  emitData(data) {
    if (!this.isOpen || !this.port) {
      throw new Error("Port must be open to pretend to receive data");
    }
    const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data);
    debug$2(this.serialNumber, "emitting data - pending read:", Boolean(this.pendingRead));
    this.port.data = Buffer.concat([this.port.data, bufferData]);
    if (this.pendingRead) {
      process.nextTick(this.pendingRead);
      this.pendingRead = null;
    }
  }
  async close() {
    debug$2(this.serialNumber, "close");
    if (!this.isOpen) {
      throw new Error("Port is not open");
    }
    const port = this.port;
    if (!port) {
      throw new Error("already closed");
    }
    port.openOpt = void 0;
    port.data = Buffer.alloc(0);
    debug$2(this.serialNumber, "port is closed");
    this.serialNumber = void 0;
    this.isOpen = false;
    if (this.pendingRead) {
      this.pendingRead(new CanceledError("port is closed"));
    }
  }
  async read(buffer, offset, length) {
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('"buffer" is not a Buffer');
    }
    if (typeof offset !== "number" || isNaN(offset)) {
      throw new TypeError(`"offset" is not an integer got "${isNaN(offset) ? "NaN" : typeof offset}"`);
    }
    if (typeof length !== "number" || isNaN(length)) {
      throw new TypeError(`"length" is not an integer got "${isNaN(length) ? "NaN" : typeof length}"`);
    }
    if (buffer.length < offset + length) {
      throw new Error("buffer is too small");
    }
    if (!this.isOpen) {
      throw new Error("Port is not open");
    }
    debug$2(this.serialNumber, "read", length, "bytes");
    await resolveNextTick();
    if (!this.isOpen || !this.port) {
      throw new CanceledError("Read canceled");
    }
    if (this.port.data.length <= 0) {
      return new Promise((resolve, reject) => {
        this.pendingRead = (err) => {
          if (err) {
            return reject(err);
          }
          this.read(buffer, offset, length).then(resolve, reject);
        };
      });
    }
    const lengthToRead = this.port.maxReadSize > length ? length : this.port.maxReadSize;
    const data = this.port.data.slice(0, lengthToRead);
    const bytesRead = data.copy(buffer, offset);
    this.port.data = this.port.data.slice(lengthToRead);
    debug$2(this.serialNumber, "read", bytesRead, "bytes");
    return { bytesRead, buffer };
  }
  async write(buffer) {
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('"buffer" is not a Buffer');
    }
    if (!this.isOpen || !this.port) {
      debug$2("write", "error port is not open");
      throw new Error("Port is not open");
    }
    debug$2(this.serialNumber, "write", buffer.length, "bytes");
    if (this.writeOperation) {
      throw new Error("Overlapping writes are not supported and should be queued by the serialport object");
    }
    this.writeOperation = (async () => {
      await resolveNextTick();
      if (!this.isOpen || !this.port) {
        throw new Error("Write canceled");
      }
      const data = this.lastWrite = Buffer.from(buffer);
      if (this.port.record) {
        this.recording = Buffer.concat([this.recording, data]);
      }
      if (this.port.echo) {
        process.nextTick(() => {
          if (this.isOpen) {
            this.emitData(data);
          }
        });
      }
      this.writeOperation = null;
      debug$2(this.serialNumber, "writing finished");
    })();
    return this.writeOperation;
  }
  async update(options) {
    if (typeof options !== "object") {
      throw TypeError('"options" is not an object');
    }
    if (typeof options.baudRate !== "number") {
      throw new TypeError('"options.baudRate" is not a number');
    }
    debug$2(this.serialNumber, "update");
    if (!this.isOpen || !this.port) {
      throw new Error("Port is not open");
    }
    await resolveNextTick();
    if (this.port.openOpt) {
      this.port.openOpt.baudRate = options.baudRate;
    }
  }
  async set(options) {
    if (typeof options !== "object") {
      throw new TypeError('"options" is not an object');
    }
    debug$2(this.serialNumber, "set");
    if (!this.isOpen) {
      throw new Error("Port is not open");
    }
    await resolveNextTick();
  }
  async get() {
    debug$2(this.serialNumber, "get");
    if (!this.isOpen) {
      throw new Error("Port is not open");
    }
    await resolveNextTick();
    return {
      cts: true,
      dsr: false,
      dcd: false
    };
  }
  async getBaudRate() {
    var _a;
    debug$2(this.serialNumber, "getBaudRate");
    if (!this.isOpen || !this.port) {
      throw new Error("Port is not open");
    }
    await resolveNextTick();
    if (!((_a = this.port.openOpt) === null || _a === void 0 ? void 0 : _a.baudRate)) {
      throw new Error("Internal Error");
    }
    return {
      baudRate: this.port.openOpt.baudRate
    };
  }
  async flush() {
    debug$2(this.serialNumber, "flush");
    if (!this.isOpen || !this.port) {
      throw new Error("Port is not open");
    }
    await resolveNextTick();
    this.port.data = Buffer.alloc(0);
  }
  async drain() {
    debug$2(this.serialNumber, "drain");
    if (!this.isOpen) {
      throw new Error("Port is not open");
    }
    await this.writeOperation;
    await resolveNextTick();
  }
}
dist$4.CanceledError = CanceledError;
dist$4.MockBinding = MockBinding;
dist$4.MockPortBinding = MockPortBinding;
Object.defineProperty(serialportMock, "__esModule", { value: true });
serialportMock.SerialPortMock = void 0;
const stream_1$2 = dist$5;
const binding_mock_1 = dist$4;
class SerialPortMock extends stream_1$2.SerialPortStream {
  constructor(options, openCallback) {
    const opts = {
      binding: binding_mock_1.MockBinding,
      ...options
    };
    super(opts, openCallback);
  }
}
__publicField(SerialPortMock, "list", binding_mock_1.MockBinding.list);
__publicField(SerialPortMock, "binding", binding_mock_1.MockBinding);
serialportMock.SerialPortMock = SerialPortMock;
var serialport = {};
var dist$3 = {};
var src = { exports: {} };
var browser = { exports: {} };
var common;
var hasRequiredCommon;
function requireCommon() {
  if (hasRequiredCommon) return common;
  hasRequiredCommon = 1;
  function setup(env) {
    createDebug.debug = createDebug;
    createDebug.default = createDebug;
    createDebug.coerce = coerce;
    createDebug.disable = disable;
    createDebug.enable = enable;
    createDebug.enabled = enabled;
    createDebug.humanize = requireMs();
    createDebug.destroy = destroy;
    Object.keys(env).forEach((key) => {
      createDebug[key] = env[key];
    });
    createDebug.names = [];
    createDebug.skips = [];
    createDebug.formatters = {};
    function selectColor(namespace) {
      let hash = 0;
      for (let i = 0; i < namespace.length; i++) {
        hash = (hash << 5) - hash + namespace.charCodeAt(i);
        hash |= 0;
      }
      return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
    }
    createDebug.selectColor = selectColor;
    function createDebug(namespace) {
      let prevTime;
      let enableOverride = null;
      let namespacesCache;
      let enabledCache;
      function debug2(...args) {
        if (!debug2.enabled) {
          return;
        }
        const self2 = debug2;
        const curr = Number(/* @__PURE__ */ new Date());
        const ms2 = curr - (prevTime || curr);
        self2.diff = ms2;
        self2.prev = prevTime;
        self2.curr = curr;
        prevTime = curr;
        args[0] = createDebug.coerce(args[0]);
        if (typeof args[0] !== "string") {
          args.unshift("%O");
        }
        let index2 = 0;
        args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
          if (match === "%%") {
            return "%";
          }
          index2++;
          const formatter = createDebug.formatters[format];
          if (typeof formatter === "function") {
            const val = args[index2];
            match = formatter.call(self2, val);
            args.splice(index2, 1);
            index2--;
          }
          return match;
        });
        createDebug.formatArgs.call(self2, args);
        const logFn = self2.log || createDebug.log;
        logFn.apply(self2, args);
      }
      debug2.namespace = namespace;
      debug2.useColors = createDebug.useColors();
      debug2.color = createDebug.selectColor(namespace);
      debug2.extend = extend;
      debug2.destroy = createDebug.destroy;
      Object.defineProperty(debug2, "enabled", {
        enumerable: true,
        configurable: false,
        get: () => {
          if (enableOverride !== null) {
            return enableOverride;
          }
          if (namespacesCache !== createDebug.namespaces) {
            namespacesCache = createDebug.namespaces;
            enabledCache = createDebug.enabled(namespace);
          }
          return enabledCache;
        },
        set: (v) => {
          enableOverride = v;
        }
      });
      if (typeof createDebug.init === "function") {
        createDebug.init(debug2);
      }
      return debug2;
    }
    function extend(namespace, delimiter) {
      const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
      newDebug.log = this.log;
      return newDebug;
    }
    function enable(namespaces) {
      createDebug.save(namespaces);
      createDebug.namespaces = namespaces;
      createDebug.names = [];
      createDebug.skips = [];
      const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(" ", ",").split(",").filter(Boolean);
      for (const ns of split) {
        if (ns[0] === "-") {
          createDebug.skips.push(ns.slice(1));
        } else {
          createDebug.names.push(ns);
        }
      }
    }
    function matchesTemplate(search, template) {
      let searchIndex = 0;
      let templateIndex = 0;
      let starIndex = -1;
      let matchIndex = 0;
      while (searchIndex < search.length) {
        if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
          if (template[templateIndex] === "*") {
            starIndex = templateIndex;
            matchIndex = searchIndex;
            templateIndex++;
          } else {
            searchIndex++;
            templateIndex++;
          }
        } else if (starIndex !== -1) {
          templateIndex = starIndex + 1;
          matchIndex++;
          searchIndex = matchIndex;
        } else {
          return false;
        }
      }
      while (templateIndex < template.length && template[templateIndex] === "*") {
        templateIndex++;
      }
      return templateIndex === template.length;
    }
    function disable() {
      const namespaces = [
        ...createDebug.names,
        ...createDebug.skips.map((namespace) => "-" + namespace)
      ].join(",");
      createDebug.enable("");
      return namespaces;
    }
    function enabled(name) {
      for (const skip of createDebug.skips) {
        if (matchesTemplate(name, skip)) {
          return false;
        }
      }
      for (const ns of createDebug.names) {
        if (matchesTemplate(name, ns)) {
          return true;
        }
      }
      return false;
    }
    function coerce(val) {
      if (val instanceof Error) {
        return val.stack || val.message;
      }
      return val;
    }
    function destroy() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    createDebug.enable(createDebug.load());
    return createDebug;
  }
  common = setup;
  return common;
}
var hasRequiredBrowser;
function requireBrowser() {
  if (hasRequiredBrowser) return browser.exports;
  hasRequiredBrowser = 1;
  (function(module, exports) {
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.storage = localstorage();
    exports.destroy = /* @__PURE__ */ (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      let m;
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      let index2 = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index2++;
        if (match === "%c") {
          lastC = index2;
        }
      });
      args.splice(lastC, 0, c);
    }
    exports.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports.storage.setItem("debug", namespaces);
        } else {
          exports.storage.removeItem("debug");
        }
      } catch (error) {
      }
    }
    function load() {
      let r;
      try {
        r = exports.storage.getItem("debug");
      } catch (error) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error) {
      }
    }
    module.exports = requireCommon()(exports);
    const { formatters } = module.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error) {
        return "[UnexpectedJSONParseError]: " + error.message;
      }
    };
  })(browser, browser.exports);
  return browser.exports;
}
var node = { exports: {} };
var hasRequiredNode;
function requireNode() {
  if (hasRequiredNode) return node.exports;
  hasRequiredNode = 1;
  (function(module, exports) {
    const tty = require$$0$1;
    const util = require$$1;
    exports.init = init;
    exports.log = log;
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.destroy = util.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    );
    exports.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor = requireSupportsColor();
      if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
        exports.colors = [
          20,
          21,
          26,
          27,
          32,
          33,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          56,
          57,
          62,
          63,
          68,
          69,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          92,
          93,
          98,
          99,
          112,
          113,
          128,
          129,
          134,
          135,
          148,
          149,
          160,
          161,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          171,
          172,
          173,
          178,
          179,
          184,
          185,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          208,
          209,
          214,
          215,
          220,
          221
        ];
      }
    } catch (error) {
    }
    exports.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
        return k.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c = this.color;
        const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
        const prefix = `  ${colorCode};1m${name} \x1B[0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module.exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports.inspectOpts.hideDate) {
        return "";
      }
      return (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function log(...args) {
      return process.stderr.write(util.formatWithOptions(exports.inspectOpts, ...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function init(debug2) {
      debug2.inspectOpts = {};
      const keys = Object.keys(exports.inspectOpts);
      for (let i = 0; i < keys.length; i++) {
        debug2.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
      }
    }
    module.exports = requireCommon()(exports);
    const { formatters } = module.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts);
    };
  })(node, node.exports);
  return node.exports;
}
if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
  src.exports = requireBrowser();
} else {
  src.exports = requireNode();
}
var srcExports = src.exports;
var darwin = {};
var loadBindings = {};
var serialportBindings = {};
function commonjsRequire(path) {
  throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var nodeGypBuild$1 = { exports: {} };
var nodeGypBuild;
var hasRequiredNodeGypBuild;
function requireNodeGypBuild() {
  if (hasRequiredNodeGypBuild) return nodeGypBuild;
  hasRequiredNodeGypBuild = 1;
  var fs = require$$0$3;
  var path = require$$1$1;
  var os = require$$0$2;
  var runtimeRequire2 = typeof __webpack_require__ === "function" ? __non_webpack_require__ : commonjsRequire;
  var vars = process.config && process.config.variables || {};
  var prebuildsOnly = !!process.env.PREBUILDS_ONLY;
  var abi = process.versions.modules;
  var runtime = isElectron() ? "electron" : isNwjs() ? "node-webkit" : "node";
  var arch = process.env.npm_config_arch || os.arch();
  var platform = process.env.npm_config_platform || os.platform();
  var libc = process.env.LIBC || (isAlpine(platform) ? "musl" : "glibc");
  var armv = process.env.ARM_VERSION || (arch === "arm64" ? "8" : vars.arm_version) || "";
  var uv = (process.versions.uv || "").split(".")[0];
  nodeGypBuild = load;
  function load(dir) {
    return runtimeRequire2(load.resolve(dir));
  }
  load.resolve = load.path = function(dir) {
    dir = path.resolve(dir || ".");
    try {
      var name = runtimeRequire2(path.join(dir, "package.json")).name.toUpperCase().replace(/-/g, "_");
      if (process.env[name + "_PREBUILD"]) dir = process.env[name + "_PREBUILD"];
    } catch (err) {
    }
    if (!prebuildsOnly) {
      var release = getFirst(path.join(dir, "build/Release"), matchBuild);
      if (release) return release;
      var debug2 = getFirst(path.join(dir, "build/Debug"), matchBuild);
      if (debug2) return debug2;
    }
    var prebuild = resolve(dir);
    if (prebuild) return prebuild;
    var nearby = resolve(path.dirname(process.execPath));
    if (nearby) return nearby;
    var target = [
      "platform=" + platform,
      "arch=" + arch,
      "runtime=" + runtime,
      "abi=" + abi,
      "uv=" + uv,
      armv ? "armv=" + armv : "",
      "libc=" + libc,
      "node=" + process.versions.node,
      process.versions.electron ? "electron=" + process.versions.electron : "",
      typeof __webpack_require__ === "function" ? "webpack=true" : ""
      // eslint-disable-line
    ].filter(Boolean).join(" ");
    throw new Error("No native build was found for " + target + "\n    loaded from: " + dir + "\n");
    function resolve(dir2) {
      var tuples = readdirSync(path.join(dir2, "prebuilds")).map(parseTuple);
      var tuple = tuples.filter(matchTuple(platform, arch)).sort(compareTuples)[0];
      if (!tuple) return;
      var prebuilds = path.join(dir2, "prebuilds", tuple.name);
      var parsed = readdirSync(prebuilds).map(parseTags);
      var candidates = parsed.filter(matchTags(runtime, abi));
      var winner = candidates.sort(compareTags(runtime))[0];
      if (winner) return path.join(prebuilds, winner.file);
    }
  };
  function readdirSync(dir) {
    try {
      return fs.readdirSync(dir);
    } catch (err) {
      return [];
    }
  }
  function getFirst(dir, filter) {
    var files = readdirSync(dir).filter(filter);
    return files[0] && path.join(dir, files[0]);
  }
  function matchBuild(name) {
    return /\.node$/.test(name);
  }
  function parseTuple(name) {
    var arr = name.split("-");
    if (arr.length !== 2) return;
    var platform2 = arr[0];
    var architectures = arr[1].split("+");
    if (!platform2) return;
    if (!architectures.length) return;
    if (!architectures.every(Boolean)) return;
    return { name, platform: platform2, architectures };
  }
  function matchTuple(platform2, arch2) {
    return function(tuple) {
      if (tuple == null) return false;
      if (tuple.platform !== platform2) return false;
      return tuple.architectures.includes(arch2);
    };
  }
  function compareTuples(a, b) {
    return a.architectures.length - b.architectures.length;
  }
  function parseTags(file) {
    var arr = file.split(".");
    var extension = arr.pop();
    var tags = { file, specificity: 0 };
    if (extension !== "node") return;
    for (var i = 0; i < arr.length; i++) {
      var tag = arr[i];
      if (tag === "node" || tag === "electron" || tag === "node-webkit") {
        tags.runtime = tag;
      } else if (tag === "napi") {
        tags.napi = true;
      } else if (tag.slice(0, 3) === "abi") {
        tags.abi = tag.slice(3);
      } else if (tag.slice(0, 2) === "uv") {
        tags.uv = tag.slice(2);
      } else if (tag.slice(0, 4) === "armv") {
        tags.armv = tag.slice(4);
      } else if (tag === "glibc" || tag === "musl") {
        tags.libc = tag;
      } else {
        continue;
      }
      tags.specificity++;
    }
    return tags;
  }
  function matchTags(runtime2, abi2) {
    return function(tags) {
      if (tags == null) return false;
      if (tags.runtime && tags.runtime !== runtime2 && !runtimeAgnostic(tags)) return false;
      if (tags.abi && tags.abi !== abi2 && !tags.napi) return false;
      if (tags.uv && tags.uv !== uv) return false;
      if (tags.armv && tags.armv !== armv) return false;
      if (tags.libc && tags.libc !== libc) return false;
      return true;
    };
  }
  function runtimeAgnostic(tags) {
    return tags.runtime === "node" && tags.napi;
  }
  function compareTags(runtime2) {
    return function(a, b) {
      if (a.runtime !== b.runtime) {
        return a.runtime === runtime2 ? -1 : 1;
      } else if (a.abi !== b.abi) {
        return a.abi ? -1 : 1;
      } else if (a.specificity !== b.specificity) {
        return a.specificity > b.specificity ? -1 : 1;
      } else {
        return 0;
      }
    };
  }
  function isNwjs() {
    return !!(process.versions && process.versions.nw);
  }
  function isElectron() {
    if (process.versions && process.versions.electron) return true;
    if (process.env.ELECTRON_RUN_AS_NODE) return true;
    return typeof window !== "undefined" && window.process && window.process.type === "renderer";
  }
  function isAlpine(platform2) {
    return platform2 === "linux" && fs.existsSync("/etc/alpine-release");
  }
  load.parseTags = parseTags;
  load.matchTags = matchTags;
  load.compareTags = compareTags;
  load.parseTuple = parseTuple;
  load.matchTuple = matchTuple;
  load.compareTuples = compareTuples;
  return nodeGypBuild;
}
const runtimeRequire = typeof __webpack_require__ === "function" ? __non_webpack_require__ : commonjsRequire;
if (typeof runtimeRequire.addon === "function") {
  nodeGypBuild$1.exports = runtimeRequire.addon.bind(runtimeRequire);
} else {
  nodeGypBuild$1.exports = requireNodeGypBuild();
}
var nodeGypBuildExports = nodeGypBuild$1.exports;
var __importDefault$2 = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(serialportBindings, "__esModule", { value: true });
serialportBindings.binding = void 0;
const path_1 = require$$1$1;
const node_gyp_build_1 = __importDefault$2(nodeGypBuildExports);
serialportBindings.binding = (0, node_gyp_build_1.default)((0, path_1.join)(__dirname, "../"));
Object.defineProperty(loadBindings, "__esModule", { value: true });
loadBindings.asyncWrite = loadBindings.asyncRead = loadBindings.asyncUpdate = loadBindings.asyncSet = loadBindings.asyncOpen = loadBindings.asyncList = loadBindings.asyncGetBaudRate = loadBindings.asyncGet = loadBindings.asyncFlush = loadBindings.asyncDrain = loadBindings.asyncClose = void 0;
const util_1 = require$$1;
const serialport_bindings_1 = serialportBindings;
loadBindings.asyncClose = serialport_bindings_1.binding.close ? (0, util_1.promisify)(serialport_bindings_1.binding.close) : async () => {
  throw new Error('"binding.close" Method not implemented');
};
loadBindings.asyncDrain = serialport_bindings_1.binding.drain ? (0, util_1.promisify)(serialport_bindings_1.binding.drain) : async () => {
  throw new Error('"binding.drain" Method not implemented');
};
loadBindings.asyncFlush = serialport_bindings_1.binding.flush ? (0, util_1.promisify)(serialport_bindings_1.binding.flush) : async () => {
  throw new Error('"binding.flush" Method not implemented');
};
loadBindings.asyncGet = serialport_bindings_1.binding.get ? (0, util_1.promisify)(serialport_bindings_1.binding.get) : async () => {
  throw new Error('"binding.get" Method not implemented');
};
loadBindings.asyncGetBaudRate = serialport_bindings_1.binding.getBaudRate ? (0, util_1.promisify)(serialport_bindings_1.binding.getBaudRate) : async () => {
  throw new Error('"binding.getBaudRate" Method not implemented');
};
loadBindings.asyncList = serialport_bindings_1.binding.list ? (0, util_1.promisify)(serialport_bindings_1.binding.list) : async () => {
  throw new Error('"binding.list" Method not implemented');
};
loadBindings.asyncOpen = serialport_bindings_1.binding.open ? (0, util_1.promisify)(serialport_bindings_1.binding.open) : async () => {
  throw new Error('"binding.open" Method not implemented');
};
loadBindings.asyncSet = serialport_bindings_1.binding.set ? (0, util_1.promisify)(serialport_bindings_1.binding.set) : async () => {
  throw new Error('"binding.set" Method not implemented');
};
loadBindings.asyncUpdate = serialport_bindings_1.binding.update ? (0, util_1.promisify)(serialport_bindings_1.binding.update) : async () => {
  throw new Error('"binding.update" Method not implemented');
};
loadBindings.asyncRead = serialport_bindings_1.binding.read ? (0, util_1.promisify)(serialport_bindings_1.binding.read) : async () => {
  throw new Error('"binding.read" Method not implemented');
};
loadBindings.asyncWrite = serialport_bindings_1.binding.write ? (0, util_1.promisify)(serialport_bindings_1.binding.write) : async () => {
  throw new Error('"binding.write" Method not implemented');
};
var poller = {};
var errors = {};
Object.defineProperty(errors, "__esModule", { value: true });
errors.BindingsError = void 0;
class BindingsError extends Error {
  constructor(message, { canceled = false } = {}) {
    super(message);
    this.canceled = canceled;
  }
}
errors.BindingsError = BindingsError;
(function(exports) {
  var __importDefault2 = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { "default": mod };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.Poller = exports.EVENTS = void 0;
  const debug_12 = __importDefault2(srcExports);
  const events_1 = require$$1$2;
  const errors_1 = errors;
  const serialport_bindings_12 = serialportBindings;
  const { Poller: PollerBindings } = serialport_bindings_12.binding;
  const logger = (0, debug_12.default)("serialport/bindings-cpp/poller");
  exports.EVENTS = {
    UV_READABLE: 1,
    UV_WRITABLE: 2,
    UV_DISCONNECT: 4
  };
  function handleEvent(error, eventFlag) {
    if (error) {
      logger("error", error);
      this.emit("readable", error);
      this.emit("writable", error);
      this.emit("disconnect", error);
      return;
    }
    if (eventFlag & exports.EVENTS.UV_READABLE) {
      logger('received "readable"');
      this.emit("readable", null);
    }
    if (eventFlag & exports.EVENTS.UV_WRITABLE) {
      logger('received "writable"');
      this.emit("writable", null);
    }
    if (eventFlag & exports.EVENTS.UV_DISCONNECT) {
      logger('received "disconnect"');
      this.emit("disconnect", null);
    }
  }
  class Poller extends events_1.EventEmitter {
    constructor(fd, FDPoller = PollerBindings) {
      logger("Creating poller");
      super();
      this.poller = new FDPoller(fd, handleEvent.bind(this));
    }
    /**
     * Wait for the next event to occur
     * @param {string} event ('readable'|'writable'|'disconnect')
     * @returns {Poller} returns itself
     */
    once(event, callback) {
      switch (event) {
        case "readable":
          this.poll(exports.EVENTS.UV_READABLE);
          break;
        case "writable":
          this.poll(exports.EVENTS.UV_WRITABLE);
          break;
        case "disconnect":
          this.poll(exports.EVENTS.UV_DISCONNECT);
          break;
      }
      return super.once(event, callback);
    }
    /**
     * Ask the bindings to listen for an event, it is recommend to use `.once()` for easy use
     * @param {EVENTS} eventFlag polls for an event or group of events based upon a flag.
     */
    poll(eventFlag = 0) {
      if (eventFlag & exports.EVENTS.UV_READABLE) {
        logger('Polling for "readable"');
      }
      if (eventFlag & exports.EVENTS.UV_WRITABLE) {
        logger('Polling for "writable"');
      }
      if (eventFlag & exports.EVENTS.UV_DISCONNECT) {
        logger('Polling for "disconnect"');
      }
      this.poller.poll(eventFlag);
    }
    /**
     * Stop listening for events and cancel all outstanding listening with an error
     */
    stop() {
      logger("Stopping poller");
      this.poller.stop();
      this.emitCanceled();
    }
    destroy() {
      logger("Destroying poller");
      this.poller.destroy();
      this.emitCanceled();
    }
    emitCanceled() {
      const err = new errors_1.BindingsError("Canceled", { canceled: true });
      this.emit("readable", err);
      this.emit("writable", err);
      this.emit("disconnect", err);
    }
  }
  exports.Poller = Poller;
})(poller);
var unixRead = {};
(function(exports) {
  var __importDefault2 = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { "default": mod };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.unixRead = void 0;
  const util_12 = require$$1;
  const fs_1 = require$$0$3;
  const errors_1 = errors;
  const debug_12 = __importDefault2(srcExports);
  const logger = (0, debug_12.default)("serialport/bindings-cpp/unixRead");
  const readAsync = (0, util_12.promisify)(fs_1.read);
  const readable = (binding) => {
    return new Promise((resolve, reject) => {
      if (!binding.poller) {
        throw new Error("No poller on bindings");
      }
      binding.poller.once("readable", (err) => err ? reject(err) : resolve());
    });
  };
  const unixRead2 = async ({ binding, buffer, offset, length, fsReadAsync = readAsync }) => {
    logger("Starting read");
    if (!binding.isOpen || !binding.fd) {
      throw new errors_1.BindingsError("Port is not open", { canceled: true });
    }
    try {
      const { bytesRead } = await fsReadAsync(binding.fd, buffer, offset, length, null);
      if (bytesRead === 0) {
        return (0, exports.unixRead)({ binding, buffer, offset, length, fsReadAsync });
      }
      logger("Finished read", bytesRead, "bytes");
      return { bytesRead, buffer };
    } catch (err) {
      logger("read error", err);
      if (err.code === "EAGAIN" || err.code === "EWOULDBLOCK" || err.code === "EINTR") {
        if (!binding.isOpen) {
          throw new errors_1.BindingsError("Port is not open", { canceled: true });
        }
        logger("waiting for readable because of code:", err.code);
        await readable(binding);
        return (0, exports.unixRead)({ binding, buffer, offset, length, fsReadAsync });
      }
      const disconnectError = err.code === "EBADF" || // Bad file number means we got closed
      err.code === "ENXIO" || // No such device or address probably usb disconnect
      err.code === "UNKNOWN" || err.errno === -1;
      if (disconnectError) {
        err.disconnect = true;
        logger("disconnecting", err);
      }
      throw err;
    }
  };
  exports.unixRead = unixRead2;
})(unixRead);
var unixWrite = {};
(function(exports) {
  var __importDefault2 = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { "default": mod };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.unixWrite = void 0;
  const fs_1 = require$$0$3;
  const debug_12 = __importDefault2(srcExports);
  const util_12 = require$$1;
  const logger = (0, debug_12.default)("serialport/bindings-cpp/unixWrite");
  const writeAsync = (0, util_12.promisify)(fs_1.write);
  const writable = (binding) => {
    return new Promise((resolve, reject) => {
      binding.poller.once("writable", (err) => err ? reject(err) : resolve());
    });
  };
  const unixWrite2 = async ({ binding, buffer, offset = 0, fsWriteAsync = writeAsync }) => {
    const bytesToWrite = buffer.length - offset;
    logger("Starting write", buffer.length, "bytes offset", offset, "bytesToWrite", bytesToWrite);
    if (!binding.isOpen || !binding.fd) {
      throw new Error("Port is not open");
    }
    try {
      const { bytesWritten } = await fsWriteAsync(binding.fd, buffer, offset, bytesToWrite);
      logger("write returned: wrote", bytesWritten, "bytes");
      if (bytesWritten + offset < buffer.length) {
        if (!binding.isOpen) {
          throw new Error("Port is not open");
        }
        return (0, exports.unixWrite)({ binding, buffer, offset: bytesWritten + offset, fsWriteAsync });
      }
      logger("Finished writing", bytesWritten + offset, "bytes");
    } catch (err) {
      logger("write errored", err);
      if (err.code === "EAGAIN" || err.code === "EWOULDBLOCK" || err.code === "EINTR") {
        if (!binding.isOpen) {
          throw new Error("Port is not open");
        }
        logger("waiting for writable because of code:", err.code);
        await writable(binding);
        return (0, exports.unixWrite)({ binding, buffer, offset, fsWriteAsync });
      }
      const disconnectError = err.code === "EBADF" || // Bad file number means we got closed
      err.code === "ENXIO" || // No such device or address probably usb disconnect
      err.code === "UNKNOWN" || err.errno === -1;
      if (disconnectError) {
        err.disconnect = true;
        logger("disconnecting", err);
      }
      logger("error", err);
      throw err;
    }
  };
  exports.unixWrite = unixWrite2;
})(unixWrite);
var __importDefault$1 = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(darwin, "__esModule", { value: true });
darwin.DarwinPortBinding = darwin.DarwinBinding = void 0;
const debug_1$1 = __importDefault$1(srcExports);
const load_bindings_1$1 = loadBindings;
const poller_1$1 = poller;
const unix_read_1$1 = unixRead;
const unix_write_1$1 = unixWrite;
const debug$1 = (0, debug_1$1.default)("serialport/bindings-cpp");
darwin.DarwinBinding = {
  list() {
    debug$1("list");
    return (0, load_bindings_1$1.asyncList)();
  },
  async open(options) {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError('"options" is not an object');
    }
    if (!options.path) {
      throw new TypeError('"path" is not a valid port');
    }
    if (!options.baudRate) {
      throw new TypeError('"baudRate" is not a valid baudRate');
    }
    debug$1("open");
    const openOptions = Object.assign({ vmin: 1, vtime: 0, dataBits: 8, lock: true, stopBits: 1, parity: "none", rtscts: false, xon: false, xoff: false, xany: false, hupcl: true }, options);
    const fd = await (0, load_bindings_1$1.asyncOpen)(openOptions.path, openOptions);
    return new DarwinPortBinding(fd, openOptions);
  }
};
class DarwinPortBinding {
  constructor(fd, options) {
    this.fd = fd;
    this.openOptions = options;
    this.poller = new poller_1$1.Poller(fd);
    this.writeOperation = null;
  }
  get isOpen() {
    return this.fd !== null;
  }
  async close() {
    debug$1("close");
    if (!this.isOpen) {
      throw new Error("Port is not open");
    }
    const fd = this.fd;
    this.poller.stop();
    this.poller.destroy();
    this.fd = null;
    await (0, load_bindings_1$1.asyncClose)(fd);
  }
  async read(buffer, offset, length) {
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('"buffer" is not a Buffer');
    }
    if (typeof offset !== "number" || isNaN(offset)) {
      throw new TypeError(`"offset" is not an integer got "${isNaN(offset) ? "NaN" : typeof offset}"`);
    }
    if (typeof length !== "number" || isNaN(length)) {
      throw new TypeError(`"length" is not an integer got "${isNaN(length) ? "NaN" : typeof length}"`);
    }
    debug$1("read");
    if (buffer.length < offset + length) {
      throw new Error("buffer is too small");
    }
    if (!this.isOpen) {
      throw new Error("Port is not open");
    }
    return (0, unix_read_1$1.unixRead)({ binding: this, buffer, offset, length });
  }
  async write(buffer) {
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('"buffer" is not a Buffer');
    }
    debug$1("write", buffer.length, "bytes");
    if (!this.isOpen) {
      debug$1("write", "error port is not open");
      throw new Error("Port is not open");
    }
    this.writeOperation = (async () => {
      if (buffer.length === 0) {
        return;
      }
      await (0, unix_write_1$1.unixWrite)({ binding: this, buffer });
      this.writeOperation = null;
    })();
    return this.writeOperation;
  }
  async update(options) {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw TypeError('"options" is not an object');
    }
    if (typeof options.baudRate !== "number") {
      throw new TypeError('"options.baudRate" is not a number');
    }
    debug$1("update");
    if (!this.isOpen) {
      throw new Error("Port is not open");
    }
    await (0, load_bindings_1$1.asyncUpdate)(this.fd, options);
  }
  async set(options) {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError('"options" is not an object');
    }
    debug$1("set", options);
    if (!this.isOpen) {
      throw new Error("Port is not open");
    }
    await (0, load_bindings_1$1.asyncSet)(this.fd, options);
  }
  async get() {
    debug$1("get");
    if (!this.isOpen) {
      throw new Error("Port is not open");
    }
    return (0, load_bindings_1$1.asyncGet)(this.fd);
  }
  async getBaudRate() {
    debug$1("getBaudRate");
    if (!this.isOpen) {
      throw new Error("Port is not open");
    }
    throw new Error("getBaudRate is not implemented on darwin");
  }
  async flush() {
    debug$1("flush");
    if (!this.isOpen) {
      throw new Error("Port is not open");
    }
    await (0, load_bindings_1$1.asyncFlush)(this.fd);
  }
  async drain() {
    debug$1("drain");
    if (!this.isOpen) {
      throw new Error("Port is not open");
    }
    await this.writeOperation;
    await (0, load_bindings_1$1.asyncDrain)(this.fd);
  }
}
darwin.DarwinPortBinding = DarwinPortBinding;
var linux = {};
var linuxList$1 = {};
var dist$2 = {};
var dist$1 = {};
Object.defineProperty(dist$1, "__esModule", { value: true });
dist$1.DelimiterParser = void 0;
const stream_1$1 = require$$0;
class DelimiterParser2 extends stream_1$1.Transform {
  constructor({ delimiter, includeDelimiter = false, ...options }) {
    super(options);
    __publicField(this, "includeDelimiter");
    __publicField(this, "delimiter");
    __publicField(this, "buffer");
    if (delimiter === void 0) {
      throw new TypeError('"delimiter" is not a bufferable object');
    }
    if (delimiter.length === 0) {
      throw new TypeError('"delimiter" has a 0 or undefined length');
    }
    this.includeDelimiter = includeDelimiter;
    this.delimiter = Buffer.from(delimiter);
    this.buffer = Buffer.alloc(0);
  }
  _transform(chunk, encoding, cb) {
    let data = Buffer.concat([this.buffer, chunk]);
    let position;
    while ((position = data.indexOf(this.delimiter)) !== -1) {
      this.push(data.slice(0, position + (this.includeDelimiter ? this.delimiter.length : 0)));
      data = data.slice(position + this.delimiter.length);
    }
    this.buffer = data;
    cb();
  }
  _flush(cb) {
    this.push(this.buffer);
    this.buffer = Buffer.alloc(0);
    cb();
  }
}
dist$1.DelimiterParser = DelimiterParser2;
Object.defineProperty(dist$2, "__esModule", { value: true });
dist$2.ReadlineParser = void 0;
const parser_delimiter_1 = dist$1;
class ReadlineParser2 extends parser_delimiter_1.DelimiterParser {
  constructor(options) {
    const opts = {
      delimiter: Buffer.from("\n", "utf8"),
      encoding: "utf8",
      ...options
    };
    if (typeof opts.delimiter === "string") {
      opts.delimiter = Buffer.from(opts.delimiter, opts.encoding);
    }
    super(opts);
  }
}
dist$2.ReadlineParser = ReadlineParser2;
Object.defineProperty(linuxList$1, "__esModule", { value: true });
linuxList$1.linuxList = linuxList;
const child_process_1 = require$$0$4;
const parser_readline_1 = dist$2;
function checkPathOfDevice(path) {
  return /(tty(S|WCH|ACM|USB|AMA|MFD|O|XRUSB)|rfcomm)/.test(path) && path;
}
function propName(name) {
  return {
    DEVNAME: "path",
    ID_VENDOR_ENC: "manufacturer",
    ID_SERIAL_SHORT: "serialNumber",
    ID_VENDOR_ID: "vendorId",
    ID_MODEL_ID: "productId",
    DEVLINKS: "pnpId",
    /**
    * Workaround for systemd defect
    * see https://github.com/serialport/bindings-cpp/issues/115
    */
    ID_USB_VENDOR_ENC: "manufacturer",
    ID_USB_SERIAL_SHORT: "serialNumber",
    ID_USB_VENDOR_ID: "vendorId",
    ID_USB_MODEL_ID: "productId"
    // End of workaround
  }[name.toUpperCase()];
}
function decodeHexEscape(str) {
  return str.replace(/\\x([a-fA-F0-9]{2})/g, (a, b) => {
    return String.fromCharCode(parseInt(b, 16));
  });
}
function propVal(name, val) {
  if (name === "pnpId") {
    const match = val.match(/\/by-id\/([^\s]+)/);
    return (match === null || match === void 0 ? void 0 : match[1]) || void 0;
  }
  if (name === "manufacturer") {
    return decodeHexEscape(val);
  }
  if (/^0x/.test(val)) {
    return val.substr(2);
  }
  return val;
}
function linuxList(spawnCmd = child_process_1.spawn) {
  const ports2 = [];
  const udevadm = spawnCmd("udevadm", ["info", "-e"]);
  const lines = udevadm.stdout.pipe(new parser_readline_1.ReadlineParser());
  let skipPort = false;
  let port = {
    path: "",
    manufacturer: void 0,
    serialNumber: void 0,
    pnpId: void 0,
    locationId: void 0,
    vendorId: void 0,
    productId: void 0
  };
  lines.on("data", (line) => {
    const lineType = line.slice(0, 1);
    const data = line.slice(3);
    if (lineType === "P") {
      port = {
        path: "",
        manufacturer: void 0,
        serialNumber: void 0,
        pnpId: void 0,
        locationId: void 0,
        vendorId: void 0,
        productId: void 0
      };
      skipPort = false;
      return;
    }
    if (skipPort) {
      return;
    }
    if (lineType === "N") {
      if (checkPathOfDevice(data)) {
        ports2.push(port);
      } else {
        skipPort = true;
      }
      return;
    }
    if (lineType === "E") {
      const keyValue = data.match(/^(.+)=(.*)/);
      if (!keyValue) {
        return;
      }
      const key = propName(keyValue[1]);
      if (!key) {
        return;
      }
      port[key] = propVal(key, keyValue[2]);
    }
  });
  return new Promise((resolve, reject) => {
    udevadm.on("close", (code) => {
      if (code) {
        reject(new Error(`Error listing ports udevadm exited with error code: ${code}`));
      }
    });
    udevadm.on("error", reject);
    lines.on("error", reject);
    lines.on("finish", () => resolve(ports2));
  });
}
var __importDefault = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(linux, "__esModule", { value: true });
linux.LinuxPortBinding = linux.LinuxBinding = void 0;
const debug_1 = __importDefault(srcExports);
const linux_list_1 = linuxList$1;
const poller_1 = poller;
const unix_read_1 = unixRead;
const unix_write_1 = unixWrite;
const load_bindings_1 = loadBindings;
const debug = (0, debug_1.default)("serialport/bindings-cpp");
linux.LinuxBinding = {
  list() {
    debug("list");
    return (0, linux_list_1.linuxList)();
  },
  async open(options) {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError('"options" is not an object');
    }
    if (!options.path) {
      throw new TypeError('"path" is not a valid port');
    }
    if (!options.baudRate) {
      throw new TypeError('"baudRate" is not a valid baudRate');
    }
    debug("open");
    const openOptions = Object.assign({ vmin: 1, vtime: 0, dataBits: 8, lock: true, stopBits: 1, parity: "none", rtscts: false, xon: false, xoff: false, xany: false, hupcl: true }, options);
    const fd = await (0, load_bindings_1.asyncOpen)(openOptions.path, openOptions);
    this.fd = fd;
    return new LinuxPortBinding(fd, openOptions);
  }
};
class LinuxPortBinding {
  constructor(fd, openOptions) {
    this.fd = fd;
    this.openOptions = openOptions;
    this.poller = new poller_1.Poller(fd);
    this.writeOperation = null;
  }
  get isOpen() {
    return this.fd !== null;
  }
  async close() {
    debug("close");
    if (!this.isOpen) {
      throw new Error("Port is not open");
    }
    const fd = this.fd;
    this.poller.stop();
    this.poller.destroy();
    this.fd = null;
    await (0, load_bindings_1.asyncClose)(fd);
  }
  async read(buffer, offset, length) {
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('"buffer" is not a Buffer');
    }
    if (typeof offset !== "number" || isNaN(offset)) {
      throw new TypeError(`"offset" is not an integer got "${isNaN(offset) ? "NaN" : typeof offset}"`);
    }
    if (typeof length !== "number" || isNaN(length)) {
      throw new TypeError(`"length" is not an integer got "${isNaN(length) ? "NaN" : typeof length}"`);
    }
    debug("read");
    if (buffer.length < offset + length) {
      throw new Error("buffer is too small");
    }
    if (!this.isOpen) {
      throw new Error("Port is not open");
    }
    return (0, unix_read_1.unixRead)({ binding: this, buffer, offset, length });
  }
  async write(buffer) {
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('"buffer" is not a Buffer');
    }
    debug("write", buffer.length, "bytes");
    if (!this.isOpen) {
      debug("write", "error port is not open");
      throw new Error("Port is not open");
    }
    this.writeOperation = (async () => {
      if (buffer.length === 0) {
        return;
      }
      await (0, unix_write_1.unixWrite)({ binding: this, buffer });
      this.writeOperation = null;
    })();
    return this.writeOperation;
  }
  async update(options) {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw TypeError('"options" is not an object');
    }
    if (typeof options.baudRate !== "number") {
      throw new TypeError('"options.baudRate" is not a number');
    }
    debug("update");
    if (!this.isOpen) {
      throw new Error("Port is not open");
    }
    await (0, load_bindings_1.asyncUpdate)(this.fd, options);
  }
  async set(options) {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError('"options" is not an object');
    }
    debug("set");
    if (!this.isOpen) {
      throw new Error("Port is not open");
    }
    await (0, load_bindings_1.asyncSet)(this.fd, options);
  }
  async get() {
    debug("get");
    if (!this.isOpen) {
      throw new Error("Port is not open");
    }
    return (0, load_bindings_1.asyncGet)(this.fd);
  }
  async getBaudRate() {
    debug("getBaudRate");
    if (!this.isOpen) {
      throw new Error("Port is not open");
    }
    return (0, load_bindings_1.asyncGetBaudRate)(this.fd);
  }
  async flush() {
    debug("flush");
    if (!this.isOpen) {
      throw new Error("Port is not open");
    }
    await (0, load_bindings_1.asyncFlush)(this.fd);
  }
  async drain() {
    debug("drain");
    if (!this.isOpen) {
      throw new Error("Port is not open");
    }
    await this.writeOperation;
    await (0, load_bindings_1.asyncDrain)(this.fd);
  }
}
linux.LinuxPortBinding = LinuxPortBinding;
var win32 = {};
var win32SnParser = {};
Object.defineProperty(win32SnParser, "__esModule", { value: true });
win32SnParser.serialNumParser = void 0;
const PARSERS = [/USB\\(?:.+)\\(.+)/, /FTDIBUS\\(?:.+)\+(.+?)A?\\.+/];
const serialNumParser = (pnpId) => {
  if (!pnpId) {
    return null;
  }
  for (const parser of PARSERS) {
    const sn = pnpId.match(parser);
    if (sn) {
      return sn[1];
    }
  }
  return null;
};
win32SnParser.serialNumParser = serialNumParser;
var hasRequiredWin32;
function requireWin32() {
  if (hasRequiredWin32) return win32;
  hasRequiredWin32 = 1;
  var __importDefault2 = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { "default": mod };
  };
  Object.defineProperty(win32, "__esModule", { value: true });
  win32.WindowsPortBinding = win32.WindowsBinding = void 0;
  const debug_12 = __importDefault2(srcExports);
  const _1 = requireDist();
  const load_bindings_12 = loadBindings;
  const win32_sn_parser_1 = win32SnParser;
  const debug2 = (0, debug_12.default)("serialport/bindings-cpp");
  win32.WindowsBinding = {
    async list() {
      const ports2 = await (0, load_bindings_12.asyncList)();
      return ports2.map((port) => {
        if (port.pnpId && !port.serialNumber) {
          const serialNumber2 = (0, win32_sn_parser_1.serialNumParser)(port.pnpId);
          if (serialNumber2) {
            return Object.assign(Object.assign({}, port), { serialNumber: serialNumber2 });
          }
        }
        return port;
      });
    },
    async open(options) {
      if (!options || typeof options !== "object" || Array.isArray(options)) {
        throw new TypeError('"options" is not an object');
      }
      if (!options.path) {
        throw new TypeError('"path" is not a valid port');
      }
      if (!options.baudRate) {
        throw new TypeError('"baudRate" is not a valid baudRate');
      }
      debug2("open");
      const openOptions = Object.assign({ dataBits: 8, lock: true, stopBits: 1, parity: "none", rtscts: false, rtsMode: "handshake", xon: false, xoff: false, xany: false, hupcl: true }, options);
      const fd = await (0, load_bindings_12.asyncOpen)(openOptions.path, openOptions);
      return new WindowsPortBinding(fd, openOptions);
    }
  };
  class WindowsPortBinding {
    constructor(fd, options) {
      this.fd = fd;
      this.openOptions = options;
      this.writeOperation = null;
    }
    get isOpen() {
      return this.fd !== null;
    }
    async close() {
      debug2("close");
      if (!this.isOpen) {
        throw new Error("Port is not open");
      }
      const fd = this.fd;
      this.fd = null;
      await (0, load_bindings_12.asyncClose)(fd);
    }
    async read(buffer, offset, length) {
      if (!Buffer.isBuffer(buffer)) {
        throw new TypeError('"buffer" is not a Buffer');
      }
      if (typeof offset !== "number" || isNaN(offset)) {
        throw new TypeError(`"offset" is not an integer got "${isNaN(offset) ? "NaN" : typeof offset}"`);
      }
      if (typeof length !== "number" || isNaN(length)) {
        throw new TypeError(`"length" is not an integer got "${isNaN(length) ? "NaN" : typeof length}"`);
      }
      debug2("read");
      if (buffer.length < offset + length) {
        throw new Error("buffer is too small");
      }
      if (!this.isOpen) {
        throw new Error("Port is not open");
      }
      try {
        const bytesRead = await (0, load_bindings_12.asyncRead)(this.fd, buffer, offset, length);
        return { bytesRead, buffer };
      } catch (err) {
        if (!this.isOpen) {
          throw new _1.BindingsError(err.message, { canceled: true });
        }
        throw err;
      }
    }
    async write(buffer) {
      if (!Buffer.isBuffer(buffer)) {
        throw new TypeError('"buffer" is not a Buffer');
      }
      debug2("write", buffer.length, "bytes");
      if (!this.isOpen) {
        debug2("write", "error port is not open");
        throw new Error("Port is not open");
      }
      this.writeOperation = (async () => {
        if (buffer.length === 0) {
          return;
        }
        await (0, load_bindings_12.asyncWrite)(this.fd, buffer);
        this.writeOperation = null;
      })();
      return this.writeOperation;
    }
    async update(options) {
      if (!options || typeof options !== "object" || Array.isArray(options)) {
        throw TypeError('"options" is not an object');
      }
      if (typeof options.baudRate !== "number") {
        throw new TypeError('"options.baudRate" is not a number');
      }
      debug2("update");
      if (!this.isOpen) {
        throw new Error("Port is not open");
      }
      await (0, load_bindings_12.asyncUpdate)(this.fd, options);
    }
    async set(options) {
      if (!options || typeof options !== "object" || Array.isArray(options)) {
        throw new TypeError('"options" is not an object');
      }
      debug2("set", options);
      if (!this.isOpen) {
        throw new Error("Port is not open");
      }
      await (0, load_bindings_12.asyncSet)(this.fd, options);
    }
    async get() {
      debug2("get");
      if (!this.isOpen) {
        throw new Error("Port is not open");
      }
      return (0, load_bindings_12.asyncGet)(this.fd);
    }
    async getBaudRate() {
      debug2("getBaudRate");
      if (!this.isOpen) {
        throw new Error("Port is not open");
      }
      return (0, load_bindings_12.asyncGetBaudRate)(this.fd);
    }
    async flush() {
      debug2("flush");
      if (!this.isOpen) {
        throw new Error("Port is not open");
      }
      await (0, load_bindings_12.asyncFlush)(this.fd);
    }
    async drain() {
      debug2("drain");
      if (!this.isOpen) {
        throw new Error("Port is not open");
      }
      await this.writeOperation;
      await (0, load_bindings_12.asyncDrain)(this.fd);
    }
  }
  win32.WindowsPortBinding = WindowsPortBinding;
  return win32;
}
var dist = {};
var hasRequiredDist;
function requireDist() {
  if (hasRequiredDist) return dist$3;
  hasRequiredDist = 1;
  (function(exports) {
    var __createBinding = commonjsGlobal && commonjsGlobal.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = commonjsGlobal && commonjsGlobal.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    var __importDefault2 = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.autoDetect = autoDetect;
    const debug_12 = __importDefault2(srcExports);
    const darwin_1 = darwin;
    const linux_1 = linux;
    const win32_1 = requireWin32();
    const debug2 = (0, debug_12.default)("serialport/bindings-cpp");
    __exportStar(dist, exports);
    __exportStar(darwin, exports);
    __exportStar(linux, exports);
    __exportStar(requireWin32(), exports);
    __exportStar(errors, exports);
    function autoDetect() {
      switch (process.platform) {
        case "win32":
          debug2("loading WindowsBinding");
          return win32_1.WindowsBinding;
        case "darwin":
          debug2("loading DarwinBinding");
          return darwin_1.DarwinBinding;
        default:
          debug2("loading LinuxBinding");
          return linux_1.LinuxBinding;
      }
    }
  })(dist$3);
  return dist$3;
}
Object.defineProperty(serialport, "__esModule", { value: true });
serialport.SerialPort = void 0;
const stream_1 = dist$5;
const bindings_cpp_1 = requireDist();
const DetectedBinding = (0, bindings_cpp_1.autoDetect)();
class SerialPort extends stream_1.SerialPortStream {
  constructor(options, openCallback) {
    const opts = {
      binding: DetectedBinding,
      ...options
    };
    super(opts, openCallback);
  }
}
__publicField(SerialPort, "list", DetectedBinding.list);
__publicField(SerialPort, "binding", DetectedBinding);
serialport.SerialPort = SerialPort;
(function(exports) {
  var __createBinding = commonjsGlobal && commonjsGlobal.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === void 0) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === void 0) k2 = k;
    o[k2] = m[k];
  });
  var __exportStar = commonjsGlobal && commonjsGlobal.__exportStar || function(m, exports2) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  __exportStar(dist$f, exports);
  __exportStar(dist$e, exports);
  __exportStar(dist$d, exports);
  __exportStar(dist$c, exports);
  __exportStar(dist$b, exports);
  __exportStar(dist$a, exports);
  __exportStar(dist$9, exports);
  __exportStar(dist$8, exports);
  __exportStar(dist$7, exports);
  __exportStar(dist$6, exports);
  __exportStar(serialportMock, exports);
  __exportStar(serialport, exports);
})(dist$g);
const index = /* @__PURE__ */ getDefaultExportFromCjs(dist$g);
const index$1 = /* @__PURE__ */ _mergeNamespaces({
  __proto__: null,
  default: index
}, [dist$g]);
export {
  index$1 as i
};
