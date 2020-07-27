"use strict";

const express = require("express");

const router = express.Router();

router
    .get("/", (req, res) => {
        res.render("index", { title: "Home" });
    })
    .get("/poller", (req, res) => {
        res.render("poller", { title: "Poll Events" });
    })
    .get("/settings", (req, res) => {
        res.render("settings", { title: "Settings" });
    })
    .get("/payment", (req, res) => {
        res.render("payment", { title: "Full Payment Cycle" });
    })
    .get("/shopping_cart", (req, res) => {
        res.render("shoppingCart", {
            title: "Shopping Cart",
            products: [
                {
                    name: "Beanie",
                    price: 18.95,
                    image: "/images/beanie.jpg",
                },
                {
                    name: "Belt",
                    price: 9.95,
                    image: "/images/belt.jpg",
                },
                {
                    name: "Gloves",
                    price: 14.95,
                    image: "/images/gloves.jpg",
                },
            ],
        });
    });

module.exports = router;
