const express = require('express')
const path = require('path')
const app = express()


app.use(express.json())
app.use(express.urlencoded({extended:'true'}))

app.use("/public",express.static(path.join(__dirname,'../public')))

const port  = process.env.PORT  || 3003

app.listen(port,()=>{
    console.log(`Server connection successfully ${port}`)
})