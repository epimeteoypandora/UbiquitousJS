"use strict"; 
var AlgorithmCVRPAbstract =require ('./AlgorithmCVRPAbstract');

var myClass="AlgorithmCVRP";
var outputPriority=555;


class AlgorithmCVRP  extends AlgorithmCVRPAbstract{	
    constructor(problem, probCross, probMut, probLS, maxSteps) {
    	super(problem, probCross, probMut, probLS, maxSteps);
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
        var arrayParents=this.selectTournament2(this.population);

        var son = this.cross(arrayParents[0],arrayParents[1],this.probCross);   

        son = this.mutate(son,this.probMut);

        this.problem.evaluateStep(son);
        
        var bestLS = this.localSearch(this.probLS,son,this.population,this.problem);
        if (bestLS.getFitness()>son.getFitness()){
            son=bestLS;
        }
	
        return son;        
    }
    runCallback(callback){
        var arrayParents=null;
        setImmediate(    ()=>{
            arrayParents=this.selectTournament2(this.population);
        }); 
        
        var son=null;
        setImmediate(    ()=>{
            son = this.cross(arrayParents[0],arrayParents[1],this.probCross);          
        }); 

        setImmediate(    ()=>{        
            son = this.mutate(son,this.probMut);          
        });         

        setImmediate(    ()=>{  
            this.problem.evaluateStep(son);          
        });         

        setImmediate(    ()=>{          
            var bestLS = this.localSearch(this.probLS,son,this.population,this.problem);
            if (bestLS.getFitness()>son.getFitness()){
                son=bestLS;
            }        
            callback(son);             
        });              
    }   
	
}

module.exports = AlgorithmCVRP;