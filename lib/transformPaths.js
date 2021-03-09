"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = transformPaths;

var _lodash = require("lodash");

function transformPaths(paths) {
  const apiUrls = (0, _lodash.keys)(paths);
  const pathMap = {};
  apiUrls.forEach(api => {
    let path = paths[api];
    let method = (0, _lodash.first)(Object.keys(path));
    pathMap[api] = { ...path[method],
      httpType: method
    };
  });
  return pathMap;
}