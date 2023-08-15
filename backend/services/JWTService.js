const jwt = require("jsonwebtoken");
const {
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
} = require("../config/index");
const RefreshToken = require("../models/token");
//JWT has three parts i.e header, payload and signature
//Access Token (to take access on protected resources, it has short life span/ expiry time and is stored on client side i.e cookie or local Storage but we will use cookie as it is more secure)
//refresh Token(used to request new access token when it expires , it has longer time span and is stored on server and client as well)

class JWTService {
  //sign access token
  static signAccessToken(payload, expiryTime) {
    return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: expiryTime });
  }
  //sign refresh token
  static signRefreshToken(payload, expiryTime) {
    return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: expiryTime });
  }
  //verify access token
  static verifyAccessToken(token) {
    return jwt.verify(token, ACCESS_TOKEN_SECRET);
  }
  //verify refresh token
  static verifyRefreshToken(token) {
    return jwt.verify(token, REFRESH_TOKEN_SECRET);
  }
  //store refresh token
  static async storeRefreshToken(token, userId) {
    try {
      const newToken = new RefreshToken({
        token: token,
        userId: userId,
      });
      //store token in database
      await newToken.save();
    } catch (error) {
      console.log(error);
    }
  }
}
module.exports = JWTService;
