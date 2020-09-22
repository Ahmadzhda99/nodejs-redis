const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const redis = require('redis');
require('dotenv').config();
const mongoURI = process.env.mongoURI;

const app = express();
app.use(bodyParser.json());

require('./models/Note');
const Note = mongoose.model('Note');

// Mongoose connection
mongoose.connect(mongoURI, {
    dbName: 'notes',
    useNewUrlParser: true,
    useUnifiedTopology: true,
}, err => err ? console.log(err) : console.log('connected to database'));

// Redis Connection
const client = redis.createClient('redis://127.0.0.1:6379');
client.on('error', (err) => {
    console.log(err);
});

// Middleware
const isCached = (req, res, next) => {
    const { id } = req.params;

    // first check in redis
    client.get(id, (err, data) => {
        if (err) {
            console.log(err);
        }
        if (data) {
            const response = JSON.parse(data);
            return res.status(200).json(response);
        }
        next();
    });
};

// Create endpoint
app.post('/api/notes', (req, res, next) => {
    const { title, note } = req.body;
    const _note = new Note({
        title,
        note,
    });
    _note.save((err, note) => {
        if (err) {
            return res.status(400).json(err);
        }

        // Store in redis
        client.setex(note.id, 60, JSON.stringify(note), (err, reply) => {
            if (err) {
                console.log(err);
            }
        });

        return res.status(201).json({
            message: 'Note has been saved',
            note: note,
        });
    });
});

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

app.listen(3000, () => console.log('server running at 3000'));