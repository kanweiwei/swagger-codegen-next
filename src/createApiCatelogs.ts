import PromiseA from "bluebird";
import fs from "fs";
import { keys, uniq } from "lodash";
import path from "path";
import prettier from "prettier";
import SwaggerHelper from "./core/SwagggerHelper";
import { Swagger, URLWithMethod } from "./interface";
import { getChildModules } from "./utils/getChildModules";
import { getDtos } from "./utils/getDtos";
import getProperties from "./utils/getProperties";
import useQueryString from "./utils/useQueryString";
import { upperCamelCase } from "./utils/util";
import writeFile from "./utils/writeFile";

const rimrafAync = PromiseA.promisify(require("rimraf"));
const mkdirAsync = PromiseA.promisify(fs.mkdir);
const cwd = process.cwd();

/**
 * 创建dto和api文件
 * @param {*} json
 */
const createApiCatelogs = async (json: Swagger) => {
  const options = SwaggerHelper.instance.options;
  const outputPath = options.output.path;
  // 清空dist目录
  // @ts-ignore
  await rimrafAync(outputPath);
  // 创建dist目录
  await mkdirAsync(outputPath);

  let paths = SwaggerHelper.instance.paths;
  const urls: URLWithMethod[] = SwaggerHelper.instance.urls;
  let moduleNames: string[] = uniq(
    urls.map((pathName) => {
      return options.getModuleName(pathName.split(",")[1]);
    })
  );

  let modules: {
    moduleName: string;
    filePath: string;
    children: any[];
  }[] = [];
  moduleNames.forEach((moduleName, i) => {
    modules[i] = {
      moduleName: moduleName,
      filePath: path.join(outputPath, moduleName),
      children: [],
    };
    urls.forEach((apiUrl) => {
      let path = paths[apiUrl];
      let method = path.httpType;
      const api = apiUrl.split(",")[1];
      if (options.getModuleName(api) === moduleName) {
        modules[i].children.push({
          api,
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
    const moduleName = upperCamelCase(modules[i].moduleName);
    let s = `
            ${SwaggerHelper.instance.options.template.http};
            ${
              useQueryString(modules[i].children)
                ? 'import queryString from "query-string";'
                : ""
            }
            ${dtos.length ? dtoImport : ""}

            class ${moduleName} {
                ${getChildModules(modules[i].children)}
            }

            export default  ${moduleName};
        `;
    s = prettier.format(s, { semi: false, parser: "babel-ts" });

    await writeFile(
      path.join(`${modules[i].filePath}.ts`),
      Buffer.from(s, "utf-8"),
      {
        encoding: "utf-8",
      }
    );
  }
};

export default createApiCatelogs;
