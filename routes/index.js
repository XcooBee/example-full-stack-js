"use strict";

const os = require("os");
const fs = require("fs");
const path = require("path");
const express = require("express");
const Handlebars = require("handlebars");
const pdf = require('html-pdf');
const { NodeXcooBeePaymentSDK } = require("@xcoobee/payment-sdk");

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
    .get("/invoice", (req, res) => {
        res.render("invoice", { title: "Invoice Creator" });
    })
    .get("/generate-invoice", (req, res, next) => {
        const sdk = new NodeXcooBeePaymentSDK(req.query);
        const params = { amount: req.query.amount, reference: req.query.ref || "Order" };

        sdk
            .createPayQr(params)
            .then(qr => {
                const template = fs.readFileSync(path.resolve(__dirname, "../templates/invoice.hbs"), "utf8");
                const tmpl = Handlebars.compile(template);
                const tmp = tmpl({ ...params, qr, formUrl: sdk.createPayUrl(params) });

                pdf.create(tmp).toStream((err, stream) => {
                    if (err) {
                        return next(err);
                    }
                    res.attachment("invoice.pdf");
                    stream.pipe(res)
                });
            })
            .catch(err => next(err));
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
                    name: "Gloves",
                    price: 14.95,
                    image: "/images/gloves.jpg",
                },
            ],
        });
    });

module.exports = router;
