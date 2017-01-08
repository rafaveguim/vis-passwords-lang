var m = [30, 10, 10, 10], //margins
	colorDim = hG2;  // name of the column mapped by color

var x,
	y = {},
	xBar,
	dragging = {},
	isSelected=false; //indicates that a some line is selected

var topPwds = {};

var line 		= d3.svg.line(),
	axis 		= d3.svg.axis().orient("left"),
	background,
	foreground,
	highlight,
	selected,
	tooltips,
	tooltip_pk,
	tooltip_selected,
	color,
	brushed,
	searched;


window.addEventListener("load", start, false);

	function start(){

		var w = width("stage_wrapper") - 20; // magic number to reduce usual error in width informed by the browser
		var h = height("body") - height("bottom_toolbar") - height("header");
		x = d3.scale.ordinal().rangePoints([0, w], 0.3);

		var svg = d3.select("#stage_wrapper")
				  .insert("svg:svg", "#bottom_toolbar")
				  .attr("id", "stage")
				  .attr("width", w)
				  .attr("height", h)
				  .append("svg:g")
				  .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

		// after using h and w to define the svg elem.
		// we adjust them to define the axes
		h -= m[0] + m[2];
		w -= m[1] + m[3]

		d3.csv("word_measures.csv", function(cars) {

			  // Extract the list of dimensions e sets the domain for the x-axis.
			  x.domain(dimensions = d3.keys(cars[0]).filter(function(d) {
			    return noAxisDimensions.indexOf(d)==-1; }));

			  // creates a quantile scale function for each dimension
			  dimensions.forEach(function(d,i,a){
				  y[d] = axisScale(d, h, cars);
			  });

			  // This block is for making axis to have the same scale
		      pairedDimensions.forEach(function(pair){
				  var mergedDomain = [], scale;

				  // merge domain of all the paired dimensions
				  pair.forEach(function(dim){
					  mergedDomain =
						  mergedDomain.concat(cars.map(function(d){return +d[dim]}));
				  });

				  // now sets the scale for each dimension
				  pair.forEach(function(dim){
					  scale = d3.scale.linear().domain(d3.extent(mergedDomain))
						   .range([h, 0]);
					  y[dim] = scale; });

			  });

		  // builds the diverging color mapping function based on a given dimension
		  //color = function(x){return x[colorDim]<0 ? "rosybrown" : "steelblue";};
		  color = function(x){return x[colorDim]<0 ? "rosybrown" : "rgb(102,179,204)";};
		  d3.csv("top_pwds_per_word.csv", function(pwdsCsv){
						pwdsCsv.forEach(function(d){d.Password = omitBadword(d.Password)});

						pwds = d3.nest()
						.key(function(d){return d["Word"];})
						.map(pwdsCsv);
					});

		  // Add the tooltips
		  tooltips =  d3.select("body")
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
		  searched = brushed = foreground = svg.append("svg:g")
					      .attr("class", "foreground")
					      .selectAll("path")
					      .data(cars)
					      .enter().append("svg:path")
					      .attr("d", path)
					      .on("mouseover", highlighting)
					      .style("stroke", color);

		  tpSelecTop = function(d){
							var dim = dimensions[0];
							return y[dim](d[dim]) + "px";
						};

		  highlight = svg.append("svg:polyline")
							.attr("class", "highlight")
							//.attr("style", "filter:url(#dropshadow)") Doesn't work properly on Chrome. What a pity.
							.on("click", function(d){
						    	isSelected = true;
						    	selected.data([d]).attr("d", path);
						    	updatePwdList(d["Word"], true);
						    	tooltip_selected.style("top",tpSelecTop(d))
						    	  					.text(d["Word"]);
						    })
						    .on("mouseout", function(){
								d3.select(this).attr("points", null);
								tooltip_pk.style("display", "none");
							})
							.on("mousedown", function(d){
								if (d3.event.ctrlKey){
									var ids = coOccurIds(d[hCoOccur]);
									foreground.each(function(p){
										if (ids.indexOf(p[hWordId]) != -1) // If p co-occur with d
											d3.select(this).style("stroke", "steelblue").attr("display", null);
										else d3.select(this).attr("display", "none");
									});
								}
							});

		  selected = svg.append("svg:path").attr("class", "selected");

		  tooltip_pk = d3.select("body")
		  				 .append("div")
		  				 .attr("class","tooltip tooltip_pk");
		  tooltip_selected = d3.select("body")
						       .append("div")
							   .attr("class","tooltip tooltip_selected")
							   .style("left", function(){
								   return leftOffset("stage_wrapper")
								          + position(dimensions[0])+"px";
								});


		  // Add a group element for each dimension.
		  var g = svg.selectAll(".dimension")
		      .data(dimensions)
		      .enter().append("svg:g")
		      .attr("class", "dimension")
		      .attr("transform", function(d) { return "translate(" + x(d) + ")"; })

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
		      .text(String)
		      ;

		  // Add and store a brush for each axis.
		  g.append("svg:g")
		      .attr("class", "brush")
		      .on("click", function(d){
		    	  // if the user clicks the axis, it is inverted
		    	  if (y[d].brush.empty()){
		    		  y[d].range(y[d].range().reverse());
		    		  updateLines(1000);
					  tooltip_selected.transition().duration(1000).style("top", tpSelecTop(d));
					  g.selectAll("g.axis").each(function(p){if (p==d) d3.select(this).call(axis.scale(y[d])); });
		    	  }
		      })
		      .each(function(d) {
		    	  d3.select(this).call(y[d].brush = d3.svg.brush().y(y[d]).on("brush", brush));
		       })
		      .selectAll("rect")
		      .attr("x", -8)
		      .attr("width", 16);
		});
	}

		function updateLines(dur){
			if (dur){
				foreground.transition().duration(dur).attr("d", path);
				background.transition().duration(dur).attr("d", path);
				if (highlight.data()!=null)
					highlight.transition().duration(dur).attr("d", path);
				if (isSelected)
					selected.transition().duration(dur).attr("d", path);
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

		function transition(g) { return g.transition().duration(500); }

		function width(el) { return document.getElementById(el).clientWidth;  }

		function height(el){ return document.getElementById(el).clientHeight; }

		function leftOffset(el){
			return document.getElementById(el).getBoundingClientRect().left + window.pageXOffset ;
		}

		// Returns the path's 'd' attribute for a given data item
		function path(d) {
			return line(dimensions.map(function(p) { return [position(p), y[p](d[p])]; }));
		}

		// Returns the polyline points for a given data item.
		function points(d) {
			var points = dimensions.map(function(p) { return parseInt(position(p)) + "," + parseInt(y[p](d[p])); });
			return points.join(" ");
		}

		// Handles a brush event, toggling the display of foreground lines.
		// Coordinates with search, also.
		function brush() {
		  var actives = dimensions.filter(function(p) { return !y[p].brush.empty(); }),
		      extents = actives.map(function(p) { return y[p].brush.extent(); });

		  // indicates brushing is disabled and search is active
		  if (actives.length==0 && searched!=foreground){
			  brushed = foreground;
			  search(); // so we need to re-search
		  }
		  else
			  brushed = searched.filter(function(d){
				  display = actives.every(function(p, i) {
				      return extents[i][0] <= d[p] && d[p] <= extents[i][1];
				  });

				  d3.select(this).style("display", display ? null : "none" );

				  return display;
			  });
		}

		function highlighting(d){
			  // position axes' tooltips
			  tooltips.each(function (p,i){
				  d3.select(this)
			    	.style("top", y[p](d[p])+"px")
			    	.text(d[p]);
			  });

			  var word = d["Word"]; //highlighted word

			  highlight.data([d]).attr("points", points);
			  tooltip_pk.text(word) // position 'main tooltip'
			  			.style("top", d3.event.clientY + 15 + "px")
			  			.style("left", d3.event.clientX + 15 + "px")
			  			.style("display", "block");

			  if (!isSelected) updatePwdList(word, false);
		}

		// although the parameter is named words, each element is an array [word, frequency]
		function updatePwdList(word, transition){
												// for each pwd associated with the current word,
												// let's return an array [pwd, frequency]
			var words = !pwds[word] ? [] : pwds[word].map(function(p){return [p[hPwd], p[hFreq]];});
			words.sort(function(a,b){return -(a[1]-b[1]);});

			var wrappers = d3.select("#pwd_list")
							 .selectAll("div.pwd_wrapper")
							 .data(words);

			if (words.length>0)
			{
			    var     min = words.slice(-1)[0][1],
				        max = words[0][1],
				         x1 = leftOffset("left_panel"),
				       xBar = d3.scale.linear().domain([min, max])
								.range([x1, x1+width("left_panel")]),
					  enter = wrappers.enter(),
				     textHL = function(d){return d[0] + " (" + d[1] + ")";},
			    textRegular = function(d){return d[0];};

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

				if (transition)	wrappers.select("div.pwd_bar")
										.transition()
										.style("width", function(d){return xBar([d[1]]) + "px";});
				else   			wrappers.select("div.pwd_bar")
										.style("width", function(d){return xBar([d[1]]) + "px";});
			}

			wrappers.exit().remove();
		}

		// returns the x position of a tooltip associated to one dimension
		// the x position is relative to the page
		function tooltipXposition(d){
			return x(d)+leftOffset("stage_wrapper")+"px";
		}

		function search(){
			var key = document.getElementById("searchbox").value;

			// when there's no key, it means the search box was reseted
			if (key==""){
				searched = foreground; // resets searched selection
				brush(); // brush needs to be updated!
			}
			else  // if there's a key, search operates over brush results
				searched = brushed.filter(function(d){
					  w = d[hWord];
					  display = (w.length >= key.length
								&& w.substring(0, key.length)==key);

					  d3.select(this).style("display", display ? null : "none" );

					  return display;
				});
		}
