import { groupBy } from "lodash";

export default function useQueryString(childs) {
  if (
    childs.some((n) => {
      let parameters: any = groupBy(n.parameters, "in");
      return "query" in parameters;
    })
  ) {
    return true;
  }
  return false;
}
