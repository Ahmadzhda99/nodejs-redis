const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const redis = require('redis');

const app = express();

app.use(bodyParser.json());

//Redis connection
const client = redis.createClient('redis://127.0.0.1:6379');
client.on("error", (err) => {
  console.error(err);
});

//MongoDB connection
mongoose.connect('mongodb://localhost:27017/', {
  dbName: 'notes',
  useNewUrlParser: true,
  useUnifiedTopology: true
}, err => err ? console.log(err) : console.log('Connected to database'));

//Mongoose Model
const NoteSchema = new mongoose.Schema({
  title: String,
  note: String
});

const Note = mongoose.model('Note', NoteSchema);

//Create notes
app.post('/api/notes', (req, res, next) => {

  const { title, note } = req.body;

  const _note = new Note({
    title: title,
    note: note
  });

  _note.save((err, note) => {
    if (err) {
      return res.status(404).json(err);
    }

    //Store in Redis
    client.setex(note.id, 60, JSON.stringify(note), (err, reply) => {
      if (err) {
        console.log(err);
      }
      console.log(reply);
    });

    return res.status(201).json({
      message: 'Note has been saved',
      note: note
    });
  });

});

const isCached = (req, res, next) => {

  const { id } = req.params;

  //First check in Redis
  client.get(id, (err, data) => {
    if (err) {
      console.log(err);
    }
    if (data) {
      const reponse = JSON.parse(data);
      return res.status(200).json(reponse);
    }
    next();
  });
};

app.get('/api/notes/:id', isCached, (req, res, next) => {

  const { id } = req.params;

  Note.findById(id, (err, note) => {
    if (err) {
      return res.status(404).json(err);
    }
    return res.status(200).json({
      note: note
    });
  });
});

app.listen(3000, () => console.log('Server running at port 3000'));