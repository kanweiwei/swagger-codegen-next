import PromiseA from "bluebird";
import fs from "fs";
import { camelCase, first, flattenDeep, flow, groupBy, keys, uniq } from "lodash";
import path from "path";
import prettier from "prettier";
import getProperties from "./getProperties";
import { ApiUrl, Swagger } from "./interface";
import SwaggerHelper from "./SwagggerHelper";

const rimrafAynsc = PromiseA.promisify(require("rimraf"));
const mkdirAsync = PromiseA.promisify(fs.mkdir);
const writeFileAsync = PromiseA.promisify(fs.writeFile);
const cwd = process.cwd();

function getChildModules(childs) {
  let res = "";
  childs.forEach((c) => {
    let parameters: any = groupBy(c.parameters, "in");
    let hasQuery = "query" in parameters;
    let hasBody = "body" in parameters;
    let fnName = camelCase(c.operationId);
    if (hasBody && !hasQuery) {
      res += `
                static  async  ${fnName}(data: any) {
                    return await http.${c.method}("${c.api}", data)
                }
            `;
      return;
    }
    if (!hasBody && hasQuery) {
      res += `
                static async  ${fnName}(data: any) {
                    return await http.${c.method}("${c.api}?" + queryString.stringify(data))
                }
            `;
      return;
    }
    if (hasBody && hasQuery) {
      res += `
                static async ${fnName}(query: any, data: any) {
                    return await http.${c.method}("${c.api}?" + queryString.stringify(query), data)
                }
            `;
      return;
    }
  });
  return res;
}

/**
 * 创建dto和api文件
 * @param {*} json
 */
const createApiCatelogs = async (json: Swagger) => {
  SwaggerHelper.instance.setSwagger(json);
  let paths = SwaggerHelper.instance.getTransformPaths();
  const urls: ApiUrl[] = Object.keys(paths);
  let moduleNames: string[] = flow(
    flattenDeep,
    uniq
  )(
    urls.map((pathName) => {
      return paths[pathName].tags;
    })
  );

  const distPath = path.join(cwd, "./dist");
  // 清空dist目录
  await rimrafAynsc(distPath);
  // 创建dist目录
  await mkdirAsync(distPath);

  let modules: {
    moduleName: string;
    path: string;
    children: any[];
  }[] = [];
  moduleNames.forEach((moduleName, i) => {
    modules[i] = {
      moduleName: moduleName,
      path: path.join(distPath, moduleName),
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

  await writeFileAsync(path.join(cwd, "dist/dtos.json"), Buffer.from(JSON.stringify(dtoMap)), "utf-8");
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
  await writeFileAsync(path.join(cwd, "dist/dto.ts"), Buffer.from(s), "utf-8");

  // 创建模块
  for (let i = 0, len = modules.length; i < len; i++) {
    await mkdirAsync(path.join(cwd, "dist", modules[i].moduleName));
    let s = `
            import http from "../http";
            ${modules[i].children.some((c) => c.method === "get" || c.method === "delete") ? 'import queryString from "query-string"' : ""}

            class ${modules[i].moduleName} {
                ${getChildModules(modules[i].children)}
            }

            export default  ${modules[i].moduleName};
        `;
    // TODO prettier config
    s = prettier.format(s, { semi: false, parser: "babel" });

    await writeFileAsync(path.join(modules[i].path, modules[i].moduleName + ".ts"), Buffer.from(s, "utf-8"));
  }
};

export default createApiCatelogs;
