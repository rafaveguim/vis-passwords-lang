
// File/table headers. Those keys should be consistent thorough the files.  
var hPwd	  = "Password",
	hWord	  = "Word",		  
	hPwdId	  = "IDPassword",
	hWordId	  = "IDWord",
	hFreq	  = "Frequency",  // absolute frequency
	hMembers  = "WordMembers", // words contained in a password
	hCoOccur  = "CoOccurrences",
	hRelFreq  = "Relative Frequency Difference",
	
	// dimensions that shouldn't be included as axes
	noAxisDimensions = [hWord, hCoOccur, hWordId],
	
	pwds; // nested structure. The key is a word and the value is the collection (array)
	      // of "rows" (associative array) corresponding to that word in the "TopPwdsPerWord.csv"


/**
 * Extract an array of IDs from a "co-occurrence string". 
 * @param coOccurString a string in the format "1;10;58,2569..."
 * @returns an array of integers
 */
function coOccurIds(coOccurString) { return coOccurString.match(/\d+/g); }

