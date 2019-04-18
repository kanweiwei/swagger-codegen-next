
// @flow
import { Swagger } from "./interface";

const json: Swagger = require("../swagger.json");

const createApiCatelogs = require("./createApiCatelogs");

// 创建api目录
createApiCatelogs(json);
