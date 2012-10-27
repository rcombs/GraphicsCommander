var exports = module.exports = function(){
	var proc = require('child_process').spawn("netsh", ["wlan", "start", "hostednetwork"]);
	proc.on("exit", function(code){
		if(code == 0){
			console.log("Successfully started hosted network");
		}else{
			console.error("Hosted network not started; threw error code " + code);
		}
	});
}
exports.type = "util";