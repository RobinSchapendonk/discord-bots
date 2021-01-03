const mongoose = require('mongoose');
const productSchema = mongoose.Schema({
    _id: { type: String, required: true },
    blacklisted: { type: Boolean, required: false },
    lastWork: { type: Date, required: false },
    experience: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    money: { type: Number, default: 0 }
});
module.exports = mongoose.model('Users', productSchema);