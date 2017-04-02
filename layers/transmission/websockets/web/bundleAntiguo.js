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
  
//  WebSocketServer:require("../layers/transmission/websockets/WebSocketServer"),  
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
    }
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
  FileName:"dataProb_200_50.txt",
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
                        console.log("TOTAL REPLACEMENTS = "+this.replacements.length);
                        console.log("NEXT REPLACEMENT = "+nextReplacement);
                        replacementsToDo=this.replacements.slice(nextReplacement,this.replacements.length);

                        data = {};
                        data[Common.Constants.ParameterTypes.REPLACEMENTS]=replacementsToDo;
                        data[Common.Constants.ParameterTypes.TASK_TYPE]=Common.Constants.MessageTypes.NEXT_STEP;
                        data[Common.Constants.ParameterTypes.ALGORITHM_TYPE]=Common.Constants.AlgorithmTypes.CVRP;//TODO -> Creo que no es necesario
                        this.communicationLayer.sendTo(Common.Constants.MessageTypes.NEXT_STEP, data, idNode);

                        this.slaveLastReplacement[idNode]=nextReplacement+replacementsToDo.length; 

                        idNode=this.communicationLayer.getFreeNodeId();
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
                    console.log("REEMPLAZO DESDE ESCLAVO");
                    console.log("this.replacementsFromSlaves="+this.replacementsFromSlaves)
                    console.log("this.replacements.length="+this.replacements.length)
    //    		console.log(" REEMPLAZO REALIZADO2 "+this.replacements.length)                
            }              
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
              problem.targetFitness=-14000000; //200
            var nTrucks = jsonProblem.nTrucks;
//            console.log("###"+JSON.stringify(nTrucks))


            var crossProb = jsonProblem.crossProb;
//            console.log("###"+JSON.stringify(crossProb))
            
            var mutateProb = jsonProblem.mutateProb;
//            console.log("###"+JSON.stringify(mutateProb))
            
            var LSProb = jsonProblem.LSProb;
//            console.log("###"+JSON.stringify(LSProb))            
            
//            var maxSteps = jsonProblem.maxSteps;
            var maxSteps = 1000;            
            
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
        this.nodes[message.getSourceId()].removeMessageWaitingResponse(message.getId()*-1);    	
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
        if (indiv.getFitness()>this.pop[this.worstp].getFitness()){
           this.pop[this.worstp] = indiv; 
           return this.worstp;
        } else {
            return -1;
        }        
    }   
    replace(indiv,position){//Este método se utiliza sólo cuando Monitor-Esclavo para que el esclavo pueda reemplazar
        this.pop[position] = indiv;         
    }
    getBestIndividual(){
        return this.pop[this.bestp];        
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

                    var origin = 0; //Almacén
                    var destiny=-999;

                    var customer=null;
                    var travelTime=null;
                    var deliveryTime=null;
                    var totalTimeRoute=0;
                    var deliveryItems=0;

                    var routeTimesArray = [];
                    var penalCapArray = [];
                    var penalTimeArray = [];

                    var end = findFirstSeparator(this,indiv); //Posición último alelle
                    var next=getNextAllele(indiv,end);   //Posición siguiente allele (cliente o separador)

                    var posCustomer=null;

                    var problem = this;



                    function processCustomer(){

                            posCustomer=indiv.getChromosome().getAllele(next);

                            customer = problem.customersArray[posCustomer];   //Valor del alelo es la posición del cliente en el array.
                            if(!customer){
                                console.log("ERRROR debería haber un cliente");
                                console.log("next="+next);
                                console.log("indiv.getChromosome().length="+indiv.getChromosome().getSize())
                                console.log("posCustomer="+posCustomer);
                                console.log("problem.customersArray="+JSON.stringify(problem.customersArray))
                                throw "ERRROR customer es undefined linea 90 de ProblemCVRP"
                            }
                            destiny = posCustomer+1;  //Sumamos 1 al valor del alelo para obtener el destino.

                //            //Destino no se puede pasar de la matriz porque ya hemos comprobado que esté dentro del array y la matriz siempre tiene 1 valor más. Así que no es necesaria esa comprobación.

                            travelTime=problem.matrixCost[origin][destiny];



                            deliveryTime=customer.getDeliveryTime();         

                            totalTimeRoute+=travelTime+deliveryTime;

                            deliveryItems += customer.getDeliveryItems();

                            origin=destiny;    
                            next=getNextAllele(indiv,next);           
                    }

                    function processSeparator(){
                            //CALCULAR COSTE DESDE ORIGEN HASTA ALMACÉN (fin de ruta)
                            if (origin!=0){ //Si el origen no era el almacén -> Calculamos coste de regreso al almacén.

                                deliveryTime=0;      
                                travelTime=problem.matrixCost[origin][0];
                                totalTimeRoute+=travelTime;                
                            }



                            routeTimesArray.push(totalTimeRoute); 
                            if (totalTimeRoute>problem.truckTime){

                                penalTimeArray.push((totalTimeRoute-problem.truckTime)*problem.penalTime);
                            } else {

                                penalTimeArray.push(0);                
                            }
                            if (deliveryItems>problem.truckCapacity){

                                penalCapArray.push((deliveryItems-problem.truckCapacity)*problem.penalCap);  
                            } else {

                                penalCapArray.push(0);  
                            }
                            totalTimeRoute=0;
                            deliveryItems=0;          
                            origin=0;                          
                            next=getNextAllele(indiv,next);  
    
                    }    

                    while (next!=end){ //Hasta que no demos la vuelta al array seguimos
                        if (!isSeparator(this,indiv,indiv.getChromosome().getAllele(next))){ //SI NO ES SEPARADOR -> Cliente
 
                            processCustomer();
         


                        } else { //ES SEPARADOR -> FIN DE RUTA
 
                            processSeparator();
         
                        }     
                    }

                    processSeparator();

                    var fitness = 0;       
                    for (var k=0;k<routeTimesArray.length;k++){
                        fitness+=routeTimesArray[k];
                        fitness+=penalCapArray[k];
                        fitness+=penalTimeArray[k];
                    }
                    fitness*=-1;

                    indiv.setFitness(fitness);
     
    }
    
}




function isSeparator(problem,indiv,indexCustomer){

        if (indexCustomer>=problem.customersArray.length){
            return true;
        }    else {
            return false;
        }
}


function findFirstSeparator(problem,indiv){   
    for (var i=0;i<indiv.getChromosome().getSize();i++){
   
        if (isSeparator(problem,indiv,indiv.getChromosome().getAllele(i))){

            return i;
        }
    }
}

function getNextAllele(indiv,actual){ //POSICIÓN DEL ARRAY DE ALLELES (incluye separadores)
    actual++;
    if (actual>=indiv.getChromosome().getSize()){
        actual=0;
    }
    return actual;
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
},{}]},{},[32])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbGliL19lbXB0eS5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIuLi8uLi8uLi8uLi9JbmRpdmlkdWFsLmpzIiwiLi4vLi4vLi4vLi4vYWxnb3JpdGhtL0FsZ29yaXRobUFic3RyYWN0LmpzIiwiLi4vLi4vLi4vLi4vYWxnb3JpdGhtL0FsZ29yaXRobUNWUlAuanMiLCIuLi8uLi8uLi8uLi9hbGdvcml0aG0vQWxnb3JpdGhtQ1ZSUEFic3RyYWN0LmpzIiwiLi4vLi4vLi4vLi4vYWxnb3JpdGhtL0FsZ29yaXRobU9uZU1heC5qcyIsIi4uLy4uLy4uLy4uL2Nocm9tb3NvbWUvQ2hyb21vc29tZUFic3RyYWN0LmpzIiwiLi4vLi4vLi4vLi4vY2hyb21vc29tZS9DaHJvbW9zb21lQmluYXJ5LmpzIiwiLi4vLi4vLi4vLi4vY2hyb21vc29tZS9DaHJvbW9zb21lVlJQLmpzIiwiLi4vLi4vLi4vLi4vY29tbW9uL0FycmF5cy5qcyIsIi4uLy4uLy4uLy4uL2NvbW1vbi9Db21tb24uanMiLCIuLi8uLi8uLi8uLi9jb21tb24vRWxlbWVudHMuanMiLCIuLi8uLi8uLi8uLi9jb21tb24vTWF0aHMuanMiLCIuLi8uLi8uLi8uLi9jb21tb24vU2V0LmpzIiwiLi4vLi4vLi4vLi4vY29tbW9uL2NvbnN0YW50cy9BbGdvcml0aG1UeXBlcy5qcyIsIi4uLy4uLy4uLy4uL2NvbW1vbi9jb25zdGFudHMvQ29uc3RhbnRzLmpzIiwiLi4vLi4vLi4vLi4vY29tbW9uL2NvbnN0YW50cy9NZXNzYWdlVHlwZXMuanMiLCIuLi8uLi8uLi8uLi9jb21tb24vY29uc3RhbnRzL1BhcmFtZXRlclR5cGVzLmpzIiwiLi4vLi4vLi4vLi4vY29tbW9uL2NvbnN0YW50cy9Qcm9jY2Vzc2luZ1R5cGVzLmpzIiwiLi4vLi4vLi4vYXBwbGljYXRpb24vTG9jYWxBcHBsaWNhdGlvbi5qcyIsIi4uLy4uLy4uL2FwcGxpY2F0aW9uL01vbml0b3JBcHBsaWNhdGlvbi5qcyIsIi4uLy4uLy4uL2FwcGxpY2F0aW9uL1NsYXZlQXBwbGljYXRpb24uanMiLCIuLi8uLi8uLi9jb21tdW5pY2F0aW9uL0NvbW11bmljYXRpb25zLmpzIiwiLi4vLi4vLi4vY29tbXVuaWNhdGlvbi9Nb25pdG9yQ29tbXVuaWNhdGlvbi5qcyIsIi4uLy4uLy4uL2NvbW11bmljYXRpb24vU2xhdmVDb21tdW5pY2F0aW9uLmpzIiwiLi4vLi4vLi4vY29tbXVuaWNhdGlvbi9ub2RlL25vZGUuanMiLCIuLi8uLi9tZXNzYWdlcy9NZXNzYWdlLmpzIiwiLi4vV2ViU29ja2V0Q2xpZW50LmpzIiwiLi4vV2ViU29ja2V0RGVmYXVsdC5qcyIsImluZGV4LmpzIiwibm9kZV9tb2R1bGVzL3NldGltbWVkaWF0ZS9zZXRJbW1lZGlhdGUuanMiLCIuLi8uLi8uLi8uLi9wb3B1bGF0aW9uLmpzIiwiLi4vLi4vLi4vLi4vcHJvYmxlbS9Qcm9ibGVtT25lTWF4LmpzIiwiLi4vLi4vLi4vLi4vcHJvYmxlbS9wcm9ibGVtQ1ZSUC5qcyIsIi4uLy4uLy4uLy4uL3Byb2JsZW0vcHJvYmxlbUNWUlAvY3VzdG9tZXIuanMiLCIuLi8uLi8uLi8uLi9zdGF0aWMvT3V0cHV0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbk9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzFMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEF0IGxlYXN0IGdpdmUgc29tZSBraW5kIG9mIGNvbnRleHQgdG8gdGhlIHVzZXJcbiAgICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4gKCcgKyBlciArICcpJyk7XG4gICAgICAgIGVyci5jb250ZXh0ID0gZXI7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIGlmIChsaXN0ZW5lcnMpIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIGlmICh0aGlzLl9ldmVudHMpIHtcbiAgICB2YXIgZXZsaXN0ZW5lciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICAgIGlmIChpc0Z1bmN0aW9uKGV2bGlzdGVuZXIpKVxuICAgICAgcmV0dXJuIDE7XG4gICAgZWxzZSBpZiAoZXZsaXN0ZW5lcilcbiAgICAgIHJldHVybiBldmxpc3RlbmVyLmxlbmd0aDtcbiAgfVxuICByZXR1cm4gMDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICByZXR1cm4gZW1pdHRlci5saXN0ZW5lckNvdW50KHR5cGUpO1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGlzIG5vdCBkZWZpbmVkJyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaXMgbm90IGRlZmluZWQnKTtcbiAgICAgICAgfVxuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCJcInVzZSBzdHJpY3RcIjsgXG5cbmNsYXNzIEluZGl2aWR1YWwgIHtcdFxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLmNocm9tb3NvbWU9bnVsbDtcbiAgICAgICAgdGhpcy5maXRuZXNzID0gMDsgICAgICAgIFxuICAgIH1cbiAgICBzdGF0aWMgZnJvbUpTT04oaSkge1xuICAgIC8vXHRjb25zb2xlLmxvZyhcIkluZGl2aWR1YWwuZnJvbUpTT05cIilcbiAgICAgICAgdmFyIGluZGl2PW5ldyBDb21tb24uRWxlbWVudHMuSW5kaXZpZHVhbCgpO1xuICAgIC8vICAgIGNvbnNvbGUubG9nKFwiaT1cIitKU09OLnN0cmluZ2lmeShpKSlcbiAgICAgICAgaW5kaXYuY2hyb21vc29tZT1Db21tb24uRWxlbWVudHMuQ2hyb21vc29tZS5mcm9tSlNPTihpLmNocm9tb3NvbWUpO1xuICAgICAgICBpbmRpdi5maXRuZXNzPWkuZml0bmVzcztcbiAgICAgICAgcmV0dXJuIGluZGl2O1xuICAgIH0gICAgICAgXG4vLyAgICB0b0pTT04gOiBmdW5jdGlvbigpe1xuLy8gICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSh0aGlzKTtcbi8vICAgIH0sICBcbiAgICBpbml0aWFsaXplKHNpemUpe1xuICAgICAgICB0aGlzLmNocm9tb3NvbWU9bmV3IENvbW1vbi5FbGVtZW50cy5DaHJvbW9zb21lKCk7XG4gICAgICAgIHRoaXMuY2hyb21vc29tZS5pbml0aWFsaXplKHNpemUpOyAgICAgICAgXG4gICAgfVxuICAgIHNldENocm9tb3NvbWUoY2hybyl7XG4gICAgICAgIHRoaXMuY2hyb21vc29tZT1jaHJvO1xuICAgIH1cbiAgICBnZXRDaHJvbW9zb21lKCl7XG4gICAgICAgIHJldHVybiB0aGlzLmNocm9tb3NvbWU7XG4gICAgfVxuICAgIGdldEZpdG5lc3MoKXtcbiAgICAgICAgcmV0dXJuIHRoaXMuZml0bmVzcztcbiAgICB9XG4gICAgc2V0Rml0bmVzcyhmKXtcbiAgICAgICAgdGhpcy5maXRuZXNzPWY7ICAgICAgICBcbiAgICB9XG4gICAgdG9TdHJpbmcoKXtcbiAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHRoaXMpOyAgICAgICAgXG4gICAgfVxuICAgIGNsb25lKCl7XG4gICAgICAgIHZhciBjb3B5ID0gbmV3IEluZGl2aWR1YWwoKTtcbiAgICAgICAgY29weS5jaHJvbW9zb21lPXRoaXMuY2hyb21vc29tZS5jbG9uZSgpO1xuICAgICAgICBjb3B5LmZpdG5lc3M9dGhpcy5maXRuZXNzO1xuICAgICAgICByZXR1cm4gY29weTsgICAgICAgIFxuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBJbmRpdmlkdWFsO1xuXG4iLCJcInVzZSBzdHJpY3RcIjsgXHJcbnZhciBteUNsYXNzPVwiQWxnb3JpdGhtQWJzdHJhY3RcIjtcclxudmFyIG91dHB1dFByaW9yaXR5PTIwMDtcclxuXHJcbmNsYXNzIEFsZ29yaXRobUFic3RyYWN0ICB7XHRcclxuICAgIGNvbnN0cnVjdG9yKHByb2JsZW0sIHByb2JDcm9zcywgcHJvYk11dCwgbWF4U3RlcHMpe1xyXG4gICAgICAgIHRoaXMucG9wdWxhdGlvbiA9IG51bGw7ICAgICBcclxuICAgICAgICB0aGlzLnByb2JsZW0gPSBwcm9ibGVtOyAgICBcclxuICAgICAgICB0aGlzLnByb2JDcm9zcyA9IHByb2JDcm9zcztcclxuICAgICAgICB0aGlzLnByb2JNdXQ9cHJvYk11dDsgICAgIFxyXG4gICAgICAgIHRoaXMucnVubmluZz1mYWxzZTtcclxuICAgICAgICB0aGlzLnN0ZXA9MDtcclxuICAgICAgICB0aGlzLm1heFN0ZXBzID0gbWF4U3RlcHM7ICAgICAgICBcclxuICAgICAgICB0aGlzLnNvbHV0aW9uRm91bmQ9ZmFsc2U7ICAgIFx0XHRcclxuICAgIH1cclxuICAgIGluaXRpYWxpemUocG9wU2l6ZSxjaHJvbUxlbmd0aCl7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQWJzdHJhY3QgTWV0aG9kLlwiKTsgICAgXHRcclxuICAgIH0gICAgXHJcbiAgICBsb2FkKHBvcHVsYXRpb24pe1xyXG4gICAgICAgIHRoaXMucG9wdWxhdGlvbj1wb3B1bGF0aW9uOyAgIFx0XHJcbiAgICB9ICAgICAgIFxyXG4gICAgc2VsZWN0VG91cm5hbWVudChwb3Ape1xyXG4gICAgICAgIHZhciBteU1ldGhvZD1cInNlbGVjdFRvdXJuYW1lbnQocG9wKVwiO1xyXG4gICAgICAgIFxyXG4gICAgXHR2YXIgcDEgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqcG9wLmdldFNpemUoKSk7XHJcbiAgICBcdHZhciBwMiA9IDA7XHJcbiAgICAgICAgZG97ICBcclxuICAgICAgICAgICAgcDIgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqcG9wLmdldFNpemUoKSk7ICBcclxuICAgICAgICB9ICAgXHJcbiAgICAgICAgd2hpbGUgKHAxPT1wMik7XHRcclxuICAgICAgICBcclxuICAgICAgICAgaWYgKHBvcC5nZXRJbmRpdmlkdWFsKHAxKS5nZXRDaHJvbW9zb21lKCkuZ2V0U2l6ZSgpPT0wKSB0aHJvdyBcIkVSUk9SIG5vIGRlYmVyw61hIHNlciBjZXJvXCIgLy9UT0RPXHJcbiAgICAgICAgIFxyXG4gICAgICAgICBpZiAocG9wLmdldEluZGl2aWR1YWwocDIpLmdldENocm9tb3NvbWUoKS5nZXRTaXplKCk9PTApIHRocm93IFwiRVJST1Igbm8gZGViZXLDrWEgc2VyIGNlcm9cIiAvL1RPRE9cclxuICAgICAgICBcclxuICAgICAgICBpZiAocG9wLmdldEluZGl2aWR1YWwocDEpLmdldEZpdG5lc3MoKT5wb3AuZ2V0SW5kaXZpZHVhbChwMikuZ2V0Rml0bmVzcygpKXtcclxuICAgICAgICAgICAgT3V0cHV0LnNob3dJbmZvKG91dHB1dFByaW9yaXR5LG15Q2xhc3MsbXlNZXRob2QsXCJTRUxFQ1QgVE9VUk5BTUVOVCAtPiBcIitwMSk7XHJcbiAgICAgICAgXHRyZXR1cm4gcG9wLmdldEluZGl2aWR1YWwocDEpLmNsb25lKCk7XHJcbiAgICAgICAgfSBlbHNlIHsgXHJcbiAgICAgICAgICAgIE91dHB1dC5zaG93SW5mbyhvdXRwdXRQcmlvcml0eSxteUNsYXNzLG15TWV0aG9kLFwiU0VMRUNUIFRPVVJOQU1FTlQgLT4gXCIrcDIpOyBcdFxyXG4gICAgICAgIFx0cmV0dXJuIHBvcC5nZXRJbmRpdmlkdWFsKHAyKS5jbG9uZSgpO1xyXG4gICAgICAgIH0gICAgXHRcclxuICAgIH1cclxuICAgIFxyXG4gICAgXHJcbiAgICBzZWxlY3RUb3VybmFtZW50Mihwb3Ape1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBzZWxlY3RlZFBhcmVudHNQb3M9W107XHJcbiAgICAgICAgdmFyIHBhcmVudFBvcz1udWxsO1xyXG4gICAgICAgIHdoaWxlIChzZWxlY3RlZFBhcmVudHNQb3MubGVuZ3RoPDQpe1xyXG4gICAgICAgICAgICBwYXJlbnRQb3M9TWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKnBvcC5nZXRTaXplKCkpO1xyXG4gICAgICAgICAgICBpZiAoc2VsZWN0ZWRQYXJlbnRzUG9zLmluZGV4T2YocGFyZW50UG9zKT09LTEpe1xyXG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRQYXJlbnRzUG9zLnB1c2gocGFyZW50UG9zKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgZmlyc3RTZWxlY3RlZD1udWxsO1xyXG4gICAgICAgIHZhciBzZWNvbmRTZWxlY3RlZD1udWxsO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmIChwb3AuZ2V0SW5kaXZpZHVhbChzZWxlY3RlZFBhcmVudHNQb3NbMF0pLmdldEZpdG5lc3MoKT5wb3AuZ2V0SW5kaXZpZHVhbChzZWxlY3RlZFBhcmVudHNQb3NbMV0pLmdldEZpdG5lc3MoKSl7XHJcbiAgICAgICAgXHRmaXJzdFNlbGVjdGVkID0gcG9wLmdldEluZGl2aWR1YWwoc2VsZWN0ZWRQYXJlbnRzUG9zWzBdKS5jbG9uZSgpO1xyXG4gICAgICAgIH0gZWxzZSB7IFx0XHJcbiAgICAgICAgXHRmaXJzdFNlbGVjdGVkID0gIHBvcC5nZXRJbmRpdmlkdWFsKHNlbGVjdGVkUGFyZW50c1Bvc1sxXSkuY2xvbmUoKTtcclxuICAgICAgICB9ICAgICAgICAgXHJcblx0XHJcbiAgICAgICAgaWYgKHBvcC5nZXRJbmRpdmlkdWFsKHNlbGVjdGVkUGFyZW50c1Bvc1syXSkuZ2V0Rml0bmVzcygpPnBvcC5nZXRJbmRpdmlkdWFsKHNlbGVjdGVkUGFyZW50c1Bvc1szXSkuZ2V0Rml0bmVzcygpKXtcclxuICAgICAgICBcdHNlY29uZFNlbGVjdGVkID0gcG9wLmdldEluZGl2aWR1YWwoc2VsZWN0ZWRQYXJlbnRzUG9zWzJdKS5jbG9uZSgpO1xyXG4gICAgICAgIH0gZWxzZSB7IFx0XHJcbiAgICAgICAgXHRzZWNvbmRTZWxlY3RlZCA9ICBwb3AuZ2V0SW5kaXZpZHVhbChzZWxlY3RlZFBhcmVudHNQb3NbM10pLmNsb25lKCk7XHJcbiAgICAgICAgfSAgICAgICAgICAgIFxyXG4gICAgICAgIHJldHVybiBbZmlyc3RTZWxlY3RlZCxzZWNvbmRTZWxlY3RlZF07XHJcbiAgICAgICAgXHJcbiAgICB9ICAgIFxyXG4gICAgXHJcbiAgICBjcm9zcyhpbmRpdjEsIGluZGl2MiwgcHJvYkNyb3NzKXtcclxuXHQgICAgICB2YXIgc29uID0gbmV3IENvbW1vbi5FbGVtZW50cy5JbmRpdmlkdWFsKCk7XHJcblx0ICAgICAgdmFyIGNocm8gPSBpbmRpdjEuZ2V0Q2hyb21vc29tZSgpLmNyb3NzKGluZGl2Mi5nZXRDaHJvbW9zb21lKCkscHJvYkNyb3NzKTtcclxuXHQgICAgICBzb24uc2V0Q2hyb21vc29tZShjaHJvKTtcclxuXHQgICAgICBcclxuXHQgICBpZiAoc29uLmdldENocm9tb3NvbWUoKS5nZXRTaXplKCk9PTApe1xyXG5cdCAgICAgICBjb25zb2xlLmxvZyhcImluZGl2MSBcIitKU09OLnN0cmluZ2lmeShpbmRpdjEpKTsgICAgIFxyXG5cdCAgICAgICBjb25zb2xlLmxvZyhcImluZGl2MiBcIitKU09OLnN0cmluZ2lmeShpbmRpdjIpKTsgICAgICAgICAgICAgICAgXHJcblx0ICAgICAgIHRocm93IFwiRVJST1Igbm8gZGViZXLDrWEgc2VyIGNlcm9cIiAvL1RPRE9cclxuXHQgICB9IFxyXG5cdCAgIFxyXG5cdFx0cmV0dXJuIHNvbjsgICAgXHRcclxuICAgIFx0XHJcbiAgICB9XHJcbiAgICBcclxuICAgIG11dGF0ZShpbmRpdiwgcHJvYk11dCl7XHJcbiAgICAgICAgdmFyIG15TWV0aG9kPVwibXV0YXRlKGluZGl2LCBwcm9iTXV0KVwiO1xyXG4gICAgICAgIE91dHB1dC5zaG93SW5mbyhvdXRwdXRQcmlvcml0eSxteUNsYXNzLG15TWV0aG9kLFwiVkFNT1MgQSBNVVRBUiBNRVRIT0RTREVGQVVMVCBwcm9iTXV0PVwiK3Byb2JNdXQpO1xyXG4gICAgICAgIGluZGl2LmdldENocm9tb3NvbWUoKS5tdXRhdGUocHJvYk11dCk7ICAgXHJcbiAgICAgICAgaWYgKGluZGl2LmdldENocm9tb3NvbWUoKS5nZXRTaXplKCk9PTApIHRocm93IFwiRVJST1Igbm8gZGViZXLDrWEgc2VyIGNlcm9cIiAvL1RPRE8gICAgICAgIFxyXG4gICAgXHRyZXR1cm4gaW5kaXY7ICAgIFx0XHJcbiAgICB9XHJcblxyXG4gICAgXHJcbiAgICByZXBsYWNlV29yc3Qoc29uKXtcclxuICAgICAgICB2YXIgcG9zID0gdGhpcy5wb3B1bGF0aW9uLnJlcGxhY2VXb3JzdChzb24pOyBcclxuICAgICAgICBcclxuICAgICAgICBcclxuICAgICAgICBpZiAocG9zIT0tMSl7IC8vU2kgc2UgaGEgcHJvZHVjaWRvIGVsIHJlZW1wbGF6by5cclxuICAgICAgICAgICAgdGhpcy5wb3B1bGF0aW9uLmNvbXB1dGVTdGF0cygpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5wb3B1bGF0aW9uLmdldEJlc3RJbmRpdmlkdWFsKCkuZ2V0Rml0bmVzcygpPj10aGlzLnByb2JsZW0udGFyZ2V0Rml0bmVzcyl7IFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidGhpcy5wb3B1bGF0aW9uLmdldEJlc3RJbmRpdmlkdWFsKCkuZ2V0Rml0bmVzcygpPVwiK3RoaXMucG9wdWxhdGlvbi5nZXRCZXN0SW5kaXZpZHVhbCgpLmdldEZpdG5lc3MoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ0aGlzLnByb2JsZW0udGFyZ2V0Rml0bmVzcz1cIit0aGlzLnByb2JsZW0udGFyZ2V0Rml0bmVzcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zaG93U29sdXRpb25Gb3VuZCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc29sdXRpb25Gb3VuZD10cnVlO1xyXG4gICAgICAgICAgICB9ICAgICAgICAgICAgICAgIFxyXG4gICAgICAgIH0gXHJcbiAgICAgICAgdGhpcy5zdGVwKys7IFx0XHJcbiAgICAgICAgcmV0dXJuIHBvczsgLy9EZXZvbHZlbW9zIGxhIHBvc2ljacOzbiBkZSByZWVtcGxhem8uXHJcbiAgICB9XHJcblxyXG4gICAgc2hvd1NvbHV0aW9uRm91bmQoKXtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJTb2x1dGlvbiBGb3VuZCEgQWZ0ZXIgXCIpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyh0aGlzLnByb2JsZW0uZml0bmVzc0NvdW50ZXIpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIiBldmFsdWF0aW9uc1wiKTsgICAgXHRcdFxyXG4gICAgfVxyXG5cclxuICAgIHNob3dTb2x1dGlvbigpe1xyXG4gICAgICAgIE91dHB1dC5zaG93TG9nKCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJGSU5OTk5OTk5OTk5OTk5OTk5OXCIpXHJcbiAgICAgICAgY29uc29sZS5sb2coXCIgIEZJVE5FU1M6IFwiK3RoaXMucG9wdWxhdGlvbi5nZXRCZXN0SW5kaXZpZHVhbCgpLmdldEZpdG5lc3MoKSk7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCIgQ0hST01PU09NRTogXCIrSlNPTi5zdHJpbmdpZnkodGhpcy5wb3B1bGF0aW9uLmdldEJlc3RJbmRpdmlkdWFsKCkpKTsgXHJcbiAgICAgICAgcmV0dXJuIHRoaXMucG9wdWxhdGlvbi5nZXRCZXN0SW5kaXZpZHVhbCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGhhc0ZpbmlzaGVkKCl7XHJcbiAgICAgICAgaWYgKHRoaXMuc29sdXRpb25Gb3VuZCB8fCB0aGlzLnN0ZXA+dGhpcy5tYXhTdGVwcyl7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidGhpcy5zb2x1dGlvbkZvdW5kPVwiK3RoaXMuc29sdXRpb25Gb3VuZCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidGhpcy5zdGVwPnRoaXMubWF4U3RlcHM9XCIrKHRoaXMuc3RlcD50aGlzLm1heFN0ZXBzKSlcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJ0aGlzLnN0ZXA9XCIrdGhpcy5zdGVwKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJ0aGlzLm1heFN0ZXBzPVwiK3RoaXMubWF4U3RlcHMpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfSAgICAgXHRcdFxyXG4gICAgfVxyXG5cdCAgICBcclxuICAgIGdldFBvcHVsYXRpb24gKCl7IC8vU29sbyBsbyB1dGlsaXphIE1vbml0b3JBbGdvcml0aG1cclxuXHRcdHJldHVybiB0aGlzLnBvcHVsYXRpb247ICBcdFxyXG4gICAgfSAgXHJcbiAgICBkb1JlcGxhY2VtZW50cyAocmVwbGFjZW1lbnRzKXtcclxuICAgIFx0dmFyIG15TWV0aG9kPVwiZG9SZXBsYWNlbWVudHMocmVwbGFjZW1lbnRzKVwiXHJcbiAgICBcdE91dHB1dC5zaG93SW5mbyhvdXRwdXRQcmlvcml0eSxteUNsYXNzLG15TWV0aG9kLFwiU1RFUCBcIit0aGlzLnN0ZXApOyAgXHJcbiAgICAgICAgZm9yICh2YXIgaT0wO2k8cmVwbGFjZW1lbnRzLmxlbmd0aDtpKyspe1xyXG4gICAgICAgICAgICB0aGlzLnBvcHVsYXRpb24ucmVwbGFjZShDb21tb24uRWxlbWVudHMuSW5kaXZpZHVhbC5mcm9tSlNPTihyZXBsYWNlbWVudHNbaV0uaW5kaXYpLCByZXBsYWNlbWVudHNbaV0ucG9zKTtcclxuICAgICAgICB9ICAgICAgXHRcdFx0XHJcbiAgICB9ICAgICAgIFxyXG4gICAgXHJcbiAgICBydW4gKCl7XHJcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJBYnN0cmFjdCBNZXRob2QuXCIpOyAgICBcdFxyXG4gICAgfSAgICBcclxuICAgIFxyXG5cdFxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEFsZ29yaXRobUFic3RyYWN0OyIsIlwidXNlIHN0cmljdFwiOyBcbnZhciBBbGdvcml0aG1DVlJQQWJzdHJhY3QgPXJlcXVpcmUgKCcuL0FsZ29yaXRobUNWUlBBYnN0cmFjdCcpO1xuXG52YXIgbXlDbGFzcz1cIkFsZ29yaXRobUNWUlBcIjtcbnZhciBvdXRwdXRQcmlvcml0eT01NTU7XG5cblxuY2xhc3MgQWxnb3JpdGhtQ1ZSUCAgZXh0ZW5kcyBBbGdvcml0aG1DVlJQQWJzdHJhY3R7XHRcbiAgICBjb25zdHJ1Y3Rvcihwcm9ibGVtLCBwcm9iQ3Jvc3MsIHByb2JNdXQsIHByb2JMUywgbWF4U3RlcHMpIHtcbiAgICBcdHN1cGVyKHByb2JsZW0sIHByb2JDcm9zcywgcHJvYk11dCwgcHJvYkxTLCBtYXhTdGVwcyk7XG4gICAgfVxuICAgIGluaXRpYWxpemUocG9wU2l6ZSwgY2hyb21MZW5ndGgpe1xuXG4gICAgICAgIHRoaXMucG9wdWxhdGlvbiA9IG5ldyBDb21tb24uRWxlbWVudHMuUG9wdWxhdGlvbigpOyAgIFxuICAgICAgICB0aGlzLnBvcHVsYXRpb24uaW5pdGlhbGl6ZShwb3BTaXplLCBjaHJvbUxlbmd0aCk7ICAgICAgICAgICBcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucG9wdWxhdGlvbi5nZXRTaXplKCk7IGkrKyl7XG5cdFx0XHRcdHRoaXMucHJvYmxlbS5ldmFsdWF0ZVN0ZXAodGhpcy5wb3B1bGF0aW9uLmdldEluZGl2aWR1YWwoaSkpO1xuXHRcdH1cblx0XHR0aGlzLnBvcHVsYXRpb24uY29tcHV0ZVN0YXRzKCk7ICAgIFx0XG4gICAgfVxuICAgIHJ1bigpe1xuICAgICAgICB2YXIgYXJyYXlQYXJlbnRzPXRoaXMuc2VsZWN0VG91cm5hbWVudDIodGhpcy5wb3B1bGF0aW9uKTtcblxuICAgICAgICB2YXIgc29uID0gdGhpcy5jcm9zcyhhcnJheVBhcmVudHNbMF0sYXJyYXlQYXJlbnRzWzFdLHRoaXMucHJvYkNyb3NzKTsgICBcblxuICAgICAgICBzb24gPSB0aGlzLm11dGF0ZShzb24sdGhpcy5wcm9iTXV0KTtcblxuICAgICAgICB0aGlzLnByb2JsZW0uZXZhbHVhdGVTdGVwKHNvbik7XG4gICAgICAgIFxuICAgICAgICB2YXIgYmVzdExTID0gdGhpcy5sb2NhbFNlYXJjaCh0aGlzLnByb2JMUyxzb24sdGhpcy5wb3B1bGF0aW9uLHRoaXMucHJvYmxlbSk7XG4gICAgICAgIGlmIChiZXN0TFMuZ2V0Rml0bmVzcygpPnNvbi5nZXRGaXRuZXNzKCkpe1xuICAgICAgICAgICAgc29uPWJlc3RMUztcbiAgICAgICAgfVxuXHRcbiAgICAgICAgcmV0dXJuIHNvbjsgICAgICAgIFxuICAgIH1cbiAgICBydW5DYWxsYmFjayhjYWxsYmFjayl7XG4gICAgICAgIHZhciBhcnJheVBhcmVudHM9bnVsbDtcbiAgICAgICAgc2V0SW1tZWRpYXRlKCAgICAoKT0+e1xuICAgICAgICAgICAgYXJyYXlQYXJlbnRzPXRoaXMuc2VsZWN0VG91cm5hbWVudDIodGhpcy5wb3B1bGF0aW9uKTtcbiAgICAgICAgfSk7IFxuICAgICAgICBcbiAgICAgICAgdmFyIHNvbj1udWxsO1xuICAgICAgICBzZXRJbW1lZGlhdGUoICAgICgpPT57XG4gICAgICAgICAgICBzb24gPSB0aGlzLmNyb3NzKGFycmF5UGFyZW50c1swXSxhcnJheVBhcmVudHNbMV0sdGhpcy5wcm9iQ3Jvc3MpOyAgICAgICAgICBcbiAgICAgICAgfSk7IFxuXG4gICAgICAgIHNldEltbWVkaWF0ZSggICAgKCk9PnsgICAgICAgIFxuICAgICAgICAgICAgc29uID0gdGhpcy5tdXRhdGUoc29uLHRoaXMucHJvYk11dCk7ICAgICAgICAgIFxuICAgICAgICB9KTsgICAgICAgICBcblxuICAgICAgICBzZXRJbW1lZGlhdGUoICAgICgpPT57ICBcbiAgICAgICAgICAgIHRoaXMucHJvYmxlbS5ldmFsdWF0ZVN0ZXAoc29uKTsgICAgICAgICAgXG4gICAgICAgIH0pOyAgICAgICAgIFxuXG4gICAgICAgIHNldEltbWVkaWF0ZSggICAgKCk9PnsgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgYmVzdExTID0gdGhpcy5sb2NhbFNlYXJjaCh0aGlzLnByb2JMUyxzb24sdGhpcy5wb3B1bGF0aW9uLHRoaXMucHJvYmxlbSk7XG4gICAgICAgICAgICBpZiAoYmVzdExTLmdldEZpdG5lc3MoKT5zb24uZ2V0Rml0bmVzcygpKXtcbiAgICAgICAgICAgICAgICBzb249YmVzdExTO1xuICAgICAgICAgICAgfSAgICAgICAgXG4gICAgICAgICAgICBjYWxsYmFjayhzb24pOyAgICAgICAgICAgICBcbiAgICAgICAgfSk7ICAgICAgICAgICAgICBcbiAgICB9ICAgXG5cdFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEFsZ29yaXRobUNWUlA7IiwiXCJ1c2Ugc3RyaWN0XCI7IFxyXG52YXIgQWxnb3JpdGhtQWJzdHJhY3QgPXJlcXVpcmUgKCcuL0FsZ29yaXRobUFic3RyYWN0Jyk7XHJcblxyXG5jbGFzcyBBbGdvcml0aG1DVlJQQWJzdHJhY3QgIGV4dGVuZHMgQWxnb3JpdGhtQWJzdHJhY3R7XHRcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcihwcm9ibGVtLCBwcm9iQ3Jvc3MsIHByb2JNdXQsIHByb2JMUywgbWF4U3RlcHMpIHtcclxuICAgIFx0c3VwZXIocHJvYmxlbSwgcHJvYkNyb3NzLCBwcm9iTXV0LCBtYXhTdGVwcyk7XHRcclxuICAgICAgICB0aGlzLnByb2JMUz1wcm9iTFM7ICAgICAgICAgIFx0XHJcbiAgICB9XHRcclxuXHRcclxuICAgIGxvY2FsU2VhcmNoKHByb2JMUyxpbmRpdixwb3AscHJvYmxlbSl7XHJcbiAgICAgICAgdmFyIGJlc3RTb2wgPSBpbmRpdjtcclxuICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGluZGl2LmdldEZpdG5lc3MoKT09MCl7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShiZXN0U29sKSlcclxuICAgICAgICAgICAgICAgIHRocm93IFwiRVJST1IgZWwgZml0bmVzcyBubyBlc3TDoSBkZWZpbmlkbyBhbCBlbXBlemFyXCJcclxuICAgICAgICAgICAgfSAgICAgICBcclxuICAgICAgICBcclxuICAgICAgICB2YXIgdGVtcFNvbD1udWxsXHJcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPGluZGl2LmdldENocm9tb3NvbWUoKS5nZXRTaXplKCk7aSsrKXtcclxuICAgICAgICAgICAgaWYgKE1hdGgucmFuZG9tKCk8cHJvYkxTKXtcclxuICAgICAgICAgICAgICAgIHRlbXBTb2w9IHRoaXMub3B0XzIoaW5kaXYsaSxwcm9ibGVtKTtcclxuICAgICAgICAgICAgaWYgKHRlbXBTb2wuZ2V0Rml0bmVzcygpPT0wKXtcclxuICAgICAgICAgICAgICAgIHRocm93IFwiRVJST1IgZWwgZml0bmVzcyBubyBlc3TDoSBkZWZpbmlkbyBvcHRfMlwiXHJcbiAgICAgICAgICAgIH0gICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmICh0ZW1wU29sLmdldEZpdG5lc3MoKT5iZXN0U29sLmdldEZpdG5lc3MoKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgYmVzdFNvbD10ZW1wU29sO1xyXG4gICAgICAgICAgICAgICAgfSBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBmb3IgKHZhciBpPTA7aTxwb3AuZ2V0U2l6ZSgpO2krKyl7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGo9aSsxO2o8cG9wLmdldFNpemUoKTtqKyspe1xyXG4gICAgICAgICAgICAgICAgaWYgKE1hdGgucmFuZG9tKCk8cHJvYkxTKXtcclxuICAgICAgICAgICAgICAgICAgICB0ZW1wU29sPXRoaXMuaW50ZXJjaGFuZ2VfMShwb3AuZ2V0SW5kaXZpZHVhbChpKSxwb3AuZ2V0SW5kaXZpZHVhbChqKSxwcm9ibGVtKTtcclxuICAgICAgICAgICAgaWYgKHRlbXBTb2wuZ2V0Rml0bmVzcygpPT0wKXtcclxuICAgICAgICAgICAgICAgIHRocm93IFwiRVJST1IgZWwgZml0bmVzcyBubyBlc3TDoSBkZWZpbmlkbyBpbnRlcmNoYW5nZV8xXCJcclxuICAgICAgICAgICAgfSAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0ZW1wU29sLmdldEZpdG5lc3MoKT5iZXN0U29sLmdldEZpdG5lc3MoKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJlc3RTb2w9dGVtcFNvbDtcclxuICAgICAgICAgICAgICAgICAgICB9ICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIH0gICAgICAgICAgXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgICAgIGlmIChiZXN0U29sLmdldEZpdG5lc3MoKT09MCl7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShiZXN0U29sKSlcclxuICAgICAgICAgICAgICAgIHRocm93IFwiRVJST1IgZWwgZml0bmVzcyBubyBlc3TDoSBkZWZpbmlkbyBcIlxyXG4gICAgICAgICAgICB9ICAgIFxyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiBiZXN0U29sOyAgICBcdFxyXG4gICAgfVxyXG4gICAgXHJcbiAgICBcclxuICAgIFxyXG4gICAgXHJcbiAgICBcclxuICAgIGludGVyY2hhbmdlXzEoaW5kaXYxLCBpbmRpdjIscHJvYmxlbSl7XHJcbiAgICAgICAgdmFyIGNvcHkxID0gaW5kaXYxLmNsb25lKCk7XHJcbiAgICAgICAgdmFyIGNvcHkyID0gaW5kaXYyLmNsb25lKCk7XHJcbiAgICAgICBcclxuICAgICAgICBpZiAoYXJlUmVwZWF0ZWROdW1iZXJzKGNvcHkxKSl7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUkVQRUFURUQgTlVNQkVSUyBcIitKU09OLnN0cmluZ2lmeShjb3B5MSkpO1xyXG4gICAgICAgICAgICB0aHJvdyAoXCJSRVBFQVRFRCBOVU1CRVJTXCIpO1xyXG4gICAgICAgIH0gICBcclxuICAgICAgICBpZiAoYXJlUmVwZWF0ZWROdW1iZXJzKGNvcHkyKSl7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUkVQRUFURUQgTlVNQkVSUyBcIitKU09OLnN0cmluZ2lmeShjb3B5MikpO1xyXG4gICAgICAgICAgICB0aHJvdyAoXCJSRVBFQVRFRCBOVU1CRVJTXCIpO1xyXG4gICAgICAgIH0gICAgIFxyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBwb3MxID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKmNvcHkxLmdldENocm9tb3NvbWUoKS5nZXRTaXplKCkpO1xyXG4gICAgICAgIHZhciBwb3MyID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKmNvcHkyLmdldENocm9tb3NvbWUoKS5nZXRTaXplKCkpO1xyXG5cclxuICAgICAgICB2YXIgYWxsZWxlMSA9IGNvcHkxLmdldENocm9tb3NvbWUoKS5nZXRBbGxlbGUocG9zMSk7XHJcbiAgIFxyXG4gICAgICAgIHZhciBhbGxlbGUyID0gY29weTIuZ2V0Q2hyb21vc29tZSgpLmdldEFsbGVsZShwb3MyKTtcclxuICAgXHJcbiAgICAgICAgXHJcbiAgICAgICAgXHJcbiAgICAgICAgXHJcbiAgICAgICAgLy9Db3BpYW1vcyBhbGVsbyAxIGVuIGluZGl2aWR1byAyXHJcbiAgICAgICAgdmFyIHRlbXBQb3MgPSBjb3B5Mi5nZXRDaHJvbW9zb21lKCkuZmluZEFsbGVsZVBvcyhhbGxlbGUxKTtcclxuXHJcbiAgICAgICAgY29weTIuZ2V0Q2hyb21vc29tZSgpLnNldEFsbGVsZShwb3MyLGFsbGVsZTEpO1xyXG5cclxuICAgICAgICBjb3B5Mi5nZXRDaHJvbW9zb21lKCkuc2V0QWxsZWxlKHRlbXBQb3MsYWxsZWxlMik7IC8vQ29waWFtb3MgZWwgc3VzdGl0dWlkbyBwb3IgbGEgcG9zaWNpw7NuIGRvbmRlIGVzdGFiYSBlbCBxdWUgc2UgaGEgY29waWFkbyBlbiBlc2UgbWlzbW8gY3JvbW9zb21hLlxyXG5cclxuICAgICAgICAgXHJcbiAgICAgICAgLy9Db3BpYW1vcyBhbGVsbyAyIGVuIGluZGl2aWR1byAxXHJcbiAgICAgICAgdGVtcFBvcyA9IGNvcHkxLmdldENocm9tb3NvbWUoKS5maW5kQWxsZWxlUG9zKGFsbGVsZTIpO1xyXG5cclxuICAgICAgICBjb3B5MS5nZXRDaHJvbW9zb21lKCkuc2V0QWxsZWxlKHBvczEsYWxsZWxlMik7XHJcblxyXG4gICAgICAgIGNvcHkxLmdldENocm9tb3NvbWUoKS5zZXRBbGxlbGUodGVtcFBvcyxhbGxlbGUxKTtcclxuXHJcblxyXG4gICAgICAgIHByb2JsZW0uZXZhbHVhdGVTdGVwKGNvcHkxKTtcclxuICBcclxuICAgICAgICBwcm9ibGVtLmV2YWx1YXRlU3RlcChjb3B5Mik7XHJcblxyXG5cclxuICAgICAgICBpZiAoYXJlUmVwZWF0ZWROdW1iZXJzKGNvcHkxKSl7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUkVQRUFURUQgTlVNQkVSUyBcIitKU09OLnN0cmluZ2lmeShjb3B5MSkpO1xyXG4gICAgICAgICAgICB0aHJvdyAoXCJSRVBFQVRFRCBOVU1CRVJTXCIpO1xyXG4gICAgICAgIH0gICBcclxuICAgICAgICBpZiAoYXJlUmVwZWF0ZWROdW1iZXJzKGNvcHkyKSl7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUkVQRUFURUQgTlVNQkVSUyBcIitKU09OLnN0cmluZ2lmeShjb3B5MikpO1xyXG4gICAgICAgICAgICB0aHJvdyAoXCJSRVBFQVRFRCBOVU1CRVJTXCIpO1xyXG4gICAgICAgIH0gIFxyXG4gICAgICAgIFxyXG4gICAgICAgIFxyXG4gICAgICAgIGlmIChjb3B5MS5nZXRGaXRuZXNzKCk+PWNvcHkyLmdldEZpdG5lc3MoKSl7XHJcbiAgICAgICAgICAgIHJldHVybiBjb3B5MTtcclxuICAgICAgICB9IGVsc2UgeyAgICAgXHJcbiAgICAgICAgICAgIHJldHVybiBjb3B5MjtcclxuICAgICAgICB9ICAgIFx0XHRcclxuICAgIH1cclxuICAgIFxyXG4gICAgXHJcbiAgICBvcHRfMihpbmRpdixlamUxXzEscHJvYmxlbSl7XHJcbiAgICAgICAgdmFyIGNvcHk9aW5kaXYuY2xvbmUoKTtcclxuICAgICAgaWYgKGFyZVJlcGVhdGVkTnVtYmVycyhjb3B5KSl7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIlJFUEVBVEVEIE5VTUJFUlMgXCIrSlNPTi5zdHJpbmdpZnkoY29weSkpO1xyXG4gICAgICAgICAgdGhyb3cgKFwiUkVQRUFURUQgTlVNQkVSU1wiKTtcclxuICAgICAgfSAgICBcclxuXHJcbiAgICAgIHZhciBlamUyXzEgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqY29weS5nZXRDaHJvbW9zb21lKCkuZ2V0U2l6ZSgpKTtcclxuICAgICAgXHJcbiAgICAgIC8vU2Ugb3JkZW5hIGRlIG1lbm9yIGEgbWF5b3IgbG9zIGVqZXMuXHJcbiAgICAgIGlmIChlamUxXzE+ZWplMl8xKXtcclxuICAgICAgICAgIHZhciB0ZW1wID0gZWplMV8xO1xyXG4gICAgICAgICAgZWplMV8xPWVqZTJfMTtcclxuICAgICAgICAgIGVqZTJfMT10ZW1wO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICB2YXIgZWplMV8yID0gZWplMV8xKzE7XHJcbiAgICAgIGlmIChlamUxXzI+PWNvcHkuZ2V0Q2hyb21vc29tZSgpLmdldFNpemUoKSllamUxXzI9MDsgXHJcbiAgICAgIFxyXG4gICAgICB2YXIgZWplMl8yID0gZWplMl8xKzE7XHJcbiAgICAgIGlmIChlamUyXzI+PWNvcHkuZ2V0Q2hyb21vc29tZSgpLmdldFNpemUoKSkgZWplMl8yPTA7ICAgXHJcblxyXG4gICAgICBjb3B5LmdldENocm9tb3NvbWUoKS5yZXZlcnNlU3ViR3JvdXAoZWplMV8yLCBlamUyXzEpOyBcclxuICAgICAgXHJcbiAgICAgIHByb2JsZW0uZXZhbHVhdGVTdGVwKGNvcHkpO1xyXG4gXHJcbiAgICAgIGlmIChhcmVSZXBlYXRlZE51bWJlcnMoY29weSkpe1xyXG4gICAgICAgICAgY29uc29sZS5sb2coXCJSRVBFQVRFRCBOVU1CRVJTIFwiK0pTT04uc3RyaW5naWZ5KGNvcHkpKTtcclxuICAgICAgICAgIHRocm93IChcIlJFUEVBVEVEIE5VTUJFUlNcIik7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuICBjb3B5OyAgICBcdFxyXG4gICAgfVxyXG4gICAgICAgIFxyXG4gICAgXHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBhcmVSZXBlYXRlZE51bWJlcnMoaW5kaXYpe1xyXG4gICAgdmFyIGFsbGVsZXNTZWFyY2ggPSBpbmRpdi5nZXRDaHJvbW9zb21lKCkuYWxsZWxlcztcclxuICAgIHZhciBhbGxlbGVzPWFsbGVsZXNTZWFyY2guc2xpY2UoMCk7XHJcbiAgICB2YXIgcmVwZWF0cyA9MDtcclxuICAgIHZhciBpbmRleDtcclxuICAgIGZvciAodmFyIGk9MDtpPGFsbGVsZXNTZWFyY2gubGVuZ3RoO2krKyl7XHJcbiAgICAgICAgcmVwZWF0cz0wO1xyXG4gICAgICAgIGluZGV4PWFsbGVsZXMuaW5kZXhPZihpKTtcclxuICAgICAgIFxyXG4gICAgICAgIHdoaWxlIChpbmRleD4tMSl7XHJcbiAgICAgICAgICAgIHJlcGVhdHMrKztcclxuICAgICAgICAgICAgYWxsZWxlcy5zcGxpY2UoaW5kZXgsMSk7XHJcblxyXG4gICAgICAgICAgICBpZiAocmVwZWF0cz4xKXtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGluZGV4PWFsbGVsZXMuaW5kZXhPZihpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBbGdvcml0aG1DVlJQQWJzdHJhY3Q7IiwiXCJ1c2Ugc3RyaWN0XCI7IFxudmFyIEFsZ29yaXRobUFic3RyYWN0ID1yZXF1aXJlICgnLi9BbGdvcml0aG1BYnN0cmFjdCcpO1xuXG52YXIgbXlDbGFzcz1cIkFsZ29yaXRobU9uZU1heFwiO1xudmFyIG91dHB1dFByaW9yaXR5PTU1NTtcblxuY2xhc3MgQWxnb3JpdGhtT25lTWF4ICBleHRlbmRzIEFsZ29yaXRobUFic3RyYWN0e1x0XG4gICAgY29uc3RydWN0b3IocHJvYmxlbSwgcHJvYkNyb3NzLCBwcm9iTXV0LCBtYXhTdGVwcykge1xuICAgIFx0c3VwZXIocHJvYmxlbSwgcHJvYkNyb3NzLCBwcm9iTXV0LCBtYXhTdGVwcyk7XHRcbiAgICB9XG5cbiAgICAgIGluaXRpYWxpemUocG9wU2l6ZSwgY2hyb21MZW5ndGgpeyAgICBcdFx0XG4gICAgICAgIHRoaXMucG9wdWxhdGlvbiA9IG5ldyBDb21tb24uRWxlbWVudHMuUG9wdWxhdGlvbigpOyAgIFxuICAgICAgICB0aGlzLnBvcHVsYXRpb24uaW5pdGlhbGl6ZShwb3BTaXplLCBjaHJvbUxlbmd0aCk7ICAgICAgICBcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucG9wdWxhdGlvbi5nZXRTaXplKCk7IGkrKyl7XG5cdFx0XHRcdHRoaXMucHJvYmxlbS5ldmFsdWF0ZVN0ZXAodGhpcy5wb3B1bGF0aW9uLmdldEluZGl2aWR1YWwoaSkpO1xuXHRcdH1cblx0XHR0aGlzLnBvcHVsYXRpb24uY29tcHV0ZVN0YXRzKCk7ICAgIFx0XG4gICAgfVx0XG5cdFx0XG4gICAgcnVuKCl7XG4gICAgICAgIHZhciBteU1ldGhvZD1cInJ1bigpXCI7XG4gICAgICAgIFxuICAgICAgICBPdXRwdXQuc2hvd0luZm8ob3V0cHV0UHJpb3JpdHksbXlDbGFzcyxteU1ldGhvZCxcIlNURVAgXCIrdGhpcy5zdGVwKTsgIFxuICAgICAgICAvL1NFTEVDVCBUT1VSTkFNRU5UXG4gICAgICAgIHZhciBjcm8xID0gdGhpcy5zZWxlY3RUb3VybmFtZW50KHRoaXMucG9wdWxhdGlvbik7ICAgIFxuICAgICAgICB2YXIgY3JvMiA9IHRoaXMuc2VsZWN0VG91cm5hbWVudCh0aGlzLnBvcHVsYXRpb24pO1xuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBpZiAoY3JvMS5nZXRGaXRuZXNzKCk9PTAgfHwgY3JvMi5nZXRGaXRuZXNzKCk9PTApe1xuICAgICAgICAgICAgdGhyb3cgXCJFUlJPUiBlbCBmaXRuZXNzIG5vIGVzdMOhIGRlZmluaWRvXCJcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgd2hpbGUgKGNybzE9PWNybzIpeyAvL1NJIFNPTiBJR1VBTEVTIFNFIFNFTEVDQ0lPTkEgT1RST1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJJR1VBTEVTXCIpXG4gICAgICAgICAgICBjcm8yID0gdGhpcy5zZWxlY3RUb3VybmFtZW50KHRoaXMucG9wdWxhdGlvbik7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc29uID0gdGhpcy5jcm9zcyhjcm8xLGNybzIsdGhpcy5wcm9iQ3Jvc3MpO1xuXG4gICAgICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIHNvbiA9IHRoaXMubXV0YXRlKHNvbix0aGlzLnByb2JNdXQpO1xuXG4gICAgICAgIHRoaXMucHJvYmxlbS5ldmFsdWF0ZVN0ZXAoc29uKTtcbiAgIFxuICAgICAgICByZXR1cm4gc29uOyAgICAgICAgXG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gQWxnb3JpdGhtT25lTWF4OyIsIlwidXNlIHN0cmljdFwiOyBcbmNsYXNzIENocm9tb3NvbWUgIHtcdFxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLmFsbGVsZXMgPSBbXTtcbiAgICB9XG4gICAgZ2V0QWxsZWxlKGluZGV4KSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFsbGVsZXNbaW5kZXhdO1xuICAgIH0gICAgIFxuICAgIHNldEFsbGVsZShpbmRleCwgdmFsdWUpIHtcbiAgICAgICAgdGhpcy5hbGxlbGVzW2luZGV4XT12YWx1ZTtcbiAgICB9ICAgICAgICAgXG4gICAgZ2V0U2l6ZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWxsZWxlcy5sZW5ndGg7IFxuICAgIH0gICBcbiAgICB0b1N0cmluZygpe1xuICAgIFx0cmV0dXJuIEpTT04uc3RyaW5naWZ5KHRoaXMpO1xuICAgIH1cbiAgICBpbml0aWFsaXplKHNpemUpIHtcbiAgICBcdHRocm93IG5ldyBFcnJvcihcIkFic3RyYWN0IE1ldGhvZC5cIik7XG4gICAgfSAgICAgXG4gICAgY3Jvc3MoY2hybzIscHJvYkNyb3NzKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBYnN0cmFjdCBNZXRob2QuXCIpO1xuICAgIH0gICBcbiAgICBtdXRhdGUocHJvYk11dCl7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBYnN0cmFjdCBNZXRob2QuXCIpOyAgICBcdFxuICAgIH0gIFxuICAgIGNsb25lKCkge1xuXG4vLyAgICBcdHZhciBjb3B5ID0gT2JqZWN0LmNyZWF0ZSh0aGlzKTsgLy8tPiBNVVkgUE9DTyBFRklDSUVOVEUgQVPDjSBRVUUgTUVKT1IgVVRJTElaQVIgbmV3XG4vLyAgICBcdGNvcHkuYWxsZWxlcz10aGlzLmFsbGVsZXMuc2xpY2UoMCk7ICAgICAgIFxuLy8gICAgXHRyZXR1cm4gY29weVxuXHRcdHRocm93IG5ldyBFcnJvcihcIkFic3RyYWN0IE1ldGhvZC5cIik7ICBcbiAgfSAgXHRcbiAgICBcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDaHJvbW9zb21lOyIsIlwidXNlIHN0cmljdFwiOyBcbnZhciBDaHJvbW9zb21lQWJzdHJhY3QgPXJlcXVpcmUgKCcuL0Nocm9tb3NvbWVBYnN0cmFjdCcpXG5cbnZhciBteUNsYXNzPVwiQ2hyb21vc29tZUJpbmFyeVwiO1xudmFyIG91dHB1dFByaW9yaXR5PTEwMDtcblxuY2xhc3MgQ2hyb21vc29tZUJpbmFyeSAgZXh0ZW5kcyBDaHJvbW9zb21lQWJzdHJhY3R7XHRcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICBcdHN1cGVyKCk7XG4gICAgfVxuICAgIHN0YXRpYyBmcm9tSlNPTihjKSB7XG4gICAgICAgIHZhciBjaHJvPW5ldyBDaHJvbW9zb21lQmluYXJ5KCk7XG4gICAgICAgIGNocm8uYWxsZWxlcz1jLmFsbGVsZXM7XG4gICAgICAgIHJldHVybiBjaHJvO1xuICAgIH0gICAgICBcbiAgICBcbiAgICBjbG9uZSgpIHtcbiAgICBcdHZhciBjb3B5ID0gbmV3IENocm9tb3NvbWVCaW5hcnkoKTtcbiAgICBcdGNvcHkuYWxsZWxlcz10aGlzLmFsbGVsZXMuc2xpY2UoMCk7ICAgICAgICAvL0NMT05FXG4gICAgXHRyZXR1cm4gY29weVxuICAgIH0gICAgICBcbiAgICBpbml0aWFsaXplKHNpemUpIHtcbiAgICAgICAgZm9yICh2YXIgaT0wO2k8c2l6ZTtpKyspe1xuICAgICAgICAgICAgdGhpcy5hbGxlbGVzLnB1c2goTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMikpOyAgXG4gICAgICAgIH1cbiAgICB9ICAgICBcbiAgICBjcm9zcyhjaHJvMixwcm9iQ3Jvc3MpIHtcbiAgICAgICAgaWYgKE1hdGgucmFuZG9tKCk8cHJvYkNyb3NzKXsgICAgXG4gICAgICAgICAgICB2YXIgbXlNZXRob2Q9XCJjcm9zc1wiO1xuICAgICAgICAgICAgT3V0cHV0LnNob3dJbmZvKG91dHB1dFByaW9yaXR5LG15Q2xhc3MsbXlNZXRob2QsXCJDSFJPMSAtPiBcIitKU09OLnN0cmluZ2lmeSh0aGlzKSk7XG4gICAgICAgICAgICBPdXRwdXQuc2hvd0luZm8ob3V0cHV0UHJpb3JpdHksbXlDbGFzcyxteU1ldGhvZCxcIkNIUk8yIC0+IFwiK0pTT04uc3RyaW5naWZ5KGNocm8yKSk7ICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBzb24gPSBuZXcgQ2hyb21vc29tZUJpbmFyeSgpOyAgICAgICBcbiAgICAgICAgICAgIHZhciBjcm9zc1BvaW50ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKnRoaXMuYWxsZWxlcy5sZW5ndGgpO1xuICAgICAgICAgICAgT3V0cHV0LnNob3dJbmZvKG91dHB1dFByaW9yaXR5LG15Q2xhc3MsbXlNZXRob2QsXCJDUk9TU1BPSU5UIC0+IFwiK2Nyb3NzUG9pbnQpOyAgICAgICAgICAgICAgXG4gICAgICAgICAgICBmb3IgKHZhciBpPTA7aTxjcm9zc1BvaW50O2krKyl7XG4gICAgICAgICAgICAgICAgc29uLmFsbGVsZXMucHVzaCh0aGlzLmFsbGVsZXNbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yICh2YXIgaT1jcm9zc1BvaW50O2k8dGhpcy5hbGxlbGVzLmxlbmd0aDtpKyspe1xuICAgICAgICAgICAgICAgIHNvbi5hbGxlbGVzLnB1c2goY2hybzIuYWxsZWxlc1tpXSk7XG4gICAgICAgICAgICB9ICAgIFxuICAgICAgICAgICAgT3V0cHV0LnNob3dJbmZvKG91dHB1dFByaW9yaXR5LG15Q2xhc3MsbXlNZXRob2QsXCJTT04gLT4gXCIrSlNPTi5zdHJpbmdpZnkoc29uKSk7ICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBzb247ICBcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBPdXRwdXQuc2hvd0luZm8ob3V0cHV0UHJpb3JpdHksbXlDbGFzcyxteU1ldGhvZCxcIk5PIFNFIEhBQ0UgQ1JPU1NcIik7ICBcbiAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnJhbmRvbSgpPj0wLjU/dGhpcy5jbG9uZSgpOmNocm8yLmNsb25lKCk7XG4gICAgICAgIH1cbiAgICB9ICAgXG4gICAgbXV0YXRlKHByb2JNdXQpe1xuICAgICAgICBmb3IgKHZhciBpPTA7aTx0aGlzLmFsbGVsZXMubGVuZ3RoO2krKyl7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChNYXRoLnJhbmRvbSgpPHByb2JNdXQpeyAgICBcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hbGxlbGVzW2ldPT0wKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWxsZWxlc1tpXT0xOyAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hbGxlbGVzW2ldPTA7XG4gICAgICAgICAgICAgICAgfSAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0gICAgICAgICBcbiAgICAgICAgfSAgXHRcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ2hyb21vc29tZUJpbmFyeTsiLCJcInVzZSBzdHJpY3RcIlxuXG52YXIgQ2hyb21vc29tZUFic3RyYWN0ID1yZXF1aXJlICgnLi9DaHJvbW9zb21lQWJzdHJhY3QnKVxuXG52YXIgbXlDbGFzcz1cIkNocm9tb3NvbWVWUlBcIjtcbnZhciBvdXRwdXRQcmlvcml0eT0xMDA7XG5cblxuY2xhc3MgQ2hyb21vc29tZVZSUCAgZXh0ZW5kcyBDaHJvbW9zb21lQWJzdHJhY3R7XHRcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgIFx0c3VwZXIoKTtcbiAgICB9XG4gICAgc3RhdGljIGZyb21KU09OKGMpIHsgICAgIFxuICAgICAgICB2YXIgY2hyb21vc29tZUZpeGVkPW5ldyBDb21tb24uRWxlbWVudHMuQ2hyb21vc29tZSgpOyAgICBcbiAgICAgICAgZm9yICh2YXIgaT0wO2k8Yy5hbGxlbGVzLmxlbmd0aDtpKyspe1xuICAgICAgICAgICAgY2hyb21vc29tZUZpeGVkLmFsbGVsZXMucHVzaChjLmFsbGVsZXNbaV0pO1xuICAgICAgICB9ICAgIFxuICAgICAgICByZXR1cm4gY2hyb21vc29tZUZpeGVkO1xuICAgICAgICBcbiAgICB9ICAgICBcbiAgICBjbG9uZSgpIHtcbiAgICBcdHZhciBjb3B5ID0gbmV3IENocm9tb3NvbWVWUlAoKTtcbiAgICAgIFx0Y29weS5hbGxlbGVzPXRoaXMuYWxsZWxlcy5zbGljZSgwKTsgICAgICAgIC8vQ0xPTkVcbiAgICAgIFx0cmV0dXJuIGNvcHlcbiAgICB9ICAgICAgXG4gICAgXG4gICAgaW5pdGlhbGl6ZShzaXplKSB7ICAgICAgXG4gICAgXHRmb3IgKHZhciBpPTA7aTxzaXplO2krKyl7XG4gICAgXHRcdHRoaXMuYWxsZWxlcy5wdXNoKGkpOyAgICAgIFxuICAgIFx0fVxuICAgIFx0Q29tbW9uLkFycmF5cy5zaHVmZmxlQXJyYXkodGhpcy5hbGxlbGVzKTtcbiAgICB9ICAgICBcbiAgICBjcm9zcyhjaHJvMixwcm9iQ3Jvc3MpIHsgICAgICBcbiAgICAgICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgICAgICAvL09wZXJhZG9yIGRlIHJlY29tYmluYWNpw7NuIGRlIGVqZXMoRVJYKVxuICAgICAgICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLyBcbiAgICAgICAgaWYgKE1hdGgucmFuZG9tKCk8cHJvYkNyb3NzKXtcbiAgICAgICAgICAgIHZhciBheGlzTGlzdCA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIgaT0wO2k8dGhpcy5nZXRTaXplKCk7aSsrKXtcbiAgICAgICAgICAgICAgICB2YXIgYXhpcyA9IG5ldyBDb21tb24uRWxlbWVudHMuU2V0KCk7XG4gICAgICAgICAgICAgICAgZ2V0TmVpZ2hib3JzKHRoaXMsaSxheGlzKTsgICAgICAgXG4gICAgICAgICAgICAgICAgZ2V0TmVpZ2hib3JzKGNocm8yLGksYXhpcyk7ICAgIFxuICAgICAgICAgICAgICAgIGF4aXNMaXN0LnB1c2goYXhpcyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vQ29nZW1vcyBlbCBwcmltZXIgZ2VuIGRlIHVubyBkZSBsb3MgcGFkcmVzKGVsIHF1ZSB0ZW5nYSBtZW5vciBuw7ptZXJvIGRlIGVqZXMpLlxuICAgICAgICAgICAgdmFyIHNvbiA9IG5ldyBDaHJvbW9zb21lVlJQKCk7XG4gICAgICAgICAgICB2YXIgZmlyc3RQYXJlbnQxID0gdGhpcy5nZXRBbGxlbGUoMCk7XG4gICAgICAgICAgICB2YXIgZmlyc3RQYXJlbnQyID0gY2hybzIuZ2V0QWxsZWxlKDApOyBcbiAgICAgICAgICAgIHZhciBsYXN0QWRkZWQ9LTE7ICAgICAgXG4gICAgICAgICAgICBpZiAoYXhpc0xpc3RbZmlyc3RQYXJlbnQxXS5zaXplPD1heGlzTGlzdFtmaXJzdFBhcmVudDJdLnNpemUpe1xuICAgICAgICAgICAgICAgIHNvbi5hZGRBbGxlbGUoZmlyc3RQYXJlbnQxKTtcbiAgICAgICAgICAgICAgICBDb21tb24uQXJyYXlzLnJlbW92ZVZhbHVlRnJvbUFycmF5T2ZTRVRzKGZpcnN0UGFyZW50MSwgYXhpc0xpc3QpO1xuICAgICAgICAgICAgICAgIGxhc3RBZGRlZD1maXJzdFBhcmVudDE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNvbi5hZGRBbGxlbGUoZmlyc3RQYXJlbnQyKTtcbiAgICAgICAgICAgICAgICBDb21tb24uQXJyYXlzLnJlbW92ZVZhbHVlRnJvbUFycmF5T2ZTRVRzKGZpcnN0UGFyZW50MiwgYXhpc0xpc3QpO1xuICAgICAgICAgICAgICAgIGxhc3RBZGRlZD1maXJzdFBhcmVudDI7ICAgICAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy9MdWVnbyBzZSB2YSBhbCBlamUgZGUgbGEgw7psdGltYSBwb3NpY2nDs24gYcOxYWRpZGFcbiAgICAgICAgICAgIC8vU2UgcmVjb3JyZSBkaWNobyBlamUgeSBzZSBjb2dlbiBsb3MgdmFsb3JlcyBwYXJhIHZlciBxdWUgcG9zaWNpw7NuIHRpZW5lIG1lbm9zIGVqZXMuXG4gICAgICAgICAgICAvL1xuICBcbiAgICAgICAgICAgIGFiY2RlZihsYXN0QWRkZWQsIGF4aXNMaXN0LCBzb24pO1xuXG4gICAgICAgICAgICByZXR1cm4gc29uO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy9SZXR1cm4gY2hybzEgbyBjaHJvMiBlbiBjYXNvIGRlIHF1ZSBubyBoYXlhIGNydWNlLlxuICAgICAgICAgICByZXR1cm4gTWF0aC5yYW5kb20oKT49MC41P3RoaXMuY2xvbmUoKTpjaHJvMi5jbG9uZSgpO1xuICAgICAgICB9XG4gICAgfSAgIFxuICAgIG11dGF0ZShwcm9iTXV0KXtcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPHRoaXMuYWxsZWxlcy5sZW5ndGg7aSsrKXtcbiAgICAgICAgICAgIGlmIChNYXRoLnJhbmRvbSgpPHByb2JNdXQpe1xuICAgICAgICAgICAgICAgIHZhciByID0gTWF0aC5yYW5kb20oKTtcbiAgICAgICAgICAgICAgICBpZiAocjwwLjMzKXtcbiAgICAgICAgICAgICAgICAgICAgLy9JbnZlcnNpb24gTXV0YXRlIChwLHEsYXJyYXkpXG4gICAgICAgICAgICAgICAgICAgIENvbW1vbi5BcnJheXMucmV2ZXJzZVN1YmFycmF5KGksTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKnRoaXMuYWxsZWxlcy5sZW5ndGgpLHRoaXMuYWxsZWxlcyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyPjAuNjYpe1xuICAgICAgICAgICAgICAgICAgICAvL0luc2VydGlvbiBNdXRhdGUgKHAscSxhcnJheSlcbiAgICAgICAgICAgICAgICAgICAgQ29tbW9uLkFycmF5cy5tb3ZlRWxlbWVudE9mQXJyYXkoaSxNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqdGhpcy5hbGxlbGVzLmxlbmd0aCksdGhpcy5hbGxlbGVzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvL1NXQVAgTXV0YXRlIChwLHEsYXJyYXkpXG4gICAgICAgICAgICAgICAgICAgIENvbW1vbi5BcnJheXMuc3dhcEVsZW1lbnRzT2ZBcnJheShpLE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSp0aGlzLmFsbGVsZXMubGVuZ3RoKSx0aGlzLmFsbGVsZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gICAgICAgICAgICAgXG4gICAgICAgIH0gICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoaXM7IFx0XG4gICAgfVxuICAgIFxuICAgIHJldmVyc2VTdWJHcm91cCggaW5kZXgxLCBpbmRleDIgKXtcbiAgICAgICAgLy8rMSBwb3JxdWUgc2xpY2Ugbm8gaW5jbHV5ZSDDumx0aW1hIHBvc2ljacOzbiB5IHlvIGxhIG5lY2VzaXRvLlxuICAgICAgICB2YXIgc3ViYXJyYXk9dGhpcy5hbGxlbGVzLnNsaWNlKGluZGV4MSwgaW5kZXgyKzEpO1xuICAgICAgICBcbiAgICAgICAgc3ViYXJyYXkucmV2ZXJzZSgpO1xuXG4gICAgICAgIHRoaXMuYWxsZWxlcz1Db21tb24uQXJyYXlzLmluamVjdEFycmF5UmVtb3ZpbmcodGhpcy5hbGxlbGVzLGluZGV4MSxzdWJhcnJheSk7XG5cdFxuICAgIH1cbiAgICBhZGRBbGxlbGUoIHZhbHVlICl7XG4gICAgICAgIHJldHVybiB0aGlzLmFsbGVsZXMucHVzaCh2YWx1ZSk7ICAgIFx0XG4gICAgfVxuICAgIGZpbmRBbGxlbGVQb3MoIHZhbHVlICl7XG4gICAgICAgIHJldHVybiB0aGlzLmFsbGVsZXMuaW5kZXhPZih2YWx1ZSk7ICAgICBcdFxuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDaHJvbW9zb21lVlJQO1xuXG5cblxuZnVuY3Rpb24gYWJjZGVmKGxhc3RBZGRlZCwgYXhpc0xpc3QsIHNvbil7XG4gICAgd2hpbGUgKGF4aXNMaXN0W2xhc3RBZGRlZF0uc2l6ZT4wKXtcbiAgICAgICAgbGFzdEFkZGVkPWFkZFNtYWxsZXIobGFzdEFkZGVkLGF4aXNMaXN0KTtcbiAgICAgICAgQ29tbW9uLkFycmF5cy5yZW1vdmVWYWx1ZUZyb21BcnJheU9mU0VUcyhsYXN0QWRkZWQsIGF4aXNMaXN0KTtcbiAgICAgICAgc29uLmFkZEFsbGVsZShsYXN0QWRkZWQpOyBcbiAgICAgICAgYWJjZGVmKGxhc3RBZGRlZCwgYXhpc0xpc3QsIHNvbik7XG4gICAgfSBcbiAgICAgICAgcmV0dXJuO1xuIFxufVxuXG5cblxuZnVuY3Rpb24gYWRkU21hbGxlcihwb3NpdGlvbixheGlzTGlzdCl7XG4gICAgdmFyIHZhbHVlQm9ycmFyPW51bGxcbiAgICB2YXIgYXhpcyA9IGF4aXNMaXN0W3Bvc2l0aW9uXTtcbiAgICB2YXIgc21hbGxlcj0tMTtcbiAgICB0cnkge1xuICAgICAgICBheGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHsgICBcbiAgICAgICAgICAgIHZhbHVlQm9ycmFyPXZhbHVlO1xuICAgICAgICAgICAgaWYgKHNtYWxsZXI9PS0xKXsgICAgICAgICAgXG4gICAgICAgICAgICAgICAgc21hbGxlcj12YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZihheGlzTGlzdFt2YWx1ZV0uc2l6ZTxheGlzTGlzdFtzbWFsbGVyXS5zaXplKXsgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBzbWFsbGVyPXZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTsgICAgICAgICAgICBcbiAgICB9IGNhdGNoIChlKXtcblxuICAgICAgICBjb25zb2xlLmxvZyhlLnN0YWNrKTtcbiAgICAgICAgdGhyb3cgZTtcbiAgICB9ICAgIFxuIFxuICAgIHJldHVybiBzbWFsbGVyO1xufVxuXG5mdW5jdGlvbiBnZXROZWlnaGJvcnMoY2hybywgdmFsdWUsIGF4aXMpe1xuICAgIGZvciAodmFyIGk9MDtpPGNocm8uZ2V0U2l6ZSgpO2krKyl7XG4gICAgICAgIGlmIChjaHJvLmdldEFsbGVsZShpKT09dmFsdWUpe1xuICAgICAgICAgICAgYXhpcy5hZGQoZ2V0TmV4dChjaHJvLGkpKTsgXG4gICAgICAgICAgICBheGlzLmFkZChnZXRQcmV2aW91cyhjaHJvLGkpKTsgICAgICAgICAgICAgXG4gICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0TmV4dChjaHJvLCBpKXtcbiAgICBpZiAoKGkrMSk+PWNocm8uZ2V0U2l6ZSgpKXtcbiAgICAgICAgcmV0dXJuICBjaHJvLmdldEFsbGVsZSgwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gIGNocm8uZ2V0QWxsZWxlKGkrMSk7XG4gICAgfVxufVxuZnVuY3Rpb24gZ2V0UHJldmlvdXMoY2hybyxpKXtcbiAgICBpZiAoKGktMSk8MCl7XG4gICAgICAgIHJldHVybiAgY2hyby5nZXRBbGxlbGUoY2hyby5nZXRTaXplKCktMSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuICBjaHJvLmdldEFsbGVsZShpLTEpO1xuICAgIH1cbn1cblxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIGZpbmRFbGVtZW50UG9zaXRpb25JbkFycmF5OiBmdW5jdGlvbiAoZWxlbWVudCxhcnJheSkge1xuICAgIHJldHVybiBhcnJheS5pbmRleE9mKGVsZW1lbnQpOyBcbiAgfSxcbiAgLy9Db2xvY2FyIGRlIGZvcm1hIGFsZWF0b3JpYS4vL0JhcmFqYXJcbiAgc2h1ZmZsZUFycmF5OiBmdW5jdGlvbiAoYXJyYXkpIHtcbiAgICBmb3IgKHZhciBpID0gYXJyYXkubGVuZ3RoIC0gMTsgaSA+IDA7IGktLSkge1xuICAgICAgICB2YXIgaiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChpICsgMSkpO1xuICAgICAgICB2YXIgdGVtcCA9IGFycmF5W2ldO1xuICAgICAgICBhcnJheVtpXSA9IGFycmF5W2pdO1xuICAgICAgICBhcnJheVtqXSA9IHRlbXA7XG4gICAgfVxuICAgIHJldHVybiBhcnJheTtcbiAgfSxcbiAgaW5qZWN0QXJyYXk6IGZ1bmN0aW9uICggYXJyMSwgaWR4LCBhcnIyICkge1xuICAgIHJldHVybiBhcnIxLnNsaWNlKCAwLCBpZHggKS5jb25jYXQoIGFycjIgKS5jb25jYXQoIGFycjEuc2xpY2UoIGlkeCApICk7XG4gIH0sIFxuICBpbmplY3RBcnJheVJlbW92aW5nOiBmdW5jdGlvbiAoIGFycjEsIGlkeCwgYXJyMiApIHtcbiAgICByZXR1cm4gYXJyMS5zbGljZSggMCwgaWR4ICkuY29uY2F0KCBhcnIyICkuY29uY2F0KCBhcnIxLnNsaWNlKCBpZHgrYXJyMi5sZW5ndGggKSApO1xuICB9LFxuICBcbiAgLy9BTUJPUyBJTkNMVUlET1NcbiAgcmV2ZXJzZVN1YmFycmF5OiBmdW5jdGlvbiAocCwgcSwgYXJyYXkpeyBcbiAgICBpZiAocTxwKXtcbiAgICAgICAgdmFyIHRlbXAgPXE7XG4gICAgICAgIHE9cDtcbiAgICAgICAgcD10ZW1wO1xuICAgIH1cbiAgICB2YXIgc3ViYXJyYXk9YXJyYXkuc2xpY2UocCwgcSsxKTsgXG4gICAgc3ViYXJyYXkucmV2ZXJzZSgpO1xuICAgIGFycmF5PXRoaXMuaW5qZWN0QXJyYXlSZW1vdmluZyhhcnJheSxwLHN1YmFycmF5KTtcbiAgICByZXR1cm4gYXJyYXk7ICBcbiAgfSwgICAgXG4gIC8vTXVldmUgZWxlbWVudG8gZGUgYXJyYXkgZGUgcG9zaWNpw7NuIHAgYSBwb3NpY8OzbiBxXG4gIG1vdmVFbGVtZW50T2ZBcnJheTogZnVuY3Rpb24gKHAsIHEsIGFycmF5KXsgXG4gICAgdmFyIHZhbHVlID0gYXJyYXlbcF07XG4gICAgYXJyYXkuc3BsaWNlKHAsIDEpOyBcbiAgICBhcnJheS5zcGxpY2UocSwgMCwgdmFsdWUpO1xuICAgIHJldHVybiBhcnJheTsgXG4gIH0sICAgIFxuICBzd2FwRWxlbWVudHNPZkFycmF5OiBmdW5jdGlvbiAocCwgcSwgYXJyYXkpeyBcbiAgICB2YXIgdGVtcCA9IGFycmF5W3FdO1xuICAgIGFycmF5W3FdPWFycmF5W3BdO1xuICAgIGFycmF5W3BdPXRlbXA7ICAgICBcbiAgICByZXR1cm4gYXJyYXk7ICAgIFxuICB9LFxuICByZW1vdmVWYWx1ZUZyb21BcnJheU9mU0VUczogZnVuY3Rpb24gKHZhbHVlLCBhcnJheU9mU2V0cyl7ICAgIFxuICAgIGZvciAodmFyIGk9MDtpPGFycmF5T2ZTZXRzLmxlbmd0aDtpKyspe1xuLy8gICAgICAgIGFycmF5T2ZTZXRzW2ldLmRlbGV0ZSh2YWx1ZSk7XG4gICAgICAgIGFycmF5T2ZTZXRzW2ldLmRlbGV0ZVZhbHVlKHZhbHVlKTtcbiAgICB9ICAgICBcbiAgfSAgXG4gIFxufTtcblxuXG4iLCJcInVzZSBzdHJpY3RcIlxuXG5nbG9iYWwuT3V0cHV0ID0gcmVxdWlyZShcIi4uL3N0YXRpYy9PdXRwdXRcIik7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBDb25zdGFudHM6cmVxdWlyZShcIi4vY29uc3RhbnRzL0NvbnN0YW50c1wiKSwgICAgICAgIFxuICBFbGVtZW50czpyZXF1aXJlKFwiLi9FbGVtZW50c1wiKSxcbiAgQXJyYXlzOnJlcXVpcmUoXCIuL0FycmF5c1wiKSxcbiAgTWF0aHM6cmVxdWlyZShcIi4vTWF0aHNcIiksICAgIFxuICBjaGVja0FyZ3VtZW50c0xlbmd0aDogZnVuY3Rpb24gKGV4cGVjdGVkLCByZWNlaXZlZCkgeyAvL1RPRE8gLT5DcmVvIHF1ZSBubyBsbyB2b3kgYSB1dGlsaXphciBcbiAgICAgIGlmIChleHBlY3RlZCE9cmVjZWl2ZWQpe1xuICAgICAgICAgIHRocm93IFwiTnVtYmVyT2ZBcmd1bWVudHNFeGNlcHRpb25cIjtcbiAgICAgIH0gICBcbiAgfSxcbiAgc2V0QWxnb3JpdGhtOiBmdW5jdGlvbiAoYWxnb3JpdGhtVHlwZSkge1xuICAgIHN3aXRjaChhbGdvcml0aG1UeXBlLnRvVXBwZXJDYXNlKCkpIHtcbiAgICAgICAgY2FzZSB0aGlzLkNvbnN0YW50cy5BbGdvcml0aG1UeXBlcy5DVlJQOlxuICAgICAgICAgICAgdGhpcy5FbGVtZW50cy5BbGdvcml0aG09dGhpcy5FbGVtZW50cy5BbGdvcml0aG1DVlJQO1xuICAgICAgICAgICAgdGhpcy5FbGVtZW50cy5DaHJvbW9zb21lPXRoaXMuRWxlbWVudHMuQ2hyb21vc29tZVZSUDtcbiAgICAgICAgICAgIHRoaXMuRWxlbWVudHMuUHJvYmxlbT10aGlzLkVsZW1lbnRzLlByb2JsZW1DVlJQO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvL0VTVEFCTEVDRU1PUyBDT05GSUdVUkFDScOTTiBDVlJQXG4gICAgICAgICAgICBicmVhazsgXG4gICAgICAgIGNhc2UgdGhpcy5Db25zdGFudHMuQWxnb3JpdGhtVHlwZXMuT05FX01BWDpcbiAgICAgICAgICAgIHRoaXMuRWxlbWVudHMuQWxnb3JpdGhtPXRoaXMuRWxlbWVudHMuQWxnb3JpdGhtT25lTWF4O1xuICAgICAgICAgICAgdGhpcy5FbGVtZW50cy5DaHJvbW9zb21lPXRoaXMuRWxlbWVudHMuQ2hyb21vc29tZUJpbmFyeTtcbiAgICAgICAgICAgIHRoaXMuRWxlbWVudHMuUHJvYmxlbT10aGlzLkVsZW1lbnRzLlByb2JsZW1PbmVNYXg7ICAgICAgICAgXG4gICAgICAgICAgICAvL0VTVEFCTEVDRU1PUyBDT05GSUdVUkFDScOTTiBDVlJQXG4gICAgICAgICAgICBicmVhazsgICAgIFxuICAgICAgICBjYXNlIHRoaXMuQ29uc3RhbnRzLkFsZ29yaXRobVR5cGVzLlBQRUFLUzpcbiAgICAgICAgICAgIC8vRVNUQUJMRUNFTU9TIENPTkZJR1VSQUNJw5NOIENWUlBcbiAgICAgICAgICAgIGJyZWFrOyAgICAgICAgICAgIFxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgXCJFUlJPUjogRWwgbcOpdG9kbyByZWNpYmlkbyBubyBleGlzdGUuXCI7XG4gICAgfSAgICAgICAgICAgICAgIFxuICB9LCAgIFxuICBzZXRQcm9jZXNzaW5nVHlwZTogZnVuY3Rpb24gKHByb2NjZXNpbmdUeXBlKSB7IC8vVE9ETyAtPiBDQU1CSUFSIE5PTUJSRVxuICAgIHN3aXRjaChwcm9jY2VzaW5nVHlwZS50b1VwcGVyQ2FzZSgpKSB7XG4gICAgICAgIGNhc2UgdGhpcy5Db25zdGFudHMuUHJvY2Nlc3NpbmdUeXBlcy5JU0xBUzpcbiAgICAgICAgICAgIHRoaXMuRWxlbWVudHMuQXBwbGljYXRpb249dGhpcy5FbGVtZW50cy5Jc2xhcztcbiAgICAgICAgICAgIGJyZWFrOyAgICAgICAgIFxuICAgICAgICBjYXNlIHRoaXMuQ29uc3RhbnRzLlByb2NjZXNzaW5nVHlwZXMuTE9DQUw6XG4gICAgICAgICAgICB0aGlzLkVsZW1lbnRzLkFwcGxpY2F0aW9uPXRoaXMuRWxlbWVudHMuTG9jYWxBcHBsaWNhdGlvbjtcbiAgICAgICAgICAgIGJyZWFrOyBcbiAgICAgICAgY2FzZSB0aGlzLkNvbnN0YW50cy5Qcm9jY2Vzc2luZ1R5cGVzLk1BU1RFUl9TTEFWRTpcbiAgICAgICAgICAgIHRoaXMuRWxlbWVudHMuQXBwbGljYXRpb249dGhpcy5FbGVtZW50cy5Nb25pdG9yQXBwbGljYXRpb247XG4gICAgICAgICAgICBicmVhazsgICAgICAgICAgICBcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IFwiRVJST1I6IEVsIG3DqXRvZG8gcmVjaWJpZG8gbm8gZXhpc3RlLlwiO1xuICAgIH0gICAgICAgICAgICAgICBcbiAgfSBcbn07IiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIFNldDpyZXF1aXJlKFwiLi9TZXRcIiksICAgICAgXG4gICAgXG4gIENocm9tb3NvbWVWUlA6cmVxdWlyZShcIi4uL2Nocm9tb3NvbWUvQ2hyb21vc29tZVZSUFwiKSxcbiAgQ2hyb21vc29tZUJpbmFyeTpyZXF1aXJlKFwiLi4vY2hyb21vc29tZS9DaHJvbW9zb21lQmluYXJ5XCIpLFxuICBJbmRpdmlkdWFsOnJlcXVpcmUoXCIuLi9JbmRpdmlkdWFsXCIpLFxuICBQcm9ibGVtQ1ZSUDpyZXF1aXJlKFwiLi4vcHJvYmxlbS9wcm9ibGVtQ1ZSUFwiKSwgIFxuICBQcm9ibGVtT25lTWF4OnJlcXVpcmUoXCIuLi9wcm9ibGVtL1Byb2JsZW1PbmVNYXhcIiksXG4gIFBvcHVsYXRpb246cmVxdWlyZShcIi4uL3BvcHVsYXRpb25cIiksICBcbiAgQWxnb3JpdGhtT25lTWF4OnJlcXVpcmUoXCIuLi9hbGdvcml0aG0vQWxnb3JpdGhtT25lTWF4XCIpLCAgIFxuICBBbGdvcml0aG1DVlJQOnJlcXVpcmUoXCIuLi9hbGdvcml0aG0vQWxnb3JpdGhtQ1ZSUFwiKSwgICBcbiAgQ3VzdG9tZXI6cmVxdWlyZShcIi4uL3Byb2JsZW0vcHJvYmxlbUNWUlAvY3VzdG9tZXJcIiksICAgIFxuICBMb2NhbEFwcGxpY2F0aW9uOnJlcXVpcmUoXCIuLi9sYXllcnMvYXBwbGljYXRpb24vTG9jYWxBcHBsaWNhdGlvblwiKSxcbiAgTW9uaXRvckFwcGxpY2F0aW9uOnJlcXVpcmUoXCIuLi9sYXllcnMvYXBwbGljYXRpb24vTW9uaXRvckFwcGxpY2F0aW9uXCIpLCAgICAgICBcbiAgU2xhdmVBcHBsaWNhdGlvbjpyZXF1aXJlKFwiLi4vbGF5ZXJzL2FwcGxpY2F0aW9uL1NsYXZlQXBwbGljYXRpb25cIiksICAgXG4gIE1lc3NhZ2U6cmVxdWlyZShcIi4uL2xheWVycy90cmFuc21pc3Npb24vbWVzc2FnZXMvTWVzc2FnZVwiKSwgICAgXG4gIFxuICBNb25pdG9yQ29tbXVuaWNhdGlvbjpyZXF1aXJlKFwiLi4vbGF5ZXJzL2NvbW11bmljYXRpb24vTW9uaXRvckNvbW11bmljYXRpb25cIiksXG4gIFNsYXZlQ29tbXVuaWNhdGlvbjpyZXF1aXJlKFwiLi4vbGF5ZXJzL2NvbW11bmljYXRpb24vU2xhdmVDb21tdW5pY2F0aW9uXCIpLFxuICBcbi8vICBXZWJTb2NrZXRTZXJ2ZXI6cmVxdWlyZShcIi4uL2xheWVycy90cmFuc21pc3Npb24vd2Vic29ja2V0cy9XZWJTb2NrZXRTZXJ2ZXJcIiksICBcbiAgV2ViU29ja2V0Q2xpZW50OnJlcXVpcmUoXCIuLi9sYXllcnMvdHJhbnNtaXNzaW9uL3dlYnNvY2tldHMvV2ViU29ja2V0Q2xpZW50XCIpLFxuICBXZWJTb2NrZXREZWZhdWx0OnJlcXVpcmUoXCIuLi9sYXllcnMvdHJhbnNtaXNzaW9uL3dlYnNvY2tldHMvV2ViU29ja2V0RGVmYXVsdFwiKSAgXG59OyIsIiAgIFxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGZpbmRFbGVtZW50UG9zaXRpb25JbkFycmF5OiBmdW5jdGlvbiAoZWxlbWVudCxhcnJheSkge1xuICAgIHJldHVybiBhcnJheS5pbmRleE9mKGVsZW1lbnQpOyBcbiAgfSxcbiAgXG4gIHNodWZmbGVBcnJheTogZnVuY3Rpb24gKGFycmF5KSB7XG4gICAgZm9yICh2YXIgaSA9IGFycmF5Lmxlbmd0aCAtIDE7IGkgPiAwOyBpLS0pIHtcbiAgICAgICAgdmFyIGogPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoaSArIDEpKTtcbiAgICAgICAgdmFyIHRlbXAgPSBhcnJheVtpXTtcbiAgICAgICAgYXJyYXlbaV0gPSBhcnJheVtqXTtcbiAgICAgICAgYXJyYXlbal0gPSB0ZW1wO1xuICAgIH1cbiAgICByZXR1cm4gYXJyYXk7XG4gIH0sXG4gIFxuICBjaGVja0FyZ3VtZW50c0xlbmd0aDogZnVuY3Rpb24gKGV4cGVjdGVkLCByZWNlaXZlZCkge1xuICAgICAgaWYgKGV4cGVjdGVkIT1yZWNlaXZlZCl7XG4gICAgICAgICAgdGhyb3cgXCJOdW1iZXJPZkFyZ3VtZW50c0V4Y2VwdGlvblwiO1xuICAgICAgfVxuICAgICAgXG4gIH0sXG4gICAgY3JlYXRlU2VlZDpmdW5jdGlvbihzKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbi8vICAgICAgICAgICAgY29uc29sZS5sb2coXCJyYW5kb20gc2VlZFwiKVxuICAgICAgICAgICAgcyA9IE1hdGguc2luKHMpICogMTAwMDA7IHJldHVybiBzIC0gTWF0aC5mbG9vcihzKTtcbiAgICAgICAgfTtcbiAgICB9XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCJcblxuY2xhc3MgU2V0IHtcbiAgICBjb25zdHJ1Y3Rvcigpe1xuICAgICAgICB0aGlzLnZhbHVlcyA9IFtdO1xuICAgICAgICB0aGlzLnNpemUgPTA7XG4gICAgfVxuICAgIGFkZCh2YWx1ZSl7XG4gICAgICAgIGlmICh0aGlzLnZhbHVlcy5pbmRleE9mKHZhbHVlKT09LTEpe1xuICAgICAgICAgICAgdGhpcy52YWx1ZXMucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICB0aGlzLnNpemU9dGhpcy52YWx1ZXMubGVuZ3RoO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZvckVhY2goY2FsbGJhY2spe1xuICAgICAgICBmb3IgKHZhciBpPTA7aTx0aGlzLnZhbHVlcy5sZW5ndGg7aSsrKXtcbiAgICAgICAgICAgIGNhbGxiYWNrKHRoaXMudmFsdWVzW2ldKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBkZWxldGVWYWx1ZSh2YWx1ZSl7XG4gICAgICAgIHZhciBwb3MgPSB0aGlzLnZhbHVlcy5pbmRleE9mKHZhbHVlKTtcbiAgICAgICAgaWYgKHBvcyE9LTEpe1xuICAgICAgICAgICAgdGhpcy52YWx1ZXMuc3BsaWNlKHBvcywxKTtcbiAgICAgICAgICAgIHRoaXMuc2l6ZT10aGlzLnZhbHVlcy5sZW5ndGg7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgXG4gICAgXG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2V0OyIsIm1vZHVsZS5leHBvcnRzID0gT2JqZWN0LmZyZWV6ZSh7XG4gICAgT05FX01BWDonT05FX01BWCcsXG4gICAgUFBFQUtTOidQUEVBS1MnLFxuICAgIENWUlA6J0NWUlAnLFxuICAgIENWUlBfTE9DQUxfREFUQTonQ1ZSUF9MT0NBTF9EQVRBJyAgICAgXG59KTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgQWxnb3JpdGhtVHlwZXM6cmVxdWlyZShcIi4vQWxnb3JpdGhtVHlwZXNcIiksXG4gIFByb2NjZXNzaW5nVHlwZXM6cmVxdWlyZShcIi4vUHJvY2Nlc3NpbmdUeXBlc1wiKSxcbiAgTWVzc2FnZVR5cGVzOnJlcXVpcmUoXCIuL01lc3NhZ2VUeXBlc1wiKSxcbiAgUGFyYW1ldGVyVHlwZXM6cmVxdWlyZShcIi4vUGFyYW1ldGVyVHlwZXNcIiksXG4gIEZpbGVOYW1lOlwiZGF0YVByb2JfMjAwXzUwLnR4dFwiLFxuICBJbmRleDpcImluZGV4Lmh0bWxcIiwgIFxuICBJbmRleEZyb21GaWxlOlwiaW5kZXgyLmh0bWxcIiwgICAgXG4gIEZyb21GaWxlOmZhbHNlICAgIFxufTsiLCJtb2R1bGUuZXhwb3J0cyA9IE9iamVjdC5mcmVlemUoe1xuICAgIFNUQVJUOidTVEFSVCcsXG4gICAgU1RPUDogJ1NUT1AnLCAgICAgIFxuICAgIFBBVVNFOiAnUEFVU0UnLCBcbiAgICBDT05USU5VRTogJ0NPTlRJTlVFJywgICBcbiAgICBcbiAgICBCVUZGRVI6ICdCVUZGRVInLCAgICAgXG4gICAgQ09OTkVDVDogJ0NPTk5FQ1QnLCBcbiAgICBESVNDT05ORUNUOiAnRElTQ09OTkVDVCcsICAgICAgIFxuXG4gICAgXG4gICAgTkVYVF9TVEVQOidORVhUX1NURVAnLFxuICAgIFNIT1dfU09MVVRJT046J1NIT1dfU09MJyBcbn0pOyIsIm1vZHVsZS5leHBvcnRzID0gT2JqZWN0LmZyZWV6ZSh7XG4gICAgVEFTS19UWVBFOidUQVNLX1RZUEUnLCAgICAgICBcbiAgICBBTEdPUklUSE1fVFlQRTonQUxHT1JJVEhNX1RZUEUnLFxuICAgIEFSUkFZX0NVU1RPTUVSUzonQVJSQVlfQ1VTVE9NRVJTJyxcbiAgICBNQVRSSVhfQ09TVDonTUFUUklYX0NPU1QnLFxuICAgIE5fVFJVQ0tTOidOX1RSVUNLUycsXG4gICAgVFJVQ0tfQ0FQQUNJVFk6J1RSVUNLX0NBUEFDSVRZJyxcbiAgICBUUlVDS19USU1FOidUUlVDS19USU1FJyxcbiAgICBQRU5BTF9DQVA6J1BFTkFMX0NBUCcsXG4gICAgUEVOQUxfVElNRTonUEVOQUxfVElNRScsXG4gICAgUFJPQl9DUk9TUzonUFJPQl9DUk9TUycsXG4gICAgUFJPQl9NVVQ6J1BST0JfTVVUJyxcbiAgICBQUk9CX0xTOidQUk9CX0xTJyxcbiAgICBDSFJPTV9MRU5HVEg6J0NIUk9NX0xFTkdUSCcsICAgIFxuICAgIFRBUkdFVF9GSVRORVNTOidUQVJHRVRfRklUTkVTUycsXG4gICAgTUFYX1NURVBTOidNQVhfU1RFUFMnLFxuICAgIFBPUF9TSVpFOidQT1BfU0laRScsICAgIFxuICAgIFxuICAgIFBST0JMRU06J1BST0JMRU0nLFxuICAgIFBPUFVMQVRJT046J1BPUFVMQVRJT04nLFxuICAgIFxuICAgIFJFUExBQ0VNRU5UUzonUkVQTEFDRU1FTlRTJyxcbiAgICBJTkRJVklEVUFMOidJTkRJVklEVUFMJyxcbiAgICBUSU1FOidUSU1FJyxcbiAgICBUT1RBTF9TVEVQUzonVE9UQUxfU1RFUFMnICAgXG59KTsiLCJtb2R1bGUuZXhwb3J0cyA9IE9iamVjdC5mcmVlemUoe1xuICAgIExPQ0FMOidMT0NBTCcsXG4gICAgSVNMQVM6J0lTTEFTJywgICAgXG4gICAgTUFTVEVSX1NMQVZFOidNQVNURVJfU0xBVkUnXG59KTsiLCJmdW5jdGlvbiBMb2NhbEFwcGxpY2F0aW9uKCl7fVxuXG5Mb2NhbEFwcGxpY2F0aW9uLnByb3RvdHlwZSA9IHtcbiAgICBpbml0aWFsaXplIDogZnVuY3Rpb24oYWxnb3JpdGhtKXtcbiAgICAgICAgdGhpcy5zdGFydFRpbWU9MDtcbiAgICAgICAgdGhpcy5maW5hbFRpbWU9MDtcbiAgICAgICAgdGhpcy5hbGdvcml0aG09YWxnb3JpdGhtO1xuICAgICAgICB0aGlzLnJ1bm5pbmc9ZmFsc2U7ICAgIFxuICAgIH0sICAgXG4gICAgcnVuIDogZnVuY3Rpb24oKXsgXG4gICAgICAgIHdoaWxlICh0aGlzLnJ1bm5pbmcpe1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIXRoaXMuYWxnb3JpdGhtLmhhc0ZpbmlzaGVkKCkpeyAgICAgICAgXHRcbiAgICAgICAgICAgICAgICB2YXIgc29uICA9IHRoaXMuYWxnb3JpdGhtLnJ1bigpO1xuICAgICAgICAgICAgICAgIHRoaXMuYWxnb3JpdGhtLnJlcGxhY2VXb3JzdChzb24pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlNURVAgXCIrdGhpcy5hbGdvcml0aG0uc3RlcCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJNQVhTVEVQUyBcIit0aGlzLmFsZ29yaXRobS5tYXhTdGVwcyk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJTT0xVVElPTiBGT1VORCBcIit0aGlzLmFsZ29yaXRobS5zb2x1dGlvbkZvdW5kKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImZpblwiKVxuICAgICAgICAgICAgICAgIHRoaXMucnVubmluZz1mYWxzZTtcbiAgICAgICAgICAgICAgICB0aGlzLmZpbmFsVGltZT1uZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIiAgVElNRTogXCIrKHRoaXMuZmluYWxUaW1lLXRoaXMuc3RhcnRUaW1lKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5hbGdvcml0aG0uc2hvd1NvbHV0aW9uKCk7XG4gICAgICAgICAgICB9ICAgIFxuICAgICAgICB9ICAgICAgICAgICAgXG4gICAgfSxcbiAgICBzdGFydCA6IGZ1bmN0aW9uKCl7IFxuICAgICAgICB0aGlzLnN0YXJ0VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICB0aGlzLnJ1bm5pbmc9dHJ1ZTtcbiAgICAgICAgdGhpcy5ydW4oKTsgICAgICAgICAgICBcbiAgICB9LFxuICAgIHN0b3AgOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgcnVubmluZz1mYWxzZTtcbiAgICB9LCAgXG4gICAgcmVzdW1lIDogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHJ1bm5pbmc9dHJ1ZTsgXG4gICAgfSwgICAgXG4gICAgcGF1c2UgOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgcnVubmluZz1mYWxzZTsgXG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IExvY2FsQXBwbGljYXRpb247IiwiJ3VzZSBzdHJpY3QnO1xudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpO1xudmFyIGZzID0gcmVxdWlyZSgnZnMnKTsgXG5cbmNsYXNzIE1vbml0b3JBcHBsaWNhdGlvbntcbiAgICBjb25zdHJ1Y3RvcigpIHt9XG4gICAgaW5pdGlhbGl6ZShjb21tdW5pY2F0aW9ucyl7XG4gICAgICAgIHRoaXMuY29tbXVuaWNhdGlvbkxheWVyPWNvbW11bmljYXRpb25zO1xuICAgICAgICB0aGlzLnN0YXJ0VGltZT0wO1xuICAgICAgICB0aGlzLmZpbmFsVGltZT0wO1xuICAgICAgICB0aGlzLmFsZ29yaXRobT1udWxsO1xuICAgICAgICB0aGlzLnJ1bm5pbmc9ZmFsc2U7ICBcbiAgICAgICAgdGhpcy5kYXRhQWxnb3JpdGhtPW51bGw7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNsYXZlTGFzdFJlcGxhY2VtZW50PXt9O1xuICAgICAgICB0aGlzLnJlcGxhY2VtZW50cz1bXTsgICBcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICB0aGlzLnJlcGxhY2VtZW50c0Zyb21TbGF2ZXM9MDtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICB0aGlzLnByb2JsZW1zU29sdmVkPTA7XG4vLyAgICAgICAgdGhpcy5wcm9ibGVtc1NvbHZlZExvZz1cIlwiO1xuICAgICAgICB0aGlzLnByb2JsZW1zU29sdmVkQXJyYXk9W107ICAgICAgICBcbiAgICB9XG4gICAgXG4gICAgcHJvY2Vzc1JlcXVlc3QodHlwZSxkYXRhKXtcbiAgICAgICAgc3dpdGNoKHR5cGUpIHsgICAgXG4gICAgICAgICAgICBjYXNlIENvbW1vbi5Db25zdGFudHMuTWVzc2FnZVR5cGVzLlNUQVJUOlxuICAgICAgICAgICAgICAgIHZhciByZXNwb25zZSA9IHRoaXMucHJvY2Vzc1N0YXJ0KGRhdGEpO1xuICAgICAgICAgICAgICAgIHRoaXMuY29tbXVuaWNhdGlvbkxheWVyLnNlbmRUb0FsbCh0eXBlLHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICBicmVhazsgICAgICBcbiAgICAgICAgICAgIGNhc2UgQ29tbW9uLkNvbnN0YW50cy5NZXNzYWdlVHlwZXMuU1RPUDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5ydW5uaW5nICYmIHRoaXMuYWxnb3JpdGhtKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbmQoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBicmVhazsgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgXCJFUlJPUjogRWwgbcOpdG9kbyByZWNpYmlkbyBubyBleGlzdGUuXCI7XG4gICAgICAgIH0gICAgICAgIFxuICAgIH1cbiAgICBwcm9jZXNzUmVzcG9uc2UodHlwZSxkYXRhKXtcbiAgICAgICAgc3dpdGNoKHR5cGUpIHsgICAgXG4gICAgICAgICAgICBjYXNlIENvbW1vbi5Db25zdGFudHMuTWVzc2FnZVR5cGVzLk5FWFRfU1RFUDogICAgICAgXG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzVGFza1Jlc3VsdChkYXRhKTtcbiAgICAgICAgICAgICAgICBicmVhazsgIFxuICAgICAgICAgICAgY2FzZSBDb21tb24uQ29uc3RhbnRzLk1lc3NhZ2VUeXBlcy5TSE9XX1NPTFVUSU9OOiAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSBDb21tb24uQ29uc3RhbnRzLk1lc3NhZ2VUeXBlcy5TVEFSVDogICAgICAgXG4gICAgICAgICAgICAgICAgLy9OT1RISU5HXG4gICAgICAgICAgICAgICAgYnJlYWs7ICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IFwiRVJST1I6IEVsIG3DqXRvZG8gcmVjaWJpZG8gbm8gZXhpc3RlLlwiO1xuICAgICAgICB9ICAgICAgICAgIFxuICAgIH1cbiAgICBwcm9jZXNzQ29ubmVjdChjYWxsYmFjayl7XG4gICAgICAgIGNhbGxiYWNrKHRoaXMuZ2V0RGF0YUFsZ29yaXRobSgpKTtcbiAgICB9XG4gICAgXG4gICAgXG4gICAgcHJvY2Vzc0Rpc2Nvbm5lY3RSZXF1ZXN0KGlkTm9kZSl7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnNsYXZlTGFzdFJlcGxhY2VtZW50W2lkTm9kZV07ICBcbiAgICB9XG4gICAgZ2V0Q29tbXVuaWNhdGlvbkxheWVyKCl7XG4gICAgICAgcmV0dXJuIHRoaXMuY29tbXVuaWNhdGlvbkxheWVyOyAgICAgICAgXG4gICAgfVxuICAgIHJ1bigpe1xuICAgICAgICBpZiAodGhpcy5ydW5uaW5nKXsgICAgICBcbiAgICAgICAgICAgIGlmICghdGhpcy5hbGdvcml0aG0uaGFzRmluaXNoZWQoKSl7XG4gICAgICAgICAgIFx0ICAgICAgICAgICAgXHRcbiAgICAgICAgICAgICAgICB2YXIgZGF0YT1udWxsOyAgICAgICAgXG4gICAgICAgICAgICAgICAgdmFyIGlkTm9kZT1udWxsO1xuICAgICAgICAgICAgICAgIHZhciBuZXh0UmVwbGFjZW1lbnQ9bnVsbDtcbiAgICAgICAgICAgICAgICB2YXIgcmVwbGFjZW1lbnRzVG9Ebz1udWxsO1xuICAgICAgICAgICAgICAgIGlkTm9kZT10aGlzLmNvbW11bmljYXRpb25MYXllci5nZXRGcmVlTm9kZUlkKCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoaWROb2RlIHx8IGlkTm9kZT09PTApe1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoaWROb2RlIHx8IGlkTm9kZT09PTApe1xuICBcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRSZXBsYWNlbWVudD10aGlzLnNsYXZlTGFzdFJlcGxhY2VtZW50W2lkTm9kZV07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXh0UmVwbGFjZW1lbnQ9PW51bGwpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2xhdmVMYXN0UmVwbGFjZW1lbnRbaWROb2RlXT0wO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5leHRSZXBsYWNlbWVudD0wO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJUT1RBTCBSRVBMQUNFTUVOVFMgPSBcIit0aGlzLnJlcGxhY2VtZW50cy5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJORVhUIFJFUExBQ0VNRU5UID0gXCIrbmV4dFJlcGxhY2VtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcGxhY2VtZW50c1RvRG89dGhpcy5yZXBsYWNlbWVudHMuc2xpY2UobmV4dFJlcGxhY2VtZW50LHRoaXMucmVwbGFjZW1lbnRzLmxlbmd0aCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFbQ29tbW9uLkNvbnN0YW50cy5QYXJhbWV0ZXJUeXBlcy5SRVBMQUNFTUVOVFNdPXJlcGxhY2VtZW50c1RvRG87XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhW0NvbW1vbi5Db25zdGFudHMuUGFyYW1ldGVyVHlwZXMuVEFTS19UWVBFXT1Db21tb24uQ29uc3RhbnRzLk1lc3NhZ2VUeXBlcy5ORVhUX1NURVA7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhW0NvbW1vbi5Db25zdGFudHMuUGFyYW1ldGVyVHlwZXMuQUxHT1JJVEhNX1RZUEVdPUNvbW1vbi5Db25zdGFudHMuQWxnb3JpdGhtVHlwZXMuQ1ZSUDsvL1RPRE8gLT4gQ3JlbyBxdWUgbm8gZXMgbmVjZXNhcmlvXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbW11bmljYXRpb25MYXllci5zZW5kVG8oQ29tbW9uLkNvbnN0YW50cy5NZXNzYWdlVHlwZXMuTkVYVF9TVEVQLCBkYXRhLCBpZE5vZGUpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNsYXZlTGFzdFJlcGxhY2VtZW50W2lkTm9kZV09bmV4dFJlcGxhY2VtZW50K3JlcGxhY2VtZW50c1RvRG8ubGVuZ3RoOyBcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWROb2RlPXRoaXMuY29tbXVuaWNhdGlvbkxheWVyLmdldEZyZWVOb2RlSWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuLy8uLi4gICAgICAgICAgICAgICAgXHRjb25zb2xlLmxvZyhcIkZJTiBXSElMRVwiKVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7ICAgLy9FSkVDVUNJw5NOIExPQ0FMXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcbi8vICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hbGdvcml0aG0ucnVuQ2FsbGJhY2soKHNvbik9Pntcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwb3NSZXBsYWNlbWVudD0gIHRoaXMuYWxnb3JpdGhtLnJlcGxhY2VXb3JzdChzb24pO1xuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBvc1JlcGxhY2VtZW50IT0tMSl7ICAgICAgICAgICBcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlcGxhY2VtZW50cy5wdXNoKHtcImluZGl2XCI6c29uLFwicG9zXCI6IHBvc1JlcGxhY2VtZW50fSk7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICB9ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuLy8gICAgICAgICAgICAgICAgICAgICAgICB9KTsgIFxuICAgICAgICAgICAgICAgIH0gICAgICAgICAgICBcdFxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHNldEltbWVkaWF0ZSggICAgKCk9PntcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ydW4oKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7ICAvL0hBUyBGSU5JU0hFRFxuICAgICAgICAgICAgICAgICAgdGhpcy5lbmQoKTsgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSAvL2hhcyBmaW5pc2hlZCAgIFxuICAgICAgICB9ICBlbHNlIHsgLy9ydW5uaW5nXG4gICAgICAgICAgICAvLy9UT0RPLT4gbm8gZGViZXLDrWFuIGVzdGFyIGFxdcOtXG4gICAgICAgIH0gICAgICAgICAgICBcbiAgICB9XG4gICAgXG4gICAgZW5kKCl7ICAgICAgICBcbiAgICAgICAgICAgICAgICB0aGlzLmZpbmFsVGltZT1uZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgICAgICAgICB2YXIgdG90YWxUaW1lPXRoaXMuZmluYWxUaW1lLXRoaXMuc3RhcnRUaW1lO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhQWxnb3JpdGhtPW51bGw7IC8vQk9SUkFNT1MgTE9TIERBVE9TIERFTCBBTEdPUklUTU9cbiAgICAgICAgICAgICAgICB0aGlzLnJlcGxhY2VtZW50cz1bXTsgLy9CT1JSQU1PUyBMT1MgUkVFTVBMQVpPUyAgXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgcmVwbGFjZSBpbiB0aGlzLnNsYXZlTGFzdFJlcGxhY2VtZW50KXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zbGF2ZUxhc3RSZXBsYWNlbWVudFtyZXBsYWNlXT0wO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInRoaXMucmVwbGFjZW1lbnRzc3Nzc3M9XCIrSlNPTi5zdHJpbmdpZnkodGhpcy5yZXBsYWNlbWVudHMpKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidGhpcy5zbGF2ZUxhc3RSZXBsYWNlbWVudD1cIitKU09OLnN0cmluZ2lmeSh0aGlzLnNsYXZlTGFzdFJlcGxhY2VtZW50KSlcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImZpblwiKVxuICAgICAgICAgICAgICAgIHRoaXMucnVubmluZz1mYWxzZTtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiICBUSU1FOiBcIit0b3RhbFRpbWUpO1xuICAgICAgICAgICAgICAgIHZhciBzb2x1dGlvbiA9IHRoaXMuYWxnb3JpdGhtLnNob3dTb2x1dGlvbigpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB2YXIgZmluYWxTdGVwPXRoaXMuYWxnb3JpdGhtLnN0ZXA7XG5cblxuXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cIik7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cIik7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cIik7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cIik7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cIik7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cIik7ICAgICAgXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIi0tLVBST0JMRU0gSVRFUkFUSU9OIFwiK3RoaXMucHJvYmxlbXNTb2x2ZWQrXCItLS0tLS0tLS0tXCIpO1xuICAgICAgICAgICAgdmFyIHMgPSB7fTtcbiAgICAgICAgICAgIHNbXCJpZFwiXT10aGlzLnByb2JsZW1zU29sdmVkO1xuICAgICAgICAgICAgc1tcImZpdG5lc3NcIl09c29sdXRpb24uZ2V0Rml0bmVzcygpO1xuICAgICAgICAgICAgc1tcInRpbWVcIl09dG90YWxUaW1lOyAgIFxuICAgICAgICAgICAgc1tcInN0ZXBcIl09ZmluYWxTdGVwOyBcbiAgICAgICAgICAgIHZhciBpZFNsYXZlcz1PYmplY3Qua2V5cyh0aGlzLmNvbW11bmljYXRpb25MYXllci5ub2Rlcyk7XG4gICAgICAgICAgICBzW1wiblNsYXZlc1wiXT1pZFNsYXZlcy5sZW5ndGg7XG4gICAgICAgICAgICBzW1wiaWRTbGF2ZXNcIl09aWRTbGF2ZXM7XG5cbiAgICAgICAgICAgIHRoaXMuY29tbXVuaWNhdGlvbkxheWVyLnNlbmRUb0FsbChDb21tb24uQ29uc3RhbnRzLk1lc3NhZ2VUeXBlcy5TSE9XX1NPTFVUSU9OLHNvbHV0aW9uKTtcbiAgICAgICAgICAgIHRoaXMuYWxnb3JpdGhtPW51bGw7XG4gICAgICAgICAgICB0aGlzLnByb2JsZW1zU29sdmVkKys7IFxuICAgICAgICAgICAgaWYgKENvbW1vbi5Db25zdGFudHMuRnJvbUZpbGUpeyAvL1NpIHNlIGVzdMOhIHJlYWxpemFuZG8gdW4gVEVTVCwgc2UgcmVjYXJnYW4gbG9zIGRhdG9zIHBhcmEgc2VndWlyLlxuICAgICAgICAgICAgICAgIGxvYWRBcnJheUpTT05Gcm9tRmlsZShcInByb2JsZW1SZXN1bHRzLnR4dFwiLChqc29uUHJvYmxlbSk9PnsgICBcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJBTlRFUyBcIitqc29uUHJvYmxlbS5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICBqc29uUHJvYmxlbS5wdXNoKHMpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkRFU1BVRVMgXCIranNvblByb2JsZW0ubGVuZ3RoKTsgIFxuICAgICAgICAgICAgICAgICAgICBzYXZlQXJyYXlKU09OVG9GaWxlKGpzb25Qcm9ibGVtLFwicHJvYmxlbVJlc3VsdHMudHh0XCIsKCk9PntcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidGhpcy5yZXBsYWNlbWVudHNzc3Nzcz1cIitKU09OLnN0cmluZ2lmeSh0aGlzLnJlcGxhY2VtZW50cykpXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInRoaXMuc2xhdmVMYXN0UmVwbGFjZW1lbnQ9XCIrSlNPTi5zdHJpbmdpZnkodGhpcy5zbGF2ZUxhc3RSZXBsYWNlbWVudCkpICBcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCk9PnsgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2FkQ1ZSUFByb2JsZW1Gcm9tRmlsZShcImxheWVycy90cmFuc21pc3Npb24vd2Vic29ja2V0cy93ZWIvXCIrQ29tbW9uLkNvbnN0YW50cy5GaWxlTmFtZSwoKT0+e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlZBTU9TIEEgQ09NRU5aQVJcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidGhpcy5hbGdvcml0aG09XCIrdGhpcy5hbGdvcml0aG0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSwxMDAwMCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSAgICAgICAgICAgICAgXG4gICAgfVxuICAgIFxuICAgIFxuICAgIFxuICAgIGdldERhdGFBbGdvcml0aG0oKXtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGF0YUFsZ29yaXRobTsgICAgICAgIFxuICAgIH1cbiAgICBwcm9jZXNzVGFza1Jlc3VsdChkYXRhKXtcbiAgICAgICAgaWYgKHRoaXMucnVubmluZyAmJiB0aGlzLmFsZ29yaXRobSl7XG4gICAgLy8gICAgICAgIGNvbnNvbGUubG9nKHRoaXMuYWxnb3JpdGhtLnN0ZXArXCIgUkVFTVBMQVpBTU9TIERFU0RFIE5PRE8gRVNDTEFWT1wiKVxuICAgICAgICAgICAgZGF0YSA9IENvbW1vbi5FbGVtZW50cy5JbmRpdmlkdWFsLmZyb21KU09OKGRhdGEpO1xuICAgICAgICAgICAgLy9BS1lcbiAgICAvLyAgICAgICAgdGhpcy5hbGdvcml0aG0ucmVwbGFjZVdvcnN0KGRhdGEpO1xuICAgICAgICAgICAgdmFyIHBvc1JlcGxhY2VtZW50PSAgdGhpcy5hbGdvcml0aG0ucmVwbGFjZVdvcnN0KGRhdGEpO1xuICAgICAgICAgICAgaWYgKHBvc1JlcGxhY2VtZW50IT0tMSl7ICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXBsYWNlbWVudHMucHVzaCh7XCJpbmRpdlwiOmRhdGEsXCJwb3NcIjogcG9zUmVwbGFjZW1lbnR9KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXBsYWNlbWVudHNGcm9tU2xhdmVzKys7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUkVFTVBMQVpPIERFU0RFIEVTQ0xBVk9cIik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidGhpcy5yZXBsYWNlbWVudHNGcm9tU2xhdmVzPVwiK3RoaXMucmVwbGFjZW1lbnRzRnJvbVNsYXZlcylcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ0aGlzLnJlcGxhY2VtZW50cy5sZW5ndGg9XCIrdGhpcy5yZXBsYWNlbWVudHMubGVuZ3RoKVxuICAgIC8vICAgIFx0XHRjb25zb2xlLmxvZyhcIiBSRUVNUExBWk8gUkVBTElaQURPMiBcIit0aGlzLnJlcGxhY2VtZW50cy5sZW5ndGgpICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSAgICAgICAgICAgICAgXG4gICAgICAgIH0gICAgICAgIFxuICAgIH1cbiAgICBwcm9jZXNzU3RhcnQoZGF0YSl7XG4gICAgICAgIGNvbnNvbGUubG9nKFwicHJvY2Vzc1N0YXJ0KGRhdGEpe1wiKVxuICAgICAgICBpZiAoIXRoaXMucnVubmluZyl7XG4gICAgICAgICAgICB2YXIgYWxnb3JpdGhtVHlwZT1kYXRhW0NvbW1vbi5Db25zdGFudHMuUGFyYW1ldGVyVHlwZXMuQUxHT1JJVEhNX1RZUEVdO1xuICAgICAgICAgICAgc3dpdGNoKGFsZ29yaXRobVR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIENvbW1vbi5Db25zdGFudHMuQWxnb3JpdGhtVHlwZXMuQ1ZSUDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kYXRhQWxnb3JpdGhtID0gdGhpcy5wcm9jZXNzU3RhcnRDVlJQKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAvL1RPRE8gLT4gQlJPQURDQVNUIHkgZ3VhcmRhciBkYXRvcyBwYXJhIGNhZGEgdmV6IHF1ZSBzZSBjb25lY3RlIHVuIG51ZXZvIGNsaWVudGUgZW52aWFybGUgdG9kby5cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGFydCgpOyBcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGF0YUFsZ29yaXRobTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBDb21tb24uQ29uc3RhbnRzLkFsZ29yaXRobVR5cGVzLk9ORV9NQVg6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGF0YUFsZ29yaXRobSA9IHRoaXMucHJvY2Vzc1N0YXJ0T25lTWF4KGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0KCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRhdGFBbGdvcml0aG07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrOyAgXG4gICAgICAgICAgICAgICAgY2FzZSBDb21tb24uQ29uc3RhbnRzLkFsZ29yaXRobVR5cGVzLkNWUlBfTE9DQUxfREFUQTpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kYXRhQWxnb3JpdGhtID0gdGhpcy5wcm9jZXNzU3RhcnRDVlJQTG9jYWxEYXRhKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAvL1RPRE8gLT4gQlJPQURDQVNUIHkgZ3VhcmRhciBkYXRvcyBwYXJhIGNhZGEgdmV6IHF1ZSBzZSBjb25lY3RlIHVuIG51ZXZvIGNsaWVudGUgZW52aWFybGUgdG9kby5cbiAgICAvLyAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0KCk7IFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kYXRhQWxnb3JpdGhtO1xuICAgICAgICAgICAgICAgICAgICBicmVhazsgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFUlJPUjogRWwgbcOpdG9kbyByZWNpYmlkbyBubyBleGlzdGUuXCIpO1xuICAgICAgICAgICAgfSAgICAgICAgICAgICAgICBcbiAgICAgICAgfWVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgXG4gICAgfVxuICAgIHN0YXJ0KCl7XG4gICAgICAgIHNldEltbWVkaWF0ZSggICAgKCk9PntcbiAgICAgICAgICAgIHRoaXMuc3RhcnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICB0aGlzLnJ1bm5pbmc9dHJ1ZTsgICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMucnVuKCk7XG4vLyAgICAgICAgICAgIHRoaXMubXlFbWl0dGVyLmVtaXQoJ25leHRTdGVwJyk7XG4gICAgICAgIH0pOyAgICAgICAgXG4gICAgfVxuICAgIHByb2Nlc3NTdGFydENWUlAoZGF0YSl7XG4gICAgICAgIENvbW1vbi5zZXRBbGdvcml0aG0oQ29tbW9uLkNvbnN0YW50cy5BbGdvcml0aG1UeXBlcy5DVlJQKTsgLy9UT0RPIE5FQ0VTSVRPIEVMIEFMR09SSVRNTyBESVNUUklCVUlET1xuICAgICAgICB2YXIgZGF0YVJlc3BvbnNlPXt9O1xuXG4gICAgICAgIHZhciBhcnJheUN1c3RvbWVycyA9IGRhdGFbQ29tbW9uLkNvbnN0YW50cy5QYXJhbWV0ZXJUeXBlcy5BUlJBWV9DVVNUT01FUlNdO1xuICAgICAgICBmb3IgKHZhciBpPTA7aTxhcnJheUN1c3RvbWVycy5sZW5ndGg7aSsrKXtcbiAgICAgICAgICAgIGFycmF5Q3VzdG9tZXJzW2ldPUNvbW1vbi5FbGVtZW50cy5DdXN0b21lci5mcm9tSlNPTihhcnJheUN1c3RvbWVyc1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1hdHJpeENvc3Q9ZGF0YVtDb21tb24uQ29uc3RhbnRzLlBhcmFtZXRlclR5cGVzLk1BVFJJWF9DT1NUXTtcblxuICAgICAgICB2YXIgblRydWNrcz1kYXRhW0NvbW1vbi5Db25zdGFudHMuUGFyYW1ldGVyVHlwZXMuTl9UUlVDS1NdO1xuXG4gICAgICAgIHZhciB0cnVja0NhcGFjaXR5PWRhdGFbQ29tbW9uLkNvbnN0YW50cy5QYXJhbWV0ZXJUeXBlcy5UUlVDS19DQVBBQ0lUWV07XG4gICAgICAgIHZhciB0cnVja1RpbWU9ZGF0YVtDb21tb24uQ29uc3RhbnRzLlBhcmFtZXRlclR5cGVzLlRSVUNLX1RJTUVdO1xuICAgICAgICB2YXIgcGVuYWxDYXA9ZGF0YVtDb21tb24uQ29uc3RhbnRzLlBhcmFtZXRlclR5cGVzLlBFTkFMX0NBUF07ICAgXG4gICAgICAgIHZhciBwZW5hbFRpbWU9ZGF0YVtDb21tb24uQ29uc3RhbnRzLlBhcmFtZXRlclR5cGVzLlBFTkFMX1RJTUVdOyAgIFxuICAgICAgICBcbiAgICAgICAgdmFyIHByb2JsZW0gPSBuZXcgQ29tbW9uLkVsZW1lbnRzLlByb2JsZW0oKTtcbiAgICAgICAgcHJvYmxlbS5pbml0aWFsaXplKG1hdHJpeENvc3QsIGFycmF5Q3VzdG9tZXJzLCB0cnVja0NhcGFjaXR5LCB0cnVja1RpbWUsIHBlbmFsQ2FwLHBlbmFsVGltZSk7XG4gICAgICAgIHByb2JsZW0udGFyZ2V0Rml0bmVzcz1kYXRhW0NvbW1vbi5Db25zdGFudHMuUGFyYW1ldGVyVHlwZXMuVEFSR0VUX0ZJVE5FU1NdOyAgO1xuXG5cblxuICAgICAgICB2YXIgcHJvYkNyb3NzPWRhdGFbQ29tbW9uLkNvbnN0YW50cy5QYXJhbWV0ZXJUeXBlcy5QUk9CX0NST1NTXTsgXG4gICAgICAgIHZhciBwcm9iTXV0PWRhdGFbQ29tbW9uLkNvbnN0YW50cy5QYXJhbWV0ZXJUeXBlcy5QUk9CX01VVF07IFxuICAgICAgICB2YXIgcHJvYkxTPWRhdGFbQ29tbW9uLkNvbnN0YW50cy5QYXJhbWV0ZXJUeXBlcy5QUk9CX0xTXTsgICAgICAgIFxuICAgICAgICBcbiAgICAgICAgdmFyIG1heFN0ZXBzPWRhdGFbQ29tbW9uLkNvbnN0YW50cy5QYXJhbWV0ZXJUeXBlcy5NQVhfU1RFUFNdOyBcbi8vICAgICAgICB2YXIgbWF4U3RlcHM9NDA7IFxuICAgICAgICBcbiAgICAgICAgdmFyIHBvcFNpemUgPSBkYXRhW0NvbW1vbi5Db25zdGFudHMuUGFyYW1ldGVyVHlwZXMuUE9QX1NJWkVdOyAgICAgICAgIFxuICAgICAgICBcbiAgICAgICAgdGhpcy5hbGdvcml0aG0gPSBuZXcgQ29tbW9uLkVsZW1lbnRzLkFsZ29yaXRobUNWUlAocHJvYmxlbSwgcHJvYkNyb3NzLHByb2JNdXQscHJvYkxTLCBtYXhTdGVwcyk7XG5cbiAgICAgICAgdGhpcy5hbGdvcml0aG0uaW5pdGlhbGl6ZShwb3BTaXplLCBwYXJzZUludChhcnJheUN1c3RvbWVycy5sZW5ndGgpK3BhcnNlSW50KG5UcnVja3MpKTtcbiAgICAgICAgXG4gICAgICAgIGRhdGFSZXNwb25zZVtDb21tb24uQ29uc3RhbnRzLlBhcmFtZXRlclR5cGVzLkFMR09SSVRITV9UWVBFXT1Db21tb24uQ29uc3RhbnRzLkFsZ29yaXRobVR5cGVzLkNWUlA7XG4gICAgICAgIGRhdGFSZXNwb25zZVtDb21tb24uQ29uc3RhbnRzLlBhcmFtZXRlclR5cGVzLlBST0JMRU1dPXByb2JsZW07XG4gICAgICAgIGRhdGFSZXNwb25zZVtDb21tb24uQ29uc3RhbnRzLlBhcmFtZXRlclR5cGVzLlBPUFVMQVRJT05dID0gdGhpcy5hbGdvcml0aG0uZ2V0UG9wdWxhdGlvbigpO1xuICAgICAgICBkYXRhUmVzcG9uc2VbQ29tbW9uLkNvbnN0YW50cy5QYXJhbWV0ZXJUeXBlcy5QUk9CX0NST1NTXT1wcm9iQ3Jvc3M7XG4gICAgICAgIGRhdGFSZXNwb25zZVtDb21tb24uQ29uc3RhbnRzLlBhcmFtZXRlclR5cGVzLlBST0JfTVVUXT1wcm9iTXV0O1xuICAgICAgICBkYXRhUmVzcG9uc2VbQ29tbW9uLkNvbnN0YW50cy5QYXJhbWV0ZXJUeXBlcy5QUk9CX0xTXT1wcm9iTFM7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZGF0YVJlc3BvbnNlOyAgICAgICAgXG4gICAgfVxuICAgIHByb2Nlc3NTdGFydENWUlBMb2NhbERhdGEoZGF0YSl7XG4gICAgICAgIENvbW1vbi5zZXRBbGdvcml0aG0oQ29tbW9uLkNvbnN0YW50cy5BbGdvcml0aG1UeXBlcy5DVlJQKTsgLy9UT0RPIE5FQ0VTSVRPIEVMIEFMR09SSVRNTyBESVNUUklCVUlET1xuICAgICAgICB0aGlzLmxvYWRDVlJQUHJvYmxlbUZyb21GaWxlKFwiLi9sYXllcnMvdHJhbnNtaXNzaW9uL3dlYnNvY2tldHMvd2ViL1wiK0NvbW1vbi5Db25zdGFudHMuRmlsZU5hbWUsKCk9PntcbiAgICAgICAgICAgIHRoaXMuc3RhcnQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBkYXRhUmVzcG9uc2U9e307ICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgZGF0YVJlc3BvbnNlW0NvbW1vbi5Db25zdGFudHMuUGFyYW1ldGVyVHlwZXMuQUxHT1JJVEhNX1RZUEVdPUNvbW1vbi5Db25zdGFudHMuQWxnb3JpdGhtVHlwZXMuQ1ZSUF9MT0NBTF9EQVRBOyAgICAgIFxuICAgICAgICByZXR1cm4gZGF0YVJlc3BvbnNlOyAgICAgICAgIFxuICAgIH1cbiAgICBsb2FkQ1ZSUFByb2JsZW1Gcm9tRmlsZShmaWxlLGNhbGxiYWNrKXsgXG4gICAgICAgICB2YXIgc3RhcnRUaW1lTG9hZGluZyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgZnMgPSByZXF1aXJlKCdmcycpOyAgXG4gICAgICAgIGZzLnJlYWRGaWxlKCBcIi4vXCIrZmlsZSwndXRmOCcsIChlcnIsIGpzb25Qcm9ibGVtKT0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgIHRocm93IGVycjsgXG4gICAgICAgICAgICB9ICAgICAgICAgXG4gICAgICAgICAgICBcbi8vICAgICAgICAgICAgdmFyIHNlZWQgPSBDb21tb24uTWF0aHMuY3JlYXRlU2VlZCgxNDE2NTA5MzkpO1xuLy8gICAgICAgICAgICBNYXRoLnJhbmRvbT1zZWVkOyAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBqc29uUHJvYmxlbT1KU09OLnBhcnNlKGpzb25Qcm9ibGVtKTtcbiAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBDb21tb24uc2V0QWxnb3JpdGhtKENvbW1vbi5Db25zdGFudHMuQWxnb3JpdGhtVHlwZXMuQ1ZSUCk7XG5cbiAgICAgICAgICAgIHZhciBwcm9ibGVtID0gQ29tbW9uLkVsZW1lbnRzLlByb2JsZW1DVlJQLmZyb21KU09OKGpzb25Qcm9ibGVtLnByb2JsZW0pO1xuICAgICAgICAgICAgXG4vLyAgICAgICAgICAgIHByb2JsZW0udGFyZ2V0Rml0bmVzcz0tMjE4NTAwMDAwOyAvLzIwMDAgICAgICAgICAgICAgXG4vLyAgICAgICAgICAgIHByb2JsZW0udGFyZ2V0Rml0bmVzcz0tMjE1MDAwMDAwOyAvLzIwMDAgICAgICAgICAgICBcbi8vICAgICAgICAgICAgcHJvYmxlbS50YXJnZXRGaXRuZXNzPS0xMTAwMDAwMDA7IC8vMTAwMFxuLy8gICAgICAgICAgICBwcm9ibGVtLnRhcmdldEZpdG5lc3M9LTEwMDAwMDAwMDsgLy8xMDAwIG3DoXMgbGVudG9cbi8vICAgICAgICAgICAgcHJvYmxlbS50YXJnZXRGaXRuZXNzPSAtOTAwMDAwMDA7IC8vMTAwMCBhw7puIG3DoXMgbGVudG9cbi8vICAgICAgICAgICAgcHJvYmxlbS50YXJnZXRGaXRuZXNzPS01MDAwMDAwMDsgLy81MDBcbi8vICAgICAgICAgICAgICBwcm9ibGVtLnRhcmdldEZpdG5lc3M9LTQ1MDAwMDAwOyAvLzUwMCBtw6FzIGxlbnRvXG4vLyAgICAgICAgICAgICAgcHJvYmxlbS50YXJnZXRGaXRuZXNzPS00MDAwMDAwMDsgLy81MDAgbcOhcyBsZW50byAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIHByb2JsZW0udGFyZ2V0Rml0bmVzcz0tMTQwMDAwMDA7IC8vMjAwXG4gICAgICAgICAgICB2YXIgblRydWNrcyA9IGpzb25Qcm9ibGVtLm5UcnVja3M7XG4vLyAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiIyMjXCIrSlNPTi5zdHJpbmdpZnkoblRydWNrcykpXG5cblxuICAgICAgICAgICAgdmFyIGNyb3NzUHJvYiA9IGpzb25Qcm9ibGVtLmNyb3NzUHJvYjtcbi8vICAgICAgICAgICAgY29uc29sZS5sb2coXCIjIyNcIitKU09OLnN0cmluZ2lmeShjcm9zc1Byb2IpKVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgbXV0YXRlUHJvYiA9IGpzb25Qcm9ibGVtLm11dGF0ZVByb2I7XG4vLyAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiIyMjXCIrSlNPTi5zdHJpbmdpZnkobXV0YXRlUHJvYikpXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBMU1Byb2IgPSBqc29uUHJvYmxlbS5MU1Byb2I7XG4vLyAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiIyMjXCIrSlNPTi5zdHJpbmdpZnkoTFNQcm9iKSkgICAgICAgICAgICBcbiAgICAgICAgICAgIFxuLy8gICAgICAgICAgICB2YXIgbWF4U3RlcHMgPSBqc29uUHJvYmxlbS5tYXhTdGVwcztcbiAgICAgICAgICAgIHZhciBtYXhTdGVwcyA9IDEwMDA7ICAgICAgICAgICAgXG4gICAgICAgICAgICBcbi8vICAgICAgICAgICAgY29uc29sZS5sb2coXCIjIyNcIitKU09OLnN0cmluZ2lmeShtYXhTdGVwcykpICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInZhbW9zIGEgY2FyZ2FyIHBvYmxhY2lvblwiKVxuICAgICAgICAgICAgdmFyIHBvcHVsYXRpb24gPSBDb21tb24uRWxlbWVudHMuUG9wdWxhdGlvbi5mcm9tSlNPTihqc29uUHJvYmxlbS5wb3B1bGF0aW9uKTsgIFxuXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlBPQkxBQ0nDk04gLT4gXCIrcG9wdWxhdGlvbi5wb3AubGVuZ3RoKVxuLy8gICAgICAgICAgICBjb25zb2xlLmxvZyhcIiMjI1wiK0pTT04uc3RyaW5naWZ5KHBvcHVsYXRpb24pKSAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBzZWxmLmFsZ29yaXRobSA9IG5ldyBDb21tb24uRWxlbWVudHMuQWxnb3JpdGhtKHByb2JsZW0sIGNyb3NzUHJvYixtdXRhdGVQcm9iLExTUHJvYiwgbWF4U3RlcHMpO1xuICAgICAgICAgICAgc2VsZi5hbGdvcml0aG0ubG9hZChwb3B1bGF0aW9uKTtcbiAgICAgICAgICAgIHZhciBmaW5hbFRpbWVMb2FkaW5nPSBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJQcm9ibGVtIGxvYWRlZCBpbiBcIisoZmluYWxUaW1lTG9hZGluZy1zdGFydFRpbWVMb2FkaW5nKStcInNlY29uZHNcIilcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUmVhZHkhXCIpXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInRoaXMuYWxnb3JpdGhtPVwiK3RoaXMuYWxnb3JpdGhtKVxuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjaygpO1xuICAgICAgICB9KTsgICBcbiAgICB9ICAgXG4gICAgXG59XG5cbm1vZHVsZS5leHBvcnRzID0gTW9uaXRvckFwcGxpY2F0aW9uO1xuXG5cblxuZnVuY3Rpb24gbG9hZEFycmF5SlNPTkZyb21GaWxlKGZpbGUsY2FsbGJhY2spe1xuICAgICAgICB2YXIgc2VsZj10aGlzO1xuICAgICAgICAgXG4gICAgICAgIGZzLnJlYWRGaWxlKCBcIi4vXCIrZmlsZSwndXRmOCcsICAoZXJyLCBqc29uKT0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ09OVEVOSURPIC0+IFwiK2pzb24rXCJcIilcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgdGhyb3cgZXJyOyBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICBqc29uPUpTT04ucGFyc2UoanNvbik7ICBcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgICAgIGpzb249W107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNhbGxiYWNrKGpzb24pO1xuICAgICAgICB9KTsgICAgXG59XG5cbmZ1bmN0aW9uIHNhdmVBcnJheUpTT05Ub0ZpbGUoanNvbixmaWxlLGNhbGxiYWNrKXtcbiAgICBmcy5vcGVuKFwiLi9cIitmaWxlLCBcInd4XCIsIGZ1bmN0aW9uIChlcnIsIGZkKSB7XG4gICAgICAgIGZzLndyaXRlRmlsZShcIi4vXCIrZmlsZSxKU09OLnN0cmluZ2lmeShqc29uKSwgZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICBpZihlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVGhlIGZpbGUgd2FzIHNhdmVkIVwiKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH0pOyBcbiAgICB9KTsgICAgIFxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jbGFzcyBTbGF2ZUFwcGxpY2F0aW9ue1xuICAgIGNvbnN0cnVjdG9yKCkge31cbiAgICBpbml0aWFsaXplKGNvbW11bmljYXRpb25zKXtcbiAgICAgICAgdGhpcy5jb21tdW5pY2F0aW9uTGF5ZXI9Y29tbXVuaWNhdGlvbnM7XG4gICAgICAgIHRoaXMuYWxnb3JpdGhtPW51bGw7ICAgIFxuICAgIH1cbiAgIFxuICAgIFxuICAgIHByb2Nlc3NSZXNwb25zZSh0eXBlLGRhdGEpe1xuICAgICAgICAvL05vdGhpbmcgdG8gZG9cbiAgICB9ICAgICAgICBcbiAgICBcbiAgICBwcm9jZXNzUmVxdWVzdCh0eXBlLGRhdGEsY2FsbGJhY2spe1xuICAgICAgICBzd2l0Y2godHlwZSkgeyAgICBcbiAgICAgICAgICAgIGNhc2UgQ29tbW9uLkNvbnN0YW50cy5NZXNzYWdlVHlwZXMuU1RBUlQ6XG4gICAgICAgICAgICAgICAgdGhpcy5jb21tdW5pY2F0aW9uTGF5ZXIucmVzZXQoKTtcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NTdGFydChkYXRhLGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICBicmVhazsgICBcbiAgICAgICAgICAgIGNhc2UgQ29tbW9uLkNvbnN0YW50cy5NZXNzYWdlVHlwZXMuTkVYVF9TVEVQOlxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc05leHRTdGVwKGRhdGEsY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgIGJyZWFrOyAgICBcbiAgICAgICAgICAgIGNhc2UgQ29tbW9uLkNvbnN0YW50cy5NZXNzYWdlVHlwZXMuU0hPV19TT0xVVElPTjpcbiAgICAgICAgICAgICAgICB0aGlzLndlYlNob3dTb2x1dGlvbihkYXRhKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU29sdXRpb24gRm91bmQhXCIpXG4gICAgICAgICAgICAgICAgaWYgKENvbW1vbi5Db25zdGFudHMuRnJvbUZpbGUpeyAvL1NpIHNlIGhhIGNhcmdhZG8gZGUgdW4gYXJjaGl2byBzZSByZWNhcmdhIHJhcGlkbyBwYXJhIHBvZGVyIGNvbnRpbnVhciBlbCBURVNULlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRDVlJQUHJvYmxlbUZyb21GaWxlKENvbW1vbi5Db25zdGFudHMuRmlsZU5hbWUpOyAgLy9SRVNFVEVBUiBQUk9CTEVNQSBQQVJBIEVNUEVaQVIgREUgTlVFVk8gUsOBUElET1xuICAgICAgICAgICAgICAgIH0gXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICBicmVhazsgICAgICAgICAgICAgIFxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBcIkVSUk9SOiBFbCBtw6l0b2RvIHJlY2liaWRvIG5vIGV4aXN0ZS5cIjtcbiAgICAgICAgfSAgICAgICAgICBcbiAgICB9XG4gICAgXG4gICAgcHJvY2Vzc05leHRTdGVwKGRhdGEsY2FsbGJhY2speyBcbiAgICAgICAgdGhpcy53ZWJOZXh0U3RlcChkYXRhKTtcbiAgICAgICAgdmFyIHJlcGxhY2VtZW50cyA9ZGF0YVtDb21tb24uQ29uc3RhbnRzLlBhcmFtZXRlclR5cGVzLlJFUExBQ0VNRU5UU107ICAgICAgIFxuLy8gICAgICAgIGNvbnNvbGUubG9nKFwidG90YWwgcmVwbGFjZW1lbnRzIC0+IFwiK3JlcGxhY2VtZW50cy5sZW5ndGgpIFxuICAgICAgICB0aGlzLmFsZ29yaXRobS5kb1JlcGxhY2VtZW50cyhyZXBsYWNlbWVudHMpO1xuICAgICAgICB0aGlzLmFsZ29yaXRobS5ydW5DYWxsYmFjaygoc29uKT0+e1xuICAgICAgICAgICAgY2FsbGJhY2soc29uKTtcbiAgICAgICAgfSk7IC8vRGV2dWVsdmUgaGlqbyAgICAgIFxuICAgIH0gICAgXG4gICAgXG5cbiAgICBcbiAgICBcbiAgICBwcm9jZXNzU3RhcnQoZGF0YSxjYWxsYmFjayl7XG4gICAgICAgIHRoaXMud2ViU3RhcnQoZGF0YSk7XG4gICAgICAgIHZhciBhbGdvcml0aG1UeXBlPWRhdGFbQ29tbW9uLkNvbnN0YW50cy5QYXJhbWV0ZXJUeXBlcy5BTEdPUklUSE1fVFlQRV07XG4gICAgICAgIHN3aXRjaChhbGdvcml0aG1UeXBlKSB7XG4gICAgICAgICAgICBjYXNlIENvbW1vbi5Db25zdGFudHMuQWxnb3JpdGhtVHlwZXMuQ1ZSUDpcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NTdGFydENWUlBSZXNwb25zZShkYXRhKTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBDb21tb24uQ29uc3RhbnRzLkFsZ29yaXRobVR5cGVzLk9ORV9NQVg6XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzU3RhcnRPbmVNYXhSZXNwb25zZShkYXRhKTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIGJyZWFrOyAgIFxuICAgICAgICAgICAgY2FzZSBDb21tb24uQ29uc3RhbnRzLkFsZ29yaXRobVR5cGVzLkNWUlBfTE9DQUxfREFUQTpcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NTdGFydENWUlBMb2NhbERhdGFSZXNwb25zZShkYXRhKTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIGJyZWFrOyAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFUlJPUjogRWwgbcOpdG9kbyByZWNpYmlkbyBubyBleGlzdGUuXCIpO1xuICAgICAgICB9ICAgICAgICAgXG4gICAgfVxuICAgIHByb2Nlc3NTdGFydENWUlBSZXNwb25zZShkYXRhKXtcbiAgICBcdGNvbnNvbGUubG9nKFwiICAgIHByb2Nlc3NTdGFydENWUlBSZXNwb25zZSA6IGZ1bmN0aW9uKGRhdGEpeyBcIilcbiAgICAgICAgQ29tbW9uLnNldEFsZ29yaXRobShDb21tb24uQ29uc3RhbnRzLkFsZ29yaXRobVR5cGVzLkNWUlApO1xuICAgICAgICB2YXIgcHJvYmxlbSA9IENvbW1vbi5FbGVtZW50cy5Qcm9ibGVtLmZyb21KU09OKGRhdGFbQ29tbW9uLkNvbnN0YW50cy5QYXJhbWV0ZXJUeXBlcy5QUk9CTEVNXSk7XG4gICAgICAgIHZhciBwb3B1bGF0aW9uPUNvbW1vbi5FbGVtZW50cy5Qb3B1bGF0aW9uLmZyb21KU09OKGRhdGFbQ29tbW9uLkNvbnN0YW50cy5QYXJhbWV0ZXJUeXBlcy5QT1BVTEFUSU9OXSk7XG4gICAgICAgIHZhciBwcm9iQ3Jvc3M9ZGF0YVtDb21tb24uQ29uc3RhbnRzLlBhcmFtZXRlclR5cGVzLlBST0JfQ1JPU1NdO1xuICAgICAgICB2YXIgcHJvYk11dD1kYXRhW0NvbW1vbi5Db25zdGFudHMuUGFyYW1ldGVyVHlwZXMuUFJPQl9NVVRdO1xuICAgICAgICB2YXIgcHJvYkxTPWRhdGFbQ29tbW9uLkNvbnN0YW50cy5QYXJhbWV0ZXJUeXBlcy5QUk9CX0xTXTsgXG4gICAgICAgIHRoaXMuYWxnb3JpdGhtID0gbmV3IENvbW1vbi5FbGVtZW50cy5BbGdvcml0aG1DVlJQKHByb2JsZW0sIHByb2JDcm9zcyxwcm9iTXV0LHByb2JMUywgLTEpOyAvL21heFN0ZXBzPS0xICAgICAgXG4gICAgICAgIHRoaXMuYWxnb3JpdGhtLmxvYWQocG9wdWxhdGlvbik7ICAgICAgICBcbiAgICB9XG4gICAgcHJvY2Vzc1N0YXJ0Q1ZSUExvY2FsRGF0YVJlc3BvbnNlKGRhdGEpe1xuICAgIFx0Y29uc29sZS5sb2coXCIgICAgcHJvY2Vzc1N0YXJ0Q1ZSUExvY2FsRGF0YVJlc3BvbnNlIDogZnVuY3Rpb24oZGF0YSl7IFwiKVxuICAgICAgICBDb21tb24uc2V0QWxnb3JpdGhtKENvbW1vbi5Db25zdGFudHMuQWxnb3JpdGhtVHlwZXMuQ1ZSUCk7ICAgICAgICBcbiAgICB9XG4gICAgcHJvY2Vzc1N0YXJ0T25lTWF4UmVzcG9uc2UoZGF0YSl7IFxuICAgICAgICAvL1RPRE9cbiAgICBcdENvbW1vbi5zZXRBbGdvcml0aG0oQ29tbW9uLkNvbnN0YW50cy5BbGdvcml0aG1UeXBlcy5PTkVfTUFYKTtcbiAgICBcdHZhciBwcm9ibGVtID0gbmV3IENvbW1vbi5FbGVtZW50cy5Qcm9ibGVtKCk7XG4gICAgICAgIHZhciBwcm9iQ3Jvc3M9ZGF0YVtDb21tb24uQ29uc3RhbnRzLlBhcmFtZXRlclR5cGVzLlBST0JfQ1JPU1NdO1xuICAgICAgICB2YXIgcHJvYk11dD1kYXRhW0NvbW1vbi5Db25zdGFudHMuUGFyYW1ldGVyVHlwZXMuUFJPQl9NVVRdOyAgXG4gICAgICAgIHZhciBwb3B1bGF0aW9uPUNvbW1vbi5FbGVtZW50cy5Qb3B1bGF0aW9uLmZyb21KU09OKGRhdGFbQ29tbW9uLkNvbnN0YW50cy5QYXJhbWV0ZXJUeXBlcy5QT1BVTEFUSU9OXSk7ICAgICAgICBcbiAgICAgICAgdGhpcy5hbGdvcml0aG0gPSBuZXcgQ29tbW9uLkVsZW1lbnRzLkFsZ29yaXRobU9uZU1heChwcm9ibGVtLHByb2JDcm9zcyxwcm9iTXV0LCAtMSk7IC8vbWF4U3RlcHM9LTFcbiAgICAgICAgdGhpcy5hbGdvcml0aG0ubG9hZChwb3B1bGF0aW9uKTsgIFxuLy8gICAgICAgIGNvbnNvbGUubG9nKFwiQUxHT1JJVE1PIFwiK0pTT04uc3RyaW5naWZ5KHRoaXMuYWxnb3JpdGhtKSk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwicHJvY2Vzc1N0YXJ0T25lTWF4UmVzcG9uc2VcIikgICAgICAgIFxuICAgIH1cbiAgICBcbiAgICB3ZWJOZXh0U3RlcChkYXRhKXtcbiAgICAgICAgaWYgKGRhdGFbXCJSRVBMQUNFTUVOVFNcIl0pe1xuICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJlcGxhY2VtZW50cyB0byBkbyAtPiBcIitkYXRhW1wiUkVQTEFDRU1FTlRTXCJdLmxlbmd0aCk7XG4gICAgICAgfSAgICAgICAgICAgXG4gICAgfVxuICAgIHdlYlNob3dTb2x1dGlvbihkYXRhKXtcbiAgICAgICAgcnVubmluZz1mYWxzZTtcbiAgICAgICAgaWYgKHN0YXJ0ZWRQcm9ibGVtKXtcbiAgICAgICAgICAgIHN0YXJ0ZWRQcm9ibGVtPWZhbHNlO1xuICAgICAgICAgICAgc2F2ZVNvbHV0aW9uc0luTGlzdChkYXRhKTtcbiAgICAgICAgICAgICQoJy5zaG93X3NvbHV0aW9uX21lbnUnKS5zaG93KCk7XG4gICAgICAgICAgICAkKCcuY3JlYXRlX3Byb2JsZW1fbWVudScpLmhpZGUoKTtcbiAgICAgICAgICAgICQubW9iaWxlLnBhZ2VDb250YWluZXIucGFnZWNvbnRhaW5lcihcImNoYW5nZVwiLCBcIiNtYXBfcGFnZVwiLCBudWxsKTtcbiAgICAgICAgICAgIGZvciAodmFyIGk9MDtpPG1hcmtlcnMubGVuZ3RoO2krKyl7XG4gICAgICAgICAgICAgICAgbWFya2Vyc1tpXS5zZXREcmFnZ2FibGUoZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpeyBzaG93TWFya2Vyc1NvbHV0aW9uKCk7IH0sNTAwKTsgICAgICAgICAgICAgIFxuICAgICAgICB9ICAgIFxuICAgIH1cbiAgICB3ZWJTdGFydChkYXRhKXtcbiAgICAgICAgcnVubmluZz10cnVlO1xuICAgICAgICBpZiAod2FpdGluZ1N0YXJ0KXtcbiAgICAgICAgICAgICAgc3RhcnRlZFByb2JsZW09dHJ1ZTtcbiAgICAgICAgICAgICAgd2FpdGluZ1N0YXJ0PWZhbHNlO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXJ0ZWRQcm9ibGVtKXtcbiAgICAgICAgICAgICAgJCgnI21lc3NhZ2VzJykucHJlcGVuZCgkKCc8bGk+JykudGV4dChcIldvcmsgaW4gcHJvZ3Jlc3Mgd2FzIGNhbmNlbGxlZCBieSBvdGhlciB1c2VyLiBBIG5ldyBQcm9ibGVtIGlzIHN0YXJ0aW5nLlwiKSk7XG4gICAgICAgICAgICAgIHN0YXJ0ZWRQcm9ibGVtPWZhbHNlOyAvL1NlIGNhbmNlbGEgZWwgYW50aWd1byB0cmFiYWpvICAgICAgICAgICAgICAgICAgXG4gICAgICAgIH0gICAgICAgIFxuICAgIH1cblxuICAgIHN0b3AoKXtcbiAgICAgICAgdGhpcy5jb21tdW5pY2F0aW9uTGF5ZXIuc3RvcCgpO1xuICAgIH1cblxuICAgIHN0YXJ0Q1ZSUDMobWF4U3RlcHMscG9wU2l6ZSxtYXRyaXhDb3N0LGFycmF5Q3VzdG9tZXJzLHByb2JNdXQscHJvYkNyb3NzLHByb2JMUyxuVHJ1Y2tzLHRydWNrQ2FwYWNpdHksdHJ1Y2tUaW1lLHBlbmFsQ2FwLHBlbmFsVGltZSx0YXJnZXRGaXRuZXNzKXsgXG4gICAgICAgIENvbW1vbi5zZXRBbGdvcml0aG0oQ29tbW9uLkNvbnN0YW50cy5BbGdvcml0aG1UeXBlcy5DVlJQKTsgLy9UT0RPIE5FQ0VTSVRPIEVMIEFMR09SSVRNTyBESVNUUklCVUlET1xuICAgICBcbiAgICAgICAgdmFyIGRhdGEgPSB7fTtcbiAgICAgICAgZGF0YVtDb21tb24uQ29uc3RhbnRzLlBhcmFtZXRlclR5cGVzLkFMR09SSVRITV9UWVBFXSA9IENvbW1vbi5Db25zdGFudHMuQWxnb3JpdGhtVHlwZXMuQ1ZSUDtcbiAgICAgICAgZGF0YVtDb21tb24uQ29uc3RhbnRzLlBhcmFtZXRlclR5cGVzLkFSUkFZX0NVU1RPTUVSU10gPSBhcnJheUN1c3RvbWVycztcbiAgICAgICAgZGF0YVtDb21tb24uQ29uc3RhbnRzLlBhcmFtZXRlclR5cGVzLk1BVFJJWF9DT1NUXSA9IG1hdHJpeENvc3Q7XG4gICAgICAgIGRhdGFbQ29tbW9uLkNvbnN0YW50cy5QYXJhbWV0ZXJUeXBlcy5OX1RSVUNLU10gPSBuVHJ1Y2tzO1xuICAgICAgICBkYXRhW0NvbW1vbi5Db25zdGFudHMuUGFyYW1ldGVyVHlwZXMuVFJVQ0tfQ0FQQUNJVFldID0gdHJ1Y2tDYXBhY2l0eTtcbiAgICAgICAgZGF0YVtDb21tb24uQ29uc3RhbnRzLlBhcmFtZXRlclR5cGVzLlRSVUNLX1RJTUVdID0gdHJ1Y2tUaW1lO1xuICAgICAgICBkYXRhW0NvbW1vbi5Db25zdGFudHMuUGFyYW1ldGVyVHlwZXMuUEVOQUxfQ0FQXSA9IHBlbmFsQ2FwO1xuICAgICAgICBkYXRhW0NvbW1vbi5Db25zdGFudHMuUGFyYW1ldGVyVHlwZXMuUEVOQUxfVElNRV0gPSBwZW5hbFRpbWU7XG4gICAgICAgIGRhdGFbQ29tbW9uLkNvbnN0YW50cy5QYXJhbWV0ZXJUeXBlcy5UQVJHRVRfRklUTkVTU10gPSB0YXJnZXRGaXRuZXNzOyBcbiAgICAgICAgZGF0YVtDb21tb24uQ29uc3RhbnRzLlBhcmFtZXRlclR5cGVzLlBST0JfQ1JPU1NdID0gcHJvYkNyb3NzO1xuICAgICAgICBkYXRhW0NvbW1vbi5Db25zdGFudHMuUGFyYW1ldGVyVHlwZXMuUFJPQl9NVVRdID0gcHJvYk11dDtcbiAgICAgICAgZGF0YVtDb21tb24uQ29uc3RhbnRzLlBhcmFtZXRlclR5cGVzLlBST0JfTFNdID0gcHJvYkxTO1xuICAgICAgICBkYXRhW0NvbW1vbi5Db25zdGFudHMuUGFyYW1ldGVyVHlwZXMuTUFYX1NURVBTXSA9IG1heFN0ZXBzO1xuICAgICAgICBkYXRhW0NvbW1vbi5Db25zdGFudHMuUGFyYW1ldGVyVHlwZXMuUE9QX1NJWkVdID0gcG9wU2l6ZTsgICAgICAgIFxuICAgICAgICB0aGlzLmNvbW11bmljYXRpb25MYXllci5zdGFydChkYXRhKTsgICAgICAgIFxuICAgIH1cbiAgICBzdGFydENWUlBGcm9tRmlsZSgpe1xuICAgICAgICBDb21tb24uc2V0QWxnb3JpdGhtKENvbW1vbi5Db25zdGFudHMuQWxnb3JpdGhtVHlwZXMuQ1ZSUCk7IC8vVE9ETyBORUNFU0lUTyBFTCBBTEdPUklUTU8gRElTVFJJQlVJRE9cbiAgICAgXG4gICAgICAgIHZhciBkYXRhID0ge307XG4gICAgICAgIGRhdGFbQ29tbW9uLkNvbnN0YW50cy5QYXJhbWV0ZXJUeXBlcy5BTEdPUklUSE1fVFlQRV0gPSBDb21tb24uQ29uc3RhbnRzLkFsZ29yaXRobVR5cGVzLkNWUlBfTE9DQUxfREFUQTsgICAgXG4gICAgICAgIHRoaXMuY29tbXVuaWNhdGlvbkxheWVyLnN0YXJ0KGRhdGEpOyAgICAgICAgXG4gICAgfVxuICAgIHN0YXJ0T25lTWF4KCl7IFxuICAgICAgICBDb21tb24uc2V0QWxnb3JpdGhtKENvbW1vbi5Db25zdGFudHMuQWxnb3JpdGhtVHlwZXMuT05FX01BWCk7IC8vVE9ETyBORUNFU0lUTyBFTCBBTEdPUklUTU8gRElTVFJJQlVJRE8gICAgXHRcbiAgICAgICAgXG4vLyAgICAgICAgdmFyIHBvcFNpemU9NTEyO1xuICAgICAgICB2YXIgcG9wU2l6ZT0yNTY7XG4gICAgICAgIHZhciB0YXJnZXRGaXRuZXNzPXBvcFNpemU7XG4vLyAgICAgICAgdmFyIGNocm9tTGVuZ3RoID01MTI7XG4gICAgICAgIHZhciBjaHJvbUxlbmd0aCA9MjU2O1xuICAgICAgICB2YXIgcHJvYkNyb3NzPTAuODtcbiAgICAgICAgdmFyIHByb2JNdXQ9MS4wL2Nocm9tTGVuZ3RoO1xuICAgICAgICB2YXIgbWF4U3RlcHM9NTAwMDA7ICAgXG4vLyAgICAgICAgdmFyIG1heFN0ZXBzPTEwMDAwMDsgIFxuICAgICAgICBcbiAgICAgICAgdmFyIGRhdGEgPSB7fTtcbiAgICAgICAgZGF0YVtDb21tb24uQ29uc3RhbnRzLlBhcmFtZXRlclR5cGVzLkFMR09SSVRITV9UWVBFXSA9IENvbW1vbi5Db25zdGFudHMuQWxnb3JpdGhtVHlwZXMuT05FX01BWDtcblxuICAgICAgICBkYXRhW0NvbW1vbi5Db25zdGFudHMuUGFyYW1ldGVyVHlwZXMuUE9QX1NJWkVdID0gcG9wU2l6ZTsgICAgICAgICAgIFxuICAgICAgICBkYXRhW0NvbW1vbi5Db25zdGFudHMuUGFyYW1ldGVyVHlwZXMuVEFSR0VUX0ZJVE5FU1NdID0gdGFyZ2V0Rml0bmVzczsgXG4gICAgICAgIGRhdGFbQ29tbW9uLkNvbnN0YW50cy5QYXJhbWV0ZXJUeXBlcy5DSFJPTV9MRU5HVEhdID0gY2hyb21MZW5ndGg7ICAgICAgICBcbiAgICAgICAgZGF0YVtDb21tb24uQ29uc3RhbnRzLlBhcmFtZXRlclR5cGVzLlBST0JfQ1JPU1NdID0gcHJvYkNyb3NzO1xuICAgICAgICBkYXRhW0NvbW1vbi5Db25zdGFudHMuUGFyYW1ldGVyVHlwZXMuUFJPQl9NVVRdID0gcHJvYk11dDtcbiAgICAgICAgZGF0YVtDb21tb24uQ29uc3RhbnRzLlBhcmFtZXRlclR5cGVzLk1BWF9TVEVQU10gPSBtYXhTdGVwcztcbiAgICAgICAgdGhpcy5jb21tdW5pY2F0aW9uTGF5ZXIuc3RhcnQoZGF0YSk7ICAgICAgICBcbiAgICB9XG4gICAgbG9hZENWUlBQcm9ibGVtRnJvbUZpbGUoZmlsZSxjYWxsYmFjayl7IFxuLy8gICAgICAgICQuZ2V0SlNPTiggXCJkYXRhUHJvYmxlbTIudHh0XCIsIGZ1bmN0aW9uKCBqc29uUHJvYmxlbSApIHtcbiAgICAgICAgIHZhciBzdGFydFRpbWVMb2FkaW5nID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgJC5nZXRKU09OKGZpbGUsIGZ1bmN0aW9uKCBqc29uUHJvYmxlbSApIHsgICAgIFxuICAgICAgICAgICAgXG4vLyAgICAgICAgICAgIHZhciBzZWVkID0gQ29tbW9uLk1hdGhzLmNyZWF0ZVNlZWQoMTQxNjUwOTM5KTtcbi8vICAgICAgICAgICAgTWF0aC5yYW5kb209c2VlZDsgICAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBDb21tb24uc2V0QWxnb3JpdGhtKENvbW1vbi5Db25zdGFudHMuQWxnb3JpdGhtVHlwZXMuQ1ZSUCk7XG5cbiAgICAgICAgICAgIHZhciBwcm9ibGVtID0gQ29tbW9uLkVsZW1lbnRzLlByb2JsZW1DVlJQLmZyb21KU09OKGpzb25Qcm9ibGVtLnByb2JsZW0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgblRydWNrcyA9IGpzb25Qcm9ibGVtLm5UcnVja3M7XG4vLyAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiIyMjXCIrSlNPTi5zdHJpbmdpZnkoblRydWNrcykpXG5cblxuICAgICAgICAgICAgdmFyIGNyb3NzUHJvYiA9IGpzb25Qcm9ibGVtLmNyb3NzUHJvYjtcbi8vICAgICAgICAgICAgY29uc29sZS5sb2coXCIjIyNcIitKU09OLnN0cmluZ2lmeShjcm9zc1Byb2IpKVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgbXV0YXRlUHJvYiA9IGpzb25Qcm9ibGVtLm11dGF0ZVByb2I7XG4vLyAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiIyMjXCIrSlNPTi5zdHJpbmdpZnkobXV0YXRlUHJvYikpXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBMU1Byb2IgPSBqc29uUHJvYmxlbS5MU1Byb2I7XG4vLyAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiIyMjXCIrSlNPTi5zdHJpbmdpZnkoTFNQcm9iKSkgICAgICAgICAgICBcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIG1heFN0ZXBzID0ganNvblByb2JsZW0ubWF4U3RlcHM7XG4vLyAgICAgICAgICAgIHZhciBtYXhTdGVwcyA9IDIwMDsgICAgICAgICAgICAgXG4vLyAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiIyMjXCIrSlNPTi5zdHJpbmdpZnkobWF4U3RlcHMpKSAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgcG9wdWxhdGlvbiA9IENvbW1vbi5FbGVtZW50cy5Qb3B1bGF0aW9uLmZyb21KU09OKGpzb25Qcm9ibGVtLnBvcHVsYXRpb24pOyAgICAgICAgICBcbi8vICAgICAgICAgICAgY29uc29sZS5sb2coXCIjIyNcIitKU09OLnN0cmluZ2lmeShwb3BTaXplKSkgICAgICAgICAgICBcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc2VsZi5hbGdvcml0aG0gPSBuZXcgQ29tbW9uLkVsZW1lbnRzLkFsZ29yaXRobShwcm9ibGVtLCBjcm9zc1Byb2IsbXV0YXRlUHJvYixMU1Byb2IsIG1heFN0ZXBzKTtcbiAgICAgICAgICAgIHNlbGYuYWxnb3JpdGhtLmxvYWQocG9wdWxhdGlvbik7XG4gICAgICAgICAgICB2YXIgZmluYWxUaW1lTG9hZGluZz0gbmV3IERhdGUoKS5nZXRUaW1lKClcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUHJvYmxlbSBsb2FkZWQgaW4gXCIrKGZpbmFsVGltZUxvYWRpbmctc3RhcnRUaW1lTG9hZGluZykrXCJzZWNvbmRzXCIpXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInRoaXMuYWxnb3JpdGhtPVwiK3NlbGYuYWxnb3JpdGhtKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUmVhZHkhXCIpXG4gICAgICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKCk7XG4gICAgICAgIH0pOyAgICAgICAgICAgICAgXG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gU2xhdmVBcHBsaWNhdGlvbjsiLCJcInVzZSBzdHJpY3RcIjsgXG5cbnZhciBOb2RlID0gcmVxdWlyZSgnLi9ub2RlL25vZGUuanMnKTtcblxuY2xhc3MgQ29tbXVuaWNhdGlvbnMgIHtcdFxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLmFwcGxpY2F0aW9uTGF5ZXI9bnVsbDsgLy9VU0FSIFNFVFxuICAgICAgICB0aGlzLnRyYW5zbWlzc2lvbnNMYXllcj1udWxsOyAgIC8vVVNBUiBTRVQgXG4gICAgICAgIHRoaXMubm9kZXMgPSB7fTsgLy9uZXcgTm9kZSgpOyAvL0xpc3RhIGRlIGVzY2xhdm9zXG4gICAgICAgIHRoaXMubXlJZD1udWxsOyAvL05PRE8gREVMIE1PTklUT1IgRVMgMFxuICAgIH1cbiAgICBcbiAgICBzZXRBcHBsaWNhdGlvbkxheWVyKGFwcExheWVyKXtcbiAgICAgICAgdGhpcy5hcHBsaWNhdGlvbkxheWVyPWFwcExheWVyOyAgICBcdFxuICAgIH1cbiAgICBzZXRUcmFuc21pc3Npb25zTGF5ZXIodHJhbnNtaXNzaW9uc0xheWVyKXtcbiAgICAgICAgdGhpcy50cmFuc21pc3Npb25zTGF5ZXI9dHJhbnNtaXNzaW9uc0xheWVyOyAgXHRcbiAgICB9XHRcbiAgICBnZXRBcHBsaWNhdGlvbkxheWVyKCl7XG4gICAgICAgIHJldHVybiB0aGlzLmFwcGxpY2F0aW9uTGF5ZXI7ICAgIFx0XG4gICAgfVxuICAgIFxuICAgIGdldFRyYW5zbWlzc2lvbnNMYXllcigpe1xuICAgICAgICByZXR1cm4gdGhpcy50cmFuc21pc3Npb25zTGF5ZXI7ICAgIFx0XG4gICAgfVxuICAgIGdldE15SWQoKXtcbiAgICAgICAgcmV0dXJuIHRoaXMubXlJZDsgICAgIFx0XG4gICAgfVxuICAgIHNldE15SWQoaWQpe1xuICAgICAgICB0aGlzLm15SWQ9aWQ7ICAgICBcdFxuICAgIH1cbiAgICBhZGROb2RlKGlkTm9kZSl7XG4gICAgXHQvL1RPRE8gLT4gY3JlbyBxdWUgbm8gZXMgbmVjZXNhcmlvIGVzdGEgY29tcHJvYmFjacOzbiBwb3JxdWUgeWEgc2UgaGFjZSBlbiBlbCBuaXZlbCBpbmZlcmlvci4gICAgIFxuICAgICAgICBpZiAoaWROb2RlIHx8IGlkTm9kZSA9PT0gMCl7IC8vTm8gZXMgbnVsbCBvciB1bmRlZmluZWRcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaWROb2RlPVwiK2lkTm9kZSlcbiAgICAgICAgICAgIHZhciBub2RlID0gbmV3IE5vZGUoaWROb2RlKTtcbiAgICAgICAgICAgIHRoaXMubm9kZXNbaWROb2RlXT1ub2RlO1xuICAgICAgICAgICAgcmV0dXJuIG5vZGU7ICAgICAgICAgIFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiaWROb2RlIGlzTnVsbE9yVW5kZWZpbmVkXCIpO1xuICAgICAgICB9ICAgIFx0XG4gICAgfVxuICAgIHJlbW92ZU5vZGUoaWQpe1xuICAgICAgICBkZWxldGUgdGhpcy5ub2Rlc1tpZF07ICAgIFx0XG4gICAgfVxuICAgIGdldE5vZGUoaWROb2RlKXtcbiAgICAgICAgcmV0dXJuIHRoaXMubm9kZXNbaWROb2RlXTsgICAgXHRcbiAgICB9XG4gICAgZ2V0RnJlZU5vZGUoKXtcbiAgICAgICAgZm9yKHZhciBpZE5vZGUgaW4gdGhpcy5ub2Rlcyl7XG4gICAgICAgICAgICBpZiAoIXRoaXMubm9kZXNbaWROb2RlXS5pc0FueU1lc3NhZ2VXYWl0aW5nUmVzcG9uc2UoKSl7XG4vLyAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImdldEZyZWVOb2RlKCk9XCIrSlNPTi5zdHJpbmdpZnkodGhpcy5ub2Rlc1tpZE5vZGVdKSk7XG4vLyAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIjJnZXRGcmVlTm9kZSgpPVwiK3RoaXMubm9kZXNbaWROb2RlXS5pc0FueU1lc3NhZ2VXYWl0aW5nUmVzcG9uc2UoKSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubm9kZXNbaWROb2RlXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSAgICBcbiAgICAgICAgcmV0dXJuIG51bGw7ICAgIFx0XG4gICAgfVxuICAgIHByb2Nlc3NFcnJvcihlcnJvcil7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ29tbXVuaWNhdGlvbiBFcnJyb3IgcmVjZWl2ZWQgZnJvbTogXCIrbWVzc2FnZS5nZXRTb3VyY2VJZCgpKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJFUlJST1I6IFwiK21lc3NhZ2UuZ2V0RXJyb3IoKS5tZXNzYWdlKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJFUlJST1IgU1RBQ0s6IFwiK21lc3NhZ2UuZ2V0RXJyb3IoKS5zdGFjayk7ICBcbiAgICAgICAgdGhyb3cgZXJyb3I7ICAgIFx0XG4gICAgfVxuICAgIFxuICAgIHJlbW92ZU1lc3NhZ2VXYWl0aW5nUmVzcG9uc2UobWVzc2FnZSl7XG4gICAgICAgIHRoaXMubm9kZXNbbWVzc2FnZS5nZXRTb3VyY2VJZCgpXS5yZW1vdmVNZXNzYWdlV2FpdGluZ1Jlc3BvbnNlKG1lc3NhZ2UuZ2V0SWQoKSotMSk7ICAgIFx0XG4gICAgfVxuICAgIHNlbmRUb0FsbCh0eXBlLGRhdGEpe1xuICAgICAgICB2YXIgbXNnID0gbmV3IENvbW1vbi5FbGVtZW50cy5NZXNzYWdlKHR5cGUsbnVsbCwgdGhpcy5nZXRNeUlkKCksIG51bGwsIG51bGwsZGF0YSwgbmV3IERhdGUoKS5nZXRUaW1lKCkpO1xuICAgICAgICB0aGlzLnNlbmRCcm9hZENhc3QobXNnKTsgICAgICAgIFxuICAgIH1cbiAgICBzZW5kVG8odHlwZSx0YXNrLGlkTm9kZSkgeyAgICAgIFxuICAgICAgdmFyIG5vZGUgPSB0aGlzLmdldE5vZGUoaWROb2RlKTtcbiAgICAgIGlmIChub2RlKXsgLy9OTyBFUyBOVUxMIE8gVU5ERUZJTkVEXG4gICAgICAgICAgdmFyIG1lc3NhZ2UgPSBuZXcgQ29tbW9uLkVsZW1lbnRzLk1lc3NhZ2UodHlwZSwgbm9kZS5nZXROZXh0TWVzc2FnZUlkKCksIHRoaXMuZ2V0TXlJZCgpLCBub2RlLmdldElkKCksIG51bGwsIHRhc2ssIG5ldyBEYXRlKCkuZ2V0VGltZSgpKTsgICAgICAgICAgXG4gICAgICAgICAgbm9kZS5hZGRNZXNzYWdlV2FpdGluZ1Jlc3BvbnNlKG1lc3NhZ2UpO1xuICAgICAgICAgIG5vZGUgPSB0aGlzLmdldE5vZGUoaWROb2RlKTtcbiAgICAgICAgICB0aGlzLmdldFRyYW5zbWlzc2lvbnNMYXllcigpLnNlbmQobWVzc2FnZSk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7ICAgICAgIFxuICAgICAgfWVsc2Uge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0gICAgXHRcbiAgICB9ICAgICAgIFxuXG4gICAgXG5cbiAgICBzZW5kQnJvYWRDYXN0KG1lc3NhZ2Upe1xuICAgIFx0dmFyIG5vZGUgPSBudWxsO1x0XG4gICAgICAgIHZhciBkZXN0aW55SWQ7XG4gICAgICAgIHZhciBuZXh0TWVzc2FnZUlkPW51bGw7XG4gICAgICAgIGZvciAoZGVzdGlueUlkIGluIHRoaXMubm9kZXMpIHtcbiAgICAgICAgXHRub2RlPXRoaXMubm9kZXNbZGVzdGlueUlkXTtcbiAgICAgICAgXHRuZXh0TWVzc2FnZUlkPW5vZGUuZ2V0TmV4dE1lc3NhZ2VJZCgpO1xuICAgICAgICBcdG5vZGUuYWRkTWVzc2FnZVdhaXRpbmdSZXNwb25zZShtZXNzYWdlKTtcbiAgICAgICAgICAgIG1lc3NhZ2Uuc2V0RGVzdGlueUlkKGRlc3RpbnlJZCk7XG4gICAgICAgICAgICBtZXNzYWdlLnNldElkKG5leHRNZXNzYWdlSWQpO1xuICAgICAgICAgICAgdGhpcy50cmFuc21pc3Npb25zTGF5ZXIuc2VuZChtZXNzYWdlKTsgIFxuLy8gICAgICAgICAgICBtZXNzYWdlID0gbmV3IENvbW1vbi5FbGVtZW50cy5NZXNzYWdlKG1lc3NhZ2UuZ2V0VHlwZSgpLG1lc3NhZ2UuZ2V0SWQoKSwgdGhpcy5nZXRNeUlkKCksIGRlc3RpbnlJZCwgbWVzc2FnZS5nZXRFcnJvcigpLG1lc3NhZ2UuZ2V0RGF0YSgpLCBtZXNzYWdlLmdldFRpbWVTZW50KTsgXG4gICAgICAgIH0gICAgXHRcbiAgICB9ICAgIFxuICAgIFxuXG4gICAgICAgXG5cbiAgICBnZXRGcmVlTm9kZUlkKCl7XG4gICAgICAgIHZhciBub2RlID0gdGhpcy5nZXRGcmVlTm9kZSgpO1xuICAgICAgICBpZiAobm9kZSB8fCBub2RlPT09MCl7XG4gICAgICAgICAgICByZXR1cm4gbm9kZS5nZXRJZCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0gICAgXHRcbiAgICB9XG4gICAgXG5cbiAgICBcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDb21tdW5pY2F0aW9ucztcblxuIiwiXCJ1c2Ugc3RyaWN0XCI7IFxudmFyIENvbW11bmljYXRpb25zID0gcmVxdWlyZSgnLi9Db21tdW5pY2F0aW9ucy5qcycpO1xuXG5jbGFzcyBNb25pdG9yQ29tbXVuaWNhdGlvbiBleHRlbmRzIENvbW11bmljYXRpb25zICB7XHRcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICBcdHN1cGVyKCk7XG4gICAgICAgIHRoaXMuc2V0TXlJZCgwKTsvL05PRE8gREVMIE1PTklUT1IgRVMgMFxuICAgIH1cbiAgICBpbml0aWFsaXplKGFwcExheWVyLHRyYW5zbWlzc2lvbnNMYXllcikge1xuICAgICAgICB0aGlzLnNldEFwcGxpY2F0aW9uTGF5ZXIoYXBwTGF5ZXIpO1xuICAgICAgICB0aGlzLnNldFRyYW5zbWlzc2lvbnNMYXllcih0cmFuc21pc3Npb25zTGF5ZXIpOyAgICBcdFxuICAgIH1cbiAgICBcbiAgICBwcm9jZXNzUmVxdWVzdChtZXNzYWdlKXtcbiAgICAgICAgaWYgKG1lc3NhZ2UuZ2V0RXJyb3IoKSl7IC8vRVJST1Igbm8gZXMgbnVsbCBvIHVuZGVmaW5lZCAgICAgIFxuICAgICAgICAgICAgdGhpcy5wcm9jZXNzRXJyb3IobWVzc2FnZS5nZXRFcnJvcigpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuYXBwbGljYXRpb25MYXllci5wcm9jZXNzUmVxdWVzdChtZXNzYWdlLmdldFR5cGUoKSxtZXNzYWdlLmdldERhdGEoKSk7IFxuICAgICAgICB9ICAgICAgICAgICAgICAgIFx0XG4gICAgfSAgIFxuICAgIHByb2Nlc3NSZXNwb25zZShtZXNzYWdlKXsgICAgICAgICAgICBcbiAgICAgICAgaWYgKG1lc3NhZ2UuZ2V0RXJyb3IoKSl7IC8vRVJST1Igbm8gZXMgbnVsbCBvIHVuZGVmaW5lZCAgICAgIFxuICAgICAgICAgICAgdGhpcy5wcm9jZXNzRXJyb3IobWVzc2FnZS5nZXRFcnJvcigpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuYXBwbGljYXRpb25MYXllci5wcm9jZXNzUmVzcG9uc2UobWVzc2FnZS5nZXRUeXBlKCksbWVzc2FnZS5nZXREYXRhKCkpOyAgICAgICAgIFxuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZU1lc3NhZ2VXYWl0aW5nUmVzcG9uc2UobWVzc2FnZSk7ICAgICAgICAgICAgICBcbiAgICAgICAgfWNhdGNoKGUpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coZS5tZXNzYWdlKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGUuc3RhY2spO1xuICAgICAgICB9ICBcdFxuICAgIH0gICAgXG4gICAgXG4gICAgcHJvY2Vzc0Nvbm5lY3QoaWROb2RlLGlkTWVzc2FnZSl7IFxuICAgICAgICB2YXIgbm9kZSA9IHRoaXMuYWRkTm9kZShpZE5vZGUpO1xuICAgICAgICB0aGlzLmFwcGxpY2F0aW9uTGF5ZXIucHJvY2Vzc0Nvbm5lY3QoKGRhdGFBbGdvcml0aG0pPT57XG4gICAgICAgICAgICB2YXIgbWVzc2FnZSA9IG5ldyBDb21tb24uRWxlbWVudHMuTWVzc2FnZShDb21tb24uQ29uc3RhbnRzLk1lc3NhZ2VUeXBlcy5DT05ORUNULCBcIi1cIitpZE1lc3NhZ2UsIHRoaXMuZ2V0TXlJZCgpLCBpZE5vZGUsIG51bGwsZGF0YUFsZ29yaXRobSwgbmV3IERhdGUoKS5nZXRUaW1lKCkpOyAvL1JFU1BPTkRFTU9TIENPTiBMQSBJRCBERUwgTlVFVk8gTk9ETyAgICAgXG4gICAgICAgICAgICB0aGlzLnRyYW5zbWlzc2lvbnNMYXllci5zZW5kKG1lc3NhZ2UpO1xuICAgICAgICAgICAgbm9kZS5zZXRDb25uZWN0ZWQodHJ1ZSk7IFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcm9jZXNzRGlzY29ubmVjdFJlcXVlc3QoaWROb2RlKXtcbiAgICAgICAgdGhpcy5hcHBsaWNhdGlvbkxheWVyLnByb2Nlc3NEaXNjb25uZWN0UmVxdWVzdChpZE5vZGUpO1xuICAgICAgICB0aGlzLnJlbW92ZU5vZGUoaWROb2RlKTtcbiAgICB9ICAgXG59XG5cblxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBNb25pdG9yQ29tbXVuaWNhdGlvbjsiLCJcInVzZSBzdHJpY3RcIjsgXG52YXIgQ29tbXVuaWNhdGlvbnMgPSByZXF1aXJlKCcuL0NvbW11bmljYXRpb25zLmpzJyk7XG5cblxuY2xhc3MgU2xhdmVDb21tdW5pY2F0aW9uIGV4dGVuZHMgQ29tbXVuaWNhdGlvbnMgIHtcdFxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgIFx0c3VwZXIoKTtcbiAgICBcdHRoaXMubW9uaXRvcklkPTA7XG4gICAgfVxuXG4gICAgXG4gICAgaW5pdGlhbGl6ZShzcGVjaWZpY0FsZ29yaXRobSwgdHJhbnNtaXNzaW9uc0xheWVyKXtcbiAgICAgICAgdGhpcy5zZXRBcHBsaWNhdGlvbkxheWVyKHNwZWNpZmljQWxnb3JpdGhtKTtcbiAgICAgICAgdGhpcy5zZXRUcmFuc21pc3Npb25zTGF5ZXIodHJhbnNtaXNzaW9uc0xheWVyKTtcbiAgICB9ICAgIFxuXG4gICAgcmVzZXQoKXtcbiAgICAgICAgdGhpcy5ub2Rlc1t0aGlzLm1vbml0b3JJZF0uY2xlYXJNZXNzYWdlc1dhaXRpbmdSZXNwb25zZSgpOyBcbiAgICB9XG5cbiAgICBwcm9jZXNzUmVxdWVzdChtZXNzYWdlKXtcbiAgICAgICAgdmFyIGZlbGlwZT1tZXNzYWdlO1xuICAgICAgICBpZiAobWVzc2FnZS5nZXRFcnJvcigpKXsgLy9FUlJPUiBubyBlcyBudWxsIG8gdW5kZWZpbmVkICAgICAgXG4gICAgICAgICAgICB0aGlzLnByb2Nlc3NFcnJvcihtZXNzYWdlLmdldEVycm9yKCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5hcHBsaWNhdGlvbkxheWVyLnByb2Nlc3NSZXF1ZXN0KG1lc3NhZ2UuZ2V0VHlwZSgpLG1lc3NhZ2UuZ2V0RGF0YSgpLChyZXNwb25zZSk9PntcbiAgICAgICAgICAgICAgICB2YXIgbWVzc2FnZSA9IG5ldyBDb21tb24uRWxlbWVudHMuTWVzc2FnZShmZWxpcGUuZ2V0VHlwZSgpLFwiLVwiK2ZlbGlwZS5nZXRJZCgpLCB0aGlzLmdldE15SWQoKSwgZmVsaXBlLmdldFNvdXJjZUlkKCksIG51bGwscmVzcG9uc2UsIG5ldyBEYXRlKCkuZ2V0VGltZSgpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRyYW5zbWlzc2lvbnNMYXllci5zZW5kKG1lc3NhZ2UpOyAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KTsgXG4gICAgICAgIH0gICAgICAgICAgICBcdFxuICAgIH1cbiAgICBcbiAgICBwcm9jZXNzUmVzcG9uc2UobWVzc2FnZSl7ICAgICAgICBcbiAgICAgICAgLy9UT0RPIE5vdGhpbmcgdG8gZG9cbiAgICB9XG4gXG4gICAgc3RhcnQoZGF0YSl7XG4gICAgICAgIGlmICh0aGlzLmdldE15SWQoKSE9bnVsbCl7XG4gICAgICAgICAgICB2YXIgbm9kZSA9IHRoaXMuZ2V0RnJlZU5vZGUoKTsgLy9DT01PIEVMIMOaTklDTyBOT0RPIFFVRSBUSUVORSBFUyBFTCBNT05JVE9SIFBVRVMgRVMgRUwgUVVFIFZBIEEgQ09HRVIgU0lFTVBSRSAgXG4gICAgICAgICAgICB2YXIgbWVzc2FnZUlkID0gbm9kZS5nZXROZXh0TWVzc2FnZUlkKCk7XG4gICAgICAgICAgICB2YXIgbWVzc2FnZSA9IG5ldyBDb21tb24uRWxlbWVudHMuTWVzc2FnZShDb21tb24uQ29uc3RhbnRzLk1lc3NhZ2VUeXBlcy5TVEFSVCwgbWVzc2FnZUlkLCB0aGlzLmdldE15SWQoKSxub2RlLmdldElkKCksbnVsbCxkYXRhLCBuZXcgRGF0ZSgpLmdldFRpbWUoKSk7XG4gICAgICAgICAgICBub2RlLmFkZE1lc3NhZ2VXYWl0aW5nUmVzcG9uc2UobWVzc2FnZSk7XG4gICAgICAgICAgICB0aGlzLmdldFRyYW5zbWlzc2lvbnNMYXllcigpLnNlbmQobWVzc2FnZSk7ICAgICAgICAgICAgXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvL09VVFBVVFxuICAgICAgICAgICAgdGhyb3cgXCJFUlJPUjogTm8gZXhpc3RlIGNvbmV4acOzbi5cIlxuICAgICAgICB9ICAgIFx0XG4gICAgfVxuICAgIFxuICAgIHN0b3AoKXtcbiAgICAgICAgaWYgKHRoaXMuZ2V0TXlJZCgpIT1udWxsKXtcbiAgICAgICAgICAgIHZhciBub2RlID0gdGhpcy5nZXRGcmVlTm9kZSgpOyAvL0NPTU8gRUwgw5pOSUNPIE5PRE8gUVVFIFRJRU5FIEVTIEVMIE1PTklUT1IgUFVFUyBFUyBFTCBRVUUgVkEgQSBDT0dFUiBTSUVNUFJFICBcbiAgICAgICAgICAgIHZhciBtZXNzYWdlSWQgPSBub2RlLmdldE5leHRNZXNzYWdlSWQoKTtcbiAgICAgICAgICAgIHZhciBtZXNzYWdlID0gbmV3IENvbW1vbi5FbGVtZW50cy5NZXNzYWdlKENvbW1vbi5Db25zdGFudHMuTWVzc2FnZVR5cGVzLlNUT1AsIG1lc3NhZ2VJZCwgdGhpcy5nZXRNeUlkKCksbm9kZS5nZXRJZCgpLG51bGwsbnVsbCwgbmV3IERhdGUoKS5nZXRUaW1lKCkpO1xuICAgICAgICAgICAgdGhpcy5nZXRUcmFuc21pc3Npb25zTGF5ZXIoKS5zZW5kKG1lc3NhZ2UpOyAgICAgICAgICAgIFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy9PVVRQVVRcbiAgICAgICAgICAgIHRocm93IFwiRVJST1I6IE5vIGV4aXN0ZSBjb25leGnDs24uXCJcbiAgICAgICAgfSAgICBcdFxuICAgIH0gICAgXG4gICAgXG4gICAgcHJvY2Vzc0Nvbm5lY3RSZXNwb25zZShpZE5vZGUsZGF0YSxkZXN0aW55SWQpe1xuICAgICAgICBpZiAoZGF0YSl7IC8vZGF0YUFsZ29yaXRobVxuICAgICAgICAgICAgdGhpcy5nZXRBcHBsaWNhdGlvbkxheWVyKCkucHJvY2Vzc1N0YXJ0KGRhdGEsKCk9Pnt9KTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbm9kZSA9IHRoaXMuYWRkTm9kZSh0aGlzLm1vbml0b3JJZCk7XG4gICAgICAgIG5vZGUuc2V0Q29ubmVjdGVkKHRydWUpO1xuICAgICAgICAvL0FzaWduYW1vcyBteUlkXG4gICAgICAgIHRoaXMuc2V0TXlJZChkZXN0aW55SWQpO1xuICAgIH0gICAgIFxuXG59XG5cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gU2xhdmVDb21tdW5pY2F0aW9uOyIsIid1c2Ugc3RyaWN0JztcbmNsYXNzIE5vZGV7XG4gICAgY29uc3RydWN0b3IoaWQpIHtcbiAgICAgICAgdGhpcy5pZD1pZDtcbiAgICAgICAgdGhpcy5tZXNzYWdlc1dhaXRpbmdSZXNwb25zZT1bXTtcbiAgICAgICAgdGhpcy5uZXh0TWVzc2FnZUlkPTE7IC8vTm8gc2UgdXNhIGVsIGNlcm8gcG9ycXVlIGVudG9uY2VzIG5vIHNlIGlkZW50aWZpY2EgbGEgcmVzcHVlc3RhIG5lZ2F0aXZhLlxuICAgICAgICB0aGlzLmNvbm5lY3RlZD1mYWxzZTsgICAgICAgIFxuICAgIH1cbiAgICBnZXRJZCgpe1xuICAgICAgICByZXR1cm4gdGhpcy5pZDsgICAgICAgIFxuICAgIH1cbiAgICBzZXRDb25uZWN0ZWQoY29ubmVjdGVkKXtcbiAgICAgICAgdGhpcy5jb25uZWN0ZWQ9Y29ubmVjdGVkOyAgICAgICAgXG4gICAgfVxuICAgIGFkZE1lc3NhZ2VXYWl0aW5nUmVzcG9uc2UobWVzc2FnZSl7XG4gICAgICAgIHRoaXMubWVzc2FnZXNXYWl0aW5nUmVzcG9uc2UucHVzaChtZXNzYWdlKTsgICAgICAgIFxuICAgIH1cbiAgICByZW1vdmVNZXNzYWdlV2FpdGluZ1Jlc3BvbnNlKGlkTWVzc2FnZSl7XG4gICAgICAgIGZvciAodmFyIGk9MDtpPHRoaXMubWVzc2FnZXNXYWl0aW5nUmVzcG9uc2UubGVuZ3RoO2krKyl7XG4gICAgICAgICAgICBpZiAodGhpcy5tZXNzYWdlc1dhaXRpbmdSZXNwb25zZVtpXS5nZXRJZCgpPT1pZE1lc3NhZ2Upe1xuICAgICAgICAgICAgICAgIHZhciBpbmRleCA9IGk7XG4gICAgICAgICAgICB9IFxuICAgICAgICB9XG4gICAgICAgIHRoaXMubWVzc2FnZXNXYWl0aW5nUmVzcG9uc2Uuc3BsaWNlKCBpbmRleCwgMSApOyAgICAgICAgXG4gICAgfVxuICAgIGNsZWFyTWVzc2FnZXNXYWl0aW5nUmVzcG9uc2UoKXtcbiAgICBcdHRoaXMubWVzc2FnZXNXYWl0aW5nUmVzcG9uc2U9W107ICAgICAgICBcbiAgICB9XG4gICAgaXNBbnlNZXNzYWdlV2FpdGluZ1Jlc3BvbnNlKCl7XG4gICAgICAgIGlmICghdGhpcy5jb25uZWN0ZWQgfHwgdGhpcy5tZXNzYWdlc1dhaXRpbmdSZXNwb25zZS5sZW5ndGg+MCl7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSAgICAgICAgXG4gICAgfVxuICAgIGdldE5leHRNZXNzYWdlSWQoKXtcbiAgICAgICAgdmFyIG1lc3NhZ2VJZCA9dGhpcy5uZXh0TWVzc2FnZUlkO1xuICAgICAgICB0aGlzLm5leHRNZXNzYWdlSWQrKztcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2VJZDtcbiAgICAgICAgLy9yZXR1cm4gdGhpcy5uZXh0TWVzc2FnZUlkKys7ICAgICAgICBcbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBOb2RlOyIsIlwidXNlIHN0cmljdFwiOyBcblxuY2xhc3MgTWVzc2FnZXtcbiAgICBjb25zdHJ1Y3Rvcih0eXBlLCBpZCwgc291cmNlSWQsZGVzdGlueUlkLGVycm9yLCBkYXRhLCB0aW1lU2VudCl7IC8vVE9ETyAtPiBQYXRyw7NuIGRlIERpc2XDsW8gU3RhdGUgcGFyYSBwb25lciBjb21wb3J0YW1pZW50byBlc3BlY2lmaWNvIGRlIGNhZGEgYWxnb3JpdG1vXG4gICAgICAgIHRoaXMudHlwZT10eXBlO1xuICAgICAgICB0aGlzLmlkPWlkOyAvL0lEIGRlbCBtZW5zYWplXG4gICAgICAgIHRoaXMuc291cmNlSWQ9c291cmNlSWQ7IC8vSUQgZGVsIE5vZG8gb3JpZ2VuIGRlbCBtZW5zYWplXG4gICAgICAgIHRoaXMuZGVzdGlueUlkPWRlc3RpbnlJZDsgLy9JRCBkZWwgTm9kbyBkZXN0aW5vIGRlbCBtZW5zYWplXG4gICAgICAgIHRoaXMuZXJyb3I9ZXJyb3I7XG4gICAgICAgIHRoaXMuZGF0YT1kYXRhO1xuICAgICAgICB0aGlzLnRpbWVTZW50PXRpbWVTZW50Oy8vbmV3IERhdGUoKS5nZXRUaW1lKCk7ICAgICAgICAgICAgXG4gICAgfVxuICAgIHN0YXRpYyBmcm9tSlNPTihtKXtcbiAgICAvLyAgICBjb25zb2xlLmxvZyhcIk1lc3NhZ2UuZnJvbUpTT04gPSBmdW5jdGlvbihtKXtcIilcbiAgICAvLyAgICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShtKSlcbiAgICAgICAgdmFyIG1lc3NhZ2UgPSBuZXcgTWVzc2FnZShtLnR5cGUsIG0uaWQsIG0uc291cmNlSWQsbS5kZXN0aW55SWQsbS5lcnJvciwgbS5kYXRhLCBtLnRpbWVTZW50KTtcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2U7ICAgICAgICBcbiAgICB9XG4gICAgZ2V0VHlwZSgpe1xuICAgICAgICByZXR1cm4gdGhpcy50eXBlOyAgICAgICAgXG4gICAgfVxuICAgIGdldElkKCl7XG4gICAgICAgIHJldHVybiB0aGlzLmlkOyAgICAgICAgXG4gICAgfVxuICAgIHNldElkKGlkKXtcbiAgICAgICAgdGhpcy5pZD1pZDsgICAgICAgIFxuICAgIH1cbiAgICBnZXRTb3VyY2VJZCgpe1xuICAgICAgICByZXR1cm4gdGhpcy5zb3VyY2VJZDsgICAgICAgIFxuICAgIH1cbiAgICBzZXRTb3VyY2VJZChzb3VyY2VJZCl7XG4gICAgICAgIHRoaXMuc291cmNlSWQ9c291cmNlSWQ7ICAgICAgICBcbiAgICB9XG4gICAgZ2V0RGVzdGlueUlkKCl7XG4gICAgICAgIHJldHVybiB0aGlzLmRlc3RpbnlJZDsgICAgICAgIFxuICAgIH1cbiAgICBzZXREZXN0aW55SWQoZGVzdGlueUlkKXtcbiAgICAgICAgdGhpcy5kZXN0aW55SWQ9ZGVzdGlueUlkOyAgICAgICAgXG4gICAgfVxuICAgIGdldEVycm9yKCl7XG4gICAgICAgIHJldHVybiB0aGlzLmVycm9yOyAgICAgICAgXG4gICAgfVxuICAgIGdldERhdGEoKXtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGF0YTsgICAgICAgIFxuICAgIH1cbiAgICBnZXRUaW1lU2VudCgpe1xuICAgICAgICByZXR1cm4gdGhpcy50aW1lU2VudDsgICAgICAgIFxuICAgIH1cbn1cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gTWVzc2FnZTsiLCJcInVzZSBzdHJpY3RcIjsgXHJcbnZhciBXZWJTb2NrZXREZWZhdWx0ID0gcmVxdWlyZSgnLi9XZWJTb2NrZXREZWZhdWx0Jyk7XHJcblxyXG5jbGFzcyBXZWJTb2NrZXRDbGllbnQgIGV4dGVuZHMgV2ViU29ja2V0RGVmYXVsdHtcdFxyXG4gICAgICAgIGNvbnN0cnVjdG9yKHNvY2tldCkge1xyXG4gICAgICAgICAgICBzdXBlcigpOyAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB2YXIgbXlNZXRob2Q9XCJjb25zdHJ1Y3RvcigpXCI7XHJcbiAgICAgICAgICAgIHRoaXMubW9uaXRvclNvY2tldCA9IG51bGw7ICBcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHNvY2tldC5vbignbWVzc2FnZScsIChtc2cpPT57XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlY2VpdmUobXNnKTtcclxuICAgICAgICAgICAgfSk7ICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2VuZChtZXNzYWdlKXtcclxuICAgICAgICAgICAgdGhpcy5zZW5kVG8obWVzc2FnZSx0aGlzLm1vbml0b3JTb2NrZXQpOyAgICBcdFxyXG4gICAgICAgIH0gIFxyXG4gICAgICAgIGluaXRpYWxpemUoY29tbXVuaWNhdGlvbnNMYXllcixtb25pdG9yU29ja2V0KXtcclxuICAgICAgICAgICAgdGhpcy5zZXRDb21tdW5pY2F0aW9uc0xheWVyKGNvbW11bmljYXRpb25zTGF5ZXIpO1xyXG4gICAgICAgICAgICB0aGlzLm1vbml0b3JTb2NrZXQ9bW9uaXRvclNvY2tldDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb2Nlc3NSZXF1ZXN0KG1lc3NhZ2UpeyAgICAgICAgICAgXHJcbiAgICAgICAgICAgICB0aGlzLmNvbW11bmljYXRpb25zTGF5ZXIucHJvY2Vzc1JlcXVlc3QobWVzc2FnZSk7IFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvY2Vzc1Jlc3BvbnNlKG1lc3NhZ2Upe1xyXG4gICAgICAgICAgICAgc3dpdGNoKG1lc3NhZ2UuZ2V0VHlwZSgpKSB7XHJcbiAgICAgICAgICAgICBjYXNlIENvbW1vbi5Db25zdGFudHMuTWVzc2FnZVR5cGVzLkNPTk5FQ1Q6XHJcbiAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0aW9uIEVzdGFibGlzaGVkLlwiKTtcclxuICAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NDb25uZWN0UmVzcG9uc2UobWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgICAgYnJlYWs7ICAgXHQgICAgICAgICBcclxuICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICB0aGlzLmNvbW11bmljYXRpb25zTGF5ZXIucHJvY2Vzc1Jlc3BvbnNlKG1lc3NhZ2UpO1xyXG4gICAgICAgICAgICAgfSBcclxuICAgICAgICB9ICAgXHJcblx0cHJvY2Vzc0Nvbm5lY3RSZXNwb25zZShtZXNzYWdlKXtcclxuXHRcdC8vVE9ETyDCv1RSWSBDQVRDSD9cclxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuZ2V0RXJyb3IoKSl7IC8vRVJST1Igbm8gZXMgbnVsbCBvIHVuZGVmaW5lZFxyXG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzRXJyb3IobWVzc2FnZS5nZXRFcnJvcigpKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29tbXVuaWNhdGlvbnNMYXllci5wcm9jZXNzQ29ubmVjdFJlc3BvbnNlKG1lc3NhZ2UuZ2V0U291cmNlSWQoKSxtZXNzYWdlLmdldERhdGEoKSxtZXNzYWdlLmdldERlc3RpbnlJZCgpKTtcclxuICAgICAgICAgICAgfVxyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBXZWJTb2NrZXRDbGllbnQ7IiwiXCJ1c2Ugc3RyaWN0XCI7IFxyXG5cclxuY2xhc3MgV2ViU29ja2V0RGVmYXVsdCAge1x0XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLmNvbW11bmljYXRpb25zTGF5ZXIgPSAgbnVsbDsgLy9TRSBERUJFIFVUSUxJWkFSIEVMIFNFVCAgICBcclxuICAgICAgICAgICAgICBcclxuICAgIH1cclxuICAgIFxyXG4gICAgc2V0Q29tbXVuaWNhdGlvbnNMYXllcihjb21tdW5pY2F0aW9uc0xheWVyKXtcclxuICAgICAgICB0aGlzLmNvbW11bmljYXRpb25zTGF5ZXI9Y29tbXVuaWNhdGlvbnNMYXllcjsgICAgXHRcclxuICAgIH0gICAgXHJcblxyXG4gICAgIFxyXG4gICAgc2VuZFRvKG1lc3NhZ2Usc29ja2V0KXsgICAgICAgIFxyXG4gICAgICAgIHZhciBtZXNzYWdlU3RyaW5nID0gSlNPTi5zdHJpbmdpZnkobWVzc2FnZSk7ICAgXHJcbiAgICAgICAgY29uc29sZS5sb2coXCJNRU5TQUpFIEVOVklBRE86IFwiK21lc3NhZ2VTdHJpbmcpO1xyXG4gICAgICAgIHNvY2tldC5lbWl0KCdtZXNzYWdlJywgbWVzc2FnZVN0cmluZyk7IFx0XHJcbiAgICB9ICAgICAgXHJcbiAgICBcclxuICAgIHJlY2VpdmUobWVzc2FnZSl7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJNRU5TQUpFIFJFQ0lCSURPPSBcIittZXNzYWdlKTtcclxuICAgICAgICBtZXNzYWdlPUpTT04ucGFyc2UobWVzc2FnZSk7XHJcbiAgICAgICAgbWVzc2FnZT1Db21tb24uRWxlbWVudHMuTWVzc2FnZS5mcm9tSlNPTihtZXNzYWdlKTsgICAgIFxyXG4gICAgICAgIGlmIChtZXNzYWdlLmdldElkKCk8MCl7IC8vU2kgZWwgSUQgZXMgbWVub3IgcXVlIGNlcm8gZW50b25jZXMgc29uIHJlc3B1ZXN0YXMuXHJcbiAgICAgICAgICAgIHRoaXMucHJvY2Vzc1Jlc3BvbnNlKG1lc3NhZ2UpO1xyXG4gICAgICAgIH1lbHNlIHsgIC8vU2kgbm8gc29uIHBldGljaW9uZXMuICAgICAgICAgIFxyXG4gICAgICAgICAgICB0aGlzLnByb2Nlc3NSZXF1ZXN0KG1lc3NhZ2UpOyAgICAgICAgICAgICBcclxuICAgICAgICB9ICBcclxuICAgIH0gICAgXHJcbiAgICBcclxuICAgIHByb2Nlc3NSZXF1ZXN0KCl7XHJcbiAgICBcdHRocm93IG5ldyBFcnJvcihcIkFic3RyYWN0IE1ldGhvZC5cIik7XHJcbiAgICB9XHJcbiAgICBwcm9jZXNzUmVzcG9uc2UoKXtcclxuICAgIFx0dGhyb3cgbmV3IEVycm9yKFwiQWJzdHJhY3QgTWV0aG9kLlwiKTtcclxuICAgIH0gICAgIFxyXG4gICAgcHJvY2Vzc0Vycm9yKG1lc3NhZ2Upe1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiVHJhbnNtaXNzaW9uIEVycnJvciByZWNlaXZlZCBmcm9tOiBcIittZXNzYWdlLmdldFNvdXJjZUlkKCkpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiRVJSUk9SOiBcIittZXNzYWdlLmdldEVycm9yKCkubWVzc2FnZSk7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJFUlJST1IgU1RBQ0s6IFwiK21lc3NhZ2UuZ2V0RXJyb3IoKS5zdGFjayk7ICAgICAgICBcclxuICAgIH0gICAgXHJcblxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFdlYlNvY2tldERlZmF1bHQ7IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG5yZXF1aXJlKCdzZXRpbW1lZGlhdGUnKTtcclxuZ2xvYmFsLkNvbW1vbiA9IHJlcXVpcmUoXCIuLi8uLi8uLi8uLi9jb21tb24vQ29tbW9uLmpzXCIpO1xyXG5cclxuLy92YXIgQ29tbW9uID0gcmVxdWlyZShcIi4uLy4uLy4uL2NvbW1vbi9Db21tb24uanNcIik7IiwiKGZ1bmN0aW9uIChnbG9iYWwsIHVuZGVmaW5lZCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgaWYgKGdsb2JhbC5zZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBuZXh0SGFuZGxlID0gMTsgLy8gU3BlYyBzYXlzIGdyZWF0ZXIgdGhhbiB6ZXJvXG4gICAgdmFyIHRhc2tzQnlIYW5kbGUgPSB7fTtcbiAgICB2YXIgY3VycmVudGx5UnVubmluZ0FUYXNrID0gZmFsc2U7XG4gICAgdmFyIGRvYyA9IGdsb2JhbC5kb2N1bWVudDtcbiAgICB2YXIgcmVnaXN0ZXJJbW1lZGlhdGU7XG5cbiAgICBmdW5jdGlvbiBzZXRJbW1lZGlhdGUoY2FsbGJhY2spIHtcbiAgICAgIC8vIENhbGxiYWNrIGNhbiBlaXRoZXIgYmUgYSBmdW5jdGlvbiBvciBhIHN0cmluZ1xuICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIGNhbGxiYWNrID0gbmV3IEZ1bmN0aW9uKFwiXCIgKyBjYWxsYmFjayk7XG4gICAgICB9XG4gICAgICAvLyBDb3B5IGZ1bmN0aW9uIGFyZ3VtZW50c1xuICAgICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgYXJnc1tpXSA9IGFyZ3VtZW50c1tpICsgMV07XG4gICAgICB9XG4gICAgICAvLyBTdG9yZSBhbmQgcmVnaXN0ZXIgdGhlIHRhc2tcbiAgICAgIHZhciB0YXNrID0geyBjYWxsYmFjazogY2FsbGJhY2ssIGFyZ3M6IGFyZ3MgfTtcbiAgICAgIHRhc2tzQnlIYW5kbGVbbmV4dEhhbmRsZV0gPSB0YXNrO1xuICAgICAgcmVnaXN0ZXJJbW1lZGlhdGUobmV4dEhhbmRsZSk7XG4gICAgICByZXR1cm4gbmV4dEhhbmRsZSsrO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNsZWFySW1tZWRpYXRlKGhhbmRsZSkge1xuICAgICAgICBkZWxldGUgdGFza3NCeUhhbmRsZVtoYW5kbGVdO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJ1bih0YXNrKSB7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IHRhc2suY2FsbGJhY2s7XG4gICAgICAgIHZhciBhcmdzID0gdGFzay5hcmdzO1xuICAgICAgICBzd2l0Y2ggKGFyZ3MubGVuZ3RoKSB7XG4gICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgY2FsbGJhY2soYXJnc1swXSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgY2FsbGJhY2soYXJnc1swXSwgYXJnc1sxXSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgY2FsbGJhY2soYXJnc1swXSwgYXJnc1sxXSwgYXJnc1syXSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KHVuZGVmaW5lZCwgYXJncyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJ1bklmUHJlc2VudChoYW5kbGUpIHtcbiAgICAgICAgLy8gRnJvbSB0aGUgc3BlYzogXCJXYWl0IHVudGlsIGFueSBpbnZvY2F0aW9ucyBvZiB0aGlzIGFsZ29yaXRobSBzdGFydGVkIGJlZm9yZSB0aGlzIG9uZSBoYXZlIGNvbXBsZXRlZC5cIlxuICAgICAgICAvLyBTbyBpZiB3ZSdyZSBjdXJyZW50bHkgcnVubmluZyBhIHRhc2ssIHdlJ2xsIG5lZWQgdG8gZGVsYXkgdGhpcyBpbnZvY2F0aW9uLlxuICAgICAgICBpZiAoY3VycmVudGx5UnVubmluZ0FUYXNrKSB7XG4gICAgICAgICAgICAvLyBEZWxheSBieSBkb2luZyBhIHNldFRpbWVvdXQuIHNldEltbWVkaWF0ZSB3YXMgdHJpZWQgaW5zdGVhZCwgYnV0IGluIEZpcmVmb3ggNyBpdCBnZW5lcmF0ZWQgYVxuICAgICAgICAgICAgLy8gXCJ0b28gbXVjaCByZWN1cnNpb25cIiBlcnJvci5cbiAgICAgICAgICAgIHNldFRpbWVvdXQocnVuSWZQcmVzZW50LCAwLCBoYW5kbGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIHRhc2sgPSB0YXNrc0J5SGFuZGxlW2hhbmRsZV07XG4gICAgICAgICAgICBpZiAodGFzaykge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRseVJ1bm5pbmdBVGFzayA9IHRydWU7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgcnVuKHRhc2spO1xuICAgICAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFySW1tZWRpYXRlKGhhbmRsZSk7XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRseVJ1bm5pbmdBVGFzayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc3RhbGxOZXh0VGlja0ltcGxlbWVudGF0aW9uKCkge1xuICAgICAgICByZWdpc3RlckltbWVkaWF0ZSA9IGZ1bmN0aW9uKGhhbmRsZSkge1xuICAgICAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbiAoKSB7IHJ1bklmUHJlc2VudChoYW5kbGUpOyB9KTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjYW5Vc2VQb3N0TWVzc2FnZSgpIHtcbiAgICAgICAgLy8gVGhlIHRlc3QgYWdhaW5zdCBgaW1wb3J0U2NyaXB0c2AgcHJldmVudHMgdGhpcyBpbXBsZW1lbnRhdGlvbiBmcm9tIGJlaW5nIGluc3RhbGxlZCBpbnNpZGUgYSB3ZWIgd29ya2VyLFxuICAgICAgICAvLyB3aGVyZSBgZ2xvYmFsLnBvc3RNZXNzYWdlYCBtZWFucyBzb21ldGhpbmcgY29tcGxldGVseSBkaWZmZXJlbnQgYW5kIGNhbid0IGJlIHVzZWQgZm9yIHRoaXMgcHVycG9zZS5cbiAgICAgICAgaWYgKGdsb2JhbC5wb3N0TWVzc2FnZSAmJiAhZ2xvYmFsLmltcG9ydFNjcmlwdHMpIHtcbiAgICAgICAgICAgIHZhciBwb3N0TWVzc2FnZUlzQXN5bmNocm9ub3VzID0gdHJ1ZTtcbiAgICAgICAgICAgIHZhciBvbGRPbk1lc3NhZ2UgPSBnbG9iYWwub25tZXNzYWdlO1xuICAgICAgICAgICAgZ2xvYmFsLm9ubWVzc2FnZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHBvc3RNZXNzYWdlSXNBc3luY2hyb25vdXMgPSBmYWxzZTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBnbG9iYWwucG9zdE1lc3NhZ2UoXCJcIiwgXCIqXCIpO1xuICAgICAgICAgICAgZ2xvYmFsLm9ubWVzc2FnZSA9IG9sZE9uTWVzc2FnZTtcbiAgICAgICAgICAgIHJldHVybiBwb3N0TWVzc2FnZUlzQXN5bmNocm9ub3VzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5zdGFsbFBvc3RNZXNzYWdlSW1wbGVtZW50YXRpb24oKSB7XG4gICAgICAgIC8vIEluc3RhbGxzIGFuIGV2ZW50IGhhbmRsZXIgb24gYGdsb2JhbGAgZm9yIHRoZSBgbWVzc2FnZWAgZXZlbnQ6IHNlZVxuICAgICAgICAvLyAqIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL0RPTS93aW5kb3cucG9zdE1lc3NhZ2VcbiAgICAgICAgLy8gKiBodHRwOi8vd3d3LndoYXR3Zy5vcmcvc3BlY3Mvd2ViLWFwcHMvY3VycmVudC13b3JrL211bHRpcGFnZS9jb21tcy5odG1sI2Nyb3NzRG9jdW1lbnRNZXNzYWdlc1xuXG4gICAgICAgIHZhciBtZXNzYWdlUHJlZml4ID0gXCJzZXRJbW1lZGlhdGUkXCIgKyBNYXRoLnJhbmRvbSgpICsgXCIkXCI7XG4gICAgICAgIHZhciBvbkdsb2JhbE1lc3NhZ2UgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgaWYgKGV2ZW50LnNvdXJjZSA9PT0gZ2xvYmFsICYmXG4gICAgICAgICAgICAgICAgdHlwZW9mIGV2ZW50LmRhdGEgPT09IFwic3RyaW5nXCIgJiZcbiAgICAgICAgICAgICAgICBldmVudC5kYXRhLmluZGV4T2YobWVzc2FnZVByZWZpeCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICBydW5JZlByZXNlbnQoK2V2ZW50LmRhdGEuc2xpY2UobWVzc2FnZVByZWZpeC5sZW5ndGgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoZ2xvYmFsLmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICAgICAgICAgIGdsb2JhbC5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBvbkdsb2JhbE1lc3NhZ2UsIGZhbHNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGdsb2JhbC5hdHRhY2hFdmVudChcIm9ubWVzc2FnZVwiLCBvbkdsb2JhbE1lc3NhZ2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVnaXN0ZXJJbW1lZGlhdGUgPSBmdW5jdGlvbihoYW5kbGUpIHtcbiAgICAgICAgICAgIGdsb2JhbC5wb3N0TWVzc2FnZShtZXNzYWdlUHJlZml4ICsgaGFuZGxlLCBcIipcIik7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5zdGFsbE1lc3NhZ2VDaGFubmVsSW1wbGVtZW50YXRpb24oKSB7XG4gICAgICAgIHZhciBjaGFubmVsID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG4gICAgICAgIGNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIHZhciBoYW5kbGUgPSBldmVudC5kYXRhO1xuICAgICAgICAgICAgcnVuSWZQcmVzZW50KGhhbmRsZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmVnaXN0ZXJJbW1lZGlhdGUgPSBmdW5jdGlvbihoYW5kbGUpIHtcbiAgICAgICAgICAgIGNoYW5uZWwucG9ydDIucG9zdE1lc3NhZ2UoaGFuZGxlKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnN0YWxsUmVhZHlTdGF0ZUNoYW5nZUltcGxlbWVudGF0aW9uKCkge1xuICAgICAgICB2YXIgaHRtbCA9IGRvYy5kb2N1bWVudEVsZW1lbnQ7XG4gICAgICAgIHJlZ2lzdGVySW1tZWRpYXRlID0gZnVuY3Rpb24oaGFuZGxlKSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgYSA8c2NyaXB0PiBlbGVtZW50OyBpdHMgcmVhZHlzdGF0ZWNoYW5nZSBldmVudCB3aWxsIGJlIGZpcmVkIGFzeW5jaHJvbm91c2x5IG9uY2UgaXQgaXMgaW5zZXJ0ZWRcbiAgICAgICAgICAgIC8vIGludG8gdGhlIGRvY3VtZW50LiBEbyBzbywgdGh1cyBxdWV1aW5nIHVwIHRoZSB0YXNrLiBSZW1lbWJlciB0byBjbGVhbiB1cCBvbmNlIGl0J3MgYmVlbiBjYWxsZWQuXG4gICAgICAgICAgICB2YXIgc2NyaXB0ID0gZG9jLmNyZWF0ZUVsZW1lbnQoXCJzY3JpcHRcIik7XG4gICAgICAgICAgICBzY3JpcHQub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJ1bklmUHJlc2VudChoYW5kbGUpO1xuICAgICAgICAgICAgICAgIHNjcmlwdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBudWxsO1xuICAgICAgICAgICAgICAgIGh0bWwucmVtb3ZlQ2hpbGQoc2NyaXB0KTtcbiAgICAgICAgICAgICAgICBzY3JpcHQgPSBudWxsO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGh0bWwuYXBwZW5kQ2hpbGQoc2NyaXB0KTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnN0YWxsU2V0VGltZW91dEltcGxlbWVudGF0aW9uKCkge1xuICAgICAgICByZWdpc3RlckltbWVkaWF0ZSA9IGZ1bmN0aW9uKGhhbmRsZSkge1xuICAgICAgICAgICAgc2V0VGltZW91dChydW5JZlByZXNlbnQsIDAsIGhhbmRsZSk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gSWYgc3VwcG9ydGVkLCB3ZSBzaG91bGQgYXR0YWNoIHRvIHRoZSBwcm90b3R5cGUgb2YgZ2xvYmFsLCBzaW5jZSB0aGF0IGlzIHdoZXJlIHNldFRpbWVvdXQgZXQgYWwuIGxpdmUuXG4gICAgdmFyIGF0dGFjaFRvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mICYmIE9iamVjdC5nZXRQcm90b3R5cGVPZihnbG9iYWwpO1xuICAgIGF0dGFjaFRvID0gYXR0YWNoVG8gJiYgYXR0YWNoVG8uc2V0VGltZW91dCA/IGF0dGFjaFRvIDogZ2xvYmFsO1xuXG4gICAgLy8gRG9uJ3QgZ2V0IGZvb2xlZCBieSBlLmcuIGJyb3dzZXJpZnkgZW52aXJvbm1lbnRzLlxuICAgIGlmICh7fS50b1N0cmluZy5jYWxsKGdsb2JhbC5wcm9jZXNzKSA9PT0gXCJbb2JqZWN0IHByb2Nlc3NdXCIpIHtcbiAgICAgICAgLy8gRm9yIE5vZGUuanMgYmVmb3JlIDAuOVxuICAgICAgICBpbnN0YWxsTmV4dFRpY2tJbXBsZW1lbnRhdGlvbigpO1xuXG4gICAgfSBlbHNlIGlmIChjYW5Vc2VQb3N0TWVzc2FnZSgpKSB7XG4gICAgICAgIC8vIEZvciBub24tSUUxMCBtb2Rlcm4gYnJvd3NlcnNcbiAgICAgICAgaW5zdGFsbFBvc3RNZXNzYWdlSW1wbGVtZW50YXRpb24oKTtcblxuICAgIH0gZWxzZSBpZiAoZ2xvYmFsLk1lc3NhZ2VDaGFubmVsKSB7XG4gICAgICAgIC8vIEZvciB3ZWIgd29ya2Vycywgd2hlcmUgc3VwcG9ydGVkXG4gICAgICAgIGluc3RhbGxNZXNzYWdlQ2hhbm5lbEltcGxlbWVudGF0aW9uKCk7XG5cbiAgICB9IGVsc2UgaWYgKGRvYyAmJiBcIm9ucmVhZHlzdGF0ZWNoYW5nZVwiIGluIGRvYy5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpKSB7XG4gICAgICAgIC8vIEZvciBJRSA24oCTOFxuICAgICAgICBpbnN0YWxsUmVhZHlTdGF0ZUNoYW5nZUltcGxlbWVudGF0aW9uKCk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBGb3Igb2xkZXIgYnJvd3NlcnNcbiAgICAgICAgaW5zdGFsbFNldFRpbWVvdXRJbXBsZW1lbnRhdGlvbigpO1xuICAgIH1cblxuICAgIGF0dGFjaFRvLnNldEltbWVkaWF0ZSA9IHNldEltbWVkaWF0ZTtcbiAgICBhdHRhY2hUby5jbGVhckltbWVkaWF0ZSA9IGNsZWFySW1tZWRpYXRlO1xufSh0eXBlb2Ygc2VsZiA9PT0gXCJ1bmRlZmluZWRcIiA/IHR5cGVvZiBnbG9iYWwgPT09IFwidW5kZWZpbmVkXCIgPyB0aGlzIDogZ2xvYmFsIDogc2VsZikpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jbGFzcyBQb3B1bGF0aW9ue1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLnBvcD1bXTtcbiAgICB9ICAgIFxuICAgIHN0YXRpYyBmcm9tSlNPTihwKXtcbiAgICAgICAgdmFyIHBvcHVsYXRpb24gPSBuZXcgQ29tbW9uLkVsZW1lbnRzLlBvcHVsYXRpb24oKTtcbiAgICAgICAgZm9yICh2YXIgaT0wO2k8cC5wb3AubGVuZ3RoO2krKyl7XG4gICAgICAgICAgICBwb3B1bGF0aW9uLnBvcFtpXT1Db21tb24uRWxlbWVudHMuSW5kaXZpZHVhbC5mcm9tSlNPTihwLnBvcFtpXSk7XG4gICAgICAgIH1cbiAgICAgICAgcG9wdWxhdGlvbi5iZXN0cD1wLmJlc3RwO1xuICAgICAgICBwb3B1bGF0aW9uLndvcnN0cD1wLndvcnN0cDtcbiAgICAgICAgcG9wdWxhdGlvbi5iZXN0Zj1wLmJlc3RmO1xuICAgICAgICBwb3B1bGF0aW9uLmF2Z2Y9cC5hdmdmO1xuICAgICAgICBwb3B1bGF0aW9uLndvcnN0Zj1wLndvcnN0ZjtcbiAgICAgICAgcG9wdWxhdGlvbi5CRVNURj1wLkJFU1RGO1xuXG4gICAgICAgIHBvcHVsYXRpb24uaXRlcmF0aW9uPXAuaXRlcmF0aW9uO1xuICAgICAgICByZXR1cm4gcG9wdWxhdGlvbjsgICAgICAgIFxuICAgIH1cbiAgICBpbml0aWFsaXplKHBvcFNpemUsc2l6ZSl7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcG9wU2l6ZTsgaSsrKXtcbiAgICAgICAgICAgICAgICB0aGlzLnBvcC5wdXNoKG5ldyBDb21tb24uRWxlbWVudHMuSW5kaXZpZHVhbCgpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnBvcFtpXS5pbml0aWFsaXplKHNpemUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzdGF0aXN0aWNzXG4gICAgICAgIHRoaXMuYmVzdHAgPSAwOyAgICAgXG4gICAgICAgIHRoaXMud29yc3RwID0gMDtcbiAgICAgICAgdGhpcy5iZXN0ZiA9IDAuMDsgICBcbiAgICAgICAgdGhpcy5hdmdmICAgPSAwLjA7ICAgXG4gICAgICAgIHRoaXMud29yc3RmID0gOTk5OTk5OTk5OS4wOyAgICBcbiAgICAgICAgdGhpcy5CRVNURiA9IDAuMDtcblxuICAgICAgICB0aGlzLml0ZXJhdGlvbiA9IDA7XG4gICAgICAgIC8vTU9TVFJBUiBQT0JMQUNJw5NOXG4vLyAgICAgICAgZm9yICh2YXIgaT0wO2k8dGhpcy5wb3AubGVuZ3RoO2krKyl7XG4vLyAgICAgICAgICAgIGNvbnNvbGUubG9nKGkrXCIgLT4gXCIrSlNPTi5zdHJpbmdpZnkodGhpcy5wb3BbaV0pKVxuLy8gICAgICAgIH0gICAgICAgIFxuICAgIH1cbiAgICBnZXRTaXplKCl7XG4gICAgICAgIHJldHVybiB0aGlzLnBvcC5sZW5ndGg7ICAgICAgICBcbiAgICB9XG4gICAgZ2V0SW5kaXZpZHVhbChpbmRleCl7XG4gICAgICAgIHJldHVybiB0aGlzLnBvcFtpbmRleF07ICAgICAgICBcbiAgICB9XG4gICAgc2V0SW5kaXZpZHVhbChpbmRleCwgaW5kaXYpe1xuICAgICAgICB0aGlzLnBvcFtpbmRleF09aW5kaXY7ICAgICAgICBcbiAgICB9XG4gICAgcmVwbGFjZVdvcnN0KGluZGl2KXtcbiAgICAgICAgaWYgKGluZGl2LmdldENocm9tb3NvbWUoKS5hbGxlbGVzLmxlbmd0aD09MCkgdGhyb3cgXCJFUlJPUiBubyBkZWJlcsOtYSBzZXIgY2Vyb1wiXG4gICAgICAgIC8vVE9ET1xuICAgICAgICAvL0NvbXByb2JhciBzaSBlbCBxdWUgc2UgaW5zZXJ0YSBlcyBtZWpvciBxdWUgZWwgcGVvciDCv2NvbXByb2JhcmxvIGZ1ZXJhIG8gZGVudHJvPyAgICAgICAgIFxuICAgICAgICBpZiAoaW5kaXYuZ2V0Rml0bmVzcygpPnRoaXMucG9wW3RoaXMud29yc3RwXS5nZXRGaXRuZXNzKCkpe1xuICAgICAgICAgICB0aGlzLnBvcFt0aGlzLndvcnN0cF0gPSBpbmRpdjsgXG4gICAgICAgICAgIHJldHVybiB0aGlzLndvcnN0cDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfSAgICAgICAgXG4gICAgfSAgIFxuICAgIHJlcGxhY2UoaW5kaXYscG9zaXRpb24pey8vRXN0ZSBtw6l0b2RvIHNlIHV0aWxpemEgc8OzbG8gY3VhbmRvIE1vbml0b3ItRXNjbGF2byBwYXJhIHF1ZSBlbCBlc2NsYXZvIHB1ZWRhIHJlZW1wbGF6YXJcbiAgICAgICAgdGhpcy5wb3BbcG9zaXRpb25dID0gaW5kaXY7ICAgICAgICAgXG4gICAgfVxuICAgIGdldEJlc3RJbmRpdmlkdWFsKCl7XG4gICAgICAgIHJldHVybiB0aGlzLnBvcFt0aGlzLmJlc3RwXTsgICAgICAgIFxuICAgIH1cbiAgICBjb21wdXRlU3RhdHMoKXtcblxuICAgICAgICAgICAgICAgIHZhciBib3JyYXJCRVNUQkVGT1JFPXRoaXMuYmVzdGY7XG5cbiAgICAgICAgXG4gICAgICAgIHZhciBhbnRpZ3VvRml0bmVzcyA9IHRoaXMuYmVzdGY7XG4gICAgICAgIFxuXHR2YXIgdG90YWwgPSAwLjA7XG5cdHZhciBmID0gMC4wO1xuXHR0aGlzLndvcnN0ZiA9IHRoaXMucG9wWzBdLmZpdG5lc3M7XG5cdHRoaXMud29yc3RwID0gMDtcblx0dGhpcy5iZXN0ZiA9IHRoaXMucG9wWzBdLmZpdG5lc3M7XG5cdHRoaXMuYmVzdHAgPSAwO1xuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5wb3AubGVuZ3RoOyBpKyspe1xuXHRcdGYgPSB0aGlzLnBvcFtpXS5maXRuZXNzO1xuXHRcdGlmIChmPD10aGlzLndvcnN0Zikge1xuXHRcdFx0dGhpcy53b3JzdGY9Zjtcblx0XHRcdHRoaXMud29yc3RwPWk7XG5cdFx0fVxuXHRcdGlmIChmPnRoaXMuYmVzdGYpeyBcblx0XHRcdHRoaXMuYmVzdGYgPSBmOyBcblx0XHRcdHRoaXMuYmVzdHAgPSBpO1x0XHRcdFxuXHRcdH1cblx0XHRpZiAoZj49dGhpcy5CRVNURil7IHRoaXMuQkVTVEYgPSBmO31cblx0XHR0b3RhbCs9Zjtcblx0fVx0XG5cdHRoaXMuYXZnZiA9IHRvdGFsL3RoaXMucG9wLmxlbmd0aDsgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHZhciBib3JyYXJCRVNUTEFURVI9dGhpcy5iZXN0ZjtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoYm9ycmFyQkVTVEJFRk9SRSAhPTAgJiYgYm9ycmFyQkVTVExBVEVSPGJvcnJhckJFU1RCRUZPUkUpe1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBcIkVSUk9SXCI7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRVNUTyBOTyBERUJFUsONQSBFU1RBUiBQQVNBTkRPXCIpXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYm9ycmFyQkVTVEJFRk9SRT1cIitib3JyYXJCRVNUQkVGT1JFKVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImJvcnJhckJFU1RMQVRFUj1cIitib3JyYXJCRVNUTEFURVIpICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9IFxuXG5cdGlmICh0aGlzLmJlc3RmPmFudGlndW9GaXRuZXNzKXtcblx0XHRjb25zb2xlLmxvZyh0aGlzLml0ZXJhdGlvbitcIi1OVUVWTyBGSVRORVNTIFwiK3RoaXMuYmVzdGYpICAgICAgICAgICAgXG5cdH1cblxuXHR0aGlzLml0ZXJhdGlvbisrOyAgICAgICAgICBcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUG9wdWxhdGlvbjsiLCJcbmZ1bmN0aW9uIFByb2JsZW1PbmVNYXgoKSB7XG5cdHRoaXMudGFyZ2V0Rml0bmVzcyA9IC05OTk5OTkuOTtcblx0dGhpcy50Zktub3duID0gZmFsc2U7XG5cdHRoaXMuZml0bmVzc0NvdW50ZXIgPSAwO1xufVxuXG5Qcm9ibGVtT25lTWF4LnByb3RvdHlwZS5ldmFsdWF0ZVN0ZXAgPSBmdW5jdGlvbihpbmRpdikge1xuXHR0aGlzLmZpdG5lc3NDb3VudGVyKys7XG5cdHJldHVybiB0aGlzLmV2YWx1YXRlKGluZGl2KTtcbn1cblxuUHJvYmxlbU9uZU1heC5wcm90b3R5cGUuZXZhbHVhdGUgPSBmdW5jdGlvbihpbmRpdikge1xuXHR2YXIgZiA9IDAuMDtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBpbmRpdi5nZXRDaHJvbW9zb21lKCkuZ2V0U2l6ZSgpOyBpKyspe1xuXHRcdGlmIChpbmRpdi5nZXRDaHJvbW9zb21lKCkuZ2V0QWxsZWxlKGkpPT0xKXtcblx0XHRcdGY9ZisxLjA7XG5cdFx0fSBcblx0fVx0XG5cdGluZGl2LnNldEZpdG5lc3MoZik7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUHJvYmxlbU9uZU1heDsiLCIndXNlIHN0cmljdCc7XG5cblxuLy8vL0NpdWRhZGVzL0NsaWVudGVzIC0+IDAsMSwyIC4uLiBuXG4vL01hdHJpeiBkZSBjb3N0ZXMgKGluY2x1eWUgdGFtYmnDqW4gYWwgYWxtYWPDqW4pXG4vL0RlIDAgYSAwID0geCBkaXN0YW5jaWFcbi8vRGUgMCBhIDEgPSB5IGRpc3RhbmNpYSAuLi4uLlxuXG4vL2N1c3RvbWVyc0FycmF5IG5vIGluY2x1eWUgYWxtYWPDqW5cblxuXG5cbmNsYXNzIFByb2JsZW1DVlJQe1xuICAgIGNvbnN0cnVjdG9yKCkge30gICAgXG4gICAgc3RhdGljIGZyb21KU09OKHApe1xuICAgICAgICB2YXIgcHJvYmxlbSA9IG5ldyBDb21tb24uRWxlbWVudHMuUHJvYmxlbUNWUlAoKTtcbiAgICAgICAgcHJvYmxlbS5tYXRyaXhDb3N0PXAubWF0cml4Q29zdDtcbiAgICAgICAgcHJvYmxlbS5jdXN0b21lcnNBcnJheT1wLmN1c3RvbWVyc0FycmF5O1xuICAgICAgICBmb3IgKHZhciBpPTA7aTxwcm9ibGVtLmN1c3RvbWVyc0FycmF5Lmxlbmd0aDtpKyspe1xuICAgICAgICAgICAgcHJvYmxlbS5jdXN0b21lcnNBcnJheVtpXT1Db21tb24uRWxlbWVudHMuQ3VzdG9tZXIuZnJvbUpTT04ocHJvYmxlbS5jdXN0b21lcnNBcnJheVtpXSk7XG4gICAgICAgIH1cbiAgICAgICAgcHJvYmxlbS50cnVja0NhcGFjaXR5PXAudHJ1Y2tDYXBhY2l0eTtcbiAgICAgICAgcHJvYmxlbS50cnVja1RpbWU9cC50cnVja1RpbWU7XG4gICAgICAgIHByb2JsZW0ucGVuYWxDYXA9cC5wZW5hbENhcDtcbiAgICAgICAgcHJvYmxlbS5wZW5hbFRpbWU9cC5wZW5hbFRpbWU7XG4gICAgICAgIHByb2JsZW0udGFyZ2V0Rml0bmVzcz1wLnRhcmdldEZpdG5lc3M7XG4gICAgICAgIHByb2JsZW0udGZLbm93bj1wLnRmS25vd247XG4gICAgICAgIHByb2JsZW0uZml0bmVzc0NvdW50ZXI9cC5maXRuZXNzQ291bnRlclxuICAgICAgICByZXR1cm4gcHJvYmxlbTsgICAgICAgIFxuICAgIH1cbiAgICBpbml0aWFsaXplKG1hdHJpeENvc3QsY3VzdG9tZXJzQXJyYXksIHRydWNrQ2FwYWNpdHksIHRydWNrVGltZSwgcGVuYWxDYXAsIHBlbmFsVGltZSl7XG4gICAgICAgIHRoaXMubWF0cml4Q29zdD1tYXRyaXhDb3N0O1xuICAgICAgICB0aGlzLmN1c3RvbWVyc0FycmF5ID0gY3VzdG9tZXJzQXJyYXk7XG4gICAgICAgIHRoaXMudHJ1Y2tDYXBhY2l0eSA9IHRydWNrQ2FwYWNpdHk7XG4gICAgICAgIHRoaXMudHJ1Y2tUaW1lPXRydWNrVGltZTtcbiAgICAgICAgdGhpcy5wZW5hbENhcD1wZW5hbENhcDtcbiAgICAgICAgdGhpcy5wZW5hbFRpbWU9cGVuYWxUaW1lO1xuICAgXG5cdHRoaXMudGFyZ2V0Rml0bmVzcyA9IC05OTk5OTkuOTtcblx0dGhpcy50Zktub3duID0gZmFsc2U7XG5cdHRoaXMuZml0bmVzc0NvdW50ZXIgPSAwOyAgICAgICAgXG4gICAgfVxuICAgIGV2YWx1YXRlU3RlcChpbmRpdil7XG5cblx0dGhpcy5maXRuZXNzQ291bnRlcisrO1xuICAgICAgICByZXR1cm4gdGhpcy5ldmFsdWF0ZTIoaW5kaXYpO1xuICAgICAgXG4gICAgfVxuICAgIFxuICAgIGV2YWx1YXRlMihpbmRpdil7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIG9yaWdpbiA9IDA7IC8vQWxtYWPDqW5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGRlc3Rpbnk9LTk5OTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgY3VzdG9tZXI9bnVsbDtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRyYXZlbFRpbWU9bnVsbDtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRlbGl2ZXJ5VGltZT1udWxsO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdG90YWxUaW1lUm91dGU9MDtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRlbGl2ZXJ5SXRlbXM9MDtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgcm91dGVUaW1lc0FycmF5ID0gW107XG4gICAgICAgICAgICAgICAgICAgIHZhciBwZW5hbENhcEFycmF5ID0gW107XG4gICAgICAgICAgICAgICAgICAgIHZhciBwZW5hbFRpbWVBcnJheSA9IFtdO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBlbmQgPSBmaW5kRmlyc3RTZXBhcmF0b3IodGhpcyxpbmRpdik7IC8vUG9zaWNpw7NuIMO6bHRpbW8gYWxlbGxlXG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXh0PWdldE5leHRBbGxlbGUoaW5kaXYsZW5kKTsgICAvL1Bvc2ljacOzbiBzaWd1aWVudGUgYWxsZWxlIChjbGllbnRlIG8gc2VwYXJhZG9yKVxuXG4gICAgICAgICAgICAgICAgICAgIHZhciBwb3NDdXN0b21lcj1udWxsO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBwcm9ibGVtID0gdGhpcztcblxuXG5cbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gcHJvY2Vzc0N1c3RvbWVyKCl7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NDdXN0b21lcj1pbmRpdi5nZXRDaHJvbW9zb21lKCkuZ2V0QWxsZWxlKG5leHQpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tZXIgPSBwcm9ibGVtLmN1c3RvbWVyc0FycmF5W3Bvc0N1c3RvbWVyXTsgICAvL1ZhbG9yIGRlbCBhbGVsbyBlcyBsYSBwb3NpY2nDs24gZGVsIGNsaWVudGUgZW4gZWwgYXJyYXkuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoIWN1c3RvbWVyKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJFUlJST1IgZGViZXLDrWEgaGFiZXIgdW4gY2xpZW50ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJuZXh0PVwiK25leHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImluZGl2LmdldENocm9tb3NvbWUoKS5sZW5ndGg9XCIraW5kaXYuZ2V0Q2hyb21vc29tZSgpLmdldFNpemUoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJwb3NDdXN0b21lcj1cIitwb3NDdXN0b21lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicHJvYmxlbS5jdXN0b21lcnNBcnJheT1cIitKU09OLnN0cmluZ2lmeShwcm9ibGVtLmN1c3RvbWVyc0FycmF5KSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgXCJFUlJST1IgY3VzdG9tZXIgZXMgdW5kZWZpbmVkIGxpbmVhIDkwIGRlIFByb2JsZW1DVlJQXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzdGlueSA9IHBvc0N1c3RvbWVyKzE7ICAvL1N1bWFtb3MgMSBhbCB2YWxvciBkZWwgYWxlbG8gcGFyYSBvYnRlbmVyIGVsIGRlc3Rpbm8uXG5cbiAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgIC8vRGVzdGlubyBubyBzZSBwdWVkZSBwYXNhciBkZSBsYSBtYXRyaXogcG9ycXVlIHlhIGhlbW9zIGNvbXByb2JhZG8gcXVlIGVzdMOpIGRlbnRybyBkZWwgYXJyYXkgeSBsYSBtYXRyaXogc2llbXByZSB0aWVuZSAxIHZhbG9yIG3DoXMuIEFzw60gcXVlIG5vIGVzIG5lY2VzYXJpYSBlc2EgY29tcHJvYmFjacOzbi5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYXZlbFRpbWU9cHJvYmxlbS5tYXRyaXhDb3N0W29yaWdpbl1bZGVzdGlueV07XG5cblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsaXZlcnlUaW1lPWN1c3RvbWVyLmdldERlbGl2ZXJ5VGltZSgpOyAgICAgICAgIFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG90YWxUaW1lUm91dGUrPXRyYXZlbFRpbWUrZGVsaXZlcnlUaW1lO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsaXZlcnlJdGVtcyArPSBjdXN0b21lci5nZXREZWxpdmVyeUl0ZW1zKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcmlnaW49ZGVzdGlueTsgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV4dD1nZXROZXh0QWxsZWxlKGluZGl2LG5leHQpOyAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBwcm9jZXNzU2VwYXJhdG9yKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9DQUxDVUxBUiBDT1NURSBERVNERSBPUklHRU4gSEFTVEEgQUxNQUPDiU4gKGZpbiBkZSBydXRhKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcmlnaW4hPTApeyAvL1NpIGVsIG9yaWdlbiBubyBlcmEgZWwgYWxtYWPDqW4gLT4gQ2FsY3VsYW1vcyBjb3N0ZSBkZSByZWdyZXNvIGFsIGFsbWFjw6luLlxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGl2ZXJ5VGltZT0wOyAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmF2ZWxUaW1lPXByb2JsZW0ubWF0cml4Q29zdFtvcmlnaW5dWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b3RhbFRpbWVSb3V0ZSs9dHJhdmVsVGltZTsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvdXRlVGltZXNBcnJheS5wdXNoKHRvdGFsVGltZVJvdXRlKTsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRvdGFsVGltZVJvdXRlPnByb2JsZW0udHJ1Y2tUaW1lKXtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZW5hbFRpbWVBcnJheS5wdXNoKCh0b3RhbFRpbWVSb3V0ZS1wcm9ibGVtLnRydWNrVGltZSkqcHJvYmxlbS5wZW5hbFRpbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVuYWxUaW1lQXJyYXkucHVzaCgwKTsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkZWxpdmVyeUl0ZW1zPnByb2JsZW0udHJ1Y2tDYXBhY2l0eSl7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVuYWxDYXBBcnJheS5wdXNoKChkZWxpdmVyeUl0ZW1zLXByb2JsZW0udHJ1Y2tDYXBhY2l0eSkqcHJvYmxlbS5wZW5hbENhcCk7ICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlbmFsQ2FwQXJyYXkucHVzaCgwKTsgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b3RhbFRpbWVSb3V0ZT0wO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGl2ZXJ5SXRlbXM9MDsgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3JpZ2luPTA7ICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXh0PWdldE5leHRBbGxlbGUoaW5kaXYsbmV4dCk7ICBcbiAgICBcbiAgICAgICAgICAgICAgICAgICAgfSAgICBcblxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAobmV4dCE9ZW5kKXsgLy9IYXN0YSBxdWUgbm8gZGVtb3MgbGEgdnVlbHRhIGFsIGFycmF5IHNlZ3VpbW9zXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzU2VwYXJhdG9yKHRoaXMsaW5kaXYsaW5kaXYuZ2V0Q2hyb21vc29tZSgpLmdldEFsbGVsZShuZXh0KSkpeyAvL1NJIE5PIEVTIFNFUEFSQURPUiAtPiBDbGllbnRlXG4gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc0N1c3RvbWVyKCk7XG4gICAgICAgICBcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgeyAvL0VTIFNFUEFSQURPUiAtPiBGSU4gREUgUlVUQVxuIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NTZXBhcmF0b3IoKTtcbiAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgfSAgICAgXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzU2VwYXJhdG9yKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGZpdG5lc3MgPSAwOyAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaz0wO2s8cm91dGVUaW1lc0FycmF5Lmxlbmd0aDtrKyspe1xuICAgICAgICAgICAgICAgICAgICAgICAgZml0bmVzcys9cm91dGVUaW1lc0FycmF5W2tdO1xuICAgICAgICAgICAgICAgICAgICAgICAgZml0bmVzcys9cGVuYWxDYXBBcnJheVtrXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpdG5lc3MrPXBlbmFsVGltZUFycmF5W2tdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZpdG5lc3MqPS0xO1xuXG4gICAgICAgICAgICAgICAgICAgIGluZGl2LnNldEZpdG5lc3MoZml0bmVzcyk7XG4gICAgIFxuICAgIH1cbiAgICBcbn1cblxuXG5cblxuZnVuY3Rpb24gaXNTZXBhcmF0b3IocHJvYmxlbSxpbmRpdixpbmRleEN1c3RvbWVyKXtcblxuICAgICAgICBpZiAoaW5kZXhDdXN0b21lcj49cHJvYmxlbS5jdXN0b21lcnNBcnJheS5sZW5ndGgpe1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbn1cblxuXG5mdW5jdGlvbiBmaW5kRmlyc3RTZXBhcmF0b3IocHJvYmxlbSxpbmRpdil7ICAgXG4gICAgZm9yICh2YXIgaT0wO2k8aW5kaXYuZ2V0Q2hyb21vc29tZSgpLmdldFNpemUoKTtpKyspe1xuICAgXG4gICAgICAgIGlmIChpc1NlcGFyYXRvcihwcm9ibGVtLGluZGl2LGluZGl2LmdldENocm9tb3NvbWUoKS5nZXRBbGxlbGUoaSkpKXtcblxuICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldE5leHRBbGxlbGUoaW5kaXYsYWN0dWFsKXsgLy9QT1NJQ0nDk04gREVMIEFSUkFZIERFIEFMTEVMRVMgKGluY2x1eWUgc2VwYXJhZG9yZXMpXG4gICAgYWN0dWFsKys7XG4gICAgaWYgKGFjdHVhbD49aW5kaXYuZ2V0Q2hyb21vc29tZSgpLmdldFNpemUoKSl7XG4gICAgICAgIGFjdHVhbD0wO1xuICAgIH1cbiAgICByZXR1cm4gYWN0dWFsO1xufVxuXG5cblxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBQcm9ibGVtQ1ZSUDsiLCIndXNlIHN0cmljdCc7XG5cblxuY2xhc3MgQ3VzdG9tZXJ7XG4gICAgY29uc3RydWN0b3IoZGVsaXZlcnlJdGVtcywgZGVsaXZlcnlUaW1lKSB7XG4gICAgICAgIHRoaXMuZGVsaXZlcnlJdGVtcyA9IGRlbGl2ZXJ5SXRlbXM7XG4gICAgICAgIHRoaXMuZGVsaXZlcnlUaW1lID0gZGVsaXZlcnlUaW1lOyAgICAgICAgICAgICAgIFxuICAgIH1cbiAgICBzdGF0aWMgZnJvbUpTT04oYyl7XG4gICAgICAgIHZhciBjdXN0b21lciA9IG5ldyBDb21tb24uRWxlbWVudHMuQ3VzdG9tZXIoKTtcbiAgICAgICAgY3VzdG9tZXIuZGVsaXZlcnlJdGVtcz1jLmRlbGl2ZXJ5SXRlbXM7XG4gICAgICAgIGN1c3RvbWVyLmRlbGl2ZXJ5VGltZT1jLmRlbGl2ZXJ5VGltZTtcbiAgICAgICAgcmV0dXJuIGN1c3RvbWVyOyAgICAgICAgXG4gICAgfVxuICAgIGdldERlbGl2ZXJ5SXRlbXMoKXtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGVsaXZlcnlJdGVtczsgICAgICAgIFxuICAgIH1cbiAgICBnZXREZWxpdmVyeVRpbWUoKXtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGVsaXZlcnlUaW1lOyAgICAgICAgXG4gICAgfVxuICAgIHNldERlbGl2ZXJ5SXRlbXMoaXRlbXMpe1xuICAgICAgICB0aGlzLmRlbGl2ZXJ5SXRlbXMgPSBpdGVtczsgICAgICAgIFxuICAgIH1cbiAgICBzZXREZWxpdmVyeVRpbWUodGltZSl7XG4gICAgICAgIHRoaXMuZGVsaXZlcnlUaW1lID0gdGltZTsgICAgICAgIFxuICAgIH1cbn1cbiAgICBcbm1vZHVsZS5leHBvcnRzID0gQ3VzdG9tZXI7IiwidmFyIGxvZz1cIlwiO1xuXG52YXIgT3V0cHV0ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgfVxuXG5PdXRwdXQuc2hvd0luaXRNZXRob2QgPSBmdW5jdGlvbihwcmlvcml0eSxjbGFzc3MsbWV0aG9kKSB7XG4gICAgaWYgKHByaW9yaXR5PDApe1xuICAgICAgICBjb25zb2xlLmxvZyhjbGFzc3MrbWV0aG9kK1wiIC0+IElOSVRcIik7XG4gICAgfSAgXG59XG5cbk91dHB1dC5zaG93RW5kTWV0aG9kID0gZnVuY3Rpb24ocHJpb3JpdHksY2xhc3NzLG1ldGhvZCkge1xuICAgIGlmIChwcmlvcml0eTwwKXtcbiAgICAgICAgY29uc29sZS5sb2coY2xhc3NzK21ldGhvZCtcIiAtPiBFTkRcIik7XG4gICAgfSAgXG59XG5cblxuT3V0cHV0LnNob3dJbmZvID0gZnVuY3Rpb24ocHJpb3JpdHksY2xhc3NzLG1ldGhvZCxtZXNzYWdlKSB7XG4gICAgaWYgKHByaW9yaXR5PT0xMDAwKXtcbiAgICAgICAgY29uc29sZS5sb2coXCJJTkZPOiBcIitjbGFzc3MrXCIuXCIrbWV0aG9kK1wiIC0+IFwiK21lc3NhZ2UrXCJcXG5cIik7XG4gICAgfVxuLy8gICAgaWYgKHByaW9yaXR5PT0yMDApe1xuLy8gICAgICAgY29uc29sZS5sb2coXCJJTkZPOiBcIitjbGFzc3MrXCIuXCIrbWV0aG9kK1wiIC0+IFwiK21lc3NhZ2UrXCJcXG5cIik7IFxuLy8gICAgfVxuLy9cdGlmIChwcmlvcml0eT09MTAwMCB8fHByaW9yaXR5PT0xMjAwKXtcbi8vLy9cdFx0Y29uc29sZS5sb2cobWVzc2FnZSlcbi8vXHRcdGNvbnNvbGUubG9nKFwiSU5GTzogXCIrY2xhc3NzK1wiLlwiK21ldGhvZCtcIiAtPiBcIittZXNzYWdlK1wiXFxuXCIpO1xuLy9cdH1cbi8vLy8gICAgaWYgKHByaW9yaXR5IT0xMDAgJiYgcHJpb3JpdHkhPTIwMCl7XG4vLy8vLy8gICAgICAgIGxvZys9Y2xhc3NzK1wiLlwiK21ldGhvZCtcIiAtPiBJTkZPOiBcIittZXNzYWdlK1wiXFxuXCI7XG4vLy8vICAgICAgICBjb25zb2xlLmxvZyhjbGFzc3MrXCIuXCIrbWV0aG9kK1wiIC0+IElORk86IFwiK21lc3NhZ2UpO1xuLy8vLyAgICB9ICBcbn1cblxuXG5PdXRwdXQuc2hvd1dhcm5pbmcgPSBmdW5jdGlvbihwcmlvcml0eSxjbGFzc3MsbWV0aG9kLG1lc3NhZ2UpIHtcbiAgICBjb25zb2xlLmxvZyhcIldBUk5JTkc6IFwiK21lc3NhZ2UpO1xufVxuXG5PdXRwdXQuc2hvd0Vycm9yID0gZnVuY3Rpb24ocHJpb3JpdHksY2xhc3NzLG1ldGhvZCxlcnJvcikge1xuLy8gICAgY29uc29sZS5sb2coXCJFUlJPUjogXCIrbWVzc2FnZSk7XG5cdGNvbnNvbGUubG9nKFwiRVJSUk9SOiBcIitjbGFzc3MrXCIuXCIrbWV0aG9kK1wiIC0+IFwiK2Vycm9yLm1lc3NhZ2UrXCJcXG5cIik7XG4gICAgICAgIC8vLnN0YWNrXG59XG5cbk91dHB1dC5zaG93RXhjZXB0aW9uID0gZnVuY3Rpb24ocHJpb3JpdHksY2xhc3NzLG1ldGhvZCxtZXNzYWdlKSB7XG4gICAgY29uc29sZS5sb2coXCJFWENFUFRJT046IFwiK21lc3NhZ2UpO1xufVxuXG5cbk91dHB1dC5zaG93U29sdXRpb24gPSBmdW5jdGlvbihzdGVwLGluZGl2aWR1YWwpIHtcbiAgICBjb25zb2xlLmxvZyhcIlNPTFVUSU9OIGZvdW5kIGFmdGVyIFwiK3N0ZXArXCIgc3RlcHMuXCIpO1xuICAgIGNvbnNvbGUubG9nKGluZGl2aWR1YWwudG9TdHJpbmcoKSk7XG59XG5cbk91dHB1dC5zaG93TG9nID0gZnVuY3Rpb24oKSB7XG4vLyAgICBjb25zb2xlLmxvZyhsb2cpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE91dHB1dDsiXX0=
