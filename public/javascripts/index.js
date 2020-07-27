/* eslint-disable */

const COOKIE_NAME = "settings";

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

    const config = new XcooBee.sdk.Config({
        apiUrlRoot: settings.api_url,
        apiKey: settings.api_key,
        apiSecret: settings.api_secret,
        campaignId: settings.campaign_id,
        pgpPassword: settings.pgp_password,
        pgpSecret: settings.pgp_key,
    });
    return new XcooBee.sdk.Sdk(config);
};

const stringToCamelCase = str => str.replace(/(\_\w)/g, m => m[1].toUpperCase());


$(() => {
    const alertBlock = $("#alert_block").hide();

    const handleError = (message) => {
        alertBlock.find($("p")).html(message);
        alertBlock.addClass("alert-danger").removeClass("alert-success").show();
    };

    const handleSuccess = (message) => {
        alertBlock.find($("p")).html(message);
        alertBlock.addClass("alert-success").removeClass("alert-danger").show();
    };

    const stopPoller = () => {
        clearInterval(interval);
        $('#start_poll').removeClass("btn-default").addClass("btn-primary");
        $('#stop_poll').removeClass("btn-primary").addClass("btn-default");
        $("button").prop("disabled", false);
        $(".xcoobee_clock").html("<p>waiting for poll</p>");
        $(".xcoobee_loader").hide();
    }

    const displayPollerResponse = () => {
        $("button").prop("disabled", true);
        $(".xcoobee_loader").show();
        const xcooBeeSdk = getSDKInstance();

        xcooBeeSdk.system.getEvents()
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
                                <td><pre>${elm.payload}</pre></td>
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
                $("button").prop("disabled", false);
            })
            .catch((err) => {
                handleError(err.error.message);
                stopPoller();
            });
    };

    const pollServer = (serverPollInterval) => {
        let count = parseInt(serverPollInterval, 10);

        interval = setInterval(function () {
            count = count > 0 ? count - 1 : count;
            $("button").prop("disabled", true);
            $(".xcoobee_clock").html(`<p>next poll in <span>${count}</span> s</p>`);

            if (count === 0) {
                count = parseInt(serverPollInterval, 10);
                displayPollerResponse();
            }
        }, 1000);
    };

    // ============= Menu ==================
    const current = location.pathname;
    $(".navbar-nav li a").each((i, item) => {
        if ($(item).attr("href") === current){
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
        alertBlock.hide();
    });
    $("button.submit-settings-form").click(function () {
        alertBlock.hide();
        let existingCookies = getCookie(COOKIE_NAME) || {};
        const formData = $(this.form).serializeArray()
        if (formData.every(elem => elem.value)) {
            formData.forEach((item) => {
                existingCookies = Object.assign(existingCookies, {
                    [item.name]: item.value,
                });
            });
        }
        if (Object.keys(existingCookies).length) {
            setCookie(COOKIE_NAME, JSON.stringify(existingCookies));
        }
    });
    $("#test_settings").click(() => {
        const xcooBeeSdk = getSDKInstance();

        xcooBeeSdk.system.ping()
            .then(() => handleSuccess("Everything's fine"))
            .catch(err => handleError(err.error.message));
    });

    // ============= Shopping cart page ===========
    $("a.product_link").click(function (e) {
        e.preventDefault();
        e.stopPropagation();
        const productCart = $(this).closest(".product_item");
        const xcoobeeSDK = getPaymentSDKInstance();

        const price = parseFloat(productCart.find(".product_price").first().html());
        const name = productCart.find(".product_name").first().html();

        const link = xcoobeeSDK.createMultiSelectWithCostUrl({
            amount: price,
            reference: name,
            options: []
        });

        $("#shopping_cart").attr("src", link);
    });

    // ============ Poller page ===================
    let interval;

    $.validator.addMethod("pollinterval", function (value, element) {
        const v = $('input[name="' + element.name + '"]').val();
        return (v == 0 || (v >= 60 && v <= 600));
    }, "Enter interval in seconds 0 or min. 60 - max 600");

    $("#xcoobee_demo_form")
        .submit(e => e.preventDefault())
        .validate({
            submitHandler: function () {
                alertBlock.hide();
                const submitButtonName = $(this.submitButton).attr("name");
                const pollInterval = $("#xcoobee_poll_interval").val();
                if (submitButtonName === "start_poll" && pollInterval !== 0) {
                    $("#start_poll").removeClass("btn-primary").addClass("btn-default");
                    $("#stop_poll").removeClass("btn-default").addClass("btn-primary");
                    displayPollerResponse();
                    pollServer(pollInterval);
                }
                if (submitButtonName === "manual_poll" || pollInterval === 0) {
                    displayPollerResponse();
                }
                return false;
            }
        });

    $("#stop_poll").on("click", () => {
        stopPoller();
        alertBlock.hide();
    });

    // ============= Payments page ===========
    $("#payment_form").submit(e => e.preventDefault());
    $("#request_payment").click(function () {
        const properties = {}
        const formData = $(this.form).serializeArray()
        formData.forEach((item) => {
            properties[item.name] = item.value;
        });

        const xcoobeeSDK = getPaymentSDKInstance(properties.external_device_id);

        const link = xcoobeeSDK.createPayUrl({
            amount: parseFloat(properties.payment_amount),
            reference: properties.payment_reference,
        });

        $("#payment_cycle").attr("src", link);
    });
});
