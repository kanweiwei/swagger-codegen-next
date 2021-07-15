"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getQueryData = getQueryData;

var _lodash = require("lodash");

var _dataTypes = _interopRequireDefault(require("../core/dataTypes"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getQueryData(item) {
  let parameters = (0, _lodash.groupBy)(item.parameters, "in");
  if (!parameters.query) return;
  let s = "{";
  parameters.query.forEach(n => {
    s += `${n.name}${n.required ? "" : "?"}:${_dataTypes.default[n.type]};`;
  });
  s += "}";
  return s;
}