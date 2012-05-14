/**
 * Created with JetBrains WebStorm.
 * User: Rafael
 * Date: 18/04/12
 * Time: 4:51 PM
 * To change this template use File | Settings | File Templates.
 */

var margin = {top: 19, right: 20, bottom: 20, left: 19},
        cellSize = 17; // cell size

var day     = d3.time.format("%w"),
    week    = d3.time.format("%U"),
    year    = d3.time.format("%Y"),
    percent = d3.format(".1%"),
    format  = d3.time.format("%Y-%m-%d");

var rows, data, freqByYear;

var colorDay;

window.addEventListener("load", start, false);

function start(){
    d3.csv('calendar.csv', function(rows){
        this.rows = rows;
        data = nestByDate(rows);
        freqByYear = freqByYear_(rows);
        colorDay = d3.scale.quantile()
                    .domain(frequency())
                    .range(d3.range(9));
        drawCalendar([2010]);
        drawBall();
    })
}

/**
 * Draws a radial representation for years.
 * It consists of concentric 'orbits', where years, represented
 * by small ellipses, lie over.
 * Each orbit corresponds to a decade.
 */
function drawBall(){
    var w = 1000,
        h = 500;

    var color = d3.scale.quantile()
        .domain(d3.values(freqByYear))
        .range(d3.range(9));

    var svg = d3.select("#ball").append("svg")
        .attr("width", w)
        .attr("height", h)
        .attr("class", "YlGnBu")
        .append("g")
        .attr("transform","translate(300,300)"); // refer to ColorBrewer CSS

    var decades_ = decades(d3.keys(freqByYear).sort());

    // computes radius for an orbit o
    var radius = function(o){return o*17+17;};
    // computes the angle for an index i [0..9] in radians
    var angle = function(i) {return 36*i*Math.PI/180};

    // appending 'ring lanes'
    svg.append("g")
        .attr("class", "ring")
        .selectAll("circle")
        .data(d3.range(decades_.length))
        .enter().append("circle")
        .attr("cy",0)
        .attr("cx",0)
        .attr("r", radius);
    
    // average size of the internal label
    var labelWidth = document.getElementById('measure_text').clientWidth;
    var labelHeight = d3.select('#measure_text').style('font-size').replace(/\D+/,'');
    
    console.log(labelHeight);
    
    svg.append('g')
    	.attr('class', 'internal_label')
    	.selectAll('text')
    	.data(decades_.map(function(a){return a[0];}))
    	.enter().append('text')
    	.text(function(d,i){return i<3 ? '' : d+'\'s';})
    	.attr('transform', function(d,i){return	'rotate(-35)'
    		+ 'translate(0,3)'
    		+ 'translate(0,'+ radius(i) +') ';})
    	.attr('text-anchor', 'middle');
    
    svg.append("g")
        .selectAll('text')
	    .data(d3.range(10))
	    .enter().append('text')
        .attr('class', 'external_label')
	    .attr("x", function(d,i){
	         return radius(decades_.length)*Math.cos(angle(i));
	     })
	     .attr("y", function(d,i){
	    	var y = radius(decades_.length)*Math.sin(angle(i));
	    	return y + d3.select(this).style('font-size').replace(/\D+/,'')/2;
	     })
	    .text(String);

    // two-levels of data-binding here. decades -> svg:g; years -> svg:circle
    svg.selectAll("g.decade")
        .data(decades_)
        .enter().append("g")
        .attr("class", "decade")
      .selectAll("circle.year")
        .data(function(a,i){ // cross decades with years
            return a.map(function(d,j){
                return {year:+d, decade:i, freq: freqByYear[+d]}
            })
        })
        .enter().append("circle")//.attr('class', 'year')
        .attr("cx", function(d,i){ return radius(d.decade)*Math.cos(angle(i)); })
        .attr("cy", function(d,i){ return radius(d.decade)*Math.sin(angle(i)); })
        .attr("r", 4)
        .attr("class", function(d) { return "q" + color(d.freq) + "-9"; })
        .on("mouseover", function(d){ drawCalendar([d.year]); })
        .append("title")
        .text(function(d){return ""+d.year;});
       
}


function drawCalendar(years){
    var w  = width('chart') - margin.right - margin.left,
        h = 136;

    var svg = d3.select("#chart").selectAll("svg");
    svg.data([]).exit().remove();

    svg = d3.select("#chart").selectAll("svg")
        .data(years)
        .enter().append("svg")
        .attr("width", w + margin.right + margin.left)
        .attr("height", h + margin.top + margin.bottom)
        .attr("class", "YlGnBu")
        .append("g")
        .attr("transform", "translate(" + (margin.left + (w - cellSize * 53) / 2) + ","
        + (margin.top + (h - cellSize * 7) / 2) + ")");

    svg.append("text")
        .attr("transform", "translate(-6," + cellSize * 3.5 + ")rotate(-90)")
        .attr("text-anchor", "middle")
        .text(String);

    var rect = svg.selectAll("rect.day")
        .data(function(d) { return d3.time.days(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
        .enter().append("rect")
        .attr("class", "day")
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("x", function(d) { return week(d) * cellSize; })
        .attr("y", function(d) { return day(d) * cellSize; });

    rect.append("title")
        .text(function(d) { return d; });

    svg.selectAll("path.month")
        .data(function(d) { return d3.time.months(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
        .enter().append("path")
        .attr("class", "month")
        .attr("d", monthPath);

    rect.filter(function(d) { return d in data; })
        .attr("class", function(d) { return "day q" + colorDay(data[d]) + "-9"; })
        .select("title")
        .text(function(d) { return format(d) + ": " + data[d]; })
        .attr("transform","translate(300,200)");
}

function width(el) { return document.getElementById(el).clientWidth;  }
function height(el){ return document.getElementById(el).clientHeight; }

function monthPath(t0) {
    var t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0),
             d0 = +day(t0), w0 = +week(t0),
             d1 = +day(t1), w1 = +week(t1);
    return "M" + (w0 + 1) * cellSize + "," + d0 * cellSize
         + "H" + w0 * cellSize + "V" + 7 * cellSize
         + "H" + w1 * cellSize + "V" + (d1 + 1) * cellSize
         + "H" + (w1 + 1) * cellSize + "V" + 0
         + "H" + (w0 + 1) * cellSize + "Z";
}

function frequency(){
    return rows.map(function(d){return +d.Frequency;});
}

function crossDecades(arrays){
    arrays.map(function(a,i){
        return a.map(function(d,j){return {year:d, decade:i}})
    })
    return arrays;
}

/**
 * Divide an array of year in groups of ten.
 * @param years array of years to be split in decades. Should start with the first year of a decade and should
 * not contain gaps.
 * @return 2-dimensional array. Each column is a decade.
 */
function decades(years){
    var dec = d3.split(years, function(d){return d%10==0;});
    dec.forEach(function(d,i){d.unshift(d[0]-1);});
    return dec;
}

function freqByYear_(rows){
    return d3.nest()
        .key(function(d){return d.Year;})
        .rollup(function(d){
            return d3.sum(d.map(function(e){
                return +e.Frequency;
            }));
        })
        .map(rows);
}

function nestByDate(rows){
    return d3.nest()
        .key(function(d){return new Date(d.Year,d.Month,d.Day);})
        .rollup(function(d){return +d[0].Frequency;})
        .map(rows);
}