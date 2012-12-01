
var nQuantiles = 6; //number of quantiles for polylinear scale


/**
 * Automatically chooses the proper scale for a dimension
 * based on metadata information from data.js.
 * @param d dimension (name)
 * @param h height (range) of the output space
 * @param dataset yes, the entire thing
 * @return a d3 scale
 */
function axisScale(d, h, dataset){
    var scale;
    scale = (linearDimensions.indexOf(d)!=-1) ? linearScale(d, h, dataset) 
											: quantileScale(d, h, dataset);
    return scale;
}

/**
 * Create a quantile scale function.
 * @param d dimension (name)
 * @param h height (range) of the output space
 * @param dataset yes, the entire thing
 * @return a d3 polylinear scale function based on quantiles
 */
function quantileScale(d, h, dataset){
    var q, t; // quantile functions and thresholds array 
	  
    q = d3.scale.quantile()	// dimension's quantile function
                .range(d3.range(1,nQuantiles+1))
                .domain(dataset.map(function(p){return +p[d];}));
	  
    // build an array with the thresholds
    t = d3.extent(dataset, function(p) { return +p[d]; }); // adding dimensions's extent
    // adding quantiles' thresholds in the middle of the extent's array
    for(var j=nQuantiles-2; j>=0; j--) 
	    t.splice(1, 0, q.quantiles()[j]); 
		  
    var l = h/nQuantiles; // height of each quantile
    var range = t.map(function(p,i){return (nQuantiles-i)*l;});
		  
    return d3.scale.linear().domain(t).range(range);
}

/**
 * Create a simple linear scale function
 * @param d dimension (name)
 * @param h height (range) of the output space
 * @param dataset yes, the entire thing
 * @returns a d3 simple linear scale function
 */
function linearScale(d, h, dataset){
	return d3.scale.linear()
             .domain(d3.extent(dataset, function(p) { return +p[d]; }))
             .range([h, 0]);
}
