import { groupBy } from "lodash";
import SwaggerHelper from "../core/SwagggerHelper";
import { PathItem, Parameter } from "../interface";
import { getDto } from "./getDto";

/**
 * 获取模块内涉及到 dto 名称
 * @param childs
 * @returns
 */
export function getDtos(childs: PathItem[]) {
  let res: string[] = [];
  childs.forEach((c: PathItem) => {
    // input dto
    let parameters: {
      [k in "header" | "query" | "body"]?: Parameter[];
    } = groupBy(c.parameters, "in");
    const dto = getDto(parameters);
    if (dto) {
      res.push(dto);
    }
    // output dto
    if (c.responses["200"].schema && c.responses["200"].schema.$ref) {
      if (/#\/definitions\/([\w\[\]]*)/i.exec(c.responses["200"].schema.$ref)) {
        if (RegExp.$1.includes("[")) {
          let dtoNames = SwaggerHelper.instance.getDtosFromGenericDto(
            RegExp.$1
          );
          res = [...res, ...dtoNames];
        } else {
          res.push(RegExp.$1);
        }
      }
    }
  });
  return res;
}
