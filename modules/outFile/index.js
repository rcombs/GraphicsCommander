"use strict";

// LiveText Flat-File output module

var events = require("events"),
	fs = require("fs");

var exports = module.exports = function(config){
	var self = this;
	this.config = config;
};

exports.type = "out";

exports.prototype = new events.EventEmitter();

function makeString(hash){
	var str = "";
	for(var i in hash){
		var j = hash[i];
		str += i + " = " + j + "\n";
	}
	return str;
}

exports.prototype.writeFlags = function(flags){
	console.log(makeString(flags))
	fs.writeFile(this.config.path, makeString(flags));
}