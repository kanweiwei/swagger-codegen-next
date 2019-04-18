// @flow

const fs = require("fs");
const path = require("path");
const uniq = require("lodash/uniq");
const groupBy = require("lodash/groupBy");
const Promise = require("bluebird");
const rimrafAynsc = Promise.promisify(require("rimraf"));
const mkdirAsync = Promise.promisify(fs.mkdir);
const writeFileAsync = Promise.promisify(fs.writeFile);
const cwd = process.cwd();
const lowerCase = require("./lowerCase");
const prettier = require("prettier");
const dataTypes = require("./dataTypes");

const getProperties = require("./getProperties");
const getRelyDtos = require("./getRelyDtos");

import type { Swagger, MethodBody, Paths } from "./interface";

function getChildModules(childs) {
    let res = "";
    childs.forEach(c => {
        let parameters: any = groupBy(c.parameters, "in");
        let hasQuery = "query" in parameters;
        let hasBody = "body" in parameters;
        let fnName = lowerCase(c.operationId);
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
                    return await http.${c.method}("${
                c.api
            }?" + queryString.stringify(data))
                }
            `;
            return;
        }
        if (hasBody && hasQuery) {
            res += `
                async ${fnName} (query: any, data: any) {
                    return await http.${c.method}("${
                c.api
            }?" + queryString.stringify(query), data)
                }
            `;
            return;
        }
    });
    return res;
}

function getMethodType(paths: Paths, pathName: string) {
    const path = paths[pathName];
    const method = Array.prototype.slice.call(Object.keys(path))[0];
    return method;
}

function getMethodBody(paths: Paths, pathName: string) {
    const method = getMethodType(paths, pathName);
    const methodBody = path[method];
    return methodBody;
}

const createApiCatelogs = async (json: Swagger) => {
    const paths = json.paths;
    const pathNames = Object.keys(paths);
    let moduleNames: string[] = [];
    for (let i = 0, len = pathNames.length; i < len; i++) {
        const methodBody = getMethodBody(paths, pathNames[i])
        moduleNames = moduleNames.concat(methodBody.tags);
    }
    moduleNames = uniq(moduleNames);
    const distPath = path.join(cwd, "./dist");
    // 清空dist目录
    await rimrafAynsc(distPath);
    // 创建dist目录
    await mkdirAsync(distPath);

    let modules: {
        moduleName: string,
        name: string,
        path: string,
        children: any[]
    }[] = [];
    moduleNames.forEach((moduleName, i) => {
        let name = lowerCase(moduleName);
        modules[i] = {
            moduleName: moduleName,
            name: name,
            path: path.join(distPath, name),
            children: []
        };
        for (let ii = 0, len = pathNames.length; ii < len; ii++) {
            const methodBody = getMethodBody(paths, pathNames[ii]);
            const method = getMethodType(paths, pathNames[ii]);
            let tag = methodBody.tags[0];
            if (tag === moduleName) {
                let child: any = {};
                child.api = pathNames[ii];
                child.method = method;
                modules[i].children.push(child);
            }
        }
    });

    // 整理dto 引用
    let dtos: {
        name: string,
        links: {
            moduleName: string,
            name: string,
            fns: string[]
        }[]
    }[] = [];
    Object.keys(json.definitions).forEach(dtoName => {
        dtos.push({
            name: dtoName,
            links: []
        })
    })

    for (let i = 0, len = pathNames.length; i < len; i++) {
        let methodBody = getMethodBody(paths, pathNames[i]);
        let methodBodyString = JSON.stringify(methodBody);
        let match = methodBodyString.match(reg);
        let names = [];
        if (match) {
            names = names.concat(match.map(n => n.match(sreg)[1]));
            names = uniq(names);
            names.forEach(dn => {
                let foundIndex = dtos[dn].links.findIndex(
                    n => n.moduleName === apiContent.tags[0]
                );
                if (foundIndex > -1) {
                    dtos[dn].links[foundIndex].fns.push(apiContent.operationId);
                } else {
                    dtos[dn].links.push({
                        moduleName: apiContent.tags[0],
                        name:
                            apiContent.tags[0][0].toLocaleLowerCase() +
                            apiContent.tags[0].slice(
                                1,
                                apiContent.tags[0].length
                            ),
                        fns: [apiContent.operationId]
                    });
                }
            });
        }
    }
    await writeFileAsync(
        path.join(cwd, "dist/dtos.json"),
        Buffer.from(JSON.stringify(dtos)),
        "utf-8"
    );
    // 创建通用的dto目录
    await mkdirAsync(path.join(cwd, "dist/dto"));
    // 泛型接口
    const genericDtos = Object.keys(dtos).filter(n => n.indexOf("[") > -1);
    // 通用接口
    const commonDtos = Object.keys(dtos).filter(
        n => dtos[n].links.length > 1 && n.indexOf("[") === -1
    );
    for (let i = 0; i < commonDtos.length; i++) {
        let d: {
            required?: string[],
            type: "object",
            properties: any
        } = json.definitions[commonDtos[i]];
        let s = "";
        if (!d.properties) {
            console.log(commonDtos[i], d);
        }
        const relyDtos: any = getRelyDtos(d, commonDtos, json.definitions);
        relyDtos.forEach(d => {
            if (commonDtos.indexOf(d) > -1) {
                s += `
                    import ${d} from "./${d[0].toLocaleLowerCase() +
                    d.slice(1, d.length)}";
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
        await writeFileAsync(
            path.join(
                cwd,
                "dist/dto",
                commonDtos[i][0].toLocaleLowerCase() +
                    commonDtos[i].slice(1, commonDtos[i].length) +
                    ".ts"
            ),
            Buffer.from(s),
            "utf-8"
        );
    }

    // 创建模块
    for (let i = 0, len = modules.length; i < len; i++) {
        await mkdirAsync(path.join(cwd, "dist", modules[i].name));
        let s = `
            import http from "../http";
            ${
                modules[i].childModules.some(
                    c => c.method === "get" || c.method === "delete"
                )
                    ? 'import queryString from "query-string"'
                    : ""
            }

            class ${modules[i].moduleName}Service {
                ${getChildModules(modules[i].childModules)}
            }

            export default new ${modules[i].moduleName}Service()
        `;
        // TODO prettier config
        s = prettier.format(s, { semi: false, parser: "babel" });

        await writeFileAsync(
            path.join(modules[i].path, modules[i].name + "Service.ts"),
            Buffer.from(s, "utf-8")
        );
    }
};
module.exports = createApiCatelogs;
