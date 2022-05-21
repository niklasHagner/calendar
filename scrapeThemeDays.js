var request = require("axios");
var jsdom = require('jsdom');
const { JSDOM } = jsdom;
const fs = require('fs');

/*
Note about JSDOM
    * they refuse to implement innertext, we'll have to use textContent instead
*/

const endPoint = 'https://temadagar.se/kalender/';
request(endPoint).then((axiosResponse) => {
    const dom = new JSDOM(axiosResponse.data, {includeNodeLocations: true});
    const document = dom.window.document;

    /* HOW TO PARSE TEMADAGAR SITE
        The page is not very structured, everything relevant lies flat inside one large parent.

        Steps
        * to get all temadagar for one year - filter p tags between headline2022 and headline 2023
        * each day is a paragraph where the first anchor is the date, and the other anchors are the themedays
    */
    const headline2022 = Array.from(document.querySelectorAll("h2")).find(x => x.textContent === "Kalender med temadagar 2022");
    const headline2023 = Array.from(document.querySelectorAll("h2")).find(x => x.textContent === "Kalender med temadagar 2023");
    const root = headline2022.parentElement;

    const elementArray = Array.from(root.childNodes);
    const indexOf2022 = elementArray.indexOf(headline2022);
    const indexOf2023 = elementArray.indexOf(headline2023);
    const elementsWithin2022 = elementArray.slice(indexOf2022, indexOf2023);
    const paragraphsWithin2022 = elementsWithin2022.filter(x => x.nodeName === "P");

    const results = [];
    paragraphsWithin2022.forEach((x) => { getThemeDaysForYear(x, results, "2022"); });
    console.log("results.length", results.length);

    const saveDate = new Date().toISOString().split('T')[0];

    const data = JSON.stringify({fileScrapeDate: saveDate, daysScraped: results});
    fs.writeFile(`temadagar.json`, data, (err) => {
        if (err) {
            throw err;
        }
        console.log("JSON data is saved.");
    });

    function getThemeDaysForYear(possibleDayNode, resultArray, year) {
        const anchorElements = Array.from(possibleDayNode.querySelectorAll("a"));
        if (anchorElements.length < 1) return;

        const themeDayElements = anchorElements.slice(1, anchorElements.length);
        if (themeDayElements.length < 1) return;

        let dayAndSweMonth = anchorElements[0].querySelector("b").textContent;
        if (dayAndSweMonth) {
            //dayname is something like "2 Maj"
            const splitDayMonth = dayAndSweMonth.split(" ");
            let dayInt = splitDayMonth[0];
            let dayStr = `${dayInt}`;  
            if (dayStr.length === 1) {
                dayStr = "0" + dayStr;
            }
            const swedishMonth = splitDayMonth[1];
            const montStr = mapSweMonthToStandardMonthNum(swedishMonth);
            const yyyymmdd = `${year}-${montStr}-${dayStr}`;
            const themeDays = themeDayElements.map(x => x.textContent);
            resultArray.push({ date: yyyymmdd, themeDays });
        }
    }

    function mapSweMonthToStandardMonthNum(string) {
        string = string.toLowerCase();
        if (string === "januari") return "01";
        if (string === "februari") return "02";
        if (string === "mars") return "03";
        if (string === "april") return "04";
        if (string === "maj") return "05";
        if (string === "juni") return "06";
        if (string === "juli") return "07";
        if (string === "augusti") return "08";
        if (string === "september") return "09";
        if (string === "oktober") return "10";
        if (string === "november") return "11";
        if (string === "december") return "12";
    }
});