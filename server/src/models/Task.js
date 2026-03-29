import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    service: {
      type: String,
      required: true,
      trim: true,
    },
    task: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      required: true,
      enum: ["Critical", "High", "Medium", "Low"],
      default: "Medium",
    },
    sp: {
      type: Number,
      required: true,
      min: 0,
    },
    rationale: {
      type: String,
      required: true,
      trim: true,
    },
    assignedTo: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["Completed", "Pending"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const Task = mongoose.model("Task", taskSchema);
