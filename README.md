# Example Full Stack Application

This app shows a few parts of the XcooBee API and use of the XcooBee Payment SDK for JavaScript. It is based on Node Express Generator scaffolding and you  can deploy easily to review coding against what you need to do.

There are five tabs. Each tab corresponds to one area of the SDK or API and shows you how to code for it.

## Prerequisites

You will need nodejs (10+).

You also will need a XcooBee account that you can use for development.
We recommend that you create a free Professional account since this will allow you to do coding with the Payment SDK and see full life cycle. When you use sandbox keys for Paypal or test keys for Stripe there will be no platform charges and you can develop you whole solution
before taking it into production easily.


## Installation

Clone the repo.
`git clone https://github.com/XcooBee/example-full-stack-js.git`

then run
`npm install`

## Build / Start

There is no specific build step needed. Just start the express app:

`npm run start`


# Application Tabs

Our example full stack application has five  tabs. Each highlights a different area of XcooBee for your to explore.


## Home Tab

Basic explaination.

## Shopping Cart Tab

Shows you how to create catalog items and shopping carts for any site quickly.

## Invoice Tab

Generate an activated invoice that can be paid when received by customers

## Poll Events Tab

The poller retrieves events from your accounts on an intervall. This for development and servers behind firewalls without access to internet. You can also use services like [ngrok](https://ngrok.com/) to create tunnels during development.

## Settings Tab

This is where you add all the different keys and configurations to communicate with the XcooBee backend.
