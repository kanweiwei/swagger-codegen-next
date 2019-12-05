"use strict";

var dataTypes = require("./dataTypes");

function getRelyDtos(_ref, commonDtos) {
  var properties = _ref.properties,
      required = _ref.required;

  var relys = [];
  Object.keys(properties).forEach(function (p) {
    var type = dataTypes[properties[p].type];
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

module.exports = getRelyDtos;