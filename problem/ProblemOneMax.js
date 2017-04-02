
function ProblemOneMax() {
	this.targetFitness = -999999.9;
	this.tfKnown = false;
	this.fitnessCounter = 0;
}

ProblemOneMax.prototype.evaluateStep = function(indiv) {
	this.fitnessCounter++;
	return this.evaluate(indiv);
}

ProblemOneMax.prototype.evaluate = function(indiv) {
	var f = 0.0;
	for (var i = 0; i < indiv.getChromosome().getSize(); i++){
		if (indiv.getChromosome().getAllele(i)==1){
			f=f+1.0;
		} 
	}	
	indiv.setFitness(f);
}

module.exports = ProblemOneMax;