var express = require('express');
var exphbs = require("express-handlebars");
var path = require("path");
var favicon = require("serve-favicon");
var dayjs = require('dayjs')
var request = require("axios");
var {themeDays} = require("./themeDays");
require('dayjs/locale/sv')

var utc = require('dayjs/plugin/utc') // dependent on utc plugin
var timezone = require('dayjs/plugin/timezone')
var isToday = require('dayjs/plugin/isToday')
dayjs.extend(isToday)
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

const dayNames = [
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

async function renderCalendarForMonth(y, mo, req, res) {
    var d = dayjs();

    var year;
    if (!y && !mo) {
        month = mo;
        year = y || d.format('YYYY');
    } else {
        month = mo;
        year = y;
    }
    var selectedDate = dayjs(year, month);
    var fullApiUrl = `${baseEndpoint}/${year}`;

    try {
        var response = await request(fullApiUrl);
        data = response.data;

        //Extend api-data with themeDays from file
        var days = data.dagar.map((d) => {
            const matchingThemeDay = themeDays.find((themeDay) => {
                return dayjs(themeDay.dayName, "DD MMMM YYYY").diff(dayjs(d.datum, "YYYY-MM-DD"), 'days') === 0;
            });
            d.themeDays = (matchingThemeDay) ? matchingThemeDay.events : [];
            return d;
        });
        days = data.dagar;

        var startingWeekday = dayNames.indexOf(days[0].veckodag);
        const weekNumbers = days
            .filter((obj, idx, arr) => (
                arr.findIndex((o) => o.vecka === obj.vecka) === idx
            ))
            .map((x) => {
                if (x.vecka[0] === "0") x.vecka = x.vecka.substr(1, 1);
                return x.vecka
            })

        var prevMonth = selectedDate.clone().subtract(1, 'month');

        const isPrevMonthDifferentYear = prevMonth.year() !== selectedDate.year();
        if (isPrevMonthDifferentYear) { //requires extra API call
            var previousMonthEndpoint = `${baseEndpoint}/${prevMonth.year()}`;
            var prevMonthResponse = await request(previousMonthEndpoint);
            var previousMonthData = prevMonthResponse.data;
            var previousDays = previousMonthData.dagar.splice(previousMonthData.dagar.length - startingWeekday, startingWeekday);
            days = previousDays.concat(days);
        }

        days = days.map((day) => {
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

        var selectedMonth = { days: data.dagar, month: selectedDate.format('MMMM') };
        var today = { weekday: d.format('dddd'), day: d.date(), week: d.format('w'), month: d.format('MMMM') };

        var todayExtra = days.find(d => dayjs(d.datum).isToday());
        today = { ...today, ...todayExtra};

        var nextMonthMomentObject = dayjs(`${year}-${month}-01`, "YYYY-MM-DD").add(1, 'months');
        var prevMonthMomentObject = dayjs(`${year}-${month}-01`, "YYYY-MM-DD").subtract(1, 'months');
        var nextQueryString = `showCalendar?year=${nextMonthMomentObject.format('YYYY')}&month=${nextMonthMomentObject.format('MM')}`;
        var prevQueryString = `showCalendar?year=${prevMonthMomentObject.format('YYYY')}&month=${prevMonthMomentObject.format('MM')}`;

        res.render("index", {
            config: global.config,
            days,
            year,
            weekNumbers,
            month: {
                number: month,
                name: dayjs(`${year}-${month}-01`, "YYYY-MM-DD").format('MMMM')
            },
            today,
            selectedMonth,
            nextQueryString,
            prevQueryString
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

var port = process.env.PORT || 8001;
app.listen(port);
console.log('Running server on port ' + port);
exports = module.exports = app;
