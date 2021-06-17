#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
const process = require("process");
const http = require("http");
const fetchApi = require("../lib/index.js");

const envFileName = "fetchapi.config.js";
const envFilePath = path.join(process.cwd(), envFileName);
if (fs.existsSync(envFilePath)) {
  const data = require(envFilePath);
  const cacheFile = path.join(process.cwd(), ".swagger-cache");
  if(fs.existsSync(cacheFile)) {
    console.log('cache file exists\n');
    fs.readFile(cacheFile, (err, t) => {
      if(err){
        console.log(err.message + '\n');
        process.exit(0);
      }
      fetchApi(JSON.parse(t.toString('utf-8')), data.options);
    })
  } else {
    const url = data.url;
    let swaggerData = "";
    console.log('start request swagger.json\n')
    const client = http.get(url, (res) => {
      res.on("data", (c) => {
        swaggerData += c;
      });
      res.on("end", () => {
        console.log('end request swagger.json\n')
        const swaggerJson = JSON.parse(swaggerData);
        fs.writeFileSync(
          path.join(process.cwd(), ".swagger-cache"),
          swaggerData,
          { encoding: "utf-8" }
        );
        fetchApi(swaggerJson, data.options);
      });
    });
  }
  
} else {
  console.error("can't find the fetchapi.config.js file");
  process.exit(0);
}
