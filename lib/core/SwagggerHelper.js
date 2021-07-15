"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _lodash = require("lodash");

/**
 * 核心类
 *
 * @description
 */
class SwaggerHelper {
  static _instance = new SwaggerHelper();

  constructor() {}

  static get instance() {
    return SwaggerHelper._instance;
  }

  urls = [];

  init(json) {
    this.initPaths(json.paths);
    this.initDefinitions(json.definitions);
  }

  initPaths(paths) {
    if (this.paths) {
      return;
    }

    const apiUrls = (0, _lodash.keys)(paths);
    this.paths = apiUrls.reduce((map, api) => {
      let path = paths[api];
      Object.keys(path).forEach(method => {
        const url = `${method},${api}`;
        this.urls.push(url);
        map[url] = { ...path[method],
          httpType: method
        };
      });
      return map;
    }, {});
  }

  initDefinitions(definitions) {
    this.definitions = definitions;
  }

  getDtoMap() {
    if (this._dtoMap) return this._dtoMap;
    let dtoMap = {};
    (0, _lodash.keys)(this.definitions).forEach(name => {
      dtoMap[name] = {
        links: []
      };
    });
    const paths = this.paths;
    let reg = /"\$ref":\s*"\#\/definitions\/([\w\[\]]*)"/gim;
    let sreg = /"\$ref":\s*"\#\/definitions\/([\w\[\]]*)"/im;

    for (let i = 0, len = this.urls.length; i < len; i++) {
      let methodBody = paths[this.urls[i]];
      let methodBodyString = JSON.stringify(methodBody);
      let match = methodBodyString.match(reg);
      let names = [];

      if (match) {
        names = names.concat(match.map(n => n.match(sreg)[1]));
        names = (0, _lodash.uniq)(names);
        names.forEach(dn => {
          let targetDto = dtoMap[dn];
          let foundIndex = targetDto.links.findIndex(n => n.moduleName === (0, _lodash.first)(methodBody.tags));

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
    }

    this._dtoMap = dtoMap;
    return this._dtoMap;
  }

  getDtosFromGenericDto(dtoName) {
    const chars = dtoName.split("");
    let stack = [];
    const names = [];
    chars.forEach(char => {
      if (char !== "[" && char !== "]") {
        stack.push(char);
      } else {
        names.push(stack.join(""));
        stack = [];
      }
    });
    return names;
  }

  getGenericDtos() {
    const genericDtos = Object.keys(this.getDtoMap()).filter(n => n.includes("["));
    let dtoNames = [];
    genericDtos.forEach(dtoName => {
      const chars = dtoName.split("");
      let stack = [];
      const names = [];
      chars.forEach(char => {
        if (char !== "[" && char !== "]") {
          stack.push(char);
        } else if (char === "[") {
          names.push(stack.join(""));
          stack = [];
        } else {
          //
          stack = [];
        }
      });
      dtoNames = [...dtoNames, ...names];
    });
    return (0, _lodash.uniq)(dtoNames);
  }

}

exports.default = SwaggerHelper;