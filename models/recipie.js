const mongoose = require('mongoose');
const recipieSchema = new mongoose.Schema({
    user : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    recipiename : String,
    desc: String,
    ingredients : String,
    process: String,

})
const recipiemodel = mongoose.model('recipies',recipieSchema)
module.exports = recipiemodel