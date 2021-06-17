import { PathItem } from "../interface";

export default function getOutputDto(item: PathItem) {
  let res: string | undefined;
  if (item.responses["200"].schema && item.responses["200"].schema.$ref) {
    if (
      /#\/definitions\/([\w\[\]]*)/i.exec(item.responses["200"].schema.$ref)
    ) {
      res = RegExp.$1.replace("[", "<").replace("]", ">");
    }
  }
  return res;
}
