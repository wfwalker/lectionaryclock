// multiclock app.js

// NOTA BENE: do this command
// browserify app.js > bundle.js

// dependencies
var lectionary = require('lectionary');
var dateformat = require('dateformat');

var oneDay = 1000 * 60 * 60 * 24;

var gOuterRadius = 700;

var gClock = { currentSunday: null};

// parse initial year from fragment
var tmp = window.location.toString();
if (tmp.indexOf('#') > 0) {
	gClock.currentYear = parseInt(tmp.substring(tmp.indexOf('#')+1, tmp.indexOf('#')+5));
} else {
	gClock.currentYear = new Date().getFullYear();
}

function initializeSeasonCircle(face) {
	var yearScale = d3.scale.linear().domain([gClock.beginYear.getTime(), gClock.endYear.getTime()]).range([0, 2 * Math.PI]);
	
	// set of arcs representing a year, showing liturgical calendar

	var yearCircle = face.append('g')
		.attr('id', 'yearCircle');

	var seasons = lectionary.seasons(gClock.currentYear);

	var seasonArc = d3.svg.arc()
		.innerRadius(gOuterRadius / 3)
		.outerRadius(gOuterRadius / 2)
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

function clearSunday() {
	document.getElementById('selectionName').textContent = '';
	document.getElementById('dates').textContent = '';
	document.getElementById('scriptureRadio').hidden = true;

	document.getElementById('first').textContent = '';
	document.getElementById('psalm').textContent = '';
	document.getElementById('second').textContent = '';
	document.getElementById('gospel').textContent = '';
}

// link to http://www.elca.org/Our-Work/Congregations-and-Synods/Worship/Lectionary/YearB

function showSunday(aSunday) {
	document.getElementById('selectionName').textContent = aSunday.lectionaryLongName;
	document.getElementById('year').textContent = 'Year ' + aSunday.lectionaryYear;
	document.getElementById('dates').textContent = dateformat(aSunday.date, 'mmmm dS');

	scriptures = aSunday.scriptures;

	if (scriptures.complementary || scriptures.semicontinuous) {
		document.getElementById('scriptureRadio').hidden = false;

		if (scriptures.complementary && document.getElementById('scriptures_1').checked) {
			scriptures = scriptures.complementary
		} else if (scriptures.semicontinuous && document.getElementById('scriptures_2').checked) {
			scriptures = scriptures.semicontinuous
		}
	} else {
		document.getElementById('scriptureRadio').hidden = true;
	}

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
	var tmpNow = new Date().getTime();

	gClock.currentSunday = null;

	// initialize currentSunday
	for (var index in sundays) {
		var aSunday = sundays[index];

		var tmp = aSunday.scriptures;
		if (tmp.complementary) {
			tmp = tmp.complementary;
		}

		document.getElementById('csv').innerHTML += [
			aSunday.date.toLocaleDateString(),
			aSunday.lectionaryShortName,
			tmp.first,
			tmp.psalm,
			tmp.second,
			tmp.gospel,
			'\n'
		].join('>');

		var delta = aSunday.date.getTime() - tmpNow;

		if (delta > -1 * oneDay && delta < 6 * oneDay) {
			console.log('nearby aSunday', aSunday, 'now', tmpNow, 'delta', delta);
			if (! gClock.currentSunday) {
				gClock.currentSunday = aSunday;
				showSunday(gClock.currentSunday);
				console.log('SET TO', gClock.currentSunday);
			}
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
				return 'rotate(' + (degrees + 90) + ') translate(-' + gOuterRadius*0.41 + ',5)';
			} else {
				return 'rotate(' + (degrees + 270) + ') translate(' + gOuterRadius*0.41 + ',5)';
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

	// START of DST
    var firstOfMarch = new Date(gClock.currentYear, 2, 0); // zero-based month index
    var daysUntilFirstSunday =  (7 - firstOfMarch.getDay()) % 7; //the day of week (0=Sunday, 6 = Saturday)
 	var secondSundayOfMarch = new Date(gClock.currentYear, 2, 7 + daysUntilFirstSunday);
    monthStarts.push({ date: secondSundayOfMarch, label: 'DST' });

    // END of DST
    var firstOfNovember = new Date(gClock.currentYear, 10, 0); // zero-based month index
    var daysUntilFirstSunday =  (7 - firstOfNovember.getDay()) % 7; //the day of week (0=Sunday, 6 = Saturday)
 	var firstSundayOfNovember = new Date(gClock.currentYear, 10, daysUntilFirstSunday);
    monthStarts.push({ date: firstSundayOfNovember, label: 'DST' });

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
				return 'rotate(' + (degrees + 90) + ') translate(-' + gOuterRadius*0.31 + ',5)';
			} else {
				return 'rotate(' + (degrees + 270) + ') translate(' + gOuterRadius*0.31 + ',5)';
			}
		})
		.text(function (d) { return d.label; });	
}

// INITIALIZE

var vis = d3.select("#svg_donut");

gClock.face = vis.append('g')
	.attr('id','clock-face')
	.attr('transform','translate('+ gOuterRadius/2 + ',' + gOuterRadius/2 +')');	

function showClockForYear(face, inNewYear) {
	// remove everything
	face.selectAll("*").remove();
	clearSunday();

	gClock.currentYear = inNewYear;
	gClock.endYear = new Date(gClock.currentYear, 11, 31, 23, 59, 59);
	gClock.beginYear = new Date(gClock.currentYear, 0, 1, 0, 0, 0);
	gClock.yearDegreesScale = d3.scale.linear().domain([gClock.beginYear.getTime(), gClock.endYear.getTime()]).range([0, 360]);

	initializeSeasonCircle(gClock.face);

	// radial mark showing now

	var pointerArc = d3.svg.arc()
		.innerRadius(10)
		.outerRadius(gOuterRadius/2)
		.cornerRadius(3)
		.startAngle(-0.04)
		.endAngle(0.04);

	gClock.face.append("path")
		.attr('id', 'pointer')
		.attr('stroke-width', 5)
		.attr('d', pointerArc);

	// circular overlay

	var overlayArc = d3.svg.arc()
		.innerRadius(0)
		.outerRadius(180)
		.cornerRadius(0)
		.startAngle(0)
		.endAngle(Math.PI * 2);

	gClock.face.append("path")
		.attr('id', 'circleOverlay')
		.attr('stroke-width', 5)
		.attr('d', overlayArc);

	initializeWeekCircle(gClock.face);
	initializeMonthCircle(gClock.face);

	document.getElementById('timeView').textContent = gClock.currentYear;

	document.getElementById('prevYear').setAttribute('data-year', gClock.currentYear - 1);
	document.getElementById('nextYear').setAttribute('data-year', gClock.currentYear + 1);

	d3.select('#pointer')
		.attr('transform', function(d){
			var tmp = new Date();
			console.log('set pointer to', tmp);
			return 'rotate(' + gClock.yearDegreesScale(tmp.getTime()) + ')';
		});
}

// INITIALIZE
showClockForYear(gClock.face, gClock.currentYear);

// wire up links to next year, previous year buttons
var yearlinks = document.getElementsByClassName('yearlink');
for (var index = 0; index < yearlinks.length; index++) {
	var yearlink = yearlinks[index];

	yearlink.addEventListener('click', function (e) {
		e.preventDefault();
		var tmp = parseInt(this.getAttribute('data-year'));
		showClockForYear(gClock.face, tmp);
		history.pushState(null, '', '#' + tmp);
	});
}

// get events when complementary / semicontinuous changes
document.getElementById('scriptures_1').addEventListener('change', function (e){
	showSunday(gClock.currentSunday);
});
document.getElementById('scriptures_2').addEventListener('change', function (e){
	showSunday(gClock.currentSunday);
});



