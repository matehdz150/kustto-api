// GENERADO por kustto-web/scripts/bordado/exportar-nucleo.mts — NO EDITAR.
// El núcleo de bordado (preparar + @kustto/bordado), versión e908a307e3a071d2919a0be1e20bcbf2c7be27d35728b609486972beeef63293.
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/.pnpm/svgpath@2.6.0/node_modules/svgpath/lib/path_parse.js
var require_path_parse = __commonJS({
  "node_modules/.pnpm/svgpath@2.6.0/node_modules/svgpath/lib/path_parse.js"(exports2, module2) {
    "use strict";
    var paramCounts = { a: 7, c: 6, h: 1, l: 2, m: 2, r: 4, q: 4, s: 4, t: 2, v: 1, z: 0 };
    var SPECIAL_SPACES = [
      5760,
      6158,
      8192,
      8193,
      8194,
      8195,
      8196,
      8197,
      8198,
      8199,
      8200,
      8201,
      8202,
      8239,
      8287,
      12288,
      65279
    ];
    function isSpace(ch) {
      return ch === 10 || ch === 13 || ch === 8232 || ch === 8233 || // Line terminators
      // White spaces
      ch === 32 || ch === 9 || ch === 11 || ch === 12 || ch === 160 || ch >= 5760 && SPECIAL_SPACES.indexOf(ch) >= 0;
    }
    function isCommand(code) {
      switch (code | 32) {
        case 109:
        case 122:
        case 108:
        case 104:
        case 118:
        case 99:
        case 115:
        case 113:
        case 116:
        case 97:
        case 114:
          return true;
      }
      return false;
    }
    function isArc(code) {
      return (code | 32) === 97;
    }
    function isDigit(code) {
      return code >= 48 && code <= 57;
    }
    function isDigitStart(code) {
      return code >= 48 && code <= 57 || /* 0..9 */
      code === 43 || /* + */
      code === 45 || /* - */
      code === 46;
    }
    function State(path) {
      this.index = 0;
      this.path = path;
      this.max = path.length;
      this.result = [];
      this.param = 0;
      this.err = "";
      this.segmentStart = 0;
      this.data = [];
    }
    function skipSpaces(state) {
      while (state.index < state.max && isSpace(state.path.charCodeAt(state.index))) {
        state.index++;
      }
    }
    function scanFlag(state) {
      var ch = state.path.charCodeAt(state.index);
      if (ch === 48) {
        state.param = 0;
        state.index++;
        return;
      }
      if (ch === 49) {
        state.param = 1;
        state.index++;
        return;
      }
      state.err = "SvgPath: arc flag can be 0 or 1 only (at pos " + state.index + ")";
    }
    function scanParam(state) {
      var start = state.index, index = start, max = state.max, zeroFirst = false, hasCeiling = false, hasDecimal = false, hasDot = false, ch;
      if (index >= max) {
        state.err = "SvgPath: missed param (at pos " + index + ")";
        return;
      }
      ch = state.path.charCodeAt(index);
      if (ch === 43 || ch === 45) {
        index++;
        ch = index < max ? state.path.charCodeAt(index) : 0;
      }
      if (!isDigit(ch) && ch !== 46) {
        state.err = "SvgPath: param should start with 0..9 or `.` (at pos " + index + ")";
        return;
      }
      if (ch !== 46) {
        zeroFirst = ch === 48;
        index++;
        ch = index < max ? state.path.charCodeAt(index) : 0;
        if (zeroFirst && index < max) {
          if (ch && isDigit(ch)) {
            state.err = "SvgPath: numbers started with `0` such as `09` are illegal (at pos " + start + ")";
            return;
          }
        }
        while (index < max && isDigit(state.path.charCodeAt(index))) {
          index++;
          hasCeiling = true;
        }
        ch = index < max ? state.path.charCodeAt(index) : 0;
      }
      if (ch === 46) {
        hasDot = true;
        index++;
        while (isDigit(state.path.charCodeAt(index))) {
          index++;
          hasDecimal = true;
        }
        ch = index < max ? state.path.charCodeAt(index) : 0;
      }
      if (ch === 101 || ch === 69) {
        if (hasDot && !hasCeiling && !hasDecimal) {
          state.err = "SvgPath: invalid float exponent (at pos " + index + ")";
          return;
        }
        index++;
        ch = index < max ? state.path.charCodeAt(index) : 0;
        if (ch === 43 || ch === 45) {
          index++;
        }
        if (index < max && isDigit(state.path.charCodeAt(index))) {
          while (index < max && isDigit(state.path.charCodeAt(index))) {
            index++;
          }
        } else {
          state.err = "SvgPath: invalid float exponent (at pos " + index + ")";
          return;
        }
      }
      state.index = index;
      state.param = parseFloat(state.path.slice(start, index)) + 0;
    }
    function finalizeSegment(state) {
      var cmd, cmdLC;
      cmd = state.path[state.segmentStart];
      cmdLC = cmd.toLowerCase();
      var params = state.data;
      if (cmdLC === "m" && params.length > 2) {
        state.result.push([cmd, params[0], params[1]]);
        params = params.slice(2);
        cmdLC = "l";
        cmd = cmd === "m" ? "l" : "L";
      }
      if (cmdLC === "r") {
        state.result.push([cmd].concat(params));
      } else {
        while (params.length >= paramCounts[cmdLC]) {
          state.result.push([cmd].concat(params.splice(0, paramCounts[cmdLC])));
          if (!paramCounts[cmdLC]) {
            break;
          }
        }
      }
    }
    function scanSegment(state) {
      var max = state.max, cmdCode, is_arc, comma_found, need_params, i;
      state.segmentStart = state.index;
      cmdCode = state.path.charCodeAt(state.index);
      is_arc = isArc(cmdCode);
      if (!isCommand(cmdCode)) {
        state.err = "SvgPath: bad command " + state.path[state.index] + " (at pos " + state.index + ")";
        return;
      }
      need_params = paramCounts[state.path[state.index].toLowerCase()];
      state.index++;
      skipSpaces(state);
      state.data = [];
      if (!need_params) {
        finalizeSegment(state);
        return;
      }
      comma_found = false;
      for (; ; ) {
        for (i = need_params; i > 0; i--) {
          if (is_arc && (i === 3 || i === 4)) scanFlag(state);
          else scanParam(state);
          if (state.err.length) {
            finalizeSegment(state);
            return;
          }
          state.data.push(state.param);
          skipSpaces(state);
          comma_found = false;
          if (state.index < max && state.path.charCodeAt(state.index) === 44) {
            state.index++;
            skipSpaces(state);
            comma_found = true;
          }
        }
        if (comma_found) {
          continue;
        }
        if (state.index >= state.max) {
          break;
        }
        if (!isDigitStart(state.path.charCodeAt(state.index))) {
          break;
        }
      }
      finalizeSegment(state);
    }
    module2.exports = function pathParse(svgPath) {
      var state = new State(svgPath);
      var max = state.max;
      skipSpaces(state);
      while (state.index < max && !state.err.length) {
        scanSegment(state);
      }
      if (state.result.length) {
        if ("mM".indexOf(state.result[0][0]) < 0) {
          state.err = "SvgPath: string should start with `M` or `m`";
          state.result = [];
        } else {
          state.result[0][0] = "M";
        }
      }
      return {
        err: state.err,
        segments: state.result
      };
    };
  }
});

// node_modules/.pnpm/svgpath@2.6.0/node_modules/svgpath/lib/matrix.js
var require_matrix = __commonJS({
  "node_modules/.pnpm/svgpath@2.6.0/node_modules/svgpath/lib/matrix.js"(exports2, module2) {
    "use strict";
    function combine(m1, m2) {
      return [
        m1[0] * m2[0] + m1[2] * m2[1],
        m1[1] * m2[0] + m1[3] * m2[1],
        m1[0] * m2[2] + m1[2] * m2[3],
        m1[1] * m2[2] + m1[3] * m2[3],
        m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
        m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
      ];
    }
    function Matrix() {
      if (!(this instanceof Matrix)) {
        return new Matrix();
      }
      this.queue = [];
      this.cache = null;
    }
    Matrix.prototype.matrix = function(m) {
      if (m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0) {
        return this;
      }
      this.cache = null;
      this.queue.push(m);
      return this;
    };
    Matrix.prototype.translate = function(tx, ty) {
      if (tx !== 0 || ty !== 0) {
        this.cache = null;
        this.queue.push([1, 0, 0, 1, tx, ty]);
      }
      return this;
    };
    Matrix.prototype.scale = function(sx, sy) {
      if (sx !== 1 || sy !== 1) {
        this.cache = null;
        this.queue.push([sx, 0, 0, sy, 0, 0]);
      }
      return this;
    };
    Matrix.prototype.rotate = function(angle, rx, ry) {
      var rad, cos, sin;
      if (angle !== 0) {
        this.translate(rx, ry);
        rad = angle * Math.PI / 180;
        cos = Math.cos(rad);
        sin = Math.sin(rad);
        this.queue.push([cos, sin, -sin, cos, 0, 0]);
        this.cache = null;
        this.translate(-rx, -ry);
      }
      return this;
    };
    Matrix.prototype.skewX = function(angle) {
      if (angle !== 0) {
        this.cache = null;
        this.queue.push([1, 0, Math.tan(angle * Math.PI / 180), 1, 0, 0]);
      }
      return this;
    };
    Matrix.prototype.skewY = function(angle) {
      if (angle !== 0) {
        this.cache = null;
        this.queue.push([1, Math.tan(angle * Math.PI / 180), 0, 1, 0, 0]);
      }
      return this;
    };
    Matrix.prototype.toArray = function() {
      if (this.cache) {
        return this.cache;
      }
      if (!this.queue.length) {
        this.cache = [1, 0, 0, 1, 0, 0];
        return this.cache;
      }
      this.cache = this.queue[0];
      if (this.queue.length === 1) {
        return this.cache;
      }
      for (var i = 1; i < this.queue.length; i++) {
        this.cache = combine(this.cache, this.queue[i]);
      }
      return this.cache;
    };
    Matrix.prototype.calc = function(x, y, isRelative) {
      var m;
      if (!this.queue.length) {
        return [x, y];
      }
      if (!this.cache) {
        this.cache = this.toArray();
      }
      m = this.cache;
      return [
        x * m[0] + y * m[2] + (isRelative ? 0 : m[4]),
        x * m[1] + y * m[3] + (isRelative ? 0 : m[5])
      ];
    };
    module2.exports = Matrix;
  }
});

// node_modules/.pnpm/svgpath@2.6.0/node_modules/svgpath/lib/transform_parse.js
var require_transform_parse = __commonJS({
  "node_modules/.pnpm/svgpath@2.6.0/node_modules/svgpath/lib/transform_parse.js"(exports2, module2) {
    "use strict";
    var Matrix = require_matrix();
    var operations = {
      matrix: true,
      scale: true,
      rotate: true,
      translate: true,
      skewX: true,
      skewY: true
    };
    var CMD_SPLIT_RE = /\s*(matrix|translate|scale|rotate|skewX|skewY)\s*\(\s*(.+?)\s*\)[\s,]*/;
    var PARAMS_SPLIT_RE = /[\s,]+/;
    module2.exports = function transformParse(transformString) {
      var matrix = new Matrix();
      var cmd, params;
      transformString.split(CMD_SPLIT_RE).forEach(function(item) {
        if (!item.length) {
          return;
        }
        if (typeof operations[item] !== "undefined") {
          cmd = item;
          return;
        }
        params = item.split(PARAMS_SPLIT_RE).map(function(i) {
          return +i || 0;
        });
        switch (cmd) {
          case "matrix":
            if (params.length === 6) {
              matrix.matrix(params);
            }
            return;
          case "scale":
            if (params.length === 1) {
              matrix.scale(params[0], params[0]);
            } else if (params.length === 2) {
              matrix.scale(params[0], params[1]);
            }
            return;
          case "rotate":
            if (params.length === 1) {
              matrix.rotate(params[0], 0, 0);
            } else if (params.length === 3) {
              matrix.rotate(params[0], params[1], params[2]);
            }
            return;
          case "translate":
            if (params.length === 1) {
              matrix.translate(params[0], 0);
            } else if (params.length === 2) {
              matrix.translate(params[0], params[1]);
            }
            return;
          case "skewX":
            if (params.length === 1) {
              matrix.skewX(params[0]);
            }
            return;
          case "skewY":
            if (params.length === 1) {
              matrix.skewY(params[0]);
            }
            return;
        }
      });
      return matrix;
    };
  }
});

// node_modules/.pnpm/svgpath@2.6.0/node_modules/svgpath/lib/a2c.js
var require_a2c = __commonJS({
  "node_modules/.pnpm/svgpath@2.6.0/node_modules/svgpath/lib/a2c.js"(exports2, module2) {
    "use strict";
    var TAU = Math.PI * 2;
    function unit_vector_angle(ux, uy, vx, vy) {
      var sign = ux * vy - uy * vx < 0 ? -1 : 1;
      var dot = ux * vx + uy * vy;
      if (dot > 1) {
        dot = 1;
      }
      if (dot < -1) {
        dot = -1;
      }
      return sign * Math.acos(dot);
    }
    function get_arc_center(x1, y1, x2, y2, fa, fs, rx, ry, sin_phi, cos_phi) {
      var x1p = cos_phi * (x1 - x2) / 2 + sin_phi * (y1 - y2) / 2;
      var y1p = -sin_phi * (x1 - x2) / 2 + cos_phi * (y1 - y2) / 2;
      var rx_sq = rx * rx;
      var ry_sq = ry * ry;
      var x1p_sq = x1p * x1p;
      var y1p_sq = y1p * y1p;
      var radicant = rx_sq * ry_sq - rx_sq * y1p_sq - ry_sq * x1p_sq;
      if (radicant < 0) {
        radicant = 0;
      }
      radicant /= rx_sq * y1p_sq + ry_sq * x1p_sq;
      radicant = Math.sqrt(radicant) * (fa === fs ? -1 : 1);
      var cxp = radicant * rx / ry * y1p;
      var cyp = radicant * -ry / rx * x1p;
      var cx = cos_phi * cxp - sin_phi * cyp + (x1 + x2) / 2;
      var cy = sin_phi * cxp + cos_phi * cyp + (y1 + y2) / 2;
      var v1x = (x1p - cxp) / rx;
      var v1y = (y1p - cyp) / ry;
      var v2x = (-x1p - cxp) / rx;
      var v2y = (-y1p - cyp) / ry;
      var theta1 = unit_vector_angle(1, 0, v1x, v1y);
      var delta_theta = unit_vector_angle(v1x, v1y, v2x, v2y);
      if (fs === 0 && delta_theta > 0) {
        delta_theta -= TAU;
      }
      if (fs === 1 && delta_theta < 0) {
        delta_theta += TAU;
      }
      return [cx, cy, theta1, delta_theta];
    }
    function approximate_unit_arc(theta1, delta_theta) {
      var alpha = 4 / 3 * Math.tan(delta_theta / 4);
      var x1 = Math.cos(theta1);
      var y1 = Math.sin(theta1);
      var x2 = Math.cos(theta1 + delta_theta);
      var y2 = Math.sin(theta1 + delta_theta);
      return [x1, y1, x1 - y1 * alpha, y1 + x1 * alpha, x2 + y2 * alpha, y2 - x2 * alpha, x2, y2];
    }
    module2.exports = function a2c(x1, y1, x2, y2, fa, fs, rx, ry, phi) {
      var sin_phi = Math.sin(phi * TAU / 360);
      var cos_phi = Math.cos(phi * TAU / 360);
      var x1p = cos_phi * (x1 - x2) / 2 + sin_phi * (y1 - y2) / 2;
      var y1p = -sin_phi * (x1 - x2) / 2 + cos_phi * (y1 - y2) / 2;
      if (x1p === 0 && y1p === 0) {
        return [];
      }
      if (rx === 0 || ry === 0) {
        return [];
      }
      rx = Math.abs(rx);
      ry = Math.abs(ry);
      var lambda = x1p * x1p / (rx * rx) + y1p * y1p / (ry * ry);
      if (lambda > 1) {
        rx *= Math.sqrt(lambda);
        ry *= Math.sqrt(lambda);
      }
      var cc2 = get_arc_center(x1, y1, x2, y2, fa, fs, rx, ry, sin_phi, cos_phi);
      var result = [];
      var theta1 = cc2[2];
      var delta_theta = cc2[3];
      var segments = Math.max(Math.ceil(Math.abs(delta_theta) / (TAU / 4)), 1);
      delta_theta /= segments;
      for (var i = 0; i < segments; i++) {
        result.push(approximate_unit_arc(theta1, delta_theta));
        theta1 += delta_theta;
      }
      return result.map(function(curve) {
        for (var i2 = 0; i2 < curve.length; i2 += 2) {
          var x = curve[i2 + 0];
          var y = curve[i2 + 1];
          x *= rx;
          y *= ry;
          var xp = cos_phi * x - sin_phi * y;
          var yp = sin_phi * x + cos_phi * y;
          curve[i2 + 0] = xp + cc2[0];
          curve[i2 + 1] = yp + cc2[1];
        }
        return curve;
      });
    };
  }
});

// node_modules/.pnpm/svgpath@2.6.0/node_modules/svgpath/lib/ellipse.js
var require_ellipse = __commonJS({
  "node_modules/.pnpm/svgpath@2.6.0/node_modules/svgpath/lib/ellipse.js"(exports2, module2) {
    "use strict";
    var epsilon2 = 1e-10;
    var torad = Math.PI / 180;
    function Ellipse(rx, ry, ax) {
      if (!(this instanceof Ellipse)) {
        return new Ellipse(rx, ry, ax);
      }
      this.rx = rx;
      this.ry = ry;
      this.ax = ax;
    }
    Ellipse.prototype.transform = function(m) {
      var c = Math.cos(this.ax * torad), s = Math.sin(this.ax * torad);
      var ma = [
        this.rx * (m[0] * c + m[2] * s),
        this.rx * (m[1] * c + m[3] * s),
        this.ry * (-m[0] * s + m[2] * c),
        this.ry * (-m[1] * s + m[3] * c)
      ];
      var J = ma[0] * ma[0] + ma[2] * ma[2], K = ma[1] * ma[1] + ma[3] * ma[3];
      var D2 = ((ma[0] - ma[3]) * (ma[0] - ma[3]) + (ma[2] + ma[1]) * (ma[2] + ma[1])) * ((ma[0] + ma[3]) * (ma[0] + ma[3]) + (ma[2] - ma[1]) * (ma[2] - ma[1]));
      var JK = (J + K) / 2;
      if (D2 < epsilon2 * JK) {
        this.rx = this.ry = Math.sqrt(JK);
        this.ax = 0;
        return this;
      }
      var L = ma[0] * ma[1] + ma[2] * ma[3];
      D2 = Math.sqrt(D2);
      var l1 = JK + D2 / 2, l2 = JK - D2 / 2;
      this.ax = Math.abs(L) < epsilon2 && Math.abs(l1 - K) < epsilon2 ? 90 : Math.atan(
        Math.abs(L) > Math.abs(l1 - K) ? (l1 - J) / L : L / (l1 - K)
      ) * 180 / Math.PI;
      if (this.ax >= 0) {
        this.rx = Math.sqrt(l1);
        this.ry = Math.sqrt(l2);
      } else {
        this.ax += 90;
        this.rx = Math.sqrt(l2);
        this.ry = Math.sqrt(l1);
      }
      return this;
    };
    Ellipse.prototype.isDegenerate = function() {
      return this.rx < epsilon2 * this.ry || this.ry < epsilon2 * this.rx;
    };
    module2.exports = Ellipse;
  }
});

// node_modules/.pnpm/svgpath@2.6.0/node_modules/svgpath/lib/svgpath.js
var require_svgpath = __commonJS({
  "node_modules/.pnpm/svgpath@2.6.0/node_modules/svgpath/lib/svgpath.js"(exports2, module2) {
    "use strict";
    var pathParse = require_path_parse();
    var transformParse = require_transform_parse();
    var matrix = require_matrix();
    var a2c = require_a2c();
    var ellipse2 = require_ellipse();
    function SvgPath(path) {
      if (!(this instanceof SvgPath)) {
        return new SvgPath(path);
      }
      var pstate = pathParse(path);
      this.segments = pstate.segments;
      this.err = pstate.err;
      this.__stack = [];
    }
    SvgPath.from = function(src) {
      if (typeof src === "string") return new SvgPath(src);
      if (src instanceof SvgPath) {
        var s = new SvgPath("");
        s.err = src.err;
        s.segments = src.segments.map(function(sgm) {
          return sgm.slice();
        });
        s.__stack = src.__stack.map(function(m) {
          return matrix().matrix(m.toArray());
        });
        return s;
      }
      throw new Error("SvgPath.from: invalid param type " + src);
    };
    SvgPath.prototype.__matrix = function(m) {
      var self2 = this, i;
      if (!m.queue.length) {
        return;
      }
      this.iterate(function(s, index, x, y) {
        var p, result, name, isRelative;
        switch (s[0]) {
          // Process 'assymetric' commands separately
          case "v":
            p = m.calc(0, s[1], true);
            result = p[0] === 0 ? ["v", p[1]] : ["l", p[0], p[1]];
            break;
          case "V":
            p = m.calc(x, s[1], false);
            result = p[0] === m.calc(x, y, false)[0] ? ["V", p[1]] : ["L", p[0], p[1]];
            break;
          case "h":
            p = m.calc(s[1], 0, true);
            result = p[1] === 0 ? ["h", p[0]] : ["l", p[0], p[1]];
            break;
          case "H":
            p = m.calc(s[1], y, false);
            result = p[1] === m.calc(x, y, false)[1] ? ["H", p[0]] : ["L", p[0], p[1]];
            break;
          case "a":
          case "A":
            var ma = m.toArray();
            var e = ellipse2(s[1], s[2], s[3]).transform(ma);
            if (ma[0] * ma[3] - ma[1] * ma[2] < 0) {
              s[5] = s[5] ? "0" : "1";
            }
            p = m.calc(s[6], s[7], s[0] === "a");
            if (s[0] === "A" && s[6] === x && s[7] === y || s[0] === "a" && s[6] === 0 && s[7] === 0) {
              result = [s[0] === "a" ? "l" : "L", p[0], p[1]];
              break;
            }
            if (e.isDegenerate()) {
              result = [s[0] === "a" ? "l" : "L", p[0], p[1]];
            } else {
              result = [s[0], e.rx, e.ry, e.ax, s[4], s[5], p[0], p[1]];
            }
            break;
          case "m":
            isRelative = index > 0;
            p = m.calc(s[1], s[2], isRelative);
            result = ["m", p[0], p[1]];
            break;
          default:
            name = s[0];
            result = [name];
            isRelative = name.toLowerCase() === name;
            for (i = 1; i < s.length; i += 2) {
              p = m.calc(s[i], s[i + 1], isRelative);
              result.push(p[0], p[1]);
            }
        }
        self2.segments[index] = result;
      }, true);
    };
    SvgPath.prototype.__evaluateStack = function() {
      var m, i;
      if (!this.__stack.length) {
        return;
      }
      if (this.__stack.length === 1) {
        this.__matrix(this.__stack[0]);
        this.__stack = [];
        return;
      }
      m = matrix();
      i = this.__stack.length;
      while (--i >= 0) {
        m.matrix(this.__stack[i].toArray());
      }
      this.__matrix(m);
      this.__stack = [];
    };
    SvgPath.prototype.toString = function() {
      var result = "", prevCmd = "", cmdSkipped = false;
      this.__evaluateStack();
      for (var i = 0, len = this.segments.length; i < len; i++) {
        var segment = this.segments[i];
        var cmd = segment[0];
        if (cmd !== prevCmd || cmd === "m" || cmd === "M") {
          if (cmd === "m" && prevCmd === "z") result += " ";
          result += cmd;
          cmdSkipped = false;
        } else {
          cmdSkipped = true;
        }
        for (var pos = 1; pos < segment.length; pos++) {
          var val = segment[pos];
          if (pos === 1) {
            if (cmdSkipped && val >= 0) result += " ";
          } else if (val >= 0) result += " ";
          result += val;
        }
        prevCmd = cmd;
      }
      return result;
    };
    SvgPath.prototype.translate = function(x, y) {
      this.__stack.push(matrix().translate(x, y || 0));
      return this;
    };
    SvgPath.prototype.scale = function(sx, sy) {
      this.__stack.push(matrix().scale(sx, !sy && sy !== 0 ? sx : sy));
      return this;
    };
    SvgPath.prototype.rotate = function(angle, rx, ry) {
      this.__stack.push(matrix().rotate(angle, rx || 0, ry || 0));
      return this;
    };
    SvgPath.prototype.skewX = function(degrees) {
      this.__stack.push(matrix().skewX(degrees));
      return this;
    };
    SvgPath.prototype.skewY = function(degrees) {
      this.__stack.push(matrix().skewY(degrees));
      return this;
    };
    SvgPath.prototype.matrix = function(m) {
      this.__stack.push(matrix().matrix(m));
      return this;
    };
    SvgPath.prototype.transform = function(transformString) {
      if (!transformString.trim()) {
        return this;
      }
      this.__stack.push(transformParse(transformString));
      return this;
    };
    SvgPath.prototype.round = function(d) {
      var contourStartDeltaX = 0, contourStartDeltaY = 0, deltaX = 0, deltaY = 0, l;
      d = d || 0;
      this.__evaluateStack();
      this.segments.forEach(function(s) {
        var isRelative = s[0].toLowerCase() === s[0];
        switch (s[0]) {
          case "H":
          case "h":
            if (isRelative) {
              s[1] += deltaX;
            }
            deltaX = s[1] - s[1].toFixed(d);
            s[1] = +s[1].toFixed(d);
            return;
          case "V":
          case "v":
            if (isRelative) {
              s[1] += deltaY;
            }
            deltaY = s[1] - s[1].toFixed(d);
            s[1] = +s[1].toFixed(d);
            return;
          case "Z":
          case "z":
            deltaX = contourStartDeltaX;
            deltaY = contourStartDeltaY;
            return;
          case "M":
          case "m":
            if (isRelative) {
              s[1] += deltaX;
              s[2] += deltaY;
            }
            deltaX = s[1] - s[1].toFixed(d);
            deltaY = s[2] - s[2].toFixed(d);
            contourStartDeltaX = deltaX;
            contourStartDeltaY = deltaY;
            s[1] = +s[1].toFixed(d);
            s[2] = +s[2].toFixed(d);
            return;
          case "A":
          case "a":
            if (isRelative) {
              s[6] += deltaX;
              s[7] += deltaY;
            }
            deltaX = s[6] - s[6].toFixed(d);
            deltaY = s[7] - s[7].toFixed(d);
            s[1] = +s[1].toFixed(d);
            s[2] = +s[2].toFixed(d);
            s[3] = +s[3].toFixed(d + 2);
            s[6] = +s[6].toFixed(d);
            s[7] = +s[7].toFixed(d);
            return;
          default:
            l = s.length;
            if (isRelative) {
              s[l - 2] += deltaX;
              s[l - 1] += deltaY;
            }
            deltaX = s[l - 2] - s[l - 2].toFixed(d);
            deltaY = s[l - 1] - s[l - 1].toFixed(d);
            s.forEach(function(val, i) {
              if (!i) {
                return;
              }
              s[i] = +s[i].toFixed(d);
            });
            return;
        }
      });
      return this;
    };
    SvgPath.prototype.iterate = function(iterator, keepLazyStack) {
      var segments = this.segments, replacements = {}, needReplace = false, lastX = 0, lastY = 0, countourStartX = 0, countourStartY = 0;
      var i, j, newSegments;
      if (!keepLazyStack) {
        this.__evaluateStack();
      }
      segments.forEach(function(s, index) {
        var res = iterator(s, index, lastX, lastY);
        if (Array.isArray(res)) {
          replacements[index] = res;
          needReplace = true;
        }
        var isRelative = s[0] === s[0].toLowerCase();
        switch (s[0]) {
          case "m":
          case "M":
            lastX = s[1] + (isRelative ? lastX : 0);
            lastY = s[2] + (isRelative ? lastY : 0);
            countourStartX = lastX;
            countourStartY = lastY;
            return;
          case "h":
          case "H":
            lastX = s[1] + (isRelative ? lastX : 0);
            return;
          case "v":
          case "V":
            lastY = s[1] + (isRelative ? lastY : 0);
            return;
          case "z":
          case "Z":
            lastX = countourStartX;
            lastY = countourStartY;
            return;
          default:
            lastX = s[s.length - 2] + (isRelative ? lastX : 0);
            lastY = s[s.length - 1] + (isRelative ? lastY : 0);
        }
      });
      if (!needReplace) {
        return this;
      }
      newSegments = [];
      for (i = 0; i < segments.length; i++) {
        if (typeof replacements[i] !== "undefined") {
          for (j = 0; j < replacements[i].length; j++) {
            newSegments.push(replacements[i][j]);
          }
        } else {
          newSegments.push(segments[i]);
        }
      }
      this.segments = newSegments;
      return this;
    };
    SvgPath.prototype.abs = function() {
      this.iterate(function(s, index, x, y) {
        var name = s[0], nameUC = name.toUpperCase(), i;
        if (name === nameUC) {
          return;
        }
        s[0] = nameUC;
        switch (name) {
          case "v":
            s[1] += y;
            return;
          case "a":
            s[6] += x;
            s[7] += y;
            return;
          default:
            for (i = 1; i < s.length; i++) {
              s[i] += i % 2 ? x : y;
            }
        }
      }, true);
      return this;
    };
    SvgPath.prototype.rel = function() {
      this.iterate(function(s, index, x, y) {
        var name = s[0], nameLC = name.toLowerCase(), i;
        if (name === nameLC) {
          return;
        }
        if (index === 0 && name === "M") {
          return;
        }
        s[0] = nameLC;
        switch (name) {
          case "V":
            s[1] -= y;
            return;
          case "A":
            s[6] -= x;
            s[7] -= y;
            return;
          default:
            for (i = 1; i < s.length; i++) {
              s[i] -= i % 2 ? x : y;
            }
        }
      }, true);
      return this;
    };
    SvgPath.prototype.unarc = function() {
      this.iterate(function(s, index, x, y) {
        var new_segments, nextX, nextY, result = [], name = s[0];
        if (name !== "A" && name !== "a") {
          return null;
        }
        if (name === "a") {
          nextX = x + s[6];
          nextY = y + s[7];
        } else {
          nextX = s[6];
          nextY = s[7];
        }
        new_segments = a2c(x, y, nextX, nextY, s[4], s[5], s[1], s[2], s[3]);
        if (new_segments.length === 0) {
          return [[s[0] === "a" ? "l" : "L", s[6], s[7]]];
        }
        new_segments.forEach(function(s2) {
          result.push(["C", s2[2], s2[3], s2[4], s2[5], s2[6], s2[7]]);
        });
        return result;
      });
      return this;
    };
    SvgPath.prototype.unshort = function() {
      var segments = this.segments;
      var prevControlX, prevControlY, prevSegment;
      var curControlX, curControlY;
      this.iterate(function(s, idx, x, y) {
        var name = s[0], nameUC = name.toUpperCase(), isRelative;
        if (!idx) {
          return;
        }
        if (nameUC === "T") {
          isRelative = name === "t";
          prevSegment = segments[idx - 1];
          if (prevSegment[0] === "Q") {
            prevControlX = prevSegment[1] - x;
            prevControlY = prevSegment[2] - y;
          } else if (prevSegment[0] === "q") {
            prevControlX = prevSegment[1] - prevSegment[3];
            prevControlY = prevSegment[2] - prevSegment[4];
          } else {
            prevControlX = 0;
            prevControlY = 0;
          }
          curControlX = -prevControlX;
          curControlY = -prevControlY;
          if (!isRelative) {
            curControlX += x;
            curControlY += y;
          }
          segments[idx] = [
            isRelative ? "q" : "Q",
            curControlX,
            curControlY,
            s[1],
            s[2]
          ];
        } else if (nameUC === "S") {
          isRelative = name === "s";
          prevSegment = segments[idx - 1];
          if (prevSegment[0] === "C") {
            prevControlX = prevSegment[3] - x;
            prevControlY = prevSegment[4] - y;
          } else if (prevSegment[0] === "c") {
            prevControlX = prevSegment[3] - prevSegment[5];
            prevControlY = prevSegment[4] - prevSegment[6];
          } else {
            prevControlX = 0;
            prevControlY = 0;
          }
          curControlX = -prevControlX;
          curControlY = -prevControlY;
          if (!isRelative) {
            curControlX += x;
            curControlY += y;
          }
          segments[idx] = [
            isRelative ? "c" : "C",
            curControlX,
            curControlY,
            s[1],
            s[2],
            s[3],
            s[4]
          ];
        }
      });
      return this;
    };
    module2.exports = SvgPath;
  }
});

// node_modules/.pnpm/svgpath@2.6.0/node_modules/svgpath/index.js
var require_svgpath2 = __commonJS({
  "node_modules/.pnpm/svgpath@2.6.0/node_modules/svgpath/index.js"(exports2, module2) {
    "use strict";
    module2.exports = require_svgpath();
  }
});

// node_modules/.pnpm/svg-parser@2.1.0/node_modules/svg-parser/dist/svg-parser.umd.js
var require_svg_parser_umd = __commonJS({
  "node_modules/.pnpm/svg-parser@2.1.0/node_modules/svg-parser/dist/svg-parser.umd.js"(exports2, module2) {
    "use strict";
    (function(global, factory) {
      typeof exports2 === "object" && typeof module2 !== "undefined" ? factory(exports2) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.svgParser = {}));
    })(exports2, function(exports3) {
      Object.defineProperty(exports3, Symbol.toStringTag, { value: "Module" });
      function getLocator(source, options) {
        if (options === void 0) options = {};
        var offsetLine = options.offsetLine || 0;
        var offsetColumn = options.offsetColumn || 0;
        var originalLines = source.split("\n");
        var start = 0;
        var lineRanges = originalLines.map(function(line, i2) {
          var end = start + line.length + 1;
          var range = {
            start,
            end,
            line: i2
          };
          start = end;
          return range;
        });
        var i = 0;
        function rangeContains(range, index) {
          return range.start <= index && index < range.end;
        }
        function getLocation(range, index) {
          return {
            line: offsetLine + range.line,
            column: offsetColumn + index - range.start,
            character: index
          };
        }
        function locate2(search, startIndex) {
          if (typeof search === "string") search = source.indexOf(search, startIndex || 0);
          var range = lineRanges[i];
          var d = search >= range.end ? 1 : -1;
          while (range) {
            if (rangeContains(range, search)) return getLocation(range, search);
            i += d;
            range = lineRanges[i];
          }
        }
        return locate2;
      }
      function locate(source, search, options) {
        if (typeof options === "number") throw new Error("locate takes a { startIndex, offsetLine, offsetColumn } object as the third argument");
        return getLocator(source, options)(search, options && options.startIndex);
      }
      const validNameCharacters = /[a-zA-Z0-9:_-]/;
      const whitespace = /[\s\t\r\n]/;
      const quotemark = /['"]/;
      const MAX_SNIPPET_WIDTH = 80;
      const SNIPPET_CONTEXT_LINES = 1;
      function repeat(str, i) {
        let result = "";
        while (i--) result += str;
        return result;
      }
      function cropLine(line, column) {
        const expandedLine = line.replace(/\t/g, "  ");
        const expandedColumn = line.slice(0, column).replace(/\t/g, "  ").length;
        if (expandedLine.length <= MAX_SNIPPET_WIDTH && expandedColumn < MAX_SNIPPET_WIDTH) return {
          line: expandedLine,
          column: expandedColumn
        };
        const contentWidth = 78;
        const start = Math.max(0, Math.min(expandedColumn - Math.floor(contentWidth / 2), expandedLine.length - contentWidth));
        const end = start + contentWidth;
        const prefix = start > 0 ? "\u2026" : "";
        const suffix = end < expandedLine.length ? "\u2026" : "";
        return {
          line: `${prefix}${expandedLine.slice(start, end)}${suffix}`,
          column: prefix.length + expandedColumn - start
        };
      }
      function getSnippet(source, line, column) {
        const lines = source.split("\n");
        const firstLine = Math.max(0, line - SNIPPET_CONTEXT_LINES);
        const lastLine = Math.min(lines.length - 1, line + SNIPPET_CONTEXT_LINES);
        const snippet = [];
        if (firstLine > 0) snippet.push("\u2026");
        for (let lineIndex = firstLine; lineIndex <= lastLine; lineIndex += 1) {
          const cropped = cropLine(lines[lineIndex].replace(/\r$/, ""), lineIndex === line ? column : 0);
          snippet.push(cropped.line);
          if (lineIndex === line) snippet.push(`${repeat(" ", cropped.column)}^`);
        }
        if (lastLine < lines.length - 1) snippet.push("\u2026");
        return snippet.join("\n");
      }
      function parse3(source) {
        if (!/\S/.test(source)) throw new Error("SVG input is empty");
        let header = "";
        let stack = [];
        let state = metadata;
        let currentElement = null;
        let root = null;
        function error(message) {
          const { line, column } = locate(source, i);
          const snippet = getSnippet(source, line, column);
          throw Object.assign(/* @__PURE__ */ new Error(`${message} (${line}:${column})

${snippet}`), {
            line,
            column,
            snippet
          });
        }
        function metadata() {
          while (i < source.length && source[i] !== "<" || !validNameCharacters.test(source[i + 1])) header += source[i++];
          return neutral();
        }
        function neutral() {
          let text = "";
          while (i < source.length && source[i] !== "<") text += source[i++];
          if (/\S/.test(text)) currentElement.children.push({
            type: "text",
            value: text
          });
          if (source[i] === "<") return tag;
          return neutral;
        }
        function tag() {
          const char = source[i];
          if (char === "?") return neutral;
          if (char === "!") {
            if (source.slice(i + 1, i + 3) === "--") return comment;
            if (source.slice(i + 1, i + 8) === "[CDATA[") return cdata;
            if (/doctype/i.test(source.slice(i + 1, i + 8))) return neutral;
          }
          if (char === "/") return closingTag;
          const element = {
            type: "element",
            tagName: getName(),
            properties: {},
            children: []
          };
          if (currentElement) currentElement.children.push(element);
          else root = element;
          let attribute;
          while (i < source.length && (attribute = getAttribute())) element.properties[attribute.name] = attribute.value;
          let selfClosing = false;
          if (source[i] === "/") {
            i += 1;
            selfClosing = true;
          }
          if (source[i] !== ">") error("Expected >");
          if (!selfClosing) {
            currentElement = element;
            stack.push(element);
          }
          return neutral;
        }
        function comment() {
          const index = source.indexOf("-->", i);
          if (!~index) error("expected -->");
          i = index + 2;
          return neutral;
        }
        function cdata() {
          const index = source.indexOf("]]>", i);
          if (!~index) error("expected ]]>");
          currentElement.children.push(source.slice(i + 7, index));
          i = index + 2;
          return neutral;
        }
        function closingTag() {
          const tagName = getName();
          if (!tagName) error("Expected tag name");
          if (tagName !== currentElement.tagName) error(`Expected closing tag </${tagName}> to match opening tag <${currentElement.tagName}>`);
          allowSpaces();
          if (source[i] !== ">") error("Expected >");
          stack.pop();
          currentElement = stack[stack.length - 1];
          return neutral;
        }
        function getName() {
          let name = "";
          while (i < source.length && validNameCharacters.test(source[i])) name += source[i++];
          return name;
        }
        function getAttribute() {
          if (!whitespace.test(source[i])) return null;
          allowSpaces();
          const name = getName();
          if (!name) return null;
          let value = true;
          allowSpaces();
          if (source[i] === "=") {
            i += 1;
            allowSpaces();
            value = getAttributeValue();
            if (!isNaN(value) && value.trim() !== "") value = +value;
          }
          return {
            name,
            value
          };
        }
        function getAttributeValue() {
          return quotemark.test(source[i]) ? getQuotedAttributeValue() : getUnquotedAttributeValue();
        }
        function getUnquotedAttributeValue() {
          let value = "";
          do {
            const char = source[i];
            if (char === " " || char === ">" || char === "/") return value;
            value += char;
            i += 1;
          } while (i < source.length);
          return value;
        }
        function getQuotedAttributeValue() {
          const quotemark2 = source[i++];
          let value = "";
          let escaped = false;
          while (i < source.length) {
            const char = source[i++];
            if (char === quotemark2 && !escaped) return value;
            if (char === "\\" && !escaped) escaped = true;
            value += escaped ? `\\${char}` : char;
            escaped = false;
          }
        }
        function allowSpaces() {
          while (i < source.length && whitespace.test(source[i])) i += 1;
        }
        let i = metadata.length;
        while (i < source.length) {
          if (!state) error("Unexpected character");
          state = state();
          i += 1;
        }
        if (state !== neutral) error("Unexpected end of input");
        if (root.tagName === "svg") root.metadata = header;
        return {
          type: "root",
          children: [root]
        };
      }
      exports3.parse = parse3;
    });
  }
});

// lib/bordado/nucleo-cli.ts
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");

// packages/bordado/src/canonical.ts
function normalizarNumero(value) {
  if (!Number.isFinite(value))
    throw new TypeError("El dise\xF1o contiene un n\xFAmero inv\xE1lido");
  return Object.is(value, -0) ? 0 : value;
}
function canonicalJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") return JSON.stringify(normalizarNumero(value));
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value).filter(([, item]) => item !== void 0).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  }
  throw new TypeError("El dise\xF1o contiene un valor no serializable");
}

// packages/bordado/src/correspondencia.ts
var PASO = 0.2;
var MAX_MUESTRAS = 400;
var TOLERANCIA = 0.1;
var SEPARACION_MAXIMA = 2;
var COBERTURA_EJE = 0.8;
var EXTENSION_RUNG_MM = 0.12;
var dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
var lerp = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t
];
function acumulado(p) {
  const s = [0];
  for (let i = 1; i < p.length; i++) s.push(s[i - 1] + dist(p[i - 1], p[i]));
  return s;
}
function enArco(p, s, x) {
  if (x <= 0) return p[0];
  for (let i = 1; i < p.length; i++)
    if (s[i] >= x) {
      const l = s[i] - s[i - 1];
      return lerp(p[i - 1], p[i], l > 0 ? (x - s[i - 1]) / l : 0);
    }
  return p[p.length - 1];
}
function proyectar(p, s, q) {
  let mejor = { s: 0, d: Number.POSITIVE_INFINITY };
  for (let i = 1; i < p.length; i++) {
    const [ax, ay] = p[i - 1];
    const dx = p[i][0] - ax;
    const dy = p[i][1] - ay;
    const l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((q[0] - ax) * dx + (q[1] - ay) * dy) / l2));
    const d = Math.hypot(q[0] - (ax + dx * t), q[1] - (ay + dy * t));
    if (d < mejor.d) mejor = { s: s[i - 1] + t * Math.sqrt(l2), d };
  }
  return mejor;
}
function remuestrear(rail, paso, max) {
  const s = acumulado(rail);
  const largo = s[s.length - 1];
  const n2 = Math.max(1, Math.min(max - 1, Math.ceil(largo / paso - 1e-6)));
  const p = [];
  for (let k = 0; k <= n2; k++) p.push(enArco(rail, s, largo * k / n2));
  const t = p.map((_, k) => {
    const a = p[Math.max(0, k - 1)];
    const b = p[Math.min(n2, k + 1)];
    const l = dist(a, b);
    return l > 0 ? [(b[0] - a[0]) / l, (b[1] - a[1]) / l] : [1, 0];
  });
  return { p, s: p.map((_, k) => largo * k / n2), t, largo, paso: largo / n2 };
}
function percentil(v2, q) {
  if (!v2.length) return 0;
  const o = [...v2].sort((x, y) => x - y);
  return o[Math.min(o.length - 1, Math.floor(q * (o.length - 1) + 1e-9))];
}
var redondear = (v2, d = 3) => Math.round(v2 * 10 ** d) / 10 ** d;
function oblicuidad(a, b, ta, tb) {
  const l = dist(a, b);
  if (l < 1e-9) return 0;
  const u4 = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  let bx = ta[0] + tb[0];
  let by = ta[1] + tb[1];
  const lb = Math.hypot(bx, by);
  if (lb < 1e-9) {
    bx = ta[0];
    by = ta[1];
  } else {
    bx /= lb;
    by /= lb;
  }
  const coseno = Math.abs(u4[0] * bx + u4[1] * by);
  return Math.asin(Math.min(1, coseno)) * 180 / Math.PI;
}
function direccion(a, b) {
  return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI % 180 + 180) % 180;
}
function guiaDelEje(A, B3, eje, cobertura) {
  let anchoMax = 0;
  for (const p of A.p) {
    let m = Number.POSITIVE_INFINITY;
    for (const q of B3.p) m = Math.min(m, dist(p, q));
    anchoMax = Math.max(anchoMax, m);
  }
  anchoMax = anchoMax * 2 + 1;
  const pares = [];
  for (const linea of eje) {
    for (let k = 1; k < linea.length; k++) {
      const p = linea[k - 1];
      const q = linea[k];
      const l = dist(p, q);
      if (l < 1e-9) continue;
      const n2 = [-(q[1] - p[1]) / l, (q[0] - p[0]) / l];
      const pasos = Math.max(1, Math.ceil(l / A.paso));
      for (let e = 0; e < pasos; e++) {
        const m = lerp(p, q, (e + 0.5) / pasos);
        const golpe = (M, signo) => {
          let mejor = null;
          for (let i = 1; i < M.p.length; i++) {
            const a = M.p[i - 1];
            const b = M.p[i];
            const ex = b[0] - a[0];
            const ey = b[1] - a[1];
            const den = signo * n2[0] * ey - signo * n2[1] * ex;
            if (Math.abs(den) < 1e-12) continue;
            const wx = a[0] - m[0];
            const wy = a[1] - m[1];
            const x = (wx * ey - wy * ex) / den;
            const t = (wx * signo * n2[1] - wy * signo * n2[0]) / den;
            if (x > 0 && x < anchoMax && t >= 0 && t <= 1 && (!mejor || x < mejor.x))
              mejor = { s: M.s[i - 1] + t * M.paso, x };
          }
          return mejor;
        };
        for (const signo of [1, -1]) {
          const ga = golpe(A, signo);
          const gb = golpe(B3, -signo);
          if (ga && gb) pares.push({ sA: ga.s, sB: gb.s });
        }
      }
    }
  }
  pares.sort((x, y) => x.sA - y.sA || x.sB - y.sB);
  const monotonos = [];
  for (const q of pares)
    if (!monotonos.length || q.sB >= monotonos[monotonos.length - 1].sB)
      monotonos.push(q);
  if (monotonos.length < 2) return null;
  const sB = A.s.map((sa) => {
    if (sa < monotonos[0].sA || sa > monotonos[monotonos.length - 1].sA)
      return null;
    let k = 1;
    while (k < monotonos.length - 1 && monotonos[k].sA < sa) k++;
    const p = monotonos[k - 1];
    const q = monotonos[k];
    const t = q.sA > p.sA ? (sa - p.sA) / (q.sA - p.sA) : 0;
    return p.sB + (q.sB - p.sB) * t;
  });
  const cubiertas = sB.filter((x) => x !== null).length / sB.length;
  return cubiertas >= cobertura ? { sB, cobertura: cubiertas } : { sB: sB.map(() => null), cobertura: cubiertas };
}
function anclasDeRungs(A, B3, rungs) {
  const anclas = [];
  for (const [p, q] of rungs) {
    const pa = proyectar(A.p, A.s, p);
    const qb = proyectar(B3.p, B3.s, q);
    const qa = proyectar(A.p, A.s, q);
    const pb = proyectar(B3.p, B3.s, p);
    const [sa, sb] = pa.d + qb.d <= qa.d + pb.d ? [pa.s, qb.s] : [qa.s, pb.s];
    anclas.push([Math.round(sa / A.paso), Math.round(sb / B3.paso)]);
  }
  anclas.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const salida2 = [[0, 0]];
  for (const [i, j] of anclas) {
    const [pi, pj] = salida2[salida2.length - 1];
    if (i > pi && j > pj && i < A.p.length - 1 && j < B3.p.length - 1)
      salida2.push([i, j]);
  }
  salida2.push([A.p.length - 1, B3.p.length - 1]);
  return salida2;
}
function caminoOptimo(A, B3, desde, hasta, guia) {
  const [i0, j0] = desde;
  const [i1, j1] = hasta;
  const ni = i1 - i0 + 1;
  const nj = j1 - j0 + 1;
  const coste = new Float64Array(ni * nj);
  for (let i2 = 0; i2 < ni; i2++)
    for (let j2 = 0; j2 < nj; j2++) {
      const a = A.p[i0 + i2];
      const b = B3.p[j0 + j2];
      const d = dist(a, b);
      let c = d * d * (1 + oblicuidad(a, b, A.t[i0 + i2], B3.t[j0 + j2]) / 90);
      const g = guia?.[i0 + i2];
      if (g !== null && g !== void 0) c += (B3.s[j0 + j2] - g) ** 2;
      coste[i2 * nj + j2] = c;
    }
  const hi = A.paso;
  const hj = B3.paso;
  const hd = Math.hypot(hi, hj);
  const total = new Float64Array(ni * nj).fill(Number.POSITIVE_INFINITY);
  const previo = new Int8Array(ni * nj).fill(-1);
  total[0] = 0;
  for (let i2 = 0; i2 < ni; i2++)
    for (let j2 = 0; j2 < nj; j2++) {
      if (i2 === 0 && j2 === 0) continue;
      const k = i2 * nj + j2;
      const c = coste[k];
      let mejor = Number.POSITIVE_INFINITY;
      let de2 = -1;
      if (i2 > 0 && j2 > 0) {
        const v2 = total[k - nj - 1] + (coste[k - nj - 1] + c) / 2 * hd;
        if (v2 < mejor) [mejor, de2] = [v2, 2];
      }
      if (i2 > 0) {
        const v2 = total[k - nj] + (coste[k - nj] + c) / 2 * hi;
        if (v2 < mejor - 1e-12) [mejor, de2] = [v2, 0];
      }
      if (j2 > 0) {
        const v2 = total[k - 1] + (coste[k - 1] + c) / 2 * hj;
        if (v2 < mejor - 1e-12) [mejor, de2] = [v2, 1];
      }
      total[k] = mejor;
      previo[k] = de2;
    }
  const camino = [];
  let i = ni - 1;
  let j = nj - 1;
  while (i > 0 || j > 0) {
    camino.push([i0 + i, j0 + j]);
    const de2 = previo[i * nj + j];
    if (de2 === 2) {
      i--;
      j--;
    } else if (de2 === 0) i--;
    else j--;
  }
  camino.push([i0, j0]);
  return camino.reverse();
}
function cortesDeCamino(puntos, obligatorios, tolerancia, separacion) {
  const guardar = new Array(puntos.length).fill(false);
  guardar[0] = guardar[puntos.length - 1] = true;
  for (const k of obligatorios) guardar[k] = true;
  const tramos = [];
  let a = 0;
  for (let k = 1; k < puntos.length; k++)
    if (guardar[k]) {
      tramos.push([a, k]);
      a = k;
    }
  while (tramos.length) {
    const [i, j] = tramos.pop();
    const p = puntos[i];
    const q = puntos[j];
    const dx = q.sA - p.sA;
    const dy = q.sB - p.sB;
    const l = Math.hypot(dx, dy);
    let peor = -1;
    let kPeor = -1;
    for (let k = i + 1; k < j; k++) {
      const d = l > 0 ? Math.abs((puntos[k].sA - p.sA) * dy - (puntos[k].sB - p.sB) * dx) / l : Math.hypot(puntos[k].sA - p.sA, puntos[k].sB - p.sB);
      if (d > peor) [peor, kPeor] = [d, k];
    }
    if (peor > tolerancia) {
      guardar[kPeor] = true;
      tramos.push([i, kPeor], [kPeor, j]);
    }
  }
  const salida2 = [];
  for (let k = 0; k < puntos.length; k++) {
    if (!guardar[k]) continue;
    if (salida2.length) {
      const ultimo = salida2[salida2.length - 1];
      const avance = Math.max(
        puntos[k].sA - puntos[ultimo].sA,
        puntos[k].sB - puntos[ultimo].sB
      );
      const extra = Math.floor(avance / separacion);
      const u4 = (m) => puntos[m].sA + puntos[m].sB;
      for (let e = 1; e <= extra; e++) {
        const objetivo = u4(ultimo) + (u4(k) - u4(ultimo)) * e / (extra + 1);
        let mejor = ultimo + 1;
        for (let m = ultimo + 1; m < k; m++)
          if (Math.abs(u4(m) - objetivo) < Math.abs(u4(mejor) - objetivo))
            mejor = m;
        if (mejor > salida2[salida2.length - 1] && mejor < k) salida2.push(mejor);
      }
    }
    salida2.push(k);
  }
  return salida2;
}
function metricas(secciones, eje) {
  const anchos = secciones.map((s) => s.anchoMm);
  const obl = secciones.filter((s) => s.anchoMm > 0.05).map((s) => s.oblicuidadGrados);
  const muestra = [];
  for (const s of secciones) {
    const u4 = muestra[muestra.length - 1];
    if (!u4 || Math.max(s.sA - u4.sA, s.sB - u4.sB) >= 0.5) muestra.push(s);
  }
  const deltas = [];
  for (let k = 1; k < muestra.length; k++) {
    if (muestra[k].anchoMm < 0.05 || muestra[k - 1].anchoMm < 0.05) continue;
    const d = Math.abs(muestra[k].direccionGrados - muestra[k - 1].direccionGrados) % 180;
    deltas.push(Math.min(d, 180 - d));
  }
  let cruces = 0;
  const cruza = (p, q) => {
    const o = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    return o(p.a, p.b, q.a) * o(p.a, p.b, q.b) < -1e-12 && o(q.a, q.b, p.a) * o(q.a, q.b, p.b) < -1e-12;
  };
  for (let i = 0; i < muestra.length; i++)
    for (let j = i + 2; j < muestra.length; j++)
      if (cruza(muestra[i], muestra[j])) cruces++;
  let monotona = true;
  for (let k = 1; k < secciones.length; k++)
    if (secciones[k].sA < secciones[k - 1].sA - 1e-9 || secciones[k].sB < secciones[k - 1].sB - 1e-9)
      monotona = false;
  let anguloEje = null;
  if (eje?.length) {
    const tramos = eje.flatMap(
      (l) => l.slice(1).map((q, k) => [l[k], q])
    );
    const angulos = muestra.filter((s) => s.anchoMm > 0.05).map((s) => {
      const m = lerp(s.a, s.b, 0.5);
      let mejor = null;
      let dm = Number.POSITIVE_INFINITY;
      for (const t of tramos) {
        const d = proyectar([t[0], t[1]], [0, dist(t[0], t[1])], m).d;
        if (d < dm) [dm, mejor] = [d, t];
      }
      if (!mejor) return 0;
      const l = dist(mejor[0], mejor[1]);
      const tx = (mejor[1][0] - mejor[0][0]) / l;
      const ty = (mejor[1][1] - mejor[0][1]) / l;
      const c = Math.abs(
        ((s.b[0] - s.a[0]) * tx + (s.b[1] - s.a[1]) * ty) / s.anchoMm
      );
      return Math.asin(Math.min(1, c)) * 180 / Math.PI;
    });
    anguloEje = redondear(percentil(angulos, 0.95), 2);
  }
  return {
    maxAnchoMm: redondear(Math.max(0, ...anchos)),
    p95AnchoMm: redondear(percentil(anchos, 0.95)),
    oblicuidadP50: redondear(percentil(obl, 0.5), 2),
    oblicuidadP95: redondear(percentil(obl, 0.95), 2),
    deltaAnguloP95: redondear(percentil(deltas, 0.95), 2),
    deltaAnguloMax: redondear(Math.max(0, ...deltas), 2),
    cruces,
    monotona,
    anguloEjeP95: anguloEje
  };
}
function seccionesDe(A, B3, camino) {
  return camino.map(([i, j]) => ({
    sA: A.s[i],
    sB: B3.s[j],
    a: A.p[i],
    b: B3.p[j],
    anchoMm: dist(A.p[i], B3.p[j]),
    direccionGrados: direccion(A.p[i], B3.p[j]),
    oblicuidadGrados: oblicuidad(A.p[i], B3.p[j], A.t[i], B3.t[j])
  }));
}
function correspondenciaSatin(railA, railB, rungs = [], opciones = {}) {
  const paso = opciones.pasoMm ?? PASO;
  const max = opciones.maxMuestras ?? MAX_MUESTRAS;
  const A = remuestrear(railA, paso, max);
  const B3 = remuestrear(railB, paso, max);
  const anclas = anclasDeRungs(A, B3, rungs);
  const guia = opciones.eje?.length ? guiaDelEje(
    A,
    B3,
    opciones.eje,
    opciones.coberturaEjeMinima ?? COBERTURA_EJE
  ) : null;
  const usaEje = !!guia && guia.sB.some((x) => x !== null);
  const camino = [];
  const obligatorios = /* @__PURE__ */ new Set();
  for (let k = 1; k < anclas.length; k++) {
    const tramo = caminoOptimo(
      A,
      B3,
      anclas[k - 1],
      anclas[k],
      usaEje ? guia.sB : null
    );
    camino.push(...camino.length ? tramo.slice(1) : tramo);
    obligatorios.add(camino.length - 1);
  }
  obligatorios.delete(camino.length - 1);
  const secciones = seccionesDe(A, B3, camino);
  const indices2 = cortesDeCamino(
    secciones,
    obligatorios,
    opciones.toleranciaMm ?? TOLERANCIA,
    opciones.separacionMaximaRungsMm ?? SEPARACION_MAXIMA
  );
  return {
    metodo: "dp-seccion-local",
    secciones,
    anclas: {
      rungs: rungs.length,
      rungsUsados: anclas.length - 2,
      eje: usaEje,
      coberturaEje: guia ? redondear(guia.cobertura) : null
    },
    cortes: indices2.slice(1, -1).map((k) => ({ sA: secciones[k].sA, sB: secciones[k].sB })),
    metricas: metricas(secciones, opciones.eje)
  };
}
function desvioEntre(a, b, ventanaMm = 0.25) {
  if (!a.secciones.length || !b.secciones.length) return 0;
  let peor = 0;
  let inicio = 0;
  for (const s of a.secciones) {
    while (inicio < b.secciones.length - 1 && b.secciones[inicio].sA < s.sA - ventanaMm)
      inicio++;
    let mejor = Number.POSITIVE_INFINITY;
    for (let m = inicio; m < b.secciones.length && b.secciones[m].sA <= s.sA + ventanaMm; m++)
      mejor = Math.min(mejor, Math.abs(b.secciones[m].sB - s.sB));
    if (Number.isFinite(mejor)) peor = Math.max(peor, mejor);
  }
  return redondear(peor);
}
function correspondenciaProporcional(railA, railB, rungs = [], opciones = {}) {
  const paso = opciones.pasoMm ?? PASO;
  const max = opciones.maxMuestras ?? MAX_MUESTRAS;
  const A = remuestrear(railA, paso, max);
  const B3 = remuestrear(railB, paso, max);
  const anclas = anclasDeRungs(A, B3, rungs);
  const camino = [];
  for (let k = 1; k < anclas.length; k++) {
    const [i0, j0] = anclas[k - 1];
    const [i1, j1] = anclas[k];
    const n2 = Math.max(i1 - i0, j1 - j0);
    for (let m = camino.length ? 1 : 0; m <= n2; m++)
      camino.push([
        Math.round(i0 + (i1 - i0) * m / n2),
        Math.round(j0 + (j1 - j0) * m / n2)
      ]);
  }
  const secciones = seccionesDe(A, B3, camino);
  return {
    metodo: "proporcional-por-tramos",
    secciones,
    anclas: {
      rungs: rungs.length,
      rungsUsados: anclas.length - 2,
      eje: false,
      coberturaEje: null
    },
    cortes: [],
    metricas: metricas(secciones, opciones.eje)
  };
}
function rung(a, b) {
  const l = dist(a, b);
  if (l < 0.05) return null;
  const u4 = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  return [
    [a[0] - u4[0] * EXTENSION_RUNG_MM, a[1] - u4[1] * EXTENSION_RUNG_MM],
    [b[0] + u4[0] * EXTENSION_RUNG_MM, b[1] + u4[1] * EXTENSION_RUNG_MM]
  ];
}
function simplificar(p, tolerancia = 0.01) {
  const sin = p.filter((q, k) => k === 0 || dist(q, p[k - 1]) > 1e-9);
  if (sin.length < 3) return sin;
  const guardar = new Array(sin.length).fill(false);
  guardar[0] = guardar[sin.length - 1] = true;
  const pila = [[0, sin.length - 1]];
  while (pila.length) {
    const [i, j] = pila.pop();
    let peor = -1;
    let kp = -1;
    for (let k = i + 1; k < j; k++) {
      const d = proyectar(
        [sin[i], sin[j]],
        [0, dist(sin[i], sin[j])],
        sin[k]
      ).d;
      if (d > peor) [peor, kp] = [d, k];
    }
    if (peor > tolerancia) {
      guardar[kp] = true;
      pila.push([i, kp], [kp, j]);
    }
  }
  return sin.filter((_, k) => guardar[k]);
}
function satinDesdeCorrespondencia(c, railA, railB, columnas2 = 1) {
  const n2 = Math.max(1, Math.floor(columnas2));
  const sA = acumulado(railA);
  const sB = acumulado(railB);
  const en = (t) => (s) => lerp(s.a, s.b, t);
  const salida2 = [];
  for (let k = 0; k < n2; k++) {
    const t0 = k / n2;
    const t1 = (k + 1) / n2;
    const ra = k === 0 ? [...railA] : simplificar(c.secciones.map(en(t0)));
    const rb = k === n2 - 1 ? [...railB] : simplificar(c.secciones.map(en(t1)));
    const rungs = [];
    for (const corte of c.cortes) {
      const a = enArco(railA, sA, corte.sA);
      const b = enArco(railB, sB, corte.sB);
      const r = rung(lerp(a, b, t0), lerp(a, b, t1));
      if (r) rungs.push([r[0], r[1]]);
    }
    salida2.push([ra, rb, ...rungs]);
  }
  return salida2;
}

// packages/bordado/src/geometria.ts
var VECINOS_8 = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1]
];
function componentes(rejilla) {
  const { datos, ancho, alto } = rejilla;
  const visto = new Uint8Array(ancho * alto);
  const salida2 = [];
  const cola = new Int32Array(ancho * alto);
  for (let inicio = 0; inicio < datos.length; inicio++) {
    if (!datos[inicio] || visto[inicio]) continue;
    let cabeza = 0;
    let fin5 = 0;
    cola[fin5++] = inicio;
    visto[inicio] = 1;
    let minX = ancho;
    let minY = alto;
    let maxX = -1;
    let maxY = -1;
    const pixeles = [];
    while (cabeza < fin5) {
      const p = cola[cabeza++];
      const x = p % ancho;
      const y = p / ancho | 0;
      pixeles.push(p);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      for (const [dx, dy] of VECINOS_8) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= ancho || ny >= alto) continue;
        const q = ny * ancho + nx;
        if (datos[q] && !visto[q]) {
          visto[q] = 1;
          cola[fin5++] = q;
        }
      }
    }
    salida2.push({ pixeles: Int32Array.from(pixeles), minX, minY, maxX, maxY });
  }
  return salida2;
}
function distanciaAlFondo(rejilla) {
  const { datos, ancho, alto } = rejilla;
  const d = new Float32Array(ancho * alto);
  const GRANDE = 1e9;
  for (let i = 0; i < datos.length; i++) d[i] = datos[i] ? GRANDE : 0;
  const mira = (i, j, coste) => {
    const v2 = d[j] + coste;
    if (v2 < d[i]) d[i] = v2;
  };
  const fuera = (i, coste) => {
    if (coste < d[i]) d[i] = coste;
  };
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const i = y * ancho + x;
      if (!d[i]) continue;
      if (x > 0) mira(i, i - 1, 3);
      else fuera(i, 3);
      if (y > 0) mira(i, i - ancho, 3);
      else fuera(i, 3);
      if (x > 0 && y > 0) mira(i, i - ancho - 1, 4);
      else fuera(i, 4);
      if (x < ancho - 1 && y > 0) mira(i, i - ancho + 1, 4);
      else fuera(i, 4);
    }
  }
  for (let y = alto - 1; y >= 0; y--) {
    for (let x = ancho - 1; x >= 0; x--) {
      const i = y * ancho + x;
      if (!d[i]) continue;
      if (x < ancho - 1) mira(i, i + 1, 3);
      else fuera(i, 3);
      if (y < alto - 1) mira(i, i + ancho, 3);
      else fuera(i, 3);
      if (x < ancho - 1 && y < alto - 1) mira(i, i + ancho + 1, 4);
      else fuera(i, 4);
      if (x > 0 && y < alto - 1) mira(i, i + ancho - 1, 4);
      else fuera(i, 4);
    }
  }
  for (let i = 0; i < d.length; i++) d[i] /= 3;
  return d;
}
function crestaDeDistancia(rejilla, componente, distancia4) {
  const { ancho } = rejilla;
  const cresta = [];
  for (const p of componente.pixeles) {
    const dp = distancia4[p];
    if (dp <= 0) continue;
    const x = p % ancho;
    const y = p / ancho | 0;
    let esMaximo = true;
    for (const [dx, dy] of VECINOS_8) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= rejilla.ancho || ny >= rejilla.alto)
        continue;
      if (distancia4[ny * ancho + nx] > dp + 1e-6) {
        esMaximo = false;
        break;
      }
    }
    if (esMaximo) cresta.push(p);
  }
  return cresta;
}
function huecosLocales(rejilla, componente) {
  const ancho = componente.maxX - componente.minX + 3;
  const alto = componente.maxY - componente.minY + 3;
  const offsetX = componente.minX - 1;
  const offsetY = componente.minY - 1;
  const dentro2 = new Uint8Array(ancho * alto);
  for (const p of componente.pixeles) {
    const x = p % rejilla.ancho - offsetX;
    const y = (p / rejilla.ancho | 0) - offsetY;
    dentro2[y * ancho + x] = 1;
  }
  const fuera = new Uint8Array(ancho * alto);
  const cola = [];
  for (let x = 0; x < ancho; x++) cola.push(x, (alto - 1) * ancho + x);
  for (let y = 0; y < alto; y++) cola.push(y * ancho, y * ancho + ancho - 1);
  while (cola.length) {
    const i = cola.pop();
    if (fuera[i] || dentro2[i]) continue;
    fuera[i] = 1;
    const x = i % ancho;
    const y = i / ancho | 0;
    if (x > 0) cola.push(i - 1);
    if (x < ancho - 1) cola.push(i + 1);
    if (y > 0) cola.push(i - ancho);
    if (y < alto - 1) cola.push(i + ancho);
  }
  const salida2 = [];
  const visto = new Uint8Array(ancho * alto);
  for (let inicio = 0; inicio < dentro2.length; inicio++) {
    if (dentro2[inicio] || fuera[inicio] || visto[inicio]) continue;
    const pixeles = [];
    const pila = [inicio];
    visto[inicio] = 1;
    while (pila.length) {
      const i = pila.pop();
      pixeles.push(i);
      const x = i % ancho;
      const y = i / ancho | 0;
      for (const [dx, dy] of VECINOS_8) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= ancho || ny >= alto) continue;
        const j = ny * ancho + nx;
        if (!dentro2[j] && !fuera[j] && !visto[j]) {
          visto[j] = 1;
          pila.push(j);
        }
      }
    }
    const mascara = new Uint8Array(ancho * alto);
    for (const i of pixeles) mascara[i] = 1;
    salida2.push({
      mascara,
      pixeles: Int32Array.from(pixeles),
      ancho,
      alto,
      offsetX,
      offsetY
    });
  }
  return salida2;
}
function huecosDe(rejilla, componente) {
  const area2 = rejilla.mmPorPx * rejilla.mmPorPx;
  return huecosLocales(rejilla, componente).map((hueco2) => hueco2.pixeles.length * area2).sort((a, b) => b - a);
}
function percentil2(ordenados, p) {
  if (!ordenados.length) return 0;
  const i = Math.min(
    ordenados.length - 1,
    Math.max(0, Math.round((ordenados.length - 1) * p))
  );
  return ordenados[i];
}
function medir(rejilla, componente, distancia4) {
  const mm = rejilla.mmPorPx;
  const cresta = crestaDeDistancia(rejilla, componente, distancia4);
  const grosores = (cresta.length ? cresta : Array.from(componente.pixeles)).map((p) => distancia4[p] * 2 * mm).sort((a, b) => a - b);
  const mediano = percentil2(grosores, 0.5);
  const p10 = percentil2(grosores, 0.1);
  const p90 = percentil2(grosores, 0.9);
  const uniformidad = p90 > 0 ? Math.min(1, p10 / p90) : 0;
  return {
    areaMm2: componente.pixeles.length * mm * mm,
    anchoMm: (componente.maxX - componente.minX + 1) * mm,
    altoMm: (componente.maxY - componente.minY + 1) * mm,
    grosorMedianoMm: mediano,
    grosorMinimoMm: grosores[0] ?? 0,
    grosorMaximoMm: grosores[grosores.length - 1] ?? 0,
    uniformidad,
    // El eje aproximado por su número de píxeles: para decidir "alargado o no"
    // sobra, y no obliga a ordenar la cresta en una polilínea.
    largoEjeMm: cresta.length * mm,
    huecosMm2: huecosDe(rejilla, componente)
  };
}
function trazarBorde(rejilla, componente) {
  const { ancho } = rejilla;
  const anchoLocal = componente.maxX - componente.minX + 1;
  const altoLocal = componente.maxY - componente.minY + 1;
  const suyo = new Uint8Array(anchoLocal * altoLocal);
  for (const p of componente.pixeles) {
    const lx = p % ancho - componente.minX;
    const ly = (p / ancho | 0) - componente.minY;
    if (lx >= 0 && ly >= 0 && lx < anchoLocal && ly < altoLocal)
      suyo[ly * anchoLocal + lx] = 1;
  }
  const dentro2 = (x2, y2) => {
    const lx = x2 - componente.minX;
    const ly = y2 - componente.minY;
    return lx >= 0 && ly >= 0 && lx < anchoLocal && ly < altoLocal && suyo[ly * anchoLocal + lx] === 1;
  };
  let inicio = -1;
  for (const p of componente.pixeles) {
    if (inicio < 0 || p < inicio) inicio = p;
  }
  if (inicio < 0) return [];
  const ix = inicio % ancho;
  const iy = inicio / ancho | 0;
  const orden = [
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1]
  ];
  const puntos = [];
  let x = ix;
  let y = iy;
  let direccion2 = 0;
  const tope = componente.pixeles.length * 8 + 64;
  for (let paso = 0; paso < tope; paso++) {
    puntos.push([x, y]);
    let siguiente = -1;
    for (let k = 0; k < 8; k++) {
      const d = (direccion2 + 6 + k) % 8;
      const nx = x + orden[d][0];
      const ny = y + orden[d][1];
      if (dentro2(nx, ny)) {
        siguiente = d;
        x = nx;
        y = ny;
        break;
      }
    }
    if (siguiente < 0) break;
    direccion2 = siguiente;
    if (x === ix && y === iy) break;
  }
  return puntos;
}
function contorno(rejilla, componente, toleranciaMm) {
  const enMm = trazarBorde(rejilla, componente).map(
    ([px, py]) => [px * rejilla.mmPorPx, py * rejilla.mmPorPx]
  );
  return simplificar2(enMm, toleranciaMm);
}
function contornos(rejilla, componente, toleranciaMm, minHuecoMm2 = 0) {
  const exterior = contorno(rejilla, componente, toleranciaMm);
  const mm = rejilla.mmPorPx;
  const huecos = [];
  for (const hueco2 of huecosLocales(rejilla, componente)) {
    if (hueco2.pixeles.length * mm * mm < minHuecoMm2) continue;
    const sub = {
      datos: hueco2.mascara,
      ancho: hueco2.ancho,
      alto: hueco2.alto,
      mmPorPx: mm
    };
    const trazo = trazarBorde(sub, {
      pixeles: hueco2.pixeles,
      minX: 0,
      minY: 0,
      maxX: hueco2.ancho - 1,
      maxY: hueco2.alto - 1
    }).map(
      ([px, py]) => [(px + hueco2.offsetX) * mm, (py + hueco2.offsetY) * mm]
    );
    const simple = simplificar2(trazo, toleranciaMm);
    if (simple.length >= 3) huecos.push(simple);
  }
  return { exterior, huecos };
}
function simplificar2(puntos, tolerancia) {
  if (puntos.length < 3) return puntos;
  const guardar = new Uint8Array(puntos.length);
  guardar[0] = 1;
  guardar[puntos.length - 1] = 1;
  const pila = [[0, puntos.length - 1]];
  while (pila.length) {
    const [desde, hasta] = pila.pop();
    if (hasta <= desde + 1) continue;
    const [ax, ay] = puntos[desde];
    const [bx, by] = puntos[hasta];
    const dx = bx - ax;
    const dy = by - ay;
    const norma = Math.hypot(dx, dy) || 1;
    let peor = -1;
    let peorD = tolerancia;
    for (let i = desde + 1; i < hasta; i++) {
      const [px, py] = puntos[i];
      const d = Math.abs(dy * px - dx * py + bx * ay - by * ax) / norma;
      if (d > peorD) {
        peorD = d;
        peor = i;
      }
    }
    if (peor > 0) {
      guardar[peor] = 1;
      pila.push([desde, peor], [peor, hasta]);
    }
  }
  return puntos.filter((_, i) => guardar[i] === 1);
}
function comoPath(puntos, cerrado = true) {
  if (!puntos.length) return "";
  const n2 = (v2) => Number(v2.toFixed(3)).toString();
  const cuerpo2 = puntos.map(([x, y], i) => `${i ? "L" : "M"}${n2(x)} ${n2(y)}`).join("");
  return cerrado ? `${cuerpo2}Z` : cuerpo2;
}
function comoPathCompuesto(partes) {
  return [partes.exterior, ...partes.huecos].filter((p) => p.length >= 3).map((p) => comoPath(p, true)).join("");
}
function limpiar(rejilla, pasadas = 1) {
  const { ancho, alto } = rejilla;
  let actual = rejilla.datos;
  for (let vuelta = 0; vuelta < pasadas; vuelta++) {
    const siguiente = new Uint8Array(ancho * alto);
    for (let y = 0; y < alto; y++) {
      for (let x = 0; x < ancho; x++) {
        let vecinos = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= alto) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= ancho) continue;
            vecinos += actual[ny * ancho + nx];
          }
        }
        siguiente[y * ancho + x] = vecinos >= 5 ? 1 : 0;
      }
    }
    actual = siguiente;
  }
  return { ...rejilla, datos: actual };
}

// packages/bordado/src/presupuesto.ts
var COMPLEJIDAD_EXCEDIDA = "COMPLEJIDAD_AUTOMATICA_EXCEDIDA";
var PresupuestoExcedido = class extends Error {
  constructor(recurso, medido, tope) {
    super(`presupuesto agotado en ${recurso}: ${medido} > ${tope}`);
    this.name = "PresupuestoExcedido";
    this.recurso = recurso;
    this.medido = medido;
    this.tope = tope;
  }
};
function esPresupuestoExcedido(error) {
  return error instanceof PresupuestoExcedido;
}
function exigir(recurso, medido, tope) {
  if (medido > tope) throw new PresupuestoExcedido(recurso, medido, tope);
}
function incidenciaDeComplejidad() {
  return {
    code: COMPLEJIDAD_EXCEDIDA,
    message: "Este dise\xF1o es demasiado complejo para prepararlo autom\xE1ticamente. Prueba simplificando algunos detalles o usando una imagen m\xE1s sencilla.",
    severity: "review"
  };
}

// packages/bordado/src/esqueleto.ts
var P = [
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1]
];
function esqueleto(rejilla, caja, coste, maxPasadas = 200) {
  const { ancho, alto } = rejilla;
  const m = Uint8Array.from(rejilla.datos);
  const vecinos = new Uint8Array(8);
  const desdeX = Math.max(0, caja ? caja.minX : 0);
  const hastaX = Math.min(ancho - 1, caja ? caja.maxX : ancho - 1);
  const desdeY = Math.max(0, caja ? caja.minY : 0);
  const hastaY = Math.min(alto - 1, caja ? caja.maxY : alto - 1);
  const leer = (x, y) => x >= 0 && y >= 0 && x < ancho && y < alto ? m[y * ancho + x] : 0;
  let cambio = true;
  let vuelta = 0;
  while (cambio && vuelta < maxPasadas) {
    cambio = false;
    for (const paso of [0, 1]) {
      const borrar = [];
      for (let y = desdeY; y <= hastaY; y++) {
        for (let x = desdeX; x <= hastaX; x++) {
          const i = y * ancho + x;
          if (!m[i]) continue;
          let b = 0;
          for (let k = 0; k < 8; k++) {
            vecinos[k] = leer(x + P[k][0], y + P[k][1]);
            b += vecinos[k];
          }
          if (b < 2 || b > 6) continue;
          let a = 0;
          for (let k = 0; k < 8; k++) {
            if (!vecinos[k] && vecinos[(k + 1) % 8]) a++;
          }
          if (a !== 1) continue;
          const [n2, , e, , s, , o] = vecinos;
          const primera = paso === 0 ? n2 * e * s : n2 * e * o;
          const segunda = paso === 0 ? e * s * o : n2 * s * o;
          if (primera === 0 && segunda === 0) borrar.push(i);
        }
      }
      if (borrar.length) {
        for (const i of borrar) m[i] = 0;
        cambio = true;
      }
    }
    vuelta++;
  }
  if (coste) coste.pasadasAdelgazado += vuelta;
  return { datos: m, convergio: !cambio };
}
function costeVacio() {
  return {
    pixelesEsqueleto: 0,
    ramas: 0,
    cruces: 0,
    pasadasAdelgazado: 0,
    fusiones: 0,
    comparacionesFusion: 0,
    msEsqueleto: 0,
    msFusion: 0
  };
}
var ahora = () => typeof performance !== "undefined" ? performance.now() : Date.now();
function percentil3(ordenados, p) {
  if (!ordenados.length) return 0;
  const i = Math.min(
    ordenados.length - 1,
    Math.max(0, Math.round((ordenados.length - 1) * p))
  );
  return ordenados[i];
}
function medirRama(recorrido, muestras, rejilla, distancia4, toleranciaMm, cerrada, junctionInicio = false, junctionFin = false) {
  const mm = rejilla.mmPorPx;
  const grosores = muestras.map((p) => distancia4[p] * 2 * mm).sort((a, b) => a - b);
  const p10 = percentil3(grosores, 0.1);
  const p90 = percentil3(grosores, 0.9);
  const crudos = recorrido.map(
    (p) => [p % rejilla.ancho * mm, (p / rejilla.ancho | 0) * mm]
  );
  let largo = 0;
  for (let i = 1; i < crudos.length; i++) {
    largo += Math.hypot(
      crudos[i][0] - crudos[i - 1][0],
      crudos[i][1] - crudos[i - 1][1]
    );
  }
  const puntos = simplificar2(crudos, toleranciaMm);
  const anchosMm = puntos.map(([x, y]) => {
    const px = Math.max(0, Math.min(rejilla.ancho - 1, Math.round(x / mm)));
    const py = Math.max(0, Math.min(rejilla.alto - 1, Math.round(y / mm)));
    return distancia4[py * rejilla.ancho + px] * 2 * mm;
  });
  return {
    puntos,
    anchosMm,
    pixeles: recorrido,
    largoMm: largo,
    grosorMedianoMm: percentil3(grosores, 0.5),
    grosorMinimoMm: grosores[0] ?? 0,
    grosorMaximoMm: grosores[grosores.length - 1] ?? 0,
    uniformidad: p90 > 0 ? Math.min(1, p10 / p90) : 0,
    cerrada,
    junctionInicio,
    junctionFin
  };
}
function prolongar(camino, mascara, ancho, alto, distancia4) {
  const punta = (indices2) => {
    const fin5 = indices2[indices2.length - 1];
    const atras = indices2[Math.max(0, indices2.length - 6)];
    let dx = fin5 % ancho - atras % ancho;
    let dy = (fin5 / ancho | 0) - (atras / ancho | 0);
    const norma = Math.hypot(dx, dy);
    if (!norma) return [];
    dx /= norma;
    dy /= norma;
    const pasos = Math.ceil(distancia4[fin5]) + 2;
    const extra = [];
    const x = fin5 % ancho;
    const y = fin5 / ancho | 0;
    for (let k = 1; k <= pasos; k++) {
      const nx = Math.round(x + dx * k);
      const ny = Math.round(y + dy * k);
      if (nx < 0 || ny < 0 || nx >= ancho || ny >= alto) break;
      const i = ny * ancho + nx;
      if (!mascara[i]) break;
      if (extra[extra.length - 1] !== i) extra.push(i);
    }
    return extra;
  };
  const cola = punta(camino);
  const cabeza = punta([...camino].reverse());
  return [...cabeza.reverse(), ...camino, ...cola];
}
function ramas(rejilla, componente, distancia4, toleranciaMm, coste, presupuesto) {
  const { ancho, alto } = rejilla;
  const soloEste = new Uint8Array(ancho * alto);
  for (const p of componente.pixeles) soloEste[p] = 1;
  const caja = {
    minX: componente.minX - 1,
    minY: componente.minY - 1,
    maxX: componente.maxX + 1,
    maxY: componente.maxY + 1
  };
  const desdeEsqueleto = ahora();
  const adelgazado = esqueleto(
    { ...rejilla, datos: soloEste },
    caja,
    coste,
    presupuesto?.maxPasadasAdelgazado
  );
  if (coste) coste.msEsqueleto += ahora() - desdeEsqueleto;
  if (!adelgazado.convergio) return [];
  const hueso = adelgazado.datos;
  const puntos = [];
  for (const p of componente.pixeles) if (hueso[p]) puntos.push(p);
  puntos.sort((a, b) => a - b);
  if (puntos.length < 2) return [];
  const indice = /* @__PURE__ */ new Map();
  puntos.forEach((p, i) => {
    indice.set(p, i);
  });
  const vecinos = puntos.map((p) => {
    const x = p % ancho;
    const y = p / ancho | 0;
    const hay = (dx, dy) => {
      const nx = x + dx;
      const ny = y + dy;
      return nx >= 0 && ny >= 0 && nx < ancho && ny < alto && hueso[ny * ancho + nx] === 1;
    };
    const salida2 = [];
    for (const [dx, dy] of P) {
      if (!hay(dx, dy)) continue;
      if (dx !== 0 && dy !== 0 && (hay(dx, 0) || hay(0, dy))) continue;
      const j = indice.get((y + dy) * ancho + (x + dx));
      if (j !== void 0) salida2.push(j);
    }
    return salida2;
  });
  const nodo = vecinos.map((v2) => v2.length !== 2);
  if (coste) {
    coste.pixelesEsqueleto += puntos.length;
    coste.cruces += nodo.filter(Boolean).length;
    if (presupuesto)
      exigir(
        "pixelesEsqueleto",
        coste.pixelesEsqueleto,
        presupuesto.maxPixelesEsqueleto
      );
  }
  const crudas = [];
  const visitado = /* @__PURE__ */ new Set();
  const arista = (a, b) => `${a}>${b}`;
  for (let inicio = 0; inicio < puntos.length; inicio++) {
    if (!nodo[inicio]) continue;
    for (const primero of vecinos[inicio]) {
      if (visitado.has(arista(inicio, primero))) continue;
      const camino = [inicio];
      let previo = inicio;
      let actual = primero;
      while (true) {
        visitado.add(arista(previo, actual));
        visitado.add(arista(actual, previo));
        camino.push(actual);
        if (nodo[actual]) break;
        const siguiente = vecinos[actual].find((v2) => v2 !== previo);
        if (siguiente === void 0) break;
        previo = actual;
        actual = siguiente;
      }
      crudas.push(camino);
    }
  }
  if (!crudas.length) {
    if (!vecinos[0].length) return [];
    const camino = [0];
    let previo = 0;
    let actual = vecinos[0][0];
    while (actual !== void 0 && actual !== 0) {
      camino.push(actual);
      const siguiente = vecinos[actual].find(
        (v2) => v2 !== previo
      );
      previo = actual;
      actual = siguiente;
      if (camino.length > puntos.length) break;
    }
    const enPixeles = camino.map((i) => puntos[i]);
    return [
      medirRama(enPixeles, enPixeles, rejilla, distancia4, toleranciaMm, true)
    ];
  }
  if (coste) {
    coste.ramas += crudas.length;
    if (presupuesto) exigir("ramas", coste.ramas, presupuesto.maxRamas);
  }
  const desdeFusion = ahora();
  const enteras = fundirRectas(
    crudas,
    puntos,
    ancho,
    distancia4,
    coste,
    presupuesto
  );
  if (coste) coste.msFusion += ahora() - desdeFusion;
  return enteras.map((camino) => {
    const enPixeles = camino.map((i) => puntos[i]);
    return medirRama(
      prolongar(enPixeles, soloEste, ancho, alto, distancia4),
      enPixeles,
      rejilla,
      distancia4,
      toleranciaMm,
      false,
      vecinos[camino[0]].length >= 3,
      vecinos[camino[camino.length - 1]].length >= 3
    );
  });
}
var RECTA = Math.cos(35 * Math.PI / 180);
function fundirRectas(crudas, puntos, ancho, distancia4, coste, presupuesto) {
  const vivas = crudas.map((camino) => [...camino]);
  const muerta = new Uint8Array(vivas.length);
  const grosor = (camino) => {
    const v2 = camino.map((i) => distancia4[puntos[i]]).sort((a, b) => a - b);
    return v2[Math.floor(v2.length / 2)] ?? 0;
  };
  const salida2 = (camino, alFinal) => {
    const orden = alFinal ? [...camino].reverse() : camino;
    const a = puntos[orden[0]];
    const b = puntos[orden[Math.min(orden.length - 1, 6)]];
    const dx = b % ancho - a % ancho;
    const dy = (b / ancho | 0) - (a / ancho | 0);
    const n2 = Math.hypot(dx, dy) || 1;
    return [dx / n2, dy / n2];
  };
  let hubo = true;
  while (hubo) {
    hubo = false;
    for (let i = 0; i < vivas.length && !hubo; i++) {
      if (muerta[i]) continue;
      for (const iAlFinal of [false, true]) {
        const nodoI = iAlFinal ? vivas[i][vivas[i].length - 1] : vivas[i][0];
        const dirI = salida2(vivas[i], iAlFinal);
        const grosorI = grosor(vivas[i]);
        let mejor = -1;
        let mejorAlFinal = false;
        let mejorDot = -RECTA;
        for (let j = 0; j < vivas.length; j++) {
          if (j === i || muerta[j]) continue;
          for (const jAlFinal of [false, true]) {
            if (coste) {
              coste.comparacionesFusion++;
              if (presupuesto)
                exigir(
                  "comparacionesFusion",
                  coste.comparacionesFusion,
                  presupuesto.maxComparacionesFusion
                );
            }
            const nodoJ = jAlFinal ? vivas[j][vivas[j].length - 1] : vivas[j][0];
            if (nodoJ !== nodoI) continue;
            const dirJ = salida2(vivas[j], jAlFinal);
            const dot = dirI[0] * dirJ[0] + dirI[1] * dirJ[1];
            if (dot >= mejorDot) continue;
            const grosorJ = grosor(vivas[j]);
            const mayor = Math.max(grosorI, grosorJ) || 1;
            if (Math.abs(grosorI - grosorJ) / mayor > 0.35) continue;
            mejor = j;
            mejorAlFinal = jAlFinal;
            mejorDot = dot;
          }
        }
        if (mejor < 0) continue;
        const izquierda = iAlFinal ? vivas[i] : [...vivas[i]].reverse();
        const derecha = mejorAlFinal ? [...vivas[mejor]].reverse() : vivas[mejor];
        vivas[i] = [...izquierda, ...derecha.slice(1)];
        muerta[mejor] = 1;
        if (coste) coste.fusiones++;
        hubo = true;
        break;
      }
    }
  }
  return vivas.filter((_, i) => !muerta[i]);
}
function sobranteDe(rejilla, componente, distancia4, cubiertas) {
  const { ancho, alto } = rejilla;
  const resto = new Uint8Array(ancho * alto);
  for (const p of componente.pixeles) resto[p] = 1;
  for (const rama of cubiertas) {
    const radio = Math.max(
      1,
      Math.round(rama.grosorMedianoMm / 2 / rejilla.mmPorPx)
    );
    const salto = Math.max(1, Math.floor(radio / 3));
    for (let k = 0; k < rama.pixeles.length; k += salto) {
      const p = rama.pixeles[k];
      const cx = p % ancho;
      const cy = p / ancho | 0;
      const r = Math.ceil(distancia4[p]) + 1;
      for (let dy = -r; dy <= r; dy++) {
        const y = cy + dy;
        if (y < 0 || y >= alto) continue;
        const media = Math.floor(Math.sqrt(r * r - dy * dy));
        const desde = Math.max(0, cx - media);
        const hasta = Math.min(ancho - 1, cx + media);
        for (let x = desde; x <= hasta; x++) resto[y * ancho + x] = 0;
      }
    }
  }
  return componentes({ ...rejilla, datos: resto });
}
function distanciaDe(rejilla, componente) {
  const soloEste = new Uint8Array(rejilla.ancho * rejilla.alto);
  for (const p of componente.pixeles) soloEste[p] = 1;
  return distanciaAlFondo({ ...rejilla, datos: soloEste });
}

// packages/bordado/src/hybrid.ts
var grados = (radianes) => radianes * 180 / Math.PI;
function deltaOrientacion(a, b) {
  let delta = Math.abs(a - b) % Math.PI;
  if (delta > Math.PI / 2) delta = Math.PI - delta;
  return Math.abs(grados(delta));
}
function promedio(valores) {
  return valores.length ? valores.reduce((suma, valor) => suma + valor, 0) / valores.length : 0;
}
function orientacion(a, b) {
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
}
function seCruzan(a, b, c, d) {
  const cruz = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const abC = cruz(a, b, c);
  const abD = cruz(a, b, d);
  const cdA = cruz(c, d, a);
  const cdB = cruz(c, d, b);
  return abC * abD < -1e-7 && cdA * cdB < -1e-7;
}
function medirComplejidadColumna(rama) {
  const widths = rama.anchosMm.length === rama.puntos.length ? rama.anchosMm : rama.puntos.map(() => rama.grosorMedianoMm);
  const averageWidthMm = promedio(widths);
  const widthVariance = promedio(
    widths.map((width) => (width - averageWidthMm) ** 2)
  );
  const lengths = [];
  const angles = [];
  for (let i = 1; i < rama.puntos.length; i++) {
    const a = rama.puntos[i - 1];
    const b = rama.puntos[i];
    lengths.push(Math.hypot(b[0] - a[0], b[1] - a[1]));
    angles.push(orientacion(a, b));
  }
  const deltas = angles.slice(1).map((angle, index) => deltaOrientacion(angle, angles[index]));
  const accumulatedTurningAngleDeg = deltas.reduce(
    (suma, value) => suma + value,
    0
  );
  const lengthMm = lengths.reduce((suma, value) => suma + value, 0);
  const curvaturePeaks = deltas.map(
    (delta, index) => delta / Math.max(0.01, (lengths[index] + lengths[index + 1]) / 2)
  );
  let intersections = 0;
  for (let i = 1; i < rama.puntos.length; i++)
    for (let j = i + 2; j < rama.puntos.length; j++) {
      if (!rama.cerrada && i === 1 && j === rama.puntos.length - 1) continue;
      if (seCruzan(
        rama.puntos[i - 1],
        rama.puntos[i],
        rama.puntos[j - 1],
        rama.puntos[j]
      ))
        intersections++;
    }
  let divergence = 0;
  let convergence = 0;
  for (let i = 1; i < widths.length; i++) {
    const slope = (widths[i] - widths[i - 1]) / Math.max(0.01, lengths[i - 1] ?? 0.01);
    divergence = Math.max(divergence, slope);
    convergence = Math.max(convergence, -slope);
  }
  const endpoints = rama.cerrada ? [averageWidthMm, averageWidthMm] : [widths[0] ?? averageWidthMm, widths.at(-1) ?? averageWidthMm];
  const endpointTaper = averageWidthMm ? Math.max(0, 1 - Math.min(...endpoints) / averageWidthMm) : 0;
  const maxDirectionDeltaDeg = Math.max(0, ...deltas);
  const curvatureDegPerMm = accumulatedTurningAngleDeg / Math.max(0.01, lengthMm);
  const widthVariationRatio = averageWidthMm ? Math.sqrt(widthVariance) / averageWidthMm : 0;
  const fanRisk = Math.min(
    1,
    Math.max(
      maxDirectionDeltaDeg / 40,
      curvatureDegPerMm * averageWidthMm / 12,
      widthVariationRatio / 0.25
    )
  );
  const junctionCount = Number(rama.junctionInicio) + Number(rama.junctionFin);
  return {
    lengthMm: Number(lengthMm.toFixed(3)),
    averageWidthMm: Number(averageWidthMm.toFixed(3)),
    minWidthMm: Number(Math.min(...widths).toFixed(3)),
    maxWidthMm: Number(Math.max(...widths).toFixed(3)),
    widthVariance: Number(widthVariance.toFixed(5)),
    widthVariationRatio: Number(widthVariationRatio.toFixed(5)),
    curvatureDegPerMm: Number(curvatureDegPerMm.toFixed(4)),
    maxCurvatureDegPerMm: Number(Math.max(0, ...curvaturePeaks).toFixed(4)),
    accumulatedTurningAngleDeg: Number(accumulatedTurningAngleDeg.toFixed(3)),
    maxDirectionDeltaDeg: Number(maxDirectionDeltaDeg.toFixed(3)),
    junctionCount,
    branchCount: 1 + junctionCount,
    endpointTaper: Number(endpointTaper.toFixed(4)),
    selfIntersectionRisk: intersections ? 1 : 0,
    fanRisk: Number(fanRisk.toFixed(4)),
    railDivergenceMmPerMm: Number(divergence.toFixed(4)),
    railConvergenceMmPerMm: Number(convergence.toFixed(4)),
    numberOfSharpTurns: deltas.filter((delta) => delta > 25).length
  };
}
function decidirRepresentacionSatin(rama, profile) {
  if (!profile.hybrid)
    throw new Error("El perfil no define thresholds h\xEDbridos");
  const metrics = medirComplejidadColumna(rama);
  const limits = profile.hybrid;
  const reasons = [];
  const signals = [];
  const hardReasons = [];
  if (rama.cerrada) signals.push("CLOSED_COLUMN");
  if (metrics.junctionCount) signals.push("JUNCTION");
  if (metrics.curvatureDegPerMm > limits.maxCurvatureDegPerMm)
    signals.push("HIGH_CURVATURE");
  if (metrics.maxCurvatureDegPerMm > limits.maxCurvaturePeakDegPerMm)
    signals.push("CURVATURE_PEAK");
  if (metrics.accumulatedTurningAngleDeg > limits.maxAccumulatedTurnDeg)
    signals.push("ACCUMULATED_TURN");
  if (metrics.maxDirectionDeltaDeg > limits.maxDirectionDeltaDeg)
    signals.push("DIRECTION_CHANGE");
  if (metrics.widthVariationRatio > limits.maxWidthVariationRatio)
    signals.push("WIDTH_VARIANCE");
  if (metrics.railDivergenceMmPerMm > limits.maxRailSlopeMmPerMm || metrics.railConvergenceMmPerMm > limits.maxRailSlopeMmPerMm)
    signals.push("RAIL_NON_PARALLEL");
  if (metrics.endpointTaper > 0.1) signals.push("ENDPOINT_TAPER");
  if (metrics.selfIntersectionRisk) hardReasons.push("SELF_INTERSECTION_RISK");
  if (metrics.fanRisk > limits.maxFanRisk) signals.push("FAN_RISK");
  if (metrics.numberOfSharpTurns > limits.maxSharpTurns)
    signals.push("SHARP_TURN");
  if (metrics.maxWidthMm > profile.quality.maxSatinWidthMm)
    return {
      representationDecision: "fill",
      reasons: ["WIDTH_TOO_LARGE"],
      metrics
    };
  const compositeRisk = !rama.cerrada && metrics.averageWidthMm >= 2.2 && signals.length >= 3;
  const junctionConRiesgo = metrics.junctionCount > 0 && signals.some((senal) => senal !== "JUNCTION" && senal !== "CLOSED_COLUMN");
  if (hardReasons.length || compositeRisk || junctionConRiesgo)
    reasons.push(...hardReasons, ...signals);
  return {
    representationDecision: reasons.length ? "rails-v3" : "stroke-v2",
    reasons,
    metrics
  };
}

// packages/bordado/src/profile.ts
var EMBROIDERY_PROFILE_V1 = Object.freeze({
  version: "experimental-v1-2026-09-05",
  experimental: true,
  physicallyValidated: false,
  limits: {
    maxWidthMm: 90,
    maxHeightMm: 60,
    maxInputBytes: 75e4,
    maxPixels: 12e6,
    maxObjects: 120,
    maxComponents: 100,
    maxNodes: 8e3,
    maxColors: 8,
    maxGradientRatio: 0.18,
    maxTexture: 0.42,
    maxEntropy: 6.8
  },
  stitches: {
    fillSpacingMm: 0.45,
    satinSpacingMm: 0.42,
    maxStitchLengthMm: 4,
    pullCompensationMm: 0.15
  },
  geometria: {
    minAreaMm2: 0.75,
    toleranciaMm: 0.12,
    maxGrosorRunningMm: 1,
    minGrosorSatinMm: 1,
    maxGrosorSatinMm: 8,
    minUniformidadSatin: 0.55,
    minAlargamientoSatin: 2.5,
    minAreaUnderlayMm2: 18
  },
  texto: {
    minAlturaMm: 6,
    minAstaMm: 1.2,
    minContraformaMm2: 0.8
  },
  raster: {
    maxColoresReducidos: 6,
    deltaObjetivoDeltaE: 3,
    maxPerdidaCuantizacionDeltaE: 12,
    maxSuavidadInterior: 0.61,
    maxComponentesLogo: 40
  },
  presupuesto: {
    maxPixelesPrimerPlano: 3e6,
    maxComponentes: 600,
    maxPixelesEsqueleto: 4e4,
    maxRamas: 1500,
    maxComparacionesFusion: 2e6,
    maxPasadasAdelgazado: 200
  },
  quality: {
    // Línea base v2: límites diagnósticos, todavía no bloquean producción.
    maxSatinWidthMm: 8,
    maxAutoSplitSatinWidthMm: 8,
    maxSatinStitchLengthMm: 8,
    maxRunningStitchLengthMm: 4,
    maxFillStitchLengthMm: 4.5,
    maxDirectionDeltaDeg: 55,
    maxLocalOverlap: 0.25,
    maxLocalDensity: 24,
    maxFanAngleDeg: 40,
    maxColumnLengthMm: 24,
    maxAccumulatedTurnDeg: 40,
    railSampleSpacingMm: 1.2,
    junctionInsetRatio: 0.35,
    taperLengthMm: 2.5
  }
});
var EMBROIDERY_PROFILE_V2 = Object.freeze({
  ...EMBROIDERY_PROFILE_V1,
  version: "experimental-v2-2026-09-06",
  limits: {
    ...EMBROIDERY_PROFILE_V1.limits,
    /* Los techos de v1 contaban OTRA COSA. Allí un objeto era una forma entera
    		   cosida de relleno y sin contraformas; aquí una letra son varias columnas
    		   —un objeto cada una— y un relleno lleva sus agujeros como subtrazados,
    		   así que la misma "Kustto" pasa de 6 objetos a unos 30 y de 6 subtrazados
    		   a unos 45 sin ser ni un ápice más compleja de bordar.
    
    		   Siguen siendo topes, no permisos: lo que frenan es un diseño que no se
    		   podría coser, y se recalibran con la matriz de test-sew igual que el
    		   resto del perfil. */
    maxObjects: 300,
    maxComponents: 320,
    maxNodes: 4e4
  }
});
var EMBROIDERY_PROFILE_V3 = Object.freeze({
  ...EMBROIDERY_PROFILE_V2,
  version: "experimental-v3-2026-09-06",
  geometria: {
    ...EMBROIDERY_PROFILE_V2.geometria,
    // El baseline mostró puntadas de 7.6–8.0 mm en curvas y texto. Por encima
    // de seis milímetros v3 usa fill antes que fabricar un satin de riesgo.
    maxGrosorSatinMm: 6
  },
  quality: {
    ...EMBROIDERY_PROFILE_V2.quality,
    maxSatinWidthMm: 6,
    maxAutoSplitSatinWidthMm: 12,
    maxSatinStitchLengthMm: 6.5,
    maxColumnLengthMm: 60,
    maxAccumulatedTurnDeg: 80,
    railSampleSpacingMm: 2
  }
});
var EMBROIDERY_PROFILE_HYBRID_V4 = Object.freeze({
  ...EMBROIDERY_PROFILE_V3,
  version: "experimental-hybrid-v4-2026-09-06",
  quality: {
    ...EMBROIDERY_PROFILE_V3.quality,
    // El baseline v3 mostró que dividir satins de 7+ mm en dos carriles crea
    // cruces y overlap; v4 los deja caer al fill ya existente.
    maxAutoSplitSatinWidthMm: 6,
    // Un rail adaptativo conserva checkpoints internos; no necesita cortar
    // cada 80° y repetir rungs/underlay en cada pedazo.
    maxColumnLengthMm: 100,
    maxAccumulatedTurnDeg: 360
  },
  hybrid: {
    // P75 de las columnas visualmente estables del baseline, redondeado hacia
    // abajo. Los gates se combinan; ninguno decide por sí solo.
    maxCurvatureDegPerMm: 0.8,
    maxCurvaturePeakDegPerMm: 3,
    maxAccumulatedTurnDeg: 14,
    maxDirectionDeltaDeg: 9,
    maxWidthVariationRatio: 0.08,
    maxRailSlopeMmPerMm: 0.08,
    maxFanRisk: 0.35,
    maxSharpTurns: 0,
    // Menor que la tolerancia visual/física del pipeline (0.2 mm), pero evita
    // muestrear una recta a intervalos fijos de 2 mm.
    simplificationErrorMm: 0.16,
    minAdaptiveSpacingMm: 0.8,
    maxAdaptiveSpacingMm: 8,
    joinToleranceMm: 0.2
  }
});
var EMBROIDERY_PROFILE_VECTOR_V5 = Object.freeze({
  ...EMBROIDERY_PROFILE_HYBRID_V4,
  version: "experimental-vector-v5-2026-09-25",
  /* V6.9.0 — LOS TOPES DE V5 SON LOS DE LO QUE CUESTA COSERLO. Heredaba los de
     v2 (300 objetos, 320 componentes), que contaban formas enteras; v5 parte
     cada letra en sus columnas a propósito, así que el número crece con el
     tamaño del logo y no con lo difícil que es de bordar. El escudo de Harley a
     80 mm (233 objetos, 181 satins) se rechazaba por "demasiados detalles" y,
     cosido sin tope, sale en 51 s con 11 917 puntadas. Lo que de verdad
     limita es el tiempo del motor frente al del trabajo (180 s): medido en el
     banco de logos complejos, ~0.2 s por objeto en el peor caso (con
     reparación), así que 600 objetos quedan en ~120 s. Un satin por rails es
     UNA columna (ver `earlyAnalysis`). */
  limits: {
    ...EMBROIDERY_PROFILE_HYBRID_V4.limits,
    maxObjects: 600,
    maxComponents: 800,
    maxNodes: 8e4
  },
  vector: {
    // Diez veces menos que el grosor de un hilo: la curva de la fuente.
    toleranciaCuerdaMm: 0.01,
    cordal: {
      espuela: 1,
      tramoInterno: 0.6,
      desvioPasa: 35,
      giroSinInglete: 45,
      proporcionGrosor: 1.45,
      desvioPasaMaximo: 50,
      proporcionGrosorMaxima: 1.9
    },
    separacionRungsMm: 0.8,
    anguloRellenoGrados: 45
  }
});
function profileByVersion(version) {
  if (version === EMBROIDERY_PROFILE_VECTOR_V5.version)
    return EMBROIDERY_PROFILE_VECTOR_V5;
  if (version === EMBROIDERY_PROFILE_HYBRID_V4.version)
    return EMBROIDERY_PROFILE_HYBRID_V4;
  if (version === EMBROIDERY_PROFILE_V3.version) return EMBROIDERY_PROFILE_V3;
  if (version === EMBROIDERY_PROFILE_V2.version) return EMBROIDERY_PROFILE_V2;
  if (version === EMBROIDERY_PROFILE_V1.version) return EMBROIDERY_PROFILE_V1;
  return null;
}

// packages/bordado/src/puntada.ts
function decidirPuntada(medidas, profile, opciones = {}) {
  const g = profile.geometria;
  const incidencias = [];
  if (medidas.areaMm2 < g.minAreaMm2) {
    return {
      tipo: "running",
      motivo: `area ${medidas.areaMm2.toFixed(2)}mm2 < ${g.minAreaMm2}mm2`,
      fabricable: false,
      incidencias: [
        {
          code: "REGION_DEMASIADO_PEQUENA",
          message: "Hay detalles demasiado peque\xF1os para bordarse.",
          severity: "review"
        }
      ]
    };
  }
  if (opciones.esTexto)
    incidencias.push(...revisarLegibilidad(medidas, profile));
  const alargamiento = medidas.grosorMedianoMm > 0 ? medidas.largoEjeMm / medidas.grosorMedianoMm : 0;
  if (medidas.grosorMedianoMm < g.maxGrosorRunningMm) {
    return {
      tipo: "running",
      motivo: `grosor ${medidas.grosorMedianoMm.toFixed(2)}mm < ${g.maxGrosorRunningMm}mm`,
      fabricable: true,
      incidencias
    };
  }
  if (medidas.grosorMedianoMm <= g.maxGrosorSatinMm && medidas.grosorMedianoMm >= g.minGrosorSatinMm && medidas.uniformidad >= g.minUniformidadSatin && alargamiento >= g.minAlargamientoSatin) {
    return {
      tipo: "satin",
      strokeWidthMm: Number(medidas.grosorMedianoMm.toFixed(2)),
      motivo: `columna ${medidas.grosorMedianoMm.toFixed(2)}mm uniformidad ${medidas.uniformidad.toFixed(2)} alargamiento ${alargamiento.toFixed(1)}`,
      fabricable: true,
      incidencias
    };
  }
  if (medidas.uniformidad >= g.minUniformidadSatin && alargamiento >= g.minAlargamientoSatin && medidas.grosorMedianoMm > g.maxGrosorSatinMm) {
    incidencias.push({
      code: "COLUMNA_DEMASIADO_ANCHA",
      message: `Un trazo de ${medidas.grosorMedianoMm.toFixed(1)} mm es demasiado ancho para una columna; se borda como relleno.`,
      severity: "review"
    });
  }
  return {
    tipo: "fill",
    motivo: `relleno area ${medidas.areaMm2.toFixed(1)}mm2 grosor ${medidas.grosorMedianoMm.toFixed(2)}mm uniformidad ${medidas.uniformidad.toFixed(2)}`,
    fabricable: true,
    incidencias
  };
}
function parametrosDe(decision, medidas, profile, indice) {
  if (decision.tipo === "satin") {
    return {
      type: "satin",
      strokeWidthMm: decision.strokeWidthMm,
      spacingMm: profile.stitches.satinSpacingMm,
      pullCompensationMm: profile.stitches.pullCompensationMm,
      underlay: true
    };
  }
  if (decision.tipo === "running") {
    return {
      type: "running",
      // Fino a propósito: el stroke de un running no es el ancho de nada, sólo
      // le dice al motor por dónde pasar.
      strokeWidthMm: 0.3,
      maxStitchLengthMm: profile.stitches.maxStitchLengthMm
    };
  }
  return {
    type: "fill",
    spacingMm: profile.stitches.fillSpacingMm,
    // Ángulos alternados entre objetos: dos rellenos contiguos en la misma
    // dirección se leen como una sola mancha.
    angleDeg: indice % 4 * 45,
    maxStitchLengthMm: profile.stitches.maxStitchLengthMm,
    underlay: medidas.areaMm2 >= profile.geometria.minAreaUnderlayMm2,
    pullCompensationMm: profile.stitches.pullCompensationMm
  };
}
function revisarLegibilidad(medidas, profile) {
  const incidencias = [];
  if (medidas.altoMm < profile.texto.minAlturaMm) {
    incidencias.push({
      code: "TEXTO_DEMASIADO_PEQUENO",
      message: `El texto mide ${medidas.altoMm.toFixed(1)} mm de alto; por debajo de ${profile.texto.minAlturaMm} mm no se lee bordado.`,
      severity: "reject"
    });
  }
  if (medidas.grosorMedianoMm < profile.texto.minAstaMm) {
    incidencias.push({
      code: "ASTA_DEMASIADO_FINA",
      message: `Los trazos de esta tipograf\xEDa miden ${medidas.grosorMedianoMm.toFixed(2)} mm; el m\xEDnimo para bordar es ${profile.texto.minAstaMm} mm.`,
      severity: "reject"
    });
  }
  const cerradas = medidas.huecosMm2.filter(
    (area2) => area2 > 0 && area2 < profile.texto.minContraformaMm2
  );
  if (cerradas.length) {
    incidencias.push({
      code: "CONTRAFORMA_PEQUENA",
      message: `Hay ${cerradas.length} hueco(s) interior(es) que se cerrar\xEDan al bordar.`,
      severity: "review"
    });
  }
  return incidencias;
}
function decidirDeRama(rama, profile) {
  const g = profile.geometria;
  if (rama.largoMm <= rama.grosorMedianoMm) {
    return { tipo: "ninguna", motivo: "rabillo de cruce" };
  }
  if (rama.grosorMedianoMm < g.maxGrosorRunningMm) {
    return {
      tipo: "running",
      motivo: `grosor ${rama.grosorMedianoMm.toFixed(2)}mm`
    };
  }
  const alargamiento = rama.largoMm / (rama.grosorMedianoMm || 1);
  if (rama.grosorMedianoMm <= (profile.version.startsWith("experimental-v3") || profile.hybrid ? profile.quality.maxAutoSplitSatinWidthMm : g.maxGrosorSatinMm) && rama.grosorMedianoMm >= g.minGrosorSatinMm && rama.uniformidad >= g.minUniformidadSatin && alargamiento >= g.minAlargamientoSatin) {
    return {
      tipo: "satin",
      strokeWidthMm: Number(rama.grosorMedianoMm.toFixed(2)),
      motivo: `columna ${rama.grosorMedianoMm.toFixed(2)}mm uniformidad ${rama.uniformidad.toFixed(2)} alargamiento ${alargamiento.toFixed(1)}`
    };
  }
  return {
    tipo: "ninguna",
    motivo: `no es columna: grosor ${rama.grosorMedianoMm.toFixed(2)}mm uniformidad ${rama.uniformidad.toFixed(2)} alargamiento ${alargamiento.toFixed(1)}`
  };
}

// packages/bordado/src/raster/contornos.ts
function suavizar(campo, ancho, alto) {
  const tmp = new Float32Array(campo.length);
  const salida2 = new Float32Array(campo.length);
  for (let y = 0; y < alto; y++)
    for (let x = 0; x < ancho; x++) {
      const i = y * ancho + x;
      const a = x > 0 ? campo[i - 1] : 0;
      const c = x < ancho - 1 ? campo[i + 1] : 0;
      tmp[i] = (a + 2 * campo[i] + c) / 4;
    }
  for (let y = 0; y < alto; y++)
    for (let x = 0; x < ancho; x++) {
      const i = y * ancho + x;
      const a = y > 0 ? tmp[i - ancho] : 0;
      const c = y < alto - 1 ? tmp[i + ancho] : 0;
      salida2[i] = (a + 2 * tmp[i] + c) / 4;
    }
  return salida2;
}
function curvasDeNivel(campo, ancho, alto, nivel = 0.5, interiores3) {
  const W = ancho + 2;
  const H = alto + 2;
  const v2 = (i, j) => i <= 0 || j <= 0 || i > ancho || j > alto ? 0 : campo[(j - 1) * ancho + (i - 1)];
  const puntoEn = /* @__PURE__ */ new Map();
  const aristaH = (i, j) => 2 * (j * W + i);
  const aristaV = (i, j) => 2 * (j * W + i) + 1;
  const punto2 = (id) => {
    const guardado = puntoEn.get(id);
    if (guardado) return guardado;
    const vertical = id & 1;
    const n2 = id >> 1;
    const i = n2 % W;
    const j = Math.floor(n2 / W);
    const a = v2(i, j);
    const b = vertical ? v2(i, j + 1) : v2(i + 1, j);
    const t = a === b ? 0.5 : (nivel - a) / (b - a);
    const p = vertical ? [i - 0.5, j - 0.5 + t] : [i - 0.5 + t, j - 0.5];
    puntoEn.set(id, p);
    return p;
  };
  const vecinos = /* @__PURE__ */ new Map();
  const unir2 = (a, b) => {
    (vecinos.get(a) ?? vecinos.set(a, []).get(a)).push(b);
    (vecinos.get(b) ?? vecinos.set(b, []).get(b)).push(a);
  };
  for (let j = 0; j < H - 1; j++)
    for (let i = 0; i < W - 1; i++) {
      const tl = v2(i, j) >= nivel;
      const tr = v2(i + 1, j) >= nivel;
      const br = v2(i + 1, j + 1) >= nivel;
      const bl = v2(i, j + 1) >= nivel;
      const caso = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
      if (caso === 0 || caso === 15) continue;
      const T = aristaH(i, j);
      const B3 = aristaH(i, j + 1);
      const L = aristaV(i, j);
      const R = aristaV(i + 1, j);
      const cruzadas = [];
      if (tl !== tr) cruzadas.push(T);
      if (tr !== br) cruzadas.push(R);
      if (br !== bl) cruzadas.push(B3);
      if (bl !== tl) cruzadas.push(L);
      if (cruzadas.length === 2) {
        unir2(cruzadas[0], cruzadas[1]);
        continue;
      }
      const centro = (v2(i, j) + v2(i + 1, j) + v2(i + 1, j + 1) + v2(i, j + 1)) / 4 >= nivel;
      const cortarTlYBr = caso === 5 ? centro : !centro;
      if (cortarTlYBr) {
        unir2(T, L);
        unir2(R, B3);
      } else {
        unir2(T, R);
        unir2(B3, L);
      }
    }
  const anillos = [];
  const visto = /* @__PURE__ */ new Set();
  for (const inicio of vecinos.keys()) {
    if (visto.has(inicio)) continue;
    const anillo = [];
    let previo = -1;
    let actual = inicio;
    for (; ; ) {
      visto.add(actual);
      anillo.push(punto2(actual));
      const lista2 = vecinos.get(actual) ?? [];
      const siguiente = lista2[0] !== previo ? lista2[0] : lista2[1];
      if (siguiente === void 0 || siguiente === inicio || visto.has(siguiente))
        break;
      previo = actual;
      actual = siguiente;
    }
    if (anillo.length >= 3) {
      anillos.push(anillo);
      if (interiores3) {
        const n2 = inicio >> 1;
        const i = n2 % W;
        const j = Math.floor(n2 / W);
        const [i2, j2] = inicio & 1 ? [i, j + 1] : [i + 1, j];
        const [di, dj] = v2(i, j) >= nivel ? [i, j] : [i2, j2];
        interiores3.push((dj - 1) * ancho + (di - 1));
      }
    }
  }
  return anillos;
}
function componentesDeNivel(campo, ancho, alto, nivel = 0.5) {
  const n2 = ancho * alto;
  const padre = new Int32Array(n2).fill(-1);
  const dentro2 = (p) => campo[p] >= nivel;
  const raiz = (p) => {
    let r = p;
    while (padre[r] !== r) r = padre[r];
    while (padre[p] !== r) {
      const q = padre[p];
      padre[p] = r;
      p = q;
    }
    return r;
  };
  const unir2 = (a, b) => {
    const ra = raiz(a);
    const rb = raiz(b);
    if (ra !== rb) padre[Math.max(ra, rb)] = Math.min(ra, rb);
  };
  for (let p = 0; p < n2; p++) if (dentro2(p)) padre[p] = p;
  for (let y = 0; y < alto; y++)
    for (let x = 0; x < ancho; x++) {
      const p = y * ancho + x;
      if (!dentro2(p)) continue;
      if (x + 1 < ancho && dentro2(p + 1)) unir2(p, p + 1);
      if (y + 1 < alto && dentro2(p + ancho)) unir2(p, p + ancho);
    }
  for (let y = 0; y + 1 < alto; y++)
    for (let x = 0; x + 1 < ancho; x++) {
      const tl = y * ancho + x;
      const tr = tl + 1;
      const bl = tl + ancho;
      const br = bl + 1;
      const [a, b, c, d] = [dentro2(tl), dentro2(tr), dentro2(br), dentro2(bl)];
      const silla = a && c && !b && !d || b && d && !a && !c;
      if (!silla) continue;
      if ((campo[tl] + campo[tr] + campo[br] + campo[bl]) / 4 < nivel) continue;
      if (a) unir2(tl, br);
      else unir2(tr, bl);
    }
  const etiqueta = new Int32Array(n2);
  const nueva = /* @__PURE__ */ new Map();
  for (let p = 0; p < n2; p++) {
    if (padre[p] < 0) continue;
    const r = raiz(p);
    let e = nueva.get(r);
    if (e === void 0) {
      e = nueva.size + 1;
      nueva.set(r, e);
    }
    etiqueta[p] = e;
  }
  return etiqueta;
}
function distanciaASegmento(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-12) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(
    0,
    Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)
  );
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
function douglasPeucker(puntos, tolerancia) {
  if (puntos.length < 3) return puntos;
  const conservar = new Uint8Array(puntos.length);
  conservar[0] = 1;
  conservar[puntos.length - 1] = 1;
  const pila = [[0, puntos.length - 1]];
  while (pila.length) {
    const [a, b] = pila.pop();
    let mayor = 0;
    let indice = -1;
    for (let i = a + 1; i < b; i++) {
      const d = distanciaASegmento(puntos[i], puntos[a], puntos[b]);
      if (d > mayor) {
        mayor = d;
        indice = i;
      }
    }
    if (indice >= 0 && mayor > tolerancia) {
      conservar[indice] = 1;
      pila.push([a, indice], [indice, b]);
    }
  }
  return puntos.filter((_, i) => conservar[i]);
}
function simplificarAnillo(anillo, tolerancia) {
  if (anillo.length < 8) return anillo;
  let lejos = 0;
  let d = -1;
  for (let i = 1; i < anillo.length; i++) {
    const di = Math.hypot(
      anillo[i][0] - anillo[0][0],
      anillo[i][1] - anillo[0][1]
    );
    if (di > d) {
      d = di;
      lejos = i;
    }
  }
  const ida = douglasPeucker(anillo.slice(0, lejos + 1), tolerancia);
  const vuelta = douglasPeucker(
    [...anillo.slice(lejos), anillo[0]],
    tolerancia
  );
  const salida2 = [...ida.slice(0, -1), ...vuelta.slice(0, -1)];
  return salida2.length >= 3 ? salida2 : anillo;
}
function areaDeAnillo(anillo) {
  let doble = 0;
  for (let i = 0; i < anillo.length; i++) {
    const a = anillo[i];
    const b = anillo[(i + 1) % anillo.length];
    doble += a[0] * b[1] - b[0] * a[1];
  }
  return doble / 2;
}
function grosorDeAnillos(anillos) {
  const m = anillos.length;
  const area2 = anillos.map((a) => Math.abs(areaDeAnillo(a)));
  const perimetro2 = anillos.map((a) => {
    let l = 0;
    for (let k = 0; k < a.length; k++) {
      const q = a[(k + 1) % a.length];
      l += Math.hypot(q[0] - a[k][0], q[1] - a[k][1]);
    }
    return l;
  });
  const caja = anillos.map((a) => {
    let x0 = Number.POSITIVE_INFINITY;
    let y0 = Number.POSITIVE_INFINITY;
    let x1 = Number.NEGATIVE_INFINITY;
    let y1 = Number.NEGATIVE_INFINITY;
    for (const [x, y] of a) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    return [x0, y0, x1, y1];
  });
  const orden = [...anillos.keys()].sort((a, b) => area2[b] - area2[a]);
  const padre = new Int32Array(m).fill(-1);
  const hondura = new Int32Array(m);
  for (let oi = 0; oi < m; oi++) {
    const i = orden[oi];
    const [px, py] = anillos[i][0];
    for (let oj = oi - 1; oj >= 0; oj--) {
      const j = orden[oj];
      const c = caja[j];
      if (px < c[0] || px > c[2] || py < c[1] || py > c[3]) continue;
      if (!dentroDeAnillo(px, py, anillos[j])) continue;
      padre[i] = j;
      hondura[i] = hondura[j] + 1;
      break;
    }
  }
  const areaPieza = new Float64Array(m);
  const bordePieza = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    const pieza = hondura[i] % 2 === 0 ? i : padre[i];
    if (pieza < 0) continue;
    areaPieza[pieza] += pieza === i ? area2[i] : -area2[i];
    bordePieza[pieza] += perimetro2[i];
  }
  return anillos.map((_, i) => {
    const pieza = hondura[i] % 2 === 0 ? i : padre[i];
    if (pieza < 0 || bordePieza[pieza] <= 0) return 0;
    return 2 * Math.max(0, areaPieza[pieza]) / bordePieza[pieza];
  });
}
function dentroDeAnillo(x, y, anillo) {
  let dentro2 = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i];
    const [xj, yj] = anillo[j];
    if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi)
      dentro2 = !dentro2;
  }
  return dentro2;
}

// node_modules/.pnpm/clipper2-ts@2.0.1-18/node_modules/clipper2-ts/dist/Core.js
var ClipType;
(function(ClipType2) {
  ClipType2[ClipType2["NoClip"] = 0] = "NoClip";
  ClipType2[ClipType2["Intersection"] = 1] = "Intersection";
  ClipType2[ClipType2["Union"] = 2] = "Union";
  ClipType2[ClipType2["Difference"] = 3] = "Difference";
  ClipType2[ClipType2["Xor"] = 4] = "Xor";
})(ClipType || (ClipType = {}));
var PathType;
(function(PathType2) {
  PathType2[PathType2["Subject"] = 0] = "Subject";
  PathType2[PathType2["Clip"] = 1] = "Clip";
})(PathType || (PathType = {}));
var FillRule;
(function(FillRule2) {
  FillRule2[FillRule2["EvenOdd"] = 0] = "EvenOdd";
  FillRule2[FillRule2["NonZero"] = 1] = "NonZero";
  FillRule2[FillRule2["Positive"] = 2] = "Positive";
  FillRule2[FillRule2["Negative"] = 3] = "Negative";
})(FillRule || (FillRule = {}));
var PointInPolygonResult;
(function(PointInPolygonResult2) {
  PointInPolygonResult2[PointInPolygonResult2["IsOn"] = 0] = "IsOn";
  PointInPolygonResult2[PointInPolygonResult2["IsInside"] = 1] = "IsInside";
  PointInPolygonResult2[PointInPolygonResult2["IsOutside"] = 2] = "IsOutside";
})(PointInPolygonResult || (PointInPolygonResult = {}));
var maxSafeInteger = Number.MAX_SAFE_INTEGER;
var maxDeltaForSafeProduct = Math.floor(Math.sqrt(maxSafeInteger));
function isSafeProduct(a, b) {
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b))
    return false;
  if (a === 0 || b === 0)
    return true;
  return Math.abs(a) <= maxSafeInteger / Math.abs(b);
}
function isSafeSum(a, b) {
  return Math.abs(a) + Math.abs(b) <= maxSafeInteger;
}
function safeMultiplyDifference(a, b, c, d) {
  if (isSafeProduct(a, b) && isSafeProduct(c, d)) {
    const prod1 = a * b;
    const prod2 = c * d;
    if (isSafeSum(prod1, prod2)) {
      return prod1 - prod2;
    }
  }
  if (Number.isSafeInteger(a) && Number.isSafeInteger(b) && Number.isSafeInteger(c) && Number.isSafeInteger(d)) {
    return Number(BigInt(a) * BigInt(b) - BigInt(c) * BigInt(d));
  }
  return a * b - c * d;
}
function safeMultiplySum(a, b, c, d) {
  if (isSafeProduct(a, b) && isSafeProduct(c, d)) {
    const prod1 = a * b;
    const prod2 = c * d;
    if (isSafeSum(prod1, prod2)) {
      return prod1 + prod2;
    }
  }
  if (Number.isSafeInteger(a) && Number.isSafeInteger(b) && Number.isSafeInteger(c) && Number.isSafeInteger(d)) {
    return Number(BigInt(a) * BigInt(b) + BigInt(c) * BigInt(d));
  }
  return a * b + c * d;
}
var B0 = BigInt(0);
var B2 = BigInt(2);
var B4 = BigInt(4);
var B64 = BigInt(64);
var UINT64_MASK = BigInt("0xFFFFFFFFFFFFFFFF");
var IC_MaxInt64 = BigInt("9223372036854775807");
var IC_MaxCoord = Number(IC_MaxInt64 / B4);
var IC_Invalid64 = Number(IC_MaxInt64);
var IC_floatingPointTolerance = 1e-12;
var IC_defaultMinimumEdgeLength = 0.1;
var IC_maxCoordForSafeAreaProduct = Math.floor(maxDeltaForSafeProduct / 2);
var IC_maxCoordForSafeCrossSq = Math.floor(Math.sqrt(Math.sqrt(maxSafeInteger / 4)));
function maxSafeCoordinateForScale(scale2) {
  if (!Number.isFinite(scale2)) {
    throw new RangeError("Scale must be a finite number");
  }
  const absScale = Math.abs(scale2);
  if (absScale === 0)
    return Number.POSITIVE_INFINITY;
  return maxSafeInteger / absScale;
}
function checkSafeScaleValue(value, maxAbs, context) {
  if (!Number.isFinite(value) || Math.abs(value) > maxAbs) {
    throw new RangeError(`Scaled coordinate exceeds Number.MAX_SAFE_INTEGER in ${context}`);
  }
}
function ensureSafeInteger(value, context) {
  if (!Number.isFinite(value) || Math.abs(value) > maxSafeInteger) {
    throw new RangeError(`Coordinate exceeds Number.MAX_SAFE_INTEGER in ${context}`);
  }
}
function crossProduct(pt1, pt2, pt3) {
  const a = pt2.x - pt1.x;
  const b = pt3.y - pt2.y;
  const c = pt2.y - pt1.y;
  const d = pt3.x - pt2.x;
  if (Math.abs(a) < maxDeltaForSafeProduct && Math.abs(b) < maxDeltaForSafeProduct && Math.abs(c) < maxDeltaForSafeProduct && Math.abs(d) < maxDeltaForSafeProduct) {
    return a * b - c * d;
  }
  return safeMultiplyDifference(a, b, c, d);
}
function crossProductSign(pt1, pt2, pt3) {
  const a = pt2.x - pt1.x;
  const b = pt3.y - pt2.y;
  const c = pt2.y - pt1.y;
  const d = pt3.x - pt2.x;
  if (Math.abs(a) < maxDeltaForSafeProduct && Math.abs(b) < maxDeltaForSafeProduct && Math.abs(c) < maxDeltaForSafeProduct && Math.abs(d) < maxDeltaForSafeProduct) {
    const prod1 = a * b;
    const prod2 = c * d;
    return prod1 > prod2 ? 1 : prod1 < prod2 ? -1 : 0;
  }
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || !Number.isSafeInteger(c) || !Number.isSafeInteger(d)) {
    const prod1 = a * b;
    const prod2 = c * d;
    return prod1 > prod2 ? 1 : prod1 < prod2 ? -1 : 0;
  }
  const bigProd1 = BigInt(a) * BigInt(b);
  const bigProd2 = BigInt(c) * BigInt(d);
  if (bigProd1 === bigProd2)
    return 0;
  return bigProd1 > bigProd2 ? 1 : -1;
}
function checkPrecision(precision) {
  if (precision < -8 || precision > 8) {
    throw new Error("Error: Precision is out of range.");
  }
}
function isAlmostZero(value) {
  return Math.abs(value) <= IC_floatingPointTolerance;
}
function triSign(x) {
  return x < 0 ? -1 : x > 0 ? 1 : 0;
}
function multiplyUInt64(a, b) {
  const aBig = BigInt(a);
  const bBig = BigInt(b);
  const res = aBig * bBig;
  return {
    lo64: res & UINT64_MASK,
    hi64: res >> B64
  };
}
function productsAreEqual(a, b, c, d) {
  const absA = Math.abs(a);
  const absB = Math.abs(b);
  const absC = Math.abs(c);
  const absD = Math.abs(d);
  if (absA < maxDeltaForSafeProduct && absB < maxDeltaForSafeProduct && absC < maxDeltaForSafeProduct && absD < maxDeltaForSafeProduct) {
    return a * b === c * d;
  }
  const signAb = (a < 0 ? -1 : a > 0 ? 1 : 0) * (b < 0 ? -1 : b > 0 ? 1 : 0);
  const signCd = (c < 0 ? -1 : c > 0 ? 1 : 0) * (d < 0 ? -1 : d > 0 ? 1 : 0);
  if (signAb !== signCd)
    return false;
  if (signAb === 0)
    return true;
  if (!Number.isSafeInteger(absA) || !Number.isSafeInteger(absB) || !Number.isSafeInteger(absC) || !Number.isSafeInteger(absD)) {
    return a * b === c * d;
  }
  const bigA = BigInt(absA);
  const bigB = BigInt(absB);
  const bigC = BigInt(absC);
  const bigD = BigInt(absD);
  return bigA * bigB === bigC * bigD;
}
function isCollinear(pt1, sharedPt, pt2) {
  const a = sharedPt.x - pt1.x;
  const b = pt2.y - sharedPt.y;
  const c = sharedPt.y - pt1.y;
  const d = pt2.x - sharedPt.x;
  return productsAreEqual(a, b, c, d);
}
function dotProduct(pt1, pt2, pt3) {
  const a = pt2.x - pt1.x;
  const b = pt3.x - pt2.x;
  const c = pt2.y - pt1.y;
  const d = pt3.y - pt2.y;
  if (Math.abs(a) < maxDeltaForSafeProduct && Math.abs(b) < maxDeltaForSafeProduct && Math.abs(c) < maxDeltaForSafeProduct && Math.abs(d) < maxDeltaForSafeProduct) {
    return a * b + c * d;
  }
  return safeMultiplySum(a, b, c, d);
}
function dotProductSign(pt1, pt2, pt3) {
  const a = pt2.x - pt1.x;
  const b = pt3.x - pt2.x;
  const c = pt2.y - pt1.y;
  const d = pt3.y - pt2.y;
  if (Math.abs(a) < maxDeltaForSafeProduct && Math.abs(b) < maxDeltaForSafeProduct && Math.abs(c) < maxDeltaForSafeProduct && Math.abs(d) < maxDeltaForSafeProduct) {
    const sum2 = a * b + c * d;
    return sum2 > 0 ? 1 : sum2 < 0 ? -1 : 0;
  }
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || !Number.isSafeInteger(c) || !Number.isSafeInteger(d)) {
    const sum2 = a * b + c * d;
    return sum2 > 0 ? 1 : sum2 < 0 ? -1 : 0;
  }
  const bigSum = BigInt(a) * BigInt(b) + BigInt(c) * BigInt(d);
  if (bigSum === B0)
    return 0;
  return bigSum > B0 ? 1 : -1;
}
function icArea(path) {
  const cnt = path.length;
  if (cnt < 3)
    return 0;
  let allSmall = true;
  for (let i = 0; i < cnt && allSmall; i++) {
    const pt = path[i];
    if (Math.abs(pt.x) >= IC_maxCoordForSafeAreaProduct || Math.abs(pt.y) >= IC_maxCoordForSafeAreaProduct) {
      allSmall = false;
    }
  }
  let prevPt = path[cnt - 1];
  if (allSmall) {
    let total = 0;
    for (const pt of path) {
      total += (prevPt.y + pt.y) * (prevPt.x - pt.x);
      prevPt = pt;
    }
    return total * 0.5;
  }
  let totalBig = B0;
  for (const pt of path) {
    const sum2 = prevPt.y + pt.y;
    const diff = prevPt.x - pt.x;
    if (Number.isSafeInteger(sum2) && Number.isSafeInteger(diff)) {
      totalBig += BigInt(sum2) * BigInt(diff);
    } else if (Number.isSafeInteger(prevPt.y) && Number.isSafeInteger(pt.y) && Number.isSafeInteger(prevPt.x) && Number.isSafeInteger(pt.x)) {
      const sumBig = BigInt(prevPt.y) + BigInt(pt.y);
      const diffBig = BigInt(prevPt.x) - BigInt(pt.x);
      totalBig += sumBig * diffBig;
    } else {
      totalBig += BigInt(Math.round(sum2 * diff));
    }
    prevPt = pt;
  }
  return Number(totalBig) * 0.5;
}
function crossProductD(vec1, vec2) {
  return vec1.y * vec2.x - vec2.y * vec1.x;
}
function dotProductD(vec1, vec2) {
  return vec1.x * vec2.x + vec1.y * vec2.y;
}
function roundToEven(value) {
  const r = Math.round(value);
  if (value === r - 0.5 && (r & 1) !== 0)
    return r - 1;
  return r;
}
function checkCastInt64(val) {
  if (val >= IC_MaxCoord || val <= -IC_MaxCoord)
    return IC_Invalid64;
  return Math.round(val);
}
function getLineIntersectPt(ln1a, ln1b, ln2a, ln2b) {
  const dy1 = ln1b.y - ln1a.y;
  const dx1 = ln1b.x - ln1a.x;
  const dy2 = ln2b.y - ln2a.y;
  const dx2 = ln2b.x - ln2a.x;
  const det = safeMultiplyDifference(dy1, dx2, dy2, dx1);
  if (det === 0) {
    return null;
  }
  const t = safeMultiplyDifference(ln1a.x - ln2a.x, dy2, ln1a.y - ln2a.y, dx2) / det;
  if (t <= 0) {
    return { x: ln1a.x, y: ln1a.y, z: ln1a.z || 0 };
  } else if (t >= 1) {
    return { x: ln1b.x, y: ln1b.y, z: ln1b.z || 0 };
  } else {
    return {
      x: Math.trunc(ln1a.x + t * dx1),
      y: Math.trunc(ln1a.y + t * dy1),
      z: 0
    };
  }
}
function getLineIntersectPtD(ln1a, ln1b, ln2a, ln2b) {
  const dy1 = ln1b.y - ln1a.y;
  const dx1 = ln1b.x - ln1a.x;
  const dy2 = ln2b.y - ln2a.y;
  const dx2 = ln2b.x - ln2a.x;
  const det = dy1 * dx2 - dy2 * dx1;
  if (det === 0) {
    return { success: false, ip: { x: 0, y: 0, z: 0 } };
  }
  const t = ((ln1a.x - ln2a.x) * dy2 - (ln1a.y - ln2a.y) * dx2) / det;
  let ip;
  if (t <= 0) {
    ip = { ...ln1a, z: 0 };
  } else if (t >= 1) {
    ip = { ...ln1b, z: 0 };
  } else {
    ip = {
      x: ln1a.x + t * dx1,
      y: ln1a.y + t * dy1,
      z: 0
    };
  }
  return { success: true, ip };
}
function segsIntersect(seg1a, seg1b, seg2a, seg2b, inclusive = false) {
  if (!inclusive) {
    const s1 = crossProductSign(seg1a, seg2a, seg2b);
    const s2 = crossProductSign(seg1b, seg2a, seg2b);
    const s3 = crossProductSign(seg2a, seg1a, seg1b);
    const s4 = crossProductSign(seg2b, seg1a, seg1b);
    return s1 !== 0 && s2 !== 0 && s1 !== s2 && (s3 !== 0 && s4 !== 0 && s3 !== s4);
  }
  const res1 = crossProductSign(seg1a, seg2a, seg2b);
  const res2 = crossProductSign(seg1b, seg2a, seg2b);
  if (res1 !== 0 && res1 === res2)
    return false;
  const res3 = crossProductSign(seg2a, seg1a, seg1b);
  const res4 = crossProductSign(seg2b, seg1a, seg1b);
  if (res3 !== 0 && res3 === res4)
    return false;
  return res1 !== 0 || res2 !== 0 || res3 !== 0 || res4 !== 0;
}
function icGetBounds(path) {
  if (path.length === 0)
    return { left: 0, top: 0, right: 0, bottom: 0 };
  const result = {
    left: Number.MAX_SAFE_INTEGER,
    top: Number.MAX_SAFE_INTEGER,
    right: Number.MIN_SAFE_INTEGER,
    bottom: Number.MIN_SAFE_INTEGER
  };
  for (const pt of path) {
    if (pt.x < result.left)
      result.left = pt.x;
    if (pt.x > result.right)
      result.right = pt.x;
    if (pt.y < result.top)
      result.top = pt.y;
    if (pt.y > result.bottom)
      result.bottom = pt.y;
  }
  return result.left === Number.MAX_SAFE_INTEGER ? { left: 0, top: 0, right: 0, bottom: 0 } : result;
}
function getClosestPtOnSegment(offPt, seg1, seg2) {
  if (seg1.x === seg2.x && seg1.y === seg2.y)
    return { x: seg1.x, y: seg1.y, z: 0 };
  const dx = seg2.x - seg1.x;
  const dy = seg2.y - seg1.y;
  const q = safeMultiplySum(offPt.x - seg1.x, dx, offPt.y - seg1.y, dy) / safeMultiplySum(dx, dx, dy, dy);
  const qClamped = q < 0 ? 0 : q > 1 ? 1 : q;
  return {
    // use Math.round to match the C# MidpointRounding.ToEven behavior
    x: Math.round(seg1.x + qClamped * dx),
    y: Math.round(seg1.y + qClamped * dy),
    z: 0
  };
}
function icPointInPolygon(pt, polygon) {
  const len = polygon.length;
  let start = 0;
  if (len < 3)
    return PointInPolygonResult.IsOutside;
  while (start < len && polygon[start].y === pt.y)
    start++;
  if (start === len)
    return PointInPolygonResult.IsOutside;
  let isAbove = polygon[start].y < pt.y;
  const startingAbove = isAbove;
  let val = 0;
  let i = start + 1;
  let end = len;
  while (true) {
    if (i === end) {
      if (end === 0 || start === 0)
        break;
      end = start;
      i = 0;
    }
    if (isAbove) {
      while (i < end && polygon[i].y < pt.y)
        i++;
    } else {
      while (i < end && polygon[i].y > pt.y)
        i++;
    }
    if (i === end)
      continue;
    const curr = polygon[i];
    const prev = i > 0 ? polygon[i - 1] : polygon[len - 1];
    if (curr.y === pt.y) {
      if (curr.x === pt.x || curr.y === prev.y && pt.x < prev.x !== pt.x < curr.x) {
        return PointInPolygonResult.IsOn;
      }
      i++;
      if (i === start)
        break;
      continue;
    }
    if (pt.x < curr.x && pt.x < prev.x) {
    } else if (pt.x > prev.x && pt.x > curr.x) {
      val = 1 - val;
    } else {
      const cps2 = crossProductSign(prev, curr, pt);
      if (cps2 === 0)
        return PointInPolygonResult.IsOn;
      if (cps2 < 0 === isAbove)
        val = 1 - val;
    }
    isAbove = !isAbove;
    i++;
  }
  if (isAbove === startingAbove) {
    return val === 0 ? PointInPolygonResult.IsOutside : PointInPolygonResult.IsInside;
  }
  if (i === len)
    i = 0;
  const cps = i === 0 ? crossProductSign(polygon[len - 1], polygon[0], pt) : crossProductSign(polygon[i - 1], polygon[i], pt);
  if (cps === 0)
    return PointInPolygonResult.IsOn;
  if (cps < 0 === isAbove)
    val = 1 - val;
  return val === 0 ? PointInPolygonResult.IsOutside : PointInPolygonResult.IsInside;
}
function path2ContainsPath1(path1, path2) {
  let pip = PointInPolygonResult.IsOn;
  for (const pt of path1) {
    switch (icPointInPolygon(pt, path2)) {
      case PointInPolygonResult.IsOutside:
        if (pip === PointInPolygonResult.IsOutside)
          return false;
        pip = PointInPolygonResult.IsOutside;
        break;
      case PointInPolygonResult.IsInside:
        if (pip === PointInPolygonResult.IsInside)
          return true;
        pip = PointInPolygonResult.IsInside;
        break;
      default:
        break;
    }
  }
  const mp = icGetBounds(path1);
  let midX, midY;
  if (Number.isSafeInteger(mp.left) && Number.isSafeInteger(mp.right) && Math.abs(mp.left) + Math.abs(mp.right) > Number.MAX_SAFE_INTEGER) {
    midX = Number((BigInt(mp.left) + BigInt(mp.right)) / B2);
    midY = Number((BigInt(mp.top) + BigInt(mp.bottom)) / B2);
  } else {
    midX = Math.round((mp.left + mp.right) / 2);
    midY = Math.round((mp.top + mp.bottom) / 2);
  }
  const midPt = { x: midX, y: midY };
  return icPointInPolygon(midPt, path2) !== PointInPolygonResult.IsOutside;
}
var InternalClipper = {
  MaxInt64: IC_MaxInt64,
  MaxCoord: IC_MaxCoord,
  max_coord: IC_MaxCoord,
  min_coord: -IC_MaxCoord,
  Invalid64: IC_Invalid64,
  floatingPointTolerance: IC_floatingPointTolerance,
  defaultMinimumEdgeLength: IC_defaultMinimumEdgeLength,
  maxCoordForSafeAreaProduct: IC_maxCoordForSafeAreaProduct,
  maxCoordForSafeCrossSq: IC_maxCoordForSafeCrossSq,
  maxSafeCoordinateForScale,
  checkSafeScaleValue,
  ensureSafeInteger,
  crossProduct,
  crossProductSign,
  checkPrecision,
  isAlmostZero,
  triSign,
  multiplyUInt64,
  productsAreEqual,
  isCollinear,
  dotProduct,
  dotProductSign,
  area: icArea,
  crossProductD,
  dotProductD,
  roundToEven,
  checkCastInt64,
  getLineIntersectPt,
  getLineIntersectPtD,
  segsIntersect,
  getBounds: icGetBounds,
  getClosestPtOnSegment,
  pointInPolygon: icPointInPolygon,
  path2ContainsPath1
};
var Point64Utils = {
  create(x = 0, y = 0, z = 0) {
    return { x: Math.round(x), y: Math.round(y), z };
  },
  fromPointD(pt) {
    InternalClipper.ensureSafeInteger(pt.x, "Point64Utils.fromPointD");
    InternalClipper.ensureSafeInteger(pt.y, "Point64Utils.fromPointD");
    return { x: Math.round(pt.x), y: Math.round(pt.y), z: pt.z || 0 };
  },
  scale(pt, scale2) {
    return {
      x: Math.round(pt.x * scale2),
      y: Math.round(pt.y * scale2),
      z: pt.z || 0
    };
  },
  equals(a, b) {
    return a.x === b.x && a.y === b.y;
  },
  add(a, b) {
    if (Number.isSafeInteger(a.x) && Number.isSafeInteger(b.x) && Number.isSafeInteger(a.y) && Number.isSafeInteger(b.y)) {
      const sumX = a.x + b.x;
      const sumY = a.y + b.y;
      if (Number.isSafeInteger(sumX) && Number.isSafeInteger(sumY)) {
        return { x: sumX, y: sumY, z: 0 };
      }
      return {
        x: Number(BigInt(a.x) + BigInt(b.x)),
        y: Number(BigInt(a.y) + BigInt(b.y)),
        z: 0
      };
    }
    return { x: a.x + b.x, y: a.y + b.y, z: 0 };
  },
  subtract(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: 0 };
  },
  toString(pt) {
    if (pt.z !== void 0 && pt.z !== 0) {
      return `${pt.x},${pt.y},${pt.z} `;
    }
    return `${pt.x},${pt.y} `;
  }
};
var PointDUtils = {
  create(x = 0, y = 0, z = 0) {
    return { x, y, z };
  },
  fromPoint64(pt) {
    return { x: pt.x, y: pt.y, z: pt.z || 0 };
  },
  scale(pt, scale2) {
    return { x: pt.x * scale2, y: pt.y * scale2, z: pt.z || 0 };
  },
  equals(a, b) {
    return InternalClipper.isAlmostZero(a.x - b.x) && InternalClipper.isAlmostZero(a.y - b.y);
  },
  negate(pt) {
    pt.x = -pt.x;
    pt.y = -pt.y;
  },
  toString(pt, precision = 2) {
    if (pt.z !== void 0 && pt.z !== 0) {
      return `${pt.x.toFixed(precision)},${pt.y.toFixed(precision)},${pt.z}`;
    }
    return `${pt.x.toFixed(precision)},${pt.y.toFixed(precision)}`;
  }
};
var Rect64Utils = {
  create(l = 0, t = 0, r = 0, b = 0) {
    return { left: l, top: t, right: r, bottom: b };
  },
  createInvalid() {
    return {
      left: Number.MAX_SAFE_INTEGER,
      top: Number.MAX_SAFE_INTEGER,
      right: Number.MIN_SAFE_INTEGER,
      bottom: Number.MIN_SAFE_INTEGER
    };
  },
  width(rect) {
    return rect.right - rect.left;
  },
  height(rect) {
    return rect.bottom - rect.top;
  },
  isEmpty(rect) {
    return rect.bottom <= rect.top || rect.right <= rect.left;
  },
  isValid(rect) {
    return rect.left < Number.MAX_SAFE_INTEGER;
  },
  midPoint(rect) {
    if (Number.isSafeInteger(rect.left) && Number.isSafeInteger(rect.right) && Math.abs(rect.left) + Math.abs(rect.right) > Number.MAX_SAFE_INTEGER) {
      const midX = Number((BigInt(rect.left) + BigInt(rect.right)) / B2);
      const midY = Number((BigInt(rect.top) + BigInt(rect.bottom)) / B2);
      return { x: midX, y: midY };
    }
    return {
      x: Math.round((rect.left + rect.right) / 2),
      y: Math.round((rect.top + rect.bottom) / 2)
    };
  },
  contains(rect, pt) {
    return pt.x > rect.left && pt.x < rect.right && pt.y > rect.top && pt.y < rect.bottom;
  },
  containsRect(rect, rec) {
    return rec.left >= rect.left && rec.right <= rect.right && rec.top >= rect.top && rec.bottom <= rect.bottom;
  },
  intersects(rect, rec) {
    return Math.max(rect.left, rec.left) <= Math.min(rect.right, rec.right) && Math.max(rect.top, rec.top) <= Math.min(rect.bottom, rec.bottom);
  },
  asPath(rect) {
    return [
      { x: rect.left, y: rect.top, z: 0 },
      { x: rect.right, y: rect.top, z: 0 },
      { x: rect.right, y: rect.bottom, z: 0 },
      { x: rect.left, y: rect.bottom, z: 0 }
    ];
  }
};
var RectDUtils = {
  create(l = 0, t = 0, r = 0, b = 0) {
    return { left: l, top: t, right: r, bottom: b };
  },
  createInvalid() {
    return {
      left: Number.MAX_VALUE,
      top: Number.MAX_VALUE,
      right: -Number.MAX_VALUE,
      bottom: -Number.MAX_VALUE
    };
  },
  width(rect) {
    return rect.right - rect.left;
  },
  height(rect) {
    return rect.bottom - rect.top;
  },
  isEmpty(rect) {
    return rect.bottom <= rect.top || rect.right <= rect.left;
  },
  midPoint(rect) {
    return {
      x: (rect.left + rect.right) / 2,
      y: (rect.top + rect.bottom) / 2
    };
  },
  contains(rect, pt) {
    return pt.x > rect.left && pt.x < rect.right && pt.y > rect.top && pt.y < rect.bottom;
  },
  containsRect(rect, rec) {
    return rec.left >= rect.left && rec.right <= rect.right && rec.top >= rect.top && rec.bottom <= rect.bottom;
  },
  intersects(rect, rec) {
    return Math.max(rect.left, rec.left) < Math.min(rect.right, rec.right) && Math.max(rect.top, rec.top) < Math.min(rect.bottom, rec.bottom);
  },
  asPath(rect) {
    return [
      { x: rect.left, y: rect.top, z: 0 },
      { x: rect.right, y: rect.top, z: 0 },
      { x: rect.right, y: rect.bottom, z: 0 },
      { x: rect.left, y: rect.bottom, z: 0 }
    ];
  }
};
var InvalidRect64 = Object.freeze(Rect64Utils.createInvalid());
var InvalidRectD = Object.freeze(RectDUtils.createInvalid());

// node_modules/.pnpm/clipper2-ts@2.0.1-18/node_modules/clipper2-ts/dist/Engine.js
var B02 = BigInt(0);
var B22 = BigInt(2);
var B42 = BigInt(4);
var VertexFlags;
(function(VertexFlags2) {
  VertexFlags2[VertexFlags2["None"] = 0] = "None";
  VertexFlags2[VertexFlags2["OpenStart"] = 1] = "OpenStart";
  VertexFlags2[VertexFlags2["OpenEnd"] = 2] = "OpenEnd";
  VertexFlags2[VertexFlags2["LocalMax"] = 4] = "LocalMax";
  VertexFlags2[VertexFlags2["LocalMin"] = 8] = "LocalMin";
})(VertexFlags || (VertexFlags = {}));
var ScanlineHeap = class {
  data = [];
  push(value) {
    this.data.push(value);
    this.siftUp(this.data.length - 1);
  }
  pop() {
    if (this.data.length === 0)
      return null;
    const max = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      this.siftDown(0);
    }
    return max;
  }
  clear() {
    this.data.length = 0;
  }
  // Hole-sift: lift the value once, shift parents/children, then place.
  // Avoids temporary array allocation from destructuring swap on every step.
  siftUp(index) {
    const val = this.data[index];
    while (index > 0) {
      const parent = index - 1 >> 1;
      if (this.data[parent] >= val)
        break;
      this.data[index] = this.data[parent];
      index = parent;
    }
    this.data[index] = val;
  }
  siftDown(index) {
    const length = this.data.length;
    const val = this.data[index];
    while (true) {
      const left = (index << 1) + 1;
      if (left >= length)
        break;
      const right = left + 1;
      let child = left;
      if (right < length && this.data[right] > this.data[left])
        child = right;
      if (this.data[child] <= val)
        break;
      this.data[index] = this.data[child];
      index = child;
    }
    this.data[index] = val;
  }
};
var Vertex = class {
  pt;
  next = null;
  prev = null;
  flags;
  constructor(pt, flags, prev) {
    this.pt = pt;
    this.flags = flags;
    this.prev = prev;
  }
};
var LocalMinima = class {
  vertex;
  polytype;
  isOpen;
  constructor(vertex, polytype, isOpen = false) {
    this.vertex = vertex;
    this.polytype = polytype;
    this.isOpen = isOpen;
  }
  equals(other) {
    return other !== null && this.vertex === other.vertex;
  }
};
function createIntersectNode(pt, edge1, edge2) {
  return { pt, edge1, edge2 };
}
var OutPt = class {
  pt;
  next;
  prev;
  outrec;
  horz;
  constructor(pt, outrec) {
    this.pt = pt;
    this.outrec = outrec;
    this.next = this;
    this.prev = this;
    this.horz = null;
  }
};
var JoinWith;
(function(JoinWith2) {
  JoinWith2[JoinWith2["None"] = 0] = "None";
  JoinWith2[JoinWith2["Left"] = 1] = "Left";
  JoinWith2[JoinWith2["Right"] = 2] = "Right";
})(JoinWith || (JoinWith = {}));
var HorzPosition;
(function(HorzPosition2) {
  HorzPosition2[HorzPosition2["Bottom"] = 0] = "Bottom";
  HorzPosition2[HorzPosition2["Middle"] = 1] = "Middle";
  HorzPosition2[HorzPosition2["Top"] = 2] = "Top";
})(HorzPosition || (HorzPosition = {}));
var OutRec = class {
  idx = 0;
  owner = null;
  frontEdge = null;
  backEdge = null;
  pts = null;
  polypath = null;
  bounds = { left: 0, top: 0, right: 0, bottom: 0 };
  path = [];
  isOpen = false;
  splits = null;
  recursiveSplit = null;
};
var HorzSegment = class {
  leftOp;
  rightOp;
  leftToRight;
  constructor(op) {
    this.leftOp = op;
    this.rightOp = null;
    this.leftToRight = true;
  }
};
var HorzJoin = class {
  op1;
  op2;
  constructor(ltor, rtol) {
    this.op1 = ltor;
    this.op2 = rtol;
  }
};
function compareHorzSegments(hs1, hs2) {
  if (hs1.rightOp === null) {
    return hs2.rightOp === null ? 0 : 1;
  }
  if (hs2.rightOp === null)
    return -1;
  return hs1.leftOp.pt.x - hs2.leftOp.pt.x;
}
function compareIntersectNodes(a, b) {
  if (a.pt.y !== b.pt.y)
    return a.pt.y > b.pt.y ? -1 : 1;
  if (a.pt.x !== b.pt.x)
    return a.pt.x < b.pt.x ? -1 : 1;
  if (a.edge1.curX !== b.edge1.curX)
    return a.edge1.curX < b.edge1.curX ? -1 : 1;
  return a.edge2.curX < b.edge2.curX ? -1 : a.edge2.curX > b.edge2.curX ? 1 : 0;
}
var Active = class {
  bot = { x: 0, y: 0 };
  top = { x: 0, y: 0 };
  curX = 0;
  // current (updated at every new scanline) - keep as number but ensure integer precision
  dx = 0;
  windDx = 0;
  // 1 or -1 depending on winding direction
  windCount = 0;
  windCount2 = 0;
  // winding count of the opposite polytype
  outrec = null;
  // AEL: 'active edge list' (Vatti's AET - active edge table)
  //     a linked list of all edges (from left to right) that are present
  //     (or 'active') within the current scanbeam (a horizontal 'beam' that
  //     sweeps from bottom to top over the paths in the clipping operation).
  prevInAEL = null;
  nextInAEL = null;
  // SEL: 'sorted edge list' (Vatti's ST - sorted table)
  //     linked list used when sorting edges into their new positions at the
  //     top of scanbeams, but also (re)used to process horizontals.
  prevInSEL = null;
  nextInSEL = null;
  jump = null;
  vertexTop = null;
  localMin = null;
  // the bottom of an edge 'bound' (also Vatti)
  isLeftBound = false;
  joinWith = JoinWith.None;
};
var ClipperEngine = {
  addLocMin(vert, polytype, isOpen, minimaList) {
    if ((vert.flags & VertexFlags.LocalMin) !== VertexFlags.None)
      return;
    vert.flags |= VertexFlags.LocalMin;
    const lm = new LocalMinima(vert, polytype, isOpen);
    minimaList.push(lm);
  },
  addPathsToVertexList(paths, polytype, isOpen, minimaList, vertexList) {
    for (let i = 0, len = paths.length; i < len; i++) {
      const path = paths[i];
      let v0 = null;
      let prevV = null;
      let prevPt = null;
      for (let j = 0, len2 = path.length; j < len2; j++) {
        const pt = path[j];
        if (v0 === null) {
          v0 = new Vertex(pt, VertexFlags.None, null);
          vertexList.push(v0);
          prevV = v0;
          prevPt = pt;
        } else if (!(prevPt.x === pt.x && prevPt.y === pt.y)) {
          const currV2 = new Vertex(pt, VertexFlags.None, prevV);
          prevV.next = currV2;
          prevV = currV2;
          prevPt = pt;
        }
      }
      if (prevV?.prev == null)
        continue;
      if (!isOpen && prevV.pt.x === v0.pt.x && prevV.pt.y === v0.pt.y)
        prevV = prevV.prev;
      prevV.next = v0;
      v0.prev = prevV;
      if (!isOpen && prevV.next === prevV)
        continue;
      let goingUp;
      if (isOpen) {
        let currV2 = v0.next;
        while (currV2 !== v0 && currV2.pt.y === v0.pt.y)
          currV2 = currV2.next;
        goingUp = currV2.pt.y <= v0.pt.y;
        if (goingUp) {
          v0.flags = VertexFlags.OpenStart;
          ClipperEngine.addLocMin(v0, polytype, true, minimaList);
        } else {
          v0.flags = VertexFlags.OpenStart | VertexFlags.LocalMax;
        }
      } else {
        prevV = v0.prev;
        while (prevV !== v0 && prevV.pt.y === v0.pt.y)
          prevV = prevV.prev;
        if (prevV === v0)
          continue;
        goingUp = prevV.pt.y > v0.pt.y;
      }
      const goingUp0 = goingUp;
      prevV = v0;
      let currV = v0.next;
      while (currV !== v0) {
        if (currV.pt.y > prevV.pt.y && goingUp) {
          prevV.flags |= VertexFlags.LocalMax;
          goingUp = false;
        } else if (currV.pt.y < prevV.pt.y && !goingUp) {
          goingUp = true;
          ClipperEngine.addLocMin(prevV, polytype, isOpen, minimaList);
        }
        prevV = currV;
        currV = currV.next;
      }
      if (isOpen) {
        prevV.flags |= VertexFlags.OpenEnd;
        if (goingUp)
          prevV.flags |= VertexFlags.LocalMax;
        else
          ClipperEngine.addLocMin(prevV, polytype, isOpen, minimaList);
      } else if (goingUp !== goingUp0) {
        if (goingUp0)
          ClipperEngine.addLocMin(prevV, polytype, false, minimaList);
        else
          prevV.flags |= VertexFlags.LocalMax;
      }
    }
  }
};
var PolyPathBase = class {
  parent;
  children = [];
  constructor(parent = null) {
    this.parent = parent;
  }
  get isHole() {
    return this.getIsHole();
  }
  getLevel() {
    let result = 0;
    let pp = this.parent;
    while (pp !== null) {
      ++result;
      pp = pp.parent;
    }
    return result;
  }
  get level() {
    return this.getLevel();
  }
  getIsHole() {
    const lvl = this.getLevel();
    return lvl !== 0 && (lvl & 1) === 0;
  }
  get count() {
    return this.children.length;
  }
  clear() {
    this.children.length = 0;
  }
  toStringInternal(idx, level) {
    let result = "";
    const padding = "  ".repeat(level);
    const plural = this.children.length === 1 ? "" : "s";
    if ((level & 1) === 0) {
      result += `${padding}+- hole (${idx}) contains ${this.children.length} nested polygon${plural}.
`;
    } else {
      result += `${padding}+- polygon (${idx}) contains ${this.children.length} hole${plural}.
`;
    }
    for (let i = 0; i < this.count; i++) {
      if (this.children[i].count > 0) {
        result += this.children[i].toStringInternal(i, level + 1);
      }
    }
    return result;
  }
  toString() {
    if (this.level > 0)
      return "";
    const plural = this.children.length === 1 ? "" : "s";
    let result = `Polytree with ${this.children.length} polygon${plural}.
`;
    for (let i = 0; i < this.count; i++) {
      if (this.children[i].count > 0) {
        result += this.children[i].toStringInternal(i, 1);
      }
    }
    return result + "\n";
  }
};
var PolyPathD = class _PolyPathD extends PolyPathBase {
  scale = 1;
  polygon = null;
  constructor(parent = null) {
    super(parent);
  }
  get poly() {
    return this.polygon;
  }
  addChild(p) {
    const newChild = new _PolyPathD(this);
    newChild.scale = this.scale;
    newChild.polygon = Clipper.scalePathD(p, 1 / this.scale);
    this.children.push(newChild);
    return newChild;
  }
  addChildD(p) {
    const newChild = new _PolyPathD(this);
    newChild.scale = this.scale;
    newChild.polygon = p;
    this.children.push(newChild);
    return newChild;
  }
  child(index) {
    if (index < 0 || index >= this.children.length) {
      throw new Error("Index out of range");
    }
    return this.children[index];
  }
  area() {
    let result = this.polygon === null ? 0 : Clipper.areaD(this.polygon);
    for (const child of this.children) {
      result += child.area();
    }
    return result;
  }
};
var PolyTreeD = class extends PolyPathD {
  get scaleValue() {
    return this.scale;
  }
};
var ClipperBase = class _ClipperBase {
  // When there are no open paths, a lot of open-path branching becomes dead code.
  // We set this per execute to allow fast short-circuiting in hot helpers.
  static openPathsEnabled = true;
  cliptype = ClipType.NoClip;
  fillrule = FillRule.EvenOdd;
  actives = null;
  sel = null;
  minimaList = [];
  intersectList = [];
  vertexList = [];
  outrecList = [];
  scanlineHeap = new ScanlineHeap();
  scanlineSet = /* @__PURE__ */ new Set();
  // For very small inputs, a heap + set can cost more than it saves.
  // Use an array-based scanline mode initially, and upgrade to heap+set
  // automatically if the scanline list grows beyond a threshold.
  scanlineArr = [];
  useScanlineArray = false;
  horzSegList = [];
  horzJoinList = [];
  currentLocMin = 0;
  currentBotY = 0;
  // True when every active edge's curX already equals topX(edge, topY) for the
  // scanbeam top being processed (set by buildIntersectList when the SEL scan
  // finds no inversions, i.e. no intersections; consumed by doTopOfScanbeam).
  curXValidAtTop = false;
  isSortedMinimaList = false;
  hasOpenPaths = false;
  usingPolytree = false;
  succeeded = false;
  // Cache Z callback for the duration of an execute to avoid repeated virtual calls
  // to getZCallback() in hot paths.
  zCallbackInternal = void 0;
  preserveCollinear = true;
  reverseSolution = false;
  constructor() {
  }
  // Z-coordinate callback support
  // Override in subclasses (Clipper64/ClipperD) to provide callback
  getZCallback() {
    return void 0;
  }
  xyEqual(pt1, pt2) {
    return pt1.x === pt2.x && pt1.y === pt2.y;
  }
  setZ(ae1, ae2, intersectPt) {
    const zCallback = this.zCallbackInternal;
    if (!zCallback)
      return;
    if (_ClipperBase.getPolyType(ae1) === PathType.Subject) {
      if (this.xyEqual(intersectPt, ae1.bot)) {
        intersectPt.z = ae1.bot.z ?? 0;
      } else if (this.xyEqual(intersectPt, ae1.top)) {
        intersectPt.z = ae1.top.z ?? 0;
      } else if (this.xyEqual(intersectPt, ae2.bot)) {
        intersectPt.z = ae2.bot.z ?? 0;
      } else if (this.xyEqual(intersectPt, ae2.top)) {
        intersectPt.z = ae2.top.z ?? 0;
      } else {
        intersectPt.z = 0;
      }
      zCallback(ae1.bot, ae1.top, ae2.bot, ae2.top, intersectPt);
    } else {
      if (this.xyEqual(intersectPt, ae2.bot)) {
        intersectPt.z = ae2.bot.z ?? 0;
      } else if (this.xyEqual(intersectPt, ae2.top)) {
        intersectPt.z = ae2.top.z ?? 0;
      } else if (this.xyEqual(intersectPt, ae1.bot)) {
        intersectPt.z = ae1.bot.z ?? 0;
      } else if (this.xyEqual(intersectPt, ae1.top)) {
        intersectPt.z = ae1.top.z ?? 0;
      } else {
        intersectPt.z = 0;
      }
      zCallback(ae2.bot, ae2.top, ae1.bot, ae1.top, intersectPt);
    }
  }
  // Helper functions
  static isOdd(val) {
    return (val & 1) !== 0;
  }
  static isHotEdge(ae) {
    return ae.outrec != null;
  }
  static isOpen(ae) {
    return _ClipperBase.openPathsEnabled && ae.localMin.isOpen;
  }
  static isOpenEnd(ae) {
    return _ClipperBase.openPathsEnabled && ae.localMin.isOpen && _ClipperBase.isOpenEndVertex(ae.vertexTop);
  }
  static isOpenEndVertex(v2) {
    return (v2.flags & (VertexFlags.OpenStart | VertexFlags.OpenEnd)) !== VertexFlags.None;
  }
  static getPrevHotEdge(ae) {
    let prev = ae.prevInAEL;
    if (!_ClipperBase.openPathsEnabled) {
      while (prev !== null && !_ClipperBase.isHotEdge(prev)) {
        prev = prev.prevInAEL;
      }
      return prev;
    }
    while (prev !== null && (prev.localMin.isOpen || !_ClipperBase.isHotEdge(prev))) {
      prev = prev.prevInAEL;
    }
    return prev;
  }
  static isFront(ae) {
    return ae === ae.outrec.frontEdge;
  }
  /*******************************************************************************
  *  Dx:                             0(90deg)                                    *
  *                                  |                                           *
  *               +inf (180deg) <--- o ---> -inf (0deg)                          *
  *******************************************************************************/
  static getDx(pt1, pt2) {
    const dy = pt2.y - pt1.y;
    if (dy !== 0) {
      return (pt2.x - pt1.x) / dy;
    }
    return pt2.x > pt1.x ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  }
  static topX(ae, currentY) {
    if (currentY === ae.top.y || ae.top.x === ae.bot.x)
      return ae.top.x;
    if (currentY === ae.bot.y)
      return ae.bot.x;
    return InternalClipper.roundToEven(ae.bot.x + ae.dx * (currentY - ae.bot.y));
  }
  static isHorizontal(ae) {
    return ae.dx === Number.NEGATIVE_INFINITY || ae.dx === Number.POSITIVE_INFINITY;
  }
  static isHeadingRightHorz(ae) {
    return ae.dx === Number.NEGATIVE_INFINITY;
  }
  static isHeadingLeftHorz(ae) {
    return ae.dx === Number.POSITIVE_INFINITY;
  }
  static getPolyType(ae) {
    return ae.localMin.polytype;
  }
  static isSamePolyType(ae1, ae2) {
    return ae1.localMin.polytype === ae2.localMin.polytype;
  }
  static setDx(ae) {
    ae.dx = _ClipperBase.getDx(ae.bot, ae.top);
  }
  static nextVertex(ae) {
    return ae.windDx > 0 ? ae.vertexTop.next : ae.vertexTop.prev;
  }
  static prevPrevVertex(ae) {
    return ae.windDx > 0 ? ae.vertexTop.prev.prev : ae.vertexTop.next.next;
  }
  static isMaximaVertex(v2) {
    return (v2.flags & VertexFlags.LocalMax) !== VertexFlags.None;
  }
  static isMaximaEdge(ae) {
    return (ae.vertexTop.flags & VertexFlags.LocalMax) !== VertexFlags.None;
  }
  static getMaximaPair(ae) {
    let ae2 = ae.nextInAEL;
    while (ae2 !== null) {
      if (ae2.vertexTop === ae.vertexTop)
        return ae2;
      ae2 = ae2.nextInAEL;
    }
    return null;
  }
  // optimization (not in C# reference): fast bounding box overlap check for segment intersection
  boundingBoxesOverlap(p1, p2, p3, p4) {
    const min1x = p1.x < p2.x ? p1.x : p2.x;
    const max2x = p3.x > p4.x ? p3.x : p4.x;
    if (max2x < min1x)
      return false;
    const max1x = p1.x > p2.x ? p1.x : p2.x;
    const min2x = p3.x < p4.x ? p3.x : p4.x;
    if (max1x < min2x)
      return false;
    const min1y = p1.y < p2.y ? p1.y : p2.y;
    const max2y = p3.y > p4.y ? p3.y : p4.y;
    if (max2y < min1y)
      return false;
    const max1y = p1.y > p2.y ? p1.y : p2.y;
    const min2y = p3.y < p4.y ? p3.y : p4.y;
    return max1y >= min2y;
  }
  clearSolutionOnly() {
    while (this.actives !== null)
      this.deleteFromAEL(this.actives);
    this.scanlineHeap.clear();
    this.scanlineSet.clear();
    this.scanlineArr.length = 0;
    this.disposeIntersectNodes();
    this.outrecList.length = 0;
    this.horzSegList.length = 0;
    this.horzJoinList.length = 0;
  }
  clear() {
    this.clearSolutionOnly();
    this.minimaList.length = 0;
    this.vertexList.length = 0;
    this.currentLocMin = 0;
    this.isSortedMinimaList = false;
    this.hasOpenPaths = false;
  }
  reset() {
    if (!this.isSortedMinimaList) {
      this.minimaList.sort((a, b) => b.vertex.pt.y - a.vertex.pt.y);
      this.isSortedMinimaList = true;
    }
    this.scanlineHeap.clear();
    this.scanlineSet.clear();
    this.scanlineArr.length = 0;
    this.useScanlineArray = this.minimaList.length <= 16;
    for (let i = this.minimaList.length - 1; i >= 0; i--) {
      this.insertScanline(this.minimaList[i].vertex.pt.y);
    }
    this.currentBotY = 0;
    this.currentLocMin = 0;
    this.actives = null;
    this.sel = null;
    this.curXValidAtTop = false;
    this.succeeded = true;
  }
  upgradeScanlineStructureFromArray() {
    const arr = this.scanlineArr;
    for (let i = 0, len = arr.length; i < len; i++) {
      const y = arr[i];
      this.scanlineSet.add(y);
      this.scanlineHeap.push(y);
    }
    arr.length = 0;
    this.useScanlineArray = false;
  }
  insertScanline(y) {
    if (this.useScanlineArray) {
      const arr = this.scanlineArr;
      for (let i = 0, len = arr.length; i < len; i++) {
        if (arr[i] === y)
          return;
      }
      arr.push(y);
      if (arr.length > 64)
        this.upgradeScanlineStructureFromArray();
      return;
    }
    if (this.scanlineSet.has(y))
      return;
    this.scanlineSet.add(y);
    this.scanlineHeap.push(y);
  }
  // Returns the next scanline Y value, or null if empty.
  // Avoids allocating a wrapper object on every call in the main sweep loop.
  popScanline() {
    if (this.useScanlineArray) {
      const arr = this.scanlineArr;
      const len = arr.length;
      if (len === 0)
        return null;
      let bestIdx = 0;
      let bestY = arr[0];
      for (let i = 1; i < len; i++) {
        const v2 = arr[i];
        if (v2 > bestY) {
          bestY = v2;
          bestIdx = i;
        }
      }
      arr[bestIdx] = arr[len - 1];
      arr.pop();
      return bestY;
    }
    const y = this.scanlineHeap.pop();
    if (y === null)
      return null;
    this.scanlineSet.delete(y);
    return y;
  }
  hasLocMinAtY(y) {
    return this.currentLocMin < this.minimaList.length && this.minimaList[this.currentLocMin].vertex.pt.y === y;
  }
  popLocalMinima() {
    return this.minimaList[this.currentLocMin++];
  }
  addPath(path, polytype, isOpen = false) {
    const tmp = [path];
    this.addPaths(tmp, polytype, isOpen);
  }
  addPaths(paths, polytype, isOpen = false) {
    if (isOpen)
      this.hasOpenPaths = true;
    this.isSortedMinimaList = false;
    ClipperEngine.addPathsToVertexList(paths, polytype, isOpen, this.minimaList, this.vertexList);
  }
  addReuseableData(reuseableData) {
    if (reuseableData["minimaList"].length === 0)
      return;
    this.isSortedMinimaList = false;
    for (const lm of reuseableData["minimaList"]) {
      this.minimaList.push(new LocalMinima(lm.vertex, lm.polytype, lm.isOpen));
      if (lm.isOpen)
        this.hasOpenPaths = true;
    }
  }
  deleteFromAEL(ae) {
    const prev = ae.prevInAEL;
    const next = ae.nextInAEL;
    if (prev === null && next === null && ae !== this.actives)
      return;
    if (prev !== null) {
      prev.nextInAEL = next;
    } else {
      this.actives = next;
    }
    if (next !== null)
      next.prevInAEL = prev;
  }
  getBounds() {
    const bounds = {
      left: Number.MAX_SAFE_INTEGER,
      top: Number.MAX_SAFE_INTEGER,
      right: Number.MIN_SAFE_INTEGER,
      bottom: Number.MIN_SAFE_INTEGER
    };
    for (const t of this.vertexList) {
      let v2 = t;
      do {
        if (v2.pt.x < bounds.left)
          bounds.left = v2.pt.x;
        if (v2.pt.x > bounds.right)
          bounds.right = v2.pt.x;
        if (v2.pt.y < bounds.top)
          bounds.top = v2.pt.y;
        if (v2.pt.y > bounds.bottom)
          bounds.bottom = v2.pt.y;
        v2 = v2.next;
      } while (v2 !== t);
    }
    return Rect64Utils.isEmpty(bounds) ? { left: 0, top: 0, right: 0, bottom: 0 } : bounds;
  }
  executeInternal(ct, fillRule) {
    if (ct === ClipType.NoClip)
      return;
    _ClipperBase.openPathsEnabled = this.hasOpenPaths;
    this.zCallbackInternal = this.getZCallback();
    this.fillrule = fillRule;
    this.cliptype = ct;
    this.reset();
    let y = this.popScanline();
    if (y === null)
      return;
    while (this.succeeded) {
      this.insertLocalMinimaIntoAEL(y);
      let ae;
      while ((ae = this.popHorz()) !== null)
        this.doHorizontal(ae);
      if (this.horzSegList.length > 0) {
        this.convertHorzSegsToJoins();
        this.horzSegList.length = 0;
      }
      this.currentBotY = y;
      const nextY = this.popScanline();
      if (nextY === null)
        break;
      y = nextY;
      this.doIntersections(y);
      this.doTopOfScanbeam(y);
      while ((ae = this.popHorz()) !== null)
        this.doHorizontal(ae);
    }
    if (this.succeeded)
      this.processHorzJoins();
  }
  insertLocalMinimaIntoAEL(botY) {
    while (this.hasLocMinAtY(botY)) {
      const localMinima = this.popLocalMinima();
      let leftBound;
      if ((localMinima.vertex.flags & VertexFlags.OpenStart) !== VertexFlags.None) {
        leftBound = null;
      } else {
        leftBound = new Active();
        leftBound.bot = localMinima.vertex.pt;
        leftBound.curX = localMinima.vertex.pt.x;
        leftBound.windDx = -1;
        leftBound.vertexTop = localMinima.vertex.prev;
        leftBound.top = localMinima.vertex.prev.pt;
        leftBound.outrec = null;
        leftBound.localMin = localMinima;
        _ClipperBase.setDx(leftBound);
      }
      let rightBound;
      if ((localMinima.vertex.flags & VertexFlags.OpenEnd) !== VertexFlags.None) {
        rightBound = null;
      } else {
        rightBound = new Active();
        rightBound.bot = localMinima.vertex.pt;
        rightBound.curX = localMinima.vertex.pt.x;
        rightBound.windDx = 1;
        rightBound.vertexTop = localMinima.vertex.next;
        rightBound.top = localMinima.vertex.next.pt;
        rightBound.outrec = null;
        rightBound.localMin = localMinima;
        _ClipperBase.setDx(rightBound);
      }
      if (leftBound !== null && rightBound !== null) {
        if (_ClipperBase.isHorizontal(leftBound)) {
          if (_ClipperBase.isHeadingRightHorz(leftBound)) {
            const tmp = leftBound;
            leftBound = rightBound;
            rightBound = tmp;
          }
        } else if (_ClipperBase.isHorizontal(rightBound)) {
          if (_ClipperBase.isHeadingLeftHorz(rightBound)) {
            const tmp = leftBound;
            leftBound = rightBound;
            rightBound = tmp;
          }
        } else if (leftBound.dx < rightBound.dx) {
          const tmp = leftBound;
          leftBound = rightBound;
          rightBound = tmp;
        }
      } else if (leftBound === null) {
        leftBound = rightBound;
        rightBound = null;
      }
      let contributing;
      leftBound.isLeftBound = true;
      this.insertLeftEdge(leftBound);
      if (!_ClipperBase.openPathsEnabled) {
        this.setWindCountForClosedPathEdge(leftBound);
        contributing = this.isContributingClosed(leftBound);
      } else if (_ClipperBase.isOpen(leftBound)) {
        this.setWindCountForOpenPathEdge(leftBound);
        contributing = this.isContributingOpen(leftBound);
      } else {
        this.setWindCountForClosedPathEdge(leftBound);
        contributing = this.isContributingClosed(leftBound);
      }
      if (rightBound !== null) {
        rightBound.windCount = leftBound.windCount;
        rightBound.windCount2 = leftBound.windCount2;
        this.insertRightEdge(leftBound, rightBound);
        if (contributing) {
          this.addLocalMinPoly(leftBound, rightBound, leftBound.bot, true);
          if (!_ClipperBase.isHorizontal(leftBound)) {
            this.checkJoinLeft(leftBound, leftBound.bot);
          }
        }
        while (rightBound.nextInAEL !== null && this.isValidAelOrder(rightBound.nextInAEL, rightBound)) {
          this.intersectEdges(rightBound, rightBound.nextInAEL, rightBound.bot);
          this.swapPositionsInAEL(rightBound, rightBound.nextInAEL);
        }
        if (_ClipperBase.isHorizontal(rightBound)) {
          this.pushHorz(rightBound);
        } else {
          this.checkJoinRight(rightBound, rightBound.bot);
          this.insertScanline(rightBound.top.y);
        }
      } else if (contributing && _ClipperBase.openPathsEnabled) {
        this.startOpenPath(leftBound, leftBound.bot);
      }
      if (_ClipperBase.isHorizontal(leftBound)) {
        this.pushHorz(leftBound);
      } else {
        this.insertScanline(leftBound.top.y);
      }
    }
  }
  pushHorz(ae) {
    ae.nextInSEL = this.sel;
    this.sel = ae;
  }
  popHorz() {
    const ae = this.sel;
    if (ae === null)
      return null;
    this.sel = this.sel.nextInSEL;
    return ae;
  }
  doHorizontal(horz) {
    if (!_ClipperBase.openPathsEnabled) {
      this.doHorizontalClosed(horz);
      return;
    }
    const horzIsOpen = _ClipperBase.isOpen(horz);
    const y = horz.bot.y;
    const vertexMax = horzIsOpen ? this.getCurrYMaximaVertexOpen(horz) : this.getCurrYMaximaVertex(horz);
    const { isLeftToRight, leftX, rightX } = this.resetHorzDirection(horz, vertexMax);
    let leftX2 = leftX;
    let rightX2 = rightX;
    if (_ClipperBase.isHotEdge(horz)) {
      const op = this.addOutPt(horz, { x: horz.curX, y });
      this.addToHorzSegList(op);
    }
    while (true) {
      let ae = isLeftToRight ? horz.nextInAEL : horz.prevInAEL;
      while (ae !== null) {
        if (ae.vertexTop === vertexMax) {
          if (_ClipperBase.isHotEdge(horz) && this.isJoined(ae))
            this.split(ae, ae.top);
          if (_ClipperBase.isHotEdge(horz)) {
            while (horz.vertexTop !== vertexMax) {
              this.addOutPt(horz, horz.top);
              this.updateEdgeIntoAEL(horz);
            }
            if (isLeftToRight) {
              this.addLocalMaxPoly(horz, ae, horz.top);
            } else {
              this.addLocalMaxPoly(ae, horz, horz.top);
            }
          }
          this.deleteFromAEL(ae);
          this.deleteFromAEL(horz);
          return;
        }
        if (vertexMax !== horz.vertexTop || _ClipperBase.isOpenEnd(horz)) {
          if (isLeftToRight && ae.curX > rightX2 || !isLeftToRight && ae.curX < leftX2)
            break;
          if (ae.curX === horz.top.x && !_ClipperBase.isHorizontal(ae)) {
            const pt2 = _ClipperBase.nextVertex(horz).pt;
            if (_ClipperBase.isOpen(ae) && !_ClipperBase.isSamePolyType(ae, horz) && !_ClipperBase.isHotEdge(ae)) {
              if (isLeftToRight && _ClipperBase.topX(ae, pt2.y) > pt2.x || !isLeftToRight && _ClipperBase.topX(ae, pt2.y) < pt2.x)
                break;
            } else if (isLeftToRight && _ClipperBase.topX(ae, pt2.y) >= pt2.x || !isLeftToRight && _ClipperBase.topX(ae, pt2.y) <= pt2.x)
              break;
          }
        }
        const pt = { x: ae.curX, y };
        if (isLeftToRight) {
          this.intersectEdges(horz, ae, pt);
          this.swapPositionsInAEL(horz, ae);
          this.checkJoinLeft(ae, pt);
          horz.curX = ae.curX;
          ae = horz.nextInAEL;
        } else {
          this.intersectEdges(ae, horz, pt);
          this.swapPositionsInAEL(ae, horz);
          this.checkJoinRight(ae, pt);
          horz.curX = ae.curX;
          ae = horz.prevInAEL;
        }
        if (_ClipperBase.isHotEdge(horz)) {
          this.addToHorzSegList(this.getLastOp(horz));
        }
      }
      if (horzIsOpen && _ClipperBase.isOpenEnd(horz)) {
        if (_ClipperBase.isHotEdge(horz)) {
          this.addOutPt(horz, horz.top);
          if (_ClipperBase.isFront(horz)) {
            horz.outrec.frontEdge = null;
          } else {
            horz.outrec.backEdge = null;
          }
          horz.outrec = null;
        }
        this.deleteFromAEL(horz);
        return;
      }
      if (_ClipperBase.nextVertex(horz).pt.y !== horz.top.y) {
        break;
      }
      if (_ClipperBase.isHotEdge(horz)) {
        this.addOutPt(horz, horz.top);
      }
      this.updateEdgeIntoAEL(horz);
      const resetResult = this.resetHorzDirection(horz, vertexMax);
      leftX2 = resetResult.leftX;
      rightX2 = resetResult.rightX;
    }
    if (_ClipperBase.isHotEdge(horz)) {
      const op = this.addOutPt(horz, horz.top);
      this.addToHorzSegList(op);
    }
    this.updateEdgeIntoAEL(horz);
  }
  // Closed-path-only horizontal processing (no open-path branching).
  doHorizontalClosed(horz) {
    const y = horz.bot.y;
    const vertexMax = this.getCurrYMaximaVertex(horz);
    const { isLeftToRight, leftX, rightX } = this.resetHorzDirection(horz, vertexMax);
    let leftX2 = leftX;
    let rightX2 = rightX;
    if (_ClipperBase.isHotEdge(horz)) {
      const op = this.addOutPt(horz, { x: horz.curX, y });
      this.addToHorzSegList(op);
    }
    while (true) {
      let ae = isLeftToRight ? horz.nextInAEL : horz.prevInAEL;
      while (ae !== null) {
        if (ae.vertexTop === vertexMax) {
          if (_ClipperBase.isHotEdge(horz) && this.isJoined(ae))
            this.split(ae, ae.top);
          if (_ClipperBase.isHotEdge(horz)) {
            while (horz.vertexTop !== vertexMax) {
              this.addOutPt(horz, horz.top);
              this.updateEdgeIntoAEL(horz);
            }
            if (isLeftToRight) {
              this.addLocalMaxPoly(horz, ae, horz.top);
            } else {
              this.addLocalMaxPoly(ae, horz, horz.top);
            }
          }
          this.deleteFromAEL(ae);
          this.deleteFromAEL(horz);
          return;
        }
        if (vertexMax !== horz.vertexTop) {
          if (isLeftToRight && ae.curX > rightX2 || !isLeftToRight && ae.curX < leftX2)
            break;
          if (ae.curX === horz.top.x && !_ClipperBase.isHorizontal(ae)) {
            const nextPt = _ClipperBase.nextVertex(horz).pt;
            const tx = _ClipperBase.topX(ae, nextPt.y);
            if (isLeftToRight && tx >= nextPt.x || !isLeftToRight && tx <= nextPt.x)
              break;
          }
        }
        const pt = { x: ae.curX, y };
        if (isLeftToRight) {
          this.intersectEdges(horz, ae, pt);
          this.swapPositionsInAEL(horz, ae);
          this.checkJoinLeft(ae, pt);
          horz.curX = ae.curX;
          ae = horz.nextInAEL;
        } else {
          this.intersectEdges(ae, horz, pt);
          this.swapPositionsInAEL(ae, horz);
          this.checkJoinRight(ae, pt);
          horz.curX = ae.curX;
          ae = horz.prevInAEL;
        }
        if (_ClipperBase.isHotEdge(horz)) {
          this.addToHorzSegList(this.getLastOp(horz));
        }
      }
      if (_ClipperBase.nextVertex(horz).pt.y !== horz.top.y) {
        break;
      }
      if (_ClipperBase.isHotEdge(horz)) {
        this.addOutPt(horz, horz.top);
      }
      this.updateEdgeIntoAEL(horz);
      const resetResult = this.resetHorzDirection(horz, vertexMax);
      leftX2 = resetResult.leftX;
      rightX2 = resetResult.rightX;
    }
    if (_ClipperBase.isHotEdge(horz)) {
      const op = this.addOutPt(horz, horz.top);
      this.addToHorzSegList(op);
    }
    this.updateEdgeIntoAEL(horz);
  }
  convertHorzSegsToJoins() {
    const list = this.horzSegList;
    let k = 0;
    for (let i = 0, len = list.length; i < len; i++) {
      const hs = list[i];
      if (this.updateHorzSegment(hs))
        list[k++] = hs;
    }
    if (k < 2)
      return;
    list.length = k;
    this.horzSegList.sort(compareHorzSegments);
    for (let i = 0; i < k - 1; i++) {
      const hs1 = this.horzSegList[i];
      for (let j = i + 1; j < k; j++) {
        const hs2 = this.horzSegList[j];
        if (hs2.leftOp.pt.x >= hs1.rightOp.pt.x || hs2.leftToRight === hs1.leftToRight || hs2.rightOp.pt.x <= hs1.leftOp.pt.x)
          continue;
        const currY = hs1.leftOp.pt.y;
        if (hs1.leftToRight) {
          while (hs1.leftOp.next.pt.y === currY && hs1.leftOp.next.pt.x <= hs2.leftOp.pt.x)
            hs1.leftOp = hs1.leftOp.next;
          while (hs2.leftOp.prev.pt.y === currY && hs2.leftOp.prev.pt.x <= hs1.leftOp.pt.x)
            hs2.leftOp = hs2.leftOp.prev;
          const join2 = new HorzJoin(this.duplicateOp(hs1.leftOp, true), this.duplicateOp(hs2.leftOp, false));
          this.horzJoinList.push(join2);
        } else {
          while (hs1.leftOp.prev.pt.y === currY && hs1.leftOp.prev.pt.x <= hs2.leftOp.pt.x)
            hs1.leftOp = hs1.leftOp.prev;
          while (hs2.leftOp.next.pt.y === currY && hs2.leftOp.next.pt.x <= hs1.leftOp.pt.x)
            hs2.leftOp = hs2.leftOp.next;
          const join2 = new HorzJoin(this.duplicateOp(hs2.leftOp, true), this.duplicateOp(hs1.leftOp, false));
          this.horzJoinList.push(join2);
        }
      }
    }
  }
  updateHorzSegment(hs) {
    const op = hs.leftOp;
    const outrec = this.getRealOutRec(op.outrec);
    const outrecHasEdges = outrec.frontEdge !== null;
    const currY = op.pt.y;
    let opP = op;
    let opN = op;
    if (outrecHasEdges) {
      const opA = outrec.pts;
      const opZ = opA.next;
      while (opP !== opZ && opP.prev.pt.y === currY)
        opP = opP.prev;
      while (opN !== opA && opN.next.pt.y === currY)
        opN = opN.next;
    } else {
      while (opP.prev !== opN && opP.prev.pt.y === currY)
        opP = opP.prev;
      while (opN.next !== opP && opN.next.pt.y === currY)
        opN = opN.next;
    }
    const result = this.setHorzSegHeadingForward(hs, opP, opN) && hs.leftOp.horz === null;
    if (result) {
      hs.leftOp.horz = hs;
    } else {
      hs.rightOp = null;
    }
    return result;
  }
  setHorzSegHeadingForward(hs, opP, opN) {
    if (opP.pt.x === opN.pt.x)
      return false;
    if (opP.pt.x < opN.pt.x) {
      hs.leftOp = opP;
      hs.rightOp = opN;
      hs.leftToRight = true;
    } else {
      hs.leftOp = opN;
      hs.rightOp = opP;
      hs.leftToRight = false;
    }
    return true;
  }
  duplicateOp(op, insertAfter) {
    const result = new OutPt(op.pt, op.outrec);
    if (insertAfter) {
      result.next = op.next;
      result.next.prev = result;
      result.prev = op;
      op.next = result;
    } else {
      result.prev = op.prev;
      result.prev.next = result;
      result.next = op;
      op.prev = result;
    }
    return result;
  }
  getRealOutRec(outRec) {
    while (outRec !== null && outRec.pts === null) {
      outRec = outRec.owner;
    }
    return outRec;
  }
  doIntersections(y) {
    if (this.buildIntersectList(y)) {
      this.processIntersectList();
      this.disposeIntersectNodes();
    }
  }
  doTopOfScanbeam(y) {
    const curXValid = this.curXValidAtTop;
    this.curXValidAtTop = false;
    this.sel = null;
    let ae = this.actives;
    while (ae !== null) {
      if (ae.top.y === y) {
        ae.curX = ae.top.x;
        if (_ClipperBase.isMaximaEdge(ae)) {
          ae = this.doMaxima(ae);
          continue;
        } else {
          if (_ClipperBase.isHotEdge(ae))
            this.addOutPt(ae, ae.top);
          this.updateEdgeIntoAEL(ae);
          if (_ClipperBase.isHorizontal(ae)) {
            this.pushHorz(ae);
          }
        }
      } else if (!curXValid) {
        ae.curX = _ClipperBase.topX(ae, y);
      }
      ae = ae.nextInAEL;
    }
  }
  processHorzJoins() {
    for (const j of this.horzJoinList) {
      const or1 = this.getRealOutRec(j.op1.outrec);
      const or2 = this.getRealOutRec(j.op2.outrec);
      const op1b = j.op1.next;
      const op2b = j.op2.prev;
      j.op1.next = j.op2;
      j.op2.prev = j.op1;
      op1b.prev = op2b;
      op2b.next = op1b;
      if (or1 === or2) {
        const or2New = this.newOutRec();
        or2New.pts = op1b;
        this.fixOutRecPts(or2New);
        if (or1.pts.outrec === or2New) {
          or1.pts = j.op1;
          or1.pts.outrec = or1;
        }
        if (this.usingPolytree) {
          if (this.path1InsidePath2(or1.pts, or2New.pts)) {
            [or2New.pts, or1.pts] = [or1.pts, or2New.pts];
            this.fixOutRecPts(or1);
            this.fixOutRecPts(or2New);
            or2New.owner = or1;
          } else if (this.path1InsidePath2(or2New.pts, or1.pts)) {
            or2New.owner = or1;
          } else {
            or2New.owner = or1.owner;
          }
          if (or1.splits === null)
            or1.splits = [];
          or1.splits.push(or2New.idx);
        } else {
          or2New.owner = or1;
        }
      } else {
        or2.pts = null;
        if (this.usingPolytree) {
          this.setOwner(or2, or1);
          this.moveSplits(or2, or1);
        } else {
          or2.owner = or1;
        }
      }
    }
  }
  fixOutRecPts(outrec) {
    let op = outrec.pts;
    do {
      op.outrec = outrec;
      op = op.next;
    } while (op !== outrec.pts);
  }
  path1InsidePath2(op1, op2) {
    let pip = PointInPolygonResult.IsOn;
    let op = op1;
    do {
      switch (this.pointInOpPolygon(op.pt, op2)) {
        case PointInPolygonResult.IsOutside:
          if (pip === PointInPolygonResult.IsOutside)
            return false;
          pip = PointInPolygonResult.IsOutside;
          break;
        case PointInPolygonResult.IsInside:
          if (pip === PointInPolygonResult.IsInside)
            return true;
          pip = PointInPolygonResult.IsInside;
          break;
        default:
          break;
      }
      op = op.next;
    } while (op !== op1);
    return InternalClipper.path2ContainsPath1(this.getCleanPath(op1), this.getCleanPath(op2));
  }
  pointInOpPolygon(pt, op) {
    if (op === op.next || op.prev === op.next) {
      return PointInPolygonResult.IsOutside;
    }
    let op2 = op;
    do {
      if (op.pt.y !== pt.y)
        break;
      op = op.next;
    } while (op !== op2);
    if (op.pt.y === pt.y)
      return PointInPolygonResult.IsOutside;
    let isAbove = op.pt.y < pt.y;
    const startingAbove = isAbove;
    let val = 0;
    op2 = op.next;
    while (op2 !== op) {
      if (isAbove) {
        while (op2 !== op && op2.pt.y < pt.y)
          op2 = op2.next;
      } else {
        while (op2 !== op && op2.pt.y > pt.y)
          op2 = op2.next;
      }
      if (op2 === op)
        break;
      if (op2.pt.y === pt.y) {
        if (op2.pt.x === pt.x || op2.pt.y === op2.prev.pt.y && pt.x < op2.prev.pt.x !== pt.x < op2.pt.x)
          return PointInPolygonResult.IsOn;
        op2 = op2.next;
        if (op2 === op)
          break;
        continue;
      }
      if (op2.pt.x <= pt.x || op2.prev.pt.x <= pt.x) {
        if (op2.prev.pt.x < pt.x && op2.pt.x < pt.x) {
          val = 1 - val;
        } else {
          const d = InternalClipper.crossProductSign(op2.prev.pt, op2.pt, pt);
          if (d === 0)
            return PointInPolygonResult.IsOn;
          if (d < 0 === isAbove)
            val = 1 - val;
        }
      }
      isAbove = !isAbove;
      op2 = op2.next;
    }
    if (isAbove === startingAbove)
      return val === 0 ? PointInPolygonResult.IsOutside : PointInPolygonResult.IsInside;
    {
      const d = InternalClipper.crossProductSign(op2.prev.pt, op2.pt, pt);
      if (d === 0)
        return PointInPolygonResult.IsOn;
      if (d < 0 === isAbove)
        val = 1 - val;
    }
    return val === 0 ? PointInPolygonResult.IsOutside : PointInPolygonResult.IsInside;
  }
  getCleanPath(op) {
    const result = [];
    let op2 = op;
    while (op2.next !== op && (op2.pt.x === op2.next.pt.x && op2.pt.x === op2.prev.pt.x || op2.pt.y === op2.next.pt.y && op2.pt.y === op2.prev.pt.y))
      op2 = op2.next;
    result.push(op2.pt);
    let prevOp = op2;
    op2 = op2.next;
    while (op2 !== op) {
      if ((op2.pt.x !== op2.next.pt.x || op2.pt.x !== prevOp.pt.x) && (op2.pt.y !== op2.next.pt.y || op2.pt.y !== prevOp.pt.y)) {
        result.push(op2.pt);
        prevOp = op2;
      }
      op2 = op2.next;
    }
    return result;
  }
  moveSplits(fromOr, toOr) {
    if (fromOr.splits === null)
      return;
    if (toOr.splits === null)
      toOr.splits = [];
    for (const i of fromOr.splits) {
      if (i !== toOr.idx) {
        toOr.splits.push(i);
      }
    }
    fromOr.splits = null;
  }
  buildIntersectList(topY) {
    if (this.actives?.nextInAEL === null)
      return false;
    if (!this.adjustCurrXAndCopyToSEL(topY)) {
      this.curXValidAtTop = true;
      return false;
    }
    let left = this.sel;
    while (left !== null && left.jump !== null) {
      let prevBase = null;
      while (left !== null && left.jump !== null) {
        let currBase = left;
        let right = left.jump;
        let lEnd = right;
        const rEnd = right?.jump || null;
        left.jump = rEnd;
        while (left !== lEnd && right !== rEnd) {
          if (right.curX < left.curX) {
            let tmp = right.prevInSEL;
            while (true) {
              this.addNewIntersectNode(tmp, right, topY);
              if (tmp === left)
                break;
              tmp = tmp.prevInSEL;
            }
            tmp = right;
            right = this.extractFromSEL(tmp);
            lEnd = right;
            if (left !== null)
              this.insert1Before2InSEL(tmp, left);
            if (left !== currBase)
              continue;
            currBase = tmp;
            currBase.jump = rEnd;
            if (prevBase === null) {
              this.sel = currBase;
            } else {
              prevBase.jump = currBase;
            }
          } else {
            left = left.nextInSEL;
          }
        }
        prevBase = currBase;
        left = rEnd;
      }
      left = this.sel;
    }
    return this.intersectList.length > 0;
  }
  processIntersectList() {
    this.intersectList.sort(compareIntersectNodes);
    for (let i = 0; i < this.intersectList.length; ++i) {
      if (!this.edgesAdjacentInAEL(this.intersectList[i])) {
        let j = i + 1;
        while (!this.edgesAdjacentInAEL(this.intersectList[j]))
          j++;
        [this.intersectList[j], this.intersectList[i]] = [this.intersectList[i], this.intersectList[j]];
      }
      const node = this.intersectList[i];
      this.intersectEdges(node.edge1, node.edge2, node.pt);
      this.swapPositionsInAEL(node.edge1, node.edge2);
      node.edge1.curX = node.pt.x;
      node.edge2.curX = node.pt.x;
      this.checkJoinLeft(node.edge2, node.pt, true);
      this.checkJoinRight(node.edge1, node.pt, true);
    }
  }
  edgesAdjacentInAEL(inode) {
    return inode.edge1.nextInAEL === inode.edge2 || inode.edge1.prevInAEL === inode.edge2;
  }
  // Returns true if any adjacent pair is inverted at topY (i.e. at least one
  // intersection exists within this scanbeam).
  adjustCurrXAndCopyToSEL(topY) {
    let ae = this.actives;
    this.sel = ae;
    let prevX = Number.NEGATIVE_INFINITY;
    let inverted = false;
    while (ae !== null) {
      ae.prevInSEL = ae.prevInAEL;
      ae.nextInSEL = ae.nextInAEL;
      ae.jump = ae.nextInSEL;
      const x = _ClipperBase.topX(ae, topY);
      ae.curX = x;
      if (x < prevX)
        inverted = true;
      prevX = x;
      ae = ae.nextInAEL;
    }
    return inverted;
  }
  doMaxima(ae) {
    const prevE = ae.prevInAEL;
    let nextE = ae.nextInAEL;
    if (_ClipperBase.isOpenEnd(ae)) {
      if (_ClipperBase.isHotEdge(ae))
        this.addOutPt(ae, ae.top);
      if (_ClipperBase.isHorizontal(ae))
        return nextE;
      if (_ClipperBase.isHotEdge(ae)) {
        if (_ClipperBase.isFront(ae)) {
          ae.outrec.frontEdge = null;
        } else {
          ae.outrec.backEdge = null;
        }
        ae.outrec = null;
      }
      this.deleteFromAEL(ae);
      return nextE;
    }
    const maxPair = _ClipperBase.getMaximaPair(ae);
    if (maxPair === null)
      return nextE;
    if (this.isJoined(ae))
      this.split(ae, ae.top);
    if (this.isJoined(maxPair))
      this.split(maxPair, maxPair.top);
    while (nextE !== maxPair) {
      this.intersectEdges(ae, nextE, ae.top);
      this.swapPositionsInAEL(ae, nextE);
      nextE = ae.nextInAEL;
    }
    if (_ClipperBase.isOpen(ae)) {
      if (_ClipperBase.isHotEdge(ae)) {
        this.addLocalMaxPoly(ae, maxPair, ae.top);
      }
      this.deleteFromAEL(maxPair);
      this.deleteFromAEL(ae);
      return prevE !== null ? prevE.nextInAEL : this.actives;
    }
    if (_ClipperBase.isHotEdge(ae)) {
      this.addLocalMaxPoly(ae, maxPair, ae.top);
    }
    this.deleteFromAEL(ae);
    this.deleteFromAEL(maxPair);
    return prevE !== null ? prevE.nextInAEL : this.actives;
  }
  updateEdgeIntoAEL(ae) {
    ae.bot = ae.top;
    ae.vertexTop = _ClipperBase.nextVertex(ae);
    ae.top = ae.vertexTop.pt;
    ae.curX = ae.bot.x;
    _ClipperBase.setDx(ae);
    if (this.isJoined(ae))
      this.split(ae, ae.bot);
    if (_ClipperBase.isHorizontal(ae)) {
      if (!_ClipperBase.openPathsEnabled) {
        this.trimHorz(ae, this.preserveCollinear);
      } else if (!_ClipperBase.isOpen(ae)) {
        this.trimHorz(ae, this.preserveCollinear);
      }
      return;
    }
    this.insertScanline(ae.top.y);
    this.checkJoinLeft(ae, ae.bot);
    this.checkJoinRight(ae, ae.bot, true);
  }
  trimHorz(horzEdge, preserveCollinear) {
    let wasTrimmed = false;
    let pt = _ClipperBase.nextVertex(horzEdge).pt;
    while (pt.y === horzEdge.top.y) {
      if (preserveCollinear && pt.x < horzEdge.top.x !== horzEdge.bot.x < horzEdge.top.x) {
        break;
      }
      horzEdge.vertexTop = _ClipperBase.nextVertex(horzEdge);
      horzEdge.top = pt;
      wasTrimmed = true;
      if (_ClipperBase.isMaximaVertex(horzEdge.vertexTop))
        break;
      pt = _ClipperBase.nextVertex(horzEdge).pt;
    }
    if (wasTrimmed)
      _ClipperBase.setDx(horzEdge);
  }
  addToHorzSegList(op) {
    if (op.outrec.isOpen)
      return;
    this.horzSegList.push(new HorzSegment(op));
  }
  addNewIntersectNode(ae1, ae2, topY) {
    let ip = InternalClipper.getLineIntersectPt(ae1.bot, ae1.top, ae2.bot, ae2.top);
    if (ip === null) {
      ip = { x: ae1.curX, y: topY };
    }
    if (ip.y > this.currentBotY || ip.y < topY) {
      const absDx1 = Math.abs(ae1.dx);
      const absDx2 = Math.abs(ae2.dx);
      if (absDx1 > 100 && absDx2 > 100) {
        if (absDx1 > absDx2) {
          ip = InternalClipper.getClosestPtOnSegment(ip, ae1.bot, ae1.top);
        } else {
          ip = InternalClipper.getClosestPtOnSegment(ip, ae2.bot, ae2.top);
        }
      } else if (absDx1 > 100) {
        ip = InternalClipper.getClosestPtOnSegment(ip, ae1.bot, ae1.top);
      } else if (absDx2 > 100) {
        ip = InternalClipper.getClosestPtOnSegment(ip, ae2.bot, ae2.top);
      } else {
        if (ip.y < topY)
          ip.y = topY;
        else
          ip.y = this.currentBotY;
        if (absDx1 < absDx2)
          ip.x = _ClipperBase.topX(ae1, ip.y);
        else
          ip.x = _ClipperBase.topX(ae2, ip.y);
      }
    }
    const node = createIntersectNode(ip, ae1, ae2);
    this.intersectList.push(node);
  }
  extractFromSEL(ae) {
    const res = ae.nextInSEL;
    if (res !== null) {
      res.prevInSEL = ae.prevInSEL;
    }
    ae.prevInSEL.nextInSEL = res;
    return res;
  }
  insert1Before2InSEL(ae1, ae2) {
    ae1.prevInSEL = ae2.prevInSEL;
    if (ae1.prevInSEL !== null) {
      ae1.prevInSEL.nextInSEL = ae1;
    }
    ae1.nextInSEL = ae2;
    ae2.prevInSEL = ae1;
  }
  getCurrYMaximaVertexOpen(ae) {
    let result = ae.vertexTop;
    if (ae.windDx > 0) {
      while (result.next.pt.y === result.pt.y && (result.flags & (VertexFlags.OpenEnd | VertexFlags.LocalMax)) === VertexFlags.None)
        result = result.next;
    } else {
      while (result.prev.pt.y === result.pt.y && (result.flags & (VertexFlags.OpenEnd | VertexFlags.LocalMax)) === VertexFlags.None)
        result = result.prev;
    }
    if (!_ClipperBase.isMaximaVertex(result))
      result = null;
    return result;
  }
  getCurrYMaximaVertex(ae) {
    let result = ae.vertexTop;
    if (ae.windDx > 0) {
      while (result.next.pt.y === result.pt.y)
        result = result.next;
    } else {
      while (result.prev.pt.y === result.pt.y)
        result = result.prev;
    }
    if (!_ClipperBase.isMaximaVertex(result))
      result = null;
    return result;
  }
  resetHorzDirection(horz, vertexMax) {
    if (horz.bot.x === horz.top.x) {
      const leftX = horz.curX;
      const rightX = horz.curX;
      let ae = horz.nextInAEL;
      while (ae !== null && ae.vertexTop !== vertexMax)
        ae = ae.nextInAEL;
      return { isLeftToRight: ae !== null, leftX, rightX };
    }
    if (horz.curX < horz.top.x) {
      return { isLeftToRight: true, leftX: horz.curX, rightX: horz.top.x };
    } else {
      return { isLeftToRight: false, leftX: horz.top.x, rightX: horz.curX };
    }
  }
  getLastOp(hotEdge) {
    const outrec = hotEdge.outrec;
    return hotEdge === outrec.frontEdge ? outrec.pts : outrec.pts.next;
  }
  insertLeftEdge(ae) {
    if (this.actives === null) {
      ae.prevInAEL = null;
      ae.nextInAEL = null;
      this.actives = ae;
    } else if (!this.isValidAelOrder(this.actives, ae)) {
      ae.prevInAEL = null;
      ae.nextInAEL = this.actives;
      this.actives.prevInAEL = ae;
      this.actives = ae;
    } else {
      let ae2 = this.actives;
      while (ae2.nextInAEL !== null && this.isValidAelOrder(ae2.nextInAEL, ae)) {
        ae2 = ae2.nextInAEL;
      }
      if (ae2.joinWith === JoinWith.Right)
        ae2 = ae2.nextInAEL;
      ae.nextInAEL = ae2.nextInAEL;
      if (ae2.nextInAEL !== null)
        ae2.nextInAEL.prevInAEL = ae;
      ae.prevInAEL = ae2;
      ae2.nextInAEL = ae;
    }
  }
  insertRightEdge(ae1, ae2) {
    ae2.nextInAEL = ae1.nextInAEL;
    if (ae1.nextInAEL !== null)
      ae1.nextInAEL.prevInAEL = ae2;
    ae2.prevInAEL = ae1;
    ae1.nextInAEL = ae2;
  }
  setWindCountForOpenPathEdge(ae) {
    let ae2 = this.actives;
    if (this.fillrule === FillRule.EvenOdd) {
      let cnt1 = 0, cnt2 = 0;
      while (ae2 !== ae) {
        if (_ClipperBase.getPolyType(ae2) === PathType.Clip) {
          cnt2++;
        } else if (!_ClipperBase.isOpen(ae2)) {
          cnt1++;
        }
        ae2 = ae2.nextInAEL;
      }
      ae.windCount = _ClipperBase.isOdd(cnt1) ? 1 : 0;
      ae.windCount2 = _ClipperBase.isOdd(cnt2) ? 1 : 0;
    } else {
      while (ae2 !== ae) {
        if (_ClipperBase.getPolyType(ae2) === PathType.Clip) {
          ae.windCount2 += ae2.windDx;
        } else if (!_ClipperBase.isOpen(ae2)) {
          ae.windCount += ae2.windDx;
        }
        ae2 = ae2.nextInAEL;
      }
    }
  }
  setWindCountForClosedPathEdge(ae) {
    let ae2 = ae.prevInAEL;
    const pt = _ClipperBase.getPolyType(ae);
    if (!_ClipperBase.openPathsEnabled) {
      while (ae2 !== null && _ClipperBase.getPolyType(ae2) !== pt)
        ae2 = ae2.prevInAEL;
      if (ae2 === null) {
        ae.windCount = ae.windDx;
        ae2 = this.actives;
      } else if (this.fillrule === FillRule.EvenOdd) {
        ae.windCount = ae.windDx;
        ae.windCount2 = ae2.windCount2;
        ae2 = ae2.nextInAEL;
      } else {
        if (ae2.windCount * ae2.windDx < 0) {
          if (Math.abs(ae2.windCount) > 1) {
            if (ae2.windDx * ae.windDx < 0) {
              ae.windCount = ae2.windCount;
            } else {
              ae.windCount = ae2.windCount + ae.windDx;
            }
          } else {
            ae.windCount = ae.windDx;
          }
        } else {
          if (ae2.windDx * ae.windDx < 0) {
            ae.windCount = ae2.windCount;
          } else {
            ae.windCount = ae2.windCount + ae.windDx;
          }
        }
        ae.windCount2 = ae2.windCount2;
        ae2 = ae2.nextInAEL;
      }
      if (this.fillrule === FillRule.EvenOdd) {
        while (ae2 !== ae) {
          if (_ClipperBase.getPolyType(ae2) !== pt) {
            ae.windCount2 = ae.windCount2 === 0 ? 1 : 0;
          }
          ae2 = ae2.nextInAEL;
        }
      } else {
        while (ae2 !== ae) {
          if (_ClipperBase.getPolyType(ae2) !== pt) {
            ae.windCount2 += ae2.windDx;
          }
          ae2 = ae2.nextInAEL;
        }
      }
      return;
    }
    while (ae2 !== null && (_ClipperBase.getPolyType(ae2) !== pt || _ClipperBase.isOpen(ae2)))
      ae2 = ae2.prevInAEL;
    if (ae2 === null) {
      ae.windCount = ae.windDx;
      ae2 = this.actives;
    } else if (this.fillrule === FillRule.EvenOdd) {
      ae.windCount = ae.windDx;
      ae.windCount2 = ae2.windCount2;
      ae2 = ae2.nextInAEL;
    } else {
      if (ae2.windCount * ae2.windDx < 0) {
        if (Math.abs(ae2.windCount) > 1) {
          if (ae2.windDx * ae.windDx < 0) {
            ae.windCount = ae2.windCount;
          } else {
            ae.windCount = ae2.windCount + ae.windDx;
          }
        } else {
          ae.windCount = _ClipperBase.isOpen(ae) ? 1 : ae.windDx;
        }
      } else {
        if (ae2.windDx * ae.windDx < 0) {
          ae.windCount = ae2.windCount;
        } else {
          ae.windCount = ae2.windCount + ae.windDx;
        }
      }
      ae.windCount2 = ae2.windCount2;
      ae2 = ae2.nextInAEL;
    }
    if (this.fillrule === FillRule.EvenOdd) {
      while (ae2 !== ae) {
        if (_ClipperBase.getPolyType(ae2) !== pt && !_ClipperBase.isOpen(ae2)) {
          ae.windCount2 = ae.windCount2 === 0 ? 1 : 0;
        }
        ae2 = ae2.nextInAEL;
      }
    } else {
      while (ae2 !== ae) {
        if (_ClipperBase.getPolyType(ae2) !== pt && !_ClipperBase.isOpen(ae2)) {
          ae.windCount2 += ae2.windDx;
        }
        ae2 = ae2.nextInAEL;
      }
    }
  }
  isContributingOpen(ae) {
    let isInClip, isInSubj;
    switch (this.fillrule) {
      case FillRule.Positive:
        isInSubj = ae.windCount > 0;
        isInClip = ae.windCount2 > 0;
        break;
      case FillRule.Negative:
        isInSubj = ae.windCount < 0;
        isInClip = ae.windCount2 < 0;
        break;
      default:
        isInSubj = ae.windCount !== 0;
        isInClip = ae.windCount2 !== 0;
        break;
    }
    switch (this.cliptype) {
      case ClipType.Intersection:
        return isInClip;
      case ClipType.Union:
        return !isInSubj && !isInClip;
      default:
        return !isInClip;
    }
  }
  isContributingClosed(ae) {
    switch (this.fillrule) {
      case FillRule.Positive:
        if (ae.windCount !== 1)
          return false;
        break;
      case FillRule.Negative:
        if (ae.windCount !== -1)
          return false;
        break;
      case FillRule.NonZero:
        if (Math.abs(ae.windCount) !== 1)
          return false;
        break;
    }
    switch (this.cliptype) {
      case ClipType.Intersection:
        return this.fillrule === FillRule.Positive ? ae.windCount2 > 0 : this.fillrule === FillRule.Negative ? ae.windCount2 < 0 : ae.windCount2 !== 0;
      case ClipType.Union:
        return this.fillrule === FillRule.Positive ? ae.windCount2 <= 0 : this.fillrule === FillRule.Negative ? ae.windCount2 >= 0 : ae.windCount2 === 0;
      case ClipType.Difference: {
        const result = this.fillrule === FillRule.Positive ? ae.windCount2 <= 0 : this.fillrule === FillRule.Negative ? ae.windCount2 >= 0 : ae.windCount2 === 0;
        return _ClipperBase.getPolyType(ae) === PathType.Subject ? result : !result;
      }
      case ClipType.Xor:
        return true;
      // XOr is always contributing unless open
      default:
        return false;
    }
  }
  addLocalMinPoly(ae1, ae2, pt, isNew = false) {
    const outrec = this.newOutRec();
    ae1.outrec = outrec;
    ae2.outrec = outrec;
    if (_ClipperBase.isOpen(ae1)) {
      outrec.owner = null;
      outrec.isOpen = true;
      if (ae1.windDx > 0) {
        this.setSides(outrec, ae1, ae2);
      } else {
        this.setSides(outrec, ae2, ae1);
      }
    } else {
      outrec.isOpen = false;
      const prevHotEdge = _ClipperBase.getPrevHotEdge(ae1);
      if (prevHotEdge !== null) {
        if (this.usingPolytree) {
          this.setOwner(outrec, prevHotEdge.outrec);
        }
        outrec.owner = prevHotEdge.outrec;
        if (this.outrecIsAscending(prevHotEdge) === isNew) {
          this.setSides(outrec, ae2, ae1);
        } else {
          this.setSides(outrec, ae1, ae2);
        }
      } else {
        outrec.owner = null;
        if (isNew) {
          this.setSides(outrec, ae1, ae2);
        } else {
          this.setSides(outrec, ae2, ae1);
        }
      }
    }
    const op = new OutPt(pt, outrec);
    outrec.pts = op;
    return op;
  }
  outrecIsAscending(hotEdge) {
    return hotEdge === hotEdge.outrec.frontEdge;
  }
  newOutRec() {
    const result = new OutRec();
    result.idx = this.outrecList.length;
    this.outrecList.push(result);
    return result;
  }
  startOpenPath(ae, pt) {
    const outrec = this.newOutRec();
    outrec.isOpen = true;
    if (ae.windDx > 0) {
      outrec.frontEdge = ae;
      outrec.backEdge = null;
    } else {
      outrec.frontEdge = null;
      outrec.backEdge = ae;
    }
    ae.outrec = outrec;
    const op = new OutPt(pt, outrec);
    outrec.pts = op;
    return op;
  }
  checkJoinLeft(ae, pt, checkCurrX = false) {
    const prev = ae.prevInAEL;
    if (prev === null)
      return;
    if (!checkCurrX && ae.curX !== prev.curX)
      return;
    if (!_ClipperBase.isHotEdge(ae) || !_ClipperBase.isHotEdge(prev) || _ClipperBase.isHorizontal(ae) || _ClipperBase.isHorizontal(prev) || _ClipperBase.isOpen(ae) || _ClipperBase.isOpen(prev))
      return;
    if ((pt.y < ae.top.y + 2 || pt.y < prev.top.y + 2) && // avoid trivial joins
    (ae.bot.y > pt.y || prev.bot.y > pt.y))
      return;
    if (checkCurrX) {
      if (this.perpendicDistFromLineSqrdGreaterThanQuarter(pt, prev.bot, prev.top))
        return;
    }
    if (!InternalClipper.isCollinear(ae.top, pt, prev.top))
      return;
    if (ae.outrec.idx === prev.outrec.idx) {
      this.addLocalMaxPoly(prev, ae, pt);
    } else if (ae.outrec.idx < prev.outrec.idx) {
      this.joinOutrecPaths(ae, prev);
    } else {
      this.joinOutrecPaths(prev, ae);
    }
    prev.joinWith = JoinWith.Right;
    ae.joinWith = JoinWith.Left;
  }
  checkJoinRight(ae, pt, checkCurrX = false) {
    const next = ae.nextInAEL;
    if (next === null)
      return;
    if (!checkCurrX && ae.curX !== next.curX)
      return;
    if (!_ClipperBase.isHotEdge(ae) || !_ClipperBase.isHotEdge(next) || _ClipperBase.isHorizontal(ae) || _ClipperBase.isHorizontal(next) || _ClipperBase.isOpen(ae) || _ClipperBase.isOpen(next))
      return;
    if ((pt.y < ae.top.y + 2 || pt.y < next.top.y + 2) && // avoid trivial joins
    (ae.bot.y > pt.y || next.bot.y > pt.y))
      return;
    if (checkCurrX) {
      if (this.perpendicDistFromLineSqrdGreaterThanQuarter(pt, next.bot, next.top))
        return;
    }
    if (!InternalClipper.isCollinear(ae.top, pt, next.top))
      return;
    if (ae.outrec.idx === next.outrec.idx) {
      this.addLocalMaxPoly(ae, next, pt);
    } else if (ae.outrec.idx < next.outrec.idx) {
      this.joinOutrecPaths(ae, next);
    } else {
      this.joinOutrecPaths(next, ae);
    }
    ae.joinWith = JoinWith.Right;
    next.joinWith = JoinWith.Left;
  }
  perpendicDistFromLineSqrdGreaterThanQuarter(pt, line1, line2) {
    const a = pt.x - line1.x;
    const b = pt.y - line1.y;
    const c = line2.x - line1.x;
    const d = line2.y - line1.y;
    if (c === 0 && d === 0)
      return false;
    const maxCoord = InternalClipper.maxCoordForSafeCrossSq;
    if (Math.abs(a) < maxCoord && Math.abs(b) < maxCoord && Math.abs(c) < maxCoord && Math.abs(d) < maxCoord) {
      const cross2 = a * d - c * b;
      return cross2 * cross2 / (c * c + d * d) > 0.25;
    }
    if (Number.isSafeInteger(a) && Number.isSafeInteger(b) && Number.isSafeInteger(c) && Number.isSafeInteger(d)) {
      const cross2 = BigInt(a) * BigInt(d) - BigInt(c) * BigInt(b);
      const crossSq = cross2 * cross2;
      const denom = BigInt(c) * BigInt(c) + BigInt(d) * BigInt(d);
      return B42 * crossSq > denom;
    }
    const cross = a * d - c * b;
    return cross * cross / (c * c + d * d) > 0.25;
  }
  intersectEdges(ae1, ae2, pt) {
    let resultOp;
    if (this.hasOpenPaths && (_ClipperBase.isOpen(ae1) || _ClipperBase.isOpen(ae2))) {
      if (_ClipperBase.isOpen(ae1) && _ClipperBase.isOpen(ae2))
        return;
      if (_ClipperBase.isOpen(ae2)) {
        const tmp = ae1;
        ae1 = ae2;
        ae2 = tmp;
      }
      if (this.isJoined(ae2))
        this.split(ae2, pt);
      if (this.cliptype === ClipType.Union) {
        if (!_ClipperBase.isHotEdge(ae2))
          return;
      } else if (ae2.localMin.polytype === PathType.Subject)
        return;
      switch (this.fillrule) {
        case FillRule.Positive:
          if (ae2.windCount !== 1)
            return;
          break;
        case FillRule.Negative:
          if (ae2.windCount !== -1)
            return;
          break;
        default:
          if (Math.abs(ae2.windCount) !== 1)
            return;
          break;
      }
      if (_ClipperBase.isHotEdge(ae1)) {
        resultOp = this.addOutPt(ae1, pt);
        this.setZ(ae1, ae2, resultOp.pt);
        if (_ClipperBase.isFront(ae1)) {
          ae1.outrec.frontEdge = null;
        } else {
          ae1.outrec.backEdge = null;
        }
        ae1.outrec = null;
      } else if (pt.x === ae1.localMin.vertex.pt.x && pt.y === ae1.localMin.vertex.pt.y && !_ClipperBase.isOpenEndVertex(ae1.localMin.vertex)) {
        const ae3 = this.findEdgeWithMatchingLocMin(ae1);
        if (ae3 !== null && _ClipperBase.isHotEdge(ae3)) {
          ae1.outrec = ae3.outrec;
          if (ae1.windDx > 0) {
            this.setSides(ae3.outrec, ae1, ae3);
          } else {
            this.setSides(ae3.outrec, ae3, ae1);
          }
          return;
        }
        resultOp = this.startOpenPath(ae1, pt);
      } else {
        resultOp = this.startOpenPath(ae1, pt);
      }
      this.setZ(ae1, ae2, resultOp.pt);
      return;
    }
    if (this.isJoined(ae1))
      this.split(ae1, pt);
    if (this.isJoined(ae2))
      this.split(ae2, pt);
    let oldE1WindCount, oldE2WindCount;
    if (ae1.localMin.polytype === ae2.localMin.polytype) {
      if (this.fillrule === FillRule.EvenOdd) {
        oldE1WindCount = ae1.windCount;
        ae1.windCount = ae2.windCount;
        ae2.windCount = oldE1WindCount;
      } else {
        if (ae1.windCount + ae2.windDx === 0) {
          ae1.windCount = -ae1.windCount;
        } else {
          ae1.windCount += ae2.windDx;
        }
        if (ae2.windCount - ae1.windDx === 0) {
          ae2.windCount = -ae2.windCount;
        } else {
          ae2.windCount -= ae1.windDx;
        }
      }
    } else {
      if (this.fillrule !== FillRule.EvenOdd) {
        ae1.windCount2 += ae2.windDx;
      } else {
        ae1.windCount2 = ae1.windCount2 === 0 ? 1 : 0;
      }
      if (this.fillrule !== FillRule.EvenOdd) {
        ae2.windCount2 -= ae1.windDx;
      } else {
        ae2.windCount2 = ae2.windCount2 === 0 ? 1 : 0;
      }
    }
    switch (this.fillrule) {
      case FillRule.Positive:
        oldE1WindCount = ae1.windCount;
        oldE2WindCount = ae2.windCount;
        break;
      case FillRule.Negative:
        oldE1WindCount = -ae1.windCount;
        oldE2WindCount = -ae2.windCount;
        break;
      default:
        oldE1WindCount = Math.abs(ae1.windCount);
        oldE2WindCount = Math.abs(ae2.windCount);
        break;
    }
    const e1WindCountIs0or1 = oldE1WindCount === 0 || oldE1WindCount === 1;
    const e2WindCountIs0or1 = oldE2WindCount === 0 || oldE2WindCount === 1;
    if (!_ClipperBase.isHotEdge(ae1) && !e1WindCountIs0or1 || !_ClipperBase.isHotEdge(ae2) && !e2WindCountIs0or1)
      return;
    if (_ClipperBase.isHotEdge(ae1) && _ClipperBase.isHotEdge(ae2)) {
      if (oldE1WindCount !== 0 && oldE1WindCount !== 1 || oldE2WindCount !== 0 && oldE2WindCount !== 1 || ae1.localMin.polytype !== ae2.localMin.polytype && this.cliptype !== ClipType.Xor) {
        resultOp = this.addLocalMaxPoly(ae1, ae2, pt);
        if (resultOp)
          this.setZ(ae1, ae2, resultOp.pt);
      } else if (_ClipperBase.isFront(ae1) || ae1.outrec === ae2.outrec) {
        resultOp = this.addLocalMaxPoly(ae1, ae2, pt);
        if (resultOp)
          this.setZ(ae1, ae2, resultOp.pt);
        const op2 = this.addLocalMinPoly(ae1, ae2, pt);
        this.setZ(ae1, ae2, op2.pt);
      } else {
        resultOp = this.addOutPt(ae1, pt);
        this.setZ(ae1, ae2, resultOp.pt);
        const op2 = this.addOutPt(ae2, pt);
        this.setZ(ae1, ae2, op2.pt);
        this.swapOutrecs(ae1, ae2);
      }
    } else if (_ClipperBase.isHotEdge(ae1)) {
      resultOp = this.addOutPt(ae1, pt);
      this.setZ(ae1, ae2, resultOp.pt);
      this.swapOutrecs(ae1, ae2);
    } else if (_ClipperBase.isHotEdge(ae2)) {
      resultOp = this.addOutPt(ae2, pt);
      this.setZ(ae1, ae2, resultOp.pt);
      this.swapOutrecs(ae1, ae2);
    } else {
      let e1Wc2, e2Wc2;
      switch (this.fillrule) {
        case FillRule.Positive:
          e1Wc2 = ae1.windCount2;
          e2Wc2 = ae2.windCount2;
          break;
        case FillRule.Negative:
          e1Wc2 = -ae1.windCount2;
          e2Wc2 = -ae2.windCount2;
          break;
        default:
          e1Wc2 = Math.abs(ae1.windCount2);
          e2Wc2 = Math.abs(ae2.windCount2);
          break;
      }
      if (!_ClipperBase.isSamePolyType(ae1, ae2)) {
        resultOp = this.addLocalMinPoly(ae1, ae2, pt);
        this.setZ(ae1, ae2, resultOp.pt);
      } else if (oldE1WindCount === 1 && oldE2WindCount === 1) {
        resultOp = null;
        switch (this.cliptype) {
          case ClipType.Union:
            if (e1Wc2 > 0 && e2Wc2 > 0)
              return;
            resultOp = this.addLocalMinPoly(ae1, ae2, pt);
            break;
          case ClipType.Difference:
            if (_ClipperBase.getPolyType(ae1) === PathType.Clip && e1Wc2 > 0 && e2Wc2 > 0 || _ClipperBase.getPolyType(ae1) === PathType.Subject && e1Wc2 <= 0 && e2Wc2 <= 0) {
              resultOp = this.addLocalMinPoly(ae1, ae2, pt);
            }
            break;
          case ClipType.Xor:
            resultOp = this.addLocalMinPoly(ae1, ae2, pt);
            break;
          default:
            if (e1Wc2 <= 0 || e2Wc2 <= 0)
              return;
            resultOp = this.addLocalMinPoly(ae1, ae2, pt);
            break;
        }
        if (resultOp)
          this.setZ(ae1, ae2, resultOp.pt);
      }
    }
  }
  swapPositionsInAEL(ae1, ae2) {
    const next = ae2.nextInAEL;
    if (next !== null)
      next.prevInAEL = ae1;
    const prev = ae1.prevInAEL;
    if (prev !== null)
      prev.nextInAEL = ae2;
    ae2.prevInAEL = prev;
    ae2.nextInAEL = ae1;
    ae1.prevInAEL = ae2;
    ae1.nextInAEL = next;
    if (ae2.prevInAEL === null)
      this.actives = ae2;
  }
  isValidAelOrder(resident, newcomer) {
    if (newcomer.curX !== resident.curX) {
      return newcomer.curX > resident.curX;
    }
    const d = InternalClipper.crossProductSign(resident.top, newcomer.bot, newcomer.top);
    if (d !== 0)
      return d < 0;
    if (!_ClipperBase.isMaximaEdge(resident) && resident.top.y > newcomer.top.y) {
      return InternalClipper.crossProductSign(newcomer.bot, resident.top, _ClipperBase.nextVertex(resident).pt) <= 0;
    }
    if (!_ClipperBase.isMaximaEdge(newcomer) && newcomer.top.y > resident.top.y) {
      return InternalClipper.crossProductSign(newcomer.bot, newcomer.top, _ClipperBase.nextVertex(newcomer).pt) >= 0;
    }
    const y = newcomer.bot.y;
    const newcomerIsLeft = newcomer.isLeftBound;
    if (resident.bot.y !== y || resident.localMin.vertex.pt.y !== y) {
      return newcomer.isLeftBound;
    }
    if (resident.isLeftBound !== newcomerIsLeft) {
      return newcomerIsLeft;
    }
    if (InternalClipper.isCollinear(_ClipperBase.prevPrevVertex(resident).pt, resident.bot, resident.top))
      return true;
    return InternalClipper.crossProductSign(_ClipperBase.prevPrevVertex(resident).pt, newcomer.bot, _ClipperBase.prevPrevVertex(newcomer).pt) > 0 === newcomerIsLeft;
  }
  isJoined(e) {
    return e.joinWith !== JoinWith.None;
  }
  split(e, currPt) {
    if (e.joinWith === JoinWith.Right) {
      e.joinWith = JoinWith.None;
      e.nextInAEL.joinWith = JoinWith.None;
      this.addLocalMinPoly(e, e.nextInAEL, currPt, true);
    } else {
      e.joinWith = JoinWith.None;
      e.prevInAEL.joinWith = JoinWith.None;
      this.addLocalMinPoly(e.prevInAEL, e, currPt, true);
    }
  }
  setSides(outrec, startEdge, endEdge) {
    outrec.frontEdge = startEdge;
    outrec.backEdge = endEdge;
  }
  findEdgeWithMatchingLocMin(e) {
    let result = e.nextInAEL;
    while (result !== null) {
      if (result.localMin?.equals(e.localMin))
        return result;
      if (!_ClipperBase.isHorizontal(result) && !(e.bot.x === result.bot.x && e.bot.y === result.bot.y))
        result = null;
      else
        result = result.nextInAEL;
    }
    result = e.prevInAEL;
    while (result !== null) {
      if (result.localMin?.equals(e.localMin))
        return result;
      if (!_ClipperBase.isHorizontal(result) && !(e.bot.x === result.bot.x && e.bot.y === result.bot.y))
        return null;
      result = result.prevInAEL;
    }
    return result;
  }
  addOutPt(ae, pt) {
    const outrec = ae.outrec;
    const toFront = _ClipperBase.isFront(ae);
    const opFront = outrec.pts;
    const opBack = opFront.next;
    if (toFront && pt.x === opFront.pt.x && pt.y === opFront.pt.y) {
      return opFront;
    } else if (!toFront && pt.x === opBack.pt.x && pt.y === opBack.pt.y) {
      return opBack;
    }
    const newOp = new OutPt(pt, outrec);
    opBack.prev = newOp;
    newOp.prev = opFront;
    newOp.next = opBack;
    opFront.next = newOp;
    if (toFront)
      outrec.pts = newOp;
    return newOp;
  }
  addLocalMaxPoly(ae1, ae2, pt) {
    if (this.isJoined(ae1))
      this.split(ae1, pt);
    if (this.isJoined(ae2))
      this.split(ae2, pt);
    if (_ClipperBase.isFront(ae1) === _ClipperBase.isFront(ae2)) {
      if (_ClipperBase.isOpenEnd(ae1)) {
        this.swapFrontBackSides(ae1.outrec);
      } else if (_ClipperBase.isOpenEnd(ae2)) {
        this.swapFrontBackSides(ae2.outrec);
      } else {
        this.succeeded = false;
        return null;
      }
    }
    const result = this.addOutPt(ae1, pt);
    if (ae1.outrec === ae2.outrec) {
      const outrec = ae1.outrec;
      outrec.pts = result;
      if (this.usingPolytree) {
        const e = _ClipperBase.getPrevHotEdge(ae1);
        if (e === null) {
          outrec.owner = null;
        } else {
          this.setOwner(outrec, e.outrec);
        }
      }
      this.uncoupleOutRec(ae1);
    } else if (_ClipperBase.isOpen(ae1)) {
      if (ae1.windDx < 0) {
        this.joinOutrecPaths(ae1, ae2);
      } else {
        this.joinOutrecPaths(ae2, ae1);
      }
    } else if (ae1.outrec.idx < ae2.outrec.idx) {
      this.joinOutrecPaths(ae1, ae2);
    } else {
      this.joinOutrecPaths(ae2, ae1);
    }
    return result;
  }
  swapFrontBackSides(outrec) {
    const ae2 = outrec.frontEdge;
    outrec.frontEdge = outrec.backEdge;
    outrec.backEdge = ae2;
    outrec.pts = outrec.pts.next;
  }
  setOwner(outrec, newOwner) {
    while (newOwner.owner !== null && newOwner.owner.pts === null) {
      newOwner.owner = newOwner.owner.owner;
    }
    let tmp = newOwner;
    while (tmp !== null && tmp !== outrec) {
      tmp = tmp.owner;
    }
    if (tmp !== null) {
      newOwner.owner = outrec.owner;
    }
    outrec.owner = newOwner;
  }
  uncoupleOutRec(ae) {
    const outrec = ae.outrec;
    if (outrec === null)
      return;
    outrec.frontEdge.outrec = null;
    outrec.backEdge.outrec = null;
    outrec.frontEdge = null;
    outrec.backEdge = null;
  }
  joinOutrecPaths(ae1, ae2) {
    const p1Start = ae1.outrec.pts;
    const p2Start = ae2.outrec.pts;
    const p1End = p1Start.next;
    const p2End = p2Start.next;
    if (_ClipperBase.isFront(ae1)) {
      p2End.prev = p1Start;
      p1Start.next = p2End;
      p2Start.next = p1End;
      p1End.prev = p2Start;
      ae1.outrec.pts = p2Start;
      ae1.outrec.frontEdge = ae2.outrec.frontEdge;
      if (ae1.outrec.frontEdge !== null) {
        ae1.outrec.frontEdge.outrec = ae1.outrec;
      }
    } else {
      p1End.prev = p2Start;
      p2Start.next = p1End;
      p1Start.next = p2End;
      p2End.prev = p1Start;
      ae1.outrec.backEdge = ae2.outrec.backEdge;
      if (ae1.outrec.backEdge !== null) {
        ae1.outrec.backEdge.outrec = ae1.outrec;
      }
    }
    ae2.outrec.frontEdge = null;
    ae2.outrec.backEdge = null;
    ae2.outrec.pts = null;
    this.setOwner(ae2.outrec, ae1.outrec);
    if (_ClipperBase.isOpenEnd(ae1)) {
      ae2.outrec.pts = ae1.outrec.pts;
      ae1.outrec.pts = null;
    }
    ae1.outrec = null;
    ae2.outrec = null;
  }
  swapOutrecs(ae1, ae2) {
    const or1 = ae1.outrec;
    const or2 = ae2.outrec;
    if (or1 === or2) {
      const ae = or1.frontEdge;
      or1.frontEdge = or1.backEdge;
      or1.backEdge = ae;
      return;
    }
    if (or1 !== null) {
      if (ae1 === or1.frontEdge) {
        or1.frontEdge = ae2;
      } else {
        or1.backEdge = ae2;
      }
    }
    if (or2 !== null) {
      if (ae2 === or2.frontEdge) {
        or2.frontEdge = ae1;
      } else {
        or2.backEdge = ae1;
      }
    }
    ae1.outrec = or2;
    ae2.outrec = or1;
  }
  disposeIntersectNodes() {
    this.intersectList.length = 0;
  }
  static ptsReallyClose(pt1, pt2) {
    return Math.abs(pt1.x - pt2.x) < 2 && Math.abs(pt1.y - pt2.y) < 2;
  }
  static isVerySmallTriangle(op) {
    return op.next.next === op.prev && (_ClipperBase.ptsReallyClose(op.prev.pt, op.next.pt) || _ClipperBase.ptsReallyClose(op.pt, op.next.pt) || _ClipperBase.ptsReallyClose(op.pt, op.prev.pt));
  }
  static buildPath(op, reverse, isOpen, path) {
    if (op === null || op.next === op || !isOpen && op.next === op.prev)
      return false;
    path.length = 0;
    let lastPt;
    let op2;
    if (reverse) {
      lastPt = op.pt;
      op2 = op.prev;
    } else {
      op = op.next;
      lastPt = op.pt;
      op2 = op.next;
    }
    path.push(lastPt);
    while (op2 !== op) {
      if (!(op2.pt.x === lastPt.x && op2.pt.y === lastPt.y)) {
        lastPt = op2.pt;
        path.push(lastPt);
      }
      if (reverse) {
        op2 = op2.prev;
      } else {
        op2 = op2.next;
      }
    }
    return path.length !== 3 || isOpen || !_ClipperBase.isVerySmallTriangle(op2);
  }
  buildPaths(solutionClosed, solutionOpen) {
    solutionClosed.length = 0;
    solutionOpen.length = 0;
    let i = 0;
    while (i < this.outrecList.length) {
      const outrec = this.outrecList[i++];
      if (outrec.pts === null)
        continue;
      const path = [];
      if (outrec.isOpen) {
        if (_ClipperBase.buildPath(outrec.pts, this.reverseSolution, true, path)) {
          solutionOpen.push(path);
        }
      } else {
        this.cleanCollinear(outrec);
        if (_ClipperBase.buildPath(outrec.pts, this.reverseSolution, false, path)) {
          solutionClosed.push(path);
        }
      }
    }
    return true;
  }
  buildTree(polytree, solutionOpen) {
    polytree.clear();
    solutionOpen.length = 0;
    let i = 0;
    while (i < this.outrecList.length) {
      const outrec = this.outrecList[i++];
      if (outrec.pts === null)
        continue;
      if (outrec.isOpen) {
        const openPath = [];
        if (_ClipperBase.buildPath(outrec.pts, this.reverseSolution, true, openPath)) {
          solutionOpen.push(openPath);
        }
        continue;
      }
      if (this.checkBounds(outrec)) {
        this.recursiveCheckOwners(outrec, polytree);
      }
    }
  }
  checkBounds(outrec) {
    if (outrec.pts === null)
      return false;
    if (!Rect64Utils.isEmpty(outrec.bounds))
      return true;
    this.cleanCollinear(outrec);
    if (outrec.pts === null || !_ClipperBase.buildPath(outrec.pts, this.reverseSolution, false, outrec.path)) {
      return false;
    }
    outrec.bounds = InternalClipper.getBounds(outrec.path);
    return true;
  }
  recursiveCheckOwners(outrec, polypath) {
    if (outrec.polypath !== null || Rect64Utils.isEmpty(outrec.bounds))
      return;
    while (outrec.owner !== null) {
      if (outrec.owner.splits !== null && this.checkSplitOwner(outrec, outrec.owner.splits))
        break;
      if (outrec.owner.pts !== null && this.checkBounds(outrec.owner) && // Fast reject: a container must contain the child's bounds.
      this.containsRect(outrec.owner.bounds, outrec.bounds) && this.path1InsidePath2(outrec.pts, outrec.owner.pts))
        break;
      outrec.owner = outrec.owner.owner;
    }
    if (outrec.owner !== null) {
      if (outrec.owner.polypath === null) {
        this.recursiveCheckOwners(outrec.owner, polypath);
      }
      outrec.polypath = outrec.owner.polypath.addChild(outrec.path);
    } else {
      outrec.polypath = polypath.addChild(outrec.path);
    }
  }
  cleanCollinear(outrec) {
    outrec = this.getRealOutRec(outrec);
    if (outrec === null || outrec.isOpen)
      return;
    if (!this.isValidClosedPath(outrec.pts)) {
      outrec.pts = null;
      return;
    }
    let startOp = outrec.pts;
    let op2 = startOp;
    while (true) {
      if (op2 !== null && InternalClipper.isCollinear(op2.prev.pt, op2.pt, op2.next.pt) && (op2.pt.x === op2.prev.pt.x && op2.pt.y === op2.prev.pt.y || op2.pt.x === op2.next.pt.x && op2.pt.y === op2.next.pt.y || !this.preserveCollinear || InternalClipper.dotProductSign(op2.prev.pt, op2.pt, op2.next.pt) < 0)) {
        if (op2 === outrec.pts) {
          outrec.pts = op2.prev;
        }
        op2 = this.disposeOutPt(op2);
        if (!this.isValidClosedPath(op2)) {
          outrec.pts = null;
          return;
        }
        startOp = op2;
        continue;
      }
      if (op2 === null)
        break;
      op2 = op2.next;
      if (op2 === startOp)
        break;
    }
    this.fixSelfIntersects(outrec);
  }
  isValidClosedPath(op) {
    return op !== null && op.next !== op && (op.next !== op.prev || !_ClipperBase.isVerySmallTriangle(op));
  }
  disposeOutPt(op) {
    const result = op.next === op ? null : op.next;
    op.prev.next = op.next;
    op.next.prev = op.prev;
    return result;
  }
  fixSelfIntersects(outrec) {
    let op2 = outrec.pts;
    if (op2.prev === op2.next.next) {
      return;
    }
    while (true) {
      if (op2.next && op2.next.next && this.boundingBoxesOverlap(op2.prev.pt, op2.pt, op2.next.pt, op2.next.next.pt) && InternalClipper.segsIntersect(op2.prev.pt, op2.pt, op2.next.pt, op2.next.next.pt)) {
        if (op2 === outrec.pts || op2.next === outrec.pts) {
          outrec.pts = outrec.pts.prev;
        }
        this.doSplitOp(outrec, op2);
        if (outrec.pts === null)
          return;
        op2 = outrec.pts;
        if (op2.prev === op2.next.next)
          break;
        continue;
      }
      op2 = op2.next;
      if (op2 === outrec.pts)
        break;
    }
  }
  doSplitOp(outrec, splitOp) {
    const prevOp = splitOp.prev;
    const nextNextOp = splitOp.next.next;
    outrec.pts = prevOp;
    const ip = InternalClipper.getLineIntersectPt(prevOp.pt, splitOp.pt, splitOp.next.pt, nextNextOp.pt);
    if (this.zCallbackInternal) {
      this.zCallbackInternal(prevOp.pt, splitOp.pt, splitOp.next.pt, nextNextOp.pt, ip);
    }
    const doubleArea1 = _ClipperBase.areaOutPt(prevOp);
    const absDoubleArea1 = doubleArea1 < B02 ? -doubleArea1 : doubleArea1;
    if (absDoubleArea1 < B42) {
      outrec.pts = null;
      return;
    }
    const doubleArea2 = this.areaTriangle(ip, splitOp.pt, splitOp.next.pt);
    const absDoubleArea2 = doubleArea2 < B02 ? -doubleArea2 : doubleArea2;
    if (ip.x === prevOp.pt.x && ip.y === prevOp.pt.y || ip.x === nextNextOp.pt.x && ip.y === nextNextOp.pt.y) {
      nextNextOp.prev = prevOp;
      prevOp.next = nextNextOp;
    } else {
      const newOp2 = new OutPt(ip, outrec);
      newOp2.prev = prevOp;
      newOp2.next = nextNextOp;
      nextNextOp.prev = newOp2;
      prevOp.next = newOp2;
    }
    if (!(absDoubleArea2 > B22) || // area > 1
    !(absDoubleArea2 > absDoubleArea1) && doubleArea2 > B02 !== doubleArea1 > B02)
      return;
    const newOutRec = this.newOutRec();
    newOutRec.owner = outrec.owner;
    splitOp.outrec = newOutRec;
    splitOp.next.outrec = newOutRec;
    const newOp = new OutPt(ip, newOutRec);
    newOp.prev = splitOp.next;
    newOp.next = splitOp;
    newOutRec.pts = newOp;
    splitOp.prev = newOp;
    splitOp.next.next = newOp;
    if (!this.usingPolytree)
      return;
    if (this.path1InsidePath2(prevOp, newOp)) {
      if (newOutRec.splits === null)
        newOutRec.splits = [];
      newOutRec.splits.push(outrec.idx);
    } else {
      if (outrec.splits === null)
        outrec.splits = [];
      outrec.splits.push(newOutRec.idx);
    }
  }
  static areaOutPt(op) {
    const maxCoord = InternalClipper.maxCoordForSafeAreaProduct;
    let area2 = 0;
    let allSmall = true;
    let op2 = op;
    do {
      const prev = op2.prev;
      const pt = op2.pt;
      if (Math.abs(prev.pt.x) >= maxCoord || Math.abs(prev.pt.y) >= maxCoord || Math.abs(pt.x) >= maxCoord || Math.abs(pt.y) >= maxCoord) {
        allSmall = false;
        break;
      }
      area2 += (prev.pt.y + pt.y) * (prev.pt.x - pt.x);
      op2 = op2.next;
    } while (op2 !== op);
    if (allSmall) {
      return BigInt(Math.round(area2));
    }
    let areaBig = B02;
    op2 = op;
    do {
      const prev = op2.prev;
      if (Number.isSafeInteger(prev.pt.y) && Number.isSafeInteger(op2.pt.y) && Number.isSafeInteger(prev.pt.x) && Number.isSafeInteger(op2.pt.x)) {
        const sumBig = BigInt(prev.pt.y) + BigInt(op2.pt.y);
        const diffBig = BigInt(prev.pt.x) - BigInt(op2.pt.x);
        areaBig += sumBig * diffBig;
      } else {
        const sum2 = prev.pt.y + op2.pt.y;
        const diff = prev.pt.x - op2.pt.x;
        areaBig += BigInt(Math.round(sum2 * diff));
      }
      op2 = op2.next;
    } while (op2 !== op);
    return areaBig;
  }
  areaTriangle(pt1, pt2, pt3) {
    const maxCoord = InternalClipper.maxCoordForSafeAreaProduct;
    if (Math.abs(pt1.x) < maxCoord && Math.abs(pt1.y) < maxCoord && Math.abs(pt2.x) < maxCoord && Math.abs(pt2.y) < maxCoord && Math.abs(pt3.x) < maxCoord && Math.abs(pt3.y) < maxCoord) {
      const area3 = (pt3.y + pt1.y) * (pt3.x - pt1.x) + (pt1.y + pt2.y) * (pt1.x - pt2.x) + (pt2.y + pt3.y) * (pt2.x - pt3.x);
      return BigInt(Math.round(area3));
    }
    if (Number.isSafeInteger(pt1.x) && Number.isSafeInteger(pt1.y) && Number.isSafeInteger(pt2.x) && Number.isSafeInteger(pt2.y) && Number.isSafeInteger(pt3.x) && Number.isSafeInteger(pt3.y)) {
      const term1 = (BigInt(pt3.y) + BigInt(pt1.y)) * (BigInt(pt3.x) - BigInt(pt1.x));
      const term2 = (BigInt(pt1.y) + BigInt(pt2.y)) * (BigInt(pt1.x) - BigInt(pt2.x));
      const term3 = (BigInt(pt2.y) + BigInt(pt3.y)) * (BigInt(pt2.x) - BigInt(pt3.x));
      return term1 + term2 + term3;
    }
    const area2 = (pt3.y + pt1.y) * (pt3.x - pt1.x) + (pt1.y + pt2.y) * (pt1.x - pt2.x) + (pt2.y + pt3.y) * (pt2.x - pt3.x);
    return BigInt(Math.round(area2));
  }
  isValidOwner(outRec, testOwner) {
    while (testOwner !== null && testOwner !== outRec) {
      testOwner = testOwner.owner;
    }
    return testOwner === null;
  }
  containsRect(rect, rec) {
    return rec.left >= rect.left && rec.right <= rect.right && rec.top >= rect.top && rec.bottom <= rect.bottom;
  }
  checkSplitOwner(outrec, splits) {
    for (let i = 0; i < splits.length; i++) {
      let split = this.outrecList[splits[i]];
      if (split.pts === null && split.splits !== null && this.checkSplitOwner(outrec, split.splits))
        return true;
      split = this.getRealOutRec(split);
      if (split === null || split === outrec || split.recursiveSplit === outrec)
        continue;
      split.recursiveSplit = outrec;
      if (split.splits !== null && this.checkSplitOwner(outrec, split.splits))
        return true;
      if (!this.checkBounds(split) || !this.containsRect(split.bounds, outrec.bounds) || !this.path1InsidePath2(outrec.pts, split.pts))
        continue;
      if (!this.isValidOwner(outrec, split)) {
        split.owner = outrec.owner;
      }
      outrec.owner = split;
      return true;
    }
    return false;
  }
};
var Clipper64 = class extends ClipperBase {
  zCallback;
  getZCallback() {
    return this.zCallback;
  }
  addPath(path, polytype, isOpen = false) {
    super.addPath(path, polytype, isOpen);
  }
  addReuseableData(reuseableData) {
    super.addReuseableData(reuseableData);
  }
  addPaths(paths, polytype, isOpen = false) {
    super.addPaths(paths, polytype, isOpen);
  }
  addSubject(paths) {
    this.addPaths(paths, PathType.Subject);
  }
  addOpenSubject(paths) {
    this.addPaths(paths, PathType.Subject, true);
  }
  addClip(paths) {
    this.addPaths(paths, PathType.Clip);
  }
  execute(clipType, fillRule, solutionOrTree, openPathsOrSolutionOpen) {
    if (Array.isArray(solutionOrTree)) {
      const solutionClosed = solutionOrTree;
      const solutionOpen = openPathsOrSolutionOpen;
      solutionClosed.length = 0;
      if (solutionOpen)
        solutionOpen.length = 0;
      try {
        this.executeInternal(clipType, fillRule);
        this.buildPaths(solutionClosed, solutionOpen || []);
      } catch {
        this.succeeded = false;
      }
      this.clearSolutionOnly();
      return this.succeeded;
    } else {
      const polytree = solutionOrTree;
      const openPaths = openPathsOrSolutionOpen;
      polytree.clear();
      if (openPaths)
        openPaths.length = 0;
      this.usingPolytree = true;
      try {
        this.executeInternal(clipType, fillRule);
        this.buildTree(polytree, openPaths || []);
      } catch {
        this.succeeded = false;
      }
      this.clearSolutionOnly();
      return this.succeeded;
    }
  }
};
var ClipperD = class extends ClipperBase {
  zCallback;
  scale;
  invScale;
  constructor(roundingDecimalPrecision = 2) {
    super();
    InternalClipper.checkPrecision(roundingDecimalPrecision);
    this.scale = Math.pow(10, roundingDecimalPrecision);
    this.invScale = 1 / this.scale;
  }
  getZCallback() {
    return this.zCallback;
  }
  scalePathDFromInt(path, scale2) {
    const result = [];
    for (const pt of path) {
      result.push({
        x: pt.x * scale2,
        y: pt.y * scale2,
        z: pt.z || 0
      });
    }
    return result;
  }
  buildPathsD(solutionClosed, solutionOpen) {
    solutionClosed.length = 0;
    solutionOpen.length = 0;
    let i = 0;
    while (i < this.outrecList.length) {
      const outrec = this.outrecList[i++];
      if (outrec.pts === null)
        continue;
      const path = [];
      if (outrec.isOpen) {
        if (ClipperBase.buildPath(outrec.pts, this.reverseSolution, true, path)) {
          solutionOpen.push(this.scalePathDFromInt(path, this.invScale));
        }
      } else {
        this.cleanCollinear(outrec);
        if (ClipperBase.buildPath(outrec.pts, this.reverseSolution, false, path)) {
          solutionClosed.push(this.scalePathDFromInt(path, this.invScale));
        }
      }
    }
    return true;
  }
  buildTreeD(polytree, solutionOpen) {
    polytree.clear();
    solutionOpen.length = 0;
    let i = 0;
    while (i < this.outrecList.length) {
      const outrec = this.outrecList[i++];
      if (outrec.pts === null)
        continue;
      if (outrec.isOpen) {
        const openPath = [];
        if (ClipperBase.buildPath(outrec.pts, this.reverseSolution, true, openPath)) {
          solutionOpen.push(this.scalePathDFromInt(openPath, this.invScale));
        }
        continue;
      }
      if (this.checkBounds(outrec)) {
        this.recursiveCheckOwners(outrec, polytree);
      }
    }
  }
  addPath(path, polytype, isOpen = false) {
    const tmp = [path];
    this.addPaths(tmp, polytype, isOpen);
  }
  addPaths(paths, polytype, isOpen = false) {
    super.addPaths(Clipper.scalePaths64(paths, this.scale), polytype, isOpen);
  }
  addSubject(path) {
    this.addPath(path, PathType.Subject);
  }
  addOpenSubject(path) {
    this.addPath(path, PathType.Subject, true);
  }
  addClip(path) {
    this.addPath(path, PathType.Clip);
  }
  addSubjectPaths(paths) {
    this.addPaths(paths, PathType.Subject);
  }
  addOpenSubjectPaths(paths) {
    this.addPaths(paths, PathType.Subject, true);
  }
  addClipPaths(paths) {
    this.addPaths(paths, PathType.Clip);
  }
  execute(clipType, fillRule, solutionOrTree, openPathsOrSolutionOpen) {
    if (Array.isArray(solutionOrTree)) {
      const solutionClosed = solutionOrTree;
      const solutionOpen = openPathsOrSolutionOpen;
      const solClosed64 = [];
      const solOpen64 = [];
      solutionClosed.length = 0;
      if (solutionOpen)
        solutionOpen.length = 0;
      let success = true;
      try {
        this.executeInternal(clipType, fillRule);
        this.buildPaths(solClosed64, solOpen64);
      } catch {
        success = false;
      }
      this.clearSolutionOnly();
      if (!success)
        return false;
      for (const path of solClosed64) {
        solutionClosed.push(this.scalePathDFromInt(path, this.invScale));
      }
      if (solutionOpen) {
        for (const path of solOpen64) {
          solutionOpen.push(this.scalePathDFromInt(path, this.invScale));
        }
      }
      return true;
    } else {
      const polytree = solutionOrTree;
      const openPaths = openPathsOrSolutionOpen;
      polytree.clear();
      if (openPaths)
        openPaths.length = 0;
      this.usingPolytree = true;
      polytree.scale = this.scale;
      let success = true;
      try {
        this.executeInternal(clipType, fillRule);
        this.buildTreeD(polytree, openPaths || []);
      } catch {
        success = false;
      }
      this.clearSolutionOnly();
      return success;
    }
  }
};
var Clipper = {
  area(path) {
    return InternalClipper.area(path);
  },
  areaD(path) {
    let a = 0;
    const cnt = path.length;
    if (cnt < 3)
      return 0;
    let prevPt = path[cnt - 1];
    for (const pt of path) {
      a += (prevPt.y + pt.y) * (prevPt.x - pt.x);
      prevPt = pt;
    }
    return a * 0.5;
  },
  scalePath64(path, scale2) {
    const maxAbs = InternalClipper.maxSafeCoordinateForScale(scale2);
    const result = [];
    for (const pt of path) {
      InternalClipper.checkSafeScaleValue(pt.x, maxAbs, "scalePath64");
      InternalClipper.checkSafeScaleValue(pt.y, maxAbs, "scalePath64");
      result.push({
        x: Math.round(pt.x * scale2),
        y: Math.round(pt.y * scale2)
      });
    }
    return result;
  },
  scalePaths64(paths, scale2) {
    const result = [];
    for (const path of paths) {
      result.push(Clipper.scalePath64(path, scale2));
    }
    return result;
  },
  scalePathD(path, scale2) {
    const result = [];
    for (const pt of path) {
      result.push({
        x: pt.x * scale2,
        y: pt.y * scale2
      });
    }
    return result;
  },
  scalePathsD(paths, scale2) {
    const result = [];
    for (const path of paths) {
      result.push(Clipper.scalePathD(path, scale2));
    }
    return result;
  }
};

// node_modules/.pnpm/clipper2-ts@2.0.1-18/node_modules/clipper2-ts/dist/Offset.js
var JoinType;
(function(JoinType2) {
  JoinType2[JoinType2["Miter"] = 0] = "Miter";
  JoinType2[JoinType2["Square"] = 1] = "Square";
  JoinType2[JoinType2["Bevel"] = 2] = "Bevel";
  JoinType2[JoinType2["Round"] = 3] = "Round";
})(JoinType || (JoinType = {}));
var EndType;
(function(EndType2) {
  EndType2[EndType2["Polygon"] = 0] = "Polygon";
  EndType2[EndType2["Joined"] = 1] = "Joined";
  EndType2[EndType2["Butt"] = 2] = "Butt";
  EndType2[EndType2["Square"] = 3] = "Square";
  EndType2[EndType2["Round"] = 4] = "Round";
})(EndType || (EndType = {}));
var Group = class {
  inPaths;
  joinType;
  endType;
  pathsReversed;
  lowestPathIdx;
  constructor(paths, joinType, endType = EndType.Polygon) {
    this.joinType = joinType;
    this.endType = endType;
    const isJoined = endType === EndType.Polygon || endType === EndType.Joined;
    this.inPaths = [];
    for (const path of paths) {
      this.inPaths.push(ClipperOffset.stripDuplicates(path, isJoined));
    }
    if (endType === EndType.Polygon) {
      const lowestInfo = ClipperOffset.getLowestPathInfo(this.inPaths);
      this.lowestPathIdx = lowestInfo.idx;
      this.pathsReversed = this.lowestPathIdx >= 0 && lowestInfo.isNegArea;
    } else {
      this.lowestPathIdx = -1;
      this.pathsReversed = false;
    }
  }
};
var ClipperOffset = class _ClipperOffset {
  static Tolerance = 1e-12;
  // Clipper2 approximates arcs by using series of relatively short straight
  //line segments. And logically, shorter line segments will produce better arc
  // approximations. But very short segments can degrade performance, usually
  // with little or no discernable improvement in curve quality. Very short
  // segments can even detract from curve quality, due to the effects of integer
  // rounding. Since there isn't an optimal number of line segments for any given
  // arc radius (that perfectly balances curve approximation with performance),
  // arc tolerance is user defined. Nevertheless, when the user doesn't define
  // an arc tolerance (ie leaves alone the 0 default value), the calculated
  // default arc tolerance (offset_radius / 500) generally produces good (smooth)
  // arc approximations without producing excessively small segment lengths.
  // See also: https://www.angusj.com/clipper2/Docs/Trigonometry.htm
  static arc_const = 2e-3;
  // <-- 1/500
  groupList = [];
  pathOut = [];
  normals = [];
  solution = [];
  solutionTree = null;
  groupDelta = 0;
  //*0.5 for open paths; *-1.0 for negative areas
  delta = 0;
  mitLimSqr = 0;
  stepsPerRad = 0;
  stepSin = 0;
  stepCos = 0;
  joinType = JoinType.Bevel;
  endType = EndType.Polygon;
  arcTolerance = 0;
  mergeGroups = true;
  miterLimit = 2;
  preserveCollinear = false;
  reverseSolution = false;
  zCallback;
  deltaCallback = null;
  constructor(miterLimit = 2, arcTolerance = 0, preserveCollinear = false, reverseSolution = false) {
    this.miterLimit = miterLimit;
    this.arcTolerance = arcTolerance;
    this.mergeGroups = true;
    this.preserveCollinear = preserveCollinear;
    this.reverseSolution = reverseSolution;
  }
  clear() {
    this.groupList.length = 0;
  }
  // Internal Z callback that implements default Z handling before calling user callback
  ZCB = (bot1, top1, bot2, top2, intersectPt) => {
    if ((bot1.z || 0) !== 0 && (bot1.z === bot2.z || bot1.z === top2.z)) {
      intersectPt.z = bot1.z;
    } else if ((bot2.z || 0) !== 0 && bot2.z === top1.z) {
      intersectPt.z = bot2.z;
    } else if ((top1.z || 0) !== 0 && top1.z === top2.z) {
      intersectPt.z = top1.z;
    } else if (this.zCallback) {
      this.zCallback(bot1, top1, bot2, top2, intersectPt);
    }
  };
  addPath(path, joinType, endType) {
    if (path.length === 0)
      return;
    const pp = [path];
    this.addPaths(pp, joinType, endType);
  }
  addPaths(paths, joinType, endType) {
    if (paths.length === 0)
      return;
    this.groupList.push(new Group(paths, joinType, endType));
  }
  calcSolutionCapacity() {
    let result = 0;
    for (const g of this.groupList) {
      result += g.endType === EndType.Joined ? g.inPaths.length * 2 : g.inPaths.length;
    }
    return result;
  }
  checkPathsReversed() {
    let result = false;
    for (const g of this.groupList) {
      if (g.endType === EndType.Polygon) {
        result = g.pathsReversed;
        break;
      }
    }
    return result;
  }
  executeInternal(delta) {
    if (this.groupList.length === 0)
      return;
    if (Math.abs(delta) < 0.5) {
      for (const group of this.groupList) {
        for (const path of group.inPaths) {
          this.solution.push(path);
        }
      }
      return;
    }
    this.delta = delta;
    this.mitLimSqr = this.miterLimit <= 1 ? 2 : 2 / _ClipperOffset.sqr(this.miterLimit);
    for (const group of this.groupList) {
      this.doGroupOffset(group);
    }
    if (this.groupList.length === 0)
      return;
    const pathsReversed = this.checkPathsReversed();
    const fillRule = pathsReversed ? FillRule.Negative : FillRule.Positive;
    const c = new Clipper64();
    c.preserveCollinear = this.preserveCollinear;
    c.reverseSolution = this.reverseSolution !== pathsReversed;
    c.zCallback = this.ZCB;
    c.addSubject(this.solution);
    if (this.solutionTree !== null) {
      c.execute(ClipType.Union, fillRule, this.solutionTree);
    } else {
      c.execute(ClipType.Union, fillRule, this.solution);
    }
  }
  execute(delta, solutionOrTree) {
    if (Array.isArray(solutionOrTree)) {
      const solution = solutionOrTree;
      solution.length = 0;
      this.solution = solution;
      this.executeInternal(delta);
    } else {
      const solutionTree = solutionOrTree;
      solutionTree.clear();
      this.solutionTree = solutionTree;
      this.solution = [];
      this.executeInternal(delta);
    }
  }
  executeWithCallback(deltaCallback, solution) {
    this.deltaCallback = deltaCallback;
    this.execute(1, solution);
  }
  static getUnitNormal(pt1, pt2) {
    const dx = pt2.x - pt1.x;
    const dy = pt2.y - pt1.y;
    if (dx === 0 && dy === 0)
      return { x: 0, y: 0 };
    const f3 = 1 / Math.sqrt(dx * dx + dy * dy);
    return {
      x: dy * f3,
      y: -dx * f3
    };
  }
  static getLowestPathInfo(paths) {
    let idx = -1;
    let isNegArea = false;
    const botPt = { x: Number.MAX_SAFE_INTEGER, y: Number.MIN_SAFE_INTEGER };
    for (let i = 0; i < paths.length; ++i) {
      let a = Number.MAX_VALUE;
      for (const pt of paths[i]) {
        if (pt.y < botPt.y || pt.y === botPt.y && pt.x >= botPt.x)
          continue;
        if (a === Number.MAX_VALUE) {
          a = _ClipperOffset.area(paths[i]);
          if (a === 0)
            break;
          isNegArea = a < 0;
        }
        idx = i;
        botPt.x = pt.x;
        botPt.y = pt.y;
      }
    }
    return { idx, isNegArea };
  }
  static translatePoint(pt, dx, dy) {
    return { x: pt.x + dx, y: pt.y + dy, z: pt.z };
  }
  static reflectPoint(pt, pivot) {
    return { x: pivot.x + (pivot.x - pt.x), y: pivot.y + (pivot.y - pt.y), z: pt.z };
  }
  static almostZero(value, epsilon2 = 1e-3) {
    return Math.abs(value) < epsilon2;
  }
  static hypotenuse(x, y) {
    return Math.sqrt(x * x + y * y);
  }
  static normalizeVector(vec2) {
    const h = _ClipperOffset.hypotenuse(vec2.x, vec2.y);
    if (_ClipperOffset.almostZero(h))
      return { x: 0, y: 0 };
    const inverseHypot = 1 / h;
    return { x: vec2.x * inverseHypot, y: vec2.y * inverseHypot };
  }
  static getAvgUnitVector(vec1, vec2) {
    return _ClipperOffset.normalizeVector({ x: vec1.x + vec2.x, y: vec1.y + vec2.y });
  }
  static intersectPoint(pt1a, pt1b, pt2a, pt2b) {
    if (InternalClipper.isAlmostZero(pt1a.x - pt1b.x)) {
      if (InternalClipper.isAlmostZero(pt2a.x - pt2b.x))
        return { x: 0, y: 0 };
      const m2 = (pt2b.y - pt2a.y) / (pt2b.x - pt2a.x);
      const b2 = pt2a.y - m2 * pt2a.x;
      return { x: pt1a.x, y: m2 * pt1a.x + b2 };
    }
    if (InternalClipper.isAlmostZero(pt2a.x - pt2b.x)) {
      const m1 = (pt1b.y - pt1a.y) / (pt1b.x - pt1a.x);
      const b1 = pt1a.y - m1 * pt1a.x;
      return { x: pt2a.x, y: m1 * pt2a.x + b1 };
    } else {
      const m1 = (pt1b.y - pt1a.y) / (pt1b.x - pt1a.x);
      const b1 = pt1a.y - m1 * pt1a.x;
      const m2 = (pt2b.y - pt2a.y) / (pt2b.x - pt2a.x);
      const b2 = pt2a.y - m2 * pt2a.x;
      if (InternalClipper.isAlmostZero(m1 - m2))
        return { x: 0, y: 0 };
      const x = (b2 - b1) / (m1 - m2);
      return { x, y: m1 * x + b1 };
    }
  }
  getPerpendic(pt, norm) {
    return {
      x: Math.round(pt.x + norm.x * this.groupDelta),
      y: Math.round(pt.y + norm.y * this.groupDelta),
      z: pt.z || 0
    };
  }
  getPerpendicD(pt, norm) {
    return {
      x: pt.x + norm.x * this.groupDelta,
      y: pt.y + norm.y * this.groupDelta,
      z: pt.z || 0
    };
  }
  doBevel(path, j, k) {
    let pt1, pt2;
    const pjz = path[j].z || 0;
    if (j === k) {
      const absDelta = Math.abs(this.groupDelta);
      pt1 = {
        x: Math.round(path[j].x - absDelta * this.normals[j].x),
        y: Math.round(path[j].y - absDelta * this.normals[j].y),
        z: pjz
      };
      pt2 = {
        x: Math.round(path[j].x + absDelta * this.normals[j].x),
        y: Math.round(path[j].y + absDelta * this.normals[j].y),
        z: pjz
      };
    } else {
      pt1 = {
        x: Math.round(path[j].x + this.groupDelta * this.normals[k].x),
        y: Math.round(path[j].y + this.groupDelta * this.normals[k].y),
        z: pjz
      };
      pt2 = {
        x: Math.round(path[j].x + this.groupDelta * this.normals[j].x),
        y: Math.round(path[j].y + this.groupDelta * this.normals[j].y),
        z: pjz
      };
    }
    this.pathOut.push(pt1);
    this.pathOut.push(pt2);
  }
  doSquare(path, j, k) {
    let vec2;
    if (j === k) {
      vec2 = { x: this.normals[j].y, y: -this.normals[j].x };
    } else {
      vec2 = _ClipperOffset.getAvgUnitVector({ x: -this.normals[k].y, y: this.normals[k].x }, { x: this.normals[j].y, y: -this.normals[j].x });
    }
    const absDelta = Math.abs(this.groupDelta);
    let ptQ = { x: path[j].x, y: path[j].y, z: path[j].z || 0 };
    ptQ = _ClipperOffset.translatePoint(ptQ, absDelta * vec2.x, absDelta * vec2.y);
    const pt1 = _ClipperOffset.translatePoint(ptQ, this.groupDelta * vec2.y, this.groupDelta * -vec2.x);
    const pt2 = _ClipperOffset.translatePoint(ptQ, this.groupDelta * -vec2.y, this.groupDelta * vec2.x);
    const pt3 = this.getPerpendicD(path[k], this.normals[k]);
    if (j === k) {
      const pt4 = {
        x: pt3.x + vec2.x * this.groupDelta,
        y: pt3.y + vec2.y * this.groupDelta
      };
      const pt = _ClipperOffset.intersectPoint(pt1, pt2, pt3, pt4);
      pt.z = ptQ.z;
      this.pathOut.push(Point64Utils.fromPointD(_ClipperOffset.reflectPoint(pt, ptQ)));
      this.pathOut.push(Point64Utils.fromPointD(pt));
    } else {
      const pt4 = this.getPerpendicD(path[j], this.normals[k]);
      const pt = _ClipperOffset.intersectPoint(pt1, pt2, pt3, pt4);
      pt.z = ptQ.z;
      this.pathOut.push(Point64Utils.fromPointD(pt));
      this.pathOut.push(Point64Utils.fromPointD(_ClipperOffset.reflectPoint(pt, ptQ)));
    }
  }
  doMiter(path, j, k, cosA) {
    const q = this.groupDelta / (cosA + 1);
    this.pathOut.push({
      x: Math.round(path[j].x + (this.normals[k].x + this.normals[j].x) * q),
      y: Math.round(path[j].y + (this.normals[k].y + this.normals[j].y) * q),
      z: path[j].z || 0
    });
  }
  doRound(path, j, k, angle) {
    if (this.deltaCallback !== null) {
      const absDelta = Math.abs(this.groupDelta);
      const arcTol = this.arcTolerance > 0.01 ? this.arcTolerance : absDelta * _ClipperOffset.arc_const;
      const stepsPer360 = Math.PI / Math.acos(1 - arcTol / absDelta);
      this.stepSin = Math.sin(2 * Math.PI / stepsPer360);
      this.stepCos = Math.cos(2 * Math.PI / stepsPer360);
      if (this.groupDelta < 0)
        this.stepSin = -this.stepSin;
      this.stepsPerRad = stepsPer360 / (2 * Math.PI);
    }
    const pt = path[j];
    const ptz = pt.z || 0;
    let offsetVec = { x: this.normals[k].x * this.groupDelta, y: this.normals[k].y * this.groupDelta };
    if (j === k)
      PointDUtils.negate(offsetVec);
    this.pathOut.push({
      x: Math.round(pt.x + offsetVec.x),
      y: Math.round(pt.y + offsetVec.y),
      z: ptz
    });
    const steps = Math.ceil(this.stepsPerRad * Math.abs(angle));
    for (let i = 1; i < steps; i++) {
      offsetVec = {
        x: offsetVec.x * this.stepCos - this.stepSin * offsetVec.y,
        y: offsetVec.x * this.stepSin + offsetVec.y * this.stepCos
      };
      this.pathOut.push({
        x: Math.round(pt.x + offsetVec.x),
        y: Math.round(pt.y + offsetVec.y),
        z: ptz
      });
    }
    this.pathOut.push(this.getPerpendic(path[j], this.normals[j]));
  }
  buildNormals(path) {
    const cnt = path.length;
    this.normals.length = 0;
    if (cnt === 0)
      return;
    for (let i = 0; i < cnt - 1; i++) {
      this.normals.push(_ClipperOffset.getUnitNormal(path[i], path[i + 1]));
    }
    this.normals.push(_ClipperOffset.getUnitNormal(path[cnt - 1], path[0]));
  }
  offsetPoint(group, path, j, k) {
    if (Point64Utils.equals(path[j], path[k]))
      return;
    let sinA = InternalClipper.crossProductD(this.normals[j], this.normals[k]);
    const cosA = InternalClipper.dotProductD(this.normals[j], this.normals[k]);
    if (sinA > 1)
      sinA = 1;
    else if (sinA < -1)
      sinA = -1;
    if (this.deltaCallback !== null) {
      this.groupDelta = this.deltaCallback(path, this.normals, j, k);
      if (group.pathsReversed)
        this.groupDelta = -this.groupDelta;
    }
    if (Math.abs(this.groupDelta) < _ClipperOffset.Tolerance) {
      this.pathOut.push(path[j]);
      return;
    }
    if (cosA > -0.999 && sinA * this.groupDelta < 0) {
      this.pathOut.push(this.getPerpendic(path[j], this.normals[k]));
      this.pathOut.push(path[j]);
      this.pathOut.push(this.getPerpendic(path[j], this.normals[j]));
    } else if (cosA > 0.999 && this.joinType !== JoinType.Round) {
      this.doMiter(path, j, k, cosA);
    } else {
      switch (this.joinType) {
        // miter unless the angle is sufficiently acute to exceed ML
        case JoinType.Miter:
          if (cosA > this.mitLimSqr - 1) {
            this.doMiter(path, j, k, cosA);
          } else {
            this.doSquare(path, j, k);
          }
          break;
        case JoinType.Round:
          this.doRound(path, j, k, Math.atan2(sinA, cosA));
          break;
        case JoinType.Bevel:
          this.doBevel(path, j, k);
          break;
        default:
          this.doSquare(path, j, k);
          break;
      }
    }
  }
  offsetPolygon(group, path) {
    this.pathOut = [];
    const cnt = path.length;
    let prev = cnt - 1;
    for (let i = 0; i < cnt; i++) {
      this.offsetPoint(group, path, i, prev);
      prev = i;
    }
    this.solution.push(this.pathOut);
  }
  offsetOpenJoined(group, path) {
    this.offsetPolygon(group, path);
    const reversePath2 = [...path].reverse();
    this.buildNormals(reversePath2);
    this.offsetPolygon(group, reversePath2);
  }
  offsetOpenPath(group, path) {
    this.pathOut = [];
    const highI = path.length - 1;
    if (this.deltaCallback !== null) {
      this.groupDelta = this.deltaCallback(path, this.normals, 0, 0);
    }
    if (Math.abs(this.groupDelta) < _ClipperOffset.Tolerance) {
      this.pathOut.push(path[0]);
    } else {
      switch (this.endType) {
        case EndType.Butt:
          this.doBevel(path, 0, 0);
          break;
        case EndType.Round:
          this.doRound(path, 0, 0, Math.PI);
          break;
        default:
          this.doSquare(path, 0, 0);
          break;
      }
    }
    for (let i = 1, k = 0; i < highI; i++) {
      this.offsetPoint(group, path, i, k);
      k = i;
    }
    for (let i = highI; i > 0; i--) {
      this.normals[i] = { x: -this.normals[i - 1].x, y: -this.normals[i - 1].y };
    }
    this.normals[0] = this.normals[highI];
    if (this.deltaCallback !== null) {
      this.groupDelta = this.deltaCallback(path, this.normals, highI, highI);
    }
    if (Math.abs(this.groupDelta) < _ClipperOffset.Tolerance) {
      this.pathOut.push(path[highI]);
    } else {
      switch (this.endType) {
        case EndType.Butt:
          this.doBevel(path, highI, highI);
          break;
        case EndType.Round:
          this.doRound(path, highI, highI, Math.PI);
          break;
        default:
          this.doSquare(path, highI, highI);
          break;
      }
    }
    for (let i = highI - 1, k = highI; i > 0; i--) {
      this.offsetPoint(group, path, i, k);
      k = i;
    }
    this.solution.push(this.pathOut);
  }
  doGroupOffset(group) {
    if (group.endType === EndType.Polygon) {
      if (group.lowestPathIdx < 0)
        this.delta = Math.abs(this.delta);
      this.groupDelta = group.pathsReversed ? -this.delta : this.delta;
    } else {
      this.groupDelta = Math.abs(this.delta);
    }
    const absDelta = Math.abs(this.groupDelta);
    this.joinType = group.joinType;
    this.endType = group.endType;
    if (group.joinType === JoinType.Round || group.endType === EndType.Round) {
      const arcTol = this.arcTolerance > 0.01 ? this.arcTolerance : absDelta * _ClipperOffset.arc_const;
      const stepsPer360 = Math.PI / Math.acos(1 - arcTol / absDelta);
      this.stepSin = Math.sin(2 * Math.PI / stepsPer360);
      this.stepCos = Math.cos(2 * Math.PI / stepsPer360);
      if (this.groupDelta < 0)
        this.stepSin = -this.stepSin;
      this.stepsPerRad = stepsPer360 / (2 * Math.PI);
    }
    for (const pathIn of group.inPaths) {
      this.pathOut = [];
      const cnt = pathIn.length;
      if (cnt === 1) {
        const pt = pathIn[0];
        if (this.deltaCallback !== null) {
          this.groupDelta = this.deltaCallback(pathIn, this.normals, 0, 0);
          if (group.pathsReversed)
            this.groupDelta = -this.groupDelta;
        }
        const ptz = pt.z || 0;
        if (group.endType === EndType.Round) {
          const steps = Math.ceil(this.stepsPerRad * 2 * Math.PI);
          this.pathOut = _ClipperOffset.ellipse(pt, Math.abs(this.groupDelta), Math.abs(this.groupDelta), steps);
          if (ptz !== 0)
            for (let i = 0; i < this.pathOut.length; i++)
              this.pathOut[i].z = ptz;
        } else {
          const d = Math.ceil(Math.abs(this.groupDelta));
          const r = { left: pt.x - d, top: pt.y - d, right: pt.x + d, bottom: pt.y + d };
          this.pathOut = [
            { x: r.left, y: r.top, z: ptz },
            { x: r.right, y: r.top, z: ptz },
            { x: r.right, y: r.bottom, z: ptz },
            { x: r.left, y: r.bottom, z: ptz }
          ];
        }
        this.solution.push(this.pathOut);
        continue;
      }
      if (cnt === 2 && group.endType === EndType.Joined) {
        this.endType = group.joinType === JoinType.Round ? EndType.Round : EndType.Square;
      }
      this.buildNormals(pathIn);
      switch (this.endType) {
        case EndType.Polygon:
          this.offsetPolygon(group, pathIn);
          break;
        case EndType.Joined:
          this.offsetOpenJoined(group, pathIn);
          break;
        default:
          this.offsetOpenPath(group, pathIn);
          break;
      }
    }
  }
  static stripDuplicates(path, isClosedPath) {
    const cnt = path.length;
    const result = [];
    if (cnt === 0)
      return result;
    let lastPt = path[0];
    result.push(lastPt);
    for (let i = 1; i < cnt; i++) {
      if (!Point64Utils.equals(lastPt, path[i])) {
        lastPt = path[i];
        result.push(lastPt);
      }
    }
    if (isClosedPath && Point64Utils.equals(lastPt, result[0])) {
      result.pop();
    }
    return result;
  }
  static area(path) {
    return InternalClipper.area(path);
  }
  static sqr(val) {
    return val * val;
  }
  static ellipse(center, radiusX, radiusY = 0, steps = 0) {
    if (radiusX <= 0)
      return [];
    if (radiusY <= 0)
      radiusY = radiusX;
    if (steps <= 2) {
      steps = Math.ceil(Math.PI * Math.sqrt((radiusX + radiusY) / 2));
    }
    const si = Math.sin(2 * Math.PI / steps);
    const co = Math.cos(2 * Math.PI / steps);
    let dx = co;
    let dy = si;
    const result = [{ x: Math.round(center.x + radiusX), y: center.y }];
    for (let i = 1; i < steps; ++i) {
      result.push({
        x: Math.round(center.x + radiusX * dx),
        y: Math.round(center.y + radiusY * dy)
      });
      const x = dx * co - dy * si;
      dy = dy * co + dx * si;
      dx = x;
    }
    return result;
  }
};

// node_modules/.pnpm/clipper2-ts@2.0.1-18/node_modules/clipper2-ts/dist/Clipper.js
var B23 = BigInt(2);
function intersectD(subject, clip, fillRule, precision = 2) {
  return booleanOpD(ClipType.Intersection, subject, clip, fillRule, precision);
}
function unionD(subject, clipOrFillRule, fillRuleOrPrecision, precision) {
  if (typeof clipOrFillRule === "number") {
    return booleanOpD(ClipType.Union, subject, null, clipOrFillRule);
  } else {
    return booleanOpD(ClipType.Union, subject, clipOrFillRule, fillRuleOrPrecision, precision || 2);
  }
}
function differenceD(subject, clip, fillRule, precision = 2) {
  return booleanOpD(ClipType.Difference, subject, clip, fillRule, precision);
}
function booleanOpD(clipType, subject, clip, fillRule, precision = 2) {
  const solution = [];
  const c = new ClipperD(precision);
  c.addSubjectPaths(subject);
  if (clip !== null) {
    c.addClipPaths(clip);
  }
  c.execute(clipType, fillRule, solution);
  return solution;
}
function booleanOpDWithPolyTree(clipType, subject, clip, polytree, fillRule, precision = 2) {
  if (subject === null)
    return;
  const c = new ClipperD(precision);
  c.addSubjectPaths(subject);
  if (clip !== null) {
    c.addClipPaths(clip);
  }
  c.execute(clipType, fillRule, polytree);
}
function inflatePathsD(paths, delta, joinType, endType, miterLimit = 2, precision = 2, arcTolerance = 0) {
  InternalClipper.checkPrecision(precision);
  const scale2 = Math.pow(10, precision);
  const tmp = scalePaths64(paths, scale2);
  const co = new ClipperOffset(miterLimit, scale2 * arcTolerance);
  co.addPaths(tmp, joinType, endType);
  const solution = [];
  co.execute(delta * scale2, solution);
  return scalePathsD(solution, 1 / scale2);
}
function areaD(path) {
  let a = 0;
  const cnt = path.length;
  if (cnt < 3)
    return 0;
  let prevPt = path[cnt - 1];
  for (const pt of path) {
    a += (prevPt.y + pt.y) * (prevPt.x - pt.x);
    prevPt = pt;
  }
  return a * 0.5;
}
function areaPathsD(paths) {
  let a = 0;
  for (const path of paths) {
    a += areaD(path);
  }
  return a;
}
function scalePathD(path, scale2) {
  if (InternalClipper.isAlmostZero(scale2 - 1))
    return path;
  const result = [];
  for (const pt of path) {
    result.push(PointDUtils.scale(pt, scale2));
  }
  return result;
}
function scalePathsD(paths, scale2) {
  if (InternalClipper.isAlmostZero(scale2 - 1))
    return paths;
  const result = [];
  for (const path of paths) {
    result.push(scalePathD(path, scale2));
  }
  return result;
}
function scalePath64(path, scale2) {
  const maxAbs = InternalClipper.maxSafeCoordinateForScale(scale2);
  const result = [];
  for (const pt of path) {
    InternalClipper.checkSafeScaleValue(pt.x, maxAbs, "scalePath64");
    InternalClipper.checkSafeScaleValue(pt.y, maxAbs, "scalePath64");
    result.push({
      x: Math.round(pt.x * scale2),
      y: Math.round(pt.y * scale2)
    });
  }
  return result;
}
function scalePaths64(paths, scale2) {
  const result = [];
  for (const path of paths) {
    result.push(scalePath64(path, scale2));
  }
  return result;
}
function scalePathDFromInt(path, scale2) {
  const result = [];
  for (const pt of path) {
    result.push({
      x: pt.x * scale2,
      y: pt.y * scale2
    });
  }
  return result;
}
function sqr(val) {
  return val * val;
}
function perpendicDistFromLineSqrd(pt, line1, line2) {
  const a = pt.x - line1.x;
  const b = pt.y - line1.y;
  const c = line2.x - line1.x;
  const d = line2.y - line1.y;
  if (c === 0 && d === 0)
    return 0;
  return sqr(a * d - c * b) / (c * c + d * d);
}
function getNext(current, high, flags) {
  ++current;
  while (current <= high && flags[current])
    ++current;
  if (current <= high)
    return current;
  current = 0;
  while (flags[current])
    ++current;
  return current;
}
function getPrior(current, high, flags) {
  if (current === 0)
    current = high;
  else
    --current;
  while (current > 0 && flags[current])
    --current;
  if (!flags[current])
    return current;
  current = high;
  while (flags[current])
    --current;
  return current;
}
function simplifyPathD(path, epsilon2, isClosedPath = true) {
  const len = path.length;
  const high = len - 1;
  const epsSqr = sqr(epsilon2);
  if (len < 4)
    return path;
  const flags = new Array(len).fill(false);
  const dsq = new Array(len).fill(0);
  let curr = 0;
  if (isClosedPath) {
    dsq[0] = perpendicDistFromLineSqrd(path[0], path[high], path[1]);
    dsq[high] = perpendicDistFromLineSqrd(path[high], path[0], path[high - 1]);
  } else {
    dsq[0] = Number.MAX_VALUE;
    dsq[high] = Number.MAX_VALUE;
  }
  for (let i = 1; i < high; ++i) {
    dsq[i] = perpendicDistFromLineSqrd(path[i], path[i - 1], path[i + 1]);
  }
  while (true) {
    if (dsq[curr] > epsSqr) {
      const start = curr;
      do {
        curr = getNext(curr, high, flags);
      } while (curr !== start && dsq[curr] > epsSqr);
      if (curr === start)
        break;
    }
    const prev = getPrior(curr, high, flags);
    const next = getNext(curr, high, flags);
    if (next === prev)
      break;
    let prior2;
    if (dsq[next] < dsq[curr]) {
      prior2 = prev;
      const newPrev = curr;
      curr = next;
      const newNext = getNext(next, high, flags);
      flags[curr] = true;
      curr = newNext;
      const nextNext = getNext(newNext, high, flags);
      if (isClosedPath || curr !== high && curr !== 0) {
        dsq[curr] = perpendicDistFromLineSqrd(path[curr], path[newPrev], path[nextNext]);
      }
      if (isClosedPath || newPrev !== 0 && newPrev !== high) {
        dsq[newPrev] = perpendicDistFromLineSqrd(path[newPrev], path[prior2], path[curr]);
      }
    } else {
      prior2 = getPrior(prev, high, flags);
      flags[curr] = true;
      curr = next;
      const nextNext = getNext(next, high, flags);
      if (isClosedPath || curr !== high && curr !== 0) {
        dsq[curr] = perpendicDistFromLineSqrd(path[curr], path[prev], path[nextNext]);
      }
      if (isClosedPath || prev !== 0 && prev !== high) {
        dsq[prev] = perpendicDistFromLineSqrd(path[prev], path[prior2], path[curr]);
      }
    }
  }
  const result = [];
  for (let i = 0; i < len; i++) {
    if (!flags[i])
      result.push(path[i]);
  }
  return result;
}
function simplifyPathsD(paths, epsilon2, isClosedPath = true) {
  const result = [];
  for (const path of paths) {
    result.push(simplifyPathD(path, epsilon2, isClosedPath));
  }
  return result;
}
function trimCollinear(path, isOpen = false) {
  let len = path.length;
  let i = 0;
  if (!isOpen) {
    while (i < len - 1 && InternalClipper.isCollinear(path[len - 1], path[i], path[i + 1]))
      i++;
    while (i < len - 1 && InternalClipper.isCollinear(path[len - 2], path[len - 1], path[i]))
      len--;
  }
  if (len - i < 3) {
    if (!isOpen || len < 2 || Point64Utils.equals(path[0], path[1])) {
      return [];
    }
    return path;
  }
  const result = [];
  let last = path[i];
  result.push(last);
  for (i++; i < len - 1; i++) {
    if (InternalClipper.isCollinear(last, path[i], path[i + 1]))
      continue;
    last = path[i];
    result.push(last);
  }
  if (isOpen) {
    result.push(path[len - 1]);
  } else if (!InternalClipper.isCollinear(last, path[len - 1], result[0])) {
    result.push(path[len - 1]);
  } else {
    while (result.length > 2 && InternalClipper.isCollinear(result[result.length - 1], result[result.length - 2], result[0])) {
      result.pop();
    }
    if (result.length < 3) {
      result.length = 0;
    }
  }
  return result;
}
function trimCollinearD(path, precision, isOpen = false) {
  InternalClipper.checkPrecision(precision);
  const scale2 = Math.pow(10, precision);
  let p = scalePath64(path, scale2);
  p = trimCollinear(p, isOpen);
  return scalePathDFromInt(p, 1 / scale2);
}

// packages/bordado/src/vector/trazado.ts
var import_svgpath = __toESM(require_svgpath2(), 1);
var TOLERANCIA_CUERDA_MM = 0.01;
var PROFUNDIDAD_MAXIMA = 18;
function distanciaARecta(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy);
  if (l < 1e-12) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / l;
}
function cubica(p0, p1, p2, p3, tolerancia, salida2, profundidad = 0) {
  const plana = Math.max(distanciaARecta(p1, p0, p3), distanciaARecta(p2, p0, p3)) <= tolerancia;
  if (plana || profundidad >= PROFUNDIDAD_MAXIMA) {
    salida2.push(p3);
    return;
  }
  const m = (a, b) => [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2
  ];
  const p01 = m(p0, p1);
  const p12 = m(p1, p2);
  const p23 = m(p2, p3);
  const p012 = m(p01, p12);
  const p123 = m(p12, p23);
  const centro = m(p012, p123);
  cubica(p0, p01, p012, centro, tolerancia, salida2, profundidad + 1);
  cubica(centro, p123, p23, p3, tolerancia, salida2, profundidad + 1);
}
function cuadratica(p0, p1, p2, tolerancia, salida2) {
  cubica(
    p0,
    [p0[0] + (p1[0] - p0[0]) * 2 / 3, p0[1] + (p1[1] - p0[1]) * 2 / 3],
    [p2[0] + (p1[0] - p2[0]) * 2 / 3, p2[1] + (p1[1] - p2[1]) * 2 / 3],
    p2,
    tolerancia,
    salida2
  );
}
var iguales = (a, b) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
function aplanar(d, tolerancia = TOLERANCIA_CUERDA_MM, ordinales) {
  const subtrazos = [];
  let actual = [];
  let cerrado = false;
  let inicio = [0, 0];
  let ordinal = -1;
  const cerrarActual = () => {
    if (actual.length >= 2) {
      if (actual.length > 2 && iguales(actual[0], actual[actual.length - 1])) {
        actual.pop();
        cerrado = true;
      }
      subtrazos.push({ puntos: actual, cerrado });
      ordinales?.push(Math.max(0, ordinal));
    }
    actual = [];
    cerrado = false;
  };
  const agregar = (p) => {
    const ultimo = actual[actual.length - 1];
    if (!ultimo || !iguales(ultimo, p)) actual.push(p);
  };
  (0, import_svgpath.default)(d).abs().unshort().unarc().iterate((segmento, _indice, x, y) => {
    const comando = segmento[0];
    const previo = [x, y];
    switch (comando) {
      case "M":
        cerrarActual();
        ordinal++;
        inicio = [segmento[1], segmento[2]];
        actual = [inicio];
        break;
      case "L":
        agregar([segmento[1], segmento[2]]);
        break;
      case "H":
        agregar([segmento[1], y]);
        break;
      case "V":
        agregar([x, segmento[1]]);
        break;
      case "Q":
        cuadratica(
          previo,
          [segmento[1], segmento[2]],
          [segmento[3], segmento[4]],
          tolerancia,
          actual
        );
        break;
      case "C":
        cubica(
          previo,
          [segmento[1], segmento[2]],
          [segmento[3], segmento[4]],
          [segmento[5], segmento[6]],
          tolerancia,
          actual
        );
        break;
      case "Z":
        cerrado = true;
        cerrarActual();
        actual = [inicio];
        break;
    }
  });
  cerrarActual();
  return subtrazos.map((s) => ({
    cerrado: s.cerrado,
    puntos: s.puntos.filter((p, i) => i === 0 || !iguales(p, s.puntos[i - 1]))
  }));
}
function areaConSigno(anillo) {
  let doble = 0;
  for (let i = 0; i < anillo.length; i++) {
    const a = anillo[i];
    const b = anillo[(i + 1) % anillo.length];
    doble += a[0] * b[1] - b[0] * a[1];
  }
  return doble / 2;
}
function perimetro(anillo, cerrado = true) {
  let total = 0;
  const n2 = anillo.length;
  for (let i = 1; i < n2; i++)
    total += Math.hypot(
      anillo[i][0] - anillo[i - 1][0],
      anillo[i][1] - anillo[i - 1][1]
    );
  if (cerrado && n2 > 2)
    total += Math.hypot(
      anillo[0][0] - anillo[n2 - 1][0],
      anillo[0][1] - anillo[n2 - 1][1]
    );
  return total;
}
var n3 = (v2) => Number(v2.toFixed(3)).toString();
function aD(puntos, cerrado) {
  if (!puntos.length) return "";
  const cuerpo2 = puntos.map(([x, y], i) => `${i ? "L" : "M"}${n3(x)} ${n3(y)}`).join("");
  return cerrado ? `${cuerpo2}Z` : cuerpo2;
}

// packages/bordado/src/vector/region.ts
var DECIMALES = 4;
var aPath = (puntos) => puntos.map(([x, y]) => ({ x, y }));
function sano(path) {
  if (path.length < 3) return null;
  const limpio = trimCollinearD(path, DECIMALES, false);
  return limpio.length >= 3 ? limpio : null;
}
function sanos(paths) {
  return paths.map(sano).filter((p) => p !== null);
}
var dePath = (path) => path.map((p) => [p.x, p.y]);
function orientado(anillo, positivo) {
  return areaConSigno(anillo) > 0 === positivo ? anillo : [...anillo].reverse();
}
function recoger(nodo, salida2) {
  for (let i = 0; i < nodo.count; i++) {
    const exterior = nodo.child(i);
    const poligono = exterior.poly;
    if (!poligono || poligono.length < 3) continue;
    const huecos = [];
    for (let j = 0; j < exterior.count; j++) {
      const hueco2 = exterior.child(j);
      if (hueco2.poly && hueco2.poly.length >= 3)
        huecos.push(orientado(dePath(hueco2.poly), false));
      recoger(hueco2, salida2);
    }
    salida2.push({ exterior: orientado(dePath(poligono), true), huecos });
  }
}
function regionesDeRelleno(subtrazos, regla = "nonzero") {
  const cerrados = sanos(
    subtrazos.filter((s) => s.puntos.length >= 3).map((s) => aPath(s.puntos))
  );
  if (!cerrados.length) return [];
  const arbol = new PolyTreeD();
  booleanOpDWithPolyTree(
    ClipType.Union,
    cerrados,
    null,
    arbol,
    regla === "evenodd" ? FillRule.EvenOdd : FillRule.NonZero,
    DECIMALES
  );
  const salida2 = [];
  recoger(arbol, salida2);
  return salida2;
}
function unirRegiones(regiones) {
  return regionesDeRelleno(
    regiones.flatMap((r) => [
      { puntos: r.exterior, cerrado: true },
      ...r.huecos.map((h) => ({ puntos: h, cerrado: true }))
    ]),
    "nonzero"
  );
}
function cajaDeRegion(region) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const [x, y] of region.exterior) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}
function areaDeRegion(region) {
  return Math.abs(areaConSigno(region.exterior)) - region.huecos.reduce((s, h) => s + Math.abs(areaConSigno(h)), 0);
}
var indices = /* @__PURE__ */ new WeakMap();
var VERTICES_PARA_INDICE = 256;
var FRANJAS = 128;
function indiceDe(region) {
  const anillos = [region.exterior, ...region.huecos];
  let vertices = 0;
  for (const a of anillos) vertices += a.length;
  if (vertices < VERTICES_PARA_INDICE) return null;
  const hecho = indices.get(region);
  if (hecho && hecho.vertices === vertices) return hecho;
  let y0 = Number.POSITIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (const a of anillos)
    for (const [, y] of a) {
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  const alto = Math.max(1e-9, (y1 - y0) / FRANJAS);
  const listas = Array.from({ length: FRANJAS }, () => []);
  for (const a of anillos)
    for (let i = 0, j = a.length - 1; i < a.length; j = i++) {
      const [xi, yi] = a[i];
      const [xj, yj] = a[j];
      const desde = Math.max(0, Math.min(FRANJAS - 1, Math.floor((Math.min(yi, yj) - y0) / alto)));
      const hasta = Math.max(0, Math.min(FRANJAS - 1, Math.floor((Math.max(yi, yj) - y0) / alto)));
      for (let f3 = desde; f3 <= hasta; f3++) listas[f3].push(xi, yi, xj, yj);
    }
  const indice = { y0, alto, franjas: listas.map((l) => Float64Array.from(l)), vertices };
  indices.set(region, indice);
  return indice;
}
function dentroDeRegion(region, p) {
  const indice = indiceDe(region);
  if (indice) {
    const f3 = Math.floor((p[1] - indice.y0) / indice.alto);
    if (f3 < 0 || f3 >= FRANJAS) return false;
    const l = indice.franjas[f3];
    let dentro3 = false;
    for (let k = 0; k < l.length; k += 4) {
      const xi = l[k];
      const yi = l[k + 1];
      const xj = l[k + 2];
      const yj = l[k + 3];
      if (yi > p[1] !== yj > p[1]) {
        const x = (xj - xi) * (p[1] - yi) / (yj - yi) + xi;
        if (p[0] < x) dentro3 = !dentro3;
      }
    }
    return dentro3;
  }
  let dentro2 = false;
  for (const anillo of [region.exterior, ...region.huecos]) {
    for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
      const [xi, yi] = anillo[i];
      const [xj, yj] = anillo[j];
      if (yi > p[1] !== yj > p[1]) {
        const x = (xj - xi) * (p[1] - yi) / (yj - yi) + xi;
        if (p[0] < x) dentro2 = !dentro2;
      }
    }
  }
  return dentro2;
}
function localizadorDeRegiones(regiones) {
  const anillos = regiones.map(
    (r) => [r.exterior, ...r.huecos].map((a) => {
      let x0 = Number.POSITIVE_INFINITY;
      let y0 = Number.POSITIVE_INFINITY;
      let x1 = Number.NEGATIVE_INFINITY;
      let y1 = Number.NEGATIVE_INFINITY;
      for (const [x, y] of a) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
      return { a, x0, y0, x1, y1 };
    })
  );
  return (p) => anillos.findIndex((rs) => {
    const e = rs[0];
    if (!e || p[0] < e.x0 || p[0] > e.x1 || p[1] < e.y0 || p[1] > e.y1)
      return false;
    let dentro2 = false;
    for (const { a, x0, y0, x1, y1 } of rs) {
      if (p[0] < x0 || p[0] > x1 || p[1] < y0 || p[1] > y1) continue;
      for (let i = 0, j = a.length - 1; i < a.length; j = i++) {
        const [xi, yi] = a[i];
        const [xj, yj] = a[j];
        if (yi > p[1] !== yj > p[1]) {
          const x = (xj - xi) * (p[1] - yi) / (yj - yi) + xi;
          if (p[0] < x) dentro2 = !dentro2;
        }
      }
    }
    return dentro2;
  });
}

// packages/bordado/src/vector/diagnostico.ts
var DECIMALES2 = 4;
var HILO_MM = 0.4;
var aPath2 = (p) => p.map(([x, y]) => ({ x, y }));
var orientados = (p) => sanos(p).map((q) => areaD(q) >= 0 ? q : [...q].reverse());
function coberturaDe(o) {
  const subtrazos = aplanar(o.geometria.d);
  if (o.tipo === "satin") {
    const [izq, der] = subtrazos;
    if (!izq || !der) return [];
    const anillo = [...izq.puntos, ...[...der.puntos].reverse()];
    return unionD(orientados([aPath2(anillo)]), [], FillRule.NonZero, DECIMALES2);
  }
  if (o.tipo === "fill")
    return unionD(
      sanos(subtrazos.map((s) => aPath2(s.puntos))),
      [],
      o.geometria.reglaDeRelleno === "nonzero" ? FillRule.NonZero : FillRule.EvenOdd,
      DECIMALES2
    );
  return inflatePathsD(
    subtrazos.filter((s) => s.puntos.length >= 2).map((s) => aPath2(s.puntos)),
    HILO_MM / 2,
    JoinType.Round,
    EndType.Round,
    2,
    DECIMALES2,
    0.02
  );
}

// node_modules/.pnpm/robust-predicates@3.0.3/node_modules/robust-predicates/esm/util.js
var epsilon = 11102230246251565e-32;
var splitter = 134217729;
var resulterrbound = (3 + 8 * epsilon) * epsilon;
function sum(elen, e, flen, f3, h) {
  let Q, Qnew, hh, bvirt;
  let enow = e[0];
  let fnow = f3[0];
  let eindex = 0;
  let findex = 0;
  if (fnow > enow === fnow > -enow) {
    Q = enow;
    enow = e[++eindex];
  } else {
    Q = fnow;
    fnow = f3[++findex];
  }
  let hindex = 0;
  if (eindex < elen && findex < flen) {
    if (fnow > enow === fnow > -enow) {
      Qnew = enow + Q;
      hh = Q - (Qnew - enow);
      enow = e[++eindex];
    } else {
      Qnew = fnow + Q;
      hh = Q - (Qnew - fnow);
      fnow = f3[++findex];
    }
    Q = Qnew;
    if (hh !== 0) {
      h[hindex++] = hh;
    }
    while (eindex < elen && findex < flen) {
      if (fnow > enow === fnow > -enow) {
        Qnew = Q + enow;
        bvirt = Qnew - Q;
        hh = Q - (Qnew - bvirt) + (enow - bvirt);
        enow = e[++eindex];
      } else {
        Qnew = Q + fnow;
        bvirt = Qnew - Q;
        hh = Q - (Qnew - bvirt) + (fnow - bvirt);
        fnow = f3[++findex];
      }
      Q = Qnew;
      if (hh !== 0) {
        h[hindex++] = hh;
      }
    }
  }
  while (eindex < elen) {
    Qnew = Q + enow;
    bvirt = Qnew - Q;
    hh = Q - (Qnew - bvirt) + (enow - bvirt);
    enow = e[++eindex];
    Q = Qnew;
    if (hh !== 0) {
      h[hindex++] = hh;
    }
  }
  while (findex < flen) {
    Qnew = Q + fnow;
    bvirt = Qnew - Q;
    hh = Q - (Qnew - bvirt) + (fnow - bvirt);
    fnow = f3[++findex];
    Q = Qnew;
    if (hh !== 0) {
      h[hindex++] = hh;
    }
  }
  if (Q !== 0 || hindex === 0) {
    h[hindex++] = Q;
  }
  return hindex;
}
function sum_three(alen, a, blen, b, clen, c, tmp, out) {
  return sum(sum(alen, a, blen, b, tmp), tmp, clen, c, out);
}
function scale(elen, e, b, h) {
  let Q, sum2, hh, product1, product0;
  let bvirt, c, ahi, alo, bhi, blo;
  c = splitter * b;
  bhi = c - (c - b);
  blo = b - bhi;
  let enow = e[0];
  Q = enow * b;
  c = splitter * enow;
  ahi = c - (c - enow);
  alo = enow - ahi;
  hh = alo * blo - (Q - ahi * bhi - alo * bhi - ahi * blo);
  let hindex = 0;
  if (hh !== 0) {
    h[hindex++] = hh;
  }
  for (let i = 1; i < elen; i++) {
    enow = e[i];
    product1 = enow * b;
    c = splitter * enow;
    ahi = c - (c - enow);
    alo = enow - ahi;
    product0 = alo * blo - (product1 - ahi * bhi - alo * bhi - ahi * blo);
    sum2 = Q + product0;
    bvirt = sum2 - Q;
    hh = Q - (sum2 - bvirt) + (product0 - bvirt);
    if (hh !== 0) {
      h[hindex++] = hh;
    }
    Q = product1 + sum2;
    hh = sum2 - (Q - product1);
    if (hh !== 0) {
      h[hindex++] = hh;
    }
  }
  if (Q !== 0 || hindex === 0) {
    h[hindex++] = Q;
  }
  return hindex;
}
function estimate(elen, e) {
  let Q = e[0];
  for (let i = 1; i < elen; i++) Q += e[i];
  return Q;
}
function vec(n2) {
  return new Float64Array(n2);
}

// node_modules/.pnpm/robust-predicates@3.0.3/node_modules/robust-predicates/esm/orient2d.js
var ccwerrboundA = (3 + 16 * epsilon) * epsilon;
var ccwerrboundB = (2 + 12 * epsilon) * epsilon;
var ccwerrboundC = (9 + 64 * epsilon) * epsilon * epsilon;
var B = vec(4);
var C1 = vec(8);
var C2 = vec(12);
var D = vec(16);
var u = vec(4);
function orient2dadapt(ax, ay, bx, by, cx, cy, detsum) {
  let acxtail, acytail, bcxtail, bcytail;
  let bvirt, c, ahi, alo, bhi, blo, _i, _j, _0, s1, s0, t1, t0, u32;
  const acx = ax - cx;
  const bcx = bx - cx;
  const acy = ay - cy;
  const bcy = by - cy;
  s1 = acx * bcy;
  c = splitter * acx;
  ahi = c - (c - acx);
  alo = acx - ahi;
  c = splitter * bcy;
  bhi = c - (c - bcy);
  blo = bcy - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acy * bcx;
  c = splitter * acy;
  ahi = c - (c - acy);
  alo = acy - ahi;
  c = splitter * bcx;
  bhi = c - (c - bcx);
  blo = bcx - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  B[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  B[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  B[2] = _j - (u32 - bvirt) + (_i - bvirt);
  B[3] = u32;
  let det = estimate(4, B);
  let errbound = ccwerrboundB * detsum;
  if (det >= errbound || -det >= errbound) {
    return det;
  }
  bvirt = ax - acx;
  acxtail = ax - (acx + bvirt) + (bvirt - cx);
  bvirt = bx - bcx;
  bcxtail = bx - (bcx + bvirt) + (bvirt - cx);
  bvirt = ay - acy;
  acytail = ay - (acy + bvirt) + (bvirt - cy);
  bvirt = by - bcy;
  bcytail = by - (bcy + bvirt) + (bvirt - cy);
  if (acxtail === 0 && acytail === 0 && bcxtail === 0 && bcytail === 0) {
    return det;
  }
  errbound = ccwerrboundC * detsum + resulterrbound * Math.abs(det);
  det += acx * bcytail + bcy * acxtail - (acy * bcxtail + bcx * acytail);
  if (det >= errbound || -det >= errbound) return det;
  s1 = acxtail * bcy;
  c = splitter * acxtail;
  ahi = c - (c - acxtail);
  alo = acxtail - ahi;
  c = splitter * bcy;
  bhi = c - (c - bcy);
  blo = bcy - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acytail * bcx;
  c = splitter * acytail;
  ahi = c - (c - acytail);
  alo = acytail - ahi;
  c = splitter * bcx;
  bhi = c - (c - bcx);
  blo = bcx - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  u[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  u[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  u[2] = _j - (u32 - bvirt) + (_i - bvirt);
  u[3] = u32;
  const C1len = sum(4, B, 4, u, C1);
  s1 = acx * bcytail;
  c = splitter * acx;
  ahi = c - (c - acx);
  alo = acx - ahi;
  c = splitter * bcytail;
  bhi = c - (c - bcytail);
  blo = bcytail - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acy * bcxtail;
  c = splitter * acy;
  ahi = c - (c - acy);
  alo = acy - ahi;
  c = splitter * bcxtail;
  bhi = c - (c - bcxtail);
  blo = bcxtail - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  u[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  u[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  u[2] = _j - (u32 - bvirt) + (_i - bvirt);
  u[3] = u32;
  const C2len = sum(C1len, C1, 4, u, C2);
  s1 = acxtail * bcytail;
  c = splitter * acxtail;
  ahi = c - (c - acxtail);
  alo = acxtail - ahi;
  c = splitter * bcytail;
  bhi = c - (c - bcytail);
  blo = bcytail - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acytail * bcxtail;
  c = splitter * acytail;
  ahi = c - (c - acytail);
  alo = acytail - ahi;
  c = splitter * bcxtail;
  bhi = c - (c - bcxtail);
  blo = bcxtail - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  u[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  u[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  u[2] = _j - (u32 - bvirt) + (_i - bvirt);
  u[3] = u32;
  const Dlen = sum(C2len, C2, 4, u, D);
  return D[Dlen - 1];
}
function orient2d(ax, ay, bx, by, cx, cy) {
  const detleft = (ay - cy) * (bx - cx);
  const detright = (ax - cx) * (by - cy);
  const det = detleft - detright;
  const detsum = Math.abs(detleft + detright);
  if (Math.abs(det) >= ccwerrboundA * detsum) return det;
  return -orient2dadapt(ax, ay, bx, by, cx, cy, detsum);
}

// node_modules/.pnpm/robust-predicates@3.0.3/node_modules/robust-predicates/esm/orient3d.js
var o3derrboundA = (7 + 56 * epsilon) * epsilon;
var o3derrboundB = (3 + 28 * epsilon) * epsilon;
var o3derrboundC = (26 + 288 * epsilon) * epsilon * epsilon;
var bc = vec(4);
var ca = vec(4);
var ab = vec(4);
var at_b = vec(4);
var at_c = vec(4);
var bt_c = vec(4);
var bt_a = vec(4);
var ct_a = vec(4);
var ct_b = vec(4);
var bct = vec(8);
var cat = vec(8);
var abt = vec(8);
var u2 = vec(4);
var _8 = vec(8);
var _8b = vec(8);
var _16 = vec(16);
var _12 = vec(12);
var fin = vec(192);
var fin2 = vec(192);

// node_modules/.pnpm/robust-predicates@3.0.3/node_modules/robust-predicates/esm/incircle.js
var iccerrboundA = (10 + 96 * epsilon) * epsilon;
var iccerrboundB = (4 + 48 * epsilon) * epsilon;
var iccerrboundC = (44 + 576 * epsilon) * epsilon * epsilon;
var bc2 = vec(4);
var ca2 = vec(4);
var ab2 = vec(4);
var aa = vec(4);
var bb = vec(4);
var cc = vec(4);
var u3 = vec(4);
var v = vec(4);
var axtbc = vec(8);
var aytbc = vec(8);
var bxtca = vec(8);
var bytca = vec(8);
var cxtab = vec(8);
var cytab = vec(8);
var abt2 = vec(8);
var bct2 = vec(8);
var cat2 = vec(8);
var abtt = vec(4);
var bctt = vec(4);
var catt = vec(4);
var _82 = vec(8);
var _162 = vec(16);
var _16b = vec(16);
var _16c = vec(16);
var _32 = vec(32);
var _32b = vec(32);
var _48 = vec(48);
var _64 = vec(64);
var fin3 = vec(1152);
var fin22 = vec(1152);
function finadd(finlen, a, alen) {
  finlen = sum(finlen, fin3, a, alen, fin22);
  const tmp = fin3;
  fin3 = fin22;
  fin22 = tmp;
  return finlen;
}
function incircleadapt(ax, ay, bx, by, cx, cy, dx, dy, permanent) {
  let finlen;
  let adxtail, bdxtail, cdxtail, adytail, bdytail, cdytail;
  let axtbclen, aytbclen, bxtcalen, bytcalen, cxtablen, cytablen;
  let abtlen, bctlen, catlen;
  let abttlen, bcttlen, cattlen;
  let n1, n0;
  let bvirt, c, ahi, alo, bhi, blo, _i, _j, _0, s1, s0, t1, t0, u32;
  const adx = ax - dx;
  const bdx = bx - dx;
  const cdx = cx - dx;
  const ady = ay - dy;
  const bdy = by - dy;
  const cdy = cy - dy;
  s1 = bdx * cdy;
  c = splitter * bdx;
  ahi = c - (c - bdx);
  alo = bdx - ahi;
  c = splitter * cdy;
  bhi = c - (c - cdy);
  blo = cdy - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = cdx * bdy;
  c = splitter * cdx;
  ahi = c - (c - cdx);
  alo = cdx - ahi;
  c = splitter * bdy;
  bhi = c - (c - bdy);
  blo = bdy - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  bc2[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  bc2[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  bc2[2] = _j - (u32 - bvirt) + (_i - bvirt);
  bc2[3] = u32;
  s1 = cdx * ady;
  c = splitter * cdx;
  ahi = c - (c - cdx);
  alo = cdx - ahi;
  c = splitter * ady;
  bhi = c - (c - ady);
  blo = ady - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = adx * cdy;
  c = splitter * adx;
  ahi = c - (c - adx);
  alo = adx - ahi;
  c = splitter * cdy;
  bhi = c - (c - cdy);
  blo = cdy - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  ca2[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  ca2[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  ca2[2] = _j - (u32 - bvirt) + (_i - bvirt);
  ca2[3] = u32;
  s1 = adx * bdy;
  c = splitter * adx;
  ahi = c - (c - adx);
  alo = adx - ahi;
  c = splitter * bdy;
  bhi = c - (c - bdy);
  blo = bdy - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = bdx * ady;
  c = splitter * bdx;
  ahi = c - (c - bdx);
  alo = bdx - ahi;
  c = splitter * ady;
  bhi = c - (c - ady);
  blo = ady - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  ab2[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  ab2[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  ab2[2] = _j - (u32 - bvirt) + (_i - bvirt);
  ab2[3] = u32;
  finlen = sum(
    sum(
      sum(
        scale(scale(4, bc2, adx, _82), _82, adx, _162),
        _162,
        scale(scale(4, bc2, ady, _82), _82, ady, _16b),
        _16b,
        _32
      ),
      _32,
      sum(
        scale(scale(4, ca2, bdx, _82), _82, bdx, _162),
        _162,
        scale(scale(4, ca2, bdy, _82), _82, bdy, _16b),
        _16b,
        _32b
      ),
      _32b,
      _64
    ),
    _64,
    sum(
      scale(scale(4, ab2, cdx, _82), _82, cdx, _162),
      _162,
      scale(scale(4, ab2, cdy, _82), _82, cdy, _16b),
      _16b,
      _32
    ),
    _32,
    fin3
  );
  let det = estimate(finlen, fin3);
  let errbound = iccerrboundB * permanent;
  if (det >= errbound || -det >= errbound) {
    return det;
  }
  bvirt = ax - adx;
  adxtail = ax - (adx + bvirt) + (bvirt - dx);
  bvirt = ay - ady;
  adytail = ay - (ady + bvirt) + (bvirt - dy);
  bvirt = bx - bdx;
  bdxtail = bx - (bdx + bvirt) + (bvirt - dx);
  bvirt = by - bdy;
  bdytail = by - (bdy + bvirt) + (bvirt - dy);
  bvirt = cx - cdx;
  cdxtail = cx - (cdx + bvirt) + (bvirt - dx);
  bvirt = cy - cdy;
  cdytail = cy - (cdy + bvirt) + (bvirt - dy);
  if (adxtail === 0 && bdxtail === 0 && cdxtail === 0 && adytail === 0 && bdytail === 0 && cdytail === 0) {
    return det;
  }
  errbound = iccerrboundC * permanent + resulterrbound * Math.abs(det);
  det += (adx * adx + ady * ady) * (bdx * cdytail + cdy * bdxtail - (bdy * cdxtail + cdx * bdytail)) + 2 * (adx * adxtail + ady * adytail) * (bdx * cdy - bdy * cdx) + ((bdx * bdx + bdy * bdy) * (cdx * adytail + ady * cdxtail - (cdy * adxtail + adx * cdytail)) + 2 * (bdx * bdxtail + bdy * bdytail) * (cdx * ady - cdy * adx)) + ((cdx * cdx + cdy * cdy) * (adx * bdytail + bdy * adxtail - (ady * bdxtail + bdx * adytail)) + 2 * (cdx * cdxtail + cdy * cdytail) * (adx * bdy - ady * bdx));
  if (det >= errbound || -det >= errbound) {
    return det;
  }
  if (bdxtail !== 0 || bdytail !== 0 || cdxtail !== 0 || cdytail !== 0) {
    s1 = adx * adx;
    c = splitter * adx;
    ahi = c - (c - adx);
    alo = adx - ahi;
    s0 = alo * alo - (s1 - ahi * ahi - (ahi + ahi) * alo);
    t1 = ady * ady;
    c = splitter * ady;
    ahi = c - (c - ady);
    alo = ady - ahi;
    t0 = alo * alo - (t1 - ahi * ahi - (ahi + ahi) * alo);
    _i = s0 + t0;
    bvirt = _i - s0;
    aa[0] = s0 - (_i - bvirt) + (t0 - bvirt);
    _j = s1 + _i;
    bvirt = _j - s1;
    _0 = s1 - (_j - bvirt) + (_i - bvirt);
    _i = _0 + t1;
    bvirt = _i - _0;
    aa[1] = _0 - (_i - bvirt) + (t1 - bvirt);
    u32 = _j + _i;
    bvirt = u32 - _j;
    aa[2] = _j - (u32 - bvirt) + (_i - bvirt);
    aa[3] = u32;
  }
  if (cdxtail !== 0 || cdytail !== 0 || adxtail !== 0 || adytail !== 0) {
    s1 = bdx * bdx;
    c = splitter * bdx;
    ahi = c - (c - bdx);
    alo = bdx - ahi;
    s0 = alo * alo - (s1 - ahi * ahi - (ahi + ahi) * alo);
    t1 = bdy * bdy;
    c = splitter * bdy;
    ahi = c - (c - bdy);
    alo = bdy - ahi;
    t0 = alo * alo - (t1 - ahi * ahi - (ahi + ahi) * alo);
    _i = s0 + t0;
    bvirt = _i - s0;
    bb[0] = s0 - (_i - bvirt) + (t0 - bvirt);
    _j = s1 + _i;
    bvirt = _j - s1;
    _0 = s1 - (_j - bvirt) + (_i - bvirt);
    _i = _0 + t1;
    bvirt = _i - _0;
    bb[1] = _0 - (_i - bvirt) + (t1 - bvirt);
    u32 = _j + _i;
    bvirt = u32 - _j;
    bb[2] = _j - (u32 - bvirt) + (_i - bvirt);
    bb[3] = u32;
  }
  if (adxtail !== 0 || adytail !== 0 || bdxtail !== 0 || bdytail !== 0) {
    s1 = cdx * cdx;
    c = splitter * cdx;
    ahi = c - (c - cdx);
    alo = cdx - ahi;
    s0 = alo * alo - (s1 - ahi * ahi - (ahi + ahi) * alo);
    t1 = cdy * cdy;
    c = splitter * cdy;
    ahi = c - (c - cdy);
    alo = cdy - ahi;
    t0 = alo * alo - (t1 - ahi * ahi - (ahi + ahi) * alo);
    _i = s0 + t0;
    bvirt = _i - s0;
    cc[0] = s0 - (_i - bvirt) + (t0 - bvirt);
    _j = s1 + _i;
    bvirt = _j - s1;
    _0 = s1 - (_j - bvirt) + (_i - bvirt);
    _i = _0 + t1;
    bvirt = _i - _0;
    cc[1] = _0 - (_i - bvirt) + (t1 - bvirt);
    u32 = _j + _i;
    bvirt = u32 - _j;
    cc[2] = _j - (u32 - bvirt) + (_i - bvirt);
    cc[3] = u32;
  }
  if (adxtail !== 0) {
    axtbclen = scale(4, bc2, adxtail, axtbc);
    finlen = finadd(finlen, sum_three(
      scale(axtbclen, axtbc, 2 * adx, _162),
      _162,
      scale(scale(4, cc, adxtail, _82), _82, bdy, _16b),
      _16b,
      scale(scale(4, bb, adxtail, _82), _82, -cdy, _16c),
      _16c,
      _32,
      _48
    ), _48);
  }
  if (adytail !== 0) {
    aytbclen = scale(4, bc2, adytail, aytbc);
    finlen = finadd(finlen, sum_three(
      scale(aytbclen, aytbc, 2 * ady, _162),
      _162,
      scale(scale(4, bb, adytail, _82), _82, cdx, _16b),
      _16b,
      scale(scale(4, cc, adytail, _82), _82, -bdx, _16c),
      _16c,
      _32,
      _48
    ), _48);
  }
  if (bdxtail !== 0) {
    bxtcalen = scale(4, ca2, bdxtail, bxtca);
    finlen = finadd(finlen, sum_three(
      scale(bxtcalen, bxtca, 2 * bdx, _162),
      _162,
      scale(scale(4, aa, bdxtail, _82), _82, cdy, _16b),
      _16b,
      scale(scale(4, cc, bdxtail, _82), _82, -ady, _16c),
      _16c,
      _32,
      _48
    ), _48);
  }
  if (bdytail !== 0) {
    bytcalen = scale(4, ca2, bdytail, bytca);
    finlen = finadd(finlen, sum_three(
      scale(bytcalen, bytca, 2 * bdy, _162),
      _162,
      scale(scale(4, cc, bdytail, _82), _82, adx, _16b),
      _16b,
      scale(scale(4, aa, bdytail, _82), _82, -cdx, _16c),
      _16c,
      _32,
      _48
    ), _48);
  }
  if (cdxtail !== 0) {
    cxtablen = scale(4, ab2, cdxtail, cxtab);
    finlen = finadd(finlen, sum_three(
      scale(cxtablen, cxtab, 2 * cdx, _162),
      _162,
      scale(scale(4, bb, cdxtail, _82), _82, ady, _16b),
      _16b,
      scale(scale(4, aa, cdxtail, _82), _82, -bdy, _16c),
      _16c,
      _32,
      _48
    ), _48);
  }
  if (cdytail !== 0) {
    cytablen = scale(4, ab2, cdytail, cytab);
    finlen = finadd(finlen, sum_three(
      scale(cytablen, cytab, 2 * cdy, _162),
      _162,
      scale(scale(4, aa, cdytail, _82), _82, bdx, _16b),
      _16b,
      scale(scale(4, bb, cdytail, _82), _82, -adx, _16c),
      _16c,
      _32,
      _48
    ), _48);
  }
  if (adxtail !== 0 || adytail !== 0) {
    if (bdxtail !== 0 || bdytail !== 0 || cdxtail !== 0 || cdytail !== 0) {
      s1 = bdxtail * cdy;
      c = splitter * bdxtail;
      ahi = c - (c - bdxtail);
      alo = bdxtail - ahi;
      c = splitter * cdy;
      bhi = c - (c - cdy);
      blo = cdy - bhi;
      s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
      t1 = bdx * cdytail;
      c = splitter * bdx;
      ahi = c - (c - bdx);
      alo = bdx - ahi;
      c = splitter * cdytail;
      bhi = c - (c - cdytail);
      blo = cdytail - bhi;
      t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
      _i = s0 + t0;
      bvirt = _i - s0;
      u3[0] = s0 - (_i - bvirt) + (t0 - bvirt);
      _j = s1 + _i;
      bvirt = _j - s1;
      _0 = s1 - (_j - bvirt) + (_i - bvirt);
      _i = _0 + t1;
      bvirt = _i - _0;
      u3[1] = _0 - (_i - bvirt) + (t1 - bvirt);
      u32 = _j + _i;
      bvirt = u32 - _j;
      u3[2] = _j - (u32 - bvirt) + (_i - bvirt);
      u3[3] = u32;
      s1 = cdxtail * -bdy;
      c = splitter * cdxtail;
      ahi = c - (c - cdxtail);
      alo = cdxtail - ahi;
      c = splitter * -bdy;
      bhi = c - (c - -bdy);
      blo = -bdy - bhi;
      s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
      t1 = cdx * -bdytail;
      c = splitter * cdx;
      ahi = c - (c - cdx);
      alo = cdx - ahi;
      c = splitter * -bdytail;
      bhi = c - (c - -bdytail);
      blo = -bdytail - bhi;
      t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
      _i = s0 + t0;
      bvirt = _i - s0;
      v[0] = s0 - (_i - bvirt) + (t0 - bvirt);
      _j = s1 + _i;
      bvirt = _j - s1;
      _0 = s1 - (_j - bvirt) + (_i - bvirt);
      _i = _0 + t1;
      bvirt = _i - _0;
      v[1] = _0 - (_i - bvirt) + (t1 - bvirt);
      u32 = _j + _i;
      bvirt = u32 - _j;
      v[2] = _j - (u32 - bvirt) + (_i - bvirt);
      v[3] = u32;
      bctlen = sum(4, u3, 4, v, bct2);
      s1 = bdxtail * cdytail;
      c = splitter * bdxtail;
      ahi = c - (c - bdxtail);
      alo = bdxtail - ahi;
      c = splitter * cdytail;
      bhi = c - (c - cdytail);
      blo = cdytail - bhi;
      s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
      t1 = cdxtail * bdytail;
      c = splitter * cdxtail;
      ahi = c - (c - cdxtail);
      alo = cdxtail - ahi;
      c = splitter * bdytail;
      bhi = c - (c - bdytail);
      blo = bdytail - bhi;
      t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
      _i = s0 - t0;
      bvirt = s0 - _i;
      bctt[0] = s0 - (_i + bvirt) + (bvirt - t0);
      _j = s1 + _i;
      bvirt = _j - s1;
      _0 = s1 - (_j - bvirt) + (_i - bvirt);
      _i = _0 - t1;
      bvirt = _0 - _i;
      bctt[1] = _0 - (_i + bvirt) + (bvirt - t1);
      u32 = _j + _i;
      bvirt = u32 - _j;
      bctt[2] = _j - (u32 - bvirt) + (_i - bvirt);
      bctt[3] = u32;
      bcttlen = 4;
    } else {
      bct2[0] = 0;
      bctlen = 1;
      bctt[0] = 0;
      bcttlen = 1;
    }
    if (adxtail !== 0) {
      const len = scale(bctlen, bct2, adxtail, _16c);
      finlen = finadd(finlen, sum(
        scale(axtbclen, axtbc, adxtail, _162),
        _162,
        scale(len, _16c, 2 * adx, _32),
        _32,
        _48
      ), _48);
      const len2 = scale(bcttlen, bctt, adxtail, _82);
      finlen = finadd(finlen, sum_three(
        scale(len2, _82, 2 * adx, _162),
        _162,
        scale(len2, _82, adxtail, _16b),
        _16b,
        scale(len, _16c, adxtail, _32),
        _32,
        _32b,
        _64
      ), _64);
      if (bdytail !== 0) {
        finlen = finadd(finlen, scale(scale(4, cc, adxtail, _82), _82, bdytail, _162), _162);
      }
      if (cdytail !== 0) {
        finlen = finadd(finlen, scale(scale(4, bb, -adxtail, _82), _82, cdytail, _162), _162);
      }
    }
    if (adytail !== 0) {
      const len = scale(bctlen, bct2, adytail, _16c);
      finlen = finadd(finlen, sum(
        scale(aytbclen, aytbc, adytail, _162),
        _162,
        scale(len, _16c, 2 * ady, _32),
        _32,
        _48
      ), _48);
      const len2 = scale(bcttlen, bctt, adytail, _82);
      finlen = finadd(finlen, sum_three(
        scale(len2, _82, 2 * ady, _162),
        _162,
        scale(len2, _82, adytail, _16b),
        _16b,
        scale(len, _16c, adytail, _32),
        _32,
        _32b,
        _64
      ), _64);
    }
  }
  if (bdxtail !== 0 || bdytail !== 0) {
    if (cdxtail !== 0 || cdytail !== 0 || adxtail !== 0 || adytail !== 0) {
      s1 = cdxtail * ady;
      c = splitter * cdxtail;
      ahi = c - (c - cdxtail);
      alo = cdxtail - ahi;
      c = splitter * ady;
      bhi = c - (c - ady);
      blo = ady - bhi;
      s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
      t1 = cdx * adytail;
      c = splitter * cdx;
      ahi = c - (c - cdx);
      alo = cdx - ahi;
      c = splitter * adytail;
      bhi = c - (c - adytail);
      blo = adytail - bhi;
      t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
      _i = s0 + t0;
      bvirt = _i - s0;
      u3[0] = s0 - (_i - bvirt) + (t0 - bvirt);
      _j = s1 + _i;
      bvirt = _j - s1;
      _0 = s1 - (_j - bvirt) + (_i - bvirt);
      _i = _0 + t1;
      bvirt = _i - _0;
      u3[1] = _0 - (_i - bvirt) + (t1 - bvirt);
      u32 = _j + _i;
      bvirt = u32 - _j;
      u3[2] = _j - (u32 - bvirt) + (_i - bvirt);
      u3[3] = u32;
      n1 = -cdy;
      n0 = -cdytail;
      s1 = adxtail * n1;
      c = splitter * adxtail;
      ahi = c - (c - adxtail);
      alo = adxtail - ahi;
      c = splitter * n1;
      bhi = c - (c - n1);
      blo = n1 - bhi;
      s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
      t1 = adx * n0;
      c = splitter * adx;
      ahi = c - (c - adx);
      alo = adx - ahi;
      c = splitter * n0;
      bhi = c - (c - n0);
      blo = n0 - bhi;
      t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
      _i = s0 + t0;
      bvirt = _i - s0;
      v[0] = s0 - (_i - bvirt) + (t0 - bvirt);
      _j = s1 + _i;
      bvirt = _j - s1;
      _0 = s1 - (_j - bvirt) + (_i - bvirt);
      _i = _0 + t1;
      bvirt = _i - _0;
      v[1] = _0 - (_i - bvirt) + (t1 - bvirt);
      u32 = _j + _i;
      bvirt = u32 - _j;
      v[2] = _j - (u32 - bvirt) + (_i - bvirt);
      v[3] = u32;
      catlen = sum(4, u3, 4, v, cat2);
      s1 = cdxtail * adytail;
      c = splitter * cdxtail;
      ahi = c - (c - cdxtail);
      alo = cdxtail - ahi;
      c = splitter * adytail;
      bhi = c - (c - adytail);
      blo = adytail - bhi;
      s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
      t1 = adxtail * cdytail;
      c = splitter * adxtail;
      ahi = c - (c - adxtail);
      alo = adxtail - ahi;
      c = splitter * cdytail;
      bhi = c - (c - cdytail);
      blo = cdytail - bhi;
      t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
      _i = s0 - t0;
      bvirt = s0 - _i;
      catt[0] = s0 - (_i + bvirt) + (bvirt - t0);
      _j = s1 + _i;
      bvirt = _j - s1;
      _0 = s1 - (_j - bvirt) + (_i - bvirt);
      _i = _0 - t1;
      bvirt = _0 - _i;
      catt[1] = _0 - (_i + bvirt) + (bvirt - t1);
      u32 = _j + _i;
      bvirt = u32 - _j;
      catt[2] = _j - (u32 - bvirt) + (_i - bvirt);
      catt[3] = u32;
      cattlen = 4;
    } else {
      cat2[0] = 0;
      catlen = 1;
      catt[0] = 0;
      cattlen = 1;
    }
    if (bdxtail !== 0) {
      const len = scale(catlen, cat2, bdxtail, _16c);
      finlen = finadd(finlen, sum(
        scale(bxtcalen, bxtca, bdxtail, _162),
        _162,
        scale(len, _16c, 2 * bdx, _32),
        _32,
        _48
      ), _48);
      const len2 = scale(cattlen, catt, bdxtail, _82);
      finlen = finadd(finlen, sum_three(
        scale(len2, _82, 2 * bdx, _162),
        _162,
        scale(len2, _82, bdxtail, _16b),
        _16b,
        scale(len, _16c, bdxtail, _32),
        _32,
        _32b,
        _64
      ), _64);
      if (cdytail !== 0) {
        finlen = finadd(finlen, scale(scale(4, aa, bdxtail, _82), _82, cdytail, _162), _162);
      }
      if (adytail !== 0) {
        finlen = finadd(finlen, scale(scale(4, cc, -bdxtail, _82), _82, adytail, _162), _162);
      }
    }
    if (bdytail !== 0) {
      const len = scale(catlen, cat2, bdytail, _16c);
      finlen = finadd(finlen, sum(
        scale(bytcalen, bytca, bdytail, _162),
        _162,
        scale(len, _16c, 2 * bdy, _32),
        _32,
        _48
      ), _48);
      const len2 = scale(cattlen, catt, bdytail, _82);
      finlen = finadd(finlen, sum_three(
        scale(len2, _82, 2 * bdy, _162),
        _162,
        scale(len2, _82, bdytail, _16b),
        _16b,
        scale(len, _16c, bdytail, _32),
        _32,
        _32b,
        _64
      ), _64);
    }
  }
  if (cdxtail !== 0 || cdytail !== 0) {
    if (adxtail !== 0 || adytail !== 0 || bdxtail !== 0 || bdytail !== 0) {
      s1 = adxtail * bdy;
      c = splitter * adxtail;
      ahi = c - (c - adxtail);
      alo = adxtail - ahi;
      c = splitter * bdy;
      bhi = c - (c - bdy);
      blo = bdy - bhi;
      s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
      t1 = adx * bdytail;
      c = splitter * adx;
      ahi = c - (c - adx);
      alo = adx - ahi;
      c = splitter * bdytail;
      bhi = c - (c - bdytail);
      blo = bdytail - bhi;
      t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
      _i = s0 + t0;
      bvirt = _i - s0;
      u3[0] = s0 - (_i - bvirt) + (t0 - bvirt);
      _j = s1 + _i;
      bvirt = _j - s1;
      _0 = s1 - (_j - bvirt) + (_i - bvirt);
      _i = _0 + t1;
      bvirt = _i - _0;
      u3[1] = _0 - (_i - bvirt) + (t1 - bvirt);
      u32 = _j + _i;
      bvirt = u32 - _j;
      u3[2] = _j - (u32 - bvirt) + (_i - bvirt);
      u3[3] = u32;
      n1 = -ady;
      n0 = -adytail;
      s1 = bdxtail * n1;
      c = splitter * bdxtail;
      ahi = c - (c - bdxtail);
      alo = bdxtail - ahi;
      c = splitter * n1;
      bhi = c - (c - n1);
      blo = n1 - bhi;
      s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
      t1 = bdx * n0;
      c = splitter * bdx;
      ahi = c - (c - bdx);
      alo = bdx - ahi;
      c = splitter * n0;
      bhi = c - (c - n0);
      blo = n0 - bhi;
      t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
      _i = s0 + t0;
      bvirt = _i - s0;
      v[0] = s0 - (_i - bvirt) + (t0 - bvirt);
      _j = s1 + _i;
      bvirt = _j - s1;
      _0 = s1 - (_j - bvirt) + (_i - bvirt);
      _i = _0 + t1;
      bvirt = _i - _0;
      v[1] = _0 - (_i - bvirt) + (t1 - bvirt);
      u32 = _j + _i;
      bvirt = u32 - _j;
      v[2] = _j - (u32 - bvirt) + (_i - bvirt);
      v[3] = u32;
      abtlen = sum(4, u3, 4, v, abt2);
      s1 = adxtail * bdytail;
      c = splitter * adxtail;
      ahi = c - (c - adxtail);
      alo = adxtail - ahi;
      c = splitter * bdytail;
      bhi = c - (c - bdytail);
      blo = bdytail - bhi;
      s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
      t1 = bdxtail * adytail;
      c = splitter * bdxtail;
      ahi = c - (c - bdxtail);
      alo = bdxtail - ahi;
      c = splitter * adytail;
      bhi = c - (c - adytail);
      blo = adytail - bhi;
      t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
      _i = s0 - t0;
      bvirt = s0 - _i;
      abtt[0] = s0 - (_i + bvirt) + (bvirt - t0);
      _j = s1 + _i;
      bvirt = _j - s1;
      _0 = s1 - (_j - bvirt) + (_i - bvirt);
      _i = _0 - t1;
      bvirt = _0 - _i;
      abtt[1] = _0 - (_i + bvirt) + (bvirt - t1);
      u32 = _j + _i;
      bvirt = u32 - _j;
      abtt[2] = _j - (u32 - bvirt) + (_i - bvirt);
      abtt[3] = u32;
      abttlen = 4;
    } else {
      abt2[0] = 0;
      abtlen = 1;
      abtt[0] = 0;
      abttlen = 1;
    }
    if (cdxtail !== 0) {
      const len = scale(abtlen, abt2, cdxtail, _16c);
      finlen = finadd(finlen, sum(
        scale(cxtablen, cxtab, cdxtail, _162),
        _162,
        scale(len, _16c, 2 * cdx, _32),
        _32,
        _48
      ), _48);
      const len2 = scale(abttlen, abtt, cdxtail, _82);
      finlen = finadd(finlen, sum_three(
        scale(len2, _82, 2 * cdx, _162),
        _162,
        scale(len2, _82, cdxtail, _16b),
        _16b,
        scale(len, _16c, cdxtail, _32),
        _32,
        _32b,
        _64
      ), _64);
      if (adytail !== 0) {
        finlen = finadd(finlen, scale(scale(4, bb, cdxtail, _82), _82, adytail, _162), _162);
      }
      if (bdytail !== 0) {
        finlen = finadd(finlen, scale(scale(4, aa, -cdxtail, _82), _82, bdytail, _162), _162);
      }
    }
    if (cdytail !== 0) {
      const len = scale(abtlen, abt2, cdytail, _16c);
      finlen = finadd(finlen, sum(
        scale(cytablen, cytab, cdytail, _162),
        _162,
        scale(len, _16c, 2 * cdy, _32),
        _32,
        _48
      ), _48);
      const len2 = scale(abttlen, abtt, cdytail, _82);
      finlen = finadd(finlen, sum_three(
        scale(len2, _82, 2 * cdy, _162),
        _162,
        scale(len2, _82, cdytail, _16b),
        _16b,
        scale(len, _16c, cdytail, _32),
        _32,
        _32b,
        _64
      ), _64);
    }
  }
  return fin3[finlen - 1];
}
function incircle(ax, ay, bx, by, cx, cy, dx, dy) {
  const adx = ax - dx;
  const bdx = bx - dx;
  const cdx = cx - dx;
  const ady = ay - dy;
  const bdy = by - dy;
  const cdy = cy - dy;
  const bdxcdy = bdx * cdy;
  const cdxbdy = cdx * bdy;
  const alift = adx * adx + ady * ady;
  const cdxady = cdx * ady;
  const adxcdy = adx * cdy;
  const blift = bdx * bdx + bdy * bdy;
  const adxbdy = adx * bdy;
  const bdxady = bdx * ady;
  const clift = cdx * cdx + cdy * cdy;
  const det = alift * (bdxcdy - cdxbdy) + blift * (cdxady - adxcdy) + clift * (adxbdy - bdxady);
  const permanent = (Math.abs(bdxcdy) + Math.abs(cdxbdy)) * alift + (Math.abs(cdxady) + Math.abs(adxcdy)) * blift + (Math.abs(adxbdy) + Math.abs(bdxady)) * clift;
  const errbound = iccerrboundA * permanent;
  if (det > errbound || -det > errbound) {
    return det;
  }
  return incircleadapt(ax, ay, bx, by, cx, cy, dx, dy, permanent);
}

// node_modules/.pnpm/robust-predicates@3.0.3/node_modules/robust-predicates/esm/insphere.js
var isperrboundA = (16 + 224 * epsilon) * epsilon;
var isperrboundB = (5 + 72 * epsilon) * epsilon;
var isperrboundC = (71 + 1408 * epsilon) * epsilon * epsilon;
var ab3 = vec(4);
var bc3 = vec(4);
var cd = vec(4);
var de = vec(4);
var ea = vec(4);
var ac = vec(4);
var bd = vec(4);
var ce = vec(4);
var da = vec(4);
var eb = vec(4);
var abc = vec(24);
var bcd = vec(24);
var cde = vec(24);
var dea = vec(24);
var eab = vec(24);
var abd = vec(24);
var bce = vec(24);
var cda = vec(24);
var deb = vec(24);
var eac = vec(24);
var adet = vec(1152);
var bdet = vec(1152);
var cdet = vec(1152);
var ddet = vec(1152);
var edet = vec(1152);
var abdet = vec(2304);
var cddet = vec(2304);
var cdedet = vec(3456);
var deter = vec(5760);
var _83 = vec(8);
var _8b2 = vec(8);
var _8c = vec(8);
var _163 = vec(16);
var _24 = vec(24);
var _482 = vec(48);
var _48b = vec(48);
var _96 = vec(96);
var _192 = vec(192);
var _384x = vec(384);
var _384y = vec(384);
var _384z = vec(384);
var _768 = vec(768);
var xdet = vec(96);
var ydet = vec(96);
var zdet = vec(96);
var fin4 = vec(1152);

// node_modules/.pnpm/@kninnug+constrainautor@4.1.0/node_modules/@kninnug/constrainautor/lib/Constrainautor.mjs
var BitSet = class {
  constructor(W, bs) {
    this.W = W;
    this.bs = bs;
  }
  /**
   * Add a number to the set.
   *
   * @param idx The number to add. Must be 0 <= idx < len.
   * @return this.
   */
  add(idx) {
    const W = this.W;
    const byte = idx / W | 0;
    const bit = idx % W;
    this.bs[byte] |= 1 << bit;
    return this;
  }
  /**
   * Delete a number from the set.
   *
   * @param idx The number to delete. Must be 0 <= idx < len.
   * @return this.
   */
  delete(idx) {
    const W = this.W;
    const byte = idx / W | 0;
    const bit = idx % W;
    this.bs[byte] &= ~(1 << bit);
    return this;
  }
  /**
   * Add or delete a number in the set, depending on the second argument.
   *
   * @param idx The number to add or delete. Must be 0 <= idx < len.
   * @param val If true, add the number, otherwise delete.
   * @return val.
   */
  set(idx, val) {
    const W = this.W;
    const byte = idx / W | 0;
    const bit = idx % W;
    const m = 1 << bit;
    this.bs[byte] ^= (-val ^ this.bs[byte]) & m;
    return val;
  }
  /**
   * Whether the number is in the set.
   *
   * @param idx The number to test. Must be 0 <= idx < len.
   * @return True if the number is in the set.
   */
  has(idx) {
    const W = this.W;
    const byte = idx / W | 0;
    const bit = idx % W;
    return !!(this.bs[byte] & 1 << bit);
  }
  /**
   * Iterate over the numbers that are in the set. The callback is invoked
   * with each number that is set. It is allowed to change the BitSet during
   * iteration. If it deletes a number that has not been iterated over, that
   * number will not show up in a later call. If it adds a number during
   * iteration, that number may or may not show up in a later call.
   *
   * @param fn The function to call for each number.
   * @return this.
   */
  forEach(fn) {
    const W = this.W;
    const bs = this.bs;
    const len = bs.length;
    for (let byte = 0; byte < len; byte++) {
      let bit = 0;
      while (bs[byte] && bit < W) {
        if (bs[byte] & 1 << bit) {
          fn(byte * W + bit);
        }
        bit++;
      }
    }
    return this;
  }
};
var BitSet8 = class extends BitSet {
  /**
   * Create a bit set.
   *
   * @param len The length of the bit set, limiting the maximum value that
   *        can be stored in it to len - 1.
   */
  constructor(len) {
    const W = 8;
    const bs = new Uint8Array(Math.ceil(len / W)).fill(0);
    super(W, bs);
  }
};
function nextEdge(e) {
  return e % 3 === 2 ? e - 2 : e + 1;
}
function prevEdge(e) {
  return e % 3 === 0 ? e + 2 : e - 1;
}
var U32NIL = 2 ** 32 - 1;
var Constrainautor = class {
  /**
   * Make a Constrainautor.
   *
   * @param del The triangulation output from Delaunator.
   * @param edges If provided, constrain these edges as by constrainAll.
   */
  constructor(del, edges) {
    if (!del || typeof del !== "object" || !del.triangles || !del.halfedges || !del.coords) {
      throw new Error("Expected an object with Delaunator output");
    }
    if (del.triangles.length % 3 || del.halfedges.length !== del.triangles.length || del.coords.length % 2) {
      throw new Error("Delaunator output appears inconsistent");
    }
    if (del.triangles.length < 3) {
      throw new Error("No edges in triangulation");
    }
    this.del = del;
    const numPoints = del.coords.length >> 1;
    const numEdges = del.triangles.length;
    this.vertMap = new Uint32Array(numPoints).fill(U32NIL);
    this.flips = new BitSet8(numEdges);
    this.consd = new BitSet8(numEdges);
    const triangles = del.triangles;
    const vm = this.vertMap;
    for (let e = 0; e < numEdges; e++) {
      const v2 = triangles[e];
      if (vm[v2] === U32NIL) {
        this.updateVert(e);
      }
    }
    if (edges) {
      this.constrainAll(edges);
    }
  }
  /**
   * Constrain the triangulation such that there is an edge between p1 and p2.
   *
   * @param segP1 The index of one segment end-point in the coords array.
   * @param segP2 The index of the other segment end-point in the coords array.
   * @return The id of the edge that points from p1 to p2. If the
   *         constrained edge lies on the hull and points in the opposite
   *         direction (p2 to p1), the negative of its id is returned.
   */
  constrainOne(segP1, segP2) {
    const { triangles, halfedges } = this.del;
    const vm = this.vertMap;
    const consd = this.consd;
    const start = vm[segP1];
    if (start === U32NIL || vm[segP2] === U32NIL) {
      throw new Error(`Cannot constrain between points that are not triangulated`);
    }
    let edg = start;
    do {
      const p4 = triangles[edg];
      const nxt = nextEdge(edg);
      if (p4 === segP2) {
        return this.protect(edg);
      }
      const opp = prevEdge(edg);
      const p3 = triangles[opp];
      if (p3 === segP2) {
        this.protect(nxt);
        return nxt;
      }
      if (this.intersectSegments(segP1, segP2, p3, p4)) {
        edg = opp;
        break;
      }
      const adj = halfedges[nxt];
      edg = adj;
    } while (edg !== -1 && edg !== start);
    let conEdge = edg;
    let rescan = -1;
    while (edg !== -1) {
      const adj = halfedges[edg];
      const bot = prevEdge(edg);
      const top = prevEdge(adj);
      const rgt = nextEdge(adj);
      if (adj === -1) {
        throw new Error("Constraining edge exited the hull");
      }
      if (consd.has(edg)) {
        throw new Error("Edge intersects already constrained edge");
      }
      if (this.isCollinear(segP1, segP2, triangles[edg]) || this.isCollinear(segP1, segP2, triangles[adj])) {
        throw new Error("Constraining edge intersects point");
      }
      const convex = this.intersectSegments(triangles[edg], triangles[adj], triangles[bot], triangles[top]);
      if (!convex) {
        if (rescan === -1) {
          rescan = edg;
        }
        if (triangles[top] === segP2) {
          if (edg === rescan) {
            throw new Error("Infinite loop: non-convex quadrilateral");
          }
          edg = rescan;
          rescan = -1;
          continue;
        }
        if (this.intersectSegments(segP1, segP2, triangles[top], triangles[adj])) {
          edg = top;
        } else if (this.intersectSegments(segP1, segP2, triangles[rgt], triangles[top])) {
          edg = rgt;
        } else if (rescan === edg) {
          throw new Error("Infinite loop: no further intersect after non-convex");
        }
        continue;
      }
      this.flipDiagonal(edg);
      if (this.intersectSegments(segP1, segP2, triangles[bot], triangles[top])) {
        if (rescan === -1) {
          rescan = bot;
        }
        if (rescan === bot) {
          throw new Error("Infinite loop: flipped diagonal still intersects");
        }
      }
      if (triangles[top] === segP2) {
        conEdge = top;
        edg = rescan;
        rescan = -1;
      } else if (this.intersectSegments(segP1, segP2, triangles[rgt], triangles[top])) {
        edg = rgt;
      }
    }
    const flips = this.flips;
    this.protect(conEdge);
    do {
      var flipped = 0;
      flips.forEach((edg2) => {
        flips.delete(edg2);
        const adj = halfedges[edg2];
        if (adj === -1) {
          return;
        }
        flips.delete(adj);
        if (!this.isDelaunay(edg2)) {
          this.flipDiagonal(edg2);
          flipped++;
        }
      });
    } while (flipped > 0);
    return this.findEdge(segP1, segP2);
  }
  /**
   * Fix the Delaunay condition. It is no longer necessary to call this
   * method after constraining (many) edges, since constrainOne will do it
   * after each.
   *
   * @param deep If true, keep checking & flipping edges until all
   *        edges are Delaunay, otherwise only check the edges once.
   * @return The triangulation object.
   */
  delaunify(deep = false) {
    const halfedges = this.del.halfedges;
    const flips = this.flips;
    const consd = this.consd;
    const len = halfedges.length;
    do {
      var flipped = 0;
      for (let edg = 0; edg < len; edg++) {
        if (consd.has(edg)) {
          continue;
        }
        flips.delete(edg);
        const adj = halfedges[edg];
        if (adj === -1) {
          continue;
        }
        flips.delete(adj);
        if (!this.isDelaunay(edg)) {
          this.flipDiagonal(edg);
          flipped++;
        }
      }
    } while (deep && flipped > 0);
    return this;
  }
  /**
   * Call constrainOne on each edge, and delaunify afterwards.
   *
   * @param edges The edges to constrain: each element is an array with
   *        [p1, p2] which are indices into the points array originally
   *        supplied to Delaunator.
   * @return The triangulation object.
   */
  constrainAll(edges) {
    const len = edges.length;
    for (let i = 0; i < len; i++) {
      const e = edges[i];
      this.constrainOne(e[0], e[1]);
    }
    return this;
  }
  /**
   * Whether an edge is a constrained edge.
   *
   * @param edg The edge id.
   * @return True if the edge is constrained.
   */
  isConstrained(edg) {
    return this.consd.has(edg);
  }
  /**
   * Find the edge that points from p1 -> p2. If there is only an edge from
   * p2 -> p1 (i.e. it is on the hull), returns the negative id of it.
   *
   * @param p1 The index of the first point into the points array.
   * @param p2 The index of the second point into the points array.
   * @return The id of the edge that points from p1 -> p2, or the negative
   *         id of the edge that goes from p2 -> p1, or Infinity if there is
   *         no edge between p1 and p2.
   */
  findEdge(p1, p2) {
    const start1 = this.vertMap[p2];
    const triangles = this.del.triangles;
    const halfedges = this.del.halfedges;
    let edg = start1;
    let prv = -1;
    do {
      if (triangles[edg] === p1) {
        return edg;
      }
      prv = nextEdge(edg);
      edg = halfedges[prv];
    } while (edg !== -1 && edg !== start1);
    if (triangles[nextEdge(prv)] === p1) {
      return -prv;
    }
    return Infinity;
  }
  /**
   * Find points that are not triangulated. Trying to constrain an edge
   * between two points either of which are not triangulated, will result in
   * an error being thrown from constrainOne.
   *
   * @return An array of ids of points that have no incoming edges.
   */
  untriangulatedPoints() {
    const ret = [];
    const vm = this.vertMap;
    const numPoints = vm.length;
    for (let i = 0; i < numPoints; i++) {
      if (vm[i] === U32NIL) {
        ret.push(i);
      }
    }
    return ret;
  }
  /**
   * Mark an edge as constrained, i.e. should not be touched by `delaunify`.
   *
   * @private
   * @param edg The edge id.
   * @return If edg has an adjacent, returns that, otherwise -edg.
   */
  protect(edg) {
    const adj = this.del.halfedges[edg];
    const flips = this.flips;
    const consd = this.consd;
    flips.delete(edg);
    consd.add(edg);
    if (adj !== -1) {
      flips.delete(adj);
      consd.add(adj);
      return adj;
    }
    return -edg;
  }
  /**
   * Mark an edge as flipped, unless it is already marked as constrained.
   *
   * @private
   * @param edg The edge id.
   * @return True if edg was not constrained.
   */
  markFlip(edg) {
    const halfedges = this.del.halfedges;
    const flips = this.flips;
    const consd = this.consd;
    if (consd.has(edg)) {
      return false;
    }
    const adj = halfedges[edg];
    if (adj !== -1) {
      flips.add(edg);
      flips.add(adj);
    }
    return true;
  }
  /**
   * Flip the edge shared by two triangles.
   *
   * @private
   * @param edg The edge shared by the two triangles, must have an
   *        adjacent half-edge.
   * @return The new diagonal.
   */
  flipDiagonal(edg) {
    const triangles = this.del.triangles;
    const halfedges = this.del.halfedges;
    const flips = this.flips;
    const consd = this.consd;
    const adj = halfedges[edg];
    const bot = prevEdge(edg);
    const lft = nextEdge(edg);
    const top = prevEdge(adj);
    const rgt = nextEdge(adj);
    const adjBot = halfedges[bot];
    const adjTop = halfedges[top];
    if (consd.has(edg)) {
      throw new Error("Trying to flip a constrained edge");
    }
    triangles[edg] = triangles[top];
    halfedges[edg] = adjTop;
    if (!flips.set(edg, flips.has(top))) {
      consd.set(edg, consd.has(top));
    }
    if (adjTop !== -1) {
      halfedges[adjTop] = edg;
    }
    halfedges[bot] = top;
    triangles[adj] = triangles[bot];
    halfedges[adj] = adjBot;
    if (!flips.set(adj, flips.has(bot))) {
      consd.set(adj, consd.has(bot));
    }
    if (adjBot !== -1) {
      halfedges[adjBot] = adj;
    }
    halfedges[top] = bot;
    this.markFlip(edg);
    this.markFlip(lft);
    this.markFlip(adj);
    this.markFlip(rgt);
    flips.add(bot);
    consd.delete(bot);
    flips.add(top);
    consd.delete(top);
    this.updateVert(edg);
    this.updateVert(lft);
    this.updateVert(adj);
    this.updateVert(rgt);
    return bot;
  }
  /**
   * Whether the two triangles sharing edg conform to the Delaunay condition.
   * As a shortcut, if the given edge has no adjacent (is on the hull), it is
   * certainly Delaunay.
   *
   * @private
   * @param edg The edge shared by the triangles to test.
   * @return True if they are Delaunay.
   */
  isDelaunay(edg) {
    const triangles = this.del.triangles;
    const halfedges = this.del.halfedges;
    const adj = halfedges[edg];
    if (adj === -1) {
      return true;
    }
    const p1 = triangles[prevEdge(edg)];
    const p2 = triangles[edg];
    const p3 = triangles[nextEdge(edg)];
    const px = triangles[prevEdge(adj)];
    return !this.inCircle(p1, p2, p3, px);
  }
  /**
   * Update the vertex -> incoming edge map.
   *
   * @private
   * @param start The id of an *outgoing* edge.
   * @return The id of the right-most incoming edge.
   */
  updateVert(start) {
    const triangles = this.del.triangles;
    const halfedges = this.del.halfedges;
    const vm = this.vertMap;
    const v2 = triangles[start];
    let inc = prevEdge(start);
    let adj = halfedges[inc];
    while (adj !== -1 && adj !== start) {
      inc = prevEdge(adj);
      adj = halfedges[inc];
    }
    vm[v2] = inc;
    return inc;
  }
  /**
   * Whether the segment between [p1, p2] intersects with [p3, p4]. When the
   * segments share an end-point (e.g. p1 == p3 etc.), they are not considered
   * intersecting.
   *
   * @private
   * @param p1 The index of point 1 into this.del.coords.
   * @param p2 The index of point 2 into this.del.coords.
   * @param p3 The index of point 3 into this.del.coords.
   * @param p4 The index of point 4 into this.del.coords.
   * @return True if the segments intersect.
   */
  intersectSegments(p1, p2, p3, p4) {
    const pts = this.del.coords;
    if (p1 === p3 || p1 === p4 || p2 === p3 || p2 === p4) {
      return false;
    }
    return intersectSegments(pts[p1 * 2], pts[p1 * 2 + 1], pts[p2 * 2], pts[p2 * 2 + 1], pts[p3 * 2], pts[p3 * 2 + 1], pts[p4 * 2], pts[p4 * 2 + 1]);
  }
  /**
   * Whether point px is in the circumcircle of the triangle formed by p1, p2,
   * and p3 (which are in counter-clockwise order).
   *
   * @param p1 The index of point 1 into this.del.coords.
   * @param p2 The index of point 2 into this.del.coords.
   * @param p3 The index of point 3 into this.del.coords.
   * @param px The index of point x into this.del.coords.
   * @return True if (px, py) is in the circumcircle.
   */
  inCircle(p1, p2, p3, px) {
    const pts = this.del.coords;
    return incircle(pts[p1 * 2], pts[p1 * 2 + 1], pts[p2 * 2], pts[p2 * 2 + 1], pts[p3 * 2], pts[p3 * 2 + 1], pts[px * 2], pts[px * 2 + 1]) < 0;
  }
  /**
   * Whether point p1, p2, and p are collinear.
   *
   * @private
   * @param p1 The index of segment point 1 into this.del.coords.
   * @param p2 The index of segment point 2 into this.del.coords.
   * @param p The index of the point p into this.del.coords.
   * @return True if the points are collinear.
   */
  isCollinear(p1, p2, p) {
    const pts = this.del.coords;
    return orient2d(pts[p1 * 2], pts[p1 * 2 + 1], pts[p2 * 2], pts[p2 * 2 + 1], pts[p * 2], pts[p * 2 + 1]) === 0;
  }
};
Constrainautor.intersectSegments = intersectSegments;
function intersectSegments(p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y) {
  const x0 = orient2d(p1x, p1y, p3x, p3y, p4x, p4y);
  const y0 = orient2d(p2x, p2y, p3x, p3y, p4x, p4y);
  if (x0 > 0 && y0 > 0 || x0 < 0 && y0 < 0) {
    return false;
  }
  const x1 = orient2d(p3x, p3y, p1x, p1y, p2x, p2y);
  const y1 = orient2d(p4x, p4y, p1x, p1y, p2x, p2y);
  if (x1 > 0 && y1 > 0 || x1 < 0 && y1 < 0) {
    return false;
  }
  if (x0 === 0 && y0 === 0 && x1 === 0 && y1 === 0) {
    return !(Math.max(p3x, p4x) < Math.min(p1x, p2x) || Math.max(p1x, p2x) < Math.min(p3x, p4x) || Math.max(p3y, p4y) < Math.min(p1y, p2y) || Math.max(p1y, p2y) < Math.min(p3y, p4y));
  }
  return true;
}

// node_modules/.pnpm/delaunator@5.1.0/node_modules/delaunator/index.js
var EPSILON = Math.pow(2, -52);
var EDGE_STACK = new Uint32Array(512);
var Delaunator = class _Delaunator {
  /**
   * Constructs a delaunay triangulation object given an array of points (`[x, y]` by default).
   * `getX` and `getY` are optional functions of the form `(point) => value` for custom point formats.
   *
   * @template P
   * @param {P[]} points
   * @param {(p: P) => number} [getX]
   * @param {(p: P) => number} [getY]
   */
  // @ts-expect-error TS2322
  static from(points, getX = defaultGetX, getY = defaultGetY) {
    const n2 = points.length;
    const coords = new Float64Array(n2 * 2);
    for (let i = 0; i < n2; i++) {
      const p = points[i];
      coords[2 * i] = getX(p);
      coords[2 * i + 1] = getY(p);
    }
    return new _Delaunator(coords);
  }
  /**
   * Constructs a delaunay triangulation object given an array of point coordinates of the form:
   * `[x0, y0, x1, y1, ...]` (use a typed array for best performance). Duplicate points are skipped.
   *
   * @param {T} coords
   */
  constructor(coords) {
    const n2 = coords.length >> 1;
    if (n2 > 0 && typeof coords[0] !== "number") throw new Error("Expected coords to contain numbers.");
    this.coords = coords;
    const maxTriangles = Math.max(2 * n2 - 5, 0);
    this._triangles = new Uint32Array(maxTriangles * 3);
    this._halfedges = new Int32Array(maxTriangles * 3);
    this._hashSize = Math.ceil(Math.sqrt(n2));
    this._hullPrev = new Uint32Array(n2);
    this._hullNext = new Uint32Array(n2);
    this._hullTri = new Uint32Array(n2);
    this._hullHash = new Int32Array(this._hashSize);
    this._ids = new Uint32Array(n2);
    this._dists = new Float64Array(n2);
    this.trianglesLen = 0;
    this._cx = 0;
    this._cy = 0;
    this._hullStart = 0;
    this.hull = this._triangles;
    this.triangles = this._triangles;
    this.halfedges = this._halfedges;
    this.update();
  }
  /**
   * Updates the triangulation if you modified `delaunay.coords` values in place, avoiding expensive memory allocations.
   * Useful for iterative relaxation algorithms such as Lloyd's.
   */
  update() {
    const { coords, _hullPrev: hullPrev, _hullNext: hullNext, _hullTri: hullTri, _hullHash: hullHash } = this;
    const n2 = coords.length >> 1;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < n2; i++) {
      const x = coords[2 * i];
      const y = coords[2 * i + 1];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      this._ids[i] = i;
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    let i0 = 0, i1 = 0, i2 = 0;
    for (let i = 0, minDist = Infinity; i < n2; i++) {
      const d = dist2(cx, cy, coords[2 * i], coords[2 * i + 1]);
      if (d < minDist) {
        i0 = i;
        minDist = d;
      }
    }
    const i0x = coords[2 * i0];
    const i0y = coords[2 * i0 + 1];
    for (let i = 0, minDist = Infinity; i < n2; i++) {
      if (i === i0) continue;
      const d = dist2(i0x, i0y, coords[2 * i], coords[2 * i + 1]);
      if (d < minDist && d > 0) {
        i1 = i;
        minDist = d;
      }
    }
    let i1x = coords[2 * i1];
    let i1y = coords[2 * i1 + 1];
    let minRadius = Infinity;
    for (let i = 0; i < n2; i++) {
      if (i === i0 || i === i1) continue;
      const r = circumradius(i0x, i0y, i1x, i1y, coords[2 * i], coords[2 * i + 1]);
      if (r < minRadius) {
        i2 = i;
        minRadius = r;
      }
    }
    let i2x = coords[2 * i2];
    let i2y = coords[2 * i2 + 1];
    if (minRadius === Infinity) {
      for (let i = 0; i < n2; i++) {
        this._dists[i] = coords[2 * i] - coords[0] || coords[2 * i + 1] - coords[1];
      }
      quicksort(this._ids, this._dists, 0, n2 - 1);
      const hull = new Uint32Array(n2);
      let j = 0;
      for (let i = 0, d0 = -Infinity; i < n2; i++) {
        const id = this._ids[i];
        const d = this._dists[id];
        if (d > d0) {
          hull[j++] = id;
          d0 = d;
        }
      }
      this.hull = hull.subarray(0, j);
      this.triangles = new Uint32Array(0);
      this.halfedges = new Int32Array(0);
      return;
    }
    if (orient2d(i0x, i0y, i1x, i1y, i2x, i2y) < 0) {
      const i = i1;
      const x = i1x;
      const y = i1y;
      i1 = i2;
      i1x = i2x;
      i1y = i2y;
      i2 = i;
      i2x = x;
      i2y = y;
    }
    const center = circumcenter(i0x, i0y, i1x, i1y, i2x, i2y);
    this._cx = center.x;
    this._cy = center.y;
    for (let i = 0; i < n2; i++) {
      this._dists[i] = dist2(coords[2 * i], coords[2 * i + 1], center.x, center.y);
    }
    quicksort(this._ids, this._dists, 0, n2 - 1);
    this._hullStart = i0;
    let hullSize = 3;
    hullNext[i0] = hullPrev[i2] = i1;
    hullNext[i1] = hullPrev[i0] = i2;
    hullNext[i2] = hullPrev[i1] = i0;
    hullTri[i0] = 0;
    hullTri[i1] = 1;
    hullTri[i2] = 2;
    hullHash.fill(-1);
    hullHash[this._hashKey(i0x, i0y)] = i0;
    hullHash[this._hashKey(i1x, i1y)] = i1;
    hullHash[this._hashKey(i2x, i2y)] = i2;
    this.trianglesLen = 0;
    this._addTriangle(i0, i1, i2, -1, -1, -1);
    for (let k = 0, xp = 0, yp = 0; k < this._ids.length; k++) {
      const i = this._ids[k];
      const x = coords[2 * i];
      const y = coords[2 * i + 1];
      if (k > 0 && Math.abs(x - xp) <= EPSILON && Math.abs(y - yp) <= EPSILON) continue;
      xp = x;
      yp = y;
      if (i === i0 || i === i1 || i === i2) continue;
      let start = 0;
      for (let j = 0, key = this._hashKey(x, y); j < this._hashSize; j++) {
        start = hullHash[(key + j) % this._hashSize];
        if (start !== -1 && start !== hullNext[start]) break;
      }
      start = hullPrev[start];
      let e = start, q;
      while (q = hullNext[e], orient2d(x, y, coords[2 * e], coords[2 * e + 1], coords[2 * q], coords[2 * q + 1]) >= 0) {
        e = q;
        if (e === start) {
          e = -1;
          break;
        }
      }
      if (e === -1) continue;
      let t = this._addTriangle(e, i, hullNext[e], -1, -1, hullTri[e]);
      hullTri[i] = this._legalize(t + 2);
      hullTri[e] = t;
      hullSize++;
      let n4 = hullNext[e];
      while (q = hullNext[n4], orient2d(x, y, coords[2 * n4], coords[2 * n4 + 1], coords[2 * q], coords[2 * q + 1]) < 0) {
        t = this._addTriangle(n4, i, q, hullTri[i], -1, hullTri[n4]);
        hullTri[i] = this._legalize(t + 2);
        hullNext[n4] = n4;
        hullSize--;
        n4 = q;
      }
      if (e === start) {
        while (q = hullPrev[e], orient2d(x, y, coords[2 * q], coords[2 * q + 1], coords[2 * e], coords[2 * e + 1]) < 0) {
          t = this._addTriangle(q, i, e, -1, hullTri[e], hullTri[q]);
          this._legalize(t + 2);
          hullTri[q] = t;
          hullNext[e] = e;
          hullSize--;
          e = q;
        }
      }
      this._hullStart = hullPrev[i] = e;
      hullNext[e] = hullPrev[n4] = i;
      hullNext[i] = n4;
      hullHash[this._hashKey(x, y)] = i;
      hullHash[this._hashKey(coords[2 * e], coords[2 * e + 1])] = e;
    }
    this.hull = new Uint32Array(hullSize);
    for (let i = 0, e = this._hullStart; i < hullSize; i++) {
      this.hull[i] = e;
      e = hullNext[e];
    }
    this.triangles = this._triangles.subarray(0, this.trianglesLen);
    this.halfedges = this._halfedges.subarray(0, this.trianglesLen);
  }
  /**
   * Calculate an angle-based key for the edge hash used for advancing convex hull.
   *
   * @param {number} x
   * @param {number} y
   * @private
   */
  _hashKey(x, y) {
    return Math.floor(pseudoAngle(x - this._cx, y - this._cy) * this._hashSize) % this._hashSize;
  }
  /**
   * Flip an edge in a pair of triangles if it doesn't satisfy the Delaunay condition.
   *
   * @param {number} a
   * @private
   */
  _legalize(a) {
    const { _triangles: triangles, _halfedges: halfedges, coords } = this;
    let i = 0;
    let ar = 0;
    while (true) {
      const b = halfedges[a];
      const a0 = a - a % 3;
      ar = a0 + (a + 2) % 3;
      if (b === -1) {
        if (i === 0) break;
        a = EDGE_STACK[--i];
        continue;
      }
      const b0 = b - b % 3;
      const al = a0 + (a + 1) % 3;
      const bl = b0 + (b + 2) % 3;
      const p0 = triangles[ar];
      const pr = triangles[a];
      const pl = triangles[al];
      const p1 = triangles[bl];
      const illegal = inCircle(
        coords[2 * p0],
        coords[2 * p0 + 1],
        coords[2 * pr],
        coords[2 * pr + 1],
        coords[2 * pl],
        coords[2 * pl + 1],
        coords[2 * p1],
        coords[2 * p1 + 1]
      );
      if (illegal) {
        triangles[a] = p1;
        triangles[b] = p0;
        const hbl = halfedges[bl];
        if (hbl === -1) {
          let e = this._hullStart;
          do {
            if (this._hullTri[e] === bl) {
              this._hullTri[e] = a;
              break;
            }
            e = this._hullPrev[e];
          } while (e !== this._hullStart);
        }
        this._link(a, hbl);
        this._link(b, halfedges[ar]);
        this._link(ar, bl);
        const br = b0 + (b + 1) % 3;
        if (i < EDGE_STACK.length) {
          EDGE_STACK[i++] = br;
        }
      } else {
        if (i === 0) break;
        a = EDGE_STACK[--i];
      }
    }
    return ar;
  }
  /**
   * Link two half-edges to each other.
   * @param {number} a
   * @param {number} b
   * @private
   */
  _link(a, b) {
    this._halfedges[a] = b;
    if (b !== -1) this._halfedges[b] = a;
  }
  /**
   * Add a new triangle given vertex indices and adjacent half-edge ids.
   *
   * @param {number} i0
   * @param {number} i1
   * @param {number} i2
   * @param {number} a
   * @param {number} b
   * @param {number} c
   * @private
   */
  _addTriangle(i0, i1, i2, a, b, c) {
    const t = this.trianglesLen;
    this._triangles[t] = i0;
    this._triangles[t + 1] = i1;
    this._triangles[t + 2] = i2;
    this._link(t, a);
    this._link(t + 1, b);
    this._link(t + 2, c);
    this.trianglesLen += 3;
    return t;
  }
};
function pseudoAngle(dx, dy) {
  const p = dx / (Math.abs(dx) + Math.abs(dy));
  return (dy > 0 ? 3 - p : 1 + p) / 4;
}
function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}
function inCircle(ax, ay, bx, by, cx, cy, px, py) {
  const dx = ax - px;
  const dy = ay - py;
  const ex = bx - px;
  const ey = by - py;
  const fx = cx - px;
  const fy = cy - py;
  const ap = dx * dx + dy * dy;
  const bp = ex * ex + ey * ey;
  const cp = fx * fx + fy * fy;
  return dx * (ey * cp - bp * fy) - dy * (ex * cp - bp * fx) + ap * (ex * fy - ey * fx) < 0;
}
function circumradius(ax, ay, bx, by, cx, cy) {
  const dx = bx - ax;
  const dy = by - ay;
  const ex = cx - ax;
  const ey = cy - ay;
  const bl = dx * dx + dy * dy;
  const cl = ex * ex + ey * ey;
  const d = 0.5 / (dx * ey - dy * ex);
  const x = (ey * bl - dy * cl) * d;
  const y = (dx * cl - ex * bl) * d;
  return x * x + y * y;
}
function circumcenter(ax, ay, bx, by, cx, cy) {
  const dx = bx - ax;
  const dy = by - ay;
  const ex = cx - ax;
  const ey = cy - ay;
  const bl = dx * dx + dy * dy;
  const cl = ex * ex + ey * ey;
  const d = 0.5 / (dx * ey - dy * ex);
  const x = ax + (ey * bl - dy * cl) * d;
  const y = ay + (dx * cl - ex * bl) * d;
  return { x, y };
}
function quicksort(ids, dists, left, right) {
  if (right - left <= 20) {
    for (let i = left + 1; i <= right; i++) {
      const temp = ids[i];
      const tempDist = dists[temp];
      let j = i - 1;
      while (j >= left && dists[ids[j]] > tempDist) ids[j + 1] = ids[j--];
      ids[j + 1] = temp;
    }
  } else {
    const median = left + right >> 1;
    let i = left + 1;
    let j = right;
    swap(ids, median, i);
    if (dists[ids[left]] > dists[ids[right]]) swap(ids, left, right);
    if (dists[ids[i]] > dists[ids[right]]) swap(ids, i, right);
    if (dists[ids[left]] > dists[ids[i]]) swap(ids, left, i);
    const temp = ids[i];
    const tempDist = dists[temp];
    while (true) {
      do
        i++;
      while (dists[ids[i]] < tempDist);
      do
        j--;
      while (dists[ids[j]] > tempDist);
      if (j < i) break;
      swap(ids, i, j);
    }
    ids[left + 1] = ids[j];
    ids[j] = temp;
    if (right - i + 1 >= j - left) {
      quicksort(ids, dists, i, right);
      quicksort(ids, dists, left, j - 1);
    } else {
      quicksort(ids, dists, left, j - 1);
      quicksort(ids, dists, i, right);
    }
  }
}
function swap(arr, i, j) {
  const tmp = arr[i];
  arr[i] = arr[j];
  arr[j] = tmp;
}
function defaultGetX(p) {
  return p[0];
}
function defaultGetY(p) {
  return p[1];
}

// packages/bordado/src/vector/malla.ts
function remuestrearAnillo(anillo, paso) {
  const salida2 = [];
  for (let i = 0; i < anillo.length; i++) {
    const a = anillo[i];
    const b = anillo[(i + 1) % anillo.length];
    const largo = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const tramos = Math.max(1, Math.ceil(largo / paso(i) - 1e-9));
    for (let k = 0; k < tramos; k++) {
      const t = k / tramos;
      salida2.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return salida2;
}
function construir(anillos, region) {
  const puntos = [];
  const anilloDe = [];
  const siguiente = [];
  const anterior = [];
  const vistos = /* @__PURE__ */ new Set();
  anillos.forEach((anillo, r) => {
    const base = puntos.length;
    anillo.forEach((p, i) => {
      const clave2 = `${p[0].toFixed(7)},${p[1].toFixed(7)}`;
      if (vistos.has(clave2)) throw new Error("PUNTO_REPETIDO");
      vistos.add(clave2);
      puntos.push(p);
      anilloDe.push(r);
      siguiente.push(base + (i + 1) % anillo.length);
      anterior.push(base + (i - 1 + anillo.length) % anillo.length);
    });
  });
  const n2 = puntos.length;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const [x, y] of puntos) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const margen = Math.max(maxX - minX, maxY - minY) * 0.5 + 1;
  const marco = [
    [minX - margen, minY - margen],
    [maxX + margen, minY - margen],
    [maxX + margen, maxY + margen],
    [minX - margen, maxY + margen]
  ];
  const coords = new Float64Array((n2 + marco.length) * 2);
  [...puntos, ...marco].forEach(([x, y], i) => {
    coords[2 * i] = x;
    coords[2 * i + 1] = y;
  });
  const del = new Delaunator(coords);
  const con = new Constrainautor(del);
  for (let i = 0; i < puntos.length; i++) con.constrainOne(i, siguiente[i]);
  const esBorde = (a, b) => siguiente[a] === b || siguiente[b] === a;
  const totalDel = del.triangles.length / 3;
  const indice = new Int32Array(totalDel).fill(-1);
  const dentro2 = [];
  for (let t = 0; t < totalDel; t++) {
    const [a, b, c] = [
      del.triangles[3 * t],
      del.triangles[3 * t + 1],
      del.triangles[3 * t + 2]
    ];
    if (a >= n2 || b >= n2 || c >= n2) continue;
    const centro = [
      (puntos[a][0] + puntos[b][0] + puntos[c][0]) / 3,
      (puntos[a][1] + puntos[b][1] + puntos[c][1]) / 3
    ];
    const doble = Math.abs(
      (puntos[b][0] - puntos[a][0]) * (puntos[c][1] - puntos[a][1]) - (puntos[c][0] - puntos[a][0]) * (puntos[b][1] - puntos[a][1])
    );
    if (doble < 1e-9) continue;
    if (dentroDeRegion(region, centro)) {
      indice[t] = dentro2.length;
      dentro2.push(t);
    }
  }
  const triangulos = new Int32Array(dentro2.length * 3);
  const vecinos = new Int32Array(dentro2.length * 3).fill(-1);
  dentro2.forEach((t, i) => {
    for (let k = 0; k < 3; k++) {
      const e = 3 * t + k;
      triangulos[3 * i + k] = del.triangles[e];
      const a = del.triangles[e];
      const b = del.triangles[3 * t + (k + 1) % 3];
      const opuesta = del.halfedges[e];
      if (opuesta < 0 || esBorde(a, b)) continue;
      vecinos[3 * i + k] = indice[Math.floor(opuesta / 3)];
    }
  });
  return {
    puntos,
    anilloDe: Int32Array.from(anilloDe),
    siguiente: Int32Array.from(siguiente),
    anterior: Int32Array.from(anterior),
    triangulos,
    vecinos
  };
}
function mallaDeRegion(region, opciones = {}) {
  const anillos = [region.exterior, ...region.huecos];
  const area2 = Math.abs(
    anillos.reduce((s, a, i) => {
      let doble = 0;
      for (let k = 0; k < a.length; k++) {
        const p = a[k];
        const q = a[(k + 1) % a.length];
        doble += p[0] * q[1] - q[0] * p[1];
      }
      return s + (i === 0 ? 1 : -1) * Math.abs(doble / 2);
    }, 0)
  ) || 1;
  const largo = anillos.reduce((s, a) => s + perimetro(a), 0) || 1;
  const anchoTipico = 2 * area2 / largo;
  const minimo = opciones.pasoMinimoMm ?? 0.04;
  const paso = opciones.pasoMm ?? Math.min(0.5, Math.max(minimo, anchoTipico / 5));
  const primera = anillos.map((a) => remuestrearAnillo(a, () => paso));
  const malla = construir(primera, region);
  if (opciones.pasoMm !== void 0) return malla;
  const pasoLocal = /* @__PURE__ */ new Map();
  const n2 = malla.triangulos.length / 3;
  for (let t = 0; t < n2; t++) {
    for (let k = 0; k < 3; k++) {
      if (malla.vecinos[3 * t + k] !== -1) continue;
      const a = malla.triangulos[3 * t + k];
      const b = malla.triangulos[3 * t + (k + 1) % 3];
      const c = malla.triangulos[3 * t + (k + 2) % 3];
      if (cercaEnElAnillo(malla, c, a) || cercaEnElAnillo(malla, c, b))
        continue;
      const [pa, pb, pc] = [malla.puntos[a], malla.puntos[b], malla.puntos[c]];
      const base2 = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
      if (base2 < 1e-9) continue;
      const altura = Math.abs(
        (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pb[1] - pa[1]) * (pc[0] - pa[0])
      ) / base2;
      const deseado = Math.max(minimo, altura / 4);
      if (deseado < base2 * 0.9) {
        const clave2 = `${Math.min(a, b)}-${Math.max(a, b)}`;
        pasoLocal.set(clave2, Math.min(pasoLocal.get(clave2) ?? paso, deseado));
      }
    }
  }
  if (!pasoLocal.size) return malla;
  let base = 0;
  const segunda = primera.map((anillo) => {
    const desde = base;
    base += anillo.length;
    return remuestrearAnillo(anillo, (i) => {
      const a = desde + i;
      const b = desde + (i + 1) % anillo.length;
      return pasoLocal.get(`${Math.min(a, b)}-${Math.max(a, b)}`) ?? paso;
    });
  });
  return construir(segunda, region);
}
function cercaEnElAnillo(m, p, q, pasos = 3) {
  if (m.anilloDe[p] !== m.anilloDe[q]) return false;
  let adelante = q;
  let atras = q;
  for (let i = 0; i < pasos; i++) {
    adelante = m.siguiente[adelante];
    atras = m.anterior[atras];
    if (adelante === p || atras === p) return true;
  }
  return false;
}
function bordesDe(malla, t) {
  let n2 = 0;
  for (let k = 0; k < 3; k++) if (malla.vecinos[3 * t + k] === -1) n2++;
  return n2;
}

// packages/bordado/src/vector/ejeCordal.ts
var claveExtremo = (e) => `${e.rama}${e.alFinal ? "f" : "i"}`;
var medio = (m, c) => [
  (m.puntos[c[0]][0] + m.puntos[c[1]][0]) / 2,
  (m.puntos[c[0]][1] + m.puntos[c[1]][1]) / 2
];
var largoCuerda = (m, c) => Math.hypot(
  m.puntos[c[0]][0] - m.puntos[c[1]][0],
  m.puntos[c[0]][1] - m.puntos[c[1]][1]
);
var claveCuerda = (a, b) => a < b ? `${a}-${b}` : `${b}-${a}`;
function interiores(m, t) {
  const salida2 = [];
  for (let k = 0; k < 3; k++) {
    const vecino = m.vecinos[3 * t + k];
    if (vecino < 0) continue;
    salida2.push({
      cuerda: [m.triangulos[3 * t + k], m.triangulos[3 * t + (k + 1) % 3]],
      vecino
    });
  }
  return salida2;
}
function extraerRamas(m, tipo) {
  const ramas2 = [];
  const vistas = /* @__PURE__ */ new Set();
  const visitada = new Uint8Array(tipo.length);
  const caminar = (desde, primera, primerVecino) => {
    const cuerdas = [primera];
    const mangas = [];
    vistas.add(claveCuerda(...primera));
    let previa = primera;
    let actual = primerVecino;
    while (tipo[actual] === "manga" && !visitada[actual]) {
      visitada[actual] = 1;
      mangas.push(actual);
      const otra = interiores(m, actual).find(
        (i) => claveCuerda(...i.cuerda) !== claveCuerda(...previa)
      );
      if (!otra) break;
      cuerdas.push(otra.cuerda);
      vistas.add(claveCuerda(...otra.cuerda));
      previa = otra.cuerda;
      actual = otra.vecino;
      if (actual === mangas[0]) break;
    }
    const cerrada = tipo[actual] === "manga";
    ramas2.push({
      id: ramas2.length,
      mangas,
      cuerdas,
      nodoInicio: cerrada ? -1 : desde,
      nodoFin: cerrada ? -1 : actual,
      cerrada
    });
  };
  for (let t = 0; t < tipo.length; t++) {
    if (tipo[t] === "manga") continue;
    for (const { cuerda, vecino } of interiores(m, t)) {
      if (vistas.has(claveCuerda(...cuerda))) continue;
      caminar(t, cuerda, vecino);
    }
  }
  for (let t = 0; t < tipo.length; t++) {
    if (tipo[t] !== "manga" || visitada[t]) continue;
    const [primera, segunda] = interiores(m, t);
    if (!primera || !segunda) continue;
    visitada[t] = 1;
    const cuerdas = [primera.cuerda];
    const mangas = [t];
    let previa = primera.cuerda;
    let actual = t;
    let siguiente = segunda;
    while (true) {
      cuerdas.push(siguiente.cuerda);
      previa = siguiente.cuerda;
      actual = siguiente.vecino;
      if (actual === t || visitada[actual] || tipo[actual] !== "manga") break;
      visitada[actual] = 1;
      mangas.push(actual);
      const otra = interiores(m, actual).find(
        (i) => claveCuerda(...i.cuerda) !== claveCuerda(...previa)
      );
      if (!otra) break;
      siguiente = otra;
    }
    ramas2.push({
      id: ramas2.length,
      mangas,
      cuerdas,
      nodoInicio: -1,
      nodoFin: -1,
      cerrada: true
    });
  }
  return ramas2;
}
function verticeDePunta(m, t) {
  for (let k = 0; k < 3; k++) {
    const antes = m.vecinos[3 * t + (k + 2) % 3];
    const despues = m.vecinos[3 * t + k];
    if (antes < 0 && despues < 0) return m.puntos[m.triangulos[3 * t + k]];
  }
  const [a, b, c] = [0, 1, 2].map((k) => m.puntos[m.triangulos[3 * t + k]]);
  return [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3];
}
function largoRama(m, r) {
  let total = 0;
  for (let i = 1; i < r.cuerdas.length; i++) {
    const a = medio(m, r.cuerdas[i - 1]);
    const b = medio(m, r.cuerdas[i]);
    total += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return total;
}
function anchoRama(m, r) {
  const v2 = r.cuerdas.map((c) => largoCuerda(m, c)).sort((a, b) => a - b);
  return v2[v2.length >> 1] ?? 0;
}
function salidaDe(m, r, alFinal) {
  const cuerdas = alFinal ? [...r.cuerdas].reverse() : r.cuerdas;
  const origen = medio(m, cuerdas[0]);
  const alcance = Math.max(0.3, largoCuerda(m, cuerdas[0]));
  let destino = medio(m, cuerdas[cuerdas.length - 1]);
  let recorrido = 0;
  for (let i = 1; i < cuerdas.length; i++) {
    const a2 = medio(m, cuerdas[i - 1]);
    const b2 = medio(m, cuerdas[i]);
    recorrido += Math.hypot(b2[0] - a2[0], b2[1] - a2[1]);
    if (recorrido >= alcance) {
      destino = b2;
      break;
    }
  }
  const dx = destino[0] - origen[0];
  const dy = destino[1] - origen[1];
  const l = Math.hypot(dx, dy);
  if (l > 1e-9) return [dx / l, dy / l];
  const [a, b] = cuerdas[0].map((i) => m.puntos[i]);
  const nx = -(b[1] - a[1]);
  const ny = b[0] - a[0];
  const n2 = Math.hypot(nx, ny) || 1;
  return [nx / n2, ny / n2];
}
var OPCIONES_CORDALES = {
  espuela: 1,
  tramoInterno: 0.6,
  desvioPasa: 35,
  giroSinInglete: 45,
  proporcionGrosor: 1.45,
  desvioPasaMaximo: 50,
  proporcionGrosorMaxima: 1.9
};
function analizar(malla, opciones = OPCIONES_CORDALES) {
  const n2 = malla.triangulos.length / 3;
  const tipo = [];
  for (let t = 0; t < n2; t++) {
    const b = bordesDe(malla, t);
    tipo.push(
      b === 0 ? "cruce" : b === 1 ? "manga" : b === 2 ? "punta" : "aislado"
    );
  }
  const ramas2 = extraerRamas(malla, tipo);
  const vivas = new Set(ramas2.map((r) => r.id));
  const raiz = /* @__PURE__ */ new Map();
  const buscar = (t) => {
    let r = t;
    while (raiz.has(r) && raiz.get(r) !== r) r = raiz.get(r);
    return r;
  };
  const juntar = (a, b) => {
    const ra = buscar(a);
    const rb = buscar(b);
    if (ra !== rb) raiz.set(ra, rb);
  };
  for (let t = 0; t < n2; t++) if (tipo[t] !== "manga") raiz.set(t, t);
  const absorbidos = /* @__PURE__ */ new Map();
  const absorber = (nodo, triangulos) => {
    const lista2 = absorbidos.get(nodo) ?? [];
    lista2.push(...triangulos);
    absorbidos.set(nodo, lista2);
  };
  const extremosDe = () => {
    const mapa = /* @__PURE__ */ new Map();
    for (const id of vivas) {
      const r = ramas2[id];
      if (r.cerrada) continue;
      for (const alFinal of [false, true]) {
        const nodo = buscar(alFinal ? r.nodoFin : r.nodoInicio);
        const lista2 = mapa.get(nodo) ?? [];
        lista2.push({ rama: id, alFinal });
        mapa.set(nodo, lista2);
      }
    }
    return mapa;
  };
  let cambio = true;
  while (cambio) {
    cambio = false;
    const grados4 = extremosDe();
    for (const id of [...vivas]) {
      const r = ramas2[id];
      if (r.cerrada) continue;
      const nodoI = buscar(r.nodoInicio);
      const nodoF = buscar(r.nodoFin);
      const ancho = Math.max(
        largoCuerda(malla, r.cuerdas[0]),
        largoCuerda(malla, r.cuerdas[r.cuerdas.length - 1])
      );
      const gradoI = grados4.get(nodoI)?.length ?? 0;
      const gradoF = grados4.get(nodoF)?.length ?? 0;
      if (nodoI !== nodoF && tipo[r.nodoInicio] === "cruce" && tipo[r.nodoFin] === "cruce" && gradoI >= 2 && gradoF >= 2 && largoRama(malla, r) < opciones.tramoInterno * ancho) {
        absorber(r.nodoInicio, r.mangas);
        juntar(nodoI, nodoF);
        vivas.delete(id);
        cambio = true;
        break;
      }
      for (const alFinal of [false, true]) {
        const punta = alFinal ? r.nodoFin : r.nodoInicio;
        const otro = alFinal ? nodoI : nodoF;
        const gradoPunta = alFinal ? gradoF : gradoI;
        const gradoOtro = alFinal ? gradoI : gradoF;
        if (tipo[punta] !== "punta" || gradoPunta !== 1 || gradoOtro < 2)
          continue;
        const extremo = verticeDePunta(malla, punta);
        const desde = medio(
          malla,
          alFinal ? r.cuerdas[0] : r.cuerdas[r.cuerdas.length - 1]
        );
        const ultima = medio(
          malla,
          alFinal ? r.cuerdas[r.cuerdas.length - 1] : r.cuerdas[0]
        );
        const largo = largoRama(malla, r) + Math.hypot(extremo[0] - ultima[0], extremo[1] - ultima[1]);
        const cruce = alFinal ? r.nodoInicio : r.nodoFin;
        const tamano = Math.max(
          ancho,
          ...[0, 1, 2].map(
            (k) => largoCuerda(malla, [
              malla.triangulos[3 * cruce + k],
              malla.triangulos[3 * cruce + (k + 1) % 3]
            ])
          )
        );
        void desde;
        if (largo < opciones.espuela * tamano) {
          const deLaPunta = alFinal ? r.nodoFin : r.nodoInicio;
          absorber(deLaPunta, r.mangas);
          juntar(deLaPunta, otro);
          vivas.delete(id);
          cambio = true;
          break;
        }
      }
      if (cambio) break;
    }
  }
  const grados3 = extremosDe();
  const porRaiz = /* @__PURE__ */ new Map();
  const uniones = [];
  const unionDe = /* @__PURE__ */ new Map();
  for (let t = 0; t < n2; t++) {
    if (tipo[t] === "manga") continue;
    const r = buscar(t);
    let union2 = porRaiz.get(r);
    if (!union2) {
      union2 = {
        id: uniones.length,
        triangulos: [],
        extremos: grados3.get(r) ?? [],
        decision: "suelta"
      };
      porRaiz.set(r, union2);
      uniones.push(union2);
    }
    union2.triangulos.push(t);
  }
  for (const [nodo, triangulos] of absorbidos)
    porRaiz.get(buscar(nodo))?.triangulos.push(...triangulos);
  for (const union2 of uniones)
    for (const e of union2.extremos) unionDe.set(claveExtremo(e), union2.id);
  decidir(malla, ramas2, uniones, opciones);
  return { malla, tipo, ramas: ramas2, vivas, uniones, unionDe };
}
var grados2 = (rad) => rad * 180 / Math.PI;
function decidir(malla, ramas2, uniones, opciones) {
  for (const union2 of uniones) {
    const e = union2.extremos;
    if (e.length === 0) {
      union2.decision = "suelta";
      continue;
    }
    if (e.length === 1) {
      union2.decision = "remate";
      continue;
    }
    const salidas = e.map((x) => salidaDe(malla, ramas2[x.rama], x.alFinal));
    const anchos = e.map((x) => anchoRama(malla, ramas2[x.rama]));
    const desvio = (i, j) => grados2(
      Math.acos(
        Math.max(
          -1,
          Math.min(
            1,
            -(salidas[i][0] * salidas[j][0] + salidas[i][1] * salidas[j][1])
          )
        )
      )
    );
    if (e.length === 2) {
      union2.decision = desvio(0, 1) <= opciones.giroSinInglete ? "pasa" : "inglete";
      if (union2.decision === "pasa") union2.pasan = [e[0], e[1]];
      continue;
    }
    let mejor = null;
    let mejorDesvio = opciones.desvioPasa;
    for (let i = 0; i < e.length; i++)
      for (let j = i + 1; j < e.length; j++) {
        if (e[i].rama === e[j].rama) continue;
        const proporcion = Math.max(anchos[i], anchos[j]) / Math.max(1e-6, Math.min(anchos[i], anchos[j]));
        if (proporcion > opciones.proporcionGrosor) continue;
        const d = desvio(i, j);
        if (d <= mejorDesvio) {
          mejorDesvio = d;
          mejor = [i, j];
        }
      }
    if (!mejor) {
      let holgado = opciones.desvioPasaMaximo;
      for (let i = 0; i < e.length; i++)
        for (let j = i + 1; j < e.length; j++) {
          if (e[i].rama === e[j].rama) continue;
          const proporcion = Math.max(anchos[i], anchos[j]) / Math.max(1e-6, Math.min(anchos[i], anchos[j]));
          if (proporcion > opciones.proporcionGrosorMaxima) continue;
          const d = desvio(i, j);
          if (d <= holgado) {
            holgado = d;
            mejor = [i, j];
          }
        }
    }
    if (mejor) {
      union2.decision = "pasa";
      union2.pasan = [e[mejor[0]], e[mejor[1]]];
    } else union2.decision = "parche";
  }
}

// packages/bordado/src/vector/zonas.ts
var DECIMALES3 = 4;
var aPath3 = (p) => p.map(([x, y]) => ({ x, y }));
var aPaths = (r) => [r.exterior, ...r.huecos].map(aPath3);
function anchoInscrito(region, hasta = 20) {
  const paths = sanos(aPaths(region));
  if (!paths.length) return 0;
  let bajo = 0;
  let alto = hasta / 2;
  for (let i = 0; i < 14; i++) {
    const r = (bajo + alto) / 2;
    const estrecha = inflatePathsD(
      paths,
      -r,
      JoinType.Round,
      EndType.Polygon,
      2,
      DECIMALES3,
      Math.max(5e-3, r * 0.05)
    );
    if (estrecha.length) bajo = r;
    else alto = r;
    if (alto - bajo < 0.01) break;
  }
  return 2 * bajo;
}
function anchoInscritoAlMenos(region, umbral, hasta = 20) {
  const paths = sanos(aPaths(region));
  if (!paths.length) return umbral <= 0;
  const cabe = (r2) => inflatePathsD(
    paths,
    -r2,
    JoinType.Round,
    EndType.Polygon,
    2,
    DECIMALES3,
    Math.max(5e-3, r2 * 0.05)
  ).length > 0;
  const r = umbral / 2;
  if (r + 0.01 < hasta / 2 && cabe(r + 0.01)) return true;
  if (r - 0.01 > 0 && !cabe(r - 0.01)) return false;
  return anchoInscrito(region, hasta) >= umbral;
}
function grosorMedio(region) {
  const largo = [region.exterior, ...region.huecos].reduce(
    (s, a) => s + perimetro(a),
    0
  );
  return largo > 0 ? 2 * areaDeRegion(region) / largo : 0;
}
function tipoDeUnion(u4, a) {
  const n2 = u4.extremos.length;
  if (n2 === 0) return "suelta";
  if (n2 === 1) return "endpoint";
  if (u4.decision === "inglete") return "corner";
  if (n2 === 2) return "continuidad";
  if (u4.decision === "parche")
    return n2 === 3 ? "Y-junction" : "branch-complejo";
  if (n2 === 3) {
    const otro = u4.extremos.find(
      (e) => !u4.pasan?.some((p) => p.rama === e.rama && p.alFinal === e.alFinal)
    );
    const r = otro ? a.ramas[otro.rama] : null;
    return r ? "T-junction" : "branch";
  }
  if (n2 === 4) return "X-crossing";
  return "branch-complejo";
}
function clasificarZona(pieza, analisis, limites) {
  const area2 = areaDeRegion(pieza);
  const ancho = anchoInscrito(pieza, limites.maxSatinMm * 3);
  const grosor = grosorMedio(pieza);
  let x = 0;
  let y = 0;
  for (const [px, py] of pieza.exterior) {
    x += px;
    y += py;
  }
  const centro = [
    x / Math.max(1, pieza.exterior.length),
    y / Math.max(1, pieza.exterior.length)
  ];
  let union2;
  let causa = "astilla entre columnas vecinas";
  if (analisis) {
    const m = analisis.malla;
    const votos = /* @__PURE__ */ new Map();
    let podadas = 0;
    const unionDeTri = /* @__PURE__ */ new Map();
    for (const u4 of analisis.uniones)
      for (const t of u4.triangulos) unionDeTri.set(t, u4.id);
    const ramaDeTri = /* @__PURE__ */ new Map();
    for (const r of analisis.ramas)
      for (const t of r.mangas) ramaDeTri.set(t, r.id);
    const n2 = m.triangulos.length / 3;
    for (let t = 0; t < n2; t++) {
      const c = [0, 0];
      for (let k = 0; k < 3; k++) {
        const p = m.puntos[m.triangulos[3 * t + k]];
        c[0] += p[0] / 3;
        c[1] += p[1] / 3;
      }
      if (!dentroDeRegion(pieza, c)) continue;
      const u4 = unionDeTri.get(t);
      if (u4 !== void 0) votos.set(u4, (votos.get(u4) ?? 0) + 1);
      const r = ramaDeTri.get(t);
      if (r !== void 0 && !analisis.vivas.has(r)) podadas++;
    }
    const mejor = [...votos.entries()].sort((p, q) => q[1] - p[1])[0];
    if (mejor) {
      const u4 = analisis.uniones[mejor[0]];
      const tipo = tipoDeUnion(u4, analisis);
      union2 = {
        id: u4.id,
        decision: u4.decision,
        extremos: u4.extremos.length,
        tipo
      };
      causa = u4.decision === "remate" ? podadas ? `el final de un trazo absorbi\xF3 ${podadas} tri\xE1ngulos de salientes podados como espuelas, y el remate cierra en recta entre sus esquinas` : "el remate de un trazo cierra en recta y deja fuera su borde" : podadas ? `uni\xF3n ${tipo} de ${u4.extremos.length} trazos que absorbi\xF3 ${podadas} tri\xE1ngulos de ramas podadas: las columnas que la cruzan no la cubren` : `uni\xF3n ${tipo} de ${u4.extremos.length} trazos: las columnas que la cruzan no la cubren entera`;
    }
  }
  const clase = ancho < limites.minDetalleMm || area2 < 0.4 && ancho < 0.5 ? "E" : ancho > limites.maxSatinMm ? "B" : ancho < limites.maxCorridoMm ? "C" : union2 && union2.extremos >= 3 ? "D" : "A";
  return {
    clase,
    areaMm2: Number(area2.toFixed(3)),
    anchoMaximoMm: Number(ancho.toFixed(3)),
    grosorMedioMm: Number(grosor.toFixed(3)),
    causa,
    centro,
    union: union2
  };
}
function zonaConSolape(pieza, region, solape) {
  const crecida = inflatePathsD(
    sanos(aPaths(pieza)),
    solape,
    JoinType.Round,
    EndType.Polygon,
    2,
    DECIMALES3,
    0.01
  );
  return intersectD(
    sanos(crecida),
    sanos(aPaths(region)),
    FillRule.NonZero,
    DECIMALES3
  );
}

// packages/bordado/src/vector/estructura.ts
var POLITICA_DE_TRAZO_FINO = {
  runningMaxWidthMm: 0.6,
  narrowSatinMinWidthMm: 0.6,
  narrowSatinMaxWidthMm: 1,
  maxAllowedExpansionMm: 0.3,
  maxAllowedExpansionRatio: 4
};
var THIN_STRUCTURE_POLICY = {
  runningMaxWidthMm: POLITICA_DE_TRAZO_FINO.runningMaxWidthMm,
  narrowSatinMinWidthMm: POLITICA_DE_TRAZO_FINO.narrowSatinMinWidthMm,
  narrowSatinMaxWidthMm: POLITICA_DE_TRAZO_FINO.narrowSatinMaxWidthMm,
  satinMinWidthMm: POLITICA_DE_TRAZO_FINO.narrowSatinMaxWidthMm,
  maxExpansionMm: POLITICA_DE_TRAZO_FINO.maxAllowedExpansionMm,
  maxExpansionRatio: POLITICA_DE_TRAZO_FINO.maxAllowedExpansionRatio
};
var ANCHO_INVISIBLE_MM = 0.05;
var HILO_ASENTADO_MM = 0.4;
var TRAZO_MINIMO = {
  /** Una línea más corta que esto no se distingue de un punto en hilo. */
  largoMm: 1,
  /** Cuántas veces su ancho tiene que medir de largo para ser una línea. */
  proporcion: 3
};
function esTrazoEstructural(region) {
  const area2 = areaDeRegion(region);
  if (area2 <= 0) return false;
  const ancho = anchoInscrito(region, 2 * Math.sqrt(area2));
  if (ancho <= 0)
    return grosorMedio(region) > 0 && area2 / grosorMedio(region) >= TRAZO_MINIMO.largoMm;
  const largo = area2 / ancho;
  return largo >= TRAZO_MINIMO.largoMm && largo >= TRAZO_MINIMO.proporcion * ancho;
}
function anchoDeGrupo(e) {
  return e.largoEjeMm > 0 ? e.areaMm2 / e.largoEjeMm : 0;
}
var FRACCION_DEL_TRAZO = 0.5;
var ASTILLA_DEL_TRAZO = 0.1;
var COUNTER_MINIMO_MM = 0.2;
var HUECO_MINIMO_MM2 = 0.01;
var mediana = (xs) => {
  if (!xs.length) return 0;
  const o = [...xs].sort((a, b) => a - b);
  return o[Math.floor(o.length / 2)];
};
function puntoInterior(anillo, otras = []) {
  const xs = anillo.map((p) => p[0]);
  const ys = anillo.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const cajas = otras.map(cajaDeRegion2);
  const dentroPosibles = otras.filter((_, k) => {
    const c = cajas[k];
    return c.x0 <= x1 && c.x1 >= x0 && c.y0 <= y1 && c.y1 >= y0;
  });
  let mejor = null;
  let lejos = -1;
  const n2 = 16;
  for (let i = 0; i <= n2; i++)
    for (let j = 0; j <= n2; j++) {
      const p = [x0 + (x1 - x0) * i / n2, y0 + (y1 - y0) * j / n2];
      if (!dentroDeAnillos([anillo], p)) continue;
      if (dentroPosibles.some((r) => dentroDeRegion(r, p))) continue;
      let d = distanciaABorde([anillo], p);
      for (let k = 0; k < otras.length; k++)
        if (distanciaACaja(p, cajas[k]) <= d + 1e-9)
          d = Math.min(
            d,
            distanciaABorde([otras[k].exterior, ...otras[k].huecos], p)
          );
      if (d > lejos) {
        lejos = d;
        mejor = p;
      }
    }
  return lejos >= COUNTER_MINIMO_MM / 2 ? mejor : null;
}
function cajaDeRegion2(r) {
  let x0 = Number.POSITIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (const a of [r.exterior, ...r.huecos])
    for (const [x, y] of a) {
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  return { x0, y0, x1, y1 };
}
var distanciaACaja = (p, c) => Math.hypot(
  Math.max(c.x0 - p[0], 0, p[0] - c.x1),
  Math.max(c.y0 - p[1], 0, p[1] - c.y1)
);
function dentroDeAnillos(anillos, p) {
  let si = false;
  for (const a of anillos)
    for (let i = 0, j = a.length - 1; i < a.length; j = i++)
      if (a[i][1] > p[1] !== a[j][1] > p[1] && p[0] < (a[j][0] - a[i][0]) * (p[1] - a[i][1]) / (a[j][1] - a[i][1]) + a[i][0])
        si = !si;
  return si;
}
function distanciaASegmento2(p, a, b) {
  const ax = b[0] - a[0];
  const ay = b[1] - a[1];
  const l2 = ax * ax + ay * ay;
  const t = l2 <= 1e-12 ? 0 : Math.max(
    0,
    Math.min(1, ((p[0] - a[0]) * ax + (p[1] - a[1]) * ay) / l2)
  );
  return Math.hypot(p[0] - (a[0] + ax * t), p[1] - (a[1] + ay * t));
}
function distanciaABorde(anillos, p) {
  let d = Number.POSITIVE_INFINITY;
  for (const a of anillos)
    for (let i = 0, j = a.length - 1; i < a.length; j = i++)
      d = Math.min(d, distanciaASegmento2(p, a[j], a[i]));
  return d;
}
var TIPO_DE_NODO = {
  endpoint: "endpoint",
  corner: "corner",
  continuidad: null,
  "T-junction": "T",
  "Y-junction": "Y",
  "X-crossing": "X",
  branch: "branch",
  "branch-complejo": "branch",
  suelta: null
};
function analyzeLinearStructure(region, maxSatinMm, otras = []) {
  const areaMm2 = areaDeRegion(region);
  const huecos = region.huecos.map((h) => ({ areaMm2: Math.abs(areaDe(h)), anillo: h })).filter((h) => h.areaMm2 >= HUECO_MINIMO_MM2).map((h) => ({
    areaMm2: h.areaMm2,
    punto: puntoInterior(h.anillo, otras),
    anillo: h.anillo
  })).filter((h) => h.punto !== null);
  const vacia = () => ({
    region,
    grafo: { nodes: [], edges: [], loops: huecos.length },
    clase: "AREA",
    areaMm2,
    huecos,
    largoEjeMm: 0,
    anchoMedianoMm: 0
  });
  let a;
  try {
    a = analizar(mallaDeRegion(region), OPCIONES_CORDALES);
  } catch {
    return vacia();
  }
  const m = a.malla;
  const medio3 = (c) => [
    (m.puntos[c[0]][0] + m.puntos[c[1]][0]) / 2,
    (m.puntos[c[0]][1] + m.puntos[c[1]][1]) / 2
  ];
  const grado = /* @__PURE__ */ new Map();
  for (const u4 of a.uniones) grado.set(u4.id, u4.extremos.length);
  const nodes = [];
  for (const u4 of a.uniones) {
    const tipo = TIPO_DE_NODO[tipoDeUnion(u4, a)];
    if (!tipo) continue;
    const ts = u4.triangulos.length ? u4.triangulos : [];
    let x = 0;
    let y = 0;
    let n2 = 0;
    for (const t of ts)
      for (let k = 0; k < 3; k++) {
        const p = m.puntos[m.triangulos[3 * t + k]];
        x += p[0];
        y += p[1];
        n2++;
      }
    if (!n2 && u4.extremos[0]) {
      const r = a.ramas[u4.extremos[0].rama];
      const c = u4.extremos[0].alFinal ? r.cuerdas[r.cuerdas.length - 1] : r.cuerdas[0];
      [x, y] = medio3(c);
      n2 = 1;
    }
    nodes.push({
      id: `n${u4.id}`,
      position: [x / n2, y / n2],
      type: tipo,
      grado: u4.extremos.length
    });
  }
  const edges = [];
  for (const id of a.vivas) {
    const r = a.ramas[id];
    if (r.cuerdas.length < 2 && !r.cerrada) continue;
    const points = r.cuerdas.map(medio3);
    if (r.cerrada) points.push(points[0]);
    const widthProfile = r.cuerdas.map((c) => largoCuerda(m, c));
    let lengthMm = 0;
    for (let k = 1; k < points.length; k++)
      lengthMm += Math.hypot(
        points[k][0] - points[k - 1][0],
        points[k][1] - points[k - 1][1]
      );
    const extremo = (alFinal) => {
      const u4 = a.unionDe.get(`${id}${alFinal ? "f" : "i"}`);
      return u4 === void 0 ? 1 : grado.get(u4) ?? 1;
    };
    edges.push({
      id: `e${id}`,
      points,
      lengthMm,
      widthProfile,
      minWidthMm: Math.min(...widthProfile),
      medianWidthMm: mediana(widthProfile),
      maxWidthMm: Math.max(...widthProfile),
      cerrada: r.cerrada,
      colgante: !r.cerrada && (extremo(false) <= 1 || extremo(true) <= 1)
    });
  }
  let lineal = 0;
  let ancho = 0;
  let largoEjeMm = 0;
  const anchos = [];
  for (const e of edges)
    for (let k = 1; k < e.points.length; k++) {
      const l = Math.hypot(
        e.points[k][0] - e.points[k - 1][0],
        e.points[k][1] - e.points[k - 1][1]
      );
      const w = e.widthProfile[Math.min(k, e.widthProfile.length - 1)];
      anchos.push(w);
      largoEjeMm += l;
      if (w > maxSatinMm) ancho += w * l;
      else lineal += w * l;
    }
  const total = lineal + ancho;
  const fuera = Math.max(0, areaMm2 - total);
  const clase = !edges.length || ancho + fuera >= 0.6 * areaMm2 ? "AREA" : ancho <= 0.1 * areaMm2 ? "LINEAR" : "MIXED";
  return {
    region,
    grafo: { nodes, edges, loops: huecos.length },
    clase,
    areaMm2,
    huecos,
    largoEjeMm,
    anchoMedianoMm: mediana(anchos)
  };
}
function areaDe(anillo) {
  let s = 0;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++)
    s += anillo[j][0] * anillo[i][1] - anillo[i][0] * anillo[j][1];
  return s / 2;
}
var CODIGO_FINO = {
  /* Un trazo que une dos partes o cierra un lazo: lo que se pierde es la unión. */
  STRUCTURAL_STROKE_LOST: "THIN_JUNCTION_LOST",
  STRUCTURE_FRAGMENTED: "THIN_STRUCTURE_FRAGMENTED",
  COUNTER_LOST: "THIN_COUNTER_LOST",
  LOOP_BROKEN: "THIN_LOOP_BROKEN",
  THIN_STRUCTURE_INCOMPLETE: "THIN_STRUCTURE_INCOMPLETE",
  STRUCTURE_REQUIRES_TOO_MUCH_EXPANSION: "THIN_STRUCTURE_REQUIRES_TOO_MUCH_EXPANSION"
};
var RECALL_DE_PERDIDA = 0.1;
var PASO_MM = 0.1;
var aPaths2 = (r) => [r.exterior, ...r.huecos].map((a) => a.map(([x, y]) => ({ x, y })));
function regionesDePaths(paths) {
  const anillos = paths.map((p) => p.map((q) => [q.x, q.y])).filter((a) => a.length >= 3 && Math.abs(areaDe(a)) > 1e-9);
  const contiene = anillos.map(
    (a, i) => anillos.map(
      (b, j) => i !== j && Math.abs(areaDe(b)) > Math.abs(areaDe(a)) && dentroDeAnillos([b], a[0])
    )
  );
  const profundidad = contiene.map((fila) => fila.filter(Boolean).length);
  const piezas = [];
  const indiceDe2 = /* @__PURE__ */ new Map();
  anillos.forEach((a, i) => {
    if (profundidad[i] % 2) return;
    indiceDe2.set(i, piezas.length);
    piezas.push({ exterior: a, huecos: [] });
  });
  anillos.forEach((a, i) => {
    if (!(profundidad[i] % 2)) return;
    const madre = contiene[i].findIndex(
      (c, j) => c && profundidad[j] === profundidad[i] - 1
    );
    const k = indiceDe2.get(madre);
    if (k !== void 0) piezas[k].huecos.push(a);
  });
  return piezas;
}
function compararEstructura(fuente, objetos, opciones) {
  const politica = opciones.politica ?? POLITICA_DE_TRAZO_FINO;
  const dibujo = objetos.filter((o) => o.rol !== "traslado");
  const cosido = cosidoDe;
  const cubierto = unionD(
    sanos(dibujo.flatMap(cosido)),
    [],
    FillRule.NonZero,
    4
  );
  const cajaDe4 = (paths) => {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const p of paths)
      for (const q of p) {
        x0 = Math.min(x0, q.x);
        y0 = Math.min(y0, q.y);
        x1 = Math.max(x1, q.x);
        y1 = Math.max(y1, q.y);
      }
    return { x0, y0, x1, y1 };
  };
  const piezas = regionesDePaths(cubierto).map((r) => {
    const paths = aPaths2(r);
    return { region: r, caja: cajaDe4(paths) };
  });
  const sinHuecos = new Map(
    piezas.map(({ region: r }) => [r, { exterior: r.exterior, huecos: [] }])
  );
  const dentroDeCubierto = (p) => piezas.some(
    ({ region: r, caja: c }) => p[0] >= c.x0 && p[0] <= c.x1 && p[1] >= c.y0 && p[1] <= c.y1 && dentroDeRegion(r, p)
  );
  const encerrado = (p) => piezas.some(
    ({ region: r, caja: c }) => p[0] >= c.x0 && p[0] <= c.x1 && p[1] >= c.y0 && p[1] <= c.y1 && dentroDeRegion(sinHuecos.get(r), p)
  );
  const errorDeEje = indiceDeEjes(dibujo.flatMap((o) => ejeDe(o)));
  const grupos = [];
  const total = {
    fuente: 0,
    cubierto: 0,
    perdido: 0,
    errores: [],
    maxError: 0,
    maxHueco: 0
  };
  const topologia = {
    sourceComponents: 0,
    resultComponents: piezas.filter(
      (p) => areaDeRegion(p.region) >= HUECO_MINIMO_MM2
    ).length,
    sourceEndpoints: 0,
    resultEndpoints: 0,
    sourceBranches: 0,
    resultBranches: 0,
    sourceLoops: 0,
    resultLoops: piezas.reduce(
      (t, p) => t + p.region.huecos.filter((h) => Math.abs(areaDe(h)) >= HUECO_MINIMO_MM2).length,
      0
    )
  };
  const analisis = fuente.map(
    (region, g) => grosorMedio(region) < ANCHO_INVISIBLE_MM ? {
      region,
      grafo: { nodes: [], edges: [], loops: 0 },
      clase: "AREA",
      areaMm2: areaDeRegion(region),
      huecos: [],
      largoEjeMm: 0,
      anchoMedianoMm: 0
    } : analyzeLinearStructure(region, opciones.maxSatinMm, [
      ...fuente.filter((_, k) => k !== g),
      ...opciones.otrosColores ?? []
    ])
  );
  const trazoTipico = (() => {
    const pares = analisis.filter((x) => x.largoEjeMm > 0).map((x) => [anchoDeGrupo(x), x.largoEjeMm]).sort((a, b) => a[0] - b[0]);
    const total2 = pares.reduce((t, p) => t + p[1], 0);
    let acumulado2 = 0;
    for (const [w, l] of pares) {
      acumulado2 += l;
      if (acumulado2 >= total2 / 2) return w;
    }
    return 0;
  })();
  fuente.forEach((region, g) => {
    const e = analisis[g];
    topologia.sourceComponents++;
    topologia.sourceEndpoints += e.grafo.nodes.filter(
      (n2) => n2.type === "endpoint"
    ).length;
    topologia.sourceBranches += e.grafo.edges.length;
    topologia.sourceLoops += e.huecos.length;
    let largo = 0;
    let cubiertoMm = 0;
    let hueco2 = 0;
    let maxHueco = 0;
    const perdidos = [];
    let tramo = [];
    let ramasPerdidas = 0;
    const errores = [];
    let puntasAfiladasMm = 0;
    for (const edge of e.grafo.edges) {
      if (edge.colgante && edge.medianWidthMm < FRACCION_DEL_TRAZO * anchoDeGrupo(e)) {
        puntasAfiladasMm += edge.lengthMm;
        continue;
      }
      let largoRama2 = 0;
      let cubiertaRama = 0;
      hueco2 = 0;
      for (let k = 1; k < edge.points.length; k++) {
        const [p0, p1] = [edge.points[k - 1], edge.points[k]];
        const l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
        const n2 = Math.max(1, Math.ceil(l / PASO_MM));
        for (let q = 0; q < n2; q++) {
          const p = [
            p0[0] + (p1[0] - p0[0]) * (q + 0.5) / n2,
            p0[1] + (p1[1] - p0[1]) * (q + 0.5) / n2
          ];
          const paso = l / n2;
          largoRama2 += paso;
          if (dentroDeCubierto(p)) {
            cubiertaRama += paso;
            hueco2 = 0;
            if (tramo.length > 1) perdidos.push(tramo);
            tramo = [];
            const err = errorDeEje(p);
            if (Number.isFinite(err)) errores.push(err);
          } else {
            hueco2 += paso;
            maxHueco = Math.max(maxHueco, hueco2);
            tramo.push(p);
          }
        }
      }
      if (tramo.length > 1) perdidos.push(tramo);
      tramo = [];
      hueco2 = 0;
      largo += largoRama2;
      cubiertoMm += cubiertaRama;
      const estructural = !edge.colgante || edge.lengthMm >= Math.max(1, 3 * edge.medianWidthMm) && edge.medianWidthMm >= FRACCION_DEL_TRAZO * anchoDeGrupo(e);
      if (estructural && cubiertaRama < 0.5 * largoRama2) ramasPerdidas++;
    }
    let countersPerdidos = 0;
    let lazosRotos = 0;
    const huecosDelGrupo = [];
    for (const h of e.huecos) {
      const estado = dentroDeCubierto(h.punto) ? "tapado" : !encerrado(h.punto) ? "abierto" : "conservado";
      const anchoHueco = anchoInscrito({
        exterior: [...h.anillo].reverse(),
        huecos: []
      });
      const counter = anchoHueco >= COUNTER_MINIMO_MM;
      if (counter && estado === "tapado") countersPerdidos++;
      if (counter && estado === "abierto") lazosRotos++;
      huecosDelGrupo.push({
        areaMm2: Number(h.areaMm2.toFixed(3)),
        anchoMm: Number(anchoHueco.toFixed(3)),
        estado,
        punto: h.punto
      });
    }
    const fuenteCaja = cajaDe4(aPaths2(region));
    const tocadas = piezas.filter(({ region: r, caja: c }) => {
      if (c.x1 < fuenteCaja.x0 || c.x0 > fuenteCaja.x1 || c.y1 < fuenteCaja.y0 || c.y0 > fuenteCaja.y1)
        return false;
      return e.grafo.edges.some(
        (edge) => edge.points.some((p) => dentroDeRegion(r, p))
      );
    }).length;
    const piezasResultado = e.grafo.edges.length ? tocadas : 1;
    const minimo = e.grafo.edges.length ? anchoDeGrupo(e) : 0;
    const expansion = e.grafo.edges.length && minimo < HILO_ASENTADO_MM ? {
      originalWidthMm: Number(minimo.toFixed(3)),
      finalWidthMm: HILO_ASENTADO_MM,
      expansionMm: Number((HILO_ASENTADO_MM - minimo).toFixed(3)),
      expansionRatio: Number(
        (HILO_ASENTADO_MM / Math.max(minimo, 1e-3)).toFixed(2)
      )
    } : null;
    const cobertura = {
      sourceLengthMm: Number(largo.toFixed(2)),
      coveredLengthMm: Number(cubiertoMm.toFixed(2)),
      coverageRatio: largo > 0 ? Number((cubiertoMm / largo).toFixed(4)) : 1,
      missingLengthMm: Number((largo - cubiertoMm).toFixed(2)),
      longestMissingSegmentMm: Number(maxHueco.toFixed(2)),
      meanCenterlineErrorMm: errores.length ? Number(
        (errores.reduce((s, x) => s + x, 0) / errores.length).toFixed(3)
      ) : 0,
      maxCenterlineErrorMm: errores.length ? Number(Math.max(...errores).toFixed(3)) : 0
    };
    const incidencias = [];
    const astilla = trazoTipico > 0 && anchoDeGrupo(e) < ASTILLA_DEL_TRAZO * trazoTipico || e.grafo.edges.length > 0 && anchoDeGrupo(e) < ANCHO_INVISIBLE_MM;
    const conEstructura = !astilla && !opciones.detalles?.has(region) && (e.clase !== "AREA" || e.huecos.length > 0) && (e.largoEjeMm >= TRAZO_MINIMO.largoMm || e.huecos.length > 0);
    if (conEstructura) {
      if (ramasPerdidas > 0) incidencias.push("STRUCTURAL_STROKE_LOST");
      if (piezasResultado > 1) incidencias.push("STRUCTURE_FRAGMENTED");
      if (countersPerdidos > 0) incidencias.push("COUNTER_LOST");
      if (lazosRotos > 0) incidencias.push("LOOP_BROKEN");
      if (largo >= 1 && cobertura.coverageRatio < 0.9)
        incidencias.push("THIN_STRUCTURE_INCOMPLETE");
      if (expansion && expansion.expansionMm > politica.maxAllowedExpansionMm && expansion.expansionRatio > politica.maxAllowedExpansionRatio)
        incidencias.push("STRUCTURE_REQUIRES_TOO_MUCH_EXPANSION");
    }
    const nodos = {
      endpoint: 0,
      corner: 0,
      T: 0,
      Y: 0,
      X: 0,
      branch: 0
    };
    for (const n2 of e.grafo.nodes) nodos[n2.type]++;
    const counters = huecosDelGrupo.filter((h) => h.anchoMm >= COUNTER_MINIMO_MM).length;
    const importancia = counters > 0 || e.grafo.nodes.some((n2) => n2.grado >= 3) ? "essential" : e.grafo.edges.length && e.grafo.edges.every(
      (x) => x.colgante && x.medianWidthMm < FRACCION_DEL_TRAZO * anchoDeGrupo(e)
    ) ? "decorative" : "supporting";
    const incidenciasFinas = conEstructura && e.clase !== "AREA" ? [
      ...largo >= TRAZO_MINIMO.largoMm && cobertura.coverageRatio <= RECALL_DE_PERDIDA ? ["THIN_COMPONENT_LOST"] : [],
      ...incidencias.map((c) => CODIGO_FINO[c])
    ].filter(
      (c, _k, todos) => c !== "THIN_STRUCTURE_INCOMPLETE" || !todos.includes("THIN_COMPONENT_LOST")
    ) : [];
    const todosAnchos = e.grafo.edges.flatMap((x) => x.widthProfile);
    grupos.push({
      id: `b${opciones.bloque}-g${g}`,
      bloque: opciones.bloque,
      clase: e.clase,
      areaMm2: Number(e.areaMm2.toFixed(3)),
      anchoMm: {
        minimo: todosAnchos.length ? Number(Math.min(...todosAnchos).toFixed(3)) : 0,
        mediana: Number(e.anchoMedianoMm.toFixed(3)),
        maximo: todosAnchos.length ? Number(Math.max(...todosAnchos).toFixed(3)) : 0
      },
      largoEjeMm: Number(e.largoEjeMm.toFixed(2)),
      nodos,
      ramas: e.grafo.edges.length,
      lazos: e.huecos.length,
      cobertura,
      ramasPerdidas,
      countersPerdidos,
      lazosRotos,
      huecos: huecosDelGrupo,
      estructural: conEstructura,
      puntasAfiladasMm: Number(puntasAfiladasMm.toFixed(2)),
      piezasResultado,
      expansion,
      perdidos,
      ejes: e.grafo.edges.map((x) => x.points),
      ejesEstructurales: e.grafo.edges.filter(
        (x) => !(x.colgante && x.medianWidthMm < FRACCION_DEL_TRAZO * anchoDeGrupo(e))
      ).map((x) => x.points),
      uniones: e.grafo.nodes.filter((n2) => n2.grado >= 3).map((n2) => n2.position),
      incidencias,
      extremos: e.grafo.nodes.filter((n2) => n2.type === "endpoint").map((n2) => n2.position),
      counters,
      importancia,
      incidenciasFinas
    });
    total.fuente += largo;
    total.cubierto += cubiertoMm;
    total.maxHueco = Math.max(total.maxHueco, maxHueco);
    total.errores.push(...errores);
  });
  for (const p of regionesDePaths(simplifyPathsD(cubierto, 0.1, true))) {
    if (areaDeRegion(p) < HUECO_MINIMO_MM2) continue;
    const e = analyzeLinearStructure(p, opciones.maxSatinMm);
    topologia.resultEndpoints += e.grafo.nodes.filter(
      (n2) => n2.type === "endpoint"
    ).length;
    topologia.resultBranches += e.grafo.edges.length;
  }
  return {
    grupos,
    topologia,
    cobertura: {
      sourceLengthMm: Number(total.fuente.toFixed(2)),
      coveredLengthMm: Number(total.cubierto.toFixed(2)),
      coverageRatio: total.fuente > 0 ? Number((total.cubierto / total.fuente).toFixed(4)) : 1,
      missingLengthMm: Number((total.fuente - total.cubierto).toFixed(2)),
      longestMissingSegmentMm: Number(total.maxHueco.toFixed(2)),
      meanCenterlineErrorMm: total.errores.length ? Number(
        (total.errores.reduce((s, x) => s + x, 0) / total.errores.length).toFixed(3)
      ) : 0,
      maxCenterlineErrorMm: total.errores.length ? Number(Math.max(...total.errores).toFixed(3)) : 0
    }
  };
}
function cosidoDe(o) {
  if (o.tipo === "running") return corridoAncho(o);
  const c = coberturaDe(o);
  return o.tipo === "satin" && o.compensacion > 0 ? inflatePathsD(c, o.compensacion, JoinType.Round, EndType.Polygon, 2, 4, 0.02) : c;
}
function corridoAncho(o) {
  return inflatePathsD(
    aplanar(o.geometria.d).filter((s) => s.puntos.length >= 2).map((s) => s.puntos.map(([x, y]) => ({ x, y }))),
    HILO_ASENTADO_MM / 2,
    JoinType.Round,
    EndType.Round,
    2,
    4,
    0.02
  );
}
function ejeDe(o) {
  const sub = aplanar(o.geometria.d);
  if (o.tipo === "running") return sub.map((s) => s.puntos);
  if (o.tipo === "satin" && sub.length >= 2) {
    const [a, b] = [sub[0].puntos, sub[1].puntos];
    const n2 = Math.min(a.length, b.length);
    if (n2 < 2) return [];
    const muestra = (rail, t) => {
      const i = Math.min(rail.length - 1, Math.round(t * (rail.length - 1)));
      return rail[i];
    };
    const m = Math.max(a.length, b.length);
    const eje = [];
    for (let k = 0; k < m; k++) {
      const t = k / (m - 1);
      const p = muestra(a, t);
      const q = muestra(b, t);
      eje.push([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]);
    }
    return [eje];
  }
  return [];
}
function indiceDeEjes(ejes) {
  const celdas = /* @__PURE__ */ new Map();
  let x0 = Number.POSITIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (const e of ejes)
    for (let k = 1; k < e.length; k++) {
      const [a, b] = [e[k - 1], e[k]];
      const cx0 = Math.floor(Math.min(a[0], b[0]));
      const cx1 = Math.floor(Math.max(a[0], b[0]));
      const cy0 = Math.floor(Math.min(a[1], b[1]));
      const cy1 = Math.floor(Math.max(a[1], b[1]));
      x0 = Math.min(x0, cx0);
      y0 = Math.min(y0, cy0);
      x1 = Math.max(x1, cx1);
      y1 = Math.max(y1, cy1);
      for (let cx = cx0; cx <= cx1; cx++)
        for (let cy = cy0; cy <= cy1; cy++) {
          const clave2 = `${cx},${cy}`;
          (celdas.get(clave2) ?? celdas.set(clave2, []).get(clave2)).push([a, b]);
        }
    }
  return (p) => {
    if (!celdas.size) return Number.POSITIVE_INFINITY;
    const px = Math.floor(p[0]);
    const py = Math.floor(p[1]);
    const maximo = Math.max(Math.abs(px - x0), Math.abs(px - x1), Math.abs(py - y0), Math.abs(py - y1)) + 1;
    let d = Number.POSITIVE_INFINITY;
    for (let k = 0; k <= maximo; k++) {
      if (d <= k - 1) break;
      for (let cx = px - k; cx <= px + k; cx++)
        for (let cy = py - k; cy <= py + k; cy++) {
          if (Math.max(Math.abs(cx - px), Math.abs(cy - py)) !== k) continue;
          for (const [a, b] of celdas.get(`${cx},${cy}`) ?? [])
            d = Math.min(d, distanciaASegmento2(p, a, b));
        }
    }
    return d;
  };
}

// packages/bordado/src/verdad/rejilla.ts
var MAXIMO_DE_CELDAS = 2e6;
var PASO_MINIMO_MM = 0.02;
function rejillaPara(caja, margenMm, pasoDeseado = PASO_MINIMO_MM, maximo = MAXIMO_DE_CELDAS) {
  const w = Math.max(caja.maxX - caja.minX, 1e-3) + 2 * margenMm;
  const h = Math.max(caja.maxY - caja.minY, 1e-3) + 2 * margenMm;
  const paso = Math.max(pasoDeseado, Math.sqrt(w * h / maximo));
  return {
    x0: caja.minX - margenMm,
    y0: caja.minY - margenMm,
    paso,
    ancho: Math.max(1, Math.ceil(w / paso)),
    alto: Math.max(1, Math.ceil(h / paso))
  };
}
var centroDeCelda = (r, i) => [
  r.x0 + (i % r.ancho + 0.5) * r.paso,
  r.y0 + (Math.floor(i / r.ancho) + 0.5) * r.paso
];
function celdaDe(r, [x, y]) {
  const i = Math.floor((x - r.x0) / r.paso);
  const j = Math.floor((y - r.y0) / r.paso);
  if (i < 0 || j < 0 || i >= r.ancho || j >= r.alto) return -1;
  return j * r.ancho + i;
}
function pintarAnillos(lienzo, r, anillos, valor, regla = "nonzero") {
  const cruces = [];
  let jMin = Number.POSITIVE_INFINITY;
  let jMax = Number.NEGATIVE_INFINITY;
  for (const anillo of anillos) {
    const n2 = anillo.length;
    if (n2 < 3) continue;
    for (let k = 0; k < n2; k++) {
      const a = anillo[k];
      const b = anillo[(k + 1) % n2];
      if (a[1] === b[1]) continue;
      const [bajo, alto, sentido] = a[1] < b[1] ? [a, b, 1] : [b, a, -1];
      const desde = Math.max(0, Math.ceil((bajo[1] - r.y0) / r.paso - 0.5));
      const hasta = Math.min(
        r.alto - 1,
        Math.ceil((alto[1] - r.y0) / r.paso - 0.5) - 1
      );
      for (let j = desde; j <= hasta; j++) {
        const y = r.y0 + (j + 0.5) * r.paso;
        const x = bajo[0] + (y - bajo[1]) * (alto[0] - bajo[0]) / (alto[1] - bajo[1]);
        (cruces[j] ??= []).push([x, sentido]);
        if (j < jMin) jMin = j;
        if (j > jMax) jMax = j;
      }
    }
  }
  for (let j = jMin; j <= jMax; j++) {
    const fila = cruces[j];
    if (!fila || fila.length < 2) continue;
    fila.sort((p, q) => p[0] - q[0]);
    let w = 0;
    for (let k = 0; k < fila.length - 1; k++) {
      w += fila[k][1];
      const dentro2 = regla === "nonzero" ? w !== 0 : Math.abs(w) % 2 === 1;
      if (!dentro2) continue;
      const i0 = Math.max(0, Math.ceil((fila[k][0] - r.x0) / r.paso - 0.5));
      const i1 = Math.min(
        r.ancho - 1,
        Math.ceil((fila[k + 1][0] - r.x0) / r.paso - 0.5) - 1
      );
      const base = j * r.ancho;
      for (let i = i0; i <= i1; i++) lienzo[base + i] = valor;
    }
  }
}
function etiquetar(ancho, alto, dentro2, vecinos) {
  const total = ancho * alto;
  const mascara = new Uint8Array(total);
  for (let i = 0; i < total; i++) if (dentro2(i)) mascara[i] = 1;
  const etiquetas = new Int32Array(total);
  const areas = [0];
  const cajas = [[0, 0, 0, 0]];
  const tocaBorde = [false];
  const pila = new Int32Array(total);
  let n2 = 0;
  for (let s = 0; s < total; s++) {
    if (etiquetas[s] || !mascara[s]) continue;
    n2++;
    let area2 = 0;
    let [x0, y0, x1, y1] = [ancho, alto, -1, -1];
    let borde = false;
    let tope = 0;
    pila[tope++] = s;
    etiquetas[s] = n2;
    while (tope) {
      const c = pila[--tope];
      area2++;
      const x = c % ancho;
      const y = (c - x) / ancho;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (x === 0 || y === 0 || x === ancho - 1 || y === alto - 1) borde = true;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= alto) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          if (vecinos === 4 && dx && dy) continue;
          const xx = x + dx;
          if (xx < 0 || xx >= ancho) continue;
          const v2 = yy * ancho + xx;
          if (etiquetas[v2] || !mascara[v2]) continue;
          etiquetas[v2] = n2;
          pila[tope++] = v2;
        }
      }
    }
    areas.push(area2);
    cajas.push([x0, y0, x1, y1]);
    tocaBorde.push(borde);
  }
  return { etiquetas, n: n2, areas, cajas, tocaBorde };
}
function distancia(ancho, alto, dentro2) {
  const d = new Float32Array(ancho * alto);
  const INF2 = 1e9;
  const R2 = Math.SQRT2;
  for (let i = 0; i < d.length; i++) d[i] = dentro2(i) ? INF2 : 0;
  for (let y = 0; y < alto; y++)
    for (let x = 0; x < ancho; x++) {
      const i = y * ancho + x;
      if (!d[i]) continue;
      let v2 = x === 0 || y === 0 ? 1 : INF2;
      if (x > 0) v2 = Math.min(v2, d[i - 1] + 1);
      if (y > 0) {
        v2 = Math.min(v2, d[i - ancho] + 1);
        if (x > 0) v2 = Math.min(v2, d[i - ancho - 1] + R2);
        if (x < ancho - 1) v2 = Math.min(v2, d[i - ancho + 1] + R2);
      }
      d[i] = v2;
    }
  for (let y = alto - 1; y >= 0; y--)
    for (let x = ancho - 1; x >= 0; x--) {
      const i = y * ancho + x;
      if (!d[i]) continue;
      let v2 = d[i];
      if (x === ancho - 1 || y === alto - 1) v2 = Math.min(v2, 1);
      if (x < ancho - 1) v2 = Math.min(v2, d[i + 1] + 1);
      if (y < alto - 1) {
        v2 = Math.min(v2, d[i + ancho] + 1);
        if (x < ancho - 1) v2 = Math.min(v2, d[i + ancho + 1] + R2);
        if (x > 0) v2 = Math.min(v2, d[i + ancho - 1] + R2);
      }
      d[i] = v2;
    }
  return d;
}
var anchoDeDistancia = (maximo, paso) => Math.max(0, 2 * maximo - 1) * paso;

// packages/bordado/src/raster/morfologia.ts
var INF = 1e20;
function edt1d(f3, n2, d, v2, z) {
  let k = 0;
  v2[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n2; q++) {
    let s = (f3[q] + q * q - (f3[v2[k]] + v2[k] * v2[k])) / (2 * q - 2 * v2[k]);
    while (s <= z[k]) {
      k--;
      s = (f3[q] + q * q - (f3[v2[k]] + v2[k] * v2[k])) / (2 * q - 2 * v2[k]);
    }
    k++;
    v2[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n2; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v2[k]) ** 2 + f3[v2[k]];
  }
}
function distancia2(objetivo, ancho, alto) {
  const n2 = Math.max(ancho, alto);
  const f3 = new Float64Array(n2);
  const d = new Float64Array(n2);
  const v2 = new Int32Array(n2);
  const z = new Float64Array(n2 + 1);
  const tmp = new Float64Array(ancho * alto);
  for (let x = 0; x < ancho; x++) {
    for (let y = 0; y < alto; y++) f3[y] = objetivo[y * ancho + x] ? 0 : INF;
    edt1d(f3, alto, d, v2, z);
    for (let y = 0; y < alto; y++) tmp[y * ancho + x] = d[y];
  }
  const salida2 = new Float32Array(ancho * alto);
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) f3[x] = tmp[y * ancho + x];
    edt1d(f3, ancho, d, v2, z);
    for (let x = 0; x < ancho; x++) salida2[y * ancho + x] = Math.sqrt(d[x]);
  }
  return salida2;
}
function distanciaAlFondo2(mascara, ancho, alto) {
  const fondo = new Uint8Array(mascara.length);
  for (let i = 0; i < mascara.length; i++) fondo[i] = mascara[i] ? 0 : 1;
  const d = distancia2(fondo, ancho, alto);
  for (let y = 0; y < alto; y++)
    for (let x = 0; x < ancho; x++) {
      const i = y * ancho + x;
      const alCanto = Math.min(x + 1, y + 1, ancho - x, alto - y);
      if (d[i] > alCanto) d[i] = alCanto;
    }
  return d;
}
function apertura(mascara, ancho, alto, r) {
  const dentro2 = distanciaAlFondo2(mascara, ancho, alto);
  const nucleo = new Uint8Array(mascara.length);
  for (let i = 0; i < mascara.length; i++) nucleo[i] = dentro2[i] > r ? 1 : 0;
  const alNucleo2 = distancia2(nucleo, ancho, alto);
  const salida2 = new Uint8Array(mascara.length);
  for (let i = 0; i < mascara.length; i++)
    salida2[i] = mascara[i] && alNucleo2[i] <= r + 0.5 ? 1 : 0;
  return salida2;
}
function cierre(mascara, ancho, alto, r) {
  const alObjeto = distancia2(mascara, ancho, alto);
  const crecida = new Uint8Array(mascara.length);
  for (let i = 0; i < mascara.length; i++)
    crecida[i] = alObjeto[i] <= r ? 1 : 0;
  const fuera = new Uint8Array(mascara.length);
  for (let i = 0; i < mascara.length; i++) fuera[i] = crecida[i] ? 0 : 1;
  const alFuera = distancia2(fuera, ancho, alto);
  const salida2 = new Uint8Array(mascara.length);
  for (let i = 0; i < mascara.length; i++) salida2[i] = alFuera[i] > r ? 1 : 0;
  return salida2;
}
function componentes2(mascara, ancho, alto) {
  const etiquetas = new Int32Array(mascara.length);
  const tamanos = [0];
  const pila = [];
  let n2 = 0;
  for (let inicio = 0; inicio < mascara.length; inicio++) {
    if (!mascara[inicio] || etiquetas[inicio]) continue;
    n2++;
    let tamano = 0;
    etiquetas[inicio] = n2;
    pila.push(inicio);
    while (pila.length) {
      const p = pila.pop();
      tamano++;
      const x = p % ancho;
      const y = (p - x) / ancho;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= ancho || yy >= alto) continue;
          const q = yy * ancho + xx;
          if (mascara[q] && !etiquetas[q]) {
            etiquetas[q] = n2;
            pila.push(q);
          }
        }
    }
    tamanos.push(tamano);
  }
  return { etiquetas, cuenta: n2, tamanos };
}
function perimetroEnPx(mascara, ancho, alto) {
  let n2 = 0;
  for (let y = 0; y < alto; y++)
    for (let x = 0; x < ancho; x++) {
      const i = y * ancho + x;
      if (!mascara[i]) continue;
      if (x === 0 || y === 0 || x === ancho - 1 || y === alto - 1 || !mascara[i - 1] || !mascara[i + 1] || !mascara[i - ancho] || !mascara[i + ancho])
        n2++;
    }
  return n2;
}
function esqueleto2(mascara, ancho, alto) {
  const m = new Uint8Array(mascara);
  const vecinos = (i) => {
    const x = i % ancho;
    const y = (i - x) / ancho;
    const v2 = (dx, dy) => {
      const xx = x + dx;
      const yy = y + dy;
      return xx < 0 || yy < 0 || xx >= ancho || yy >= alto ? 0 : m[yy * ancho + xx];
    };
    return [
      v2(0, -1),
      v2(1, -1),
      v2(1, 0),
      v2(1, 1),
      v2(0, 1),
      v2(-1, 1),
      v2(-1, 0),
      v2(-1, -1)
    ];
  };
  let cambio = true;
  const borrar = [];
  while (cambio) {
    cambio = false;
    for (const paso of [0, 1]) {
      borrar.length = 0;
      for (let i = 0; i < m.length; i++) {
        if (!m[i]) continue;
        const p = vecinos(i);
        const b = p.reduce((s, v2) => s + v2, 0);
        if (b < 2 || b > 6) continue;
        let a = 0;
        for (let k = 0; k < 8; k++) if (!p[k] && p[(k + 1) % 8]) a++;
        if (a !== 1) continue;
        if (paso === 0) {
          if (p[0] * p[2] * p[4] || p[2] * p[4] * p[6]) continue;
        } else if (p[0] * p[2] * p[6] || p[0] * p[4] * p[6]) continue;
        borrar.push(i);
      }
      for (const i of borrar) m[i] = 0;
      if (borrar.length) cambio = true;
    }
  }
  return m;
}
function trazosDeEsqueleto(eje, ancho, alto) {
  const en = (x, y) => x >= 0 && y >= 0 && x < ancho && y < alto && eje[y * ancho + x] === 1;
  const vecinosDe = (i) => {
    const x = i % ancho;
    const y = (i - x) / ancho;
    const salida2 = [];
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ])
      if (en(x + dx, y + dy)) salida2.push((y + dy) * ancho + x + dx);
    for (const [dx, dy] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1]
    ])
      if (en(x + dx, y + dy) && !en(x + dx, y) && !en(x, y + dy))
        salida2.push((y + dy) * ancho + x + dx);
    return salida2;
  };
  const grado = new Int8Array(eje.length);
  for (let i = 0; i < eje.length; i++)
    if (eje[i]) grado[i] = vecinosDe(i).length;
  const esNodo = (i) => grado[i] !== 2;
  const clave2 = (a, b) => a < b ? `${a}-${b}` : `${b}-${a}`;
  const usadas = /* @__PURE__ */ new Set();
  const punto2 = (i) => [
    i % ancho + 0.5,
    Math.floor(i / ancho) + 0.5
  ];
  const trazos = [];
  const caminar = (desde, siguiente) => {
    const indices2 = [desde];
    let previo = desde;
    let actual = siguiente;
    usadas.add(clave2(desde, siguiente));
    for (; ; ) {
      indices2.push(actual);
      if (esNodo(actual) || actual === desde) break;
      const proximo = vecinosDe(actual).find(
        (q) => q !== previo && !usadas.has(clave2(actual, q))
      );
      if (proximo === void 0) break;
      usadas.add(clave2(actual, proximo));
      previo = actual;
      actual = proximo;
    }
    const cerrado = indices2[indices2.length - 1] === desde && indices2.length > 2;
    if (cerrado) indices2.pop();
    trazos.push({ puntos: indices2.map(punto2), indices: indices2, cerrado });
  };
  for (let i = 0; i < eje.length; i++)
    if (eje[i] && esNodo(i)) {
      for (const q of vecinosDe(i)) if (!usadas.has(clave2(i, q))) caminar(i, q);
    }
  for (let i = 0; i < eje.length; i++)
    if (eje[i] && grado[i] === 0)
      trazos.push({ puntos: [punto2(i)], indices: [i], cerrado: false });
  for (let i = 0; i < eje.length; i++)
    if (eje[i] && grado[i] === 2) {
      const q = vecinosDe(i).find((v2) => !usadas.has(clave2(i, v2)));
      if (q !== void 0) caminar(i, q);
    }
  return trazos;
}

// packages/bordado/src/raster/tintas.ts
var LINEAL = new Float64Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  LINEAL[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
var f = (t) => t > 0.008856451679 ? Math.cbrt(t) : 7.787037 * t + 16 / 116;
var memoria = /* @__PURE__ */ new Map();
function aLab(r, g, b) {
  const llave = r << 16 | g << 8 | b;
  const guardado = memoria.get(llave);
  if (guardado) return guardado;
  const R = LINEAL[r];
  const G = LINEAL[g];
  const B3 = LINEAL[b];
  const x = f((0.4124564 * R + 0.3575761 * G + 0.1804375 * B3) / 0.95047);
  const y = f(0.2126729 * R + 0.7151522 * G + 0.072175 * B3);
  const z = f((0.0193339 * R + 0.119192 * G + 0.9503041 * B3) / 1.08883);
  const lab = [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  if (memoria.size < 4e4) memoria.set(llave, lab);
  return lab;
}
function deltaE(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
var BORDE_DELTA_E = 10;
var DISPERSION_DELTA_E = 6;
var TOPE_PLANO = 0.08;
function labDe(datos, n2) {
  const lab = new Array(n2);
  for (let p = 0; p < n2; p++) {
    const i = p * 4;
    lab[p] = aLab(datos[i], datos[i + 1], datos[i + 2]);
  }
  return lab;
}
function interiores2(datos, lab, ancho, alto) {
  const dentro2 = [];
  for (let y = 1; y < alto - 1; y++) {
    for (let x = 1; x < ancho - 1; x++) {
      const p = y * ancho + x;
      if (datos[p * 4 + 3] < 250) continue;
      let borde = false;
      for (const q of [
        p - 1,
        p + 1,
        p - ancho,
        p + ancho,
        p - ancho - 1,
        p - ancho + 1,
        p + ancho - 1,
        p + ancho + 1
      ]) {
        if (datos[q * 4 + 3] < 250 || deltaE(lab[p], lab[q]) >= BORDE_DELTA_E) {
          borde = true;
          break;
        }
      }
      if (!borde) dentro2.push(p);
    }
  }
  return dentro2;
}
function analizarTonos(datos, ancho, alto) {
  const n2 = ancho * alto;
  const lab = labDe(datos, n2);
  const dentro2 = interiores2(datos, lab, ancho, alto);
  let opacos = 0;
  for (let p = 0; p < n2; p++) if (datos[p * 4 + 3] >= 250) opacos++;
  if (!dentro2.length) return { interior: 0, dispersion: 0, veredicto: "plano" };
  const cubos = /* @__PURE__ */ new Map();
  for (const p of dentro2) {
    const llave = lab[p].map((v2) => Math.round(v2 / 4)).join(",");
    const cubo = cubos.get(llave);
    if (cubo) cubo.n++;
    else cubos.set(llave, { n: 1, lab: lab[p] });
  }
  const tintas = [...cubos.values()].sort((a, b) => b.n - a.n).slice(0, 6).map((c) => c.lab);
  let lejos = 0;
  for (const p of dentro2) {
    let minima = Number.POSITIVE_INFINITY;
    for (const t of tintas) minima = Math.min(minima, deltaE(lab[p], t));
    if (minima > DISPERSION_DELTA_E) lejos++;
  }
  const dispersion = lejos / dentro2.length;
  return {
    interior: dentro2.length / Math.max(1, opacos),
    dispersion,
    veredicto: dispersion <= TOPE_PLANO ? "plano" : "con-tonos"
  };
}
function paletaDe(datos, ancho, alto, opciones = {}) {
  const maximo = opciones.maximo ?? 6;
  const juntar = opciones.juntarDeltaE ?? 12;
  const presencia = opciones.presenciaMinima ?? 5e-3;
  const n2 = ancho * alto;
  const lab = labDe(datos, n2);
  let dentro2 = interiores2(datos, lab, ancho, alto);
  if (dentro2.length < 200)
    dentro2 = [...Array(n2).keys()].filter((p) => datos[p * 4 + 3] >= 250);
  if (!dentro2.length)
    return {
      tintas: [],
      coloresEstimados: 0,
      coloresNecesarios: 0,
      errorDeltaE: 0
    };
  const cubos = /* @__PURE__ */ new Map();
  for (const p of dentro2) {
    const i = p * 4;
    const llave = datos[i] >> 3 << 10 | datos[i + 1] >> 3 << 5 | datos[i + 2] >> 3;
    const c = cubos.get(llave);
    if (c) c.peso++;
    else
      cubos.set(llave, {
        lab: lab[p],
        rgb: [datos[i], datos[i + 1], datos[i + 2]],
        peso: 1
      });
  }
  const puntos = [...cubos.values()];
  const total = dentro2.length;
  const estimadas = [];
  for (const p of [...puntos].sort((a, b) => b.peso - a.peso)) {
    if (p.peso / total < 1e-3) break;
    if (!estimadas.some((e) => deltaE(e, p.lab) < 5)) estimadas.push(p.lab);
  }
  const orden = [...puntos].sort((a, b) => b.peso - a.peso);
  const centros = [orden[0].lab];
  while (centros.length < Math.min(12, puntos.length)) {
    let mejor = null;
    let puntaje = -1;
    for (const p of orden) {
      const d = Math.min(...centros.map((c) => deltaE(c, p.lab)));
      const s = d * d * p.peso;
      if (s > puntaje) {
        puntaje = s;
        mejor = p;
      }
    }
    if (!mejor || puntaje <= 0) break;
    centros.push(mejor.lab);
  }
  let grupos = [];
  for (let vuelta = 0; vuelta < 12; vuelta++) {
    const suma = centros.map(() => ({ l: [0, 0, 0], r: [0, 0, 0], peso: 0 }));
    for (const p of puntos) {
      let k = 0;
      let d = Number.POSITIVE_INFINITY;
      centros.forEach((c, j) => {
        const dj = deltaE(c, p.lab);
        if (dj < d) {
          d = dj;
          k = j;
        }
      });
      const s = suma[k];
      for (let e = 0; e < 3; e++) {
        s.l[e] += p.lab[e] * p.peso;
        s.r[e] += p.rgb[e] * p.peso;
      }
      s.peso += p.peso;
    }
    grupos = suma.filter((s) => s.peso > 0).map((s) => ({
      lab: s.l.map((v2) => v2 / s.peso),
      rgb: s.r.map((v2) => Math.round(v2 / s.peso)),
      peso: s.peso
    }));
    centros.length = 0;
    for (const g of grupos) centros.push(g.lab);
  }
  grupos.sort((a, b) => b.peso - a.peso);
  const finales = [];
  for (const g of grupos) {
    const igual = finales.find((x) => deltaE(x.lab, g.lab) < juntar);
    if (igual) igual.peso += g.peso;
    else if (g.peso / total >= presencia) finales.push({ ...g });
  }
  quitarMezclas(finales, datos, ancho, alto, opciones.fondo);
  const tintas = finales.slice(0, maximo);
  const fondo = opciones.fondo;
  let error = 0;
  for (const p of puntos) {
    let d = Number.POSITIVE_INFINITY;
    for (const t of tintas) {
      d = Math.min(d, deltaE(t.lab, p.lab));
      if (!fondo) continue;
      const [f3] = mezcla(p.rgb, t.rgb, fondo);
      const m = [0, 1, 2].map(
        (c) => Math.round(fondo[c] + f3 * (t.rgb[c] - fondo[c]))
      );
      d = Math.min(d, deltaE(aLab(m[0], m[1], m[2]), p.lab));
    }
    error += d * p.peso;
  }
  return {
    tintas,
    coloresEstimados: estimadas.length,
    coloresNecesarios: finales.length,
    errorDeltaE: error / total
  };
}
function mezcla(c, A, B3) {
  const e0 = A[0] - B3[0];
  const e1 = A[1] - B3[1];
  const e2 = A[2] - B3[2];
  const l2 = e0 * e0 + e1 * e1 + e2 * e2;
  const t = l2 > 0 ? Math.max(
    0,
    Math.min(
      1,
      ((c[0] - B3[0]) * e0 + (c[1] - B3[1]) * e1 + (c[2] - B3[2]) * e2) / l2
    )
  ) : 1;
  const r = (c[0] - B3[0] - t * e0) ** 2 + (c[1] - B3[1] - t * e1) ** 2 + (c[2] - B3[2] - t * e2) ** 2;
  return [t, r];
}
var RESIDUO_MEZCLA_RGB2 = 20 ** 2;
function quitarMezclas(tintas, datos, ancho, alto, fondo) {
  const n2 = ancho * alto;
  const anclas = fondo ? [fondo] : [];
  for (const t of [...tintas].sort((a, b) => a.peso - b.peso)) {
    if (tintas.length < 2 && !anclas.length) return;
    const otras = [
      ...tintas.filter((x) => x !== t).map((x) => x.rgb),
      ...anclas
    ];
    let explicada = false;
    for (let a = 0; a < otras.length && !explicada; a++)
      for (let b = a + 1; b < otras.length && !explicada; b++) {
        const [f3, r] = mezcla(t.rgb, otras[a], otras[b]);
        explicada = r < RESIDUO_MEZCLA_RGB2 && f3 > 0.1 && f3 < 0.9;
      }
    if (!explicada) continue;
    const candidatas = [...tintas.map((x) => x.rgb), ...anclas];
    const propia = tintas.indexOf(t);
    const mancha = new Uint8Array(n2);
    let pixeles = 0;
    for (let p = 0; p < n2; p++) {
      const i = p * 4;
      if (datos[i + 3] < 128) continue;
      let mejor = 0;
      let d = Number.POSITIVE_INFINITY;
      for (let j = 0; j < candidatas.length; j++) {
        const c = candidatas[j];
        const dj = (datos[i] - c[0]) ** 2 + (datos[i + 1] - c[1]) ** 2 + (datos[i + 2] - c[2]) ** 2;
        if (dj < d) {
          d = dj;
          mejor = j;
        }
      }
      if (mejor === propia) {
        mancha[p] = 1;
        pixeles++;
      }
    }
    const hondo = distanciaAlFondo2(mancha, ancho, alto);
    let conCuerpo = 0;
    for (let p = 0; p < n2; p++) if (mancha[p] && hondo[p] >= 2) conCuerpo++;
    if (conCuerpo >= 0.2 * pixeles) continue;
    tintas.splice(tintas.indexOf(t), 1);
  }
}
function reducir(datos, ancho, alto, lado = 400) {
  const escala = Math.min(1, lado / Math.max(ancho, alto));
  if (escala === 1) return { datos, ancho, alto };
  const w = Math.max(1, Math.round(ancho * escala));
  const h = Math.max(1, Math.round(alto * escala));
  const salida2 = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y / escala);
    const y1 = Math.min(alto, Math.floor((y + 1) / escala));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x / escala);
      const x1 = Math.min(ancho, Math.floor((x + 1) / escala));
      const s = [0, 0, 0, 0];
      let cuenta = 0;
      for (let yy = y0; yy < Math.max(y1, y0 + 1); yy++)
        for (let xx = x0; xx < Math.max(x1, x0 + 1); xx++) {
          const i = (yy * ancho + xx) * 4;
          const a2 = datos[i + 3];
          s[0] += datos[i] * a2;
          s[1] += datos[i + 1] * a2;
          s[2] += datos[i + 2] * a2;
          s[3] += a2;
          cuenta++;
        }
      const o = (y * w + x) * 4;
      const a = s[3] || 1;
      salida2[o] = s[0] / a;
      salida2[o + 1] = s[1] / a;
      salida2[o + 2] = s[2] / a;
      salida2[o + 3] = s[3] / cuenta;
    }
  }
  return { datos: salida2, ancho: w, alto: h };
}

// packages/bordado/src/raster/fondo.ts
var FONDO_DELTA_E = 8;
var FONDO_PRESENCIA = 0.9;
function tieneAlfa(datos) {
  let transparentes = 0;
  for (let i = 3; i < datos.length; i += 4) if (datos[i] < 128) transparentes++;
  return transparentes / (datos.length / 4) > 1e-3;
}
function rectanguloOpaco(datos, ancho, alto) {
  let x0 = ancho;
  let y0 = alto;
  let x1 = -1;
  let y1 = -1;
  let opacos = 0;
  for (let y = 0; y < alto; y++)
    for (let x = 0; x < ancho; x++)
      if (datos[(y * ancho + x) * 4 + 3] >= 250) {
        opacos++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < x0 + 4 || y1 < y0 + 4) return null;
  const caja = (x1 - x0 + 1) * (y1 - y0 + 1);
  return opacos / caja >= 0.998 ? { x0, y0, x1, y1 } : null;
}
function fondoLiso(datos, ancho, r) {
  const borde = [];
  const tomar = (x, y) => {
    const i = (y * ancho + x) * 4;
    borde.push(aLab(datos[i], datos[i + 1], datos[i + 2]));
  };
  for (let x = r.x0; x <= r.x1; x++) {
    tomar(x, r.y0);
    tomar(x, r.y1);
  }
  for (let y = r.y0 + 1; y < r.y1; y++) {
    tomar(r.x0, y);
    tomar(r.x1, y);
  }
  let mediana3 = [0, 1, 2].map((c) => {
    const v2 = borde.map((l) => l[c]).sort((a, b) => a - b);
    return v2[v2.length >> 1];
  });
  const iguales3 = borde.filter(
    (l) => deltaE(l, mediana3) < FONDO_DELTA_E
  ).length;
  if (iguales3 / borde.length < FONDO_PRESENCIA) {
    const esquina = (x, y) => {
      const i = (y * ancho + x) * 4;
      return aLab(datos[i], datos[i + 1], datos[i + 2]);
    };
    const esquinas2 = [
      esquina(r.x0, r.y0),
      esquina(r.x1, r.y0),
      esquina(r.x0, r.y1),
      esquina(r.x1, r.y1)
    ];
    const e = esquinas2[0];
    const presencia = borde.filter((l) => deltaE(l, e) < FONDO_DELTA_E).length / borde.length;
    if (e[0] < 90 || presencia < 0.15 || !esquinas2.every((x) => deltaE(x, e) < FONDO_DELTA_E))
      return null;
    mediana3 = e;
  }
  const suma = [0, 0, 0];
  let cuenta = 0;
  const mx = r.x0 + r.x1 >> 1;
  const my = r.y0 + r.y1 >> 1;
  for (const [x, y] of [
    [r.x0, r.y0],
    [r.x1, r.y0],
    [r.x0, r.y1],
    [r.x1, r.y1],
    [mx, r.y0],
    [mx, r.y1],
    [r.x0, my],
    [r.x1, my]
  ]) {
    const i = (y * ancho + x) * 4;
    if (deltaE(aLab(datos[i], datos[i + 1], datos[i + 2]), mediana3) >= FONDO_DELTA_E)
      continue;
    for (let c = 0; c < 3; c++) suma[c] += datos[i + c];
    cuenta++;
  }
  return {
    lab: mediana3,
    rgb: suma.map((v2) => v2 / Math.max(1, cuenta))
  };
}
function diagnosticarFondo(datos, ancho, alto) {
  const transparencia = tieneAlfa(datos);
  const rect = rectanguloOpaco(datos, ancho, alto);
  if (transparencia && !rect) return { tipo: "alpha" };
  const liso = fondoLiso(
    datos,
    ancho,
    rect ?? { x0: 0, y0: 0, x1: ancho - 1, y1: alto - 1 }
  );
  if (transparencia)
    return liso && liso.lab[0] >= 90 ? { tipo: "detected", color: liso, rect: rect ?? void 0 } : { tipo: "alpha" };
  return liso ? { tipo: "detected", color: liso } : { tipo: "complejo" };
}

// packages/bordado/src/identidad.ts
function huellaEstable(texto2) {
  let h1 = 3735928559;
  let h2 = 1103547991;
  for (let i = 0; i < texto2.length; i++) {
    const c = texto2.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507) ^ Math.imul(h2 ^ h2 >>> 13, 3266489909);
  h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507) ^ Math.imul(h1 ^ h1 >>> 13, 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
}
function textoDeAnillos(anillos) {
  return anillos.map((a) => a.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(" ")).join("|");
}
function unicos() {
  const vistos = /* @__PURE__ */ new Map();
  return (base) => {
    const n2 = (vistos.get(base) ?? 0) + 1;
    vistos.set(base, n2);
    return n2 === 1 ? base : `${base}~${n2}`;
  };
}

// packages/bordado/src/vector/linaje.ts
var ORDEN_DE_ETAPA = {
  componente: -1,
  vectorizacion: -0.5,
  verdad: 0,
  recorte: 1,
  bloque: 2,
  apertura: 3,
  clasificacion: 4,
  adaptacion: 5,
  area: 6,
  objetos: 7
};
function puntoInterior2(r) {
  let y0 = Number.POSITIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (const [, y] of r.exterior) {
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  if (!(y1 > y0)) return null;
  let mejor = null;
  for (const t of [0.5, 0.3, 0.7, 0.15, 0.85, 0.4, 0.6, 0.05, 0.95]) {
    const y = y0 + (y1 - y0) * t + (y1 - y0) * 1e-7;
    const cortes = [];
    for (const a of [r.exterior, ...r.huecos])
      for (let i = 0, j = a.length - 1; i < a.length; j = i++) {
        const [xi, yi] = a[i];
        const [xj, yj] = a[j];
        if (yi > y !== yj > y)
          cortes.push(xi + (y - yi) * (xj - xi) / (yj - yi));
      }
    cortes.sort((a, b) => a - b);
    for (let k = 0; k + 1 < cortes.length; k += 2) {
      const ancho = cortes[k + 1] - cortes[k];
      if (!mejor || ancho > mejor.ancho)
        mejor = { ancho, p: [(cortes[k] + cortes[k + 1]) / 2, y] };
    }
  }
  return mejor && mejor.ancho > 0 ? mejor.p : null;
}
var huellaDeRegion = (r) => textoDeAnillos([r.exterior, ...r.huecos]);
var Linaje = class {
  constructor(prefijo = "") {
    this.prefijo = prefijo;
    this.nodos = /* @__PURE__ */ new Map();
    /** El nodo de cada región viva (por referencia: la misma región, el mismo nodo). */
    this.deRegion = /* @__PURE__ */ new Map();
    this.vistos = /* @__PURE__ */ new Map();
    /** Los nodos que descienden de alguno de estos átomos, por etapa. */
    /* Índices para las historias, hechos una vez (se rehacen si el grafo cambia):
       de cada ancestro a sus descendientes, y de cada nodo a sus hijos. Sin
       ellos, cada historia recorría todos los nodos: O(entidades × nodos). */
    this.indices = null;
  }
  nombre(base) {
    const n2 = (this.vistos.get(base) ?? 0) + 1;
    this.vistos.set(base, n2);
    return n2 === 1 ? base : `${base}~${n2}`;
  }
  /** Un átomo de la verdad: raíz, su propio ancestro. */
  raiz(region, atomo) {
    const id = this.nombre(
      `${this.prefijo}ta-${huellaEstable(`${atomo.color}|${atomo.clase}|${atomo.capa}|${huellaDeRegion(region)}`)}`
    );
    this.nodos.set(id, {
      id,
      etapa: "verdad",
      padres: [],
      ancestros: [id],
      atomo
    });
    this.deRegion.set(region, id);
    return id;
  }
  /** V6.3.2: un componente de la imagen (lo descubre el vectorizador), raíz del linaje. */
  componente(id, meta) {
    const nombre = this.nombre(`${this.prefijo}${id}`);
    this.nodos.set(nombre, { id: nombre, etapa: "componente", padres: [], ancestros: [nombre], componente: meta });
    return nombre;
  }
  /**
   * V6.3.2: un átomo de la verdad CON PADRES (raster: los trazados de la
   * vectorización de los que sale). Sus ancestros son los de ellos y él
   * mismo: los grupos se forman de átomos, y un objeto tiene que saber de
   * qué átomo desciende además de qué componente.
   */
  atomo(region, atomo, padres) {
    if (!padres.length) return this.raiz(region, atomo);
    const unicos2 = [...new Set(padres)].sort();
    const id = this.nombre(
      `${this.prefijo}ta-${huellaEstable(`${atomo.color}|${atomo.clase}|${atomo.capa}|${huellaDeRegion(region)}`)}`
    );
    const ancestros = /* @__PURE__ */ new Set([id]);
    for (const p of unicos2) for (const a of this.nodos.get(p)?.ancestros ?? []) ancestros.add(a);
    this.nodos.set(id, { id, etapa: "verdad", padres: unicos2, ancestros: [...ancestros].sort(), atomo });
    this.deRegion.set(region, id);
    return id;
  }
  /** Un nodo derivado: sus ancestros son la unión de los de sus padres. */
  derivar(etapa, padres, region, accion, clave2 = "") {
    if (!padres.length)
      throw new Error(`linaje: un nodo de ${etapa} sin padres`);
    const unicos2 = [...new Set(padres)].sort();
    const ancestros = /* @__PURE__ */ new Set();
    for (const p of unicos2) {
      const n2 = this.nodos.get(p);
      if (!n2) throw new Error(`linaje: padre desconocido ${p}`);
      for (const a of n2.ancestros) ancestros.add(a);
    }
    const id = this.nombre(
      `${this.prefijo}${etapa}-${huellaEstable(`${etapa}|${unicos2.join(",")}|${accion ?? ""}|${clave2}|${region ? huellaDeRegion(region) : ""}`)}`
    );
    this.nodos.set(id, {
      id,
      etapa,
      padres: unicos2,
      ancestros: [...ancestros].sort(),
      ...accion ? { accion } : {}
    });
    if (region) this.deRegion.set(region, id);
    return id;
  }
  /** Un objeto del IR, con su id de identidad (V6.3), hijo de la región que lo generó. */
  objeto(id, padres) {
    const ancestros = /* @__PURE__ */ new Set();
    for (const p of padres)
      for (const a of this.nodos.get(p)?.ancestros ?? []) ancestros.add(a);
    this.nodos.set(id, {
      id,
      etapa: "objetos",
      padres: [...padres].sort(),
      ancestros: [...ancestros].sort()
    });
  }
  /** El mismo nodo sigue en otra región (misma geometría, otro objeto). */
  alias(region, id) {
    this.deRegion.set(region, id);
  }
  baja(id, etapa, motivo) {
    const n2 = this.nodos.get(id);
    if (!n2) throw new Error(`linaje: baja de un nodo desconocido ${id}`);
    n2.baja = { etapa, motivo };
  }
  de(region) {
    return this.deRegion.get(region);
  }
  /**
   * UNIÓN: cada entrada está entera dentro de una salida. Devuelve, por
   * salida, los nodos de las entradas que consumió; y las entradas que no
   * caen en ninguna (una unión que las descarta por degeneradas).
   */
  unir(entradas, salidas) {
    const donde = localizadorDeRegiones(salidas);
    const padres = salidas.map(() => []);
    const sinSalida = [];
    for (const e of entradas) {
      const p = puntoInterior2(e.region);
      const k = p ? donde(p) : -1;
      if (k < 0) sinSalida.push(e.nodo);
      else padres[k].push(e.nodo);
    }
    return { padres, sinSalida };
  }
  /**
   * APERTURA (o cualquier operación que sólo quita): cada salida está dentro
   * de una entrada. Devuelve, por salida, el índice de su entrada (-1 si no
   * se puede decir: no debería pasar).
   */
  contener(salidas, entradas) {
    const donde = localizadorDeRegiones(entradas);
    return salidas.map((s) => {
      const p = puntoInterior2(s);
      return p ? donde(p) : -1;
    });
  }
  indice() {
    if (this.indices && this.indices.tamano === this.nodos.size) return this.indices;
    const porAncestro = /* @__PURE__ */ new Map();
    const hijos = /* @__PURE__ */ new Map();
    for (const n2 of this.nodos.values()) {
      for (const a of n2.ancestros) {
        const l = porAncestro.get(a);
        if (l) l.push(n2);
        else porAncestro.set(a, [n2]);
      }
      for (const p of n2.padres) {
        const l = hijos.get(p);
        if (l) l.push(n2.id);
        else hijos.set(p, [n2.id]);
      }
    }
    const orden = new Map([...this.nodos.keys()].map((k, i) => [k, i]));
    this.indices = { porAncestro, hijos, orden, tamano: this.nodos.size };
    return this.indices;
  }
  /** Los nodos que descienden de alguno de estos átomos, en el orden en que se crearon. */
  descendientes(atomos) {
    const { porAncestro, orden } = this.indice();
    const vistos = /* @__PURE__ */ new Set();
    for (const a of atomos) for (const n2 of porAncestro.get(a) ?? []) vistos.add(n2);
    return [...vistos].sort((x, y) => (orden.get(x.id) ?? 0) - (orden.get(y.id) ?? 0));
  }
  /**
   * Qué le pasó a un conjunto de átomos (una pieza o un grupo de la verdad)
   * hasta el IR. `ajenos(a)` dice si el átomo `a` es de OTRA entidad de la
   * misma clase (otro grupo, otra pieza): es lo que convierte una unión en
   * una fusión de verdad (un fragmento con su propia parte tapada no lo es).
   */
  historia(atomos, ajenos) {
    const nodos = this.descendientes(atomos);
    const { hijos } = this.indice();
    const objetos = nodos.filter((n2) => n2.etapa === "objetos" && !n2.baja).map((n2) => n2.id);
    const regiones = [
      ...new Set(
        nodos.filter((n2) => n2.etapa === "objetos" && !n2.baja).flatMap((n2) => n2.padres).filter((p) => {
          const q = this.nodos.get(p);
          return q?.ancestros.some((a) => atomos.has(a));
        })
      )
    ].sort();
    const sucesos = [];
    for (const n2 of nodos) {
      if (n2.baja)
        sucesos.push({
          etapa: n2.baja.etapa,
          tipo: "removed",
          nodos: [n2.id],
          motivo: n2.baja.motivo
        });
      if (n2.padres.length && n2.ancestros.some((a) => !atomos.has(a) && ajenos(a)) && n2.padres.some(
        (p) => this.nodos.get(p)?.ancestros.every((a) => atomos.has(a) || !ajenos(a))
      ))
        sucesos.push({ etapa: n2.etapa, tipo: "merged", nodos: [n2.id] });
      const h = (hijos.get(n2.id) ?? []).filter(
        (x) => this.nodos.get(x)?.etapa !== "objetos"
      );
      if (h.length > 1) {
        const e = this.nodos.get(h[0])?.etapa;
        sucesos.push({
          etapa: e === "verdad" ? n2.etapa : ETAPA_SIGUIENTE(e),
          tipo: "split",
          nodos: [n2.id, ...h]
        });
      }
      if (n2.accion && n2.accion !== "abrir" && n2.accion !== "recortar")
        sucesos.push({
          etapa: n2.etapa,
          tipo: "adapted",
          nodos: [n2.id],
          motivo: n2.accion
        });
    }
    sucesos.sort(
      (a, b) => ORDEN_DE_ETAPA[a.etapa] - ORDEN_DE_ETAPA[b.etapa] || a.tipo.localeCompare(b.tipo) || a.nodos[0].localeCompare(b.nodos[0])
    );
    if (!objetos.length) {
      const bajas = sucesos.filter((s) => s.tipo === "removed");
      const ultima = bajas[bajas.length - 1];
      return {
        destino: "removed",
        etapa: ultima?.etapa,
        sucesos,
        regiones,
        objetos
      };
    }
    const hay = (t) => sucesos.some((s) => s.tipo === t);
    const destino = hay("merged") ? "merged" : regiones.length > 1 || hay("split") ? "split" : hay("adapted") ? "adapted" : "preserved";
    return { destino, sucesos, regiones, objetos };
  }
  /** Todo, serializable, en orden estable. */
  exportar() {
    return [...this.nodos.values()].sort(
      (a, b) => ORDEN_DE_ETAPA[a.etapa] - ORDEN_DE_ETAPA[b.etapa] || a.id.localeCompare(b.id)
    );
  }
};
var ETAPA_SIGUIENTE = (e) => e ?? "objetos";

// packages/bordado/src/vector/capas.ts
var ANCHO_MINIMO_DETALLE_MM = 0.2;
function unificarPiezas(preparados, seConserva, registro) {
  if (preparados.length < 2) return [];
  const trozos = preparados.flatMap(
    (p, k) => p.todas.filter((r) => !p.astillas.has(r)).map((r) => ({ k, r, area: areaDeRegion(r), conserva: seConserva(r) }))
  );
  if (!trozos.some((t) => !t.conserva)) return [];
  const piezas = aRegiones(
    unir(
      crecer(
        trozos.flatMap((t) => aPaths3(t.r)),
        CONTACTO_DE_PIEZA_MM
      )
    )
  );
  const donde = localizadorDeRegiones(piezas);
  const porPieza = /* @__PURE__ */ new Map();
  for (const t of trozos) {
    const q = puntoInterior2(t.r);
    const i = q ? donde(q) : -1;
    if (i < 0) continue;
    const lista2 = porPieza.get(i) ?? [];
    lista2.push(t);
    porPieza.set(i, lista2);
  }
  const salida2 = [];
  for (const i of [...porPieza.keys()].sort((a, b) => a - b)) {
    const lista2 = porPieza.get(i) ?? [];
    const tonos = new Set(lista2.map((t) => t.k)).size;
    if (tonos < 2 || lista2.some((t) => t.conserva)) continue;
    const dominante = lista2.reduce((a, b) => b.area > a.area ? b : a);
    const unida = aRegiones(
      crecer(
        crecer(unir(lista2.flatMap((t) => aPaths3(t.r))), CIERRE_DE_PIEZA_MM),
        -CIERRE_DE_PIEZA_MM
      )
    );
    if (unida.length !== 1) continue;
    unida[0] = {
      ...unida[0],
      huecos: unida[0].huecos.filter(esCounterDeAnillo)
    };
    for (const t of lista2) {
      const todas = preparados[t.k].todas;
      todas.splice(todas.indexOf(t.r), 1);
    }
    preparados[dominante.k].todas.push(unida[0]);
    const padres = registro ? lista2.map((t) => registro.de(t.r)).filter((n2) => !!n2) : [];
    if (registro && padres.length)
      registro.derivar("clasificacion", padres, unida[0], "unificar");
    const c = cajaDeRegion(unida[0]);
    salida2.push({
      preparado: preparados[dominante.k].bloque,
      region: unida[0],
      bloque: -1,
      tonos,
      areaMm2: Number(areaDeRegion(unida[0]).toFixed(3)),
      centro: [(c.minX + c.maxX) / 2, (c.minY + c.maxY) / 2]
    });
  }
  return salida2;
}
var PRECISION = 4;
var APERTURA_MM = 0.05;
var CONTACTO_DE_PIEZA_MM = 0.02;
var CIERRE_DE_PIEZA_MM = APERTURA_MM;
var ZONA_DE_RECORTE_MM = 4 * APERTURA_MM;
var MAXIMO_TONOS = 24;
var ARCO = 5e-3;
var HILO_MM2 = 0.4;
var unir = (p) => p.length ? unionD(sanos(p), [], FillRule.NonZero, PRECISION) : [];
var restar = (a, b) => !a.length ? [] : !b.length ? a : differenceD(sanos(a), sanos(b), FillRule.NonZero, PRECISION);
var cortar = (a, b) => !a.length || !b.length ? [] : intersectD(sanos(a), sanos(b), FillRule.NonZero, PRECISION);
var crecer = (p, d) => p.length ? inflatePathsD(
  sanos(p),
  d,
  JoinType.Round,
  EndType.Polygon,
  2,
  PRECISION,
  ARCO
) : [];
function abrirConEsquinas(p, radio) {
  if (!p.length) return p;
  const estrecha = inflatePathsD(
    sanos(p),
    -radio,
    JoinType.Miter,
    EndType.Polygon,
    20,
    PRECISION
  );
  if (!estrecha.length) return [];
  return unir(
    inflatePathsD(
      sanos(estrecha),
      radio,
      JoinType.Miter,
      EndType.Polygon,
      20,
      PRECISION
    )
  );
}
var CONTACTO_DE_TOPOLOGIA_MM = 10 * 10 ** -PRECISION;
var COUNTERS_GUARDADOS = 5e4;
var counterGuardado = /* @__PURE__ */ new Map();
function esCounterDeAnillo(anillo) {
  const clave2 = anillo.join(";");
  const guardado = counterGuardado.get(clave2);
  if (guardado !== void 0) return guardado;
  const hueco2 = { exterior: [...anillo].reverse(), huecos: [] };
  const es = areaDeRegion(hueco2) >= HUECO_MINIMO_MM2 && anchoInscritoAlMenos(hueco2, COUNTER_MINIMO_MM);
  if (counterGuardado.size >= COUNTERS_GUARDADOS) counterGuardado.clear();
  counterGuardado.set(clave2, es);
  return es;
}
function loQueSeQuedaDeLaApertura(tinta, quitado) {
  if (!quitado.length) return [];
  const trozos = aRegiones(quitado).map((t) => ({
    paths: aPaths3(t),
    caja: cajaDe(aPaths3(t))
  }));
  const topologia = (p) => {
    const piezas = aRegiones(crecer(p, CONTACTO_DE_TOPOLOGIA_MM)).filter(
      (r) => areaDeRegion(r) >= HUECO_MINIMO_MM2
    );
    return `${piezas.length}/${piezas.reduce((n2, r) => n2 + r.huecos.filter(esCounterDeAnillo).length, 0)}`;
  };
  const quedan = [];
  for (const pieza of aRegiones(tinta)) {
    const pp = aPaths3(pieza);
    const cp = cajaDe(pp);
    const suyos = trozos.filter(
      (t) => tocan(cp, t.caja, 0) && cortar(t.paths, pp).length > 0
    );
    if (!suyos.length) continue;
    const antes = topologia(pp);
    const prescindibles = suyos.filter(
      (t) => topologia(restar(pp, t.paths)) === antes
    );
    const sin = restar(
      pp,
      prescindibles.flatMap((t) => t.paths)
    );
    const seQuedan = topologia(sin) === antes ? suyos.filter((t) => !prescindibles.includes(t)) : suyos;
    for (const t of seQuedan) quedan.push(...t.paths);
  }
  return quedan;
}
function cajaDe(p) {
  const caja = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY
  };
  for (const anillo of p)
    for (const q of anillo) {
      caja.minX = Math.min(caja.minX, q.x);
      caja.minY = Math.min(caja.minY, q.y);
      caja.maxX = Math.max(caja.maxX, q.x);
      caja.maxY = Math.max(caja.maxY, q.y);
    }
  return caja;
}
var tocan = (a, b, holgura) => a.minX - holgura <= b.maxX && b.minX - holgura <= a.maxX && a.minY - holgura <= b.maxY && b.minY - holgura <= a.maxY;
var aPaths3 = (r) => [r.exterior, ...r.huecos].map((a) => a.map(([x, y]) => ({ x, y })));
var aRegiones = (p) => regionesDeRelleno(
  p.map((a) => ({
    puntos: a.map((q) => [q.x, q.y]),
    cerrado: true
  })),
  "nonzero"
);
var rgb = (hex2) => [1, 3, 5].map((i) => Number.parseInt(hex2.slice(i, i + 2), 16));
function distanciaDeColor(a, b) {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}
function areaCosida(r) {
  const largo = [r.exterior, ...r.huecos].reduce((s, a) => s + perimetro(a), 0);
  return Math.max(areaDeRegion(r), largo / 2 * HILO_MM2);
}
function esDetalleDelDiseno(r, profile, anchoMinimo = ANCHO_MINIMO_DETALLE_MM) {
  const fina = !crecer(aPaths3(r), -anchoMinimo / 2).length;
  return !(areaCosida(r) >= profile.geometria.minAreaMm2 && !fina || esTrazoEstructural(r));
}
function normalizarCapas(capas, opciones) {
  const solape = opciones.solapeMm ?? 0.3;
  const rendija = opciones.rendijaMm ?? 0.1;
  const anchoMinimo = opciones.anchoMinimoMm ?? ANCHO_MINIMO_DETALLE_MM;
  const tolerancia = opciones.toleranciaColor ?? 12;
  const { profile } = opciones;
  const avisos = [];
  const eliminadas = {
    astillas: 0,
    astillasMm2: 0,
    detalles: 0,
    detallesMm2: 0,
    ocultas: 0
  };
  const visibles = capas.filter((c) => c.alfa >= 0.05);
  const translucidas = visibles.filter((c) => c.alfa < 0.95);
  if (translucidas.length)
    avisos.push({
      codigo: "SVG_TRANSPARENCIA",
      mensaje: "El SVG tiene formas semitransparentes; el hilo es opaco y se cosen como color s\xF3lido.",
      severidad: "revisar",
      elementos: translucidas.slice(0, 12).map((c) => c.elemento)
    });
  const areas = visibles.map((c) => Math.abs(areaPathsD(c.poligonos)));
  const grupos = [];
  const grupoDe = visibles.map((c, i) => {
    let g = grupos.findIndex(
      (x) => distanciaDeColor(x.color, c.color) <= tolerancia
    );
    if (g < 0) {
      g = grupos.length;
      grupos.push({ tonos: /* @__PURE__ */ new Map(), color: c.color });
    }
    const tonos2 = grupos[g].tonos;
    tonos2.set(c.color, (tonos2.get(c.color) ?? 0) + areas[i]);
    return g;
  });
  for (const g of grupos)
    g.color = [...g.tonos.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const tonos = new Set(visibles.map((c) => c.color)).size;
  if (tonos > MAXIMO_TONOS)
    avisos.push({
      codigo: "SVG_DEMASIADOS_TONOS",
      mensaje: `El SVG usa ${tonos} colores distintos; un logo bordable suele tener pocas tintas planas.`,
      severidad: "revisar",
      elementos: []
    });
  const unificados = grupos.filter((g) => g.tonos.size > 1);
  if (unificados.length)
    avisos.push({
      codigo: "SVG_TONOS_UNIFICADOS",
      mensaje: `Tonos casi iguales se cosen con el mismo hilo: ${unificados.map((g) => [...g.tonos.keys()].join(" = ")).join(", ")}.`,
      severidad: "informar",
      elementos: []
    });
  const cajas = visibles.map((c) => cajaDe(c.poligonos));
  const bloqueDe = [];
  const bloques = [];
  visibles.forEach((c, i) => {
    const g = grupoDe[i];
    let b = -1;
    for (let k = bloques.length - 1; k >= 0; k--)
      if (bloques[k].grupo === g) {
        b = k;
        break;
      }
    if (b >= 0) {
      const pisa = bloques.slice(b + 1).some(
        (otro) => otro.capas.some(
          (j) => tocan(cajas[i], cajas[j], solape) && cortar(crecer(c.poligonos, solape), visibles[j].poligonos).length > 0
        )
      );
      if (pisa) b = -1;
    }
    if (b < 0) {
      b = bloques.length;
      bloques.push({ grupo: g, capas: [] });
    }
    bloques[b].capas.push(i);
    bloqueDe.push(b);
  });
  const tocadas = /* @__PURE__ */ new Set();
  const arribaDe = visibles.map(() => []);
  const lin = opciones.linaje;
  const etiquetadas = visibles.map(() => []);
  const recortarConLinaje = (i, resultado2, motivo) => {
    if (!lin) return;
    for (const a of lin.atomos.get(visibles[i].indice) ?? []) {
      const partes = aRegiones(resultado2(aPaths3(a.region)));
      if (!partes.length) lin.registro.baja(a.nodo, "recorte", motivo);
      for (const parte of partes)
        etiquetadas[i].push({
          region: parte,
          nodo: lin.registro.derivar("recorte", [a.nodo], parte)
        });
    }
  };
  const recortadas = visibles.map((c, i) => {
    const encima = visibles.map((_, j) => j).filter(
      (j) => j > i && bloqueDe[j] !== bloqueDe[i] && tocan(cajas[i], cajas[j], solape + rendija)
    );
    if (!encima.length) {
      if (lin)
        for (const a of lin.atomos.get(c.indice) ?? []) etiquetadas[i].push(a);
      return c.poligonos;
    }
    tocadas.add(i);
    const arriba = crecer(
      crecer(unir(encima.flatMap((j) => visibles[j].poligonos)), rendija),
      -rendija
    );
    arribaDe[i] = arriba;
    const exacto = restar(c.poligonos, arriba);
    const tapada = `tapada por ${encima.length} capa(s) de otro bloque`;
    if (!exacto.length) {
      recortarConLinaje(i, () => [], tapada);
      return [];
    }
    const conSolape = restar(c.poligonos, crecer(arriba, -solape));
    const radio = profile.geometria.maxGrosorRunningMm / 2;
    const cuerpo2 = crecer(exacto, -radio);
    if (!cuerpo2.length) {
      recortarConLinaje(i, (p) => restar(p, arriba), tapada);
      return exacto;
    }
    const junto = crecer(cuerpo2, radio + solape);
    const bajoArriba = crecer(arriba, -solape);
    recortarConLinaje(
      i,
      (p) => unir([...restar(p, arriba), ...cortar(restar(p, bajoArriba), junto)]),
      tapada
    );
    return unir([...exacto, ...cortar(conSolape, junto)]);
  });
  const salida2 = [];
  const candidatos = [];
  const bajaDeClasificacion = (r, motivo) => {
    const n2 = lin?.registro.de(r);
    if (n2) lin?.registro.baja(n2, "clasificacion", motivo);
  };
  const fuente = [];
  const preparados = [];
  for (const bloque of bloques) {
    const fundidas = unir(bloque.capas.flatMap((i) => recortadas[i]));
    const abre = bloque.capas.some((i) => tocadas.has(i));
    const juntas = (() => {
      if (!abre) return fundidas;
      const abierta = abrirConEsquinas(fundidas, APERTURA_MM);
      const exceso = aRegiones(restar(abierta, fundidas)).map(aPaths3).filter((p) => crecer(p, -CONTACTO_DE_TOPOLOGIA_MM / 2).length > 0);
      const abiertas = exceso.length ? restar(abierta, exceso.flat()) : abierta;
      const quitado = restar(fundidas, abiertas);
      const zona = crecer(
        unir(bloque.capas.flatMap((i) => arribaDe[i])),
        ZONA_DE_RECORTE_MM
      );
      const tinta = restar(fundidas, cortar(quitado, zona));
      const quedan = loQueSeQuedaDeLaApertura(tinta, restar(quitado, zona));
      return quedan.length ? unir([...abiertas, ...quedan]) : abiertas;
    })();
    for (const i of bloque.capas)
      if (!recortadas[i].length) eliminadas.ocultas++;
    const unidas2 = lin ? aRegiones(fundidas) : [];
    const nodoDeUnida = [];
    if (lin) {
      const entradas = bloque.capas.flatMap((i) => etiquetadas[i]);
      const { padres, sinSalida } = lin.registro.unir(entradas, unidas2);
      for (const n2 of sinSalida)
        lin.registro.baja(
          n2,
          "bloque",
          "degenerada: la uni\xF3n del bloque no la conserva"
        );
      unidas2.forEach((u4, k) => {
        nodoDeUnida[k] = padres[k].length ? lin.registro.derivar("bloque", padres[k], u4) : "";
      });
    }
    if (!juntas.length) {
      if (lin) {
        for (const n2 of nodoDeUnida)
          if (n2)
            lin.registro.baja(
              n2,
              "apertura",
              "m\xE1s fina que 0.1 mm: la apertura la quita"
            );
      }
      continue;
    }
    const todas = lin && !abre ? unidas2 : aRegiones(juntas);
    if (lin) {
      if (abre) {
        const de2 = lin.registro.contener(todas, unidas2);
        const conHijos = /* @__PURE__ */ new Set();
        todas.forEach((t, k) => {
          const madre = de2[k] >= 0 ? nodoDeUnida[de2[k]] : "";
          if (!madre) return;
          conHijos.add(de2[k]);
          lin.registro.derivar("apertura", [madre], t, "abrir");
        });
        nodoDeUnida.forEach((n2, k) => {
          if (n2 && !conHijos.has(k))
            lin.registro.baja(
              n2,
              "apertura",
              "m\xE1s fina que 0.1 mm: la apertura la quita"
            );
        });
      } else
        todas.forEach((t, k) => {
          if (nodoDeUnida[k]) lin.registro.alias(t, nodoDeUnida[k]);
        });
    }
    const astillas = /* @__PURE__ */ new Set();
    const tipico = (() => {
      const pares = todas.map((r) => [grosorMedio(r), areaDeRegion(r)]).sort((a, b) => a[0] - b[0]);
      const total = pares.reduce((t, p) => t + p[1], 0);
      let acumulado2 = 0;
      for (const [g, a] of pares) {
        acumulado2 += a;
        if (acumulado2 >= total / 2) return g;
      }
      return 0;
    })();
    for (const r of todas) {
      const fina = !crecer(aPaths3(r), -anchoMinimo / 2).length;
      const grosor = grosorMedio(r);
      if (fina && grosor < ANCHO_INVISIBLE_MM && grosor < ASTILLA_DEL_TRAZO * tipico) {
        eliminadas.astillas++;
        eliminadas.astillasMm2 += areaDeRegion(r);
        astillas.add(r);
        bajaDeClasificacion(
          r,
          "astilla: filo de construcci\xF3n m\xE1s fino de lo que se ve"
        );
      }
    }
    preparados.push({ bloque, todas, astillas, abre });
  }
  const seConserva = (r) => areaDeRegion(r) >= profile.geometria.minAreaMm2 && crecer(aPaths3(r), -anchoMinimo / 2).length > 0 || esTrazoEstructural(r);
  const unificadas = unificarPiezas(preparados, seConserva, lin?.registro);
  const unidas = new Set(unificadas.map((u4) => u4.region));
  for (const { bloque, todas, astillas } of preparados) {
    let originales = null;
    const regiones = [];
    for (const r of todas) {
      if (astillas.has(r)) continue;
      const fina = !crecer(aPaths3(r), -anchoMinimo / 2).length;
      if (seConserva(r)) {
        regiones.push(r);
        continue;
      }
      if (unidas.has(r)) {
        eliminadas.detalles++;
        eliminadas.detallesMm2 += areaDeRegion(r);
        candidatos.push({
          region: r,
          color: grupos[bloque.grupo].color,
          bloque: salida2.length,
          fina,
          madre: r
        });
        continue;
      }
      originales ??= aRegiones(
        unir(bloque.capas.flatMap((i) => visibles[i].poligonos))
      );
      const caja = cajaDeRegion(r);
      const madre = originales.filter((o) => {
        const c = cajaDeRegion(o);
        return c.minX <= caja.minX + 1e-3 && c.minY <= caja.minY + 1e-3 && c.maxX >= caja.maxX - 1e-3 && c.maxY >= caja.maxY - 1e-3;
      }).sort((a, b) => areaDeRegion(a) - areaDeRegion(b))[0];
      const detalle = !madre || areaCosida(madre) < profile.geometria.minAreaMm2 || !crecer(aPaths3(madre), -anchoMinimo / 2).length;
      if (detalle) {
        eliminadas.detalles++;
        eliminadas.detallesMm2 += areaDeRegion(r);
        candidatos.push({
          region: r,
          color: grupos[bloque.grupo].color,
          bloque: salida2.length,
          fina,
          madre: madre ?? null
        });
      } else {
        eliminadas.astillas++;
        eliminadas.astillasMm2 += areaDeRegion(r);
        astillas.add(r);
        bajaDeClasificacion(r, "astilla: resto del recorte entre capas");
      }
    }
    for (const u4 of unificadas)
      if (u4.preparado === bloque) u4.bloque = salida2.length;
    if (!regiones.length && !candidatos.some((c) => c.bloque === salida2.length))
      continue;
    fuente.push(todas.filter((r) => !astillas.has(r)));
    salida2.push({
      color: grupos[bloque.grupo].color,
      capas: bloque.capas.map((i) => visibles[i].indice),
      regiones,
      areaMm2: regiones.reduce((s, r) => s + areaDeRegion(r), 0)
    });
  }
  if (visibles.length > 1) {
    const todo = cajas.reduce(
      (c, x) => ({
        minX: Math.min(c.minX, x.minX),
        minY: Math.min(c.minY, x.minY),
        maxX: Math.max(c.maxX, x.maxX),
        maxY: Math.max(c.maxY, x.maxY)
      }),
      cajas[0]
    );
    const areaTotal = (todo.maxX - todo.minX) * (todo.maxY - todo.minY);
    if (areaTotal > 0 && areas[0] >= 0.85 * areaTotal)
      avisos.push({
        codigo: "SVG_FONDO",
        mensaje: "El SVG trae un fondo que cubre todo el dise\xF1o; se borda como un relleno s\xF3lido debajo de todo.",
        severidad: "informar",
        elementos: [visibles[0].elemento]
      });
  }
  const hilos = grupos.map((g, k) => ({
    color: g.color,
    tonos: [...g.tonos.keys()],
    areaMm2: salida2.filter((b) => b.color === g.color).reduce((s, b) => s + b.areaMm2, 0),
    k
  }));
  return {
    bloques: salida2,
    hilos: hilos.filter((h) => h.areaMm2 > 0).map(({ color, tonos: tonos2, areaMm2 }) => ({ color, tonos: tonos2, areaMm2 })),
    eliminadas: {
      ...eliminadas,
      astillasMm2: Number(eliminadas.astillasMm2.toFixed(3)),
      detallesMm2: Number(eliminadas.detallesMm2.toFixed(3))
    },
    avisos,
    candidatos,
    fuente,
    unificadas: unificadas.filter((u4) => u4.bloque >= 0).map(({ preparado: _p, region: _r, ...u4 }) => ({
      ...u4,
      color: salida2[u4.bloque].color
    }))
  };
}

// packages/bordado/src/verdad/verdad.ts
function pixelesDePiezas(v2) {
  return internoDe(v2).pixelesDePieza ?? [];
}
function atomosDeVerdad(v2) {
  return internoDe(v2).atomos ?? [];
}
var internos = /* @__PURE__ */ new WeakMap();
function internoDe(v2) {
  const i = internos.get(v2);
  if (!i) throw new Error("StructuralTruth sin construir");
  return i;
}
var SONDAS_POR_PIEZA = 12;
function esEstructural(areaMm2, anchoMm, counters, o, grosorMm = anchoMm) {
  if (anchoMm < ANCHO_INVISIBLE_MM || grosorMm < ANCHO_INVISIBLE_MM) return false;
  if (counters > 0 || areaMm2 >= o.minAreaMm2) return true;
  const largo = areaMm2 / Math.max(anchoMm, 1e-6);
  return largo >= TRAZO_MINIMO.largoMm && largo >= TRAZO_MINIMO.proporcion * anchoMm;
}
var esCounter = (areaMm2, anchoMm) => anchoMm >= COUNTER_MINIMO_MM && areaMm2 >= HUECO_MINIMO_MM2;
function analizarPiezas(r, dentro2, prefijo, o, pxMm, inciertoPorResolucion = true) {
  const tinta = etiquetar(r.ancho, r.alto, dentro2, 8);
  const fuera = (i) => !dentro2(i);
  const fondo = etiquetar(r.ancho, r.alto, fuera, 4);
  const dTinta = distancia(r.ancho, r.alto, dentro2);
  const dFondo = distancia(r.ancho, r.alto, fuera);
  const celda = r.paso * r.paso;
  const maxT = new Float32Array(tinta.n + 1);
  const maxF = new Float32Array(fondo.n + 1);
  const poloF = new Int32Array(fondo.n + 1).fill(-1);
  for (let i = 0; i < dTinta.length; i++) {
    const t = tinta.etiquetas[i];
    if (t && dTinta[i] > maxT[t]) maxT[t] = dTinta[i];
    const f3 = fondo.etiquetas[i];
    if (f3 && dFondo[i] > maxF[f3]) {
      maxF[f3] = dFondo[i];
      poloF[f3] = i;
    }
  }
  const madreDe = new Int32Array(fondo.n + 1);
  for (let f3 = 1; f3 <= fondo.n; f3++) {
    if (fondo.tocaBorde[f3]) continue;
    const [x0, y0] = fondo.cajas[f3];
    for (let x = x0; x <= fondo.cajas[f3][2]; x++) {
      const i = y0 * r.ancho + x;
      if (fondo.etiquetas[i] !== f3) continue;
      const arriba = y0 > 0 ? tinta.etiquetas[i - r.ancho] : 0;
      madreDe[f3] = arriba || (x > 0 ? tinta.etiquetas[i - 1] : 0);
      break;
    }
  }
  const caja = (c) => ({
    minX: r.x0 + c[0] * r.paso,
    minY: r.y0 + c[1] * r.paso,
    maxX: r.x0 + (c[2] + 1) * r.paso,
    maxY: r.y0 + (c[3] + 1) * r.paso
  });
  const huecos = [];
  const huecoDe = /* @__PURE__ */ new Map();
  const countersDe = new Int32Array(tinta.n + 1);
  for (let f3 = 1; f3 <= fondo.n; f3++) {
    if (fondo.tocaBorde[f3]) continue;
    const areaMm2 = fondo.areas[f3] * celda;
    const anchoMm = anchoDeDistancia(maxF[f3], r.paso);
    const counter = esCounter(areaMm2, anchoMm);
    if (counter && madreDe[f3]) countersDe[madreDe[f3]]++;
    huecoDe.set(f3, huecos.length);
    huecos.push({
      id: `${prefijo}h${huecos.length}`,
      areaMm2: redondear2(areaMm2, 4),
      anchoMm: redondear2(anchoMm, 3),
      ...pxMm ? { anchoPx: redondear2(anchoMm / pxMm, 2) } : {},
      polo: centroDeCelda(r, poloF[f3]),
      caja: caja(fondo.cajas[f3]),
      counter,
      // Un hueco de menos de dos celdas de ancho: la rejilla no lo resuelve.
      incierto: inciertoPorResolucion && counter && maxF[f3] < 2,
      ...inciertoPorResolucion && counter && maxF[f3] < 2 ? { motivos: ["resolucion"] } : {}
    });
  }
  const candidatas = Array.from({ length: tinta.n + 1 }, () => []);
  const vistas = new Int32Array(tinta.n + 1);
  for (let i = 0; i < dTinta.length; i++) {
    const t = tinta.etiquetas[i];
    if (!t || dTinta[i] < 0.5 * maxT[t]) continue;
    const k = Math.max(1, Math.floor(tinta.areas[t] / 400));
    if (vistas[t]++ % k === 0) candidatas[t].push(i);
  }
  const bordes = new Float64Array(tinta.n + 1);
  for (let i = 0; i < tinta.etiquetas.length; i++) {
    const t = tinta.etiquetas[i];
    if (!t) continue;
    const x = i % r.ancho;
    const y = (i - x) / r.ancho;
    if (x === 0 || tinta.etiquetas[i - 1] !== t) bordes[t]++;
    if (x === r.ancho - 1 || tinta.etiquetas[i + 1] !== t) bordes[t]++;
    if (y === 0 || tinta.etiquetas[i - r.ancho] !== t) bordes[t]++;
    if (y === r.alto - 1 || tinta.etiquetas[i + r.ancho] !== t) bordes[t]++;
  }
  const piezas = [];
  const piezaDe = /* @__PURE__ */ new Map();
  for (let t = 1; t <= tinta.n; t++) {
    const areaMm2 = tinta.areas[t] * celda;
    const anchoMm = anchoDeDistancia(maxT[t], r.paso);
    const sondas = repartir(candidatas[t], SONDAS_POR_PIEZA, r).map(
      (i) => centroDeCelda(r, i)
    );
    piezaDe.set(t, piezas.length);
    const grosorMm = 2 * areaMm2 / Math.max(bordes[t] * r.paso * (Math.PI / 4), r.paso);
    const estructural = esEstructural(areaMm2, anchoMm, countersDe[t], o, grosorMm);
    const incierto = inciertoPorResolucion && estructural && maxT[t] < 2;
    piezas.push({
      id: `${prefijo}p${piezas.length}`,
      areaMm2: redondear2(areaMm2, 4),
      anchoMm: redondear2(anchoMm, 3),
      grosorMm: redondear2(grosorMm, 3),
      ...pxMm ? { anchoPx: redondear2(anchoMm / pxMm, 2) } : {},
      largoMm: redondear2(areaMm2 / Math.max(anchoMm, r.paso), 2),
      caja: caja(tinta.cajas[t]),
      estructural,
      incierto,
      ...incierto ? { motivos: ["resolucion"] } : {},
      counters: countersDe[t],
      sondas
    });
  }
  return { tinta, fondo, piezas, huecos, piezaDe, huecoDe, madreDe, dFondo };
}
function repartir(celdas, n2, r) {
  if (celdas.length <= n2) return celdas;
  const elegidas = [celdas[0]];
  const d = celdas.map(() => Number.POSITIVE_INFINITY);
  while (elegidas.length < n2) {
    const u4 = elegidas[elegidas.length - 1];
    const [ux, uy] = [u4 % r.ancho, Math.floor(u4 / r.ancho)];
    let mejor = -1;
    for (let k = 0; k < celdas.length; k++) {
      const c = celdas[k];
      const dx = c % r.ancho - ux;
      const dy = Math.floor(c / r.ancho) - uy;
      d[k] = Math.min(d[k], dx * dx + dy * dy);
      if (mejor < 0 || d[k] > d[mejor]) mejor = k;
    }
    if (d[mejor] === 0) break;
    elegidas.push(celdas[mejor]);
  }
  return elegidas;
}
var redondear2 = (v2, d) => Number(v2.toFixed(d));
function huellaDe(a) {
  let h = 2166136261;
  for (let i = 0; i < a.length; i++) {
    h ^= a[i];
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
var esGeometria = (v2) => Array.isArray(v2) && (typeof v2[0] === "number" || Array.isArray(v2[0]) && typeof v2[0][0] === "number");
function congelar(v2, clave2 = "") {
  if (v2 && typeof v2 === "object" && !ArrayBuffer.isView(v2) && !Object.isFrozen(v2) && clave2 !== "regiones" && !esGeometria(v2)) {
    Object.freeze(v2);
    for (const k of Object.keys(v2))
      congelar(v2[k], k);
  }
  return v2;
}
var PRECISION2 = 4;
function cajaDePaths(p) {
  const c = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY
  };
  for (const a of p)
    for (const q of a) {
      c.minX = Math.min(c.minX, q.x);
      c.minY = Math.min(c.minY, q.y);
      c.maxX = Math.max(c.maxX, q.x);
      c.maxY = Math.max(c.maxY, q.y);
    }
  return c;
}
var seTocan = (a, b) => a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY;
function verdadDeCapas(capas, opciones) {
  const visibles = capas.filter((c) => c.alfa >= 0.05 && c.poligonos.length);
  const colores = [];
  for (const c of visibles) if (!colores.includes(c.color)) colores.push(c.color);
  const cajas = visibles.map((c) => cajaDePaths(c.poligonos));
  const todo = cajas.reduce(
    (t, c) => ({
      minX: Math.min(t.minX, c.minX),
      minY: Math.min(t.minY, c.minY),
      maxX: Math.max(t.maxX, c.maxX),
      maxY: Math.max(t.maxY, c.maxY)
    }),
    cajas[0] ?? { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  );
  const r = opciones.rejilla ?? rejillaPara(todo, 1);
  const etiquetas = new Uint16Array(r.ancho * r.alto);
  visibles.forEach(
    (c) => pintarAnillos(
      etiquetas,
      r,
      c.poligonos.map((a2) => a2.map((q) => [q.x, q.y])),
      colores.indexOf(c.color) + 1,
      "nonzero"
    )
  );
  const porColor = colores.map(() => []);
  const atomos = [];
  const aRegiones3 = (p) => p.length ? regionesDeRelleno(
    p.map((a2) => ({ puntos: a2.map((q) => [q.x, q.y]), cerrado: true })),
    "nonzero"
  ) : [];
  visibles.forEach((c, i) => {
    const encima = visibles.map((_, j) => j).filter(
      (j) => j > i && visibles[j].color !== c.color && seTocan(cajas[i], cajas[j])
    ).flatMap((j) => visibles[j].poligonos);
    const visto = encima.length ? differenceD(sanos(c.poligonos), sanos(encima), FillRule.NonZero, PRECISION2) : c.poligonos;
    porColor[colores.indexOf(c.color)].push(...visto);
    for (const region of aRegiones3(visto))
      atomos.push({ capa: c.indice, color: c.color, clase: "visible", region });
    if (encima.length)
      for (const region of aRegiones3(
        intersectD(sanos(c.poligonos), sanos(encima), FillRule.NonZero, PRECISION2)
      ))
        atomos.push({ capa: c.indice, color: c.color, clase: "oculto", region });
  });
  const regiones = porColor.map(
    (p) => p.length ? regionesDeRelleno(
      unionD(sanos(p), [], FillRule.NonZero, PRECISION2).map((a2) => ({
        puntos: a2.map((q) => [q.x, q.y]),
        cerrado: true
      })),
      "nonzero"
    ) : []
  );
  colores.forEach((color, k) => {
    const donde = localizadorDeRegiones(regiones[k]);
    for (const at of atomos) {
      if (at.clase !== "visible" || at.color !== color) continue;
      const p = puntoInterior2(at.region);
      const g = p ? donde(p) : -1;
      if (g >= 0) at.regionDeColor = g;
    }
  });
  const a = analizarPiezas(r, (i) => etiquetas[i] > 0, "t", opciones);
  const v2 = {
    version: 1,
    origen: "svg",
    rejilla: { ...r },
    resolucionMm: r.paso,
    bounds: {
      x: todo.minX,
      y: todo.minY,
      ancho: todo.maxX - todo.minX,
      alto: todo.maxY - todo.minY
    },
    colores,
    componentes: a.piezas,
    huecos: a.huecos,
    regiones,
    incertidumbre: {
      piezasInciertas: a.piezas.filter((p) => p.incierto).length,
      huecosInciertos: a.huecos.filter((h) => h.incierto).length,
      mmPorPx: r.paso
    },
    huella: huellaDe(etiquetas),
    etiquetas
  };
  congelar(v2);
  internos.set(v2, {
    tinta: a.tinta,
    fondo: a.fondo,
    piezaDe: a.piezaDe,
    huecoDe: a.huecoDe,
    madreDe: a.madreDe,
    dFondo: a.dFondo,
    atomos
  });
  return v2;
}
function inciertoPara(tipo, x) {
  if (!x.incierto) return false;
  const m = x.motivos ?? [];
  if (tipo === "HOLE" || m.includes("resolucion")) return true;
  if (tipo === "LOST") return m.includes("umbral-existencia");
  if (tipo === "MERGED") return m.includes("umbral-separacion");
  return m.includes("umbral-conexidad") || m.includes("umbral-existencia");
}
var UMBRALES_DE_TINTA = [0.25, 0.5, 0.75];
function fraccionDeTinta(datos, ancho, alto) {
  const n2 = ancho * alto;
  const f3 = new Float32Array(n2);
  const bordeDe = (x0, y0, x1, y1) => {
    const b = [];
    for (let x = x0; x <= x1; x++) b.push(y0 * ancho + x, y1 * ancho + x);
    for (let y = y0 + 1; y < y1; y++) b.push(y * ancho + x0, y * ancho + x1);
    return b;
  };
  let borde = bordeDe(0, 0, ancho - 1, alto - 1);
  let deQue = "borde";
  const transparente = borde.filter((i) => datos[4 * i + 3] < 128).length > borde.length / 2;
  if (transparente) {
    const diagnostico = diagnosticarFondo(datos, ancho, alto);
    if (diagnostico.tipo === "detected" && diagnostico.rect) {
      const r = diagnostico.rect;
      borde = bordeDe(r.x0, r.y0, r.x1, r.y1);
      deQue = "borde del rect\xE1ngulo opaco";
    } else {
      for (let i = 0; i < n2; i++) f3[i] = datos[4 * i + 3] / 255;
      return { f: f3, fondo: "transparente (alfa)" };
    }
  }
  const mediana3 = (k) => {
    const v2 = borde.map((i) => datos[4 * i + k]).sort((a, b) => a - b);
    return v2[Math.floor(v2.length / 2)];
  };
  const bg = [mediana3(0), mediana3(1), mediana3(2)];
  const d = new Float32Array(n2);
  for (let i = 0; i < n2; i++) {
    const a = datos[4 * i + 3] / 255;
    d[i] = a * Math.hypot(
      datos[4 * i] - bg[0],
      datos[4 * i + 1] - bg[1],
      datos[4 * i + 2] - bg[2]
    );
  }
  const ruido = borde.map((i) => d[i]).sort((a, b) => a - b);
  const piso = Math.max(24, 2 * ruido[Math.floor(0.95 * (ruido.length - 1))]);
  const filas = new Float32Array(n2);
  for (let y = 0; y < alto; y++)
    for (let x = 0; x < ancho; x++) {
      let m = 0;
      for (let k = Math.max(0, x - 2); k <= Math.min(ancho - 1, x + 2); k++)
        m = Math.max(m, d[y * ancho + k]);
      filas[y * ancho + x] = m;
    }
  for (let y = 0; y < alto; y++)
    for (let x = 0; x < ancho; x++) {
      let m = 0;
      for (let k = Math.max(0, y - 2); k <= Math.min(alto - 1, y + 2); k++)
        m = Math.max(m, filas[k * ancho + x]);
      const i = y * ancho + x;
      f3[i] = m < piso ? 0 : Math.min(1, d[i] / m);
    }
  return {
    f: f3,
    fondo: `color del ${deQue} rgb(${bg.join(",")}), ruido ${piso.toFixed(0)}`
  };
}
function verdadDeRaster(e) {
  const { f: f3, fondo } = fraccionDeTinta(e.datos, e.ancho, e.alto);
  const esquinas2 = [
    [0, 0],
    [e.ancho, 0],
    [0, e.alto],
    [e.ancho, e.alto]
  ].map((p) => e.aMm(p));
  const caja = {
    minX: Math.min(...esquinas2.map((p) => p[0])),
    minY: Math.min(...esquinas2.map((p) => p[1])),
    maxX: Math.max(...esquinas2.map((p) => p[0])),
    maxY: Math.max(...esquinas2.map((p) => p[1]))
  };
  const r = rejillaPara(caja, 1, e.mmPorPx);
  const muestra = new Float32Array(r.ancho * r.alto);
  for (let i = 0; i < muestra.length; i++) {
    const [px, py] = e.aPx(centroDeCelda(r, i));
    const x = px - 0.5;
    const y = py - 0.5;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = x - x0;
    const ty = y - y0;
    const v3 = (xx, yy) => xx < 0 || yy < 0 || xx >= e.ancho || yy >= e.alto ? 0 : f3[yy * e.ancho + xx];
    muestra[i] = (1 - ty) * ((1 - tx) * v3(x0, y0) + tx * v3(x0 + 1, y0)) + ty * ((1 - tx) * v3(x0, y0 + 1) + tx * v3(x0 + 1, y0 + 1));
  }
  const [bajo, medio3, alto] = UMBRALES_DE_TINTA;
  const etiquetas = new Uint16Array(muestra.length);
  for (let i = 0; i < muestra.length; i++) etiquetas[i] = muestra[i] >= medio3 ? 1 : 0;
  const a = analizarPiezas(r, (i) => etiquetas[i] > 0, "t", e, e.mmPorPx, false);
  const leidos = a.piezas.map(() => []);
  for (let i = 0; i < muestra.length; i++) {
    const t = a.tinta.etiquetas[i];
    const k = t ? a.piezaDe.get(t) : void 0;
    if (k === void 0) continue;
    const [px, py] = e.aPx(centroDeCelda(r, i));
    const x = px - 0.5;
    const y = py - 0.5;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = x - x0;
    const ty = y - y0;
    for (const [xx, yy, w] of [
      [x0, y0, (1 - tx) * (1 - ty)],
      [x0 + 1, y0, tx * (1 - ty)],
      [x0, y0 + 1, (1 - tx) * ty],
      [x0 + 1, y0 + 1, tx * ty]
    ]) {
      if (w <= 0 || xx < 0 || yy < 0 || xx >= e.ancho || yy >= e.alto) continue;
      const q = yy * e.ancho + xx;
      if (f3[q] > 0) leidos[k].push(q);
    }
  }
  const pixelesDePieza = leidos.map((l) => Uint32Array.from(new Set(l)).sort());
  const exigente = etiquetar(r.ancho, r.alto, (i) => muestra[i] >= alto, 8);
  const laxa = etiquetar(r.ancho, r.alto, (i) => muestra[i] >= bajo, 8);
  const fondoExigente = etiquetar(r.ancho, r.alto, (i) => muestra[i] < alto, 4);
  const fondoLaxo = etiquetar(r.ancho, r.alto, (i) => muestra[i] < bajo, 4);
  const exigentesDe = /* @__PURE__ */ new Map();
  const laxaDe = /* @__PURE__ */ new Map();
  const referenciasDeLaxa = /* @__PURE__ */ new Map();
  for (let i = 0; i < etiquetas.length; i++) {
    const t = a.tinta.etiquetas[i];
    if (!t) continue;
    const x = exigente.etiquetas[i];
    if (x) {
      const m = exigentesDe.get(t) ?? /* @__PURE__ */ new Map();
      m.set(x, (m.get(x) ?? 0) + 1);
      exigentesDe.set(t, m);
    }
    const l = laxa.etiquetas[i];
    if (l) {
      laxaDe.set(t, l);
      const s = referenciasDeLaxa.get(l) ?? /* @__PURE__ */ new Set();
      s.add(t);
      referenciasDeLaxa.set(l, s);
    }
  }
  const celda = r.paso * r.paso;
  for (const [t, k] of a.piezaDe) {
    const p = a.piezas[k];
    if (!p.estructural) continue;
    const exigentes = [...exigentesDe.get(t)?.values() ?? []].filter(
      (c) => c * celda >= Math.max(HUECO_MINIMO_MM2, 0.05 * p.areaMm2)
    );
    const l = laxaDe.get(t);
    const junta = [...l && referenciasDeLaxa.get(l) || []].some((u4) => u4 !== t);
    const motivos = [];
    if (!exigentes.length && junta) motivos.push("umbral-existencia");
    if (exigentes.length > 1) motivos.push("umbral-conexidad");
    if (junta) motivos.push("umbral-separacion");
    if (motivos.length) {
      p.incierto = true;
      p.motivos = motivos;
    }
  }
  const enLaxo = new Float64Array(a.fondo.n + 1);
  const abierto = new Uint8Array(a.fondo.n + 1);
  for (let i = 0; i < etiquetas.length; i++) {
    const fl = a.fondo.etiquetas[i];
    if (!fl || a.fondo.tocaBorde[fl]) continue;
    const b = fondoLaxo.etiquetas[i];
    if (b && !fondoLaxo.tocaBorde[b]) enLaxo[fl]++;
    const c = fondoExigente.etiquetas[i];
    if (c && fondoExigente.tocaBorde[c]) abierto[fl] = 1;
  }
  for (const [fl, k] of a.huecoDe) {
    const h = a.huecos[k];
    if (!h.counter) continue;
    const cerradoEnLaxo = enLaxo[fl] * celda >= Math.max(HUECO_MINIMO_MM2, 0.25 * h.areaMm2);
    const madre = a.madreDe[fl];
    const madreExigente = madre > 0 && (exigentesDe.get(madre)?.size ?? 0) > 0;
    const motivos = [];
    if (!cerradoEnLaxo) motivos.push("umbral-existencia");
    if (abierto[fl] && madreExigente) motivos.push("umbral-conexidad");
    if (motivos.length) {
      h.incierto = true;
      h.motivos = motivos;
    }
  }
  const v2 = {
    version: 1,
    origen: "raster",
    rejilla: { ...r },
    resolucionMm: Math.max(e.mmPorPx, r.paso),
    bounds: {
      x: caja.minX,
      y: caja.minY,
      ancho: caja.maxX - caja.minX,
      alto: caja.maxY - caja.minY
    },
    colores: ["tinta"],
    componentes: a.piezas,
    huecos: a.huecos,
    regiones: [],
    incertidumbre: {
      piezasInciertas: a.piezas.filter((p) => p.incierto).length,
      huecosInciertos: a.huecos.filter((h) => h.incierto).length,
      mmPorPx: e.mmPorPx,
      umbrales: [...UMBRALES_DE_TINTA],
      fondo
    },
    huella: huellaDe(etiquetas),
    etiquetas
  };
  congelar(v2);
  internos.set(v2, {
    tinta: a.tinta,
    fondo: a.fondo,
    piezaDe: a.piezaDe,
    huecoDe: a.huecoDe,
    madreDe: a.madreDe,
    dFondo: a.dFondo,
    fondoLaxo,
    pixelesDePieza
  });
  return v2;
}

// packages/bordado/src/verdad/comparar.ts
var ORDEN_DE_FRONTERA = {
  vectorizacion: 1,
  normalizacion: 2,
  ir: 3,
  dst: 4
};
var NOMBRE_DE_FRONTERA = {
  vectorizacion: "al vectorizar la imagen",
  normalizacion: "al normalizar y adaptar la geometr\xEDa",
  ir: "al decidir las puntadas",
  dst: "en el DST"
};
function pintarEstado(rejilla, frontera, capas) {
  const hilos = [];
  const etiquetas = new Uint16Array(rejilla.ancho * rejilla.alto);
  for (const c of capas) {
    let k = hilos.indexOf(c.hilo);
    if (k < 0) {
      hilos.push(c.hilo);
      k = hilos.length - 1;
    }
    pintarAnillos(etiquetas, rejilla, c.anillos, k + 1, c.regla);
  }
  return { frontera, etiquetas, hilos };
}
var FRACCION_QUE_QUEDA = 0.5;
var FRACCION_DE_TROZO = 0.05;
function cajaDeCeldas(r, c) {
  return {
    minX: r.x0 + c[0] * r.paso,
    minY: r.y0 + c[1] * r.paso,
    maxX: r.x0 + (c[2] + 1) * r.paso,
    maxY: r.y0 + (c[3] + 1) * r.paso
  };
}
function eventosDe(r, n2, estado) {
  const T = n2.verdad;
  const dentro2 = n2.dentro(estado);
  const otra = n2.otra?.(estado) ?? null;
  const S = etiquetar(r.ancho, r.alto, dentro2, 8);
  const celda = r.paso * r.paso;
  const minimo = HUECO_MINIMO_MM2 / celda;
  const ancho = S.n + 1;
  const hist = /* @__PURE__ */ new Map();
  const otraTinta = new Float64Array(T.tinta.n + 1);
  const vecina = (i) => {
    const x = i % r.ancho;
    const y = (i - x) / r.ancho;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= r.ancho || yy >= r.alto) continue;
        const s = S.etiquetas[yy * r.ancho + xx];
        if (s) return s;
      }
    return 0;
  };
  for (let i = 0; i < T.tinta.etiquetas.length; i++) {
    const t = T.tinta.etiquetas[i];
    if (!t) continue;
    const s = S.etiquetas[i] || vecina(i);
    if (s) hist.set(t * ancho + s, (hist.get(t * ancho + s) ?? 0) + 1);
    else if (otra?.(i)) otraTinta[t]++;
  }
  const porT = /* @__PURE__ */ new Map();
  const totalS = new Float64Array(ancho);
  for (const [k, c] of hist) {
    const t = Math.floor(k / ancho);
    const s = k % ancho;
    (porT.get(t) ?? porT.set(t, []).get(t)).push([s, c]);
    totalS[s] += c;
  }
  const eventos = [];
  const pieza = (t) => T.piezas[T.piezaDe.get(t) ?? -1];
  for (const [t] of T.piezaDe) {
    const p = pieza(t);
    if (!p?.estructural) continue;
    const area2 = T.tinta.areas[t];
    const trozos = porT.get(t) ?? [];
    const queda = trozos.reduce((s, [, c]) => s + c, 0);
    if (queda < FRACCION_QUE_QUEDA * area2) {
      const recoloreada = otra !== null && otraTinta[t] >= FRACCION_QUE_QUEDA * area2;
      eventos.push({
        tipo: recoloreada ? "COMPONENT_RECOLORED" : "COMPONENT_LOST",
        nivel: n2.nombre,
        piezas: [p.id],
        incierto: inciertoPara("LOST", p),
        caja: p.caja,
        metricas: {
          areaMm2: p.areaMm2,
          anchoMm: p.anchoMm,
          quedaFraccion: Number((queda / area2).toFixed(3))
        }
      });
      continue;
    }
    const suyos = trozos.filter(
      ([s, c]) => c >= Math.max(minimo, FRACCION_DE_TROZO * area2) && c >= 0.5 * totalS[s]
    );
    if (suyos.length > 1)
      eventos.push({
        tipo: "COMPONENT_SPLIT",
        nivel: n2.nombre,
        piezas: [p.id],
        incierto: inciertoPara("SPLIT", p),
        caja: p.caja,
        metricas: { areaMm2: p.areaMm2, anchoMm: p.anchoMm, trozos: suyos.length }
      });
  }
  const deS = /* @__PURE__ */ new Map();
  for (const [t, trozos] of porT) {
    const p = pieza(t);
    if (!p?.estructural) continue;
    for (const [s, c] of trozos)
      if (c >= Math.max(minimo, FRACCION_DE_TROZO * T.tinta.areas[t]))
        (deS.get(s) ?? deS.set(s, []).get(s)).push(t);
  }
  const puenteDe = (s, ts) => {
    const [x0, y0, x1, y1] = S.cajas[s];
    const miembros = new Set(ts);
    const celdas = [];
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const i = y * r.ancho + x;
        if (S.etiquetas[i] === s && !T.tinta.etiquetas[i]) celdas.push(i);
      }
    celdas.sort((a, b) => T.dFondo[a] - T.dFondo[b]);
    let maximoJunto = 1;
    let primero = { d: -1, i: -1 };
    let ultimo = { d: -1, i: -1 };
    const padre = /* @__PURE__ */ new Map();
    const piezasDe = /* @__PURE__ */ new Map();
    const raiz = (c) => {
      let x = c;
      while (padre.get(x) !== x) x = padre.get(x);
      let y = c;
      while (padre.get(y) !== x) {
        const z = padre.get(y);
        padre.set(y, x);
        y = z;
      }
      return x;
    };
    const unir2 = (a, b) => {
      const ra = raiz(a);
      const rb = raiz(b);
      if (ra === rb) return ra;
      padre.set(rb, ra);
      const pa = piezasDe.get(ra);
      for (const t of piezasDe.get(rb) ?? []) pa.add(t);
      piezasDe.delete(rb);
      return ra;
    };
    for (const c of celdas) {
      padre.set(c, c);
      const toca = /* @__PURE__ */ new Set();
      piezasDe.set(c, toca);
      const cx = c % r.ancho;
      const cy = (c - cx) / r.ancho;
      let raizC = c;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const xx = cx + dx;
          const yy = cy + dy;
          if (xx < 0 || yy < 0 || xx >= r.ancho || yy >= r.alto) continue;
          const v2 = yy * r.ancho + xx;
          if (S.etiquetas[v2] !== s) continue;
          const t = T.tinta.etiquetas[v2];
          if (t) {
            if (miembros.has(t)) piezasDe.get(raiz(raizC))?.add(t);
          } else if (padre.has(v2)) raizC = unir2(raizC, v2);
        }
      const juntas = piezasDe.get(raiz(raizC))?.size ?? 0;
      const antes = maximoJunto;
      maximoJunto = Math.max(maximoJunto, juntas);
      if (juntas > 1 && juntas > antes) {
        if (primero.i < 0) primero = { d: T.dFondo[c], i: c };
        ultimo = { d: T.dFondo[c], i: c };
      }
      if (maximoJunto >= miembros.size) break;
    }
    return { primero, ultimo };
  };
  for (const [s, ts] of deS) {
    if (ts.length < 2) continue;
    const ps = ts.map(pieza);
    const puente = puenteDe(s, ts);
    eventos.push({
      tipo: "COMPONENT_MERGED",
      nivel: n2.nombre,
      piezas: ps.map((p) => p.id).sort(),
      incierto: ps.some((p) => inciertoPara("MERGED", p)),
      caja: cajaDeCeldas(r, S.cajas[s]),
      metricas: {
        piezas: ts.length,
        /* El hueco más ancho y el más estrecho que se taparon para unirlas
           (0 si ya se tocaban en diagonal y no hubo que tapar nada). Una
           aproximación por grupos, no por cada par de piezas. */
        separacionMm: Number((2 * Math.max(0, puente.ultimo.d) * r.paso).toFixed(3)),
        separacionMinimaMm: Number((2 * Math.max(0, puente.primero.d) * r.paso).toFixed(3)),
        ...puente.ultimo.i >= 0 ? {
          puenteX: Number((r.x0 + (puente.ultimo.i % r.ancho + 0.5) * r.paso).toFixed(2)),
          puenteY: Number((r.y0 + (Math.floor(puente.ultimo.i / r.ancho) + 0.5) * r.paso).toFixed(2))
        } : {}
      }
    });
  }
  let counters = 0;
  const polos = [];
  if (n2.conHuecos) {
    const fuera = (i) => !dentro2(i);
    const B3 = etiquetar(r.ancho, r.alto, fuera, 4);
    const dB = distancia(r.ancho, r.alto, fuera);
    const maxB = new Float32Array(B3.n + 1);
    const poloB = new Int32Array(B3.n + 1).fill(-1);
    for (let i = 0; i < dB.length; i++) {
      const b = B3.etiquetas[i];
      if (b && dB[i] > maxB[b]) {
        maxB[b] = dB[i];
        poloB[b] = i;
      }
    }
    const esCounterS = (b) => !B3.tocaBorde[b] && esCounter(B3.areas[b] * celda, anchoDeDistancia(maxB[b], r.paso));
    for (let b = 1; b <= B3.n; b++)
      if (esCounterS(b)) {
        counters++;
        polos.push({
          polo: [r.x0 + (poloB[b] % r.ancho + 0.5) * r.paso, r.y0 + (Math.floor(poloB[b] / r.ancho) + 0.5) * r.paso],
          anchoMm: Number(anchoDeDistancia(maxB[b], r.paso).toFixed(3))
        });
      }
    const tintaEn = new Float64Array(T.fondo.n + 1);
    const fondoEn = /* @__PURE__ */ new Map();
    const eraHueco = new Float64Array(B3.n + 1);
    const eraHuecoLaxo = new Float64Array(B3.n + 1);
    for (let i = 0; i < T.fondo.etiquetas.length; i++) {
      const f3 = T.fondo.etiquetas[i];
      const b = B3.etiquetas[i];
      if (b && f3 && !T.fondo.tocaBorde[f3]) eraHueco[b]++;
      const l = n2.fondoLaxo?.etiquetas[i];
      if (b && l && !n2.fondoLaxo?.tocaBorde[l]) eraHuecoLaxo[b]++;
      if (!f3 || T.fondo.tocaBorde[f3]) continue;
      if (!b) tintaEn[f3]++;
      else {
        const m = fondoEn.get(f3) ?? fondoEn.set(f3, /* @__PURE__ */ new Map()).get(f3);
        m.set(b, (m.get(b) ?? 0) + 1);
      }
    }
    const siguenEn = /* @__PURE__ */ new Map();
    for (const [f3, k] of T.huecoDe) {
      const h = T.huecos[k];
      if (!h.counter) continue;
      const area2 = T.fondo.areas[f3];
      const restos = [...fondoEn.get(f3) ?? /* @__PURE__ */ new Map()].filter(
        ([, c]) => c >= Math.max(minimo, FRACCION_DE_TROZO * area2)
      );
      const sigue = restos.some(([b]) => esCounterS(b));
      const abierto = !sigue && restos.some(([b]) => B3.tocaBorde[b]);
      if (!sigue) {
        eventos.push({
          tipo: "HOLE_LOST",
          nivel: n2.nombre,
          piezas: [h.id],
          incierto: h.incierto,
          caja: h.caja,
          metricas: {
            areaMm2: h.areaMm2,
            anchoMm: h.anchoMm,
            abierto: abierto ? 1 : 0,
            tintaFraccion: Number((tintaEn[f3] / area2).toFixed(3))
          }
        });
        continue;
      }
      const [dondeSigue] = restos.filter(([b]) => esCounterS(b)).reduce((m, x) => x[1] > m[1] ? x : m);
      (siguenEn.get(dondeSigue) ?? siguenEn.set(dondeSigue, []).get(dondeSigue)).push({ h });
      const partes = restos.filter(
        ([b, c]) => esCounterS(b) && c >= Math.max(minimo, FRACCION_DE_TROZO * area2)
      );
      if (partes.length > 1)
        eventos.push({
          tipo: "HOLE_CREATED",
          nivel: n2.nombre,
          piezas: [h.id],
          incierto: h.incierto,
          caja: h.caja,
          metricas: { areaMm2: h.areaMm2, partes: partes.length }
        });
    }
    for (const juntos of siguenEn.values()) {
      if (juntos.length < 2) continue;
      const [queda, ...perdidos] = [...juntos].sort(
        (a, b) => b.h.areaMm2 - a.h.areaMm2 || (a.h.id < b.h.id ? -1 : 1)
      );
      for (const { h } of perdidos)
        eventos.push({
          tipo: "HOLE_LOST",
          nivel: n2.nombre,
          piezas: [h.id],
          incierto: h.incierto || queda.h.incierto,
          caja: h.caja,
          metricas: { areaMm2: h.areaMm2, anchoMm: h.anchoMm, abierto: 0, fundido: 1 }
        });
    }
    for (let b = 1; b <= B3.n; b++) {
      if (!esCounterS(b) || eraHueco[b] >= 0.5 * B3.areas[b]) continue;
      eventos.push({
        tipo: "HOLE_CREATED",
        nivel: n2.nombre,
        piezas: [],
        /* Un hueco nuevo de menos de dos celdas no lo afirma la rejilla; uno
           que la imagen ya cerraba con poca tinta exigida, tampoco. */
        incierto: maxB[b] < 2 || eraHuecoLaxo[b] >= 0.5 * B3.areas[b],
        caja: cajaDeCeldas(r, B3.cajas[b]),
        metricas: {
          areaMm2: Number((B3.areas[b] * celda).toFixed(4)),
          anchoMm: Number(anchoDeDistancia(maxB[b], r.paso).toFixed(3))
        }
      });
    }
  }
  const componentes3 = S.areas.filter((a, s) => s > 0 && a >= minimo).length;
  return { eventos, componentes: componentes3, counters, polos };
}
var seTocan2 = (a, b) => a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY;
function mismo(a, b) {
  if (a.tipo !== b.tipo || a.nivel !== b.nivel) return false;
  if (a.piezas.length || b.piezas.length)
    return a.piezas.join() === b.piezas.join();
  return seTocan2(a.caja, b.caja);
}
function compararConVerdad(verdad, estados, opciones) {
  const t0 = performance.now();
  const r = verdad.rejilla;
  const interno = internoDe(verdad);
  const niveles = [
    {
      nombre: "tinta",
      verdad: {
        tinta: interno.tinta,
        fondo: interno.fondo,
        piezas: verdad.componentes,
        huecos: verdad.huecos,
        piezaDe: interno.piezaDe,
        huecoDe: interno.huecoDe,
        madreDe: interno.madreDe,
        dFondo: interno.dFondo
      },
      rejilla: r,
      recortar: (e) => e,
      dentro: (e) => (i) => e.etiquetas[i] > 0,
      otra: null,
      conHuecos: true,
      fondoLaxo: interno.fondoLaxo
    }
  ];
  if (verdad.origen === "svg" && verdad.colores.length > 1) {
    const hiloDe = opciones.hiloDe ?? ((c) => c);
    const hiloDeEtiqueta = ["", ...verdad.colores.map(hiloDe)];
    for (const hilo of [...new Set(hiloDeEtiqueta.slice(1))]) {
      let [i0, j0, i1, j1] = [r.ancho, r.alto, -1, -1];
      const marcar = (i) => {
        const x = i % r.ancho;
        const y = (i - x) / r.ancho;
        if (x < i0) i0 = x;
        if (x > i1) i1 = x;
        if (y < j0) j0 = y;
        if (y > j1) j1 = y;
      };
      for (let i = 0; i < verdad.etiquetas.length; i++)
        if (hiloDeEtiqueta[verdad.etiquetas[i]] === hilo) marcar(i);
      for (const e of estados) {
        const k = e.hilos.indexOf(hilo) + 1;
        if (k > 0) {
          for (let i = 0; i < e.etiquetas.length; i++) if (e.etiquetas[i] === k) marcar(i);
        }
      }
      if (i1 < 0) continue;
      i0 = Math.max(0, i0 - 1);
      j0 = Math.max(0, j0 - 1);
      i1 = Math.min(r.ancho - 1, i1 + 1);
      j1 = Math.min(r.alto - 1, j1 + 1);
      const sub = {
        x0: r.x0 + i0 * r.paso,
        y0: r.y0 + j0 * r.paso,
        paso: r.paso,
        ancho: i1 - i0 + 1,
        alto: j1 - j0 + 1
      };
      const recortar2 = (e) => {
        const etiquetas = new Uint16Array(sub.ancho * sub.alto);
        for (let y = 0; y < sub.alto; y++)
          etiquetas.set(
            e.etiquetas.subarray((j0 + y) * r.ancho + i0, (j0 + y) * r.ancho + i0 + sub.ancho),
            y * sub.ancho
          );
        return { ...e, etiquetas };
      };
      const propia = recortar2({ frontera: "ir", etiquetas: verdad.etiquetas, hilos: [] });
      const dentroV = (i) => hiloDeEtiqueta[propia.etiquetas[i]] === hilo;
      niveles.push({
        nombre: hilo,
        rejilla: sub,
        recortar: recortar2,
        verdad: analizarPiezas(sub, dentroV, `${hilo.slice(1)}-`, opciones),
        dentro: (e) => {
          const k = e.hilos.indexOf(hilo) + 1;
          return (i) => k > 0 && e.etiquetas[i] === k;
        },
        otra: (e) => {
          const k = e.hilos.indexOf(hilo) + 1;
          return (i) => e.etiquetas[i] > 0 && e.etiquetas[i] !== k;
        },
        conHuecos: false
      });
    }
  }
  const porEstado = [];
  let countersFinales = [];
  const betti = [
    {
      frontera: "original",
      componentes: verdad.componentes.filter((p) => p.areaMm2 >= HUECO_MINIMO_MM2).length,
      counters: verdad.huecos.filter((h) => h.counter).length
    }
  ];
  for (const e of estados) {
    const todos = [];
    for (const n2 of niveles) {
      const x = eventosDe(n2.rejilla, n2, n2.recortar(e));
      todos.push(...x.eventos);
      if (n2.nombre === "tinta") {
        betti.push({ frontera: e.frontera, componentes: x.componentes, counters: x.counters });
        countersFinales = x.polos;
      }
    }
    porEstado.push(todos);
  }
  const divergencias = [];
  const ultimo = porEstado.length - 1;
  for (const ev of porEstado[ultimo] ?? []) {
    let desde = ultimo;
    while (desde > 0 && porEstado[desde - 1].some((x) => mismo(x, ev))) desde--;
    divergencias.push({ ...ev, frontera: estados[desde].frontera });
  }
  const final = {};
  for (const p of verdad.componentes) if (p.estructural) final[p.id] = "conservada";
  for (const h of verdad.huecos) if (h.counter) final[h.id] = "conservada";
  for (const d of divergencias)
    if (d.nivel === "tinta" && d.tipo !== "COMPONENT_RECOLORED")
      for (const id of d.piezas) final[id] = "divergente";
  return {
    divergencias,
    final,
    betti,
    countersFinales,
    ms: Math.round(performance.now() - t0)
  };
}
var MENSAJE = {
  COMPONENT_LOST: "Una pieza del dise\xF1o original desaparece",
  COMPONENT_SPLIT: "Una pieza del dise\xF1o original queda partida en varias",
  COMPONENT_MERGED: "Piezas separadas del dise\xF1o original quedan unidas",
  HOLE_LOST: "Un counter (hueco) del dise\xF1o original se tapa, se abre o se funde con otro",
  HOLE_CREATED: "Aparece un hueco que el dise\xF1o original no ten\xEDa"
};
function incidenciasTopologicas(verdad, c) {
  const salida2 = [];
  const ciertas = c.divergencias.filter((d) => !d.incierto && d.tipo !== "COMPONENT_RECOLORED");
  for (const tipo of Object.keys(MENSAJE)) {
    const ds = ciertas.filter((d) => d.tipo === tipo);
    if (!ds.length) continue;
    const fronteras = [...new Set(ds.map((d) => d.frontera))];
    salida2.push({
      code: `TOPOLOGY_${tipo}`,
      message: `${MENSAJE[tipo]} ${fronteras.map((f3) => NOMBRE_DE_FRONTERA[f3]).join(" y ")} (${ds.length} ${ds.length === 1 ? "caso" : "casos"}; referencia: ${verdad.origen === "raster" ? "la imagen original" : "el SVG original"}).`,
      severity: "review",
      metrics: {
        casos: ds.length,
        ...tipo === "COMPONENT_MERGED" ? {
          separacionMaximaMm: Math.max(...ds.map((d) => d.metricas.separacionMm ?? 0)),
          separacionMinimaMm: Math.min(...ds.map((d) => d.metricas.separacionMinimaMm ?? 0))
        } : {},
        primeraFrontera: Math.min(...ds.map((d) => ORDEN_DE_FRONTERA[d.frontera])),
        ...Object.fromEntries(
          fronteras.map((f3) => [`en_${f3}`, ds.filter((d) => d.frontera === f3).length])
        )
      }
    });
  }
  const inciertas = c.divergencias.filter((d) => d.incierto && d.tipo !== "COMPONENT_RECOLORED");
  if (inciertas.length)
    salida2.push({
      code: "STRUCTURE_UNCERTAIN",
      message: `${inciertas.length} cambio${inciertas.length === 1 ? "" : "s"} de estructura en piezas que ${verdad.origen === "raster" ? `la imagen (${verdad.incertidumbre.mmPorPx.toFixed(3)} mm/px) no resuelve` : "la rejilla de an\xE1lisis no resuelve"}: no se puede afirmar que el resultado conserve el dise\xF1o.`,
      severity: "review",
      metrics: {
        casos: inciertas.length,
        mmPorPx: Number(verdad.incertidumbre.mmPorPx.toFixed(4)),
        primeraFrontera: Math.min(...inciertas.map((d) => ORDEN_DE_FRONTERA[d.frontera]))
      }
    });
  const recoloreadas = c.divergencias.filter((d) => d.tipo === "COMPONENT_RECOLORED");
  if (recoloreadas.length)
    salida2.push({
      code: "TOPOLOGY_COMPONENT_RECOLORED",
      message: `${recoloreadas.length} pieza${recoloreadas.length === 1 ? "" : "s"} de un color se ve${recoloreadas.length === 1 ? "" : "n"} de otro (queda tinta, cambia el hilo).`,
      severity: "info",
      metrics: { casos: recoloreadas.length }
    });
  const { piezasInciertas, huecosInciertos } = verdad.incertidumbre;
  if (!inciertas.length && piezasInciertas + huecosInciertos > 0)
    salida2.push({
      code: "STRUCTURE_RESOLUTION_LIMITED",
      message: `${piezasInciertas + huecosInciertos} estructura${piezasInciertas + huecosInciertos === 1 ? "" : "s"} de la ${verdad.origen === "raster" ? "imagen" : "fuente"} no se puede${piezasInciertas + huecosInciertos === 1 ? "" : "n"} afirmar a esta resoluci\xF3n; no cambiaron, pero su forma exacta es incierta.`,
      severity: "info",
      metrics: {
        piezasInciertas,
        huecosInciertos,
        mmPorPx: Number(verdad.incertidumbre.mmPorPx.toFixed(4))
      }
    });
  return salida2;
}

// packages/bordado/src/vector/detalles.ts
var DECIMALES4 = 4;
var aPath4 = (p) => p.map(([x, y]) => ({ x, y }));
var aPaths4 = (r) => [r.exterior, ...r.huecos].map(aPath4);
var aRegiones2 = (p) => regionesDeRelleno(
  p.map((a) => ({
    puntos: a.map((q) => [q.x, q.y]),
    cerrado: true
  })),
  "nonzero"
);
var crecer2 = (p, d) => p.length ? inflatePathsD(
  sanos(p),
  d,
  JoinType.Round,
  EndType.Polygon,
  2,
  DECIMALES4,
  5e-3
) : [];
var LIMITES_DE_DETALLE = {
  /** Hasta qué distancia de su vecina del mismo hilo un detalle se le une. */
  fusionMm: 0.3,
  /** Lo más que se engrosa un detalle, por lado. */
  engroseMm: 0.15,
  /**
   * Un detalle esencial —el punto de una "i"— se cose como punto hasta este
   * mínimo: el hilo ya mide 0.4 mm, y un punto de hilo de 0.35 mm se lee.
   */
  puntoMinimoEsencialMm2: 0.1,
  /** Un detalle de esta área o más se ve: si se elimina, es una pérdida visible. */
  visibleMm2: 0.2,
  /** Largo de la puntada de un punto. */
  largoPuntoMm: 0.8,
  /** Una línea de un detalle se cose si mide esto o más; si no, no se lee como línea. */
  largoLineaMm: 2,
  /** Y si es esencial, desde esto. */
  largoLineaEsencialMm: 1,
  /** Formas parecidas desde las que un detalle es de un conjunto (decorativo). */
  repetidas: 5,
  /** Un esencial mide al menos esta fracción del trazo típico del diseño. */
  fraccionDelTrazo: 0.4,
  /** Radio mínimo en que otros detalles hacen de uno parte de un grupo. */
  grupoMm: 1
};
function ejePrincipal(r) {
  const p = r.exterior;
  let cx = 0;
  let cy = 0;
  for (const [x, y] of p) {
    cx += x;
    cy += y;
  }
  cx /= p.length;
  cy /= p.length;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const [x, y] of p) {
    sxx += (x - cx) ** 2;
    syy += (y - cy) ** 2;
    sxy += (x - cx) * (y - cy);
  }
  const angulo = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const u4 = [Math.cos(angulo), Math.sin(angulo)];
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let minN = Number.POSITIVE_INFINITY;
  let maxN = Number.NEGATIVE_INFINITY;
  for (const [x, y] of p) {
    const s = (x - cx) * u4[0] + (y - cy) * u4[1];
    const t = -(x - cx) * u4[1] + (y - cy) * u4[0];
    min = Math.min(min, s);
    max = Math.max(max, s);
    minN = Math.min(minN, t);
    maxN = Math.max(maxN, t);
  }
  return {
    centro: [cx, cy],
    u: u4,
    desde: min,
    hasta: max,
    largo: max - min,
    ancho: maxN - minN
  };
}
function hueco(a, vecinas, hasta) {
  const caja = cajaDeRegion(a);
  const cerca = vecinas.filter((v2) => {
    const c = cajaDeRegion(v2);
    return c.minX - hasta <= caja.maxX && caja.minX - hasta <= c.maxX && c.minY - hasta <= caja.maxY && caja.minY - hasta <= c.maxY;
  });
  if (!cerca.length) return null;
  for (const g of [0.1, 0.2, hasta]) {
    const crecido = crecer2(aPaths4(a), g);
    for (const v2 of cerca)
      if (intersectD(
        sanos(crecido),
        sanos(aPaths4(v2)),
        FillRule.NonZero,
        DECIMALES4
      ).length)
        return { distancia: g, vecina: v2 };
  }
  return null;
}
function adaptarDetalles(candidatos, regionesPorBloque, opciones) {
  const L = LIMITES_DE_DETALLE;
  const simplificaciones = [];
  const nuevas = [];
  const corridos = [];
  let perdidoMm2 = 0;
  let perdidoVisibleMm2 = 0;
  let esencialesPerdidos = 0;
  let mayorPerdido = null;
  const destinos = [];
  const medidas = candidatos.map((c) => {
    const area2 = areaDeRegion(c.region);
    const eje = ejePrincipal(c.region);
    const largo = [c.region.exterior, ...c.region.huecos].reduce(
      (t, a) => t + perimetro(a),
      0
    );
    const compacidad = 4 * Math.PI * area2 / Math.max(largo * largo, 1e-12);
    return {
      area: area2,
      eje,
      /* En una tira fina 2A/P es su ancho y es estable; en una forma
         compacta subestima (en un círculo da el radio): ahí, el inscrito. */
      ancho: c.fina && compacidad < 0.45 ? 2 * area2 / Math.max(largo, 1e-9) : anchoInscrito(c.region, 4),
      compacidad
    };
  });
  const repetidas = candidatos.map(
    (c, i) => candidatos.filter(
      (o, j) => j !== i && o.bloque === c.bloque && !o.fina && medidas[j].area >= 0.5 * medidas[i].area && medidas[j].area <= 2 * medidas[i].area
    ).length
  );
  const agrupadas = candidatos.map(
    (_, i) => candidatos.filter((_o, j) => {
      if (j === i) return false;
      const [ax, ay] = medidas[i].eje.centro;
      const [bx, by] = medidas[j].eje.centro;
      return Math.hypot(ax - bx, ay - by) <= Math.max(L.grupoMm, 3 * medidas[i].eje.largo);
    }).length >= 2
  );
  const orden = [...candidatos.keys()].sort(
    (a, b) => medidas[b].area - medidas[a].area
  );
  const deUnPunto = (i) => {
    const m = medidas[i];
    const { centro, u: u4, desde, hasta } = m.eje;
    const medio3 = [centro[0] + u4[0] * ((desde + hasta) / 2), centro[1] + u4[1] * ((desde + hasta) / 2)];
    const mitad = Math.min(L.largoPuntoMm, m.eje.largo) / 2;
    return {
      p0: [medio3[0] - u4[0] * mitad, medio3[1] - u4[1] * mitad],
      p1: [medio3[0] + u4[0] * mitad, medio3[1] + u4[1] * mitad],
      mitad
    };
  };
  const huellaDePunto = (i) => {
    const { p0, p1 } = deUnPunto(i);
    return unionD(
      sanos([
        ...inflatePathsD(
          [[{ x: p0[0], y: p0[1] }, { x: p1[0], y: p1[1] }]],
          Math.max(HILO_ASENTADO_MM, medidas[i].ancho) / 2,
          JoinType.Round,
          EndType.Round,
          2,
          DECIMALES4
        ),
        ...aPaths4(candidatos[i].region)
      ]),
      [],
      FillRule.NonZero,
      DECIMALES4
    );
  };
  const suelta = (i) => !candidatos[i].fina && medidas[i].compacidad >= 0.3 && medidas[i].area >= L.puntoMinimoEsencialMm2;
  const maximo = candidatos.map(
    (c, i) => suelta(i) ? unionD(
      sanos([...crecer2(aPaths4(c.region), L.engroseMm), ...huellaDePunto(i)]),
      [],
      FillRule.NonZero,
      DECIMALES4
    ) : aPaths4(c.region)
  );
  const cajaDe4 = (p) => {
    const xs = p.flatMap((q) => q.map((v2) => v2.x));
    const ys = p.flatMap((q) => q.map((v2) => v2.y));
    return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
  };
  const cajas = maximo.map(cajaDe4);
  const previas = regionesPorBloque.map((l) => [...l]);
  const separada = (i) => {
    const conHolgura = crecer2(maximo[i], COUNTER_MINIMO_MM);
    if (!conHolgura.length) return true;
    const caja = cajaDe4(conHolgura);
    const toca = (k) => !(k.minX > caja.maxX || caja.minX > k.maxX || k.minY > caja.maxY || caja.minY > k.maxY);
    const otras = [
      ...previas.flat().filter((r) => toca(cajaDeRegion(r))).flatMap(aPaths4),
      ...candidatos.flatMap((_o, j) => j !== i && toca(cajas[j]) ? maximo[j] : [])
    ];
    return !otras.length || !intersectD(sanos(conHolgura), sanos(otras), FillRule.NonZero, DECIMALES4).length;
  };
  for (const i of orden) {
    const c = candidatos[i];
    const m = medidas[i];
    const comoUnTrazo = opciones.trazoTipicoMm === void 0 || m.ancho >= L.fraccionDelTrazo * opciones.trazoTipicoMm;
    const rol = c.fina && m.area < 0.05 || m.area < 0.02 ? "no-esencial" : repetidas[i] + 1 >= L.repetidas || agrupadas[i] ? "decorativo" : m.compacidad >= 0.45 && comoUnTrazo && c.madre && areaDeRegion(c.madre) <= m.area * 1.2 ? "esencial" : "no-esencial";
    const registro = (type, resultingAreaMm2, visualImpact, motivo) => simplificaciones.push({
      type,
      role: rol,
      originalAreaMm2: Number(m.area.toFixed(3)),
      resultingAreaMm2: Number(resultingAreaMm2.toFixed(3)),
      visualImpact,
      motivo,
      color: c.color,
      bloque: c.bloque,
      centro: m.eje.centro,
      anchoMm: Number(m.ancho.toFixed(3)),
      largoMm: Number(m.eje.largo.toFixed(3))
    });
    const eje = (acortar = 0.1) => {
      const { centro, u: u4, desde, hasta } = m.eje;
      const a = desde + Math.min(acortar, (hasta - desde) / 4);
      const b = hasta - Math.min(acortar, (hasta - desde) / 4);
      return [
        [centro[0] + u4[0] * a, centro[1] + u4[1] * a],
        [centro[0] + u4[0] * b, centro[1] + u4[1] * b]
      ];
    };
    const largoDeLinea = rol === "esencial" ? L.largoLineaEsencialMm : L.largoLineaMm;
    if (c.fina && m.eje.largo >= largoDeLinea) {
      corridos.push({
        bloque: c.bloque,
        puntos: eje(0.05),
        motivo: `l\xEDnea de ${m.ancho.toFixed(2)} mm, m\xE1s fina que el hilo: un corrido de ${m.eje.largo.toFixed(1)} mm por su eje, de una pasada`,
        region: c.region,
        repeticiones: 0
      });
      registro(
        "corrido",
        m.eje.largo * 0.4,
        "bajo",
        `l\xEDnea de ${m.ancho.toFixed(2)} mm cosida como corrido`
      );
      destinos.push({ candidato: i, accion: "corrido" });
      continue;
    }
    if (c.fina && m.compacidad < 0.45 || m.area < 0.02) {
      perdidoMm2 += m.area;
      destinos.push({ candidato: i, accion: "eliminar" });
      registro(
        "eliminar",
        0,
        "ninguno",
        `resto de ${m.ancho.toFixed(2)} mm sin cuerpo para el hilo`
      );
      continue;
    }
    if (opciones.piezaAPieza !== false && suelta(i) && separada(i)) {
      let cosida = false;
      if (m.compacidad >= 0.45 && m.ancho >= 0.5)
        for (const d of [0.05, 0.1, L.engroseMm]) {
          const crecida = aRegiones2(crecer2(aPaths4(c.region), d));
          const area2 = crecida.reduce((t, x) => t + areaDeRegion(x), 0);
          if (crecida.length !== 1 || area2 < opciones.minAreaMm2) continue;
          nuevas.push({ bloque: c.bloque, region: crecida[0] });
          regionesPorBloque[c.bloque]?.push(crecida[0]);
          destinos.push({ candidato: i, accion: "engrosar", region: crecida[0] });
          registro(
            "engrosar",
            area2,
            "bajo",
            `${m.area.toFixed(2)} mm\xB2, poco para el hilo: engrosado ${d} mm por lado, pieza propia`
          );
          cosida = true;
          break;
        }
      if (cosida) continue;
      const { p0, p1, mitad } = deUnPunto(i);
      corridos.push({
        bloque: c.bloque,
        puntos: [p0, p1],
        motivo: `pieza de ${m.area.toFixed(2)} mm\xB2 y ${m.ancho.toFixed(2)} mm: un punto de hilo propio (una puntada de ${(2 * mitad).toFixed(1)} mm cosida tres veces), separado de sus vecinas`,
        region: c.region,
        repeticiones: 1
      });
      destinos.push({ candidato: i, accion: "punto" });
      registro(
        "punto",
        2 * mitad * 0.4,
        "bajo",
        `${m.area.toFixed(2)} mm\xB2 cosido como un punto de hilo propio`
      );
      continue;
    }
    if (rol !== "esencial") {
      const cerca = hueco(
        c.region,
        regionesPorBloque[c.bloque] ?? [],
        L.fusionMm
      );
      if (cerca) {
        const r = cerca.distancia / 2 + 0.05;
        const juntas = crecer2(
          crecer2(
            unionD(
              sanos([...aPaths4(c.region), ...aPaths4(cerca.vecina)]),
              [],
              FillRule.NonZero,
              DECIMALES4
            ),
            r
          ),
          -r
        );
        const puente = intersectD(
          sanos(juntas),
          crecer2(aPaths4(c.region), cerca.distancia + r),
          FillRule.NonZero,
          DECIMALES4
        );
        const fundida = aRegiones2(
          unionD(
            sanos([...aPaths4(cerca.vecina), ...puente, ...aPaths4(c.region)]),
            [],
            FillRule.NonZero,
            DECIMALES4
          )
        );
        if (fundida.length === 1) {
          nuevas.push({
            bloque: c.bloque,
            region: fundida[0],
            reemplaza: cerca.vecina
          });
          const lista2 = regionesPorBloque[c.bloque];
          lista2[lista2.indexOf(cerca.vecina)] = fundida[0];
          destinos.push({
            candidato: i,
            accion: "fusionar",
            region: fundida[0],
            reemplaza: cerca.vecina
          });
          registro(
            "fusionar",
            m.area,
            "bajo",
            `a ${cerca.distancia.toFixed(1)} mm de una forma del mismo hilo: se une a ella con un puente`
          );
          continue;
        }
      }
    }
    if (m.compacidad >= 0.45 && m.ancho >= 0.5) {
      let engrosado = false;
      for (const d of [0.05, 0.1, L.engroseMm]) {
        const crecida = aRegiones2(crecer2(aPaths4(c.region), d));
        const area2 = crecida.reduce((t, x) => t + areaDeRegion(x), 0);
        if (crecida.length === 1 && area2 >= opciones.minAreaMm2) {
          nuevas.push({ bloque: c.bloque, region: crecida[0] });
          regionesPorBloque[c.bloque]?.push(crecida[0]);
          destinos.push({ candidato: i, accion: "engrosar", region: crecida[0] });
          registro(
            "engrosar",
            area2,
            "bajo",
            `${m.area.toFixed(2)} mm\xB2, poco para el hilo: engrosado ${d} mm por lado`
          );
          engrosado = true;
          break;
        }
      }
      if (engrosado) continue;
    }
    if (rol === "esencial" && m.compacidad >= 0.3 && m.area >= L.puntoMinimoEsencialMm2) {
      const [a, b] = eje(0);
      const medio3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const mitad = Math.min(L.largoPuntoMm, m.eje.largo) / 2;
      const u4 = m.eje.u;
      const p0 = [medio3[0] - u4[0] * mitad, medio3[1] - u4[1] * mitad];
      const p1 = [medio3[0] + u4[0] * mitad, medio3[1] + u4[1] * mitad];
      corridos.push({
        bloque: c.bloque,
        puntos: [p0, p1],
        motivo: `detalle esencial de ${m.area.toFixed(2)} mm\xB2: un punto de hilo (una puntada de ${(2 * mitad).toFixed(1)} mm cosida tres veces)`,
        region: c.region,
        repeticiones: 1
      });
      destinos.push({ candidato: i, accion: "punto" });
      registro(
        "punto",
        2 * mitad * 0.4,
        "bajo",
        `${m.area.toFixed(2)} mm\xB2 cosido como un punto de hilo`
      );
      continue;
    }
    if (m.eje.largo >= 3 * Math.max(m.ancho, 0.1) && m.eje.largo >= largoDeLinea) {
      corridos.push({
        bloque: c.bloque,
        puntos: eje(0.1),
        motivo: `trazo de ${m.ancho.toFixed(2)} mm y ${m.eje.largo.toFixed(1)} mm: un corrido por su eje`,
        region: c.region,
        repeticiones: m.ancho < 0.5 ? 0 : 1
      });
      destinos.push({ candidato: i, accion: "corrido" });
      registro(
        "corrido",
        m.eje.largo * 0.4,
        "bajo",
        `trazo peque\xF1o cosido como corrido`
      );
      continue;
    }
    perdidoMm2 += m.area;
    destinos.push({ candidato: i, accion: "eliminar" });
    const visible = rol !== "no-esencial" || m.area >= L.visibleMm2;
    if (visible) {
      perdidoVisibleMm2 += m.area;
      if (!mayorPerdido || m.area > mayorPerdido.areaMm2)
        mayorPerdido = { areaMm2: m.area, anchoMm: m.ancho };
    }
    if (rol === "esencial") esencialesPerdidos++;
    registro(
      "eliminar",
      0,
      rol === "esencial" ? "alto" : rol === "decorativo" ? m.area >= 0.3 ? "medio" : "bajo" : visible ? "bajo" : "ninguno",
      rol === "decorativo" ? `${m.area.toFixed(2)} mm\xB2 y ${m.ancho.toFixed(2)} mm, de un conjunto: a este tama\xF1o no cabe ni engrosado, y un punto suelto por pieza no es el mismo dibujo` : `${m.area.toFixed(2)} mm\xB2 y ${m.ancho.toFixed(2)} mm: no lo dibuja ninguna puntada a este tama\xF1o`
    );
  }
  return {
    simplificaciones,
    nuevas,
    corridos,
    perdidoMm2,
    perdidoVisibleMm2,
    esencialesPerdidos,
    mayorPerdido,
    destinos
  };
}

// packages/bordado/src/vector/huecos.ts
var HUECO_QUE_CIERRA_EL_RELLENO_MM = 1.6;
var LIBRE_EN_EL_POLO_MM = COUNTER_MINIMO_MM / 2;
var MEDIO_HILO_MM = HILO_ASENTADO_MM / 2;
var CONTACTO_MM = 0.25;
var aPath5 = (p) => p.map(([x, y]) => ({ x, y }));
var puntoDeHueco = (anillo) => puntoInterior2({ exterior: [...anillo].reverse(), huecos: [] });
var anchoDeHueco = (anillo) => anchoInscrito({ exterior: [...anillo].reverse(), huecos: [] });
function protegerCounters(ir, origenes, esTela = () => true) {
  const cambios = [];
  const huecosDe2 = /* @__PURE__ */ new Map();
  const esCounter2 = (anillo) => {
    const q = puntoDeHueco(anillo);
    return !!q && esTela(q);
  };
  const huecosDeRegion = (r) => {
    let h = huecosDe2.get(r);
    if (!h) {
      h = r.huecos.filter(esCounter2).map((anillo) => ({
        anillo,
        ancho: anchoDeHueco(anillo),
        paths: [aPath5(anillo)]
      }));
      huecosDe2.set(r, h);
    }
    return h;
  };
  const registrar = (i, o, nueva, anillo, ancho, motivo) => {
    const xs = anillo.map((p) => p[0]);
    const ys = anillo.map((p) => p[1]);
    cambios.push({
      tipo: "compensacion-por-counter",
      centro: [
        (Math.min(...xs) + Math.max(...xs)) / 2,
        (Math.min(...ys) + Math.max(...ys)) / 2
      ],
      antesMm2: 0,
      despuesMm2: 0,
      motivo,
      anchoMm: Number(ancho.toFixed(3)),
      objeto: i,
      compensacionAntesMm: o.compensacion,
      compensacionDespuesMm: nueva
    });
    o.compensacion = nueva;
  };
  ir.forEach((o, i) => {
    if (o.rol === "traslado" || o.compensacion <= 0) return;
    if (o.tipo === "fill") {
      const regiones = regionesDeRelleno(
        aplanar(o.geometria.d),
        o.geometria.reglaDeRelleno ?? "evenodd"
      );
      const huecos = regiones.flatMap((r2) => r2.huecos).filter(esCounter2).map((anillo) => ({ anillo, ancho: anchoDeHueco(anillo) }));
      const estrecho = huecos.filter((h) => h.ancho > 0 && h.ancho < HUECO_QUE_CIERRA_EL_RELLENO_MM).sort((a, b) => a.ancho - b.ancho)[0];
      if (estrecho)
        registrar(
          i,
          o,
          0,
          estrecho.anillo,
          estrecho.ancho,
          `counter de ${estrecho.ancho.toFixed(2)} mm dentro de un relleno: sin compensaci\xF3n (Ink/Stitch cierra con ella los huecos de menos de ${HUECO_QUE_CIERRA_EL_RELLENO_MM} mm)`
        );
      return;
    }
    if (o.tipo !== "satin") return;
    const r = origenes[i];
    if (!r?.huecos.length) return;
    const forma = sanos(coberturaDe(o));
    if (!forma.length) return;
    let limite = o.compensacion;
    let causa = null;
    for (const h of huecosDeRegion(r)) {
      const maximo = h.ancho / 2 - MEDIO_HILO_MM - LIBRE_EN_EL_POLO_MM;
      if (maximo >= limite || maximo < 0) continue;
      const cerca = intersectD(
        forma,
        inflatePathsD(
          h.paths,
          limite + CONTACTO_MM,
          JoinType.Round,
          EndType.Polygon,
          2,
          4,
          0.02
        ),
        FillRule.NonZero,
        4
      );
      if (!cerca.length) continue;
      limite = Math.floor(maximo * 100) / 100;
      causa = h;
    }
    if (causa && limite < o.compensacion)
      registrar(
        i,
        o,
        limite,
        causa.anillo,
        causa.ancho,
        `satin junto a un counter de ${causa.ancho.toFixed(2)} mm: compensaci\xF3n ${o.compensacion} \u2192 ${limite} mm para dejarlo abierto`
      );
  });
  return cambios;
}

// packages/bordado/src/vector/columnas.ts
var clave = (a, b) => a < b ? `${a}-${b}` : `${b}-${a}`;
var iguales2 = (a, b) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
function bordesDeUnion(m, u4) {
  const bordes = /* @__PURE__ */ new Set();
  for (const t of u4.triangulos)
    for (let k = 0; k < 3; k++)
      if (m.vecinos[3 * t + k] === -1)
        bordes.add(
          clave(m.triangulos[3 * t + k], m.triangulos[3 * t + (k + 1) % 3])
        );
  return bordes;
}
function cadena(m, desde, hasta, bordes) {
  if (desde === hasta) return [desde];
  for (const sentido of [m.siguiente, m.anterior]) {
    const camino = [desde];
    let p = desde;
    for (let paso = 0; paso <= bordes.size; paso++) {
      const q = sentido[p];
      if (!bordes.has(clave(p, q))) break;
      camino.push(q);
      p = q;
      if (q === hasta) return camino;
    }
  }
  return null;
}
function giros(puntos, ventana) {
  const n2 = puntos.length;
  const angulo = (i) => {
    if (i <= 0 || i >= n2 - 1) return 0;
    const a = puntos[i - 1];
    const b = puntos[i];
    const c = puntos[i + 1];
    const u4 = [b[0] - a[0], b[1] - a[1]];
    const v2 = [c[0] - b[0], c[1] - b[1]];
    return Math.atan2(u4[0] * v2[1] - u4[1] * v2[0], u4[0] * v2[0] + u4[1] * v2[1]);
  };
  const propios = puntos.map((_, i) => angulo(i));
  const arco = [0];
  for (let i = 1; i < n2; i++)
    arco.push(
      arco[i - 1] + Math.hypot(
        puntos[i][0] - puntos[i - 1][0],
        puntos[i][1] - puntos[i - 1][1]
      )
    );
  return puntos.map((_, i) => {
    let suma = 0;
    for (let j = 0; j < n2; j++)
      if (Math.abs(arco[j] - arco[i]) <= ventana / 2) suma += propios[j];
    return suma * 180 / Math.PI;
  });
}
function esquinas(puntos, ventana, umbral) {
  const crudo = giros(puntos, 0);
  const total = crudo.reduce((s, v2) => s + v2, 0);
  const signo = total < 0 ? -1 : 1;
  const g = giros(puntos, ventana).map((v2) => v2 * signo);
  const arco = [0];
  for (let i = 1; i < puntos.length; i++)
    arco.push(
      arco[i - 1] + Math.hypot(
        puntos[i][0] - puntos[i - 1][0],
        puntos[i][1] - puntos[i - 1][1]
      )
    );
  const salida2 = [];
  for (let i = 1; i < puntos.length - 1; i++) {
    if (g[i] < umbral) continue;
    if (!(g[i] >= g[i - 1] && g[i] > g[i + 1])) continue;
    let mejor = i;
    for (let j = 1; j < puntos.length - 1; j++)
      if (Math.abs(arco[j] - arco[i]) <= ventana / 2 && crudo[j] * signo > crudo[mejor] * signo)
        mejor = j;
    if (!salida2.includes(mejor)) salida2.push(mejor);
  }
  return salida2.sort((a, b) => a - b);
}
function rayoContra(origen, dir, linea) {
  let mejor = null;
  for (let i = 1; i < linea.length; i++) {
    const a = linea[i - 1];
    const b = linea[i];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const den = dir[0] * ey - dir[1] * ex;
    if (Math.abs(den) < 1e-12) continue;
    const wx = a[0] - origen[0];
    const wy = a[1] - origen[1];
    const t = (wx * ey - wy * ex) / den;
    const s = (wx * dir[1] - wy * dir[0]) / den;
    if (t <= 1e-9 || s < -1e-9 || s > 1 + 1e-9) continue;
    if (!mejor || t < mejor.t)
      mejor = {
        t,
        punto: [origen[0] + dir[0] * t, origen[1] + dir[1] * t],
        tramo: i
      };
  }
  return mejor;
}
function cuerdaDeExtremo(a, e) {
  const r = a.ramas[e.rama];
  return e.alFinal ? r.cuerdas[r.cuerdas.length - 1] : r.cuerdas[0];
}
function inglete(a, u4) {
  const m = a.malla;
  const [e1, e2] = u4.extremos;
  const c1 = cuerdaDeExtremo(a, e1);
  const c2 = cuerdaDeExtremo(a, e2);
  const bordes = bordesDeUnion(m, u4);
  let interior1;
  let interior2;
  const compartido = c1.find((p) => c2.includes(p));
  if (compartido !== void 0) {
    interior1 = compartido;
    interior2 = compartido;
  } else {
    let mejor = null;
    let largo = Number.POSITIVE_INFINITY;
    for (const p of c1)
      for (const q of c2) {
        const camino = cadena(m, p, q, bordes);
        if (camino && camino.length < largo) {
          largo = camino.length;
          mejor = [p, q];
        }
      }
    if (!mejor) return null;
    [interior1, interior2] = mejor;
  }
  const exterior1 = c1[0] === interior1 ? c1[1] : c1[0];
  const exterior2 = c2[0] === interior2 ? c2[1] : c2[0];
  const fuera = cadena(m, exterior1, exterior2, bordes);
  if (!fuera) return null;
  const linea = fuera.map((i) => m.puntos[i]);
  const s1 = salidaDe(m, a.ramas[e1.rama], e1.alFinal);
  const s2 = salidaDe(m, a.ramas[e2.rama], e2.alFinal);
  let dir = [-(s1[0] + s2[0]), -(s1[1] + s2[1])];
  const l = Math.hypot(dir[0], dir[1]);
  const origen = interior1 === interior2 ? m.puntos[interior1] : [
    (m.puntos[interior1][0] + m.puntos[interior2][0]) / 2,
    (m.puntos[interior1][1] + m.puntos[interior2][1]) / 2
  ];
  if (l < 1e-9) {
    const medio3 = linea[linea.length >> 1];
    dir = [medio3[0] - origen[0], medio3[1] - origen[1]];
  } else dir = [dir[0] / l, dir[1] / l];
  const golpe = rayoContra(origen, dir, linea);
  let tramo;
  let exterior;
  if (golpe) {
    tramo = golpe.tramo;
    exterior = golpe.punto;
  } else {
    let mejor = 0;
    let proyeccion = Number.NEGATIVE_INFINITY;
    linea.forEach((p, i) => {
      const v2 = (p[0] - origen[0]) * dir[0] + (p[1] - origen[1]) * dir[1];
      if (v2 > proyeccion) {
        proyeccion = v2;
        mejor = i;
      }
    });
    tramo = Math.max(1, mejor);
    exterior = linea[mejor];
  }
  const ancho = Math.max(largoCuerda(m, c1), largoCuerda(m, c2));
  for (const i of esquinas(linea, ancho * 0.25, 35)) {
    const p = linea[i];
    if (Math.hypot(p[0] - exterior[0], p[1] - exterior[1]) <= ancho * 0.35) {
      exterior = p;
      tramo = i;
      break;
    }
  }
  const hasta1 = linea.slice(1, tramo).concat([exterior]);
  const hasta2 = linea.slice(tramo).reverse().slice(1).concat([exterior]);
  const quitarRepetidos = (lista2) => lista2.filter((p, i) => i === 0 || !iguales2(p, lista2[i - 1]));
  let interiorPunto = m.puntos[interior1];
  const interiorPara = /* @__PURE__ */ new Map();
  if (interior1 !== interior2) {
    const camino = cadena(m, interior1, interior2, bordes) ?? [
      interior1,
      interior2
    ];
    const puntos = camino.map((i) => m.puntos[i]);
    let k = 0;
    let d = Number.POSITIVE_INFINITY;
    puntos.forEach((p, i) => {
      const di = Math.hypot(p[0] - exterior[0], p[1] - exterior[1]);
      if (di < d) {
        d = di;
        k = i;
      }
    });
    interiorPunto = puntos[k];
    interiorPara.set(claveExtremo(e1), puntos.slice(1, k + 1));
    interiorPara.set(claveExtremo(e2), puntos.slice(k).reverse().slice(1));
  } else {
    interiorPara.set(claveExtremo(e1), []);
    interiorPara.set(claveExtremo(e2), []);
  }
  return {
    interior: interiorPunto,
    exterior,
    lado: /* @__PURE__ */ new Map([
      [
        claveExtremo(e1),
        { interiorDesde: interior1, exteriorDesde: exterior1 }
      ],
      [
        claveExtremo(e2),
        { interiorDesde: interior2, exteriorDesde: exterior2 }
      ]
    ]),
    exteriorPara: /* @__PURE__ */ new Map([
      [claveExtremo(e1), quitarRepetidos(hasta1)],
      [claveExtremo(e2), quitarRepetidos(hasta2)]
    ]),
    interiorPara
  };
}
function remate(m, u4, izqFin, derFin, avance) {
  const bordes = bordesDeUnion(m, u4);
  const camino = cadena(m, izqFin, derFin, bordes);
  if (!camino) return null;
  const puntos = camino.map((i) => m.puntos[i]);
  const ancho = Math.hypot(
    m.puntos[izqFin][0] - m.puntos[derFin][0],
    m.puntos[izqFin][1] - m.puntos[derFin][1]
  );
  const lista2 = esquinas(puntos, ancho * 0.2, 55);
  if (lista2.length >= 2) {
    const primera = lista2[0];
    const ultima = lista2[lista2.length - 1];
    return {
      izq: puntos.slice(1, primera + 1),
      der: puntos.slice(ultima, puntos.length - 1).reverse()
    };
  }
  if (lista2.length === 1) {
    const k2 = lista2[0];
    return {
      izq: puntos.slice(1, k2 + 1),
      der: puntos.slice(k2, puntos.length - 1).reverse()
    };
  }
  let k = 0;
  let lejos = Number.NEGATIVE_INFINITY;
  const base = m.puntos[izqFin];
  puntos.forEach((p, i) => {
    const v2 = (p[0] - base[0]) * avance[0] + (p[1] - base[1]) * avance[1];
    if (v2 > lejos) {
      lejos = v2;
      k = i;
    }
  });
  return {
    izq: puntos.slice(1, k + 1),
    der: puntos.slice(k, puntos.length - 1).reverse()
  };
}
function dentroDe(poligono, p) {
  let dentro2 = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i];
    const [xj, yj] = poligono[j];
    if (yi > p[1] !== yj > p[1]) {
      const x = (xj - xi) * (p[1] - yi) / (yj - yi) + xi;
      if (p[0] < x) dentro2 = !dentro2;
    }
  }
  return dentro2;
}
function hastaEntrar(poligono, p, dir) {
  const adelante = [p[0] + dir[0] * 1e-4, p[1] + dir[1] * 1e-4];
  if (dentroDe(poligono, p) || dentroDe(poligono, adelante)) return 0;
  const cerrado = [...poligono, poligono[0]];
  return rayoContra(p, dir, cerrado)?.t ?? null;
}
var METIDO_BAJO_MM = 0.3;
function meterBajo(cols) {
  const pasaPor = /* @__PURE__ */ new Map();
  for (const c of cols) for (const u4 of c.pasos) pasaPor.set(u4, c);
  for (const c of cols) {
    for (const alFinal of [false, true]) {
      const extremo = alFinal ? c.fin : c.inicio;
      if (extremo?.tipo !== "tope") continue;
      const encima = pasaPor.get(extremo.union);
      const n2 = c.estaciones.length;
      if (n2 < 2) continue;
      const medio3 = (e) => [
        (e.izq[0] + e.der[0]) / 2,
        (e.izq[1] + e.der[1]) / 2
      ];
      const ultima = c.estaciones[alFinal ? n2 - 1 : 0];
      const ancho = Math.hypot(
        ultima.izq[0] - ultima.der[0],
        ultima.izq[1] - ultima.der[1]
      );
      let k = alFinal ? n2 - 1 : 0;
      const paso = alFinal ? -1 : 1;
      while (k + paso >= 0 && k + paso < n2 && Math.hypot(
        medio3(c.estaciones[k])[0] - medio3(ultima)[0],
        medio3(c.estaciones[k])[1] - medio3(ultima)[1]
      ) < ancho)
        k += paso;
      const desde = medio3(c.estaciones[k]);
      const hasta = medio3(ultima);
      const l = Math.hypot(hasta[0] - desde[0], hasta[1] - desde[1]);
      if (l < 1e-6) continue;
      const dir = [(hasta[0] - desde[0]) / l, (hasta[1] - desde[1]) / l];
      const alargar = (p) => {
        const entrar = encima ? hastaEntrar(encima.poligono, p, dir) : 0;
        const t = Math.min(ancho * 1.5, (entrar ?? 0) + METIDO_BAJO_MM);
        return [p[0] + dir[0] * t, p[1] + dir[1] * t];
      };
      if (alFinal) {
        c.izq.push(alargar(c.izq[c.izq.length - 1]));
        c.der.push(alargar(c.der[c.der.length - 1]));
      } else {
        c.izq.unshift(alargar(c.izq[0]));
        c.der.unshift(alargar(c.der[0]));
        for (const e of c.estaciones) {
          e.iIzq++;
          e.iDer++;
        }
      }
      c.poligono = [...c.izq, ...[...c.der].reverse()];
    }
  }
}
function columnas(a, opciones = {}) {
  const sigue = /* @__PURE__ */ new Map();
  for (const u4 of a.uniones) {
    if (u4.decision !== "pasa" || !u4.pasan) continue;
    const [x, y] = u4.pasan;
    sigue.set(claveExtremo(x), y);
    sigue.set(claveExtremo(y), x);
  }
  const usada = /* @__PURE__ */ new Set();
  const salida2 = [];
  const construir2 = (tramos, cerrada) => {
    const pasos = [];
    for (let i = 0; i + 1 < tramos.length; i++) {
      const fin5 = { rama: tramos[i].rama, alFinal: !tramos[i].invertida };
      pasos.push(a.unionDe.get(claveExtremo(fin5)));
    }
    if (cerrada && tramos.length) {
      const ultimo = tramos[tramos.length - 1];
      const u4 = a.unionDe.get(
        claveExtremo({ rama: ultimo.rama, alFinal: !ultimo.invertida })
      );
      if (u4 !== void 0) pasos.push(u4);
    }
    const col = railes(a, tramos, pasos, cerrada, opciones);
    if (col) salida2.push({ ...col, id: salida2.length });
  };
  for (const id of a.vivas) {
    if (usada.has(id) || a.ramas[id].cerrada) continue;
    let inicio = { rama: id, alFinal: false };
    const vistos = /* @__PURE__ */ new Set([id]);
    let cerrada = false;
    while (sigue.has(claveExtremo(inicio))) {
      const otro = sigue.get(claveExtremo(inicio));
      if (vistos.has(otro.rama)) {
        cerrada = true;
        break;
      }
      vistos.add(otro.rama);
      inicio = { rama: otro.rama, alFinal: !otro.alFinal };
    }
    const tramos = [];
    let actual = inicio;
    while (true) {
      if (usada.has(actual.rama)) break;
      usada.add(actual.rama);
      tramos.push({ rama: actual.rama, invertida: actual.alFinal });
      const salidaPor = {
        rama: actual.rama,
        alFinal: !actual.alFinal
      };
      const siguiente = sigue.get(claveExtremo(salidaPor));
      if (!siguiente) break;
      if (usada.has(siguiente.rama)) {
        cerrada = true;
        break;
      }
      actual = siguiente;
    }
    construir2(tramos, cerrada);
  }
  for (const id of a.vivas)
    if (!usada.has(id) && a.ramas[id].cerrada) {
      usada.add(id);
      construir2([{ rama: id, invertida: false }], true);
    }
  meterBajo(salida2);
  return salida2;
}
function railes(a, tramos, pasos, cerrada, opciones = {}) {
  const m = a.malla;
  const cuerdas = [];
  tramos.forEach((t, i) => {
    const r = a.ramas[t.rama];
    const lista2 = t.invertida ? [...r.cuerdas].reverse() : r.cuerdas;
    lista2.forEach((c, j) => {
      cuerdas.push({ cuerda: c, paso: j === 0 && i > 0 ? pasos[i - 1] : null });
    });
  });
  if (!cuerdas.length) return null;
  const medio3 = (c) => [
    (m.puntos[c[0]][0] + m.puntos[c[1]][0]) / 2,
    (m.puntos[c[0]][1] + m.puntos[c[1]][1]) / 2
  ];
  const avanceEn = (i) => {
    const desde = medio3(cuerdas[Math.max(0, i - 1)].cuerda);
    const hasta = medio3(cuerdas[Math.min(cuerdas.length - 1, i + 1)].cuerda);
    let dx = hasta[0] - desde[0];
    let dy = hasta[1] - desde[1];
    let l = Math.hypot(dx, dy);
    if (l < 1e-9) {
      const [p, q] = cuerdas[i].cuerda.map((k) => m.puntos[k]);
      dx = -(q[1] - p[1]);
      dy = q[0] - p[0];
      l = Math.hypot(dx, dy) || 1;
    }
    return [dx / l, dy / l];
  };
  const repartir2 = (c, avance) => {
    const centro = medio3(c);
    const p = m.puntos[c[0]];
    const lado = avance[0] * (p[1] - centro[1]) - avance[1] * (p[0] - centro[0]);
    return lado > 0 ? [c[0], c[1]] : [c[1], c[0]];
  };
  if (cerrada && pasos.length === tramos.length && pasos.length > 0)
    cuerdas.push({ cuerda: cuerdas[0].cuerda, paso: pasos[pasos.length - 1] });
  const izq = [];
  const der = [];
  const paradas = [];
  let [ultimoIzq, ultimoDer] = repartir2(cuerdas[0].cuerda, avanceEn(0));
  const inicioIzq = ultimoIzq;
  const inicioDer = ultimoDer;
  izq.push(m.puntos[ultimoIzq]);
  der.push(m.puntos[ultimoDer]);
  paradas.push({
    izq: ultimoIzq,
    der: ultimoDer,
    union: cuerdas[0].paso !== null
  });
  for (let i = 1; i < cuerdas.length; i++) {
    const { cuerda, paso } = cuerdas[i];
    let nuevoIzq;
    let nuevoDer;
    if (paso === null && cuerda.includes(ultimoIzq)) {
      nuevoIzq = ultimoIzq;
      nuevoDer = cuerda[0] === ultimoIzq ? cuerda[1] : cuerda[0];
    } else if (paso === null && cuerda.includes(ultimoDer)) {
      nuevoDer = ultimoDer;
      nuevoIzq = cuerda[0] === ultimoDer ? cuerda[1] : cuerda[0];
    } else
      [nuevoIzq, nuevoDer] = repartir2(
        cuerda,
        avanceEn(Math.min(i, cuerdas.length - 1))
      );
    const bordes = paso !== null ? bordesDeUnion(m, a.uniones[paso]) : null;
    const avanzar = (rail, desde, hasta) => {
      if (desde === hasta) return;
      const camino = bordes ? cadena(m, desde, hasta, bordes) : null;
      for (const k of (camino ?? [desde, hasta]).slice(1))
        rail.push(m.puntos[k]);
    };
    avanzar(izq, ultimoIzq, nuevoIzq);
    avanzar(der, ultimoDer, nuevoDer);
    ultimoIzq = nuevoIzq;
    ultimoDer = nuevoDer;
    paradas.push({ izq: nuevoIzq, der: nuevoDer, union: paso !== null });
  }
  const primera = { rama: tramos[0].rama, alFinal: tramos[0].invertida };
  const ultima = {
    rama: tramos[tramos.length - 1].rama,
    alFinal: !tramos[tramos.length - 1].invertida
  };
  let inicio = null;
  let fin5 = null;
  if (!cerrada) {
    const tipoDe = (e) => {
      const u4 = a.unionDe.get(claveExtremo(e));
      if (u4 === void 0) return null;
      const d = a.uniones[u4].decision;
      return {
        tipo: d === "remate" ? "remate" : d === "inglete" ? "inglete" : "tope",
        union: u4
      };
    };
    inicio = tipoDe(primera);
    fin5 = tipoDe(ultima);
    const mas = (extremo, e, puntaIzq, puntaDer, haciaFuera) => {
      if (!extremo || extremo.tipo === "tope") return { izq: [], der: [] };
      const u4 = a.uniones[extremo.union];
      if (extremo.tipo === "remate") {
        const res = remate(m, u4, puntaIzq, puntaDer, haciaFuera);
        if (res) return res;
        extremo.tipo = "tope";
        return { izq: [], der: [] };
      }
      const ing = inglete(a, u4);
      const lado = ing?.lado.get(claveExtremo(e));
      if (!ing || !lado) {
        extremo.tipo = "tope";
        return { izq: [], der: [] };
      }
      if (opciones.ingleteMaximoMm !== void 0) {
        const corte = Math.hypot(
          ing.exterior[0] - ing.interior[0],
          ing.exterior[1] - ing.interior[1]
        );
        const ancho = Math.hypot(
          m.puntos[puntaIzq][0] - m.puntos[puntaDer][0],
          m.puntos[puntaIzq][1] - m.puntos[puntaDer][1]
        );
        if (corte > Math.min(opciones.ingleteMaximoMm, 3 * ancho)) {
          extremo.tipo = "tope";
          return { izq: [], der: [] };
        }
      }
      const exterior = ing.exteriorPara.get(claveExtremo(e)) ?? [ing.exterior];
      const interior = ing.interiorPara.get(claveExtremo(e)) ?? [];
      return lado.interiorDesde === puntaIzq ? { izq: interior, der: exterior } : { izq: exterior, der: interior };
    };
    const alFinal = mas(
      fin5,
      ultima,
      ultimoIzq,
      ultimoDer,
      avanceEn(cuerdas.length - 1)
    );
    const alInicio = mas(
      inicio,
      primera,
      inicioIzq,
      inicioDer,
      avanceEn(0).map((v2) => -v2)
    );
    izq.push(...alFinal.izq);
    der.push(...alFinal.der);
    izq.unshift(...[...alInicio.izq].reverse());
    der.unshift(...[...alInicio.der].reverse());
  }
  const limpiar2 = (rail) => rail.filter((p, i) => i === 0 || !iguales2(p, rail[i - 1]));
  const railIzq = limpiar2(izq);
  const railDer = limpiar2(der);
  const estaciones = [];
  let desdeIzq = 0;
  let desdeDer = 0;
  for (const p of paradas) {
    const pi = m.puntos[p.izq];
    const pd = m.puntos[p.der];
    let iIzq = desdeIzq;
    while (iIzq < railIzq.length && !iguales2(railIzq[iIzq], pi)) iIzq++;
    let iDer = desdeDer;
    while (iDer < railDer.length && !iguales2(railDer[iDer], pd)) iDer++;
    if (iIzq >= railIzq.length || iDer >= railDer.length) continue;
    estaciones.push({
      izq: pi,
      der: pd,
      iIzq,
      iDer,
      ...p.union ? { enUnion: true } : {}
    });
    desdeIzq = iIzq;
    desdeDer = iDer;
  }
  return {
    tramos,
    pasos,
    cerrada,
    inicio,
    fin: fin5,
    izq: railIzq,
    der: railDer,
    estaciones,
    poligono: [...railIzq, ...[...railDer].reverse()]
  };
}

// packages/bordado/src/vector/formas.ts
var DECIMALES5 = 4;
var aPaths5 = (r) => [r.exterior, ...r.huecos].map((a) => a.map(([x, y]) => ({ x, y })));
function fraccionAncha(region, radio) {
  const area2 = areaDeRegion(region);
  if (!(area2 > 0)) return 0;
  const paths = sanos(aPaths5(region));
  const opciones = [
    JoinType.Round,
    EndType.Polygon,
    2,
    DECIMALES5,
    0.01
  ];
  const estrecha = inflatePathsD(paths, -radio, ...opciones);
  if (!estrecha.length) return 0;
  const apertura2 = inflatePathsD(sanos(estrecha), radio, ...opciones);
  const dentro2 = intersectD(
    sanos(apertura2),
    paths,
    FillRule.NonZero,
    DECIMALES5
  );
  return Math.min(1, Math.abs(areaPathsD(dentro2)) / area2);
}
function cascoConvexo(puntos) {
  const p = [...puntos].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cruz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const abajo = [];
  for (const q of p) {
    while (abajo.length >= 2 && cruz(abajo[abajo.length - 2], abajo[abajo.length - 1], q) <= 0)
      abajo.pop();
    abajo.push(q);
  }
  const arriba = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (arriba.length >= 2 && cruz(arriba[arriba.length - 2], arriba[arriba.length - 1], q) <= 0)
      arriba.pop();
    arriba.push(q);
  }
  return [...abajo.slice(0, -1), ...arriba.slice(0, -1)];
}
function satinCompacto(region, opciones) {
  if (region.huecos.length) return null;
  const anillo = region.exterior;
  if (anillo.length < 3) return null;
  const casco = cascoConvexo(anillo);
  const areaCasco = Math.abs(areaConSigno(casco));
  if (!(areaCasco > 0) || Math.abs(areaConSigno(anillo)) / areaCasco < 0.9)
    return null;
  let ancho = Number.POSITIVE_INFINITY;
  let eje = [1, 0];
  for (let i = 0; i < casco.length; i++) {
    const a = casco[i];
    const b = casco[(i + 1) % casco.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l < 1e-9) continue;
    const u4 = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
    let w = 0;
    for (const p of casco)
      w = Math.max(w, Math.abs((p[0] - a[0]) * -u4[1] + (p[1] - a[1]) * u4[0]));
    if (w < ancho - 1e-9) {
      ancho = w;
      eje = u4;
    }
  }
  if (ancho > opciones.anchoMaximo || ancho < opciones.anchoMinimo) return null;
  const proyeccion = (p) => p[0] * eje[0] + p[1] * eje[1];
  const n2 = anillo.length;
  const extremo = (signo) => {
    let mejor = 0;
    for (let i = 1; i < n2; i++)
      if (signo * proyeccion(anillo[i]) > signo * proyeccion(anillo[mejor]))
        mejor = i;
    const valor = proyeccion(anillo[mejor]);
    const cerca = (i) => Math.abs(proyeccion(anillo[i]) - valor) < 1e-6;
    let desde = mejor;
    while (cerca((desde - 1 + n2) % n2) && (desde - 1 + n2) % n2 !== mejor)
      desde = (desde - 1 + n2) % n2;
    let hasta = mejor;
    while (cerca((hasta + 1) % n2) && (hasta + 1) % n2 !== desde)
      hasta = (hasta + 1) % n2;
    const largo2 = (hasta - desde + n2) % n2;
    return (desde + Math.floor(largo2 / 2)) % n2;
  };
  const inicio = extremo(-1);
  const fin5 = extremo(1);
  if (inicio === fin5) return null;
  const largo = proyeccion(anillo[fin5]) - proyeccion(anillo[inicio]);
  if (largo / ancho > (opciones.alargamientoMaximo ?? 4)) return null;
  const adelante = [];
  for (let i = inicio; ; i = (i + 1) % n2) {
    adelante.push(anillo[i]);
    if (i === fin5) break;
  }
  const atras = [];
  for (let i = inicio; ; i = (i - 1 + n2) % n2) {
    atras.push(anillo[i]);
    if (i === fin5) break;
  }
  const der = atras.length > 3 ? atras.slice(1, -1) : atras;
  const izq = adelante;
  if (izq.length < 2 || der.length < 2) return null;
  const corte = (rail, s) => {
    for (let i = 1; i < rail.length; i++) {
      const a = proyeccion(rail[i - 1]);
      const b = proyeccion(rail[i]);
      if ((a - s) * (b - s) <= 0 && a !== b) {
        const t = (s - a) / (b - a);
        return [
          rail[i - 1][0] + (rail[i][0] - rail[i - 1][0]) * t,
          rail[i - 1][1] + (rail[i][1] - rail[i - 1][1]) * t
        ];
      }
    }
    return null;
  };
  const s0 = proyeccion(anillo[inicio]);
  const margen = Math.max(0.3, ancho * 0.25);
  const pasos = Math.max(
    0,
    Math.floor((largo - 2 * margen) / opciones.separacion)
  );
  const rungs = [];
  const medidas = [];
  for (let k = 0; k <= pasos; k++) {
    const s = pasos ? s0 + margen + (largo - 2 * margen) * k / pasos : s0 + largo / 2;
    const a = corte(izq, s);
    const b = corte(der, s);
    if (!a || !b) continue;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l < 1e-6) continue;
    const u4 = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
    rungs.push([
      [a[0] - u4[0] * 0.1, a[1] - u4[1] * 0.1],
      [b[0] + u4[0] * 0.1, b[1] + u4[1] * 0.1]
    ]);
    medidas.push(l);
  }
  medidas.sort((a, b) => a - b);
  return {
    izq,
    der,
    rungs,
    anchos: {
      minimo: medidas[0] ?? ancho,
      mediana: medidas[medidas.length >> 1] ?? ancho,
      maximo: medidas[medidas.length - 1] ?? ancho
    },
    largo
  };
}

// packages/bordado/src/vector/regularizar.ts
var ANCHO_REGULARIZABLE_MM = POLITICA_DE_TRAZO_FINO.narrowSatinMaxWidthMm;
var SIGMA_MINIMA_MM = 0.1;
var DESVIO_MAXIMO_MM = 0.1;
var CAMBIO_DE_ANCHO_MAXIMO_MM = 0.05;
var medio2 = (e) => [
  (e.izq[0] + e.der[0]) / 2,
  (e.izq[1] + e.der[1]) / 2
];
var dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function suavizar2(v2, s, sigma, cerrada, largo) {
  const n2 = v2.length;
  const dim = v2[0]?.length ?? 0;
  const h = 3 * sigma;
  const salida2 = [];
  for (let i = 0; i < n2; i++) {
    if (!cerrada && (i === 0 || i === n2 - 1)) {
      salida2.push([...v2[i]]);
      continue;
    }
    const suma = new Array(dim).fill(0);
    let pesos = 0;
    const sumar = (x, d) => {
      const w = Math.exp(-0.5 * (d / sigma) ** 2);
      for (let k = 0; k < dim; k++) suma[k] += w * x[k];
      pesos += w;
    };
    for (let j = 0; j < n2; j++) {
      let d = s[j] - s[i];
      if (cerrada) {
        if (d > largo / 2) d -= largo;
        if (d < -largo / 2) d += largo;
      }
      if (Math.abs(d) <= h) sumar(v2[j], d);
      if (cerrada) continue;
      const d0 = -s[j] - s[i];
      if (j > 0 && Math.abs(d0) <= h)
        sumar(
          v2[j].map((x, k) => 2 * v2[0][k] - x),
          d0
        );
      const d1 = 2 * s[n2 - 1] - s[j] - s[i];
      if (j < n2 - 1 && Math.abs(d1) <= h)
        sumar(
          v2[j].map((x, k) => 2 * v2[n2 - 1][k] - x),
          d1
        );
    }
    salida2.push(suma.map((x) => x / pesos));
  }
  return salida2;
}
var PENDIENTE_DE_HOLGURA = 0.5;
function regularizarColumna(col, holguraEn = () => Number.POSITIVE_INFINITY) {
  const e = col.estaciones;
  const igual = { col, desvioMaxMm: 0, cambia: false };
  const n2 = col.cerrada ? e.length - 1 : e.length;
  if (n2 < 5) return igual;
  const c = e.slice(0, n2).map(medio2);
  const w = e.slice(0, n2).map((x) => dist3(x.izq, x.der));
  const mediana3 = [...w].sort((a, b) => a - b)[n2 >> 1];
  if (mediana3 >= ANCHO_REGULARIZABLE_MM) return igual;
  const s = [0];
  for (let i = 1; i < n2; i++) s.push(s[i - 1] + dist3(c[i - 1], c[i]));
  const largo = col.cerrada ? s[n2 - 1] + dist3(c[n2 - 1], c[0]) : s[n2 - 1];
  if (largo < 4 * SIGMA_MINIMA_MM) return igual;
  const sigma = Math.max(SIGMA_MINIMA_MM, mediana3 / 2);
  const ancla = new Array(n2).fill(false);
  if (!col.cerrada) {
    ancla[0] = true;
    ancla[n2 - 1] = true;
  }
  for (let i = 0; i < n2; i++) if (e[i].enUnion) ancla[i] = true;
  const anclas = ancla.flatMap((x, i) => x ? [i] : []);
  const suavizarPorTramos = (v2) => {
    const salida2 = v2.map((x) => [...x]);
    if (!anclas.length) return suavizar2(v2, s, sigma, true, largo);
    for (let k = 0; k < anclas.length; k++) {
      const a = anclas[k];
      const siguiente = anclas[k + 1] ?? (col.cerrada ? anclas[0] + n2 : -1);
      if (siguiente < 0) break;
      const idx = [];
      for (let i = a; i <= siguiente; i++) idx.push(i % n2);
      if (idx.length < 3) continue;
      const ss = [0];
      for (let q = 1; q < idx.length; q++)
        ss.push(ss[q - 1] + dist3(c[idx[q - 1]], c[idx[q]]));
      const r = suavizar2(
        idx.map((q) => v2[q]),
        ss,
        sigma,
        false,
        ss[ss.length - 1]
      );
      for (let q = 1; q < idx.length - 1; q++) salida2[idx[q]] = r[q];
    }
    return salida2;
  };
  const vecinaA = (i, sentido) => {
    let j = i;
    for (let k = 1; k < n2; k++) {
      const m = col.cerrada ? (i + sentido * k + n2) % n2 : i + sentido * k;
      if (m < 0 || m >= n2) break;
      j = m;
      let d = Math.abs(s[m] - s[i]);
      if (col.cerrada) d = Math.min(d, largo - d);
      if (d >= sigma) break;
    }
    return j;
  };
  const cs = suavizarPorTramos(c);
  const wp = w;
  const ws = suavizarPorTramos(wp.map((x) => [x])).map((x) => x[0]);
  const aAncla = s.map(
    (si) => anclas.length ? Math.min(
      ...anclas.map((k) => {
        const d = Math.abs(s[k] - si);
        return col.cerrada ? Math.min(d, largo - d) : d;
      })
    ) : Number.POSITIVE_INFINITY
  );
  const pedido = cs.map(([x, y], i) => {
    const dx = x - c[i][0];
    const dy = y - c[i][1];
    const d = Math.hypot(dx, dy);
    const tope = Math.min(DESVIO_MAXIMO_MM, wp[i] / 4);
    const k = d > tope ? tope / d : 1;
    return [dx * k, dy * k];
  });
  const anchoPedido = ws.map(
    (x, i) => Math.min(
      wp[i] + CAMBIO_DE_ANCHO_MAXIMO_MM,
      Math.max(wp[i] - CAMBIO_DE_ANCHO_MAXIMO_MM, x)
    )
  );
  const aplicar2 = (i, t) => [
    [c[i][0] + pedido[i][0] * t, c[i][1] + pedido[i][1] * t],
    wp[i] + (anchoPedido[i] - wp[i]) * t
  ];
  const permitido = c.map((p, i) => {
    const antes = holguraEn(p, wp[i]);
    if (!Number.isFinite(antes)) return 1;
    const minimo = antes - Math.max(0, antes) / 4;
    const vale = (t) => {
      const [q, a] = aplicar2(i, t);
      return holguraEn(q, a) >= minimo - 1e-6;
    };
    if (vale(1)) return 1;
    const mag = Math.hypot(pedido[i][0], pedido[i][1]) + Math.abs(anchoPedido[i] - wp[i]);
    const seguro = mag > 1e-9 ? Math.min(1, Math.max(0, antes) / 4 / mag) : 1;
    let [bajo, alto] = [seguro, 1];
    for (let k = 0; k < 6; k++) {
      const m = (bajo + alto) / 2;
      if (vale(m)) bajo = m;
      else alto = m;
    }
    return bajo;
  });
  const magnitud = pedido.map(
    ([x, y], i) => Math.hypot(x, y) + Math.abs(anchoPedido[i] - wp[i])
  );
  const limites = permitido.map(
    (t, i) => t < 1 ? t * magnitud[i] : Number.POSITIVE_INFINITY
  );
  for (let i = 0; i < n2; i++)
    for (let j = 0; j < n2; j++) {
      let d = Math.abs(s[j] - s[i]);
      if (col.cerrada) d = Math.min(d, largo - d);
      const l = limites[j] + PENDIENTE_DE_HOLGURA * d;
      if (l < limites[i]) limites[i] = l;
    }
  if (limites.every((x, i) => Math.min(x, magnitud[i]) < 1e-4)) return igual;
  let desvioMaxMm = 0;
  const centros = [];
  const anchos = [];
  for (let i = 0; i < n2; i++) {
    const t = magnitud[i] > 1e-9 ? Math.min(1, limites[i] / magnitud[i]) : 1;
    const [q, a] = aplicar2(i, t);
    centros.push(q);
    anchos.push(a);
    desvioMaxMm = Math.max(desvioMaxMm, dist3(q, c[i]));
  }
  const tangentes = [];
  const direcciones = [];
  for (let i = 0; i < n2; i++) {
    const a = centros[vecinaA(i, -1)];
    const b = centros[vecinaA(i, 1)];
    let tx = b[0] - a[0];
    let ty = b[1] - a[1];
    const lt = Math.hypot(tx, ty) || 1;
    tx /= lt;
    ty /= lt;
    const ux = (e[i].der[0] - e[i].izq[0]) / (w[i] || 1);
    const uy = (e[i].der[1] - e[i].izq[1]) / (w[i] || 1);
    tangentes.push([tx, ty]);
    let nx = -ty;
    let ny = tx;
    if (nx * ux + ny * uy < 0) {
      nx = -nx;
      ny = -ny;
    }
    const alfa = Math.min(1, aAncla[i] / Math.max(mediana3, 2 * sigma));
    const vx = alfa * nx + (1 - alfa) * ux;
    const vy = alfa * ny + (1 - alfa) * uy;
    const lv = Math.hypot(vx, vy) || 1;
    direcciones.push([vx / lv, vy / lv]);
  }
  const nuevas = [];
  for (let i = 0; i < n2; i++) {
    const [vx, vy] = direcciones[i];
    const m = anchos[i] / 2;
    const extremo = ancla[i];
    nuevas.push({
      izq: extremo ? e[i].izq : [centros[i][0] - vx * m, centros[i][1] - vy * m],
      der: extremo ? e[i].der : [centros[i][0] + vx * m, centros[i][1] + vy * m],
      iIzq: 0,
      iDer: 0
    });
  }
  if (col.cerrada) nuevas.push({ ...nuevas[0] });
  const antesIzq = col.cerrada ? [] : col.izq.slice(0, e[0].iIzq);
  const antesDer = col.cerrada ? [] : col.der.slice(0, e[0].iDer);
  const ultima = e[e.length - 1];
  const despuesIzq = col.cerrada ? [] : col.izq.slice(ultima.iIzq + 1);
  const despuesDer = col.cerrada ? [] : col.der.slice(ultima.iDer + 1);
  const railDe = (lado, antes) => {
    const rail = [];
    const indices2 = [];
    nuevas.forEach((x, i) => {
      const p = x[lado];
      const ultimo = rail[rail.length - 1];
      const t = tangentes[Math.min(i, n2 - 1)];
      const avanza = !ultimo || ancla[Math.min(i, n2 - 1)] || (p[0] - ultimo[0]) * t[0] + (p[1] - ultimo[1]) * t[1] > 1e-6;
      if (avanza) rail.push(p);
      indices2.push(antes.length + rail.length - 1);
    });
    return { rail, indices: indices2 };
  };
  const ri = railDe("izq", antesIzq);
  const rd = railDe("der", antesDer);
  nuevas.forEach((x, i) => {
    x.iIzq = ri.indices[i];
    x.iDer = rd.indices[i];
  });
  const izq = [...antesIzq, ...ri.rail, ...despuesIzq];
  const der = [...antesDer, ...rd.rail, ...despuesDer];
  return {
    col: { ...col, izq, der, estaciones: nuevas },
    desvioMaxMm,
    cambia: true
  };
}

// packages/bordado/src/vector/objetos.ts
var POLITICA_DE_UNION = {
  endpoint: "remate: los rails siguen el contorno hasta las esquinas del final del trazo",
  corner: "inglete: las dos columnas se reparten la esquina por la bisectriz, del v\xE9rtice interior al exterior; si el corte no cabe en una puntada (m\xE1s de 6 mm o de tres anchos: una esquina aguda), las dos acaban en tope y la cu\xF1a se trata como zona",
  "T-junction": `T: el trazo que sigue recto pasa entero; el que llega termina ${METIDO_BAJO_MM} mm debajo y se cose antes`,
  "X-crossing": `X: una diagonal pasa entera; la otra se parte en dos que terminan ${METIDO_BAJO_MM} mm debajo y se cosen antes`,
  branch: `rama: la columna principal pasa; la rama sale de ella metida ${METIDO_BAJO_MM} mm debajo`,
  "branch-complejo": `nudo de muchos trazos: el par m\xE1s recto pasa; el resto termina ${METIDO_BAJO_MM} mm debajo, y lo que no cubren se trata como zona`,
  "Y-junction": "Y sin par recto: el nudo es una pieza propia \u2014satin si es compacto\u2014 y los tres trazos terminan encima de ella",
  loop: "lazo cerrado: satin en dos mitades que se empalman"
};
function centroDeTriangulos(m, triangulos) {
  let x = 0;
  let y = 0;
  let n2 = 0;
  for (const t of triangulos)
    for (let k = 0; k < 3; k++) {
      const p = m.puntos[m.triangulos[3 * t + k]];
      x += p[0];
      y += p[1];
      n2++;
    }
  return n2 ? [x / n2, y / n2] : [0, 0];
}
var DECIMALES6 = 4;
var aPath6 = (puntos) => puntos.map(([x, y]) => ({ x, y }));
function recortarAlArea(regiones, ancho, alto) {
  const marco = [
    aPath6([
      [0, 0],
      [ancho, 0],
      [ancho, alto],
      [0, alto]
    ])
  ];
  const salida2 = [];
  for (const r of regiones) {
    const recorte2 = intersectD(
      sanos([aPath6(r.exterior), ...r.huecos.map(aPath6)]),
      marco,
      FillRule.NonZero,
      DECIMALES6
    );
    salida2.push(
      ...regionesDeRelleno(
        recorte2.map((p) => ({
          puntos: p.map((q) => [q.x, q.y]),
          cerrado: true
        })),
        "nonzero"
      )
    );
  }
  return salida2;
}
var distancia3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function seCruzan2(a, b, c, d) {
  const cruz = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  return cruz(a, b, c) * cruz(a, b, d) < -1e-12 && cruz(c, d, a) * cruz(c, d, b) < -1e-12;
}
function tramoEntre(col, desde, hasta) {
  const a = col.estaciones[desde];
  const b = col.estaciones[hasta];
  const primero = desde === 0 && !col.cerrada;
  const ultimo = hasta === col.estaciones.length - 1 && !col.cerrada;
  const iniIzq = primero ? 0 : a.iIzq;
  const iniDer = primero ? 0 : a.iDer;
  const finIzq = ultimo ? col.izq.length - 1 : b.iIzq;
  const finDer = ultimo ? col.der.length - 1 : b.iDer;
  return {
    izq: col.izq.slice(iniIzq, finIzq + 1),
    der: col.der.slice(iniDer, finDer + 1),
    estaciones: col.estaciones.slice(desde, hasta + 1).map((e) => ({
      ...e,
      iIzq: e.iIzq - iniIzq,
      iDer: e.iDer - iniDer
    }))
  };
}
function rungsDe(t, separacion) {
  const salida2 = [];
  const n2 = t.estaciones.length;
  if (n2 < 3) return salida2;
  const medio3 = (i) => [
    (t.estaciones[i].izq[0] + t.estaciones[i].der[0]) / 2,
    (t.estaciones[i].izq[1] + t.estaciones[i].der[1]) / 2
  ];
  const direccion2 = (i) => Math.atan2(
    t.estaciones[i].der[1] - t.estaciones[i].izq[1],
    t.estaciones[i].der[0] - t.estaciones[i].izq[0]
  );
  let ultimo = 0;
  let anterior = null;
  for (let i = 1; i < n2 - 1; i++) {
    const e = t.estaciones[i];
    const ancho = distancia3(e.izq, e.der);
    let giro = Math.abs(direccion2(i) - direccion2(ultimo));
    if (giro > Math.PI) giro = 2 * Math.PI - giro;
    const lejos = distancia3(medio3(i), medio3(ultimo)) >= Math.max(separacion, ancho * 0.5);
    if (!lejos && giro * 180 / Math.PI < 10) continue;
    const margen = Math.max(0.3, ancho * 0.25);
    if (distancia3(medio3(i), medio3(0)) < margen || distancia3(medio3(i), medio3(n2 - 1)) < margen)
      continue;
    const antes = medio3(Math.max(0, i - 2));
    const despues = medio3(Math.min(n2 - 1, i + 2));
    const eje = [despues[0] - antes[0], despues[1] - antes[1]];
    const largoEje = Math.hypot(eje[0], eje[1]);
    if (largoEje > 1e-6) {
      const coseno = Math.abs(
        (eje[0] * (e.der[0] - e.izq[0]) + eje[1] * (e.der[1] - e.izq[1])) / (largoEje * ancho || 1)
      );
      if (coseno > Math.sin(12 * Math.PI / 180)) continue;
    }
    const u4 = [e.der[0] - e.izq[0], e.der[1] - e.izq[1]];
    const l = Math.hypot(u4[0], u4[1]);
    if (l < 1e-6) continue;
    const extension = 0.1;
    const a = [
      e.izq[0] - u4[0] / l * extension,
      e.izq[1] - u4[1] / l * extension
    ];
    const b = [
      e.der[0] + u4[0] / l * extension,
      e.der[1] + u4[1] / l * extension
    ];
    const cortaDeMas = (rail, propio) => rail.some(
      (p, k) => k > 0 && k !== propio && k !== propio + 1 && seCruzan2(a, b, rail[k - 1], p)
    );
    if (cortaDeMas(t.izq, e.iIzq) || cortaDeMas(t.der, e.iDer)) continue;
    const interior = (rail, k) => k > 0 && k < rail.length - 1;
    if (!interior(t.izq, e.iIzq) || !interior(t.der, e.iDer)) continue;
    const corta = (rail, k) => seCruzan2(a, b, rail[k - 1], rail[k]) || seCruzan2(a, b, rail[k], rail[k + 1]) || // Por el vértice mismo: los dos lados que salen de él quedan a cada lado.
    (() => {
      const cruz = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
      return cruz(rail[k - 1]) * cruz(rail[k + 1]) < 0;
    })();
    if (!corta(t.izq, e.iIzq) || !corta(t.der, e.iDer)) continue;
    if (anterior && seCruzan2(a, b, anterior[0], anterior[1])) continue;
    salida2.push([a, b]);
    anterior = [a, b];
    ultimo = i;
  }
  return salida2;
}
function anchosDe(estaciones) {
  const v2 = estaciones.map((e) => distancia3(e.izq, e.der)).sort((a, b) => a - b);
  return {
    minimo: v2[0] ?? 0,
    mediana: v2[v2.length >> 1] ?? 0,
    maximo: v2[v2.length - 1] ?? 0
  };
}
function largoDe(estaciones) {
  let total = 0;
  for (let i = 1; i < estaciones.length; i++) {
    const a = estaciones[i - 1];
    const b = estaciones[i];
    total += distancia3(
      [(a.izq[0] + a.der[0]) / 2, (a.izq[1] + a.der[1]) / 2],
      [(b.izq[0] + b.der[0]) / 2, (b.izq[1] + b.der[1]) / 2]
    );
  }
  return total;
}
function anguloDePuntada(estaciones) {
  let sx = 0;
  let sy = 0;
  for (const e of estaciones) {
    const a = Math.atan2(e.der[1] - e.izq[1], e.der[0] - e.izq[0]);
    sx += Math.cos(2 * a);
    sy += Math.sin(2 * a);
  }
  return Math.atan2(sy, sx) / 2 * 180 / Math.PI;
}
function regionesDeTriangulos(m, tri) {
  if (!tri.length) return [];
  const caminos = sanos(
    tri.map(
      (t) => aPath6([0, 1, 2].map((k) => m.puntos[m.triangulos[3 * t + k]]))
    )
  );
  return regionesDeRelleno(
    unionD(caminos, FillRule.NonZero).map((p) => ({
      puntos: p.map((q) => [q.x, q.y]),
      cerrado: true
    })),
    "nonzero"
  );
}
function dDeRegion(r) {
  return [r.exterior, ...r.huecos].map((a) => aD(a, true)).join("");
}
function objetosVectoriales(entrada2) {
  const { profile } = entrada2;
  const vector = profile.vector;
  if (!vector) throw new Error("El perfil no define la ruta vectorial");
  const incidencias = [];
  const regiones = recortarAlArea(
    regionesDeRelleno(
      aplanar(entrada2.d, vector.toleranciaCuerdaMm),
      entrada2.regla
    ),
    entrada2.area.anchoMm,
    entrada2.area.altoMm
  );
  if (entrada2.esTexto && regiones.length) {
    const cajas = regiones.map(cajaDeRegion);
    const alto = Math.max(...cajas.map((c) => c.maxY)) - Math.min(...cajas.map((c) => c.minY));
    if (alto < profile.texto.minAlturaMm)
      incidencias.push({
        code: "TEXTO_DEMASIADO_PEQUENO",
        message: `El texto mide ${alto.toFixed(1)} mm de alto; por debajo de ${profile.texto.minAlturaMm} mm no se lee bordado.`,
        severity: "reject"
      });
  }
  const resultado2 = objetosDeRegiones(regiones, {
    colorId: entrada2.colorId,
    profile,
    prefijo: entrada2.prefijo,
    sourceObjectId: entrada2.sourceObjectId,
    sourceType: entrada2.sourceType,
    classification: entrada2.classification,
    origen: entrada2.esTexto ? "texto" : "svg",
    /* En orden de lectura, de izquierda a derecha: es el orden en que se
       espera ver coser un texto, y deja cada letra junto a la siguiente. */
    orden: "lectura"
  });
  return {
    ...resultado2,
    incidencias: [...incidencias, ...resultado2.incidencias]
  };
}
var ZONA_BASE = 1e6;
var COSTURA_BASE = 2e6;
function cajaDePuntos(puntos) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const [x, y] of puntos) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}
var ANCHO_MINIMO_CORRIDO_MM = 0.05;
var DIVISION_POR_ANCHO = {
  /** Más fino que esto, corrido: el hilo solo ya mide 0.4 mm. */
  corridoMm: POLITICA_DE_TRAZO_FINO.runningMaxWidthMm,
  /** Un tramo fino más corto que esto es el final afinado del satin: se queda en él. */
  largoCorridoMm: 1,
  /** Un tramo de satin más corto que esto junto a un filete es su remate o un bulto. */
  largoSatinMm: 0.8
};
var RESTO_DE_EJE = {
  /** Más corto que una puntada: sería un nudo, no una línea. */
  largoMm: 0.5,
  /** Más fino que esto y pegado a otros trazos: un filo del contorno. */
  anchoMm: 0.1,
  /** Más fino que esto y más corto que `largoCortoMm`: una astilla. */
  anchoCortoMm: 0.15,
  largoCortoMm: 2,
  /** Un filo o una astilla más anchos que esta fracción del trazo típico son trazo. */
  fraccionDelTrazo: 0.5
};
var CORRIDO_TRIPLE_MM = 0.5;
var SATIN_CON_UNDERLAY_MM = POLITICA_DE_TRAZO_FINO.narrowSatinMaxWidthMm;
var TRAMO_MINIMO_REGULAR_MM = 2.2;
function tramosPorAncho(col, maxSatinMm, regular = false) {
  const minimoCorrido = regular ? TRAMO_MINIMO_REGULAR_MM : DIVISION_POR_ANCHO.largoCorridoMm;
  const minimoSatin = regular ? TRAMO_MINIMO_REGULAR_MM : DIVISION_POR_ANCHO.largoSatinMm;
  const e = col.estaciones;
  const n2 = e.length;
  if (n2 < 3) return [];
  const medio3 = (x) => [
    (x.izq[0] + x.der[0]) / 2,
    (x.izq[1] + x.der[1]) / 2
  ];
  const s = [0];
  for (let i = 1; i < n2; i++)
    s.push(s[i - 1] + distancia3(medio3(e[i - 1]), medio3(e[i])));
  const tipos = e.map((x) => {
    const w = distancia3(x.izq, x.der);
    return w > maxSatinMm ? "fill" : w < DIVISION_POR_ANCHO.corridoMm ? "running" : "satin";
  });
  const agrupar = () => {
    const t = [];
    for (let i = 0; i < n2; i++) {
      const ultimo = t[t.length - 1];
      if (ultimo && ultimo.tipo === tipos[i]) ultimo.hasta = i;
      else t.push({ tipo: tipos[i], desde: i, hasta: i, largo: 0 });
    }
    for (const x of t) x.largo = s[Math.min(x.hasta + 1, n2 - 1)] - s[x.desde];
    return t;
  };
  for (let vuelta = 0; vuelta < n2; vuelta++) {
    const t = agrupar();
    if (t.length === 1) return t;
    let cambio = false;
    for (let k = 0; k < t.length; k++) {
      const x = t[k];
      const antes = t[k - 1]?.tipo;
      const despues = t[k + 1]?.tipo;
      let nuevo = null;
      if (x.tipo === "running" && x.largo < minimoCorrido) nuevo = "satin";
      else if (x.tipo === "satin" && x.largo < minimoSatin && (antes === "running" || despues === "running") && (antes ?? "running") === "running" && (despues ?? "running") === "running")
        nuevo = "running";
      else if (x.tipo === "fill" && x.largo < DIVISION_POR_ANCHO.largoCorridoMm && (antes === "satin" || despues === "satin"))
        nuevo = "satin";
      if (nuevo) {
        for (let i = x.desde; i <= x.hasta; i++) tipos[i] = nuevo;
        cambio = true;
        break;
      }
    }
    if (!cambio) return agrupar();
  }
  return agrupar();
}
function restoDeEje(largo, mediana3, acompanado, extremosLibres2 = 1, anchoTipico = Number.POSITIVE_INFINITY, trazoMayorMm = Number.POSITIVE_INFINITY) {
  const r = RESTO_DE_EJE;
  if (extremosLibres2 === 0) return null;
  if (largo < r.largoMm && trazoMayorMm >= Math.max(1, 2 * largo))
    return `rama de ${largo.toFixed(2)} mm, m\xE1s corta que una puntada`;
  if (extremosLibres2 >= 2) return null;
  if (mediana3 >= RESTO_DE_EJE.fraccionDelTrazo * anchoTipico) return null;
  if (mediana3 < r.anchoMm && acompanado)
    return `filo de ${mediana3.toFixed(2)} mm de ancho pegado a otros trazos`;
  if (mediana3 < r.anchoCortoMm && largo < r.largoCortoMm)
    return `astilla de ${mediana3.toFixed(2)} \xD7 ${largo.toFixed(1)} mm`;
  return null;
}
var FRACCION_ANCHA = 0.5;
function distanciaASegmentos(segmentos) {
  const CELDA = 0.5;
  const n2 = segmentos.length;
  let x0 = Number.POSITIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (const [ax, ay, bx, by] of segmentos) {
    x0 = Math.min(x0, ax, bx);
    y0 = Math.min(y0, ay, by);
    x1 = Math.max(x1, ax, bx);
    y1 = Math.max(y1, ay, by);
  }
  const columnas2 = Math.max(1, Math.ceil((x1 - x0) / CELDA) + 1);
  const filas = Math.max(1, Math.ceil((y1 - y0) / CELDA) + 1);
  const celdas = Array.from({ length: columnas2 * filas }, () => []);
  const celda = (v2, o, m) => Math.max(0, Math.min(m - 1, Math.floor((v2 - o) / CELDA)));
  segmentos.forEach(([ax, ay, bx, by], k) => {
    const cx0 = celda(Math.min(ax, bx), x0, columnas2);
    const cx1 = celda(Math.max(ax, bx), x0, columnas2);
    const cy0 = celda(Math.min(ay, by), y0, filas);
    const cy1 = celda(Math.max(ay, by), y0, filas);
    for (let cy = cy0; cy <= cy1; cy++)
      for (let cx = cx0; cx <= cx1; cx++) celdas[cy * columnas2 + cx].push(k);
  });
  const visto = new Int32Array(n2);
  let consulta = 0;
  const distancia4 = (p, k) => {
    const [ax, ay, bx, by] = segmentos[k];
    const vx = bx - ax;
    const vy = by - ay;
    const l = vx * vx + vy * vy;
    const t = l < 1e-12 ? 0 : Math.max(0, Math.min(1, ((p[0] - ax) * vx + (p[1] - ay) * vy) / l));
    return Math.hypot(p[0] - ax - vx * t, p[1] - ay - vy * t);
  };
  return (p) => {
    if (!n2) return Number.POSITIVE_INFINITY;
    consulta++;
    const px = Math.floor((p[0] - x0) / CELDA);
    const py = Math.floor((p[1] - y0) / CELDA);
    const hasta = Math.max(
      Math.abs(px),
      Math.abs(py),
      Math.abs(columnas2 - 1 - px),
      Math.abs(filas - 1 - py)
    );
    let d = Number.POSITIVE_INFINITY;
    for (let r = 0; r <= hasta; r++) {
      for (let cy = py - r; cy <= py + r; cy++) {
        if (cy < 0 || cy >= filas) continue;
        const borde = cy === py - r || cy === py + r;
        for (let cx = px - r; cx <= px + r; cx += borde ? 1 : 2 * r || 1) {
          if (cx < 0 || cx >= columnas2) continue;
          for (const k of celdas[cy * columnas2 + cx]) {
            if (visto[k] === consulta) continue;
            visto[k] = consulta;
            const dk = distancia4(p, k);
            if (dk < d) d = dk;
          }
        }
      }
      const fuera = Math.min(
        p[0] - (x0 + (px - r) * CELDA),
        x0 + (px + r + 1) * CELDA - p[0],
        p[1] - (y0 + (py - r) * CELDA),
        y0 + (py + r + 1) * CELDA - p[1]
      );
      if (d < fuera - 1e-9) break;
    }
    return d;
  };
}
function objetosDeRegiones(regionesDeEntrada, opciones) {
  const { profile } = opciones;
  const vector = profile.vector;
  if (!vector) throw new Error("El perfil no define la ruta vectorial");
  const ir = [];
  const incidencias = [];
  let eliminadas = 0;
  let eliminadasMm2 = 0;
  const diagnostico = {
    regiones: 0,
    columnas: 0,
    parches: 0,
    parchesMm2: 0,
    sobranteMm2: 0,
    resueltoMm2: 0,
    sinResolverMm2: 0,
    manchaMm2: 0,
    reservas: 0,
    reservasMm2: 0,
    areaMm2: 0
  };
  const zonas = [];
  const uniones = [];
  const modificaciones = [];
  const base = {
    color: opciones.colorId,
    compensacion: profile.stitches.pullCompensationMm,
    origen: opciones.origen
  };
  const relleno = (region, motivo, angulo = vector.anguloRellenoGrados) => ({
    ...base,
    id: "",
    tipo: "fill",
    geometria: { d: dDeRegion(region), reglaDeRelleno: "evenodd" },
    densidad: profile.stitches.fillSpacingMm,
    underlay: areaDeRegion(region) >= profile.geometria.minAreaUnderlayMm2,
    angulo,
    motivo,
    puntos: region.exterior
  });
  const pendientes = [...regionesDeEntrada];
  if (opciones.orden === "lectura")
    pendientes.sort((a, b) => cajaDeRegion(a).minX - cajaDeRegion(b).minX);
  let aguja = opciones.desde ?? null;
  if (!aguja && opciones.orden === "cercania" && pendientes.length) {
    const cajas = pendientes.map(cajaDeRegion);
    aguja = [
      Math.min(...cajas.map((c) => c.minX)),
      Math.min(...cajas.map((c) => c.minY))
    ];
  }
  const siguienteRegion = () => {
    if (opciones.orden === "lectura" || !aguja)
      return pendientes.shift();
    const desde = aguja;
    let mejor = 0;
    let cerca = Number.POSITIVE_INFINITY;
    pendientes.forEach((r, i) => {
      const d = distanciaACaja2(desde, cajaDeRegion(r));
      if (d < cerca) {
        cerca = d;
        mejor = i;
      }
    });
    return pendientes.splice(mejor, 1)[0];
  };
  const reintentadas = /* @__PURE__ */ new WeakSet();
  const vecinasDe = /* @__PURE__ */ new Map();
  const cercanas = (propia) => {
    const guardadas = vecinasDe.get(propia);
    if (guardadas) return guardadas;
    const c = cajaDeRegion(propia);
    const cerca = regionesDeEntrada.filter((r) => {
      if (r === propia) return false;
      const o = cajaDeRegion(r);
      return o.maxX >= c.minX - 1 && o.minX <= c.maxX + 1 && o.maxY >= c.minY - 1 && o.minY <= c.maxY + 1;
    });
    vecinasDe.set(propia, cerca);
    return cerca;
  };
  const hilosVecinos = /* @__PURE__ */ new Map();
  const hiloDeLasOtras = (propia) => {
    const guardado = hilosVecinos.get(propia);
    if (guardado) return guardado;
    const cerca = cercanas(propia);
    const hilo = cerca.length ? inflatePathsD(
      unionD(
        sanos(
          cerca.flatMap((r) => [aPath6(r.exterior), ...r.huecos.map(aPath6)])
        ),
        [],
        FillRule.NonZero,
        DECIMALES6
      ),
      HILO_ASENTADO_MM / 2,
      JoinType.Round,
      EndType.Polygon,
      2,
      DECIMALES6,
      0.02
    ) : [];
    hilosVecinos.set(propia, hilo);
    return hilo;
  };
  const holguraDe = (propia) => {
    const segmentos = [];
    const cerca = cercanas(propia);
    for (const r of cerca)
      for (const anillo of [r.exterior, ...r.huecos])
        anillo.forEach((q, k) => {
          const a = anillo[(k + anillo.length - 1) % anillo.length];
          segmentos.push([a[0], a[1], q[0], q[1]]);
        });
    const masCerca = distanciaASegmentos(segmentos);
    return (p, w) => {
      if (!segmentos.length) return Number.POSITIVE_INFINITY;
      if (cerca.some((r) => dentroDeRegion(r, p))) return -1;
      const d = masCerca(p);
      const propio = Math.max(
        HILO_ASENTADO_MM / 2,
        w / 2 + profile.stitches.pullCompensationMm
      );
      return d - propio - HILO_ASENTADO_MM / 2;
    };
  };
  const origenDe = /* @__PURE__ */ new Map();
  let zonasEnlazadas = 0;
  const corridoDe = /* @__PURE__ */ new Map();
  for (const c of opciones.corridosDeDetalle ?? []) {
    corridoDe.set(c.region, c);
    pendientes.push(c.region);
  }
  const porRegion = [];
  const sola = (obj, extra = {}) => {
    const c = centroDe(obj.puntos);
    return { obj, inicio: c, fin: c, topes: [], cubre: [], ...extra };
  };
  const piezaCompacta = (compacto, motivo, extra = {}) => {
    const { izq, der, rungs, anchos, largo } = compacto;
    const dDe = () => [
      aD(izq, false),
      aD(der, false),
      ...rungs.map(([p, q]) => aD([p, q], false))
    ].join("");
    const obj = {
      ...base,
      id: "",
      tipo: "satin",
      geometria: { d: dDe() },
      densidad: profile.stitches.satinSpacingMm,
      underlay: underlayDeSatin(anchos.mediana),
      motivo,
      anchoMm: anchos,
      largoMm: largo,
      puntos: [...izq, ...der]
    };
    const medio3 = (a, b) => [
      (a[0] + b[0]) / 2,
      (a[1] + b[1]) / 2
    ];
    return {
      obj,
      inicio: medio3(izq[0], der[0]),
      fin: medio3(izq[izq.length - 1], der[der.length - 1]),
      invertir: () => {
        izq.reverse();
        der.reverse();
        rungs.reverse();
        obj.geometria.d = dDe();
      },
      topes: [],
      cubre: [],
      ...extra
    };
  };
  const adaptar = opciones.adaptarPuntada === true;
  const curvaEnIngletes = adaptar && opciones.curvaEnIngletes !== false;
  const maxCorrido = adaptar ? (opciones.politica ?? POLITICA_DE_TRAZO_FINO).runningMaxWidthMm : profile.geometria.maxGrosorRunningMm;
  const opcionesCompacto = {
    anchoMaximo: profile.quality.maxSatinWidthMm,
    /* Con `adaptarPuntada`, un satin compacto desde el ancho en que la
       división por ancho ya pone satin: un punto de 0.9 mm es un satin
       de lado a lado, no un eje cordal con tres ramas de centésimas. */
    anchoMinimo: adaptar ? DIVISION_POR_ANCHO.corridoMm : profile.geometria.maxGrosorRunningMm,
    separacion: vector.separacionRungsMm
  };
  const underlayDeSatin = (mediana3) => !adaptar || mediana3 >= SATIN_CON_UNDERLAY_MM;
  const piezaDeCorrido = (estaciones, anchos, largo, motivo, extra, prolongar2) => {
    const eje = estaciones.map(
      (e) => [(e.izq[0] + e.der[0]) / 2, (e.izq[1] + e.der[1]) / 2]
    );
    if (adaptar && prolongar2 && eje.length >= 2) {
      for (const extremo of ["inicio", "fin"]) {
        const modo = prolongar2[extremo];
        if (modo === "interior") continue;
        const p = extremo === "fin" ? eje[eje.length - 1] : eje[0];
        const punta = (q) => {
          const extra2 = prolongacion(p, q, prolongar2.poligono);
          const largo2 = modo === "libre" ? Math.max(0, extra2 - 0.2) : extra2;
          if (largo2 < 0.05) return null;
          const l = Math.hypot(p[0] - q[0], p[1] - q[1]) || 1;
          return [
            p[0] + (p[0] - q[0]) / l * largo2,
            p[1] + (p[1] - q[1]) / l * largo2
          ];
        };
        const suave = punta(extremo === "fin" ? eje[eje.length - 2] : eje[1]);
        const r = prolongar2.referencia;
        let nuevo = suave;
        if (r && r.length === estaciones.length && prolongar2.holgura) {
          const x = extremo === "fin" ? r[r.length - 2] : r[1];
          const original = punta([
            (x.izq[0] + x.der[0]) / 2,
            (x.izq[1] + x.der[1]) / 2
          ]);
          if (original && suave) {
            const antes = prolongar2.holgura(original, anchos.mediana);
            const ahora3 = prolongar2.holgura(suave, anchos.mediana);
            if (Number.isFinite(antes) && ahora3 < antes - Math.max(0, antes) / 4)
              nuevo = original;
          } else nuevo = original;
        }
        const cola = prolongar2.colas?.[extremo];
        if (cola && cola.length > 0) {
          const recta = nuevo ?? p;
          const antes = prolongar2.holgura?.(recta, anchos.mediana) ?? Number.POSITIVE_INFINITY;
          const ahora3 = prolongar2.holgura ? Math.min(...cola.map((q) => prolongar2.holgura?.(q, anchos.mediana) ?? Number.POSITIVE_INFINITY)) : Number.POSITIVE_INFINITY;
          if (!Number.isFinite(antes) || ahora3 >= antes - Math.max(0, antes) / 4) {
            if (extremo === "fin") eje.push(...cola);
            else eje.unshift(...[...cola].reverse());
            continue;
          }
        }
        if (!nuevo) continue;
        if (extremo === "fin") eje.push(nuevo);
        else eje.unshift(nuevo);
      }
    }
    if (eje.length < 2) return null;
    const { traza, ...resto } = extra;
    const obj = {
      ...base,
      id: "",
      tipo: "running",
      geometria: { d: aD(eje, false) },
      densidad: profile.quality.maxRunningStitchLengthMm,
      underlay: false,
      motivo,
      anchoMm: anchos,
      largoMm: largo,
      puntos: eje,
      traza,
      /* Un filete de menos de medio milímetro se cose de una pasada: el
         triple (bean) lo dejaría del grueso de un trazo que no tiene. */
      ...adaptar && {
        repeticiones: anchos.mediana < CORRIDO_TRIPLE_MM ? 0 : 1
      }
    };
    return {
      obj,
      inicio: eje[0],
      fin: eje[eje.length - 1],
      invertir: () => {
        eje.reverse();
        obj.geometria.d = aD(eje, false);
      },
      topes: [],
      cubre: [],
      ...resto
    };
  };
  const piezaDeSatin = (tramo, anchos, largo, motivo, extra) => {
    if (tramo.izq.length < 2 || tramo.der.length < 2) return null;
    const largoRail = (r) => r.reduce(
      (t, p, i) => i ? t + Math.hypot(p[0] - r[i - 1][0], p[1] - r[i - 1][1]) : 0,
      0
    );
    if (largoRail(tramo.izq) < RAIL_MINIMO_MM || largoRail(tramo.der) < RAIL_MINIMO_MM)
      return null;
    const rungs = rungsDe(tramo, vector.separacionRungsMm);
    const dDe = () => [
      aD(tramo.izq, false),
      aD(tramo.der, false),
      ...rungs.map(([p, q]) => aD([p, q], false))
    ].join("");
    const { traza, ...resto } = extra;
    const obj = {
      ...base,
      id: "",
      tipo: "satin",
      geometria: { d: dDe() },
      densidad: profile.stitches.satinSpacingMm,
      underlay: underlayDeSatin(anchos.mediana),
      motivo,
      anchoMm: anchos,
      largoMm: largo,
      puntos: [...tramo.izq, ...tramo.der],
      traza
    };
    const extremo = (i) => {
      const p = tramo.izq[i < 0 ? tramo.izq.length + i : i];
      const q = tramo.der[i < 0 ? tramo.der.length + i : i];
      return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    };
    return {
      obj,
      inicio: extremo(0),
      fin: extremo(-1),
      // Un satin empieza donde empiezan sus rails: coserlo al revés es
      // darles la vuelta a los dos. Los rungs no tienen sentido.
      invertir: () => {
        tramo.izq.reverse();
        tramo.der.reverse();
        obj.geometria.d = dDe();
      },
      topes: [],
      cubre: [],
      ...resto
    };
  };
  let costuras = 0;
  const trazos = (region, profundidad) => {
    let analisis;
    let cols;
    try {
      analisis = analizar(mallaDeRegion(region), {
        ...OPCIONES_CORDALES,
        ...vector.cordal
      });
      cols = columnas(
        analisis,
        adaptar ? { ingleteMaximoMm: profile.quality.maxSatinWidthMm } : void 0
      );
    } catch {
      return null;
    }
    const propios = [];
    const cubiertas = [];
    const clasificar = (lista2) => lista2.map((col) => {
      const anchos = anchosDe(col.estaciones);
      const largo = largoDe(col.estaciones);
      const p75 = (() => {
        const v2 = col.estaciones.map((e) => distancia3(e.izq, e.der)).sort((a, b) => a - b);
        return v2[Math.floor(0.75 * (v2.length - 1))] ?? 0;
      })();
      const tipo = anchos.maximo > profile.quality.maxSatinWidthMm ? "fill" : anchos.maximo < maxCorrido || adaptar && profundidad === 0 && anchos.maximo < profile.geometria.maxGrosorRunningMm && p75 < maxCorrido ? "running" : "satin";
      return { col, anchos, largo, tipo };
    });
    const clasificadas = clasificar(cols);
    if (profundidad === 0) diagnostico.columnas += cols.length;
    if (clasificadas.length && clasificadas.every((c) => c.tipo === "fill"))
      return {
        piezas: [
          sola(
            relleno(
              region,
              `trazos de hasta ${Math.max(...clasificadas.map((c) => c.anchos.maximo)).toFixed(1)} mm, m\xE1s anchos que un satin`
            )
          )
        ],
        sinResolverMm2: 0
      };
    if (opciones.resolverZonas && profundidad === 0)
      for (const u4 of analisis.uniones) {
        const tipo = tipoDeUnion(u4, analisis);
        if (tipo === "continuidad" || tipo === "suelta") continue;
        uniones.push({
          id: u4.id,
          tipo,
          extremos: u4.extremos.length,
          decision: u4.decision,
          politica: POLITICA_DE_UNION[tipo] ?? "",
          centro: centroDeTriangulos(analisis.malla, u4.triangulos),
          poligonos: regionesDeTriangulos(analisis.malla, u4.triangulos).map(
            (r) => r.exterior
          )
        });
      }
    for (const col of cols)
      if (col.cerrada && opciones.resolverZonas && profundidad === 0)
        uniones.push({
          id: -1,
          tipo: "loop",
          extremos: 0,
          decision: "lazo",
          politica: POLITICA_DE_UNION.loop,
          centro: centroDe(col.poligono),
          poligonos: []
        });
    for (const u4 of analisis.uniones) {
      if (u4.decision !== "parche" && u4.decision !== "suelta") continue;
      if (opciones.resolverZonas) continue;
      for (const r of regionesDeTriangulos(analisis.malla, u4.triangulos)) {
        if (areaDeRegion(r) < 1e-4) continue;
        diagnostico.parches++;
        diagnostico.parchesMm2 += areaDeRegion(r);
        propios.push(
          sola(relleno(r, "uni\xF3n sin continuaci\xF3n recta"), { cubre: [u4.id] })
        );
        cubiertas.push(aPath6(r.exterior));
      }
    }
    const tipoDe = new Map(
      analisis.uniones.map((u4) => [u4.id, tipoDeUnion(u4, analisis)])
    );
    const anchoTipico = (() => {
      const pares = clasificadas.map((c) => [c.anchos.mediana, c.largo]).sort((a, b) => a[0] - b[0]);
      const total = pares.reduce((t, p) => t + p[1], 0);
      let acumulado2 = 0;
      for (const [w, l] of pares) {
        acumulado2 += l;
        if (acumulado2 >= total / 2) return w;
      }
      return 0;
    })();
    const trazoMayor = Math.max(0, ...clasificadas.map((c) => c.largo));
    let holguraDeLaRegion = null;
    const coserColumnas = (lista2, propios2, cubiertas2, modificaciones2, regulares, tecnicaDe, originalDe) => {
      let eliminadas2 = 0;
      const conTolerancia = (col, p) => {
        if (p && originalDe.has(col)) {
          p.obj.toleranciaMm = DESVIO_MAXIMO_MM;
          if (opciones.repartoPorCurvatura !== false) p.obj.reparto = "curvatura";
        }
        return p;
      };
      for (const { col, anchos, largo, tipo } of lista2) {
        const cubrir = (sinCoser2) => {
          const grandes = opciones.soloLoCosidoCubre === false ? [] : sinCoser2.filter(
            (p) => p.length >= 3 && Math.abs(areaConSigno(p)) >= profile.geometria.minAreaMm2
          );
          if (!grandes.length) {
            cubiertas2.push(aPath6(col.poligono));
            return;
          }
          cubiertas2.push(
            ...differenceD(
              sanos([aPath6(col.poligono)]),
              sanos(grandes.map(aPath6)),
              FillRule.NonZero,
              DECIMALES6
            )
          );
        };
        const fueraDelCorrido = (poligono, p, maximoMm) => {
          if (p.obj.puntos.length < 2) return [poligono];
          const hilo = inflatePathsD(
            [aPath6(p.obj.puntos)],
            Math.max(HILO_ASENTADO_MM / 2, maximoMm / 2) + 0.05,
            JoinType.Round,
            EndType.Round,
            2,
            DECIMALES6
          );
          return differenceD(sanos([aPath6(poligono)]), hilo, FillRule.NonZero, DECIMALES6).map(
            (q) => q.map((v2) => [v2.x, v2.y])
          );
        };
        const topes = [col.inicio, col.fin].filter((e) => e?.tipo === "tope").map((e) => e?.union);
        const traza = {
          uniones: [
            ...new Set(
              [...[col.inicio, col.fin].map((e) => e?.union), ...col.pasos].map((id) => id === void 0 ? void 0 : tipoDe.get(id)).filter(
                (t) => !!t && t !== "continuidad" && t !== "suelta"
              ).concat(col.cerrada ? ["loop"] : [])
            )
          ]
        };
        const extremosDeColumna = (piezas) => {
          if (col.inicio?.tipo === "tope")
            piezas[0]?.topes.push(col.inicio.union);
          if (col.fin?.tipo === "tope")
            piezas[piezas.length - 1]?.topes.push(col.fin.union);
        };
        const trozos = adaptar && !col.cerrada ? tramosPorAncho(
          tecnicaDe.get(col) ?? col,
          profile.quality.maxSatinWidthMm,
          regulares.has(col)
        ) : [];
        if (trozos.length > 1) {
          const n4 = col.estaciones.length;
          const rango = { running: 0, fill: 1, satin: 2 };
          const piezas = trozos.map((x, k) => {
            const hasta = Math.min(x.hasta + 1, n4 - 1);
            const propias = col.estaciones.slice(x.desde, x.hasta + 1);
            const a = anchosDe(propias);
            const l = largoDe(col.estaciones.slice(x.desde, hasta + 1));
            const extra = { cubre: [...col.pasos], traza };
            if (x.tipo === "running") {
              const libres = (k === 0 && col.inicio?.tipo === "remate" ? 1 : 0) + (k === trozos.length - 1 && col.fin?.tipo === "remate" ? 1 : 0);
              const resto2 = restoDeEje(
                l,
                a.mediana,
                true,
                Math.min(1, libres),
                anchoTipico,
                trazoMayor
              );
              if (resto2) {
                modificaciones2.push({
                  tipo: "resto-de-eje",
                  centro: centroDe(propias.map((e) => e.izq)),
                  antesMm2: Number((l * a.mediana).toFixed(3)),
                  despuesMm2: 0,
                  motivo: `${resto2}: no se cose`,
                  anchoMm: Number(a.mediana.toFixed(3)),
                  largoMm: Number(l.toFixed(3))
                });
                return null;
              }
              return conTolerancia(
                col,
                piezaDeCorrido(
                  col.estaciones.slice(x.desde, hasta + 1),
                  a,
                  l,
                  `tramo fino de ${a.mediana.toFixed(2)} mm de una columna que se afina: corrido`,
                  extra,
                  {
                    poligono: col.poligono,
                    referencia: (originalDe.get(col) ?? col).estaciones.slice(
                      x.desde,
                      hasta + 1
                    ),
                    holgura: holguraDeLaRegion ?? void 0,
                    colas: curvaEnIngletes ? {
                      inicio: k === 0 && x.desde === 0 ? colaDeInglete(col, "inicio") : null,
                      fin: k === trozos.length - 1 && hasta === n4 - 1 ? colaDeInglete(col, "fin") : null
                    } : void 0,
                    inicio: k > 0 ? "interior" : col.inicio?.tipo === "remate" ? "libre" : "unido",
                    fin: k < trozos.length - 1 ? "interior" : col.fin?.tipo === "remate" ? "libre" : "unido"
                  }
                )
              );
            }
            if (x.tipo === "fill") {
              const tramo2 = tramoEntre(
                col,
                Math.max(0, x.desde - (k > 0 ? 1 : 0)),
                Math.min(n4 - 1, hasta + (k < trozos.length - 1 ? 1 : 0))
              );
              const poligono = [...tramo2.izq, ...[...tramo2.der].reverse()];
              return sola(
                {
                  ...relleno(
                    { exterior: orientar(poligono), huecos: [] },
                    `tramo de ${a.maximo.toFixed(1)} mm, m\xE1s ancho que un satin, de una columna que se ensancha`,
                    anguloDePuntada(propias) + 90
                  ),
                  anchoMm: a,
                  largoMm: l,
                  traza
                },
                { ...extra, poligono }
              );
            }
            const tramo = tramoEntre(col, x.desde, hasta);
            return piezaDeSatin(
              tramo,
              a,
              l,
              `tramo de satin de ${a.mediana.toFixed(1)} mm (${a.minimo.toFixed(1)}\u2013${a.maximo.toFixed(1)}) de una columna que cambia de ancho`,
              {
                ...extra,
                poligono: [...tramo.izq, ...[...tramo.der].reverse()]
              }
            );
          });
          for (let k = 0; k + 1 < trozos.length; k++) {
            const a = piezas[k];
            const b = piezas[k + 1];
            if (!a || !b) continue;
            const id = COSTURA_BASE + ++costuras;
            const [primero, despues] = rango[trozos[k].tipo] <= rango[trozos[k + 1].tipo] ? [a, b] : [b, a];
            primero.topes.push(id);
            despues.cubre.push(id);
          }
          cubrir(
            trozos.flatMap((x, k) => {
              const t = tramoEntre(col, x.desde, Math.min(x.hasta + 1, n4 - 1));
              const poligono = [...t.izq, ...[...t.der].reverse()];
              const p = piezas[k];
              if (!p) return [poligono];
              return x.tipo === "running" ? fueraDelCorrido(poligono, p, anchosDe(col.estaciones.slice(x.desde, x.hasta + 1)).maximo) : [];
            })
          );
          const cosidas = piezas.filter((p) => p !== null);
          for (const p of cosidas) p.cadena = cosidas;
          extremosDeColumna(cosidas);
          propios2.push(...cosidas);
          modificaciones2.push({
            tipo: "division-por-ancho",
            centro: centroDe(col.poligono),
            antesMm2: Number(Math.abs(areaConSigno(col.poligono)).toFixed(2)),
            despuesMm2: Number(Math.abs(areaConSigno(col.poligono)).toFixed(2)),
            motivo: `columna de ${anchos.minimo.toFixed(1)}\u2013${anchos.maximo.toFixed(1)} mm partida por su ancho: ${trozos.map(
              (x) => `${x.tipo === "running" ? "corrido" : x.tipo === "fill" ? "relleno" : "satin"} ${x.largo.toFixed(1)} mm`
            ).join(" \xB7 ")}`
          });
          continue;
        }
        if (tipo === "fill") {
          cubrir([]);
          propios2.push(
            sola(
              {
                ...relleno(
                  { exterior: orientar(col.poligono), huecos: [] },
                  `columna de ${anchos.maximo.toFixed(1)} mm, m\xE1s ancha que un satin`,
                  anguloDePuntada(col.estaciones) + 90
                ),
                anchoMm: anchos,
                largoMm: largo,
                traza
              },
              { topes, cubre: [...col.pasos], poligono: col.poligono }
            )
          );
          continue;
        }
        if (tipo === "running" && opciones.formasEnteras && anchos.maximo < ANCHO_MINIMO_CORRIDO_MM) {
          cubrir([col.poligono]);
          eliminadas2++;
          continue;
        }
        if (tipo === "running") {
          const resto2 = adaptar ? restoDeEje(
            largo,
            anchos.mediana,
            cols.length > 1,
            extremosLibres(col),
            anchoTipico,
            trazoMayor
          ) : null;
          if (resto2) {
            modificaciones2.push({
              tipo: "resto-de-eje",
              centro: centroDe(col.poligono),
              antesMm2: Number(Math.abs(areaConSigno(col.poligono)).toFixed(3)),
              despuesMm2: 0,
              motivo: `${resto2}: no se cose`,
              anchoMm: Number(anchos.mediana.toFixed(3)),
              largoMm: Number(largo.toFixed(3))
            });
            cubrir([col.poligono]);
            continue;
          }
          const corrido = conTolerancia(
            col,
            piezaDeCorrido(
              col.estaciones,
              anchos,
              largo,
              `trazo de ${anchos.mediana.toFixed(2)} mm, demasiado fino para satin`,
              { topes, cubre: [...col.pasos], poligono: col.poligono, traza },
              col.cerrada ? void 0 : {
                poligono: col.poligono,
                referencia: (originalDe.get(col) ?? col).estaciones,
                holgura: holguraDeLaRegion ?? void 0,
                colas: curvaEnIngletes ? { inicio: colaDeInglete(col, "inicio"), fin: colaDeInglete(col, "fin") } : void 0,
                inicio: col.inicio?.tipo === "remate" ? "libre" : "unido",
                fin: col.fin?.tipo === "remate" ? "libre" : "unido"
              }
            )
          );
          cubrir(corrido ? fueraDelCorrido(col.poligono, corrido, anchos.maximo) : [col.poligono]);
          if (corrido) propios2.push(corrido);
          continue;
        }
        const n2 = col.estaciones.length;
        const cortes = col.cerrada && n2 >= 5 ? [0, n2 >> 1, n2 - 1] : [0, n2 - 1];
        const sinCoser = [];
        for (let k = 0; k + 1 < cortes.length; k++) {
          const tramo = tramoEntre(col, cortes[k], cortes[k + 1]);
          const pieza = piezaDeSatin(
            tramo,
            anchos,
            largo,
            `columna de ${anchos.mediana.toFixed(1)} mm (${anchos.minimo.toFixed(1)}\u2013${anchos.maximo.toFixed(1)})`,
            { topes, cubre: [...col.pasos], poligono: col.poligono, traza }
          );
          if (pieza) propios2.push(pieza);
          else sinCoser.push([...tramo.izq, ...[...tramo.der].reverse()]);
        }
        cubrir(sinCoser);
      }
      return eliminadas2;
    };
    const coser = (lista2, regulares, tecnicaDe, originalDe) => {
      const piezas = [];
      const cubre = [];
      const mods = [];
      const quitadas = coserColumnas(
        lista2,
        piezas,
        cubre,
        mods,
        regulares,
        tecnicaDe,
        originalDe
      );
      return { piezas, cubre, mods, quitadas };
    };
    const original = coser(clasificadas, /* @__PURE__ */ new Set(), /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map());
    let elegida = original;
    if (adaptar && opciones.regularizarFinos !== false) {
      const propia = origenDe.get(region) ?? region;
      const holgura = holguraDe(propia);
      holguraDeLaRegion = holgura;
      const rs = cols.map((c) => regularizarColumna(c, holgura));
      if (rs.some((x) => x.cambia)) {
        const regulares = new Set(rs.filter((x) => x.cambia).map((x) => x.col));
        const originales = new Map(rs.map((x, k) => [x.col, cols[k]]));
        const desvio = Math.max(...rs.map((x) => x.desvioMaxMm));
        const variantes = [
          {
            nombre: "eje, ancho y t\xE9cnica",
            estricto: true,
            lista: clasificar(rs.map((x) => x.col)),
            histeresis: regulares,
            tecnicaDe: /* @__PURE__ */ new Map()
          },
          {
            nombre: "eje y ancho (t\xE9cnica del original)",
            estricto: false,
            lista: clasificadas.map((c, k) => ({ ...c, col: rs[k].col })),
            histeresis: /* @__PURE__ */ new Set(),
            tecnicaDe: new Map(rs.map((x, k) => [x.col, cols[k]]))
          }
        ];
        const rechazos = [];
        let aceptada = null;
        for (const v2 of variantes) {
          const intento = coser(v2.lista, v2.histeresis, v2.tecnicaDe, originales);
          const rechazo = rechazoDeRegularizacion(
            intento.piezas,
            original.piezas,
            cols,
            hiloDeLasOtras(propia),
            v2.estricto
          );
          if (!rechazo) {
            elegida = intento;
            aceptada = v2.nombre;
            break;
          }
          rechazos.push(`${v2.nombre}: ${rechazo}`);
        }
        modificaciones.push({
          tipo: "regularizacion",
          centro: centroDe(region.exterior),
          antesMm2: 0,
          despuesMm2: 0,
          motivo: aceptada ? `${regulares.size} columna(s) fina(s) regularizada(s) (${aceptada}): eje \u2264 ${desvio.toFixed(3)} mm del original${rechazos.length ? `; antes, ${rechazos.join("; ")}` : ""}` : `regularizaci\xF3n descartada: ${rechazos.join("; ")}`,
          desviacionMm: aceptada ? Number(desvio.toFixed(3)) : 0
        });
      }
    }
    propios.push(...elegida.piezas);
    cubiertas.push(...elegida.cubre);
    modificaciones.push(...elegida.mods);
    eliminadas += elegida.quitadas;
    let sinResolverMm2 = 0;
    const cubierto = cubiertas.length ? unionD(
      /* Cada polígono con el mismo sentido: dos columnas que se solapan en
         un cruce pueden ir en sentidos contrarios, y con `nonzero` el solape
         se anularía y la red cosería de relleno lo que ya está cosido. */
      sanos(cubiertas).map((p) => areaD(p) >= 0 ? p : [...p].reverse()),
      [],
      FillRule.NonZero,
      DECIMALES6
    ) : [];
    const resto = differenceD(
      sanos([aPath6(region.exterior), ...region.huecos.map(aPath6)]),
      cubierto,
      FillRule.NonZero,
      DECIMALES6
    );
    for (const r of regionesDeRelleno(
      resto.map((p) => ({
        puntos: p.map((q) => [q.x, q.y]),
        cerrado: true
      })),
      "nonzero"
    )) {
      const a = areaDeRegion(r);
      if (profundidad === 0) diagnostico.sobranteMm2 += a;
      if (!opciones.resolverZonas) {
        if (a >= profile.geometria.minAreaMm2)
          propios.push(
            sola(relleno(r, "zona que ninguna columna cubr\xEDa"), {
              primero: true
            })
          );
        continue;
      }
      if (a < 1e-3) continue;
      const resuelta = resolverZona(r, region, analisis, profundidad, propios);
      if (resuelta.piezas.length) {
        const id = ZONA_BASE + ++zonasEnlazadas;
        const alrededor = zonaConSolape(r, region, METIDO_BAJO_MM + 0.05);
        const caja = cajaDeRegion(r);
        for (const c of propios) {
          if (!c.poligono) continue;
          const cc2 = cajaDePuntos(c.poligono);
          if (cc2.minX > caja.maxX + 0.5 || caja.minX > cc2.maxX + 0.5 || cc2.minY > caja.maxY + 0.5 || caja.minY > cc2.maxY + 0.5)
            continue;
          if (intersectD(
            alrededor,
            sanos([aPath6(c.poligono)]).map(
              (q) => areaD(q) >= 0 ? q : [...q].reverse()
            ),
            FillRule.NonZero,
            DECIMALES6
          ).length)
            c.cubre.push(id);
        }
        for (const p of resuelta.piezas) {
          p.primero = false;
          p.topes.push(id);
        }
      }
      propios.push(...resuelta.piezas);
      sinResolverMm2 += resuelta.sinResolverMm2;
    }
    return { piezas: propios, sinResolverMm2 };
  };
  const resolverZona = (zona, region, analisis, profundidad, vecinos = []) => {
    const r = resolverZonaSinTraza(
      zona,
      region,
      analisis,
      profundidad,
      vecinos
    );
    const registro = profundidad > 0 ? null : zonas[zonas.length - 1];
    if (registro)
      for (const p of r.piezas)
        p.obj.traza = {
          ...p.obj.traza,
          zona: registro.clase,
          uniones: registro.union ? [registro.union.tipo] : p.obj.traza?.uniones ?? []
        };
    return r;
  };
  const resolverZonaSinTraza = (zona, region, analisis, profundidad, vecinos = []) => {
    const medida = clasificarZona(zona, analisis, {
      maxSatinMm: profile.quality.maxSatinWidthMm,
      maxCorridoMm: maxCorrido,
      minDetalleMm: ANCHO_MINIMO_DETALLE_MM
    });
    const registrar = (decision, resultado2, sinResolver2 = false) => {
      if (profundidad > 0) return;
      zonas.push({ ...medida, decision, resultado: resultado2, sinResolver: sinResolver2 });
      if (sinResolver2) diagnostico.sinResolverMm2 += medida.areaMm2;
      else if (resultado2.length) diagnostico.resueltoMm2 += medida.areaMm2;
    };
    const conSolape = () => regionesDeRelleno(
      zonaConSolape(zona, region, METIDO_BAJO_MM).map((p) => ({
        puntos: p.map((q) => [q.x, q.y]),
        cerrado: true
      })),
      "nonzero"
    );
    const sinResolver = (motivo) => {
      registrar(`sin resolver: ${motivo}; se cose de relleno`, ["fill"], true);
      return {
        piezas: [
          sola(relleno(zona, `sin resolver: ${medida.causa}`), {
            primero: true
          })
        ],
        sinResolverMm2: medida.areaMm2
      };
    };
    if (medida.clase === "E" && adaptar && esPuente(zona, vecinos)) {
      const [a, b] = ejeLargo(zona);
      const largo = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const motivo = `puente de ${medida.anchoMaximoMm.toFixed(2)} mm en una uni\xF3n ${medida.union?.tipo ?? ""}: las columnas vecinas no se tocan sin \xE9l, corrido de lado a lado`;
      registrar(motivo, ["running"]);
      if (profundidad === 0) zonas[zonas.length - 1].clase = "C";
      const obj = {
        ...base,
        id: "",
        tipo: "running",
        geometria: { d: aD([a, b], false) },
        densidad: profile.quality.maxRunningStitchLengthMm,
        underlay: false,
        motivo,
        anchoMm: {
          minimo: medida.anchoMaximoMm,
          mediana: medida.anchoMaximoMm,
          maximo: medida.anchoMaximoMm
        },
        largoMm: largo,
        puntos: [a, b],
        ...adaptar && { repeticiones: 0 }
      };
      return {
        piezas: [
          { obj, inicio: a, fin: b, topes: [], cubre: [], primero: true }
        ],
        sinResolverMm2: 0
      };
    }
    if (medida.clase === "E") {
      registrar(
        medida.anchoMaximoMm < ANCHO_MINIMO_DETALLE_MM ? `residuo de ${medida.anchoMaximoMm.toFixed(2)} mm: lo cubre la compensaci\xF3n del satin vecino (${profile.stitches.pullCompensationMm} mm por lado)` : `residuo de ${medida.areaMm2.toFixed(2)} mm\xB2: lo cubren el hilo y la compensaci\xF3n de la columna vecina`,
        []
      );
      return { piezas: [], sinResolverMm2: 0 };
    }
    if (medida.clase === "B") {
      const partes2 = conSolape();
      registrar(
        `zona de ${medida.anchoMaximoMm.toFixed(1)} mm, m\xE1s ancha que un satin: relleno metido ${METIDO_BAJO_MM} mm bajo las columnas`,
        ["fill"]
      );
      return {
        piezas: partes2.map(
          (p) => sola(
            relleno(
              p,
              `zona de ${medida.anchoMaximoMm.toFixed(1)} mm, m\xE1s ancha que un satin`
            ),
            { primero: true }
          )
        ),
        sinResolverMm2: 0
      };
    }
    if (medida.clase !== "C")
      for (const parte of conSolape()) {
        const compacto = satinCompacto(parte, opcionesCompacto);
        if (!compacto) break;
        registrar(
          `${medida.clase === "D" ? `uni\xF3n ${medida.union?.tipo ?? ""}` : "zona"} compacta de ${compacto.anchos.maximo.toFixed(1)} mm: un satin de lado a lado, bajo las columnas que llegan`,
          ["satin"]
        );
        return {
          piezas: [
            piezaCompacta(
              compacto,
              `${medida.clase === "D" ? "uni\xF3n" : "zona"} de ${compacto.anchos.maximo.toFixed(1)} mm resuelta con un satin`,
              { primero: true }
            )
          ],
          sinResolverMm2: 0
        };
      }
    const mancha = () => {
      const ancho = medida.anchoMaximoMm;
      diagnostico.manchaMm2 += medida.areaMm2;
      registrar(
        `forma de ${ancho.toFixed(1)} mm sin eje de trazo (una mancha, no una columna): relleno metido ${METIDO_BAJO_MM} mm bajo las columnas`,
        ["fill"]
      );
      if (profundidad === 0) zonas[zonas.length - 1].clase = "B";
      return {
        piezas: conSolape().map(
          (p) => sola(relleno(p, `forma de ${ancho.toFixed(1)} mm sin eje de trazo`), {
            primero: true
          })
        ),
        sinResolverMm2: 0
      };
    };
    const cuna = () => {
      registrar(
        `cu\xF1a de una esquina de ${medida.union?.extremos ?? 2} trazos: el inglete no cabe en una puntada, relleno metido ${METIDO_BAJO_MM} mm bajo las columnas`,
        ["fill"]
      );
      return {
        piezas: conSolape().map(
          (p) => sola(relleno(p, "cu\xF1a de esquina aguda (inglete demasiado largo)"), {
            primero: true
          })
        ),
        sinResolverMm2: 0
      };
    };
    const esquina = medida.union?.tipo === "corner";
    const conCuerpo = medida.anchoMaximoMm >= 0.5 * profile.quality.maxSatinWidthMm;
    if (profundidad > 0) return sinResolver("la zona tampoco se descompone");
    const partes = medida.clase === "C" ? [zona] : conSolape();
    const piezas = [];
    const tipos = /* @__PURE__ */ new Set();
    let pendiente = 0;
    for (const parte of partes) {
      const r = trazos(parte, profundidad + 1);
      if (!r)
        return conCuerpo ? mancha() : esquina ? cuna() : sinResolver("el an\xE1lisis no pudo descomponerla");
      pendiente += r.sinResolverMm2;
      for (const p of r.piezas) {
        p.primero = true;
        p.obj.motivo = `zona ${medida.clase} (${medida.union?.tipo ?? "sin uni\xF3n"}): ${p.obj.motivo}`;
        tipos.add(p.obj.tipo);
        piezas.push(p);
      }
    }
    if (!piezas.length || pendiente > 0.25 * medida.areaMm2)
      return conCuerpo ? mancha() : esquina ? cuna() : sinResolver("su propio eje tampoco la cubre");
    registrar(
      `${medida.clase === "C" ? "zona fina" : medida.clase === "D" ? `uni\xF3n ${medida.union?.tipo ?? ""}` : "zona de trazo"} descompuesta en ${piezas.length} pieza${piezas.length === 1 ? "" : "s"} (${[...tipos].join(", ")})`,
      [...tipos]
    );
    return { piezas, sinResolverMm2: 0 };
  };
  const instantanea = () => ({
    zonas: zonas.length,
    uniones: uniones.length,
    modificaciones: modificaciones.length,
    diagnostico: { ...diagnostico },
    eliminadas
  });
  const volverA = (x) => {
    zonas.length = x.zonas;
    uniones.length = x.uniones;
    modificaciones.length = x.modificaciones;
    Object.assign(diagnostico, x.diagnostico);
    eliminadas = x.eliminadas;
  };
  const quitarEntre = (desde, hasta) => {
    zonas.splice(desde.zonas, hasta.zonas - desde.zonas);
    uniones.splice(desde.uniones, hasta.uniones - desde.uniones);
    modificaciones.splice(
      desde.modificaciones,
      hasta.modificaciones - desde.modificaciones
    );
    for (const clave2 of Object.keys(diagnostico))
      diagnostico[clave2] -= hasta.diagnostico[clave2] - desde.diagnostico[clave2];
    eliminadas -= hasta.eliminadas - desde.eliminadas;
  };
  while (pendientes.length) {
    const region = siguienteRegion();
    const detalle = corridoDe.get(region);
    if (detalle) {
      const eje = [...detalle.puntos];
      const obj = {
        ...base,
        id: "",
        tipo: "running",
        geometria: { d: aD(eje, false) },
        densidad: profile.quality.maxRunningStitchLengthMm,
        underlay: false,
        motivo: detalle.motivo,
        puntos: eje,
        ...detalle.repeticiones !== void 0 && {
          repeticiones: detalle.repeticiones
        }
      };
      const pieza = {
        obj,
        inicio: eje[0],
        fin: eje[eje.length - 1],
        topes: [],
        cubre: []
      };
      porRegion.push({ region, piezas: [pieza] });
      aguja = pieza.fin;
      continue;
    }
    const area2 = areaDeRegion(region);
    if (area2 < profile.geometria.minAreaMm2 && !esTrazoEstructural(region)) {
      eliminadas++;
      eliminadasMm2 += area2;
      continue;
    }
    diagnostico.regiones++;
    diagnostico.areaMm2 += area2;
    const caja = cajaDeRegion(region);
    const desde = aguja ?? [caja.minX, caja.maxY];
    if (opciones.formasEnteras) {
      const ancha = fraccionAncha(region, profile.quality.maxSatinWidthMm / 2);
      if (ancha >= FRACCION_ANCHA) {
        const pieza = sola(
          relleno(
            region,
            `${Math.round(ancha * 100)} % de la forma es m\xE1s ancha que un satin`
          )
        );
        porRegion.push({ region, piezas: [pieza] });
        aguja = pieza.fin;
        continue;
      }
      const compacto = satinCompacto(region, opcionesCompacto);
      if (compacto) {
        const pieza = piezaCompacta(
          compacto,
          `forma compacta de ${compacto.anchos.maximo.toFixed(1)} mm, un satin de lado a lado`
        );
        const { orden: orden2, fin: fin6 } = ordenar([pieza], desde);
        porRegion.push({ region, piezas: orden2 });
        aguja = fin6;
        continue;
      }
    }
    const inicio = instantanea();
    let r = trazos(region, 0);
    const peor = (desde2) => diagnostico.sinResolverMm2 - desde2.diagnostico.sinResolverMm2 + diagnostico.manchaMm2 - desde2.diagnostico.manchaMm2;
    const peorPrimero = peor(inicio);
    if (r && opciones.resolverZonas && peorPrimero > Math.max(1, 0.02 * area2)) {
      const primero = instantanea();
      for (const epsilon2 of [0.1, 0.2]) {
        const simples = simplificarRegion(region, epsilon2);
        if (!simples.length) continue;
        const piezas = [];
        let pendiente = 0;
        let fallo = false;
        for (const simple of simples) {
          const intento = trazos(simple, 0);
          if (!intento) {
            fallo = true;
            break;
          }
          piezas.push(...intento.piezas);
          pendiente += intento.sinResolverMm2;
        }
        const peorNuevo = peor(primero);
        if (!fallo && peorNuevo < peorPrimero * 0.5) {
          quitarEntre(inicio, primero);
          modificaciones.push({
            tipo: "contorno-simplificado",
            centro: centroDe(region.exterior),
            desviacionMm: epsilon2,
            antesMm2: Number(area2.toFixed(2)),
            despuesMm2: Number(
              simples.reduce((t, x) => t + areaDeRegion(x), 0).toFixed(2)
            ),
            motivo: `contorno ruidoso: ${peorPrimero.toFixed(1)} mm\xB2 sin trazo (sin resolver o mancha); simplificado a ${epsilon2} mm quedan ${peorNuevo.toFixed(1)} mm\xB2`
          });
          r = { piezas, sinResolverMm2: pendiente };
          break;
        }
        volverA(primero);
      }
    }
    if (!r) {
      if (!reintentadas.has(region)) {
        const partes = abrirRegion(region, 0.02);
        if (partes.length) {
          for (const parte of partes) {
            reintentadas.add(parte);
            origenDe.set(parte, origenDe.get(region) ?? region);
          }
          pendientes.unshift(...partes);
          diagnostico.regiones--;
          diagnostico.areaMm2 -= area2;
          continue;
        }
      }
      diagnostico.reservas++;
      diagnostico.reservasMm2 += area2;
      const pieza = sola(
        relleno(region, "an\xE1lisis geom\xE9trico no disponible para esta forma")
      );
      porRegion.push({ region, piezas: [pieza] });
      aguja = pieza.fin;
      continue;
    }
    const { orden, fin: fin5 } = ordenar(
      r.piezas,
      desde,
      adaptar ? region : void 0
    );
    porRegion.push({ region, piezas: orden });
    aguja = fin5;
  }
  const ruta = [];
  const cadenas = /* @__PURE__ */ new Map();
  porRegion.forEach(({ region, piezas }, r) => {
    const desde = ir.length;
    piezas.forEach((p, i) => {
      const siguiente = piezas[i + 1];
      p.obj.cortarDespues = siguiente ? saleDeLaRegion(region, p.fin, siguiente.inicio) : r < porRegion.length - 1;
      p.obj.traza = { ...p.obj.traza, region: r };
    });
    ir.push(...piezas.map((p) => p.obj));
    piezas.forEach((b) => {
      const antes = [];
      piezas.forEach((a, j) => {
        if (a === b) return;
        if (a.primero && !b.primero || a.topes.some((u4) => b.cubre.includes(u4)))
          antes.push(desde + j);
      });
      if (b.cadena && !cadenas.has(b.cadena))
        cadenas.set(b.cadena, cadenas.size);
      ruta.push({
        ...extremosDeRuta(b),
        region: r,
        forma: region,
        origen: origenDe.get(region) ?? region,
        antes,
        cadena: b.cadena ? cadenas.get(b.cadena) : void 0
      });
    });
  });
  ir.forEach((o, i) => {
    o.id = `${opciones.prefijo}-${i}`;
  });
  const objetos = ir.map((o) => aContrato(o, opciones));
  const conteo = { satin: 0, running: 0, fill: 0 };
  for (const o of ir) conteo[o.tipo]++;
  if (opciones.revisarConfianza) {
    if (diagnostico.reservas)
      incidencias.push({
        code: "FORMA_SIN_ANALIZAR",
        message: `${diagnostico.reservas} forma${diagnostico.reservas === 1 ? "" : "s"} (${diagnostico.reservasMm2.toFixed(1)} mm\xB2) no se pudieron descomponer en columnas y se cosen enteras de relleno.`,
        severity: "review"
      });
    const sinColumna = opciones.resolverZonas ? diagnostico.sinResolverMm2 : diagnostico.sobranteMm2;
    if (sinColumna > Math.max(2, 0.03 * diagnostico.areaMm2))
      incidencias.push({
        code: "ZONAS_SIN_COLUMNA",
        message: `${sinColumna.toFixed(1)} mm\xB2 del dise\xF1o no encajan en ninguna columna y se cosen con relleno de seguridad.`,
        severity: "review",
        ...opciones.resolverZonas ? {
          metrics: {
            sinResolverMm2: Number(sinColumna.toFixed(2)),
            zonas: zonas.filter((z) => z.sinResolver).length
          }
        } : {}
      });
    if (diagnostico.parchesMm2 > 0.15 * diagnostico.areaMm2)
      incidencias.push({
        code: "UNIONES_COMPLEJAS",
        message: `Las uniones entre trazos ocupan ${diagnostico.parchesMm2.toFixed(1)} mm\xB2 y se cosen con parches de relleno.`,
        severity: "review"
      });
  }
  return {
    ir,
    objetos,
    incidencias,
    conteo,
    eliminadas,
    eliminadasMm2: Number(eliminadasMm2.toFixed(3)),
    diagnostico: {
      ...diagnostico,
      parchesMm2: Number(diagnostico.parchesMm2.toFixed(3)),
      sobranteMm2: Number(diagnostico.sobranteMm2.toFixed(3)),
      resueltoMm2: Number(diagnostico.resueltoMm2.toFixed(3)),
      sinResolverMm2: Number(diagnostico.sinResolverMm2.toFixed(3)),
      reservasMm2: Number(diagnostico.reservasMm2.toFixed(3)),
      areaMm2: Number(diagnostico.areaMm2.toFixed(3))
    },
    zonas,
    uniones,
    modificaciones,
    fin: aguja,
    ruta
  };
}
function simplificarRegion(region, epsilon2) {
  const simples = simplifyPathsD(
    sanos([aPath6(region.exterior), ...region.huecos.map(aPath6)]),
    epsilon2,
    true
  );
  return regionesDeRelleno(
    unionD(sanos(simples), [], FillRule.NonZero, DECIMALES6).map((p) => ({
      puntos: p.map((q) => [q.x, q.y]),
      cerrado: true
    })),
    "nonzero"
  ).filter((r) => areaDeRegion(r) >= 1e-3);
}
function abrirRegion(region, radio) {
  const paths = sanos([aPath6(region.exterior), ...region.huecos.map(aPath6)]);
  const estrecha = inflatePathsD(
    paths,
    -radio,
    JoinType.Round,
    EndType.Polygon,
    2,
    DECIMALES6,
    5e-3
  );
  if (!estrecha.length) return [];
  const abierta = inflatePathsD(
    sanos(estrecha),
    radio,
    JoinType.Round,
    EndType.Polygon,
    2,
    DECIMALES6,
    5e-3
  );
  return regionesDeRelleno(
    abierta.map((p) => ({
      puntos: p.map((q) => [q.x, q.y]),
      cerrado: true
    })),
    "nonzero"
  );
}
function distanciaACaja2(p, c) {
  const dx = Math.max(c.minX - p[0], 0, p[0] - c.maxX);
  const dy = Math.max(c.minY - p[1], 0, p[1] - c.maxY);
  return Math.hypot(dx, dy);
}
var COSTE_DE_CORTE_MM = 4;
function ordenar(piezas, desde, region) {
  const pendientes = new Set(piezas);
  const antes = /* @__PURE__ */ new Map();
  for (const b of piezas) {
    const lista2 = [];
    for (const a of piezas) {
      if (a === b) continue;
      if (a.primero && !b.primero) lista2.push(a);
      else if (a.topes.some((u4) => b.cubre.includes(u4))) lista2.push(a);
    }
    antes.set(b, lista2);
  }
  const unidades = [];
  const vistas = /* @__PURE__ */ new Set();
  for (const p of piezas) {
    if (vistas.has(p)) continue;
    const u4 = p.cadena?.filter((q) => pendientes.has(q)) ?? [p];
    for (const q of u4) vistas.add(q);
    unidades.push(u4);
  }
  const hechas = /* @__PURE__ */ new Set();
  const orden = [];
  let actual = desde;
  const restantes = new Set(unidades);
  while (restantes.size) {
    const libre = (u4) => u4.every(
      (p) => (antes.get(p) ?? []).every((q) => u4.includes(q) || hechas.has(q))
    );
    let libres = [...restantes].filter(libre);
    if (!libres.length) libres = [...restantes];
    const coste = (hasta) => distancia3(actual, hasta) + (region && orden.length && saleDeLaRegion(region, actual, hasta) ? COSTE_DE_CORTE_MM : 0);
    let mejor = libres[0];
    let alReves = false;
    let cerca = Number.POSITIVE_INFINITY;
    for (const u4 of libres) {
      const d0 = coste(u4[0].inicio);
      if (d0 < cerca) {
        cerca = d0;
        mejor = u4;
        alReves = false;
      }
      if (u4.every((p) => p.invertir)) {
        const d1 = coste(u4[u4.length - 1].fin);
        if (d1 < cerca) {
          cerca = d1;
          mejor = u4;
          alReves = true;
        }
      }
    }
    const secuencia = alReves ? [...mejor].reverse() : mejor;
    for (const p of secuencia) {
      if (alReves && p.invertir) {
        p.invertir();
        [p.inicio, p.fin] = [p.fin, p.inicio];
      }
      orden.push(p);
      hechas.add(p);
      actual = p.fin;
    }
    restantes.delete(mejor);
  }
  return { orden, fin: actual };
}
function extremosDeRuta(p) {
  const o = p.obj;
  if (o.tipo !== "running" || p.invertir || p.inicio !== p.fin)
    return { inicio: p.inicio, fin: p.fin, invertir: p.invertir };
  const trazos = aplanar(o.geometria.d);
  if (trazos.length !== 1 || trazos[0].puntos.length < 2)
    return { inicio: p.inicio, fin: p.fin };
  const puntos = trazos[0].puntos;
  return {
    inicio: puntos[0],
    fin: puntos[puntos.length - 1],
    invertir: () => {
      o.geometria.d = aD(
        [...aplanar(o.geometria.d)[0].puntos].reverse(),
        false
      );
    }
  };
}
var HUELLA_DE_HILO_MM2 = 0.25;
var ANCHO_DE_TROZO_MM = 0.1;
function rechazoDeRegularizacion(regularizada, original, cols, vecinas, estricto) {
  const cosido = (ps) => unionD(
    sanos(ps.flatMap(cosidoDe2)).map(
      (q) => areaD(q) >= 0 ? q : [...q].reverse()
    ),
    [],
    FillRule.NonZero,
    DECIMALES6
  );
  const a = cosido(regularizada);
  const b = cosido(original);
  const topologia = (p) => {
    const rs = regionesDeRelleno(
      p.map((q) => ({
        puntos: q.map((v2) => [v2.x, v2.y]),
        cerrado: true
      })),
      "nonzero"
    ).filter((r) => areaDeRegion(r) >= HUECO_MINIMO_MM2);
    const counters = rs.reduce(
      (n2, r) => n2 + r.huecos.filter((h) => {
        const hueco2 = { exterior: [...h].reverse(), huecos: [] };
        return areaDeRegion(hueco2) >= HUECO_MINIMO_MM2 && anchoInscritoAlMenos(hueco2, COUNTER_MINIMO_MM);
      }).length,
      0
    );
    return `${rs.length} piezas y ${counters} counters`;
  };
  const ta = topologia(a);
  const tb = topologia(b);
  if (ta !== tb) return `cambia la topolog\xEDa de lo cosido (${tb} \u2192 ${ta})`;
  const perdido = regionesDeRelleno(
    differenceD(b, a, FillRule.NonZero, DECIMALES6).map((q) => ({
      puntos: q.map((v2) => [v2.x, v2.y]),
      cerrado: true
    })),
    "nonzero"
  ).find(
    (r) => areaDeRegion(r) >= HUELLA_DE_HILO_MM2 && anchoInscritoAlMenos(r, ANCHO_DE_TROZO_MM)
  );
  if (perdido)
    return `deja sin coser ${areaDeRegion(perdido).toFixed(2)} mm\xB2 que el original cos\xEDa`;
  if (vecinas.length && estricto) {
    const dentroDe2 = (p) => Math.abs(areaPathsD(intersectD(p, vecinas, FillRule.NonZero, DECIMALES6)));
    const [ma, mb] = [dentroDe2(a), dentroDe2(b)];
    if (ma > mb + 1e-3)
      return `se acerca al hilo de otra pieza (${mb.toFixed(3)} \u2192 ${ma.toFixed(3)} mm\xB2 dentro de \xE9l)`;
  }
  if (vecinas.length) {
    const contactos = (p) => regionesDeRelleno(
      intersectD(p, vecinas, FillRule.NonZero, DECIMALES6).map((q) => ({
        puntos: q.map((v2) => [v2.x, v2.y]),
        cerrado: true
      })),
      "nonzero"
    ).filter((r) => areaDeRegion(r) >= 1e-3);
    const antes = intersectD(b, vecinas, FillRule.NonZero, DECIMALES6);
    const nuevo = contactos(a).find(
      (r) => !intersectD(
        sanos([aPath6(r.exterior)]),
        inflatePathsD(
          antes,
          0.01,
          JoinType.Round,
          EndType.Polygon,
          2,
          DECIMALES6,
          0.02
        ),
        FillRule.NonZero,
        DECIMALES6
      ).length
    );
    if (nuevo)
      return `toca el hilo de otra pieza donde el original no (${areaDeRegion(nuevo).toFixed(3)} mm\xB2)`;
  }
  const muestras = [];
  for (const c of cols)
    for (let i = 1; i < c.estaciones.length; i++) {
      const p = c.estaciones[i - 1];
      const q = c.estaciones[i];
      const m0 = [(p.izq[0] + p.der[0]) / 2, (p.izq[1] + p.der[1]) / 2];
      const m1 = [(q.izq[0] + q.der[0]) / 2, (q.izq[1] + q.der[1]) / 2];
      const l = Math.hypot(m1[0] - m0[0], m1[1] - m0[1]);
      for (let t = 0; t < l; t += 0.1)
        muestras.push([
          m0[0] + (m1[0] - m0[0]) * t / l,
          m0[1] + (m1[1] - m0[1]) * t / l
        ]);
    }
  if (!muestras.length) return null;
  const dentro2 = (p) => {
    const rs = regionesDeRelleno(
      p.map((q) => ({
        puntos: q.map((v2) => [v2.x, v2.y]),
        cerrado: true
      })),
      "nonzero"
    );
    return muestras.filter((m) => rs.some((r) => dentroDeRegion(r, m))).length / muestras.length;
  };
  const ra = dentro2(a);
  const rb = dentro2(b);
  if (ra < rb - 0.01)
    return `pierde eje cubierto (${(100 * rb).toFixed(1)} % \u2192 ${(100 * ra).toFixed(1)} %)`;
  return null;
}
var cosidoGuardado = /* @__PURE__ */ new WeakMap();
function cosidoDe2(p) {
  const g = cosidoGuardado.get(p.obj);
  if (g && g.d === p.obj.geometria.d && g.compensacion === p.obj.compensacion) return g.paths;
  const paths = cosidoSinGuardar(p);
  cosidoGuardado.set(p.obj, { d: p.obj.geometria.d, compensacion: p.obj.compensacion, paths });
  return paths;
}
function cosidoSinGuardar(p) {
  const c = coberturaDe(p.obj);
  return p.obj.tipo === "satin" ? inflatePathsD(
    c,
    p.obj.compensacion,
    JoinType.Round,
    EndType.Polygon,
    2,
    4,
    0.02
  ) : c;
}
function esPuente(zona, vecinos) {
  if (vecinos.length < 2) return false;
  const aPath8 = (a) => a.map(([x, y]) => ({ x, y }));
  const z = inflatePathsD(
    [zona.exterior, ...zona.huecos].map(aPath8),
    0.05,
    JoinType.Round,
    EndType.Polygon,
    2,
    4,
    0.02
  );
  const caja = cajaDeRegion(zona);
  const cerca = vecinos.filter((v2) => {
    if (!v2.obj.puntos.length) return true;
    const c = cajaDePuntos(v2.obj.puntos);
    return !(c.minX > caja.maxX + 1 || caja.minX > c.maxX + 1 || c.minY > caja.maxY + 1 || caja.minY > c.maxY + 1);
  });
  const tocan2 = cerca.map(cosidoDe2).filter((c) => c.length && intersectD(c, z, FillRule.NonZero, 4).length);
  if (tocan2.length < 2) return false;
  const holgadas = tocan2.map(
    (c) => inflatePathsD(c, 0.02, JoinType.Round, EndType.Polygon, 2, 4, 0.02)
  );
  const visto = /* @__PURE__ */ new Set([0]);
  const pila = [0];
  while (pila.length) {
    const i = pila.pop();
    for (let j = 0; j < holgadas.length; j++)
      if (!visto.has(j) && intersectD(holgadas[i], holgadas[j], FillRule.NonZero, 4).length) {
        visto.add(j);
        pila.push(j);
      }
  }
  return visto.size < holgadas.length;
}
function ejeLargo(zona) {
  const p = zona.exterior;
  const cx = p.reduce((t, q) => t + q[0], 0) / p.length;
  const cy = p.reduce((t, q) => t + q[1], 0) / p.length;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const [x, y] of p) {
    sxx += (x - cx) ** 2;
    syy += (y - cy) ** 2;
    sxy += (x - cx) * (y - cy);
  }
  const angulo = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const u4 = [Math.cos(angulo), Math.sin(angulo)];
  const proyecciones = p.map(([x, y]) => (x - cx) * u4[0] + (y - cy) * u4[1]);
  const min = Math.min(...proyecciones);
  const max = Math.max(...proyecciones);
  return [
    [cx + u4[0] * min, cy + u4[1] * min],
    [cx + u4[0] * max, cy + u4[1] * max]
  ];
}
function prolongacion(p, q, poligono) {
  const l = Math.hypot(p[0] - q[0], p[1] - q[1]);
  if (l < 1e-9 || poligono.length < 3) return 0;
  const u4 = [(p[0] - q[0]) / l, (p[1] - q[1]) / l];
  const region = { exterior: poligono, huecos: [] };
  let avance = 0;
  while (avance < 1.5) {
    const siguiente = avance + 0.05;
    if (!dentroDeRegion(region, [
      p[0] + u4[0] * siguiente,
      p[1] + u4[1] * siguiente
    ]))
      break;
    avance = siguiente;
  }
  return avance;
}
var PASO_DE_COLA_MM = 0.05;
function colaDeInglete(col, extremo) {
  if (col.cerrada || col[extremo]?.tipo !== "inglete" || col.estaciones.length < 2) return null;
  const e = extremo === "fin" ? col.estaciones[col.estaciones.length - 1] : col.estaciones[0];
  const izq = extremo === "fin" ? col.izq.slice(e.iIzq) : col.izq.slice(0, e.iIzq + 1).reverse();
  const der = extremo === "fin" ? col.der.slice(e.iDer) : col.der.slice(0, e.iDer + 1).reverse();
  const largo = (l) => l.reduce((t, q, i) => i ? t + Math.hypot(q[0] - l[i - 1][0], q[1] - l[i - 1][1]) : 0, 0);
  const li = largo(izq);
  const ld = largo(der);
  if (Math.max(li, ld) < PASO_DE_COLA_MM) return null;
  const en = (l, total, t) => {
    if (l.length < 2 || total < 1e-9) return l[0];
    let resta = t * total;
    for (let i = 1; i < l.length; i++) {
      const s = Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]);
      if (resta <= s || i === l.length - 1) {
        const u4 = s < 1e-12 ? 0 : Math.min(1, resta / s);
        return [l[i - 1][0] + (l[i][0] - l[i - 1][0]) * u4, l[i - 1][1] + (l[i][1] - l[i - 1][1]) * u4];
      }
      resta -= s;
    }
    return l[l.length - 1];
  };
  const n2 = Math.max(1, Math.ceil(Math.max(li, ld) / PASO_DE_COLA_MM));
  const cola = [];
  for (let k = 1; k <= n2; k++) {
    const a = en(izq, li, k / n2);
    const b = en(der, ld, k / n2);
    cola.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
  }
  return cola;
}
var RAIL_MINIMO_MM = 0.05;
function extremosLibres(col) {
  if (col.cerrada) return 0;
  return (col.inicio?.tipo === "remate" ? 1 : 0) + (col.fin?.tipo === "remate" ? 1 : 0);
}
function saleDeLaRegion(region, a, b) {
  const pasos = Math.max(2, Math.ceil(distancia3(a, b) / 0.2));
  for (let k = 1; k < pasos; k++) {
    const t = k / pasos;
    if (!dentroDeRegion(region, [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t
    ]))
      return true;
  }
  return false;
}
function centroDe(puntos) {
  let x = 0;
  let y = 0;
  for (const p of puntos) {
    x += p[0];
    y += p[1];
  }
  return [x / Math.max(1, puntos.length), y / Math.max(1, puntos.length)];
}
function orientar(anillo) {
  return areaConSigno(anillo) >= 0 ? anillo : [...anillo].reverse();
}
function contarNodos(d) {
  return Math.max(1, (d.match(/[MmLlHhVvCcSsQqTtAa]/g) ?? []).length);
}
function aContrato(o, entrada2) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const [x, y] of o.puntos) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const stitch = o.tipo === "satin" ? {
    type: "satin",
    satinMode: "rails",
    spacingMm: o.densidad,
    pullCompensationMm: o.compensacion,
    underlay: o.underlay,
    trimAfter: o.cortarDespues ?? false
  } : o.tipo === "running" ? {
    type: "running",
    strokeWidthMm: 0.3,
    maxStitchLengthMm: entrada2.profile.stitches.maxStitchLengthMm,
    trimAfter: o.cortarDespues ?? false,
    ...o.repeticiones !== void 0 && {
      beanRepeats: o.repeticiones
    },
    ...o.toleranciaMm !== void 0 && {
      toleranceMm: o.toleranciaMm
    },
    ...o.reparto !== void 0 && { placement: o.reparto }
  } : {
    type: "fill",
    spacingMm: o.densidad,
    // Ink/Stitch lee el ángulo módulo 180: una fila no tiene sentido.
    angleDeg: Number(
      (((o.angulo ?? 45) % 180 + 180) % 180).toFixed(1)
    ),
    maxStitchLengthMm: entrada2.profile.stitches.maxStitchLengthMm,
    underlay: o.underlay,
    pullCompensationMm: o.compensacion,
    trimAfter: o.cortarDespues ?? false
  };
  return {
    id: o.id,
    sourceObjectId: entrada2.sourceObjectId,
    sourceType: entrada2.sourceType,
    classification: entrada2.classification,
    colorId: o.color,
    geometry: {
      kind: "path",
      d: o.geometria.d,
      fillRule: o.tipo === "fill" ? o.geometria.reglaDeRelleno ?? "evenodd" : void 0
    },
    stitch,
    ...o.rol === "traslado" && { role: "travel" },
    quality: o.tipo === "satin" && o.anchoMm ? {
      minWidthMm: Number(o.anchoMm.minimo.toFixed(3)),
      maxWidthMm: Number(o.anchoMm.maximo.toFixed(3)),
      averageWidthMm: Number(o.anchoMm.mediana.toFixed(3)),
      representationDecision: "rails-v3",
      representationReasons: ["VECTOR_OUTLINE"],
      lengthMm: o.largoMm !== void 0 ? Number(o.largoMm.toFixed(3)) : void 0
    } : void 0,
    bounds: {
      xMm: Math.max(0, minX),
      yMm: Math.max(0, minY),
      widthMm: Math.max(0.05, maxX - minX),
      heightMm: Math.max(0.05, maxY - minY)
    },
    nodeCount: contarNodos(o.geometria.d)
  };
}

// packages/bordado/src/vector/ruta.ts
var COLAPSO_MM = 3;
var SALTO_MAXIMO_DST_MM = 12.1;
var TRASLADO_MAXIMO_MM = 12;
var MARGEN_OCULTO_MM = 0.15;
var EXPOSICION_MAXIMA_MM = 0.4;
var PESO = {
  distancia: 0.3,
  salto: 2,
  corte: 10,
  flotante: 0.5,
  traslado: 0.15,
  objetoDeTraslado: 0.5,
  /**
   * Partir un grupo estructural (una pieza conexa del diseño: una letra, un
   * símbolo, un icono) en dos tandas separadas por otra cosa. Pesa casi lo
   * de un corte: el enrutador sólo lo hace si ahorra más que eso.
   */
  grupoPartido: 8
};
var dist4 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function cajaDe2(paths) {
  const caja = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY
  };
  for (const p of paths)
    for (const q of p) {
      caja.minX = Math.min(caja.minX, q.x);
      caja.minY = Math.min(caja.minY, q.y);
      caja.maxX = Math.max(caja.maxX, q.x);
      caja.maxY = Math.max(caja.maxY, q.y);
    }
  return caja;
}
function dentro(paths, caja, p) {
  if (p[0] < caja.minX || p[0] > caja.maxX || p[1] < caja.minY || p[1] > caja.maxY)
    return false;
  let si = false;
  for (const anillo of paths) {
    const n2 = anillo.length;
    for (let i = 0, j = n2 - 1; i < n2; j = i++) {
      const a = anillo[i];
      const b = anillo[j];
      if (a.y > p[1] !== b.y > p[1] && p[0] < (b.x - a.x) * (p[1] - a.y) / (b.y - a.y) + a.x)
        si = !si;
    }
  }
  return si;
}
function tapa(o) {
  if (o.tipo === "running") return [];
  const paths = inflatePathsD(
    coberturaDe(o),
    -MARGEN_OCULTO_MM,
    JoinType.Miter,
    EndType.Polygon,
    2,
    4
  );
  return paths.length ? [{ caja: cajaDe2(paths), paths }] : [];
}
function unidadesDe(bloque) {
  const { ir, ruta } = bloque;
  const grupos = [];
  const deCadena = /* @__PURE__ */ new Map();
  ruta.forEach((info, i) => {
    if (info.cadena === void 0) {
      grupos.push([i]);
      return;
    }
    const g = deCadena.get(info.cadena);
    if (g) g.push(i);
    else {
      const nuevo = [i];
      deCadena.set(info.cadena, nuevo);
      grupos.push(nuevo);
    }
  });
  const unidadDe = /* @__PURE__ */ new Map();
  grupos.forEach((g, k) => {
    for (const i of g) unidadDe.set(i, k);
  });
  const numeroDeGrupo = /* @__PURE__ */ new Map();
  const grupoDe = (i) => {
    const clave2 = ir[i].traza?.grupo ?? `region-${ruta[i].region}`;
    let n2 = numeroDeGrupo.get(clave2);
    if (n2 === void 0) {
      n2 = numeroDeGrupo.size;
      numeroDeGrupo.set(clave2, n2);
    }
    return n2;
  };
  const unidades = grupos.map((miembros) => {
    const primero = ruta[miembros[0]];
    const ultimo = ruta[miembros[miembros.length - 1]];
    return {
      miembros,
      inicio: primero.inicio,
      fin: ultimo.fin,
      /* SÓLO SE INVIERTE UN CORRIDO. Un satin cosido al revés cambia la
         fase del zigzag y el sentido del underlay: en Kustto a 80 mm la
         puntada de una esquina pasó de 6.19 a 6.81 mm y el diseño fue a
         revisión por STITCH_TOO_LONG. Eso es cambiar el acabado. */
      invertible: miembros.every(
        (i) => ruta[i].invertir && ir[i].tipo === "running"
      ),
      antes: /* @__PURE__ */ new Set(),
      despues: /* @__PURE__ */ new Set(),
      extremosFiables: ir[miembros[0]].tipo !== "fill" && ir[miembros[miembros.length - 1]].tipo !== "fill",
      region: primero.region,
      grupo: grupoDe(miembros[0]),
      forma: primero.forma,
      cubre: miembros.flatMap((i) => tapa(ir[i]))
    };
  });
  unidades.forEach((u4, k) => {
    for (const i of u4.miembros)
      for (const a of ruta[i].antes) {
        const otra = unidadDe.get(a);
        if (otra === void 0 || otra >= k) continue;
        u4.antes.add(otra);
        unidades[otra].despues.add(k);
      }
  });
  return unidades;
}
var extremos = (u4, alReves) => alReves ? [u4.fin, u4.inicio] : [u4.inicio, u4.fin];
var Bloque = class {
  constructor(bloque, tapadoDespues) {
    this.tapadoDespues = tapadoDespues;
    this.muestras = /* @__PURE__ */ new Map();
    /** Por celda de 1 mm, qué unidades tienen algo que tape ahí. */
    this.rejilla = /* @__PURE__ */ new Map();
    this.salidas = /* @__PURE__ */ new Map();
    this.unidades = unidadesDe(bloque);
    this.unidades.forEach((u4, i) => {
      for (const c of u4.cubre)
        for (let x = Math.floor(c.caja.minX); x <= Math.floor(c.caja.maxX); x++)
          for (let y = Math.floor(c.caja.minY); y <= Math.floor(c.caja.maxY); y++) {
            const clave2 = `${x},${y}`;
            const lista2 = this.rejilla.get(clave2);
            if (!lista2) this.rejilla.set(clave2, [i]);
            else if (lista2[lista2.length - 1] !== i) lista2.push(i);
          }
    });
  }
  /**
   * Los puntos del traslado recto y quién los tapa, una vez por par. Si un
   * trozo más largo que la exposición permitida no lo tapa NADA —ni este
   * bloque ni uno posterior—, el traslado nunca puede ser oculto y no se
   * sigue mirando (`puntos: null`): es casi siempre el caso, y mirar cada
   * punto de cada par tardaba 85 s en Starbucks.
   */
  muestrasDe(clave2, a, b) {
    let m = this.muestras.get(clave2);
    if (m) return m;
    const d = dist4(a, b);
    const n2 = Math.max(1, Math.ceil(d / 0.1));
    let puntos = [];
    if (d > TRASLADO_MAXIMO_MM) puntos = null;
    let desnudo = 0;
    for (let k = 0; puntos && k <= n2; k++) {
      const p = [
        a[0] + (b[0] - a[0]) * k / n2,
        a[1] + (b[1] - a[1]) * k / n2
      ];
      const unidades = [];
      for (const i of this.rejilla.get(
        `${Math.floor(p[0])},${Math.floor(p[1])}`
      ) ?? [])
        if (this.unidades[i].cubre.some((c) => dentro(c.paths, c.caja, p)))
          unidades.push(i);
      const despues = !unidades.length && this.tapadoDespues(p);
      if (!unidades.length && !despues) {
        desnudo += d / n2;
        if (desnudo > EXPOSICION_MAXIMA_MM) puntos = null;
      }
      puntos?.push({ despues, unidades });
    }
    m = { d, puntos };
    this.muestras.set(clave2, m);
    return m;
  }
  /**
   * Si el traslado recto de `a` a `b`, cosido justo después de la unidad
   * en la posición `desde`, queda tapado por lo que se cose más tarde.
   */
  oculto(clave2, a, b, desde, posicion) {
    const { d, puntos } = this.muestrasDe(clave2, a, b);
    if (!puntos?.length) return false;
    const paso = d / Math.max(1, puntos.length - 1);
    let visto = 0;
    for (const p of puntos) {
      if (p.despues || p.unidades.some((u4) => posicion[u4] > desde)) continue;
      visto += paso;
      if (visto > EXPOSICION_MAXIMA_MM) return false;
    }
    return true;
  }
  /**
   * `saleDeLaRegion` con memoria: una región de un logo real tiene miles de
   * vértices. V6.9.0: la clave es el par de extremos por su número (unidad y
   * sentido de cada lado), no un texto con sus coordenadas: se pregunta
   * millones de veces al ordenar un logo de cientos de objetos, y armar el
   * texto costaba más que la respuesta guardada. Los mismos extremos.
   */
  sale(clave2, forma, a, b) {
    let r = this.salidas.get(clave2);
    if (r === void 0) {
      r = saleDeLaRegion(forma, a, b);
      this.salidas.set(clave2, r);
    }
    return r;
  }
  /** El coste de ir del final de `u` al principio de `v`, y cómo. */
  traslado(u4, uAlReves, v2, vAlReves, posicion) {
    const U = this.unidades[u4];
    const V = this.unidades[v2];
    const a = extremos(U, uAlReves)[1];
    const b = extremos(V, vAlReves)[0];
    const d = dist4(a, b);
    const saltos = Math.max(1, Math.ceil(d / SALTO_MAXIMO_DST_MM));
    const clave2 = (2 * u4 + (uAlReves ? 1 : 0)) * 2 * this.unidades.length + 2 * v2 + (vAlReves ? 1 : 0);
    const dentroDeLaForma = U.region === V.region && !this.sale(clave2, U.forma, a, b);
    const fiable = U.extremosFiables && V.extremosFiables;
    if (dentroDeLaForma && d <= COLAPSO_MM)
      return {
        coste: PESO.distancia * d,
        type: "jump",
        d,
        reason: "dentro de la forma y a menos de 3 mm: Ink/Stitch lo cose recto, del mismo hilo"
      };
    if (fiable && this.oculto(clave2, a, b, posicion[u4], posicion))
      return {
        coste: PESO.traslado * d + (d > COLAPSO_MM ? PESO.objetoDeTraslado : 0),
        type: "hidden_travel",
        d,
        reason: d > COLAPSO_MM ? "corrido de traslado bajo lo que se cose despu\xE9s: sin corte ni hilo suelto" : "a menos de 3 mm y tapado por lo que se cose despu\xE9s: sin corte"
      };
    if (dentroDeLaForma)
      return {
        coste: PESO.salto * saltos + (PESO.distancia + PESO.flotante) * d,
        type: "jump",
        d,
        reason: "salto sin corte dentro de la forma: el hilo queda sobre el bordado"
      };
    return {
      coste: PESO.corte + PESO.salto * saltos + PESO.distancia * d,
      type: "trim_jump",
      d,
      reason: "sale de la forma y no hay nada que lo tape: corte y salto"
    };
  }
  /** La entrada del bloque: siempre con corte (lo pone el cambio de color o el final del bloque anterior). */
  entrada(desde, v2, alReves) {
    if (!desde) return 0;
    const d = dist4(desde, extremos(this.unidades[v2], alReves)[0]);
    return PESO.distancia * d + PESO.salto * Math.max(1, Math.ceil(d / SALTO_MAXIMO_DST_MM));
  }
  posiciones(orden) {
    const pos = new Float64Array(this.unidades.length);
    orden.forEach((p, i) => {
      pos[p.u] = i;
    });
    return pos;
  }
  coste(orden, desde) {
    if (!orden.length) return 0;
    const pos = this.posiciones(orden);
    let total = this.entrada(desde, orden[0].u, orden[0].alReves);
    for (let i = 1; i < orden.length; i++)
      total += this.traslado(
        orden[i - 1].u,
        orden[i - 1].alReves,
        orden[i].u,
        orden[i].alReves,
        pos
      ).coste;
    return total + PESO.grupoPartido * this.gruposPartidos(orden);
  }
  /** Cuántas veces un grupo estructural se retoma después de haberlo dejado. */
  gruposPartidos(orden) {
    const tandas = /* @__PURE__ */ new Map();
    let previa = -1;
    for (const { u: u4 } of orden) {
      const g = this.unidades[u4].grupo;
      if (g !== previa) tandas.set(g, (tandas.get(g) ?? 0) + 1);
      previa = g;
    }
    let partidos = 0;
    for (const t of tandas.values()) partidos += t - 1;
    return partidos;
  }
  valido(orden) {
    const pos = this.posiciones(orden);
    return orden.every(
      ({ u: u4 }) => [...this.unidades[u4].antes].every((a) => pos[a] < pos[u4])
    );
  }
  /** Voraz: cada vez, la unidad libre que menos cuesta alcanzar. */
  voraz(desde) {
    const n2 = this.unidades.length;
    const puesta = new Uint8Array(n2);
    const pos = new Float64Array(n2).fill(n2);
    const orden = [];
    while (orden.length < n2) {
      let mejor = null;
      let menor = Number.POSITIVE_INFINITY;
      for (let v2 = 0; v2 < n2; v2++) {
        if (puesta[v2]) continue;
        if ([...this.unidades[v2].antes].some((a) => !puesta[a])) continue;
        for (const alReves of this.unidades[v2].invertible ? [false, true] : [false]) {
          const ultimo = orden.length ? this.unidades[orden[orden.length - 1].u] : null;
          const dejaGrupo = ultimo && ultimo.grupo !== this.unidades[v2].grupo && this.unidades.some(
            (x, k) => !puesta[k] && k !== v2 && x.grupo === ultimo.grupo
          );
          const c = (orden.length ? this.traslado(
            orden[orden.length - 1].u,
            orden[orden.length - 1].alReves,
            v2,
            alReves,
            pos
          ).coste : this.entrada(desde, v2, alReves)) + (dejaGrupo ? PESO.grupoPartido : 0);
          if (c < menor - 1e-9) {
            menor = c;
            mejor = { u: v2, alReves };
          }
        }
      }
      if (!mejor) {
        const v2 = [...Array(n2).keys()].find((k) => !puesta[k]);
        mejor = { u: v2, alReves: false };
      }
      puesta[mejor.u] = 1;
      pos[mejor.u] = orden.length;
      orden.push(mejor);
    }
    return orden;
  }
  /**
   * Mejora local (or-opt): sacar una unidad y ponerla en otro sitio, o darle
   * la vuelta, mientras baje el coste. Cada movimiento se estima con los
   * traslados que toca y se confirma con el coste entero, porque mover una
   * unidad cambia qué queda tapado después de otras.
   */
  mejorar(orden, desde, limite = 60) {
    let actual = orden;
    let costeActual = this.coste(actual, desde);
    const T = (seq, k, p) => {
      if (k < 0 || k >= seq.length) return 0;
      if (k === 0) return this.entrada(desde, seq[0].u, seq[0].alReves);
      return this.traslado(
        seq[k - 1].u,
        seq[k - 1].alReves,
        seq[k].u,
        seq[k].alReves,
        p
      ).coste;
    };
    const pasoCon = (resto, j, metido, k) => k < j ? resto[k] : k === j ? metido : resto[k - 1];
    const Tcon = (resto, j, metido, k, p) => {
      const n2 = resto.length + 1;
      if (k < 0 || k >= n2) return 0;
      const b = pasoCon(resto, j, metido, k);
      if (k === 0) return this.entrada(desde, b.u, b.alReves);
      const a = pasoCon(resto, j, metido, k - 1);
      return this.traslado(a.u, a.alReves, b.u, b.alReves, p).coste;
    };
    for (let vuelta = 0; vuelta < limite; vuelta++) {
      const candidatos = [];
      const n2 = actual.length;
      const pos = this.posiciones(actual);
      for (let i = 0; i < n2; i++) {
        const paso = actual[i];
        const unidad = this.unidades[paso.u];
        const resto = [...actual.slice(0, i), ...actual.slice(i + 1)];
        const fuera = T(actual, i, pos) + T(actual, i + 1, pos);
        let ultimoAntes = -1;
        let primerDespues = resto.length;
        for (let k = 0; k < resto.length; k++) {
          if (unidad.antes.has(resto[k].u)) ultimoAntes = k;
          if (primerDespues === resto.length && unidad.despues.has(resto[k].u))
            primerDespues = k;
        }
        for (let j = ultimoAntes + 1; j <= Math.min(resto.length, primerDespues); j++) {
          for (const alReves of unidad.invertible ? [false, true] : [false]) {
            if (j === i && alReves === paso.alReves) continue;
            const metido = { u: paso.u, alReves };
            const suya = pos[paso.u];
            pos[paso.u] = j - 0.5 + (j > i ? 1 : 0);
            const delta = Tcon(resto, j, metido, j, pos) + Tcon(resto, j, metido, j + 1, pos) - (j === i ? 0 : T(resto, j, pos)) + (j === i ? 0 : T(resto, i, pos)) - fuera;
            pos[paso.u] = suya;
            if (delta < -1e-6)
              candidatos.push({
                delta,
                orden: [...resto.slice(0, j), metido, ...resto.slice(j)]
              });
          }
        }
      }
      if (!candidatos.length) break;
      candidatos.sort((a, b) => a.delta - b.delta);
      let aceptado = false;
      for (const c of candidatos.slice(0, 6)) {
        const coste = this.coste(c.orden, desde);
        if (coste < costeActual - 1e-6 && this.valido(c.orden)) {
          actual = c.orden;
          costeActual = coste;
          aceptado = true;
          break;
        }
      }
      if (!aceptado) break;
    }
    return actual;
  }
};
function routeEmbroideryObjects(bloques, opciones) {
  const t0 = performance.now();
  const tapas = bloques.map((b) => b.ir.flatMap(tapa));
  const salida2 = [];
  let costeAntes = 0;
  let costeDespues = 0;
  let desde = opciones.desde ?? null;
  let mejorado = false;
  bloques.forEach((bloque, k) => {
    const posteriores = tapas.slice(k + 1).flat();
    const enrutador = new Bloque(
      bloque,
      (p) => posteriores.some((c) => dentro(c.paths, c.caja, p))
    );
    const n2 = enrutador.unidades.length;
    if (!n2) {
      salida2.push({ ir: [], decisiones: [] });
      return;
    }
    const original = enrutador.unidades.map((_, u4) => ({
      u: u4,
      alReves: false
    }));
    const cOriginal = enrutador.coste(original, desde);
    const voraz = enrutador.voraz(desde);
    let mejor = enrutador.valido(original) ? original : voraz;
    let cMejor = enrutador.coste(mejor, desde);
    for (const inicial of [original, voraz]) {
      const pulido = enrutador.mejorar(inicial, desde);
      const c = enrutador.coste(pulido, desde);
      if (c < cMejor - 1e-6 && enrutador.valido(pulido)) {
        mejor = pulido;
        cMejor = c;
      }
    }
    costeAntes += cOriginal;
    costeDespues += cMejor;
    if (mejor !== original) mejorado = true;
    const pos = enrutador.posiciones(mejor);
    const ir = [];
    const decisiones = [];
    mejor.forEach((paso, i) => {
      const unidad = enrutador.unidades[paso.u];
      const miembros = paso.alReves ? [...unidad.miembros].reverse() : unidad.miembros;
      miembros.forEach((m, k2) => {
        if (paso.alReves) bloque.ruta[m].invertir?.();
        if (k2 < miembros.length - 1) bloque.ir[m].cortarDespues = false;
        ir.push(bloque.ir[m]);
      });
      const siguiente = mejor[i + 1];
      if (!siguiente) return;
      const t = enrutador.traslado(
        paso.u,
        paso.alReves,
        siguiente.u,
        siguiente.alReves,
        pos
      );
      const ultimo = ir[ir.length - 1];
      const primero = bloque.ir[(siguiente.alReves ? [...enrutador.unidades[siguiente.u].miembros].reverse() : enrutador.unidades[siguiente.u].miembros)[0]];
      ultimo.cortarDespues = t.type === "trim_jump";
      const a = extremos(unidad, paso.alReves)[1];
      const b = extremos(enrutador.unidades[siguiente.u], siguiente.alReves)[0];
      decisiones.push({
        de: ultimo.id,
        a: primero.id,
        type: t.type,
        distanceMm: Number(t.d.toFixed(2)),
        reason: t.reason,
        desde: a,
        hasta: b
      });
      if (t.type === "hidden_travel" && t.d > COLAPSO_MM)
        ir.push(trasladoOculto(ultimo, a, b, opciones.runningLengthMm));
    });
    desde = extremos(
      enrutador.unidades[mejor[mejor.length - 1].u],
      mejor[mejor.length - 1].alReves
    )[1];
    salida2.push({ ir, decisiones });
  });
  return {
    bloques: salida2,
    costeAntes: Number(costeAntes.toFixed(2)),
    costeDespues: Number(costeDespues.toFixed(2)),
    mejorado,
    ms: Math.round(performance.now() - t0)
  };
}
function trasladoOculto(de2, a, b, largo) {
  const r = (v2) => Number(v2.toFixed(3));
  return {
    id: "",
    color: de2.color,
    tipo: "running",
    origen: de2.origen,
    geometria: { d: `M${r(a[0])} ${r(a[1])}L${r(b[0])} ${r(b[1])}` },
    densidad: largo,
    underlay: false,
    compensacion: 0,
    motivo: `traslado oculto de ${dist4(a, b).toFixed(1)} mm bajo lo que se cose despu\xE9s: sin corte`,
    cortarDespues: false,
    largoMm: dist4(a, b),
    puntos: [a, b],
    repeticiones: 0,
    rol: "traslado",
    traza: { ...de2.traza }
  };
}

// packages/bordado/src/vector/svg.ts
var import_svg_parser = __toESM(require_svg_parser_umd(), 1);
var import_svgpath2 = __toESM(require_svgpath2(), 1);

// packages/bordado/src/vector/clipperZ.ts
var ClipperDConZ = class extends ClipperD {
  constructor(precision) {
    super(precision);
    this.factor = 10 ** precision;
  }
  addPaths(paths, polytype, isOpen = false) {
    const escalados = paths.map(
      (p) => p.map((q) => ({
        x: Math.round(q.x * this.factor),
        y: Math.round(q.y * this.factor),
        z: q.z ?? 0
      }))
    );
    const base = Object.getPrototypeOf(ClipperD.prototype);
    base.addPaths.call(this, escalados, polytype, isOpen);
  }
};
function operar(tipo, sujeto, recorte2, regla, precision) {
  const c = new ClipperDConZ(precision);
  c.zCallback = (b1, t1, b2, t2, p) => {
    p.z = b1.z || t1.z || b2.z || t2.z || 0;
  };
  c.addPaths(sujeto, PathType.Subject);
  if (recorte2?.length) c.addPaths(recorte2, PathType.Clip);
  const salida2 = [];
  c.execute(tipo, regla, salida2);
  return salida2;
}
var unirConZ = (sujeto, regla, precision) => operar(ClipType.Union, sujeto, null, regla, precision);
var cortarConZ = (sujeto, recorte2, regla, precision) => operar(ClipType.Intersection, sujeto, recorte2, regla, precision);
var etiquetasDe = (anillo) => [...new Set(anillo.map((q) => q.z ?? 0).filter((z) => z !== 0))].sort(
  (a, b) => a - b
);

// packages/bordado/src/vector/svg.ts
var LIMITES_SVG = {
  /** Elementos con forma (`path`, `rect`, …). */
  elementos: 3e3,
  /** Comandos de trazado, sumados en todo el archivo. */
  nodos: 8e4,
  /** Puntos después de aplanar las curvas. */
  puntos: 4e5,
  /** Grupos, `<use>` y `<svg>` anidados. */
  profundidad: 32
};
var ErrorDeSvg = class extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.codigo = codigo;
    this.name = "ErrorDeSvg";
  }
};
var demasiado = (que) => new ErrorDeSvg(
  "SVG_DEMASIADO_COMPLEJO",
  `El SVG supera el l\xEDmite de ${que}; simplif\xEDcalo o convi\xE9rtelo a menos formas.`
);
var PRECISION3 = 4;
var IDENTIDAD = [1, 0, 0, 1, 0, 0];
function por(m1, m2) {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f22] = m2;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f22 + e1,
    b1 * e2 + d1 * f22 + f1
  ];
}
var trasladar = (x, y) => [1, 0, 0, 1, x, y];
var escalar = (x, y = x) => [x, 0, 0, y, 0, 0];
function aplicar(m, [x, y]) {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}
function escalasDe(m) {
  const [a, b, c, d] = m;
  const s = a * a + b * b + c * c + d * d;
  const det = Math.abs(a * d - b * c);
  const raiz = Math.sqrt(Math.max(0, s * s - 4 * det * det));
  return [Math.sqrt((s + raiz) / 2), Math.sqrt(Math.max(0, (s - raiz) / 2))];
}
var GRADOS = Math.PI / 180;
function matrizDeTransform(texto2) {
  if (!texto2) return IDENTIDAD;
  let m = IDENTIDAD;
  const funciones = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  for (let f3 = funciones.exec(texto2); f3; f3 = funciones.exec(texto2)) {
    const n2 = numeros(f3[2]);
    let paso = IDENTIDAD;
    switch (f3[1]) {
      case "matrix":
        if (n2.length === 6) paso = n2;
        break;
      case "translate":
        paso = trasladar(n2[0] ?? 0, n2[1] ?? 0);
        break;
      case "scale":
        paso = escalar(n2[0] ?? 1, n2[1] ?? n2[0] ?? 1);
        break;
      case "rotate": {
        const a = (n2[0] ?? 0) * GRADOS;
        const giro = [
          Math.cos(a),
          Math.sin(a),
          -Math.sin(a),
          Math.cos(a),
          0,
          0
        ];
        paso = n2.length >= 3 ? por(por(trasladar(n2[1], n2[2]), giro), trasladar(-n2[1], -n2[2])) : giro;
        break;
      }
      case "skewX":
        paso = [1, 0, Math.tan((n2[0] ?? 0) * GRADOS), 1, 0, 0];
        break;
      case "skewY":
        paso = [1, Math.tan((n2[0] ?? 0) * GRADOS), 0, 1, 0, 0];
        break;
    }
    m = por(m, paso);
  }
  return m;
}
function numeros(texto2) {
  return (texto2.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? []).map(
    Number
  );
}
var UNIDADES = {
  "": 1,
  px: 1,
  pt: 96 / 72,
  pc: 16,
  mm: 96 / 25.4,
  cm: 96 / 2.54,
  in: 96,
  em: 16,
  rem: 16,
  ex: 8
};
function longitud(valor, referencia, porDefecto) {
  if (valor === void 0) return porDefecto;
  const m = /^\s*([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)\s*([a-z%]*)\s*$/i.exec(
    valor
  );
  if (!m) return porDefecto;
  const n2 = Number(m[1]);
  const unidad = m[2].toLowerCase();
  if (unidad === "%") return n2 / 100 * referencia;
  return n2 * (UNIDADES[unidad] ?? 1);
}
var NOMBRES = "aliceblue:f0f8ff,antiquewhite:faebd7,aqua:00ffff,aquamarine:7fffd4,azure:f0ffff,beige:f5f5dc,bisque:ffe4c4,black:000000,blanchedalmond:ffebcd,blue:0000ff,blueviolet:8a2be2,brown:a52a2a,burlywood:deb887,cadetblue:5f9ea0,chartreuse:7fff00,chocolate:d2691e,coral:ff7f50,cornflowerblue:6495ed,cornsilk:fff8dc,crimson:dc143c,cyan:00ffff,darkblue:00008b,darkcyan:008b8b,darkgoldenrod:b8860b,darkgray:a9a9a9,darkgreen:006400,darkgrey:a9a9a9,darkkhaki:bdb76b,darkmagenta:8b008b,darkolivegreen:556b2f,darkorange:ff8c00,darkorchid:9932cc,darkred:8b0000,darksalmon:e9967a,darkseagreen:8fbc8f,darkslateblue:483d8b,darkslategray:2f4f4f,darkslategrey:2f4f4f,darkturquoise:00ced1,darkviolet:9400d3,deeppink:ff1493,deepskyblue:00bfff,dimgray:696969,dimgrey:696969,dodgerblue:1e90ff,firebrick:b22222,floralwhite:fffaf0,forestgreen:228b22,fuchsia:ff00ff,gainsboro:dcdcdc,ghostwhite:f8f8ff,gold:ffd700,goldenrod:daa520,gray:808080,green:008000,greenyellow:adff2f,grey:808080,honeydew:f0fff0,hotpink:ff69b4,indianred:cd5c5c,indigo:4b0082,ivory:fffff0,khaki:f0e68c,lavender:e6e6fa,lavenderblush:fff0f5,lawngreen:7cfc00,lemonchiffon:fffacd,lightblue:add8e6,lightcoral:f08080,lightcyan:e0ffff,lightgoldenrodyellow:fafad2,lightgray:d3d3d3,lightgreen:90ee90,lightgrey:d3d3d3,lightpink:ffb6c1,lightsalmon:ffa07a,lightseagreen:20b2aa,lightskyblue:87cefa,lightslategray:778899,lightslategrey:778899,lightsteelblue:b0c4de,lightyellow:ffffe0,lime:00ff00,limegreen:32cd32,linen:faf0e6,magenta:ff00ff,maroon:800000,mediumaquamarine:66cdaa,mediumblue:0000cd,mediumorchid:ba55d3,mediumpurple:9370db,mediumseagreen:3cb371,mediumslateblue:7b68ee,mediumspringgreen:00fa9a,mediumturquoise:48d1cc,mediumvioletred:c71585,midnightblue:191970,mintcream:f5fffa,mistyrose:ffe4e1,moccasin:ffe4b5,navajowhite:ffdead,navy:000080,oldlace:fdf5e6,olive:808000,olivedrab:6b8e23,orange:ffa500,orangered:ff4500,orchid:da70d6,palegoldenrod:eee8aa,palegreen:98fb98,paleturquoise:afeeee,palevioletred:db7093,papayawhip:ffefd5,peachpuff:ffdab9,peru:cd853f,pink:ffc0cb,plum:dda0dd,powderblue:b0e0e6,purple:800080,rebeccapurple:663399,red:ff0000,rosybrown:bc8f8f,royalblue:4169e1,saddlebrown:8b4513,salmon:fa8072,sandybrown:f4a460,seagreen:2e8b57,seashell:fff5ee,sienna:a0522d,silver:c0c0c0,skyblue:87ceeb,slateblue:6a5acd,slategray:708090,slategrey:708090,snow:fffafa,springgreen:00ff7f,steelblue:4682b4,tan:d2b48c,teal:008080,thistle:d8bfd8,tomato:ff6347,turquoise:40e0d0,violet:ee82ee,wheat:f5deb3,white:ffffff,whitesmoke:f5f5f5,yellow:ffff00,yellowgreen:9acd32";
var COLORES_CON_NOMBRE = new Map(
  NOMBRES.split(",").map((par) => {
    const [nombre, hex2] = par.split(":");
    return [nombre, `#${hex2}`];
  })
);
var aHex = (r, g, b) => `#${[r, g, b].map(
  (v2) => Math.round(Math.min(255, Math.max(0, v2))).toString(16).padStart(2, "0")
).join("")}`;
function hslARgb(h, s, l) {
  const k = (n2) => (n2 + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f3 = (n2) => l - a * Math.max(-1, Math.min(k(n2) - 3, Math.min(9 - k(n2), 1)));
  return [f3(0) * 255, f3(8) * 255, f3(4) * 255];
}
function leerColor(texto2) {
  const v2 = texto2.trim().toLowerCase();
  if (v2 === "transparent") return { hex: "#000000", alfa: 0 };
  const nombrado = COLORES_CON_NOMBRE.get(v2);
  if (nombrado) return { hex: nombrado, alfa: 1 };
  let m = /^#([0-9a-f]{3,8})$/.exec(v2);
  if (m) {
    const h2 = m[1];
    if (h2.length === 3 || h2.length === 4) {
      const [r2, g2, b2, a] = [...h2].map((c) => Number.parseInt(c + c, 16));
      return { hex: aHex(r2, g2, b2), alfa: h2.length === 4 ? a / 255 : 1 };
    }
    if (h2.length === 6 || h2.length === 8)
      return {
        hex: `#${h2.slice(0, 6)}`,
        alfa: h2.length === 8 ? Number.parseInt(h2.slice(6), 16) / 255 : 1
      };
    return null;
  }
  m = /^(rgba?|hsla?)\(([^)]*)\)$/.exec(v2);
  if (!m) return null;
  const partes = m[2].split(/[\s,/]+/).filter(Boolean);
  const canal = (p, maximo) => p.endsWith("%") ? Number.parseFloat(p) / 100 * maximo : Number(p);
  const alfa = partes[3] === void 0 ? 1 : Math.min(1, Math.max(0, canal(partes[3], 1)));
  if (m[1].startsWith("rgb")) {
    const [r2, g2, b2] = partes.slice(0, 3).map((p) => canal(p, 255));
    if ([r2, g2, b2].some((c) => !Number.isFinite(c))) return null;
    return { hex: aHex(r2, g2, b2), alfa };
  }
  const h = Number.parseFloat(partes[0]);
  const s = Number.parseFloat(partes[1]) / 100;
  const l = Number.parseFloat(partes[2]) / 100;
  if (![h, s, l].every(Number.isFinite)) return null;
  const [r, g, b] = hslARgb((h % 360 + 360) % 360, s, l);
  return { hex: aHex(r, g, b), alfa };
}
function declaraciones(texto2) {
  const salida2 = /* @__PURE__ */ new Map();
  let profundidad = 0;
  let inicio = 0;
  const partes = [];
  for (let i = 0; i <= texto2.length; i++) {
    const c = texto2[i];
    if (c === "(") profundidad++;
    else if (c === ")") profundidad = Math.max(0, profundidad - 1);
    else if (c === ";" && !profundidad || i === texto2.length) {
      partes.push(texto2.slice(inicio, i));
      inicio = i + 1;
    }
  }
  for (const parte of partes) {
    const dosPuntos = parte.indexOf(":");
    if (dosPuntos < 0) continue;
    const propiedad = parte.slice(0, dosPuntos).trim().toLowerCase();
    const valor = parte.slice(dosPuntos + 1).replace(/!important/i, "").trim();
    if (propiedad && valor) salida2.set(propiedad, valor);
  }
  return salida2;
}
function leerSelector(texto2) {
  const m = /^([a-zA-Z][\w-]*|\*)?((?:[.#][\w-]+)*)$/.exec(texto2.trim());
  if (!m || !m[1] && !m[2]) return null;
  const selector = { clases: [] };
  if (m[1] && m[1] !== "*") selector.etiqueta = m[1];
  for (const parte of m[2].match(/[.#][\w-]+/g) ?? []) {
    if (parte[0] === "#") selector.id = parte.slice(1);
    else selector.clases.push(parte.slice(1));
  }
  return selector;
}
function hojaDeEstilo(textos, avisar) {
  const reglas = [];
  let orden = 0;
  for (const bruto of textos) {
    const css = bruto.replace(/\/\*[\s\S]*?\*\//g, "");
    let i = 0;
    while (i < css.length) {
      const llave = css.indexOf("{", i);
      if (llave < 0) break;
      const cabecera = css.slice(i, llave).trim();
      let profundidad = 1;
      let j = llave + 1;
      while (j < css.length && profundidad) {
        if (css[j] === "{") profundidad++;
        else if (css[j] === "}") profundidad--;
        j++;
      }
      const cuerpo2 = css.slice(llave + 1, j - 1);
      i = j;
      if (cabecera.startsWith("@")) continue;
      const decl = declaraciones(cuerpo2);
      for (const texto2 of cabecera.split(",")) {
        const selector = leerSelector(texto2);
        if (!selector) {
          if (texto2.trim()) avisar(texto2.trim());
          continue;
        }
        reglas.push({
          selector,
          especificidad: (selector.id ? 1e4 : 0) + selector.clases.length * 100 + (selector.etiqueta ? 1 : 0),
          orden: orden++,
          declaraciones: decl
        });
      }
    }
  }
  return reglas.sort(
    (a, b) => a.especificidad - b.especificidad || a.orden - b.orden
  );
}
var decodificar = (texto2) => texto2.replace(
  /&#x([0-9a-f]+);/gi,
  (_, h) => String.fromCodePoint(Number.parseInt(h, 16))
).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
function atributo(el, nombre) {
  const v2 = el.properties?.[nombre];
  if (v2 === void 0 || v2 === null) return void 0;
  return decodificar(String(v2));
}
var etiquetaDe = (el) => (el.tagName ?? "").replace(/^svg:/, "");
var esElemento = (n2) => typeof n2 !== "string" && n2.type === "element";
function textoDe(el) {
  return el.children.map(
    (c) => typeof c === "string" ? c : c.type === "text" ? String(c.value ?? "") : textoDe(c)
  ).join("");
}
function describir(el) {
  const id = atributo(el, "id");
  const clase = atributo(el, "class");
  return `${etiquetaDe(el)}${id ? `#${id}` : ""}${clase ? clase.split(/\s+/).filter(Boolean).map((c) => `.${c}`).join("") : ""}`;
}
var ESTILO_INICIAL = {
  fill: { tipo: "color", color: { hex: "#000000", alfa: 1 } },
  fillRule: "nonzero",
  fillOpacity: 1,
  stroke: { tipo: "ninguna" },
  strokeWidth: "1",
  strokeLinecap: "butt",
  strokeLinejoin: "miter",
  strokeMiterlimit: 4,
  strokeDasharray: "none",
  strokeDashoffset: "0",
  strokeOpacity: 1,
  visibility: "visible",
  color: { hex: "#000000", alfa: 1 },
  paintOrder: "normal",
  clipRule: "nonzero"
};
function leerPintura(valor) {
  const v2 = valor.trim();
  if (v2 === "none") return { tipo: "ninguna" };
  if (/^currentcolor$/i.test(v2)) return { tipo: "actual" };
  const url = /^url\(\s*['"]?#([^'")]+)['"]?\s*\)\s*(.*)$/i.exec(v2);
  if (url) {
    const respaldo = url[2] ? leerPintura(url[2]) : null;
    return { tipo: "referencia", id: url[1], respaldo: respaldo ?? void 0 };
  }
  const color = leerColor(v2);
  return color ? { tipo: "color", color } : null;
}
var fraccion = (valor) => {
  const v2 = valor.trim();
  const n2 = v2.endsWith("%") ? Number.parseFloat(v2) / 100 : Number(v2);
  return Number.isFinite(n2) ? Math.min(1, Math.max(0, n2)) : null;
};
var n6 = (v2) => Number(v2.toFixed(6));
function dDeRectangulo(x, y, w, h, rx, ry) {
  if (!(w > 0 && h > 0)) return null;
  if (!(rx > 0 && ry > 0))
    return `M${n6(x)} ${n6(y)}H${n6(x + w)}V${n6(y + h)}H${n6(x)}Z`;
  const a = (dx, dy) => `A${n6(rx)} ${n6(ry)} 0 0 1 ${n6(dx)} ${n6(dy)}`;
  return [
    `M${n6(x + rx)} ${n6(y)}`,
    `H${n6(x + w - rx)}`,
    a(x + w, y + ry),
    `V${n6(y + h - ry)}`,
    a(x + w - rx, y + h),
    `H${n6(x + rx)}`,
    a(x, y + h - ry),
    `V${n6(y + ry)}`,
    a(x + rx, y),
    "Z"
  ].join("");
}
function dDeElipse(cx, cy, rx, ry) {
  if (!(rx > 0 && ry > 0)) return null;
  return `M${n6(cx - rx)} ${n6(cy)}A${n6(rx)} ${n6(ry)} 0 1 0 ${n6(cx + rx)} ${n6(cy)}A${n6(rx)} ${n6(ry)} 0 1 0 ${n6(cx - rx)} ${n6(cy)}Z`;
}
function dDePuntos(texto2, cerrar) {
  const n2 = numeros(texto2 ?? "");
  if (n2.length < 4) return null;
  let d = "";
  for (let i = 0; i + 1 < n2.length; i += 2)
    d += `${i ? "L" : "M"}${n2[i]} ${n2[i + 1]}`;
  return cerrar ? `${d}Z` : d;
}
function discontinuar(subtrazos, patron, desfase) {
  const lista2 = patron.length % 2 ? [...patron, ...patron] : patron;
  const ciclo = lista2.reduce((s, v2) => s + v2, 0);
  if (!(ciclo > 0)) return subtrazos;
  const salida2 = [];
  for (const s of subtrazos) {
    const puntos = s.cerrado ? [...s.puntos, s.puntos[0]] : s.puntos;
    let fase = (desfase % ciclo + ciclo) % ciclo;
    let k = 0;
    while (fase >= lista2[k]) {
      fase -= lista2[k];
      k = (k + 1) % lista2.length;
    }
    let restante = lista2[k] - fase;
    let actual = k % 2 === 0 ? [puntos[0]] : null;
    for (let i = 1; i < puntos.length; i++) {
      let a = puntos[i - 1];
      const b = puntos[i];
      let largo = Math.hypot(b[0] - a[0], b[1] - a[1]);
      while (largo > restante) {
        const t = restante / largo;
        const corte = [
          a[0] + (b[0] - a[0]) * t,
          a[1] + (b[1] - a[1]) * t
        ];
        if (actual) {
          actual.push(corte);
          if (actual.length >= 2)
            salida2.push({ puntos: actual, cerrado: false });
          actual = null;
        } else actual = [corte];
        largo -= restante;
        a = corte;
        k = (k + 1) % lista2.length;
        restante = lista2[k];
      }
      restante -= largo;
      if (actual) actual.push(b);
    }
    if (actual && actual.length >= 2)
      salida2.push({ puntos: actual, cerrado: false });
  }
  return salida2;
}
function leerPreserveAspectRatio(texto2) {
  const partes = (texto2 ?? "").trim().split(/\s+/);
  return {
    alinear: partes[0] && partes[0] !== "defer" ? partes[0] : "xMidYMid",
    recortar: partes.includes("slice")
  };
}
function matrizDeViewBox(vb, ancho, alto, par) {
  const [x, y, w, h] = vb;
  if (!(w > 0 && h > 0)) return IDENTIDAD;
  let sx = ancho / w;
  let sy = alto / h;
  if (par.alinear !== "none") {
    const s = par.recortar ? Math.max(sx, sy) : Math.min(sx, sy);
    sx = s;
    sy = s;
  }
  let tx = -x * sx;
  let ty = -y * sy;
  const sobraX = ancho - w * sx;
  const sobraY = alto - h * sy;
  if (par.alinear.includes("xMid")) tx += sobraX / 2;
  else if (par.alinear.includes("xMax")) tx += sobraX;
  if (par.alinear.includes("YMid")) ty += sobraY / 2;
  else if (par.alinear.includes("YMax")) ty += sobraY;
  return [sx, 0, 0, sy, tx, ty];
}
function leerViewBox(texto2) {
  const n2 = numeros(texto2 ?? "");
  return n2.length === 4 && n2[2] > 0 && n2[3] > 0 ? n2 : null;
}
var aPath7 = (puntos) => puntos.map(([x, y]) => ({ x, y }));
var NO_SE_PINTAN = /* @__PURE__ */ new Set([
  "defs",
  "symbol",
  "clipPath",
  "mask",
  "pattern",
  "marker",
  "linearGradient",
  "radialGradient",
  "style",
  "title",
  "desc",
  "metadata",
  "script",
  "filter",
  "font",
  "font-face",
  "cursor",
  "view"
]);
function leerSvg(texto2, opciones) {
  const toleranciaMm = opciones.toleranciaMm ?? 0.01;
  const anchoMinimoMm = opciones.anchoMinimoTrazoMm ?? 0.3;
  const avisos = /* @__PURE__ */ new Map();
  const avisar = (codigo, mensaje, severidad, elemento) => {
    const previo = avisos.get(codigo);
    if (previo) {
      if (elemento && previo.elementos.length < 12)
        previo.elementos.push(elemento);
      return;
    }
    avisos.set(codigo, {
      codigo,
      mensaje,
      severidad,
      elementos: elemento ? [elemento] : []
    });
  };
  let raiz;
  try {
    raiz = (0, import_svg_parser.parse)(texto2).children.find(
      (n2) => esElemento(n2) && etiquetaDe(n2) === "svg"
    );
  } catch (error) {
    throw new ErrorDeSvg(
      "SVG_ILEGIBLE",
      `No pudimos leer el SVG: ${error.message}`
    );
  }
  if (!raiz)
    throw new ErrorDeSvg(
      "SVG_ILEGIBLE",
      "El archivo no tiene un elemento <svg>."
    );
  const porId = /* @__PURE__ */ new Map();
  const hojas = [];
  let cuenta = 0;
  const indexar = (el) => {
    if (++cuenta > LIMITES_SVG.elementos * 4)
      throw demasiado(`${LIMITES_SVG.elementos * 4} nodos XML`);
    const etiqueta = etiquetaDe(el);
    if (etiqueta === "script" || etiqueta === "foreignObject")
      avisar(
        "SVG_CONTENIDO_ACTIVO",
        "El SVG tra\xEDa c\xF3digo o HTML incrustado; se ignor\xF3.",
        "informar",
        etiqueta
      );
    for (const [nombre, valor] of Object.entries(el.properties ?? {})) {
      if (/^on/i.test(nombre))
        avisar(
          "SVG_CONTENIDO_ACTIVO",
          "El SVG tra\xEDa c\xF3digo o HTML incrustado; se ignor\xF3.",
          "informar",
          nombre
        );
      if ((nombre === "href" || nombre === "xlink:href") && !String(valor).trim().startsWith("#"))
        avisar(
          "SVG_REFERENCIA_EXTERNA",
          "El SVG apunta a archivos de fuera (im\xE1genes, otros SVG); esa parte no se borda.",
          "revisar",
          describir(el)
        );
    }
    const id = atributo(el, "id");
    if (id && !porId.has(id)) porId.set(id, el);
    if (etiquetaDe(el) === "style") hojas.push(textoDe(el));
    for (const hijo of el.children) if (esElemento(hijo)) indexar(hijo);
  };
  indexar(raiz);
  const reglas = hojaDeEstilo(
    hojas,
    (selector) => avisar(
      "SVG_SELECTOR_NO_SOPORTADO",
      "El SVG usa estilos con selectores complejos; alg\xFAn color podr\xEDa no coincidir con el original.",
      "revisar",
      selector
    )
  );
  const declaracionesDe = (el) => {
    const salida2 = /* @__PURE__ */ new Map();
    for (const [nombre, valor] of Object.entries(el.properties ?? {}))
      if (nombre !== "style" && nombre !== "transform" && nombre !== "d")
        salida2.set(nombre.toLowerCase(), decodificar(String(valor)));
    const etiqueta = etiquetaDe(el);
    const id = atributo(el, "id");
    const clases = new Set((atributo(el, "class") ?? "").split(/\s+/));
    for (const regla of reglas) {
      const s = regla.selector;
      if (s.etiqueta && s.etiqueta !== etiqueta) continue;
      if (s.id && s.id !== id) continue;
      if (s.clases.some((c) => !clases.has(c))) continue;
      for (const [p, v2] of regla.declaraciones) salida2.set(p, v2);
    }
    const enLinea = atributo(el, "style");
    if (enLinea) for (const [p, v2] of declaraciones(enLinea)) salida2.set(p, v2);
    return salida2;
  };
  const estiloDe = (el, padre) => {
    const d = declaracionesDe(el);
    const e = { ...padre };
    const heredar = (p) => d.get(p) === "inherit";
    const valor = (p) => {
      const v2 = d.get(p);
      return v2 === void 0 || v2 === "inherit" ? void 0 : v2;
    };
    const colorPropio = valor("color");
    if (colorPropio) {
      const c = leerColor(colorPropio);
      if (c) e.color = c;
    }
    for (const [propiedad, clave2] of [
      ["fill", "fill"],
      ["stroke", "stroke"]
    ]) {
      const v2 = valor(propiedad);
      if (v2 && !heredar(propiedad)) {
        const p = leerPintura(v2);
        if (p) e[clave2] = p;
      }
    }
    const regla = valor("fill-rule");
    if (regla === "evenodd" || regla === "nonzero") e.fillRule = regla;
    const reglaRecorte = valor("clip-rule");
    if (reglaRecorte === "evenodd" || reglaRecorte === "nonzero")
      e.clipRule = reglaRecorte;
    const fo = valor("fill-opacity");
    if (fo !== void 0) e.fillOpacity = fraccion(fo) ?? e.fillOpacity;
    const so = valor("stroke-opacity");
    if (so !== void 0) e.strokeOpacity = fraccion(so) ?? e.strokeOpacity;
    const sw = valor("stroke-width");
    if (sw !== void 0) e.strokeWidth = sw;
    const cap = valor("stroke-linecap");
    if (cap === "butt" || cap === "round" || cap === "square")
      e.strokeLinecap = cap;
    const join2 = valor("stroke-linejoin");
    if (join2 === "round" || join2 === "bevel") e.strokeLinejoin = join2;
    else if (join2 === "miter" || join2 === "miter-clip" || join2 === "arcs")
      e.strokeLinejoin = "miter";
    const ml = valor("stroke-miterlimit");
    if (ml !== void 0 && Number(ml) >= 1) e.strokeMiterlimit = Number(ml);
    const da2 = valor("stroke-dasharray");
    if (da2 !== void 0) e.strokeDasharray = da2;
    const dof = valor("stroke-dashoffset");
    if (dof !== void 0) e.strokeDashoffset = dof;
    const vis = valor("visibility");
    if (vis !== void 0) e.visibility = vis;
    const po = valor("paint-order");
    if (po !== void 0) e.paintOrder = po;
    const opacidad = valor("opacity");
    return {
      estilo: e,
      propias: {
        opacity: opacidad !== void 0 ? fraccion(opacidad) ?? 1 : 1,
        display: valor("display") ?? "inline",
        clipPath: valor("clip-path"),
        mask: valor("mask"),
        filter: valor("filter"),
        vectorEffect: valor("vector-effect"),
        markers: ["marker", "marker-start", "marker-mid", "marker-end"].some(
          (m) => {
            const v2 = valor(m);
            return v2 !== void 0 && v2 !== "none";
          }
        )
      }
    };
  };
  const destino = opciones.destino;
  const anchoRaiz = longitud(atributo(raiz, "width"), 0, Number.NaN);
  const altoRaiz = longitud(atributo(raiz, "height"), 0, Number.NaN);
  let viewBox = leerViewBox(atributo(raiz, "viewBox"));
  if (!viewBox && anchoRaiz > 0 && altoRaiz > 0)
    viewBox = [0, 0, anchoRaiz, altoRaiz];
  const capas = [];
  let puntos = 0;
  let elementos = 0;
  let nodos = 0;
  const colorDe = (pintura, estilo, elemento) => {
    switch (pintura.tipo) {
      case "ninguna":
        return null;
      case "color":
        return pintura.color;
      case "actual":
        return estilo.color;
      case "referencia": {
        const ref = porId.get(pintura.id);
        const tipo = ref ? etiquetaDe(ref) : "";
        if (tipo === "linearGradient" || tipo === "radialGradient") {
          const paradas = paradasDe(ref);
          if (!paradas.length) return null;
          avisar(
            "SVG_DEGRADADO",
            "El SVG tiene degradados; el hilo es de un solo color y se us\xF3 el tono medio de cada uno.",
            "revisar",
            elemento
          );
          if (paradas.length === 1) return paradas[0];
          const rgb3 = [0, 0, 0];
          for (const p of paradas)
            for (let i = 0; i < 3; i++)
              rgb3[i] += Number.parseInt(p.hex.slice(1 + 2 * i, 3 + 2 * i), 16);
          return {
            hex: aHex(
              rgb3[0] / paradas.length,
              rgb3[1] / paradas.length,
              rgb3[2] / paradas.length
            ),
            alfa: Math.max(...paradas.map((p) => p.alfa))
          };
        }
        if (pintura.respaldo)
          return colorDe(pintura.respaldo, estilo, elemento);
        avisar(
          "SVG_PATRON",
          "El SVG rellena con un patr\xF3n o una referencia que no se puede bordar; esa parte se omiti\xF3.",
          "revisar",
          elemento
        );
        return null;
      }
    }
  };
  function paradasDe(degradado, profundidad = 0) {
    const propias = degradado.children.filter(
      (h) => esElemento(h) && etiquetaDe(h) === "stop"
    ).map((parada) => {
      const d = declaracionesDe(parada);
      const c = leerColor(d.get("stop-color") ?? "black");
      if (!c) return null;
      return {
        hex: c.hex,
        alfa: c.alfa * (fraccion(d.get("stop-opacity") ?? "1") ?? 1)
      };
    }).filter((c) => c !== null);
    if (propias.length || profundidad > 8) return propias;
    const href = (atributo(degradado, "href") ?? atributo(degradado, "xlink:href"))?.replace(/^#/, "");
    const siguiente = href ? porId.get(href) : void 0;
    return siguiente ? paradasDe(siguiente, profundidad + 1) : [];
  }
  const contarPuntos = (poligonos) => {
    for (const p of poligonos) puntos += p.length;
    if (puntos > LIMITES_SVG.puntos)
      throw demasiado(`${LIMITES_SVG.puntos} puntos de contorno`);
  };
  const recortar2 = (poligonos, recortes) => {
    let salida2 = poligonos;
    for (const r of recortes) {
      if (!salida2.length) break;
      salida2 = intersectD(sanos(salida2), r, FillRule.NonZero, PRECISION3);
    }
    return salida2;
  };
  const sanoConZ = (p) => {
    const q = sano(p);
    if (!q) return null;
    const zs = etiquetasDe(p);
    if (zs.length <= 1) return q.map((v2) => ({ ...v2, z: zs[0] ?? 0 }));
    const de2 = new Map(p.map((v2) => [`${v2.x},${v2.y}`, v2.z ?? 0]));
    return q.map((v2) => ({ ...v2, z: de2.get(`${v2.x},${v2.y}`) ?? 0 }));
  };
  const recortarConZ = (poligonos, recortes) => {
    let salida2 = poligonos;
    for (const r of recortes) {
      if (!salida2.length) break;
      salida2 = cortarConZ(
        salida2.map(sanoConZ).filter((q) => q !== null),
        r,
        FillRule.NonZero,
        PRECISION3
      );
    }
    return salida2;
  };
  const rellenoEnMmConZ = (d, matriz, regla, etiquetas) => {
    const ordinales = [];
    const subtrazos = aplanar(
      (0, import_svgpath2.default)(d).matrix(matriz).toString(),
      toleranciaMm,
      ordinales
    );
    const cerrados = [];
    subtrazos.forEach((s, k) => {
      if (s.puntos.length < 3) return;
      const q = sano(aPath7(s.puntos));
      if (!q) return;
      const z = etiquetas[ordinales[k]] ?? 0;
      cerrados.push(q.map((v2) => ({ ...v2, z })));
    });
    if (!cerrados.length) return [];
    return unirConZ(
      cerrados,
      regla === "evenodd" ? FillRule.EvenOdd : FillRule.NonZero,
      PRECISION3
    );
  };
  const rellenoEnMm = (d, matriz, regla) => {
    const subtrazos = aplanar(
      (0, import_svgpath2.default)(d).matrix(matriz).toString(),
      toleranciaMm
    );
    const cerrados = sanos(
      subtrazos.filter((s) => s.puntos.length >= 3).map((s) => aPath7(s.puntos))
    );
    if (!cerrados.length) return [];
    return unionD(
      cerrados,
      [],
      regla === "evenodd" ? FillRule.EvenOdd : FillRule.NonZero,
      PRECISION3
    );
  };
  const trazoEnMm = (d, matriz, estilo, ancho, vectorEffect, elemento) => {
    const [mayor, menor] = escalasDe(matriz);
    if (!(mayor > 0)) return { poligonos: [], anchoMm: 0 };
    let anchoLocal = ancho;
    if (vectorEffect === "non-scaling-stroke") {
      avisar(
        "SVG_TRAZO_SIN_ESCALA",
        "El SVG tiene trazos que no escalan con el dibujo; su grosor se aproxim\xF3.",
        "revisar",
        elemento
      );
      anchoLocal = ancho / Math.sqrt(mayor * Math.max(menor, 1e-9));
    }
    const anchoMm = anchoLocal * Math.max(menor, 1e-9);
    if (anchoMm < anchoMinimoMm)
      anchoLocal = anchoMinimoMm / Math.max(menor, 1e-9);
    let subtrazos = aplanar(d, toleranciaMm / mayor);
    const patron = numeros(estilo.strokeDasharray);
    if (estilo.strokeDasharray !== "none" && patron.length && patron.every((v2) => v2 >= 0) && patron.some((v2) => v2 > 0))
      subtrazos = discontinuar(
        subtrazos,
        patron,
        numeros(estilo.strokeDashoffset)[0] ?? 0
      );
    const junta = estilo.strokeLinejoin === "round" ? JoinType.Round : estilo.strokeLinejoin === "bevel" ? JoinType.Bevel : JoinType.Miter;
    const final = estilo.strokeLinecap === "round" ? EndType.Round : estilo.strokeLinecap === "square" ? EndType.Square : EndType.Butt;
    const precision = Math.min(
      8,
      Math.max(2, Math.ceil(Math.log10(mayor / 5e-4)))
    );
    const tolArco = toleranciaMm / mayor;
    const piezas = [];
    const abiertos = subtrazos.filter(
      (s) => !s.cerrado && s.puntos.length >= 2
    );
    const cerrados = subtrazos.filter((s) => s.cerrado && s.puntos.length >= 3);
    if (abiertos.length)
      piezas.push(
        ...inflatePathsD(
          abiertos.map((s) => aPath7(s.puntos)),
          anchoLocal / 2,
          junta,
          final,
          estilo.strokeMiterlimit,
          precision,
          tolArco
        )
      );
    if (cerrados.length)
      piezas.push(
        ...inflatePathsD(
          sanos(cerrados.map((s) => aPath7(s.puntos))),
          anchoLocal / 2,
          junta,
          EndType.Joined,
          estilo.strokeMiterlimit,
          precision,
          tolArco
        )
      );
    if (estilo.strokeLinecap !== "butt")
      for (const punto2 of puntosSueltos(d)) {
        const r = anchoLocal / 2;
        const lados = estilo.strokeLinecap === "round" ? 48 : 4;
        const giro = estilo.strokeLinecap === "round" ? 0 : Math.PI / 4;
        const radio = estilo.strokeLinecap === "round" ? r : r * Math.SQRT2;
        piezas.push(
          aPath7(
            Array.from({ length: lados }, (_, i) => {
              const a = giro + i / lados * 2 * Math.PI;
              return [
                punto2[0] + radio * Math.cos(a),
                punto2[1] + radio * Math.sin(a)
              ];
            })
          )
        );
      }
    const enMm = sanos(
      piezas.map(
        (p) => p.map((q) => {
          const [x, y] = aplicar(matriz, [q.x, q.y]);
          return { x, y };
        })
      )
    );
    if (!enMm.length) return { poligonos: [], anchoMm };
    return {
      poligonos: unionD(enMm, [], FillRule.NonZero, PRECISION3),
      anchoMm: Math.max(anchoMm, anchoMinimoMm),
      ...anchoMm < anchoMinimoMm && { anchoOriginalMm: anchoMm }
    };
  };
  const regionDeRecorte = (referencia, matriz, contexto, elemento, profundidad) => {
    const id = /url\(\s*['"]?#([^'")]+)['"]?\s*\)/.exec(referencia)?.[1];
    const clip = id ? porId.get(id) : void 0;
    if (!clip || etiquetaDe(clip) !== "clipPath" || profundidad > 8) {
      avisar(
        "SVG_RECORTE_ROTO",
        "Un recorte del SVG apunta a algo que no existe; se ignor\xF3.",
        "revisar",
        describir(elemento)
      );
      return null;
    }
    let base = por(matriz, matrizDeTransform(atributo(clip, "transform")));
    if (atributo(clip, "clipPathUnits") === "objectBoundingBox") {
      const caja = cajaLocal(elemento);
      if (!caja) return null;
      base = por(base, [caja.ancho, 0, 0, caja.alto, caja.x, caja.y]);
    }
    const partes = [];
    const juntar = (el, m, estilo) => {
      const etiqueta = etiquetaDe(el);
      const { estilo: propio2, propias } = estiloDe(el, estilo);
      if (propias.display === "none" || propio2.visibility === "hidden") return;
      const local = por(m, matrizDeTransform(atributo(el, "transform")));
      if (etiqueta === "use") {
        const href = (atributo(el, "href") ?? atributo(el, "xlink:href"))?.replace(/^#/, "");
        const ref = href ? porId.get(href) : void 0;
        if (ref)
          juntar(
            ref,
            por(
              local,
              trasladar(
                longitud(atributo(el, "x"), contexto.viewport.ancho, 0),
                longitud(atributo(el, "y"), contexto.viewport.alto, 0)
              )
            ),
            propio2
          );
        return;
      }
      if (etiqueta === "g") {
        for (const hijo of el.children)
          if (esElemento(hijo)) juntar(hijo, local, propio2);
        return;
      }
      const d = geometriaDe(el, contexto.viewport);
      if (!d) return;
      let region2 = rellenoEnMm(d, local, propio2.clipRule);
      if (propias.clipPath && propias.clipPath !== "none") {
        const interior = regionDeRecorte(
          propias.clipPath,
          local,
          contexto,
          el,
          profundidad + 1
        );
        if (interior)
          region2 = intersectD(
            sanos(region2),
            interior,
            FillRule.NonZero,
            PRECISION3
          );
      }
      partes.push(...region2);
    };
    for (const hijo of clip.children)
      if (esElemento(hijo)) juntar(hijo, base, ESTILO_INICIAL);
    let region = partes.length ? unionD(sanos(partes), [], FillRule.NonZero, PRECISION3) : [];
    const propio = declaracionesDe(clip).get("clip-path");
    if (propio && propio !== "none") {
      const exterior = regionDeRecorte(
        propio,
        matriz,
        contexto,
        clip,
        profundidad + 1
      );
      if (exterior)
        region = intersectD(
          sanos(region),
          exterior,
          FillRule.NonZero,
          PRECISION3
        );
    }
    return region;
  };
  function cajaLocal(el) {
    const d = geometriaDe(el, { ancho: 0, alto: 0 });
    if (!d) {
      avisar(
        "SVG_RECORTE_APROXIMADO",
        "Un recorte relativo a un grupo no se pudo resolver; se ignor\xF3.",
        "revisar",
        describir(el)
      );
      return null;
    }
    const todos = aplanar(d, 1e-3).flatMap((s) => s.puntos);
    if (!todos.length) return null;
    const xs = todos.map((p) => p[0]);
    const ys = todos.map((p) => p[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, ancho: Math.max(...xs) - x, alto: Math.max(...ys) - y };
  }
  function geometriaDe(el, viewport) {
    const etiqueta = etiquetaDe(el);
    const L = (nombre, ref, def = 0) => longitud(atributo(el, nombre), ref, def);
    const diagonal = Math.hypot(viewport.ancho, viewport.alto) / Math.SQRT2;
    switch (etiqueta) {
      case "path": {
        const d = atributo(el, "d");
        return d?.trim() ? d : null;
      }
      case "rect": {
        const w = L("width", viewport.ancho);
        const h = L("height", viewport.alto);
        const rxAttr = atributo(el, "rx");
        const ryAttr = atributo(el, "ry");
        let rx = rxAttr !== void 0 && rxAttr !== "auto" ? L("rx", viewport.ancho) : Number.NaN;
        let ry = ryAttr !== void 0 && ryAttr !== "auto" ? L("ry", viewport.alto) : Number.NaN;
        if (Number.isNaN(rx)) rx = Number.isNaN(ry) ? 0 : ry;
        if (Number.isNaN(ry)) ry = rx;
        return dDeRectangulo(
          L("x", viewport.ancho),
          L("y", viewport.alto),
          w,
          h,
          Math.min(Math.max(0, rx), w / 2),
          Math.min(Math.max(0, ry), h / 2)
        );
      }
      case "circle": {
        const r = L("r", diagonal);
        return dDeElipse(L("cx", viewport.ancho), L("cy", viewport.alto), r, r);
      }
      case "ellipse": {
        const rxAttr = atributo(el, "rx");
        const ryAttr = atributo(el, "ry");
        let rx = rxAttr !== void 0 && rxAttr !== "auto" ? L("rx", viewport.ancho) : Number.NaN;
        let ry = ryAttr !== void 0 && ryAttr !== "auto" ? L("ry", viewport.alto) : Number.NaN;
        if (Number.isNaN(rx)) rx = ry;
        if (Number.isNaN(ry)) ry = rx;
        return dDeElipse(
          L("cx", viewport.ancho),
          L("cy", viewport.alto),
          rx,
          ry
        );
      }
      case "line":
        return `M${L("x1", viewport.ancho)} ${L("y1", viewport.alto)}L${L("x2", viewport.ancho)} ${L("y2", viewport.alto)}`;
      case "polyline":
        return dDePuntos(atributo(el, "points"), false);
      case "polygon":
        return dDePuntos(atributo(el, "points"), true);
      default:
        return null;
    }
  }
  const pintar2 = (el, ctx, profundidad) => {
    if (profundidad > LIMITES_SVG.profundidad)
      throw demasiado(`${LIMITES_SVG.profundidad} niveles de grupos anidados`);
    const etiqueta = etiquetaDe(el);
    if (NO_SE_PINTAN.has(etiqueta) || etiqueta.includes(":")) return;
    const nombre = describir(el);
    const { estilo, propias } = estiloDe(el, ctx.estilo);
    if (propias.display === "none") return;
    let matriz = por(ctx.matriz, matrizDeTransform(atributo(el, "transform")));
    const opacidad = ctx.opacidad * propias.opacity;
    let recortes = ctx.recortes;
    let viewport = ctx.viewport;
    if (propias.clipPath && propias.clipPath !== "none") {
      const region = regionDeRecorte(propias.clipPath, matriz, ctx, el, 0);
      if (region) recortes = [...recortes, region];
    }
    if (propias.mask && propias.mask !== "none")
      avisar(
        "SVG_MASCARA",
        "El SVG usa m\xE1scaras y el bordado las ignora: lo que ocultan se coser\xEDa.",
        "revisar",
        nombre
      );
    if (propias.filter && propias.filter !== "none")
      avisar(
        "SVG_FILTRO",
        "El SVG usa filtros (sombras, desenfoques); el bordado cose la forma sin el efecto.",
        "revisar",
        nombre
      );
    const hijos = (contexto) => {
      for (const hijo of el.children)
        if (esElemento(hijo)) pintar2(hijo, contexto, profundidad + 1);
    };
    const siguiente = {
      ...ctx,
      matriz,
      estilo,
      opacidad,
      recortes,
      viewport
    };
    switch (etiqueta) {
      case "g":
      case "a":
        hijos(siguiente);
        return;
      case "switch": {
        const primero = el.children.find(
          (h) => esElemento(h) && !NO_SE_PINTAN.has(etiquetaDe(h))
        );
        if (primero) pintar2(primero, siguiente, profundidad + 1);
        return;
      }
      case "svg": {
        const x = longitud(atributo(el, "x"), viewport.ancho, 0);
        const y = longitud(atributo(el, "y"), viewport.alto, 0);
        const w = longitud(
          atributo(el, "width"),
          viewport.ancho,
          viewport.ancho
        );
        const h = longitud(
          atributo(el, "height"),
          viewport.alto,
          viewport.alto
        );
        const vb = leerViewBox(atributo(el, "viewBox"));
        matriz = por(matriz, trasladar(x, y));
        const marco = rellenoEnMm(`M0 0H${w}V${h}H0Z`, matriz, "nonzero");
        if (vb)
          matriz = por(
            matriz,
            matrizDeViewBox(
              vb,
              w,
              h,
              leerPreserveAspectRatio(atributo(el, "preserveAspectRatio"))
            )
          );
        viewport = vb ? { ancho: vb[2], alto: vb[3] } : { ancho: w, alto: h };
        hijos({
          ...siguiente,
          matriz,
          viewport,
          recortes: [...recortes, marco]
        });
        return;
      }
      case "use": {
        const href = (atributo(el, "href") ?? atributo(el, "xlink:href"))?.replace(/^#/, "");
        const ref = href ? porId.get(href) : void 0;
        if (!ref || !href || ctx.usos.has(href) || ctx.usos.size > 16) {
          avisar(
            "SVG_REFERENCIA_ROTA",
            "Un <use> del SVG apunta a algo que no existe o a s\xED mismo; se ignor\xF3.",
            "revisar",
            nombre
          );
          return;
        }
        matriz = por(
          matriz,
          trasladar(
            longitud(atributo(el, "x"), viewport.ancho, 0),
            longitud(atributo(el, "y"), viewport.alto, 0)
          )
        );
        const usos = new Set(ctx.usos).add(href);
        const tipo = etiquetaDe(ref);
        if (tipo === "symbol" || tipo === "svg") {
          const vb = leerViewBox(atributo(ref, "viewBox"));
          const w = longitud(
            atributo(el, "width") ?? atributo(ref, "width"),
            viewport.ancho,
            viewport.ancho
          );
          const h = longitud(
            atributo(el, "height") ?? atributo(ref, "height"),
            viewport.alto,
            viewport.alto
          );
          const m = vb ? por(
            matriz,
            matrizDeViewBox(
              vb,
              w,
              h,
              leerPreserveAspectRatio(atributo(ref, "preserveAspectRatio"))
            )
          ) : matriz;
          const { estilo: delSimbolo } = estiloDe(ref, estilo);
          for (const hijo of ref.children)
            if (esElemento(hijo))
              pintar2(
                hijo,
                {
                  ...siguiente,
                  matriz: m,
                  estilo: delSimbolo,
                  usos,
                  viewport: vb ? { ancho: vb[2], alto: vb[3] } : viewport
                },
                profundidad + 1
              );
          return;
        }
        pintar2(ref, { ...siguiente, matriz, usos }, profundidad + 1);
        return;
      }
      case "text":
      case "tspan":
      case "textPath":
        avisar(
          "SVG_TEXTO_SIN_CURVAS",
          "El SVG trae texto sin convertir a curvas; no se puede bordar sin la fuente. Convi\xE9rtelo a trazados.",
          "revisar",
          nombre
        );
        return;
      case "image":
        avisar(
          "SVG_IMAGEN_INCRUSTADA",
          "El SVG lleva una imagen de p\xEDxeles dentro; esa parte no se borda por la ruta vectorial.",
          "revisar",
          nombre
        );
        return;
      case "foreignObject":
        avisar(
          "SVG_CONTENIDO_EXTRANO",
          "El SVG lleva contenido HTML incrustado; se ignor\xF3.",
          "revisar",
          nombre
        );
        return;
    }
    const d = geometriaDe(el, viewport);
    if (d === null) return;
    const conLinaje = atributo(el, "data-linaje");
    const etiquetas = conLinaje ? conLinaje.trim().split(/\s+/).map(Number).filter((x) => Number.isFinite(x)) : null;
    if (++elementos > LIMITES_SVG.elementos)
      throw demasiado(`${LIMITES_SVG.elementos} formas`);
    nodos += (d.match(/[MLHVCSQTAZ]/gi) ?? []).length;
    if (nodos > LIMITES_SVG.nodos)
      throw demasiado(`${LIMITES_SVG.nodos} nodos de trazado`);
    if (estilo.visibility === "hidden" || estilo.visibility === "collapse")
      return;
    if (propias.markers)
      avisar(
        "SVG_MARCADORES",
        "El SVG usa marcadores (puntas de flecha) y no se bordan.",
        "revisar",
        nombre
      );
    const pendientes = [];
    const relleno = etiqueta === "line" ? null : colorDe(estilo.fill, estilo, nombre);
    const alfaRelleno = relleno ? relleno.alfa * estilo.fillOpacity * opacidad : 0;
    if (relleno && alfaRelleno > 0)
      pendientes.push(() => {
        const poligonos = etiquetas ? recortarConZ(
          rellenoEnMmConZ(d, matriz, estilo.fillRule, etiquetas),
          recortes
        ) : recortar2(rellenoEnMm(d, matriz, estilo.fillRule), recortes);
        contarPuntos(poligonos);
        if (poligonos.length)
          capas.push({
            indice: capas.length,
            tipo: "relleno",
            color: relleno.hex,
            alfa: alfaRelleno,
            poligonos,
            elemento: nombre,
            ...etiquetas ? { linaje: poligonos.map(etiquetasDe) } : {}
          });
      });
    const trazo = colorDe(estilo.stroke, estilo, nombre);
    const alfaTrazo = trazo ? trazo.alfa * estilo.strokeOpacity * opacidad : 0;
    const ancho = longitud(
      estilo.strokeWidth,
      Math.hypot(viewport.ancho, viewport.alto) / Math.SQRT2,
      1
    );
    if (trazo && alfaTrazo > 0 && ancho > 0)
      pendientes.push(() => {
        const {
          poligonos: contorno2,
          anchoMm,
          anchoOriginalMm
        } = trazoEnMm(d, matriz, estilo, ancho, propias.vectorEffect, nombre);
        const poligonos = recortar2(contorno2, recortes);
        contarPuntos(poligonos);
        if (poligonos.length)
          capas.push({
            indice: capas.length,
            tipo: "trazo",
            color: trazo.hex,
            alfa: alfaTrazo,
            poligonos,
            elemento: nombre,
            // Un trazo es un solo subtrazo: todos sus polígonos son de su etiqueta.
            ...etiquetas ? { linaje: poligonos.map(() => [...new Set(etiquetas)].sort((a, b) => a - b)) } : {},
            anchoTrazoMm: anchoMm,
            ...anchoOriginalMm !== void 0 && {
              anchoTrazoOriginalMm: anchoOriginalMm
            }
          });
      });
    if (/^\s*stroke/.test(estilo.paintOrder)) pendientes.reverse();
    for (const p of pendientes) p();
  };
  const posterior = opciones.matriz ?? IDENTIDAD;
  const colocar = (vb) => por(
    por(posterior, trasladar(destino.x, destino.y)),
    matrizDeViewBox(
      vb,
      destino.ancho,
      destino.alto,
      leerPreserveAspectRatio(atributo(raiz, "preserveAspectRatio"))
    )
  );
  const recorrer = (matriz, vb, conMarco = true) => {
    const { estilo } = estiloDe(raiz, ESTILO_INICIAL);
    const marco = [
      aPath7(
        [
          [destino.x, destino.y],
          [destino.x + destino.ancho, destino.y],
          [destino.x + destino.ancho, destino.y + destino.alto],
          [destino.x, destino.y + destino.alto]
        ].map((p) => aplicar(posterior, p))
      )
    ];
    const ctx = {
      matriz,
      estilo,
      opacidad: 1,
      recortes: conMarco ? [marco] : [],
      viewport: { ancho: vb[2], alto: vb[3] },
      usos: /* @__PURE__ */ new Set()
    };
    for (const hijo of raiz.children)
      if (esElemento(hijo)) pintar2(hijo, ctx, 1);
  };
  if (!viewBox) {
    recorrer(IDENTIDAD, [0, 0, 1, 1], false);
    const todos = capas.flatMap((c) => c.poligonos.flat());
    capas.length = 0;
    avisos.clear();
    puntos = 0;
    elementos = 0;
    nodos = 0;
    if (!todos.length) return vacio2();
    const minX = Math.min(...todos.map((p) => p.x));
    const minY = Math.min(...todos.map((p) => p.y));
    viewBox = [
      minX,
      minY,
      Math.max(1e-6, Math.max(...todos.map((p) => p.x)) - minX),
      Math.max(1e-6, Math.max(...todos.map((p) => p.y)) - minY)
    ];
  }
  recorrer(colocar(viewBox), viewBox);
  return {
    capas,
    avisos: [...avisos.values()],
    viewBox,
    destino,
    elementos
  };
  function vacio2() {
    return {
      capas: [],
      avisos: [...avisos.values()],
      viewBox: [0, 0, 1, 1],
      destino,
      elementos: 0
    };
  }
}
function puntosSueltos(d) {
  const salida2 = [];
  let actual = [];
  const cerrar = () => {
    if (actual.length >= 2 && actual.every(
      (p) => Math.abs(p[0] - actual[0][0]) < 1e-9 && Math.abs(p[1] - actual[0][1]) < 1e-9
    ))
      salida2.push(actual[0]);
    actual = [];
  };
  (0, import_svgpath2.default)(d).abs().unshort().iterate((segmento, _i, x, y) => {
    const comando = segmento[0];
    if (comando === "M") {
      cerrar();
      actual = [[segmento[1], segmento[2]]];
      return;
    }
    if (comando === "Z") {
      if (actual.length) actual.push(actual[0]);
      return;
    }
    const n2 = segmento.slice(1);
    if (comando === "H") actual.push([n2[0], y]);
    else if (comando === "V") actual.push([x, n2[0]]);
    else if (comando === "A") actual.push([n2[5], n2[6]]);
    else
      for (let i = 0; i + 1 < n2.length; i += 2) actual.push([n2[i], n2[i + 1]]);
  });
  cerrar();
  return salida2;
}

// packages/bordado/src/vector/logo.ts
function rechazado(error) {
  return {
    ir: [],
    objetos: [],
    incidencias: [
      { code: error.codigo, message: error.message, severity: "reject" }
    ],
    colores: [],
    bloques: [],
    conteo: { satin: 0, running: 0, fill: 0 },
    lectura: { elementos: 0, capas: [], avisos: [], viewBox: [0, 0, 1, 1] },
    normalizacion: {
      eliminadas: {
        astillas: 0,
        astillasMm2: 0,
        detalles: 0,
        detallesMm2: 0,
        ocultas: 0
      },
      avisos: []
    },
    diagnostico: {
      regiones: 0,
      columnas: 0,
      parches: 0,
      parchesMm2: 0,
      sobranteMm2: 0,
      resueltoMm2: 0,
      sinResolverMm2: 0,
      manchaMm2: 0,
      reservas: 0,
      reservasMm2: 0,
      areaMm2: 0
    },
    zonas: [],
    uniones: [],
    modificaciones: [],
    simplificaciones: [],
    tiempos: { lecturaMs: 0, normalizacionMs: 0, analisisMs: 0 }
  };
}
var idPorDefecto = (hex2) => `color-${hex2.slice(1).toLowerCase()}`;
var AREA_DE_RELLENO_PESADO_MM2 = 600;
function rellenoPesado(ir, profile) {
  const areas = ir.filter((o) => o.tipo === "fill").map(
    (o) => Math.abs(
      areaPathsD(
        unionD(
          sanos(
            aplanar(o.geometria.d).map(
              (s) => s.puntos.map(([x, y]) => ({ x, y }))
            )
          ),
          [],
          FillRule.EvenOdd,
          4
        )
      )
    )
  );
  const mayor = Math.max(0, ...areas);
  if (mayor < AREA_DE_RELLENO_PESADO_MM2) return null;
  const total = areas.reduce((s, a) => s + a, 0);
  const porMm2 = 1 / (profile.stitches.fillSpacingMm * 3.5) * 1.25;
  const estimadas = Math.round(total * porMm2);
  return {
    code: "HEAVY_FILL",
    message: `Relleno grande: ${Math.round(mayor)} mm\xB2 en una sola pieza (${Math.round(total)} mm\xB2 de relleno en total, unas ${estimadas} puntadas). Es v\xE1lido; tarda m\xE1s en m\xE1quina y queda m\xE1s r\xEDgido.`,
    severity: "info",
    metrics: {
      areaMayorMm2: Math.round(mayor),
      areaRellenoMm2: Math.round(total),
      puntadasEstimadas: estimadas
    }
  };
}
function avisoDeSimplificacion(d, areaMm2) {
  if (!d.simplificaciones.some(
    (s) => s.type !== "eliminar" || s.visualImpact !== "ninguno"
  ))
    return null;
  const cuenta = (tipo) => d.simplificaciones.filter((s) => s.type === tipo).length;
  const visiblesQuitados = d.simplificaciones.filter(
    (s) => s.type === "eliminar" && s.role !== "no-esencial"
  ).length;
  const metrics = {
    detalles: d.simplificaciones.length,
    eliminados: cuenta("eliminar"),
    fusionados: cuenta("fusionar"),
    engrosados: cuenta("engrosar"),
    puntos: cuenta("punto"),
    corridos: cuenta("corrido"),
    perdidoMm2: Number(d.perdidoMm2.toFixed(2)),
    perdidoVisibleMm2: Number(d.perdidoVisibleMm2.toFixed(2)),
    esencialesPerdidos: d.esencialesPerdidos,
    // Las cifras del mayor detalle que se quita (las de `DETAIL_TOO_SMALL`).
    ...d.mayorPerdido && {
      widthMm: Number(d.mayorPerdido.anchoMm.toFixed(3)),
      areaMm2: Number(d.mayorPerdido.areaMm2.toFixed(3)),
      affectedAreaMm2: Number(d.perdidoVisibleMm2.toFixed(3))
    }
  };
  const demasiado2 = d.esencialesPerdidos > 0 || d.perdidoVisibleMm2 > Math.max(1, 0.01 * areaMm2);
  return demasiado2 ? {
    code: "DESIGN_SIMPLIFIED_TOO_MUCH",
    message: `Para bordarlo a este tama\xF1o se quitan ${visiblesQuitados} detalle${visiblesQuitados === 1 ? "" : "s"} que se ven (${metrics.perdidoVisibleMm2} mm\xB2${d.esencialesPerdidos ? `, ${d.esencialesPerdidos} esencial${d.esencialesPerdidos === 1 ? "" : "es"}` : ""}); revisa si el dise\xF1o sigue siendo el mismo o b\xF3rdalo m\xE1s grande.`,
    severity: "review",
    metrics
  } : {
    code: "DESIGN_SIMPLIFIED",
    message: `${metrics.detalles} detalle${metrics.detalles === 1 ? "" : "s"} demasiado peque\xF1o${metrics.detalles === 1 ? "" : "s"} para el hilo se adaptaron: ${metrics.engrosados} engrosados, ${metrics.puntos} como punto de hilo, ${metrics.corridos} como corrido, ${metrics.fusionados} unidos a su vecino y ${metrics.eliminados} quitados.`,
    severity: "info",
    metrics
  };
}
function objetosDeSvg(entrada2) {
  const { profile } = entrada2;
  const vector = profile.vector;
  if (!vector) throw new Error("El perfil no define la ruta vectorial");
  const idDeColor = entrada2.idDeColor ?? idPorDefecto;
  const reloj = () => performance.now();
  let t = reloj();
  let lectura;
  try {
    lectura = leerSvg(entrada2.svg, {
      destino: entrada2.destino,
      matriz: entrada2.matriz,
      toleranciaMm: vector.toleranciaCuerdaMm
    });
  } catch (error) {
    if (!(error instanceof ErrorDeSvg)) throw error;
    return rechazado(error);
  }
  const lecturaMs = reloj() - t;
  t = reloj();
  const verdadSvg = verdadDeCapas(lectura.capas, {
    minAreaMm2: profile.geometria.minAreaMm2,
    rejilla: entrada2.verdad?.rejilla
  });
  const verdadMs = reloj() - t;
  const esTelaDelOriginal = (() => {
    const v2 = entrada2.verdad ?? verdadSvg;
    const tinta = internoDe(v2).tinta.etiquetas;
    return (q) => {
      const k = celdaDe(v2.rejilla, q);
      return k >= 0 && !tinta[k];
    };
  })();
  const linaje = new Linaje(`${entrada2.prefijo}-`);
  const atomos = atomosDeVerdad(verdadSvg);
  const lr = entrada2.linajeRaster;
  const nodoDeComponente = /* @__PURE__ */ new Map();
  const nodoDeEtiqueta = /* @__PURE__ */ new Map();
  if (lr) {
    for (const c of lr.componentes) {
      const n2 = linaje.componente(c.id, { tinta: c.tinta, pixeles: c.pixeles, tipo: c.tipo });
      nodoDeComponente.set(c.id, n2);
      if (c.baja) linaje.baja(n2, "vectorizacion", c.baja);
    }
    for (const capa of lectura.capas)
      for (const e of [...new Set((capa.linaje ?? []).flat())].sort((a, b) => a - b)) {
        const padres = (lr.anillos[e - 1] ?? []).map((id) => nodoDeComponente.get(id)).filter((x) => !!x);
        if (padres.length)
          nodoDeEtiqueta.set(
            `${capa.indice}|${e}`,
            linaje.derivar("vectorizacion", padres, null, void 0, `capa ${capa.indice}|${e}`)
          );
      }
  }
  const capaDe = new Map(lectura.capas.map((c) => [c.indice, c]));
  const trazadosDe = (a) => {
    const capa = capaDe.get(a.capa);
    if (!lr || !capa?.linaje) return [];
    const p = puntoInterior2(a.region);
    if (!p) return [];
    let mejor = -1;
    let menor = Number.POSITIVE_INFINITY;
    capa.poligonos.forEach((anillo, k) => {
      let dentro2 = false;
      for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
        const [xi, yi, xj, yj] = [anillo[i].x, anillo[i].y, anillo[j].x, anillo[j].y];
        if (yi > p[1] !== yj > p[1] && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi)
          dentro2 = !dentro2;
      }
      if (!dentro2) return;
      let area2 = 0;
      for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++)
        area2 += (anillo[j].x + anillo[i].x) * (anillo[j].y - anillo[i].y);
      if (Math.abs(area2) < menor) {
        menor = Math.abs(area2);
        mejor = k;
      }
    });
    return mejor < 0 ? [] : (capa.linaje[mejor] ?? []).map((e) => nodoDeEtiqueta.get(`${capa.indice}|${e}`)).filter((x) => !!x);
  };
  const nodoDeAtomo = atomos.map(
    (a) => linaje.atomo(a.region, { capa: a.capa, color: a.color, clase: a.clase }, trazadosDe(a))
  );
  if (lr) {
    const hijos = new Set(linaje.exportar().flatMap((n2) => n2.padres));
    for (const n2 of nodoDeComponente.values())
      if (!hijos.has(n2) && !linaje.nodos.get(n2)?.baja)
        linaje.baja(n2, "vectorizacion", "su trazado no llega a la lectura del SVG");
    for (const n2 of nodoDeEtiqueta.values())
      if (!hijos.has(n2)) linaje.baja(n2, "vectorizacion", "el trazado no deja ning\xFAn \xE1tomo en la verdad del vector");
  }
  const atomosPorCapa = /* @__PURE__ */ new Map();
  atomos.forEach((a, k) => {
    const lista2 = atomosPorCapa.get(a.capa) ?? [];
    lista2.push({ region: a.region, nodo: nodoDeAtomo[k] });
    atomosPorCapa.set(a.capa, lista2);
  });
  t = reloj();
  const normalizacion = normalizarCapas(lectura.capas, {
    profile,
    linaje: { registro: linaje, atomos: atomosPorCapa }
  });
  const regionesPorBloque = normalizacion.bloques.map((b) => [...b.regiones]);
  const grosores = regionesPorBloque.flat().filter((r) => {
    const largo = [r.exterior, ...r.huecos].reduce(
      (t2, a) => t2 + perimetro(a),
      0
    );
    return 4 * Math.PI * areaDeRegion(r) / Math.max(largo * largo, 1e-12) < 0.4;
  }).map(grosorMedio).sort((a, b) => a - b);
  const detalles = adaptarDetalles(
    normalizacion.candidatos,
    regionesPorBloque,
    {
      minAreaMm2: profile.geometria.minAreaMm2,
      minAnchoMm: ANCHO_MINIMO_DETALLE_MM,
      trazoTipicoMm: grosores.length ? grosores[Math.floor(grosores.length / 2)] : void 0
    }
  );
  for (const u4 of normalizacion.unificadas)
    detalles.simplificaciones.push({
      type: "unificar",
      role: "esencial",
      originalAreaMm2: u4.areaMm2,
      resultingAreaMm2: u4.areaMm2,
      visualImpact: "bajo",
      motivo: `pieza de ${u4.areaMm2.toFixed(2)} mm\xB2 repartida en ${u4.tonos} tonos, ninguno cosible solo: se cose entera de su tono dominante`,
      color: u4.color,
      bloque: u4.bloque,
      centro: u4.centro,
      anchoMm: 0,
      largoMm: 0
    });
  for (const d of detalles.destinos) {
    const c = normalizacion.candidatos[d.candidato];
    const n2 = linaje.de(c.region);
    if (!n2) continue;
    if (d.accion === "eliminar")
      linaje.baja(n2, "adaptacion", "detalle que ninguna puntada dibuja a este tama\xF1o");
    else if (d.accion === "fusionar" && d.region) {
      const vecina = d.reemplaza ? linaje.de(d.reemplaza) : void 0;
      linaje.derivar("adaptacion", vecina ? [n2, vecina] : [n2], d.region, "fusionar");
    } else if (d.accion === "engrosar" && d.region)
      linaje.derivar("adaptacion", [n2], d.region, "engrosar");
    else if (d.accion === "punto" || d.accion === "corrido")
      linaje.alias(c.region, linaje.derivar("adaptacion", [n2], null, d.accion));
  }
  const normalizacionMs = reloj() - t;
  t = reloj();
  const ir = [];
  const objetos = [];
  const incidencias = [];
  const bloques = [];
  const diagnostico = {
    regiones: 0,
    columnas: 0,
    parches: 0,
    parchesMm2: 0,
    sobranteMm2: 0,
    resueltoMm2: 0,
    sinResolverMm2: 0,
    manchaMm2: 0,
    reservas: 0,
    reservasMm2: 0,
    areaMm2: 0
  };
  const zonas = [];
  const uniones = [];
  const modificaciones = [];
  let aguja = null;
  const paraRuta = [];
  const nombrar = unicos();
  normalizacion.bloques.forEach((bloque, k) => {
    const colorId = idDeColor(bloque.color);
    const regiones = [];
    for (const reg of regionesPorBloque[k]) {
      const partes = recortarAlArea([reg], entrada2.area.anchoMm, entrada2.area.altoMm);
      const n2 = linaje.de(reg);
      if (n2 && !partes.length) linaje.baja(n2, "area", "fuera del \xE1rea de bordado");
      for (const parte of partes)
        if (n2) linaje.derivar("area", [n2], parte, partes.length > 1 ? "recortar" : void 0);
      regiones.push(...partes);
    }
    const r = objetosDeRegiones(regiones, {
      colorId,
      profile,
      prefijo: `${entrada2.prefijo}-b${k}`,
      sourceObjectId: entrada2.sourceObjectId,
      sourceType: "vector",
      classification: "logo",
      origen: "svg",
      orden: "cercania",
      desde: aguja ?? void 0,
      revisarConfianza: true,
      formasEnteras: true,
      resolverZonas: true,
      adaptarPuntada: true,
      regularizarFinos: entrada2.regularizarFinos,
      corridosDeDetalle: detalles.corridos.filter((c) => c.bloque === k)
    });
    for (const c of protegerCounters(
      r.ir,
      r.ruta.map((x) => x.origen ?? x.forma),
      esTelaDelOriginal
    )) {
      r.objetos[c.objeto] = aContrato(r.ir[c.objeto], {
        sourceObjectId: entrada2.sourceObjectId,
        sourceType: "vector",
        classification: "logo",
        profile
      });
      const { objeto: _o, compensacionAntesMm: _a, compensacionDespuesMm: _d, ...m } = c;
      r.modificaciones.push(m);
    }
    aguja = r.fin ?? aguja;
    const usadas = /* @__PURE__ */ new Set();
    r.ir.forEach((o, i) => {
      const origen = r.ruta[i]?.origen ?? r.ruta[i]?.forma;
      const madre = origen ? linaje.de(origen) : void 0;
      const id = nombrar(
        `ir-${huellaEstable(`${colorId}|${o.tipo}|${o.geometria.d}`)}`
      );
      o.identidad = { id, padres: madre ? [madre] : [] };
      if (madre) {
        linaje.objeto(id, [madre]);
        usadas.add(madre);
      }
    });
    for (const reg of [
      ...regiones,
      ...detalles.corridos.filter((c) => c.bloque === k).map((c) => c.region)
    ]) {
      const n2 = linaje.de(reg);
      if (n2 && !usadas.has(n2)) linaje.baja(n2, "objetos", "no gener\xF3 ning\xFAn objeto de bordado");
    }
    zonas.push(...r.zonas.map((z) => ({ ...z, bloque: k })));
    uniones.push(...r.uniones.map((u4) => ({ ...u4, bloque: k })));
    modificaciones.push(...r.modificaciones.map((m) => ({ ...m, bloque: k })));
    const desde = ir.length;
    paraRuta.push({ ir: r.ir, ruta: r.ruta });
    ir.push(...r.ir);
    objetos.push(...r.objetos);
    incidencias.push(...r.incidencias);
    for (const clave2 of Object.keys(diagnostico))
      diagnostico[clave2] += r.diagnostico[clave2];
    bloques.push({
      colorId,
      hex: bloque.color,
      regiones,
      objetos: r.ir.map((_, i) => desde + i),
      areaMm2: bloque.areaMm2,
      capas: bloque.capas
    });
  });
  for (const m of modificaciones) {
    if (m.tipo !== "resto-de-eje") continue;
    detalles.simplificaciones.push({
      type: "eliminar",
      role: "no-esencial",
      originalAreaMm2: m.antesMm2,
      resultingAreaMm2: 0,
      visualImpact: "ninguno",
      motivo: m.motivo,
      color: normalizacion.bloques[m.bloque].color,
      bloque: m.bloque,
      centro: m.centro,
      anchoMm: m.anchoMm ?? 0,
      largoMm: m.largoMm ?? 0
    });
    detalles.perdidoMm2 += m.antesMm2;
  }
  const hiloDe = (hex2) => normalizacion.hilos.find((h) => h.tonos.includes(hex2))?.color ?? hex2;
  const hilosCosidos = [...new Set(bloques.map((b) => b.hex))];
  const regionesDeHilo = /* @__PURE__ */ new Map();
  for (const hilo of hilosCosidos) {
    const propias = verdadSvg.colores.flatMap(
      (c, i) => hiloDe(c) === hilo ? [...verdadSvg.regiones[i]] : []
    );
    const tonos = verdadSvg.colores.filter((c) => hiloDe(c) === hilo).length;
    regionesDeHilo.set(hilo, tonos > 1 ? unirRegiones(propias) : propias);
  }
  const asignarGrupos = (hilo) => {
    const k = bloques.findIndex((b) => b.hex === hilo);
    const donde = localizadorDeRegiones(regionesDeHilo.get(hilo) ?? []);
    for (const i of bloques.flatMap((x) => x.hex === hilo ? x.objetos : [])) {
      const o = ir[i];
      if (o.rol === "traslado" || !o.puntos.length) continue;
      const n2 = o.puntos.length;
      let g = -1;
      for (let j = 0; j < n2 && g < 0; j += Math.max(1, Math.floor(n2 / 8))) {
        const [a, b] = [o.puntos[j], o.puntos[(j + Math.floor(n2 / 2)) % n2]];
        const p = n2 === 1 ? a : [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        g = donde(p);
      }
      if (g >= 0) o.traza = { ...o.traza, grupo: `b${k}-g${g}` };
    }
  };
  for (const hilo of hilosCosidos) asignarGrupos(hilo);
  let ruta;
  let rutaMs;
  if (entrada2.enrutar !== false && paraRuta.length) {
    const enrutado = routeEmbroideryObjects(paraRuta, {
      runningLengthMm: profile.stitches.maxStitchLengthMm
    });
    rutaMs = enrutado.ms;
    ir.length = 0;
    objetos.length = 0;
    enrutado.bloques.forEach((b, k) => {
      const desde = ir.length;
      b.ir.forEach((o, i) => {
        o.id = `${entrada2.prefijo}-b${k}-${i}`;
      });
      ir.push(...b.ir);
      objetos.push(
        ...b.ir.map(
          (o) => aContrato(o, {
            sourceObjectId: entrada2.sourceObjectId,
            sourceType: "vector",
            classification: "logo",
            profile
          })
        )
      );
      bloques[k].objetos = b.ir.map((_, i) => desde + i);
    });
    for (const b of bloques) {
      const ultimo = b.objetos[b.objetos.length - 1];
      if (ultimo === void 0) continue;
      ir[ultimo].cortarDespues = false;
      objetos[ultimo].stitch.trimAfter = false;
    }
    ruta = {
      decisiones: enrutado.bloques.flatMap((b) => b.decisiones),
      costeAntes: enrutado.costeAntes,
      costeDespues: enrutado.costeDespues,
      mejorado: enrutado.mejorado,
      traslados: ir.filter((o) => o.rol === "traslado").length
    };
  }
  for (const bloque of bloques.slice(0, -1)) {
    const ultimo = bloque.objetos[bloque.objetos.length - 1];
    if (ultimo === void 0) continue;
    ir[ultimo].cortarDespues = true;
    objetos[ultimo].stitch.trimAfter = true;
  }
  const analisisMs = reloj() - t;
  for (const aviso of [...lectura.avisos, ...normalizacion.avisos])
    if (aviso.severidad === "revisar")
      incidencias.push({
        code: aviso.codigo,
        message: aviso.mensaje,
        severity: "review",
        ...aviso.metricas ? { metrics: aviso.metricas } : {}
      });
  const grupos = [];
  const topologia = {
    sourceComponents: 0,
    resultComponents: 0,
    sourceEndpoints: 0,
    resultEndpoints: 0,
    sourceBranches: 0,
    resultBranches: 0,
    sourceLoops: 0,
    resultLoops: 0
  };
  const suma = {
    fuente: 0,
    cubierto: 0,
    hueco: 0,
    errores: 0,
    n: 0,
    maxError: 0
  };
  const tEstructura = reloj();
  hilosCosidos.forEach((hilo) => {
    const k = bloques.findIndex((b2) => b2.hex === hilo);
    const b = {
      objetos: bloques.flatMap((x) => x.hex === hilo ? x.objetos : [])
    };
    const fuente = regionesDeHilo.get(hilo) ?? [];
    const c = compararEstructura(
      fuente,
      b.objetos.map((i) => ir[i]),
      {
        bloque: k,
        maxSatinMm: profile.quality.maxSatinWidthMm,
        /* Los detalles con el mismo criterio con el que la normalización
           los aparta: su destino lo cuenta `DESIGN_SIMPLIFIED`. */
        detalles: new Set(fuente.filter((r) => esDetalleDelDiseno(r, profile))),
        otrosColores: hilosCosidos.filter((h) => h !== hilo).flatMap((h) => regionesDeHilo.get(h) ?? [])
      }
    );
    grupos.push(...c.grupos);
    asignarGrupos(hilo);
    for (const clave2 of Object.keys(topologia))
      topologia[clave2] += c.topologia[clave2];
    suma.fuente += c.cobertura.sourceLengthMm;
    suma.cubierto += c.cobertura.coveredLengthMm;
    suma.hueco = Math.max(suma.hueco, c.cobertura.longestMissingSegmentMm);
    suma.errores += c.cobertura.meanCenterlineErrorMm * c.cobertura.sourceLengthMm;
    suma.maxError = Math.max(suma.maxError, c.cobertura.maxCenterlineErrorMm);
  });
  const estructuraMs = reloj() - tEstructura;
  const ensanchados = lectura.capas.filter(
    (c) => c.anchoTrazoOriginalMm !== void 0 && HILO_ASENTADO_MM - c.anchoTrazoOriginalMm > POLITICA_DE_TRAZO_FINO.maxAllowedExpansionMm && HILO_ASENTADO_MM / Math.max(c.anchoTrazoOriginalMm, 1e-3) > POLITICA_DE_TRAZO_FINO.maxAllowedExpansionRatio
  );
  if (ensanchados.length) {
    const largoEnsanchado = ensanchados.reduce(
      (t2, c) => t2 + Math.abs(areaPathsD(c.poligonos)) / Math.max(c.anchoTrazoMm ?? 1, 1e-3),
      0
    );
    const largoTotal = grupos.reduce((t2, g) => t2 + g.largoEjeMm, 0);
    const dominante = largoEnsanchado >= FRACCION_ENSANCHADA_DOMINANTE * Math.max(largoTotal, 1e-9);
    const minimo = Math.min(
      ...ensanchados.map((c) => c.anchoTrazoOriginalMm)
    );
    incidencias.push({
      code: dominante ? "STRUCTURE_REQUIRES_TOO_MUCH_EXPANSION" : "THIN_HAIRLINES_EXPANDED",
      message: dominante ? `El dise\xF1o se apoya en trazos de ${minimo.toFixed(2)} mm: el hilo los ensanchar\xEDa a ${HILO_ASENTADO_MM} mm, m\xE1s de lo que permite la pol\xEDtica de trazo fino.` : `${ensanchados.length} filete${ensanchados.length === 1 ? "" : "s"} de ${minimo.toFixed(2)} mm o m\xE1s se cosen como una l\xEDnea de hilo de ${HILO_ASENTADO_MM} mm.`,
      severity: dominante ? "review" : "info",
      metrics: {
        trazos: ensanchados.length,
        originalWidthMm: Number(minimo.toFixed(3)),
        finalWidthMm: HILO_ASENTADO_MM,
        fraccionDelEje: Number(
          (largoEnsanchado / Math.max(largoTotal, 1e-9)).toFixed(3)
        )
      }
    });
  }
  const porGrupo = {};
  for (const g of grupos)
    if (g.incidencias.length) porGrupo[g.id] = g.incidencias;
  const estructura = {
    grupos,
    topologia,
    cobertura: {
      sourceLengthMm: Number(suma.fuente.toFixed(2)),
      coveredLengthMm: Number(suma.cubierto.toFixed(2)),
      coverageRatio: suma.fuente > 0 ? Number((suma.cubierto / suma.fuente).toFixed(4)) : 1,
      missingLengthMm: Number((suma.fuente - suma.cubierto).toFixed(2)),
      longestMissingSegmentMm: Number(suma.hueco.toFixed(2)),
      meanCenterlineErrorMm: suma.fuente > 0 ? Number((suma.errores / suma.fuente).toFixed(3)) : 0,
      maxCenterlineErrorMm: Number(suma.maxError.toFixed(3))
    },
    porGrupo
  };
  for (const codigo of [
    "STRUCTURAL_STROKE_LOST",
    "STRUCTURE_FRAGMENTED",
    "COUNTER_LOST",
    "LOOP_BROKEN",
    "THIN_STRUCTURE_INCOMPLETE",
    "STRUCTURE_REQUIRES_TOO_MUCH_EXPANSION"
  ]) {
    const afectados = grupos.filter((g) => g.incidencias.includes(codigo));
    if (!afectados.length) continue;
    incidencias.push({
      code: codigo,
      message: `${MENSAJE_ESTRUCTURAL[codigo]} (${afectados.length} ${afectados.length === 1 ? "estructura" : "estructuras"}: ${afectados.slice(0, 6).map((g) => g.id).join(", ")}${afectados.length > 6 ? "\u2026" : ""}).`,
      severity: "review",
      metrics: {
        estructuras: afectados.length,
        ejePerdidoMm: Number(
          afectados.reduce((t2, g) => t2 + g.cobertura.missingLengthMm, 0).toFixed(2)
        ),
        peorCobertura: Math.min(
          ...afectados.map((g) => g.cobertura.coverageRatio)
        )
      }
    });
  }
  for (const codigo of [
    "THIN_COMPONENT_LOST",
    "THIN_JUNCTION_LOST",
    "THIN_STRUCTURE_FRAGMENTED",
    "THIN_LOOP_BROKEN",
    "THIN_COUNTER_LOST",
    "THIN_STRUCTURE_REQUIRES_TOO_MUCH_EXPANSION"
  ]) {
    const afectados = grupos.filter((g) => g.incidenciasFinas.includes(codigo));
    if (!afectados.length) continue;
    const peor = Math.min(...afectados.map((g) => g.cobertura.coverageRatio));
    incidencias.push({
      code: codigo,
      message: `${MENSAJE_FINO[codigo]} (${afectados.length} ${afectados.length === 1 ? "estructura" : "estructuras"}: ${afectados.slice(0, 6).map((g) => `${g.id} ${Math.round(100 * g.cobertura.coverageRatio)} % de eje, hueco ${g.cobertura.longestMissingSegmentMm} mm`).join("; ")}${afectados.length > 6 ? "\u2026" : ""}).`,
      severity: afectados.some((g) => g.importancia !== "decorative") ? "review" : "info",
      metrics: {
        estructuras: afectados.length,
        esenciales: afectados.filter((g) => g.importancia === "essential").length,
        peorRecall: peor,
        ejePerdidoMm: Number(afectados.reduce((t2, g) => t2 + g.cobertura.missingLengthMm, 0).toFixed(2)),
        huecoMaxMm: Math.max(...afectados.map((g) => g.cobertura.longestMissingSegmentMm))
      }
    });
  }
  t = reloj();
  const original = entrada2.verdad ?? verdadSvg;
  const rejilla = original.rejilla;
  {
    const interno2 = internoDe(original);
    for (const g of grupos) {
      const ids = /* @__PURE__ */ new Set();
      for (const eje of g.ejes)
        for (const [x, y] of eje) {
          const i = Math.floor((x - rejilla.x0) / rejilla.paso);
          const j = Math.floor((y - rejilla.y0) / rejilla.paso);
          if (i < 0 || j < 0 || i >= rejilla.ancho || j >= rejilla.alto) continue;
          const k = interno2.piezaDe.get(interno2.tinta.etiquetas[j * rejilla.ancho + i]);
          if (k !== void 0) ids.add(original.componentes[k].id);
        }
      g.piezas = [...ids].sort();
    }
  }
  const estados = [];
  if (entrada2.verdad)
    estados.push({
      frontera: "vectorizacion",
      etiquetas: verdadSvg.etiquetas,
      hilos: verdadSvg.colores.map(hiloDe)
    });
  estados.push(
    pintarEstado(
      rejilla,
      "normalizacion",
      normalizacion.bloques.flatMap(
        (b, k) => (regionesPorBloque[k] ?? []).map((r) => ({
          hilo: b.color,
          anillos: [r.exterior, ...r.huecos],
          regla: "evenodd"
        }))
      )
    )
  );
  const hexDeColorId = new Map(bloques.map((b) => [b.colorId, b.hex]));
  estados.push(
    pintarEstado(
      rejilla,
      "ir",
      ir.map((o) => ({
        hilo: hexDeColorId.get(o.color) ?? o.color,
        anillos: cosidoDe(o).map((a) => a.map((q) => [q.x, q.y])),
        regla: "nonzero"
      }))
    )
  );
  const celdaEn = (p) => {
    const i = Math.floor((p[0] - rejilla.x0) / rejilla.paso);
    const j = Math.floor((p[1] - rejilla.y0) / rejilla.paso);
    return i < 0 || j < 0 || i >= rejilla.ancho || j >= rejilla.alto ? -1 : j * rejilla.ancho + i;
  };
  const primeraFrontera = (puntos, divergeEn) => {
    const celdas = puntos.map(celdaEn).filter((i) => i >= 0);
    if (!celdas.length) return null;
    const diverge = (e) => celdas.filter((i) => divergeEn(e, i)).length * 2 > celdas.length;
    let desde = estados.length;
    while (desde > 0 && diverge(estados[desde - 1])) desde--;
    return desde < estados.length ? estados[desde].frontera : "ir";
  };
  const hiloDeGrupo = (g) => bloques[g.bloque]?.hex;
  for (const incidencia of incidencias) {
    const codigo = incidencia.code;
    if (![
      "STRUCTURAL_STROKE_LOST",
      "THIN_STRUCTURE_INCOMPLETE",
      "COUNTER_LOST"
    ].includes(codigo))
      continue;
    const fronteras = grupos.filter((g) => g.incidencias.includes(codigo)).map((g) => {
      const hilo = hiloDeGrupo(g);
      if (codigo === "COUNTER_LOST")
        return primeraFrontera(
          g.huecos.filter((h) => h.estado === "tapado").map((h) => h.punto),
          (e, i) => e.etiquetas[i] > 0
        );
      return primeraFrontera(g.perdidos.flat(), (e, i) => {
        const k = e.hilos.indexOf(hilo ?? "") + 1;
        return !(k > 0 && e.etiquetas[i] === k);
      });
    }).filter((f3) => f3 !== null);
    if (!fronteras.length) continue;
    incidencia.metrics = {
      ...incidencia.metrics,
      primeraFrontera: Math.min(...fronteras.map((f3) => ORDEN_DE_FRONTERA[f3])),
      ...Object.fromEntries(
        [...new Set(fronteras)].map((f3) => [
          `en_${f3}`,
          fronteras.filter((x) => x === f3).length
        ])
      )
    };
  }
  const topologia2 = compararConVerdad(original, estados, {
    minAreaMm2: profile.geometria.minAreaMm2,
    hiloDe
  });
  incidencias.push(...incidenciasTopologicas(original, topologia2));
  const topologiaMs = reloj() - t;
  t = reloj();
  const aPaths6 = (r) => [r.exterior, ...r.huecos].map((a) => a.map(([x, y]) => ({ x, y })));
  const grupoDeAtomo = /* @__PURE__ */ new Map();
  const atomosDeGrupo = /* @__PURE__ */ new Map();
  for (const hilo of hilosCosidos) {
    const k0 = bloques.findIndex((b) => b.hex === hilo);
    const fuente = regionesDeHilo.get(hilo) ?? [];
    const tonos = verdadSvg.colores.map((c, ci) => ({ c, ci })).filter(({ c }) => hiloDe(c) === hilo);
    const propias = tonos.flatMap(
      ({ ci }) => verdadSvg.regiones[ci].map((r, g) => ({ ci, g, r }))
    );
    const grupoDe = propias.map((_, k) => k);
    if (tonos.length > 1) {
      const { padres } = linaje.unir(
        propias.map((p, k) => ({ region: p.r, nodo: String(k) })),
        fuente
      );
      padres.forEach((ps, g) => {
        for (const k of ps) grupoDe[Number(k)] = g;
      });
    }
    atomos.forEach((a, k) => {
      if (a.clase !== "visible" || a.regionDeColor === void 0) return;
      const ci = verdadSvg.colores.indexOf(a.color);
      const j = propias.findIndex((p) => p.ci === ci && p.g === a.regionDeColor);
      if (j < 0) return;
      const id = `${entrada2.prefijo}-b${k0}-g${grupoDe[j]}`;
      grupoDeAtomo.set(nodoDeAtomo[k], id);
      const set = atomosDeGrupo.get(id) ?? /* @__PURE__ */ new Set();
      set.add(nodoDeAtomo[k]);
      atomosDeGrupo.set(id, set);
    });
    fuente.forEach((_, g) => {
      const id = `${entrada2.prefijo}-b${k0}-g${g}`;
      if (!atomosDeGrupo.has(id)) atomosDeGrupo.set(id, /* @__PURE__ */ new Set());
    });
  }
  const interno = internoDe(original);
  const idDePieza = (k) => `${entrada2.prefijo}-${original.componentes[k].id}`;
  const celdasDe = (anillos) => {
    let x0 = Number.POSITIVE_INFINITY;
    let y0 = Number.POSITIVE_INFINITY;
    let x1 = Number.NEGATIVE_INFINITY;
    let y1 = Number.NEGATIVE_INFINITY;
    for (const a of anillos)
      for (const [x, y] of a) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
    const salida2 = /* @__PURE__ */ new Map();
    if (!Number.isFinite(x0)) return salida2;
    const i0 = Math.max(0, Math.floor((x0 - rejilla.x0) / rejilla.paso));
    const j0 = Math.max(0, Math.floor((y0 - rejilla.y0) / rejilla.paso));
    const i1 = Math.min(rejilla.ancho - 1, Math.ceil((x1 - rejilla.x0) / rejilla.paso));
    const j1 = Math.min(rejilla.alto - 1, Math.ceil((y1 - rejilla.y0) / rejilla.paso));
    if (i1 < i0 || j1 < j0) return salida2;
    const sub = {
      x0: rejilla.x0 + i0 * rejilla.paso,
      y0: rejilla.y0 + j0 * rejilla.paso,
      paso: rejilla.paso,
      ancho: i1 - i0 + 1,
      alto: j1 - j0 + 1
    };
    const mascara = new Uint8Array(sub.ancho * sub.alto);
    pintarAnillos(mascara, sub, anillos, 1, "nonzero");
    for (let c = 0; c < mascara.length; c++) {
      if (!mascara[c]) continue;
      const x = c % sub.ancho;
      const y = (c - x) / sub.ancho;
      const tt = interno.tinta.etiquetas[(j0 + y) * rejilla.ancho + i0 + x];
      const k = tt ? interno.piezaDe.get(tt) : void 0;
      if (k !== void 0) salida2.set(k, (salida2.get(k) ?? 0) + 1);
    }
    return salida2;
  };
  const piezasDeAtomo = /* @__PURE__ */ new Map();
  const atomosDePieza = original.componentes.map(() => /* @__PURE__ */ new Set());
  const piezasPorCeldas = /* @__PURE__ */ new Map();
  atomos.forEach((a, k) => {
    const piezas = [...celdasDe([a.region.exterior, ...a.region.huecos]).keys()].sort(
      (x, y) => x - y
    );
    piezasPorCeldas.set(nodoDeAtomo[k], piezas);
    if (lr) return;
    piezasDeAtomo.set(nodoDeAtomo[k], piezas);
    for (const p of piezas) atomosDePieza[p].add(nodoDeAtomo[k]);
  });
  if (lr)
    lr.piezas.forEach((ids, k) => {
      if (!atomosDePieza[k]) return;
      for (const id of ids) {
        const n2 = nodoDeComponente.get(id);
        if (!n2) continue;
        atomosDePieza[k].add(n2);
        piezasDeAtomo.set(n2, [...piezasDeAtomo.get(n2) ?? [], k]);
      }
    });
  const deAncestros = (id) => {
    const ancestros = linaje.nodos.get(id)?.ancestros ?? [];
    const grupos2 = /* @__PURE__ */ new Set();
    const piezas = /* @__PURE__ */ new Set();
    for (const a of ancestros) {
      const g = grupoDeAtomo.get(a);
      if (g) grupos2.add(g);
      for (const p of piezasDeAtomo.get(a) ?? []) piezas.add(idDePieza(p));
    }
    return { grupos: [...grupos2].sort(), piezas: [...piezas].sort() };
  };
  const gruposDeHilo = /* @__PURE__ */ new Map();
  for (const hilo of hilosCosidos) {
    const k0 = bloques.findIndex((b) => b.hex === hilo);
    gruposDeHilo.set(
      hilo,
      (regionesDeHilo.get(hilo) ?? []).map((reg, g) => ({
        id: `${entrada2.prefijo}-b${k0}-g${g}`,
        paths: aPaths6(reg),
        caja: cajaDeRegion(reg)
      }))
    );
  }
  const porSolape = (o) => {
    const cobertura = coberturaDe(o);
    const area2 = Math.abs(areaPathsD(cobertura));
    const caja = cajaDeRegion({
      exterior: cobertura.flat().map((q) => [q.x, q.y]),
      huecos: []
    });
    const hilo = hexDeColorId.get(o.color) ?? o.color;
    const grupos2 = (gruposDeHilo.get(hilo) ?? []).filter(
      (g) => g.caja.maxX >= caja.minX && g.caja.minX <= caja.maxX && g.caja.maxY >= caja.minY && g.caja.minY <= caja.maxY
    ).filter(
      (g) => Math.abs(areaPathsD(intersectD(cobertura, g.paths, FillRule.EvenOdd, 4))) >= Math.max(HUECO_MINIMO_MM2, 0.01 * area2)
    ).map((g) => g.id).sort();
    const cuenta = celdasDe(cobertura.map((a) => a.map((q) => [q.x, q.y])));
    const total = [...cuenta.values()].reduce((t2, n2) => t2 + n2, 0);
    const piezas = [...cuenta].filter(([, n2]) => n2 >= Math.max(1, 0.01 * total)).map(([k]) => idDePieza(k)).sort();
    return { grupos: grupos2, piezas };
  };
  const divergencias = [];
  const divergenciasVectorizacion = [];
  const porCeldas = (id) => [
    ...new Set(
      (linaje.nodos.get(id)?.ancestros ?? []).flatMap(
        (a) => (piezasPorCeldas.get(a) ?? []).map(idDePieza)
      )
    )
  ].sort();
  let anterior;
  ir.forEach((o, i) => {
    if (o.rol === "traslado") {
      const siguiente = ir.slice(i + 1).find((x) => x.rol !== "traslado")?.identidad?.id;
      const padres = [anterior, siguiente].filter((x) => !!x);
      o.identidad = {
        id: nombrar(
          `tr-${huellaEstable(`${padres.join("+")}|${o.geometria.d}`)}`
        ),
        padres,
        grupos: [],
        piezas: [],
        rol: "traslado"
      };
      return;
    }
    const id = o.identidad?.id ?? nombrar(`ir-${huellaEstable(o.geometria.d)}`);
    anterior = id;
    const exacto = deAncestros(id);
    o.identidad = {
      id,
      padres: o.identidad?.padres ?? [],
      grupos: exacto.grupos,
      piezas: exacto.piezas
    };
    const inferido = porSolape(o);
    if (inferido.grupos.join() !== exacto.grupos.join() || inferido.piezas.join() !== exacto.piezas.join())
      divergencias.push({ objeto: id, linaje: exacto, solape: inferido });
    if (lr) {
      const celdas = porCeldas(id);
      if (celdas.join() !== exacto.piezas.join())
        divergenciasVectorizacion.push({ objeto: id, linaje: exacto.piezas, celdas });
    }
  });
  ir.forEach((o, i) => {
    const id = o.identidad;
    if (!id || !objetos[i]) return;
    objetos[i].identity = {
      id: id.id,
      groups: id.grupos ?? [],
      pieces: id.piezas ?? [],
      parents: id.padres,
      ...id.rol ? { role: "travel" } : {}
    };
  });
  const historiasDeGrupo = [...atomosDeGrupo.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([id, at]) => ({
    id,
    atomos: [...at].sort(),
    historia: at.size ? linaje.historia(at, (a) => grupoDeAtomo.has(a) && grupoDeAtomo.get(a) !== id) : sinAtomos(original.origen === "raster" ? "vectorizacion" : "verdad")
  }));
  const historiasDePieza = original.componentes.map((_c, k) => {
    const at = atomosDePieza[k];
    return {
      id: idDePieza(k),
      atomos: [...at].sort(),
      historia: at.size ? (
        // Ajeno: una raíz de OTRA pieza (un átomo o un componente); un átomo intermedio no cuenta.
        linaje.historia(at, (a) => piezasDeAtomo.has(a) && !(piezasDeAtomo.get(a) ?? []).includes(k))
      ) : sinAtomos(original.origen === "raster" ? "vectorizacion" : "verdad")
    };
  });
  const identidadMs = reloj() - t;
  const simplificacion = avisoDeSimplificacion(
    detalles,
    normalizacion.bloques.reduce((t2, b) => t2 + b.areaMm2, 0)
  );
  if (simplificacion) incidencias.push(simplificacion);
  const pesado = rellenoPesado(ir, profile);
  if (pesado) incidencias.push(pesado);
  if (!ir.length)
    incidencias.push({
      code: "SVG_SIN_FORMAS",
      message: "El SVG no tiene formas que se puedan bordar.",
      severity: "reject"
    });
  const colores = /* @__PURE__ */ new Map();
  for (const b of bloques) {
    if (colores.has(b.hex)) continue;
    const hilo = normalizacion.hilos.find((h) => h.color === b.hex);
    colores.set(b.hex, {
      id: b.colorId,
      hex: b.hex,
      tonos: hilo?.tonos ?? [b.hex],
      areaMm2: Number((hilo?.areaMm2 ?? b.areaMm2).toFixed(3))
    });
  }
  const conteo = { satin: 0, running: 0, fill: 0 };
  for (const o of ir) if (o.rol !== "traslado") conteo[o.tipo]++;
  const redondear3 = (v2) => Number(v2.toFixed(1));
  return {
    ir,
    objetos,
    incidencias: incidencias.filter(
      (x, i, todas) => todas.findIndex((y) => y.code === x.code) === i
    ),
    colores: [...colores.values()],
    bloques,
    conteo,
    lectura: {
      elementos: lectura.elementos,
      capas: lectura.capas,
      avisos: lectura.avisos,
      viewBox: lectura.viewBox
    },
    normalizacion: {
      eliminadas: normalizacion.eliminadas,
      avisos: normalizacion.avisos
    },
    diagnostico: {
      ...diagnostico,
      parchesMm2: Number(diagnostico.parchesMm2.toFixed(3)),
      sobranteMm2: Number(diagnostico.sobranteMm2.toFixed(3)),
      resueltoMm2: Number(diagnostico.resueltoMm2.toFixed(3)),
      sinResolverMm2: Number(diagnostico.sinResolverMm2.toFixed(3)),
      reservasMm2: Number(diagnostico.reservasMm2.toFixed(3)),
      areaMm2: Number(diagnostico.areaMm2.toFixed(3))
    },
    zonas,
    uniones,
    modificaciones,
    simplificaciones: detalles.simplificaciones,
    tiempos: {
      lecturaMs: redondear3(lecturaMs),
      normalizacionMs: redondear3(normalizacionMs),
      analisisMs: redondear3(analisisMs),
      ...rutaMs !== void 0 && { rutaMs },
      verdadMs: redondear3(verdadMs),
      estructuraMs: redondear3(estructuraMs),
      topologiaMs: redondear3(topologiaMs),
      identidadMs: redondear3(identidadMs)
    },
    verdad: original,
    topologia: topologia2,
    ...ruta && { ruta },
    estructura,
    linaje: {
      nodos: linaje.exportar(),
      grupos: historiasDeGrupo,
      piezas: historiasDePieza,
      divergencias,
      ...lr ? { divergenciasVectorizacion } : {}
    }
  };
}
function sinAtomos(etapa) {
  return {
    destino: "removed",
    etapa,
    sucesos: [
      {
        etapa,
        tipo: "removed",
        nodos: [],
        motivo: etapa === "vectorizacion" ? "la imagen la tiene y la vectorizaci\xF3n no le da tinta: sus p\xEDxeles no son de ning\xFAn componente" : "ning\xFAn \xE1tomo de las capas la pinta en la rejilla"
      }
    ],
    regiones: [],
    objetos: []
  };
}
var FRACCION_ENSANCHADA_DOMINANTE = 0.25;
var MENSAJE_FINO = {
  THIN_COMPONENT_LOST: "Una estructura fina (un trazo, una letra, una l\xEDnea) no queda cosida: se pierde entera",
  THIN_JUNCTION_LOST: "Una estructura fina pierde un trazo que une dos partes o cierra un lazo",
  THIN_STRUCTURE_FRAGMENTED: "Una estructura fina continua queda cosida en piezas separadas",
  THIN_LOOP_BROKEN: "Un lazo de una estructura fina queda abierto",
  THIN_COUNTER_LOST: "Un counter de una estructura fina (el ojo de una letra, el centro de un anillo) queda tapado",
  THIN_STRUCTURE_REQUIRES_TOO_MUCH_EXPANSION: "Una estructura fina s\xF3lo se puede bordar ensanch\xE1ndola m\xE1s de lo que permite la pol\xEDtica de trazo fino"
};
var MENSAJE_ESTRUCTURAL = {
  STRUCTURAL_STROKE_LOST: "Se perdi\xF3 un trazo que une dos partes de la forma o cierra un lazo",
  STRUCTURE_FRAGMENTED: "Una forma continua qued\xF3 cosida en piezas separadas",
  COUNTER_LOST: "Un hueco de la forma (el ojo de una letra, el centro de un anillo) qued\xF3 tapado",
  LOOP_BROKEN: "Un lazo de la forma qued\xF3 abierto",
  THIN_STRUCTURE_INCOMPLETE: "Una estructura fina qued\xF3 incompleta: falta m\xE1s del 10 % de su eje",
  STRUCTURE_REQUIRES_TOO_MUCH_EXPANSION: "Una estructura fina s\xF3lo se puede bordar ensanch\xE1ndola m\xE1s de lo permitido"
};

// packages/bordado/src/raster/grafico.ts
var PASO_SUAVE = 4;
var DESVIO_MAXIMO = 22;
function regionesCoherentes(datos, ancho, alto) {
  const n2 = ancho * alto;
  const lab = new Array(n2);
  const opaco = new Uint8Array(n2);
  for (let p = 0; p < n2; p++) {
    const i = p * 4;
    if (datos[i + 3] < 250) continue;
    const x = p % ancho;
    let canto = false;
    for (let dy = -1; dy <= 1 && !canto; dy++)
      for (let dx = -1; dx <= 1 && !canto; dx++) {
        const xx = x + dx;
        const q = p + dy * ancho + dx;
        canto = xx >= 0 && xx < ancho && q >= 0 && q < n2 && datos[q * 4 + 3] < 128;
      }
    if (canto) continue;
    opaco[p] = 1;
    lab[p] = aLab(datos[i], datos[i + 1], datos[i + 2]);
  }
  const etiqueta = new Int32Array(n2).fill(-1);
  const cola = new Int32Array(n2);
  let siguiente = 0;
  for (let inicio = 0; inicio < n2; inicio++) {
    if (!opaco[inicio] || etiqueta[inicio] >= 0) continue;
    const e = siguiente++;
    const media = [...lab[inicio]];
    let cuenta = 1;
    etiqueta[inicio] = e;
    let cabeza = 0;
    let fin5 = 0;
    cola[fin5++] = inicio;
    while (cabeza < fin5) {
      const p = cola[cabeza++];
      const x = p % ancho;
      for (const q of [
        x > 0 ? p - 1 : -1,
        x < ancho - 1 ? p + 1 : -1,
        p >= ancho ? p - ancho : -1,
        p < n2 - ancho ? p + ancho : -1
      ]) {
        if (q < 0 || !opaco[q] || etiqueta[q] >= 0) continue;
        if (deltaE(lab[p], lab[q]) >= PASO_SUAVE) continue;
        if (deltaE(lab[q], media) >= DESVIO_MAXIMO) continue;
        etiqueta[q] = e;
        cola[fin5++] = q;
        cuenta++;
        for (let c = 0; c < 3; c++) media[c] += (lab[q][c] - media[c]) / cuenta;
      }
    }
  }
  return { etiqueta, lab, opaco };
}
function analizarGrafico(datos, ancho, alto, mmPorPx) {
  const n2 = ancho * alto;
  const { etiqueta, lab, opaco } = regionesCoherentes(datos, ancho, alto);
  const grupos = /* @__PURE__ */ new Map();
  let primerPlano = 0;
  for (let p = 0; p < n2; p++) {
    if (!opaco[p]) continue;
    primerPlano++;
    const e = etiqueta[p];
    const g = grupos.get(e);
    if (g) g.push(p);
    else grupos.set(e, [p]);
  }
  const minimo = Math.max(
    12,
    primerPlano * 1e-3,
    Math.min(0.5 / (mmPorPx * mmPorPx), primerPlano * FRACCION_DEL_DISENO)
  );
  const aplanada = new Uint8ClampedArray(datos);
  const degradados = [];
  const colores = [];
  let coherente = 0;
  let regiones = 0;
  let rugosos = 0;
  let degradadosRugosos = 0;
  for (const pixeles of grupos.values()) {
    if (pixeles.length < minimo) continue;
    regiones++;
    coherente += pixeles.length;
    let grano = 0;
    let pares = 0;
    for (const p of pixeles) {
      const e = etiqueta[p];
      if ((p + 1) % ancho !== 0 && etiqueta[p + 1] === e) {
        grano += deltaE(lab[p], lab[p + 1]);
        pares++;
      }
      if (p + ancho < n2 && etiqueta[p + ancho] === e) {
        grano += deltaE(lab[p], lab[p + ancho]);
        pares++;
      }
    }
    const rugosa = pares > 0 && grano / pares >= RUGOSIDAD_DE_GRANO;
    if (rugosa) rugosos += pixeles.length;
    const L = pixeles.map((p) => lab[p][0]).sort((a, b) => a - b);
    const p5 = L[Math.floor(L.length * 0.05)];
    const bajo = pixeles.find((p) => lab[p][0] <= p5);
    const p95 = L[Math.floor(L.length * 0.95)];
    const alto_ = pixeles.find((p) => lab[p][0] >= p95);
    const rango = deltaE(lab[bajo], lab[alto_]);
    const tonos = rango < 10 ? 0 : rango <= 35 ? 1 : rango <= 60 ? 2 : 3;
    const bandas = Math.max(1, tonos);
    const cortes = Array.from(
      { length: bandas - 1 },
      (_, k) => L[Math.floor(L.length * (k + 1) / bandas)]
    );
    const banda = (p) => cortes.filter((c) => lab[p][0] >= c).length;
    const suma = Array.from({ length: bandas }, () => [0, 0, 0, 0]);
    for (const p of pixeles) {
      const s = suma[banda(p)];
      s[0] += datos[p * 4];
      s[1] += datos[p * 4 + 1];
      s[2] += datos[p * 4 + 2];
      s[3]++;
    }
    const medias = suma.map(
      (s) => [s[0] / s[3], s[1] / s[3], s[2] / s[3]]
    );
    for (const m of medias) {
      const l = aLab(Math.round(m[0]), Math.round(m[1]), Math.round(m[2]));
      if (!colores.some((c) => deltaE(c, l) < 12)) colores.push(l);
    }
    if (!tonos) continue;
    if (rugosa) degradadosRugosos++;
    degradados.push({
      areaMm2: Number((pixeles.length * mmPorPx * mmPorPx).toFixed(2)),
      rango: Number(rango.toFixed(1)),
      tonos
    });
    for (const p of pixeles) {
      const m = medias[banda(p)];
      aplanada[p * 4] = m[0];
      aplanada[p * 4 + 1] = m[1];
      aplanada[p * 4 + 2] = m[2];
    }
  }
  const coberturaCoherente = primerPlano ? coherente / primerPlano : 1;
  const figura = new Uint8Array(n2);
  for (let p = 0; p < n2; p++) figura[p] = datos[p * 4 + 3] >= 128 ? 1 : 0;
  const hondo = distanciaAlFondo2(figura, ancho, alto);
  let enFigura = 0;
  let conCuerpo = 0;
  for (let p = 0; p < n2; p++)
    if (figura[p]) {
      enFigura++;
      if (hondo[p] >= 2) conCuerpo++;
    }
  const cuerpo2 = enFigura ? conCuerpo / enFigura : 0;
  const areaRugosa = primerPlano ? rugosos / primerPlano : 0;
  return {
    coberturaCoherente,
    regiones,
    tintasAplanadas: colores.length,
    degradados,
    /* Foto: poco de su área en regiones coherentes; o GRANO en buena parte
       de su área y, en él, más tintas de las que caben en un bordado o
       muchos degradados. Calibrado con el banco (ver abajo).
       V6.9.0: antes bastaban las cuentas (más de 10 tintas o de 20
       degradados), y un logo complejo las pasa sin ser una foto: el escudo
       de Harvard tiene 50 degradados lisos (sombras de sus laureles), un
       tigre de dibujo 11 tonos, y el chevrón de Discovery, capturado como en
       el navegador, 35 regiones con degradado. Eran fotos y se iban a la ruta
       de píxeles, que se rendía. Lo que no tiene ningún logo es grano. */
    esFoto: cuerpo2 >= CUERPO_MINIMO && coberturaCoherente < UMBRAL_COHERENCIA || areaRugosa >= UMBRAL_AREA_RUGOSA && (colores.length > UMBRAL_TINTAS || degradadosRugosos > UMBRAL_DEGRADADOS),
    cuerpo: cuerpo2,
    areaRugosa,
    aplanada
  };
}
var UMBRAL_COHERENCIA = 0.55;
var CUERPO_MINIMO = 0.2;
var UMBRAL_TINTAS = 10;
var UMBRAL_DEGRADADOS = 20;
var RUGOSIDAD_DE_GRANO = 1;
var UMBRAL_AREA_RUGOSA = 0.35;
var FRACCION_DEL_DISENO = 0.02;

// packages/bordado/src/raster/trazosFinos.ts
var mediana2 = (v2) => {
  if (!v2.length) return 0;
  const o = [...v2].sort((a, b) => a - b);
  return o[o.length >> 1];
};
function distanciaASegmento3(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-12) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(
    0,
    Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)
  );
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
function simplificar3(puntos, tolerancia) {
  if (puntos.length < 3) return puntos;
  const conservar = new Uint8Array(puntos.length);
  conservar[0] = 1;
  conservar[puntos.length - 1] = 1;
  const pila = [[0, puntos.length - 1]];
  while (pila.length) {
    const [a, b] = pila.pop();
    let mayor = 0;
    let indice = -1;
    for (let i = a + 1; i < b; i++) {
      const d = distanciaASegmento3(puntos[i], puntos[a], puntos[b]);
      if (d > mayor) {
        mayor = d;
        indice = i;
      }
    }
    if (indice >= 0 && mayor > tolerancia) {
      conservar[indice] = 1;
      pila.push([a, indice], [indice, b]);
    }
  }
  return puntos.filter((_, i) => conservar[i]);
}
function suavizarPolilinea(puntos, ventana, cerrado) {
  const n2 = puntos.length;
  if (n2 < 4 || ventana < 1) return puntos;
  return puntos.map((p, i) => {
    if (!cerrado && (i === 0 || i === n2 - 1)) return p;
    let sx = 0;
    let sy = 0;
    let c = 0;
    for (let k = -ventana; k <= ventana; k++) {
      let j = i + k;
      if (cerrado) j = (j + n2) % n2;
      else if (j < 0 || j >= n2) continue;
      sx += puntos[j][0];
      sy += puntos[j][1];
      c++;
    }
    return [sx / c, sy / c];
  });
}
function porEtiqueta(etiquetas, cuenta) {
  const listas = Array.from({ length: cuenta + 1 }, () => []);
  for (let p = 0; p < etiquetas.length; p++)
    if (etiquetas[p] > 0) listas[etiquetas[p]].push(p);
  return listas;
}
function recorte(pixeles, ancho, alto, margen) {
  let x0 = ancho;
  let y0 = alto;
  let x1 = 0;
  let y1 = 0;
  for (const p of pixeles) {
    const x = p % ancho;
    const y = (p - x) / ancho;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  x0 = Math.max(0, x0 - margen);
  y0 = Math.max(0, y0 - margen);
  x1 = Math.min(ancho - 1, x1 + margen);
  y1 = Math.min(alto - 1, y1 + margen);
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const mascara = new Uint8Array(w * h);
  for (const p of pixeles) {
    const x = p % ancho;
    mascara[((p - x) / ancho - y0) * w + (x - x0)] = 1;
  }
  return {
    mascara,
    w,
    h,
    /** Del índice del recorte al de la imagen. */
    global: (i) => (y0 + Math.floor(i / w)) * ancho + x0 + i % w,
    x0,
    y0
  };
}
var PRESENCIA_SUAVE = 0.15;
var ANCHO_CAPILAR_PX = 1.6;
var PERDIDA_MINIMA = 0.2;
var HALO_MAXIMO = 0.5;
var PICO_MINIMO = 0.3;
var MOTA_PX = 2;
var LARGO_MINIMO_MM = 0.5;
function separarTrazos(mascara, ancho, alto, opciones) {
  const { mmPorPx } = opciones;
  const n2 = ancho * alto;
  const capilar = opciones.anchoFinoMaximoPx ?? ANCHO_CAPILAR_PX;
  const rt = Math.max(1.5, (opciones.radioTexturaMm ?? 0.35) / mmPorPx);
  const visibles = componentes2(mascara, ancho, alto);
  const pixelesVisibles = porEtiqueta(visibles.etiquetas, visibles.cuenta);
  const trabajo = new Uint8Array(mascara);
  let limpia = null;
  const quitada = new Float64Array(n2 > 0 ? visibles.cuenta + 1 : 1);
  for (let e = 1; e <= visibles.cuenta; e++) {
    if (visibles.tamanos[e] * mmPorPx * mmPorPx < 4) continue;
    const r = recorte(pixelesVisibles[e], ancho, alto, Math.ceil(rt) + 2);
    const lisa = cierre(r.mascara, r.w, r.h, rt);
    const sinDiente = apertura(cierre(r.mascara, r.w, r.h, 1), r.w, r.h, 1);
    const rugosidad = perimetroEnPx(sinDiente, r.w, r.h) / Math.max(1, perimetroEnPx(cierre(sinDiente, r.w, r.h, rt), r.w, r.h));
    if (rugosidad < (opciones.rugosidadTextura ?? 1.25)) continue;
    limpia ??= new Uint8Array(n2);
    let cambio = 0;
    for (let i = 0; i < lisa.length; i++) {
      if (lisa[i] !== r.mascara[i]) cambio++;
      const p = r.global(i);
      if (lisa[i]) {
        trabajo[p] = 1;
        limpia[p] = 1;
      }
    }
    quitada[e] = cambio * mmPorPx * mmPorPx;
  }
  const suave = opciones.suave;
  const fiable = opciones.fiable;
  const presente = new Uint8Array(n2);
  for (let p = 0; p < n2; p++)
    presente[p] = trabajo[p] || suave && suave[p] >= PRESENCIA_SUAVE && (!fiable || fiable[p]) ? 1 : 0;
  const peso = (p) => suave ? !fiable || fiable[p] || trabajo[p] ? Math.min(1, suave[p]) : 0 : trabajo[p];
  const cuerpo2 = apertura(presente, ancho, alto, 1.5);
  const fino = new Uint8Array(n2);
  for (let p = 0; p < n2; p++) if (presente[p] && !cuerpo2[p]) fino[p] = 1;
  const area2 = new Uint8Array(trabajo);
  const trazos = [];
  const campo = suave ? suavizar(suave, ancho, alto) : null;
  const marca = new Int32Array(n2);
  let sello = 0;
  const finas = componentes2(fino, ancho, alto);
  const pixelesFinos = porEtiqueta(finas.etiquetas, finas.cuenta);
  const todos = componentes2(presente, ancho, alto);
  const anchosPorComponente = /* @__PURE__ */ new Map();
  for (let f3 = 1; f3 <= finas.cuenta; f3++) {
    const pixeles = pixelesFinos[f3];
    const r0 = recorte(pixeles, ancho, alto, 2);
    const eje = esqueleto2(r0.mascara, r0.w, r0.h);
    let ramas2 = trazosDeEsqueleto(eje, r0.w, r0.h).map((r) => ({
      ...r,
      indices: r.indices.map(r0.global),
      puntos: r.puntos.map(([x, y]) => [x + r0.x0, y + r0.y0])
    }));
    const extremos2 = /* @__PURE__ */ new Map();
    for (const r of ramas2)
      if (!r.cerrado && r.indices.length > 1)
        for (const e of [r.indices[0], r.indices[r.indices.length - 1]])
          extremos2.set(e, (extremos2.get(e) ?? 0) + 1);
    ramas2 = ramas2.filter((r) => {
      if (r.cerrado || ramas2.length === 1) return true;
      const libre = extremos2.get(r.indices[0]) === 1 || extremos2.get(r.indices[r.indices.length - 1]) === 1;
      return !(libre && r.indices.length < 3);
    });
    const ejes = ramas2.map((r) => ({
      cerrado: r.cerrado,
      puntos: suavizarPolilinea(
        r.puntos.map(
          (q, k) => !r.cerrado && (k === 0 || k === r.puntos.length - 1) ? q : centroide(centroide(q, peso, ancho, alto), peso, ancho, alto)
        ),
        1,
        r.cerrado
      ),
      crudos: r.puntos.length
    }));
    const largo = ejes.reduce(
      (t, e) => t + largoDePuntos(e.puntos, e.cerrado),
      0
    );
    if (!(largo > 0)) continue;
    if (campo) {
      let fuera = 0;
      let total = 0;
      for (const r of ramas2)
        for (const p of r.indices) {
          total++;
          if (campo[p] < 0.5) fuera++;
        }
      if (fuera < PERDIDA_MINIMA * total) continue;
    }
    let pegados = 0;
    for (const p of pixeles) {
      const x = p % ancho;
      let toca = false;
      for (let dy = -ancho; dy <= ancho && !toca; dy += ancho)
        for (let dx = -1; dx <= 1 && !toca; dx++) {
          const q = p + dy + dx;
          toca = q >= 0 && q < n2 && !(dx === -1 && x === 0) && !(dx === 1 && x === ancho - 1) && cuerpo2[q] === 1;
        }
      if (toca) pegados++;
    }
    if (pegados > HALO_MAXIMO * pixeles.length) continue;
    const picos = ramas2.flatMap((r) => r.indices).map((p) => {
      let m = 0;
      const x = p % ancho;
      for (let dy = -ancho; dy <= ancho; dy += ancho)
        for (let dx = -1; dx <= 1; dx++) {
          const q = p + dy + dx;
          if (q < 0 || q >= n2 || dx === -1 && x === 0 || dx === 1 && x === ancho - 1)
            continue;
          m = Math.max(m, peso(q));
        }
      return m;
    });
    if (mediana2(picos) < PICO_MINIMO) continue;
    const cuenta = /* @__PURE__ */ new Map();
    for (const r of ramas2)
      if (!r.cerrado)
        for (const e of [r.indices[0], r.indices[r.indices.length - 1]])
          cuenta.set(e, (cuenta.get(e) ?? 0) + 1);
    const puntas = [...cuenta.values()].filter((v2) => v2 === 1).length;
    sello++;
    let areaSuave = 0;
    for (const p of pixeles) {
      marca[p] = sello;
      areaSuave += peso(p);
    }
    for (const p of pixeles) {
      const x = p % ancho;
      for (let dy = -ancho; dy <= ancho; dy += ancho)
        for (let dx = -1; dx <= 1; dx++) {
          const q = p + dy + dx;
          if (q < 0 || q >= n2 || dx === -1 && x === 0 || dx === 1 && x === ancho - 1 || marca[q] === sello || presente[q])
            continue;
          marca[q] = sello;
          areaSuave += peso(q);
        }
    }
    const a2 = Math.PI / 8 * puntas;
    const w = a2 ? (-largo + Math.sqrt(largo * largo + 4 * a2 * areaSuave)) / (2 * a2) : areaSuave / largo;
    if (w > capilar || largo < 3 * Math.max(w, 1) || /* Y en la tela: una línea de menos de medio milímetro no la dibuja
       ninguna puntada; en una imagen de 1 000 px son 6 px de ruido. */
    largo * mmPorPx < LARGO_MINIMO_MM)
      continue;
    const lados = opciones.visible ? ladosDeLaLinea(ejes, opciones.visible, ancho, alto, w) : null;
    if (lados && lados.iguales < 0.5) continue;
    if (lados && pegados > 0 && lados.enCampo >= 0.5) continue;
    if (pegados > 0 && w * mmPorPx < ANCHO_MINIMO_DETALLE_MM) continue;
    const componente = todos.etiquetas[pixeles[0]];
    const primerTrazo = trazos.length;
    for (const e of ejes)
      trazos.push({
        puntos: e.crudos > 2 ? simplificar3(e.puntos, 0.5) : e.puntos,
        cerrado: e.cerrado,
        anchoPx: Math.max(0.5, w),
        unido: pegados > 0,
        componente
      });
    if (trazos.length === primerTrazo) continue;
    for (const p of pixeles) area2[p] = 0;
    const lista3 = anchosPorComponente.get(componente) ?? [];
    lista3.push(w * mmPorPx);
    anchosPorComponente.set(componente, lista3);
  }
  const areaDe2 = new Int32Array(todos.cuenta + 1);
  for (let p = 0; p < n2; p++)
    if (area2[p] && todos.etiquetas[p] > 0) areaDe2[todos.etiquetas[p]]++;
  const tipoDe = [null];
  const lista2 = [];
  const texturaDe = new Float64Array(todos.cuenta + 1);
  for (let e = 1; e <= visibles.cuenta; e++) {
    const p = pixelesVisibles[e][0];
    if (p !== void 0 && todos.etiquetas[p] > 0)
      texturaDe[todos.etiquetas[p]] += quitada[e];
  }
  for (let e = 1; e <= todos.cuenta; e++) {
    const conTrazo = anchosPorComponente.has(e);
    const conArea = areaDe2[e] >= MOTA_PX;
    if (!conTrazo && !conArea) {
      tipoDe.push(null);
      continue;
    }
    const tipo = conTrazo && conArea ? "MIXED" : conTrazo ? "THIN_STROKE" : "AREA";
    tipoDe.push(tipo);
    lista2.push({
      tipo,
      pixeles: todos.tamanos[e],
      anchoTrazoMm: Number(
        mediana2(anchosPorComponente.get(e) ?? []).toFixed(2)
      ),
      texturaQuitadaMm2: Number(texturaDe[e].toFixed(2))
    });
  }
  return {
    area: area2,
    limpia,
    trazos,
    componentes: lista2,
    etiquetas: todos.etiquetas,
    tipoDe
  };
}
function ladosDeLaLinea(ejes, visible, ancho, alto, w) {
  const d = w / 2 + 1.5;
  const en = (x, y) => {
    const xx = Math.floor(x);
    const yy = Math.floor(y);
    return xx < 0 || yy < 0 || xx >= ancho || yy >= alto ? -1 : visible[yy * ancho + xx];
  };
  let iguales3 = 0;
  let enCampo = 0;
  let total = 0;
  for (const e of ejes) {
    const m = e.puntos.length;
    if (m < 2) continue;
    for (let k = 0; k < m; k++) {
      const a = e.puntos[e.cerrado ? (k - 1 + m) % m : Math.max(0, k - 1)];
      const b = e.puntos[e.cerrado ? (k + 1) % m : Math.min(m - 1, k + 1)];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (!l) continue;
      const nx = -(b[1] - a[1]) / l;
      const ny = (b[0] - a[0]) / l;
      const [x, y] = e.puntos[k];
      total++;
      const uno = en(x + nx * d, y + ny * d);
      if (uno !== en(x - nx * d, y - ny * d)) continue;
      iguales3++;
      if (uno >= 0) enCampo++;
    }
  }
  return total ? { iguales: iguales3 / total, enCampo: enCampo / total } : { iguales: 1, enCampo: 0 };
}
function centroide(q, peso, ancho, alto) {
  let sx = 0;
  let sy = 0;
  let sw = 0;
  const cx = Math.floor(q[0]);
  const cy = Math.floor(q[1]);
  for (let y = cy - 2; y <= cy + 2; y++)
    for (let x = cx - 2; x <= cx + 2; x++) {
      if (x < 0 || y < 0 || x >= ancho || y >= alto) continue;
      const dx = x + 0.5 - q[0];
      const dy = y + 0.5 - q[1];
      if (dx * dx + dy * dy > 4) continue;
      const w = peso(y * ancho + x);
      sx += w * (x + 0.5);
      sy += w * (y + 0.5);
      sw += w;
    }
  return sw > 0 ? [sx / sw, sy / sw] : q;
}
function largoDePuntos(puntos, cerrado) {
  let l = 0;
  for (let k = 1; k < puntos.length; k++)
    l += Math.hypot(
      puntos[k][0] - puntos[k - 1][0],
      puntos[k][1] - puntos[k - 1][1]
    );
  if (cerrado && puntos.length > 2)
    l += Math.hypot(
      puntos[0][0] - puntos[puntos.length - 1][0],
      puntos[0][1] - puntos[puntos.length - 1][1]
    );
  return l;
}

// packages/bordado/src/raster/validar.ts
function pintar(poligonos, ancho, alto, marcar) {
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const a of poligonos)
    for (const q of a) {
      minY = Math.min(minY, q.y);
      maxY = Math.max(maxY, q.y);
    }
  const cruces = [];
  for (let fila = Math.max(0, Math.floor(minY)); fila <= Math.min(alto - 1, Math.ceil(maxY)); fila++) {
    const y = fila + 0.5;
    cruces.length = 0;
    for (const a of poligonos)
      for (let i = 0; i < a.length; i++) {
        const p = a[i];
        const q = a[(i + 1) % a.length];
        if (p.y <= y && q.y > y || q.y <= y && p.y > y)
          cruces.push([
            p.x + (y - p.y) * (q.x - p.x) / (q.y - p.y),
            q.y > p.y ? 1 : -1
          ]);
      }
    cruces.sort((u4, v2) => u4[0] - v2[0]);
    let devanado = 0;
    for (let k = 0; k < cruces.length - 1; k++) {
      devanado += cruces[k][1];
      if (!devanado) continue;
      const desde = Math.max(0, Math.ceil(cruces[k][0] - 0.5));
      const hasta = Math.min(ancho - 1, Math.floor(cruces[k + 1][0] - 0.5));
      for (let x = desde; x <= hasta; x++) marcar(fila * ancho + x);
    }
  }
}
var rgb2 = (h) => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
function validarVectorizacion(svg, fuente, tintas, ancho, alto, mmPorPx) {
  const salida2 = new Int16Array(ancho * alto).fill(-1);
  const { capas } = leerSvg(svg, {
    destino: { x: 0, y: 0, ancho, alto },
    anchoMinimoTrazoMm: 0.5,
    toleranciaMm: 0.05
  });
  for (const capa of capas) {
    const indice = tintas.indexOf(capa.color);
    if (indice < 0) continue;
    pintar(capa.poligonos, ancho, alto, (p) => {
      salida2[p] = indice;
    });
  }
  const px2 = mmPorPx * mmPorPx;
  const porColor = tintas.map((hex2, j) => {
    let inter = 0;
    let union2 = 0;
    let falta2 = 0;
    let sobra = 0;
    const propia = new Float32Array(fuente.length);
    for (let p = 0; p < fuente.length; p++) {
      const a = fuente[p] === j;
      const b = salida2[p] === j;
      if (a) propia[p] = 1;
      if (a && b) inter++;
      if (a || b) union2++;
      if (a && !b) falta2++;
      if (b && !a) sobra++;
    }
    const borde = curvasDeNivel(propia, ancho, alto).reduce((t, anillo) => {
      let l = 0;
      for (let k = 0; k < anillo.length; k++) {
        const q = anillo[(k + 1) % anillo.length];
        l += Math.hypot(q[0] - anillo[k][0], q[1] - anillo[k][1]);
      }
      return t + l;
    }, 0);
    return {
      hex: hex2,
      iou: union2 ? inter / union2 : 1,
      faltaMm2: Number((falta2 * px2).toFixed(2)),
      sobraMm2: Number((sobra * px2).toFixed(2)),
      errorBordeMm: Number(
        (borde ? (falta2 + sobra) / borde * mmPorPx : 0).toFixed(3)
      )
    };
  });
  let igual = 0;
  let cualquiera = 0;
  let perdida = 0;
  const rasterizada = new Uint8ClampedArray(ancho * alto * 4);
  for (let p = 0; p < fuente.length; p++) {
    if (fuente[p] >= 0 || salida2[p] >= 0) cualquiera++;
    if (fuente[p] >= 0 && fuente[p] === salida2[p]) igual++;
    if (fuente[p] >= 0 && salida2[p] < 0) perdida++;
    if (salida2[p] >= 0) {
      const c = rgb2(tintas[salida2[p]]);
      rasterizada.set([c[0], c[1], c[2], 255], p * 4);
    }
  }
  const falta = new Uint8Array(fuente.length);
  for (let p = 0; p < fuente.length; p++)
    if (fuente[p] >= 0 && salida2[p] < 0) falta[p] = 1;
  const grosor = distanciaAlFondo2(falta, ancho, alto);
  const manchas = componentes2(falta, ancho, alto);
  const grueso = new Float32Array(manchas.cuenta + 1);
  for (let p = 0; p < falta.length; p++) {
    const e = manchas.etiquetas[p];
    if (e > 0 && grosor[p] > grueso[e]) grueso[e] = grosor[p];
  }
  let rasgos = 0;
  let rasgosPx = 0;
  for (let e = 1; e <= manchas.cuenta; e++)
    if (grueso[e] >= 1.5 && manchas.tamanos[e] * px2 >= 0.3) {
      rasgos++;
      rasgosPx += manchas.tamanos[e];
    }
  return {
    porColor,
    similitud: cualquiera ? igual / cualquiera : 1,
    perdidaMm2: Number((perdida * px2).toFixed(2)),
    rasgosPerdidosMm2: Number((rasgosPx * px2).toFixed(2)),
    rasgosPerdidos: rasgos,
    rasterizada
  };
}

// packages/bordado/src/raster/vectorizar.ts
var TOPE_ALFA_SUAVE_MM2 = 4;
var TOPE_FONDO_ENCERRADO = 0.05;
var PURO_RGB2 = 8 ** 2;
var RUIDO_PX2 = 2;
var hex = ([r, g, b]) => `#${[r, g, b].map((v2) => Math.round(v2).toString(16).padStart(2, "0")).join("")}`;
function vectorizarRaster(entrada2, origen) {
  const desde = performance.now();
  const { ancho, alto } = entrada2;
  const n2 = ancho * alto;
  const avisos = [];
  const datos = new Uint8ClampedArray(entrada2.datos);
  const fondo = origen ? { tipo: "alpha" } : diagnosticarFondo(datos, ancho, alto);
  let backgroundSource = origen ?? "none";
  let colorDeFondo = null;
  if (fondo.tipo === "alpha") backgroundSource = origen ?? "alpha";
  else if (fondo.tipo === "detected") {
    colorDeFondo = fondo.color;
    backgroundSource = "detected";
  } else
    avisos.push({
      code: "RASTER_FONDO_COMPLEJO",
      message: "La imagen tiene un fondo que no es liso ni transparente y no se quit\xF3; se bordar\xEDa con el fondo. Quita el fondo antes de bordarla.",
      severity: "review"
    });
  if (colorDeFondo) {
    for (let p = 0; p < n2; p++) {
      const i = p * 4;
      const d = deltaE(
        aLab(datos[i], datos[i + 1], datos[i + 2]),
        colorDeFondo.lab
      );
      if (d < FONDO_DELTA_E) datos[i + 3] = 0;
    }
  }
  const fondoEncerradoPx = colorDeFondo ? fondoEncerrado(datos, entrada2.datos, ancho, alto) : 0;
  const grafico = analizarGrafico(datos, ancho, alto, entrada2.mmPorPx);
  const aplanada = grafico.aplanada;
  const pequena = reducir(aplanada, ancho, alto, 400);
  const tonos = analizarTonos(pequena.datos, pequena.ancho, pequena.alto);
  const maximo = entrada2.maximoColores ?? 8;
  const paleta = paletaDe(aplanada, ancho, alto, {
    maximo,
    juntarDeltaE: entrada2.juntarDeltaE ?? 12,
    fondo: colorDeFondo?.rgb
  });
  const toneP90 = percentilDeTono(
    reducir(aplanada, ancho, alto, 100),
    paleta.tintas.map((t) => t.lab)
  );
  const softAlphaMm2 = alfaSuave(entrada2.datos, ancho, alto, entrada2.mmPorPx);
  const ruido = tonos.interior < 0.25 && paleta.errorDeltaE > 8 && /* Un dibujo de líneas finas también "no tiene interior" y su antialias
     queda lejos de las tintas; pero no tiene cuerpo, y el ruido sí. */
  grafico.cuerpo >= CUERPO_MINIMO;
  const metricasGrafico = {
    bodyRatio: Number(grafico.cuerpo.toFixed(3)),
    coherentCoverage: Number(grafico.coberturaCoherente.toFixed(3)),
    coherentRegions: grafico.regiones,
    flattenedColors: grafico.tintasAplanadas,
    gradientRegions: grafico.degradados.length
  };
  if (grafico.esFoto || ruido) {
    avisos.push({
      code: "RASTER_NO_APTO_PARA_VECTORIZACION",
      message: "La imagen parece una fotograf\xEDa o arte de tono continuo; no se puede pasar a tintas planas sin cambiarla.",
      severity: "review",
      metrics: metricasGrafico
    });
    return {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}"/>`,
      backgroundSource,
      tintas: [],
      metricas: {
        ...metricasVacias(),
        originalEstimatedColors: paleta.coloresEstimados,
        colorsNeeded: paleta.coloresNecesarios,
        deltaEError: Number(paleta.errorDeltaE.toFixed(2)),
        toneDispersion: Number(tonos.dispersion.toFixed(3)),
        toneP90: Number(toneP90.toFixed(2)),
        softAlphaMm2: Number(softAlphaMm2.toFixed(2)),
        ...metricasGrafico,
        ms: Math.round(performance.now() - desde)
      },
      avisos,
      depuracion: depuracionVacia(datos, n2),
      componentes: [],
      degradados: [],
      validacion: null,
      omitido: true
    };
  }
  if (grafico.degradados.length)
    avisos.push({
      code: "GRADIENT_FLATTENED",
      message: `${grafico.degradados.length} degradado${grafico.degradados.length === 1 ? "" : "s"} se ${grafico.degradados.length === 1 ? "cose" : "cosen"} con su tono medio (o en 2\u20133 bandas si recorren mucho): el hilo es de un solo color.`,
      severity: "info",
      metrics: {
        gradients: grafico.degradados.length,
        areaMm2: Number(
          grafico.degradados.reduce((t, d) => t + d.areaMm2, 0).toFixed(2)
        ),
        maxRangeDeltaE: Math.max(...grafico.degradados.map((d) => d.rango))
      }
    });
  const primerPlanoPx = datos.reduce(
    (t, v2, i) => i % 4 === 3 && v2 >= 128 ? t + 1 : t,
    0
  );
  const encerrado = fondoEncerradoPx / Math.max(1, primerPlanoPx);
  if (encerrado > TOPE_FONDO_ENCERRADO)
    avisos.push({
      code: "RASTER_FONDO_DENTRO_DEL_LOGO",
      message: "Hay zonas del color del fondo dentro del logo; se dejaron sin bordar (se ver\xE1 la tela). Si deben ir en hilo, sube la imagen con fondo transparente.",
      severity: "review",
      metrics: {
        areaMm2: Number((fondoEncerradoPx * entrada2.mmPorPx ** 2).toFixed(2)),
        ratio: Number(encerrado.toFixed(3))
      }
    });
  if (softAlphaMm2 > TOPE_ALFA_SUAVE_MM2)
    avisos.push({
      code: "RASTER_TRANSPARENCIA_SUAVE",
      message: "La imagen tiene zonas semitransparentes (una sombra, un brillo); el hilo es opaco y se omitieron.",
      severity: "review",
      metrics: { softAlphaMm2: Number(softAlphaMm2.toFixed(2)) }
    });
  if (paleta.coloresNecesarios > maximo)
    avisos.push({
      code: "RASTER_DEMASIADOS_COLORES",
      message: `La imagen necesita ${paleta.coloresNecesarios} tintas y el bordado admite ${maximo}; se quedaron las ${maximo} m\xE1s usadas.`,
      severity: "review",
      metrics: { colorsNeeded: paleta.coloresNecesarios, maxColors: maximo }
    });
  const tintas = paleta.tintas;
  const k = tintas.length;
  const blanco = aLab(255, 255, 255);
  const descarte = colorDeFondo ? colorDeFondo.rgb : tintas.some((t) => deltaE(t.lab, blanco) < 12) ? null : [255, 255, 255];
  const candidatas = [
    ...tintas.map((t) => t.rgb),
    ...descarte ? [descarte] : []
  ];
  const canto = colorDeFondo ? null : cantoTransparente(datos, ancho, alto);
  const pertenencia = tintas.map(() => new Float32Array(n2));
  const reducida = new Uint8ClampedArray(n2 * 4);
  const primerPlano = new Uint8ClampedArray(datos);
  const visible = new Int16Array(n2).fill(-1);
  const fiable = new Uint8Array(n2);
  const origenDelColor = colorDeFondo ? null : colorDelCanto(datos, ancho, alto);
  for (let p = 0; p < n2 && k; p++) {
    const i = p * 4;
    const a = (colorDeFondo ? entrada2.datos[i + 3] : datos[i + 3]) / 255;
    if (a <= 0) continue;
    const kc = canto && !canto[p] ? k : candidatas.length;
    const o = (origenDelColor ? origenDelColor[p] : p) * 4;
    const c = [aplanada[o], aplanada[o + 1], aplanada[o + 2]];
    let d1 = Number.POSITIVE_INFINITY;
    let j1 = 0;
    for (let j = 0; j < kc; j++) {
      const q = candidatas[j];
      const d = (c[0] - q[0]) ** 2 + (c[1] - q[1]) ** 2 + (c[2] - q[2]) ** 2;
      if (d < d1) {
        d1 = d;
        j1 = j;
      }
    }
    let j2 = j1;
    let t = 1;
    let residuo = d1;
    if (kc > 1) {
      let mejor = Number.POSITIVE_INFINITY;
      for (let j = 0; j < kc; j++) {
        if (j === j1) continue;
        const [tt, r] = mezcla(c, candidatas[j1], candidatas[j]);
        if (r < mejor) {
          mejor = r;
          j2 = j;
          t = tt;
        }
      }
      if (d1 > PURO_RGB2)
        for (let a1 = 0; a1 < kc; a1++)
          for (let b1 = a1 + 1; b1 < kc; b1++) {
            if (a1 === j1 || b1 === j1) continue;
            const [tt, r] = mezcla(c, candidatas[a1], candidatas[b1]);
            if (r < 0.25 * mejor && r < RESIDUO_MEZCLA_RGB2 && tt > 0.1 && tt < 0.9) {
              mejor = r;
              j1 = a1;
              j2 = b1;
              t = tt;
            }
          }
      residuo = Math.min(mejor, d1);
    }
    if (residuo < RESIDUO_MEZCLA_RGB2) fiable[p] = 1;
    if (j1 < k) pertenencia[j1][p] += a * t;
    if (kc > 1 && j2 < k) pertenencia[j2][p] += a * (1 - t);
    const gana = t >= 0.5 ? j1 : j2;
    if (gana >= k || a < 0.5) continue;
    visible[p] = gana;
    const final = candidatas[gana];
    reducida[i] = final[0];
    reducida[i + 1] = final[1];
    reducida[i + 2] = final[2];
    reducida[i + 3] = 255;
  }
  const separaciones = tintas.map((_, j) => {
    const mascara = new Uint8Array(n2);
    for (let p = 0; p < n2; p++) if (visible[p] === j) mascara[p] = 1;
    return separarTrazos(mascara, ancho, alto, {
      mmPorPx: entrada2.mmPorPx,
      anchoFinoMaximoPx: entrada2.anchoFinoMaximoPx,
      suave: pertenencia[j],
      fiable,
      visible
    });
  });
  const nombrarComponente = unicos();
  const idsDeComponente = separaciones.map((sep, j) => {
    const primero = /* @__PURE__ */ new Map();
    const tamano = /* @__PURE__ */ new Map();
    for (let p = 0; p < n2; p++) {
      const e = sep.etiquetas[p];
      if (e <= 0) continue;
      if (!primero.has(e)) primero.set(e, p);
      tamano.set(e, (tamano.get(e) ?? 0) + 1);
    }
    const ids = /* @__PURE__ */ new Map();
    for (const [e, p] of [...primero].sort((a, b) => a[1] - b[1]))
      ids.set(
        e,
        nombrarComponente(`rc-${huellaEstable(`${hex(tintas[j].rgb)}|${p}|${tamano.get(e)}`)}`)
      );
    return { ids, tamano };
  });
  const idDe = (tinta, etiqueta) => idsDeComponente[tinta]?.ids.get(etiqueta);
  const componentesInforme = [];
  let texturaMm2 = 0;
  separaciones.forEach((sep, j) => {
    for (const c of sep.componentes) {
      componentesInforme.push({
        ...c,
        color: hex(tintas[j].rgb),
        areaMm2: Number((c.pixeles * entrada2.mmPorPx ** 2).toFixed(2))
      });
      texturaMm2 += c.texturaQuitadaMm2;
    }
  });
  const texturadas = componentesInforme.filter((c) => c.texturaQuitadaMm2 > 0);
  if (texturadas.length) {
    const areaTexturada = texturadas.reduce((t, c) => t + c.areaMm2, 0);
    const mucho = texturaMm2 > 0.15 * areaTexturada;
    avisos.push({
      code: mucho ? "TEXTURE_SIMPLIFICATION_HIGH" : "TEXTURE_SIMPLIFIED",
      message: mucho ? "La textura de la imagen se limpi\xF3, pero la forma cambi\xF3 bastante; rev\xEDsala antes de bordar." : "Se limpi\xF3 la textura de pincel del contorno: el bordado cose la forma limpia, no cada mordisco.",
      severity: mucho ? "review" : "info",
      metrics: {
        components: texturadas.length,
        changedAreaMm2: Number(texturaMm2.toFixed(2)),
        componentAreaMm2: Number(areaTexturada.toFixed(2))
      }
    });
  }
  const areas = pertenencia.map((m) => m.reduce((s, v2) => s + v2, 0));
  const orden = [...tintas.keys()].sort((a, b) => areas[b] - areas[a]);
  const construir2 = (factorTolerancia) => {
    const caminos = [];
    const trazos = [];
    const anillosDe = [];
    const nuevaEtiqueta = (ids) => {
      anillosDe.push([...new Set(ids)].sort());
      return anillosDe.length;
    };
    const bajoRuido = /* @__PURE__ */ new Set();
    const atributo2 = (etiquetas) => etiquetas.length ? ` data-linaje="${etiquetas.join(" ")}"` : "";
    let nodos = 0;
    let anillosTotales = 0;
    let rematesTotales = 0;
    const f22 = (v2) => Number(v2.toFixed(2));
    for (let r = 0; r < orden.length; r++) {
      const propia = orden[r];
      const sep = separaciones[propia];
      const areaAncha = dilatar(sep.area, ancho, alto);
      const apilado = new Float32Array(n2);
      const m = pertenencia[propia];
      for (let p = 0; p < n2; p++) {
        if (areaAncha[p]) apilado[p] = sep.limpia?.[p] ? 1 : m[p];
      }
      for (let s = r + 1; s < orden.length; s++) {
        const otra = pertenencia[orden[s]];
        for (let p = 0; p < n2; p++) apilado[p] += otra[p];
      }
      for (let p = 0; p < n2; p++) if (apilado[p] > 1) apilado[p] = 1;
      const campo = suavizar(apilado, ancho, alto);
      const interiores3 = [];
      const todosLosAnillos = curvasDeNivel(campo, ancho, alto, 0.5, interiores3);
      const crudos = todosLosAnillos.filter(
        (a) => Math.abs(areaDeAnillo(a)) >= RUIDO_PX2
      );
      const nivel = componentesDeNivel(campo, ancho, alto);
      const origenDe = /* @__PURE__ */ new Map();
      const sepPropia = separaciones[propia];
      for (let p = 0; p < n2; p++) {
        const e = nivel[p];
        if (!e) continue;
        let ids = origenDe.get(e);
        if (!ids) {
          ids = /* @__PURE__ */ new Set();
          origenDe.set(e, ids);
        }
        const suya = sepPropia.etiquetas[p];
        if (suya > 0 && areaAncha[p] && (sepPropia.limpia?.[p] || m[p] > 0)) {
          const id = idDe(propia, suya);
          if (id) ids.add(id);
        }
        for (let s2 = r + 1; s2 < orden.length; s2++) {
          const otraTinta = orden[s2];
          const suyaOtra = separaciones[otraTinta].etiquetas[p];
          if (suyaOtra > 0 && pertenencia[otraTinta][p] > 0) {
            const id = idDe(otraTinta, suyaOtra);
            if (id) ids.add(id);
          }
        }
      }
      const etiquetaDeNivel = /* @__PURE__ */ new Map();
      const etiquetasDeAnillo = [];
      const conservados = /* @__PURE__ */ new Set();
      todosLosAnillos.forEach((a, k2) => {
        const e = nivel[interiores3[k2]];
        if (Math.abs(areaDeAnillo(a)) < RUIDO_PX2) return;
        conservados.add(e);
        let et = etiquetaDeNivel.get(e);
        if (et === void 0) {
          et = nuevaEtiqueta(origenDe.get(e) ?? []);
          etiquetaDeNivel.set(e, et);
        }
        etiquetasDeAnillo.push(et);
      });
      todosLosAnillos.forEach((_a, k2) => {
        const e = nivel[interiores3[k2]];
        if (!conservados.has(e)) for (const id of origenDe.get(e) ?? []) bajoRuido.add(id);
      });
      const grosores = grosorDeAnillos(crudos);
      const anillos = crudos.map(
        (a, i) => simplificarAnillo(
          a,
          Math.max(
            0.2,
            Math.min(0.02 / entrada2.mmPorPx, 0.03 * grosores[i]) * factorTolerancia
          )
        )
      );
      if (!anillos.length) continue;
      nodos += anillos.reduce((t, a) => t + a.length, 0);
      anillosTotales += anillos.length;
      const d = anillos.map(
        (a) => `M${a.map(([x, y]) => `${f22(x)} ${f22(y)}`).join("L")}Z`
      ).join("");
      caminos.push(
        `<path fill="${hex(tintas[propia].rgb)}" fill-rule="evenodd" d="${d}"${atributo2(etiquetasDeAnillo)}/>`
      );
      const remates = sep.trazos.filter((t) => t.unido && t.puntos.length > 1);
      if (remates.length) {
        rematesTotales += remates.length;
        const conEtiqueta = remates.flatMap((t) => {
          const et = nuevaEtiqueta([idDe(propia, t.componente)].filter((x) => !!x));
          return inflatePathsD(
            [t.puntos.map(([x, y]) => ({ x, y }))],
            t.anchoPx / 2,
            JoinType.Round,
            t.cerrado ? EndType.Joined : EndType.Round,
            2,
            2,
            0.05
          ).map((q) => ({ q, et }));
        });
        const piezas = conEtiqueta.map((x) => x.q);
        const validas = conEtiqueta.filter((x) => x.q.length >= 3);
        const dr = validas.map(({ q }) => `M${q.map((v2) => `${f22(v2.x)} ${f22(v2.y)}`).join("L")}Z`).join("");
        if (dr) {
          nodos += piezas.reduce((t, q) => t + q.length, 0);
          caminos.push(
            `<path fill="${hex(tintas[propia].rgb)}" d="${dr}"${atributo2(validas.map((x) => x.et))}/>`
          );
        }
      }
    }
    for (const j of orden)
      for (const t of separaciones[j].trazos) {
        if (t.unido && t.puntos.length > 1) continue;
        const d = t.puntos.length === 1 ? `M${f22(t.puntos[0][0])} ${f22(t.puntos[0][1])}h0.01` : `M${t.puntos.map(([x, y]) => `${f22(x)} ${f22(y)}`).join("L")}${t.cerrado ? "Z" : ""}`;
        nodos += t.puntos.length;
        const et = nuevaEtiqueta([idDe(j, t.componente)].filter((x) => !!x));
        trazos.push(
          `<path fill="none" stroke="${hex(tintas[j].rgb)}" stroke-width="${f22(t.anchoPx)}" stroke-linecap="round" stroke-linejoin="miter" stroke-miterlimit="4" d="${d}"${atributo2([et])}/>`
        );
      }
    return {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">${caminos.join("")}${trazos.join("")}</svg>`,
      nodos,
      anillos: anillosTotales,
      trazos: trazos.length + rematesTotales,
      anillosDe,
      bajoRuido
    };
  };
  const hexes = tintas.map((t) => hex(t.rgb));
  const errorDeBorde = (v2) => {
    const t = v2.porColor.reduce((s2, _, j) => s2 + areas[j], 0) || 1;
    return v2.porColor.reduce((s2, c, j) => s2 + c.errorBordeMm * areas[j], 0) / t;
  };
  const evaluar = (v2) => v2.rasgosPerdidosMm2 > 1 || errorDeBorde(v2) > 0.1;
  let hecho = construir2(1);
  let validacion = validarVectorizacion(
    hecho.svg,
    visible,
    hexes,
    ancho,
    alto,
    entrada2.mmPorPx
  );
  if (evaluar(validacion)) {
    const otra = construir2(0.4);
    const v2 = validarVectorizacion(
      otra.svg,
      visible,
      hexes,
      ancho,
      alto,
      entrada2.mmPorPx
    );
    if (v2.similitud > validacion.similitud) {
      hecho = otra;
      validacion = v2;
    }
    if (evaluar(validacion))
      avisos.push({
        code: "VECTOR_LOSS_TOO_HIGH",
        message: "Al pasar la imagen a vector se pierde demasiada forma; revisa el resultado antes de bordar.",
        severity: "review",
        metrics: {
          lostFeatures: validacion.rasgosPerdidos,
          lostFeatureAreaMm2: validacion.rasgosPerdidosMm2,
          boundaryErrorMm: Number(errorDeBorde(validacion).toFixed(3)),
          sourceSimilarity: Number(validacion.similitud.toFixed(3)),
          worstIoU: Number(
            Math.min(...validacion.porColor.map((c) => c.iou)).toFixed(3)
          )
        }
      });
  }
  const pesos = validacion.porColor.map((_, j) => areas[j]);
  const total = pesos.reduce((t, v2) => t + v2, 0) || 1;
  const llegan = new Set(hecho.anillosDe.flat());
  const linaje = {
    componentes: separaciones.flatMap(
      (sep, j) => [...idsDeComponente[j].ids].map(([e, id]) => {
        const tipo = sep.tipoDe[e] ?? null;
        const baja = llegan.has(id) ? void 0 : tipo === null ? "halo de antialias: no es una pieza del dise\xF1o" : hecho.bajoRuido.has(id) ? "su contorno es m\xE1s peque\xF1o que el ruido de la imagen" : "la curva de nivel 0.5 del campo suavizado no lo encierra";
        return {
          id,
          tinta: hex(tintas[j].rgb),
          pixeles: idsDeComponente[j].tamano.get(e) ?? 0,
          tipo,
          ...baja ? { baja } : {}
        };
      })
    ),
    anillos: hecho.anillosDe,
    etiquetas: separaciones.map((sep) => sep.etiquetas),
    idDe
  };
  return {
    svg: hecho.svg,
    linaje,
    backgroundSource,
    tintas: orden.map((j) => ({
      hex: hexes[j],
      areaPx: Math.round(areas[j])
    })),
    metricas: {
      originalEstimatedColors: paleta.coloresEstimados,
      reducedColors: k,
      colorsNeeded: paleta.coloresNecesarios,
      deltaEError: Number(paleta.errorDeltaE.toFixed(2)),
      toneDispersion: Number(tonos.dispersion.toFixed(3)),
      toneP90: Number(toneP90.toFixed(2)),
      softAlphaMm2: Number(softAlphaMm2.toFixed(2)),
      enclosedBackgroundRatio: Number(encerrado.toFixed(3)),
      ...metricasGrafico,
      nodes: hecho.nodos,
      rings: hecho.anillos,
      strokes: hecho.trazos,
      sourceSimilarity: Number(validacion.similitud.toFixed(4)),
      vectorizationIoU: Number(
        (validacion.porColor.reduce((t, c, j) => t + c.iou * pesos[j], 0) / total).toFixed(4)
      ),
      boundaryErrorMm: Number(
        (validacion.porColor.reduce(
          (t, c, j) => t + c.errorBordeMm * pesos[j],
          0
        ) / total).toFixed(3)
      ),
      missingAreaMm2: Number(
        validacion.porColor.reduce((t, c) => t + c.faltaMm2, 0).toFixed(2)
      ),
      extraAreaMm2: Number(
        validacion.porColor.reduce((t, c) => t + c.sobraMm2, 0).toFixed(2)
      ),
      lostFeatureAreaMm2: validacion.rasgosPerdidosMm2,
      simplifiedFeatureAreaMm2: Number(texturaMm2.toFixed(2)),
      ms: Math.round(performance.now() - desde)
    },
    avisos,
    depuracion: {
      primerPlano,
      reducida,
      componentes: pintarComponentes(separaciones, ancho, alto, false),
      tipos: pintarComponentes(separaciones, ancho, alto, true),
      rasterizada: validacion.rasterizada
    },
    componentes: componentesInforme,
    degradados: grafico.degradados,
    validacion,
    omitido: false
  };
}
function cantoTransparente(datos, ancho, alto) {
  const canto = new Uint8Array(ancho * alto);
  for (let y = 0; y < alto; y++)
    for (let x = 0; x < ancho; x++) {
      let hay = false;
      for (let dy = -2; dy <= 2 && !hay; dy++)
        for (let dx = -2; dx <= 2 && !hay; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          hay = xx >= 0 && yy >= 0 && xx < ancho && yy < alto && datos[(yy * ancho + xx) * 4 + 3] < 128;
        }
      if (hay) canto[y * ancho + x] = 1;
    }
  return canto;
}
function colorDelCanto(datos, ancho, alto) {
  const n2 = ancho * alto;
  const origen = new Int32Array(n2);
  for (let p = 0; p < n2; p++) {
    origen[p] = p;
    const a0 = datos[p * 4 + 3];
    if (a0 <= 12 || a0 >= 250) continue;
    let actual = p;
    for (let paso = 0; paso < 3; paso++) {
      const x = actual % ancho;
      const y = (actual - x) / ancho;
      let mejor = actual;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= ancho || yy >= alto) continue;
          const q = yy * ancho + xx;
          if (datos[q * 4 + 3] > datos[mejor * 4 + 3]) mejor = q;
        }
      if (mejor === actual) break;
      actual = mejor;
      if (datos[actual * 4 + 3] >= 250) break;
    }
    origen[p] = actual;
  }
  return origen;
}
function dilatar(m, ancho, alto) {
  const salida2 = new Uint8Array(m);
  for (let y = 0; y < alto; y++)
    for (let x = 0; x < ancho; x++) {
      if (!m[y * ancho + x]) continue;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < ancho && yy < alto)
            salida2[yy * ancho + xx] = 1;
        }
    }
  return salida2;
}
var COLOR_DE_TIPO = {
  AREA: [47, 111, 223],
  THIN_STROKE: [46, 160, 67],
  MIXED: [224, 138, 0]
};
function pintarComponentes(separaciones, ancho, alto, porTipo) {
  const salida2 = new Uint8ClampedArray(ancho * alto * 4);
  let semilla = 0;
  for (const sep of separaciones) {
    const colores = sep.tipoDe.map((tipo, e) => {
      if (!tipo) return null;
      if (porTipo) return COLOR_DE_TIPO[tipo];
      semilla = (semilla * 9301 + 49297 + e) % 233280;
      return [
        60 + semilla % 180,
        60 + (semilla >> 3) % 180,
        60 + (semilla >> 6) % 180
      ];
    });
    for (let p = 0; p < sep.etiquetas.length; p++) {
      const e = sep.etiquetas[p];
      if (e <= 0) continue;
      const c = colores[e];
      if (c) salida2.set([c[0], c[1], c[2], 255], p * 4);
    }
  }
  return salida2;
}
function metricasVacias() {
  return {
    originalEstimatedColors: 0,
    reducedColors: 0,
    colorsNeeded: 0,
    deltaEError: 0,
    toneDispersion: 0,
    toneP90: 0,
    softAlphaMm2: 0,
    enclosedBackgroundRatio: 0,
    coherentCoverage: 0,
    coherentRegions: 0,
    flattenedColors: 0,
    gradientRegions: 0,
    nodes: 0,
    rings: 0,
    strokes: 0,
    sourceSimilarity: 0,
    vectorizationIoU: 0,
    bodyRatio: 0,
    missingAreaMm2: 0,
    extraAreaMm2: 0,
    boundaryErrorMm: 0,
    lostFeatureAreaMm2: 0,
    simplifiedFeatureAreaMm2: 0,
    ms: 0
  };
}
function depuracionVacia(datos, n2) {
  const vacia = new Uint8ClampedArray(n2 * 4);
  return {
    primerPlano: datos,
    reducida: vacia,
    componentes: vacia,
    tipos: vacia,
    rasterizada: vacia
  };
}
function percentilDeTono(img, tintas) {
  if (!tintas.length) return 0;
  const { datos, ancho, alto } = img;
  const valores = [];
  for (let y = 1; y < alto - 1; y++)
    for (let x = 1; x < ancho - 1; x++) {
      const p = y * ancho + x;
      if (datos[p * 4 + 3] < 250) continue;
      const lab = aLab(datos[p * 4], datos[p * 4 + 1], datos[p * 4 + 2]);
      let borde = false;
      for (const q of [p - 1, p + 1, p - ancho, p + ancho]) {
        const o = q * 4;
        if (datos[o + 3] < 250 || deltaE(lab, aLab(datos[o], datos[o + 1], datos[o + 2])) >= 10) {
          borde = true;
          break;
        }
      }
      if (borde) continue;
      let d = Number.POSITIVE_INFINITY;
      for (const t of tintas) d = Math.min(d, deltaE(lab, t));
      valores.push(d);
    }
  if (!valores.length) return 0;
  valores.sort((a, b) => a - b);
  return valores[Math.floor(valores.length * 0.9)];
}
function alfaSuave(datos, ancho, alto, mmPorPx) {
  const opaco = new Uint8Array(ancho * alto);
  for (let p = 0; p < opaco.length; p++)
    opaco[p] = datos[p * 4 + 3] >= 243 ? 1 : 0;
  const lejos = distancia2(opaco, ancho, alto);
  const semi = new Uint8Array(ancho * alto);
  for (let p = 0; p < semi.length; p++) {
    const a = datos[p * 4 + 3];
    semi[p] = a > 12 && a < 243 ? 1 : 0;
  }
  const grueso = distanciaAlFondo2(semi, ancho, alto);
  const minimo = 0.25 / mmPorPx;
  let cuenta = 0;
  for (let p = 0; p < opaco.length; p++)
    if (semi[p] && grueso[p] >= 2 && lejos[p] > minimo) cuenta++;
  return cuenta * mmPorPx * mmPorPx;
}
function fondoEncerrado(datos, original, ancho, alto) {
  const esFondo = (p) => datos[p * 4 + 3] === 0 && original[p * 4 + 3] >= 128;
  const alcanzado = new Uint8Array(ancho * alto);
  const pila = [];
  const sembrar = (p) => {
    if (!alcanzado[p] && (esFondo(p) || original[p * 4 + 3] < 128)) {
      alcanzado[p] = 1;
      pila.push(p);
    }
  };
  for (let x = 0; x < ancho; x++) {
    sembrar(x);
    sembrar((alto - 1) * ancho + x);
  }
  for (let y = 0; y < alto; y++) {
    sembrar(y * ancho);
    sembrar(y * ancho + ancho - 1);
  }
  while (pila.length) {
    const p = pila.pop();
    const x = p % ancho;
    if (x > 0) sembrar(p - 1);
    if (x < ancho - 1) sembrar(p + 1);
    if (p >= ancho) sembrar(p - ancho);
    if (p < (alto - 1) * ancho) sembrar(p + ancho);
  }
  let encerrados = 0;
  for (let p = 0; p < ancho * alto; p++)
    if (esFondo(p) && !alcanzado[p]) encerrados++;
  return encerrados;
}

// packages/bordado/src/raster/objetos.ts
var EVIDENCIA_DELTA_E = 12;
var AMBIGUO_DELTA_E = 5;
function evidenciaDeColor(entrada2, raster, hiloDe) {
  const { destino } = entrada2;
  const s = Math.min(
    destino.ancho / entrada2.ancho,
    destino.alto / entrada2.alto
  );
  const ox = destino.x + (destino.ancho - entrada2.ancho * s) / 2;
  const oy = destino.y + (destino.alto - entrada2.alto * s) / 2;
  const [a, b, c, d, e, f3] = entrada2.matriz ?? [1, 0, 0, 1, 0, 0];
  const det = a * d - b * c;
  const rgb3 = (hex2) => [1, 3, 5].map((i) => Number.parseInt(hex2.slice(i, i + 2), 16));
  const tintas = raster.tintas.map(
    (t) => {
      const [r, g, bl] = rgb3(t.hex);
      return { hilo: hiloDe(t.hex), lab: aLab(r, g, bl) };
    }
  );
  const cache = /* @__PURE__ */ new Map();
  return ([X, Y]) => {
    const u4 = (d * (X - e) - c * (Y - f3)) / det;
    const v2 = (-b * (X - e) + a * (Y - f3)) / det;
    const x = Math.floor((u4 - ox) / s);
    const y = Math.floor((v2 - oy) / s);
    if (x < 0 || y < 0 || x >= entrada2.ancho || y >= entrada2.alto || !tintas.length)
      return { hex: null, confianza: 0 };
    const k = y * entrada2.ancho + x;
    const hecho = cache.get(k);
    if (hecho) return hecho;
    const i = k * 4;
    const lab = aLab(
      entrada2.datos[i],
      entrada2.datos[i + 1],
      entrada2.datos[i + 2]
    );
    let primera = Number.POSITIVE_INFINITY;
    let segunda = Number.POSITIVE_INFINITY;
    let mejor = -1;
    tintas.forEach((t, j) => {
      const dE = deltaE(lab, t.lab);
      if (dE < primera) {
        segunda = primera;
        primera = dE;
        mejor = j;
      } else if (dE < segunda) segunda = dE;
    });
    const hilo = mejor >= 0 ? tintas[mejor].hilo : null;
    const salida2 = hilo && primera <= EVIDENCIA_DELTA_E ? {
      hex: hilo,
      confianza: Number(
        ((1 - primera / EVIDENCIA_DELTA_E) * (segunda - primera >= AMBIGUO_DELTA_E ? 1 : 0.5)).toFixed(2)
      )
    } : { hex: null, confianza: 0 };
    cache.set(k, salida2);
    return salida2;
  };
}
var mmPorPxDe = (e) => e.mmPorPx ?? Math.min(e.destino.ancho / e.ancho, e.destino.alto / e.alto);
function objetosDeRasterSincrono(entrada2) {
  const verdad = verdadDeLaImagen(entrada2);
  const raster = vectorizarRaster({ ...entrada2, mmPorPx: mmPorPxDe(entrada2) });
  entrada2.alVectorizar?.(raster);
  return alNucleo(raster, entrada2, verdad);
}
function verdadDeLaImagen(entrada2) {
  const { destino } = entrada2;
  const s = Math.min(
    destino.ancho / entrada2.ancho,
    destino.alto / entrada2.alto
  );
  const ox = destino.x + (destino.ancho - entrada2.ancho * s) / 2;
  const oy = destino.y + (destino.alto - entrada2.alto * s) / 2;
  const [a, b, c, d, e, f3] = entrada2.matriz ?? [1, 0, 0, 1, 0, 0];
  const det = a * d - b * c;
  return verdadDeRaster({
    datos: entrada2.datos,
    ancho: entrada2.ancho,
    alto: entrada2.alto,
    minAreaMm2: entrada2.profile.geometria.minAreaMm2,
    mmPorPx: s * Math.sqrt(Math.abs(det)),
    aMm: ([x, y]) => {
      const u4 = ox + x * s;
      const v2 = oy + y * s;
      return [a * u4 + c * v2 + e, b * u4 + d * v2 + f3];
    },
    aPx: ([X, Y]) => {
      const u4 = (d * (X - e) - c * (Y - f3)) / det;
      const v2 = (-b * (X - e) + a * (Y - f3)) / det;
      return [(u4 - ox) / s, (v2 - oy) / s];
    }
  });
}
function alNucleo(raster, entrada2, verdad) {
  if (raster.omitido) {
    const vacio2 = objetosDeSvg({
      svg: raster.svg,
      destino: entrada2.destino,
      profile: entrada2.profile,
      area: entrada2.area,
      prefijo: entrada2.prefijo,
      sourceObjectId: entrada2.sourceObjectId
    });
    return {
      ...vacio2,
      incidencias: raster.avisos.map((a) => ({ ...a })),
      raster
    };
  }
  const l = raster.linaje;
  const pixeles = pixelesDePiezas(verdad);
  const piezas = l ? verdad.componentes.map((_, k) => {
    const ids = /* @__PURE__ */ new Set();
    for (const p of pixeles[k] ?? [])
      l.etiquetas.forEach((etiquetas, j) => {
        const e = etiquetas[p];
        const id = e > 0 ? l.idDe(j, e) : void 0;
        if (id) ids.add(id);
      });
    return [...ids].sort();
  }) : [];
  const resultado2 = objetosDeSvg({
    svg: raster.svg,
    destino: entrada2.destino,
    matriz: entrada2.matriz,
    profile: entrada2.profile,
    area: entrada2.area,
    prefijo: entrada2.prefijo,
    sourceObjectId: entrada2.sourceObjectId,
    idDeColor: entrada2.idDeColor,
    regularizarFinos: entrada2.regularizarFinos,
    verdad,
    ...l ? {
      linajeRaster: {
        componentes: l.componentes,
        anillos: l.anillos,
        piezas
      }
    } : {}
  });
  const propias = raster.avisos.map((a) => ({ ...a }));
  const incidencias = [
    ...propias,
    ...resultado2.incidencias.map(
      (i) => i.code === "DESIGN_SIMPLIFIED_TOO_MUCH" ? {
        ...i,
        code: "DETAIL_TOO_SMALL",
        message: i.message.replace("el dise\xF1o", "la imagen")
      } : i
    )
  ];
  const hiloDe = (hex2) => resultado2.colores.find((c) => c.hex === hex2 || c.tonos.includes(hex2))?.hex ?? null;
  return {
    ...resultado2,
    incidencias,
    raster,
    colorDeVerdad: evidenciaDeColor(entrada2, raster, hiloDe)
  };
}

// packages/bordado/src/satin.ts
var n = (value) => Number(value.toFixed(3)).toString();
var punto = ([x, y], primero) => `${primero ? "M" : "L"}${n(x)} ${n(y)}`;
function deltaAngulo(a, b) {
  let delta = Math.abs(a - b) % Math.PI;
  if (delta > Math.PI / 2) delta = Math.PI - delta;
  return Math.abs(delta);
}
function interpolarCamino(puntos, anchos, espaciado, cerrada) {
  if (puntos.length < 2) return { puntos: [...puntos], anchos: [...anchos] };
  const base = [...puntos];
  const widths = [...anchos];
  if (cerrada && Math.hypot(base[0][0] - base.at(-1)[0], base[0][1] - base.at(-1)[1]) > 1e-6) {
    base.push(base[0]);
    widths.push(widths[0]);
  }
  const acumulado2 = [0];
  for (let i = 1; i < base.length; i++)
    acumulado2.push(
      acumulado2[i - 1] + Math.hypot(base[i][0] - base[i - 1][0], base[i][1] - base[i - 1][1])
    );
  const total = acumulado2.at(-1) ?? 0;
  if (total <= 1e-6) return { puntos: [base[0]], anchos: [widths[0]] };
  const cantidad = Math.max(2, Math.ceil(total / espaciado) + 1);
  const salida2 = [];
  const salidaAnchos = [];
  let segmento = 1;
  for (let i = 0; i < cantidad; i++) {
    const distancia4 = i / (cantidad - 1) * total;
    while (segmento < acumulado2.length - 1 && acumulado2[segmento] < distancia4)
      segmento++;
    const desde = acumulado2[segmento - 1];
    const largo = Math.max(1e-9, acumulado2[segmento] - desde);
    const t = Math.min(1, Math.max(0, (distancia4 - desde) / largo));
    const a = base[segmento - 1];
    const b = base[segmento];
    salida2.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    salidaAnchos.push(
      widths[segmento - 1] + (widths[segmento] - widths[segmento - 1]) * t
    );
  }
  return { puntos: salida2, anchos: salidaAnchos };
}
function recortarExtremo(puntos, anchos, distancia4, desdeInicio) {
  if (distancia4 <= 0 || puntos.length < 4) return { puntos, anchos };
  const orden = desdeInicio ? puntos.map((_, i) => i) : puntos.map((_, i) => puntos.length - 1 - i);
  let recorrido = 0;
  let cortar2 = 0;
  for (let k = 1; k < orden.length - 2; k++) {
    const a = puntos[orden[k - 1]];
    const b = puntos[orden[k]];
    recorrido += Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (recorrido >= distancia4) {
      cortar2 = k;
      break;
    }
  }
  if (!cortar2) return { puntos, anchos };
  return desdeInicio ? { puntos: puntos.slice(cortar2), anchos: anchos.slice(cortar2) } : { puntos: puntos.slice(0, -cortar2), anchos: anchos.slice(0, -cortar2) };
}
function recortarRamaEnJunctions(rama, profile) {
  if (rama.cerrada || !rama.junctionInicio && !rama.junctionFin) return rama;
  let puntos = rama.puntos;
  let anchos = rama.anchosMm;
  const inset = rama.grosorMedianoMm * profile.quality.junctionInsetRatio;
  if (rama.junctionInicio)
    ({ puntos, anchos } = recortarExtremo(puntos, anchos, inset, true));
  if (rama.junctionFin)
    ({ puntos, anchos } = recortarExtremo(puntos, anchos, inset, false));
  const pasoPxMm = rama.largoMm / Math.max(1, rama.pixeles.length - 1);
  const quitar = Math.max(0, Math.round(inset / Math.max(pasoPxMm, 0.01)));
  const desde = rama.junctionInicio ? Math.min(quitar, rama.pixeles.length - 2) : 0;
  const hasta = rama.junctionFin ? Math.max(desde + 2, rama.pixeles.length - quitar) : rama.pixeles.length;
  return {
    ...rama,
    puntos,
    anchosMm: anchos,
    pixeles: rama.pixeles.slice(desde, hasta),
    largoMm: Math.max(
      0,
      rama.largoMm - (rama.junctionInicio ? inset : 0) - (rama.junctionFin ? inset : 0)
    )
  };
}
function suavizar3(valores, radio = 2) {
  return valores.map((_, i) => {
    let suma = 0;
    let cuenta = 0;
    for (let j = Math.max(0, i - radio); j <= Math.min(valores.length - 1, i + radio); j++) {
      suma += valores[j];
      cuenta++;
    }
    return suma / cuenta;
  });
}
function orientar2(puntos, anchos) {
  const salida2 = [];
  let normalAnterior;
  for (let i = 0; i < puntos.length; i++) {
    const a = puntos[Math.max(0, i - 2)];
    const b = puntos[Math.min(puntos.length - 1, i + 2)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const norma = Math.hypot(dx, dy) || 1;
    let normal = [-dy / norma, dx / norma];
    if (normalAnterior && normal[0] * normalAnterior[0] + normal[1] * normalAnterior[1] < 0)
      normal = [-normal[0], -normal[1]];
    normalAnterior = normal;
    salida2.push({
      centro: puntos[i],
      ancho: anchos[i],
      angulo: Math.atan2(dy, dx),
      normal
    });
  }
  return salida2;
}
function compactarMuestras(muestras) {
  if (muestras.length < 3) return muestras;
  const salida2 = [muestras[0]];
  let recorrido = 0;
  for (let i = 1; i < muestras.length - 1; i++) {
    recorrido += Math.hypot(
      muestras[i].centro[0] - muestras[i - 1].centro[0],
      muestras[i].centro[1] - muestras[i - 1].centro[1]
    );
    const ultimo = salida2.at(-1);
    const giro = deltaAngulo(ultimo.angulo, muestras[i].angulo) * 180 / Math.PI;
    if (giro >= 4 || Math.abs(ultimo.ancho - muestras[i].ancho) >= 0.1 || recorrido >= 8) {
      salida2.push(muestras[i]);
      recorrido = 0;
    }
  }
  salida2.push(muestras.at(-1));
  return salida2;
}
function rangos(muestras, profile, maxTurnDeg = profile.quality.maxAccumulatedTurnDeg) {
  const salida2 = [];
  let inicio = 0;
  let largo = 0;
  let giro = 0;
  for (let i = 1; i < muestras.length; i++) {
    largo += Math.hypot(
      muestras[i].centro[0] - muestras[i - 1].centro[0],
      muestras[i].centro[1] - muestras[i - 1].centro[1]
    );
    giro += deltaAngulo(muestras[i].angulo, muestras[i - 1].angulo) * 180 / Math.PI;
    if (i - inicio >= 4 && (largo >= profile.quality.maxColumnLengthMm || giro >= maxTurnDeg)) {
      salida2.push([inicio, i]);
      inicio = i;
      largo = 0;
      giro = 0;
    }
  }
  if (muestras.length - 1 - inicio < 3 && salida2.length) {
    salida2[salida2.length - 1][1] = muestras.length - 1;
  } else {
    salida2.push([inicio, muestras.length - 1]);
  }
  return salida2;
}
function varianza(valores) {
  if (!valores.length) return 0;
  const promedio3 = valores.reduce((a, b) => a + b, 0) / valores.length;
  return valores.reduce((suma, value) => suma + (value - promedio3) ** 2, 0) / valores.length;
}
function promedio2(valores) {
  return valores.length ? valores.reduce((suma, value) => suma + value, 0) / valores.length : 0;
}
function construirSatinManual(rama, profile) {
  if (rama.grosorMedianoMm > profile.quality.maxSatinWidthMm && rama.grosorMedianoMm <= profile.quality.maxAutoSplitSatinWidthMm) {
    const base = orientar2(rama.puntos, rama.anchosMm);
    const crearCarril = (signo) => ({
      ...rama,
      puntos: base.map((m) => [
        m.centro[0] + m.normal[0] * m.ancho * 0.25 * signo,
        m.centro[1] + m.normal[1] * m.ancho * 0.25 * signo
      ]),
      anchosMm: rama.anchosMm.map((width) => width / 2),
      grosorMedianoMm: rama.grosorMedianoMm / 2,
      grosorMinimoMm: rama.grosorMinimoMm / 2,
      grosorMaximoMm: rama.grosorMaximoMm / 2
    });
    return [
      ...construirSatinManual(crearCarril(-1), profile),
      ...construirSatinManual(crearCarril(1), profile)
    ];
  }
  let { puntos, anchos } = interpolarCamino(
    rama.puntos,
    rama.anchosMm.length === rama.puntos.length ? rama.anchosMm : rama.puntos.map(() => rama.grosorMedianoMm),
    profile.quality.railSampleSpacingMm,
    rama.cerrada
  );
  if (puntos.length < 3) return [];
  anchos = suavizar3(anchos).map((value, i) => {
    let factor = 1;
    if (!rama.cerrada && !rama.junctionInicio)
      factor = Math.min(
        factor,
        0.42 + 0.58 * Math.min(
          1,
          i * profile.quality.railSampleSpacingMm / profile.quality.taperLengthMm
        )
      );
    if (!rama.cerrada && !rama.junctionFin)
      factor = Math.min(
        factor,
        0.42 + 0.58 * Math.min(
          1,
          (anchos.length - 1 - i) * profile.quality.railSampleSpacingMm / profile.quality.taperLengthMm
        )
      );
    return Math.min(
      profile.quality.maxSatinWidthMm,
      Math.max(0.65, value * factor)
    );
  });
  const muestras = compactarMuestras(orientar2(puntos, anchos));
  const cortes = rangos(muestras, profile);
  const total = cortes.length;
  return cortes.map(([desde, hasta], segmentIndex) => {
    const tramo = muestras.slice(desde, hasta + 1);
    const izquierda = tramo.map(
      (m) => [
        m.centro[0] + m.normal[0] * m.ancho / 2,
        m.centro[1] + m.normal[1] * m.ancho / 2
      ]
    );
    const derecha = tramo.map(
      (m) => [
        m.centro[0] - m.normal[0] * m.ancho / 2,
        m.centro[1] - m.normal[1] * m.ancho / 2
      ]
    );
    const rail = (lista2) => lista2.map((p, i) => punto(p, i === 0)).join("");
    const indices2 = [
      .../* @__PURE__ */ new Set([0, Math.floor((tramo.length - 1) / 2), tramo.length - 1])
    ];
    const rungs = indices2.map((i) => {
      const extension = 0.12;
      const normal = tramo[i].normal;
      const a = [
        izquierda[i][0] + normal[0] * extension,
        izquierda[i][1] + normal[1] * extension
      ];
      const b = [
        derecha[i][0] - normal[0] * extension,
        derecha[i][1] - normal[1] * extension
      ];
      return `${punto(a, true)}${punto(b, false)}`;
    });
    const widths = tramo.map((m) => m.ancho);
    const angles = tramo.map((m) => m.angulo);
    const deltas = angles.slice(1).map((angle, i) => deltaAngulo(angle, angles[i]) * 180 / Math.PI);
    return {
      d: [rail(izquierda), rail(derecha), ...rungs].join(""),
      puntos: [...izquierda, ...derecha],
      quality: {
        minWidthMm: Number(Math.min(...widths).toFixed(3)),
        maxWidthMm: Number(Math.max(...widths).toFixed(3)),
        averageWidthMm: Number(
          (widths.reduce((a, b) => a + b, 0) / widths.length).toFixed(3)
        ),
        widthVariance: Number(varianza(widths).toFixed(5)),
        angleVariance: Number(varianza(deltas).toFixed(5)),
        maxAngleDeltaDeg: Number(Math.max(0, ...deltas).toFixed(3)),
        junctionCount: Number(segmentIndex === 0 && rama.junctionInicio) + Number(segmentIndex === total - 1 && rama.junctionFin),
        segmentIndex,
        segmentCount: total
      }
    };
  });
}
function distanciaPuntoSegmento(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length2 = dx * dx + dy * dy;
  if (length2 <= 1e-9) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(
    0,
    Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length2)
  );
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}
function simplificarAdaptativo(muestras, desde, hasta, errorMm, maxSpacingMm, seleccionados) {
  if (hasta <= desde + 1) return;
  const a = muestras[desde];
  const b = muestras[hasta];
  let largo = 0;
  for (let i = desde + 1; i <= hasta; i++)
    largo += Math.hypot(
      muestras[i].centro[0] - muestras[i - 1].centro[0],
      muestras[i].centro[1] - muestras[i - 1].centro[1]
    );
  let peor = -1;
  let indice = -1;
  for (let i = desde + 1; i < hasta; i++) {
    const t = (i - desde) / (hasta - desde);
    const widthError = Math.abs(
      muestras[i].ancho - (a.ancho + (b.ancho - a.ancho) * t)
    );
    const spatialError = distanciaPuntoSegmento(
      muestras[i].centro,
      a.centro,
      b.centro
    );
    const score = Math.max(
      spatialError / errorMm,
      widthError / Math.max(0.08, errorMm)
    );
    if (score > peor) {
      peor = score;
      indice = i;
    }
  }
  if (peor > 1 || largo > maxSpacingMm) {
    if (largo > maxSpacingMm && peor <= 1)
      indice = Math.floor((desde + hasta) / 2);
    seleccionados.add(indice);
    simplificarAdaptativo(
      muestras,
      desde,
      indice,
      errorMm,
      maxSpacingMm,
      seleccionados
    );
    simplificarAdaptativo(
      muestras,
      indice,
      hasta,
      errorMm,
      maxSpacingMm,
      seleccionados
    );
  }
}
function indicesRungs(muestras, maxSpacingMm) {
  const elegidos = /* @__PURE__ */ new Set([0, muestras.length - 1]);
  let desdeUltimo = 0;
  for (let i = 1; i < muestras.length - 1; i++) {
    desdeUltimo += Math.hypot(
      muestras[i].centro[0] - muestras[i - 1].centro[0],
      muestras[i].centro[1] - muestras[i - 1].centro[1]
    );
    const giro = deltaAngulo(muestras[i - 1].angulo, muestras[i + 1].angulo) * 180 / Math.PI;
    const ancho = Math.abs(muestras[i + 1].ancho - muestras[i - 1].ancho);
    if (giro >= 12 || ancho >= 0.18 || desdeUltimo >= maxSpacingMm) {
      elegidos.add(i);
      desdeUltimo = 0;
    }
  }
  if (elegidos.size < 3) elegidos.add(Math.floor((muestras.length - 1) / 2));
  let indices2 = [...elegidos].sort((a, b) => a - b);
  if (indices2.length > 5) {
    indices2 = Array.from(
      { length: 5 },
      (_, i) => indices2[Math.round(i * (indices2.length - 1) / 4)]
    );
  }
  return [...new Set(indices2)];
}
function construirSatinManualAdaptativo(rama, profile) {
  if (!profile.hybrid) throw new Error("El perfil no define muestreo h\xEDbrido");
  if (rama.grosorMedianoMm > profile.quality.maxSatinWidthMm && rama.grosorMedianoMm <= profile.quality.maxAutoSplitSatinWidthMm) {
    const base = orientar2(rama.puntos, rama.anchosMm);
    const crearCarril = (signo) => ({
      ...rama,
      puntos: base.map((m) => [
        m.centro[0] + m.normal[0] * m.ancho * 0.25 * signo,
        m.centro[1] + m.normal[1] * m.ancho * 0.25 * signo
      ]),
      anchosMm: rama.anchosMm.map((width) => width / 2),
      grosorMedianoMm: rama.grosorMedianoMm / 2,
      grosorMinimoMm: rama.grosorMinimoMm / 2,
      grosorMaximoMm: rama.grosorMaximoMm / 2
    });
    return [
      ...construirSatinManualAdaptativo(crearCarril(-1), profile),
      ...construirSatinManualAdaptativo(crearCarril(1), profile)
    ];
  }
  const decision = decidirRepresentacionSatin(rama, profile);
  let { puntos, anchos } = interpolarCamino(
    rama.puntos,
    rama.anchosMm.length === rama.puntos.length ? rama.anchosMm : rama.puntos.map(() => rama.grosorMedianoMm),
    profile.hybrid.minAdaptiveSpacingMm,
    rama.cerrada
  );
  if (puntos.length < 3) return [];
  anchos = suavizar3(anchos).map((value, i) => {
    let factor = 1;
    const distanciaInicio = i * profile.hybrid.minAdaptiveSpacingMm;
    const distanciaFin = (anchos.length - 1 - i) * profile.hybrid.minAdaptiveSpacingMm;
    if (!rama.cerrada && !rama.junctionInicio)
      factor = Math.min(
        factor,
        0.42 + 0.58 * Math.min(1, distanciaInicio / profile.quality.taperLengthMm)
      );
    if (!rama.cerrada && !rama.junctionFin)
      factor = Math.min(
        factor,
        0.42 + 0.58 * Math.min(1, distanciaFin / profile.quality.taperLengthMm)
      );
    return Math.min(
      profile.quality.maxSatinWidthMm,
      Math.max(0.65, value * factor)
    );
  });
  const densas = orientar2(puntos, anchos);
  const keep = /* @__PURE__ */ new Set([0, densas.length - 1]);
  simplificarAdaptativo(
    densas,
    0,
    densas.length - 1,
    profile.hybrid.simplificationErrorMm,
    profile.hybrid.maxAdaptiveSpacingMm,
    keep
  );
  const muestras = [...keep].sort((a, b) => a - b).map((index) => densas[index]);
  const cortes = rangos(muestras, profile, rama.cerrada ? 80 : void 0);
  const total = cortes.length;
  return cortes.map(([desde, hasta], segmentIndex) => {
    const tramo = muestras.slice(desde, hasta + 1);
    const izquierda = tramo.map(
      (m) => [
        m.centro[0] + m.normal[0] * m.ancho / 2,
        m.centro[1] + m.normal[1] * m.ancho / 2
      ]
    );
    const derecha = tramo.map(
      (m) => [
        m.centro[0] - m.normal[0] * m.ancho / 2,
        m.centro[1] - m.normal[1] * m.ancho / 2
      ]
    );
    const rail = (lista2) => lista2.map((p, i) => punto(p, i === 0)).join("");
    const indices2 = indicesRungs(tramo, profile.hybrid.maxAdaptiveSpacingMm);
    const rungs = indices2.map((i) => {
      const normal = tramo[i].normal;
      const extension = 0.12;
      return `${punto(
        [
          izquierda[i][0] + normal[0] * extension,
          izquierda[i][1] + normal[1] * extension
        ],
        true
      )}${punto(
        [
          derecha[i][0] - normal[0] * extension,
          derecha[i][1] - normal[1] * extension
        ],
        false
      )}`;
    });
    const widths = tramo.map((m) => m.ancho);
    const angles = tramo.map((m) => m.angulo);
    const deltas = angles.slice(1).map((angle, i) => deltaAngulo(angle, angles[i]) * 180 / Math.PI);
    const segmentLength = tramo.slice(1).reduce(
      (sum2, item, i) => sum2 + Math.hypot(
        item.centro[0] - tramo[i].centro[0],
        item.centro[1] - tramo[i].centro[1]
      ),
      0
    );
    return {
      d: [rail(izquierda), rail(derecha), ...rungs].join(""),
      puntos: [...izquierda, ...derecha],
      quality: {
        minWidthMm: Number(Math.min(...widths).toFixed(3)),
        maxWidthMm: Number(Math.max(...widths).toFixed(3)),
        averageWidthMm: Number(promedio2(widths).toFixed(3)),
        widthVariance: Number(varianza(widths).toFixed(5)),
        angleVariance: Number(varianza(deltas).toFixed(5)),
        maxAngleDeltaDeg: Number(Math.max(0, ...deltas).toFixed(3)),
        junctionCount: Number(segmentIndex === 0 && rama.junctionInicio) + Number(segmentIndex === total - 1 && rama.junctionFin),
        segmentIndex,
        segmentCount: total,
        representationDecision: "rails-v3",
        representationReasons: decision.reasons,
        lengthMm: Number(segmentLength.toFixed(3)),
        curvatureDegPerMm: decision.metrics.curvatureDegPerMm,
        maxCurvatureDegPerMm: decision.metrics.maxCurvatureDegPerMm,
        accumulatedTurningAngleDeg: decision.metrics.accumulatedTurningAngleDeg,
        branchCount: decision.metrics.branchCount,
        endpointTaper: decision.metrics.endpointTaper,
        selfIntersectionRisk: decision.metrics.selfIntersectionRisk,
        fanRisk: decision.metrics.fanRisk,
        railDivergenceMmPerMm: decision.metrics.railDivergenceMmPerMm,
        railConvergenceMmPerMm: decision.metrics.railConvergenceMmPerMm,
        numberOfSharpTurns: decision.metrics.numberOfSharpTurns,
        rawCenterlineNodes: rama.puntos.length,
        rawRailNodes: densas.length * 2,
        finalRailNodes: tramo.length * 2,
        rungsBefore: densas.length,
        rungsAfter: indices2.length,
        underlayLayers: segmentIndex === 0 ? 1 : 0,
        estimatedUnderlayStitches: segmentIndex === 0 ? Math.ceil(segmentLength / 2.2) : 0
      }
    };
  });
}

// packages/bordado/src/types.ts
var EMBROIDERY_SCHEMA_VERSION = 1;
var INKSTITCH_ENGINE_VERSION = "inkstitch-3.3.0";

// packages/bordado/src/validation.ts
var PATH_SAFE = /^[MmZzLlHhVvCcSsQqTtAaEe0-9+.,\s-]+$/;
var HEX = /^#[0-9a-f]{6}$/i;
function finiteBox(box, physical) {
  return box !== void 0 && [box.xMm, box.yMm, box.widthMm, box.heightMm].every(Number.isFinite) && box.xMm >= -0.1 && box.yMm >= -0.1 && box.widthMm > 0 && box.heightMm > 0 && box.xMm + box.widthMm <= physical.widthMm + 0.1 && box.yMm + box.heightMm <= physical.heightMm + 0.1;
}
function validateDesign(value) {
  if (!value || typeof value !== "object") throw new Error("INVALID_DESIGN");
  const d = value;
  if (d.schemaVersion !== EMBROIDERY_SCHEMA_VERSION)
    throw new Error("UNSUPPORTED_SCHEMA");
  if (d.engineVersion !== INKSTITCH_ENGINE_VERSION)
    throw new Error("UNSUPPORTED_ENGINE");
  const profile = profileByVersion(String(d.profileVersion ?? ""));
  if (!profile) throw new Error("UNSUPPORTED_PROFILE");
  if (!d.productId || !d.sideId || !/^[a-zA-Z0-9_-]{1,100}$/.test(d.sideId))
    throw new Error("INVALID_SCOPE");
  if (!d.sourceSnapshotHash || !/^[a-f0-9]{64}$/i.test(d.sourceSnapshotHash))
    throw new Error("INVALID_SOURCE_HASH");
  if (!d.physical || !(d.physical.widthMm > 0) || !(d.physical.heightMm > 0))
    throw new Error("INVALID_DIMENSIONS");
  if (d.physical.widthMm > profile.limits.maxWidthMm || d.physical.heightMm > profile.limits.maxHeightMm)
    throw new Error("DIMENSIONS_EXCEEDED");
  if (!finiteBox(d.bounds, d.physical)) throw new Error("INVALID_BOUNDS");
  if (d.preparation !== void 0 && d.preparation.profileVersion !== d.profileVersion)
    throw new Error("PREPARATION_MISMATCH");
  if (!Array.isArray(d.colors) || d.colors.length < 1 || d.colors.length > profile.limits.maxColors)
    throw new Error("INVALID_COLORS");
  if (d.colors.some(
    (c) => !c.id || !HEX.test(c.sourceHex) || !HEX.test(c.displayHex)
  ))
    throw new Error("INVALID_COLORS");
  if (!Array.isArray(d.objects) || d.objects.length < 1 || d.objects.length > profile.limits.maxObjects)
    throw new Error("INVALID_OBJECTS");
  for (const object of d.objects) {
    if (!object.id || !object.sourceObjectId || !d.colors.some((color) => color.id === object.colorId))
      throw new Error("INVALID_OBJECT");
    if (object.sourceType === "raster" && d.preparation?.raster === void 0)
      throw new Error("RASTER_NOT_PREPARED");
    if (object.geometry?.kind !== "path" || !object.geometry.d || object.geometry.d.length > 2e5 || !PATH_SAFE.test(object.geometry.d))
      throw new Error("UNSAFE_GEOMETRY");
    if (!finiteBox(object.bounds, d.physical))
      throw new Error("INVALID_OBJECT_BOUNDS");
    if (!["running", "satin", "fill"].includes(object.stitch?.type))
      throw new Error("INVALID_STITCH");
    if (object.stitch.spacingMm !== void 0 && (!Number.isFinite(object.stitch.spacingMm) || object.stitch.spacingMm < 0.2 || object.stitch.spacingMm > 2))
      throw new Error("INVALID_STITCH_SPACING");
    if (object.stitch.maxStitchLengthMm !== void 0 && (!Number.isFinite(object.stitch.maxStitchLengthMm) || object.stitch.maxStitchLengthMm < 1 || object.stitch.maxStitchLengthMm > 12))
      throw new Error("INVALID_STITCH_LENGTH");
    if (object.stitch.beanRepeats !== void 0 && (object.stitch.type !== "running" || ![0, 1, 2].includes(object.stitch.beanRepeats)))
      throw new Error("INVALID_STITCH_PARAMETER");
    if (object.stitch.toleranceMm !== void 0 && (object.stitch.type !== "running" || !Number.isFinite(object.stitch.toleranceMm) || object.stitch.toleranceMm < 0.02 || object.stitch.toleranceMm > 1))
      throw new Error("INVALID_STITCH_PARAMETER");
    if (object.stitch.placement !== void 0 && (object.stitch.type !== "running" || object.stitch.placement !== "curvatura"))
      throw new Error("INVALID_STITCH_PARAMETER");
    if (!Number.isInteger(object.nodeCount) || object.nodeCount < 1)
      throw new Error("INVALID_NODE_COUNT");
  }
}

// packages/bordado/src/vector/sanear.ts
var import_svg_parser2 = __toESM(require_svg_parser_umd(), 1);
var MAXIMO_BYTES_SVG = 1e6;
var PROHIBIDOS = /* @__PURE__ */ new Set([
  "script",
  "foreignObject",
  "iframe",
  "object",
  "embed",
  "audio",
  "video",
  "canvas",
  "animate",
  "animateMotion",
  "animateTransform",
  "set",
  "discard",
  "handler",
  "listener"
]);
var escaparAtributo = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
var escaparTexto = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
var decodificar2 = (texto2) => texto2.replace(
  /&#x([0-9a-f]+);/gi,
  (_, h) => String.fromCodePoint(Number.parseInt(h, 16))
).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
var URL_EXTERNA = /url\(\s*(['"]?)(?!#)[^)]*\1\s*\)/gi;
function cssLimpio(css, quitar) {
  let salida2 = css.replace(/@import[^;]*;?/gi, () => {
    quitar("@import");
    return "";
  });
  salida2 = salida2.replace(URL_EXTERNA, () => {
    quitar("url externa");
    return "none";
  });
  if (/expression\s*\(|javascript:/i.test(salida2)) {
    quitar("css activo");
    salida2 = salida2.replace(/expression\s*\(|javascript:/gi, "");
  }
  return salida2;
}
function sanearSvg(texto2) {
  if (texto2.length > MAXIMO_BYTES_SVG) throw new Error("SVG_DEMASIADO_GRANDE");
  const eliminado = /* @__PURE__ */ new Set();
  const quitar = (que) => eliminado.add(que);
  let raiz;
  try {
    raiz = (0, import_svg_parser2.parse)(texto2).children.find(
      (n2) => typeof n2 !== "string" && n2.type === "element" && (n2.tagName ?? "").replace(/^svg:/, "") === "svg"
    );
  } catch {
    throw new Error("SVG_ILEGIBLE");
  }
  if (!raiz) throw new Error("SVG_ILEGIBLE");
  let usaXlink = false;
  const escribir = (nodo, dentroDeEstilo) => {
    if (typeof nodo === "string")
      return dentroDeEstilo ? escaparTexto(cssLimpio(nodo, quitar)) : escaparTexto(nodo);
    if (nodo.type === "text") {
      const valor = decodificar2(String(nodo.value ?? ""));
      return escaparTexto(dentroDeEstilo ? cssLimpio(valor, quitar) : valor);
    }
    const etiqueta = (nodo.tagName ?? "").replace(/^svg:/, "");
    if (!/^[A-Za-z][\w.:-]*$/.test(etiqueta)) {
      quitar("etiqueta inv\xE1lida");
      return "";
    }
    if (PROHIBIDOS.has(etiqueta)) {
      quitar(etiqueta);
      return "";
    }
    if (etiqueta.includes(":")) return "";
    const atributos = [];
    for (const [nombre, bruto] of Object.entries(nodo.properties ?? {})) {
      const clave2 = nombre.toLowerCase();
      let valor = decodificar2(String(bruto));
      if (!/^[A-Za-z_][\w.:-]*$/.test(nombre)) {
        quitar("atributo inv\xE1lido");
        continue;
      }
      if (clave2.startsWith("on")) {
        quitar(clave2);
        continue;
      }
      if (clave2 === "xmlns" || clave2.startsWith("xmlns:")) continue;
      const prefijo = clave2.includes(":") ? clave2.split(":")[0] : "";
      if (prefijo && prefijo !== "xlink" && prefijo !== "xml") continue;
      if (clave2 === "href" || clave2 === "xlink:href") {
        if (!valor.trim().startsWith("#")) {
          quitar("href externo");
          continue;
        }
        if (clave2 === "xlink:href") usaXlink = true;
      }
      if (clave2 === "style") valor = cssLimpio(valor, quitar);
      else if (URL_EXTERNA.test(valor)) {
        URL_EXTERNA.lastIndex = 0;
        quitar("url externa");
        continue;
      }
      URL_EXTERNA.lastIndex = 0;
      atributos.push(`${nombre}="${escaparAtributo(valor)}"`);
    }
    const esEstilo = etiqueta === "style";
    const hijos = nodo.children.map((h) => escribir(h, esEstilo)).join("");
    const abre = [etiqueta, ...atributos].join(" ");
    return hijos ? `<${abre}>${hijos}</${etiqueta}>` : `<${abre}/>`;
  };
  const cuerpo2 = escribir(raiz, false);
  const espacios = `xmlns="http://www.w3.org/2000/svg"${usaXlink ? ' xmlns:xlink="http://www.w3.org/1999/xlink"' : ""}`;
  return {
    marcado: cuerpo2.replace(/^<svg(\s|\/?>)/, `<svg ${espacios}$1`),
    eliminado: [...eliminado]
  };
}

// packages/bordado/src/verdad/malla.ts
var PASO_MINIMO_DE_MALLA_MM = 0.05;
var MEZCLA = "mezcla";
var ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function aBase64(bytes) {
  let salida2 = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    salida2 += ALFABETO[a >> 2] + ALFABETO[(a & 3) << 4 | b >> 4];
    salida2 += i + 1 < bytes.length ? ALFABETO[(b & 15) << 2 | c >> 6] : "=";
    salida2 += i + 2 < bytes.length ? ALFABETO[c & 63] : "=";
  }
  return salida2;
}
function codificarCapa(valores) {
  const bytes = [];
  const varint = (v2) => {
    let x = v2 >>> 0;
    while (x >= 128) {
      bytes.push(x & 127 | 128);
      x >>>= 7;
    }
    bytes.push(x);
  };
  let k = 0;
  while (k < valores.length) {
    const v2 = valores[k];
    let n2 = 1;
    while (k + n2 < valores.length && valores[k + n2] === v2) n2++;
    varint(v2);
    varint(n2);
    k += n2;
  }
  return aBase64(Uint8Array.from(bytes));
}
function mallaDeVerdad(v2, pasoMinimo = PASO_MINIMO_DE_MALLA_MM, evidencia) {
  const r = v2.rejilla;
  const i = internoDe(v2);
  const paso = Math.max(r.paso, pasoMinimo);
  const ancho = Math.max(1, Math.round(r.ancho * r.paso / paso));
  const alto = Math.max(1, Math.round(r.alto * r.paso / paso));
  const valorDe = /* @__PURE__ */ new Map();
  for (const [etiqueta, indice] of i.piezaDe) valorDe.set(etiqueta, indice + 1);
  const piezas = new Uint32Array(ancho * alto);
  const colores = new Uint32Array(ancho * alto);
  const confianza = evidencia ? new Uint32Array(ancho * alto) : null;
  const paleta = evidencia ? [] : [...v2.colores];
  const indiceDe2 = (hex2) => {
    let k = paleta.indexOf(hex2);
    if (k < 0) k = paleta.push(hex2) - 1;
    return k + 1;
  };
  for (let jj = 0; jj < alto; jj++) {
    const y = r.y0 + (jj + 0.5) * paso;
    const j = Math.min(
      r.alto - 1,
      Math.max(0, Math.floor((y - r.y0) / r.paso))
    );
    for (let ii = 0; ii < ancho; ii++) {
      const x = r.x0 + (ii + 0.5) * paso;
      const c = Math.min(
        r.ancho - 1,
        Math.max(0, Math.floor((x - r.x0) / r.paso))
      );
      const celda = j * r.ancho + c;
      const pieza = valorDe.get(i.tinta.etiquetas[celda]) ?? 0;
      piezas[jj * ancho + ii] = pieza;
      if (!evidencia) {
        colores[jj * ancho + ii] = v2.etiquetas[celda];
        continue;
      }
      if (!pieza) continue;
      const e = evidencia([x, y]);
      colores[jj * ancho + ii] = indiceDe2(e.hex ?? MEZCLA);
      confianza[jj * ancho + ii] = Math.round(
        100 * e.confianza
      );
    }
  }
  return {
    x0: r.x0,
    y0: r.y0,
    paso,
    ancho,
    alto,
    capaPiezas: codificarCapa(piezas),
    capaColores: codificarCapa(colores),
    colores: paleta,
    ...confianza ? { capaConfianzaColor: codificarCapa(confianza) } : {}
  };
}

// packages/bordado/src/original.ts
var ORIGINAL_SCHEMA_VERSION = 1;
var LIMITES_DE_ORIGINAL = {
  fuentes: 24,
  /** El mismo tope que `sanearSvg`. */
  marcadoBytes: 1e6,
  /**
   * Elementos del marcado, contados por `<`, antes de parsearlo. Cuatro
   * veces `LIMITES_SVG.elementos` (3000): cada forma trae grupos y cierres.
   */
  etiquetasSvg: 12e3,
  /** Anidamiento del marcado (`LIMITES_SVG.profundidad` es 32; se deja margen para lo que se sanea). */
  profundidadSvg: 64,
  /** Píxeles de una imagen: el máximo de la rejilla de captura (6 M). */
  pixeles: 6e6,
  /** La imagen comprimida, en base64. */
  rasterBase64Bytes: 12e6,
  /** Un trazado de texto o de vector. */
  trazadoBytes: 4e5,
  caminosPorColor: 4e3,
  coloresPorVector: 32,
  idBytes: 200,
  /** Coordenadas y medidas en mm: nada del área pasa de un metro. */
  mmMaximo: 1e3,
  /** Escala de la matriz del lienzo: ni degenerada ni absurda. */
  escalaMatriz: { minimo: 1e-6, maximo: 1e6 },
  mmPorPx: { minimo: 1e-3, maximo: 5 }
};
var ErrorDeOriginal = class extends Error {
  constructor(codigo, detalle) {
    super(codigo);
    this.codigo = codigo;
    this.detalle = detalle;
    this.name = "ErrorDeOriginal";
  }
};
var HEX2 = /^#[0-9a-fA-F]{6}$/;
var SHA256 = /^[0-9a-f]{64}$/;
var BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;
function objeto(v2, donde) {
  if (!v2 || typeof v2 !== "object" || Array.isArray(v2))
    throw new ErrorDeOriginal("ORIGINAL_INVALIDO", `${donde}: no es un objeto`);
  return v2;
}
function texto(v2, donde, maximo, patron) {
  if (typeof v2 !== "string" || v2.length > maximo || patron && !patron.test(v2))
    throw new ErrorDeOriginal("ORIGINAL_INVALIDO", `${donde}: texto inv\xE1lido`);
  return v2;
}
function numero(v2, donde, minimo, maximo) {
  if (typeof v2 !== "number" || !Number.isFinite(v2) || v2 < minimo || v2 > maximo)
    throw new ErrorDeOriginal("ORIGINAL_INVALIDO", `${donde}: n\xFAmero inv\xE1lido`);
  return v2;
}
function entero(v2, donde, minimo, maximo) {
  const n2 = numero(v2, donde, minimo, maximo);
  if (!Number.isInteger(n2))
    throw new ErrorDeOriginal("ORIGINAL_INVALIDO", `${donde}: no es entero`);
  return n2;
}
function lista(v2, donde, maximo) {
  if (!Array.isArray(v2) || v2.length > maximo)
    throw new ErrorDeOriginal("ORIGINAL_INVALIDO", `${donde}: lista inv\xE1lida`);
  return v2;
}
function complejidadDeMarcado(marcado) {
  let etiquetas = 0;
  let profundidad = 0;
  let maxima = 0;
  for (let i = 0; i < marcado.length; i++) {
    if (marcado.charCodeAt(i) !== 60) continue;
    const siguiente = marcado[i + 1];
    if (siguiente === "!" || siguiente === "?") continue;
    etiquetas++;
    if (siguiente === "/") {
      profundidad = Math.max(0, profundidad - 1);
      continue;
    }
    const cierre2 = marcado.indexOf(">", i);
    if (cierre2 > 0 && marcado[cierre2 - 1] === "/") continue;
    profundidad++;
    if (profundidad > maxima) maxima = profundidad;
  }
  return { etiquetas, profundidad: maxima };
}
function fuenteDe(v2, k) {
  const L = LIMITES_DE_ORIGINAL;
  const f3 = objeto(v2, `fuentes[${k}]`);
  const sourceObjectId = texto(f3.sourceObjectId, `fuentes[${k}].sourceObjectId`, L.idBytes);
  const mm = (x, donde) => numero(x, donde, -L.mmMaximo, L.mmMaximo);
  switch (f3.tipo) {
    case "svg": {
      const marcado = texto(f3.marcado, `fuentes[${k}].marcado`, L.marcadoBytes);
      const c = complejidadDeMarcado(marcado);
      if (c.etiquetas > L.etiquetasSvg || c.profundidad > L.profundidadSvg)
        throw new ErrorDeOriginal("SVG_DEMASIADO_COMPLEJO", `fuentes[${k}]`);
      const caja = objeto(f3.cajaMm, `fuentes[${k}].cajaMm`);
      const cajaMm = {
        x: mm(caja.x, "cajaMm.x"),
        y: mm(caja.y, "cajaMm.y"),
        ancho: numero(caja.ancho, "cajaMm.ancho", 1e-6, L.mmMaximo),
        alto: numero(caja.alto, "cajaMm.alto", 1e-6, L.mmMaximo)
      };
      let matriz;
      if (f3.matriz !== void 0) {
        const m = lista(f3.matriz, `fuentes[${k}].matriz`, 6);
        if (m.length !== 6)
          throw new ErrorDeOriginal("ORIGINAL_INVALIDO", "matriz de 6 n\xFAmeros");
        const [a, b, c2, d, e, g] = m.map(
          (x, i) => numero(x, `matriz[${i}]`, -1e7, 1e7)
        );
        const escala = Math.sqrt(Math.abs(a * d - b * c2));
        if (escala < L.escalaMatriz.minimo || escala > L.escalaMatriz.maximo)
          throw new ErrorDeOriginal("ORIGINAL_INVALIDO", "matriz degenerada");
        matriz = [a, b, c2, d, e, g];
      }
      return { tipo: "svg", sourceObjectId, marcado, cajaMm, ...matriz ? { matriz } : {} };
    }
    case "raster": {
      const ancho = entero(f3.ancho, "ancho", 1, 1e5);
      const alto = entero(f3.alto, "alto", 1, 1e5);
      if (ancho * alto > L.pixeles)
        throw new ErrorDeOriginal("RASTER_DEMASIADO_GRANDE", `${ancho}\xD7${alto}`);
      const rgba = objeto(f3.rgba, `fuentes[${k}].rgba`);
      if (rgba.codificacion !== "deflate")
        throw new ErrorDeOriginal("ORIGINAL_INVALIDO", "codificaci\xF3n del raster");
      return {
        tipo: "raster",
        sourceObjectId,
        ancho,
        alto,
        mmPorPx: numero(f3.mmPorPx, "mmPorPx", L.mmPorPx.minimo, L.mmPorPx.maximo),
        desplazamientoMm: mm(f3.desplazamientoMm, "desplazamientoMm"),
        ...f3.vectorizar === true ? { vectorizar: true } : {},
        rgba: {
          codificacion: "deflate",
          datos: texto(rgba.datos, "rgba.datos", L.rasterBase64Bytes, BASE64),
          sha256: texto(rgba.sha256, "rgba.sha256", 64, SHA256)
        }
      };
    }
    case "texto":
      return {
        tipo: "texto",
        sourceObjectId,
        d: texto(f3.d, `fuentes[${k}].d`, L.trazadoBytes),
        colorHex: texto(f3.colorHex, "colorHex", 7, HEX2)
      };
    case "vector":
      return {
        tipo: "vector",
        sourceObjectId,
        porColor: lista(f3.porColor, "porColor", L.coloresPorVector).map((g, i) => {
          const grupo = objeto(g, `porColor[${i}]`);
          let bytes = 0;
          const caminos = lista(grupo.caminos, "caminos", L.caminosPorColor).map((c) => {
            const s = texto(c, "camino", L.trazadoBytes);
            bytes += s.length;
            return s;
          });
          if (bytes > L.trazadoBytes)
            throw new ErrorDeOriginal("ORIGINAL_INVALIDO", "trazados demasiado grandes");
          return { hex: texto(grupo.hex, "hex", 7, HEX2), caminos };
        })
      };
    default:
      throw new ErrorDeOriginal("ORIGINAL_INVALIDO", `fuentes[${k}].tipo`);
  }
}
function validarSolicitudOriginal(valor) {
  const L = LIMITES_DE_ORIGINAL;
  const s = objeto(valor, "original");
  if (s.schemaVersion !== ORIGINAL_SCHEMA_VERSION)
    throw new ErrorDeOriginal("ORIGINAL_VERSION_NO_SOPORTADA");
  const fuentes = lista(s.fuentes, "fuentes", L.fuentes);
  if (!fuentes.length) throw new ErrorDeOriginal("ORIGINAL_SIN_FUENTES");
  return {
    schemaVersion: ORIGINAL_SCHEMA_VERSION,
    productId: texto(s.productId, "productId", L.idBytes),
    sideId: texto(s.sideId, "sideId", L.idBytes),
    widthMm: numero(s.widthMm, "widthMm", 1, L.mmMaximo),
    heightMm: numero(s.heightMm, "heightMm", 1, L.mmMaximo),
    sourceSnapshotHash: texto(s.sourceSnapshotHash, "sourceSnapshotHash", 128),
    fuentes: fuentes.map(fuenteDe)
  };
}
function contenidoDelOriginal(o) {
  return {
    ...o,
    fuentes: o.fuentes.map(
      (f3) => f3.tipo === "raster" ? { ...f3, rgba: { codificacion: f3.rgba.codificacion, sha256: f3.rgba.sha256 } } : f3
    )
  };
}
var POLITICA_POR_DEFECTO = { rasterVectorial: true };
function aplicarPolitica(o, politica = POLITICA_POR_DEFECTO) {
  return {
    ...o,
    fuentes: o.fuentes.map((f3) => {
      if (f3.tipo !== "raster") return f3;
      const { vectorizar: _, ...resto } = f3;
      return politica.rasterVectorial ? { ...resto, vectorizar: true } : resto;
    })
  };
}
function perfilDeFuentes(fuentes) {
  return fuentes.some(
    (f3) => f3.tipo === "svg" || f3.tipo === "raster" && f3.vectorizar === true
  ) ? EMBROIDERY_PROFILE_VECTOR_V5 : EMBROIDERY_PROFILE_HYBRID_V4;
}

// lib/bordado/servidor.ts
var import_node_crypto = require("node:crypto");
var import_node_zlib = require("node:zlib");

// lib/bordado/color.ts
function colorIdDe(hex2) {
  return `color-${normalizarHex(hex2).slice(1)}`;
}
function normalizarHex(raw) {
  if (!raw || raw === "none") return "#111111";
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(raw))
    return `#${raw.slice(1).split("").map((parte) => parte + parte).join("")}`.toLowerCase();
  const rgb3 = raw.match(/^rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/i);
  return rgb3 ? `#${rgb3.slice(1, 4).map((valor) => Number(valor).toString(16).padStart(2, "0")).join("")}` : "#111111";
}

// lib/bordado/cronometro.ts
var ahora2 = () => typeof performance !== "undefined" ? performance.now() : Date.now();
function crearCronometro() {
  const etapas2 = {};
  return {
    etapas: etapas2,
    sumar(etapa, ms) {
      etapas2[etapa] = (etapas2[etapa] ?? 0) + ms;
    },
    medir(etapa, fn) {
      const desde = ahora2();
      const salida2 = fn();
      etapas2[etapa] = (etapas2[etapa] ?? 0) + (ahora2() - desde);
      return salida2;
    }
  };
}

// lib/bordado/formas.ts
var import_svgpath3 = __toESM(require_svgpath2());
function contarNodos2(d) {
  return Math.max(1, (d.match(/[MmLlHhVvCcSsQqTtAa]/g) ?? []).length);
}
function cajaDe3(puntos) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of puntos) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return {
    xMm: minX,
    yMm: minY,
    widthMm: Math.max(0.05, maxX - minX),
    heightMm: Math.max(0.05, maxY - minY)
  };
}
function objetosDeMascara(entrada2) {
  const { rejilla, profile, desplazamientoMm } = entrada2;
  const objetos = [];
  const incidencias = [];
  const conteo = { satin: 0, running: 0, fill: 0 };
  let eliminadas = 0;
  let eliminadasMm2 = 0;
  const reloj = entrada2.cronometro;
  const medirCon = (etapa, fn) => reloj ? reloj.medir(etapa, fn) : fn();
  const partes = medirCon(
    "segmentation",
    () => medirCon("analisisComponentes", () => componentes(rejilla))
  );
  const mover = (d) => (0, import_svgpath3.default)(d).translate(-desplazamientoMm, -desplazamientoMm).round(3).toString();
  const emitir = (d, puntos, stitch, quality) => {
    const movido = mover(d);
    if (!movido) return;
    const caja = cajaDe3(puntos);
    objetos.push({
      id: `${entrada2.prefijo}-${objetos.length}`,
      sourceObjectId: entrada2.sourceObjectId,
      sourceType: entrada2.sourceType,
      classification: entrada2.classification,
      colorId: entrada2.colorId,
      geometry: {
        kind: "path",
        d: movido,
        fillRule: stitch.type === "fill" ? "evenodd" : void 0
      },
      stitch,
      quality,
      bounds: {
        xMm: Math.max(0, caja.xMm - desplazamientoMm),
        yMm: Math.max(0, caja.yMm - desplazamientoMm),
        widthMm: caja.widthMm,
        heightMm: caja.heightMm
      },
      nodeCount: contarNodos2(movido)
    });
    conteo[stitch.type]++;
  };
  for (const parte of partes) {
    const distancia4 = medirCon("distancia", () => distanciaDe(rejilla, parte));
    const medidas = medirCon(
      "medicion",
      () => medir(rejilla, parte, distancia4)
    );
    if (medidas.areaMm2 < profile.geometria.minAreaMm2) {
      eliminadas++;
      eliminadasMm2 += medidas.areaMm2;
      continue;
    }
    if (entrada2.esTexto) {
      incidencias.push(...revisarLegibilidad(medidas, profile));
    }
    const todas = medirCon(
      "skeleton",
      () => medirCon(
        "esqueleto",
        () => ramas(
          rejilla,
          parte,
          distancia4,
          profile.geometria.toleranciaMm,
          entrada2.coste,
          profile.presupuesto
        )
      )
    );
    const columnas2 = [];
    for (const rama of todas) {
      const decision = medirCon(
        "stitchTypeAssignment",
        () => decidirDeRama(rama, profile)
      );
      if (decision.tipo !== "ninguna") {
        const representacion = decision.tipo === "satin" && profile.hybrid ? decidirRepresentacionSatin(rama, profile) : void 0;
        columnas2.push({
          rama,
          cobertura: decision.tipo === "satin" && (profile.version.startsWith("experimental-v3") || representacion?.representationDecision === "rails-v3") ? medirCon(
            "junctionHandling",
            () => recortarRamaEnJunctions(rama, profile)
          ) : rama,
          decision,
          representacion
        });
      }
    }
    if (!columnas2.length) {
      const decision = decidirPuntada(medidas, profile, {
        esTexto: entrada2.esTexto
      });
      incidencias.push(
        ...decision.incidencias.filter(
          (i) => !incidencias.some((y) => y.code === i.code)
        )
      );
      if (!decision.fabricable) {
        eliminadas++;
        eliminadasMm2 += medidas.areaMm2;
        continue;
      }
      const trazos = medirCon(
        "vectorGeometry",
        () => medirCon(
          "contornos",
          () => contornos(
            rejilla,
            parte,
            profile.geometria.toleranciaMm,
            profile.texto.minContraformaMm2
          )
        )
      );
      emitir(
        comoPathCompuesto(trazos),
        trazos.exterior,
        parametrosDe(decision, medidas, profile, objetos.length)
      );
      continue;
    }
    for (const { rama, cobertura, decision, representacion } of columnas2) {
      const d = comoPath(rama.puntos, rama.cerrada);
      if (decision.tipo === "satin") {
        if (profile.version.startsWith("experimental-v3") || representacion?.representationDecision === "rails-v3") {
          const segmentos = medirCon(
            "rails",
            () => profile.hybrid ? construirSatinManualAdaptativo(cobertura, profile) : construirSatinManual(cobertura, profile)
          );
          for (const segmento of segmentos)
            emitir(
              segmento.d,
              segmento.puntos,
              {
                type: "satin",
                satinMode: "rails",
                spacingMm: profile.stitches.satinSpacingMm,
                pullCompensationMm: profile.stitches.pullCompensationMm,
                underlay: !profile.hybrid || segmento.quality.segmentIndex === 0
              },
              segmento.quality
            );
        } else {
          emitir(
            d,
            rama.puntos,
            {
              type: "satin",
              satinMode: profile.hybrid ? "stroke" : void 0,
              strokeWidthMm: decision.strokeWidthMm,
              spacingMm: profile.stitches.satinSpacingMm,
              pullCompensationMm: profile.stitches.pullCompensationMm,
              underlay: true
            },
            representacion ? {
              ...representacion.metrics,
              representationDecision: "stroke-v2",
              representationReasons: [],
              rawCenterlineNodes: rama.puntos.length,
              rawRailNodes: 0,
              finalRailNodes: 0,
              rungsBefore: 0,
              rungsAfter: 0,
              underlayLayers: 1,
              estimatedUnderlayStitches: Math.ceil(rama.largoMm / 2.2)
            } : void 0
          );
        }
      } else {
        emitir(d, rama.puntos, {
          type: "running",
          // Fino a propósito: en un running el stroke no es el ancho de nada,
          // sólo le dice al motor por dónde pasar.
          strokeWidthMm: 0.3,
          maxStitchLengthMm: profile.stitches.maxStitchLengthMm
        });
      }
    }
    const sobrantes = medirCon(
      "sobrante",
      () => sobranteDe(
        rejilla,
        parte,
        distancia4,
        columnas2.map((c) => c.cobertura)
      )
    );
    for (const resto of sobrantes) {
      const suyas = medirCon(
        "medicion",
        () => medir(rejilla, resto, distanciaDe(rejilla, resto))
      );
      if (suyas.areaMm2 < profile.geometria.minAreaMm2) {
        eliminadas++;
        eliminadasMm2 += suyas.areaMm2;
        continue;
      }
      const trazos = medirCon(
        "vectorGeometry",
        () => medirCon(
          "contornos",
          () => contornos(
            rejilla,
            resto,
            profile.geometria.toleranciaMm,
            profile.texto.minContraformaMm2
          )
        )
      );
      emitir(
        comoPathCompuesto(trazos),
        trazos.exterior,
        parametrosDe(
          {
            tipo: "fill",
            motivo: "sobrante de las columnas",
            fabricable: true,
            incidencias: []
          },
          suyas,
          profile,
          objetos.length
        )
      );
    }
  }
  return {
    objetos,
    incidencias: incidencias.filter(
      (issue, i, todos) => todos.findIndex((y) => y.code === issue.code) === i
    ),
    conteo,
    eliminadas,
    eliminadasMm2: Number(eliminadasMm2.toFixed(3))
  };
}

// lib/impresion/mascara.ts
var LINEAL2 = new Float64Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  LINEAL2[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
var f2 = (t) => t > 0.008856451679 ? Math.cbrt(t) : 7.787037 * t + 16 / 116;
var memoria2 = /* @__PURE__ */ new Map();
function aLab2(r, g, b) {
  const llave = r << 16 | g << 8 | b;
  const guardado = memoria2.get(llave);
  if (guardado) return guardado;
  const R = LINEAL2[r];
  const G = LINEAL2[g];
  const B3 = LINEAL2[b];
  const x = f2((0.4124564 * R + 0.3575761 * G + 0.1804375 * B3) / 0.95047);
  const y = f2(0.2126729 * R + 0.7151522 * G + 0.072175 * B3);
  const z = f2((0.0193339 * R + 0.119192 * G + 0.9503041 * B3) / 1.08883);
  const lab = [
    116 * y - 16,
    500 * (x - y),
    200 * (y - z)
  ];
  if (memoria2.size < 4e4) memoria2.set(llave, lab);
  return lab;
}
function fondoDe(datos, ancho, alto) {
  const grosor = Math.max(2, Math.round(Math.min(ancho, alto) * 0.02));
  const rs = [];
  const gs = [];
  const bs = [];
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const borde = x < grosor || y < grosor || x >= ancho - grosor || y >= alto - grosor;
      if (!borde) continue;
      const i = (y * ancho + x) * 4;
      rs.push(datos[i]);
      gs.push(datos[i + 1]);
      bs.push(datos[i + 2]);
    }
  }
  const mediana3 = (a) => {
    a.sort((p, q) => p - q);
    return a[a.length >> 1] ?? 255;
  };
  return [mediana3(rs), mediana3(gs), mediana3(bs)];
}
function otsu(hist, total) {
  let suma = 0;
  for (let i = 0; i < 256; i++) suma += i * hist[i];
  let sumaB = 0;
  let pesoB = 0;
  let mejor = 0;
  let umbral = 0;
  for (let t = 0; t < 256; t++) {
    pesoB += hist[t];
    if (!pesoB) continue;
    const pesoF = total - pesoB;
    if (!pesoF) break;
    sumaB += t * hist[t];
    const mediaB = sumaB / pesoB;
    const mediaF = (suma - sumaB) / pesoF;
    const entre = pesoB * pesoF * (mediaB - mediaF) ** 2;
    if (entre > mejor) {
      mejor = entre;
      umbral = t;
    }
  }
  return umbral;
}

// lib/bordado/rejilla.ts
var MM_POR_PX_OBJETIVO = 0.05;
var PIXELES_MAXIMOS = 6e6;
var MARGEN_PX = 2;
function lienzoEnMm(anchoMm, altoMm) {
  const escala = Math.min(
    1,
    Math.sqrt(
      PIXELES_MAXIMOS / (anchoMm / MM_POR_PX_OBJETIVO * (altoMm / MM_POR_PX_OBJETIVO))
    )
  );
  const mmPorPx = MM_POR_PX_OBJETIVO / escala;
  const ancho = Math.max(4, Math.ceil(anchoMm / mmPorPx) + MARGEN_PX * 2);
  const alto = Math.max(4, Math.ceil(altoMm / mmPorPx) + MARGEN_PX * 2);
  const lienzo = new OffscreenCanvas(ancho, alto);
  const ctx = lienzo.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("No pudimos preparar el lienzo de bordado");
  ctx.setTransform(1 / mmPorPx, 0, 0, 1 / mmPorPx, MARGEN_PX, MARGEN_PX);
  return {
    ctx,
    ancho,
    alto,
    mmPorPx,
    desplazamientoMm: MARGEN_PX * mmPorPx
  };
}
function aRejilla(lienzo, umbralAlfa = 128) {
  const imagen = lienzo.ctx.getImageData(0, 0, lienzo.ancho, lienzo.alto);
  const datos = new Uint8Array(lienzo.ancho * lienzo.alto);
  for (let i = 0; i < datos.length; i++) {
    datos[i] = imagen.data[i * 4 + 3] >= umbralAlfa ? 1 : 0;
  }
  return {
    datos,
    ancho: lienzo.ancho,
    alto: lienzo.alto,
    mmPorPx: lienzo.mmPorPx
  };
}
function comoLa(rejilla, datos) {
  return {
    datos,
    ancho: rejilla.ancho,
    alto: rejilla.alto,
    mmPorPx: rejilla.mmPorPx
  };
}

// lib/bordado/raster.ts
var BITS = 5;
function llaveDe(r, g, b) {
  const s = 8 - BITS;
  return r >> s << BITS * 2 | g >> s << BITS | b >> s;
}
function deLlave(llave) {
  const s = 8 - BITS;
  const mascara = (1 << BITS) - 1;
  const medio3 = 1 << s - 1;
  return [
    ((llave >> BITS * 2 & mascara) << s) + medio3,
    ((llave >> BITS & mascara) << s) + medio3,
    ((llave & mascara) << s) + medio3
  ];
}
function deltaE2(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
function reducirPaleta(histograma, k) {
  const cubos = [...histograma.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([llave, cuenta]) => {
    const rgb3 = deLlave(llave);
    return { llave, cuenta, rgb: rgb3, lab: aLab2(rgb3[0], rgb3[1], rgb3[2]) };
  });
  if (!cubos.length)
    return { centros: [], asignacion: /* @__PURE__ */ new Map(), deltaMedio: 0 };
  const semillas = [cubos[0]];
  const candidatos = cubos.slice(0, 256);
  while (semillas.length < Math.min(k, cubos.length)) {
    let mejor = candidatos[0];
    let mejorD = -1;
    for (const c of candidatos) {
      let cerca = Infinity;
      for (const s of semillas) cerca = Math.min(cerca, deltaE2(c.lab, s.lab));
      const puntuacion = cerca * Math.log1p(c.cuenta);
      if (puntuacion > mejorD) {
        mejorD = puntuacion;
        mejor = c;
      }
    }
    if (semillas.includes(mejor)) break;
    semillas.push(mejor);
  }
  let centros = semillas.map((s) => ({
    lab: [...s.lab],
    rgb: s.rgb
  }));
  for (let vuelta = 0; vuelta < 12; vuelta++) {
    const sumas = centros.map(() => [0, 0, 0, 0, 0, 0, 0]);
    for (const cubo of cubos) {
      let mejor = 0;
      let mejorD = Infinity;
      for (let i = 0; i < centros.length; i++) {
        const d = deltaE2(cubo.lab, centros[i].lab);
        if (d < mejorD) {
          mejorD = d;
          mejor = i;
        }
      }
      const s = sumas[mejor];
      s[0] += cubo.lab[0] * cubo.cuenta;
      s[1] += cubo.lab[1] * cubo.cuenta;
      s[2] += cubo.lab[2] * cubo.cuenta;
      s[3] += cubo.rgb[0] * cubo.cuenta;
      s[4] += cubo.rgb[1] * cubo.cuenta;
      s[5] += cubo.rgb[2] * cubo.cuenta;
      s[6] += cubo.cuenta;
    }
    let movio = 0;
    centros = centros.map((centro, i) => {
      const s = sumas[i];
      if (!s[6]) return centro;
      const lab = [
        s[0] / s[6],
        s[1] / s[6],
        s[2] / s[6]
      ];
      movio = Math.max(movio, deltaE2(lab, centro.lab));
      return {
        lab,
        rgb: [
          Math.round(s[3] / s[6]),
          Math.round(s[4] / s[6]),
          Math.round(s[5] / s[6])
        ]
      };
    });
    if (movio < 0.3) break;
  }
  const asignacion = /* @__PURE__ */ new Map();
  let sumaDelta = 0;
  let total = 0;
  for (const cubo of cubos) {
    let mejor = 0;
    let mejorD = Infinity;
    for (let i = 0; i < centros.length; i++) {
      const d = deltaE2(cubo.lab, centros[i].lab);
      if (d < mejorD) {
        mejorD = d;
        mejor = i;
      }
    }
    asignacion.set(cubo.llave, mejor);
    sumaDelta += mejorD * cubo.cuenta;
    total += cubo.cuenta;
  }
  return {
    centros,
    asignacion,
    deltaMedio: total ? sumaDelta / total : 0
  };
}
function hexDe([r, g, b]) {
  return `#${[r, g, b].map((v2) => Math.max(0, Math.min(255, v2)).toString(16).padStart(2, "0")).join("")}`;
}
var DOMINANTES = 8;
function analizarOriginal(datos, primerPlano, ancho, alto, tintas) {
  const n2 = ancho * alto;
  const lab = new Float32Array(n2 * 3);
  for (let p = 0; p < n2; p++) {
    if (!primerPlano[p]) continue;
    const i = p * 4;
    const l = aLab2(datos[i], datos[i + 1], datos[i + 2]);
    lab[p * 3] = l[0];
    lab[p * 3 + 1] = l[1];
    lab[p * 3 + 2] = l[2];
  }
  const distanciaA = (p, q) => Math.hypot(
    lab[p * 3] - lab[q * 3],
    lab[p * 3 + 1] - lab[q * 3 + 1],
    lab[p * 3 + 2] - lab[q * 3 + 2]
  );
  const todos = /* @__PURE__ */ new Map();
  const interior = /* @__PURE__ */ new Map();
  let diseno = 0;
  let dentro2 = 0;
  let suaves = 0;
  for (let p = 0; p < n2; p++) {
    if (!primerPlano[p]) continue;
    diseno++;
    const i = p * 4;
    const llave = llaveDe(datos[i], datos[i + 1], datos[i + 2]);
    todos.set(llave, (todos.get(llave) ?? 0) + 1);
    const x = p % ancho;
    const y = p / ancho | 0;
    let mayor = 0;
    let vecinos = 0;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= ancho || ny >= alto) continue;
      const q = ny * ancho + nx;
      if (!primerPlano[q]) continue;
      vecinos++;
      mayor = Math.max(mayor, distanciaA(p, q));
    }
    if (vecinos < 4 || mayor >= 2) continue;
    dentro2++;
    interior.set(llave, (interior.get(llave) ?? 0) + 1);
    if (mayor >= 0.3) suaves++;
  }
  const reparto = (mapa, total, cuantos) => {
    if (!total) return { concentracion: 0, entropia: 0 };
    const cuentas = [...mapa.values()].sort((a, b) => b - a);
    return {
      concentracion: cuentas.slice(0, cuantos).reduce((s, v2) => s + v2, 0) / total,
      entropia: cuentas.reduce((h, c) => {
        const q = c / total;
        return h - q * Math.log2(q);
      }, 0)
    };
  };
  const global = reparto(todos, diseno, DOMINANTES);
  const dentroReparto = reparto(interior, dentro2, tintas);
  return {
    coloresDistintos: todos.size,
    concentracionDominante: Number(global.concentracion.toFixed(4)),
    entropia: Number(global.entropia.toFixed(3)),
    fraccionInterior: Number((dentro2 / Math.max(1, diseno)).toFixed(4)),
    concentracionInterior: Number(dentroReparto.concentracion.toFixed(4)),
    entropiaInterior: Number(dentroReparto.entropia.toFixed(3)),
    suavidadInterior: Number((suaves / Math.max(1, dentro2)).toFixed(4))
  };
}
function prepararPixeles(input) {
  const reloj = input.cronometro ?? crearCronometro();
  const coste = costeVacio();
  const lienzo = {
    ancho: input.ancho,
    alto: input.alto,
    mmPorPx: input.mmPorPx,
    desplazamientoMm: input.desplazamientoMm
  };
  const datos = input.datos;
  const n2 = lienzo.ancho * lienzo.alto;
  const inicioSegmentacion = typeof performance !== "undefined" ? performance.now() : Date.now();
  let minX = lienzo.ancho;
  let minY = lienzo.alto;
  let maxX = -1;
  let maxY = -1;
  for (let p = 0; p < n2; p++) {
    if (datos[p * 4 + 3] === 0) continue;
    const x = p % lienzo.ancho;
    const y = p / lienzo.ancho | 0;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  if (maxX < 0) {
    return vacio(lienzo.mmPorPx, {
      code: "IMAGEN_FUERA_DEL_AREA",
      message: "La imagen qued\xF3 fuera del \xE1rea de bordado.",
      severity: "reject"
    });
  }
  const dentroDelRecorte = (p) => {
    const x = p % lienzo.ancho;
    const y = p / lienzo.ancho | 0;
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  };
  let semi = 0;
  let conImagen = 0;
  for (let p = 0; p < n2; p++) {
    if (!dentroDelRecorte(p)) continue;
    conImagen++;
    const a = datos[p * 4 + 3];
    if (a < 250) semi++;
  }
  const conAlfa = semi > conImagen * 0.02;
  const primerPlano = new Uint8Array(n2);
  if (conAlfa) {
    for (let p = 0; p < n2; p++) {
      primerPlano[p] = datos[p * 4 + 3] >= 128 ? 1 : 0;
    }
  } else {
    const recorte2 = recortar(datos, lienzo.ancho, minX, minY, maxX, maxY);
    const [fr, fg, fb] = fondoDe(recorte2, maxX - minX + 1, maxY - minY + 1);
    const fondo = aLab2(fr, fg, fb);
    const distancia4 = new Float32Array(n2);
    let maxima = 0;
    for (let p = 0; p < n2; p++) {
      if (!dentroDelRecorte(p) || datos[p * 4 + 3] < 128) continue;
      const i = p * 4;
      const d = deltaE2(aLab2(datos[i], datos[i + 1], datos[i + 2]), fondo);
      distancia4[p] = d;
      if (d > maxima) maxima = d;
    }
    if (!(maxima > 0)) {
      return vacio(lienzo.mmPorPx, {
        code: "IMAGEN_DE_UN_SOLO_COLOR",
        message: "Esta imagen es de un solo color; no hay nada que bordar.",
        severity: "reject"
      });
    }
    const hist = new Uint32Array(256);
    for (let p = 0; p < n2; p++) {
      if (!dentroDelRecorte(p)) continue;
      hist[Math.min(255, distancia4[p] / maxima * 255 | 0)]++;
    }
    const corte = Math.max(1, otsu(hist, conImagen)) * (maxima / 255);
    for (let p = 0; p < n2; p++) {
      primerPlano[p] = distancia4[p] >= corte ? 1 : 0;
    }
  }
  reloj.sumar(
    "segmentacion",
    (typeof performance !== "undefined" ? performance.now() : Date.now()) - inicioSegmentacion
  );
  const histograma = /* @__PURE__ */ new Map();
  let pixelesDiseno = 0;
  let pixelesPrimerPlano = 0;
  for (let p = 0; p < n2; p++) pixelesPrimerPlano += primerPlano[p];
  try {
    exigir(
      "pixelesPrimerPlano",
      pixelesPrimerPlano,
      input.profile.presupuesto.maxPixelesPrimerPlano
    );
  } catch (error) {
    if (!esPresupuestoExcedido(error)) throw error;
    return excedido(lienzo.mmPorPx, error.recurso, reloj, coste);
  }
  for (let p = 0; p < n2; p++) {
    if (!primerPlano[p]) continue;
    pixelesDiseno++;
    const i = p * 4;
    const llave = llaveDe(datos[i], datos[i + 1], datos[i + 2]);
    histograma.set(llave, (histograma.get(llave) ?? 0) + 1);
  }
  if (!pixelesDiseno) {
    return vacio(lienzo.mmPorPx, {
      code: "IMAGEN_SIN_DISENO",
      message: "No encontramos ninguna forma que bordar en esta imagen.",
      severity: "reject"
    });
  }
  const r = input.profile.raster;
  const base = {
    sourceColorCount: histograma.size,
    hadAlpha: conAlfa,
    mmPorPx: Number(lienzo.mmPorPx.toFixed(4))
  };
  const original = reloj.medir(
    "analisisOriginal",
    () => analizarOriginal(
      datos,
      primerPlano,
      lienzo.ancho,
      lienzo.alto,
      r.maxColoresReducidos
    )
  );
  const entropia = original.entropia;
  if (original.suavidadInterior > r.maxSuavidadInterior) {
    return {
      objetos: [],
      incidencias: [],
      colores: /* @__PURE__ */ new Map(),
      conteo: { satin: 0, running: 0, fill: 0 },
      analisis: {
        ...base,
        reducedColorCount: 0,
        quantizationDeltaE: 0,
        classification: "photo",
        removedRegions: 0,
        removedAreaMm2: 0
      },
      rechazo: {
        code: "PHOTO",
        message: "Esta imagen tiene tonos que van cambiando poco a poco, y el bordado s\xF3lo puede hacer colores planos. Prueba con un logo o una ilustraci\xF3n de pocas tintas.",
        severity: "reject"
      },
      tiempos: reloj.etapas,
      coste,
      metricas: {
        gradientRatio: 0,
        texture: 0,
        colorEntropy: Number(entropia.toFixed(3)),
        alphaCoverage: Number(
          (pixelesDiseno / Math.max(1, conImagen)).toFixed(4)
        )
      },
      diagnostico: {
        ...original,
        componentesAntes: 0,
        componentesDespues: 0,
        regionesGrandes: 0,
        motas: 0,
        fraccionMotas: 0,
        areaEnMotas: 0
      }
    };
  }
  const paleta = reloj.medir("cuantizacion", () => {
    let elegida = reducirPaleta(histograma, 2);
    for (let k = 3; k <= Math.min(r.maxColoresReducidos, input.profile.limits.maxColors); k++) {
      if (elegida.deltaMedio <= r.deltaObjetivoDeltaE) break;
      const siguiente = reducirPaleta(histograma, k);
      if (siguiente.centros.length <= elegida.centros.length) break;
      elegida = siguiente;
    }
    return elegida;
  });
  const { centros, asignacion, deltaMedio } = paleta;
  const porPixel = new Int16Array(n2).fill(-1);
  for (let p = 0; p < n2; p++) {
    if (!primerPlano[p]) continue;
    const i = p * 4;
    porPixel[p] = asignacion.get(llaveDe(datos[i], datos[i + 1], datos[i + 2])) ?? 0;
  }
  let gradiente = 0;
  for (const [llave, cuenta] of histograma) {
    const centro = centros[asignacion.get(llave) ?? 0];
    const rgb3 = deLlave(llave);
    if (deltaE2(aLab2(rgb3[0], rgb3[1], rgb3[2]), centro.lab) > 10)
      gradiente += cuenta;
  }
  const gradientRatio = gradiente / pixelesDiseno;
  let bordes = 0;
  for (let p = 0; p < n2; p++) {
    if (porPixel[p] < 0) continue;
    const x = p % lienzo.ancho;
    if (x + 1 < lienzo.ancho && porPixel[p + 1] >= 0 && porPixel[p + 1] !== porPixel[p])
      bordes++;
  }
  const metricas2 = {
    gradientRatio: Number(gradientRatio.toFixed(4)),
    texture: Number((bordes / pixelesDiseno).toFixed(4)),
    colorEntropy: Number(entropia.toFixed(3)),
    alphaCoverage: Number((pixelesDiseno / Math.max(1, conImagen)).toFixed(4))
  };
  const mascaras = [];
  let regionesGrandes = 0;
  let motas = 0;
  let pixelesEnMotas = 0;
  let componentesAntes = 0;
  let componentesDespues = 0;
  for (let c = 0; c < centros.length; c++) {
    const mascara = new Uint8Array(n2);
    let cuantos = 0;
    for (let p = 0; p < n2; p++) {
      if (porPixel[p] === c) {
        mascara[p] = 1;
        cuantos++;
      }
    }
    const cruda = comoLa(rejillaVacia(lienzo), mascara);
    componentesAntes += reloj.medir(
      "analisisComponentes",
      () => componentes(cruda).length
    );
    const limpia = reloj.medir("limpieza", () => limpiar(cruda));
    mascaras.push(limpia.datos);
    if (!cuantos) continue;
    const partes = reloj.medir(
      "analisisComponentes",
      () => componentes(limpia)
    );
    componentesDespues += partes.length;
    for (const parte of partes) {
      const area2 = parte.pixeles.length * lienzo.mmPorPx * lienzo.mmPorPx;
      if (area2 >= input.profile.geometria.minAreaMm2) regionesGrandes++;
      else {
        motas++;
        pixelesEnMotas += parte.pixeles.length;
      }
    }
  }
  const fraccionMotas = motas / Math.max(1, regionesGrandes + motas);
  const areaEnMotas = pixelesEnMotas / pixelesDiseno;
  const diagnostico = {
    ...original,
    componentesAntes,
    componentesDespues,
    regionesGrandes,
    motas,
    fraccionMotas: Number(fraccionMotas.toFixed(4)),
    areaEnMotas: Number(areaEnMotas.toFixed(4))
  };
  try {
    exigir(
      "componentes",
      componentesDespues,
      input.profile.presupuesto.maxComponentes
    );
  } catch (error) {
    if (!esPresupuestoExcedido(error)) throw error;
    return excedido(lienzo.mmPorPx, error.recurso, reloj, coste, diagnostico);
  }
  if (deltaMedio > r.maxPerdidaCuantizacionDeltaE) {
    return {
      objetos: [],
      incidencias: [],
      colores: /* @__PURE__ */ new Map(),
      conteo: { satin: 0, running: 0, fill: 0 },
      analisis: {
        ...base,
        reducedColorCount: centros.length,
        quantizationDeltaE: Number(deltaMedio.toFixed(2)),
        classification: "photo",
        removedRegions: motas,
        removedAreaMm2: 0
      },
      rechazo: {
        code: "COLOR_IRREPRESENTABLE",
        message: `No pudimos reducir esta imagen a ${centros.length} hilos sin cambiarle los colores de forma visible.`,
        severity: "reject"
      },
      tiempos: reloj.etapas,
      coste,
      metricas: metricas2,
      diagnostico
    };
  }
  const clasificacion = regionesGrandes > r.maxComponentesLogo ? "illustration" : "logo";
  const incidencias = [];
  if (clasificacion === "illustration") {
    incidencias.push({
      code: "ILLUSTRATION_REVIEW",
      message: `Este dise\xF1o tiene ${regionesGrandes} piezas; alguien del taller lo revisar\xE1 antes de bordarlo.`,
      severity: "review"
    });
  }
  const objetos = [];
  const colores = /* @__PURE__ */ new Map();
  const conteo = { satin: 0, running: 0, fill: 0 };
  let eliminadas = 0;
  let eliminadasMm2 = 0;
  try {
    for (let c = 0; c < centros.length; c++) {
      const mascara = mascaras[c];
      if (!mascara.some((v2) => v2 === 1)) continue;
      const hex2 = hexDe(centros[c].rgb);
      const colorId = colorIdDe(hex2);
      colores.set(colorId, hex2);
      const resultado2 = objetosDeMascara({
        cronometro: reloj,
        coste,
        rejilla: comoLa(rejillaVacia(lienzo), mascara),
        profile: input.profile,
        colorId,
        sourceObjectId: input.sourceObjectId,
        sourceType: "raster",
        classification: clasificacion,
        prefijo: `${input.prefijo}-t${c}`,
        desplazamientoMm: lienzo.desplazamientoMm
      });
      objetos.push(...resultado2.objetos);
      incidencias.push(...resultado2.incidencias);
      conteo.satin += resultado2.conteo.satin;
      conteo.running += resultado2.conteo.running;
      conteo.fill += resultado2.conteo.fill;
      eliminadas += resultado2.eliminadas;
      eliminadasMm2 += resultado2.eliminadasMm2;
    }
  } catch (error) {
    if (!esPresupuestoExcedido(error)) throw error;
    return excedido(lienzo.mmPorPx, error.recurso, reloj, coste, diagnostico);
  }
  if (eliminadas > 0) {
    incidencias.push({
      code: "DETALLE_PERDIDO",
      message: `Quitamos ${eliminadas} detalle(s) demasiado peque\xF1o(s) para bordarse a este tama\xF1o.`,
      severity: "review"
    });
  }
  if (deltaMedio > r.deltaObjetivoDeltaE) {
    incidencias.push({
      code: "PALETA_FORZADA",
      message: "Tuvimos que simplificar bastante los colores; el bordado no se parecer\xE1 del todo al original.",
      severity: "review"
    });
  }
  return {
    objetos,
    incidencias: incidencias.filter(
      (issue, i, todos) => todos.findIndex((y) => y.code === issue.code) === i
    ),
    colores,
    conteo,
    analisis: {
      ...base,
      reducedColorCount: colores.size,
      quantizationDeltaE: Number(deltaMedio.toFixed(2)),
      classification: clasificacion,
      removedRegions: eliminadas,
      removedAreaMm2: Number(eliminadasMm2.toFixed(3))
    },
    tiempos: reloj.etapas,
    coste,
    metricas: metricas2,
    diagnostico
  };
}
function excedido(mmPorPx, recurso, reloj, coste, diagnostico) {
  const vacia = vacio(mmPorPx, incidenciaDeComplejidad());
  return {
    ...vacia,
    rechazo: void 0,
    incidencias: [incidenciaDeComplejidad()],
    presupuestoAgotado: recurso,
    tiempos: reloj.etapas,
    coste,
    diagnostico: diagnostico ?? vacia.diagnostico
  };
}
function rejillaVacia(lienzo) {
  return {
    datos: new Uint8Array(0),
    ancho: lienzo.ancho,
    alto: lienzo.alto,
    mmPorPx: lienzo.mmPorPx
  };
}
function recortar(datos, ancho, minX, minY, maxX, maxY) {
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const salida2 = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const desde = ((minY + y) * ancho + minX) * 4;
    salida2.set(datos.subarray(desde, desde + w * 4), y * w * 4);
  }
  return salida2;
}
function vacio(mmPorPx, rechazo) {
  return {
    objetos: [],
    incidencias: [],
    colores: /* @__PURE__ */ new Map(),
    conteo: { satin: 0, running: 0, fill: 0 },
    analisis: {
      sourceColorCount: 0,
      reducedColorCount: 0,
      quantizationDeltaE: 0,
      classification: "logo",
      removedRegions: 0,
      removedAreaMm2: 0,
      hadAlpha: false,
      mmPorPx: Number(mmPorPx.toFixed(4))
    },
    rechazo,
    metricas: {
      gradientRatio: 0,
      texture: 0,
      colorEntropy: 0,
      alphaCoverage: 0
    },
    tiempos: {},
    coste: costeVacio(),
    diagnostico: {
      coloresDistintos: 0,
      concentracionDominante: 0,
      entropia: 0,
      fraccionInterior: 0,
      concentracionInterior: 0,
      entropiaInterior: 0,
      suavidadInterior: 0,
      componentesAntes: 0,
      componentesDespues: 0,
      regionesGrandes: 0,
      motas: 0,
      fraccionMotas: 0,
      areaEnMotas: 0
    }
  };
}

// lib/bordado/preparar.ts
var BordadoRechazado = class extends Error {
  constructor(incidencias) {
    super(incidencias[0]?.message ?? "Este dise\xF1o no se puede bordar");
    this.name = "BordadoRechazado";
    this.incidencias = incidencias;
  }
};
function dedupe(lista2) {
  return lista2.filter(
    (issue, i, todos) => todos.findIndex((y) => y.code === issue.code) === i
  );
}
function prepararConProfile(solicitud, profile, opciones = {}) {
  const reloj = crearCronometro();
  const colores = /* @__PURE__ */ new Map();
  const objetos = [];
  const estructura = [];
  const regularizacion = {
    regiones: 0,
    descartadas: [],
    desvioMaxMm: 0
  };
  const sumarRegularizacion = (preparado) => {
    for (const m of preparado.modificaciones) {
      if (m.tipo !== "regularizacion") continue;
      if (m.motivo.startsWith("regularizaci\xF3n descartada"))
        regularizacion.descartadas.push(m.motivo);
      else {
        regularizacion.regiones++;
        regularizacion.desvioMaxMm = Math.max(
          regularizacion.desvioMaxMm,
          m.desviacionMm ?? 0
        );
      }
    }
  };
  const verdad = [];
  const linaje = [];
  const incidencias = [];
  const rechazos = [];
  const conteoTexto = { satin: 0, running: 0, fill: 0 };
  let analisisRaster;
  let metricasRaster;
  for (let i = 0; i < solicitud.fuentes.length; i++) {
    const fuente = solicitud.fuentes[i];
    const prefijo = `o${i}`;
    if (fuente.tipo === "raster" && fuente.vectorizar && profile.vector) {
      const preparado = reloj.medir(
        "vectorial",
        () => objetosDeRasterSincrono({
          datos: fuente.datos,
          ancho: fuente.ancho,
          alto: fuente.alto,
          mmPorPx: fuente.mmPorPx,
          destino: {
            x: -fuente.desplazamientoMm,
            y: -fuente.desplazamientoMm,
            ancho: fuente.ancho * fuente.mmPorPx,
            alto: fuente.alto * fuente.mmPorPx
          },
          profile,
          area: { anchoMm: solicitud.widthMm, altoMm: solicitud.heightMm },
          prefijo,
          sourceObjectId: fuente.sourceObjectId,
          idDeColor: colorIdDe,
          alVectorizar: opciones.observador?.alVectorizar ? (raster) => opciones.observador?.alVectorizar?.(raster, i) : void 0
        })
      );
      opciones.observador?.alPrepararImagen?.(preparado, i);
      if (!preparado.raster.omitido) {
        for (const color of preparado.colores) colores.set(color.id, color.hex);
        objetos.push(...preparado.objetos);
        estructura.push(...ejesParaElMotor(preparado, prefijo));
        sumarRegularizacion(preparado);
        const v2 = verdadParaElMotor(preparado, prefijo);
        if (v2) verdad.push(v2);
        const l = linajeParaElMotor(preparado, prefijo);
        if (l) linaje.push(l);
        for (const incidencia of preparado.incidencias)
          (incidencia.severity === "reject" ? rechazos : incidencias).push(
            incidencia
          );
        continue;
      }
      incidencias.push(...preparado.incidencias);
    }
    if (fuente.tipo === "raster") {
      const preparado = prepararPixeles({
        datos: fuente.datos,
        ancho: fuente.ancho,
        alto: fuente.alto,
        mmPorPx: fuente.mmPorPx,
        desplazamientoMm: fuente.desplazamientoMm,
        profile,
        sourceObjectId: fuente.sourceObjectId,
        prefijo,
        cronometro: reloj
      });
      if (preparado.rechazo) {
        rechazos.push(preparado.rechazo);
        continue;
      }
      if (preparado.presupuestoAgotado) {
        throw new BordadoRechazado([incidenciaDeComplejidad()]);
      }
      for (const [id, hex2] of preparado.colores) colores.set(id, hex2);
      objetos.push(...preparado.objetos);
      incidencias.push(...preparado.incidencias);
      analisisRaster = preparado.analisis;
      metricasRaster = preparado.metricas;
      continue;
    }
    try {
      if (fuente.tipo === "svg") {
        if (profile.vector) {
          const preparado = reloj.medir(
            "vectorial",
            () => objetosDeSvg({
              svg: fuente.marcado,
              destino: fuente.cajaMm,
              matriz: fuente.matriz,
              profile,
              area: { anchoMm: solicitud.widthMm, altoMm: solicitud.heightMm },
              prefijo,
              sourceObjectId: fuente.sourceObjectId,
              idDeColor: colorIdDe,
              enrutar: opciones.enrutar
            })
          );
          for (const color of preparado.colores)
            colores.set(color.id, color.hex);
          objetos.push(...preparado.objetos);
          for (const incidencia of preparado.incidencias)
            (incidencia.severity === "reject" ? rechazos : incidencias).push(
              incidencia
            );
          estructura.push(...ejesParaElMotor(preparado, prefijo));
          sumarRegularizacion(preparado);
          const v2 = verdadParaElMotor(preparado, prefijo);
          if (v2) verdad.push(v2);
          const l = linajeParaElMotor(preparado, prefijo);
          if (l) linaje.push(l);
          continue;
        }
        const lectura = leerSvg(fuente.marcado, {
          destino: fuente.cajaMm,
          matriz: fuente.matriz
        });
        normalizarCapas(lectura.capas, { profile }).bloques.forEach(
          (bloque, k) => {
            const hex2 = normalizarHex(bloque.color);
            colores.set(colorIdDe(hex2), hex2);
            const lienzo = lienzoEnMm(solicitud.widthMm, solicitud.heightMm);
            lienzo.ctx.fillStyle = "#000000";
            lienzo.ctx.fill(
              new Path2D(
                bloque.regiones.flatMap((r) => [r.exterior, ...r.huecos]).map(
                  (anillo) => `M${anillo.map(([x, y]) => `${x} ${y}`).join("L")}Z`
                ).join("")
              ),
              "evenodd"
            );
            objetos.push(
              ...objetosDeMascara({
                rejilla: aRejilla(lienzo),
                profile,
                colorId: colorIdDe(hex2),
                sourceObjectId: fuente.sourceObjectId,
                sourceType: "vector",
                classification: "logo",
                prefijo: `${prefijo}-v${k}`,
                desplazamientoMm: lienzo.desplazamientoMm,
                cronometro: reloj
              }).objetos
            );
          }
        );
        continue;
      }
      if (fuente.tipo === "texto") {
        const hex2 = normalizarHex(fuente.colorHex);
        colores.set(colorIdDe(hex2), hex2);
        const preparado = profile.vector ? reloj.medir(
          "vectorial",
          () => objetosVectoriales({
            d: fuente.d,
            regla: "nonzero",
            colorId: colorIdDe(hex2),
            profile,
            area: {
              anchoMm: solicitud.widthMm,
              altoMm: solicitud.heightMm
            },
            prefijo,
            sourceObjectId: fuente.sourceObjectId,
            sourceType: "text",
            classification: "text",
            esTexto: true
          })
        ) : (() => {
          const lienzo = lienzoEnMm(solicitud.widthMm, solicitud.heightMm);
          lienzo.ctx.fillStyle = "#000000";
          lienzo.ctx.fill(new Path2D(fuente.d), "nonzero");
          return objetosDeMascara({
            rejilla: aRejilla(lienzo),
            profile,
            colorId: colorIdDe(hex2),
            sourceObjectId: fuente.sourceObjectId,
            sourceType: "text",
            classification: "text",
            prefijo,
            desplazamientoMm: lienzo.desplazamientoMm,
            esTexto: true,
            cronometro: reloj
          });
        })();
        objetos.push(...preparado.objetos);
        for (const incidencia of preparado.incidencias) {
          (incidencia.severity === "reject" ? rechazos : incidencias).push(
            incidencia
          );
        }
        conteoTexto.satin += preparado.conteo.satin;
        conteoTexto.running += preparado.conteo.running;
        conteoTexto.fill += preparado.conteo.fill;
        continue;
      }
      let indice = 0;
      for (const grupo of fuente.porColor) {
        const hex2 = normalizarHex(grupo.hex);
        colores.set(colorIdDe(hex2), hex2);
        if (profile.vector) {
          const preparado = reloj.medir(
            "vectorial",
            () => objetosVectoriales({
              d: grupo.caminos.join(" "),
              regla: "nonzero",
              colorId: colorIdDe(hex2),
              profile,
              area: {
                anchoMm: solicitud.widthMm,
                altoMm: solicitud.heightMm
              },
              prefijo: `${prefijo}-v${indice++}`,
              sourceObjectId: fuente.sourceObjectId,
              sourceType: "vector",
              classification: "logo"
            })
          );
          objetos.push(...preparado.objetos);
          incidencias.push(...preparado.incidencias);
          continue;
        }
        const lienzo = lienzoEnMm(solicitud.widthMm, solicitud.heightMm);
        lienzo.ctx.fillStyle = "#000000";
        for (const camino of grupo.caminos)
          lienzo.ctx.fill(new Path2D(camino), "nonzero");
        objetos.push(
          ...objetosDeMascara({
            rejilla: aRejilla(lienzo),
            profile,
            colorId: colorIdDe(hex2),
            sourceObjectId: fuente.sourceObjectId,
            sourceType: "vector",
            classification: "logo",
            prefijo: `${prefijo}-v${indice++}`,
            desplazamientoMm: lienzo.desplazamientoMm,
            cronometro: reloj
          }).objetos
        );
      }
    } catch (error) {
      if (!esPresupuestoExcedido(error)) throw error;
      throw new BordadoRechazado([incidenciaDeComplejidad()]);
    }
  }
  if (rechazos.length) throw new BordadoRechazado(dedupe(rechazos));
  if (!objetos.length)
    throw new Error("No encontramos trazos fabricables en este dise\xF1o");
  if (objetos.length > profile.limits.maxObjects)
    throw new BordadoRechazado([
      {
        code: "TOO_COMPLEX",
        message: "Este dise\xF1o tiene demasiadas piezas para bordarse autom\xE1ticamente. Simplif\xEDcalo e int\xE9ntalo de nuevo.",
        severity: "reject"
      }
    ]);
  if (colores.size > profile.limits.maxColors)
    throw new BordadoRechazado([
      {
        code: "DEMASIADOS_HILOS",
        message: `El bordado admite hasta ${profile.limits.maxColors} hilos y este dise\xF1o necesita ${colores.size}.`,
        severity: "reject"
      }
    ]);
  const caja = objetos.reduce(
    (todo, objeto2) => ({
      xMm: Math.min(todo.xMm, objeto2.bounds.xMm),
      yMm: Math.min(todo.yMm, objeto2.bounds.yMm),
      maxX: Math.max(todo.maxX, objeto2.bounds.xMm + objeto2.bounds.widthMm),
      maxY: Math.max(todo.maxY, objeto2.bounds.yMm + objeto2.bounds.heightMm)
    }),
    { xMm: Infinity, yMm: Infinity, maxX: -Infinity, maxY: -Infinity }
  );
  const preparation = {
    profileVersion: profile.version,
    raster: analisisRaster,
    texto: conteoTexto.satin + conteoTexto.running + conteoTexto.fill ? {
      satinColumns: conteoTexto.satin,
      runningPaths: conteoTexto.running,
      fillAreas: conteoTexto.fill
    } : void 0,
    issues: dedupe(incidencias),
    ...estructura.length ? {
      estructura,
      /* V6.5.0: con qué política física por ancho se decidieron sus
         estructuras finas (para calibrarla con costuras). */
      thinStructurePolicy: {
        ...THIN_STRUCTURE_POLICY,
        fillMinWidthMm: profile.quality.maxSatinWidthMm
      }
    } : {},
    ...verdad.length ? { verdad } : {},
    ...linaje.length ? { linaje } : {},
    ...regularizacion.regiones || regularizacion.descartadas.length ? {
      regularizacion: {
        ...regularizacion,
        desvioMaxMm: Number(regularizacion.desvioMaxMm.toFixed(3))
      }
    } : {}
  };
  const design = {
    schemaVersion: EMBROIDERY_SCHEMA_VERSION,
    sourceSnapshotHash: solicitud.sourceSnapshotHash,
    productId: solicitud.productId,
    sideId: solicitud.sideId,
    physical: { widthMm: solicitud.widthMm, heightMm: solicitud.heightMm },
    bounds: {
      xMm: Math.max(0, caja.xMm),
      yMm: Math.max(0, caja.yMm),
      widthMm: Math.min(solicitud.widthMm, caja.maxX - Math.max(0, caja.xMm)),
      heightMm: Math.min(solicitud.heightMm, caja.maxY - Math.max(0, caja.yMm))
    },
    colors: [...colores.entries()].map(([id, valor], orden) => ({
      id,
      sourceHex: valor,
      displayHex: valor,
      order: orden
    })),
    objects: objetos,
    metrics: {
      componentCount: objetos.length,
      nodeCount: objetos.reduce((suma, objeto2) => suma + objeto2.nodeCount, 0),
      colorCount: colores.size,
      widthMm: solicitud.widthMm,
      heightMm: solicitud.heightMm,
      ...metricasRaster ?? {}
    },
    preparation,
    profileVersion: profile.version,
    engineVersion: INKSTITCH_ENGINE_VERSION
  };
  return { design, tiempos: reloj.etapas };
}
function preparar(solicitud, opciones = {}) {
  return prepararConProfile(
    solicitud,
    perfilDeLaSolicitud(solicitud),
    opciones
  );
}
function perfilDeLaSolicitud(solicitud) {
  return perfilDeFuentes(solicitud.fuentes);
}
var MAXIMO_DE_PIEZAS_DE_VERDAD = 400;
function verdadParaElMotor(preparado, prefijo) {
  const v2 = preparado.verdad;
  if (!v2) return null;
  const {
    colores: coloresDeMalla,
    capaConfianzaColor,
    ...m
  } = mallaDeVerdad(v2, void 0, preparado.colorDeVerdad);
  const final = preparado.topologia?.final ?? {};
  const f3 = (x) => Number(x.toFixed(2));
  const piezas = v2.componentes.filter((p) => p.estructural).sort((a, b) => b.areaMm2 - a.areaMm2);
  const counters = v2.huecos.filter((h) => h.counter);
  return {
    id: prefijo,
    origen: v2.origen,
    resolucionMm: Number(v2.resolucionMm.toFixed(4)),
    componentes: piezas.slice(0, MAXIMO_DE_PIEZAS_DE_VERDAD).map((p) => ({
      id: `${prefijo}-${p.id}`,
      sondas: p.sondas.map(([x, y]) => [f3(x), f3(y)]),
      anchoMm: p.anchoMm,
      incierto: p.incierto,
      enIR: final[p.id] ?? "conservada"
    })),
    counters: counters.slice(0, MAXIMO_DE_PIEZAS_DE_VERDAD).map((h) => ({
      id: `${prefijo}-${h.id}`,
      polo: [f3(h.polo[0]), f3(h.polo[1])],
      anchoMm: h.anchoMm,
      incierto: h.incierto,
      enIR: final[h.id] ?? "conservada"
    })),
    huella: v2.huella,
    countersIR: (preparado.topologia?.countersFinales ?? []).slice(0, MAXIMO_DE_PIEZAS_DE_VERDAD).map((h) => ({
      polo: [f3(h.polo[0]), f3(h.polo[1])],
      anchoMm: h.anchoMm
    })),
    // V6.4.3: la verdad como malla (pieza y color por celda) para medir cobertura en el DST.
    // Viajan TODAS las piezas (también los detalles no estructurales): lo que no se cose hay que poder medirlo.
    malla: {
      ...m,
      piezas: v2.componentes.map((p) => ({
        id: `${prefijo}-${p.id}`,
        estructural: p.estructural,
        incierto: p.incierto,
        ...p.motivos?.length ? { motivos: [...p.motivos] } : {},
        anchoMm: Number(p.anchoMm.toFixed(3)),
        areaMm2: Number(p.areaMm2.toFixed(3))
      })),
      colores: coloresDeMalla,
      ...capaConfianzaColor ? { capaConfianzaColor } : {}
    },
    betti: (preparado.topologia?.betti ?? []).map((b) => ({
      frontera: b.frontera,
      componentes: b.componentes,
      counters: b.counters
    })),
    ...piezas.length > MAXIMO_DE_PIEZAS_DE_VERDAD || counters.length > MAXIMO_DE_PIEZAS_DE_VERDAD ? { truncado: true } : {}
  };
}
function linajeParaElMotor(preparado, prefijo) {
  const l = preparado.linaje;
  if (!l) return null;
  const historia = (x) => ({
    id: x.id,
    atomos: x.atomos,
    destino: x.historia.destino,
    ...x.historia.etapa ? { etapa: x.historia.etapa } : {},
    sucesos: x.historia.sucesos,
    regiones: x.historia.regiones,
    objetos: x.historia.objetos
  });
  return {
    id: prefijo,
    nodos: l.nodos.map(({ ancestros: _a, ...n2 }) => n2),
    grupos: l.grupos.map(historia),
    piezas: l.piezas.map(historia),
    divergencias: l.divergencias.length,
    ...l.divergenciasVectorizacion ? { divergenciasVectorizacion: l.divergenciasVectorizacion.length } : {}
  };
}
function ejesParaElMotor(preparado, prefijo) {
  const f3 = (v2) => Number(v2.toFixed(2));
  return (preparado.estructura?.grupos ?? []).filter((g) => g.estructural && g.clase !== "AREA" && g.largoEjeMm >= 1).map((g) => ({
    id: `${prefijo}-${g.id}`,
    largoMm: g.largoEjeMm,
    ejes: g.ejesEstructurales.map((eje) => {
      const puntos = [];
      for (const p of eje) {
        const u4 = puntos[puntos.length - 1];
        if (!u4 || Math.hypot(p[0] - u4[0], p[1] - u4[1]) >= 0.2)
          puntos.push(p);
      }
      const ultimo = eje[eje.length - 1];
      if (puntos[puntos.length - 1] !== ultimo) puntos.push(ultimo);
      return puntos.length >= 2 ? `M${puntos.map((p) => `${f3(p[0])} ${f3(p[1])}`).join("L")}` : "";
    }).filter(Boolean),
    ...g.uniones.length ? {
      uniones: g.uniones.map((p) => [f3(p[0]), f3(p[1])])
    } : {},
    /* V6.5.0 — LA ESTRUCTURA FINA (ThinStructure): su forma como trazo
       (clase, perfil de ancho, extremos, lazos, counters), de qué piezas
       de la verdad sale, cuánto pesa en la forma y cómo llegó al IR. El
       eje es auxiliar: la geometría sigue siendo el contorno. */
    clase: g.clase,
    anchoMm: {
      minimo: g.anchoMm.minimo,
      mediana: g.anchoMm.mediana,
      maximo: g.anchoMm.maximo
    },
    extremos: g.extremos.map((p) => [f3(p[0]), f3(p[1])]),
    lazos: g.lazos,
    counters: g.counters,
    importancia: g.importancia,
    piezas: (g.piezas ?? []).map((id) => `${prefijo}-${id}`),
    ir: {
      recall: g.cobertura.coverageRatio,
      perdidoMm: g.cobertura.missingLengthMm,
      huecoMaxMm: g.cobertura.longestMissingSegmentMm,
      ...g.expansion ? {
        anchoAntesMm: g.expansion.originalWidthMm,
        anchoDespuesMm: g.expansion.finalWidthMm,
        expansionMm: g.expansion.expansionMm,
        expansionRatio: g.expansion.expansionRatio
      } : {},
      incidencias: g.incidenciasFinas
    }
  }));
}

// lib/bordado/servidor.ts
var VERSION_DEL_NUCLEO = true ? "e908a307e3a071d2919a0be1e20bcbf2c7be27d35728b609486972beeef63293" : "desarrollo";
var ALGORITMO = "v6.2-server-authoritative";
var sha256 = (datos) => (0, import_node_crypto.createHash)("sha256").update(datos).digest("hex");
function abrirRaster(f3) {
  const esperado = f3.ancho * f3.alto * 4;
  let crudo;
  try {
    crudo = (0, import_node_zlib.inflateSync)(Buffer.from(f3.rgba.datos, "base64"), {
      // Un byte de más ya es un original que no es lo que dice ser.
      maxOutputLength: esperado + 1
    });
  } catch (error) {
    if (error.code === "ERR_BUFFER_TOO_LARGE")
      throw new ErrorDeOriginal("RASTER_TAMANO_INCORRECTO", "m\xE1s p\xEDxeles de los declarados");
    throw new ErrorDeOriginal("RASTER_ILEGIBLE");
  }
  if (crudo.length !== esperado)
    throw new ErrorDeOriginal("RASTER_TAMANO_INCORRECTO", `${crudo.length} \u2260 ${esperado}`);
  if (sha256(crudo) !== f3.rgba.sha256)
    throw new ErrorDeOriginal("RASTER_HASH_INCORRECTO");
  return new Uint8ClampedArray(crudo.buffer, crudo.byteOffset, crudo.byteLength);
}
function aSolicitud(o) {
  const fuentes = o.fuentes.map((f3) => {
    if (f3.tipo === "raster") {
      const { rgba: _, ...resto } = f3;
      return { ...resto, datos: abrirRaster(f3) };
    }
    if (f3.tipo === "svg") {
      let marcado;
      try {
        marcado = sanearSvg(f3.marcado).marcado;
      } catch (error) {
        throw new ErrorDeOriginal("SVG_ILEGIBLE", error.message);
      }
      return { ...f3, marcado };
    }
    return f3;
  });
  return {
    revision: 0,
    productId: o.productId,
    sideId: o.sideId,
    widthMm: o.widthMm,
    heightMm: o.heightMm,
    sourceSnapshotHash: o.sourceSnapshotHash,
    fuentes
  };
}
var conFuente = (i) => ({
  ...i,
  source: "SERVER_STRUCTURAL"
});
function verdadDeLaPista(pista) {
  const p = pista;
  const lista2 = p && typeof p === "object" ? p.preparation?.verdad : void 0;
  if (!Array.isArray(lista2)) return null;
  return lista2.slice(0, 64).map((v2) => {
    const x = v2 ?? {};
    const cuenta = (k) => Array.isArray(x[k]) ? x[k].length : -1;
    const inciertos = (k) => Array.isArray(x[k]) ? x[k].filter((y) => y?.incierto === true).length : -1;
    return {
      id: typeof x.id === "string" ? x.id : "",
      componentes: cuenta("componentes"),
      counters: cuenta("counters"),
      inciertos: inciertos("componentes") + inciertos("counters"),
      huella: typeof x.huella === "string" ? x.huella : ""
    };
  });
}
function diagnosticar(design, pista) {
  if (pista === void 0 || pista === null)
    return { cliente: { presente: false }, deriva: [] };
  let designHash;
  try {
    designHash = sha256(canonicalJson(pista));
  } catch {
  }
  const issuesCrudas = pista?.preparation?.issues;
  const incidencias = Array.isArray(issuesCrudas) ? issuesCrudas.slice(0, 64).flatMap((i) => {
    const x = i ?? {};
    return typeof x.code === "string" ? [
      {
        code: x.code.slice(0, 80),
        message: typeof x.message === "string" ? x.message.slice(0, 300) : "",
        severity: x.severity === "review" || x.severity === "reject" ? x.severity : "info",
        source: "CLIENT_PREVIEW"
      }
    ] : [];
  }) : void 0;
  const deriva = [];
  const suya = verdadDeLaPista(pista);
  const nuestra = design?.preparation?.verdad ?? [];
  if (design && suya) {
    const porId = new Map(suya.map((v2) => [v2.id, v2]));
    let distintas = 0;
    const m = {};
    nuestra.forEach((v2, k) => {
      const c = porId.get(v2.id);
      const inc = v2.componentes.filter((p) => p.incierto).length + v2.counters.filter((h) => h.incierto).length;
      const igual = c && c.componentes === v2.componentes.length && c.counters === v2.counters.length && c.inciertos === inc && (!c.huella || !v2.huella || c.huella === v2.huella);
      if (!igual) {
        distintas++;
        m[`servidor_${k}_componentes`] = v2.componentes.length;
        m[`servidor_${k}_counters`] = v2.counters.length;
        m[`cliente_${k}_componentes`] = c?.componentes ?? -1;
        m[`cliente_${k}_counters`] = c?.counters ?? -1;
      }
    });
    if (suya.length !== nuestra.length) distintas++;
    if (distintas)
      deriva.push({
        code: "CLIENT_SERVER_DRIFT",
        message: `La verdad estructural del navegador no coincide con la del servidor en ${distintas} fuente(s); vale la del servidor.`,
        severity: "info",
        source: "SERVER_DIAGNOSTIC",
        metrics: { fuentes: distintas, ...m }
      });
  }
  let mismoDiseno;
  try {
    const suyos = pista?.objects;
    if (design && Array.isArray(suyos))
      mismoDiseno = sha256(canonicalJson(suyos)) === sha256(canonicalJson(design.objects));
  } catch {
    mismoDiseno = false;
  }
  return {
    cliente: {
      presente: true,
      ...designHash ? { designHash } : {},
      ...mismoDiseno !== void 0 ? { mismoDiseno } : {},
      ...incidencias ? { incidencias } : {}
    },
    deriva
  };
}
function prepararEnServidor(original, pista, politica = POLITICA_POR_DEFECTO, opciones = {}) {
  const t0 = performance.now();
  const ms = () => Math.round(performance.now() - t0);
  let o;
  let solicitud;
  try {
    o = aplicarPolitica(validarSolicitudOriginal(original), politica);
    solicitud = aSolicitud(o);
  } catch (error) {
    if (error instanceof ErrorDeOriginal)
      return { estado: "invalido", codigo: error.codigo, detalle: error.detalle, ms: ms() };
    throw error;
  }
  const originalHash = sha256(canonicalJson(contenidoDelOriginal(o)));
  let design;
  try {
    design = preparar(solicitud, opciones).design;
  } catch (error) {
    if (error instanceof BordadoRechazado) {
      const incidencias = error.incidencias.map(conFuente);
      return {
        estado: "rechazado",
        incidencias,
        autoridad: {
          algoritmo: ALGORITMO,
          nucleo: VERSION_DEL_NUCLEO,
          profileVersion: "",
          engineVersion: INKSTITCH_ENGINE_VERSION,
          originalHash
        },
        diagnostico: diagnosticar(null, pista),
        ms: ms()
      };
    }
    if (error instanceof ReferenceError)
      return { estado: "no-verificable", codigo: "SERVER_CANNOT_PREPARE", detalle: error.message, ms: ms() };
    return {
      estado: "rechazado",
      incidencias: [
        {
          code: "SERVER_PREPARATION_FAILED",
          message: error?.message?.slice(0, 300) ?? "La preparaci\xF3n fall\xF3",
          severity: "reject",
          source: "SERVER_STRUCTURAL"
        }
      ],
      autoridad: {
        algoritmo: ALGORITMO,
        nucleo: VERSION_DEL_NUCLEO,
        profileVersion: "",
        engineVersion: INKSTITCH_ENGINE_VERSION,
        originalHash
      },
      diagnostico: diagnosticar(null, pista),
      ms: ms()
    };
  }
  if (design.preparation)
    design.preparation.issues = design.preparation.issues.map(conFuente);
  try {
    validateDesign(design);
  } catch (error) {
    return { estado: "no-verificable", codigo: "SERVER_DESIGN_INVALID", detalle: error.message, ms: ms() };
  }
  const diagnostico = diagnosticar(design, pista);
  const designHash = sha256(canonicalJson(design));
  const autoridad = {
    algoritmo: ALGORITMO,
    nucleo: VERSION_DEL_NUCLEO,
    profileVersion: design.profileVersion,
    engineVersion: design.engineVersion,
    originalHash,
    designHash,
    verdadHash: sha256(canonicalJson(design.preparation?.verdad ?? []))
  };
  if (design.preparation) design.preparation.autoridad = autoridad;
  return { estado: "preparado", design, autoridad, diagnostico, ms: ms() };
}

// lib/bordado/nucleo-cli.ts
if (process.argv[2] === "satin") {
  const [entradaSatin, salidaSatin] = process.argv.slice(3);
  let pedido;
  try {
    pedido = JSON.parse((0, import_node_fs.readFileSync)(entradaSatin, "utf8"));
  } catch {
    process.stderr.write("NUCLEO_ENTRADA_ILEGIBLE\n");
    process.exit(3);
  }
  const casos = (pedido.casos ?? []).map((c) => {
    const rungs = c.rungs ?? [];
    const nueva = correspondenciaSatin(c.railA, c.railB, rungs, { eje: c.eje });
    const legado = correspondenciaProporcional(c.railA, c.railB, rungs, {
      eje: c.eje
    });
    const cada = Math.max(1, Math.ceil(nueva.secciones.length / 120));
    return {
      id: c.id,
      correspondencia: {
        metodo: nueva.metodo,
        anclas: nueva.anclas,
        cortes: nueva.cortes,
        metricas: nueva.metricas
      },
      legado: { metodo: legado.metodo, metricas: legado.metricas },
      // Cuánto cambia el emparejamiento frente al proporcional (0: remapear no cambia nada).
      desvioMm: Math.max(
        desvioEntre(nueva, legado),
        desvioEntre(legado, nueva)
      ),
      // Para la evidencia: una sección de cada `cada` (como mucho unas 120).
      secciones: nueva.secciones.filter((_, k) => k % cada === 0).map((x) => [x.a, x.b]),
      seccionesLegado: legado.secciones.filter((_, k) => k % cada === 0).map((x) => [x.a, x.b]),
      geometrias: Object.fromEntries(
        (c.columnas ?? [1]).map((n2) => [
          String(n2),
          satinDesdeCorrespondencia(nueva, c.railA, c.railB, n2)
        ])
      )
    };
  });
  (0, import_node_fs.writeFileSync)(
    salidaSatin,
    JSON.stringify({ nucleo: VERSION_DEL_NUCLEO, casos })
  );
  process.stdout.write(
    `${JSON.stringify({ estado: "satin", casos: casos.length })}
`
  );
  process.exit(0);
}
function formaRecortada(raster) {
  const m = raster.svg.match(/^<svg[^>]*? width="(\d+)" height="(\d+)"/);
  if (!m) return raster.svg;
  const ancho = Number(m[1]);
  const alto = Number(m[2]);
  const a = raster.depuracion.primerPlano;
  let x0 = ancho;
  let y0 = alto;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < alto; y++)
    for (let x = 0; x < ancho; x++)
      if (a[(y * ancho + x) * 4 + 3] > 0) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < x0) return raster.svg;
  const margen = 8;
  x0 = Math.max(0, x0 - margen);
  y0 = Math.max(0, y0 - margen);
  const w = Math.min(ancho, x1 + 1 + margen) - x0;
  const h = Math.min(alto, y1 + 1 + margen) - y0;
  return raster.svg.replace(
    /^<svg([^>]*?) width="\d+" height="\d+" viewBox="[^"]*"/,
    `<svg$1 width="${w}" height="${h}" viewBox="${x0} ${y0} ${w} ${h}"`
  );
}
var [entrada, salida] = process.argv.slice(2);
if (!entrada || !salida) {
  process.stderr.write("uso: nucleo entrada.json salida.json\nNUCLEO_USO\n");
  process.exit(2);
}
var cuerpo;
try {
  cuerpo = JSON.parse((0, import_node_fs.readFileSync)(entrada, "utf8"));
} catch {
  process.stderr.write("NUCLEO_ENTRADA_ILEGIBLE\n");
  process.exit(3);
}
var etapas = typeof cuerpo.etapas === "string" ? cuerpo.etapas : null;
var anunciar = (etapa, archivo) => process.stdout.write(`${JSON.stringify({ etapa, archivo })}
`);
var resultado = prepararEnServidor(
  cuerpo.original,
  cuerpo.pista,
  { rasterVectorial: cuerpo.politica?.rasterVectorial !== false },
  etapas ? {
    observador: {
      alVectorizar(raster, fuente) {
        if (raster.omitido) return;
        const archivo = `forma-${fuente}.svg`;
        (0, import_node_fs.writeFileSync)((0, import_node_path.join)(etapas, archivo), formaRecortada(raster));
        anunciar("forma", archivo);
      }
    }
  } : {}
);
(0, import_node_fs.writeFileSync)(salida, JSON.stringify(resultado));
process.stdout.write(
  `${JSON.stringify({ estado: resultado.estado, ms: resultado.ms })}
`
);
