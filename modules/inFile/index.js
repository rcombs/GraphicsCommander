"use strict";

// LiveText Flat-File input module

var fs = require("fs"),
	events = require("events");

var exports = module.exports = function(options){
	var self = this;
	var outFiles = this.outFiles = options.files;
	if(typeof outFileArray !== "array"){
		outFiles = [outFiles];
	}
	for(var i = 0; i < outFiles.length; i++){
		var file = outFiles[i];
		fs.watch(file, {persistent: false}, function(event, filename){
			fs.readFile(err, "utf8", data){
				if(err){
					console.log(err.toString());
					return;
				}
				var flags = [];
				var arr = data.replace(/\r/g,"").split("\n");
				for(var i = 0; i < arr.length; i++){
					// Split on the first equals sign, ignoring surrounding spaces
					var lr = arr[i].match(/(.*?) *= *(.*)/);
					if(lr.length !== 3){
						// If no equals sign, bad line
						continue;
					}
					if(ignores && ignores.indexOf(lr[1]) != -1){
						// If on the ignore list, skip
						continue;
					}
					flags[lr[1]] = lr[2];
				}
				self.emit("flags", flags);
			}
		});
	}
}

exports.prototype = new events.EventEmitter();

exports.type = "in";