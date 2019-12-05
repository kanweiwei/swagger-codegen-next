"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function getMethodType(paths, pathName) {
  const path = paths[pathName];
  const method = Object.keys(path)[0];
  return method;
}

var _default = getMethodType;
exports.default = _default;