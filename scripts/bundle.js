(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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




},{"dateformat":2,"lectionary":3}],2:[function(require,module,exports){
/*
 * Date Format 1.2.3
 * (c) 2007-2009 Steven Levithan <stevenlevithan.com>
 * MIT license
 *
 * Includes enhancements by Scott Trenda <scott.trenda.net>
 * and Kris Kowal <cixar.com/~kris.kowal/>
 *
 * Accepts a date, a mask, or a date and a mask.
 * Returns a formatted version of the given date.
 * The date defaults to the current date/time.
 * The mask defaults to dateFormat.masks.default.
 */

(function(global) {
  'use strict';

  var dateFormat = (function() {
      var token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZWN]|'[^']*'|'[^']*'/g;
      var timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g;
      var timezoneClip = /[^-+\dA-Z]/g;
  
      // Regexes and supporting functions are cached through closure
      return function (date, mask, utc, gmt) {
  
        // You can't provide utc if you skip other args (use the 'UTC:' mask prefix)
        if (arguments.length === 1 && kindOf(date) === 'string' && !/\d/.test(date)) {
          mask = date;
          date = undefined;
        }
  
        date = date || new Date;
  
        if(!(date instanceof Date)) {
          date = new Date(date);
        }
  
        if (isNaN(date)) {
          throw TypeError('Invalid date');
        }
  
        mask = String(dateFormat.masks[mask] || mask || dateFormat.masks['default']);
  
        // Allow setting the utc/gmt argument via the mask
        var maskSlice = mask.slice(0, 4);
        if (maskSlice === 'UTC:' || maskSlice === 'GMT:') {
          mask = mask.slice(4);
          utc = true;
          if (maskSlice === 'GMT:') {
            gmt = true;
          }
        }
  
        var _ = utc ? 'getUTC' : 'get';
        var d = date[_ + 'Date']();
        var D = date[_ + 'Day']();
        var m = date[_ + 'Month']();
        var y = date[_ + 'FullYear']();
        var H = date[_ + 'Hours']();
        var M = date[_ + 'Minutes']();
        var s = date[_ + 'Seconds']();
        var L = date[_ + 'Milliseconds']();
        var o = utc ? 0 : date.getTimezoneOffset();
        var W = getWeek(date);
        var N = getDayOfWeek(date);
        var flags = {
          d:    d,
          dd:   pad(d),
          ddd:  dateFormat.i18n.dayNames[D],
          dddd: dateFormat.i18n.dayNames[D + 7],
          m:    m + 1,
          mm:   pad(m + 1),
          mmm:  dateFormat.i18n.monthNames[m],
          mmmm: dateFormat.i18n.monthNames[m + 12],
          yy:   String(y).slice(2),
          yyyy: y,
          h:    H % 12 || 12,
          hh:   pad(H % 12 || 12),
          H:    H,
          HH:   pad(H),
          M:    M,
          MM:   pad(M),
          s:    s,
          ss:   pad(s),
          l:    pad(L, 3),
          L:    pad(Math.round(L / 10)),
          t:    H < 12 ? 'a'  : 'p',
          tt:   H < 12 ? 'am' : 'pm',
          T:    H < 12 ? 'A'  : 'P',
          TT:   H < 12 ? 'AM' : 'PM',
          Z:    gmt ? 'GMT' : utc ? 'UTC' : (String(date).match(timezone) || ['']).pop().replace(timezoneClip, ''),
          o:    (o > 0 ? '-' : '+') + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
          S:    ['th', 'st', 'nd', 'rd'][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10],
          W:    W,
          N:    N
        };
  
        return mask.replace(token, function (match) {
          if (match in flags) {
            return flags[match];
          }
          return match.slice(1, match.length - 1);
        });
      };
    })();

  dateFormat.masks = {
    'default':               'ddd mmm dd yyyy HH:MM:ss',
    'shortDate':             'm/d/yy',
    'mediumDate':            'mmm d, yyyy',
    'longDate':              'mmmm d, yyyy',
    'fullDate':              'dddd, mmmm d, yyyy',
    'shortTime':             'h:MM TT',
    'mediumTime':            'h:MM:ss TT',
    'longTime':              'h:MM:ss TT Z',
    'isoDate':               'yyyy-mm-dd',
    'isoTime':               'HH:MM:ss',
    'isoDateTime':           'yyyy-mm-dd\'T\'HH:MM:sso',
    'isoUtcDateTime':        'UTC:yyyy-mm-dd\'T\'HH:MM:ss\'Z\'',
    'expiresHeaderFormat':   'ddd, dd mmm yyyy HH:MM:ss Z'
  };

  // Internationalization strings
  dateFormat.i18n = {
    dayNames: [
      'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat',
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
    ],
    monthNames: [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
    ]
  };

function pad(val, len) {
  val = String(val);
  len = len || 2;
  while (val.length < len) {
    val = '0' + val;
  }
  return val;
}

/**
 * Get the ISO 8601 week number
 * Based on comments from
 * http://techblog.procurios.nl/k/n618/news/view/33796/14863/Calculate-ISO-8601-week-and-year-in-javascript.html
 *
 * @param  {Object} `date`
 * @return {Number}
 */
function getWeek(date) {
  // Remove time components of date
  var targetThursday = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  // Change date to Thursday same week
  targetThursday.setDate(targetThursday.getDate() - ((targetThursday.getDay() + 6) % 7) + 3);

  // Take January 4th as it is always in week 1 (see ISO 8601)
  var firstThursday = new Date(targetThursday.getFullYear(), 0, 4);

  // Change date to Thursday same week
  firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);

  // Check if daylight-saving-time-switch occured and correct for it
  var ds = targetThursday.getTimezoneOffset() - firstThursday.getTimezoneOffset();
  targetThursday.setHours(targetThursday.getHours() - ds);

  // Number of weeks between target Thursday and first Thursday
  var weekDiff = (targetThursday - firstThursday) / (86400000*7);
  return 1 + Math.floor(weekDiff);
}

/**
 * Get ISO-8601 numeric representation of the day of the week
 * 1 (for Monday) through 7 (for Sunday)
 * 
 * @param  {Object} `date`
 * @return {Number}
 */
function getDayOfWeek(date) {
  var dow = date.getDay();
  if(dow === 0) {
    dow = 7;
  }
  return dow;
}

/**
 * kind-of shortcut
 * @param  {*} val
 * @return {String}
 */
function kindOf(val) {
  if (val === null) {
    return 'null';
  }

  if (val === undefined) {
    return 'undefined';
  }

  if (typeof val !== 'object') {
    return typeof val;
  }

  if (Array.isArray(val)) {
    return 'array';
  }

  return {}.toString.call(val)
    .slice(8, -1).toLowerCase();
};



  if (typeof define === 'function' && define.amd) {
    define(function () {
      return dateFormat;
    });
  } else if (typeof exports === 'object') {
    module.exports = dateFormat;
  } else {
    global.dateFormat = dateFormat;
  }
})(this);

},{}],3:[function(require,module,exports){
'use strict';
var advent = require('./lib/advent');
var epiphany = require('./lib/epiphany');
var lentEaster = require('./lib/lenteaster');
var pentecost = require('./lib/pentecost');
var scriptures = require('./lib/scriptures');

module.exports.days = function(year, month) {
    var churchYear = [];
    churchYear = advent(year).concat(epiphany(year), lentEaster(year), pentecost(year));

    // add scriptures
    for (var index in churchYear) {
        var churchDay = churchYear[index];
        churchDay.scriptures = scriptures(churchDay);
    }

    if (typeof month === 'undefined') {
        return churchYear;
    } else {
        var churchMonth = [];

        churchMonth = churchYear.filter(function (day) {
            if (day.date.getMonth() === month) { return day; }
        } );

        return churchMonth;
    }
};

module.exports.dayMap = function(year, month) {
    var churchYear = module.exports.days(year, month);
    var yearMap = {};

    for (var index in churchYear) {
        var churchDay = churchYear[index];
        yearMap[churchDay.lectionaryShortName] = churchDay;
    }

    return yearMap;
};

module.exports.seasons = function(year) {
    var dayMap = module.exports.dayMap(year);
    var endYear = new Date(year, 11, 31, 23, 59, 59);
    var beginYear = new Date(year, 0, 1, 0, 0, 0);

    return [
        { start: dayMap['Epiphany Day'].date, end: dayMap['Ash Wednesday'].date, name: 'Ordinary Time' },
        { start: dayMap['Ash Wednesday'].date, end: dayMap['Passion'].date, name: 'Lent' },
        { start: dayMap['Passion'].date, end: dayMap['Easter Day'].date, name: 'Holy Week' },
        { start: dayMap['Easter Day'].date, end: dayMap['Pentecost Day'].date, name: 'Easter' },
        { start: dayMap['Pentecost Day'].date, end: dayMap['Advent 1'].date, name: 'Ordinary Time' },
        { start: dayMap['Advent 1'].date, end: dayMap['Christmas Eve'].date, name: 'Advent' },
        { start: dayMap['Christmas Day'].date, end: endYear, name: 'Christmas' },
        { start: beginYear, end: dayMap['Epiphany Day'].date, name: 'Christmas' }
    ];
}

},{"./lib/advent":4,"./lib/epiphany":5,"./lib/lenteaster":7,"./lib/pentecost":8,"./lib/scriptures":9}],4:[function(require,module,exports){
var utils = require('./utils');
var lectUtils = require('./lectionaryUtils');

module.exports = function (year) {
    var date = lectUtils.advent(year);
    var liturgicalYear = lectUtils.liturgicalYearAdvent(year);
    var seasonList = [];

    if (! liturgicalYear) {
      throw 'undefined liturgicalYear for ' + year;
    }

    // Advent
    for (var i = 1; i <= 4; i++) {
      seasonList.push({
        date: date,
        lectionaryYear: liturgicalYear,
        lectionaryShortName: 'Advent ' + i,
        lectionaryLongName: utils.ordinalize(i) + ' Sunday of Advent'
      });
      date = utils.offsetDays(date, 7);
    }

    // Christmas Eve and Day
    var christmas = new Date(year, 11, 25);
    seasonList.push({
      date: utils.offsetDays(christmas, -1),
      lectionaryYear: 'A-B-C',
      lectionaryShortName: "Christmas Eve",
      lectionaryLongName: "Christmas Eve"
    });
    seasonList.push({
      date: christmas,
      lectionaryYear: 'A-B-C',
      lectionaryShortName: "Christmas Day",
      lectionaryLongName: "Christmas Day"
    });

    // Sunday after Christmas
    date = utils.nextWeekday(utils.offsetDays(christmas, 1), 0);
    seasonList.push({
      date: date,
      lectionaryYear: liturgicalYear,
      lectionaryShortName: "Christmas 1",
      lectionaryLongName: "First Sunday after Christmas"
    });
    
    return seasonList;
};
},{"./lectionaryUtils":6,"./utils":10}],5:[function(require,module,exports){
var utils = require('./utils');
var lectUtils = require('./lectionaryUtils');

module.exports = function (year) {
    var date = utils.previousWeekday(lectUtils.epiphany(year), 0);
    var liturgicalYear = lectUtils.liturgicalYearPreAdvent(year);
    var seasonList = [];

    // Epiphany Day
    seasonList.push({
      date: date,
      lectionaryYear: 'A-B-C',
      lectionaryShortName: 'Epiphany Sunday',
      lectionaryLongName: "Sunday of Epiphany"
    });

    seasonList.push({
      date: lectUtils.epiphany(year),
      lectionaryYear: 'A-B-C',
      lectionaryShortName: "Epiphany Day",
      lectionaryLongName: "Epiphany Day"
    });

    // First Sunday after Epiphany
    date = utils.offsetDays(date, 7);
    seasonList.push({
      date: date,
      lectionaryYear: liturgicalYear,
      lectionaryShortName: 'Baptism',
      lectionaryLongName: "Baptism of our Lord"
    });
    date = utils.offsetDays(date, 7);

    // Season of Epiphany
    for (var i = 2; i <= 8; i++) {
      if (date >= lectUtils.transfiguration(year)) { break; }
      seasonList.push({
        date: date,
        lectionaryYear: liturgicalYear,
        lectionaryShortName: 'Epiphany ' + i,
        lectionaryLongName: utils.ordinalize(i) + ' Sunday after Epiphany'
      });
      date = utils.offsetDays(date, 7);
    }


    // Transfiguration
    date = lectUtils.transfiguration(year);
    seasonList.push({
      date: date,
      lectionaryYear: liturgicalYear,
      lectionaryShortName: "Transfiguration",
      lectionaryLongName: "Transfiguration Sunday"
    });
    
    return seasonList;
};
},{"./lectionaryUtils":6,"./utils":10}],6:[function(require,module,exports){
'use strict';
var utils = require('./utils');
var offsetDays = utils.offsetDays;
var previousWeekday = utils.previousWeekday;

// Algorithm: http://www.smart.net/~mmontes/nature1876.html
// Python implementation: http://code.activestate.com/recipes/576517-calculate-easter-western-given-a-year/
var easterDay = function(year) {
    var a = year % 19;
    var b = Math.floor(year / 100);
    var c = year % 100;
    var d = (19 * a + b - Math.floor(b / 4) - Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3) + 15) % 30;
    var e = (32 + 2 * (b % 4) + 2 * Math.floor(c / 4) - d - (c % 4)) % 7;
    var f = d + e - 7 * Math.floor((a + 11 * d + 22 * e) / 451) + 114;
    var month = Math.floor(f / 31) - 1;
    var day = f % 31 + 1;
    return new Date(year, month, day);
};

var advent =  function(year) {
    var christmas = new Date(year, 11, 25);
    var day = christmas.getDay();
    if (day === 0) {
      return offsetDays(christmas, -28);
    } else {
      return offsetDays(previousWeekday(christmas, 0), -21);
    }
  };

module.exports = {
    advent: advent,
    
    epiphany: function (year) {
      return new Date(year, 0, 6);
    },

    transfiguration: function (year) {
      return utils.offsetDays(easterDay(year), -49);
    },

    easterDay: easterDay,

    pentecost: function(year) {
      return offsetDays(this.easterDay(year), 49);
    },

    thanksgivingDayUSA: function (year) {
      var novFirst = new Date(year, 10, 1);
      var dayOfWeek = novFirst.getDay();
      return offsetDays(novFirst, 21 + (11 - dayOfWeek) % 7);
    },

    liturgicalYearPreAdvent: function (year) {
      var cycle = ['A', 'B', 'C'];
      // see https://github.com/revdave33/lectionary/issues/2
      return cycle[((year + 2) % 3)];
    },
    liturgicalYearAdvent: function (year) {
      var cycle = ['A', 'B', 'C'];
      return cycle[(year) % 3];
    }
};

},{"./utils":10}],7:[function(require,module,exports){
var utils = require('./utils');
var lectUtils = require('./lectionaryUtils');

module.exports = function (year) {
    var date = lectUtils.transfiguration(year);
    var liturgicalYear = lectUtils.liturgicalYearPreAdvent(year);
    var seasonList = [];

    // Ash Wednesday
    seasonList.push({
      date: utils.nextWeekday(date, 3),
      lectionaryYear: 'A-B-C',
      lectionaryShortName: 'Ash Wednesday',
      lectionaryLongName: "Ash Wednesday"
    });

    date = utils.offsetDays(date, 7);

    // Season of Lent
    for (var i = 1; i <= 5; i++) {
      seasonList.push({
        date: date,
        lectionaryYear: liturgicalYear,
        lectionaryShortName: 'Lent ' + i,
        lectionaryLongName: utils.ordinalize(i) + ' Sunday of Lent'
      });
      date = utils.offsetDays(date, 7);
    }

    // Palms
    seasonList.push({
      date: date,
      lectionaryYear: liturgicalYear,
      lectionaryShortName: "Palms",
      lectionaryLongName: "Liturgy of the Palms"
    });
     // Passion
    seasonList.push({
      date: date,
      lectionaryYear: liturgicalYear,
      lectionaryShortName: "Passion",
      lectionaryLongName: "Passion Sunday"
    });

    // Holy Thursday
    seasonList.push({
      date: utils.nextWeekday(date, 4),
      lectionaryYear: 'A-B-C',
      lectionaryShortName: "Holy Thursday",
      lectionaryLongName: "Holy Thursday"
    });
     // Good Friday
    seasonList.push({
      date: utils.nextWeekday(date, 5),
      lectionaryYear: 'A-B-C',
      lectionaryShortName: "Good Friday",
      lectionaryLongName: "Good Friday"
    });

     // Easter
    date = lectUtils.easterDay(year);
    seasonList.push({
      date: date,
      lectionaryYear: liturgicalYear,
      lectionaryShortName: "Easter Day",
      lectionaryLongName: "Easter Sunday"
    });
    
    date = utils.offsetDays(date, 7);

    // Season of Easter
    for (i = 2; i <= 7; i++) {
      seasonList.push({
        date: date,
        lectionaryYear: liturgicalYear,
        lectionaryShortName: 'Easter ' + i,
        lectionaryLongName: utils.ordinalize(i) + ' Sunday of Easter'
      });
      date = utils.offsetDays(date, 7);
    }

    // Ascension
    date = utils.offsetDays(lectUtils.easterDay(year), 39);
    seasonList.push({
      date: date,
      lectionaryYear: 'A-B-C',
      lectionaryShortName: "Ascension",
      lectionaryLongName: "Ascension Day"
    });

     // Pentecost
    date = lectUtils.pentecost(year);
    seasonList.push({
      date: date,
      lectionaryYear: liturgicalYear,
      lectionaryShortName: "Pentecost Day",
      lectionaryLongName: "Pentecost Sunday"
    });
    
     // Trinity
    date = utils.offsetDays(date, 7);
    seasonList.push({
      date: date,
      lectionaryYear: liturgicalYear,
      lectionaryShortName: "Trinity",
      lectionaryLongName: "Trinity Sunday"
    });

    return seasonList;
};

},{"./lectionaryUtils":6,"./utils":10}],8:[function(require,module,exports){
var utils = require('./utils');
var lectUtils = require('./lectionaryUtils');

module.exports = function (year) {
    var trinity = utils.offsetDays(lectUtils.pentecost(year), 7);
    var liturgicalYear = lectUtils.liturgicalYearPreAdvent(year);
    var seasonList = [];
    var date = utils.previousWeekday(new Date(year, 4, 27) , 0);
    var sundayName = 2;

    // Season of Pentecost
    for (var i = 3; i <= 29; i++) {
      if (date > trinity) {
        seasonList.push({
          date: date,
          lectionaryYear: liturgicalYear,
          lectionaryShortName: 'Pentecost ' + sundayName,
          lectionaryLongName: utils.ordinalize(sundayName) + ' Sunday after Pentecost'
        });
        sundayName += 1;
      }
      date = utils.offsetDays(date, 7);
    }

    // All Saints
    seasonList.push({
      date: new Date(year, 10, 1),
      lectionaryYear: liturgicalYear,
      lectionaryShortName: "All Saints",
      lectionaryLongName: "All Saints"
    });
     // Thanksgiving
    seasonList.push({
      date: lectUtils.thanksgivingDayUSA(year),
      lectionaryYear: liturgicalYear,
      lectionaryShortName: "Thanksgiving",
      lectionaryLongName: "Thanksgiving"
    });

    return seasonList;
};

},{"./lectionaryUtils":6,"./utils":10}],9:[function(require,module,exports){
var yearA = require('./year-a');
var yearB = require('./year-b');
var yearC = require('./year-c');

module.exports = function (inLectionaryDay) {
	if (inLectionaryDay.lectionaryYear == 'A' || inLectionaryDay.lectionaryYear == 'A-B-C') {			
		var scriptures = yearA[inLectionaryDay.lectionaryShortName];
	} else if (inLectionaryDay.lectionaryYear == 'B') {			
		var scriptures = yearB[inLectionaryDay.lectionaryShortName];
	} else if (inLectionaryDay.lectionaryYear == 'C') {			
		var scriptures = yearC[inLectionaryDay.lectionaryShortName];
	} else {
		throw 'unknown lectionary year ' + JSON.stringify(inLectionaryDay);
	}

	if (! scriptures) {
		throw 'missing scriptures ' + JSON.stringify(inLectionaryDay);
	}

	return scriptures;
}
},{"./year-a":11,"./year-b":12,"./year-c":13}],10:[function(require,module,exports){
var cloneDate = function(date) {
    return new Date(date.getTime());
};

var offsetDays = function(date, offset) {
        return new Date(cloneDate(date).setDate(date.getDate()+offset));
};

module.exports = {
    cloneDate: cloneDate,
    offsetDays: offsetDays,

    nextWeekday: function(date, weekday) {
        var day = date.getDay();
        return offsetDays(date, (7 - day + weekday) % 7);
    },

    previousWeekday: function(date, weekday) {
        var day = date.getDay();
        return offsetDays(date, (weekday - day - 7) % 7);
    },

    ordinalize: function(number) {
        if (11 <= parseInt(number) % 100 && parseInt(number) % 100 <= 13) {
            return number + "th";
        } else {
            switch (parseInt(number) % 10) {
            case  1: return number + "st";
            case  2: return number + "nd";
            case  3: return number + "rd";
            default: return number + "th";
            }
        }
    }
};

},{}],11:[function(require,module,exports){
module.exports={
    "Advent 1": {
        "first": ["Isaiah 2:1-5"],
        "psalm": ["Psalm 122"],
        "second": ["Romans 13:11-14"],
        "gospel": ["Matthew 24:36-44"]
    },
    "Advent 2": {
        "first": ["Isaiah 11:1-10"],
        "psalm": ["Psalm 72:1-7, 18-19"],
        "second": ["Romans 15:4-13"],
        "gospel": ["Matthew 3:1-12"]
    },
    "Thanksgiving": {
        "first": ["Deuteronomy 8:7-18"],
        "psalm": ["Psalm 65"],
        "second": ["2 Corinthians 9:6-15"],
        "gospel": ["Luke 17:11-19"]
    },
    "Advent 3": {
        "first": ["Isaiah35:1-10"],
        "psalm": ["Psalm 146:5-10", "Luke 1:46b-55"],
        "second": ["James 5:7-10"],
        "gospel": ["Matthew 11:2-11"]
    },
    "Advent 4": {
        "first": ["Isaiah 7:10-16"],
        "psalm": ["Psalm 80:1-7, 17-19"],
        "second": ["Romans 1:1-7"],
        "gospel": ["Matthew 1:18-25"]
    },
    "Christmas Eve": {
        "first": ["Isaiah 9:2-7"],
        "psalm": ["Psalm 96"],
        "second": ["Titus 2:11-14"],
        "gospel": ["Luke 2:1-14 [15-20]"]
    },
    "Christmas Day": {
        "first": ["Isaiah 62:6-12"],
        "psalm": ["Psalm 97"],
        "second": ["Titus 3:4-7"],
        "gospel": ["Luke 2:[1-7] 8-20"]
    },
    "Christmas 1": {
        "first": ["Isaiah 61:10-62:3"],
        "psalm": ["Psalm 148"],
        "second": ["Galatians 4:4-7"],
        "gospel": ["Luke 2:22-40"]
    },
    "Epiphany Sunday": {
        "first": ["Isaiah 60:1-6"],
        "psalm": ["Psalm 72:1-7, 10-14"],
        "second": ["Ephesians 3:1-12"],
        "gospel": ["Matthew 2:1-12"]
    },
    "Epiphany Day": {
        "first": ["Isaiah 60:1-6"],
        "psalm": ["Psalm 72:1-7, 10-14"],
        "second": ["Ephesians 3:1-12"],
        "gospel": ["Matthew 2:1-12"]
    },
    "Baptism": {
        "first": ["Isaiah 42:1-9"],
        "psalm": ["Psalm 29"],
        "second": ["Acts 10:34-43"],
        "gospel": ["Matthew 3:13-17"]
    },
    "Epiphany 2": {
        "first": ["Isaiah 49:1-7"],
        "psalm": ["Psalm 40:1-11"],
        "second": ["1 Corinthians 1:1-9"],
        "gospel": ["John 1:29-42"]
    },
    "Epiphany 3": {
        "first": ["Isaiah 9:1-4"],
        "psalm": ["Psalm 27:1, 4-9"],
        "second": ["1 Corinthians 1:10-18"],
        "gospel": ["Matthew 4:12-23"]
    },
    "Epiphany 4": {
        "first": ["Micah 6:1-8"],
        "psalm": ["Psalm 15"],
        "second": ["1 Corinthians 1:18-31"],
        "gospel": ["Matthew 5:1-12"]
    },
    "Epiphany 5": {
        "first": ["Isaiah 58:1-9a [9b-12]"],
        "psalm": ["Psalm 112:1-9 [10]"],
        "second": ["1 Corinthians 2:1-12 [13-16]"],
        "gospel": ["Matthew 5:13-20"]
    },
    "Epiphany 6": {
        "first": ["Deuteronomy 30:15-20", "Sirach 15:15-20"],
        "psalm": ["Psalm 119:1-8"],
        "second": ["1 Corinthians 3:1-9"],
        "gospel": ["Matthew 5:21-37"]
    },
    "Epiphany 7": {
        "first": ["Leviticus 19:1-2, 9-18"],
        "psalm": ["Psalm 119:33-40"],
        "second": ["1 Corinthians 3:10-11, 16-23"],
        "gospel": ["Matthew 5:38-48"]
    },
    "Epiphany 8": {
        "first": ["Isaiah 49:8-16a"],
        "psalm": ["Psalm 131"],
        "second": ["1 Corinthians 4:1-5"],
        "gospel": ["Matthew 6:24-34"]
    },
    "Epiphany 9": {
        "first": ["Deuteronomy 11:18-21, 26-28"],
        "psalm": ["Psalm 31:1-5, 19-24"],
        "second": ["Romans 1:16-17; 3:22b-28 [29-31]"],
        "gospel": ["Matthew 7:21-29"]
    },
    "Transfiguration": {
        "first": ["Exodus 24:12-18"],
        "psalm": ["Psalm 2", "Psalm 99"],
        "second": ["2 Peter 1:16-21"],
        "gospel": ["Matthew 17:1-9"]
    },
    "Ash Wednesday": {
        "first": ["Joel 2:1-2, 12-17", "Isaiah 58:1-12"],
        "psalm": ["Psalm 51:1-17"],
        "second": ["2 Corinthians 5:20b-6:10"],
        "gospel": ["Matthew 6:1-6, 16-21"]
    },
    "Lent 1": {
        "first": ["Genesis 2:15-17; 3:1-7"],
        "psalm": ["Psalm 32"],
        "second": ["Romans 5:12-19"],
        "gospel": ["Matthew 4:1-11"]
    },
    "Lent 2": {
        "first": ["Genesis 12:1-4a"],
        "psalm": ["Psalm 121"],
        "second": ["Romans 4:1-5, 13-17"],
        "gospel": ["John 3:1-17", "Matthew 17:1-9"]
    },
    "Lent 3": {
        "first": ["Exodus 17:1-7"],
        "psalm": ["Psalm 95"],
        "second": ["Romans 5:1-11"],
        "gospel": ["John 4:5-42"]
    },
    "Lent 4": {
        "first": ["1 Samuel 16:1-13"],
        "psalm": ["Psalm 23"],
        "second": ["Ephesians 5:8-14"],
        "gospel": ["John 9:1-41"]
    },
    "Lent 5": {
        "first": ["Ezekiel 37:1-14"],
        "psalm": ["Psalm 130"],
        "second": ["Romans 8:6-11"],
        "gospel": ["John 11:1-45"]
    },
    "Palms": {
        "first": ["Isaiah 50:4-9a"],
        "psalm": ["Psalm 31:9-16"],
        "second": ["Philippians 2:5-11"],
        "gospel": ["Matthew 21:1-11"]
    },
    "Passion": {
        "first": ["Isaiah 50:4-9a"],
        "psalm": ["Psalm 31:9-16"],
        "second": ["Philippians 2:5-11"],
        "gospel": ["Matthew 26:14-27:66", "Matthew 27:11-54"]
    },
    "Holy Thursday": {
        "first": ["Exodus 12:1-4 [5-10] 11-14"],
        "psalm": ["Psalm 116:1-2, 12-19"],
        "second": ["1 Corinthians 11:23-26"],
        "gospel": ["John 13:1-17, 31b-35"]
    },
    "Good Friday": {
        "first": ["Isaiah 52:13-53:12"],
        "psalm": ["Psalm 22"],
        "second": ["Hebrews 10:16-25", "Hebrews 4:14-16; 5:7-9"],
        "gospel": ["John 18:1-19:42"]
    },
    "Easter Day": {
        "first": ["Acts 10:34-43", "Isaiah 25:6-9"],
        "psalm": ["Psalm 118:1-2, 14-24"],
        "second": ["1 Corinthians 15:1-11", "Acts 10:34-43"],
        "gospel": ["John 20:1-18", "Mark 16:1-8"]
    },
    "Easter 2": {
        "first": ["Acts 2:14a, 22-32"],
        "psalm": ["Psalm 16"],
        "second": ["1 Peter 1:3-9"],
        "gospel": ["John 20:19-31"]
    },
    "Easter 3": {
        "first": ["Acts 2:14a, 36-41"],
        "psalm": ["Psalm 116:1-4, 12-19"],
        "second": ["1 Peter 1:17-23"],
        "gospel": ["Luke 24:13-35"]
    },
    "Easter 4": {
        "first": ["Acts 2:42-47"],
        "psalm": ["Psalm 23"],
        "second": ["1 Peter 2:19-25"],
        "gospel": ["John 10:1-10"]
    },
    "Easter 5": {
        "first": ["Acts 7:55-60"],
        "psalm": ["Psalm 31:1-5, 15-16"],
        "second": ["1 Peter 2:2-10"],
        "gospel": ["John 14:1-14"]
    },
    "Easter 6": {
        "first": ["Acts 17:22-31"],
        "psalm": ["Psalm 66:8-20"],
        "second": ["1 Peter 3:13-22"],
        "gospel": ["John 14:15-21"]
    },
    "Easter 7": {
        "first": ["Acts 1:6-14"],
        "psalm": ["Psalm 68:1-10, 32-35"],
        "second": ["1 Peter 4:12-14; 5:6-11"],
        "gospel": ["John 17:1-11"]
    },
    "Ascension": {
        "first": ["Acts 1:1-11"],
        "psalm": ["Psalm 47", "Psalm 93"],
        "second": ["Ephesians 1:15-23"],
        "gospel": ["Luke 24:44-53"]
    },
    "Pentecost Day": {
        "first": ["Acts 2:1-21", "Numbers 11:24-30"],
        "psalm": ["Psalm 104:24-34, 35b"],
        "second": ["1 Corinthians 12:3b-13", "Acts 2:1-21"],
        "gospel": ["John 20:19-23", "John 7:37-39"]
    },
    "Trinity": {
        "first": ["Genesis 1:1-2:4a"],
        "psalm": ["Psalm 8"],
        "second": ["2 Corinthians 13:11-13"],
        "gospel": ["Matthew 28:16-20"]
    },
    "WEIRD YEAR A EIGHT SUNDAY AFTER EPIPHANY Pentecost 2": {
        "first": ["Isaiah 49:8-16a"],
        "psalm": ["Psalm 131"],
        "second": ["1 Corinthians 4:1-5"],
        "gospel": ["Matthew 6:24-34"]
    },
    "WEIRD YEAR A NINTH SUNDAY AFTER EPIPHANY Pentecost 3": {
        "complementary": {
            "first": ["Deuteronomy 11:18-21, 26-28"],
            "psalm": ["Psalm 31:1-5, 19-24"],
            "second": ["Romans 1:16-17; 3:22b-28 [29-31]"],
            "gospel": ["Matthew 7:21-29"]
        },
        "semicontinuous": {
            "first": ["Genesis 6:9-22; 7:24; 8:14-19"],
            "psalm": ["Psalm 46"],
            "second": ["Romans 1:16-17; 3:22b-28 [29-31]"],
            "gospel": ["Matthew 7:21-29"]
        }
    },
    "WEIRD YEAR A TENTH SUNDAY AFTER EPIPHANY Pentecost 4": {
        "complementary": {
            "first": ["Hosea 5:15-6:6"],
            "psalm": ["Psalm 50:7-15"],
            "second": ["Romans 4:13-25"],
            "gospel": ["Matthew 9:9-13, 18-26"]
        },
        "semicontinuous": {
            "first": ["Genesis 12:1-9"],
            "psalm": ["Psalm 33:1-12"],
            "second": ["Romans 4:13-25"],
            "gospel": ["Matthew 9:9-13, 18-26"]
        }
    },
    "Pentecost 2": {
        "complementary": {
            "first": ["Exodus 19:2-8a"],
            "psalm": ["Psalm 100"],
            "second": ["Romans 5:1-8"],
            "gospel": ["Matthew 9:35-10:8 [9-23]"]
        },
        "semicontinuous": {
            "first": ["Genesis 18:1-15 [21:1-7]"],
            "psalm": ["Psalm 116:1-2, 12-19"],
            "second": ["Romans 5:1-8"],
            "gospel": ["Matthew 9:35-10:8 [9-23]"]
        }
    },
    "Pentecost 3": {
        "complementary": {
            "first": ["Jeremiah 20:7-13"],
            "psalm": ["Psalm 69:7-10 [11-15] 16-18"],
            "second": ["Romans 6:1b-11"],
            "gospel": ["Matthew 10:24-39"]
        },
        "semicontinuous": {
            "first": ["Genesis 21:8-21"],
            "psalm": ["Psalm 86:1-10, 16-17"],
            "second": ["Romans 6:1b-11"],
            "gospel": ["Matthew 10:24-39"]
        }
    },
    "Pentecost 4": {
        "complementary": {
            "first": ["Jeremiah 28:5-9"],
            "psalm": ["Psalm 89:1-4, 15-18"],
            "second": ["Romans 6:12-23"],
            "gospel": ["Matthew 10:40-42"]
        },
        "semicontinuous": {
            "first": ["Genesis 22:1-14"],
            "psalm": ["Psalm 13"],
            "second": ["Romans 6:12-23"],
            "gospel": ["Matthew 10:40-42"]
        }
    },
    "Pentecost 5": {
        "complementary": {
            "first": ["Zechariah 9:9-12"],
            "psalm": ["Psalm 145:8-14"],
            "second": ["Romans 7:15-25a"],
            "gospel": ["Matthew 11:16-19, 25-30"]
        },
        "semicontinuous": {
            "first": ["Genesis 24:34-38, 42-49, 58-67"],
            "psalm": ["Psalm 45:10-17", "Song of Solomon 2:8-13"],
            "second": ["Romans 7:15-25a"],
            "gospel": ["Matthew 11:16-19, 25-30"]
        }
    },
    "Pentecost 6": {
        "complementary": {
            "first": ["Isaiah 55:10-13"],
            "psalm": ["Psalm 65:[1-8] 9-13"],
            "second": ["Romans 8:1-11"],
            "gospel": ["Matthew 13:1-9, 18-23"]
        },
        "semicontinuous": {
            "first": ["Genesis 25:19-34"],
            "psalm": ["Psalm 119:105-112"],
            "second": ["Romans 8:1-11"],
            "gospel": ["Matthew 13:1-9, 18-23"]
        }
    },
    "Pentecost 7": {
        "complementary": {
            "first": ["Wisdom 12:13, 16-19", "Isaiah 44:6-8"],
            "psalm": ["Psalm 86:11-17"],
            "second": ["Romans 8:12-25"],
            "gospel": ["Matthew 13:24-30, 36-43"]
        },
        "semicontinuous": {
            "first": ["Genesis 28:10-19a"],
            "psalm": ["Psalm 139:1-12, 23-24"],
            "second": ["Romans 8:12-25"],
            "gospel": ["Matthew 13:24-30, 36-43"]
        }
    },
    "Pentecost 8": {
        "complementary": {
            "first": ["1 Kings 3:5-12"],
            "psalm": ["Psalm 119:129-136"],
            "second": ["Romans 8:26-39"],
            "gospel": ["Matthew 13:31-33, 44-52"]
        },
        "semicontinuous": {
            "first": ["Genesis 29:15-28"],
            "psalm": ["Psalm 105:1-11, 45b", "Psalm 128"],
            "second": ["Romans 8:26-39"],
            "gospel": ["Matthew 13:31-33, 44-52"]
        }
    },
    "Pentecost 9": {
        "complementary": {
            "first": ["Isaiah 55:1-5"],
            "psalm": ["Psalm 145:8-9, 14-21"],
            "second": ["Romans 9:1-5"],
            "gospel": ["Matthew 14:13-21"]
        },
        "semicontinuous": {
            "first": ["Genesis 32:22-31"],
            "psalm": ["Psalm 17:1-7, 15"],
            "second": ["Romans 9:1-5"],
            "gospel": ["Matthew 14:13-21"]
        }
    },
    "Pentecost 10": {
        "complementary": {
            "first": ["1 Kings 19:9-18"],
            "psalm": ["Psalm 85:8-13"],
            "second": ["Romans 10:5-15"],
            "gospel": ["Matthew 14:22-33"]
        },
        "semicontinuous": {
            "first": ["Genesis 37:1-4, 12-28"],
            "psalm": ["Psalm 105:1-6, 16-22, 45b"],
            "second": ["Romans 10:5-15"],
            "gospel": ["Matthew 14:22-33"]
        }
    },
    "Pentecost 11": {
        "complementary": {
            "first": ["Isaiah 56:1, 6-8"],
            "psalm": ["Psalm 67"],
            "second": ["Romans 11:1-2a, 29-32"],
            "gospel": ["Matthew 15:[10-20] 21-28"]
        },
        "semicontinuous": {
            "first": ["Genesis 45:1-15"],
            "psalm": ["Psalm 133"],
            "second": ["Romans 11:1-2a, 29-32"],
            "gospel": ["Matthew 15:[10-20] 21-28"]
        }
    },
    "Pentecost 12": {
        "complementary": {
            "first": ["Isaiah 51:1-6"],
            "psalm": ["Psalm 138"],
            "second": ["Romans 12:1-8"],
            "gospel": ["Matthew 16:13-20"]
        },
        "semicontinuous": {
            "first": ["Exodus 1:8-2:10"],
            "psalm": ["Psalm 124"],
            "second": ["Romans 12:1-8"],
            "gospel": ["Matthew 16:13-20"]
        }
    },
    "Pentecost 13": {
        "complementary": {
            "first": ["Jeremiah 15:15-21"],
            "psalm": ["Psalm 26:1-8"],
            "second": ["Romans 12:9-21"],
            "gospel": ["Matthew 16:21-28"]
        },
        "semicontinuous": {
            "first": ["Exodus 3:1-15"],
            "psalm": ["Psalm 105:1-6, 23-26, 45b"],
            "second": ["Romans 12:9-21"],
            "gospel": ["Matthew 16:21-28"]
        }
    },
    "Pentecost 14": {
        "complementary": {
            "first": ["Ezekiel 33:7-11"],
            "psalm": ["Psalm 119:33-40"],
            "second": ["Romans 13:8-14"],
            "gospel": ["Matthew 18:15-20"]
        },
        "semicontinuous": {
            "first": ["Exodus 12:1-14"],
            "psalm": ["Psalm 149"],
            "second": ["Romans 13:8-14"],
            "gospel": ["Matthew 18:15-20"]
        }
    },
    "Pentecost 15": {
        "complementary": {
            "first": ["Genesis 50:15-21"],
            "psalm": ["Psalm 103:[1-7] 8-13"],
            "second": ["Romans 14:1-12"],
            "gospel": ["Matthew 18:21-35"]
        },
        "semicontinuous": {
            "first": ["Exodus 14:19-31"],
            "psalm": ["Psalm 114", "Exodus 15:1b-11, 20-21"],
            "second": ["Romans 14:1-12"],
            "gospel": ["Matthew 18:21-35"]
        }
    },
    "Pentecost 16": {
        "complementary": {
            "first": ["Jonah 3:10-4:11"],
            "psalm": ["Psalm 145:1-8"],
            "second": ["Philippians 1:21-30"],
            "gospel": ["Matthew 20:1-16"]
        },
        "semicontinuous": {
            "first": ["Exodus 16:2-15"],
            "psalm": ["Psalm 105:1-6, 37-45"],
            "second": ["Philippians 1:21-30"],
            "gospel": ["Matthew 20:1-16"]
        }
    },
    "Pentecost 17": {
        "complementary": {
            "first": ["Ezekiel 18:1-4, 25-32"],
            "psalm": ["Psalm 25:1-9"],
            "second": ["Philippians 2:1-13"],
            "gospel": ["Matthew 21:23-32"]
        },
        "semicontinuous": {
            "first": ["Exodus 17:1-7"],
            "psalm": ["Psalm 78:1-4, 12-16"],
            "second": ["Philippians 2:1-13"],
            "gospel": ["Matthew 21:23-32"]
        }
    },
    "Pentecost 18": {
        "complementary": {
            "first": ["Isaiah 5:1-7"],
            "psalm": ["Psalm 80:7-15"],
            "second": ["Philippians 3:4b-14"],
            "gospel": ["Matthew 21:33-46"]
        },
        "semicontinuous": {
            "first": ["Exodus 20:1-4, 7-9, 12-20"],
            "psalm": ["Psalm 19"],
            "second": ["Philippians 3:4b-14"],
            "gospel": ["Matthew 21:33-46"]
        }
    },
    "Pentecost 19": {
        "complementary": {
            "first": ["Isaiah 25:1-9"],
            "psalm": ["Psalm 23"],
            "second": ["Philippians 4:1-9"],
            "gospel": ["Matthew 22:1-14"]
        },
        "semicontinuous": {
            "first": ["Exodus 32:1-14"],
            "psalm": ["Psalm 106:1-6, 19-23"],
            "second": ["Philippians 4:1-9"],
            "gospel": ["Matthew 22:1-14"]
        }
    },
    "Pentecost 20": {
        "complementary": {
            "first": ["Isaiah 45:1-7"],
            "psalm": ["Psalm 96:1-9 [10-13]"],
            "second": ["1 Thessalonians 1:1-10"],
            "gospel": ["Matthew 22:15-22"]
        },
        "semicontinuous": {
            "first": ["Exodus 33:12-23"],
            "psalm": ["Psalm 99"],
            "second": ["1 Thessalonians 1:1-10"],
            "gospel": ["Matthew 22:15-22"]
        }
    },
    "All Saints": {
        "first": ["Isaiah 25:6-9"],
        "psalm": ["Psalm 24 (5)"],
        "second": ["Revelation 21:1-6a"],
        "gospel": ["John 11:32-44"]
    },
    "Pentecost 21": {
        "complementary": {
            "first": ["Leviticus 19:1-2, 15-18"],
            "psalm": ["Psalm 1"],
            "second": ["1 Thessalonians 2:1-8"],
            "gospel": ["Matthew 22:34-46"]
        },
        "semicontinuous": {
            "first": ["Deuteronomy 34:1-12"],
            "psalm": ["Psalm 90:1-6, 13-17"],
            "second": ["1 Thessalonians 2:1-8"],
            "gospel": ["Matthew 22:34-46"]
        }
    },
    "Pentecost 22": {
        "complementary": {
            "first": ["Micah 3:5-12"],
            "psalm": ["Psalm 43"],
            "second": ["1 Thessalonians 2:9-13"],
            "gospel": ["Matthew 23:1-12"]
        },
        "semicontinuous": {
            "first": ["Joshua 3:7-17"],
            "psalm": ["Psalm 107:1-7, 33-37"],
            "second": ["1 Thessalonians 2:9-13"],
            "gospel": ["Matthew 23:1-12"]
        }
    },
    "Pentecost 23": {
        "complementary": {
            "first": ["Wisdom 6:12-16", "Amos 5:18-24"],
            "psalm": ["Wisdom 6:17-20", "Psalm 70"],
            "second": ["1 Thessalonians 4:13-18"],
            "gospel": ["Matthew 25:1-13"]
        },
        "semicontinuous": {
            "first": ["Joshua 24:1-3a, 14-25"],
            "psalm": ["Psalm 78:1-7"],
            "second": ["1 Thessalonians 4:13-18"],
            "gospel": ["Matthew 25:1-13"]
        }
    },
    "Pentecost 24": {
        "complementary": {
            "first": ["Zephaniah 1:7, 12-18"],
            "psalm": ["Psalm 90:1-8 [9-11] 12"],
            "second": ["1 Thessalonians 5:1-11"],
            "gospel": ["Matthew 25:14-30"]
        },
        "semicontinuous": {
            "first": ["Judges 4:1-7"],
            "psalm": ["Psalm 123"],
            "second": ["1 Thessalonians 5:1-11"],
            "gospel": ["Matthew 25:14-30"]
        }
    },
    "Pentecost 25": {
        "complementary": {
            "first": ["Ezekiel 34:11-16, 20-24"],
            "psalm": ["Psalm 95:1-7a"],
            "second": ["Ephesians 1:15-23"],
            "gospel": ["Matthew 25:31-46"]
        },
        "semicontinuous": {
            "first": ["Ezekiel 34:11-16, 20-24"],
            "psalm": ["Psalm 100"],
            "second": ["Ephesians 1:15-23"],
            "gospel": ["Matthew 25:31-46"]
        }
    }
}

},{}],12:[function(require,module,exports){
module.exports={
    "Advent 1": {
        "first": ["Isaiah 64:1-9"],
        "psalm": ["Psalm 80:1-7, 17-19"],
        "second": ["1 Corinthians 1:3-9"],
        "gospel": ["Mark 13:24-37"]
    },
    "Advent 2": {
        "first": ["Isaiah 40:1-11"],
        "psalm": ["Psalm 85:1-2, 8-13"],
        "second": ["2 Peter 3:8-15a"],
        "gospel": ["Mark 1:1-8"]
    },
    "Thanksgiving": {
        "first": ["Deuteronomy 8:7-18"],
        "psalm": ["Psalm 65"],
        "second": ["2 Corinthians 9:6-15"],
        "gospel": ["Luke 17:11-19"]
    },
    "Advent 3": {
        "first": ["Isaiah 61:1-4, 8-11"],
        "psalm": ["Psalm 126", "Luke 1:46b-55"],
        "second": ["1 Thessalonians 5:16-24"],
        "gospel": ["John 1:6-8, 19-28"]
    },
    "Advent 4": {
        "first": ["2 Samuel 7:1-11, 16"],
        "psalm": ["Luke 1:46b-55", "Psalm 89:1-4, 19-26"],
        "second": ["Romans 16:25-27"],
        "gospel": ["Luke 1:26-38"]
    },
    "Christmas Eve": {
        "first": ["Isaiah 9:2-7"],
        "psalm": ["Psalm 96"],
        "second": ["Titus 2:11-14"],
        "gospel": ["Luke 2:1-14 [15-20]"]
    },
    "Christmas Day": {
        "first": ["Isaiah 62:6-12"],
        "psalm": ["Psalm 97"],
        "second": ["Titus 3:4-7"],
        "gospel": ["Luke 2:[1-7] 8-20"]
    },
    "Christmas 1": {
        "first": ["Isaiah 61:10-62:3"],
        "psalm": ["Psalm 148"],
        "second": ["Galatians 4:4-7"],
        "gospel": ["Luke 2:22-40"]
    },
    "Epiphany Sunday": {
        "first": ["Isaiah 60:1-6"],
        "psalm": ["Psalm 72:1-7, 10-14"],
        "second": ["Ephesians 3:1-12"],
        "gospel": ["Matthew 2:1-12"]
    },
    "Epiphany Day": {
        "first": ["Isaiah 60:1-6"],
        "psalm": ["Psalm 72:1-7, 10-14"],
        "second": ["Ephesians 3:1-12"],
        "gospel": ["Matthew 2:1-12"]
    },
    "Baptism": {
        "first": ["Genesis 1:1-5"],
        "psalm": ["Psalm 29"],
        "second": ["Acts 19:1-7"],
        "gospel": ["Mark 1:4-11"]
    },
    "Epiphany 2": {
        "first": ["1 Samuel 3:1-10 [11-20"],
        "psalm": ["Psalm 139:1-6, 13-18"],
        "second": ["1 Corinthians 6:12-20"],
        "gospel": ["John 1:43-51"]
    },
    "Epiphany 3": {
        "first": ["Jonah 3:1-5, 10"],
        "psalm": ["Psalm 62:5-12"],
        "second": ["1 Corinthians 7:29-31"],
        "gospel": ["Mark 1:14-20"]
    },
    "Epiphany 4": {
        "first": ["Deuteronomy 18:15-20"],
        "psalm": ["Psalm 111"],
        "second": ["1 Corinthians 8:1-13"],
        "gospel": ["Mark 1:21-28"]
    },
    "Epiphany 5": {
        "first": ["Isaiah 40:21-31"],
        "psalm": ["Psalm 147:1-11, 20c"],
        "second": ["1 Corinthians 9:16-23"],
        "gospel": ["Mark 1:29-39"]
    },
    "Epiphany 6": {
        "first": ["2 Kings 5:1-14"],
        "psalm": ["Psalm 30"],
        "second": ["1 Corinthians 9:24-27"],
        "gospel": ["Mark 1:40-45"]
    },
    "Epiphany 7": {
        "first": ["Isaiah 43:18-25"],
        "psalm": ["Psalm 41"],
        "second": ["2 Corinthians 1:18-22"],
        "gospel": ["Mark 2:1-12"]
    },
    "Epiphany 8": {
        "first": ["Hosea 2:14-20"],
        "psalm": ["Psalm 103:1-13, 22"],
        "second": ["2 Corinthians 3:1-6"],
        "gospel": ["Mark 2:13-22"]
    },
    "Epiphany 9": {
        "first": ["Deuteronomy 5:12-15"],
        "psalm": ["Psalm 81:1-10"],
        "second": ["2 Corinthians 4:5-12"],
        "gospel": ["Mark 2:23-3:6"]
    },
    "Transfiguration": {
        "first": ["2 Kings 2:1-12"],
        "psalm": ["Psalm 50:1-6"],
        "second": ["2 Corinthians 4:3-6"],
        "gospel": ["Mark 9:2-9"]
    },
    "Ash Wednesday": {
        "first": ["Joel 2:1-2, 12-17", "Isaiah 58:1-12"],
        "psalm": ["Psalm 51:1-17"],
        "second": ["2 Corinthians 5:20b-6:10"],
        "gospel": ["Matthew 6:1-6, 16-21"]
    },
    "Lent 1": {
        "first": ["Genesis 9:8-17"],
        "psalm": ["Psalm 25:1-10"],
        "second": ["1 Peter 3:18-22"],
        "gospel": ["Mark 1:9-15"]
    },
    "Lent 2": {
        "first": ["Genesis 17:1-7, 15-16"],
        "psalm": ["Psalm 22:23-31"],
        "second": ["Romans 4:13-25"],
        "gospel": ["Mark 8:31-38", "Mark 9:2-9"]
    },
    "Lent 3": {
        "first": ["Exodus 20:1-17"],
        "psalm": ["Psalm 19"],
        "second": ["1 Corinthians 1:18-25"],
        "gospel": ["John 2:13-22"]
    },
    "Lent 4": {
        "first": ["Numbers 21:4-9"],
        "psalm": ["Psalm 107:1-3, 17-22"],
        "second": ["Ephesians 2:1-10"],
        "gospel": ["John 3:14-21"]
    },
    "Lent 5": {
        "first": ["Jeremiah 31:31-34"],
        "psalm": ["Psalm 51:1-12", "Psalm 119:9-16"],
        "second": ["Hebrews 5:5-10"],
        "gospel": ["John 12:20-33"]
    },
    "Palms": {
        "first": ["Isaiah 50:4-9a"],
        "psalm": ["Psalm 31:9-16"],
        "second": ["Philippians 2:5-11"],
        "gospel": ["Mark 11:1-11", "John 12:12-16"]
    },
    "Passion": {
        "first": ["Isaiah 50:4-9a"],
        "psalm": ["Psalm 31:9-16"],
        "second": ["Philippians 2:5-11"],
        "gospel": ["Mark 14:1-15:47", "Mark 15:1-39 [40-47]"]
    },
    "Holy Thursday": {
        "first": ["Exodus 12:1-4 [5-10] 11-14"],
        "psalm": ["Psalm 116:1-2, 12-19"],
        "second": ["1 Corinthians 11:23-26"],
        "gospel": ["John 13:1-17, 31b-35"]
    },
    "Good Friday": {
        "first": ["Isaiah 52:13-53:12"],
        "psalm": ["Psalm 22"],
        "second": ["Hebrews 10:16-25", "Hebrews 4:14-16; 5:7-9"],
        "gospel": ["John 18:1-19:42"]
    },
    "Easter Day": {
        "first": ["Acts 10:34-43", "Isaiah 25:6-9"],
        "psalm": ["Psalm 118:1-2, 14-24"],
        "second": ["1 Corinthians 15:1-11", "Acts 10:34-43"],
        "gospel": ["John 20:1-18", "Mark 16:1-8"]
    },
    "Easter 2": {
        "first": ["Acts 4:32-35"],
        "psalm": ["Psalm 133"],
        "second": ["1 John 1:1-2:2"],
        "gospel": ["John 20:19-31"]
    },
    "Easter 3": {
        "first": ["Acts 3:12-19"],
        "psalm": ["Psalm 4"],
        "second": ["1 John 3:1-7"],
        "gospel": ["Luke 24:36b-48"]
    },
    "Easter 4": {
        "first": ["Acts 4:5-12"],
        "psalm": ["Psalm 23"],
        "second": ["1 John 3:16-24"],
        "gospel": ["John 10:11-18"]
    },
    "Easter 5": {
        "first": ["Acts 8:26-40"],
        "psalm": ["Psalm 22:25-31"],
        "second": ["1 John 4:7-21"],
        "gospel": ["John 15:1-8"]
    },
    "Easter 6": {
        "first": ["Acts 10:44-48"],
        "psalm": ["Psalm 98"],
        "second": ["1 John 5:1-6"],
        "gospel": ["John 15:9-17"]
    },
    "Easter 7": {
        "first": ["Acts 1:15-17, 21-26"],
        "psalm": ["Psalm 1"],
        "second": ["1 John 5:9-13"],
        "gospel": ["John 17:6-19"]
    },
    "Ascension": {
        "first": ["Acts 1:1-11"],
        "psalm": ["Psalm 47", "Psalm 93"],
        "second": ["Ephesians 1:15-23"],
        "gospel": ["Luke 24:44-53"]
    },
    "Pentecost Day": {
        "first": ["Acts 2:1-21", "Ezekiel 37:1-14"],
        "psalm": ["Psalm 104:24-34, 35b"],
        "second": ["Romans 8:22-27", "Acts 2:1-21"],
        "gospel": ["John 15:26-27; 16:4b-15"]
    },
    "Trinity": {
        "first": ["Isaiah 6:1-8"],
        "psalm": ["Psalm 29"],
        "second": ["Romans 8:12-17"],
        "gospel": ["John 3:1-17"]
    },
    "Pentecost 2": {
        "first": ["Hosea 2:14-20"],
        "psalm": ["Psalm 103:1-13, 22"],
        "second": ["2 Corinthians 3:1-6"],
        "gospel": ["Mark 2:13-22"]
    },
    "Pentecost 3": {
        "complementary": {
            "first": ["Deuteronomy 5:12-15"],
            "psalm": ["Psalm 81:1-10"],
            "second": ["2 Corinthians 4:5-12"],
            "gospel": ["Mark 2:23-3:6"]
        },
        "semicontinuous": {
            "first": ["1 Samuel 3:1-10 [11-20]"],
            "psalm": ["Psalm 139:1-6, 13-18"],
            "second": ["2 Corinthians 4:5-12"],
            "gospel": ["Mark 2:23-3:6"]
        }
    },
    "Pentecost 4": {
        "complementary": {
            "first": ["Genesis 3:8-15"],
            "psalm": ["Psalm 130"],
            "second": ["2 Corinthians 4:13-5:1"],
            "gospel": ["Mark 3:20-35"]
        },
        "semicontinuous": {
            "first": ["1 Samuel 8:4-11 [12-15] 16-20 [11:14-15]"],
            "psalm": ["Psalm 138"],
            "second": ["2 Corinthians 4:13-5:1"],
            "gospel": ["Mark 3:20-35"]
        }
    },
    "Pentecost 5": {
        "complementary": {
            "first": ["Ezekiel 17:22-24"],
            "psalm": ["Psalm 92:1-4, 12-15"],
            "second": ["2 Corinthians 5:6-10 [11-13] 14-17"],
            "gospel": ["Mark 4:26-34"]
        },
        "semicontinuous": {
            "first": ["1 Samuel 15:34-16:13"],
            "psalm": ["Psalm 20"],
            "second": ["2 Corinthians 5:6-10 [11-13] 14-17"],
            "gospel": ["Mark 4:26-34"]
        }
    },
    "Pentecost 6": {
        "complementary": {
            "first": ["Job 38:1-11"],
            "psalm": ["Psalm 107:1-3, 23-32"],
            "second": ["2 Corinthians 6:1-13"],
            "gospel": ["Mark 4:35-41"]
        },
        "semicontinuous": {
            "first": ["1 Samuel 17:[1a, 4-11, 19-23] 32-49", "1 Samuel 17:57-18:5, 10-16"],
            "psalm": ["Psalm 9:9-20", "Psalm 133"],
            "second": ["2 Corinthians 6:1-13"],
            "gospel": ["Mark 4:35-41"]
        }
    },
    "Pentecost 7": {
        "complementary": {
            "first": ["Lamentations 3:22-33"],
            "psalm": ["Psalm 30 (1)"],
            "second": ["2 Corinthians 8:7-15"],
            "gospel": ["Mark 5:21-43"]
        },
        "semicontinuous": {
            "first": ["2 Samuel 1:1, 17-27"],
            "psalm": ["Psalm 130 (1)"],
            "second": ["2 Corinthians 8:7-15"],
            "gospel": ["Mark 5:21-43"]
        }
    },
    "Pentecost 8": {
        "complementary": {
            "first": ["Ezekiel 2:1-5"],
            "psalm": ["Psalm 123"],
            "second": ["2 Corinthians 12:2-10"],
            "gospel": ["Mark 6:1-13"]
        },
        "semicontinuous": {
            "first": ["2 Samuel 5:1-5, 9-10"],
            "psalm": ["Psalm 48"],
            "second": ["2 Corinthians 12:2-10"],
            "gospel": ["Mark 6:1-13"]
        }
    },
    "Pentecost 9": {
        "complementary": {
            "first": ["Amos 7:7-15"],
            "psalm": ["Psalm 85:8-13"],
            "second": ["Ephesians 1:3-14"],
            "gospel": ["Mark 6:14-29"]
        },
        "semicontinuous": {
            "first": ["2 Samuel 6:1-5, 12b-19"],
            "psalm": ["Psalm 24"],
            "second": ["Ephesians 1:3-14"],
            "gospel": ["Mark 6:14-29"]
        }
    },
    "Pentecost 10": {
        "complementary": {
            "first": ["Jeremiah 23:1-6"],
            "psalm": ["Psalm 23"],
            "second": ["Ephesians 2:11-22"],
            "gospel": ["Mark 6:30-34, 53-56"]
        },
        "semicontinuous": {
            "first": ["2 Samuel 7:1-14a"],
            "psalm": ["Psalm 89:20-37"],
            "second": ["Ephesians 2:11-22"],
            "gospel": ["Mark 6:30-34, 53-56"]
        }
    },
    "Pentecost 11": {
        "complementary": {
            "first": ["2 Kings 4:42-44"],
            "psalm": ["Psalm 145:10-18"],
            "second": ["Ephesians 3:14-21"],
            "gospel": ["John 6:1-21"]
        },
        "semicontinuous": {
            "first": ["2 Samuel 11:1-15"],
            "psalm": ["Psalm 14"],
            "second": ["Ephesians 3:14-21"],
            "gospel": ["John 6:1-21"]
        }
    },
    "Pentecost 12": {
        "complementary": {
            "first": ["Exodus 16:2-4, 9-15"],
            "psalm": ["Psalm 78:23-29"],
            "second": ["Ephesians 4:1-16"],
            "gospel": ["John 6:24-35"]
        },
        "semicontinuous": {
            "first": ["2 Samuel 11:26-12:13a"],
            "psalm": ["Psalm 51:1-12"],
            "second": ["Ephesians 4:1-16"],
            "gospel": ["John 6:24-35"]
        }
    },
    "Pentecost 13": {
        "complementary": {
            "first": ["1 Kings 19:4-8"],
            "psalm": ["Psalm 34:1-8"],
            "second": ["Ephesians 4:25-5:2"],
            "gospel": ["John 6:35, 41-51"]
        },
        "semicontinuous": {
            "first": ["2 Samuel 18:5-9, 15, 31-33"],
            "psalm": ["Psalm 130"],
            "second": ["Ephesians 4:25-5:2"],
            "gospel": ["John 6:35, 41-51"]
        }
    },
    "Pentecost 14": {
        "complementary": {
            "first": ["Proverbs 9:1-6"],
            "psalm": ["Psalm 34:9-14"],
            "second": ["Ephesians 5:15-20"],
            "gospel": ["John 6:51-58"]
        },
        "semicontinuous": {
            "first": ["1 Kings 2:10-12; 3:3-14"],
            "psalm": ["Psalm 111"],
            "second": ["Ephesians 5:15-20"],
            "gospel": ["John 6:51-58"]
        }
    },
    "Pentecost 15": {
        "complementary": {
            "first": ["Joshua 24:1-2a, 14-18"],
            "psalm": ["Psalm 34:15-22"],
            "second": ["Ephesians 6:10-20"],
            "gospel": ["John  6:56-69"]
        },
        "semicontinuous": {
            "first": ["1 Kings 8:[1, 6, 10-11] 22-30, 41-43"],
            "psalm": ["Psalm 84"],
            "second": ["Ephesians 6:10-20"],
            "gospel": ["John  6:56-69"]
        }
    },
    "Pentecost 16": {
        "complementary": {
            "first": ["Deuteronomy 4:1-2, 6-9"],
            "psalm": ["Psalm 15"],
            "second": ["James 1:17-27"],
            "gospel": ["Mark 7:1-8, 14-15, 21-23"]
        },
        "semicontinuous": {
            "first": ["Song of Solomon 2:8-13"],
            "psalm": ["Psalm 45:1-2, 6-9"],
            "second": ["James 1:17-27"],
            "gospel": ["Mark 7:1-8, 14-15, 21-23"]
        }
    },
    "Pentecost 17": {
        "complementary": {
            "first": ["Isaiah 35:4-7a"],
            "psalm": ["Psalm 146"],
            "second": ["James 2:1-10 [11-13] 14-17"],
            "gospel": ["Mark 7:24-37"]
        },
        "semicontinuous": {
            "first": ["Proverbs 22:1-2, 8-9, 22-23"],
            "psalm": ["Psalm 125"],
            "second": ["James 2:1-10 [11-13] 14-17"],
            "gospel": ["Mark 7:24-37"]
        }
    },
    "Pentecost 18": {
        "complementary": {
            "first": ["Isaiah 50:4-9a"],
            "psalm": ["Psalm 116:1-9"],
            "second": ["James 3:1-12"],
            "gospel": ["Mark 8:27-38"]
        },
        "semicontinuous": {
            "first": ["Proverbs 1:20-33"],
            "psalm": ["Psalm 19"],
            "second": ["James 3:1-12"],
            "gospel": ["Mark 8:27-38"]
        }
    },
    "Pentecost 19": {
        "complementary": {
            "first": ["Jeremiah 11:18-20"],
            "psalm": ["Psalm 54"],
            "second": ["James 3:13-4:3, 7-8a"],
            "gospel": ["Mark 9:30-37"]
        },
        "semicontinuous": {
            "first": ["Proverbs 31:10-31"],
            "psalm": ["Psalm 1"],
            "second": ["James 3:13-4:3, 7-8a"],
            "gospel": ["Mark 9:30-37"]
        }
    },
    "Pentecost 20": {
        "complementary": {
            "first": ["Numbers 11:4-6, 10-16, 24-29"],
            "psalm": ["Psalm 19:7-14"],
            "second": ["James 5:13-20"],
            "gospel": ["Mark 9:38-50"]
        },
        "semicontinuous": {
            "first": ["Esther 7:1-6, 9-10; 9:20-22"],
            "psalm": ["Psalm 124"],
            "second": ["James 5:13-20"],
            "gospel": ["Mark 9:38-50"]
        }
    },
    "Pentecost 21": {
        "complementary": {
            "first": ["Genesis 2:18-24"],
            "psalm": ["Psalm 8"],
            "second": ["Hebrews 1:1-4; 2:5-12"],
            "gospel": ["Mark 10:2-16"]
        },
        "semicontinuous": {
            "first": ["Job 1:1; 2:1-10"],
            "psalm": ["Psalm 26"],
            "second": ["Hebrews 1:1-4; 2:5-12"],
            "gospel": ["Mark 10:2-16"]
        }
    },
    "Pentecost 22": {
        "complementary": {
            "first": ["Amos 5:6-7, 10-15"],
            "psalm": ["Psalm 90:12-17"],
            "second": ["Hebrews 4:12-16"],
            "gospel": ["Mark 10:17-31"]
        },
        "semicontinuous": {
            "first": ["Job 23:1-9, 16-17"],
            "psalm": ["Psalm 22:1-15"],
            "second": ["Hebrews 4:12-16"],
            "gospel": ["Mark 10:17-31"]
        }
    },
    "All Saints": {
        "first": ["Isaiah 25:6-9"],
        "psalm": ["Psalm 24 (5)"],
        "second": ["Revelation 21:1-6a"],
        "gospel": ["John 11:32-44"]
    },
    "Pentecost 23": {
        "complementary": {
            "first": ["Isaiah 53:4-12"],
            "psalm": ["Psalm 91:9-16"],
            "second": ["Hebrews 5:1-10"],
            "gospel": ["Mark 10:35-45"]
        },
        "semicontinuous": {
            "first": ["Job 38:1-7 [34-41]"],
            "psalm": ["Psalm 104:1-9, 24, 35b"],
            "second": ["Hebrews 5:1-10"],
            "gospel": ["Mark 10:35-45"]
        }
    },
    "Pentecost 24": {
        "complementary": {
            "first": ["Jeremiah 31:7-9"],
            "psalm": ["Psalm 126"],
            "second": ["Hebrews 7:23-28"],
            "gospel": ["Mark 10:46-52"]
        },
        "semicontinuous": {
            "first": ["Job 42:1-6, 10-17"],
            "psalm": ["Psalm 34:1-8 [19-22]"],
            "second": ["Hebrews 7:23-28"],
            "gospel": ["Mark 10:46-52"]
        }
    },
    "Pentecost 25": {
        "complementary": {
            "first": ["Deuteronomy 6:1-9"],
            "psalm": ["Psalm 119:1-8"],
            "second": ["Hebrews 9:11-14"],
            "gospel": ["Mark 12:28-34"]
        },
        "semicontinuous": {
            "first": ["Ruth 1:1-18"],
            "psalm": ["Psalm 146"],
            "second": ["Hebrews 9:11-14"],
            "gospel": ["Mark 12:28-34"]
        }
    },
    "Pentecost 26": {
        "complementary": {
            "first": ["1 Kings 17:8-16"],
            "psalm": ["Psalm 146"],
            "second": ["Hebrews 9:24-28"],
            "gospel": ["Mark 12:38-44"]
        },
        "semicontinuous": {
            "first": ["Ruth 3:1-5; 4:13-17"],
            "psalm": ["Psalm 127"],
            "second": ["Hebrews 9:24-28"],
            "gospel": ["Mark 12:38-44"]
        }
    },
    "Pentecost 27": {
        "complementary": {
            "first": ["Daniel 12:1-3"],
            "psalm": ["Psalm 16"],
            "second": ["Hebrews 10:11-14 [15-18] 19-25"],
            "gospel": ["Mark 13:1-8"]
        },
        "semicontinuous": {
            "first": ["1 Samuel 1:4-20"],
            "psalm": ["1 Samuel 2:1-10"],
            "second": ["Hebrews 10:11-14 [15-18] 19-25"],
            "gospel": ["Mark 13:1-8"]
        }
    },
    "Pentecost 28": {
        "complementary": {
            "first": ["Daniel 7:9-10, 13-14"],
            "psalm": ["Psalm 93"],
            "second": ["Revelation 1:4b-8"],
            "gospel": ["John 18:33-37"]
        },
        "semicontinuous": {
            "first": ["2 Samuel 23:1-7"],
            "psalm": ["Psalm 132:1-12 [13-18]"],
            "second": ["Revelation 1:4b-8"],
            "gospel": ["John 18:33-37"]
        }
    }
}

},{}],13:[function(require,module,exports){
module.exports={
    "Advent 1": {
        "first": ["Jeremiah 33:14-16"],
        "psalm": ["Psalm 25:1-10"],
        "second": ["1 Thessalonians 3:9-13"],
        "gospel": ["Luke 21:25-36"]
    },
    "Advent 2": {
        "first": ["Baruch 5:1-9", "Malachi 3:1-4"],
        "psalm": ["Luke 1:68-79"],
        "second": ["Philippians 1:3-11"],
        "gospel": ["Luke 3:1-6"]
    },
    "Thanksgiving": {
        "first": ["Deuteronomy 8:7-18"],
        "psalm": ["Psalm 65"],
        "second": ["2 Corinthians 9:6-15"],
        "gospel": ["Luke 17:11-19"]
    },
    "Advent 3": {
        "first": ["Zephaniah 3:14-20"],
        "psalm": ["Isaiah 12:2-6"],
        "second": ["Philippians 4:4-7"],
        "gospel": ["Luke 3:7-18"]
    },
    "Advent 4": {
        "first": ["Micah 5:2-5a"],
        "psalm": ["Luke 1:46b-55", "Psalm 80:1-7"],
        "second": ["Hebrews 10:5-10"],
        "gospel": ["Luke 1:39-45 [46-55]"]
    },
    "Christmas Eve": {
        "first": ["Isaiah 9:2-7"],
        "psalm": ["Psalm 96"],
        "second": ["Titus 2:11-14"],
        "gospel": ["Luke 2:1-14 [15-20]"]
    },
    "Christmas Day": {
        "first": ["Isaiah 62:6-12"],
        "psalm": ["Psalm 97"],
        "second": ["Titus 3:4-7"],
        "gospel": ["Luke 2:[1-7] 8-20"]
    },
    "Christmas 1": {
        "first": ["Isaiah 61:10-62:3"],
        "psalm": ["Psalm 148"],
        "second": ["Galatians 4:4-7"],
        "gospel": ["Luke 2:22-40"]
    },
    "Epiphany Sunday": {
        "first": ["Isaiah 60:1-6"],
        "psalm": ["Psalm 72:1-7, 10-14"],
        "second": ["Ephesians 3:1-12"],
        "gospel": ["Matthew 2:1-12"]
    },
    "Epiphany Day": {
        "first": ["Isaiah 60:1-6"],
        "psalm": ["Psalm 72:1-7, 10-14"],
        "second": ["Ephesians 3:1-12"],
        "gospel": ["Matthew 2:1-12"]
    },
    "Baptism": {
        "first": ["Isaiah 43:1-7"],
        "psalm": ["Psalm 29"],
        "second": ["Acts 8:14-17"],
        "gospel": ["Luke 3:15-17, 21-22"]
    },
    "Epiphany 2": {
        "first": ["Isaiah 62:1-5"],
        "psalm": ["Psalm 36:5-10"],
        "second": ["1 Corinthians 12:1-11"],
        "gospel": ["John 2:1-11"]
    },
    "Epiphany 3": {
        "first": ["Nehemiah 8:1-3, 5-6, 8-10"],
        "psalm": ["Psalm 19"],
        "second": ["1 Corinthians 12:12-31a"],
        "gospel": ["Luke 4:14-21"]
    },
    "Epiphany 4": {
        "first": ["Jeremiah 1:4-10"],
        "psalm": ["Psalm 71:1-6"],
        "second": ["1 Corinthians 13:1-13"],
        "gospel": ["Luke 4:21-30"]
    },
    "Epiphany 5": {
        "first": ["Isaiah 6:1-8 [9-13]"],
        "psalm": ["Psalm 138"],
        "second": ["1 Corinthians 15:1-11"],
        "gospel": ["Luke 5:1-11"]
    },
    "Epiphany 6": {
        "first": ["Jeremiah 17:5-10"],
        "psalm": ["Psalm 1"],
        "second": ["1 Corinthians 15:12-20"],
        "gospel": ["Luke 6:17-26"]
    },
    "Epiphany 7": {
        "first": ["Genesis 45:3-11, 15"],
        "psalm": ["Psalm 37:1-11, 39-40"],
        "second": ["1 Corinthians 15:35-38, 42-50"],
        "gospel": ["Luke 6:27-38"]
    },
    "Epiphany 8": {
        "first": ["Sirach 27:4-7", "Isaiah 55:10-13"],
        "psalm": ["Psalm 92:1-4, 12-15"],
        "second": ["1 Corinthians 15:51-58"],
        "gospel": ["Luke 6:39-49"]
    },
    "Epiphany 9": {
        "first": ["1 Kings 8:22-23, 41-43"],
        "psalm": ["Psalm 96:1-9"],
        "second": ["Galatians 1:1-12"],
        "gospel": ["Luke 7:1-10"]
    },
    "Transfiguration": {
        "first": ["Exodus 34:29-35"],
        "psalm": ["Psalm 99"],
        "second": ["2 Corinthians 3:12-4:2"],
        "gospel": ["Luke 9:28-36 [37-43]"]
    },
    "Lent 1": {
        "first": ["Deuteronomy 26:1-11"],
        "psalm": ["Psalm 91:1-2, 9-16"],
        "second": ["Romans 10:8b-13"],
        "gospel": ["Luke 4:1-13"]
    },
    "Lent 2": {
        "first": ["Genesis 15:1-12, 17-18"],
        "psalm": ["Psalm 27"],
        "second": ["Philippians 3:17-4:1"],
        "gospel": ["Luke 13:31-35", "Luke 9:28-36"]
    },
    "Lent 3": {
        "first": ["Isaiah 55:1-9"],
        "psalm": ["Psalm 63:1-8"],
        "second": ["1 Corinthians 10:1-13"],
        "gospel": ["Luke 13:1-9"]
    },
    "Lent 4": {
        "first": ["Joshua 5:9-12"],
        "psalm": ["Psalm 32"],
        "second": ["2 Corinthians 5:16-21"],
        "gospel": ["Luke 15:1-3, 11b-32"]
    },
    "Lent 5": {
        "first": ["Isaiah 43:16-21"],
        "psalm": ["Psalm 126"],
        "second": ["Philippians 3:4b-14"],
        "gospel": ["John 12:1-8"]
    },
    "Palms": {
        "first": ["Isaiah 50:4-9a"],
        "psalm": ["Psalm 31:9-16"],
        "second": ["Philippians 2:5-11"],
        "gospel": ["Luke 19:28-40"]
    },
    "Passion": {
        "first": ["Isaiah 50:4-9a"],
        "psalm": ["Psalm 31:9-16"],
        "second": ["Philippians 2:5-11"],
        "gospel": ["Luke 22:14-23:56", "Luke 23:1-49"]
    },
    "Holy Thursday": {
        "first": ["Exodus 12:1-4 [5-10] 11-14"],
        "psalm": ["Psalm 116:1-2, 12-19"],
        "second": ["1 Corinthians 11:23-26"],
        "gospel": ["John 13:1-17, 31b-35"]
    },
    "Good Friday": {
        "first": ["Isaiah 52:13-53:12"],
        "psalm": ["Psalm 22"],
        "second": ["Hebrews 10:16-25", "Hebrews 4:14-16; 5:7-9"],
        "gospel": ["John 18:1-19:42"]
    },
    "Easter Day": {
        "first": ["Acts 10:34-43", "Isaiah 25:6-9"],
        "psalm": ["Psalm 118:1-2, 14-24"],
        "second": ["1 Corinthians 15:1-11", "Acts 10:34-43"],
        "gospel": ["John 20:1-18", "Mark 16:1-8"]
    },
    "Easter 2": {
        "first": ["Acts 5:27-32"],
        "psalm": ["Psalm 118:14-29", "Psalm 150"],
        "second": ["Revelation 1:4-8"],
        "gospel": ["John 20:19-31"]
    },
    "Easter 3": {
        "first": ["Acts 9:1-6 [7-20]"],
        "psalm": ["Psalm 30"],
        "second": ["Revelation 5:11-14"],
        "gospel": ["John 21:1-19"]
    },
    "Easter 4": {
        "first": ["Acts 9:36-43"],
        "psalm": ["Psalm 23"],
        "second": ["Revelation7:9-17"],
        "gospel": ["John 10:22-30"]
    },
    "Easter 5": {
        "first": ["Acts 11:1-18"],
        "psalm": ["Psalm 148"],
        "second": ["Revelation 21:1-6"],
        "gospel": ["John 13:31-35"]
    },
    "Easter 6": {
        "first": ["Acts 16:9-15"],
        "psalm": ["Psalm 67"],
        "second": ["Revelation 21:10, 22-22:5"],
        "gospel": ["John 14:23-29", ""]
    },
    "Easter 7": {
        "first": ["Acts 16:16-34"],
        "psalm": ["Psalm 97"],
        "second": ["Revelation 22:12-14, 16-17, 20-21"],
        "gospel": ["John 17:20-26"]
    },
    "Pentecost Day": {
        "first": ["Acts 2:1-21", "Genesis 11:1-9"],
        "psalm": ["Psalm 104:24-34, 35b"],
        "second": ["Romans 8:14-17", "Acts 2:1-21"],
        "gospel": ["John 14:8-17 [25-27]"]
    },
    "Trinity": {
        "first": ["Proverbs 8:1-4, 22-31"],
        "psalm": ["Psalm 8"],
        "second": ["Romans 5:1-5"],
        "gospel": ["John 16:12-15"]
    },
    "Pentecost UNKNOWN": {
        "first": ["Sirach 27:4-7", "Isaiah 55:10-13"],
        "psalm": ["Psalm 92:1-4, 12-15"],
        "second": ["1 Corinthians 15:51-58"],
        "gospel": ["Luke 6:39-49"]
    },
    "Pentecost 2": {
        "complementary": {
            "first": ["1 Kings 8:22-23, 41-43"],
            "psalm": ["Psalm 96:1-9"],
            "second": ["Galatians 1:1-12"],
            "gospel": ["Luke 7:1-10"]
        },
        "semicontinuous": {
            "first": ["1 Kings 18:20-21 [22-29] 30-39"],
            "psalm": ["Psalm 96"],
            "second": ["Galatians 1:1-12"],
            "gospel": ["Luke 7:1-10"]
        }
    },
    "Pentecost 3": {
        "complementary": {
            "first": ["1 Kings 17:17-24"],
            "psalm": ["Psalm 30"],
            "second": ["Galatians 1:11-24"],
            "gospel": ["Luke 7:11-17"]
        },
        "semicontinuous": {
            "first": ["1 Kings 17:8-16 [17-24]"],
            "psalm": ["Psalm 146"],
            "second": ["Galatians 1:11-24"],
            "gospel": ["Luke 7:11-17"]
        }
    },
    "Pentecost 4": {
        "complementary": {
            "first": ["2 Samuel 11:26-12:10, 13-15"],
            "psalm": ["Psalm 32"],
            "second": ["Galatians 2:15-21"],
            "gospel": ["Luke 7:36-8:3"]
        },
        "semicontinuous": {
            "first": ["1 Kings 21:1-10 [11-14] 15-21a"],
            "psalm": ["Psalm 5:1-8"],
            "second": ["Galatians 2:15-21"],
            "gospel": ["Luke 7:36-8:3"]
        }
    },
    "Pentecost 5": {
        "complementary": {
            "first": ["Isaiah 65:1-9"],
            "psalm": ["Psalm 22:19-28"],
            "second": ["Galatians 3:23-29"],
            "gospel": ["Luke 8:26-39"]
        },
        "semicontinuous": {
            "first": ["1 Kings 19:1-4 [5-7] 8-15a"],
            "psalm": ["Psalm 42 and 43"],
            "second": ["Galatians 3:23-29"],
            "gospel": ["Luke 8:26-39"]
        }
    },
    "Pentecost 6": {
        "complementary": {
            "first": ["1 Kings 19:15-16, 19-21"],
            "psalm": ["Psalm 16"],
            "second": ["Galatians 5:1, 13-25"],
            "gospel": ["Luke 9:51-62"]
        },
        "semicontinuous": {
            "first": ["2 Kings 2:1-2, 6-14"],
            "psalm": ["Psalm 77:1-2, 11-20"],
            "second": ["Galatians 5:1, 13-25"],
            "gospel": ["Luke 9:51-62"]
        }
    },
    "Pentecost 7": {
        "complementary": {
            "first": ["Isaiah 66:10-14"],
            "psalm": ["Psalm 66:1-9"],
            "second": ["Galatians 6:[1-6] 7-16"],
            "gospel": ["Luke 10:1-11, 16-20"]
        },
        "semicontinuous": {
            "first": ["2 Kings 5:1-14"],
            "psalm": ["Psalm 30"],
            "second": ["Galatians 6:[1-6] 7-16"],
            "gospel": ["Luke 10:1-11, 16-20"]
        }
    },
    "Pentecost 8": {
        "complementary": {
            "first": ["Deuteronomy 30:9-14"],
            "psalm": ["Psalm 25:1-10"],
            "second": ["Colossians 1:1-14"],
            "gospel": ["Luke 10:25-37"]
        },
        "semicontinuous": {
            "first": ["Amos 7:7-17"],
            "psalm": ["Psalm 82"],
            "second": ["Colossians 1:1-14"],
            "gospel": ["Luke 10:25-37"]
        }
    },
    "Pentecost 9": {
        "complementary": {
            "first": ["Genesis 18:1-10a"],
            "psalm": ["Psalm 15"],
            "second": ["Colossians 1:15-28"],
            "gospel": ["Luke 10:38-42"]
        },
        "semicontinuous": {
            "first": ["Amos 8:1-12"],
            "psalm": ["Psalm 52"],
            "second": ["Colossians 1:15-28"],
            "gospel": ["Luke 10:38-42"]
        }
    },
    "Pentecost 10": {
        "complementary": {
            "first": ["Genesis 18:20-32"],
            "psalm": ["Psalm 138"],
            "second": ["Colossians 2:6-15 [16-19]"],
            "gospel": ["Luke 11:1-13"]
        },
        "semicontinuous": {
            "first": ["Hosea 1:2-10"],
            "psalm": ["Psalm 85"],
            "second": ["Colossians 2:6-15 [16-19]"],
            "gospel": ["Luke 11:1-13"]
        }
    },
    "Pentecost 11": {
        "complementary": {
            "first": ["Ecclesiastes 1:2, 12-14; 2:18-23"],
            "psalm": ["Psalm 49:1-12"],
            "second": ["Colossians 3:1-11"],
            "gospel": ["Luke 12:13-21"]
        },
        "semicontinuous": {
            "first": ["Hosea 11:1-11"],
            "psalm": ["Psalm 107:1-9, 43"],
            "second": ["Colossians 3:1-11"],
            "gospel": ["Luke 12:13-21"]
        }
    },
    "Pentecost 12": {
        "complementary": {
            "first": ["Genesis 15:1-6"],
            "psalm": ["Psalm 33:12-22"],
            "second": ["Hebrews 11:1-3, 8-16"],
            "gospel": ["Luke 12:32-40"]
        },
        "semicontinuous": {
            "first": ["Isaiah 1:1, 10-20"],
            "psalm": ["Psalm 50:1-8, 22-23"],
            "second": ["Hebrews 11:1-3, 8-16"],
            "gospel": ["Luke 12:32-40"]
        }
    },
    "Pentecost 13": {
        "complementary": {
            "first": ["Jeremiah 23:23-29"],
            "psalm": ["Psalm 82"],
            "second": ["Hebrews 11:29-12:2"],
            "gospel": ["Luke 12:49-56"]
        },
        "semicontinuous": {
            "first": ["Isaiah 5:1-7"],
            "psalm": ["Psalm 80:1-2, 8-19"],
            "second": ["Hebrews 11:29-12:2"],
            "gospel": ["Luke 12:49-56"]
        }
    },
    "Pentecost 14": {
        "complementary": {
            "first": ["Isaiah 58:9b-14"],
            "psalm": ["Psalm 103:1-8"],
            "second": ["Hebrews 12:18-29"],
            "gospel": ["Luke 13:10-17"]
        },
        "semicontinuous": {
            "first": ["Jeremiah 1:4-10"],
            "psalm": ["Psalm 71:1-6"],
            "second": ["Hebrews 12:18-29"],
            "gospel": ["Luke 13:10-17"]
        }
    },
    "Pentecost 15": {
        "complementary": {
            "first": ["Sirach 10:12-18", "Proverbs 25:6-7"],
            "psalm": ["Psalm 112"],
            "second": ["Hebrews 13:1-8, 15-16"],
            "gospel": ["Luke 14:1, 7-14"]
        },
        "semicontinuous": {
            "first": ["Jeremiah 2:4-13"],
            "psalm": ["Psalm 81:1, 10-16"],
            "second": ["Hebrews 13:1-8, 15-16"],
            "gospel": ["Luke 14:1, 7-14"]
        }
    },
    "Pentecost 16": {
        "complementary": {
            "first": ["Deuteronomy 30:15-20"],
            "psalm": ["Psalm 1"],
            "second": ["Philemon 1-21"],
            "gospel": ["Luke 14:25-33"]
        },
        "semicontinuous": {
            "first": ["Jeremiah 18:1-11"],
            "psalm": ["Psalm 139:1-6, 13-18"],
            "second": ["Philemon 1-21"],
            "gospel": ["Luke 14:25-33"]
        }
    },
    "Pentecost 17": {
        "complementary": {
            "first": ["Exodus 32:7-14"],
            "psalm": ["Psalm 51:1-10"],
            "second": ["1 Timothy 1:12-17"],
            "gospel": ["Luke 15:1-10"]
        },
        "semicontinuous": {
            "first": ["Jeremiah 4:11-12, 22-28"],
            "psalm": ["Psalm 14"],
            "second": ["1 Timothy 1:12-17"],
            "gospel": ["Luke 15:1-10"]
        }
    },
    "Pentecost 18": {
        "complementary": {
            "first": ["Amos 8:4-7"],
            "psalm": ["Psalm 113"],
            "second": ["1 Timothy 2:1-7"],
            "gospel": ["Luke 16:1-13"]
        },
        "semicontinuous": {
            "first": ["Jeremiah 8:18-9:1"],
            "psalm": ["Psalm 79:1-9"],
            "second": ["1 Timothy 2:1-7"],
            "gospel": ["Luke 16:1-13"]
        }
    },
    "Pentecost 19": {
        "complementary": {
            "first": ["Amos 6:1a, 4-7"],
            "psalm": ["Psalm 146"],
            "second": ["1 Timothy 6:6-19"],
            "gospel": ["Luke 16:19-31"]
        },
        "semicontinuous": {
            "first": ["Jeremiah 32:1-3a, 6-15"],
            "psalm": ["Psalm 91:1-6, 14-16"],
            "second": ["1 Timothy 6:6-19"],
            "gospel": ["Luke 16:19-31"]
        }
    },
    "Pentecost 20": {
        "complementary": {
            "first": ["Habakkuk 1:1-4; 2:1-4"],
            "psalm": ["Psalm 37:1-9"],
            "second": ["2 Timothy 1:1-14"],
            "gospel": ["Luke 17:5-10"]
        },
        "semicontinuous": {
            "first": ["Lamentations 1:1-6"],
            "psalm": ["Lamentations 3:19-26", "Psalm 137"],
            "second": ["2 Timothy 1:1-14"],
            "gospel": ["Luke 17:5-10"]
        }
    },
    "Pentecost 21": {
        "complementary": {
            "first": ["2 Kings 5:1-3, 7-15c"],
            "psalm": ["Psalm 111"],
            "second": ["2 Timothy 2:8-15"],
            "gospel": ["Luke 17:11-19"]
        },
        "semicontinuous": {
            "first": ["Jeremiah 29:1, 4-7"],
            "psalm": ["Psalm 66:1-12"],
            "second": ["2 Timothy 2:8-15"],
            "gospel": ["Luke 17:11-19"]
        }
    },
    "All Saints": {
        "first": ["Isaiah 25:6-9"],
        "psalm": ["Psalm 24 (5)"],
        "second": ["Revelation 21:1-6a"],
        "gospel": ["John 11:32-44"]
    },
    "Pentecost 22": {
        "complementary": {
            "first": ["Genesis 32:22-31"],
            "psalm": ["Psalm 121"],
            "second": ["2 Timothy 3:14-4:5"],
            "gospel": ["Luke 18:1-8"]
        },
        "semicontinuous": {
            "first": ["Jeremiah 31:27-34"],
            "psalm": ["Psalm 119:97-104"],
            "second": ["2 Timothy 3:14-4:5"],
            "gospel": ["Luke 18:1-8"]
        }
    },
    "Pentecost 23": {
        "complementary": {
            "first": ["Jeremiah 14:7-10, 19-22", "Sirach 35:12-17"],
            "psalm": ["Psalm 84:1-7"],
            "second": ["2 Timothy 4:6-8, 16-18"],
            "gospel": ["Luke 18:9-14"]
        },
        "semicontinuous": {
            "first": ["Joel 2:23-32"],
            "psalm": ["Psalm 65"],
            "second": ["2 Timothy 4:6-8, 16-18"],
            "gospel": ["Luke 18:9-14"]
        }
    },
    "Pentecost 24": {
        "complementary": {
            "first": ["Isaiah 1:10-18"],
            "psalm": ["Psalm 32:1-7"],
            "second": ["2 Thessalonians 1:1-4, 11-12"],
            "gospel": ["Luke 19:1-10"]
        },
        "semicontinuous": {
            "first": ["Habakkuk 1:1-4, 2:1-4"],
            "psalm": ["Psalm 119:137-144"],
            "second": ["2 Thessalonians 1:1-4, 11-12"],
            "gospel": ["Luke 19:1-10"]
        }
    },
    "Pentecost 25": {
        "complementary": {
            "first": ["Job 19:23-27a"],
            "psalm": ["Psalm 17:1-9"],
            "second": ["2 Thessalonians 2:1-5, 13-17"],
            "gospel": ["Luke 20:27-38"]
        },
        "semicontinuous": {
            "first": ["Haggai 1:15b-2:9"],
            "psalm": ["Psalm 145:1-5, 17-21", "Psalm 98"],
            "second": ["2 Thessalonians 2:1-5, 13-17"],
            "gospel": ["Luke 20:27-38"]
        }
    },
    "Pentecost 26": {
        "complementary": {
            "first": ["Malachi 4:1-2a"],
            "psalm": ["Psalm 98"],
            "second": ["2 Thessalonians 3:6-13"],
            "gospel": ["Luke 21:5-19"]
        },
        "semicontinuous": {
            "first": ["Isaiah 65:17-25"],
            "psalm": ["Isaiah 12"],
            "second": ["2 Thessalonians 3:6-13"],
            "gospel": ["Luke 21:5-19"]
        }
    },
    "Pentecost 27": {
        "complementary": {
            "first": ["Jeremiah 23:1-6"],
            "psalm": ["Psalm 46"],
            "second": ["Colossians 1:11-20"],
            "gospel": ["Luke 23:33-43"]
        },
        "semicontinuous": {
            "first": ["Jeremiah 23:1-6"],
            "psalm": ["Luke 1:68-79"],
            "second": ["Colossians 1:11-20"],
            "gospel": ["Luke 23:33-43"]
        }
    }

}

},{}]},{},[1]);
