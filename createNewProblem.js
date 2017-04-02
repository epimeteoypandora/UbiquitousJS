var fs = require('fs');
global.Common = require("./common/Common");

Common.setAlgorithm(Common.Constants.AlgorithmTypes.CVRP);

//Common.setAlgorithm(Common.Constants.AlgorithmTypes.CVRP);
//Common.setProcessingType(Common.Constants.ProccessingTypes.ISLAS);

var maxSteps=50;
var popSize1 = 50;
var popSize2 = 100;
var popSize3 = 150;

var nTrucks = 10;
var truckCapacity=100;
var truckTime = 100;
var penalCap = 1000;
var penalTime = 1000;

var probCross= 0.8;
var probMut = 0.01;
var probLS = 0.1;


var totalElements=200;
var random1 = null;
var random2 = null;


var coordinates = [];
var latitude=null;
var longitude=null;
coordinates.push( {"latitude":40.4168,"longitude":-3.7038} );//MADRID
for (var i=0;i<totalElements;i++){
    latitude=(Math.random()*180)-90;   //0 a 180 -90   -> -90 a 90
    longitude=(Math.random()*360)-180; //0 a 360 -180  -> -180 a 180  
    coordinates.push( {"latitude":latitude,"longitude":longitude} );
}



var max=20;

var arrayCustomers = [];
var random1 = null;
var random2 = null;
for (var i=0;i<totalElements;i++){
    random1=Math.floor((Math.random()*max)+1);
    random2=Math.floor((Math.random()*max)+1);    
    arrayCustomers.push( new Common.Elements.Customer(random1,random2) );
}



function simulateDistanceMatrix(origins, destinations){ 
	var total=[];
	for (var i=0;i<origins.length;i++){
		var row=[];
		for (var k=0;k<destinations.length;k++){
			var distance=getDistanceBetweenTwoPoints(origins[i],destinations[k]);
			row.push(distance);
		}
		total.push(row);
	}  
        return total;
}

function getDistanceBetweenTwoPoints(p1, p2) {    
	var radlat1 = Math.PI * p1.latitude/180
	var radlat2 = Math.PI * p2.latitude/180
	var theta = p1.longitude-p2.longitude;
	var radtheta = Math.PI * theta/180
	var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
	dist = Math.acos(dist);
	dist = dist * 180/Math.PI;
	dist = dist * 60 * 1.1515;
	dist = dist * 1.609344; //KM
	dist=dist/100; //HOURS
	dist=dist.toFixed(3);
	return parseFloat(dist);
}		


var  matrixCost= simulateDistanceMatrix(coordinates, coordinates);








//var algorithm1 = new Common.Elements.AlgorithmCVRP(problem, probCross,probMut,probLS, maxSteps);
//algorithm1.initialize(popSize1,arrayCustomers.length+nTrucks);
//
//var algorithm2 = new Common.Elements.AlgorithmCVRP(problem, probCross,probMut,probLS, maxSteps);
//algorithm2.initialize(popSize2,arrayCustomers.length+nTrucks);
//
//var algorithm3 = new Common.Elements.AlgorithmCVRP(problem, probCross,probMut,probLS, maxSteps);
//algorithm3.initialize(popSize3,arrayCustomers.length+nTrucks);
//
//var population1 = algorithm1.getPopulation()
//var population2 = algorithm2.getPopulation()
//var population3 = algorithm3.getPopulation()

var problemData={};
problemData["nTrucks"]=nTrucks;

problemData["crossProb"]=probCross;
problemData["mutateProb"]=probMut;
problemData["LSProb"]=probLS;

problemData["maxSteps"]=maxSteps;
problemData["coordinates"]=coordinates;

//saveProblemPop(problemData,population1);
//saveProblemPop(problemData,population2);
saveProblemPopulation(popSize1,()=>{
    saveProblemPopulation(popSize2,()=>{
        saveProblemPopulation(popSize3,()=>{
            console.log("TODOS GUARDADOS")
        });
    });
});



//function saveProblemPop(problemData, population){
//    problemData["population"]=population;
//    var name=population.getSize();
//    fs.open("./dataProblem_200_"+name+".txt", "wx", function (err, fd) {
//        fs.writeFile("./dataProblem_200_"+name+".txt",JSON.stringify(problemData), function(err) {
//            if(err) {
//                return console.log(err);
//            }
//            console.log("The file was saved!");
//    //        fs.close("./dataProblem2.txt", function (err) {
//    //            // handle error
//    //        });    
//        }); 
//    });    
//}

function saveProblemPopulation(popSize,callback){
    var problem = new Common.Elements.Problem();
    problem.initialize(matrixCost, arrayCustomers, truckCapacity, truckTime, penalCap,penalTime);
    problem.targetFitness=0;    
    problemData["problem"]=problem;
    
    var algorithm = new Common.Elements.AlgorithmCVRP(problem, probCross,probMut,probLS, maxSteps);
    algorithm.initialize(popSize,arrayCustomers.length+nTrucks);    

    var population = algorithm.getPopulation()    
    problemData["population"]=population;
    fs.open("./dataProb_"+totalElements+"_"+population.getSize()+".txt", "wx", function (err, fd) {
        fs.writeFile("./dataProb_"+totalElements+"_"+population.getSize()+".txt",JSON.stringify(problemData), function(err) {
            if(err) {
                return console.log(err);
            }
            console.log("The file was saved!");
    //        fs.close("./dataProblem2.txt", function (err) {
    //            // handle error
    //        });    
            callback();
        }); 
    }); 
}








