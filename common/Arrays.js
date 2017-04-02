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


