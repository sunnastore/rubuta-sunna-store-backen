const express = require("express");
const axios = require("axios");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { requireAuth } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");
const router = express.Router();

function makeOrderId() {
  return "SUNNA-" + Date.now().toString().slice(-7);
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const { items, customer } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Your cart is empty." });
    }

    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    let total = 0;
    const orderItems = items.map((i) => {
      const p = products.find((p) => p._id.toString() === i.productId);
      if (!p) throw new Error("A product in your cart no longer exists.");
      total += p.price * i.qty;
      return { product: p._id, name: p.name, price: p.price, qty: i.qty };
    });

    const order = await Order.create({
      orderId: makeOrderId(),
      user: req.user._id,
      customer,
      items: orderItems,
      total,
      status: "Unpaid",
      paymentMethod: "Bank Transfer"
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/:orderId/verify-payment", requireAuth, async (req, res) => {
  try {
    const { reference } = req.body;
    const order = await Order.findOne({ orderId: req.params.orderId, user: req.user._id });
    if (!order) return res.status(404).json({ error: "Order not found." });

    const verifyRes = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
    });

    const data = verifyRes.data.data;
    const paidAmountNaira = data.amount / 100;

    if (data.status !== "success") {
      return res.status(400).json({ error: "Payment was not successful." });
    }
    if (paidAmountNaira !== order.total) {
      return res.status(400).json({ error: "Payment amount does not match order total." });
    }

    order.status = "Processing";
    order.paymentMethod = "Paystack";
    order.paystackRef = reference;
    await order.save();

    res.json({ message: "Payment verified.", order });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Could not verify payment. Please contact support." });
  }
});

router.get("/my", requireAuth, async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.status && req.query.status !== "All") filter.status = req.query.status;
  const orders = await Order.find(filter).sort({ createdAt: -1 });
  res.json(orders);
});

router.get("/", requireAdmin, async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json(orders);
});

router.put("/:id/status", requireAdmin, async (req, res) => {
  const { status } = req.body;
  const allowed = ["Unpaid", "Processing", "Shipped", "Delivered", "Returns"];
  if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status." });

  const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!order) return res.status(404).json({ error: "Order not found." });
  res.json(order);
});

module.exports = router;
