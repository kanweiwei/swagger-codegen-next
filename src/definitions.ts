import { Dtos } from "./interface";

let definitions: Dtos;

export function setDefinitions(obj: Dtos) {
  definitions = obj;
}

export function getDefinitions() {
  return definitions;
}
