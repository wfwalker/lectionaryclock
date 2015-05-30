// multiclock app.js

// show date each sunday
// put advent 1 at the top always
// have marker slowly move clockwise. you know, like a clock
// advent is not red, blue!
// easter is white!

var lectionary = require('lectionary');

var yearBScriptures = require('./year-b.json')
var yearAScriptures = require('./year-a.json')
var yearCScriptures = require('./year-c.json')

function getScriptures(lectionaryDate) {
	if (lectionaryDate.lectionaryYear == 'A' || lectionaryDate.lectionaryYear == 'A-B-C') {			
		var scriptures = yearAScriptures[lectionaryDate.lectionaryShortName];
	} else if (lectionaryDate.lectionaryYear == 'B') {			
		var scriptures = yearBScriptures[lectionaryDate.lectionaryShortName];
	} else if (lectionaryDate.lectionaryYear == 'C') {			
		var scriptures = yearCScriptures[lectionaryDate.lectionaryShortName];
	} else {
		throw 'unknown lectionary year ' + lectionaryDate.lectionaryYear;
	}

	if (! scriptures) {
		throw 'missing scriptures ' + JSON.stringify(lectionaryDate) + ' ' + year;
	}

	return scriptures;
}

var beginYear = new Date();
beginYear.setMonth(0);
beginYear.setDate(1);
beginYear.setHours(0);
beginYear.setMinutes(0);
beginYear.setSeconds(0);

var endYear = new Date();
endYear.setMonth(11);
endYear.setDate(31);
endYear.setHours(23);
endYear.setMinutes(59);
endYear.setSeconds(59);

var oneDay = 1000 * 60 * 60 * 24;

var dayScale = d3.scale.linear().domain([24, 0]).range([0, 2 * Math.PI]);
var yearScale = d3.scale.linear().domain([beginYear.getTime(), endYear.getTime()]).range([0, 2 * Math.PI]);
var yearDegreesScale = d3.scale.linear().domain([beginYear.getTime(), endYear.getTime()]).range([0, 360]);


function getEasterForYear(Y) {
    // http://coderzone.org/library/Get-Easter-Date-for-any-year-in-Javascript_1059.htm
    var C = Math.floor(Y/100);
    var N = Y - 19*Math.floor(Y/19);
    var K = Math.floor((C - 17)/25);
    var I = C - Math.floor(C/4) - Math.floor((C - K)/3) + 19*N + 15;
    I = I - 30*Math.floor((I/30));
    I = I - Math.floor(I/28)*(1 - Math.floor(I/28)*Math.floor(29/(I + 1))*Math.floor((21 - N)/11));
    var J = Y + Math.floor(Y/4) + I + 2 - C + Math.floor(C/4);
    J = J - 7*Math.floor(J/7);
    var L = I - J;
    var M = 3 + Math.floor((L + 40)/44);
    var D = L + 28 - 31*Math.floor(M/4);
 
    return new Date(Y, M-1, D);
}

function getSeasonsForYear(Y) {
    var days = {};

    // epiphany is fixed
    days.epiphany = new Date(Y,0,6);
    // easter follows crazy formula above
    days.easter = getEasterForYear(Y);
    // ash wednesday fixed days before easter
    days.ashWednesday = new Date(days.easter.getTime() - 45 * oneDay);
    // palm sunday one week before easter
    days.palmSunday = new Date(days.easter.getTime() - 7 * oneDay);
    // pentecost 50 days after easter
    days.pentecost = new Date(days.easter.getTime() + 49 * oneDay);
    // ascension 40 days after easter
    days.ascension = new Date(days.easter.getTime() + 39 * oneDay);

    days.nye = new Date(Y, 11, 31, 23, 59, 59);
    days.nyd = new Date(Y, 0, 1, 0, 0, 0);

    // christmas is fixed
    days.christmas = new Date(Y,11,25);

    //advent starts the closest sunday before nov 30?
    days.advent = new Date(Y, 10, 30);
    days.advent = new Date(days.advent.getTime() - days.advent.getDay() * oneDay);

    // console.log(days);

    var seasons = [
	    [days.advent.getTime(), days.christmas.getTime(), 'advent', 'Advent'],
	    [days.christmas.getTime(), days.nye.getTime(), 'epiphany', 'Epiphany'],
	    [days.nyd.getTime(), days.epiphany.getTime(), 'epiphany', 'Epiphany'],
	    [days.epiphany.getTime(), days.ashWednesday.getTime(), 'ordinary', 'Ordinary Time'],
	    [days.ashWednesday.getTime(), days.palmSunday.getTime(), 'lent', 'Lent'],
	    [days.palmSunday.getTime(), days.easter.getTime(), 'holyWeek', 'Holy Week'],
	    [days.easter.getTime(), days.pentecost.getTime(), 'easter', 'Season of Easter'],
	    [days.pentecost.getTime(), days.advent.getTime(), 'ordinary', 'Ordinary Time']
    ];

    // console.log(seasons);
    return seasons;
}

function getSundays(year) {
	console.log('addSundays', year);
	var sundays = [];

	for (var month = 0; month < 12; month++) {
		var lectionaryDates = lectionary(year, month);
		for (var index in lectionaryDates) {
			var aSunday = lectionaryDates[index];
			sundays.push([
				aSunday.date.getTime(),
				aSunday.lectionaryShortName,
				JSON.stringify(getScriptures(aSunday))
			]);
		}
	}
	
	return sundays;
}

function initializeSeasonCircle(face) {
	// set of arcs representing a year, showing liturgical calendar

	var yearCircle = face.append('g')
		.attr('id', 'yearCircle');

	var seasons = getSeasonsForYear(new Date().getFullYear());

	getSundays(new Date().getFullYear());

	var seasonArc = d3.svg.arc()
		.innerRadius(230)
		.outerRadius(340)
		.cornerRadius(10)
		.startAngle(function(d) {
			return yearScale(d[0]);
		})
		.endAngle(function(d){ 
			return yearScale(d[1]);
		});

	yearCircle.selectAll("path")
		.data(seasons)
		.enter()
		.append("path")
		.attr("d", seasonArc)
		.attr('stroke-width', 2)
		.attr("class", function(d){
			return 'season ' + d[2];
		})
		.attr("data-scriptures", function(d){
			return d[3];
		})
		.on('mouseover', function(d) {
			document.getElementById('selectionName').textContent = d[3];
			document.getElementById('dates').textContent = new Date(d[0]).toLocaleDateString() + ' - ' + new Date(d[1]).toLocaleDateString();
		})
		.on('mouseleave', function(d) {
			document.getElementById('selectionName').textContent = '';
			document.getElementById('dates').textContent = '';
		});
;

	yearCircle.selectAll("path").data(seasons).enter();
}

function initializeWeekCircle(face) {
	// set of arcs representing a year, showing weekly calendar

	var weekCircle = face.append('g')
		.attr('id', 'weekCircle');

	var sundays = getSundays(new Date().getFullYear());

	var weekArc = d3.svg.arc()
		.innerRadius(function(d) {
			return 240 + 25 * (new Date(d[0]).getDay() % 3);
		})
		.outerRadius(function(d) {
			return 260 + 25 * (new Date(d[0]).getDay() % 3);
		})
		.cornerRadius(10)
		.startAngle(function(d) {
			return yearScale(d[0] - 2 * oneDay);
		})
		.endAngle(function(d){ 
			return yearScale(d[0] + 2 * oneDay);
		});

	weekCircle.selectAll("path")
		.data(sundays)
		.enter()
		.append("path")
		.attr("d", weekArc)
		.attr('class', 'sunday')
		.on('mouseover', function(d) {
			document.getElementById('selectionName').textContent = d[1];
			document.getElementById('dates').textContent = new Date(d[0]).toLocaleDateString();
			scriptures = JSON.parse(d[2]);
			if (scriptures.complementary) { scriptures = scriptures.complementary }
			document.getElementById('first').textContent = scriptures.first;
			document.getElementById('second').textContent = scriptures.second;
			document.getElementById('psalm').textContent = scriptures.psalm;
			document.getElementById('gospel').textContent = scriptures.gospel;
		})
		.on('mouseleave', function(d) {
			document.getElementById('selectionName').textContent = '';
			document.getElementById('dates').textContent = '';
			document.getElementById('first').textContent = '';
			document.getElementById('second').textContent = '';
			document.getElementById('psalm').textContent = '';
			document.getElementById('gospel').textContent = '';
		});

	weekCircle.selectAll("path").data(sundays).enter();
}


function initializeClock() {
	var vis = d3.select("#svg_donut");

	var face = vis.append('g')
		.attr('id','clock-face')
		.attr('transform','translate(400,400)');	

	// background gray circle

	var fullArc = d3.svg.arc()
		.innerRadius(150)
		.outerRadius(340)
		.startAngle(0)
		.endAngle(2 * Math.PI);

	face.append("path")
		.attr("id", 'fullArc')
		.attr("d", fullArc)

	initializeSeasonCircle(face);

	initializeWeekCircle(face);

	// vertical mark showing now

	face.append("rect")
      .attr("class", "bar")
      .attr("id", "pointer")
      .attr("x", 0)
      .attr("width", 5)
      .attr("y", -340)
      .attr("height", 190);			
}

function step(timestamp) {

	document.getElementById('timeView').textContent = new Date().getFullYear();

	d3.select('#pointer')
		.transition().duration(1000)
		.attr('transform', function(d){
			var tmp = new Date();
			return 'rotate(' + yearDegreesScale(tmp.getTime()) + ')';
		});

	window.setTimeout(step, 10000);
}

initializeClock();
step();
window.setTimeout(step, 10000);
