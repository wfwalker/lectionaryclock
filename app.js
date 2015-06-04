// multiclock app.js

// TODO: put advent 1 at the top always

var lectionary = require('lectionary');

var yearBScriptures = require('./year-b.json')
var yearAScriptures = require('./year-a.json')
var yearCScriptures = require('./year-c.json')

var currentSunday = null;

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

var currentYear = new Date().getFullYear();
var endYear = new Date(currentYear, 11, 31, 23, 59, 59);
var beginYear = new Date(currentYear, 0, 1, 0, 0, 0);

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
	    [days.advent, days.christmas, 'advent', 'Advent'],
	    [days.christmas, days.nye, 'epiphany', 'Epiphany'],
	    [days.nyd, days.epiphany, 'epiphany', 'Epiphany'],
	    [days.epiphany, days.ashWednesday, 'ordinary', 'Ordinary Time'],
	    [days.ashWednesday, days.palmSunday, 'lent', 'Lent'],
	    [days.palmSunday, days.easter, 'holyWeek', 'Holy Week'],
	    [days.easter, days.pentecost, 'easter', 'Season of Easter'],
	    [days.pentecost, days.advent, 'ordinary', 'Ordinary Time']
    ];

    // console.log(seasons);
    return seasons;
}

function getSundays(year) {
	var sundays = [];

	var lectionaryDates = lectionary(year);
	for (var index in lectionaryDates) {
		var aSunday = lectionaryDates[index];
		sundays.push(aSunday);

		var delta = aSunday.date.getTime() - new Date().getTime();
		if (delta > -1 * oneDay && delta < 6 * oneDay) {
			currentSunday = aSunday;
			showSunday(currentSunday);
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
		.innerRadius(250)
		.outerRadius(375)
		.cornerRadius(10)
		.startAngle(function(d) {
			return yearScale(d[0].getTime());
		})
		.endAngle(function(d){ 
			return yearScale(d[1].getTime());
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
		.append('svg:title')
		.text(function(d) { return d[3] + ', ' + d[0].toLocaleDateString() + ' - ' + d[1].toLocaleDateString(); });

	yearCircle.selectAll("path").data(seasons).enter();
}

function setBibleLink(id, passage) {
	document.getElementById(id).href = 'http://biblegateway.com/passage/?version=NRSV&search=' + encodeURIComponent(passage);
	document.getElementById(id).textContent = passage;
}

function showSunday(aSunday) {
	document.getElementById('selectionName').textContent = aSunday.lectionaryShortName;
	document.getElementById('dates').textContent = aSunday.date.toLocaleDateString();
	scriptures = getScriptures(aSunday);
	if (scriptures.complementary) { scriptures = scriptures.complementary }

	setBibleLink('first', scriptures.first);
	setBibleLink('psalm', scriptures.psalm);
	setBibleLink('second', scriptures.second);
	setBibleLink('gospel', scriptures.gospel);

	d3.select('#pointer')
		.transition().duration(1000)
		.attr('transform', function(d){
			return 'rotate(' + yearDegreesScale(aSunday.date.getTime()) + ')';
		});
}

function initializeWeekCircle(face) {
	// set of arcs representing a year, showing weekly calendar

	var weekCircle = face.append('g')
		.attr('id', 'weekCircle');

	var sundays = getSundays(new Date().getFullYear());

	// Add a text label.
	weekCircle.selectAll("text")
		.data(sundays)
		.enter()
		.append("text")
		.attr('class', 'dayLabel')
		.attr("transform", function(d) {
			var degrees = yearDegreesScale(d.date.getTime());

			if (degrees > 180) {
				return 'rotate(' + (degrees + 90) + ') translate(-312,5)';
			} else {
				return 'rotate(' + (degrees + 270) + ') translate(312,5)';
			}
		})
		.text(function (d) { return d.lectionaryShortName; })
		.on('click', function(d) {
			currentSunday = d;
			showSunday(currentSunday);
			d3.selectAll('.dayLabel').classed({selected: false});
			this.classList.add('selected');
		});

}

// INITIALIZE

var vis = d3.select("#svg_donut");

var face = vis.append('g')
	.attr('id','clock-face')
	.attr('transform','translate(375,375)');	

// vertical mark showing now

initializeSeasonCircle(face);

var pointerArc = d3.svg.arc()
	.innerRadius(255)
	.outerRadius(370)
	.cornerRadius(10)
	.startAngle(-0.04)
	.endAngle(0.04);

face.append("path")
	.attr('id', 'pointer')
	.attr('stroke-width', 2)
	.attr('d', pointerArc);

initializeWeekCircle(face);

document.getElementById('timeView').textContent = new Date().getFullYear();

d3.select('#pointer')
	.transition().duration(1000)
	.attr('transform', function(d){
		var tmp = new Date();
		return 'rotate(' + yearDegreesScale(tmp.getTime()) + ')';
	});

