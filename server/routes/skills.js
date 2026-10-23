import express from "express"
import { authenticateToken } from "../middleware/auth.js"
import Skill from "../models/Skill.js"


const router = express.Router()

// Get all skills for user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const skills = await Skill.find({ userId: req.user.userId })
    res.json(skills)
  } catch (error) {
    res.status(500).json({ message: "Error fetching skills", error: error.message })
  }
})

// Create skill
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { name, category, currentLevel, targetLevel } = req.body

    const skill = new Skill({
      userId: req.user.userId,
      name,
      category,
      currentLevel,
      targetLevel,
    })

    await skill.save()
    res.status(201).json(skill)
  } catch (error) {
    res.status(500).json({ message: "Error creating skill", error: error.message })
  }
})

// Update skill
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const skill = await Skill.findOneAndUpdate({ _id: req.params.id, userId: req.user.userId }, req.body, { new: true })

    if (!skill) {
      return res.status(404).json({ message: "Skill not found" })
    }

    res.json(skill)
  } catch (error) {
    res.status(500).json({ message: "Error updating skill", error: error.message })
  }
})

// Delete skill
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const skill = await Skill.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    })

    if (!skill) {
      return res.status(404).json({ message: "Skill not found" })
    }

    res.json({ message: "Skill deleted" })
  } catch (error) {
    res.status(500).json({ message: "Error deleting skill", error: error.message })
  }
})

export default router
