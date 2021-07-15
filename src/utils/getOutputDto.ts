import { PathItem } from "../interface";
import { getType } from "./getProperties";

export default function getOutputDto(item: PathItem) {
  return item.responses["200"] && item.responses["200"].schema ? getType(item.responses["200"].schema) : "void";
}
