"use strict";

var dataTypes = require("./dataTypes");

function getProperties(_ref, commonDtos) {
  var properties = _ref.properties,
      required = _ref.required;

  var res = "";
  Object.keys(properties).forEach(function (p) {
    var isRequired = function () {
      if (required && required.indexOf(p) > -1) {
        return "";
      } else {
        return "?";
      }
    }();
    var type = dataTypes[properties[p].type];
    if (!type) {
      // dto
      type = properties[p].$ref.match(/\#\/definitions\/([\w\[\]]*)/i)[1];
    }
    if (type === "[]") {
      if ("type" in properties[p].items) {
        type = dataTypes[properties[p].items.type] + "[]";
      } else if ("$ref" in properties[p].items) {
        type = properties[p].items.$ref.match(/\#\/definitions\/([\w\[\]]*)/i)[1] + "[]";
      }
    }
    res += "\n            " + p + isRequired + ": " + type + ";\n        ";
  });
  return res;
}

module.exports = getProperties;