import { Options } from "../interface";
import path from "path";

const cwd = process.cwd();

const defualtOptions = {
  output: {
    path: path.join(cwd, "./services"),
  },
};

export default function initOptions(options: Options) {
  options = Object.assign({}, defualtOptions, options);
  return options;
}
