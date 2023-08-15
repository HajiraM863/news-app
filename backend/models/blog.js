const mongoose = require("mongoose");
const { Schema } = mongoose;
// const Schema = mongoose.Schema();

const blogSchema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    photoPath: { type: String, required: true },
    //author is reference type which will refer to connection which is user type.
    author: { type: mongoose.SchemaTypes.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Blog", blogSchema, "blogs");
