let search = document.getElementById("search")
let articles = document.getElementById("articles");
let jsondata = [];

// https://stackoverflow.com/a/35279162
// Thanks gustf!
function levenshteinDistance(s, t) {
    if (s === t) {
        return 0;
    }
    var n = s.length, m = t.length;
    if (n === 0 || m === 0) {
        return n + m;
    }
    var x = 0, y, a, b, c, d, g, h;
    var p = new Uint16Array(n);
    var u = new Uint32Array(n);
    for (y = 0; y < n;) {
        u[y] = s.charCodeAt(y);
        p[y] = ++y;
    }
    for (; (x + 3) < m; x += 4) {
        var e1 = t.charCodeAt(x);
        var e2 = t.charCodeAt(x + 1);
        var e3 = t.charCodeAt(x + 2);
        var e4 = t.charCodeAt(x + 3);
        c = x;
        b = x + 1;
        d = x + 2;
        g = x + 3;
        h = x + 4;
        for (y = 0; y < n; y++) {
            a = p[y];
            if (a < c || b < c) {
                c = (a > b ? b + 1 : a + 1);
            }
            else {
                if (e1 !== u[y]) {
                    c++;
                }
            }
            if (c < b || d < b) {
                b = (c > d ? d + 1 : c + 1);
            }
            else {
                if (e2 !== u[y]) {
                    b++;
                }
            }
            if (b < d || g < d) {
                d = (b > g ? g + 1 : b + 1);
            }
            else {
                if (e3 !== u[y]) {
                    d++;
                }
            }
            if (d < g || h < g) {
                g = (d > h ? h + 1 : d + 1);
            }
            else {
                if (e4 !== u[y]) {
                    g++;
                }
            }
            p[y] = h = g;
            g = d;
            d = b;
            b = c;
            c = a;
        }
    }
    for (; x < m;) {
        var e = t.charCodeAt(x);
        c = x;
        d = ++x;
        for (y = 0; y < n; y++) {
            a = p[y];
            if (a < c || d < c) {
                d = (a > d ? d + 1 : a + 1);
            }
            else {
                if (e !== u[y]) {
                    d = c + 1;
                }
                else {
                    d = c;
                }
            }
            p[y] = d;
            c = a;
        }
        h = d;
    }
    return h;
}

function update_list(array) {
    let tempstring = "";
    array.forEach(function (item, index) {
        tempstring += "<a href=\"/a/" + 
        item[1]["dirname"] +
        "\"><article><h2 class=\"title\">" +
        item[1]["name"] +
        "</h2><h6 class=\"tag\">Tags: " +
        item[1]["tags"] +
        "</h6></article></a>";
    });
    articles.innerHTML = tempstring;
}

function filter_array(userinput, array) {
    let output = [];
    if (userinput == "") {
        for (const article of array) {
            output.push([0, article]);
        }
        output = output.sort((a, b) => Number(b[1]["date"]) - Number(a[1]["date"]));
    } else {
        let queries = userinput.split(" ");
        for (const article of array) {
            let value = 0;
            for (const tags of article["tags"].split("|")) {
                for (const query of queries) {
                    let temp = levenshteinDistance(query, tags);
                    switch (temp) {
                        case 0:
                            value += 10 * tags.length;
                            break;
                        case 1:
                            value += 5 * tags.length;
                            break;
                        case 2:
                            value += 2 * tags.length;
                            break;
                        case 3:
                            value += 1 * tags.length;
                            break;
                    }
                }
            }
            for (const words of article["name"].split(" ")) {
                for (const query of queries) {
                    let temp = levenshteinDistance(query, words);
                    switch (temp) {
                        case 0:
                            value += 10 * words.length;
                            break;
                        case 1:
                            value += 5 * words.length;
                            break;
                        case 2:
                            value += 2 * words.length;
                            break;
                        case 3:
                            value += 1 * words.length;
                            break;
                    }
                }
            }
            output.push([value, article]);
        }
        output.sort((a, b) => b[0] - a[0])
    }
    return output;
}

function change_search() {
    update_list(filter_array(search.value, jsondata));
    console.log("updating search...");
}

var xhr = new XMLHttpRequest();
xhr.open('GET', "/a/all", true);
xhr.responseType = 'json';
xhr.onload = function () {
    if (xhr.status === 200) {
        var jsonData = xhr.response;
        jsondata = jsonData;
        update_list(filter_array(search.value, jsondata));
    } else {
        console.error('Request failed with status: ' + xhr.status);
    }
};
xhr.send();