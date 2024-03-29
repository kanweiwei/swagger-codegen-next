import { Parameter } from "../interface";
import { getType } from "./getProperties";

export function getDto(
  parameters: {
    [k in "header" | "query" | "body"]?: Parameter[];
  }
) {
  let res: string | undefined;
  if ("body" in parameters) {
    const target = parameters.body[0];
    if (target) {
      res = getType(target.schema).replace("[]", "");
    }
  }
  return res
}
