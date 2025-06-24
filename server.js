const express = require('express')
const app = express()
require('dotenv').config()
const mongoose = require('mongoose');
const cors = require(`cors`);
const Razorpay = require('razorpay');

app.use(cors())
app.use(express.json())

mongoose.connect(process.env.MONGO_URI,{
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));
   


app.use('/',require('./Routes/router'))


app.listen(3000,()=>{
    console.log("server is connected")
})

