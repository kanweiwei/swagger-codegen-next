#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
const process = require("process");
const http = require("http");
const codegen = require("../lib/index.js");
const ora = require("ora");
const axios = require("axios");

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
    if (url.startsWith("http")) {
      const spinner = ora("request swagger.json").start();
      axios
        .get(data.url)
        .then((res) => {
          spinner.succeed();
          fs.writeFileSync(
            path.join(process.cwd(), ".swagger-cache"),
            JSON.stringify(res.data),
            { encoding: "utf-8" }
          );
          ora("generate .swagger-cache").succeed();
          codegen(res.data, data);
        })
        .catch((err) => {
          spinner.fail();
          console.log(err);
          process.exit(0);
        });
      return;
    }
    if (fs.existsSync(url)) {
      const json = require(url);
      codegen(json, data);
      return;
    }
    throw new Error('"url" is invalid');
  }
} else {
  console.error("can't find the swagger-codegen.config.js file");
  process.exit(0);
}
