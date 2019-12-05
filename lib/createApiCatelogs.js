"use strict";

var fs = require("fs");

var path = require("path");
var groupBy = require("lodash/groupBy");
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
var getMethodBody = require("./getMethodBody");

var _require = require("./transformPaths"),
    transformPaths = _require.transformPaths;

var _require2 = require("lodash"),
    flatten = _require2.flatten,
    flattenDeep = _require2.flattenDeep,
    flow = _require2.flow,
    uniq = _require2.uniq,
    first = _require2.first,
    keys = _require2.keys;

function getChildModules(childs) {
  var res = "";
  childs.forEach(function (c) {
    var parameters = groupBy(c.parameters, "in");
    var hasQuery = "query" in parameters;
    var hasBody = "body" in parameters;
    var fnName = lowerCase(c.operationId);
    if (hasBody && !hasQuery) {
      res += "\n                async " + fnName + " (data: any) {\n                    return await http." + c.method + "(\"" + c.api + "\", data)\n                }\n            ";
      return;
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
  return res;
}

/**
 * 创建dto和api文件
 * @param {*} json
 */
var createApiCatelogs = async function createApiCatelogs(json) {
  var paths = transformPaths(json.paths);
  var pathNames = Object.keys(paths);
  var moduleNames = flow(flattenDeep, uniq)(pathNames.map(function (pathName, i) {
    return paths[pathName].tags;
  }));

  moduleNames = uniq(moduleNames);
  console.log(moduleNames);

  var distPath = path.join(cwd, "./dist");
  // 清空dist目录
  await rimrafAynsc(distPath);
  // 创建dist目录
  await mkdirAsync(distPath);

  var modules = [];
  moduleNames.forEach(function (moduleName, i) {
    modules[i] = {
      moduleName: moduleName,
      path: path.join(distPath, moduleName),
      children: []
    };
    pathNames.forEach(function (pathName) {
      var path = paths[pathName];
      var method = path.httpType;
      var tag = first(path.tags);
      if (tag === moduleName) {
        modules[i].children.push(Object.assign({
          api: pathName,
          method: method
        }, path));
      }
    });
  });

  // 整理dto 引用
  var dtos = keys(json.definitions).map(function (dtoName) {
    return {
      name: dtoName,
      links: []
    };
  });
  var reg = /"\$ref":\s*"\#\/definitions\/([\w\[\]]*)"/gim;
  var sreg = /"\$ref":\s*"\#\/definitions\/([\w\[\]]*)"/im;

  var _loop = function _loop(i, len) {
    var methodBody = paths[pathNames[i]];
    var methodBodyString = JSON.stringify(methodBody);
    var match = methodBodyString.match(reg);
    var names = [];
    if (match) {
      names = names.concat(match.map(function (n) {
        return n.match(sreg)[1];
      }));
      names = uniq(names);
      names.forEach(function (dn) {
        var targetDto = dtos.find(function (n) {
          return n.name === dn;
        });
        var foundIndex = targetDto.links.findIndex(function (n) {
          return n.moduleName === first(methodBody.tags);
        });
        if (foundIndex > -1) {
          targetDto.links[foundIndex].fns.push(methodBody.operationId);
        } else {
          targetDto.links.push({
            moduleName: methodBody.tags[0],
            fns: [methodBody.operationId]
          });
        }
      });
    }
  };

  for (var i = 0, len = pathNames.length; i < len; i++) {
    _loop(i, len);
  }
  await writeFileAsync(path.join(cwd, "dist/dtos.json"), Buffer.from(JSON.stringify(dtos)), "utf-8");
  // 创建通用的dto目录
  await mkdirAsync(path.join(cwd, "dist/dto"));
  // 泛型接口
  var genericDtos = dtos.filter(function (n) {
    return n.name.indexOf("[") > -1;
  }).map(function (n) {
    return n.name;
  });
  // 通用接口
  var commonDtos = dtos.filter(function (n) {
    return n.links.length > 1 && n.name.indexOf("[") === -1;
  }).map(function (n) {
    return n.name;
  });
  for (var i = 0; i < commonDtos.length; i++) {
    var d = json.definitions[commonDtos[i]];
    var s = "";
    if (!d.properties) {
      console.log(commonDtos[i], d);
    }
    var relyDtos = getRelyDtos(d, commonDtos);
    relyDtos.forEach(function (d) {
      if (commonDtos.indexOf(d) > -1) {
        s += "\n                    import " + d + " from \"./" + d + "\";\n                ";
      } else {
        //
      }
    });
    s += "\n            interface " + commonDtos[i] + " {\n                " + getProperties(d, commonDtos) + "\n            }\n\n            export default " + commonDtos[i] + "\n        ";
    s = prettier.format(s, { semi: false, parser: "babel" });
    await writeFileAsync(path.join(cwd, "dist/dto", commonDtos[i][0].toLocaleLowerCase() + commonDtos[i].slice(1, commonDtos[i].length) + ".ts"), Buffer.from(s), "utf-8");
  }

  // 创建模块
  for (var _i = 0, len = modules.length; _i < len; _i++) {
    await mkdirAsync(path.join(cwd, "dist", modules[_i].moduleName));
    var _s = "\n            import http from \"../http\";\n            " + (modules[_i].children.some(function (c) {
      return c.method === "get" || c.method === "delete";
    }) ? 'import queryString from "query-string"' : "") + "\n\n            class " + modules[_i].moduleName + " {\n                " + getChildModules(modules[_i].children) + "\n            }\n\n            export default new " + modules[_i].moduleName + "()\n        ";
    // TODO prettier config
    _s = prettier.format(_s, { semi: false, parser: "babel" });

    await writeFileAsync(path.join(modules[_i].path, modules[_i].moduleName + ".ts"), Buffer.from(_s, "utf-8"));
  }
};
module.exports = createApiCatelogs;