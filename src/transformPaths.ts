import { first, keys } from "lodash";
import { Method, PathItem, Paths } from "./interface";

export default function transformPaths(paths: Paths) {
  const apiUrls = keys(paths);
  const pathMap: {
    [apiUrl: string]: PathItem;
  } = {};
  apiUrls.forEach((api) => {
    let path = paths[api];
    let method = first(Object.keys(path)) as Method;
    pathMap[api] = {
      ...path[method],
      httpType: method,
    };
  });
  return pathMap;
}
