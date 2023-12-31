const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');


// middleware 
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if(err){
            return res.status(401).send({ error: true, message: 'unauthorized access'})
        }
        req.decoded = decoded;
        next();
    })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.as9pvg2.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});



async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const classCollection = client.db('yogaDB').collection('classes');
        const instructorCollection = client.db('yogaDB').collection('instructor');
        const cartCollection = client.db('yogaDB').collection('carts');
        const userCollection = client.db('yogaDB').collection('user');

        // jwt 
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token })
        })

        const verfiyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = {email: email};
            const user = await userCollection.findOne(query);
            if(user?.role !== 'admin'){
                return res.status(403).send({error: true, message: 'fobidden message'});
            }
            next();
        }

        // user related api
        app.get('/users', verifyJWT, verfiyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await userCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: 'User Already Exist' })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        app.get('/users/admin/:email', verifyJWT, async(req, res)=>{
            const email = req.params.email;
            if(req.decoded.email !== email){
                res.send({ admin : false})
            }
            const query = { email: email};
            const user = await userCollection.findOne(query);
            const result = { admin: user?.role === 'admin'}
            res.send(result);
        })

        app.get('/users/instructor/:email', verifyJWT, async(req, res)=>{
            const email = req.params.email;
            if(req.decoded.email !== email){
                res.send({ instructor : false})
            }
            const query = { email: email};
            const user = await userCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor'}
            res.send(result);
        })

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'instructor'
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.delete('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result);
        })


        // get all the class       

        app.get('/myclasses', verifyJWT,  async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([]);
            }
            const decodedEmail = req.decoded.email;
            if(decodedEmail !== email){
                return res.status(403).send({error: true, message: 'forbidden access'})
            }

            const query = { email: email }
            const result = await classCollection.find(query).toArray();
            res.send(result)
        })

        app.get('/classes', async (req, res) => {
            const result = await classCollection.find().toArray();
            res.send(result);
        })
             

        app.post('/classes', async(req, res)=> {
            const newClass = req.body;
            const result = await classCollection.insertOne(newClass);
            res.send(result);
        })

        // get all the instructor
        app.get('/instructors', async (req, res) => {
            const result = await instructorCollection.find().toArray();
            res.send(result);
        })



        // cart
        app.get('/carts', verifyJWT, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([]);
            }
            const decodedEmail = req.decoded.email;
            if(decodedEmail !== email){
                return res.status(403).send({error: true, message: 'forbidden access'})
            }

            const query = { email: email }
            const result = await cartCollection.find(query).toArray();
            res.send(result)
        })

        app.get('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await cartCollection.findOne(query);
            res.send(result);
        })

        app.post('/carts', async (req, res) => {
            const item = req.body;
            const result = await cartCollection.insertOne(item);
            res.send(result);
        })


        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await cartCollection.deleteOne(query);
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('The Server is Running')
})

app.listen(port, () => {
    console.log('Server is Running on PORT', port);
})