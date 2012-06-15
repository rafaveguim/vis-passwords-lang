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
    month   = d3.time.format("%m"),
    week    = d3.time.format("%U"),
    year    = d3.time.format("%Y"),
    fullFormat  = d3.time.format("%Y-%m-%d"),
    mmddFormat  = d3.time.format("%m-%d");


var tree, daysOfYear;

// an array with filtering functions
var filterStack;

window.addEventListener("load", start, false);

function start(){
    d3.csv('calendar_huge.csv', function(rows){
        // calendar metrics
        cellSize = (width('chart') - margin.right - margin.left)/53;

        daysOfYear = d3.nest()
		    .key(function(d){return mmddFormat(new Date(d.YEAR, d.MONTH-1, d.DAY));})
		    .map(rows);
        tree = d3.nest().key(function(d){return +d.YEAR;})
		        .key(function(d){return new Date(d.YEAR,d.MONTH-1,d.DAY);})
		        .map(rows);

        drawAggregateCalendar();
        drawBall();
        
        drawWordleForYears(d3.keys(tree));
    })
}

/**
 * Draws an aggregate wordle for passwords corresponding
 * to all the years informed.
 * @param years array of year. It can be strings or numbers. we're robust =D
 */
function drawWordleForYears(years){
	years = years.map(function(d){return +d});
	dates = d3.merge(years.map(function(y){return d3.time.days(new Date(y++,0,1), new Date(y,0,1));}))
	wordle(dates, d3.scale.log());
}


/**
 * Draws a radial representation for years.
 * It consists of concentric 'orbits', where years, represented
 * by small ellipses, lie over.
 * Each orbit corresponds to a decade.
  */
function drawBall(){
    var w = width('ball'), h = height('ball');

    var years = {};
    d3.keys(tree).forEach(function(k){
        years[k] = d3.sum(d3.values(tree[k]).map(function(u){
            return +u[0].DATE_FREQUENCY;
        }))
    });

    var decades = decades_(d3.keys(years).sort());

    var color = d3.scale.quantile()
        .domain(d3.values(years))
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
        .on('click', function(d,i){
            selection.attr('display','none');
            ringSelected.style('display', 'none');
            clearDim();
            drawAggregateCalendar();
            drawWordleForYears(d3.keys(tree));
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
        .data(d3.range(decades.length))
        .enter().append("circle")
        .attr("r", radius);
    
    // an invisible 'base ring' to broaden the clicking area of rings
    svg.select('g.ring')
       .selectAll("circle.mask")
       .data(d3.range(decades.length))
       .enter().append("circle")
       .attr('class', 'mask')
       .style('stroke-width', 6)
       .attr("r", radius)
       .on('mouseover', function(d){
    	   ringHover.style('display', null);
    	   ringHover.attr('r', radius(d));
       })
       .on('mouseout', function(){
    	   ringHover.style('display', 'none');
       })
       .on('click', function(d, i){
    	   dimDecadesExcept(i);
    	   ringSelected.style('display', null);
    	   ringSelected.attr('r', radius(d));
    	   selection.attr('display', 'none');
    	   var years = d3.range(i*10+1900, i*10+1910);
    	   drawAggregateCalendar(years);
    	   drawWordleForYears(years);
       });
    
    var ringSelected = svg.select('g.ring')
                          .append('circle')
                          .attr('class', 'selection decade_selection'),
        ringHover = svg.select('g.ring')
				       .append('circle')
				       .attr('class', 'hover decade_hover')
				       .style('pointer-events', 'none');

    // appending 'internal labels' (1940s, 1990s..)
    svg.append('g')
    	.attr('class', 'internal_label')
    	.selectAll('text')
    	.data(decades.map(function(a){return a[0];}))
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
	         return radius(decades.length)*Math.cos(angle(i));
	     })
	     .attr("y", function(d,i){
	    	var y = radius(decades.length)*Math.sin(angle(i));
	    	return y + d3.select(this).style('font-size').replace(/\D+/,'')/2;
	     })
	    .text(String)
	    .attr('cursor', 'hand')
	    .on('click', function(d){
	    	var years = svg.selectAll('circle.year')
		    	   .classed('dimmed', true)
		    	   .classed('unclickable', true)
		    	   .filter(function(y){return (y.year+'')[3]==d})
		    	   .classed('dimmed', false)
		    	   .classed('unclickable', false)
		    	   .data()
		    	   .map(function(d){return +d.year});
		    drawAggregateCalendar(years);
	    	ringSelected.style('display', 'none');
	    	drawWordleForYears(years);
	    });

    var hover = svg.append('circle')
        .attr('class','year_hover')
        .attr('display','none')
        .attr('r',7);

    // two-levels of data-binding here. decades -> svg:g; years -> svg:circle
    svg.selectAll("g.decade")
        .data(decades)
        .enter()
        .append("g")
        .attr("class", "decade")
      .selectAll("circle")
        .data(function(a,i){ // cross decades with years
            return a.map(function(d,j){
                return {year:+d, decade:i, freq: years[+d]}
            })
        })
        .enter()
        .append("circle")
        .attr("cx", function(d,i){ return radius(d.decade)*Math.cos(angle(i)); })
        .attr("cy", function(d,i){ return radius(d.decade)*Math.sin(angle(i)); })
        .attr("r", 4)
        .attr("class", function(d) { return "q" + color(d.freq) + "-9"; })
        .classed("year", true)
        .on("click", function(d){
            drawCalendar(d.year);
            align(selection, this);
            selection.style('fill', d3.select(this).style('fill'));
            drawWordleForYears([d.year]);
        })
        .on("mouseover", function(){ align(hover, this); })
        .on("mouseout", function(){ hover.attr('display','none') })
        .append("title")
        .text(function(d){return d.year+': '+d.freq;});

    var selection = svg.append('circle')
            .attr('class','selection year_selection')
            .attr('display','none')
            .attr('r',7);
}

/**
 * Draws an aggregate calendar corresponding to a range of years.
 * @param range array like [min, max], inclusive. If not informed,
 * draws the calendar aggregating all the years available.
 */
function drawAggregateCalendar(years){
    var freq = {};
    if (years==null){ // if no years informed, consider them all
        years = d3.keys(tree).map(function(d){return +d});
        d3.keys(daysOfYear).forEach(function(k){
        	freq[k] = d3.sum(daysOfYear[k].map(function(e){ return +e.PWD_FREQUENCY}));
        });
    } else {
        d3.keys(daysOfYear).forEach(function(k){
            var dates = daysOfYear[k].filter(function(date){return years.indexOf(+date.YEAR)!=-1});	        
            freq[k] = d3.sum(dates.map(function(e){ return +e.PWD_FREQUENCY}));
        });	
    }
	
    var w  = width('chart'), h = height('chart'),
        year = 1967,
        color = d3.scale.quantile()
                .domain(d3.values(freq))
                .range(d3.range(9));

    d3.select('#chart').select('svg').remove(); // cleaning

    var svg = d3.select("#chart").append("svg")
                .attr("width", w)
                .attr("height", h)
                .attr("class", "YlGnBu")
                .append("g")
                .attr("transform", "translate(" + margin.left + ","
                + ((h - cellSize * 7) / 2) + ")");

    svg.append("text")
        .attr("transform", "translate(-6," + cellSize * 3.5 + ")rotate(-90)")
        .attr("text-anchor", "middle")
        .text(years[0]+" to "+years[years.length-1]);
    
    var rect = svg.selectAll("rect.day")
        .data(function(d) { return d3.time.days(new Date(year, 0, 1), new Date(year + 1, 0, 1)); })
        .enter().append("rect")
        .attr("class", "day")
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("x", function(d) { return week(d) * cellSize; })
        .attr("y", function(d) { return day(d) * cellSize; })
        .datum(function(d){return mmddFormat(d);})
        .attr("class", function(mmdd) { return "day q" + color(freq[mmdd]) + "-9"; })
        .on('click', function(mmdd){
        	var dates = d3.keys(tree)
        				  .filter(function(d){return years.indexOf(+d)!=-1;})
        				  .map(function(y){return fullFormat.parse(y+'-'+mmdd);});
        	wordle(dates, d3.scale.linear());
        })
        .append('title')
        .text(function(d) { return d + ": " + freq[d]; });

    svg.selectAll("path.month")
        .data(function() { return d3.time.months(new Date(year, 0, 1), new Date(year + 1, 0, 1)); })
        .enter().append("path")
        .attr("class", "month")
        .attr("d", monthPath);
}

function drawCalendar(year){
    var dates = {};
    d3.keys(tree[year]).forEach(function(d){
        dates[new Date(d)] = +d3.values(tree[year][d])[0].DATE_FREQUENCY;
    });

    var color = d3.scale.log()
        .domain(d3.extent(d3.values(dates)))
        .range([0,8]);

    var w  = width('chart'), h = height('chart');

    d3.select('#chart').select('svg').remove(); // cleaning

    var svg = d3.select("#chart").append("svg")
            .attr("width", w)
            .attr("height", h)
            .attr("class", "YlGnBu")
            .append("g")
            .attr("transform", "translate(" + margin.left + ","
            + ((h - cellSize * 7) / 2) + ")");

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
            wordle([d], d3.scale.log());
        });

    rect.append("title")
        .text(function(d) { return fullFormat(d) + ': 0'; });

    svg.selectAll("path.month")
        .data(function() { return d3.time.months(new Date(year, 0, 1), new Date(year + 1, 0, 1)); })
        .enter().append("path")
        .attr("class", "month")
        .attr("d", monthPath);

    rect.filter(function(d) { return d in dates; })
        .attr("class", function(d) { return "day q" + Math.round(color(dates[d])) + "-9"; })
        .select('title')
        .text(function(d) { return fullFormat(d) + ": " + dates[d]; });
}

/**
 * Aligns two circles
 */
function align(c1, c2){
    c1.attr('display', null);
    c1.attr('cx', d3.select(c2).attr('cx'));
    c1.attr('cy', d3.select(c2).attr('cy'));
}


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
 * Modify the "ball" so that all decades are dimmed except the informed one.
 * @param i index of the decade not to be dimmed
 */
function dimDecadesExcept(i){
	d3.selectAll('g.decade')
 	  .filter(function(o,k){return i!=k})
 	  .selectAll('circle.year')
 	  .classed('dimmed', true)
 	  .classed('unclickable', true);
	d3.selectAll('g.decade')
  	  .filter(function(o,k){return i==k})
  	  .selectAll('circle.year')
      .classed('dimmed', false)
      .classed('unclickable', false);
}

/**
 * Cancel the dim effect for all decades
 */
function clearDim(){
	d3.selectAll('circle.year')
	  .classed('dimmed', false)
	  .classed('unclickable', false);
}

/**
 * Divide an array of year in groups of ten.
 * @param years array of years to be split in decades. Should start with the first year of a decade and should
 * not contain gaps.
 * @return 2-dimensional array. Each column is a decade.
 */
function decades_(years){
    var dec = d3.split(years, function(d){return d%10==0;});
    dec.forEach(function(d,i){d.unshift(d[0]-1);});
    return dec;
}

function freqByDayOfYear(rows){
    return d3.nest()
        .key(function(d){return mmddFormat(new Date(d.YEAR, d.MONTH-1, d.DAY));})
        .rollup(function(d){
            return d3.sum(d.map(function(e){
                return +e.PWD_FREQUENCY;
            }));
        })
        .map(rows);
}

function freqByYear(rows){
    return d3.nest()
        .key(function(d){return d.YEAR;})
        .rollup(function(d){
            return d3.sum(d.map(function(e){
                return +e.PWD_FREQUENCY;
            }));
        })
        .map(rows);
}

function freqByDate(rows){
    return d3.nest()
        .key(function(d){return new Date(d.YEAR,d.MONTH-1,d.DAY);})
        .rollup(function(d){return +d[0].DATE_FREQUENCY;})
        .map(rows);
}

function nestByDate(rows){
    return d3.nest()
        .key(function(d){return new Date(d.YEAR,d.MONTH-1,d.DAY);})
        .map(rows);
}


/**
 * Adds a new filter to the filter stack based on user input.
 */
function newFilter(){
	var key = document.getElementById("searchbox").value;
	var regex = buildRegex(key);
	
	filterStack.push(function(d){ return d.RAW.match(regex)!=null });

	updateViews();
}

/**
 * Reload views. Usually called after a filter is inserted or removed.
 */
function updateViews(){
	
}

