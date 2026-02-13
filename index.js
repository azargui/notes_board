import express from 'express';


//db connection
import './config/db.js'


const app = express()

app.get('/', (req, res)=>{
    res.status(200).json({data: 'home page'})
})



//running server
const PORT = process.env.PORT || 3005
app.listen(PORT,()=>{
    console.log(`running in htpp:localhost:${POST}`)
})