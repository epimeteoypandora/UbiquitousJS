"use strict"

global.Output = require("../static/Output");

module.exports = {
  Constants:require("./constants/Constants"),        
  Elements:require("./Elements"),
  Arrays:require("./Arrays"),
  Maths:require("./Maths"),    
  checkArgumentsLength: function (expected, received) { //TODO ->Creo que no lo voy a utilizar 
      if (expected!=received){
          throw "NumberOfArgumentsException";
      }   
  },
  setAlgorithm: function (algorithmType) {
    switch(algorithmType.toUpperCase()) {
        case this.Constants.AlgorithmTypes.CVRP:
            this.Elements.Algorithm=this.Elements.AlgorithmCVRP;
            this.Elements.Chromosome=this.Elements.ChromosomeVRP;
            this.Elements.Problem=this.Elements.ProblemCVRP;
            
            //ESTABLECEMOS CONFIGURACIÓN CVRP
            break; 
        case this.Constants.AlgorithmTypes.ONE_MAX:
            this.Elements.Algorithm=this.Elements.AlgorithmOneMax;
            this.Elements.Chromosome=this.Elements.ChromosomeBinary;
            this.Elements.Problem=this.Elements.ProblemOneMax;         
            //ESTABLECEMOS CONFIGURACIÓN CVRP
            break;     
        case this.Constants.AlgorithmTypes.PPEAKS:
            //ESTABLECEMOS CONFIGURACIÓN CVRP
            break;            
        default:
            throw "ERROR: El método recibido no existe.";
    }               
  },   
  setProcessingType: function (proccesingType) { //TODO -> CAMBIAR NOMBRE
    switch(proccesingType.toUpperCase()) {
        case this.Constants.ProccessingTypes.ISLAS:
            this.Elements.Application=this.Elements.Islas;
            break;         
        case this.Constants.ProccessingTypes.LOCAL:
            this.Elements.Application=this.Elements.LocalApplication;
            break; 
        case this.Constants.ProccessingTypes.MASTER_SLAVE:
            this.Elements.Application=this.Elements.MonitorApplication;
            break;            
        default:
            throw "ERROR: El método recibido no existe.";
    }               
  } 
};