import express from "express"
import { authenticateToken } from "../middleware/auth.js"
import Session from "../models/Session.js"


const router = express.Router()

// Get all sessions for user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user.userId })
    res.json(sessions)
  } catch (error) {
    res.status(500).json({ message: "Error fetching sessions", error: error.message })
  }
})

// Create session
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { contentId, date, duration, notes } = req.body

    const session = new Session({
      userId: req.user.userId,
      contentId,
      date,
      duration,
      notes,
    })

    await session.save()
    res.status(201).json(session)
  } catch (error) {
    res.status(500).json({ message: "Error creating session", error: error.message })
  }
})

// Update session
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOneAndUpdate({ _id: req.params.id, userId: req.user.userId }, req.body, {
      new: true,
    })

    if (!session) {
      return res.status(404).json({ message: "Session not found" })
    }

    res.json(session)
  } catch (error) {
    res.status(500).json({ message: "Error updating session", error: error.message })
  }
})

// Delete session
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    })

    if (!session) {
      return res.status(404).json({ message: "Session not found" })
    }

    res.json({ message: "Session deleted" })
  } catch (error) {
    res.status(500).json({ message: "Error deleting session", error: error.message })
  }
})

export default router
