   
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
