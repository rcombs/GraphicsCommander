"use strict";

// Countdowns module. INCOMPLETE.

var events = require("events");

function zeroPad(number, digits){
	var str = number.toString(10);
	while(str.length < digits){
		str = "0" + str;
	}
	return str;
}

function formatTime(time){
	var totalSeconds = time / 1000;
	var seconds = totalSeconds % 60;
	var totalMinutes = totalSeconds / 60 | 0;
	var minutes = totalMinutes % 60;
	var hours = totalMinutes / 60 | 0;
	return (hours ? hours + ":" : "") + zeroPad(minutes, 2) + ":" + zeroPad(seconds, 2);
}

var exports = module.exports = function(config){
	var self = this;
	this.counters = (config && config.counters) || {};
	
	setInterval(function(){
		var send = false;
		var flags = {};
		for(var i in self.counters){
			var cd = self.counters[i];
			if(cd < 0){
				// NEGATIVE = COUNTUP
				flags[i] = Math.max((new Date()).getTime() - cd, 0);
                flags[i + 'Text'] = formatTime(flags[i]);
			}else{
				// POSITIVE = COUNTDOWN
				flags[i] = Math.max(cd - (new Date()).getTime(), 0);
                flags[i + 'Text'] = formatTime(flags[i]);
			}
		}
		self.emit("flags", flags);
	}, 1000);
};

exports.type = "in";

exports.prototype = new events.EventEmitter();