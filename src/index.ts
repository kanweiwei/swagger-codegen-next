import { Swagger } from "./interface";
import createApiCatelogs from "./createApiCatelogs";
import SwaggerHelper from "./core/SwagggerHelper";

module.exports = (json: Swagger) => {
  SwaggerHelper.instance.init(json);

  // 创建api目录
  createApiCatelogs(json);
};
