import { isEmpty } from "lodash-es";
import { PathItem } from "../interface";
import { getType } from "./getProperties";

export default function getOutputDto(item: PathItem) {
  return item.responses["200"].schema ? getType(item.responses["200"].schema) : "void";
}
