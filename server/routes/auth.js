import express from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import User from "../models/User.js"
import { authenticateToken } from "../middleware/auth.js"

const router = express.Router()

// Register
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body

    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = new User({
      username,
      password: hashedPassword,
    })

    await user.save()

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    })

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
      },
    })
  } catch (error) {
    res.status(500).json({ message: "Registration failed", error: error.message })
  }
})

// Login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body

    const user = await User.findOne({ username })
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    })

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
      },
    })
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message })
  }
})

// Get current user
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password")
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }
    res.json({
      id: user._id,
      username: user.username,
    })
  } catch (error) {
    res.status(500).json({ message: "Error fetching user", error: error.message })
  }
})

// Logout (client-side token removal, but endpoint for consistency)
router.post("/logout", authenticateToken, async (req, res) => {
  res.json({ message: "Logged out successfully" })
})

export default router
