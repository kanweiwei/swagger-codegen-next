"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _getMethodType = _interopRequireDefault(require("./getMethodType"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const path = require("path");

function getMethodBody(paths, pathName) {
  const method = (0, _getMethodType.default)(paths, pathName);
  const methodBody = path[method];
  return methodBody;
}

var _default = getMethodBody;
exports.default = _default;