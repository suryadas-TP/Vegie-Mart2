const mongoose = require('mongoose');
const itemschema = mongoose.Schema({
    imageUrl: { type: String}, // Cloudinary URL
    name:{type:String},
    price:{type:Number}
})

module.exports = mongoose.model('Item',itemschema); 