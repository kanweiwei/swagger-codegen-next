import { camelCase, groupBy } from "lodash";
import dataTypes from "../core/dataTypes";
import { Parameter, ParameterIn, PathItem } from "../interface";
import { getBodyDataType } from "./getBodyDataType";
import getOutputDto from "./getOutputDto";
import { getQueryData } from "./getQueryData";

export function getChildModules(childs: PathItem[]) {
  let res = "";
  childs.forEach((c) => {
    let parameters: {
      [k in ParameterIn]?: Parameter[];
    } = groupBy(c.parameters, "in");
    let hasQuery = "query" in parameters;
    let hasBody = "body" in parameters;
    let hasPath = "path" in parameters;
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
    const outputDtoString = outputDto ? `<${outputDto}>` : "";

    const queryData = getQueryData(c);

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
          type: dataTypes[pathParamsMap[RegExp.$1].type],
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
