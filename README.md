<h1 align="center">Swagger Codegen Next</h1>

<img src="https://img.shields.io/npm/v/swagger-codegen-next?style=flat-square"/>

generate .ts api files by swagger.json

## 📦 Install

```bash
npm install swagger-codegen-next -g
```

```bash
yarn global add swagger-codegen-next
```

## 🔨 Usage

### Configuration File

swagger-codegen.config.js

```javascript
// swagger-codegen.config.js
const path = require("path");
const cwd = process.cwd();

module.exports = {
  // swagger文件地址
  url: "http://***/swagger.json",
  // 输出目录
  output: {
    path: path.join(cwd, "services"), // default
  },
  // 获取接口模块名称
  getModuleName(url) {
    return /api\/([^\/]*)/.exec(url)[1];
  },
  // 获取接口名
  getMethodName(operationId) {
    return operationId;
  },
  // 需要跳过生成的接口
  exclude: [],
  template: {
    http: 'import http from "../http";'
  }
};
```

Now you can run the _swagger-codegen-next_:

```bash
swagger-codegen-next
```

## Config

### \*url

- support HTTP/HTTPS

  ```javascript
  {
    "url": "http://***.swaggger.json" // https://***.swagger.json
  }
  ```

- support absolute path

  ```javascript
  {
    "url": path.resolve(__dirname, "./swagger.json")
  }
  ```

### \*output

The **output** property tells `swagger-codegen-next` where to emit the _api files_ .

```javascript
{
    output: {
        path: path.join(cwd, 'services') // default
    },
}
```

## \*getModuleName

The **getModuleName** method can help `swagger-codegen-next` to group the APIs.

```javascript
{
  getModuleName(url){
    return /api\/([^\/]*)/.exec(url)[1]
  }
}
```
## getMethodName
add `getMethodName` to support to customize the name of a method.

## exclude

skip target swagger paths

eg:

```
exclude: ["/api/user/add"]
```

## LICENSE

MIT
