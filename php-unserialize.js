// Wrapper for nodejs/browser compat
(function (window, exports) {

// Public API
exports.unserialize = unserialize;
exports.unserializeSession = unserializeSession;
exports.unserializeAt = unserializeAt;

// http://phpjs.org/functions/unserialize:571#comment_95906
function utf8Overhead (chr) {
  var code = chr.charCodeAt(0);
  if (code < 0x0080) {
    return 0;
  }
  if (code < 0x0800) {
    return 1;
  }
  return 2;
}

function error (type, msg, filename, line) {
  throw new window[type](msg, filename, line);
}

function readUntil (data, offset, stopchr) {
  var i = 2, buf = [], chr = data.slice(offset, offset + 1);

  while (chr != stopchr) {
    if ((i + offset) > data.length) {
      error('Error', 'Invalid');
    }
    buf.push(chr);
    chr = data.slice(offset + (i - 1), offset + i);
    i += 1;
  }
  return [buf.length, buf.join('')];
}

function readChrs (data, offset, length) {
  var i, chr, buf;

  buf = [];
  for (i = 0; i < length; i++) {
    chr = data.slice(offset + (i - 1), offset + i);
    buf.push(chr);
    length -= utf8Overhead(chr);
  }
  return [buf.length, buf.join('')];
}

/**
 * Unserialize data taken from PHP's serialize() output
 *
 * Taken from https://github.com/kvz/phpjs/blob/master/functions/var/unserialize.js
 * Fixed window reference to make it nodejs-compatible
 *
 * @param string serialized data
 * @return unserialized data
 * @throws
 */
function unserialize (data) {
  // http://kevin.vanzonneveld.net
  // +     original by: Arpad Ray (mailto:arpad@php.net)
  // +     improved by: Pedro Tainha (http://www.pedrotainha.com)
  // +     bugfixed by: dptr1988
  // +      revised by: d3x
  // +     improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +        input by: Brett Zamir (http://brett-zamir.me)
  // +     improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +     improved by: Chris
  // +     improved by: James
  // +        input by: Martin (http://www.erlenwiese.de/)
  // +     bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +     improved by: Le Torbi
  // +     input by: kilops
  // +     bugfixed by: Brett Zamir (http://brett-zamir.me)
  // +      input by: Jaroslaw Czarniak
  // %            note: We feel the main purpose of this function should be to ease the transport of data between php & js
  // %            note: Aiming for PHP-compatibility, we have to translate objects to arrays
  // *       example 1: unserialize('a:3:{i:0;s:5:"Kevin";i:1;s:3:"van";i:2;s:9:"Zonneveld";}');
  // *       returns 1: ['Kevin', 'van', 'Zonneveld']
  // *       example 2: unserialize('a:3:{s:9:"firstName";s:5:"Kevin";s:7:"midName";s:3:"van";s:7:"surName";s:9:"Zonneveld";}');
  // *       returns 2: {firstName: 'Kevin', midName: 'van', surName: 'Zonneveld'}
  return _unserialize((data + ''), 0)[2];
}

/**
 * Parse a single PHP-serialized value starting at `offset` within a larger
 * buffer, without assuming the buffer contains only that one value.
 *
 * @param string data   buffer containing (at least) one serialized value
 * @param number offset index to start parsing at
 * @return {value, length} the parsed value, and how many characters it consumed
 * @throws
 */
function unserializeAt (data, offset) {
  var result = _unserialize(data, offset || 0);
  return { value: result[2], length: result[1] };
}

function _unserialize (data, offset) {
  var dtype, dataoffset, keyandchrs, keys,
    readdata, readData, ccount, stringlength,
    i, key, kprops, kchrs, vprops, vchrs, value,
    chrs = 0,
    typeconvert = function (x) {
      return x;
    };

  if (!offset) {
    offset = 0;
  }
  dtype = (data.slice(offset, offset + 1)).toLowerCase();

  dataoffset = offset + 2;

  switch (dtype) {
    case 'i':
      typeconvert = function (x) {
        return parseInt(x, 10);
      };
      readData = readUntil(data, dataoffset, ';');
      chrs = readData[0];
      readdata = readData[1];
      dataoffset += chrs + 1;
      break;
    case 'b':
      typeconvert = function (x) {
        return parseInt(x, 10) !== 0;
      };
      readData = readUntil(data, dataoffset, ';');
      chrs = readData[0];
      readdata = readData[1];
      dataoffset += chrs + 1;
      break;
    case 'd':
      typeconvert = function (x) {
        return parseFloat(x);
      };
      readData = readUntil(data, dataoffset, ';');
      chrs = readData[0];
      readdata = readData[1];
      dataoffset += chrs + 1;
      break;
    case 'c':
      var res = getClass(data, dataoffset);
      dataoffset = res[0];
      readdata = res[1];
      break;
    case 'o':
      var res = getObject(data, dataoffset);
      dataoffset = res[0];
      readdata = res[1];
      break;
    case 'n':
      readdata = null;
      break;
    case 's':
      var res = getString(data, dataoffset);
      dataoffset = res[0];
      readdata = res[1];
      break;
    case 'a':
      var res = getArray(data, dataoffset);
      dataoffset = res[0];
      readdata = res[1];
      break;
    default:
      error('SyntaxError', 'Unknown / Unhandled data type(s): ' + dtype + ' :: ' + offset + JSON.stringify([dtype, data[offset], data.slice(offset-20, offset + 10), data]));
      break;
  }
  return [dtype, dataoffset - offset, typeconvert(readdata)];
}

function getArray(data, offset) {
  var readdata
    , chrs
    , keys
    , dataoffset = offset
    , kprops
    , kchrs
    , key
    , vprops
    , vchrs
    , keyandchrs
    , i
    , value;
  readdata = {};

  keyandchrs = readUntil(data, dataoffset, ':');
  chrs = keyandchrs[0];
  keys = keyandchrs[1];
  dataoffset += chrs + 2;

  for (i = 0; i < parseInt(keys, 10); i++) {
    kprops = _unserialize(data, dataoffset);
    kchrs = kprops[1];
    key = kprops[2];
    dataoffset += kchrs;

    vprops = _unserialize(data, dataoffset);
    vchrs = vprops[1];
    value = vprops[2];
    dataoffset += vchrs;

    readdata[key] = value;
  }

  dataoffset += 1;
  return [dataoffset, readdata];
}

function getCount(data, offset) {
  var ccount
    , count
    , chrs
    , stringlength
    , readData
    , readdata;
  ccount = readUntil(data, offset, ':');
  chrs = ccount[0];
  count = ccount[1];
  offset += chrs + 2;
  return [offset, count];
};

function getObject(data, offset) {
  var res = getString(data, offset)
    , body
    , classname = res[1];

  offset = res[0];
  res = getArray(data, offset);
  offset = res[0];
  return [offset, {name: classname, body: res[1]}];
};


function getClass(data, offset) {
  var res = getString(data, offset)
    , body
    , classname = res[1];

  offset = res[0];
  res = getCount(data, offset);
  offset = res[0];
  body = data.slice(offset - 1, offset + parseInt(res[1]) );
  if (body[0] !== '{' || body[body.length - 1] !== '}') {
    throw new Error('invalid body defn: ' + JSON.stringify([body, offset, res[1], data.slice(offset-1, offset+10)]));
  }
  body = body.slice(1, -1);
  try {
    body = _unserialize(body, 0)[2];
  } catch (e) {
  }
  return [offset + parseInt(res[1]) + 1, {name: classname, body: body}];
};

function getString(data, offset) {
  var ccount
    , chrs
    , stringlength
    , readData
    , readdata;
  ccount = readUntil(data, offset, ':');
  chrs = ccount[0];
  stringlength = ccount[1];
  offset += chrs + 2;

  readData = readChrs(data, offset + 1, parseInt(stringlength, 10));
  chrs = readData[0];
  readdata = readData[1];
  offset += chrs + 2;
  if (chrs != parseInt(stringlength, 10) && chrs != readdata.length) {
    error('SyntaxError', 'String length mismatch');
  }
  return [offset, readdata];
};

/**
 * Parse PHP-serialized session data: a sequence of NamespaceName|serializedValue
 * pairs concatenated with no delimiter around the serialized values themselves.
 *
 * Namespace keys are always bare identifiers and never contain "|", but a
 * serialized value legitimately can (e.g. a string field like an OAuth
 * "provider|subject" id). So namespace boundaries are found by scanning for
 * the next "|", while values are parsed with the real length-aware recursive
 * parser and advanced by its reported consumed length — never by splitting
 * the whole buffer on "|".
 *
 * @param string serialized session
 * @return unserialized data
 * @throws
 */
function unserializeSession (input) {
  var output = {};
  var offset = 0;
  // Trailing whitespace (e.g. a file's final newline) isn't part of any
  // serialized value and would otherwise be mistaken for another namespace.
  input = String(input).replace(/\s+$/, '');

  while (offset < input.length) {
    var pipeIndex = input.indexOf('|', offset);
    if (pipeIndex === -1) {
      throw new Error('Malformed session data: no namespace separator found at offset ' + offset);
    }
    var namespaceKey = input.slice(offset, pipeIndex);
    offset = pipeIndex + 1;

    var parsed = unserializeAt(input, offset);
    output[namespaceKey] = parsed.value;
    offset += parsed.length;
  }

  return output;
}

// /Wrapper
})((typeof window === 'undefined') ? global : window, (typeof window === 'undefined') ? exports : (window.PHPUnserialize = {}));
