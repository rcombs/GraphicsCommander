"use strict";

// Key/value input over UDP socket

var dgram = require("dgram"),
    events = require("events");

var exports = module.exports = function (config) {
  this.config = config;
  this.socket = dgram.createSocket(config.ipv6 ? "udp6" : "udp4");
}

exports.prototype = new events.EventEmitter();

exports.type = "out";

exports.prototype.writeFlags = function (flags) {
  var message = "";
  for (var i = 0; i < this.config.flags.length; i++) {
    var flag = this.config.flags[i];
    var str = flags[flag.name] || "";
    str = str.substring(0, flag.length);
    while (str.length < flag.length)
      str += " ";
    message += str;
  }
  message += "\n";
  this.socket.send(message, 0, message.length, this.config.port, this.config.address);
}
