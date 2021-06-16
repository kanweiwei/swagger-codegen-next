import dataTypes from "../core/dataTypes";
import { Dto } from "../interface";

function getRelyDtos(dto: Dto) {
  const { properties } = dto;
  let relys: string[] = [];
  Object.keys(properties).forEach((p) => {
    let type = dataTypes[properties[p].type];
    if (!type) {
      // dto
      relys.push(properties[p].$ref.match(/\#\/definitions\/([\w\[\]]*)/i)[1]);
    }
    if (type === "[]") {
      if ("$ref" in properties[p].items) {
        relys.push(
          properties[p].items.$ref.match(/\#\/definitions\/([\w\[\]]*)/i)[1]
        );
      }
    }
  });
  return relys;
}
export default getRelyDtos;
