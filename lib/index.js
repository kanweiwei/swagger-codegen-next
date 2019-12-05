"use strict";

var _createApiCatelogs = _interopRequireDefault(require("./createApiCatelogs"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const json = require("../swagger.json"); // 创建api目录


(0, _createApiCatelogs.default)(json);