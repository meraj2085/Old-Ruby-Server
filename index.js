const express = require('express');
const cors = require('cors');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
var jwt = require('jsonwebtoken');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
               const decodedEmail = req.decoded.email;
               if (email !== decodedEmail) {
                    return res.status(403).send({ message: 'Forbidden access' })
               }
               const query = { email: email }
               const user = await UsersCollection.findOne(query)
               res.send(user)
          })

          // Get user verification
          app.get(`/verification/:email`, async(req, res)=>{
               const email = req.params.email;
               const query = { email: email }
               const user = await UsersCollection.findOne(query)
               res.send(user?.seller_verification)
          })

          // Get categories
          app.get('/categories', async(req, res)=>{
               const query = {};
               const result = await CategoriesCollection.find(query).toArray();
               res.send(result);
          })
          
          // Get products by category
          app.get('/category/:id', async(req, res)=>{
               const id = req.params.id;
               const query = {categoryId: id, status: 'available'};
               const result = await ProductsCollection.find(query).toArray()
               res.send(result)
          })

          // Add booking
          app.put('/booking', async(req, res)=>{
               const booking = req.body;
               const result = await BookingsCollection.insertOne(booking);
               res.send(result)
          })

          // Get single product
          app.get('/product/:id', async(req, res)=>{
               const id = req.params.id;
               const query = { _id: ObjectId(id) };
               const result = await ProductsCollection.findOne(query);
               res.send(result);
          })

          // Add product
          app.put('/product',verifyJWT, async(req, res)=>{
               const product = req.body;
               const result = await ProductsCollection.insertOne(product)
               res.send(result)
          })

          // Get seller product
          app.get('/products',verifyJWT, async(req, res)=>{
               const email = req.query.email
               const query = {seller_email: email}
               const result = await ProductsCollection.find(query).toArray();
               res.send(result)
          })

          // Update product status
          app.put("/product/:id", async (req, res) => {
               const id = req.params.id;
               const filter = { _id: ObjectId(id) };
               const bookingStatusQuery = { product_id: id }
               const options = { upsert: true };
               const updatedDoc = {$set: {status: "sold",}};

               const bookingUpdateResult = await BookingsCollection.updateMany(bookingStatusQuery, updatedDoc);
               const result = await ProductsCollection.updateOne(filter,updatedDoc,options);
               res.send(result);
          });

          // Delete product
          app.delete("/product/:id", async (req, res) => {
               const id = req.params.id;
               const filter = { _id: ObjectId(id) };
               const query = { product_id: id }
               const result = await ProductsCollection.deleteOne(filter);
               const bookingDeleteResult = await BookingsCollection.deleteMany(query)
               res.send({result, bookingDeleteResult});
          });

          // Update advertise product status
          app.put("/product/update/:id",verifyJWT, async (req, res) => {
               const id = req.params.id;
               const filter = { _id: ObjectId(id) };
               const options = { upsert: true };
               const updatedDoc = {
                 $set: {
                    advertised: true,
                 },
               };
               const result = await ProductsCollection.updateOne(
                 filter,
                 updatedDoc,
                 options
               );
               res.send(result);
          });

          // Get sellers / buyers
          app.get('/users',verifyJWT, async(req, res)=>{
               const role = req.query.role;
               const filter = { role: role }
               const result = await UsersCollection.find(filter).toArray();
               res.send(result);
          })

          // Report a product
          app.put("/product/report/:id", async (req, res) => {
               const id = req.params.id;
               const filter = { _id: ObjectId(id) };
               const options = { upsert: true };
               const updatedDoc = {
                 $set: {
                    reported: true,
                 },
               };
               const result = await ProductsCollection.updateOne(
                 filter,
                 updatedDoc,
                 options
               );
               res.send(result);
          });

          // Get reported items
          app.get('/reported', async(req, res)=>{
               const filter = {reported: true}
               const result = await ProductsCollection.find(filter).toArray();
               res.send(result);
          })

          // Get booked products
          app.get('/booked',verifyJWT, async(req, res)=>{
               const email = req.query.email;
               const filter = { buyer_email: email };
               const result = await BookingsCollection.find(filter).toArray();
               res.send(result)
          })

          // Get single booking
          app.get('/booked/:id', async(req, res)=>{
               const id = req.params.id;
               const filter = { _id: ObjectId(id) };
               const result = await BookingsCollection.findOne(filter);
               res.send(result)
          })

          // Delete booking
          app.delete('/booking/:id', async(req, res)=>{
               const id = req.params.id;
               const filter = { _id: ObjectId(id) };
               const result = await BookingsCollection.deleteOne(filter);
               res.send(result);
          });
          
          // Get advertised products
          app.get('/advertised', async(req, res)=>{
               const filter = {advertised: true, status: 'available'}
               const result = await ProductsCollection.find(filter).toArray();
               res.send(result);
          })

          // Update seller verification status
          app.put('/verificationStatus', async(req, res)=>{
               const email = req.query.email;
               const filter = { email: email }
               const query = { seller_email: email }
               const options = { upsert: true };
               const updatedDoc = {
                 $set: {
                    seller_verification: true,
                 },
               };
               const result = await UsersCollection.updateOne(
                    filter,
                    updatedDoc,
                    options
                  );
               const productResult = await ProductsCollection.updateMany(query, updatedDoc, options)
               res.send({result, productResult});
          })

          // Get payment intent
          app.post('/create-payment-intent', async (req, res) => {
               const booking = req.body;
               const price = booking.item_price;
               const amount = price * 100;
     
               const paymentIntent = await stripe.paymentIntents.create({
               currency: 'usd',
               amount: amount,
               "payment_method_types": [
                    "card"
               ]
               });
               res.send({
               clientSecret: paymentIntent.client_secret,
               });
          });

          // Update status after payment
          app.post('/payment', async(req, res)=>{
               const payment = req.body;
               const bookingId = payment.bookingId;
               const product_id = payment.product_id;
               const filter  = { _id: ObjectId(bookingId) }
               const query = { _id: ObjectId(product_id) }
               const bookingStatusQuery = { product_id:product_id }

               const updatedDoc = {$set: {payment: true, transactionId: payment.transactionId}};
               const productUpdatedDoc = {$set: {status: 'sold'}};
               const bookingUpdatedDoc = {$set: {status: 'sold'}};

               const updateResult = await BookingsCollection.updateOne(filter, updatedDoc)
               const productUpdatedResult = await ProductsCollection.updateOne(query, productUpdatedDoc)
               const bookingUpdateResult = await BookingsCollection.updateMany(bookingStatusQuery, bookingUpdatedDoc);

               res.send({updateResult, productUpdatedDoc, bookingUpdateResult})
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