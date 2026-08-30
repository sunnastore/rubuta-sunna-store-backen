const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    tag: { type: String, default: "" },
    description: { type: String, default: "" },
    specs: { type: Map, of: String, default: {} },
    inStock: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
