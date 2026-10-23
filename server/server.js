import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import dotenv from "dotenv"

import authRoutes from "./routes/auth.js"
import skillsRoutes from "./routes/skills.js"
import contentsRoutes from "./routes/contents.js"
import sessionsRoutes from "./routes/sessions.js"

dotenv.config()

const app = express()

// Request logger to trace incoming requests (method, path, origin)
app.use((req, res, next) => {
  console.log(`[REQ] ${new Date().toISOString()} ${req.method} ${req.originalUrl} origin=${req.headers.origin || '-'} `)
  next()
})

// CORS configuration - allow any origin for development
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({extended: true, limit: "16kb"}));
app.use(express.static("public"));

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err))

// Test route
app.get("/", (req, res) => {
  res.json({ message: "Server is running!" })
})

// Health endpoint used by frontend warm-up checks
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" })
})

// Mount routes under /api
app.use("/api/auth", authRoutes)
app.use("/api/skills", skillsRoutes)
app.use("/api/contents", contentsRoutes)
app.use("/api/sessions", sessionsRoutes)

const PORT = process.env.PORT || 5001

// Error handler to log internal errors
app.use((err, req, res, next) => {
  console.error('[ERROR]', err)
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})
