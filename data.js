
// File/table headers. Those keys should be consistent thorough the files.  
var hPwd	  	 = "Password",
	hWord	  	 = "Word",		  
	hPwdId	  	 = "IDPassword",
	hWordId	  	 = "IDWord",
	hFreq		 = "Frequency",
	hRelFreqBnc  = "Relative frequency - BNC",  // absolute frequency in BNC
	hRelFreqPwd  = "Relative frequency - Passwords"
	hMembers  	 = "WordMembers", // words contained in a password
	hCoOccur  	 = "CoOccurrences",
	hRelFreq  	 = "Relative Frequency Difference",
	hRankFRel 	 = "Relative Frequency Difference Ranking",
	hRankG2   	 = "Difference Ranking",
	hG2		  	 = "G2",
    hAbsFreqBnc  = "Absolute frequency - BNC",
    hAbsFreqPwd  = "Absolute frequency - Passwords",
    hId          = "Id",
	
	// dimensions that shouldn't be included as axes
	noAxisDimensions = [hWord, hCoOccur, hWordId, 
	                    hRelFreq, hAbsFreqBnc, hAbsFreqPwd, hRankFRel, hId],
	
	// dimensions that should have axes with linear scales
	linearDimensions = [hRankG2],
	
	// sets of dimensions that should have equal scale
	pairedDimensions = [/*[hRelFreqBnc, hRelFreqPwd]*/];
	
var	pwds; // nested structure. The key is a word and the value is the collection (array)
	      // of "rows" (associative array) corresponding to that word in the "TopPwdsPerWord.csv"


/**
 * Extract an array of IDs from a "co-occurrence string". 
 * @param coOccurString a string in the format "1 10 58 2569..."
 * @returns an array of integers
 */
function coOccurIds(coOccurString) { return coOccurString.match(/\d+/g); }

