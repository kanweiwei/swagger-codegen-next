import { first, keys, uniq } from "lodash";
import {
  Dtos,
  Method,
  Options,
  Paths,
  Swagger,
  SwaggerPaths,
  URLWithMethod,
} from "../interface";

interface DtoMap {
  [dtoName: string]: {
    links: {
      moduleName: string;
      fns: string[];
    }[];
  };
}

/**
 * 核心类
 *
 * @description
 */
export default class SwaggerHelper {
  private static _instance = new SwaggerHelper();

  private constructor() {}

  public static get instance() {
    return SwaggerHelper._instance;
  }

  public definitions: Dtos;
  public paths: SwaggerPaths;
  public urls: URLWithMethod[] = [];

  public options: Options;

  public init(json: Swagger) {
    this.initPaths(json.paths);
    this.initDefinitions(json.definitions);
  }

  public initPaths(paths: Paths) {
    if (this.paths) {
      return;
    }
    const apiUrls = keys(paths);
    this.paths = apiUrls.reduce((map, api) => {
      let path = paths[api];
      Object.keys(path).forEach((method) => {
        const url = `${method},${api}`;
        if (SwaggerHelper.instance.options.exclude.includes(api)) {
          return;
        }
        this.urls.push(url as URLWithMethod);
        map[url] = {
          ...path[method],
          httpType: method,
        };
      });
      return map;
    }, {} as SwaggerPaths);
  }

  public initDefinitions(definitions: Dtos) {
    this.definitions = definitions;
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
    keys(this.definitions).forEach((name) => {
      dtoMap[name] = {
        links: [],
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
        names = names.concat(match.map((n) => n.match(sreg)[1]));
        names = uniq(names);
        names.forEach((dn) => {
          let targetDto = dtoMap[dn];
          let foundIndex = targetDto.links.findIndex(
            (n) => n.moduleName === first(methodBody.tags)
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

  public getDtosFromGenericDto(dtoName) {
    const chars = dtoName.split("");
    let stack = [];
    const names = [];
    chars.forEach((char) => {
      if (char !== "[" && char !== "]") {
        stack.push(char);
      } else {
        names.push(stack.join(""));
        stack = [];
      }
    });
    return names;
  }

  public getGenericDtos() {
    const genericDtos = Object.keys(this.getDtoMap()).filter((n) =>
      n.includes("[")
    );
    let dtoNames: string[] = [];
    genericDtos.forEach((dtoName) => {
      const chars = dtoName.split("");
      let stack: string[] = [];
      const names: string[] = [];
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
    return uniq(dtoNames);
  }
}
