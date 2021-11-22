// var cheerio = require('cheerio');
var request = require("axios");

const endPoint = 'https://sholiday.faboul.se/dagar/v2.1' + '/2021'; + 
request(endPoint).then((data) => {
    console.log("data", data);

    var $ = cheerio.load(html);
    cheerio.load($('#container').children('span').eq(0));

    var items = [];
    let item = {dayName: "", events: []};
    let dayNameCount = 0;

    [...$0.childNodes].forEach((child) => {
        console.log(child.nodeName, child);

        if (child.nodeName === "A" ) {
            item.events.push(child.innerText);
        }
        else if (child.nodeName === "#text") {
            item.events.push(child.textContent);
        }
        else if (child.nodeName === "B") {
            if (item.dayName !== "") {
                items.push(item);
                item = {dayName: "", events: []};
            }
            item.dayName = child.innerText + " 2019";
        }
    })
    console.log("items.length", items.length);
})
