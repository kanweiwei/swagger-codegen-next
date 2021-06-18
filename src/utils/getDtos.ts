import { groupBy } from "lodash";
import dataTypes from "../core/dataTypes";
import SwaggerHelper from "../core/SwagggerHelper";
import { PathItem, Parameter, Schema } from "../interface";
import { getDto } from "./getDto";

function getDtoListFromSchema(schema: Schema, list: string[]) {
  if (schema.$ref) {
    if (/#\/definitions\/([\w\[\]]*)/i.exec(schema.$ref)) {
      if (RegExp.$1.includes("[")) {
        let dtoNames = SwaggerHelper.instance.getDtosFromGenericDto(RegExp.$1);
        list = [...list, ...dtoNames];
      } else {
        list.push(RegExp.$1);
      }
    }
  }
  if (dataTypes[schema.type]) {
    if (dataTypes[schema.type] === "[]") {
      const items = schema.items;
      list = getDtoListFromSchema(items, list);
    }
  }
  return list.filter((n) => !["Object", "number"].includes(n));
}

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
    if (c.responses["200"].schema) {
      res = getDtoListFromSchema(c.responses["200"].schema, res);
    }
  });
  return res.filter((n) => !["Object", "number"].includes(n));
}
