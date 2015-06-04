// multiclock app.js

// TODO: put advent 1 at the top always

var lectionary = require('lectionary');

var oneDay = 1000 * 60 * 60 * 24;

var currentSunday = null;

var currentYear = new Date().getFullYear();
var tmp = window.location.toString();
if (tmp.indexOf('#') > 0) {
	currentYear = tmp.substring(tmp.indexOf('#')+1, tmp.indexOf('#')+5)
}

var endYear = new Date(currentYear, 11, 31, 23, 59, 59);
var beginYear = new Date(currentYear, 0, 1, 0, 0, 0);
var yearDegreesScale = d3.scale.linear().domain([beginYear.getTime(), endYear.getTime()]).range([0, 360]);

function getSundays(year) {
	var sundays = [];

	// TODO: this does nothing except find the next sunday.

	var lectionaryDates = lectionary.days(year);
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
	var yearScale = d3.scale.linear().domain([beginYear.getTime(), endYear.getTime()]).range([0, 2 * Math.PI]);
	
	// set of arcs representing a year, showing liturgical calendar

	var yearCircle = face.append('g')
		.attr('id', 'yearCircle');

	var seasons = lectionary.seasons(currentYear);

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
	document.getElementById('dates').textContent = aSunday.date.toLocaleDateString();
	scriptures = aSunday.scriptures;
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

	var sundays = getSundays(currentYear);

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

document.getElementById('timeView').textContent = currentYear;

d3.select('#pointer')
	.transition().duration(1000)
	.attr('transform', function(d){
		var tmp = new Date();
		return 'rotate(' + yearDegreesScale(tmp.getTime()) + ')';
	});

