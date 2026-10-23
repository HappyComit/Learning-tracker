import express from "express"
import { authenticateToken } from "../middleware/auth.js"
import Content from "../models/Content.js"


const router = express.Router()

// Get all contents for user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const contents = await Content.find({ userId: req.user.userId })
    res.json(contents)
  } catch (error) {
    res.status(500).json({ message: "Error fetching contents", error: error.message })
  }
})

// Create content
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { title, creator, type, skillId, url, thumbnail, status } = req.body

    const content = new Content({
      userId: req.user.userId,
      title,
      creator,
      type,
      skillId,
      url,
      thumbnail,
      status,
    })

    await content.save()
    res.status(201).json(content)
  } catch (error) {
    res.status(500).json({ message: "Error creating content", error: error.message })
  }
})

// Update content
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const content = await Content.findOneAndUpdate({ _id: req.params.id, userId: req.user.userId }, req.body, {
      new: true,
    })

    if (!content) {
      return res.status(404).json({ message: "Content not found" })
    }

    res.json(content)
  } catch (error) {
    res.status(500).json({ message: "Error updating content", error: error.message })
  }
})

// Delete content
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const content = await Content.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    })

    if (!content) {
      return res.status(404).json({ message: "Content not found" })
    }

    res.json({ message: "Content deleted" })
  } catch (error) {
    res.status(500).json({ message: "Error deleting content", error: error.message })
  }
})

export default router
