"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = initOptions;

var _path = _interopRequireDefault(require("path"));

var _SwagggerHelper = _interopRequireDefault(require("../core/SwagggerHelper"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const cwd = process.cwd();
const defualtOptions = {
  output: {
    path: _path.default.join(cwd, "./services")
  },
  exclude: []
};

function initOptions(options) {
  options = Object.assign({}, defualtOptions, options);

  if (!options.getModuleName) {
    throw new Error('"getModuleName" must be defined');
  }

  _SwagggerHelper.default.instance.options = options;
  return options;
}