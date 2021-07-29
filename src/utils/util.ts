export function upperCamelCase(str: string) {
  const o = str.substring(1);
  return str[0].toLocaleUpperCase() + o;
}
