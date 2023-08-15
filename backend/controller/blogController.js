const Joi = require("joi");
//This is a file system build in model in node js to store photo in disc.
const fs = require("fs");
const Blog = require("../models/blog");
const { BACKEND_SERVER_PATH } = require("../config/index");
const BlogDTO = require("../dto/blog");
const BlogDetailsDTO = require("../dto/blog-details");
const Comment = require("../models/comment");

const mongodbIdPattern = /^[0-9a-fA-F]{24}$/;
const blogController = {
  async create(req, res, next) {
    // 1. validate req body

    const createBlogSchema = Joi.object({
      title: Joi.string().required(),
      author: Joi.string().regex(mongodbIdPattern).required(),
      content: Joi.string().required(),
      //We will get photo from client side which will be in the form of base64 encoded string -> decode in backend which we will save and store photo in database.
      photo: Joi.string().required(),
    });

    const { error } = createBlogSchema.validate(req.body);
    if (error) {
      return next(error);
    }
    const { title, author, content, photo } = req.body;
    //Handle photo
    //1.read as buffer
    const buffer = Buffer.from(
      photo.replace(/^data:image\/(png|jgp|jpeg);base64,/, ""),
      "base64"
    );
    //2.give random name
    const imagePath = `${Date.now()}-${author}.png`;

    //3.save locally
    try {
      fs.writeFileSync(`storage/${imagePath}`, buffer);
    } catch (error) {
      return next(error);
    }

    //save blog in database
    let newBlog;
    try {
      newBlog = new Blog({
        title,
        author,
        content,
        photoPath: `${BACKEND_SERVER_PATH}/storage/${imagePath}`,
      });

      await newBlog.save();
    } catch (error) {
      return next(error);
    }

    const blogDto = new BlogDTO(newBlog);
    return res.status(201).json({ blog: blogDto });
  },
  async getAll(req, res, next) {
    try {
      const blogs = await Blog.find({});

      //To get it in Dto form we will use for loop.
      const blogsDto = [];

      for (let i = 0; i < blogs.length; i++) {
        const dto = new BlogDTO(blogs[i]);
        blogsDto.push(dto);
      }

      return res.status(200).json({ blogs: blogsDto });
    } catch (error) {
      return next(error);
    }
  },
  async getById(req, res, next) {
    //validate ID
    const getByIdSchema = Joi.object({
      id: Joi.string().regex(mongodbIdPattern).required(),
    });

    const { error } = getByIdSchema.validate(req.params);

    if (error) {
      return next(error);
    }

    let blog;

    const { id } = req.params;
    try {
      blog = await Blog.findOne({ _id: id }).populate("author");
    } catch (error) {
      return next(error);
    }

    const blogDto = new BlogDetailsDTO(blog);
    //send response
    return res.status(200).json({ blog: blogDto });
  },
  async update(req, res, next) {
    //validate request body
    const updateBlogSchema = Joi.object({
      title: Joi.string().required(),
      content: Joi.string().required(),
      author: Joi.string().regex(mongodbIdPattern).required(),
      blogId: Joi.string().regex(mongodbIdPattern).required(),
      photo: Joi.string(),
    });

    const { error } = updateBlogSchema.validate(req.body);

    const { title, content, author, blogId, photo } = req.body;
    //if we are updating photo, then first we will delete that photo but if we are updating only content and title we will not delete the photo
    let blog;
    try {
      blog = await Blog.findOne({ _id: blogId });
    } catch (error) {
      return next(error);
    }
    if (blog) {
      if (photo) {
        let previousPhoto = blog.photoPath;

        pathParts = previousPhoto.split("/"); //1691042948876-64afe421848ac5228637aa1e.png
        previousPhoto = pathParts[pathParts.length - 1];

        //fs.unlinkSync is used to remove file or path from file system
        fs.unlinkSync(`storage/${previousPhoto}`);
        const buffer = Buffer.from(
          photo.replace(/^data:image\/(png|jgp|jpeg);base64,/, ""),
          "base64"
        );
        //2.give random name
        const imagePath = `${Date.now()}-${author}.png`;

        //3.save locally
        try {
          fs.writeFileSync(`storage/${imagePath}`, buffer);
        } catch (error) {
          return next(error);
        }
        await Blog.updateOne(
          { _id: blogId },
          {
            title,
            content,
            photoPath: `${BACKEND_SERVER_PATH}/storage/${imagePath}`,
          }
        );
      } else {
        await Blog.updateOne({ _id: blogId }, { title, content });
      }
    } else {
      return res.status(401).json({ message: "Blog not found" });
    }

    //send response
    return res.status(200).json({ message: "Blog updated successfully" });
  },

  async delete(req, res, next) {
    //validate id
    const deleteBlogSchema = Joi.object({
      id: Joi.string().regex(mongodbIdPattern).required(),
    });

    const { error } = deleteBlogSchema.validate(req.params);

    const { id } = req.params;

    try {
      //delete blog
      await Blog.deleteOne({ _id: id });

      //delete comments on that specific blog which we have deleted
      await Comment.deleteMany({ blog: id });
    } catch (error) {
      return next(error);
    }

    return res.status(200).json({ message: "Blog deleted successfully" });
  },
};
module.exports = blogController;
