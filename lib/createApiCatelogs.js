
const fs = require("fs");
const path = require("path");
const uniq = require("lodash/uniq");
const groupBy = require("lodash/groupBy");
const Promise = require("bluebird");
const rimrafAynsc = Promise.promisify(require("rimraf"));
const mkdirAsync = Promise.promisify(fs.mkdir);
const writeFileAsync = Promise.promisify(fs.writeFile);
const cwd = process.cwd();
const prettier = require("prettier");
const dataTypes = require("./dataTypes");

const getProperties = require("./getProperties");
const getRelyDtos = require("./getRelyDtos");

function getQueryTypes(query) {
    if (query.some(n => n.name === "dto" && 'schema' in n)) {} else {}
}

function getChildModules(childs) {
    let res = '';
    childs.forEach(c => {
        let parameters = groupBy(c.parameters, 'in');
        let hasQuery = "query" in parameters;
        let hasBody = "body" in parameters;

        let fnName = c.operationId[0].toLocaleLowerCase() + c.operationId.slice(1, c.operationId.length);
        if (hasBody && !hasQuery) {
            res += `
                async ${fnName} (data: any) {
                    return await http.${c.method}("${c.api}", data)
                }
            `;
            return;
        }
        if (!hasBody && hasQuery) {
            res += `
                async ${fnName} (data: any) {
                    return await http.${c.method}("${c.api}?" + queryString.stringify(data))
                }
            `;
            return;
        }
        if (hasBody && hasQuery) {
            res += `
                async ${fnName} (query: any, data: any) {
                    return await http.${c.method}("${c.api}?" + queryString.stringify(query), data)
                }
            `;
            return;
        }
    });
    return res;
}

const createApiCatelogs = async (paths, json) => {
    const allApis = Object.keys(paths);
    let moduleNames = [];
    for (let i = 0, len = allApis.length; i < len; i++) {
        const method = Object.keys(paths[allApis[i]])[0];
        moduleNames = moduleNames.concat(paths[allApis[i]][method].tags);
    }
    moduleNames = uniq(moduleNames);
    const distPath = path.join(cwd, './dist');
    // 清空dist目录
    await rimrafAynsc(distPath);
    // 创建dist目录
    await mkdirAsync(distPath);

    const modules = [];
    moduleNames.forEach((moduleName, i) => {
        let name = moduleName[0].toLocaleLowerCase() + moduleName.slice(1, moduleName.length);
        modules[i] = {
            moduleName: moduleName,
            name: name,
            path: path.join(distPath, name),
            childModules: []
        };
        for (let ii = 0, len = allApis.length; ii < len; ii++) {
            const method = Object.keys(paths[allApis[ii]])[0];
            let content = paths[allApis[ii]][method];
            let tag = content.tags[0];
            if (tag === moduleName) {
                content.api = allApis[ii];
                content.method = method;
                modules[i].childModules.push(content);
            }
        }
    });

    // 整理dto 引用
    let dtos = {};
    let dtoNames = [];
    let reg = /"\$ref":\s*"\#\/definitions\/([\w\[\]]*)"/gim;
    let sreg = /"\$ref":\s*"\#\/definitions\/([\w\[\]]*)"/im;
    for (let i = 0, len = allApis.length; i < len; i++) {
        let apiContent = JSON.stringify(paths[allApis[i]]);
        let match = apiContent.match(reg);
        if (match) {
            dtoNames = dtoNames.concat(match.map(n => n.match(sreg)[1]));
        }
    }
    dtoNames = uniq(dtoNames);
    dtoNames.forEach(dn => {
        dtos[dn] = {
            name: dn,
            links: []
        };
    });

    for (let i = 0, len = allApis.length; i < len; i++) {
        let method = Object.keys(paths[allApis[i]])[0];
        let apiContent = paths[allApis[i]][method];
        let apiContentString = JSON.stringify(apiContent);
        let match = apiContentString.match(reg);
        let names = [];
        if (match) {
            names = names.concat(match.map(n => n.match(sreg)[1]));
            names = uniq(names);
            names.forEach(dn => {
                let foundIndex = dtos[dn].links.findIndex(n => n.moduleName === apiContent.tags[0]);
                if (foundIndex > -1) {
                    dtos[dn].links[foundIndex].fns.push(apiContent.operationId);
                } else {
                    dtos[dn].links.push({
                        moduleName: apiContent.tags[0],
                        name: apiContent.tags[0][0].toLocaleLowerCase() + apiContent.tags[0].slice(1, apiContent.tags[0].length),
                        fns: [apiContent.operationId]
                    });
                }
            });
        }
    }
    await writeFileAsync(path.join(cwd, 'dist/dtos.json'), Buffer.from(JSON.stringify(dtos)), 'utf-8');
    // 创建通用的dto目录
    await mkdirAsync(path.join(cwd, 'dist/dto'));
    // 泛型接口
    const genericDtos = Object.keys(dtos).filter(n => n.indexOf("[") > -1);
    // 通用接口
    const commonDtos = Object.keys(dtos).filter(n => dtos[n].links.length > 1 && n.indexOf("[") === -1);
    for (let i = 0; i < commonDtos.length; i++) {
        let d = json.definitions[commonDtos[i]];
        let s = "";
        if (!d.properties) {
            console.log(commonDtos[i], d);
        }
        const relyDtos = getRelyDtos(d, commonDtos, json.definitions);
        relyDtos.forEach(d => {
            if (commonDtos.indexOf(d) > -1) {
                s += `
                    import ${d} from "./${d[0].toLocaleLowerCase() + d.slice(1, d.length)}";
                `;
            } else {
                let target = json.definitions[d];
                s += `
                    import ${d} from "../${target.name}/dto/${d}"
                `;
            }
        });
        s += `
            interface ${commonDtos[i]} {
                ${getProperties(d, commonDtos, json.definitions)}
            }

            export default ${commonDtos[i]}
        `;
        s = prettier.format(s, { semi: false, parser: "babel" });
        await writeFileAsync(path.join(cwd, 'dist/dto', commonDtos[i][0].toLocaleLowerCase() + commonDtos[i].slice(1, commonDtos[i].length) + '.ts'), Buffer.from(s), 'utf-8');
    }

    // 创建模块
    for (let i = 0, len = modules.length; i < len; i++) {
        await mkdirAsync(path.join(cwd, 'dist', modules[i].name));
        let s = `
            import http from "../http";
            ${modules[i].childModules.some(c => c.method === "get" || c.method === "delete") ? 'import queryString from "query-string"' : ''}

            class ${modules[i].moduleName}Service {
                ${getChildModules(modules[i].childModules)}
            }

            export default new ${modules[i].moduleName}Service()
        `;
        // TODO prettier config
        s = prettier.format(s, { semi: false, parser: "babel" });

        await writeFileAsync(path.join(modules[i].path, modules[i].name + 'Service.ts'), Buffer.from(s, 'utf-8'));
    }
};
module.exports = createApiCatelogs;