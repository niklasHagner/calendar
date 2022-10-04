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
    var year = Number(d.format('YYYY'));
    var month = d.month() + 1;
    renderCalendar(year, month, req, res);
});

/* This endpoint was intended to be called via links like ?year=2018&month=3*/
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
    renderCalendar(year, month, req, res);
});

async function renderCalendar(year, month, req, res) {
    var d = dayjs();

    const currentTimeObj = {
        year: year,
        month: month,
        monthNumber: month,
        monthZeroIndex: month -1,
        dayJsObject: dayjs(`${year}-${month}`)
    }
    
    //Prepare pagination links
    var nextYearObject = dayjs(`${Number(year)+1}-01-01`, "YYYY-MM-DD");
    // var startOfYear = dayjs(`${year}-01-01`, "YYYY-MM-DD").subtract(1, 'months');
    var prevMonthMomentObject = dayjs(`${year}-${month}-01`, "YYYY-MM-DD").subtract(1, 'months');
    var prevDateObj = prevMonthMomentObject;
    var nextQueryString = `showCalendar?year=${nextYearObject.format('YYYY')}&month=${nextYearObject.format('MM')}`;
    var prevQueryString = `showCalendar?year=${prevDateObj.format('YYYY')}&month=${prevDateObj.format('MM')}`;

    //Prepare the most necessary data fetch
    var fullApiUrl = `${baseEndpoint}/${year}`;

    try {
        /*  Example api data:
            dagar:(365) []
            slutdatum:'2022-12-31'
            startdatum:'2022-01-01'
        */
        var response = await request(fullApiUrl);
        data = response.data;

        //Extend api-data with themeDays from file
        const themeDayFileRaw = await readFile('./temadagar.json');
        const themeDayFile = JSON.parse(themeDayFileRaw);
        const daysScraped = themeDayFile.daysScraped;

        var allDaysOfYear = data.dagar.map((day) => {
            const matchingThemeDay = daysScraped.find((themeDay) => {
                return themeDay.date === day.datum;
            });

            // GUI only has room for 3 themeDays
            day.themeDays = matchingThemeDay && matchingThemeDay.themeDays.slice(0,2) || [];

            //Normalize weekNumber from '01' to '1'
            if (day.vecka[0] === "0") day.vecka = day.vecka.substr(1, 1);

            day.isInThePast = currentTimeObj.dayJsObject.isAfter(dayjs(day.datum));
            return day;
        });

        //Build monthObjects from dayObjects
        var allMonthObjectsDuringThisYear = [];
        allDaysOfYear.forEach(day => {
            day.monthNumber = Number(day.datum.split("-")[1]);
            day.monthZeroIndex = day.monthNumber -1;
            
            var foundObj = allMonthObjectsDuringThisYear.find(m => day.monthZeroIndex == m.monthZeroIndex );
            if (foundObj) {
                foundObj.days.push(day);
            } else {
                var newMonthObj = {
                    name: dayjs(day.datum, "YYYY-MM-DD").format('MMMM'),
                    days: [day],
                    monthZeroIndex: day.monthZeroIndex,
                    monthName: dayjs(day.datum).format("MMMM"),
                    year: dayjs(day.datum).format("YYYY"),
                    firstDatumOfMonth: day.datum,
                    isInThePast: day.isInThePast,
                    isCurrentMonth: dayjs().year() === dayjs(day.datum).year() && dayjs().month() === dayjs(day.datum).month(),
                }
                allMonthObjectsDuringThisYear.push(newMonthObj);
            }
        });

        //Separate pass to extend completed monthObjects
        allMonthObjectsDuringThisYear = allMonthObjectsDuringThisYear.map((monthObj) => {
            monthObj.weekNumbers = getUniqueWeekNumbersForArrayOfDays(monthObj.days);
            var firstDayName = monthObj.days[0].veckodag;
            const blankDaysAtStartOfMonth = SWEDISH_WEEKDAY_NAMES.indexOf(firstDayName);
            for(let i=0; i < blankDaysAtStartOfMonth; i++) {
                monthObj.days.unshift({isBlank: true});
            }
            
            return {
                ...monthObj,
                firstDayNameInMonth: firstDayName,
                weekNumbers: getUniqueWeekNumbersForArrayOfDays(monthObj.days)
            }
        });


        allDaysOfYear = getExtendedArrayOfDays(allDaysOfYear);

        const daysOfCurrentMonth = allDaysOfYear.filter(day => day.monthNumber === currentTimeObj.monthNumber);

        //Add days from prev month in case that will be rendered if this month doesn't start on a monday
        // var prevMonth = currentTimeObj.dayJsObject.clone().subtract(1, 'month');
        // const isPrevMonthDifferentYear = prevMonth.year() !== currentTimeObj.dayJsObject.year();
        // var mondayIndex = SWEDISH_WEEKDAY_NAMES.indexOf(daysOfCurrentMonth[0].veckodag);
        // if (isPrevMonthDifferentYear) { //requires extra API call
        //     var previousMonthEndpoint = `${baseEndpoint}/${prevMonth.year()}`;
        //     var prevMonthResponse = await request(previousMonthEndpoint);
        //     var previousMonthData = prevMonthResponse.data;
        //     var previousDays = previousMonthData.dagar.splice(previousMonthData.dagar.length - mondayIndex, mondayIndex);
        //     daysOfCurrentMonth = previousDays.concat(daysOfCurrentMonth);
        // } else {
        //     var prevMonthZeroIndex = currentTimeObj.monthZeroIndex -1;
        //     if (prevMonthZeroIndex > -1) {
        //         var previousMonthData = allMonthObjectsDuringThisYear[prevMonth];
        //         var previousDays = previousMonthData.days.splice(previousMonthData.daysOfCurrentMonth.length - mondayIndex, mondayIndex);
        //         daysOfCurrentMonth = previousDays.concat(daysOfCurrentMonth);
        //     }
        // }

        var selectedMonth = { days: data.dagar, monthName: currentTimeObj.dayJsObject.format('MMMM') };
        
        var todayFiltered = allDaysOfYear.find(day => dayjs(day.datum).isToday());
        var today = { 
            weekday: d.format('dddd'), 
            day: d.date(), 
            week: d.week(), 
            month: d.format('MMMM'),
            year: d.format('YYYY'),
            ...todayFiltered
        };


        const viewModel = {
            config: global.config,
            year,
            currentMonth: {
                days: daysOfCurrentMonth, //the selected month days plus perhaps some days from the prev month
                number: month,
                name: dayjs(`${year}-${month}-01`, "YYYY-MM-DD").format('MMMM'),
                weekNumbers: getUniqueWeekNumbersForArrayOfDays(daysOfCurrentMonth),
            },
            today,
            nextQueryString,
            prevQueryString,
            months: allMonthObjectsDuringThisYear,
            currentYear: {
                months: allMonthObjectsDuringThisYear
            }
        };
        // console.log(JSON.stringify({ currentYear: viewModel.currentYear }));
        res.render("index", viewModel);
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
    const weeks = days.map(day => day.vecka).filter(w => typeof w === "string");
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
