// function process nex/back page question
function next(totalPage) {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());
    const value = parseInt(params.page) + 1;
    if (value > totalPage ) value = totalPage;
    urlSearchParams.set("page", value);
    window.location.search = urlSearchParams.toString();

}
function back() {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());
    const value = parseInt(params.page) - 1;
    if (value < 1) value = 1;
    urlSearchParams.set("page", value);
    window.location.search = urlSearchParams.toString();
}


// click button start to show quiz at ?page=1
function showquiz() {
    const data = new URLSearchParams();
    data.append("page", "1");
    const url = "/dashboards/showquiz?" + data.toString();
    location.href = url;
}
