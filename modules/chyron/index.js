"use strict";

// Chyron/III output module

var Chyron = require("chyron"),
	events = require("events");

var exports = module.exports = function(config){
	var self = this;
	this.config = config;
	var arg1, arg2;
	if(config.host){
		arg1 = config.host;
		arg2 = config.port;
	}else{
		arg1 = config.sp;
		arg2 = config.spOptions;
	}
	var chyron = this.chyron = new Chyron(arg1, arg2, function(){
		console.log("Chyron connected");
	});
	chyron.on("error", function(err){
		console.error("CHYRON ERROR: " + err);
	});	
	chyron.on("data", function(data){
		self.emit("data", data);
	});
	this.flags = {};
	chyron.on("request", function(data){
		var reply = {
			userId: data.userId,
			fields: []
		};
		for(var i = 0; i < data.fields.length; i++){
			reply.fields.push(self.flags[data.fields[i]] || "");
		}
		chyron.writeReply(reply);
	})
};

exports.type = "out";

exports.prototype = new events.EventEmitter();

exports.prototype.writeFlags = function(flags){
	this.flags = flags;
//	var outArr = [];
//	var config = this.config;
//	for(var i = 0; i < config.tab.list.length; i++){
//		outArr.push(flags[config.tab.list[i]] || "");
//	}
//	this.chyron.writeTab(config.tab.message, config.tab.descriptor, outArr);
}
