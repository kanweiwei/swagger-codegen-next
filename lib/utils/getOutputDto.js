"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getOutputDto;

function getOutputDto(item) {
  let res;

  if (item.responses["200"].schema && item.responses["200"].schema.$ref) {
    if (/#\/definitions\/([\w\[\]]*)/i.exec(item.responses["200"].schema.$ref)) {
      res = RegExp.$1.replace("[", "<").replace("]", ">");
    }
  }

  return res;
}