var fs = require('fs'); 

loadArrayJSONFromFile("umlClasses.txt",(jsonArray)=>{    
    console.log(JSON.stringify(jsonArray))
    var result="";    
    console.log(jsonArray.length)
    for (var id in jsonArray){
        console.log(JSON.stringify(jsonArray[id]["uml"]))
    }
    console.log(result);

});    


function loadArrayJSONFromFile(file,callback){
        var self=this;

        fs.readFile( "./"+file,'utf8',  (err, json)=> {
            if (err) {
              throw err; 
            }
            console.log("contenido="+json)
            try {
               json=JSON.parse(json);  
            } catch (e){
                console.log(e.message)
                json=[];
            }
            
            callback(json);
        });    
}