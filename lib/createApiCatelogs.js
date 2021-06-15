"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _bluebird = _interopRequireDefault(require("bluebird"));

var _fs = _interopRequireDefault(require("fs"));

var _lodash = require("lodash");

var _path = _interopRequireDefault(require("path"));

var _prettier = _interopRequireDefault(require("prettier"));

var _getProperties = _interopRequireDefault(require("./getProperties"));

var _SwagggerHelper = _interopRequireDefault(require("./SwagggerHelper"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const rimrafAync = _bluebird.default.promisify(require("rimraf"));

const mkdirAsync = _bluebird.default.promisify(_fs.default.mkdir);

const writeFileAsync = _bluebird.default.promisify(_fs.default.writeFile);

const cwd = process.cwd();

function useQueryString(childs) {
  if (childs.some(n => {
    let parameters = (0, _lodash.groupBy)(n.parameters, "in");
    return "query" in parameters;
  })) {
    return true;
  }

  return false;
}

function getChildModules(childs) {
  let res = "";
  childs.forEach(c => {
    let parameters = (0, _lodash.groupBy)(c.parameters, "in");
    let hasQuery = ("query" in parameters);
    let hasBody = ("body" in parameters);
    let fnName = (0, _lodash.camelCase)(c.operationId);
    const comment = `/**
                      * ${c.summary}
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
/**
 * 创建dto和api文件
 * @param {*} json
 */


const createApiCatelogs = async json => {
  _SwagggerHelper.default.instance.setSwagger(json);

  let paths = _SwagggerHelper.default.instance.getTransformPaths();

  const urls = Object.keys(paths);
  let moduleNames = (0, _lodash.flow)(_lodash.flattenDeep, _lodash.uniq)(urls.map(pathName => {
    return paths[pathName].tags;
  }));

  const distPath = _path.default.join(cwd, "./dist"); // 清空dist目录
  // @ts-ignore


  await rimrafAync(distPath); // 创建dist目录

  await mkdirAsync(distPath);
  let modules = [];
  moduleNames.forEach((moduleName, i) => {
    modules[i] = {
      moduleName: moduleName,
      path: _path.default.join(distPath, moduleName),
      children: []
    };
    urls.forEach(apiUrl => {
      let path = paths[apiUrl];
      let method = path.httpType;
      let tag = (0, _lodash.first)(path.tags);

      if (tag === moduleName) {
        modules[i].children.push({
          api: apiUrl,
          method: method,
          ...path
        });
      }
    });
  }); // 整理dto 引用

  const dtoMap = _SwagggerHelper.default.instance.getDtoMap();

  await writeFileAsync(_path.default.join(cwd, "dist/dtos.json"), Buffer.from(JSON.stringify(dtoMap), "utf-8")); // 创建通用的dto目录

  await mkdirAsync(_path.default.join(cwd, "dist/dto"));
  let s = ""; // 泛型接口

  const genericDtos = _SwagggerHelper.default.instance.getGenericDtos(); // 通用接口


  const commonDtos = (0, _lodash.keys)(dtoMap).filter(n => !n.includes("["));

  for (let i = 0; i < genericDtos.length; i++) {
    const definitionKeys = Object.keys(json.definitions);
    const reg = new RegExp(`${genericDtos[i]}\[[a-zA-Z0-9]+\]`);
    const targetDto = definitionKeys.find(n => reg.exec(n));

    if (targetDto) {
      s += `
            export interface ${genericDtos[i]}<T> {
                ${(0, _getProperties.default)(targetDto, json.definitions[targetDto])}
            }

        `;
    }
  }

  for (let i = 0; i < commonDtos.length; i++) {
    let dto = json.definitions[commonDtos[i]];
    s += `
            export interface ${commonDtos[i]} {
                ${(0, _getProperties.default)(commonDtos[i], dto)}
            }

        `;
  }

  s = _prettier.default.format(s, {
    semi: false,
    parser: "babel"
  });
  await writeFileAsync(_path.default.join(cwd, "dist/dto.ts"), Buffer.from(s, "utf-8")); // 创建模块

  for (let i = 0, len = modules.length; i < len; i++) {
    await mkdirAsync(_path.default.join(cwd, "dist", modules[i].moduleName));
    let s = `
            import http from "../http";
            ${useQueryString(modules[i].children) ? 'import queryString from "query-string"' : ""}

            class ${modules[i].moduleName} {
                ${getChildModules(modules[i].children)}
            }

            export default  ${modules[i].moduleName};
        `; // TODO prettier config

    s = _prettier.default.format(s, {
      semi: false,
      parser: "babel-ts"
    });
    await writeFileAsync(_path.default.join(modules[i].path, modules[i].moduleName + ".ts"), Buffer.from(s, "utf-8"), "utf-8");
  }
};

var _default = createApiCatelogs;
exports.default = _default;