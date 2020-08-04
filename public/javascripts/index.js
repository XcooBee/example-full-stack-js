/* eslint-disable */

const COOKIE_NAME = "settings";

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
    const setCookie = (key, value, expiry = 24) => {
        const expires = new Date();
        expires.setTime(expires.getTime() + (expiry * 24 * 60 * 60 * 1000));
        document.cookie = `${key}=${value};expires=${expires.toISOString()};samesite=strict`;
    };

    const getCookie = (key) => {
        if (document.cookie) {
            const cookie = document.cookie.split("; ").find(x => x.startsWith(key));
            return cookie && JSON.parse(cookie.split(/=(.+)/)[1]);
        }
        return null;
    };

    const getPaymentSDKInstance = (deviceId) => {
        const settings = getCookie(COOKIE_NAME) || {};

        return new window.XcooBee.XcooBeePaymentSDK({
            campaignId: settings.campaign_id,
            formId: settings.campaign_form_id,
            deviceId,
        });
    };

    const getSDKInstance = () => {
        const settings = getCookie(COOKIE_NAME) || {};

        try {
            const config = new window.XcooBee.sdk.Config({
                apiUrlRoot: "https://api.xcoobee.net",
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
    const cookieValue = getCookie(COOKIE_NAME);
    Object.keys(cookieValue || {}).forEach((name) => {
        $(`[name="${name}"]`).val(cookieValue[name]);
    });
    $("form.settings-form").submit((e) => {
        e.preventDefault();
    });
    $("button.submit-settings-form").click(function () {
        let existingCookies = getCookie(COOKIE_NAME) || {};
        const formData = $(this.form).serializeArray();

        formData.forEach((item) => {
            existingCookies = Object.assign(existingCookies, {
                [item.name]: item.value,
            });
        });
        if (Object.keys(existingCookies).length) {
            setCookie(COOKIE_NAME, JSON.stringify(existingCookies));
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
                const settings = getCookie(COOKIE_NAME) || {};

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
});
