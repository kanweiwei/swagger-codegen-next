"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true,
});
exports.default = void 0;

var _lodash = require("lodash");

class SwaggerHelper {
  static _instance = new SwaggerHelper();

  constructor() {}

  static get instance() {
    return SwaggerHelper._instance;
  }

  setSwagger(obj) {
    this._swagger = obj;
  }

  getSwagger() {
    return this._swagger;
  }

  getDefinitions() {
    return this._swagger.definitions;
  }

  getTransformPaths() {
    if (this._pathMap) {
      return this._pathMap;
    }

    const apiUrls = (0, _lodash.keys)(this._swagger.paths);
    const pathMap = {};
    apiUrls.forEach((api) => {
      let path = this._swagger.paths[api];
      let method = (0, _lodash.first)(Object.keys(path));
      pathMap[api] = { ...path[method], httpType: method };
    });
    this._pathMap = pathMap;
    return this._pathMap;
  }

  getUrls() {
    return Object.keys(this.getTransformPaths());
  }

  getDtoMap() {
    if (this._dtoMap) return this._dtoMap;
    let dtoMap = {};
    (0, _lodash.keys)(this.getDefinitions()).forEach((name) => {
      dtoMap[name] = {
        links: [],
      };
    });
    const paths = this.getTransformPaths();
    const urls = this.getUrls();
    let reg = /"\$ref":\s*"\#\/definitions\/([\w\[\]]*)"/gim;
    let sreg = /"\$ref":\s*"\#\/definitions\/([\w\[\]]*)"/im;

    for (let i = 0, len = urls.length; i < len; i++) {
      let methodBody = paths[urls[i]];
      let methodBodyString = JSON.stringify(methodBody);
      let match = methodBodyString.match(reg);
      let names = [];

      if (match) {
        names = names.concat(match.map((n) => n.match(sreg)[1]));
        names = (0, _lodash.uniq)(names);
        names.forEach((dn) => {
          let targetDto = dtoMap[dn];
          let foundIndex = targetDto.links.findIndex(
            (n) => n.moduleName === (0, _lodash.first)(methodBody.tags)
          );

          if (foundIndex > -1) {
            targetDto.links[foundIndex].fns.push(methodBody.operationId);
          } else {
            targetDto.links.push({
              moduleName: methodBody.tags[0],
              fns: [methodBody.operationId],
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
    chars.forEach((char) => {
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
    return names;
  }

  getGenericDtos() {
    const genericDtos = Object.keys(this.getDtoMap()).filter((n) =>
      n.includes("[")
    );
    let dtoNames = [];
    genericDtos.forEach((dtoName) => {
      const chars = dtoName.split("");
      let stack = [];
      const names = [];
      chars.forEach((char) => {
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
