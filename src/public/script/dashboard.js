function replaceClass(elem, oldClass, newClass) {
    if (elem.hasClass(oldClass)) {
        elem.removeClass(oldClass);
    }
    elem.addClass(newClass);
}

function myFunction() {
    document.getElementById('myDropdown').classList.toggle('show');
}

// Close the dropdown if the user clicks outside of it
window.onclick = function (event) {
    if (!event.target.matches('.dropbtn')) {
        let dropdowns = document.getElementsByClassName('dropdown-content');

        for (let i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
};

// var socket = io("https://localhost:8443"); // for https server
var socket = io(); // for same doamin server
var receive_data = {};

$(document).ready(function () {
    let sidebarBtn = $('.sidebarBtn');
    let sidebar = $('.sidebar');
    sidebarBtn.click(function () {
        sidebar.toggleClass('active');
        if (sidebar.hasClass('active')) {
            replaceClass(sidebarBtn, 'bx-menu', 'bx-menu-alt-right');
        } else {
            replaceClass(sidebarBtn, 'bx-menu-alt-right', 'bx-menu');
        }
    });

    $('#summit').click(function () {
        $.post(
            '/request',
            {
                name: 'viSion',
                designation: 'Professional gamer'
            },
            function (data, status) {
                console.log(data);
            }
        );
    });
    $('#logout').click(function () {
        $.post('/v1/auth/logout', function (response) {
            if (response.result == 'redirect') {
                alert('You will be redirected to home');
                location.href = response.url;
            }
        });
    });
});
