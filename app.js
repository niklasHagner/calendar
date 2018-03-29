var express = require('express');
var exphbs = require("express-handlebars");
var fs = require('fs');
var request = require('request');
var path = require("path");
var favicon = require("serve-favicon");
var logger = require("morgan");
var moment = require('moment');
// var bodyParser = require("body-parser");

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
// app.use(logger("dev"));
// app.use(bodyParser.json());
// app.use(
//     bodyParser.urlencoded({
//         extended: true
//     })
// );
app.use(express.static(path.join(__dirname, "public")));
app.use(favicon(__dirname + '/public/img/favicon.ico'));

const baseEndpoint = 'https://api.dryg.net/dagar/v2.1';

const monthNames = [
    'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
];
const dayNames = [
    'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'
];
var d = new Date();
var year = d.getFullYear();
var currentDay = d.getUTCDate();
var monthIndex = d.getMonth();
var month = monthIndex+1;
var monthEndpoint = `${baseEndpoint}/${year}/${month}`;

app.get('/', async function (req, res) { //serve handlebars
    requestAsync(monthEndpoint).then(async function(data) {
        data = JSON.parse(data);
        var days = data.dagar;
        var startingWeekday = dayNames.indexOf(data.dagar[0].veckodag);
        const weekNumbers = days
            .filter((obj, idx, arr) => (
                arr.findIndex((o) => o.vecka === obj.vecka) === idx
            ))
            .map((x) => { if(x.vecka[0] === "0") x.vecka = x.vecka.substr(1,1); return x.vecka })

        var previousMonth = month - 1;
        var previousMonthEndpoint = `${baseEndpoint}/${year}/${previousMonth}`;
        var previousMonthData = await requestAsync2(previousMonthEndpoint);
        previousMonthData = previousMonthData;
        var previousDays = previousMonthData.dagar.splice(previousMonthData.dagar.length-startingWeekday, startingWeekday);
        days = previousDays.concat(days);

        days = days.map((day)=> { 
            var dayNumber = new Date(day.datum).getUTCDate();
            day.dayNumber = dayNumber;
            day.isToday = dayNumber === currentDay;
            day.redDay = day['röd dag'] === 'Ja' && day.veckodag !== 'Lördag' && day.veckodag !== 'Söndag'; 
            day.helgDag = day.helgdag && day.helgdag.length > 0;
            var m =  new Date(day.datum).getMonth() +1;
            day.month = {number: m, name: monthNames[m-1]};
            return day; 
        });

        var today = days.filter(x => moment(x.datum).isSame(today, 'day'))[0];
        today.day = currentDay;
        
        res.render("index", {
            config: global.config,
            days,
            weekNumbers,
            month: {
                number: month,
                name: monthNames[month]
            },
            today
       });
    })
    .catch(function(e) {
        console.log("ERROR", e);
        res.render("error", {
            message: e.message,
            error: {},
            title: "error"
        });
    });
});

async function requestAsync2(url) {
    var requestAwait = require("request-promise");
    return await requestAwait({
        uri: url,
        json: true
    });
}

function requestAsync(url) {
    return new Promise(function (resolve, reject) {
        request(url, function (err, response, body) {
            if (err)
                return reject(err);
            try {
                console.log(response.statusCode);
                resolve(body);
            } catch (e) {
                reject(e);
            }
        });
    });
}

var port = process.env.PORT || 3000;
app.listen(port);
console.log('Running server on port ' + port);
exports = module.exports = app;