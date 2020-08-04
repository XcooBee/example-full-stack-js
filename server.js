"use strict";

const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const { NOT_FOUND, INTERNAL_SERVER_ERROR } = require("http-status-codes");
require("express-async-errors");

const Logger = require("./shared/Logger");
const Router = require("./routes");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");
app.use(morgan("common"));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
// parse cookies
app.use((req, res, next) => {
    const cookies = req.cookies || {};
    req.cookies.settings = cookies.settings ? JSON.parse(cookies.settings) : {};
    next();
});

app.use("/", Router);

app.use("*", () => {
    throw new Error("Wrong URL");
});

// error handler
app.use((err, req, res, next) => {
    let code = INTERNAL_SERVER_ERROR;
    if (err.message === "Wrong URL") {
        code = NOT_FOUND;
    }
    res.status(code);
    res.render("error", { error: err });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
    Logger.info(`Express server started on port: ${port}`);
});
