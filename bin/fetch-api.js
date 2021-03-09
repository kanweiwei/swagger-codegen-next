#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
const process = require("process");
const http = require("http");
const fetchApi = require("../lib/index.js")

const envFileName = ".fetchapirc";
const envFilePath = path.join(process.cwd(), envFileName);
if (fs.existsSync(envFilePath)) {
  const fileContent = fs.readFileSync(envFilePath);
  const data = JSON.parse(fileContent.toString());
  const url = data.url;
  let swaggerData = "";
  const client = http.get(url, (res) => {
    res.on("data", (c) => {
      swaggerData += c;
    });
    res.on("end", () => {
      const swaggerJson = JSON.parse(swaggerData);
      fetchApi(swaggerJson)
    });
  });
} else {
  console.error("can't find the .fetchapirc file");
  process.exit(0);
}
