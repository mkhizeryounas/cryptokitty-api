const config = require("./config");
const _crypto = require("simple-crypto-js").default;
const Crypto = new _crypto(config.secret);

exports.encrypt = str => Crypto.encrypt(str);
exports.decrypt = str => Crypto.decrypt(str);
