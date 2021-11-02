const express = require("express");
const { MongoClient } = require("mongodb");
require("dotenv").config();
const cors = require("cors");
var admin = require("firebase-admin");
// const { initializeApp } = require('firebase-admin/app');

const app = express();
const port = process.env.PORT || 5000;

//firebase admin initialiazation


var serviceAccount = require("./react-auth-intigration-82eb3-firebase-adminsdk-tasmw-6921e1b985.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3zctf.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function varifyToken(req, res, next) {
  if(req.headers?.authorization?.startsWith('Bearer ')){
    const idToken = req.headers.authorization.split('Bearer ')[1];
    try{
      const decodedUser = await admin.auth().verifyIdToken(idToken);
      req.decodedUserEmail = decodedUser.email;
      console.log('email',decodedUser.email)
    }catch{

    }
  };
  next();
}

async function run() {
  try {
    await client.connect();
    const database = client.db("ema_jhon_shop");
    const productsCollection = database.collection("products");
    const ordersCollection = database.collection("orders");

    app.get("/products", async (req, res) => {
      // console.log(req.query);
      const cursor = productsCollection.find({});
      const count = await cursor.count();
      const page = req.query.page;
      const size = parseInt(req.query.size);
      let products;
      if (page) {
        products = await cursor
          .skip(page * size)
          .limit(size)
          .toArray();
      } else {
        products = await cursor.toArray();
      }
      res.json({
        count,
        products,
      });
      // res.send("Hello World!");
    });

    //USE POST to get data by keys
    app.post("/products/bykeys", async (req, res) => {
      const keys = req.body;
      const query = { key: { $in: keys } };
      // db.inventory.find( { qty: { $in: [ 5, 15 ] } } )
      const products = await productsCollection.find(query).toArray();
      res.json(products);
    });

    //Add orders POST API WITH JWT
    app.get("/orders", varifyToken, async (req, res) => {
      const email = req.query.email;

      if(req.decodedUserEmail===email){
        const query = { email: email };
      // console.log(req.query.email)
      const result = await ordersCollection.find(query).toArray();
      res.json(result);
      }else{
        res.status(401).json({message : 'User not authorized'})
      }

    });


    // //Add orders POST API without JWT

    // app.get("/orders", varifyToken, async (req, res) => {
    //   const email = req.query.email;
    //   let query = {};
    //   if (email) {
    //     query = { email: email };
    //   }
    //   // console.log(req.query.email)
    //   const result = await ordersCollection.find(query).toArray();
    //   res.json(result);
    // });




    //Add orders POST API
    app.post("/orders", async (req, res) => {
      const order = req.body;
      order.createdAt = new Date();
      const result = await ordersCollection.insertOne(order);
      res.json(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
