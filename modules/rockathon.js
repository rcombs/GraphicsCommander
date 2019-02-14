"use strict";

// Countdowns module. INCOMPLETE.

var events = require("events"),
    request = require('request');

var exports = module.exports = function(config){
	var self = this;
	this.counters = (config && config.counters) || {};
	
	setInterval(function(){
        var site = 'http://www.wltl.net/rat-total.html';
        request(site, function (error, response, body) {
            if (body) {
                var dat = body.match(/<meta property="og:description" content="\$([^"]+)"/);
                if (dat) {
                    var flags = {totalMoney: dat[1]};
                    self.emit('flags', flags);
                }
            }                
        });
	}, 1000);
};

exports.type = "in";

exports.prototype = new events.EventEmitter();