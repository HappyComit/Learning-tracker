import mongoose from "mongoose"

const skillSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    currentLevel: {
      type: String,
      enum: ["Beginner", "Elementary", "Intermediate", "Advanced", "Expert"],
      default: "Beginner",
    },
    targetLevel: {
      type: String,
      enum: ["Beginner", "Elementary", "Intermediate", "Advanced", "Expert"],
      default: "Intermediate",
    },
  },
  { timestamps: true },
)

export default mongoose.model("Skill", skillSchema)
