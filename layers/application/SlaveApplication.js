'use strict';

class SlaveApplication{
    constructor() {}
    initialize(communications){
        this.communicationLayer=communications;
        this.algorithm=null;    
    }
   
    
    processResponse(type,data){
        //Nothing to do
    }        
    
    processRequest(type,data,callback){
        switch(type) {    
            case Common.Constants.MessageTypes.START:
                this.communicationLayer.reset();
                this.processStart(data,callback);
                break;   
            case Common.Constants.MessageTypes.NEXT_STEP:
                this.processNextStep(data,callback);
                break;    
            case Common.Constants.MessageTypes.SHOW_SOLUTION:
                this.webShowSolution(data)
                console.log("Solution Found!")
                if (Common.Constants.FromFile){ //Si se ha cargado de un archivo se recarga rapido para poder continuar el TEST.
                    this.loadCVRPProblemFromFile(Common.Constants.FileName);  //RESETEAR PROBLEMA PARA EMPEZAR DE NUEVO RÁPIDO
                } 
                callback();
                break;              
            default:
                throw "ERROR: El método recibido no existe.";
        }          
    }
    
    processNextStep(data,callback){ 
        this.webNextStep(data);
        var replacements =data[Common.Constants.ParameterTypes.REPLACEMENTS];       
//        console.log("total replacements -> "+replacements.length) 
        this.algorithm.doReplacements(replacements);
        this.algorithm.runCallback((son)=>{
            callback(son);
        }); //Devuelve hijo      
    }    
    

    
    
    processStart(data,callback){
        this.webStart(data);
        var algorithmType=data[Common.Constants.ParameterTypes.ALGORITHM_TYPE];
        switch(algorithmType) {
            case Common.Constants.AlgorithmTypes.CVRP:
                this.processStartCVRPResponse(data);
                callback();
                break;
            case Common.Constants.AlgorithmTypes.ONE_MAX:
                this.processStartOneMaxResponse(data);
                callback();
                break;   
            case Common.Constants.AlgorithmTypes.CVRP_LOCAL_DATA:
                this.processStartCVRPLocalDataResponse(data);
                callback();
                break;               
            default:
                throw new Error("ERROR: El método recibido no existe.");
        }         
    }
    processStartCVRPResponse(data){
    	console.log("    processStartCVRPResponse : function(data){ ")
        Common.setAlgorithm(Common.Constants.AlgorithmTypes.CVRP);
        var problem = Common.Elements.Problem.fromJSON(data[Common.Constants.ParameterTypes.PROBLEM]);
        var population=Common.Elements.Population.fromJSON(data[Common.Constants.ParameterTypes.POPULATION]);
        var probCross=data[Common.Constants.ParameterTypes.PROB_CROSS];
        var probMut=data[Common.Constants.ParameterTypes.PROB_MUT];
        var probLS=data[Common.Constants.ParameterTypes.PROB_LS]; 
        this.algorithm = new Common.Elements.AlgorithmCVRP(problem, probCross,probMut,probLS, -1); //maxSteps=-1      
        this.algorithm.load(population);        
    }
    processStartCVRPLocalDataResponse(data){
    	console.log("    processStartCVRPLocalDataResponse : function(data){ ")
        Common.setAlgorithm(Common.Constants.AlgorithmTypes.CVRP);        
    }
    processStartOneMaxResponse(data){ 
        //TODO
    	Common.setAlgorithm(Common.Constants.AlgorithmTypes.ONE_MAX);
    	var problem = new Common.Elements.Problem();
        var probCross=data[Common.Constants.ParameterTypes.PROB_CROSS];
        var probMut=data[Common.Constants.ParameterTypes.PROB_MUT];  
        var population=Common.Elements.Population.fromJSON(data[Common.Constants.ParameterTypes.POPULATION]);        
        this.algorithm = new Common.Elements.AlgorithmOneMax(problem,probCross,probMut, -1); //maxSteps=-1
        this.algorithm.load(population);  
//        console.log("ALGORITMO "+JSON.stringify(this.algorithm));
        console.log("processStartOneMaxResponse")        
    }
    
    webNextStep(data){
        if (data["REPLACEMENTS"]){
           console.log("Replacements to do -> "+data["REPLACEMENTS"].length);
       }           
    }
    webShowSolution(data){
        running=false;
        if (startedProblem){
            startedProblem=false;
            saveSolutionsInList(data);
            $('.show_solution_menu').show();
            $('.create_problem_menu').hide();
            $.mobile.pageContainer.pagecontainer("change", "#map_page", null);
            for (var i=0;i<markers.length;i++){
                markers[i].setDraggable(false);
            }
            setTimeout(function(){ showMarkersSolution(); },500);              
        }    
    }
    webStart(data){
        running=true;
        if (waitingStart){
              startedProblem=true;
              waitingStart=false;
        } else if (startedProblem){
              $('#messages').prepend($('<li>').text("Work in progress was cancelled by other user. A new Problem is starting."));
              startedProblem=false; //Se cancela el antiguo trabajo                  
        }        
    }

    stop(){
        this.communicationLayer.stop();
    }

    startCVRP3(maxSteps,popSize,matrixCost,arrayCustomers,probMut,probCross,probLS,nTrucks,truckCapacity,truckTime,penalCap,penalTime,targetFitness){ 
        Common.setAlgorithm(Common.Constants.AlgorithmTypes.CVRP); //TODO NECESITO EL ALGORITMO DISTRIBUIDO
     
        var data = {};
        data[Common.Constants.ParameterTypes.ALGORITHM_TYPE] = Common.Constants.AlgorithmTypes.CVRP;
        data[Common.Constants.ParameterTypes.ARRAY_CUSTOMERS] = arrayCustomers;
        data[Common.Constants.ParameterTypes.MATRIX_COST] = matrixCost;
        data[Common.Constants.ParameterTypes.N_TRUCKS] = nTrucks;
        data[Common.Constants.ParameterTypes.TRUCK_CAPACITY] = truckCapacity;
        data[Common.Constants.ParameterTypes.TRUCK_TIME] = truckTime;
        data[Common.Constants.ParameterTypes.PENAL_CAP] = penalCap;
        data[Common.Constants.ParameterTypes.PENAL_TIME] = penalTime;
        data[Common.Constants.ParameterTypes.TARGET_FITNESS] = targetFitness; 
        data[Common.Constants.ParameterTypes.PROB_CROSS] = probCross;
        data[Common.Constants.ParameterTypes.PROB_MUT] = probMut;
        data[Common.Constants.ParameterTypes.PROB_LS] = probLS;
        data[Common.Constants.ParameterTypes.MAX_STEPS] = maxSteps;
        data[Common.Constants.ParameterTypes.POP_SIZE] = popSize;        
        this.communicationLayer.start(data);        
    }
    startCVRPFromFile(){
        Common.setAlgorithm(Common.Constants.AlgorithmTypes.CVRP); //TODO NECESITO EL ALGORITMO DISTRIBUIDO
     
        var data = {};
        data[Common.Constants.ParameterTypes.ALGORITHM_TYPE] = Common.Constants.AlgorithmTypes.CVRP_LOCAL_DATA;    
        this.communicationLayer.start(data);        
    }
    startOneMax(){ 
        Common.setAlgorithm(Common.Constants.AlgorithmTypes.ONE_MAX); //TODO NECESITO EL ALGORITMO DISTRIBUIDO    	
        
//        var popSize=512;
        var popSize=256;
        var targetFitness=popSize;
//        var chromLength =512;
        var chromLength =256;
        var probCross=0.8;
        var probMut=1.0/chromLength;
        var maxSteps=50000;   
//        var maxSteps=100000;  
        
        var data = {};
        data[Common.Constants.ParameterTypes.ALGORITHM_TYPE] = Common.Constants.AlgorithmTypes.ONE_MAX;

        data[Common.Constants.ParameterTypes.POP_SIZE] = popSize;           
        data[Common.Constants.ParameterTypes.TARGET_FITNESS] = targetFitness; 
        data[Common.Constants.ParameterTypes.CHROM_LENGTH] = chromLength;        
        data[Common.Constants.ParameterTypes.PROB_CROSS] = probCross;
        data[Common.Constants.ParameterTypes.PROB_MUT] = probMut;
        data[Common.Constants.ParameterTypes.MAX_STEPS] = maxSteps;
        this.communicationLayer.start(data);        
    }
    loadCVRPProblemFromFile(file,callback){ 
//        $.getJSON( "dataProblem2.txt", function( jsonProblem ) {
         var startTimeLoading = new Date().getTime();
        var self = this;
        $.getJSON(file, function( jsonProblem ) {     
            
//            var seed = Common.Maths.createSeed(141650939);
//            Math.random=seed;    

            //Common.Maths.LAST_SEED=Math.floor(Math.random() * Common.Maths.SEEDS.length);
            var seed = Common.Maths.createSeed(Common.Maths.SEEDS[Common.Maths.LAST_SEED]);
            console.log("semilla utilizada="+Common.Maths.SEEDS[Common.Maths.LAST_SEED]);
            Math.random=seed;     
            Common.Maths.LAST_SEED=Common.Maths.LAST_SEED+1;
            if (Common.Maths.LAST_SEED>=Common.Maths.SEEDS.length)Common.Maths.LAST_SEED=0;
            
            
            Common.setAlgorithm(Common.Constants.AlgorithmTypes.CVRP);

            var problem = Common.Elements.ProblemCVRP.fromJSON(jsonProblem.problem);
            
            var nTrucks = jsonProblem.nTrucks;
//            console.log("###"+JSON.stringify(nTrucks))


            var crossProb = jsonProblem.crossProb;
//            console.log("###"+JSON.stringify(crossProb))
            
            var mutateProb = jsonProblem.mutateProb;
//            console.log("###"+JSON.stringify(mutateProb))
            
            var LSProb = jsonProblem.LSProb;
//            console.log("###"+JSON.stringify(LSProb))            
            
            var maxSteps = jsonProblem.maxSteps;
//            var maxSteps = 200;             
//            console.log("###"+JSON.stringify(maxSteps))            
            
            var population = Common.Elements.Population.fromJSON(jsonProblem.population);          
//            console.log("###"+JSON.stringify(popSize))            
            
            self.algorithm = new Common.Elements.Algorithm(problem, crossProb,mutateProb,LSProb, maxSteps);
            self.algorithm.load(population);
            var finalTimeLoading= new Date().getTime()
            console.log("Problem loaded in "+(finalTimeLoading-startTimeLoading)+"seconds")
            console.log("this.algorithm="+self.algorithm);
            console.log("Ready!")
            if (callback) callback();
        });              
    }
}


module.exports = SlaveApplication;