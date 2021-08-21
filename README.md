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
3. Browse to `http://localhost:8001`

## Common issues
`npm run build:styles` might give you a 'Permission denied' issue when running `node_modules/.bin/lessc`. If so just add permissions via `chmod 775 node_modules/.bin/lessc`.

## Credits

* API from api.dryg.net
* Calendar table CSS from https://codepen.io/altitudems/pen/HLFKx?limit=all&page=2&q=calendar
