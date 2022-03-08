let sidebar = document.querySelector('.sidebar');
let sidebarBtn = document.querySelector('.sidebarBtn');
sidebarBtn.onclick = function () {
    sidebar.classList.toggle('active');
    if (sidebar.classList.contains('active')) {
        sidebarBtn.classList.replace('bx-menu', 'bx-menu-alt-right');
    } else sidebarBtn.classList.replace('bx-menu-alt-right', 'bx-menu');
};

function myFunction() {
    document.getElementById("myDropdown").classList.toggle("show");
}

// Close the dropdown if the user clicks outside of it
window.onclick = function (event) {
    if (!event.target.matches('.dropbtn')) {
        var dropdowns = document.getElementsByClassName("dropdown-content");
        var i;
        for (i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}

var socket = io("http://localhost:3000");
var receive_data = {};

$(document).ready(function () {
    $("#summit").click(function () {
        $.post("/request",
            {
                name: "viSion",
                designation: "Professional gamer"
            },
            function (data, status) {
                console.log(data);
            });
    });
    $("#logout").click(function(){
        $.post("/auth/logout",
        function (response) {
            if(response.result == 'redirect'){
                alert("You will be redirected to home")
                window.location.href =  response.url;
            }
        });
    });

    // setInterval(async () => {
    //     await socket.emit("Client-sent-data", "Hello world");
    //     await socket.on("Server-sent-data", function (data) {
    //         humi = data;
    //     });
    //     $("#humi").text(humi);
    //     var now = new Date(Date.now());
    //     //var formatted = now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds();
    //     $("#humi_log").text(now.toLocaleTimeString());
    //     console.log(now.toUTCString());
    // }, 5000);
    socket.on("Server-sent-data", function (data) {
        receive_data.time = data.time;
        receive_data.value = JSON.parse(data.value);
        $("#humi").text(receive_data.value.humi);
        // var now = new Date(Date.now());
        // var formatted = now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds();
        $("#humi_log").text(receive_data.time);
        //console.log(receive_data);
        console.log(receive_data.value);
    });

});

