
const json = require("../swagger.json");

const createApiCatelogs = require("./createApiCatelogs");

const { paths } = json;

const allApis = Object.keys(paths);

// 创建api目录
createApiCatelogs(paths, json);