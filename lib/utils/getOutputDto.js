"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getOutputDto;

var _getProperties = require("./getProperties");

function getOutputDto(item) {
  return item.responses["200"].schema ? (0, _getProperties.getType)(item.responses["200"].schema) : "void";
}