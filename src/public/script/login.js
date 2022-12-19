
function setCookie(name, value, options = {}) {

    options = {
        path: '/',
        // add other defaults here if necessary
        ...options
    };

    if (options.expires instanceof Date) {
        options.expires = options.expires.toUTCString();
    }

    let updatedCookie = encodeURIComponent(name) + "=" + encodeURIComponent(value);

    for (let optionKey in options) {
        updatedCookie += "; " + optionKey;
        let optionValue = options[optionKey];
        if (optionValue !== true) {
            updatedCookie += "=" + optionValue;
        }
    }

    document.cookie = updatedCookie;
}
$(document).ready(function () {
    // show and hide password
    $(".eye.eye-close").on("click", function () {
        $(".eye.eye-close").addClass('hidden');
        $(".eye.eye-open").removeClass('hidden');
        $("#password").attr('type', 'text');
    });
    $(".eye.eye-open").on("click", function () {
        $(".eye.eye-open").addClass('hidden');
        $(".eye.eye-close").removeClass('hidden');
        $("#password").attr('type', 'password');
    });

    $("#myForm").on("submit", function (e) {
        var dataString = $(this).serialize();
        // console.log(dataString);
        $.ajax({
            type: "POST",
            url: "/auth/process_login",
            data: dataString,
            success: function (response) {
                console.log(response)
                //console.log(response);
                // check message back to the user here
                if (response.message != null) {
                    console.log(response.message)
                    if ($("#alert").hasClass('hidden') == true) {
                        $("#alert").removeClass('hidden');
                    }
                    $("#alert").text(response.message);
                }
                if (response.accessToken != null) {
                    setCookie('access_token', response.accessToken, { 'max-age': 3600 });
                    location.href = response.url;
                }
                //const url = response.url + response.id_quest.toString();
            }
        });
        e.preventDefault();
    });


})

function setCookie(name, value, options = {}) {

    options = {
        path: '/',
        // add other defaults here if necessary
        ...options
    };

    if (options.expires instanceof Date) {
        options.expires = options.expires.toUTCString();
    }

    let updatedCookie = encodeURIComponent(name) + "=" + encodeURIComponent(value);

    for (let optionKey in options) {
        updatedCookie += "; " + optionKey;
        let optionValue = options[optionKey];
        if (optionValue !== true) {
            updatedCookie += "=" + optionValue;
        }
    }

    document.cookie = updatedCookie;
}

  // Example of use:


























