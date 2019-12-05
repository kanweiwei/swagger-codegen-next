// @flow

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

export interface PathItem {
  httpType: Method;
  tags: string[];
  operationId: string;
  consumes: string[];
  produces: any[];
  parameters: Parameter[];
}

export type ApiUrl = string;
export interface Paths {
  [x: string]: PathItem;
}

export interface DtoProperty {
  format?: String;
  type?: DataTypes;
  enum?: number[];
  maximum?: Number;
  mainimum?: Number;
  readOnly?: Boolean;
  uniqueItems?: Boolean;
  maxLength?: Number;
  items: {
    $ref: String
  };
}

export interface Dto {
  type: "object";
  properties: {
    [x: string]: DtoProperty
  };
}

export interface Dtos {
  [x: string]: Dto;
}

export interface Swagger {
  paths: Paths;
  definitions: Dtos;
  [propName: string]: any;
}
