"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getDtos = getDtos;

var _lodash = require("lodash");

var _dataTypes = _interopRequireDefault(require("../core/dataTypes"));

var _SwagggerHelper = _interopRequireDefault(require("../core/SwagggerHelper"));

var _getDto = require("./getDto");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getDtoListFromSchema(schema, list) {
  if (schema.$ref) {
    if (/#\/definitions\/([\w\[\]]*)/i.exec(schema.$ref)) {
      if (RegExp.$1.includes("[")) {
        let dtoNames = _SwagggerHelper.default.instance.getDtosFromGenericDto(RegExp.$1);

        list = [...list, ...dtoNames];
      } else {
        list.push(RegExp.$1);
      }
    }
  }

  if (_dataTypes.default[schema.type]) {
    if (_dataTypes.default[schema.type] === "[]") {
      const items = schema.items;
      list = getDtoListFromSchema(items, list);
    }
  }

  return list.filter(n => !["Object", "number"].includes(n));
}
/**
 * 获取模块内涉及到 dto 名称
 * @param childs
 * @returns
 */


function getDtos(childs) {
  let res = [];
  childs.forEach(c => {
    // input dto
    let parameters = (0, _lodash.groupBy)(c.parameters, "in");
    const dto = (0, _getDto.getDto)(parameters);

    if (dto) {
      res.push(dto);
    } // output dto


    if (c.responses["200"].schema) {
      res = getDtoListFromSchema(c.responses["200"].schema, res);
    }
  });
  return res.filter(n => !["Object", "number"].includes(n));
}