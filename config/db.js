import mongoose from "mongoose";

mongoose.connect(process.env.DB_URI)
    .then(()=>console.log(`connected to mongodb on ${process.env.DB_URI}`))
    .catch(()=>console.log(`error when connecting to mongod ${process.env.DB_URI}`))