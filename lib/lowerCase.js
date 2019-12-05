"use strict";

module.exports = function lowerCase(s) {
    return s[0].toLocaleLowerCase() + s.slice(1, s.length);
};