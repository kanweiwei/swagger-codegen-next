import PromiseA from "bluebird";
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
import dataTypes from "./core/dataTypes";
import SwaggerHelper from "./core/SwagggerHelper";
import { ApiUrl, Options, Parameter, PathItem, Swagger } from "./interface";
import { getBodyDataType } from "./utils/getBodyDataType";
import { getDto } from "./utils/getDto";
import { getDtos } from "./utils/getDtos";
import getOutputDto from "./utils/getOutputDto";
import getProperties from "./utils/getProperties";
import useQueryString from "./utils/useQueryString";
import writeFile from "./utils/writeFile";

const rimrafAync = PromiseA.promisify(require("rimraf"));
const mkdirAsync = PromiseA.promisify(fs.mkdir);
const cwd = process.cwd();

const defualtOptions = {
  output: {
    path: path.join(cwd, "./dist"),
  },
};

function getQueryData(item: PathItem) {
  let parameters: {
    [k in "header" | "query" | "body"]?: Parameter[];
  } = groupBy(item.parameters, "in");
  if (!parameters.query) return;
  let s = "{";
  parameters.query.forEach((n) => {
    s += `${n.name}${n.required ? "" : "?"}:${dataTypes[n.type]};`;
  });
  s += "}";
  return s;
}

function getChildModules(childs: PathItem[]) {
  let res = "";
  childs.forEach((c) => {
    let parameters: {
      [k in "header" | "query" | "body"]?: Parameter[];
    } = groupBy(c.parameters, "in");
    let hasQuery = "query" in parameters;
    let hasBody = "body" in parameters;
    let fnName = camelCase(c.operationId);
    let useJwt =
      "header" in parameters &&
      parameters.header.some((n) => n.name === "Authorization");
    const dto = getBodyDataType(parameters);
    const comment = `/**
                      * @description ${c.summary ? c.summary : ""}
                      */ `;
    // if (c.summary) {
    res += comment + "\n";
    // }

    const outputDto = getOutputDto(c);
    const outputString = outputDto ? `<${outputDto}>` : "";

    const queryData = getQueryData(c);

    if (hasBody && !hasQuery) {
      res += `static  ${fnName}(data: ${dto}) {
                    return  http.${c.httpType}${outputString}("${c.api}", data)
                }

            `;
      return;
    } else if (!hasBody && hasQuery) {
      res += `static ${fnName}(data: ${queryData}) {
                    return  http.${c.httpType}${outputString}("${c.api}?" + queryString.stringify(data))
                }

            `;
      return;
    } else if (hasBody && hasQuery) {
      res += `static ${fnName}(query: ${queryData}, data: ${dto}) {
                    return  http.${c.httpType}${outputString}("${c.api}?" + queryString.stringify(query), data)
                }

            `;
      return;
    } else {
      res += `static ${fnName}() {
                return  http.${c.httpType}${outputString}("${c.api}")
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
const createApiCatelogs = async (json: Swagger, options: Options) => {
  options = Object.assign({}, defualtOptions, options);

  const outputPath = options.output.path;

  let paths = SwaggerHelper.instance.paths;
  const urls: ApiUrl[] = Object.keys(paths);
  let moduleNames: string[] = uniq(
    urls.map((pathName) => {
      return options.getModuleName(pathName);
    })
  );

  // 清空dist目录
  // @ts-ignore
  await rimrafAync(outputPath);
  // 创建dist目录
  await mkdirAsync(outputPath);

  let modules: {
    moduleName: string;
    path: string;
    children: any[];
  }[] = [];
  moduleNames.forEach((moduleName, i) => {
    modules[i] = {
      moduleName: moduleName,
      path: path.join(outputPath, moduleName),
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

  let s = "";

  // 泛型接口
  const genericDtos = SwaggerHelper.instance.getGenericDtos();
  for (let i = 0; i < genericDtos.length; i++) {
    const definitionKeys = Object.keys(json.definitions);
    const reg = new RegExp(`${genericDtos[i]}\\[[a-zA-Z0-9]+\\]`);
    const targetDto = definitionKeys.find((n) => reg.exec(n));
    if (targetDto) {
      s += `
            export interface ${genericDtos[i]}<T> {
                ${getProperties(targetDto, json.definitions[targetDto])}
            }

        `;
    }
  }

  // 通用接口
  const commonDtos = keys(dtoMap).filter((n) => !n.includes("["));
  for (let i = 0; i < commonDtos.length; i++) {
    let dto = json.definitions[commonDtos[i]];
    s += `
            export interface ${commonDtos[i]} {
                ${getProperties(commonDtos[i], dto)}
            }

        `;
  }

  s = prettier.format(s, { semi: false, parser: "babel-ts" });

  await writeFile(path.join(outputPath, "dto.ts"), Buffer.from(s, "utf-8"), {
    encoding: "utf-8",
  });

  // 创建模块
  for (let i = 0, len = modules.length; i < len; i++) {
    const dtos = getDtos(modules[i].children);
    let dtoImport = "";
    if (dtos.length) {
      dtoImport += `import { ${uniq(dtos).join(",\n ")} } from './dto';\n`;
    }
    let s = `
            import http from "../http";
            ${dtos.length ? dtoImport : ""}

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
    s = prettier.format(s, { semi: false, parser: "babel-ts" });

    await writeFile(
      path.join(`${modules[i].path}.ts`),
      Buffer.from(s, "utf-8"),
      {
        encoding: "utf-8",
      }
    );
  }
};

export default createApiCatelogs;
