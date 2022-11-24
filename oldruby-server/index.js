const express = require('express');
const cors = require('cors');
require('dotenv').config();
var jwt = require('jsonwebtoken');
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());


const uri = process.env.URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
     try{
          const UsersCollection = client.db("OldRuby-DB").collection("users");
          app.put('/user/:email', async (req, res) => {
               const email = req.params.email
               const user = req.body;
               const filter = { email: email }
               const options = { upsert: true }
               const updateDoc = {
                 $set: user,
               }
               const result = await UsersCollection.updateOne(filter, updateDoc, options)
   
               const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                 expiresIn: '1d',
               })
               res.send({ result, token })
             })
     }
     finally{

     }
}
run().catch(console.dir);




app.get('/', (req, res)=>{
     res.send('Old Ruby server is running...')
})
app.listen(port, ()=>{
     console.log(`Server is running on port ${port}`);
})