"use strict"; 
var AlgorithmAbstract =require ('./AlgorithmAbstract');

var myClass="AlgorithmOneMax";
var outputPriority=555;

class AlgorithmOneMax  extends AlgorithmAbstract{	
    constructor(problem, probCross, probMut, maxSteps) {
    	super(problem, probCross, probMut, maxSteps);	
    }

      initialize(popSize, chromLength){    		
        this.population = new Common.Elements.Population();   
        this.population.initialize(popSize, chromLength);        
		for (var i = 0; i < this.population.getSize(); i++){
				this.problem.evaluateStep(this.population.getIndividual(i));
		}
		this.population.computeStats();    	
    }	
		
    run(){
        var myMethod="run()";
        
        Output.showInfo(outputPriority,myClass,myMethod,"STEP "+this.step);  
        //SELECT TOURNAMENT
        var cro1 = this.selectTournament(this.population);    
        var cro2 = this.selectTournament(this.population);
        
        
        
        if (cro1.getFitness()==0 || cro2.getFitness()==0){
            throw "ERROR el fitness no está definido"
        }
        
        while (cro1==cro2){ //SI SON IGUALES SE SELECCIONA OTRO
            console.log("IGUALES")
            cro2 = this.selectTournament(this.population);
        }

        var son = this.cross(cro1,cro2,this.probCross);

            
        
        son = this.mutate(son,this.probMut);

        this.problem.evaluateStep(son);
   
        return son;        
    }
}


module.exports = AlgorithmOneMax;