var express = require('express');
var exphbs = require("express-handlebars");
var path = require("path");
var request = require("axios");
var favicon = require("serve-favicon");
var dayjs = require('dayjs')
var isToday = require('dayjs/plugin/isToday')
dayjs.extend(isToday);
const fs = require('fs');
const util = require('util');
const readFile = (fileName) => util.promisify(fs.readFile)(fileName, 'utf8');

var weekOfYear = require('dayjs/plugin/weekOfYear')
dayjs.extend(weekOfYear)

var utc = require('dayjs/plugin/utc') // dependent on utc plugin
var timezone = require('dayjs/plugin/timezone');
const { months } = require('dayjs/locale/sv');
require('dayjs/locale/sv')
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault("Sweden/Stockholm")
dayjs.locale('sv')

var app = express();
app.use(express.static(__dirname + '/public'));
app.engine(
    "handlebars",
    exphbs({
        defaultLayout: "main",
        partialsDir: ["views/partials/"],
        helpers: require('./handlebars-helpers/helper.js')
    })
);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "handlebars");
app.use(express.static(path.join(__dirname, "public")));
app.use(favicon(__dirname + '/public/img/favicon.ico'));

const baseEndpoint = 'https://sholiday.faboul.se/dagar/v2.1';

const SWEDISH_WEEKDAY_NAMES = [
    'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'
];


app.get('/', async function (req, res) { //serve handlebars
    var d = dayjs();
    var year = d.format('YYYY');
    var month = d.month() + 1;
    renderCalendarForMonth(year, month, req, res);
});

app.get('/showCalendar', async function (req, res) {
    var queryParams = req && req.query;
    if (!queryParams || !queryParams.year || !queryParams.month) {
        res.status(400).send('Error. API expects params. Example: ?year=2018&month=3');
        return;
    }
    const {
        year,
        month
    } = queryParams;
    renderCalendarForMonth(year, month, req, res);
});

async function renderCalendarForMonth(yearString, monthStringWithLeadingZero, req, res) {
    var d = dayjs();

    var year;
    var month = monthStringWithLeadingZero;
    var currentRenderingMonthOneIndex = Number(month);
    var currentRenderingMonthZeroIndex = currentRenderingMonthOneIndex - 1;
    if (!yearString && !monthStringWithLeadingZero) {
        year = yearString || d.format('YYYY');
    } else {
        year = Number(yearString);
    }
    var selectedDate = dayjs(`${year}-${month}`);
    var fullApiUrl = `${baseEndpoint}/${year}`;

    try {
        var response = await request(fullApiUrl);
        data = response.data;

        //Extend api-data with themeDays from file
        const themeDayFileRaw = await readFile('./temadagar.json');
        console.log(themeDayFileRaw);
        const themeDayFile = JSON.parse(themeDayFileRaw);
        const daysScraped = themeDayFile.daysScraped;

        var allDaysOfYear = data.dagar.map((d) => {
            const matchingThemeDay = daysScraped.find((themeDay) => {
                return themeDay.date === d.datum;
            });
            d.themeDays = (matchingThemeDay) ? matchingThemeDay.themeDays : [];

            //Normalize weekNumber from '01' to '1'
            if (d.vecka[0] === "0") d.vecka = d.vecka.substr(1, 1);

            return d;
        });

        var allMonthObjectsDuringThisYear = [];
        allDaysOfYear.forEach(day => {
            var currentIterationMonthNumber = Number(day.datum.split("-")[1]);
            var zeroIndexedMonthNumber = currentIterationMonthNumber -1;
            var foundObj = allMonthObjectsDuringThisYear.find(m => zeroIndexedMonthNumber == m.zeroIndexedMonthNumber );
            if (foundObj) {
                foundObj.days.push(day);
            } else {
                var newMonthObj = {
                    days: [day],
                    zeroIndexedMonthNumber,
                    monthName: dayjs(day.datum).format("MMMM"),
                    firstDatumOfMonth: day.datum,
                    name: dayjs(day.datum, "YYYY-MM-DD").format('MMMM'),
                }
                allMonthObjectsDuringThisYear.push(newMonthObj);
            }
        });

        allMonthObjectsDuringThisYear.forEach((month) => {
            month.weekNumbers = getUniqueWeekNumbersForArrayOfDays(month.days);
        });

        days = allDaysOfYear.filter(x => {
            var monthNumber_oneIndexed = Number(x.datum.split("-")[1]);
            return monthNumber_oneIndexed === currentRenderingMonthOneIndex;
        });

        allDaysOfYear = getExtendedArrayOfDays(allDaysOfYear);


        // months: {
        //     number: month,
        //     name: dayjs(`${year}-${month}-01`, "YYYY-MM-DD").format('MMMM')
        //     days: daysPerMonth
        // }

        //Add days from prev month in case that will be rendered if this month doesn't start on a monday
        var prevMonth = selectedDate.clone().subtract(1, 'month');
        const isPrevMonthDifferentYear = prevMonth.year() !== selectedDate.year();
        var mondayIndex = SWEDISH_WEEKDAY_NAMES.indexOf(days[0].veckodag);
        if (isPrevMonthDifferentYear) { //requires extra API call
            var previousMonthEndpoint = `${baseEndpoint}/${prevMonth.year()}`;
            var prevMonthResponse = await request(previousMonthEndpoint);
            var previousMonthData = prevMonthResponse.data;
            var previousDays = previousMonthData.dagar.splice(previousMonthData.dagar.length - mondayIndex, mondayIndex);
            days = previousDays.concat(days);
        } else {
            var prevMonthZeroIndex = currentRenderingMonthZeroIndex -1;
            if (prevMonthZeroIndex > -1) {
                var previousMonthData = allMonthObjectsDuringThisYear[prevMonthZeroIndex];
                var previousDays = previousMonthData.days.splice(previousMonthData.days.length - mondayIndex, mondayIndex);
                days = previousDays.concat(days);
            }
        }

        days = getExtendedArrayOfDays(days);

        var selectedMonth = { days: data.dagar, monthName: selectedDate.format('MMMM') };
        var today = { weekday: d.format('dddd'), day: d.date(), week: d.week(), month: d.format('MMMM') };

        var todayExtra = days.find(d => dayjs(d.datum).isToday());
        today = { ...today, ...todayExtra};

        var nextYearObject = dayjs(`${year+1}-01-01`, "YYYY-MM-DD");
        var startOfYear = dayjs(`${year}-01-01`, "YYYY-MM-DD").subtract(1, 'months');
        var prevMonthMomentObject = dayjs(`${year}-${month}-01`, "YYYY-MM-DD").subtract(1, 'months');
        var prevDateObj = prevMonthMomentObject;
        var nextQueryString = `showCalendar?year=${nextYearObject.format('YYYY')}&month=${nextYearObject.format('MM')}`;
        var prevQueryString = `showCalendar?year=${prevDateObj.format('YYYY')}&month=${prevDateObj.format('MM')}`;

        res.render("index", {
            config: global.config,
            days, //the selected month days plus perhaps some days from the prev month
            year,
            weekNumbers: getUniqueWeekNumbersForArrayOfDays(days),
            month: {
                number: month,
                name: dayjs(`${year}-${month}-01`, "YYYY-MM-DD").format('MMMM')
            },
            today,
            selectedMonth,
            nextQueryString,
            prevQueryString,
            months: allMonthObjectsDuringThisYear,
            remainingMonths: allMonthObjectsDuringThisYear.filter(x => x.zeroIndexedMonthNumber > month -1)
        });
    } catch (e) {
        console.log("ERROR", e);
        res.render("error", {
            message: e.message,
            error: {},
            title: "error"
        });
    }
}

function getUniqueWeekNumbersForArrayOfDays(days) {
    const weeks= days.map(x => x.vecka);
    const uniqueWeeks = [...new Set(weeks)];
    return uniqueWeeks;
}

function getExtendedArrayOfDays(dayArray) {
    var mappedArray = dayArray.map((day) => {
        var dayNumber = new Date(day.datum).getUTCDate();
        day.dayNumber = dayNumber;
        day.isToday = dayjs(day.datum).isToday()
        day.redDay = day['röd dag'] === 'Ja' && day.veckodag !== 'Lördag' && day.veckodag !== 'Söndag';
        day.helgDag = day.helgdag && day.helgdag.length > 0;
        day.month = {
            number: dayjs(day.datum).month(),
            name: dayjs(day.datum, "YYYY-MM-DD").format('MMMM')
        };
        day.themeDays = day.themeDays;
        return day;
    });
    return mappedArray;
}

var port = process.env.PORT || 8001;
app.listen(port);
console.log('Running server on port ' + port);
exports = module.exports = app;
