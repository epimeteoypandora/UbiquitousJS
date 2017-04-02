function LocalApplication(){}

LocalApplication.prototype = {
    initialize : function(algorithm){
        this.startTime=0;
        this.finalTime=0;
        this.algorithm=algorithm;
        this.running=false;    
    },   
    run : function(){ 
        while (this.running){
            
            if (!this.algorithm.hasFinished()){        	
                var son  = this.algorithm.run();
                this.algorithm.replaceWorst(son);
            } else {
                console.log("STEP "+this.algorithm.step);
                console.log("MAXSTEPS "+this.algorithm.maxSteps);
                console.log("SOLUTION FOUND "+this.algorithm.solutionFound);
                
                console.log("fin")
                this.running=false;
                this.finalTime=new Date().getTime();
                console.log("  TIME: "+(this.finalTime-this.startTime));
                this.algorithm.showSolution();
            }    
        }            
    },
    start : function(){ 
        this.startTime = new Date().getTime();
        this.running=true;
        this.run();            
    },
    stop : function(){
            running=false;
    },  
    resume : function(){
            running=true; 
    },    
    pause : function(){
            running=false; 
    }
}

module.exports = LocalApplication;