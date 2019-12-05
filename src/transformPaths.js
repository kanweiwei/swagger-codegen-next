const { keys, first, assign } = require("lodash");
function transformPaths(paths) {
  var apiUrls = keys(paths);
  apiUrls.forEach(api => {
    let path = paths[api];
    let method = first(keys(path));
    paths[api] = assign(path[method], {
      httpType: method
    });
  });
  return paths;
}

exports.transformPaths = transformPaths;
