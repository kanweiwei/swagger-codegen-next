"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _dataTypes = _interopRequireDefault(require("./dataTypes"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// @flow
function getRelyDtos(dto) {
  const {
    properties
  } = dto;
  let relys = [];
  Object.keys(properties).forEach(p => {
    let type = _dataTypes.default[properties[p].type];

    if (!type) {
      // dto
      relys.push(properties[p].$ref.match(/\#\/definitions\/([\w\[\]]*)/i)[1]);
    }

    if (type === "[]") {
      if ("$ref" in properties[p].items) {
        relys.push(properties[p].items.$ref.match(/\#\/definitions\/([\w\[\]]*)/i)[1]);
      }
    }
  });
  return relys;
}

var _default = getRelyDtos;
exports.default = _default;