//Joi makes data validation easier
const Joi = require("joi");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const UserDTO = require("../dto/user");
const JWTService = require("../services/JWTService");
const RefreshToken = require("../models/token");

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,25}$/;
const authController = {
  async register(req, res, next) {
    //1.validate user input
    const userRegisterSchema = Joi.object({
      username: Joi.string().min(5).max(30).required(),
      name: Joi.string().max(30).required(),
      email: Joi.string().email().required(),
      password: Joi.string().pattern(passwordPattern).required(),
      confirmPassword: Joi.ref("password"),
    });

    const { error } = userRegisterSchema.validate(req.body);
    //2.if error in validation -> return error via middleware
    if (error) {
      return next(error);
    }
    //3.if email or username is already registered -> return an error
    const { username, name, email, password } = req.body;

    try {
      const emailInUse = await User.exists({ email });
      const usernameInUse = await User.exists({ username });
      if (emailInUse) {
        const error = {
          status: 409,
          message: "Email already exists, use another email to register",
        };
        return next(error);
      }
      if (usernameInUse) {
        const error = {
          status: 409,
          message: "Username already exists, choose another username",
        };
        return next(error);
      }
    } catch (error) {
      return next(error);
    }
    //4.password hash
    const hashPassword = await bcrypt.hash(password, 10);

    //5.store data in database
    let accessToken;
    let refreshToken;
    let user;
    try {
      const userToRegister = new User({
        username,
        name,
        email,
        password: hashPassword,
      });

      user = await userToRegister.save();

      //Token Generation
      accessToken = JWTService.signAccessToken({ _id: user._id }, "30m");

      refreshToken = JWTService.signRefreshToken({ _id: user._id }, "60m");
    } catch (error) {
      return next(error);
    }

    // store refresh token in database
    await JWTService.storeRefreshToken(refreshToken, user._id);

    //send tokens to cookie
    res.cookie("accessToken", accessToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });

    res.cookie("refreshToken", refreshToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });

    //Data Transfer Objects
    const userDto = new UserDTO(user);
    //6. response send
    return res.status(201).json({ user: userDto, auth: true });
  },
  async login(req, res, next) {
    //1. validate user input
    const userLoginSchema = Joi.object({
      email: Joi.string().email().required(),
      //   username: Joi.string().min(5).max(30).required(),
      password: Joi.string().pattern(passwordPattern).required(),
    });
    const { error } = userLoginSchema.validate(req.body);
    //2. if error in validation return via middleware
    if (error) {
      return next(error);
    }
    //3. if no error found, match username
    const { email, password } = req.body;
    let user;
    try {
      user = await User.findOne({ email: email });
      if (!user) {
        const error = {
          status: 401,
          message: "Inavlid email, please enter a valid email",
        };
        return next(error);
      }
      //match password
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        const error = {
          status: 401,
          message: "Invalid Password",
        };
        return next(error);
      }
    } catch (error) {
      return next(error);
    }

    const accessToken = JWTService.signAccessToken({ _id: user._id }, "30m");
    const refreshToken = JWTService.signRefreshToken({ _id: user._id }, "60m");

    //Update refresh Token in database
    try {
      await RefreshToken.updateOne(
        {
          _id: user._id,
        },
        { token: refreshToken },
        { upsert: true }
      );
    } catch (error) {
      return next(error);
    }

    // send tokens to cookies
    res.cookie("accessToken", accessToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });
    res.cookie("refreshToken", refreshToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });
    //Data Transfer Objects
    const userDto = new UserDTO(user);
    //4. return response
    return res.status(200).json({ user: userDto, auth: true });
  },
  async logout(req, res, next) {
    // console.log(req);
    //1.delete refresh token from database
    const { refreshToken } = req.cookies;
    try {
      await RefreshToken.deleteOne({ token: refreshToken });
    } catch (error) {
      return next(error);
    }
    //2.Delete Cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    //3.send response to the user so that frontend get notified with this response that user is unauthenticated.
    res.status(200).json({ user: null, auth: false });
  },
  async refresh(req, res, next) {
    //1.Access refresh token from cookies
    const originalRefreshToken = req.cookies.refreshToken;

    //2.verify refresh token
    let id;
    try {
      id = JWTService.verifyRefreshToken(originalRefreshToken)._id;
    } catch (e) {
      const error = {
        status: 401,
        message: "Unauthorized",
      };
      return next(error);
    }
    try {
      const match = RefreshToken.findOne({
        _id: id,
        token: originalRefreshToken,
      });
      if (!match) {
        const error = {
          status: 401,
          message: "Unauthorized",
        };
        return next(error);
      }
    } catch (e) {
      return next(e);
    }
    //3.Generate new token
    try {
      const accessToken = JWTService.signAccessToken({ _id: id }, "30m");

      const refreshToken = JWTService.signRefreshToken({ _id: id }, "60m");

      //update token
      await RefreshToken.updateOne({ _id: id }, { token: refreshToken });

      //send token to cookie
      res.cookie("accessToken", accessToken, {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
      });
      res.cookie("refreshToken", refreshToken, {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
      });
    } catch (e) {
      return next(e);
    }
    //return response
    const user = await User.findOne({ _id: id });
    const userDto = new UserDTO(user);

    return res.status(200).json({ user: userDto, auth: true });
  },
};
module.exports = authController;
