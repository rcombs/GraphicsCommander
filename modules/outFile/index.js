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

function escapeXML(str){
	return str.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;');
}

function makeString(hash, type){
	var xml = (type === "xml");
	var str = xml ? "<Info>" : "";
	for(var i in hash){
		var j = hash[i];
		str += xml ? ("<" + i + ">" + escapeXML(j) + "</" + i + ">") : (i + " = " + j + "\n");
	}
	return xml ? (str + "</Info>") : str;
}

exports.prototype.writeFlags = function(flags){
	console.log(makeString(flags, this.config.type))
	fs.writeFile(this.config.path, makeString(flags));
}