"use strict";

function getMethodType(paths, pathName) {
  var path = paths[pathName];
  var method = Object.keys(path)[0];
  return method;
}

exports.getMethodType = getMethodType;