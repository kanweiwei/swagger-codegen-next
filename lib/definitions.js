"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setDefinitions = setDefinitions;
exports.getDefinitions = getDefinitions;
let definitions;

function setDefinitions(obj) {
  definitions = obj;
}

function getDefinitions() {
  return definitions;
}