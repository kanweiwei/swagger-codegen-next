"use strict";

var dataTypes = require("./dataTypes");
var uniq = require("lodash/uniq");

function getRelyDtos(dto) {
  var properties = dto.properties;

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
  return uniq(relys);
}

module.exports = getRelyDtos;