const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['connexion', 'inscription', 'erreur', 'admin', 'action', 'recherche'],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  user_id: {
    type: Number,
    required: false,
  },
  ip: {
    type: String,
  },
  route: {
    type: String,
  },
  payload: {
    type: Object,
  },
});

module.exports = mongoose.model('Log', logSchema);
