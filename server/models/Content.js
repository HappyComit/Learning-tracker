import mongoose from "mongoose"

const contentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    skillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Skill",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    creator: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["youtube", "podcast", "course", "article"],
      default: "youtube",
    },
    url: {
      type: String,
    },
    thumbnail: {
      type: String,
    },
    status: {
      type: String,
      enum: ["to-watch", "in-progress", "completed"],
      default: "to-watch",
    },
    progressSeconds: {
      type: Number,
      default: 0,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    restartCount: {
      type: Number,
      default: 0,
    },
    lastWatchedAt: {
      type: String,
      default: null,
    },
    completedAt: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
)

export default mongoose.model("Content", contentSchema)
