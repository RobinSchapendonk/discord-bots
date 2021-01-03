const mongoose = require('mongoose');
const productSchema = mongoose.Schema({
    _id: { type: String, required: true },
    blacklisted: { type: Boolean, required: false },
});
module.exports = mongoose.model('Guilds', productSchema);