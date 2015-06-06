// multiclock app.js

// TODO: put advent 1 at the top always

var lectionary = require('lectionary');
var dateformat = require('dateformat');

var oneDay = 1000 * 60 * 60 * 24;

var gClock = {};

var tmp = window.location.toString();
if (tmp.indexOf('#') > 0) {
	gClock.currentYear = parseInt(tmp.substring(tmp.indexOf('#')+1, tmp.indexOf('#')+5));
} else {
	gClock.currentYear = new Date().getFullYear();
}

gClock.currentSunday = null;

gClock.endYear = new Date(gClock.currentYear, 11, 31, 23, 59, 59);
gClock.beginYear = new Date(gClock.currentYear, 0, 1, 0, 0, 0);
gClock.yearDegreesScale = d3.scale.linear().domain([gClock.beginYear.getTime(), gClock.endYear.getTime()]).range([0, 360]);

function initializeSeasonCircle(face) {
	var yearScale = d3.scale.linear().domain([gClock.beginYear.getTime(), gClock.endYear.getTime()]).range([0, 2 * Math.PI]);
	
	// set of arcs representing a year, showing liturgical calendar

	var yearCircle = face.append('g')
		.attr('id', 'yearCircle');

	var seasons = lectionary.seasons(gClock.currentYear);

	var seasonArc = d3.svg.arc()
		.innerRadius(250)
		.outerRadius(375)
		.cornerRadius(10)
		.startAngle(function(d) {
			return yearScale(d.start.getTime());
		})
		.endAngle(function(d){ 
			return yearScale(d.end.getTime());
		});

	yearCircle.selectAll("path")
		.data(seasons)
		.enter()
		.append("path")
		.attr("d", seasonArc)
		.attr('stroke-width', 2)
		.attr("class", function(d){
			return 'season ' + d.name.replace(' ', '').toLowerCase();
		})
		.append('svg:title')
		.text(function(d) { return d.name + ', ' + d.start.toLocaleDateString() + ' - ' + d.end.toLocaleDateString(); });

	yearCircle.selectAll("path").data(seasons).enter();
}

function setBibleLink(id, passage) {
	document.getElementById(id).href = 'http://biblegateway.com/passage/?version=NRSV&search=' + encodeURIComponent(passage);
	document.getElementById(id).textContent = passage;
}

function showSunday(aSunday) {
	document.getElementById('selectionName').textContent = aSunday.lectionaryShortName;
	document.getElementById('dates').textContent = dateformat(aSunday.date, "dddd, mmmm dS");

	scriptures = aSunday.scriptures;
	if (scriptures.complementary) { scriptures = scriptures.complementary }

	setBibleLink('first', scriptures.first);
	setBibleLink('psalm', scriptures.psalm);
	setBibleLink('second', scriptures.second);
	setBibleLink('gospel', scriptures.gospel);

	d3.select('#pointer')
		.attr('transform', function(d){
			return 'rotate(' + gClock.yearDegreesScale(aSunday.date.getTime()) + ')';
		});
}

function initializeWeekCircle(face) {
	// set of arcs representing a year, showing weekly calendar

	var weekCircle = face.append('g')
		.attr('id', 'weekCircle');

	var sundays = lectionary.days(gClock.currentYear);

	// initialize currentSunday
	for (var index in sundays) {
		var aSunday = sundays[index];

		var delta = aSunday.date.getTime() - new Date().getTime();
		if (delta > -1 * oneDay && delta < 6 * oneDay) {
			gClock.currentSunday = aSunday;
			showSunday(gClock.currentSunday);
		}
	}

	// Add a text label for each Sunday
	weekCircle.selectAll("text")
		.data(sundays)
		.enter()
		.append("text")
		.attr('class', 'dayLabel')
		.attr("transform", function(d) {
			var degrees = gClock.yearDegreesScale(d.date.getTime());

			// orient the lefthand and righthand labels differently for legibility
			if (degrees > 180) {
				return 'rotate(' + (degrees + 90) + ') translate(-312,5)';
			} else {
				return 'rotate(' + (degrees + 270) + ') translate(312,5)';
			}
		})
		.text(function (d) { return d.lectionaryShortName; })
		.on('click', function(d) {
			gClock.currentSunday = d;
			showSunday(gClock.currentSunday);
			d3.selectAll('.dayLabel').classed({selected: false});
			this.classList.add('selected');
		});
}

function initializeMonthCircle(face) {
	var monthStarts = [];
	for (var monthIndex = 0; monthIndex < 12; monthIndex++) {
		var tmp = new Date(gClock.currentYear, monthIndex, 1);
		monthStarts.push({ date: tmp, label: dateformat(tmp, "mmm") });
	}

	var monthCircle = face.append('g')
		.attr('id', 'monthCircle');

	// Add a text label for each Start of Month
	monthCircle.selectAll("text")
		.data(monthStarts)
		.enter()
		.append("text")
		.attr('class', 'monthLabel')
		.attr("transform", function(d) {
			var degrees = gClock.yearDegreesScale(d.date.getTime());

			// orient the lefthand and righthand labels differently for legibility
			if (degrees > 180) {
				return 'rotate(' + (degrees + 90) + ') translate(-250,5)';
			} else {
				return 'rotate(' + (degrees + 270) + ') translate(250,5)';
			}
		})
		.text(function (d) { return d.label; });	
}

// INITIALIZE

var vis = d3.select("#svg_donut");

var face = vis.append('g')
	.attr('id','clock-face')
	.attr('transform','translate(375,375)');	

function showClockForYear(face, inNewYear) {
	gClock.currentYear = inNewYear;

	initializeSeasonCircle(face);

	// radial mark showing now

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
	initializeMonthCircle(face);

	document.getElementById('timeView').textContent = gClock.currentYear;

	document.getElementById('prevYear').href = './index.html#' + (gClock.currentYear - 1);
	document.getElementById('nextYear').href = './index.html#' + (gClock.currentYear + 1);

	d3.select('#pointer')
		.attr('transform', function(d){
			var tmp = new Date();
			return 'rotate(' + gClock.yearDegreesScale(tmp.getTime()) + ')';
		});
}

showClockForYear(face, gClock.currentYear);
