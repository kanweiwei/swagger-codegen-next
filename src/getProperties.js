// @flow
const dataTypes = require("./dataTypes");

function getProperties(dto: any) {
  const { properties, required } = dto;
  let res: string = "";
  Object.keys(properties).forEach(p => {
    let isRequired: "" | "?" = (() => {
      if (required && required.indexOf(p) > -1) {
        return "";
      } else {
        return "?";
      }
    })();
    let type = dataTypes[properties[p].type];
    if (!type) {
      // dto
      type = properties[p].$ref.match(/\#\/definitions\/([\w\[\]]*)/i)[1];
    }
    if (type === "[]") {
      if ("type" in properties[p].items) {
        type = dataTypes[properties[p].items.type] + "[]";
      } else if ("$ref" in properties[p].items) {
        type =
          properties[p].items.$ref.match(/\#\/definitions\/([\w\[\]]*)/i)[1] +
          "[]";
      }
    }
    res += `
            ${p}${isRequired}: ${type};
        `;
  });
  return res;
}

module.exports = getProperties;
