const mongoose = require('mongoose');
const productSchema = mongoose.Schema({
    _id: { type: String, required: true },
    guild: { type: String, required: true },
    name: { type: String, required: true },
    response: { type: String, required: true }
});
module.exports = mongoose.model('CustomCommands', productSchema);