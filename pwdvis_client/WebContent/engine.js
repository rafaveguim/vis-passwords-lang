

var m = [30, 10, 10, 10], //margins
	nQuantiles = 4; //number of quantiles
	colorDimension = 0;
	
var x,
	y = {},
	xBar,
	dragging = {},
	isSelected=false; //indicates that a some line is selected

var topPwds = {};

var line = d3.svg.line(),
	axis = d3.svg.axis().orient("left"),
	background,
	foreground,
	highlight,
	selected,
	tooltips,
	tooltip_pk,
	tooltip_selected,
	color;

var pwds; // nested structure. The key is a word and the value is the collection (array)
		  // of "rows" (associative array) corresponding to that word in the "TopPwdsPerWord.csv"

window.addEventListener("load", start, false);

	function start(){

		var w = width("stage_wrapper") - m[1] - m[3];
		var h = height("stage_wrapper") - m[0] - m[2];
		x = d3.scale.ordinal().rangePoints([0, w], 0.3);
		
		var svg = d3.select("svg")
		  .append("svg:g")
		  .attr("transform", "translate(" + m[3] + "," + m[0] + ")");
		
		d3.csv("freqDiffByWord_AbsDiffScoreTop100.csv", function(cars) {
		
			  // Extract the list of dimensions e sets the domain for the x-axis.
			  x.domain(dimensions = d3.keys(cars[0]).filter(function(d) {
			    return d != "Word"; }));
			  
			  // creates a quantile scale function for each dimension
			  dimensions.forEach(function(d,i,a){
				  var quantiles = [], dThresholds = [];
				  
				  quantiles[d] = d3.scale.quantile()	// dimension's quantile function
						.range(d3.range(1,nQuantiles+1))
						.domain(cars.map(function(p){return +p[d];}));
				  
				  // build an array with all the thresholds
				  dThresholds[d] = d3.extent(cars, function(p) { return +p[d]; }); // adding dimensions's extent
				  for(var j=nQuantiles-2; j>=0; j--) // adding quantiles' thresholds in the middle of the extent's array
					  dThresholds[d].splice(1,0,quantiles[d].quantiles()[j]); 
					  
				  var l = h/nQuantiles; // height of each quantile
				  var range = dThresholds[d].map(function(p,i){return (nQuantiles-i)*l;});
					  
				  y[d] = d3.scale.linear().domain(dThresholds[d])
					  			.range(range);
				  
				  // builds the diverging color mapping function based on a given dimension
				  if (i==colorDimension)
				  	color = d3.scale.linear().domain([dThresholds[d][0], 0, dThresholds[d].slice(-1)[0]])
				  			.range(["red", "steelblue", "springgreen"]);
				  
			  });
			  
		  
			d3.csv("top_pwds_per_word.csv", function(pwdsCsv){
				pwds = d3.nest()
						.key(function(d){return d["Word"];})
						.map(pwdsCsv);
			});
		
		  // Add the tooltips
		  tooltips = d3.select("body")
	  		.selectAll("div.tooltip_value")
	  		.data(dimensions)
	  		.enter()
	  		.append("div")
	  		.attr("class", "tooltip tooltip_value")
	  		.style("left", tooltipXposition)
	  		.text("");
		  
		  
		  // Add grey background lines for context.
		  background = svg.append("svg:g")
		      .attr("class", "background")
		    .selectAll("path")
		      .data(cars)
		    .enter().append("svg:path")
		      .attr("d", path);
		
		  // Add blue foreground lines for focus.
		  foreground = svg.append("svg:g")
		      .attr("class", "foreground")
		    .selectAll("path")
		      .data(cars)
		    .enter().append("svg:path")
		      .attr("d", path)
		      .on("mouseover", function(d) {
	 		    	 tooltips.each(function (p,i){
	 		    		  d3.select(this)
	 		    		  	.style("top", y[p](d[p])+"px")
	 		    		  	.text(d[p]);
	 		    		  });
	 		    	  
	 		    	 highlight.data([d]).attr("d", path);
	 		    	  
	 		    	 var word = d["Word"]; //highlighted word
	 		    	 
	 		    	 tooltip_pk.text(word)
	 		    	  				.style("top", d3.event.clientY + 15 + "px")
	 		    	  				.style("left", d3.event.clientX + 15 + "px")
	 		    	  				.style("display", "block");
	 		    	  
	 		    	 if (!isSelected)
	 		    		  updatePwdList(word, false);
		      })
		      .style("stroke", function(d){return color(d[dimensions[colorDimension]]);});

		  highlight = svg.append("svg:path")
							.attr("class", "highlight")
							.on("click", function(d){
							    	  isSelected = true;
							    	  selected.data([d]).attr("d", path);
							    	  updatePwdList(d["Word"], true);
							    	  tooltip_selected.style("top",tpSelecTop = function(){
							    		  						var dim = dimensions[0];
							    		  						return y[dim](d[dim]) + "px";})
							    	  					.text(d["Word"]);
						    	  })
						    .on("mouseout", function(){
													d3.select(this).attr("d", null);
													tooltip_pk.style("display", "none");
												});

		  selected = svg.append("svg:path").attr("class", "selected");
		  
		  tooltip_pk = d3.select("body")
		  					.append("div")
		  					.attr("class","tooltip tooltip_pk");
		  tooltip_selected = d3.select("body")
								.append("div")
								.attr("class","tooltip tooltip_selected")
								.style("left",function(){return leftOffset("stage_wrapper") + position(dimensions[0])+"px";});
		  		  
		  // Add a group element for each dimension.
		  var g = svg.selectAll(".dimension")
		      .data(dimensions)
		    .enter().append("svg:g")
		      .attr("class", "dimension")
		      .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
		      .on("click", function(d){
		    	  // if the user clicks the axis, it is inverted
		    	  if (y[d].brush.empty()){
		    		  y[d].range(y[d].range().reverse());
					  updateLines(1000);
					  tooltip_selected.transition().duration(1000).style("top", tpSelecTop);
					  g.selectAll("g.axis").each(function(p){if (p==d) d3.select(this).call(axis.scale(y[d])); });
		    	  }
		      })
		      .call(d3.behavior.drag()
		        .on("dragstart", function(d) {
		          dragging[d] = this.__origin__ = x(d);
		          // since the user will begin to move the axis around, is better to hide the tooltips
		          background.attr("visibility", "hidden");
		          tooltips.style("visibility", "hidden");
		          tooltip_pk.style("visibility", "hidden");
		        })
		        .on("drag", function(d) {
		          dragging[d] = Math.min(w, Math.max(0, this.__origin__ += d3.event.dx));
		          updateLines();
		          dimensions.sort(function(a, b) { return position(a) - position(b); });
		          x.domain(dimensions);
		          g.attr("transform", function(d) { return "translate(" + position(d) + ")"; });
		        })
		        .on("dragend", function(d) {
		          delete this.__origin__;
		          delete dragging[d];
		          transition(d3.select(this)).attr("transform", "translate(" + x(d) + ")");
		          updateLines();
		          background
		              .attr("d", path)
		              .transition()
		              .delay(500)
		              .duration(0)
		              .attr("visibility", null);
		          tooltips.style("left", tooltipXposition);
		          // he/she stopped, let's show the tooltips, then
		          background.attr("visibility", null);
		          tooltips.style("visibility", null);
		          tooltip_pk.style("visibility", null);
		          
		        }));
		
		  // Add an axis and title.
		  g.append("svg:g")
		      .attr("class", "axis")
		      .each(function(d) { d3.select(this).call(axis.scale(y[d]).ticks(10)); })
		    .append("svg:text")
		      .attr("text-anchor", "middle")
		      .attr("y", -9)
		      .text(String);
		
		  // Add and store a brush for each axis.
		  g.append("svg:g")
		      .attr("class", "brush")
		      .each(function(d) { 
		    	  d3.select(this).call(y[d].brush = d3.svg.brush().y(y[d]).on("brush", brush)); })
		    .selectAll("rect")
		      .attr("x", -8)
		      .attr("width", 16);
		});
	}
	
		function updateLines(dur){
			if (dur){
				foreground.transition().duration(dur).attr("d", path);
				background.transition().duration(dur).attr("d", path);
				// try-catch for the case of no highlighting or selection
				try {highlight.transition().duration(dur).attr("d", path);} catch(err){}
				try {selected.transition().duration(dur).attr("d", path	);} catch (err){}
			} else {
				foreground.attr("d", path);
				background.attr("d", path);
				try {highlight.attr("d", path);} catch(err){}
				try {selected.attr("d", path);} catch (err){}
			}
		}
		
		function position(d) {
		  var v = dragging[d];
		  return v == null ? x(d) : v;
		}
		
		function transition(g) {
		  return g.transition().duration(500);
		}
		
		function width(el){
			return document.getElementById(el).clientWidth;
		}
		
		function height(el){
			return document.getElementById(el).clientHeight;
		}
		
		function leftOffset(el){
			return document.getElementById(el).getBoundingClientRect().left + window.pageXOffset ;
		}
		
		// Returns the path for a given data point.
		function path(d) {
		  return line(dimensions.map(function(p) { return [position(p), y[p](d[p])]; }));
		}
		
		// Handles a brush event, toggling the display of foreground lines.
		function brush() {
		  var actives = dimensions.filter(function(p) { return !y[p].brush.empty(); }),
		      extents = actives.map(function(p) { return y[p].brush.extent(); });
		  foreground.style("display", function(d) {
		    return actives.every(function(p, i) {
		      return extents[i][0] <= d[p] && d[p] <= extents[i][1];
		    }) ? null : "none";
		  });
		}
		
		// although the parameter is named words, each element is an array [word, frequency]
		function updatePwdList(word, transition){
			var words = [];
			
			if (pwds[word])
				words = pwds[word].map(function(p){
							// for each pwd associated with the current word,
							// lets return an array [pwd, frequency]
							return [p["Passwords"], p["Frequency"]];
							});
			
			var wrappers = d3.select("#pwd_list")
					.selectAll("div.pwd_wrapper")
					.data(words);
			
			if (words.length>0){
				words = words.slice(0,45);
				
				var min = words.slice(-1)[0][1],
					max = words[0][1],
					x1 = leftOffset("left_panel");
				var xBar = d3.scale.linear().domain([min, max])
									.range([x1, x1+width("left_panel")]);
				
				var enter = wrappers.enter();
				
				var textHL = function(d){return d[0] + " (" + d[1] + ")";};
				var textRegular = function(d){return d[0];};
				
				enter.append("div").attr("class", "pwd_wrapper")
						.append("div").attr("class", "pwd_bar")
						.select(function(){return this.parentNode;})
						.append("p").attr("class", "pwd_label");
						
				wrappers.select("p").text(textRegular);
	
				wrappers.on("mouseover", function(d){
							d3.select(this).select("p").text(textHL).classed("pwd_label_hl", true);
							d3.select(this).select("div.pwd_bar").classed("pwd_bar_hl", true);
						})
						.on("mouseout", function(d){
							d3.select(this).select("p").text(textRegular).classed("pwd_label_hl", false);
							d3.select(this).select("div.pwd_bar").classed("pwd_bar_hl", false);
						});
				
				if (transition)
					wrappers.select("div.pwd_bar")
							.transition()
							.style("width", function(d){return xBar([d[1]]) + "px";});
				else 
					wrappers.select("div.pwd_bar")
					.style("width", function(d){return xBar([d[1]]) + "px";});
			}
			
			wrappers.exit().remove();				
		}
		
		// returns the x position of a tooltip associated to one dimension
		// the x position is relative to the page
		function tooltipXposition(d){
			return x(d)+leftOffset("stage_wrapper")+"px";
		}