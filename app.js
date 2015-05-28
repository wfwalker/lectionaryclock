// foo

var cScale = d3.scale.linear().domain([24, 0]).range([0, 2 * Math.PI]);

function initializeClock() {
	var vis = d3.select("#svg_donut");

	var face = vis.append('g')
		.attr('id','clock-face')
		.attr('transform','translate(300,200)');	

	var fullArc = d3.svg.arc()
		.innerRadius(80)
		.outerRadius(175)
		.startAngle(0)
		.endAngle(2 * Math.PI);

	face.append("path")
		.attr("id", 'fullArc')
		.attr("d", fullArc)

	var minuteArc = d3.svg.arc()
		.innerRadius(80)
		.outerRadius(100)
		.startAngle(0)
		.endAngle(0.05 * Math.PI);

	face.append("path")
		.attr("id", 'minuteArc')
		.attr("d", minuteArc)

	var hourArc = d3.svg.arc()
		.innerRadius(105)
		.outerRadius(125)
		.startAngle(0)
		.endAngle(0.05 * Math.PI);

	face.append("path")
		.attr("id", 'hourArc')
		.attr("d", hourArc);

	var dayArc = face.append('g')
		.attr('id','dayArc');

	var sunlightArc = d3.svg.arc()
		.innerRadius(130)
		.outerRadius(150)
		.startAngle(cScale(6))
		.endAngle(cScale(20));

	dayArc.append("path")
		.attr("id", 'sunlightArc')
		.attr("d", sunlightArc)

	var nightArc = d3.svg.arc()
		.innerRadius(130)
		.outerRadius(150)
		.startAngle(cScale(20))
		.endAngle(cScale(30));

	dayArc.append("path")
		.attr("id", 'nightArc')
		.attr("d", nightArc);

	var yearArc = d3.svg.arc()
		.innerRadius(155)
		.outerRadius(175)
		.startAngle(0)
		.endAngle(1 * Math.PI);

	face.append("path")
		.attr("id", 'yearArc')
		.attr("d", yearArc)

	face.append("rect")
      .attr("class", "bar")
      .attr("x", 0)
      .attr("width", 1)
      .attr("y", -200)
      .attr("height", 200);			
}

function step(timestamp) {
	d3.select('#minuteArc')
		.attr('transform', function(d){
			var angle = 360 * ((new Date().getTime() / 1000) % 60) / 60.0;
			return 'rotate(' + angle + ')';
		});

	d3.select('#hourArc')
		.attr('transform', function(d){
			var angle = 360 * ((new Date().getTime() / 1000) % 3600) / 3600.0;
			return 'rotate(' + angle + ')';
		});

	d3.select('#dayArc')
		.attr('transform', function(d){
			var tmp = new Date();
			var percentage = (tmp.getHours() * 3600 + tmp.getMinutes() * 60) / 86400.0;
			var angle = 360 * percentage;
			return 'rotate(' + angle + ')';
		});

	d3.select('#yearArc')
		.attr('transform', function(d){
			var tmp = new Date();
			var beginYear = new Date();
			beginYear.setMonth(0);
			beginYear.setDate(1);
			beginYear.setHours(0);
			beginYear.setMinutes(0);
			beginYear.setSeconds(0);
			var fraction = (tmp.getTime() - beginYear.getTime()) / (365*1000*60*60*24.0);
			var angle = 360.0 * fraction;
			return 'rotate(' + angle + ')';
		});

	window.setTimeout(step, 200);
}

initializeClock();
window.setTimeout(step, 200);