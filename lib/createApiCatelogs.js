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

var _SwagggerHelper = _interopRequireDefault(require("./core/SwagggerHelper"));

var _getChildModules = require("./utils/getChildModules");

var _getDtos = require("./utils/getDtos");

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
/**
 * 创建dto和api文件
 * @param {*} json
 */

const createApiCatelogs = async (json, options) => {
  const outputPath = options.output.path; // 清空dist目录
  // @ts-ignore

  await rimrafAync(outputPath); // 创建dist目录

  await mkdirAsync(outputPath);
  options = Object.assign({}, defualtOptions, options);
  let paths = _SwagggerHelper.default.instance.paths;
  const urls = _SwagggerHelper.default.instance.urls;
  let moduleNames = (0, _lodash.uniq)(urls.map(pathName => {
    return options.getModuleName(pathName.split(",")[1]);
  }));
  let modules = [];
  moduleNames.forEach((moduleName, i) => {
    modules[i] = {
      moduleName: moduleName,
      filePath: _path.default.join(outputPath, moduleName),
      children: []
    };
    urls.forEach(apiUrl => {
      let path = paths[apiUrl];
      let method = path.httpType;
      const api = apiUrl.split(",")[1];

      if (options.getModuleName(api) === moduleName) {
        modules[i].children.push({
          api,
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
            ${(0, _useQueryString.default)(modules[i].children) ? 'import queryString from "query-string";' : ""}
            ${dtos.length ? dtoImport : ""}

            class ${modules[i].moduleName} {
                ${(0, _getChildModules.getChildModules)(modules[i].children)}
            }

            export default  ${modules[i].moduleName};
        `;
    s = _prettier.default.format(s, {
      semi: false,
      parser: "babel-ts"
    });
    await (0, _writeFile.default)(_path.default.join(`${modules[i].filePath}.ts`), Buffer.from(s, "utf-8"), {
      encoding: "utf-8"
    });
  }
};

var _default = createApiCatelogs;
exports.default = _default;