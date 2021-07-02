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

var _dataTypes = _interopRequireDefault(require("./core/dataTypes"));

var _SwagggerHelper = _interopRequireDefault(require("./core/SwagggerHelper"));

var _getBodyDataType = require("./utils/getBodyDataType");

var _getDtos = require("./utils/getDtos");

var _getOutputDto = _interopRequireDefault(require("./utils/getOutputDto"));

var _getProperties = _interopRequireDefault(require("./utils/getProperties"));

var _useQueryString = _interopRequireDefault(require("./utils/useQueryString"));

var _writeFile = _interopRequireDefault(require("./utils/writeFile"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const rimrafAync = _bluebird.default.promisify(require("rimraf"));

const mkdirAsync = _bluebird.default.promisify(_fs.default.mkdir);

const cwd = process.cwd();
const defualtOptions = {
  output: {
    path: _path.default.join(cwd, "./dist")
  }
};

function getQueryData(item) {
  let parameters = (0, _lodash.groupBy)(item.parameters, "in");
  if (!parameters.query) return;
  let s = "{";
  parameters.query.forEach(n => {
    s += `${n.name}${n.required ? "" : "?"}:${_dataTypes.default[n.type]};`;
  });
  s += "}";
  return s;
}

function getChildModules(childs) {
  let res = "";
  childs.forEach(c => {
    let parameters = (0, _lodash.groupBy)(c.parameters, "in");
    let hasQuery = ("query" in parameters);
    let hasBody = ("body" in parameters);
    let fnName = (0, _lodash.camelCase)(c.operationId);
    let useJwt = "header" in parameters && parameters.header.some(n => n.name === "Authorization");
    const dto = (0, _getBodyDataType.getBodyDataType)(parameters);
    const comment = `/**
                      * @description ${c.summary ? c.summary : ""}
                      */ `; // if (c.summary) {

    res += comment + "\n"; // }

    const outputDto = (0, _getOutputDto.default)(c);
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


const createApiCatelogs = async (json, options) => {
  options = Object.assign({}, defualtOptions, options);
  const outputPath = options.output.path;
  let paths = _SwagggerHelper.default.instance.paths;
  const urls = Object.keys(paths);
  let moduleNames = (0, _lodash.uniq)(urls.map(pathName => {
    return options.getModuleName(pathName);
  })); // 清空dist目录
  // @ts-ignore

  await rimrafAync(outputPath); // 创建dist目录

  await mkdirAsync(outputPath);
  let modules = [];
  moduleNames.forEach((moduleName, i) => {
    modules[i] = {
      moduleName: moduleName,
      path: _path.default.join(outputPath, moduleName),
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

  let s = ""; // 泛型接口

  const genericDtos = _SwagggerHelper.default.instance.getGenericDtos();

  for (let i = 0; i < genericDtos.length; i++) {
    const definitionKeys = Object.keys(json.definitions);
    const reg = new RegExp(`${genericDtos[i]}\\[[a-zA-Z0-9]+\\]`);
    const targetDto = definitionKeys.find(n => reg.exec(n));

    if (targetDto) {
      s += `
            export interface ${genericDtos[i]}<T> {
                ${(0, _getProperties.default)(targetDto, json.definitions[targetDto])}
            }

        `;
    }
  } // 通用接口


  const commonDtos = (0, _lodash.keys)(dtoMap).filter(n => !n.includes("["));

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
    parser: "babel-ts"
  });
  await (0, _writeFile.default)(_path.default.join(outputPath, "dto.ts"), Buffer.from(s, "utf-8"), {
    encoding: "utf-8"
  }); // 创建模块

  for (let i = 0, len = modules.length; i < len; i++) {
    const dtos = (0, _getDtos.getDtos)(modules[i].children);
    let dtoImport = "";

    if (dtos.length) {
      dtoImport += `import { ${(0, _lodash.uniq)(dtos).join(",\n ")} } from './dto';\n`;
    }

    let s = `
            import http from "../http";
            ${dtos.length ? dtoImport : ""}

            ${(0, _useQueryString.default)(modules[i].children) ? 'import queryString from "query-string"' : ""}

            class ${modules[i].moduleName} {
                ${getChildModules(modules[i].children)}
            }

            export default  ${modules[i].moduleName};
        `;
    s = _prettier.default.format(s, {
      semi: false,
      parser: "babel-ts"
    });
    await (0, _writeFile.default)(_path.default.join(`${modules[i].path}.ts`), Buffer.from(s, "utf-8"), {
      encoding: "utf-8"
    });
  }
};

var _default = createApiCatelogs;
exports.default = _default;