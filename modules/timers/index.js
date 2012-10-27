"use strict";

// Countdowns module. INCOMPLETE.

var events = require("events");

function buildFlags(countdowns){
	var flags = {};
	for(var i = 0; i < countdowns.length; i++){
		if(countdowns[i] == -1){
			flags["countdown" + i] = "";
		}else{
			flags["countdown" + i]
		}
	}
}

var exports = module.exports = function(config){
	var self = this;
	var flashOn = this.flashOn = false;
	this.config = config;
	var countdowns = this.countdowns = [];
	var countups = this.countups = [];

	setInterval(function(){
		var useFlash = false;
		for(var i = 0; i < config.flashFlags.length; i++){
			if(global.flags[flashFlags[i]]){
				useFlash = true;
			}
		}
		if(useFlash){
			self.flashOn = !self.flashOn;
			self.emit("flags", {flashOn: self.flashOn});
		}
	}, config.flashTime);
	
	setInterval(function(){
		var send = false;
		for(var i = 0; i < countdowns.length; i++){
			
		}
		if(send){
			self.emit("flags", buildFlags(countdowns));
		}
	}, 1000);
};

exports.type = "in";

exports.prototype = new events.EventEmitter();

exports.prototype.setCountdown = function(number, seconds){
	this.countdowns[number] = seconds;
	this.emit("flags", buildFlags(this.countdowns));
};

function runCountdown(){
	var write = false;
	if(rawFlags.countdown > 0 && rawFlags.countdownRunning == true){
		rawFlags.countdown = Math.max(rawFlags.countdown - 1000, 0);
		write = true;
	}else{
		rawFlags.countdownRunning = false;
	}
	if(rawFlags.countdown2 > 0 && rawFlags.countdown2Running == true){
		rawFlags.countdown2 = Math.max(rawFlags.countdown2 - 1000, 0);
		write = true;
	}else{
		rawFlags.countdown2Running = false;
	}
	if(write){
		writeOutput();
	}
}