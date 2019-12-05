const path = require("path");
const { getMethodType } = require("./createApiCatelogs");
import type { ApiUrl } from "./interface";

function getMethodBody(paths: Paths, pathName: ApiUrl) {
  const method = getMethodType(paths, pathName);
  const methodBody = path[method];
  return methodBody;
}
module.exports = getMethodBody;
