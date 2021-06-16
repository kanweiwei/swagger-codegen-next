import { PathItem, Paths, ApiUrl } from "../interface";

function getMethodType(paths: Paths, pathName: ApiUrl) {
  const path: PathItem = paths[pathName];
  const method = Object.keys(path)[0];
  return method;
}

export default getMethodType;
