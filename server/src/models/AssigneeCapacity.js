import mongoose from "mongoose";

const assigneeCapacitySchema = new mongoose.Schema(
  {
    assignee: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 0,
      default: 40,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const AssigneeCapacity = mongoose.model(
  "AssigneeCapacity",
  assigneeCapacitySchema,
);
