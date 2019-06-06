// @flow

export type DataTypes = "string" | "boolean" | "integer" | "array";

export type Method = "post" | "delete" | "put" | "get";

interface SimpleSchema {
  format?: "int64" | "int32" | "double";
  type?: "integer" | "number" | "string";
  enum?: number[];
  maximum?: Number;
  mainimum?: Number;
  maxLength?: Number;
  readOnly?: Boolean;
}

interface ComplexSchema {
  uniqueItems: Boolean;
  type: "array";
  items: {
    $ref: String // #/definitions/PagedResultRequestDto   | "object"
  };
}

export type Schema = SimpleSchema | ComplexSchema;

export interface Parameter {
  name: string;
  in: "query" | "body" | "header";
  required: Boolean;
  schema?: Schema;
  description: string;
  type: DataTypes;
  default: string;
}

export interface Responses {
  [x: string]: {
    description: String, // 'Success'
    schema?: Schema
  };
}

export interface MethodBody {
  tags: string[];
  operationId: string;
  consumes: string[];
  produces: any[];
  parameters: Parameter[];
  responses: Responses;
}

export interface PathItem {
  [method: Method]: MethodBody;
}
export interface Paths {
  [x: string]: PathItem;
}

export interface Dto {
  type: "object";
  properties: {
    [x: string]: Schema
  };
}

export interface Dtos {
  [x: string]: Dto;
}

interface SwaggerInfo {
  version: String;
  title: String;
}

export interface Swagger {
  swagger: String;
  info: SwaggerInfo;
  paths: Paths;
  definitions: Dtos;
  [propName: string]: any;
}
