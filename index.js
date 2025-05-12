const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5001;

//middleware
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hbgeo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // await client.connect();

    const userCollection = client.db('PetAdoptionDB').collection('users');
    const petListCollection = client.db('PetAdoptionDB').collection('petList');
    const donationCampaignCollection = client.db('PetAdoptionDB').collection('donationCampaign');
    const adoptionReqCollection = client.db('PetAdoptionDB').collection('adoptionRequest');

    //jwt related api
    app.post('/jwt', async(req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN,
        {expiresIn: '1h'});
        res.send({ token });
    })

    //middlewares
    const verifyToken = (req, res, next) => {
      console.log('insie verifyToken', req.headers.authorization);
      if(!req.headers.authorization){
        return res.status(401).send({ message: 'unaithorized access' })
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if(err){
          return res.status(401).send({message: 'unaithorized access'})
        }
        req.decoded = decoded;
        next();
      })
    }

    // verifyAdmin after token
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = {email: email};
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if(!isAdmin){
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    // users
    app.get('/users', verifyToken, verifyAdmin, async(req, res) => {
      // console.log(req.headers);
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    app.get('/users/admin/:email', verifyToken, async(req, res) => {
      const email = req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({message: 'forbidden access'})
      }

      const query = {email: email};
      const user = await userCollection.findOne(query);
      let admin = false;
      if(user){
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })

    app.post('/users', async(req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if(existingUser) {
        return res.send({message: 'user already exist', insertedId: null})
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })
    //for create admin
    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })
    
    app.get('/petList', async (req, res) => {
      const email = req.query.email;
    
      let query = {};
      if (email) {
        query = { email: email };
      }
    
      try {
        const result = await petListCollection.find(query).sort({posted_at: -1}).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching pet list' });
      }
    });
    
    //pet list details
    app.get('/petList/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await petListCollection.findOne(query);
      res.send(result);
    })

    app.post('/petList', async(req, res) => {
      const petList = req.body;
      const result = await petListCollection.insertOne(petList);
      res.send(result);
    })
    
    //update my added pet
    app.put('/petList/:id', async (req, res) => {
      const id = req.params.id;
      const pet = req.body;
      const updateDoc = {
        $set: {
          ...pet,
        },
      };
      const result = await petListCollection.updateOne(
        { _id: new ObjectId(id) },
        updateDoc,
        { upsert: true }
      );
      res.send(result);
    });




    // get operation for all pets route
    app.get("/allPets", verifyToken, verifyAdmin, async (req, res) => {
    
        const petList = await petListCollection.find().toArray();
        const donationCampaigns = await donationCampaignCollection.find().toArray();
    
        res.send([ ...petList, ...donationCampaigns ]);
    });
    
    // All pets update
    app.patch('/allPets/:id', async (req, res) => {
    const id = req.params.id;
    const { adopted } = req.body;

    const filter = { _id: new ObjectId(id) };
    const updateDoc = { $set: { adopted } };

    const petResult = await petListCollection.updateOne(filter, updateDoc);
    if (petResult.matchedCount > 0) {
      return res.send(petResult);
    }

    const donationResult = await donationCampaignCollection.updateOne(filter, updateDoc);
    if (donationResult.matchedCount > 0) {
      return res.send(donationResult);
    }

  });

    
    //delete all pets
    app.delete('/allPets/:id', verifyToken, verifyAdmin, async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };

    const petResult = await petListCollection.deleteOne(query);
    if (petResult.deletedCount > 0) {
      return res.send(petResult);
    }

    const donationResult = await donationCampaignCollection.deleteOne(query);
    if (donationResult.deletedCount > 0) {
      return res.send(donationResult);
    }

    res.status(404).send({ message: 'Item not found in either collection' });
  });





  app.patch('/petList/:id', async (req, res) => {
    const id = req.params.id;
    const { adopted } = req.body;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = { $set: { adopted } };
    const result = await petListCollection.updateOne(filter, updateDoc);
    res.send(result);
  });
    


    //delete my added pet
    app.delete('/petList/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await petListCollection.deleteOne(query);
      res.send(result);
    })

    //donation campaigns
    app.get('/donationCampaign', async(req, res) => {
      const result = await donationCampaignCollection.find().toArray();
      res.send(result);
  })

  //donation campaigns details
  app.get('/donationCampaign/:id', async(req, res) => {
    const id = req.params.id;
    const query = {_id: new ObjectId(id)}
    const result = await donationCampaignCollection.findOne(query);
    res.send(result);
  })

  app.post('/donationCampaign', async(req, res) => {
    const petList = req.body;
    const result = await donationCampaignCollection.insertOne(petList);
    res.send(result);
  })
  
  //Payment intent
  app.post('/create-payment-intent', async(req, res) => {
    const { donation } = req.body;
    const amount = parseInt(donation * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
      payment_method_types: ['card']
    });
    res.send({
      clientSecret: paymentIntent.client_secret
    })
  })

  //adoption request
  app.get('/adoptionRequest', async(req, res) => {
    const email = req.query.email;
    const query = { email: email }
    const result = await adoptionReqCollection.find(query).toArray();
    res.send(result);
  })

  app.post('/adoptionRequest', async(req, res) => {
    const adoptionPet = req.body;
    const result = await adoptionReqCollection.insertOne(adoptionPet);
    res.send(result);
  })


    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('server is runing');
})

app.listen(port, () => {
    console.log(`Server PORT: ${port}`);
})