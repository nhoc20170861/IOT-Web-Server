
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

































