const keys = require('./key');

// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgres Client setup
const {Pool} = require('pg');

const pgCLient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort
});

pgCLient.on('error', () => console.log('Lost PG Connection'));

pgCLient.query('CREATE TABLE IF NOT EXISTS values (number INT)')
   .catch(err => console.log(err));

 // Redis cCLient Setup
 const redis = require('redis');
 
 const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});

const redisPblisher = redisClient.duplicate();

// Express route handlers
app.get('/', (req,res) => {
  res.send('Hi');
});

app.get('/values/all', async (req,res) => {
   const values = await pgCLient.query('Select * from values');
   
   res.send(values.rows);
});

app.get('/values/current', async (req,res) => {
  redisClient.hgetall('values', (err,values)=> {
      res.send(values);
  });
});

app.post('/values', async (req,res) => {
   const index = req.body.index;

   if(parseInt(index) > 40) {
         return res.status(422).send('Index too high');
   }

   redisClient.hset('values', index, 'Nothing yet!');
   redisPblisher.publish('insert',index);
   pgCLient.query('INSERT INTO values(number) Values($1)', [index]);

   res.send({working:true});
});

app.listen(5000,err => {
     console.log('Listening');
});

