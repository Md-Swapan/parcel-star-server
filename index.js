const express = require("express");
const MongoClient = require("mongodb").MongoClient;
const ObjectID = require("mongodb").ObjectID;
const cors = require("cors");
// const admin = require("firebase-admin");
const bodyParser = require("body-parser");
require("dotenv").config();

const port = process.env.PORT || 4050;

// const serviceAccount = require('./firebasekey.json');

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

const app = express();
app.use(cors());
app.use(bodyParser.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.s5oyuq6.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
client.connect((err) => {
  const usersCollection = client.db("ParcelStar").collection("ParcelStarUser");
  const ShopsCollection = client.db("ParcelStar").collection("ShopsCollection");

  console.log("db connected");

  app.post("/AddUser", async (req, res) => {
    const newUsers = req.body;
    await usersCollection.insertOne(newUsers).then((result) => {
      console.log("data added successfully", result.insertedCount);
      res.send(result.insertedCount > 0);
    });
  });

  app.get("/users", async (req, res) => {
    usersCollection.find().toArray((err, users) => {
      res.send(users);
    });
  });

  app.put("/UpdateUsers", async (req, res) => {
    const user = req.body;
    const filter = { email: user.email };
    const options = { upsert: true };
    const updateDoc = { $set: user };
    const result = await usersCollection.updateOne(filter, updateDoc, options);
    res.json(result);
  });

  async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith("Bearer ")) {
      const token = req.headers.authorization.split(" ")[1];

      try {
        const decodedUser = await admin.auth().verifyIdToken(token);
        req.decodedEmail = decodedUser.email;
      } catch {}
    }
    next();
  }

  app.put("/AddMerchant", verifyToken, async (req, res) => {
    const user = req.body;
    const requester = req.decodedEmail;

    if (requester) {
      const requesterAccount = await usersCollection.findOne({
        email: requester,
      });

      if (requesterAccount.role === "merchant") {
        const filter = { email: user.email };
        const updateDoc = { $set: { role: "merchant" } };
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.json(result);
      }
    } else {
      res
        .status(403)
        .json({ message: "You do not have access to make merchant" });
    }
  });

  app.get("/Users/merchant/:email", async (req, res) => {
    const email = req.params.email;
    const query = { email: email };
    const user = await usersCollection.findOne(query);
    let isMerchant = false;
    if (user?.userType === "merchant") {
      isMerchant = true;
    }
    res.json({ merchant: isMerchant });
  });

  app.post("/AddShop", async (req, res) => {
    const newShop = req.body;
    await ShopsCollection.insertOne(newShop).then((result) => {
      console.log("shop added successfully", result.insertedCount);
      res.send(result.insertedCount > 0);
    });
  });

  app.get("/shops", async (req, res) => {
    ShopsCollection.find().toArray((err, shops) => {
      res.send(shops);
    });
  });
});

app.get("/", (req, res) => {
  res.send("Hello parcel user");
});
app.listen(port);
