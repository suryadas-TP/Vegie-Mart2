const mongoose = require('mongoose');
const userSchema = mongoose.Schema({
    userName: { type: String}, // Cloudinary URL
    email:{type:String},
    password:{type:String}
})

module.exports = mongoose.model('Users',userSchema); 