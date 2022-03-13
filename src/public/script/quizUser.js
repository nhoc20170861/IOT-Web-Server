
// function process nex/back page question
function next(totalPage) {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());
    const value = parseInt(params.page) + 1;
    if (value > totalPage) value = totalPage;
    urlSearchParams.set('page', value);
    window.location.search = urlSearchParams.toString();
}
function back() {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());
    const value = parseInt(params.page) - 1;
    if (value < 1) value = 1;
    urlSearchParams.set('page', value);
    window.location.search = urlSearchParams.toString();
}

// click button start to show quiz at ?page=1
function showquiz() {
    const data = new URLSearchParams();
    data.append('page', '1');
    const url = '/dashboard/showquiz?' + data.toString();
    location.href = url;
}

$(document).ready(function () {
    //let manyChoice = $("h1 span").text();
    //var option = (manyChoice == 0)? "" : [];

    $(".form-ans").on("submit", function (e) {
        var dataString = $(this).serialize();
        $.ajax({
            type: "POST",
            url: "/dashboard/saveAnswer",
            data: dataString,
            success: function (response) {
                // Display message back to the user here
                //console.log(response)
                $("#alert").text("answer saved for id" + response.id_quest);
                //const url = response.url + response.id_quest.toString();
            }
        });
        e.preventDefault();
    });

    /* $("#ans :input").click(function(){
        if(manyChoice == 0){
                option = $(this).val();
           
        }
        else{
                
        if(!option.includes($(this).val()))
                {
                    option.push($(this).val());
                }
        }
        console.log(option);
        })*/
    /*$("#saveAnswer").click(function () {
        
        $.post("/dashboard/saveAnswer",
        {
            option : option
        },
        function (response) {
            if (response.result == 'redirect') {
                $("#alert").text("answer saved for id" + response.id_quest);      
                const url = response.url + response.id_quest.toString();
               
            }
        });
    });*/



})
