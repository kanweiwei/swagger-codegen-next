"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = initOptions;

var _path = _interopRequireDefault(require("path"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const cwd = process.cwd();
const defualtOptions = {
  output: {
    path: _path.default.join(cwd, "./services")
  }
};

function initOptions(options) {
  options = Object.assign({}, defualtOptions, options);
  return options;
}