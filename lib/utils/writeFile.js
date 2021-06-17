"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = writeFile;

var _fs = _interopRequireDefault(require("fs"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function writeFile(filePath, data, options) {
  return new Promise((resolve, reject) => {
    _fs.default.writeFile(filePath, data, options, err => {
      if (err) {
        reject(err);
      }

      resolve(null);
    });
  });
}