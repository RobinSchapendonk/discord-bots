const mongoose = require('mongoose');
const productSchema = mongoose.Schema({
    _id: { type: String, required: true },
    moderator: { type: String, required: true },
    reason: { type: String, required: true },
    user: { type: String, required: true },
    time: { type: Date, required: true }
});
module.exports = mongoose.model('Warnings', productSchema);