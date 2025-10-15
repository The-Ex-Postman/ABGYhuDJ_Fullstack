const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cartSchema = new Schema({
  userId: {
    type: Number, 
    required: true,
    unique: true
  },
  items: [
    {
      concertId: { type: Number },
      type: { type: String, enum: ['debout', 'assis'], required: true },
      quantite: { type: Number, required: true },
      prixUnitaire: { type: Number, required: true }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600 
  }
});

module.exports = mongoose.model('Cart', cartSchema);