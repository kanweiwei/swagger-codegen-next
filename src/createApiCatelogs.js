// @flow

const fs = require("fs");
const path = require("path");
const uniq = require("lodash/uniq");
const groupBy = require("lodash/groupBy");
const uniqBy = require("lodash/uniqBy");
const Promise = require("bluebird");
const rimrafAynsc = Promise.promisify(require("rimraf"));
const mkdirAsync = Promise.promisify(fs.mkdir);
const writeFileAsync = Promise.promisify(fs.writeFile);
const cwd = process.cwd();
const lowerCase = require("./lowerCase");
const prettier = require("prettier");
const dataTypes = require("./dataTypes");

const getProperties = require("./getProperties");
const getRelyDtos = require("./getRelyDtos");

import type { Swagger, MethodBody, Paths, Dto, Schema } from "./interface";

function getBodyAndQueryType(parameters: any, type: string) {
  var schema = parameters["body"][0].schema;
  let type = dataTypes[schema.type];
}

function getChildModules(childs, replyImport) {
  let res = "";
  let relys: string[] = [];
  childs.forEach(c => {
    let parameters: any = groupBy(c.parameters, "in");
    let hasQuery = "query" in parameters;
    let hasBody = "body" in parameters;
    let fnName = lowerCase(c.operationId);
    if (hasBody && !hasQuery) {
      var schema = parameters["body"][0].schema;
      let type = dataTypes[schema.type];
      if (type === "[]") {
        var $ref = schema.items.$ref;
        let ctype = dataTypes[schema.items.type];
        if (!$ref) {
          res += `
                async ${fnName} (data: ${ctype}[]) {
                    return await http.${c.method}("${c.api}", data)
                }
            `;
        }
        return;
      } else {
        var $ref = schema.$ref;
      }
      var dto = $ref.match(/\#\/definitions\/([\w\[\]]*)/)[1];
      if (dto.indexOf("[") > -1) {
        let dtoMatch = dto.match(/(\w*)\[(\w*)\]/);
        let dto1 = dto[1];
        let dto2 = dto[2];
        relys = relys.concat([dto1, dto2]);
        if (schema.type === "array") {
          dto2 = `${dto1}<${dto2}>[]`;
        }
        res += `
                async ${fnName} (data: ${dto2}) {
                    return await http.${c.method}("${c.api}", data)
                }
            `;
        return;
      } else {
        relys = relys.concat([dto]);
        if (schema.type === "array") {
          dto = `${dto}[]`;
        }
        res += `
        async ${fnName} (data: ${dto}) {
            return await http.${c.method}("${c.api}", data)
        }
    `;
        return;
      }
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
  relys = uniq(relys);
  return [res, relys];
}

function getMethodType(paths: Paths, pathName: string) {
  const path = paths[pathName];
  const method = Array.prototype.slice.call(Object.keys(path))[0];
  return method;
}

function getMethodBody(paths: Paths, pathName: string) {
  const method = getMethodType(paths, pathName);
  const methodBody = paths[pathName][method];
  return methodBody;
}

const createApiCatelogs = async (json: Swagger) => {
  const paths = json.paths;
  const pathNames = Object.keys(paths);
  // 模块名
  let appNames: string[] = [];
  for (let i = 0, len = pathNames.length; i < len; i++) {
    const methodBody = getMethodBody(paths, pathNames[i]);
    appNames = appNames.concat(methodBody.tags);
  }
  appNames = uniq(appNames);
  const distPath = path.join(cwd, "./dist");
  // 清空dist目录
  await rimrafAynsc(distPath);
  // 创建dist目录
  await mkdirAsync(distPath);

  let modules: {
    appName: string,
    lowerName: string,
    path: string,
    children: any[]
  }[] = [];
  appNames.forEach((appName, i) => {
    let name = lowerCase(appName);
    modules[i] = {
      appName: appName,
      lowerName: name,
      path: path.join(distPath, name),
      children: []
    };
    for (let ii = 0, len = pathNames.length; ii < len; ii++) {
      const methodBody = getMethodBody(paths, pathNames[ii]);
      const method = getMethodType(paths, pathNames[ii]);
      let tag = methodBody.tags[0];
      if (tag === appName) {
        let child: any = {};
        child.api = pathNames[ii];
        child.method = method;
        child = Object.assign({}, child, methodBody);
        modules[i].children.push(child);
      }
    }
  });

  // 整理dto 引用
  let dtos: {
    name: string,
    links: {
      appName: string,
      lowerName: string,
      fns: string[]
    }[]
  }[] = Object.keys(json.definitions).map(dtoName => {
    return {
      name: dtoName,
      links: []
    };
  });

  let reg = /\#\/definitions\/([\w\[\]]*)/g;
  let sreg = /\#\/definitions\/([\w\[\]]*)/;
  for (let i = 0, len = pathNames.length; i < len; i++) {
    let methodBody = getMethodBody(paths, pathNames[i]);
    let methodBodyString = JSON.stringify(methodBody);
    let match = methodBodyString.match(reg);
    let names = [];
    if (match) {
      names = names.concat(match.map(n => n.match(sreg)[1]));
      names = uniq(names);
      names.forEach(dn => {
        let dto = dtos.find((n: any) => n.name === dn);
        if (dto) {
          let foundIndex = dto.links.findIndex(
            n => n.appName === methodBody.tags[0]
          );
          if (foundIndex > -1) {
            dto.links[foundIndex].fns.push(methodBody.operationId);
          } else {
            dto.links.push({
              appName: methodBody.tags[0],
              lowerName: lowerCase(methodBody.tags[0]),
              fns: [methodBody.operationId]
            });
          }
        }
      });
    }
  }
  await writeFileAsync(
    path.join(cwd, "dist/dtos.json"),
    Buffer.from(JSON.stringify(dtos)),
    "utf-8"
  );
  // 创建dto目录
  await mkdirAsync(path.join(cwd, "dist/dto"));

  const commonDtos = dtos.filter(n => n.name.indexOf("[") === -1);
  const genericDtos = uniqBy(
    dtos
      .filter(n => n.name.indexOf("[") > -1)
      .map((n: any) => {
        let originName = n.name;
        n.name = n.name.match(/(\w*)(\[(\w*)\])/)[1];
        n.originName = originName;
        return n;
      }),
    "name"
  );

  for (let i = 0; i < commonDtos.length; i++) {
    let d: Dto = json.definitions[commonDtos[i].name];
    let s = "";
    const relyDtos: string[] = getRelyDtos(d);
    relyDtos.forEach((relyDto: string) => {
      s += `
          import ${relyDto} from "./${lowerCase(relyDto)}";
      `;
    });
    s += `
      interface ${commonDtos[i].name} {
          ${getProperties(d)}
      }

      export default ${commonDtos[i].name}
  `;

    s = prettier.format(s, { parser: "babel" });
    await writeFileAsync(
      path.join(cwd, "dist/dto", lowerCase(commonDtos[i].name) + ".ts"),
      Buffer.from(s),
      "utf-8"
    );
  }

  for (let i = 0; i < genericDtos.length; i++) {
    let dto: Dto = json.definitions[genericDtos[i].originName];
    let properties = dto.properties;
    let s = `
      interface ${genericDtos[i].name}<T> {
    `;
    let keys = Object.keys(properties);
    for (let i = 0; i < keys.length; i++) {
      let p: Schema = properties[keys[i]];
      let type = dataTypes[p.type];
      if (type === "[]") {
        s += `${keys[i]}: Array<T>;
        `;
      } else {
        s += `${keys[i]}: ${type};
        `;
      }
    }
    s += `
      }
      export default ${genericDtos[i].name};
    `;
    s = prettier.format(s, { parser: "babel" });

    await writeFileAsync(
      path.join(cwd, "dist/dto", lowerCase(genericDtos[i].name) + ".ts"),
      Buffer.from(s),
      "utf-8"
    );
  }

  // 创建模块
  for (let i = 0, len = modules.length; i < len; i++) {
    await mkdirAsync(path.join(cwd, "dist", modules[i].lowerName));
    let relyImport = "";
    let s = `
            import http from "../http";
            ${
              modules[i].children.some(
                c => c.method === "get" || c.method === "delete"
              )
                ? 'import queryString from "query-string"'
                : ""
            }
        `;
    let [childString, relyImports] = getChildModules(
      modules[i].children,
      relyImport
    );
    relyImports.forEach((relyImport: string) => {
      s += `import ${relyImport} from "../dto/${lowerCase(relyImport)}";
              `;
    });
    s += `
    class ${modules[i].appName}Service {
        ${childString}
    }
    export default new ${modules[i].appName}Service()
  `;
    // TODO prettier config
    s = prettier.format(s, { parser: "babel" });

    await writeFileAsync(
      path.join(modules[i].path, modules[i].lowerName + "Service.ts"),
      Buffer.from(s, "utf-8")
    );
  }
};
module.exports = createApiCatelogs;
