import { groupBy } from "lodash";
import dataTypes from "../core/dataTypes";
import {
  Parameter,
  ParameterIn,
  PathItem
} from "../interface";

export function getQueryData(item: PathItem) {
  let parameters: {
    [k in ParameterIn]?: Parameter[];
  } = groupBy(item.parameters, "in");
  if (!parameters.query)
    return;
  let s = "{";
  parameters.query.forEach((n) => {
    s += `${n.name}${n.required ? "" : "?"}:${dataTypes[n.type]};`;
  });
  s += "}";
  return s;
}
