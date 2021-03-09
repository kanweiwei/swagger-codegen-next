import { first, keys, uniq } from "lodash";
import { Method, PathItem, Paths, Swagger } from "./interface";

interface DtoMap {
  [dtoName: string]: {
    links: {
      moduleName: string;
      fns: string[];
    }[];
  };
}

export default class SwaggerHelper {
  private static _instance = new SwaggerHelper();

  private constructor() {}

  private _swagger: Swagger;

  public static get instance() {
    return SwaggerHelper._instance;
  }

  public setSwagger(obj: Swagger) {
    this._swagger = obj;
  }

  public getSwagger() {
    return this._swagger;
  }

  public getDefinitions() {
    return this._swagger.definitions;
  }

  private _pathMap: {
    [apiUrl: string]: PathItem;
  };

  public getTransformPaths() {
    if (this._pathMap) {
      return this._pathMap;
    }
    const apiUrls = keys(this._swagger.paths);
    const pathMap: {
      [apiUrl: string]: PathItem;
    } = {};
    apiUrls.forEach((api) => {
      let path = this._swagger.paths[api];
      let method = first(Object.keys(path)) as Method;
      pathMap[api] = {
        ...path[method],
        httpType: method,
      };
    });
    this._pathMap = pathMap;
    return this._pathMap;
  }

  public getUrls() {
    return Object.keys(this.getTransformPaths());
  }

  private _dtoMap: DtoMap;

  public getDtoMap() {
    if (this._dtoMap) return this._dtoMap;
    let dtoMap: {
      [dtoName: string]: {
        links: {
          moduleName: string;
          fns: string[];
        }[];
      };
    } = {};
    keys(this.getDefinitions()).forEach((name) => {
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
        names = uniq(names);
        names.forEach((dn) => {
          let targetDto = dtoMap[dn];
          let foundIndex = targetDto.links.findIndex((n) => n.moduleName === first(methodBody.tags));
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

  public getGenericDtos(){
    const genericDtos = Object.keys(this.getDtoMap()).filter(n => n.includes('['));
    let dtoNames: string[] = [];
    genericDtos.forEach((dtoName) => {
      const chars = dtoName.split("");
      let stack: string[] = [];
      const names: string[] =[];
      chars.forEach(char => {
        if(char !== '[' && char !== ']'){
          stack.push(char);
        } else if (char === '[') {
          names.push(stack.join(""));
          stack = [];
        } else {
          //
          stack = [];
        }
      });
      dtoNames = [...dtoNames, ...names];
    })
    return uniq(dtoNames);
  }

  
}
