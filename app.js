var express = require('express');
var exphbs = require("express-handlebars");
var path = require("path");
var favicon = require("serve-favicon");
var moment = require('moment');
var requestAwait = require("request-promise");

moment.locale('sv');
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

const baseEndpoint = 'https://api.dryg.net/dagar/v2.1';

const dayNames = [
    'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'
];


app.get('/', async function (req, res) { //serve handlebars
    var d = moment();
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
    var d = moment();

    var year;
    var d = moment();
    if (!y && !mo) {
        month = mo;
        year = y || d.format('YYYY');
    } else {
        month = mo;
        year = y;
    }
    var monthEndpoint = `${baseEndpoint}/${year}/${month}`;

    try {
        var data = await requestAsync(monthEndpoint);
        var days = data.dagar;
        var startingWeekday = dayNames.indexOf(data.dagar[0].veckodag);
        const weekNumbers = days
            .filter((obj, idx, arr) => (
                arr.findIndex((o) => o.vecka === obj.vecka) === idx
            ))
            .map((x) => {
                if (x.vecka[0] === "0") x.vecka = x.vecka.substr(1, 1);
                return x.vecka
            })

        var previousMonth = month - 1;
        var previousMonthEndpoint = `${baseEndpoint}/${year}/${previousMonth}`;
        var previousMonthData = await requestAsync(previousMonthEndpoint);
        previousMonthData = previousMonthData;
        var previousDays = previousMonthData.dagar.splice(previousMonthData.dagar.length - startingWeekday, startingWeekday);
        days = previousDays.concat(days);

        days = days.map((day) => {
            var dayNumber = new Date(day.datum).getUTCDate();
            day.dayNumber = dayNumber;
            day.isToday = d.isSame(moment(day.datum), "day")
            day.redDay = day['röd dag'] === 'Ja' && day.veckodag !== 'Lördag' && day.veckodag !== 'Söndag';
            day.helgDag = day.helgdag && day.helgdag.length > 0;
            var m = new Date(day.datum).getMonth() + 1;
            day.month = {
                number: m,
                name: moment(day.datum).format('MMMM')
            };
            return day;
        });

        var today = { weekday: d.format('dddd'), day: d.date(), week: d.format('w'), month: d.format('MMMM') };

        var nextMonthMomentObject = moment(`${year}-${month}-01`).add(1, 'months');
        var prevMonthMomentObject = moment(`${year}-${month}-01`).subtract(1, 'months');
        var nextQueryString = `showCalendar?year=${nextMonthMomentObject.format('YYYY')}&month=${nextMonthMomentObject.format('MM')}`;
        var prevQueryString = `showCalendar?year=${prevMonthMomentObject.format('YYYY')}&month=${prevMonthMomentObject.format('MM')}`;

        res.render("index", {
            config: global.config,
            days,
            year,
            weekNumbers,
            month: {
                number: month,
                name: moment(`${year}-${month}-01`).format('MMMM')
            },
            today,
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

async function requestAsync(url) {
    return await requestAwait({
        uri: url,
        json: true
    });
}

var port = process.env.PORT || 8001;
app.listen(port);
console.log('Running server on port ' + port);
exports = module.exports = app;
