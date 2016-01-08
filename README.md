# Visualizing Language in Passwords

Click [here](http://vialab.science.uoit.ca/wordsinpasswords/) to try it live!

This is an interactive display comparing the language used in passwords with common language. 
I parsed the 32 million passwords of the [RockYou leak](http://techcrunch.com/2009/12/14/rockyou-hack-security-myspace-facebook-passwords/) and built a frequency distribution of the words found.
The parallel coordinates plot shows the 500 words whose frequency is mostly deviates from their frequency in common language, as represented by the British National Corpus (BNC), according to the G<sup>2</sup> measure.

Each word is represented by a polyline and its color tells whether it appear more (blue) or less (brown) frequently in passwords than in the BNC. You can click a word (polyline) to see the most frequent passwords containing it in the left pane. You can also *invert* the axes by clicking them, *reorder* the axes by dragging them horizontally (use the axis title on top) or *filter* the axes by clicking and dragging vertically. 
