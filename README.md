<h1 align="center">Swagger Codegen Next</h1>

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
    url: 'http://***/swagger.json',
    output: {
        path: path.join(cwd, 'services') // default
    }
}

```

bash 
```bash
swagger-codegen-next
```

## LICENSE
MIT