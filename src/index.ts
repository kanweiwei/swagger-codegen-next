import { Swagger } from "./interface";
import createApiCatelogs from "./createApiCatelogs";
const json: Swagger = require("../swagger.json");

// 创建api目录
createApiCatelogs(json);
