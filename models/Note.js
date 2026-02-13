import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    body: {
      type: String,
      required: true,
    },
    colors: {
      type: String,
      required: true,
    },
    position: {
      type: String,
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // name of the User model
      // required: true,
      index: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Note", noteSchema);
