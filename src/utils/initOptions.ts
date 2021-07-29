import path from "path";
import SwaggerHelper from "../core/SwagggerHelper";
import { Options } from "../interface";

const cwd = process.cwd();

const defualtOptions: Partial<Options> = {
  output: {
    path: path.join(cwd, "./services"),
  },
  exclude: [],
  template: {
    http: 'import http from "../http";',
  },
};

export default function initOptions(options: Options) {
  options = Object.assign({}, defualtOptions, options);
  if (!options.getModuleName) {
    throw new Error('"getModuleName" must be defined');
  }
  SwaggerHelper.instance.options = options;
  return options;
}
