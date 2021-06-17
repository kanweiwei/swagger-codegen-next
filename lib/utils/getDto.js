"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getDto = getDto;

function getDto(parameters) {
  let res;

  if ("body" in parameters) {
    const target = parameters.body[0];

    if (target) {
      if (/#\/definitions\/([\w\[\]]*)/i.exec(target.schema.$ref)) {
        res = RegExp.$1.replace("[", "<").replace("]", ">");
      }
    }
  }

  return res;
}