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