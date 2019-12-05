"use strict";

var _require = require("lodash"),
    keys = _require.keys,
    first = _require.first,
    assign = _require.assign;

function transformPaths(paths) {
  var apiUrls = keys(paths);
  apiUrls.forEach(function (api) {
    var path = paths[api];
    var method = first(keys(path));
    paths[api] = assign(path[method], {
      httpType: method
    });
  });
  return paths;
}

exports.transformPaths = transformPaths;