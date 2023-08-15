const express = require("express");
const dbConnect = require("./database/index");
const { PORT } = require("./config/index");
const router = require("./routes/index");
const errorHandler = require("./middlewares/errorHandler");
const cookieParser = require("cookie-parser");

const app = express();

app.use(cookieParser());

app.use(express.json());

app.use(router);
// const PORT = 5000;
dbConnect();

//We can use this middleware to excess images.
app.use("/storage", express.static("storage"));

app.use(errorHandler);

app.listen(PORT, console.log(`Backend is running on port: ${PORT}`));
