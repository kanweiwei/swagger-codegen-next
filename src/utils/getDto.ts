import { Parameter } from "../interface";

export function getDto(
  parameters: {
    [k in "header" | "query" | "body"]?: Parameter[];
  }
) {
  let res: string | undefined;
  if ("body" in parameters) {
    const target = parameters.body[0];
    if (target) {
      if (/#\/definitions\/([\w\[\]]*)/i.exec(target.schema.$ref)) {
        res = RegExp.$1.replace("[", "<").replace("]", ">");
      }
    }
  }
  return res;
}
