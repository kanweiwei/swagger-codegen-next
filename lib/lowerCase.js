"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = lowerCase;

function lowerCase(s) {
  return s[0].toLocaleLowerCase() + s.slice(1, s.length);
}