export type DataTypes = "string" | "boolean" | "integer" | "array";

export type Method = "post" | "delete" | "put" | "get";

export interface Schema {
  $ref: string;
}
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
  operationId: string;
  consumes: string[];
  produces: Produce[];
  parameters: Parameter[];
}

export type ApiUrl = string;
export interface Paths {
  [x: string]: { [k in Method]: PathItem };
}

export interface SwaggerPaths {
  [x: string]: PathItem;
}

export interface DtoProperty {
  $ref?: string;
  format?: string;
  type?: DataTypes;
  enum?: number[];
  maximum?: Number;
  mainimum?: Number;
  readOnly?: Boolean;
  uniqueItems?: Boolean;
  maxLength?: Number;
  items: {
    $ref: string;
  };
}

export interface Dto {
  required?: string[];
  type: "object";
  properties: {
    [propertyName: string]: DtoProperty;
  };
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
