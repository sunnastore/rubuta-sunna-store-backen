const express = require("express");
const Product = require("../models/Product");
const { requireAdmin } = require("../middleware/admin");
const router = express.Router();

router.get("/", async (req, res) => {
  const { category, search } = req.query;
  const filter = {};
  if (category && category !== "All") filter.category = category;
  if (search) filter.name = { $regex: search, $options: "i" };
  const products = await Product.find(filter).sort({ createdAt: -1 });
  res.json(products);
});

router.get("/:id", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found." });
  res.json(product);
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ error: "Product not found." });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found." });
  res.json({ message: "Product deleted." });
});

module.exports = router;
