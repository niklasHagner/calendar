# Calendar
A swedish calendar featuring all the date stuff swedes need

* week numbers
* name days
* official holidays
* funny themedays

![screenshot](https://i.imgur.com/91TbMEU.png)

## Tech

+ node + express
+ handlebars
+ LESS

## How to

1. `npm run build` to compile LESS to CSS
2. `npm start` to start the node server
3. Browse to `http://localhost:8001/kalender`

## Common issues
`npm run build:styles` might give you a 'Permission denied' issue when running `node_modules/.bin/lessc`. If so just add permissions via `chmod 775 node_modules/.bin/lessc`.

## Credits

* API from api.dryg.net
* Calendar table CSS from https://codepen.io/altitudems/pen/HLFKx?limit=all&page=2&q=calendar

## Example data

See exampleViewModel.json and exampleMonth.json for more

Example data for a single day:

```
{
  datum: '2024-01-01',
  veckodag: 'Måndag',
  'arbetsfri dag': 'Ja',
  'röd dag': 'Ja',
  vecka: '1',
  'dag i vecka': '1',
  helgdag: 'Nyårsdagen',
  namnsdag: [],
  flaggdag: 'Nyårsdagen',
  themeDays: [ 'Internationella pizzadagen' ],
  isInThePast: false,
  monthNumber: 1,
  monthZeroIndex: 0,
  dayNumber: 1,
  isToday: false,
  redDay: true,
  helgDag: true,
  month: { number: 0, name: 'januari' }
}
```

# static html version

deploy the entire `public` folder - it contains a static variant: `index.html` with all of 2024, and `index.js` will highlight the current day
