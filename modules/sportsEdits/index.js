// Various basic fixes and additions for sports

var events = require("events"),
	path = require("path");

var exports = module.exports = function(config){
	var self = this;
	var flags = this.flags = {};
	this.config = config;
	
	var fixes = this.fixes = {
		Down: function(down){
			switch(down){
				case "1":
					return "1st";
				case "2":
					return "2nd";
				case "3":
					return "3rd";
				case "4":
					return "4th";
				default:
					return down;
			}
		},
		ToGo: function(togo){
			if(togo <= 10 && togo == self.flags.BallOn){
				return "G";
			}else{
				return togo;
			}
		},
		GameClk: function(time){
			if(time.indexOf("0:") == 0){
				return time.substring(2);
			}else{
				return time;
			}
		},
		BallOn: function(on){
			if(on){
				return "on the "+on;
			}else{
				return "";
			}
		},
		Period: function(p){
			return self.flags.periodPrefix+p;
		}
	};
	
	var adds = this.adds = {
		DownAndTogo: function(){
			if(self.flags.Down && self.flags.ToGo){
				return self.flags.Down + " and " + self.flags.ToGo;
			}else{
				return "";
			}
		},
		timeoutsLeftHome: function(){
			if(self.flags.timeout == "home"){
				return self.flags.HToL;
			}else{
				return "";
			}
		},
		timeoutsLeftAway: function(){
			if(self.flags.timeout == "away"){
				return self.flags.VToL;
			}else{
				return "";
			}
		}
	};
};

exports.prototype = new events.EventEmitter();

exports.prototype.editFlags = function(flags){
	this.flags = flags;
	for(var i in this.fixes){
		if(i in flags){
			this.flags[i] = fixes[i](flags[i]);
		}
	}
	for(var i in this.adds){
		this.flags[i] = this.adds[i]();
	}
	for(var i = 0; i < this.config.flags.bool.length; i++){
		var flag = this.config.flags.bool[i];
		if(this.flags[flag]){
			this.flags[i + "Path"] = path.join(this.config.imagePath, flag + ".png")
		}else{
			this.flags[i + "Path"] = path.join(this.config.imagePath, "blank.png");
		}
	}
	for(var i = 0; i < this.config.flags.HV.length; i++){
		var flag = this.config.flags.HV[i];
		if(this.flags[flag] == "H"){
			this.flags["H" + i + "Path"] = path.join(this.config.imagePath, flag + ".png");
			this.flags["V" + i + "Path"] = path.join(this.config.imagePath, "blank.png");
		}else if(this.flags[flag] == "V"){
			this.flags["V" + i + "Path"] = path.join(this.config.imagePath, flag + ".png");
			this.flags["H" + i + "Path"] = path.join(this.config.imagePath, "blank.png");
		}else){
			this.flags["V" + i + "Path"] = this.flags["H" + i + "Path"] = path.join(this.config.imagePath, "blank.png");
		}
	}
	for(var i = 0; i < this.configs.flags.counter.length; i++){
		var flag = this.configs.flags.counter[i];
		for(var j = 1; j < 4; j++){
			if(flags[flag] >= j){
				this.flags[i + j + "Path"] = path.join(this.config.imagePath, flag + ".png");
			}else{
				this.flags[i + j + "Path"] = path.join(this.config.imagePath, "blank.png");
			}
		}
	}
	return this.flags;
}