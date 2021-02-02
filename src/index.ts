import { Swagger } from "./interface";
import createApiCatelogs from "./createApiCatelogs";

module.exports = (json: Swagger) => {
    // 创建api目录
    createApiCatelogs(json);
}
