const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

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
    await client.connect();

    const userCollection = client.db('PetAdoptionDB').collection('users');
    const petListCollection = client.db('PetAdoptionDB').collection('petList');
    const donationCampaignCollection = client.db('PetAdoptionDB').collection('donationCampaign');
    const adoptionReqCollection = client.db('PetAdoptionDB').collection('adoptionRequest');

    // users
    app.get('/users', async(req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
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

    //pet listing
    app.get('/petList', async(req, res) => {
        const result = await petListCollection.find().toArray();
        res.send(result);
    })

    //pet list details
    app.get('/petList/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await petListCollection.findOne(query);
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


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
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