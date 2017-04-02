var log="";

var Output = function(){
        }

Output.showInitMethod = function(priority,classs,method) {
    if (priority<0){
        console.log(classs+method+" -> INIT");
    }  
}

Output.showEndMethod = function(priority,classs,method) {
    if (priority<0){
        console.log(classs+method+" -> END");
    }  
}


Output.showInfo = function(priority,classs,method,message) {
    if (priority==1000){
        console.log("INFO: "+classs+"."+method+" -> "+message+"\n");
    }
//    if (priority==200){
//       console.log("INFO: "+classs+"."+method+" -> "+message+"\n"); 
//    }
//	if (priority==1000 ||priority==1200){
////		console.log(message)
//		console.log("INFO: "+classs+"."+method+" -> "+message+"\n");
//	}
////    if (priority!=100 && priority!=200){
//////        log+=classs+"."+method+" -> INFO: "+message+"\n";
////        console.log(classs+"."+method+" -> INFO: "+message);
////    }  
}


Output.showWarning = function(priority,classs,method,message) {
    console.log("WARNING: "+message);
}

Output.showError = function(priority,classs,method,error) {
//    console.log("ERROR: "+message);
	console.log("ERRROR: "+classs+"."+method+" -> "+error.message+"\n");
        //.stack
}

Output.showException = function(priority,classs,method,message) {
    console.log("EXCEPTION: "+message);
}


Output.showSolution = function(step,individual) {
    console.log("SOLUTION found after "+step+" steps.");
    console.log(individual.toString());
}

Output.showLog = function() {
//    console.log(log);
}

module.exports = Output;