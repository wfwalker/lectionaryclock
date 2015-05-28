// multiclock app.js

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
var yearScale = d3.scale.linear().domain([endYear.getTime(), beginYear.getTime()]).range([0, 2 * Math.PI]);
var yearDegreesScale = d3.scale.linear().domain([beginYear.getTime(), endYear.getTime()]).range([0, 360]);

function initializeDayCircle(face) {
	// set of arcs representing 24hours, showing sunlight

	var dayCircle = face.append('g')
		.attr('id','dayCircle');

	var sunlightArc = d3.svg.arc()
		.innerRadius(200)
		.outerRadius(220)
		.startAngle(dayScale(6))
		.endAngle(dayScale(20));

	dayCircle.append("path")
		.attr("id", 'sunlightArc')
		.attr("d", sunlightArc)

	var nightArc = d3.svg.arc()
		.innerRadius(200)
		.outerRadius(220)
		.startAngle(dayScale(20))
		.endAngle(dayScale(30));

	dayCircle.append("path")
		.attr("id", 'nightArc')
		.attr("d", nightArc);
}

function initializeClockArcs(face) {
	// small mark that weeps once a minute

	var minuteArc = d3.svg.arc()
		.innerRadius(80)
		.outerRadius(85)
		.startAngle(-0.025 * Math.PI)
		.endAngle(0.025 * Math.PI);

	face.append("path")
		.attr("id", 'minuteArc')
		.attr("d", minuteArc)

	// small arc that sweeps once an hour

	var hourArc = d3.svg.arc()
		.innerRadius(87)
		.outerRadius(92)
		.startAngle(-0.025 * Math.PI)
		.endAngle(0.025 * Math.PI);

	face.append("path")
		.attr("id", 'hourArc')
		.attr("d", hourArc);	
}

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

    days.nye = new Date(Y, 11, 31);
    days.nyd = new Date(Y, 0, 1);

    // christmas is fixed
    days.christmas = new Date(Y,11,25);

    //advent starts the closest sunday before nov 30?
    days.advent = new Date(Y, 10, 30);
    days.advent = new Date(days.advent.getTime() - days.advent.getDay() * oneDay);

    // console.log(days);

    var seasons = [
	    [days.advent.getTime(), days.christmas.getTime(), 'advent'],
	    [days.christmas.getTime(), days.nye.getTime(), 'epiphany'],
	    [days.nyd.getTime(), days.epiphany.getTime(), 'epiphany'],
	    [days.epiphany.getTime(), days.ashWednesday.getTime(), 'ordinary'],
	    [days.ashWednesday.getTime(), days.palmSunday.getTime(), 'lent'],
	    [days.palmSunday.getTime(), days.easter.getTime(), 'holyWeek'],
	    [days.easter.getTime(), days.pentecost.getTime(), 'easter'],
	    [days.pentecost.getTime(), days.advent.getTime(), 'ordinary']
    ];

    // console.log(seasons);
    return seasons;
}

function addSundays(seasons, Y) {
	var D = new Date(Y,0,1)
	var day = D.getDay();
	if (day != 0) D.setDate(D.getDate() + (7 - day));

	while (D) {
	    D.setDate(D.getDate()+7);
	    if (D.getFullYear() != Y) return;
	    seasons.push([D.getTime(), D.getTime() + oneDay, 'sunday']);
	}
}

function initializeYearCircle(face) {
	// set of arcs representing a year, showing liturgical calendar

	var yearCircle = face.append('g')
		.attr('id', 'yearCircle');

	var seasons = getSeasonsForYear(new Date().getFullYear());

	addSundays(seasons, new Date().getFullYear());

	var seasonArc = d3.svg.arc()
		.innerRadius(300)
		.outerRadius(340)
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
		.attr("id", function(d){
			return d[2];
		})
		.on('mouseover', function(d) {
			console.log(d[2], new Date(d[0]).toLocaleDateString(), new Date(d[1]).toLocaleDateString());
		});

	yearCircle.selectAll("path").data(seasons).enter();
}

function initializeClock() {
	var vis = d3.select("#svg_donut");

	var face = vis.append('g')
		.attr('id','clock-face')
		.attr('transform','translate(400,400)');	

	// background gray circle

	var fullArc = d3.svg.arc()
		.innerRadius(80)
		.outerRadius(340)
		.startAngle(0)
		.endAngle(2 * Math.PI);

	face.append("path")
		.attr("id", 'fullArc')
		.attr("d", fullArc)

	initializeClockArcs(face);

	initializeDayCircle(face);

	initializeYearCircle(face);

	// vertical mark showing now

	face.append("rect")
      .attr("class", "bar")
      .attr("x", 0)
      .attr("width", 1)
      .attr("y", -340)
      .attr("height", 260);			
}

function step(timestamp) {

	d3.select('#minuteArc')
		.transition()
		.attr('transform', function(d){
			var angle = 360 * ((new Date().getTime() / 1000) % 60) / 60.0;
			return 'rotate(' + Math.round(angle) + ')';
		});

	d3.select('#hourArc')
		.transition()
		.attr('transform', function(d){
			var angle = 360 * ((new Date().getTime() / 1000) % 3600) / 3600.0;
			return 'rotate(' + angle + ')';
		});

	d3.select('#dayCircle')
		.transition()
		.attr('transform', function(d){
			var tmp = new Date();
			var percentage = (tmp.getHours() * 3600 + tmp.getMinutes() * 60) / 86400.0;
			var angle = 360 * percentage;
			return 'rotate(' + angle + ')';
		});

	d3.select('#yearCircle')
		.transition()
		.attr('transform', function(d){
			var tmp = new Date();
			return 'rotate(' + yearDegreesScale(tmp.getTime()) + ')';
		});

	window.setTimeout(step, 1000);
}

initializeClock();
window.setTimeout(step, 1000);