"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _dataTypes = _interopRequireDefault(require("./dataTypes"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// @flow
function getProperties(dtoName, {
  properties,
  required
}) {
  let res = "";
  Object.keys(properties).forEach(p => {
    let isRequired = (() => {
      if (required && required.includes(p)) {
        return "";
      } else {
        return "?";
      }
    })();

    let type = _dataTypes.default[properties[p].type];
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
        type = _dataTypes.default[properties[p].items.type] + "[]";
      } else if ("$ref" in properties[p].items) {
        if (dtoName.includes("[")) {
          type = "T[]";
        } else {
          type = properties[p].items.$ref.match(/\#\/definitions\/([\w\[\]]*)/i)[1] + "[]";
        }
      }
    }

    res += `

            /**
             * @description ${description ?? ""}
             */
            ${p}${isRequired}: ${type};

        `;
  });
  return res;
}

var _default = getProperties;
exports.default = _default;