
const dataTypes = require("./dataTypes");

function getRelyDtos({ properties, required }, commonDtos, dtos) {
    let relys = [];
    Object.keys(properties).forEach(p => {
        let type = dataTypes[properties[p].type];
        if (!type) {
            // dto
            relys.push(properties[p].$ref.match(/\#\/definitions\/([\w\[\]]*)/i)[1]);
        }
        if (type === "[]") {
            if ('$ref' in properties[p].items) {
                relys.push(properties[p].items.$ref.match(/\#\/definitions\/([\w\[\]]*)/i)[1]);
            }
        }
    });
    return relys;
}

module.exports = getRelyDtos;