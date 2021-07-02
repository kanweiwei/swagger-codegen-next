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
    url: 'http://***/swagger.json',
  	// 输出目录
    output: {
        path: path.join(cwd, 'services') // default
    },
  	// 获取接口模块名称
  	getModuleName(url){
      return /api\/([^\/]*)/.exec(url)[1]
    }
}

```

bash 
```bash
swagger-codegen-next
```

## LICENSE
MIT