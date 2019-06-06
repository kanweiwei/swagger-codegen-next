"use strict";

var _interface = require("./interface");

var json = require("../swagger.json");


var createApiCatelogs = require("./createApiCatelogs");

// 创建api目录
createApiCatelogs(json);