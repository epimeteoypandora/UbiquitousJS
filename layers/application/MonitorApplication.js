'use strict';
var EventEmitter = require('events');
var fs = require('fs'); 

class MonitorApplication{
    constructor() {}
    initialize(communications){

        this.communicationLayer=communications;
        this.maxTime=500000;
        this.startTime=0;
        this.finalTime=0;
        this.algorithm=null;
        this.running=false;  
        this.dataAlgorithm=null;
        
        this.slaveLastReplacement={};
        this.replacements=[];   
        
        
        this.replacementsFromSlaves=0;
        
        
        this.problemsSolved=0;
//        this.problemsSolvedLog="";
        this.problemsSolvedArray=[];        


        // setInterval(()=>{ 
        //     console.log("Interval")
        //     console.log("this.replacementsFromSlaves="+this.replacementsFromSlaves)
        //     if (this.algorithm && this.algorithm.getPopulation())this.algorithm.getPopulation().showBestFitness();
        // }, 10000);

    }
    
    processRequest(type,data){
        switch(type) {    
            case Common.Constants.MessageTypes.START:
                var response = this.processStart(data);
                this.communicationLayer.sendToAll(type,response);
                break;      
            case Common.Constants.MessageTypes.STOP:
                if (this.running && this.algorithm){
                    this.end();
                }

                break;               
            default:
                throw "ERROR: El método recibido no existe.";
        }        
    }
    processResponse(type,data){
        switch(type) {    
            case Common.Constants.MessageTypes.NEXT_STEP:       
                this.processTaskResult(data);
                break;  
            case Common.Constants.MessageTypes.SHOW_SOLUTION:                  
            case Common.Constants.MessageTypes.START:       
                //NOTHING
                break;                  
            default:
                throw "ERROR: El método recibido no existe.";
        }          
    }
    processConnect(callback){
        callback(this.getDataAlgorithm());
    }
    
    
    processDisconnectRequest(idNode){
        delete this.slaveLastReplacement[idNode];  
    }
    getCommunicationLayer(){
       return this.communicationLayer;        
    }
    checkMaxTime(){
        var fTime=new Date().getTime();
        if  (fTime-this.startTime>this.maxTime) this.end();
    }

    run(){
        if (this.running){      
            if (!this.algorithm.hasFinished()){
           	            	
                var data=null;        
                var idNode=null;
                var nextReplacement=null;
                var replacementsToDo=null;
                idNode=this.communicationLayer.getFreeNodeId();

                if (idNode || idNode===0){
                    while (idNode || idNode===0){
  
                        nextReplacement=this.slaveLastReplacement[idNode];

                        if (nextReplacement==null){
                            this.slaveLastReplacement[idNode]=0;
                            nextReplacement=0;
                        }
                        //console.log("TOTAL REPLACEMENTS = "+this.replacements.length);
                        //console.log("NEXT REPLACEMENT = "+nextReplacement);
                        replacementsToDo=this.replacements.slice(nextReplacement,this.replacements.length);

                        data = {};
                        data[Common.Constants.ParameterTypes.REPLACEMENTS]=replacementsToDo;
                        data[Common.Constants.ParameterTypes.TASK_TYPE]=Common.Constants.MessageTypes.NEXT_STEP;
                        data[Common.Constants.ParameterTypes.ALGORITHM_TYPE]=Common.Constants.AlgorithmTypes.CVRP;//TODO -> Creo que no es necesario
                        this.communicationLayer.sendTo(Common.Constants.MessageTypes.NEXT_STEP, data, idNode);

                        this.slaveLastReplacement[idNode]=nextReplacement+replacementsToDo.length; 

                        idNode=this.communicationLayer.getFreeNodeId();

                        this.checkMaxTime();
                    }
//...                	console.log("FIN WHILE")
                } else {   //EJECUCIÓN LOCAL
                           
//                        this.algorithm.runCallback((son)=>{
//                            var posReplacement=  this.algorithm.replaceWorst(son);
//                            if (posReplacement!=-1){           
//                                this.replacements.push({"indiv":son,"pos": posReplacement});
//                            }                               
//                        });  
                }            	
                
                setImmediate(    ()=>{
                    this.run();
                });
            } else {  //HAS FINISHED
                  this.end();                       
            } //has finished   
        }  else { //running
            ///TODO-> no deberían estar aquí
        }            
    }
    
    end(){        
                this.finalTime=new Date().getTime();
                var totalTime=this.finalTime-this.startTime;

                this.dataAlgorithm=null; //BORRAMOS LOS DATOS DEL ALGORITMO
                this.replacements=[]; //BORRAMOS LOS REEMPLAZOS  
                for (var replace in this.slaveLastReplacement){
                    this.slaveLastReplacement[replace]=0;
                }
                console.log("this.replacementssssss="+JSON.stringify(this.replacements))
                console.log("this.slaveLastReplacement="+JSON.stringify(this.slaveLastReplacement))
                console.log("fin")
                this.running=false;

                console.log("  TIME: "+totalTime);
                var solution = this.algorithm.showSolution();                            
                var finalStep=this.algorithm.step;



            console.log("-------------------------------");
            console.log("-------------------------------");
            console.log("-------------------------------");
            console.log("-------------------------------");
            console.log("-------------------------------");
            console.log("-------------------------------");      
            console.log("---PROBLEM ITERATION "+this.problemsSolved+"----------");
            var s = {};
            s["id"]=this.problemsSolved;
            s["fitness"]=solution.getFitness();
            s["time"]=totalTime;   
            s["step"]=finalStep; 
            var idSlaves=Object.keys(this.communicationLayer.nodes);
            s["nSlaves"]=idSlaves.length;
            s["idSlaves"]=idSlaves;

            this.communicationLayer.sendToAll(Common.Constants.MessageTypes.SHOW_SOLUTION,solution);
            this.algorithm=null;
            this.problemsSolved++; 
            if (Common.Constants.FromFile){ //Si se está realizando un TEST, se recargan los datos para seguir.
                loadArrayJSONFromFile("problemResults.txt",(jsonProblem)=>{   
                    console.log("ANTES "+jsonProblem.length);
                    jsonProblem.push(s);
                    console.log("DESPUES "+jsonProblem.length);  
                    saveArrayJSONToFile(jsonProblem,"problemResults.txt",()=>{
                        console.log("this.replacementssssss="+JSON.stringify(this.replacements))
                        console.log("this.slaveLastReplacement="+JSON.stringify(this.slaveLastReplacement))  
                        setTimeout(()=>{             
                            this.loadCVRPProblemFromFile("layers/transmission/websockets/web/"+Common.Constants.FileName,()=>{
                                console.log("VAMOS A COMENZAR");
                                console.log("this.algorithm="+this.algorithm)
                                this.start();
                            });

                        },10000);                                                       
                    });
                });                             
            }              
    }
    
    
    
    getDataAlgorithm(){
        return this.dataAlgorithm;        
    }
    processTaskResult(data){
        if (this.running && this.algorithm){
    //        console.log(this.algorithm.step+" REEMPLAZAMOS DESDE NODO ESCLAVO")
            data = Common.Elements.Individual.fromJSON(data);
            //AKY
    //        this.algorithm.replaceWorst(data);
            var posReplacement=  this.algorithm.replaceWorst(data);
            if (posReplacement!=-1){           
                    this.replacements.push({"indiv":data,"pos": posReplacement});
                    this.replacementsFromSlaves++;
                   // console.log("REEMPLAZO DESDE ESCLAVO");
                   // console.log("this.replacementsFromSlaves="+this.replacementsFromSlaves)
                   // console.log("this.replacements.length="+this.replacements.length)

                    //TODO -> AÑADIDO POR SI ACASO ESTO ES LO QUE DA EL ERROR
                    if (this.replacementsFromSlaves>10){
                        this.replacements=[];
                        this.replacementsFromSlaves=0;
                        this.slaveLastReplacement={};                        
                    }
                    //TODO
    //    		console.log(" REEMPLAZO REALIZADO2 "+this.replacements.length)                
            }    
            this.checkMaxTime();          
        }        
    }
    processStart(data){
        console.log("processStart(data){")
        if (!this.running){
            var algorithmType=data[Common.Constants.ParameterTypes.ALGORITHM_TYPE];
            switch(algorithmType) {
                case Common.Constants.AlgorithmTypes.CVRP:
                    this.dataAlgorithm = this.processStartCVRP(data);
                    //TODO -> BROADCAST y guardar datos para cada vez que se conecte un nuevo cliente enviarle todo.
                    this.start(); 
                    return this.dataAlgorithm;
                    break;
                case Common.Constants.AlgorithmTypes.ONE_MAX:
                    this.dataAlgorithm = this.processStartOneMax(data);
                    this.start();
                    return this.dataAlgorithm;
                    break;  
                case Common.Constants.AlgorithmTypes.CVRP_LOCAL_DATA:
                    this.dataAlgorithm = this.processStartCVRPLocalData(data);
                    //TODO -> BROADCAST y guardar datos para cada vez que se conecte un nuevo cliente enviarle todo.
    //                this.start(); 
                    return this.dataAlgorithm;
                    break;            
                default:
                    throw new Error("ERROR: El método recibido no existe.");
            }                
        }else {
            return null;
        }
     
    }
    start(){
        setImmediate(    ()=>{
            this.startTime = new Date().getTime();
            this.running=true;            
            this.run();
//            this.myEmitter.emit('nextStep');
        });        
    }
    processStartCVRP(data){
        Common.setAlgorithm(Common.Constants.AlgorithmTypes.CVRP); //TODO NECESITO EL ALGORITMO DISTRIBUIDO
        var dataResponse={};

        var arrayCustomers = data[Common.Constants.ParameterTypes.ARRAY_CUSTOMERS];
        for (var i=0;i<arrayCustomers.length;i++){
            arrayCustomers[i]=Common.Elements.Customer.fromJSON(arrayCustomers[i]);
        }
        var matrixCost=data[Common.Constants.ParameterTypes.MATRIX_COST];

        var nTrucks=data[Common.Constants.ParameterTypes.N_TRUCKS];

        var truckCapacity=data[Common.Constants.ParameterTypes.TRUCK_CAPACITY];
        var truckTime=data[Common.Constants.ParameterTypes.TRUCK_TIME];
        var penalCap=data[Common.Constants.ParameterTypes.PENAL_CAP];   
        var penalTime=data[Common.Constants.ParameterTypes.PENAL_TIME];   
        
        var problem = new Common.Elements.Problem();
        problem.initialize(matrixCost, arrayCustomers, truckCapacity, truckTime, penalCap,penalTime);
        problem.targetFitness=data[Common.Constants.ParameterTypes.TARGET_FITNESS];  ;



        var probCross=data[Common.Constants.ParameterTypes.PROB_CROSS]; 
        var probMut=data[Common.Constants.ParameterTypes.PROB_MUT]; 
        var probLS=data[Common.Constants.ParameterTypes.PROB_LS];        
        
        var maxSteps=data[Common.Constants.ParameterTypes.MAX_STEPS]; 
//        var maxSteps=40; 
        
        var popSize = data[Common.Constants.ParameterTypes.POP_SIZE];         
        
        this.algorithm = new Common.Elements.AlgorithmCVRP(problem, probCross,probMut,probLS, maxSteps);

        this.algorithm.initialize(popSize, parseInt(arrayCustomers.length)+parseInt(nTrucks));
        
        dataResponse[Common.Constants.ParameterTypes.ALGORITHM_TYPE]=Common.Constants.AlgorithmTypes.CVRP;
        dataResponse[Common.Constants.ParameterTypes.PROBLEM]=problem;
        dataResponse[Common.Constants.ParameterTypes.POPULATION] = this.algorithm.getPopulation();
        dataResponse[Common.Constants.ParameterTypes.PROB_CROSS]=probCross;
        dataResponse[Common.Constants.ParameterTypes.PROB_MUT]=probMut;
        dataResponse[Common.Constants.ParameterTypes.PROB_LS]=probLS;
        
        return dataResponse;        
    }
    processStartCVRPLocalData(data){
        Common.setAlgorithm(Common.Constants.AlgorithmTypes.CVRP); //TODO NECESITO EL ALGORITMO DISTRIBUIDO
        this.loadCVRPProblemFromFile("./layers/transmission/websockets/web/"+Common.Constants.FileName,()=>{
            this.start();
        });
        var dataResponse={};                    
        dataResponse[Common.Constants.ParameterTypes.ALGORITHM_TYPE]=Common.Constants.AlgorithmTypes.CVRP_LOCAL_DATA;      
        return dataResponse;         
    }
    loadCVRPProblemFromFile(file,callback){ 
         var startTimeLoading = new Date().getTime();
         var self = this;
        var fs = require('fs');  
        fs.readFile( "./"+file,'utf8', (err, jsonProblem)=> {
            if (err) {
               throw err; 
            }         
            
//            var seed = Common.Maths.createSeed(141650939);
//            Math.random=seed;       
            var seed = Common.Maths.createSeed(Common.Maths.SEEDS[Common.Maths.LAST_SEED]);
            console.log("semilla utilizada="+Common.Maths.SEEDS[Common.Maths.LAST_SEED]);
            Math.random=seed;     
            Common.Maths.LAST_SEED=Common.Maths.LAST_SEED+1;
            if (Common.Maths.LAST_SEED>=Common.Maths.SEEDS.length)Common.Maths.LAST_SEED=0;

            
            jsonProblem=JSON.parse(jsonProblem);
                 
            Common.setAlgorithm(Common.Constants.AlgorithmTypes.CVRP);

            var problem = Common.Elements.ProblemCVRP.fromJSON(jsonProblem.problem);
            
//            problem.targetFitness=-218500000; //2000             
//            problem.targetFitness=-215000000; //2000            
//            problem.targetFitness=-110000000; //1000
//            problem.targetFitness=-100000000; //1000 más lento
//            problem.targetFitness= -90000000; //1000 aún más lento
//            problem.targetFitness=-50000000; //500
//              problem.targetFitness=-45000000; //500 más lento
//              problem.targetFitness=-40000000; //500 más lento              
              problem.targetFitness=-650; //200


            var nTrucks = jsonProblem.nTrucks;
//            console.log("###"+JSON.stringify(nTrucks))


            var crossProb = jsonProblem.crossProb;
//            console.log("###"+JSON.stringify(crossProb))
            
            var mutateProb = jsonProblem.mutateProb;
//            console.log("###"+JSON.stringify(mutateProb))
            
            var LSProb = jsonProblem.LSProb;
//            console.log("###"+JSON.stringify(LSProb))            
            
//            var maxSteps = jsonProblem.maxSteps;
            var maxSteps = 999999999;
            
//            console.log("###"+JSON.stringify(maxSteps))            
            console.log("vamos a cargar poblacion")
            var population = Common.Elements.Population.fromJSON(jsonProblem.population);  

            console.log("POBLACIÓN -> "+population.pop.length)
//            console.log("###"+JSON.stringify(population))            
            
            self.algorithm = new Common.Elements.Algorithm(problem, crossProb,mutateProb,LSProb, maxSteps);
            self.algorithm.load(population);
            var finalTimeLoading= new Date().getTime()
            console.log("Problem loaded in "+(finalTimeLoading-startTimeLoading)+"seconds")
            console.log("Ready!")
            console.log("this.algorithm="+this.algorithm)
            if (callback) callback();
        });   
    }   
    
}

module.exports = MonitorApplication;



function loadArrayJSONFromFile(file,callback){
        var self=this;
         
        fs.readFile( "./"+file,'utf8',  (err, json)=> {
            console.log("CONTENIDO -> "+json+"")
            if (err) {
              throw err; 
            }
            try {
               json=JSON.parse(json);  
            } catch (e){
                json=[];
            }
            
            callback(json);
        });    
}

function saveArrayJSONToFile(json,file,callback){
    fs.open("./"+file, "wx", function (err, fd) {
        fs.writeFile("./"+file,JSON.stringify(json), function(err) {
            if(err) {
                return console.log(err);
            }
            console.log("The file was saved!");
            callback();
        }); 
    });     
}
