import { Options, Swagger } from "./interface";
import createApiCatelogs from "./createApiCatelogs";
import SwaggerHelper from "./core/SwagggerHelper";
import initOptions from "./utils/initOptions";

module.exports = async (json: Swagger, options: Options) => {
  options = initOptions(options);

  SwaggerHelper.instance.init(json);

  // 创建api目录
  createApiCatelogs(json);
};
