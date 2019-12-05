"use strict";

var path = require("path");

var _require = require("./createApiCatelogs"),
    getMethodType = _require.getMethodType;

function getMethodBody(paths, pathName) {
  var method = getMethodType(paths, pathName);
  var methodBody = path[method];
  return methodBody;
}
module.exports = getMethodBody;