"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getBodyDataType = getBodyDataType;

var _getProperties = require("./getProperties");

function getBodyDataType(parameters) {
  let res;

  if ("body" in parameters) {
    const target = parameters.body[0];

    if (target) {
      res = (0, _getProperties.getType)(target.schema);
    }
  }

  return res;
}