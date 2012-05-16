/**
 * Created with JetBrains WebStorm.
 * User: Rafael
 * Date: 18/04/12
 * Time: 4:51 PM
 * To change this template use File | Settings | File Templates.
 */

var margin = {top: 19, right: 0, bottom: 20, left: 20},
    cellSize;

var day     = d3.time.format("%w"),
    week    = d3.time.format("%U"),
    year    = d3.time.format("%Y"),
    percent = d3.format(".1%"),
    fullFormat  = d3.time.format("%Y-%m-%d"),
    mmddFormat  = d3.time.format("%m-%d");


var rows, days, daysOfYear;

var colorDay;

window.addEventListener("load", start, false);

function start(){
    d3.csv('calendar_.csv', function(rows){

        // calendar metrics
        cellSize = (width('chart') - margin.right - margin.left)/53;

        this.rows = rows;
        days  = frewByDate(rows);
        daysOfYear = freqByDayOfYear(rows);

        colorDay = d3.scale.quantile()
                    .domain(d3.values(days))
                    .range(d3.range(9));

        drawOverallCalendar();
        drawBall();
        //drawWordle();
    })
}

function drawWordle(date){
    var set = rows.filter(function(d){return date.getFullYear()==d.YEAR
        && date.getMonth()== d.MONTH-1
        && date.getDate()== d.DAY;});

    var fontSize = d3.scale.log()
           .domain(d3.extent(set.map(function(d){return +d.PWD_FREQUENCY;})))
           .range([20,80]);

    var words = set.map(function(d){
        return {text: d.RAW, size: fontSize(+d.PWD_FREQUENCY)};
    });

    var w = width('wordle'), h = height('wordle');
    d3.layout.cloud().size([w, h])
        .words(words)
        .font('Trebuchet MS')
        .rotate(function() { return /*~~(Math.random() * 2) * 90*/0; })
        .fontSize(function(d) { return d.size; })
        .on("end", draw)
        .start();
}

function draw(words){
    var w = width('wordle'), h = height('wordle');

    d3.select('#wordle').selectAll('svg')
        .data([null])
        .enter().append('svg')
        .attr('width', w)
        .attr('height', h)
        .append('g')
        .attr('transform', 'translate('+w/2+','+h/2+')');

    svg = d3.select('#wordle').selectAll('svg').select('g');

    var setter = function(sel){
        sel.style("font-size", function(d) { return d.size + "px"; })
            .style('font-family', 'Trebuchet MS')
            .attr("text-anchor", "middle")
            //.attr('text-rendering', 'optimizeSpeed')
            .attr("transform", function(d) {
                return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
            })
            .text(function(d) { return d.text; });
    }

    var bound = svg.selectAll('text').data(words);
    bound.exit().remove();
    bound.enter().append("text");

    svg.selectAll('text').call(setter);
}

/**
 * Draws a radial representation for years.
 * It consists of concentric 'orbits', where years, represented
 * by small ellipses, lie over.
 * Each orbit corresponds to a decade.
 */
function drawBall(){
    var w = width('ball'), h = height('ball');

    var freqByYear = freqByYear_(rows),
        decades_   = decades(d3.keys(freqByYear).sort());

    var color = d3.scale.quantile()
        .domain(d3.values(freqByYear))
        .range(d3.range(9));

    var svg = d3.select("#ball").append("svg")
                .attr("width", w)
                .attr("height", h)
                .attr("class", "YlGnBu"); // refer to ColorBrewer CSS

    // a base layer to capture 'outside' clicks
    svg.append('rect')
        .attr('class', 'invisible')
        .attr('width' , w)
        .attr('height', h)
        .on('click', function(){
            selection.attr('display','none');
            drawOverallCalendar();
        });

    // everything is drawn in this shifted g
    svg = svg.append("g")
             .attr('transform','translate('+w/2+','+h/2+')');

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
        .attr("r", radius);

    // appending 'internal labels' (1940s, 1990s..)
    svg.append('g')
    	.attr('class', 'internal_label')
    	.selectAll('text')
    	.data(decades_.map(function(a){return a[0];}))
    	.enter().append('text')
    	.text(function(d,i){return i<3 ? '' : d+'s';})
    	.attr('transform', function(d,i){return	'rotate(0)'
    		+ 'translate(0,3)'
    		+ 'translate(0,'+ radius(i) +') ';})
    	.attr('text-anchor', 'middle');

    // 'external labels' (1, 2, 3... 10)
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

    var hover = svg.append('circle')
        .attr('class','hover')
        .attr('display','none')
        .attr('r',7);

    // two-levels of data-binding here. decades -> svg:g; years -> svg:circle
    svg.selectAll("g.decade")
        .data(decades_)
        .enter()
        .append("g")
        .attr("class", "decade")
      .selectAll("circle")
        .data(function(a,i){ // cross decades with years
            return a.map(function(d,j){
                return {year:+d, decade:i, freq: freqByYear[+d]}
            })
        })
        .enter()
        .append("circle")
        .attr("cx", function(d,i){ return radius(d.decade)*Math.cos(angle(i)); })
        .attr("cy", function(d,i){ return radius(d.decade)*Math.sin(angle(i)); })
        .attr("r", 4)
        .attr("class", function(d) { return "q" + color(d.freq) + "-9"; })
        .on("click", function(d){
            drawCalendar(d.year);
            align(selection, this);
            selection.style('fill', d3.select(this).style('fill'));
        })
        .on("mouseover", function(){ align(hover, this); })
        .on("mouseout", function(){ hover.attr('display','none') })
        .append("title")
        .text(function(d){return d.year});

    var selection = svg.append('circle')
            .attr('class','selection')
            .attr('display','none')
            .attr('r',7);
}

function drawOverallCalendar(){
    var w  = width('chart'), h = height('chart'),
        year = 1967,
        color = d3.scale.quantile()
                .domain(d3.values(daysOfYear))
                .range(d3.range(9));

    d3.select('#chart').select('svg').remove(); // cleaning

    var svg = d3.select("#chart").append("svg")
                .attr("width", w)
                .attr("height", h)
                .attr("class", "YlGnBu")
                .append("g")
                .attr("transform", "translate(" + margin.left + ","
                + (margin.top + (h - cellSize * 7) / 2) + ")");

    svg.append("text")
        .attr("transform", "translate(-6," + cellSize * 3.5 + ")rotate(-90)")
        .attr("text-anchor", "middle")
        .text("Overview");

    var rect = svg.selectAll("rect.day")
        .data(function(d) { return d3.time.days(new Date(year, 0, 1), new Date(year + 1, 0, 1)); })
        .enter().append("rect")
        .attr("class", "day")
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("x", function(d) { return week(d) * cellSize; })
        .attr("y", function(d) { return day(d) * cellSize; })
        .datum(function(d){return mmddFormat(d);})
        .attr("class", function(d) { return "day q" + color(daysOfYear[d]) + "-9"; })
        .append('title')
        .text(function(d) { return d + ": " + daysOfYear[d]; });

    svg.selectAll("path.month")
        .data(function() { return d3.time.months(new Date(year, 0, 1), new Date(year + 1, 0, 1)); })
        .enter().append("path")
        .attr("class", "month")
        .attr("d", monthPath);
}

function drawCalendar(year){
    var w  = width('chart'), h = height('chart');

    d3.select('#chart').select('svg').remove(); // cleaning

    var svg = d3.select("#chart").append("svg")
            .attr("width", w)
            .attr("height", h)
            .attr("class", "YlGnBu")
            .append("g")
            .attr("transform", "translate(" + margin.left + ","
            + (margin.top + (h - cellSize * 7) / 2) + ")");

    svg.append("text")
        .attr("transform", "translate(-6," + cellSize * 3.5 + ")rotate(-90)")
        .attr("text-anchor", "middle")
        .text(year);

    var rect = svg.selectAll("rect.day")
        .data(function() { return d3.time.days(new Date(year, 0, 1), new Date(year + 1, 0, 1)); })
        .enter().append("rect")
        .attr("class", "day")
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("x", function(d) { return week(d) * cellSize; })
        .attr("y", function(d) { return day(d) * cellSize; })
        .on('click', function(d){
            drawWordle(d);
        });

    rect.append("title")
        .text(function(d) { return fullFormat(d) + ': 0'; });

    svg.selectAll("path.month")
        .data(function() { return d3.time.months(new Date(year, 0, 1), new Date(year + 1, 0, 1)); })
        .enter().append("path")
        .attr("class", "month")
        .attr("d", monthPath);

    rect.filter(function(d) { return d in days; })
        .attr("class", function(d) { return "day q" + colorDay(days[d]) + "-9"; })
        .select('title')
        .text(function(d) { return fullFormat(d) + ": " + days[d]; });
}

/**
 * Aligns two circles
 */
function align(c1, c2){
    c1.attr('display', null);
    c1.attr('cx', d3.select(c2).attr('cx'));
    c1.attr('cy', d3.select(c2).attr('cy'));
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

function freqByDayOfYear(rows){
    return d3.nest()
        .key(function(d){return mmddFormat(new Date(d.YEAR, d.MONTH-1, d.DAY));})
        .rollup(function(d){
            return d3.sum(d.map(function(e){
                return +e.DATE_FREQUENCY;
            }));
        })
        .map(rows);
}

function freqByYear_(rows){
    return d3.nest()
        .key(function(d){return d.YEAR;})
        .rollup(function(d){
            return d3.sum(d.map(function(e){
                return +e.DATE_FREQUENCY;
            }));
        })
        .map(rows);
}

function frewByDate(rows){
    return d3.nest()
        .key(function(d){return new Date(d.YEAR,d.MONTH-1,d.DAY);})
        .rollup(function(d){return +d[0].DATE_FREQUENCY;})
        .map(rows);
}