/* eslint-disable */

const SETTINGS_KEY = "xb_efa_settings";

const parseJSON = (str) => {
    try {
        return JSON.parse(str);
    } catch (e) {
        return null;
    }
};

$(() => {
    // ============== Alerts ===============
    const alertBlock = $("#alert_block").hide();

    const handleError = (message) => {
        alertBlock.find($("p")).html(message);
        alertBlock.addClass("alert-danger").removeClass("alert-success").show();
    };

    const handleSuccess = (message) => {
        alertBlock.find($("p")).html(message);
        alertBlock.addClass("alert-success").removeClass("alert-danger").show();
    };

    alertBlock.find($(".close")).click(() => alertBlock.hide());

    // ============== Helpers ===============
    const getFromLocalStorage = key => parseJSON(localStorage.getItem(key));
    const setToLocalStorage = (key, value) => localStorage.setItem(key, JSON.stringify(value));

    const sendMessage = message => {
        const settings = getFromLocalStorage(SETTINGS_KEY) || {};

        if (settings.slack_hook_url) {
            $.ajax({
                type: "POST",
                url: "/post-to-slack",
                data: JSON.stringify({
                    text: message,
                    hookUrl: settings.slack_hook_url,
                }),
                contentType: "application/json",
                dataType: "json",
            });
        }
    };

    const getPaymentSDKInstance = (deviceId) => {
        const settings = getFromLocalStorage(SETTINGS_KEY) || {};

        return new window.XcooBee.XcooBeePaymentSDK({
            campaignId: settings.campaign_id,
            formId: settings.campaign_form_id,
            deviceId,
        });
    };

    const getSDKInstance = () => {
        const settings = getFromLocalStorage(SETTINGS_KEY) || {};

        try {
            const config = new window.XcooBee.sdk.Config({
                apiUrlRoot: "https://testapi.xcoobee.net/Test",
                apiKey: settings.api_key,
                apiSecret: settings.api_secret,
                campaignId: settings.campaign_id,
                pgpPassword: settings.pgp_password,
                pgpSecret: settings.pgp_key,
            });
            return new window.XcooBee.sdk.Sdk(config);
        } catch (e) {
            handleError(e.message);
            throw e;
        }
    };

    const stringToCamelCase = str => str.replace(/(\_\w)/g, m => m[1].toUpperCase());

    $("#xcoobee_api_result").hide();

    const stopPoller = () => {
        clearTimeout(timer);
        timer = null;
        $("#start_poll").removeClass("btn-primary").addClass("btn-outline-primary");
        $("#stop_poll").removeClass("btn-outline-primary").addClass("btn-light");
        $("button").prop("disabled", false);
        $(".xcoobee_clock").html("<div>waiting for poll</div>");
        $(".xcoobee_loader").hide();
    };

    const displayPollerResponse = () => {
        $("#xcoobee_api_result").show();
        $(".xcoobee_loader").show();
        const xcooBeeSdk = getSDKInstance();

        return xcooBeeSdk.system.getEvents()
            .then((response) => {
                if (response.result
                    && response.result
                    && response.result.data
                    && response.result.data.length
                ) {
                    let html = "";
                    response.result.data.forEach(function (elm) {
                        html = `
                            <tr>
                                <td>${stringToCamelCase(elm.event_type)}</td>
                                <td><pre>${JSON.stringify(elm.payload)}</pre></td>
                                <td>${elm.reference_type}</td>
                                <td>${elm.date_c}</td>
                            </tr>
                        `;
                    });
                    $("#xcoobee_api_result tbody").html(html);
                } else {
                    $("#xcoobee_api_result tbody").html("no running events");
                }
                $(".xcoobee_loader").hide();
            })
            .catch((err) => {
                handleError(err.error.message);
                stopPoller();
            });
    };

    const pollServer = (serverPollInterval, countDown) => {
        let count = countDown === undefined ? parseInt(serverPollInterval, 10) : countDown;

        timer = setTimeout(function () {
            count = count > 0 ? count - 1 : count;
            $(".xcoobee_clock").html(`<div>next poll in <span>${count}</span> s</div>`);

            if (count === 0) {
                count = parseInt(serverPollInterval, 10);
                displayPollerResponse().then(() => timer && pollServer(serverPollInterval)).catch(() => timer && pollServer(serverPollInterval));
            } else if (timer) {
                pollServer(serverPollInterval, count);
            }
        }, 1000);
    };

    // ============= Menu ==================
    const current = location.pathname;
    $(".navbar-nav li a").each((i, item) => {
        if ($(item).attr("href") === current) {
            $(item).addClass("active");
        }
    });

    // ============= Settings page ===========
    const settingsValues = getFromLocalStorage(SETTINGS_KEY) || {};

    Object.keys(settingsValues).forEach((name) => {
        $(`[name="${name}"]`).val(settingsValues[name]);
    });
    $("form.settings-form").submit((e) => {
        e.preventDefault();
    });
    $("button.submit-settings-form").click(function () {
        let settingsValues = getFromLocalStorage(SETTINGS_KEY) || {};
        const formData = $(this.form).serializeArray();

        formData.forEach((item) => {
            settingsValues = Object.assign(settingsValues, {
                [item.name]: item.value,
            });
        });
        if (Object.keys(settingsValues).length) {
            setToLocalStorage(SETTINGS_KEY, settingsValues);
        }
        handleSuccess("Settings saved");
    });
    $("#test_settings").click(() => {
        $("button.submit-settings-form").click();
        alertBlock.hide();

        const xcooBeeSdk = getSDKInstance();

        $("#test_settings").prop("disabled", true);
        xcooBeeSdk.system.ping()
            .then(() => handleSuccess("Everything's fine"))
            .catch(err => handleError(err.error.message))
            .then(() => $("#test_settings").prop("disabled", false));
    });

    // ============= Shopping cart page ===========
    $("a.product_link").click(function (e) {
        e.preventDefault();
        e.stopPropagation();
        const productCart = $(this).closest(".product_item");
        const xcoobeeSDK = getPaymentSDKInstance();

        const price = parseFloat(productCart.find(".product_price").first().html());
        const name = productCart.find(".product_name").first().html();

        const link = xcoobeeSDK.createSingleSelectUrl({
            amount: price,
            reference: name,
            options: ["M", "L", "XL"],
        });

        $("#shopping_cart").attr("src", link);
    });

    // ============ Poller page ===================
    let timer;

    $.validator.addMethod("pollinterval", function (value, element) {
        const v = $("input[name=\"" + element.name + "\"]").val();
        return (v == 0 || (v >= 60 && v <= 600));
    }, "Enter interval in seconds 0 or min. 60 - max 600");

    $("#xcoobee_demo_form")
        .submit(e => e.preventDefault())
        .validate({
            submitHandler: function () {
                alertBlock.hide();
                const submitButtonName = $(this.submitButton).attr("name");
                const pollInterval = +$("#xcoobee_poll_interval").val() || 0;
                if (submitButtonName === "start_poll" && pollInterval !== 0) {
                    $("#start_poll").removeClass("btn-outline-primary").addClass("btn-primary").prop("disabled", true);
                    $("#stop_poll").removeClass("btn-light").addClass("btn-outline-primary");
                    $("#manual_poll").prop("disabled", true);
                    displayPollerResponse();
                    pollServer(pollInterval);
                }
                if (submitButtonName === "manual_poll" || pollInterval === 0) {
                    $("button").prop("disabled", true);
                    displayPollerResponse().then(() => stopPoller());
                }
                return false;
            },
        });

    $("#stop_poll").on("click", () => {
        stopPoller();
        alertBlock.hide();
    });

    // ============= Payments page ===========
    $("#payment_form").submit(e => e.preventDefault());
    $("#request_payment").click(function () {
        const properties = {};
        const formData = $(this.form).serializeArray();
        formData.forEach((item) => {
            properties[item.name] = item.value;
        });

        const xcoobeeSDK = getPaymentSDKInstance(properties.external_device_id);

        const link = xcoobeeSDK.createPayUrl({
            amount: parseFloat(properties.payment_amount),
            reference: properties.payment_reference,
        });

        $("#payment_cycle").attr("src", link);
        setTimeout(() => pollServer(2), 25000);
    });

    // ============= Invoice page ===========
    $("#invoice_form")
        .submit(e => e.preventDefault())
        .validate({
            submitHandler: function () {
                const settings = getFromLocalStorage(SETTINGS_KEY) || {};

                if (!settings.campaign_id) {
                    alertBlock.show();
                    handleError("Campaign ID is required");
                    return;
                }

                const properties = {};
                const formData = $("#invoice_form").serializeArray();
                formData.forEach((item) => {
                    properties[item.name] = encodeURIComponent(item.value);
                });

                window.open(`/generate-invoice?ref=${properties.payment_reference}&amount=${properties.payment_amount}&campaignId=${settings.campaign_id}`, "_blank");
            },
        });

    // ============= Kitchen orders page ===========
    if ($("#kitchen-orders-table").length) {
        const toggledRows = {};
        let kitchenTimer;

        const parseReference = sections => {
            let items;
            let roomNumber="100";  // default room to 100 if not provided this is only a marker, the real change happens during display
            let notes;
            let userName;
            

            if (Array.isArray(sections)) {
                const section = sections.find(item => item.section_id === "2");
                const zeroSection = sections.find(item => item.section_id === "0");

                if (zeroSection) {
                    const firstNameField = zeroSection.fields.find(field => field.dataTypeId === 100);
                    const lastNameField = zeroSection.fields.find(field => field.dataTypeId === 120);

                    userName = [firstNameField && firstNameField.value, lastNameField && lastNameField.value].filter(Boolean).join(" ");
                }

                if (section) {
                    const referenceField = section.fields.find(field => field.dataTypeId === 9997);
                    const notesField = section.fields.find(field => field.dataTypeId === 9998);

                    if (notesField.value) {
                        notes = notesField.value;
                    }

                    if (referenceField.value) {
                        items = referenceField.value
                            .split("\n")
                            .map(itemRef => {
                                if (/^xb_room_number:/.test(itemRef)) {
                                    roomNumber = itemRef.split(":")[1];                                    
                                    return;
                                }
                                const [name, price] = itemRef.split("-");

                                if (name) {
                                    const [itemName, ...options] = name.split("+");
                                    const [, itemNameWithoutQty, qty] = /(.+)(?:\((\d+)\))?$/.exec(itemName);

                                    return {
                                        name: [itemNameWithoutQty, ...options].map(name => name.trim()).join(" + "),
                                        qty: +qty || 1,
                                        price
                                    };
                                }
                            })
                            .filter(Boolean);
                    }
                }
            }
                       
           
            return { items, roomNumber, notes, userName };
        };

        const renderOrders = () => {
            const settings = getFromLocalStorage(SETTINGS_KEY) || {};
            const orders = parseJSON(localStorage.getItem(`${settings.campaign_id}-kitchen-orders`)) || [];
            const rows = orders.map(order => `
                <tr id="${order.id}">
                    <td class="text-center">
                        <button class="btn btn-light py-0" data-toggle="row">
                            <i class="fa fa-chevron-${toggledRows[order.id] ? "up" : "down"}" aria-hidden="true"/>
                        </button>
                    </td>
                    <td class="text-right">${order.roomNumber == 'undefined' ? '100': order.roomNumber }</td>
                    <td>${order.userName || ""}</td>
                    <td>${new Date(order.in).getHours()}:${new Date(order.in).getMinutes()}</td>
                    <td>${order.start ? `${new Date(order.start).getHours()}:${new Date(order.start).getMinutes()}` : ""}</td>
                    <td>${order.finish ? `${new Date(order.finish).getHours()}:${new Date(order.finish).getMinutes()}` : ""}</td>
                    <td class="text-right">${order.items.reduce((total, item) => total + (item.qty || 1), 0)}</td>
                    <td class="text-center">
                        ${order.start ? "" : `
                            <button class="btn btn-light py-0" data-start data-toggle="tooltip" data-placement="top" title="Start working on this order">
                                <i class="fa fa-play" aria-hidden="true"/>
                            </button>
                        `}
                        ${!order.start || order.finish ? "" : `
                            <button class="btn btn-light py-0" data-finish data-toggle="tooltip" data-placement="top" title="Mark this order as complete">
                                <i class="fa fa-check" aria-hidden="true"/>
                            </button>
                        `}
                        <button class="btn btn-light py-0" data-toggle="tooltip" data-placement="top" title="Send message to guest">
                            <i class="fa fa-question" aria-hidden="true"/>
                        </button>
                    </td>
                </tr>
                <tr class="${toggledRows[order.id] ? "" : "d-none"}">
                    <td></td>
                    <td colspan="7">
                        <table class="table my-0">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th class="text-right">Qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${order.items.map(item => `
                                    <tr>
                                        <td>${item.name}</td>    
                                        <td class="text-right">${item.qty}</td>    
                                    </tr>
                                `).join("")}
                                ${order.notes ? `
                                    <tr>
                                        <td colspan="2">
                                            <b class="font-bold"">Notes</b>
                                            <p>${order.notes}</p>
                                        </td>
                                    </tr>` : ""}
                            </tbody>
                        </table>
                    </td>
                </tr>
                `);

            if (rows.length) {
                $("#kitchen-orders-table > tbody").html(rows.join(""));
            } else {
                $("#kitchen-orders-table > tbody").html(`<tr><td colspan="8" class="text-center">No orders found</td></tr>`);
            }
            $(".tooltip").tooltip("hide");
            $("[data-toggle=\"tooltip\"]").tooltip();

            orders.forEach(order => {
                $(`#${order.id} [data-toggle="row"]`).click(() => {
                    toggledRows[order.id] = !toggledRows[order.id];

                    if (toggledRows[order.id]) {
                        $(`#${order.id} + tr`).removeClass("d-none");
                        $(`#${order.id} [data-toggle="row"] .fa`).addClass("fa-chevron-up").removeClass("fa-chevron-down");
                    } else {
                        $(`#${order.id} + tr`).addClass("d-none");
                        $(`#${order.id} [data-toggle="row"] .fa`).addClass("fa-chevron-down").removeClass("fa-chevron-up");
                    }
                });

                $(`#${order.id} [data-start]`).click(() => {
                    const items = parseJSON(localStorage.getItem(`${settings.campaign_id}-kitchen-orders`)) || [];

                    localStorage.setItem(`${settings.campaign_id}-kitchen-orders`, JSON.stringify(items.map(item => item.id === order.id ? ({
                        ...item,
                        start: Date.now()
                    }) : item)));
                    sendMessage(`Dear ${order.userName || "Customer"}:\nThis is your hotel room service. We wanted to let you know that we have started working on your room-service order and we will back in touch when your order is ready to be brought to your room.`);
                    renderOrders();
                });

                $(`#${order.id} [data-finish]`).click(() => {
                    const items = parseJSON(localStorage.getItem(`${settings.campaign_id}-kitchen-orders`)) || [];

                    localStorage.setItem(`${settings.campaign_id}-kitchen-orders`, JSON.stringify(items.map(item => item.id === order.id ? ({
                        ...item,
                        finish: Date.now()
                    }) : item)));
                    sendMessage("Your order is complete and on its way to you. Thank you again.\nYour Accor kitchen and room service team.");
                    renderOrders();
                });
            });
        };

        const displayKitchenOrders = (res) => {
            const settings = getFromLocalStorage(SETTINGS_KEY) || {};

            if (res.result && res.result && res.result.data && res.result.data.length) {
                const orders = parseJSON(localStorage.getItem(`${settings.campaign_id}-kitchen-orders`)) || [];
                const events = res.result.data.filter(item => item.event_type === "payment_success" && !orders.some(order => order.id === item.event_id));
                const newOrders = [
                    ...events
                        .map(event => {
                            if (event.payload && typeof event.payload === "object") {
                                return {
                                    in: Date.now(),
                                    id: event.event_id,
                                    ...parseReference(event.payload.dataTypes),
                                };
                            }

                            return {
                                in: Date.now(),
                                id: event.event_id,
                                items: [],
                            };
                        })
                        .filter(item => item.items && item.items.length),
                    ...orders
                ];

                localStorage.setItem(`${settings.campaign_id}-kitchen-orders`, JSON.stringify(newOrders));
            }
            renderOrders();
        };

        const poolKitchenEvents = () => {
            const xcooBeeSdk = getSDKInstance();

            xcooBeeSdk.system
                .getEvents()
                .then(displayKitchenOrders)
                .then(() => {
                    kitchenTimer = setTimeout(() => poolKitchenEvents(), 5000);
                })
                .catch(err => {
                    console.error(err);
                    handleError(err.message);
                });
        };

        renderOrders();
        poolKitchenEvents();
    }
});
