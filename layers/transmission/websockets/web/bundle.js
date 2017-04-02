(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],3:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

(function () {
    try {
        cachedSetTimeout = setTimeout;
    } catch (e) {
        cachedSetTimeout = function () {
            throw new Error('setTimeout is not defined');
        }
    }
    try {
        cachedClearTimeout = clearTimeout;
    } catch (e) {
        cachedClearTimeout = function () {
            throw new Error('clearTimeout is not defined');
        }
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],4:[function(require,module,exports){
"use strict"; 

class Individual  {	
    constructor() {
        this.chromosome=null;
        this.fitness = 0;        
    }
    static fromJSON(i) {
    //	console.log("Individual.fromJSON")
        var indiv=new Common.Elements.Individual();
    //    console.log("i="+JSON.stringify(i))
        indiv.chromosome=Common.Elements.Chromosome.fromJSON(i.chromosome);
        indiv.fitness=i.fitness;
        return indiv;
    }       
//    toJSON : function(){
//        return JSON.stringify(this);
//    },  
    initialize(size){
        this.chromosome=new Common.Elements.Chromosome();
        this.chromosome.initialize(size);        
    }
    setChromosome(chro){
        this.chromosome=chro;
    }
    getChromosome(){
        return this.chromosome;
    }
    getFitness(){
        return this.fitness;
    }
    setFitness(f){
        this.fitness=f;        
    }
    toString(){
        return JSON.stringify(this);        
    }
    clone(){
        var copy = new Individual();
        copy.chromosome=this.chromosome.clone();
        copy.fitness=this.fitness;
        return copy;        
    }
}

module.exports = Individual;


},{}],5:[function(require,module,exports){
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
},{}],6:[function(require,module,exports){
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
},{"./AlgorithmCVRPAbstract":7}],7:[function(require,module,exports){
"use strict"; 
var AlgorithmAbstract =require ('./AlgorithmAbstract');

class AlgorithmCVRPAbstract  extends AlgorithmAbstract{	

    constructor(problem, probCross, probMut, probLS, maxSteps) {
    	super(problem, probCross, probMut, maxSteps);	
        this.probLS=probLS;          	
    }	
	
    localSearch(probLS,indiv,pop,problem){
        var bestSol = indiv;
        
            if (indiv.getFitness()==0){
                console.log(JSON.stringify(bestSol))
                throw "ERROR el fitness no está definido al empezar"
            }       
        
        var tempSol=null
        for (var i=0; i<indiv.getChromosome().getSize();i++){
            if (Math.random()<probLS){
                tempSol= this.opt_2(indiv,i,problem);
            if (tempSol.getFitness()==0){
                throw "ERROR el fitness no está definido opt_2"
            }            
                if (tempSol.getFitness()>bestSol.getFitness()){
                    bestSol=tempSol;
                } 
            }
        }
        for (var i=0;i<pop.getSize();i++){
            for (var j=i+1;j<pop.getSize();j++){
                if (Math.random()<probLS){
                    tempSol=this.interchange_1(pop.getIndividual(i),pop.getIndividual(j),problem);
            if (tempSol.getFitness()==0){
                throw "ERROR el fitness no está definido interchange_1"
            }                  
                    if (tempSol.getFitness()>bestSol.getFitness()){
                        bestSol=tempSol;
                    }                 
                }          
            }
        }
        
            if (bestSol.getFitness()==0){
                console.log(JSON.stringify(bestSol))
                throw "ERROR el fitness no está definido "
            }    
        
        return bestSol;    	
    }
    
    
    
    
    
    interchange_1(indiv1, indiv2,problem){
        var copy1 = indiv1.clone();
        var copy2 = indiv2.clone();
       
        if (areRepeatedNumbers(copy1)){
            console.log("REPEATED NUMBERS "+JSON.stringify(copy1));
            throw ("REPEATED NUMBERS");
        }   
        if (areRepeatedNumbers(copy2)){
            console.log("REPEATED NUMBERS "+JSON.stringify(copy2));
            throw ("REPEATED NUMBERS");
        }     
        
        var pos1 = Math.floor(Math.random()*copy1.getChromosome().getSize());
        var pos2 = Math.floor(Math.random()*copy2.getChromosome().getSize());

        var allele1 = copy1.getChromosome().getAllele(pos1);
   
        var allele2 = copy2.getChromosome().getAllele(pos2);
   
        
        
        
        //Copiamos alelo 1 en individuo 2
        var tempPos = copy2.getChromosome().findAllelePos(allele1);

        copy2.getChromosome().setAllele(pos2,allele1);

        copy2.getChromosome().setAllele(tempPos,allele2); //Copiamos el sustituido por la posición donde estaba el que se ha copiado en ese mismo cromosoma.

         
        //Copiamos alelo 2 en individuo 1
        tempPos = copy1.getChromosome().findAllelePos(allele2);

        copy1.getChromosome().setAllele(pos1,allele2);

        copy1.getChromosome().setAllele(tempPos,allele1);


        problem.evaluateStep(copy1);
  
        problem.evaluateStep(copy2);


        if (areRepeatedNumbers(copy1)){
            console.log("REPEATED NUMBERS "+JSON.stringify(copy1));
            throw ("REPEATED NUMBERS");
        }   
        if (areRepeatedNumbers(copy2)){
            console.log("REPEATED NUMBERS "+JSON.stringify(copy2));
            throw ("REPEATED NUMBERS");
        }  
        
        
        if (copy1.getFitness()>=copy2.getFitness()){
            return copy1;
        } else {     
            return copy2;
        }    		
    }
    
    
    opt_2(indiv,eje1_1,problem){
        var copy=indiv.clone();
      if (areRepeatedNumbers(copy)){
          console.log("REPEATED NUMBERS "+JSON.stringify(copy));
          throw ("REPEATED NUMBERS");
      }    

      var eje2_1 = Math.floor(Math.random()*copy.getChromosome().getSize());
      
      //Se ordena de menor a mayor los ejes.
      if (eje1_1>eje2_1){
          var temp = eje1_1;
          eje1_1=eje2_1;
          eje2_1=temp;
      }
      
      var eje1_2 = eje1_1+1;
      if (eje1_2>=copy.getChromosome().getSize())eje1_2=0; 
      
      var eje2_2 = eje2_1+1;
      if (eje2_2>=copy.getChromosome().getSize()) eje2_2=0;   

      copy.getChromosome().reverseSubGroup(eje1_2, eje2_1); 
      
      problem.evaluateStep(copy);
 
      if (areRepeatedNumbers(copy)){
          console.log("REPEATED NUMBERS "+JSON.stringify(copy));
          throw ("REPEATED NUMBERS");
      }
      return  copy;    	
    }
        
    
}


function areRepeatedNumbers(indiv){
    var allelesSearch = indiv.getChromosome().alleles;
    var alleles=allelesSearch.slice(0);
    var repeats =0;
    var index;
    for (var i=0;i<allelesSearch.length;i++){
        repeats=0;
        index=alleles.indexOf(i);
       
        while (index>-1){
            repeats++;
            alleles.splice(index,1);

            if (repeats>1){
                return true;
            }
            index=alleles.indexOf(i);
        }
    }
}



module.exports = AlgorithmCVRPAbstract;
},{"./AlgorithmAbstract":5}],8:[function(require,module,exports){
"use strict"; 
var AlgorithmAbstract =require ('./AlgorithmAbstract');

var myClass="AlgorithmOneMax";
var outputPriority=555;

class AlgorithmOneMax  extends AlgorithmAbstract{	
    constructor(problem, probCross, probMut, maxSteps) {
    	super(problem, probCross, probMut, maxSteps);	
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
        var myMethod="run()";
        
        Output.showInfo(outputPriority,myClass,myMethod,"STEP "+this.step);  
        //SELECT TOURNAMENT
        var cro1 = this.selectTournament(this.population);    
        var cro2 = this.selectTournament(this.population);
        
        
        
        if (cro1.getFitness()==0 || cro2.getFitness()==0){
            throw "ERROR el fitness no está definido"
        }
        
        while (cro1==cro2){ //SI SON IGUALES SE SELECCIONA OTRO
            console.log("IGUALES")
            cro2 = this.selectTournament(this.population);
        }

        var son = this.cross(cro1,cro2,this.probCross);

            
        
        son = this.mutate(son,this.probMut);

        this.problem.evaluateStep(son);
   
        return son;        
    }
}


module.exports = AlgorithmOneMax;
},{"./AlgorithmAbstract":5}],9:[function(require,module,exports){
"use strict"; 
class Chromosome  {	
    constructor() {
        this.alleles = [];
    }
    getAllele(index) {
        return this.alleles[index];
    }     
    setAllele(index, value) {
        this.alleles[index]=value;
    }         
    getSize() {
        return this.alleles.length; 
    }   
    toString(){
    	return JSON.stringify(this);
    }
    initialize(size) {
    	throw new Error("Abstract Method.");
    }     
    cross(chro2,probCross) {
            throw new Error("Abstract Method.");
    }   
    mutate(probMut){
            throw new Error("Abstract Method.");    	
    }  
    clone() {

//    	var copy = Object.create(this); //-> MUY POCO EFICIENTE ASÍ QUE MEJOR UTILIZAR new
//    	copy.alleles=this.alleles.slice(0);       
//    	return copy
		throw new Error("Abstract Method.");  
  }  	
    
}

module.exports = Chromosome;
},{}],10:[function(require,module,exports){
"use strict"; 
var ChromosomeAbstract =require ('./ChromosomeAbstract')

var myClass="ChromosomeBinary";
var outputPriority=100;

class ChromosomeBinary  extends ChromosomeAbstract{	
    constructor() {
    	super();
    }
    static fromJSON(c) {
        var chro=new ChromosomeBinary();
        chro.alleles=c.alleles;
        return chro;
    }      
    
    clone() {
    	var copy = new ChromosomeBinary();
    	copy.alleles=this.alleles.slice(0);        //CLONE
    	return copy
    }      
    initialize(size) {
        for (var i=0;i<size;i++){
            this.alleles.push(Math.floor(Math.random() * 2));  
        }
    }     
    cross(chro2,probCross) {
        if (Math.random()<probCross){    
            var myMethod="cross";
            Output.showInfo(outputPriority,myClass,myMethod,"CHRO1 -> "+JSON.stringify(this));
            Output.showInfo(outputPriority,myClass,myMethod,"CHRO2 -> "+JSON.stringify(chro2));                       
            var son = new ChromosomeBinary();       
            var crossPoint = Math.floor(Math.random()*this.alleles.length);
            Output.showInfo(outputPriority,myClass,myMethod,"CROSSPOINT -> "+crossPoint);              
            for (var i=0;i<crossPoint;i++){
                son.alleles.push(this.alleles[i]);
            }
            for (var i=crossPoint;i<this.alleles.length;i++){
                son.alleles.push(chro2.alleles[i]);
            }    
            Output.showInfo(outputPriority,myClass,myMethod,"SON -> "+JSON.stringify(son));                    
            return son;  
        } else {
                Output.showInfo(outputPriority,myClass,myMethod,"NO SE HACE CROSS");  
               return Math.random()>=0.5?this.clone():chro2.clone();
        }
    }   
    mutate(probMut){
        for (var i=0;i<this.alleles.length;i++){
            
            if (Math.random()<probMut){    
                if (this.alleles[i]==0){
                        this.alleles[i]=1;                      
                } else {
                        this.alleles[i]=0;
                }                
            }         
        }  	
    }
}

module.exports = ChromosomeBinary;
},{"./ChromosomeAbstract":9}],11:[function(require,module,exports){
"use strict"

var ChromosomeAbstract =require ('./ChromosomeAbstract')

var myClass="ChromosomeVRP";
var outputPriority=100;


class ChromosomeVRP  extends ChromosomeAbstract{	

    constructor() {
    	super();
    }
    static fromJSON(c) {     
        var chromosomeFixed=new Common.Elements.Chromosome();    
        for (var i=0;i<c.alleles.length;i++){
            chromosomeFixed.alleles.push(c.alleles[i]);
        }    
        return chromosomeFixed;
        
    }     
    clone() {
    	var copy = new ChromosomeVRP();
      	copy.alleles=this.alleles.slice(0);        //CLONE
      	return copy
    }      
    
    initialize(size) {      
    	for (var i=0;i<size;i++){
    		this.alleles.push(i);      
    	}
    	Common.Arrays.shuffleArray(this.alleles);
    }     
    cross(chro2,probCross) {      
        ////////////////////////////////////////
        //Operador de recombinación de ejes(ERX)
         //////////////////////////////////////// 
        if (Math.random()<probCross){
            var axisList = [];
            for (var i=0;i<this.getSize();i++){
                var axis = new Common.Elements.Set();
                getNeighbors(this,i,axis);       
                getNeighbors(chro2,i,axis);    
                axisList.push(axis);
            }

            //Cogemos el primer gen de uno de los padres(el que tenga menor número de ejes).
            var son = new ChromosomeVRP();
            var firstParent1 = this.getAllele(0);
            var firstParent2 = chro2.getAllele(0); 
            var lastAdded=-1;      
            if (axisList[firstParent1].size<=axisList[firstParent2].size){
                son.addAllele(firstParent1);
                Common.Arrays.removeValueFromArrayOfSETs(firstParent1, axisList);
                lastAdded=firstParent1;
            } else {
                son.addAllele(firstParent2);
                Common.Arrays.removeValueFromArrayOfSETs(firstParent2, axisList);
                lastAdded=firstParent2;        
            }
            
            //Luego se va al eje de la última posición añadida
            //Se recorre dicho eje y se cogen los valores para ver que posición tiene menos ejes.
            //
  
            abcdef(lastAdded, axisList, son);

            return son;
        } else {
            //Return chro1 o chro2 en caso de que no haya cruce.
           return Math.random()>=0.5?this.clone():chro2.clone();
        }
    }   
    mutate(probMut){
        for (var i=0; i<this.alleles.length;i++){
            if (Math.random()<probMut){
                var r = Math.random();
                if (r<0.33){
                    //Inversion Mutate (p,q,array)
                    Common.Arrays.reverseSubarray(i,Math.floor(Math.random()*this.alleles.length),this.alleles);
                } else if (r>0.66){
                    //Insertion Mutate (p,q,array)
                    Common.Arrays.moveElementOfArray(i,Math.floor(Math.random()*this.alleles.length),this.alleles);
                } else {
                    //SWAP Mutate (p,q,array)
                    Common.Arrays.swapElementsOfArray(i,Math.floor(Math.random()*this.alleles.length),this.alleles);
                }
            }             
        }         
        return this; 	
    }
    
    reverseSubGroup( index1, index2 ){
        //+1 porque slice no incluye última posición y yo la necesito.
        var subarray=this.alleles.slice(index1, index2+1);
        
        subarray.reverse();

        this.alleles=Common.Arrays.injectArrayRemoving(this.alleles,index1,subarray);
	
    }
    addAllele( value ){
        return this.alleles.push(value);    	
    }
    findAllelePos( value ){
        return this.alleles.indexOf(value);     	
    }
}

module.exports = ChromosomeVRP;



function abcdef(lastAdded, axisList, son){
    while (axisList[lastAdded].size>0){
        lastAdded=addSmaller(lastAdded,axisList);
        Common.Arrays.removeValueFromArrayOfSETs(lastAdded, axisList);
        son.addAllele(lastAdded); 
        abcdef(lastAdded, axisList, son);
    } 
        return;
 
}



function addSmaller(position,axisList){
    var valueBorrar=null
    var axis = axisList[position];
    var smaller=-1;
    try {
        axis.forEach(function(value) {   
            valueBorrar=value;
            if (smaller==-1){          
                smaller=value;
            } else if(axisList[value].size<axisList[smaller].size){            
                smaller=value;
            }
        });            
    } catch (e){

        console.log(e.stack);
        throw e;
    }    
 
    return smaller;
}

function getNeighbors(chro, value, axis){
    for (var i=0;i<chro.getSize();i++){
        if (chro.getAllele(i)==value){
            axis.add(getNext(chro,i)); 
            axis.add(getPrevious(chro,i));             
           return;
        }
    }
}

function getNext(chro, i){
    if ((i+1)>=chro.getSize()){
        return  chro.getAllele(0);
    } else {
        return  chro.getAllele(i+1);
    }
}
function getPrevious(chro,i){
    if ((i-1)<0){
        return  chro.getAllele(chro.getSize()-1);
    } else {
        return  chro.getAllele(i-1);
    }
}


},{"./ChromosomeAbstract":9}],12:[function(require,module,exports){
module.exports = {
  findElementPositionInArray: function (element,array) {
    return array.indexOf(element); 
  },
  //Colocar de forma aleatoria.//Barajar
  shuffleArray: function (array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
  },
  injectArray: function ( arr1, idx, arr2 ) {
    return arr1.slice( 0, idx ).concat( arr2 ).concat( arr1.slice( idx ) );
  }, 
  injectArrayRemoving: function ( arr1, idx, arr2 ) {
    return arr1.slice( 0, idx ).concat( arr2 ).concat( arr1.slice( idx+arr2.length ) );
  },
  
  //AMBOS INCLUIDOS
  reverseSubarray: function (p, q, array){ 
    if (q<p){
        var temp =q;
        q=p;
        p=temp;
    }
    var subarray=array.slice(p, q+1); 
    subarray.reverse();
    array=this.injectArrayRemoving(array,p,subarray);
    return array;  
  },    
  //Mueve elemento de array de posición p a posicón q
  moveElementOfArray: function (p, q, array){ 
    var value = array[p];
    array.splice(p, 1); 
    array.splice(q, 0, value);
    return array; 
  },    
  swapElementsOfArray: function (p, q, array){ 
    var temp = array[q];
    array[q]=array[p];
    array[p]=temp;     
    return array;    
  },
  removeValueFromArrayOfSETs: function (value, arrayOfSets){    
    for (var i=0;i<arrayOfSets.length;i++){
//        arrayOfSets[i].delete(value);
        arrayOfSets[i].deleteValue(value);
    }     
  }  
  
};



},{}],13:[function(require,module,exports){
(function (global){
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
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../static/Output":38,"./Arrays":12,"./Elements":14,"./Maths":15,"./constants/Constants":18}],14:[function(require,module,exports){
module.exports = {
  Set:require("./Set"),      
    
  ChromosomeVRP:require("../chromosome/ChromosomeVRP"),
  ChromosomeBinary:require("../chromosome/ChromosomeBinary"),
  Individual:require("../Individual"),
  ProblemCVRP:require("../problem/problemCVRP"),  
  ProblemOneMax:require("../problem/ProblemOneMax"),
  Population:require("../population"),  
  AlgorithmOneMax:require("../algorithm/AlgorithmOneMax"),   
  AlgorithmCVRP:require("../algorithm/AlgorithmCVRP"),   
  Customer:require("../problem/problemCVRP/customer"),    
  LocalApplication:require("../layers/application/LocalApplication"),
  MonitorApplication:require("../layers/application/MonitorApplication"),       
  SlaveApplication:require("../layers/application/SlaveApplication"),   
  Message:require("../layers/transmission/messages/Message"),    
    
  MonitorCommunication:require("../layers/communication/MonitorCommunication"),
  SlaveCommunication:require("../layers/communication/SlaveCommunication"),
  
  //WebSocketServer:require("../layers/transmission/websockets/WebSocketServer"),  
  WebSocketClient:require("../layers/transmission/websockets/WebSocketClient"),
  WebSocketDefault:require("../layers/transmission/websockets/WebSocketDefault")  
};
},{"../Individual":4,"../algorithm/AlgorithmCVRP":6,"../algorithm/AlgorithmOneMax":8,"../chromosome/ChromosomeBinary":10,"../chromosome/ChromosomeVRP":11,"../layers/application/LocalApplication":22,"../layers/application/MonitorApplication":23,"../layers/application/SlaveApplication":24,"../layers/communication/MonitorCommunication":26,"../layers/communication/SlaveCommunication":27,"../layers/transmission/messages/Message":29,"../layers/transmission/websockets/WebSocketClient":30,"../layers/transmission/websockets/WebSocketDefault":31,"../population":34,"../problem/ProblemOneMax":35,"../problem/problemCVRP":36,"../problem/problemCVRP/customer":37,"./Set":16}],15:[function(require,module,exports){
   
module.exports = {
  findElementPositionInArray: function (element,array) {
    return array.indexOf(element); 
  },
  
  shuffleArray: function (array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
  },
  
  checkArgumentsLength: function (expected, received) {
      if (expected!=received){
          throw "NumberOfArgumentsException";
      }
      
  },
    createSeed:function(s) {
        return function() {
//            console.log("random seed")
            s = Math.sin(s) * 10000; return s - Math.floor(s);
        };
    },
    SEEDS: [62011,80177,91591,97213,108499,113453,117797,122393,129589,136621,141223,143629,148609,155657,157933,162907,167801,172619,177467,184649,189407,199039,204047,208843,213589,221077,225949,230729,238417,250727,257893,260111],
    LAST_SEED:0
};

},{}],16:[function(require,module,exports){
"use strict"

class Set {
    constructor(){
        this.values = [];
        this.size =0;
    }
    add(value){
        if (this.values.indexOf(value)==-1){
            this.values.push(value);
            this.size=this.values.length;
        }
    }
    forEach(callback){
        for (var i=0;i<this.values.length;i++){
            callback(this.values[i]);
        }
    }
    deleteValue(value){
        var pos = this.values.indexOf(value);
        if (pos!=-1){
            this.values.splice(pos,1);
            this.size=this.values.length;
        }
    }
    
    
    
}

module.exports = Set;
},{}],17:[function(require,module,exports){
module.exports = Object.freeze({
    ONE_MAX:'ONE_MAX',
    PPEAKS:'PPEAKS',
    CVRP:'CVRP',
    CVRP_LOCAL_DATA:'CVRP_LOCAL_DATA'     
});
},{}],18:[function(require,module,exports){
module.exports = {
  AlgorithmTypes:require("./AlgorithmTypes"),
  ProccessingTypes:require("./ProccessingTypes"),
  MessageTypes:require("./MessageTypes"),
  ParameterTypes:require("./ParameterTypes"),
  FileName:"dataProbSolomon_50_50.txt",
  Index:"index.html",  
  IndexFromFile:"index2.html",    
  FromFile:false    
};
},{"./AlgorithmTypes":17,"./MessageTypes":19,"./ParameterTypes":20,"./ProccessingTypes":21}],19:[function(require,module,exports){
module.exports = Object.freeze({
    START:'START',
    STOP: 'STOP',      
    PAUSE: 'PAUSE', 
    CONTINUE: 'CONTINUE',   
    
    BUFFER: 'BUFFER',     
    CONNECT: 'CONNECT', 
    DISCONNECT: 'DISCONNECT',       

    
    NEXT_STEP:'NEXT_STEP',
    SHOW_SOLUTION:'SHOW_SOL' 
});
},{}],20:[function(require,module,exports){
module.exports = Object.freeze({
    TASK_TYPE:'TASK_TYPE',       
    ALGORITHM_TYPE:'ALGORITHM_TYPE',
    ARRAY_CUSTOMERS:'ARRAY_CUSTOMERS',
    MATRIX_COST:'MATRIX_COST',
    N_TRUCKS:'N_TRUCKS',
    TRUCK_CAPACITY:'TRUCK_CAPACITY',
    TRUCK_TIME:'TRUCK_TIME',
    PENAL_CAP:'PENAL_CAP',
    PENAL_TIME:'PENAL_TIME',
    PROB_CROSS:'PROB_CROSS',
    PROB_MUT:'PROB_MUT',
    PROB_LS:'PROB_LS',
    CHROM_LENGTH:'CHROM_LENGTH',    
    TARGET_FITNESS:'TARGET_FITNESS',
    MAX_STEPS:'MAX_STEPS',
    POP_SIZE:'POP_SIZE',    
    
    PROBLEM:'PROBLEM',
    POPULATION:'POPULATION',
    
    REPLACEMENTS:'REPLACEMENTS',
    INDIVIDUAL:'INDIVIDUAL',
    TIME:'TIME',
    TOTAL_STEPS:'TOTAL_STEPS'   
});
},{}],21:[function(require,module,exports){
module.exports = Object.freeze({
    LOCAL:'LOCAL',
    ISLAS:'ISLAS',    
    MASTER_SLAVE:'MASTER_SLAVE'
});
},{}],22:[function(require,module,exports){
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
},{}],23:[function(require,module,exports){
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

},{"events":2,"fs":1}],24:[function(require,module,exports){
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
},{}],25:[function(require,module,exports){
"use strict"; 

var Node = require('./node/node.js');

class Communications  {	
    constructor() {
        this.applicationLayer=null; //USAR SET
        this.transmissionsLayer=null;   //USAR SET 
        this.nodes = {}; //new Node(); //Lista de esclavos
        this.myId=null; //NODO DEL MONITOR ES 0       
    }
    
    setApplicationLayer(appLayer){
        this.applicationLayer=appLayer;    	
    }
    setTransmissionsLayer(transmissionsLayer){
        this.transmissionsLayer=transmissionsLayer;  	
    }	
    getApplicationLayer(){
        return this.applicationLayer;    	
    }
    
    getTransmissionsLayer(){
        return this.transmissionsLayer;    	
    }
    getMyId(){
        return this.myId;     	
    }
    setMyId(id){
        this.myId=id;     	
    }
    addNode(idNode){
    	//TODO -> creo que no es necesario esta comprobación porque ya se hace en el nivel inferior.     
        if (idNode || idNode === 0){ //No es null or undefined
            console.log("idNode="+idNode)
            var node = new Node(idNode);
            this.nodes[idNode]=node;
            return node;          
        } else {
            throw new Error("idNode isNullOrUndefined");
        }    	
    }
    removeNode(id){
        delete this.nodes[id];    	
    }
    getNode(idNode){
        return this.nodes[idNode];    	
    }
    getFreeNode(){
        for(var idNode in this.nodes){
            if (!this.nodes[idNode].isAnyMessageWaitingResponse()){
//                console.log("getFreeNode()="+JSON.stringify(this.nodes[idNode]));
//                console.log("2getFreeNode()="+this.nodes[idNode].isAnyMessageWaitingResponse());
                
                
                return this.nodes[idNode];
            }
        }    
        return null;    	
    }
    processError(error){
        console.log("Communication Errror received from: "+message.getSourceId());
        console.log("ERRROR: "+message.getError().message);
        console.log("ERRROR STACK: "+message.getError().stack);  
        throw error;    	
    }
    
    removeMessageWaitingResponse(message){
        try{
            this.nodes[message.getSourceId()].removeMessageWaitingResponse(message.getId()*-1); 
        } catch(e){
            throw "*******ERRROR CONTROLADO: "+e;
        }
           	
    }
    sendToAll(type,data){
        var msg = new Common.Elements.Message(type,null, this.getMyId(), null, null,data, new Date().getTime());
        this.sendBroadCast(msg);        
    }
    sendTo(type,task,idNode) {      
      var node = this.getNode(idNode);
      if (node){ //NO ES NULL O UNDEFINED
          var message = new Common.Elements.Message(type, node.getNextMessageId(), this.getMyId(), node.getId(), null, task, new Date().getTime());          
          node.addMessageWaitingResponse(message);
          node = this.getNode(idNode);
          this.getTransmissionsLayer().send(message);
          return true;       
      }else {
          return false;
      }    	
    }       

    

    sendBroadCast(message){
    	var node = null;	
        var destinyId;
        var nextMessageId=null;
        for (destinyId in this.nodes) {
        	node=this.nodes[destinyId];
        	nextMessageId=node.getNextMessageId();
        	node.addMessageWaitingResponse(message);
            message.setDestinyId(destinyId);
            message.setId(nextMessageId);
            this.transmissionsLayer.send(message);  
//            message = new Common.Elements.Message(message.getType(),message.getId(), this.getMyId(), destinyId, message.getError(),message.getData(), message.getTimeSent); 
        }    	
    }    
    

       

    getFreeNodeId(){
        var node = this.getFreeNode();
        if (node || node===0){
            return node.getId();
        } else {
            return null;
        }    	
    }
    

    
}

module.exports = Communications;


},{"./node/node.js":28}],26:[function(require,module,exports){
"use strict"; 
var Communications = require('./Communications.js');

class MonitorCommunication extends Communications  {	
    constructor() {
    	super();
        this.setMyId(0);//NODO DEL MONITOR ES 0
    }
    initialize(appLayer,transmissionsLayer) {
        this.setApplicationLayer(appLayer);
        this.setTransmissionsLayer(transmissionsLayer);    	
    }
    
    processRequest(message){
        if (message.getError()){ //ERROR no es null o undefined      
            this.processError(message.getError());
        } else {
            this.applicationLayer.processRequest(message.getType(),message.getData()); 
        }                	
    }   
    processResponse(message){            
        if (message.getError()){ //ERROR no es null o undefined      
            this.processError(message.getError());
        } else {
            this.applicationLayer.processResponse(message.getType(),message.getData());         
        }
        try {
            this.removeMessageWaitingResponse(message);              
        }catch(e){
            console.log(e.message);
            console.log(e.stack);
        }  	
    }    
    
    processConnect(idNode,idMessage){ 
        var node = this.addNode(idNode);
        this.applicationLayer.processConnect((dataAlgorithm)=>{
            var message = new Common.Elements.Message(Common.Constants.MessageTypes.CONNECT, "-"+idMessage, this.getMyId(), idNode, null,dataAlgorithm, new Date().getTime()); //RESPONDEMOS CON LA ID DEL NUEVO NODO     
            this.transmissionsLayer.send(message);
            node.setConnected(true); 
        });
    }

    processDisconnectRequest(idNode){
        this.applicationLayer.processDisconnectRequest(idNode);
        this.removeNode(idNode);
    }   
}





module.exports = MonitorCommunication;
},{"./Communications.js":25}],27:[function(require,module,exports){
"use strict"; 
var Communications = require('./Communications.js');


class SlaveCommunication extends Communications  {	
    constructor() {
    	super();
    	this.monitorId=0;
    }

    
    initialize(specificAlgorithm, transmissionsLayer){
        this.setApplicationLayer(specificAlgorithm);
        this.setTransmissionsLayer(transmissionsLayer);
    }    

    reset(){
        this.nodes[this.monitorId].clearMessagesWaitingResponse(); 
    }

    processRequest(message){
        var felipe=message;
        if (message.getError()){ //ERROR no es null o undefined      
            this.processError(message.getError());
        } else {
            this.applicationLayer.processRequest(message.getType(),message.getData(),(response)=>{
                var message = new Common.Elements.Message(felipe.getType(),"-"+felipe.getId(), this.getMyId(), felipe.getSourceId(), null,response, new Date().getTime());
                this.transmissionsLayer.send(message);                 
            }); 
        }            	
    }
    
    processResponse(message){        
        //TODO Nothing to do
    }
 
    start(data){
        if (this.getMyId()!=null){
            var node = this.getFreeNode(); //COMO EL ÚNICO NODO QUE TIENE ES EL MONITOR PUES ES EL QUE VA A COGER SIEMPRE  
            var messageId = node.getNextMessageId();
            var message = new Common.Elements.Message(Common.Constants.MessageTypes.START, messageId, this.getMyId(),node.getId(),null,data, new Date().getTime());
            node.addMessageWaitingResponse(message);
            this.getTransmissionsLayer().send(message);            
        } else {
            //OUTPUT
            throw "ERROR: No existe conexión."
        }    	
    }
    
    stop(){
        if (this.getMyId()!=null){
            var node = this.getFreeNode(); //COMO EL ÚNICO NODO QUE TIENE ES EL MONITOR PUES ES EL QUE VA A COGER SIEMPRE  
            var messageId = node.getNextMessageId();
            var message = new Common.Elements.Message(Common.Constants.MessageTypes.STOP, messageId, this.getMyId(),node.getId(),null,null, new Date().getTime());
            this.getTransmissionsLayer().send(message);            
        } else {
            //OUTPUT
            throw "ERROR: No existe conexión."
        }    	
    }    
    
    processConnectResponse(idNode,data,destinyId){
        if (data){ //dataAlgorithm
            this.getApplicationLayer().processStart(data,()=>{});
        }
        var node = this.addNode(this.monitorId);
        node.setConnected(true);
        //Asignamos myId
        this.setMyId(destinyId);
    }     

}




module.exports = SlaveCommunication;
},{"./Communications.js":25}],28:[function(require,module,exports){
'use strict';
class Node{
    constructor(id) {
        this.id=id;
        this.messagesWaitingResponse=[];
        this.nextMessageId=1; //No se usa el cero porque entonces no se identifica la respuesta negativa.
        this.connected=false;        
    }
    getId(){
        return this.id;        
    }
    setConnected(connected){
        this.connected=connected;        
    }
    addMessageWaitingResponse(message){
        this.messagesWaitingResponse.push(message);        
    }
    removeMessageWaitingResponse(idMessage){
        for (var i=0;i<this.messagesWaitingResponse.length;i++){
            if (this.messagesWaitingResponse[i].getId()==idMessage){
                var index = i;
            } 
        }
        this.messagesWaitingResponse.splice( index, 1 );        
    }
    clearMessagesWaitingResponse(){
    	this.messagesWaitingResponse=[];        
    }
    isAnyMessageWaitingResponse(){
        if (!this.connected || this.messagesWaitingResponse.length>0){
            return true;
        } else {
            return false;
        }        
    }
    getNextMessageId(){
        var messageId =this.nextMessageId;
        this.nextMessageId++;
        return messageId;
        //return this.nextMessageId++;        
    }
}


module.exports = Node;
},{}],29:[function(require,module,exports){
"use strict"; 

class Message{
    constructor(type, id, sourceId,destinyId,error, data, timeSent){ //TODO -> Patrón de Diseño State para poner comportamiento especifico de cada algoritmo
        this.type=type;
        this.id=id; //ID del mensaje
        this.sourceId=sourceId; //ID del Nodo origen del mensaje
        this.destinyId=destinyId; //ID del Nodo destino del mensaje
        this.error=error;
        this.data=data;
        this.timeSent=timeSent;//new Date().getTime();            
    }
    static fromJSON(m){
    //    console.log("Message.fromJSON = function(m){")
    //    console.log(JSON.stringify(m))
        var message = new Message(m.type, m.id, m.sourceId,m.destinyId,m.error, m.data, m.timeSent);
        return message;        
    }
    getType(){
        return this.type;        
    }
    getId(){
        return this.id;        
    }
    setId(id){
        this.id=id;        
    }
    getSourceId(){
        return this.sourceId;        
    }
    setSourceId(sourceId){
        this.sourceId=sourceId;        
    }
    getDestinyId(){
        return this.destinyId;        
    }
    setDestinyId(destinyId){
        this.destinyId=destinyId;        
    }
    getError(){
        return this.error;        
    }
    getData(){
        return this.data;        
    }
    getTimeSent(){
        return this.timeSent;        
    }
}



module.exports = Message;
},{}],30:[function(require,module,exports){
"use strict"; 
var WebSocketDefault = require('./WebSocketDefault');

class WebSocketClient  extends WebSocketDefault{	
        constructor(socket) {
            super();            
            var myMethod="constructor()";
            this.monitorSocket = null;  
            
            socket.on('message', (msg)=>{
                this.receive(msg);
            }); 



                //ESTO LO HE AÑADIDO LUEGO 17-12-2016
                 socket.on('disconnect', function(msg){
                                alert("SOCKET DISCONNECTED!"+msg); 
                                alert(JSON.stringify(msg)); 


                 });
                 

                  socket.on('close', function(evt){
                      alert("Socket.IO close -> "+evt);
                  });  
                  socket.on('error', function(evt){
                      alert("Socket.IO errror -> "+evt);
                  })   
                //ESTO LO HE AÑADIDO LUEGO 17-12-2016
                                               
            // socket.on('error', (err)=>{
                // alert("ERROR CON EL SERVIDOR SOCKET.IO EN EL CLIENTE"+err)
                // throw "ERROR CON EL SERVIDOR SOCKET.IO EN EL CLIENTE"+err;
            // });      
            // socket.on('connect_failed', ()=>{
            //     throw "connect_failed CON EL SERVIDOR SOCKET.IO EN EL CLIENTE";
            // });   
            // socket.on('reconnect_failed', ()=>{
            //     throw "reconnect_failed CON EL SERVIDOR SOCKET.IO EN EL CLIENTE";
            // });                             
        }

        send(message){
            this.sendTo(message,this.monitorSocket);    	
        }  
        initialize(communicationsLayer,monitorSocket){
            this.setCommunicationsLayer(communicationsLayer);
            this.monitorSocket=monitorSocket;
        }

        processRequest(message){           
             this.communicationsLayer.processRequest(message); 
        }

        processResponse(message){
             switch(message.getType()) {
             case Common.Constants.MessageTypes.CONNECT:
                 console.log("Connection Established.");
                 this.processConnectResponse(message);
                 break;   	         
             default:
                   this.communicationsLayer.processResponse(message);
             } 
        }   
	processConnectResponse(message){
		//TODO ¿TRY CATCH?
            if (message.getError()){ //ERROR no es null o undefined
                this.processError(message.getError());
            } else {
                this.communicationsLayer.processConnectResponse(message.getSourceId(),message.getData(),message.getDestinyId());
            }
	}
}

module.exports = WebSocketClient;
},{"./WebSocketDefault":31}],31:[function(require,module,exports){
"use strict"; 

class WebSocketDefault  {	
    constructor() {
        this.communicationsLayer =  null; //SE DEBE UTILIZAR EL SET    
              
    }
    
    setCommunicationsLayer(communicationsLayer){
        this.communicationsLayer=communicationsLayer;    	
    }    

     
    sendTo(message,socket){        
        var messageString = JSON.stringify(message);   
        console.log("MENSAJE ENVIADO: "+messageString);
        socket.emit('message', messageString); 	
    }      
    
    receive(message){
        console.log("MENSAJE RECIBIDO= "+message);
        message=JSON.parse(message);
        message=Common.Elements.Message.fromJSON(message);     
        if (message.getId()<0){ //Si el ID es menor que cero entonces son respuestas.
            this.processResponse(message);
        }else {  //Si no son peticiones.          
            this.processRequest(message);             
        }  
    }    
    
    processRequest(){
    	throw new Error("Abstract Method.");
    }
    processResponse(){
    	throw new Error("Abstract Method.");
    }     
    processError(message){
        console.log("Transmission Errror received from: "+message.getSourceId());
        console.log("ERRROR: "+message.getError().message);
        console.log("ERRROR STACK: "+message.getError().stack);        
    }    

}

module.exports = WebSocketDefault;
},{}],32:[function(require,module,exports){
(function (global){
"use strict";

require('setimmediate');
global.Common = require("../../../../common/Common.js");

//var Common = require("../../../common/Common.js");
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../../../../common/Common.js":13,"setimmediate":33}],33:[function(require,module,exports){
(function (process,global){
(function (global, undefined) {
    "use strict";

    if (global.setImmediate) {
        return;
    }

    var nextHandle = 1; // Spec says greater than zero
    var tasksByHandle = {};
    var currentlyRunningATask = false;
    var doc = global.document;
    var registerImmediate;

    function setImmediate(callback) {
      // Callback can either be a function or a string
      if (typeof callback !== "function") {
        callback = new Function("" + callback);
      }
      // Copy function arguments
      var args = new Array(arguments.length - 1);
      for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i + 1];
      }
      // Store and register the task
      var task = { callback: callback, args: args };
      tasksByHandle[nextHandle] = task;
      registerImmediate(nextHandle);
      return nextHandle++;
    }

    function clearImmediate(handle) {
        delete tasksByHandle[handle];
    }

    function run(task) {
        var callback = task.callback;
        var args = task.args;
        switch (args.length) {
        case 0:
            callback();
            break;
        case 1:
            callback(args[0]);
            break;
        case 2:
            callback(args[0], args[1]);
            break;
        case 3:
            callback(args[0], args[1], args[2]);
            break;
        default:
            callback.apply(undefined, args);
            break;
        }
    }

    function runIfPresent(handle) {
        // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
        // So if we're currently running a task, we'll need to delay this invocation.
        if (currentlyRunningATask) {
            // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
            // "too much recursion" error.
            setTimeout(runIfPresent, 0, handle);
        } else {
            var task = tasksByHandle[handle];
            if (task) {
                currentlyRunningATask = true;
                try {
                    run(task);
                } finally {
                    clearImmediate(handle);
                    currentlyRunningATask = false;
                }
            }
        }
    }

    function installNextTickImplementation() {
        registerImmediate = function(handle) {
            process.nextTick(function () { runIfPresent(handle); });
        };
    }

    function canUsePostMessage() {
        // The test against `importScripts` prevents this implementation from being installed inside a web worker,
        // where `global.postMessage` means something completely different and can't be used for this purpose.
        if (global.postMessage && !global.importScripts) {
            var postMessageIsAsynchronous = true;
            var oldOnMessage = global.onmessage;
            global.onmessage = function() {
                postMessageIsAsynchronous = false;
            };
            global.postMessage("", "*");
            global.onmessage = oldOnMessage;
            return postMessageIsAsynchronous;
        }
    }

    function installPostMessageImplementation() {
        // Installs an event handler on `global` for the `message` event: see
        // * https://developer.mozilla.org/en/DOM/window.postMessage
        // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

        var messagePrefix = "setImmediate$" + Math.random() + "$";
        var onGlobalMessage = function(event) {
            if (event.source === global &&
                typeof event.data === "string" &&
                event.data.indexOf(messagePrefix) === 0) {
                runIfPresent(+event.data.slice(messagePrefix.length));
            }
        };

        if (global.addEventListener) {
            global.addEventListener("message", onGlobalMessage, false);
        } else {
            global.attachEvent("onmessage", onGlobalMessage);
        }

        registerImmediate = function(handle) {
            global.postMessage(messagePrefix + handle, "*");
        };
    }

    function installMessageChannelImplementation() {
        var channel = new MessageChannel();
        channel.port1.onmessage = function(event) {
            var handle = event.data;
            runIfPresent(handle);
        };

        registerImmediate = function(handle) {
            channel.port2.postMessage(handle);
        };
    }

    function installReadyStateChangeImplementation() {
        var html = doc.documentElement;
        registerImmediate = function(handle) {
            // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
            // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
            var script = doc.createElement("script");
            script.onreadystatechange = function () {
                runIfPresent(handle);
                script.onreadystatechange = null;
                html.removeChild(script);
                script = null;
            };
            html.appendChild(script);
        };
    }

    function installSetTimeoutImplementation() {
        registerImmediate = function(handle) {
            setTimeout(runIfPresent, 0, handle);
        };
    }

    // If supported, we should attach to the prototype of global, since that is where setTimeout et al. live.
    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
    attachTo = attachTo && attachTo.setTimeout ? attachTo : global;

    // Don't get fooled by e.g. browserify environments.
    if ({}.toString.call(global.process) === "[object process]") {
        // For Node.js before 0.9
        installNextTickImplementation();

    } else if (canUsePostMessage()) {
        // For non-IE10 modern browsers
        installPostMessageImplementation();

    } else if (global.MessageChannel) {
        // For web workers, where supported
        installMessageChannelImplementation();

    } else if (doc && "onreadystatechange" in doc.createElement("script")) {
        // For IE 6–8
        installReadyStateChangeImplementation();

    } else {
        // For older browsers
        installSetTimeoutImplementation();
    }

    attachTo.setImmediate = setImmediate;
    attachTo.clearImmediate = clearImmediate;
}(typeof self === "undefined" ? typeof global === "undefined" ? this : global : self));

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":3}],34:[function(require,module,exports){
'use strict';

class Population{
    constructor() {
        this.pop=[];
    }    
    static fromJSON(p){
        var population = new Common.Elements.Population();
        for (var i=0;i<p.pop.length;i++){
            population.pop[i]=Common.Elements.Individual.fromJSON(p.pop[i]);
        }
        population.bestp=p.bestp;
        population.worstp=p.worstp;
        population.bestf=p.bestf;
        population.avgf=p.avgf;
        population.worstf=p.worstf;
        population.BESTF=p.BESTF;

        population.iteration=p.iteration;
        return population;        
    }
    initialize(popSize,size){
        for (var i = 0; i < popSize; i++){
                this.pop.push(new Common.Elements.Individual());
                this.pop[i].initialize(size);
        }

        // Initialize statistics
        this.bestp = 0;     
        this.worstp = 0;
        this.bestf = 0.0;   
        this.avgf   = 0.0;   
        this.worstf = 9999999999.0;    
        this.BESTF = 0.0;

        this.iteration = 0;
        //MOSTRAR POBLACIÓN
//        for (var i=0;i<this.pop.length;i++){
//            console.log(i+" -> "+JSON.stringify(this.pop[i]))
//        }        
    }
    getSize(){
        return this.pop.length;        
    }
    getIndividual(index){
        return this.pop[index];        
    }
    setIndividual(index, indiv){
        this.pop[index]=indiv;        
    }
    replaceWorst(indiv){
        if (indiv.getChromosome().alleles.length==0) throw "ERROR no debería ser cero"
        //TODO
        //Comprobar si el que se inserta es mejor que el peor ¿comprobarlo fuera o dentro?         
      //  if (indiv.getFitness()>this.pop[this.worstp].getFitness()){
           this.pop[this.worstp] = indiv; 
           return this.worstp;
      //  } else {
      //      return -1;
      //  }        
    }   
    replace(indiv,position){//Este método se utiliza sólo cuando Monitor-Esclavo para que el esclavo pueda reemplazar
        this.pop[position] = indiv;         
    }
    getBestIndividual(){
        return this.pop[this.bestp];        
    }
    showBestFitness(){
        console.log(this.iteration+"-BEST FITNESS "+this.bestf)   
        console.log(JSON.stringify(this.getIndividual(this.bestp)))         
    }
    computeStats(){

                var borrarBESTBEFORE=this.bestf;

        
        var antiguoFitness = this.bestf;
        
	var total = 0.0;
	var f = 0.0;
	this.worstf = this.pop[0].fitness;
	this.worstp = 0;
	this.bestf = this.pop[0].fitness;
	this.bestp = 0;

	for (var i = 0; i < this.pop.length; i++){
		f = this.pop[i].fitness;
		if (f<=this.worstf) {
			this.worstf=f;
			this.worstp=i;
		}
		if (f>this.bestf){ 
			this.bestf = f; 
			this.bestp = i;			
		}
		if (f>=this.BESTF){ this.BESTF = f;}
		total+=f;
	}	
	this.avgf = total/this.pop.length;              
                
                var borrarBESTLATER=this.bestf;
                
                if (borrarBESTBEFORE !=0 && borrarBESTLATER<borrarBESTBEFORE){
                    throw "ERROR";
                    console.log("ESTO NO DEBERÍA ESTAR PASANDO")
                    console.log("borrarBESTBEFORE="+borrarBESTBEFORE)
                    console.log("borrarBESTLATER="+borrarBESTLATER)                    
                } 

	if (this.bestf>antiguoFitness){
		console.log(this.iteration+"-NUEVO FITNESS "+this.bestf)   
        console.log(JSON.stringify(this.getIndividual(this.bestp)))         
	}

	this.iteration++;          
    }
}

module.exports = Population;
},{}],35:[function(require,module,exports){

function ProblemOneMax() {
	this.targetFitness = -999999.9;
	this.tfKnown = false;
	this.fitnessCounter = 0;
}

ProblemOneMax.prototype.evaluateStep = function(indiv) {
	this.fitnessCounter++;
	return this.evaluate(indiv);
}

ProblemOneMax.prototype.evaluate = function(indiv) {
	var f = 0.0;
	for (var i = 0; i < indiv.getChromosome().getSize(); i++){
		if (indiv.getChromosome().getAllele(i)==1){
			f=f+1.0;
		} 
	}	
	indiv.setFitness(f);
}

module.exports = ProblemOneMax;
},{}],36:[function(require,module,exports){
'use strict';


////Ciudades/Clientes -> 0,1,2 ... n
//Matriz de costes (incluye también al almacén)
//De 0 a 0 = x distancia
//De 0 a 1 = y distancia .....

//customersArray no incluye almacén


















class ProblemCVRP{
    constructor() {}    
    static fromJSON(p){
        var problem = new Common.Elements.ProblemCVRP();
        problem.matrixCost=p.matrixCost;
        problem.customersArray=p.customersArray;
        for (var i=0;i<problem.customersArray.length;i++){
            problem.customersArray[i]=Common.Elements.Customer.fromJSON(problem.customersArray[i]);
        }
        problem.truckCapacity=p.truckCapacity;
        problem.truckTime=p.truckTime;
        problem.penalCap=p.penalCap;
        problem.penalTime=p.penalTime;
        problem.targetFitness=p.targetFitness;
        problem.tfKnown=p.tfKnown;
        problem.fitnessCounter=p.fitnessCounter
        return problem;        
    }

    initialize(matrixCost,customersArray, truckCapacity, truckTime, penalCap, penalTime){
        this.matrixCost=matrixCost;
        this.customersArray = customersArray;
        this.truckCapacity = truckCapacity;
        this.truckTime=truckTime;
        this.penalCap=penalCap;
        this.penalTime=penalTime;
   
    	this.targetFitness = -999999.9;
    	this.tfKnown = false;
    	this.fitnessCounter = 0;        
    }
    
    evaluateStep(indiv){
	    this.fitnessCounter++;
        return this.evaluate2(indiv);
    }


    evaluate2(indiv){
        var problem = this;

        var routeItemsArray=[];
        var routeItems=0;
        var routeTime=0;
        var totalTime=0;
        var totalItems=0;        
        var routeFitness=0;
        var fitness=0;

        var posCustomer;
        var posCustomer2;
        var customer;

        var origin;
        var destiny; 





        var totalCustomers=problem.customersArray.length;

        function isSeparator(indexCustomer){

                if (indexCustomer>=totalCustomers){
                    return true;
                }    else {
                    return false;
                }
        }


        function startRoute(origin){ //Desde almacén hasta primer cliente
            routeTime+=problem.matrixCost[0][origin]; 
            isNewRoute=false;
        }

        function endRoute(){
            isNewRoute=true;
            totalTime+=routeTime; //TODO -> totalTime no sé está utilizando.
            totalItems+=routeItems;            

            routeItemsArray.push(routeItems);

            routeFitness=routeTime;
            if ((routeTime-problem.truckTime)>0){ //Si pasamos el límite de tiempo.
                routeFitness+=(routeTime-problem.truckTime)*problem.penalTime;
            }            

            if ((routeItems-problem.truckCapacity)>0){ //Si pasamos el límite de capacidad.
                routeFitness+=(routeItems-problem.truckCapacity)*problem.penalCap;
            }  


            indiv.routeTime=totalTime;
            indiv.totalItems=totalItems;
            indiv.routeItems=routeItems;
            indiv.routeItemsArray=routeItemsArray;            
            fitness+=routeFitness;


            routeTime=0;
            routeItems=0;
            routeFitness=0;
        }

        var isNewRoute=true;

        for (var i=0;i<indiv.getChromosome().getSize()-1;i++){
            posCustomer=indiv.getChromosome().getAllele(i);
            posCustomer2=indiv.getChromosome().getAllele(i+1);
            if (isSeparator(posCustomer)){ //¿es separador el origen?
                endRoute();
            } else if (isSeparator(posCustomer2)){//¿es separador el destino?
                //entonces vamos al almacén
                origin=posCustomer+1; //matrixCost
                 if (isNewRoute){
                    startRoute(origin);
                }
                routeTime+=problem.matrixCost[origin][0];  

                customer = problem.customersArray[posCustomer]
                routeTime+=customer.getDeliveryTime();  
                routeItems+=customer.getDeliveryItems();           
            } else{
                //entonces sumamos ese camino
                origin=posCustomer+1; //matrixCost
                if (isNewRoute){
                    startRoute(origin);
                }                
                destiny=posCustomer2+1; //matrixCost
                routeTime+=problem.matrixCost[origin][destiny]; 

                customer = problem.customersArray[posCustomer]
                routeTime+=customer.getDeliveryTime();  
                routeItems+=customer.getDeliveryItems();                                                 
            }
        }


            posCustomer=indiv.getChromosome().getAllele(indiv.getChromosome().getSize()-1);
            if (isSeparator(posCustomer)){ //¿es separador el origen?
                endRoute();
            } else{
                //entonces sumamos ese camino
                origin=posCustomer+1; //matrixCost
                routeTime+=problem.matrixCost[origin][0]; 

                customer = problem.customersArray[posCustomer]
                routeTime+=customer.getDeliveryTime();    
                routeItems+=customer.getDeliveryItems();                  

                endRoute();                          
            }

            //fitness=totalTime*(-1);
            fitness=fitness*(-1);

            indiv.setFitness(fitness);
    }

 }




module.exports = ProblemCVRP;
},{}],37:[function(require,module,exports){
'use strict';


class Customer{
    constructor(deliveryItems, deliveryTime) {
        this.deliveryItems = deliveryItems;
        this.deliveryTime = deliveryTime;               
    }
    static fromJSON(c){
        var customer = new Common.Elements.Customer();
        customer.deliveryItems=c.deliveryItems;
        customer.deliveryTime=c.deliveryTime;
        return customer;        
    }
    getDeliveryItems(){
        return this.deliveryItems;        
    }
    getDeliveryTime(){
        return this.deliveryTime;        
    }
    setDeliveryItems(items){
        this.deliveryItems = items;        
    }
    setDeliveryTime(time){
        this.deliveryTime = time;        
    }
}
    
module.exports = Customer;
},{}],38:[function(require,module,exports){
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
},{}]},{},[32]);
