//helper function for document.getElementById()
function getElm(id) {
    return document.getElementById(id);
}

//helper function for setting background color
function setBGColor(id, value) {
    getElm(id).style.backgroundColor = value;
}

//helper function for feedback message
function feedback(msg) {
    getElm('error-nwl').innerHTML = msg;
}
function checkPass() {
    //console.log('Hello')
    var neutralColor = '#fff'; // 'white';
    var badColor = '#f66'; // 'red';
    var goodColor = '#6f6'; // 'green';

    var password1 = getElm('password').value;
    var password2 = getElm('passwordConfirm').value;

    //if password length is less than 6
    if (password1.length < 6) {
        feedback('Enter a password of at least 6 characters');
        //we do not care about pass2 when pass1 is too short
        setBGColor('passwordConfirm', neutralColor);
        //if pass1 is blank, set neutral background
        if (password1.length === 0) {
            setBGColor('password', neutralColor);
        } else {
            setBGColor('password', badColor);
        }
        //else if passwords do not match
    } else if (password2 !== password1) {
        //we now know that pass1 is long enough
        feedback('Confirm password');
        setBGColor('password', goodColor);
        //if pass2 is blank, set neutral background
        if (password2.length === 0) {
            setBGColor('passwordConfirm', neutralColor);
        } else {
            setBGColor('passwordConfirm', badColor);
        }
        //else all is well
    } else {
        feedback('Passwords match');
        setBGColor('password', goodColor);
        setBGColor('passwordConfirm', goodColor);
    }
}

$(document).ready(function () {


    $("#myFormRegister").on("submit", function (e) {
        var dataString = $(this).serialize();
        // console.log(dataString);
        $.ajax({
            type: "POST",
            url: "/auth/register",
            data: dataString,
            success: function (response) {

                // check message back to the user here
                if (response.message != null) {
                    console.log(response.message)
                    if ($("#alert").hasClass('hidden') == true) {
                        $("#alert").removeClass('hidden');
                    }
                    $("#alert").text(response.message);
                }

            }
        });
        e.preventDefault();
    });


})