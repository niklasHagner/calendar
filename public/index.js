/*  This is only used for the compiled index.hmtl file
//* cssClass "is Today"

<div class="today-facts">
    <h2>söndag 9 juli 2023
        <span class="weeknumber">vecka 27</span>
    </h2>
    <p>

    </p>
    <p class="sans-serif">
            <span>Jörgen</span> &amp;
            <span>Örjan</span>
        har namnsdag
    </p>

    <div class="todays-themedays sans-serif">
        <strong>Temadagar:</strong>
        <ul>
                <li>Internationella dagen för oskadliggörande av handeldvapen</li>
        </ul>
    </div>
</div>

*/

Date.prototype.getWeek = function () {
    var onejan = new Date(this.getFullYear(), 0, 1);
    return Math.ceil((((this - onejan) / 86400000) + onejan.getDay() + 1) / 7);
};

function getFormattedDate(d) {
    return d.toISOString().split('T')[0];
}

function getSwedishWeekday(d) {
    const dayInt = d.getDay();
    return ["Söndag","Måndag","Tisdag","Onsdag","Torsdag","Fredag","Lördag"][dayInt]; // Jepp! Sunday is 0, and Monday is 1
}

function main() {
    const currentDate = new Date();
    const currentMonthIndex = currentDate.getMonth();
    const monthElements = Array.from(document.querySelectorAll("[data-zeroindex]"));
    const monthsToCollapse = monthElements.filter(x => Number(x.getAttribute("data-zeroindex")) < currentMonthIndex);

    monthsToCollapse.forEach(monthElement => {
        console.log(monthElement.outerHTML.slice(0, 500));
        console.log("------");
        const summary = document.createElement('summary');
        summary.textContent = monthElement.querySelector('h2').textContent;

        const details = document.createElement('details');
        details.innerHTML = monthElement.innerHTML;
        monthElement.innerHTML = '';
        monthElement.appendChild(details);
    });

    const formattedToday = getFormattedDate(currentDate);
    const swedishWeekday = getSwedishWeekday(currentDate);
    const currentWeek = currentDate.getWeek();

    const todayTitleEl = document.querySelector(".today-facts h2");
    const todayFactsEl = document.querySelector(".today-facts-info");

    todayTitleEl.innerHTML = `${swedishWeekday} ${formattedToday} <span class="weeknumber">vecka ${currentWeek}</span>`;

    const todayCard = Array.from(document.querySelectorAll(".days li")).find(x => x.getAttribute("data-datum") === formattedToday);
    if (!todayCard) {
        return;
    }

    const todayHolidaysHtml = todayCard.querySelector(".holidays")?.innerHTML;
    const todayThemeDays = todayCard.querySelector(".themedays")?.innerHTML;
    const todayNameDays = todayCard.querySelector(".namedays")?.innerHTML;
    todayCard.classList.add("isToday");
    todayFactsEl.innerHTML = `
        <div>
            ${todayHolidaysHtml ? `${todayHolidaysHtml}<br>` : ''}
            ${todayThemeDays ? `<strong>Temadagar:</strong><br>${todayThemeDays}` : ''}
        </div>
        ${todayNameDays ? `<div><strong>Grattis på namnsdagen:</strong><br>${todayNameDays}</div>` : '' }
    `;
}

main();
