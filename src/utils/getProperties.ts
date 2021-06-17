import dataTypes from "../core/dataTypes";
import { DtoProperty } from "../interface";

export function getType(schema: DtoProperty) {
  let type = dataTypes[schema.type];
  if (!type) {
    // dto
    if (schema.$ref) {
      type = getDtoName(schema.$ref);
    } 
  }
  if (type === "[]") {
    if ("type" in schema.items) {
      type = dataTypes[schema.items.type] + "[]";
    } else if ("$ref" in schema.items) {
      type = getType(schema.items) +
          "[]";
    }
  }
  return type;
}

export function getDtoName(str: string) {
  if(/\#\/definitions\/([\w\[\]]*)/i.exec(str)){
    return RegExp.$1.replace('[','<').replace(']','>')
  }
  return ''
}

function getProperties(
  dtoName: string,
  { properties, required }: { properties: any; required?: string[] }
) {
  let res: string = "";
  Object.keys(properties).forEach((p) => {
    let isRequired: "" | "?" = (() => {
      if (required && required.includes(p)) {
        return "";
      } else {
        return "?";
      }
    })();
    let type = dataTypes[properties[p].type];
    let description = properties[p].description;
    if (!type) {
      // dto
      if (dtoName.includes("[")) {
        type = "T";
      } else {
        type = properties[p].$ref.match(/\#\/definitions\/([\w\[\]]*)/i)[1];
      }
    }
    if (type === "[]") {
      if ("type" in properties[p].items) {
        type = dataTypes[properties[p].items.type] + "[]";
      } else if ("$ref" in properties[p].items) {
        if (dtoName.includes("[")) {
          type = "T[]";
        } else {
          type =
            properties[p].items.$ref.match(/\#\/definitions\/([\w\[\]]*)/i)[1] +
            "[]";
        }
      }
    }
    res += `

            /**
             * @description ${description ? description : ""}
             */
            ${p}${isRequired}: ${type};

        `;
  });
  return res;
}

export default getProperties;
