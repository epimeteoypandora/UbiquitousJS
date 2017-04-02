"use strict"; 
var myClass="AlgorithmAbstract";
var outputPriority=200;

class AlgorithmAbstract  {	
    constructor(problem, probCross, probMut, maxSteps){
        this.population = null;     
        this.problem = problem;    
        this.probCross = probCross;
        this.probMut=probMut;     
        this.running=false;
        this.step=0;
        this.maxSteps = maxSteps;        
        this.solutionFound=false;    		
    }
    initialize(popSize,chromLength){
        throw new Error("Abstract Method.");    	
    }    
    load(population){
        this.population=population;   	
    }       
    selectTournament(pop){
        var myMethod="selectTournament(pop)";
        
    	var p1 = Math.floor(Math.random()*pop.getSize());
    	var p2 = 0;
        do{  
            p2 = Math.floor(Math.random()*pop.getSize());  
        }   
        while (p1==p2);	
        
         if (pop.getIndividual(p1).getChromosome().getSize()==0) throw "ERROR no debería ser cero" //TODO
         
         if (pop.getIndividual(p2).getChromosome().getSize()==0) throw "ERROR no debería ser cero" //TODO
        
        if (pop.getIndividual(p1).getFitness()>pop.getIndividual(p2).getFitness()){
            Output.showInfo(outputPriority,myClass,myMethod,"SELECT TOURNAMENT -> "+p1);
        	return pop.getIndividual(p1).clone();
        } else { 
            Output.showInfo(outputPriority,myClass,myMethod,"SELECT TOURNAMENT -> "+p2); 	
        	return pop.getIndividual(p2).clone();
        }    	
    }
    
    
    selectTournament2(pop){
        
        var selectedParentsPos=[];
        var parentPos=null;
        while (selectedParentsPos.length<4){
            parentPos=Math.floor(Math.random()*pop.getSize());
            if (selectedParentsPos.indexOf(parentPos)==-1){
                selectedParentsPos.push(parentPos);
            }
        }
        var firstSelected=null;
        var secondSelected=null;
        
        if (pop.getIndividual(selectedParentsPos[0]).getFitness()>pop.getIndividual(selectedParentsPos[1]).getFitness()){
        	firstSelected = pop.getIndividual(selectedParentsPos[0]).clone();
        } else { 	
        	firstSelected =  pop.getIndividual(selectedParentsPos[1]).clone();
        }         
	
        if (pop.getIndividual(selectedParentsPos[2]).getFitness()>pop.getIndividual(selectedParentsPos[3]).getFitness()){
        	secondSelected = pop.getIndividual(selectedParentsPos[2]).clone();
        } else { 	
        	secondSelected =  pop.getIndividual(selectedParentsPos[3]).clone();
        }            
        return [firstSelected,secondSelected];
        
    }    
    
    cross(indiv1, indiv2, probCross){
	      var son = new Common.Elements.Individual();
	      var chro = indiv1.getChromosome().cross(indiv2.getChromosome(),probCross);
	      son.setChromosome(chro);
	      
	   if (son.getChromosome().getSize()==0){
	       console.log("indiv1 "+JSON.stringify(indiv1));     
	       console.log("indiv2 "+JSON.stringify(indiv2));                
	       throw "ERROR no debería ser cero" //TODO
	   } 
	   
		return son;    	
    	
    }
    
    mutate(indiv, probMut){
        var myMethod="mutate(indiv, probMut)";
        Output.showInfo(outputPriority,myClass,myMethod,"VAMOS A MUTAR METHODSDEFAULT probMut="+probMut);
        indiv.getChromosome().mutate(probMut);   
        if (indiv.getChromosome().getSize()==0) throw "ERROR no debería ser cero" //TODO        
    	return indiv;    	
    }

    
    replaceWorst(son){
        var pos = this.population.replaceWorst(son); 
        
        
        if (pos!=-1){ //Si se ha producido el reemplazo.
            this.population.computeStats();
            if (this.population.getBestIndividual().getFitness()>=this.problem.targetFitness){ 
                    console.log("this.population.getBestIndividual().getFitness()="+this.population.getBestIndividual().getFitness());
                    console.log("this.problem.targetFitness="+this.problem.targetFitness);
                    this.showSolutionFound();
                    this.solutionFound=true;
            }                
        } 
        this.step++; 	
        return pos; //Devolvemos la posición de reemplazo.
    }

    showSolutionFound(){
            console.log("Solution Found! After ");
            console.log(this.problem.fitnessCounter);
            console.log(" evaluations");    		
    }

    showSolution(){
        Output.showLog();
        console.log("FINNNNNNNNNNNNNNNNN")
        console.log("  FITNESS: "+this.population.getBestIndividual().getFitness());
        console.log(" CHROMOSOME: "+JSON.stringify(this.population.getBestIndividual())); 
        return this.population.getBestIndividual();
    }

    hasFinished(){
        if (this.solutionFound || this.step>this.maxSteps){
            console.log("this.solutionFound="+this.solutionFound);
            console.log("this.step>this.maxSteps="+(this.step>this.maxSteps))
            console.log("this.step="+this.step);
            console.log("this.maxSteps="+this.maxSteps);
            return true;
        } else {
            return false;
        }     		
    }
	    
    getPopulation (){ //Solo lo utiliza MonitorAlgorithm
		return this.population;  	
    }  
    doReplacements (replacements){
    	var myMethod="doReplacements(replacements)"
    	Output.showInfo(outputPriority,myClass,myMethod,"STEP "+this.step);  
        for (var i=0;i<replacements.length;i++){
            this.population.replace(Common.Elements.Individual.fromJSON(replacements[i].indiv), replacements[i].pos);
        }      			
    }       
    
    run (){
		throw new Error("Abstract Method.");    	
    }    
    
	
}

module.exports = AlgorithmAbstract;