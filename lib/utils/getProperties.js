"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getType = getType;
exports.getDtoName = getDtoName;
exports.default = void 0;

var _dataTypes = _interopRequireDefault(require("../core/dataTypes"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getType(schema) {
  let type = _dataTypes.default[schema.type];

  if (!type) {
    // dto
    if (schema.$ref) {
      type = getDtoName(schema.$ref);
    }
  }

  if (type === "[]") {
    if ("type" in schema.items) {
      type = _dataTypes.default[schema.items.type] + "[]";
    } else if ("$ref" in schema.items) {
      type = getType(schema.items) + "[]";
    }
  }

  return type;
}

function getDtoName(str) {
  if (/\#\/definitions\/([\w\[\]]*)/i.exec(str)) {
    return RegExp.$1.replace("[", "<").replace("]", ">");
  }

  return "";
}

function getProperties(dtoName, {
  properties,
  required
}) {
  let res = "";
  Object.keys(properties).forEach(p => {
    let isRequired = required && required.includes(p) ? "" : "?";
    let type = _dataTypes.default[properties[p].type];
    let description = properties[p].description;

    if (!type) {
      // dto
      if (dtoName.includes("[")) {
        type = "T";
      } else {
        type = getDtoName(properties[p].$ref);
      }
    }

    if (type === "[]") {
      if ("type" in properties[p].items) {
        type = _dataTypes.default[properties[p].items.type] + "[]";
      } else if ("$ref" in properties[p].items) {
        if (dtoName.includes("[")) {
          type = "T[]";
        } else {
          type = getDtoName(properties[p].items.$ref) + "[]";
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

var _default = getProperties;
exports.default = _default;