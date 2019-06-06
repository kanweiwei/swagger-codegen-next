"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var fs = require("fs");
var path = require("path");
var uniq = require("lodash/uniq");
var groupBy = require("lodash/groupBy");
var uniqBy = require("lodash/uniqBy");
var Promise = require("bluebird");
var rimrafAynsc = Promise.promisify(require("rimraf"));
var mkdirAsync = Promise.promisify(fs.mkdir);
var writeFileAsync = Promise.promisify(fs.writeFile);
var cwd = process.cwd();
var lowerCase = require("./lowerCase");
var prettier = require("prettier");
var dataTypes = require("./dataTypes");

var getProperties = require("./getProperties");
var getRelyDtos = require("./getRelyDtos");

function getChildModules(childs, replyImport) {
  var res = "";
  var relys = [];
  childs.forEach(function (c) {
    var parameters = groupBy(c.parameters, "in");
    var hasQuery = "query" in parameters;
    var hasBody = "body" in parameters;
    var fnName = lowerCase(c.operationId);
    if (hasBody && !hasQuery) {
      var schema = parameters["body"][0].schema;
      var type = dataTypes[schema.type];
      if (type === "[]") {
        var $ref = schema.items.$ref;
        var ctype = dataTypes[schema.items.type];
        if (!$ref) {
          res += "\n                async " + fnName + " (data: " + ctype + "[]) {\n                    return await http." + c.method + "(\"" + c.api + "\", data)\n                }\n            ";
        }
        return;
      } else {
        var $ref = schema.$ref;
      }
      var dto = $ref.match(/\#\/definitions\/([\w\[\]]*)/)[1];
      if (dto.indexOf("[") > -1) {
        var dtoMatch = dto.match(/(\w*)\[(\w*)\]/);
        var dto1 = dto[1];
        var dto2 = dto[2];
        relys = relys.concat([dto1, dto2]);
        if (schema.type === "array") {
          dto2 = dto1 + "<" + dto2 + ">[]";
        }
        res += "\n                async " + fnName + " (data: " + dto2 + ") {\n                    return await http." + c.method + "(\"" + c.api + "\", data)\n                }\n            ";
        return;
      } else {
        relys = relys.concat([dto]);
        if (schema.type === "array") {
          dto = dto + "[]";
        }
        res += "\n        async " + fnName + " (data: " + dto + ") {\n            return await http." + c.method + "(\"" + c.api + "\", data)\n        }\n    ";
        return;
      }
    }
    if (!hasBody && hasQuery) {
      res += "\n                async " + fnName + " (data: any) {\n                    return await http." + c.method + "(\"" + c.api + "?\" + queryString.stringify(data))\n                }\n            ";
      return;
    }
    if (hasBody && hasQuery) {
      res += "\n                async " + fnName + " (query: any, data: any) {\n                    return await http." + c.method + "(\"" + c.api + "?\" + queryString.stringify(query), data)\n                }\n            ";
      return;
    }
  });
  relys = uniq(relys);
  return [res, relys];
}

function getMethodType(paths, pathName) {
  var path = paths[pathName];
  var method = Array.prototype.slice.call(Object.keys(path))[0];
  return method;
}

function getMethodBody(paths, pathName) {
  var method = getMethodType(paths, pathName);
  var methodBody = paths[pathName][method];
  return methodBody;
}

var createApiCatelogs = async function createApiCatelogs(json) {
  var paths = json.paths;
  var pathNames = Object.keys(paths);
  // 模块名
  var appNames = [];
  for (var i = 0, len = pathNames.length; i < len; i++) {
    var methodBody = getMethodBody(paths, pathNames[i]);
    appNames = appNames.concat(methodBody.tags);
  }
  appNames = uniq(appNames);
  var distPath = path.join(cwd, "./dist");
  // 清空dist目录
  await rimrafAynsc(distPath);
  // 创建dist目录
  await mkdirAsync(distPath);

  var modules = [];
  appNames.forEach(function (appName, i) {
    var name = lowerCase(appName);
    modules[i] = {
      appName: appName,
      lowerName: name,
      path: path.join(distPath, name),
      children: []
    };
    for (var ii = 0, _len = pathNames.length; ii < _len; ii++) {
      var _methodBody = getMethodBody(paths, pathNames[ii]);
      var method = getMethodType(paths, pathNames[ii]);
      var tag = _methodBody.tags[0];
      if (tag === appName) {
        var child = {};
        child.api = pathNames[ii];
        child.method = method;
        child = Object.assign({}, child, _methodBody);
        modules[i].children.push(child);
      }
    }
  });

  // 整理dto 引用
  var dtos = Object.keys(json.definitions).map(function (dtoName) {
    return {
      name: dtoName,
      links: []
    };
  });

  var reg = /\#\/definitions\/([\w\[\]]*)/g;
  var sreg = /\#\/definitions\/([\w\[\]]*)/;

  var _loop = function _loop(_i, _len2) {
    var methodBody = getMethodBody(paths, pathNames[_i]);
    var methodBodyString = JSON.stringify(methodBody);
    var match = methodBodyString.match(reg);
    var names = [];
    if (match) {
      names = names.concat(match.map(function (n) {
        return n.match(sreg)[1];
      }));
      names = uniq(names);
      names.forEach(function (dn) {
        var dto = dtos.find(function (n) {
          return n.name === dn;
        });
        if (dto) {
          var foundIndex = dto.links.findIndex(function (n) {
            return n.appName === methodBody.tags[0];
          });
          if (foundIndex > -1) {
            dto.links[foundIndex].fns.push(methodBody.operationId);
          } else {
            dto.links.push({
              appName: methodBody.tags[0],
              lowerName: lowerCase(methodBody.tags[0]),
              fns: [methodBody.operationId]
            });
          }
        }
      });
    }
  };

  for (var _i = 0, _len2 = pathNames.length; _i < _len2; _i++) {
    _loop(_i, _len2);
  }
  await writeFileAsync(path.join(cwd, "dist/dtos.json"), Buffer.from(JSON.stringify(dtos)), "utf-8");
  // 创建dto目录
  await mkdirAsync(path.join(cwd, "dist/dto"));

  var commonDtos = dtos.filter(function (n) {
    return n.name.indexOf("[") === -1;
  });
  var genericDtos = uniqBy(dtos.filter(function (n) {
    return n.name.indexOf("[") > -1;
  }).map(function (n) {
    var originName = n.name;
    n.name = n.name.match(/(\w*)(\[(\w*)\])/)[1];
    n.originName = originName;
    return n;
  }), "name");

  for (var _i2 = 0; _i2 < commonDtos.length; _i2++) {
    var d = json.definitions[commonDtos[_i2].name];
    var s = "";
    var relyDtos = getRelyDtos(d);
    relyDtos.forEach(function (relyDto) {
      s += "\n          import " + relyDto + " from \"./" + lowerCase(relyDto) + "\";\n      ";
    });
    s += "\n      interface " + commonDtos[_i2].name + " {\n          " + getProperties(d) + "\n      }\n\n      export default " + commonDtos[_i2].name + "\n  ";

    s = prettier.format(s, { parser: "babel" });
    await writeFileAsync(path.join(cwd, "dist/dto", lowerCase(commonDtos[_i2].name) + ".ts"), Buffer.from(s), "utf-8");
  }

  for (var _i3 = 0; _i3 < genericDtos.length; _i3++) {
    var dto = json.definitions[genericDtos[_i3].originName];
    var properties = dto.properties;
    var _s = "\n      interface " + genericDtos[_i3].name + "<T> {\n    ";
    var keys = Object.keys(properties);
    for (var _i4 = 0; _i4 < keys.length; _i4++) {
      var p = properties[keys[_i4]];
      var type = dataTypes[p.type];
      if (type === "[]") {
        _s += keys[_i4] + ": Array<T>;\n        ";
      } else {
        _s += keys[_i4] + ": " + type + ";\n        ";
      }
    }
    _s += "\n      }\n      export default " + genericDtos[_i3].name + ";\n    ";
    _s = prettier.format(_s, { parser: "babel" });

    await writeFileAsync(path.join(cwd, "dist/dto", lowerCase(genericDtos[_i3].name) + ".ts"), Buffer.from(_s), "utf-8");
  }

  // 创建模块
  for (var _i5 = 0, _len3 = modules.length; _i5 < _len3; _i5++) {
    await mkdirAsync(path.join(cwd, "dist", modules[_i5].lowerName));
    var relyImport = "";
    var _s2 = "\n            import http from \"../http\";\n            " + (modules[_i5].children.some(function (c) {
      return c.method === "get" || c.method === "delete";
    }) ? 'import queryString from "query-string"' : "") + "\n        ";

    var _getChildModules = getChildModules(modules[_i5].children, relyImport),
        _getChildModules2 = _slicedToArray(_getChildModules, 2),
        childString = _getChildModules2[0],
        relyImports = _getChildModules2[1];

    relyImports.forEach(function (relyImport) {
      _s2 += "import " + relyImport + " from \"../dto/" + lowerCase(relyImport) + "\";\n              ";
    });
    _s2 += "\n    class " + modules[_i5].appName + "Service {\n        " + childString + "\n    }\n    export default new " + modules[_i5].appName + "Service()\n  ";
    // TODO prettier config
    _s2 = prettier.format(_s2, { parser: "babel" });

    await writeFileAsync(path.join(modules[_i5].path, modules[_i5].lowerName + "Service.ts"), Buffer.from(_s2, "utf-8"));
  }
};
module.exports = createApiCatelogs;