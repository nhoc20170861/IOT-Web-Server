
$(document).ready(function () {

    $(".eye.eye-close").on("click", function () {
        $(".eye.eye-close").addClass('hidden');
        $(".eye.eye-open").removeClass('hidden');
        $("#password").attr('type','text');
    });
    $(".eye.eye-open").on("click", function () {
        $(".eye.eye-open").addClass('hidden');
        $(".eye.eye-close").removeClass('hidden');
        $("#password").attr('type','password');
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
  setCookie('user', 'John', {secure: true, 'max-age': 3600});


























