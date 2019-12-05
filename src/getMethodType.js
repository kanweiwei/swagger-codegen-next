import type { PathItem } from "./interface";

function getMethodType(paths: Paths, pathName: ApiUrl) {
  const path: PathItem = paths[pathName];
  const method = Object.keys(path)[0];
  return method;
}

exports.getMethodType = getMethodType;
