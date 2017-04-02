
'use strict'

global.Common = require("./common/Common");

var fs = require('fs'); 







function getArgs(func,method) {
  // First match everything inside the function argument parens.
  //var rgxp = new RegExp("luisete.*?\(([^)]*)\)");
  var rgxp = new RegExp(method+".*?\\(([^)]*)\\)");  
  
  var args = func.toString().match(rgxp)[1];
 
  // Split the arguments string into an array comma delimited.
  return args.split(',').map(function(arg) {
    // Ensure no inline comments are parsed and trim the whitespace.
    return arg.replace(/\/\*.*\*\//, '').trim();
  }).filter(function(arg) {
    // Ensure no undefined values are added.
    return arg;
  });
}


function getArgumentsParsed(classObject,method){
	var result=""
	var args = getArgs(classObject,method);
	for (var i=0;i<args.length-1;i++){
		result+=args[i]+":TYPE,";
	}
	if (args.length>0){
		result+=args[i];
	}
	return result;
}


function getAllMethods(clase){
	var o = new clase();
	return Object.getOwnPropertyNames(o.__proto__);
};



function classToUML(classObject){
	var result="";
	result+="Class."+classObject.name;
	result+='("'+classObject.name+'")';
	var object =  new classObject();
	var variables=Object.getOwnPropertyNames(object);
	if (variables.length>0){
		result+="("	
	}
	for (var i=0;i<variables.length-1;i++){
		result+='"-'+variables[i]+':TYPE",'
	}
	if (variables.length>0){
		result+='"-'+variables[variables.length-1]+':TYPE")'
	}
	var methods = getAllMethods(classObject);
	if (methods.length>0){
		result+="(";
	}
	for (var i=0;i<methods.length-1;i++){
		result+='"+'+methods[i]+'('+getArgumentsParsed(classObject,methods[i])+'):TYPE",'
	}
	if (methods.length>0){
		result+='"-'+methods[methods.length-1]+'('+getArgumentsParsed(classObject,methods[i])+'):TYPE")'
	}	
	return result;
}

var toCopy=Common.Elements.Message;

console.log(classToUML(toCopy))
var json={};
json["uml"]=classToUML(toCopy);
loadArrayJSONFromFile("umlClasses.txt",(jsonArray)=>{               
    console.log("ANTES "+jsonArray.length);
    jsonArray.push(json);
    console.log("DESPUES "+jsonArray.length);  
    saveArrayJSONToFile(jsonArray,"umlClasses.txt",()=>{
        console.log("se grabó bien.")
    });
});    





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
        fs.writeFile("./"+file,JSON.stringify(json),{ encoding: 'utf8' }, function(err) {
            if(err) {
                return console.log(err);
            }
            console.log("The file was saved!");
            callback();
        }); 
    });     
}



