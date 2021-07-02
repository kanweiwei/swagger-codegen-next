#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
const process = require("process");
const http = require("http");
const codegen = require("../lib/index.js");
const ora = require("ora");

const envFileName = "swagger-codegen.config.js";
const envFilePath = path.join(process.cwd(), envFileName);
if (fs.existsSync(envFilePath)) {
  const data = require(envFilePath);
  const cacheFile = path.join(process.cwd(), ".swagger-cache");
  if (fs.existsSync(cacheFile)) {
    ora("cache file exists").info();
    fs.readFile(cacheFile, (err, t) => {
      if (err) {
        console.log(err.message + "\n");
        process.exit(0);
      }
      codegen(JSON.parse(t.toString("utf-8")), data);
    });
  } else {
    const url = data.url;
    let swaggerData = "";
    const spinner = ora("request swagger.json").start();
    const client = http.get(url, (res) => {
      res.on("data", (c) => {
        swaggerData += c;
      });
      res.on("end", () => {
        spinner.succeed();
        const swaggerJson = JSON.parse(swaggerData);
        fs.writeFileSync(
          path.join(process.cwd(), ".swagger-cache"),
          swaggerData,
          { encoding: "utf-8" }
        );
        ora('generate .swagger-cache').succeed()
        codegen(swaggerJson, data);
      });
    });
  }
} else {
  console.error("can't find the swagger-codegen.config.js file");
  process.exit(0);
}
