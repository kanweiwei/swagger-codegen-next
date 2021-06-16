import fs from "fs";

export default function writeFile(
  filePath: number | fs.PathLike,
  data: string | NodeJS.ArrayBufferView,
  options: fs.WriteFileOptions
) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, data, options, (err) => {
      if (err) {
        reject(err);
      }
      resolve(null);
    });
  });
}
