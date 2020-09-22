const mongoose = require('mongoose');

// Mongoose model
const NoteSchema = new mongoose.Schema({
    title: String,
    note: String,
});

mongoose.model('Note', NoteSchema);