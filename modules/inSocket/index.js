"use strict";

// Key/value input over UDP socket

var dgram = require("dgram"),
	events = require("events");

var exports = module.exports = function(options){
	var self = this;

	self.socket = dgram.createSocket(options.ipv6 ? "udp6" : "udp4");
	self.socket.setBroadcast(options.broadcast);

	self.socket.bind(options.port, function(){
		console.log("Listening for UDP datagrams on port #" + options.port);
		self.socket.on("message", function(msg){
			var flags = querystring.parse(msg.toString());
			flags && self.emit("flags", flags);
		});
	});
}

exports.prototype = new events.EventEmitter();

exports.type = "in";
