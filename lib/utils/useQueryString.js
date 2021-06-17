"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = useQueryString;

var _lodash = require("lodash");

function useQueryString(childs) {
  if (childs.some(n => {
    let parameters = (0, _lodash.groupBy)(n.parameters, "in");
    return "query" in parameters;
  })) {
    return true;
  }

  return false;
}