// @flow
import { Swagger, ApiUrl } from "./interface";

const fs = require("fs");
const path = require("path");
const PromiseA = require("bluebird");
const rimrafAynsc = PromiseA.promisify(require("rimraf"));
const mkdirAsync = PromiseA.promisify(fs.mkdir);
const writeFileAsync = PromiseA.promisify(fs.writeFile);
const cwd = process.cwd();
const prettier = require("prettier");

import getProperties from "./getProperties";
import getRelyDtos from "./getRelyDtos";
import transformPaths from "./transformPaths";
import {
  flattenDeep,
  flow,
  uniq,
  first,
  keys,
  camelCase,
  groupBy
} from "lodash";

function getChildModules(childs) {
  let res = "";
  childs.forEach(c => {
    let parameters: any = groupBy(c.parameters, "in");
    let hasQuery = "query" in parameters;
    let hasBody = "body" in parameters;
    let fnName = camelCase(c.operationId);
    if (hasBody && !hasQuery) {
      res += `
                async ${fnName} (data: any) {
                    return await http.${c.method}("${c.api}", data)
                }
            `;
      return;
    }
    if (!hasBody && hasQuery) {
      res += `
                async ${fnName} (data: any) {
                    return await http.${c.method}("${
        c.api
      }?" + queryString.stringify(data))
                }
            `;
      return;
    }
    if (hasBody && hasQuery) {
      res += `
                async ${fnName} (query: any, data: any) {
                    return await http.${c.method}("${
        c.api
      }?" + queryString.stringify(query), data)
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
  let paths = transformPaths(json.paths);
  const pathNames: ApiUrl[] = Object.keys(paths);
  let moduleNames: string[] = flow(
    flattenDeep,
    uniq
  )(
    pathNames.map((pathName, i) => {
      return paths[pathName].tags;
    })
  );

  moduleNames = uniq(moduleNames);
  console.log(moduleNames);

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
      children: []
    };
    pathNames.forEach(pathName => {
      let path = paths[pathName];
      let method = path.httpType;
      let tag = first(path.tags);
      if (tag === moduleName) {
        modules[i].children.push(
          Object.assign(
            {
              api: pathName,
              method: method
            },
            path
          )
        );
      }
    });
  });

  // 整理dto 引用
  let dtos: {
    name: string;
    links: {
      moduleName: string;
      fns: string[];
    }[];
  }[] = keys(json.definitions).map(dtoName => {
    return {
      name: dtoName,
      links: []
    };
  });
  let reg = /"\$ref":\s*"\#\/definitions\/([\w\[\]]*)"/gim;
  let sreg = /"\$ref":\s*"\#\/definitions\/([\w\[\]]*)"/im;
  for (let i = 0, len = pathNames.length; i < len; i++) {
    let methodBody = paths[pathNames[i]];
    let methodBodyString = JSON.stringify(methodBody);
    let match = methodBodyString.match(reg);
    let names = [];
    if (match) {
      names = names.concat(match.map(n => n.match(sreg)[1]));
      names = uniq(names);
      names.forEach(dn => {
        let targetDto = dtos.find(n => n.name === dn);
        let foundIndex = targetDto.links.findIndex(
          n => n.moduleName === first(methodBody.tags)
        );
        if (foundIndex > -1) {
          targetDto.links[foundIndex].fns.push(methodBody.operationId);
        } else {
          targetDto.links.push({
            moduleName: methodBody.tags[0],
            fns: [methodBody.operationId]
          });
        }
      });
    }
  }
  await writeFileAsync(
    path.join(cwd, "dist/dtos.json"),
    Buffer.from(JSON.stringify(dtos)),
    "utf-8"
  );
  // 创建通用的dto目录
  await mkdirAsync(path.join(cwd, "dist/dto"));
  // 泛型接口
  const genericDtos = dtos
    .filter(n => n.name.indexOf("[") > -1)
    .map(n => n.name);
  // 通用接口
  const commonDtos = dtos
    .filter(n => n.links.length > 1 && n.name.indexOf("[") === -1)
    .map(n => n.name);
  for (let i = 0; i < commonDtos.length; i++) {
    let d: {
      required?: string[];
      type: "object";
      properties: any;
    } = json.definitions[commonDtos[i]];
    let s = "";
    if (!d.properties) {
      console.log(commonDtos[i], d);
    }
    const relyDtos: any = getRelyDtos(d);
    relyDtos.forEach(d => {
      if (commonDtos.indexOf(d) > -1) {
        s += `
                    import ${d} from "./${d}";
                `;
      } else {
        //
      }
    });
    s += `
            interface ${commonDtos[i]} {
                ${getProperties(d)}
            }

            export default ${commonDtos[i]}
        `;
    s = prettier.format(s, { semi: false, parser: "babel" });
    await writeFileAsync(
      path.join(
        cwd,
        "dist/dto",
        commonDtos[i][0].toLocaleLowerCase() +
          commonDtos[i].slice(1, commonDtos[i].length) +
          ".ts"
      ),
      Buffer.from(s),
      "utf-8"
    );
  }

  // 创建模块
  for (let i = 0, len = modules.length; i < len; i++) {
    await mkdirAsync(path.join(cwd, "dist", modules[i].moduleName));
    let s = `
            import http from "../http";
            ${
              modules[i].children.some(
                c => c.method === "get" || c.method === "delete"
              )
                ? 'import queryString from "query-string"'
                : ""
            }

            class ${modules[i].moduleName} {
                ${getChildModules(modules[i].children)}
            }

            export default new ${modules[i].moduleName}()
        `;
    // TODO prettier config
    s = prettier.format(s, { semi: false, parser: "babel" });

    await writeFileAsync(
      path.join(modules[i].path, modules[i].moduleName + ".ts"),
      Buffer.from(s, "utf-8")
    );
  }
};

export default createApiCatelogs;
