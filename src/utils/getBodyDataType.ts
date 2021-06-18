import { Parameter } from "../interface";
import { getType } from "./getProperties";

export function getBodyDataType(
  parameters: {
    [k in "header" | "query" | "body"]?: Parameter[];
  }
) {
  let res: string | undefined;
  if ("body" in parameters) {
    const target = parameters.body[0];
    if (target) {
      res = getType(target.schema);
    }
  }
  return res;
}
