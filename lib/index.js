"use strict";

var _createApiCatelogs = _interopRequireDefault(require("./createApiCatelogs"));

var _SwagggerHelper = _interopRequireDefault(require("./core/SwagggerHelper"));

var _initOptions = _interopRequireDefault(require("./utils/initOptions"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = async (json, options = {}) => {
  options = (0, _initOptions.default)(options);

  _SwagggerHelper.default.instance.init(json); // 创建api目录


  (0, _createApiCatelogs.default)(json, options);
};