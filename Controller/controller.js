const cloudinary = require('../config/cloudinary');
const Product = require('../model/mogo');
const fs = require('fs');
const Item = require('../model/mogo');
const User = require('../model/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Cart = require('../model/cart');
const Razorpay = require('razorpay');
const Order = require(`../model/order`);

require('dotenv').config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY,
  key_secret: process.env.RAZORPAY_API_SECRET ,
});


const uploadProductImage = async (req, res) => {
  try {
    const filepath = req.file.path;
    const { name, price } = req.body;
    const result = await cloudinary.uploader.upload(filepath);

    const newProduct = new Item({
      imageUrl: result.secure_url,
      name,
      price
    });

    await newProduct.save();
    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
};


const getImage = async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
};

const createUser = async (req, res) => {
  const { userName, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ userName, email, password: hashedPassword });

    const token = jwt.sign(
      { id: newUser._id },
      process.env.JWT_SECRET || "your_jwt_secret_here",
      { expiresIn: "1d" }
    );

    res.status(200).json({
      token,
      data: {
        _id: newUser._id,
        name: newUser.userName,
        email: newUser.email
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const updateProductPrice = async (req, res) => {
  const { id } = req.params;
  const { price } = req.body;

  try {
    const updated = await Product.findByIdAndUpdate(
      id,
      { price },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({
      message: "Price updated successfully",
      product: updated
    });
  } catch (err) {
    console.error("Error updating price:", err);
    res.status(500).json({ error: "Failed to update product price" });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user info:", error);
    res.status(500).json({ message: "Failed to fetch user info" });
  }
};

const logginAccount = async (req, res) => {
  const { email, password } = req.body;
  try {
    const findUser = await User.findOne({ email });
    if (!findUser) {
      return res.status(401).json({ message: "Invalid email" });
    }

    const isMatch = await bcrypt.compare(password, findUser.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { id: findUser._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      token,
      user: {
        _id: findUser._id,
        name: findUser.userName,
        email: findUser.email,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user.id;

    const product = await Item.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let userCart = await Cart.findOne({ userId });
    if (!userCart) {
      userCart = new Cart({ userId, items: [] });
    }

    const itemIndex = userCart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (itemIndex > -1) {
      userCart.items[itemIndex].quantity += quantity;
    } else {
      userCart.items.push({ productId, quantity });
    }

    await userCart.save();

    const populatedCart = await Cart.findOne({ userId }).populate('items.productId');

    const normalizedItems = populatedCart.items.map((item) => ({
      _id: item.productId._id,
      name: item.productId.name,
      price: item.productId.price,
      image: item.productId.imageUrl,
      qty: item.quantity,
    }));

    res.json({ items: normalizedItems }); // <-- important for frontend
  } catch (err) {
    console.error('Add to cart error:', err);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
};


const getUserCart = async (req, res) => {
  console.log("Decoded User:", req.user);

  try {
    const userId = req.user.id;
    const userCart = await Cart.findOne({ userId: req.user.id }).populate({
     path: 'items.productId',
    select:'name price image'
    });

    if (!userCart) {
      return res.json({ items: [] });
    }

    const normalizedItems = userCart.items.map(item => ({
      _id: item.productId._id,
      name: item.productId.name,
      price: item.productId.price,
      image: item.productId.imageUrl,
      qty: item.quantity,
    }));

    return res.json({ items: normalizedItems });
  } catch (err) {
    console.error("Get cart error:", err);
    res.status(500).json({ error: "Failed to get cart" });
  }
};

const removeFromCart = async(req,res)=>{
const userId = req.userId;
const productId = req.params.productId;

const cart = await Cart.findOne({userId});

if(!cart) return res.status(404).json({error:"Cart not found"});

cart.items = cart.items.filter(item=> item.productId.toString() !== productId);
await cart.save();
 
res.json({message:"Item removed"});
}

const createPaymentOrder = async (req, res) => {
  const { amount } = req.body;

  try {
    const options = {
      amount: amount * 100, // paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json(order);
  } catch (err) {
    console.error('Razorpay error:', err);
    res.status(500).json({ error: 'Razorpay order creation failed' });
  }
};

const saveOrder = async (req, res) => {
  const { items, totalAmount, paymentId } = req.body;
  const userId = req.user.id;

  try {
    // Fetch name & image for each product from DB
    const enrichedItems = await Promise.all(
      items.map(async ({ productId, qty, price }) => {
        const product = await Item.findById(productId);
        return {
          productId,
          name: product.name,
          price: product.price,
          qty,
          image: product.imageUrl, //  get actual Cloudinary image URL
        };
      })
    );

    const order = new Order({
      userId,
      items: enrichedItems,
      totalAmount,
      paymentId,
    });

    await order.save();
    res.status(201).json({ message: 'Order saved', order });
  } catch (err) {
    console.error('Save order error:', err);
    res.status(500).json({ error: 'Failed to save order' });
  }
};
// const getLatestOrder = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const orders = await Order.find({ userId })
//       .sort({ createdAt: -1 })
//       .limit(1); // Get only the latest order

//     res.status(200).json(orders);
//   } catch (err) {
//     console.error('Get order error:', err);
//     res.status(500).json({ error: 'Failed to get order' });
//   }
// };
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await Order.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json(orders); // Return all orders
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Failed to get orders' });
  }
};

module.exports = {
  uploadProductImage,
  createUser,
  getUserProfile,
  getImage,
  logginAccount,
  updateProductPrice,
  addToCart,
  getUserCart,
  createPaymentOrder,
  saveOrder,
  // getLatestOrder,
  removeFromCart,
  getUserOrders
};
