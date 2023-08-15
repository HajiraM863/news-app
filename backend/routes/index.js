//Create Router
const express = require("express");
const authController = require("../controller/authController");
const blogController = require("../controller/blogController");
const commentController = require("../controller/commentController");
const auth = require("../middlewares/auth");

const router = express.Router();

//register
router.post("/register", authController.register);
//User Login
router.post("/login", authController.login);

//logout

router.post("/logout", auth, authController.logout);
//refresh
router.get("/refresh", authController.refresh);

//blog
//CRUD
//Create
router.post("/blog", auth, blogController.create);
//Read all blogs
router.get("/blog/all", auth, blogController.getAll);
//read blog by Id
router.get("/blog/:id", auth, blogController.getById);

//Update
router.put("/blog", auth, blogController.update);
//Delete

router.delete("/blog/:id", auth, blogController.delete);

//Comments
//create comment
router.post("/comment", auth, commentController.create);
//get
router.get("/comment/:id", auth, commentController.getById);
//update comment
//delete comments by blog id
module.exports = router;
