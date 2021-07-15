export type DataTypes = "string" | "boolean" | "integer" | "array";

export type Method = "post" | "delete" | "put" | "get";

export interface Schema extends DtoProperty {}
export interface Parameter {
  name: string;
  in: "query" | "body" | "header";
  required: Boolean;
  schema?: Schema;
  description: string;
  type: DataTypes;
  default: string;
}

export type Produce = "text/plain" | "application/json" | "text/json";
export interface PathItem {
  httpType: Method;
  tags: string[];
  summary: string;
  operationId: string;
  consumes: string[];
  produces: Produce[];
  parameters: Parameter[];
  responses: {
    [x: string]: {
      description: string;
      schema?: Schema;
    };
  };
  api?: string;
}

export type ApiUrl = string;
export interface Paths {
  [x: string]: { [k in Method]: PathItem };
}

type Url = string;

export type URLWithMethod = `${Method},${Url}`;

export interface SwaggerPaths {
  [x: string]: PathItem;
}

export interface DtoProperty {
  description?: string;
  $ref?: string;
  format?: string;
  type?: DataTypes;
  enum?: number[];
  maximum?: Number;
  mainimum?: Number;
  readOnly?: Boolean;
  uniqueItems?: Boolean;
  maxLength?: Number;
  items: Schema;
}

export type DtoProperties = {
  [propertyName: string]: DtoProperty;
};

export interface Dto {
  required?: string[];
  type: "object";
  properties: DtoProperties;
}

export interface Dtos {
  [x: string]: Dto;
}

export interface Swagger {
  swagger: string;
  info: {
    version: string;
    title: string;
  };
  paths: Paths;
  definitions: Dtos;
  [propName: string]: any;
}

export interface Options {
  output?: {
    /**
     * 输出目录的绝对路径
     */
    path?: string;
  };
  /**
   *  获取模块名称
   */
  getModuleName: (path: string) => string;
}
