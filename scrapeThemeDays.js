var request = require("axios");
var jsdom = require('jsdom');
const { JSDOM } = jsdom;
const fs = require('fs');

/*
JSDOM haven't implemented the innertext property, use textContent instead
*/

const endPoint = 'https://temadagar.se/kalender/';
request(endPoint).then((axiosResponse) => {
    const dom = new JSDOM(axiosResponse.data, {includeNodeLocations: true});
    const document = dom.window.document;

    /* HOW TO PARSE TEMADAGAR SITE
        The page is not very structured, everything relevant lies flat inside one large parent.

        Steps
        * to get all temadagar for one year - filter p tags between yearHeadline and headline 2023
        * each day is a paragraph where the first anchor is the date, and the other anchors are the themedays
    */

    function getThemeDaysForYear(possibleDayNode, year) {
        const anchorElements = Array.from(possibleDayNode.querySelectorAll("a"));
        if (anchorElements.length < 1) return;

        const themeDayElements = anchorElements.slice(1, anchorElements.length);
        if (themeDayElements.length < 1) return;

        let dayAndSweMonth = anchorElements[0].querySelector("b").textContent;
        if (!dayAndSweMonth) {
            //error
            return null;
        }
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
        return { date: yyyymmdd, themeDays };
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

    const yearToScrape = "2026";
    const startElement = Array.from(document.querySelectorAll("h2")).find(x => x.textContent.includes("Kalender med temadagar " + yearToScrape));
    const endElement = Array.from(document.querySelectorAll("h2")).find(x => x.textContent.includes("Kalender med temadagar " + yearToScrape+1));
    const root = startElement.parentElement;

    const elementArray = Array.from(root.childNodes);
    const elementsWithinYear = elementArray.slice(elementArray.indexOf(startElement), elementArray.indexOf(endElement));
    const paragraphs = elementsWithinYear.filter(x => x.nodeName === "P");

    const themeDays = paragraphs.map((para) => getThemeDaysForYear(para, yearToScrape)).filter(x => x);
    console.log("themeDays.length", themeDays.length);

    const data = JSON.stringify({daysScraped: themeDays});
    fs.writeFile(`temadagar.json`, data, (err) => {
        if (err) {
            throw err;
        }
        console.log("JSON data is saved.");
    });

});
