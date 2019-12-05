const path = require("path");
import getMethodType from "./getMethodType"
import { ApiUrl, Paths } from "./interface";

function getMethodBody(paths: Paths, pathName: ApiUrl) {
  const method = getMethodType(paths, pathName);
  const methodBody = path[method];
  return methodBody;
}

export default getMethodBody
