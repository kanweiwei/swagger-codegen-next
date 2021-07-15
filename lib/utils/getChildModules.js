"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getChildModules = getChildModules;

var _lodash = require("lodash");

var _dataTypes = _interopRequireDefault(require("../core/dataTypes"));

var _getBodyDataType = require("./getBodyDataType");

var _getOutputDto = _interopRequireDefault(require("./getOutputDto"));

var _getQueryData = require("./getQueryData");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getChildModules(childs) {
  let res = "";
  childs.forEach(c => {
    let parameters = (0, _lodash.groupBy)(c.parameters, "in");
    let hasQuery = ("query" in parameters);
    let hasBody = ("body" in parameters);
    let hasPath = ("path" in parameters);
    let fnName = (0, _lodash.camelCase)(c.operationId);
    let useJwt = "header" in parameters && parameters.header.some(n => n.name === "Authorization");
    const dto = (0, _getBodyDataType.getBodyDataType)(parameters);
    const comment = `/**
                      * @description ${c.summary ? c.summary : ""}
                      */ `; // if (c.summary) {

    res += comment + "\n"; // }

    const outputDto = (0, _getOutputDto.default)(c);
    const outputDtoString = outputDto ? `<${outputDto}>` : "";
    const queryData = (0, _getQueryData.getQueryData)(c);
    let api = c.api;
    let pathParamsString = "";

    if (hasPath) {
      let pathParamsMap = parameters.path.reduce((r, item) => {
        r[item.name] = item;
        return r;
      }, {});
      let pathParamReg = /\{(\w*)\}/g;
      let data = [];

      while (pathParamReg.exec(api)) {
        data.push({
          name: RegExp.$1,
          type: _dataTypes.default[pathParamsMap[RegExp.$1].type]
        });
      }

      data.forEach((n, i) => {
        if (i !== data.length - 1) {
          pathParamsString += `${n.name}: ${n.type},`;
        } else {
          pathParamsString += `${n.name}: ${n.type}`;
        }
      });
      api = api.replace(/\{(\w*)\}/g, (m, p1) => "${" + p1 + "}");
    }

    const pathParams = hasPath ? pathParamsString + "," : "";
    const apiStr = hasPath ? `\`${api}\`` : `"${api}"`;

    if (hasBody && !hasQuery) {
      res += `static  ${fnName}(${pathParams}data: ${dto}) {
                    return  http.${c.httpType}${outputDtoString}(${apiStr}, data)
                }

            `;
      return;
    } else if (!hasBody && hasQuery) {
      res += `static ${fnName}(${pathParams}data: ${queryData}) {
                    return  http.${c.httpType}${outputDtoString}(\`${api}?\$\{queryString.stringify(data)\}\`)
                }

            `;
      return;
    } else if (hasBody && hasQuery) {
      res += `static ${fnName}(${pathParams}query: ${queryData}, data: ${dto}) {
                    return  http.${c.httpType}${outputDtoString}(\`${api}?\$\{queryString.stringify(query)\}\`, data)
                }

            `;
      return;
    } else {
      res += `static ${fnName}(${pathParams}) {
                return  http.${c.httpType}${outputDtoString}(${apiStr})
              }

      `;
      return;
    }
  });
  return res;
}