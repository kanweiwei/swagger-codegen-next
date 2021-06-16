import PromiseA, { resolve } from "bluebird";
import fs from "fs";
import {
  camelCase,
  first,
  flattenDeep,
  flow,
  groupBy,
  keys,
  uniq,
} from "lodash";
import path from "path";
import prettier from "prettier";
import getProperties from "./utils/getProperties";
import { ApiUrl, Swagger } from "./interface";
import SwaggerHelper from "./core/SwagggerHelper";
import writeFile from "./utils/writeFile";
import useQueryString from "./utils/useQueryString";

const rimrafAync = PromiseA.promisify(require("rimraf"));
const mkdirAsync = PromiseA.promisify(fs.mkdir);
const cwd = process.cwd();

const defualtOptions = {
  output: {
    path: path.join(cwd, "./dist"),
  },
};

function getChildModules(childs) {
  let res = "";
  childs.forEach((c) => {
    let parameters: any = groupBy(c.parameters, "in");
    let hasQuery = "query" in parameters;
    let hasBody = "body" in parameters;
    let fnName = camelCase(c.operationId);
    const comment = `/**
                      * @description ${c.summary}
                      */ `;
    if (c.summary) {
      res += comment + "\n";
    }
    if (hasBody && !hasQuery) {
      res += `static    ${fnName}(data: any) {
                    return  http.${c.method}("${c.api}", data)
                }
            `;
      return;
    } else if (!hasBody && hasQuery) {
      res += `static   ${fnName}(data: any) {
                    return  http.${c.method}("${c.api}?" + queryString.stringify(data))
                }
            `;
      return;
    } else if (hasBody && hasQuery) {
      res += `static  ${fnName}(query: any, data: any) {
                    return  http.${c.method}("${c.api}?" + queryString.stringify(query), data)
                }
            `;
      return;
    } else {
      res += `static    ${fnName}() {
                return  http.${c.method}("${c.api}")
              }
      `;
      return;
    }
  });
  return res;
}

interface Options {
  output?: {
    path?: string;
  };
}

/**
 * 创建dto和api文件
 * @param {*} json
 */
const createApiCatelogs = async (json: Swagger, options: Options = {}) => {
  options = Object.assign({}, defualtOptions, options);

  let paths = SwaggerHelper.instance.paths;
  const urls: ApiUrl[] = Object.keys(paths);
  let moduleNames: string[] = flow(
    flattenDeep,
    uniq
  )(
    urls.map((pathName) => {
      return paths[pathName].tags;
    })
  );

  // 清空dist目录
  // @ts-ignore
  await rimrafAync(options.output.path);
  // 创建dist目录
  await mkdirAsync(options.output.path);

  let modules: {
    moduleName: string;
    path: string;
    children: any[];
  }[] = [];
  moduleNames.forEach((moduleName, i) => {
    modules[i] = {
      moduleName: moduleName,
      path: path.join(options.output.path, moduleName),
      children: [],
    };
    urls.forEach((apiUrl) => {
      let path = paths[apiUrl];
      let method = path.httpType;
      let tag = first(path.tags);
      if (tag === moduleName) {
        modules[i].children.push({
          api: apiUrl,
          method: method,
          ...path,
        });
      }
    });
  });

  // 整理dto 引用
  const dtoMap = SwaggerHelper.instance.getDtoMap();

  await writeFile(
    path.join(cwd, "dist/dtos.json"),
    Buffer.from(JSON.stringify(dtoMap)),
    {
      encoding: "utf-8",
    }
  );
  // 创建通用的dto目录
  await mkdirAsync(path.join(cwd, "dist/dto"));

  let s = "";

  // 泛型接口
  const genericDtos = SwaggerHelper.instance.getGenericDtos();
  // 通用接口
  const commonDtos = keys(dtoMap).filter((n) => !n.includes("["));
  for (let i = 0; i < genericDtos.length; i++) {
    const definitionKeys = Object.keys(json.definitions);
    const reg = new RegExp(`${genericDtos[i]}\[[a-zA-Z0-9]+\]`);
    const targetDto = definitionKeys.find((n) => reg.exec(n));
    if (targetDto) {
      s += `
            export interface ${genericDtos[i]}<T> {
                ${getProperties(targetDto, json.definitions[targetDto])}
            }

        `;
    }
  }

  for (let i = 0; i < commonDtos.length; i++) {
    let dto = json.definitions[commonDtos[i]];
    s += `
            export interface ${commonDtos[i]} {
                ${getProperties(commonDtos[i], dto)}
            }

        `;
  }
  s = prettier.format(s, { semi: false, parser: "babel" });

  await new Promise((resolve, reject) => {
    fs.writeFile(
      path.join(cwd, "dist/dto.ts"),
      Buffer.from(s, "utf-8"),
      {
        encoding: "utf-8",
      },
      (err) => {
        if (err) {
          reject(err);
        }
        resolve(null);
      }
    );
  });

  // 创建模块
  for (let i = 0, len = modules.length; i < len; i++) {
    await mkdirAsync(path.join(cwd, "dist", modules[i].moduleName));
    let s = `
            import http from "../http";
            ${
              useQueryString(modules[i].children)
                ? 'import queryString from "query-string"'
                : ""
            }

            class ${modules[i].moduleName} {
                ${getChildModules(modules[i].children)}
            }

            export default  ${modules[i].moduleName};
        `;
    // TODO prettier config
    s = prettier.format(s, { semi: false, parser: "babel-ts" });

    await writeFile(
      path.join(modules[i].path, modules[i].moduleName + ".ts"),
      Buffer.from(s, "utf-8"),
      {
        encoding: "utf-8",
      }
    );
  }
};

export default createApiCatelogs;
