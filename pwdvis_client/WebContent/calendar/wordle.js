var w, h;
// cloud is the wordle in itself
// bin is the region where the filtered out words go to
var binWidth = 150, binHeight,
    cloudWidth, cloudHeight;

// the function for font size being last used
var fFontSize;

var passwords;

window.addEventListener("load", wordleMetrics, false);

function wordleMetrics(){
	w = width('wordle');
	binHeight = h = height('wordle');
	cloudWidth = w - binWidth;
	cloudHeight = h;
}

/**
 * Returns a function that determines the color of a word,
 * given a particular frequency value.
 * @param domain array in the form [min, max]
 */
function colorFunction(domain){
	var uninterp = d3.scale.linear().domain(domain).range([0,1]),
	    // fixed hue and variable lightness and saturation	
	    interp   = d3.interpolateHsl('hsl(30,100%,88%)', 'hsl(30,25%,25%)');
	
	return function(x){return interp(uninterp(x))};
}


/**
 * Returns a function that determines the font size of a word,
 * given a particular frequency value.
 * @param domain array in the form [min, max]
 */
function fontSizeFunction(domain){
	return fFontSize.range([15,80]).domain(domain);
}

/**
 * Draws Wordle
 * @param dates array of dates
 * @param fFont d3 scale function that determines the font size,
 * e.g., d3.scale.log()
 */
function drawWordle(dates, fFontSize){
	this.fFontSize = fFontSize;
    this.passwords = d3.merge(dates.map(function(d){ return tree[year(d)][d] }));
    passwords = passwords.filter(function(d){return d!=null});

    passwords.sort(function(a,b){return +b.PWD_FREQUENCY - +a.PWD_FREQUENCY});
    var subset = passwords.splice(0,300);
    
    var extent = d3.extent(subset.map(function(d){return +d.PWD_FREQUENCY;})),
    	color = colorFunction(extent),
    	fontSize = fontSizeFunction(extent);
    
    var subset = subset.map(function(d){
        return {text: d.RAW, size: fontSize(+d.PWD_FREQUENCY),
        		color: color(+d.PWD_FREQUENCY),
                value: +d.PWD_FREQUENCY};
    });

    plotWords([], true); //reset cloud
    // reset "filtered out" region
    getFilteredTexts().data([]).exit().remove();
    
    var callback = function(d){plotWords([d], false)};
    layoutCloud(subset, callback, true);
}

/**
 * Plots a collection of words on the screen
 * @param words collection of words
 * @param scratch if true, clear the previous words before
 * plotting. Otherwise, plot over the existent words. 
 */
function plotWords(words, scratch){
	if (scratch==null) scratch = true;
    
    // append svg only if necessary
    d3.select('#wordle').selectAll('svg')
        .data([null])
        .enter().append('svg')
        .attr('class', 'Greys')
        .attr('width', w)
        .attr('height', h)
        .append('g')
        .classed('cloud', true)
        .attr('transform', 'translate('+cloudWidth/2+','+cloudHeight/2+')')
        .append('text')
        .attr('class','hover');

    svg = d3.select('#wordle').selectAll('svg').select('g');

    var words = scratch ? words : svg.selectAll('text').data().concat(words);
    
    var bound = svg.selectAll('text').data(words);
    bound.exit().remove();
    bound.enter().append("text");

    svg.selectAll('text').call(cloudSetter);
}

/**
 * Transfers a password from the cloud to the "filtered out" region.
 * The context ('this') is of the selection of a single text element. 
 * @param d data associated with the text element
 */
function filterOut(d){
	var binOffset = w - binWidth;
	
	d3.select(this)
	  .transition()
	  .each('end', function(d){
		  // creating a corresponding element and placing it in the "filtered out" region
		  var out = getFilteredTexts().data();
		  out.push(d);
		  getFilteredTexts().data(out).enter().append('text')
		    .classed('filtered-out', true);
		  getFilteredTexts().attr('text-anchor', 'start')
		    .style('cursor', 'hand')
		    .attr('x', binOffset)
		    .attr('y', function(d,i){return (i+1)*22;})
		    .text(function(d){return d.text;})
		    .on('mouseover',function(){d3.select(this).style('fill', 'gray')})
		    .on('mouseout',function(){d3.select(this).style('fill', null)})
		    .on('click', backToCloud);
		  
		 d3.select(this).remove();
		 
		 // adding a word to replace the one we just removed
		 if ( (newcomer = passwords.shift()) != null){
			 var inside = d3.select('g.cloud').selectAll('text').data();
			 inside.push({text: newcomer.RAW, value: +newcomer.PWD_FREQUENCY});
			 d3.select('g.cloud').selectAll('text')
			   .data(inside)
			   .enter()
			   .append('text')
			   .call(cloudSetter);
		 }
		 
		 updateCloud();
	  })
	  .attr('transform', function(d){
		  var x = binOffset - cloudWidth/2,
		      y = (getFilteredTexts().data().length + 1)*22 - cloudHeight/2;
		  return 'translate('+ [x,y] +')';		  
	  })
	  .attr('text-anchor', 'start')
	  .style('font-size', '20px');
}

/**
 * Sends a password from the 'filtered out' region to the cloud.
 * The context ('this' variable) refers to the selection of a single text
 * element.
 * @param o data associated with the text element
 */
function backToCloud(o){
	// add this password back to the cloud
	var cloudData = d3.select('g.cloud').selectAll('text').data();
	cloudData.push(o);
	d3.select('g.cloud')
	  .selectAll('text')
	  .data(cloudData)
	  .enter()
	  .append('text')
	  .call(cloudSetter);
	// removes it from the filtered out region 
	d3.select(this).remove();
	// updates filtered out region (y-position)
	getFilteredText().attr('y', function(d,i){return (i+1)*22;});
	// updates cloud
	updateCloud();
}

function updateCloud(){
	data = d3.select('g.cloud')
	  		 .selectAll('text')
	  		 .data();
	
	var extent = d3.extent(data.map(function(d){return d.value})),
	    color = colorFunction(extent),
	    fontSize = fontSizeFunction(extent);
	
	var words = data.map(function(d){
        return {text: d.text, size: fontSize(d.value),
    		color: color(d.value), value: d.value};
		});

	var callback = function (newWords) {
		var updated = d3.nest()
		                .key(function(d){return d.text})
		                .rollup(function(array){return array[0]})
		                .map(newWords);
		
		var freq = newWords.map(function(d){return d.value});
		var duration = d3.scale.log().domain(d3.extent(freq)).range([250,1000]);
		
		// making invisible that words that don't appear in the new set
		d3.select('g.cloud').selectAll('text')
		  .filter(function(d){return updated[d.text]==null})
		  .style('font-size', 0);
		
		// updating words that remain
		d3.select('g.cloud').selectAll('text')
		.filter(function(d){return updated[d.text]!=null})
		  .transition()
		  .duration(function(d){return duration(d.value)})
		  .style("font-size", function(d) { return updated[d.text].size + "px"; })
		  .attr("transform", function(d) {
			  return "translate(" + [ updated[d.text].x, updated[d.text].y] +
			  ")rotate(" + updated[d.text].rotate + ")";
          })
          .attr('fill', function(d){ return updated[d.text].color; });
		
		// returns the set resulting from subtracting (newWords - words)
		var diff = newWords.filter(function(d){
			return !words.some(function(k){return k.text==d.text})
		})
		
		// including the words that don't appear before
		var data = d3.select('g.cloud').selectAll('text').data().concat(diff);
		d3.select('g.cloud').selectAll('text')
		  .data(data)
		  .enter()
		  .append('text')
		  .call(cloudSetter)
	}
	
	layoutCloud(words, callback, false);
}

function cloudSetter(sel){
    sel.style("font-size", function(d) { return d.size ? d.size + "px" : 0; })
       .attr("text-anchor", "middle")
       .attr("transform", function(d) {
    	   // prevents the words to be drawn outside the drawing region
    	   return !d.x || !d.y || d.x>cloudWidth/2 || d.y>cloudHeight/2 
    	   || d.x<-cloudWidth/2 || d.y<-cloudHeight/2 
    	   ? "translate(-10000,-10000)" : "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
       })
       .attr('fill', function(d){return d.color!=null ? d.color : null;})
       .text(function(d) { return d.text; })
       .on('mouseover', function(d){
    	   var c = d3.hsl(d3.select(this).attr('fill'));
    	   var hl = c.l > 0.5 ? c.darker() : c.brighter();
    	   d3.select(this)
    	     .attr('fill', hl.toString())
    	     .attr('original_color', c.toString())
    	     .attr('cursor','hand');
        })
        .on('mouseout', function(d){
    	   var c = d3.select(this).attr('original_color');
    	   d3.select(this)
    	     .attr('fill', c)
    	     .attr('originalColor', null);
        })
       .on('click', filterOut)
       .append('title')
       .text(function(d){return d.value;});
}

function layoutCloud(words, callback, incremental){
	 d3.layout.cloud().size([cloudWidth, cloudHeight])
	     .words(words)
	     .timeInterval(1)
	     .font('Trebuchet MS')
	     .rotate(0)
	     .fontSize(function(d) { return d.size; })
	     .color(function(d){return d.color;})
	     .value(function(d){return d.value;})
	     .on("word", function(d){ if (incremental) callback(d)}) // plots words incrementally
	     .on("end", function(d){ if (!incremental) callback(d)}) // plots words incrementally
	     .start();
}

function getFilteredTexts(){
	return d3.select('#wordle').select('svg').selectAll('text.filtered-out');
}
