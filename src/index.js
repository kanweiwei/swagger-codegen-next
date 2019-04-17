
// @flow

const json = require("../swagger.json");

const createApiCatelogs = require("./createApiCatelogs");

const { paths } = json;

const allApis: string[] = Object.keys(paths);

// 创建api目录
createApiCatelogs(paths, json);
