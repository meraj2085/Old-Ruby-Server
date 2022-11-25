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

//Verify JWT
function verifyJWT(req, res, next) {
     const authHeader = req.headers.authorization;
   
     if (!authHeader) {
       return res.status(401).send({ message: 'Unauthorized access' })
     }
     const token = authHeader.split(' ')[1]
   
     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
       if (err) {
         return res.status(403).send({ message: 'Forbidden access' })
       }
       req.decoded = decoded
       next()
     })
   }


const uri = process.env.URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
     try{
          const UsersCollection = client.db("OldRuby-DB").collection("users");
          const CategoriesCollection = client.db("OldRuby-DB").collection("categories");
          const ProductsCollection = client.db("OldRuby-DB").collection("products");
          const BookingsCollection = client.db("OldRuby-DB").collection("bookings");

          //Add user in DB & get JWT
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

          // Get JWT on login
          app.post('/jwt', (req, res)=>{
               const user = req.body;
               const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET)
               res.send({token})
          })

          // Get single user
          app.get(`/user/:email`,verifyJWT, async(req, res)=>{
               const email = req.params.email
               const decodedEmail = req.decoded.email
               console.log(email, decodedEmail);
               if (email !== decodedEmail) {
                    return res.status(403).send({ message: 'Forbidden access' })
               }
               const query = { email: email }
               const user = await UsersCollection.findOne(query)
               res.send(user)
          })

          // Get categories
          app.get('/categories', async(req, res)=>{
               const query = {};
               const result = await CategoriesCollection.find(query).toArray();
               res.send(result);
          })
          
          // Get products by category
          app.get('/category/:categoryName', async(req, res)=>{
               const categoryName = req.params.categoryName;
               const query = {category: categoryName};
               const result = await ProductsCollection.find(query).toArray()
               res.send(result)
          })

          // Add booking
          app.put('/booking', async(req, res)=>{
               const booking = req.body;
               const result = await BookingsCollection.insertOne(booking);
               res.send(result)
          })

          // Add product
          app.put('/product', async(req, res)=>{
               const product = req.body;
               const result = await ProductsCollection.insertOne(product)
               res.send(result)
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