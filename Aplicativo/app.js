// General purpose variables
var app = {};
app.connected = false;
app.ready = false;

var map;
var mapLoaded = false;

// MQTT broker settings
var host = 'hub.owntrack.com.br/mqtt';
var port = 443;
var user = 'web';
var password = '123456';
var topic = 'car/location';

// Crypto settings
var keySize = 256;
var ivSize = 128;
var iterations = 500;
var pwd = "P@ssw0rd";

app.initialize = function() {
	document.addEventListener(
		'deviceready',
		app.onReady,
		false);
}

app.onReady = function() {
	if (!app.ready) {
		app.subTopic = topic;
		app.setupConnection();
		app.ready = true;
	}
}

app.setupConnection = function() {
	if (app.connected){
		app.client.disconnect();		
		app.connected = false;	
		app.changeButton();
	}else{
		app.status("Conectando...");
		app.client = new Paho.MQTT.Client(host, port, device.uuid);
		app.client.onConnectionLost = app.onConnectionLost;
		app.client.onMessageArrived = app.onMessageArrived;
		var options = {
			userName: user,
			password: password,		
			useSSL: true,
			onSuccess: app.onConnect,
			onFailure: app.onConnectFailure
	  }
		app.client.connect(options);
	}  
}

app.publish = function(json) {
	message = new Paho.MQTT.Message(json);
	message.destinationName = app.pubTopic;
	app.client.send(message);
};

app.subscribe = function() {
	app.client.subscribe(app.subTopic);
	app.status("Subscribed: " + app.subTopic);
}

app.unsubscribe = function() {
	app.client.unsubscribe(app.subTopic);
	app.status("Unsubscribed: " + app.subTopic);
}

app.decrypt = function(message) { 
	var salt = CryptoJS.enc.Hex.parse(message.payloadString.substr(0, 32));
	var iv = CryptoJS.enc.Hex.parse(message.payloadString.substr(32, 32));
	var encrypted = message.payloadString.substring(64);

	var key = CryptoJS.PBKDF2(pwd, salt, { keySize: keySize/32, iterations: iterations });
	
	var decrypted = CryptoJS.AES.decrypt(encrypted, key, { iv: iv });
	var plaintext = decrypted.toString(CryptoJS.enc.Utf8);	
	
	var location = JSON.parse(plaintext);	

	return location;
}

app.onMessageArrived = function(message) {
	console.log("Message Received");
	//var location = JSON.parse('{"lat": -25.363, "lng": 131.044, "mode": 1}');
	var location = app.decrypt(message);
	app.status(JSON.stringify(location));

	app.setStatusBar(location.mode);	
	
	if (location.mode && location.mode != 0){
		if (mapLoaded){
			marker.setPosition(location);			
			map.setCenter(marker.getPosition());						
			app.status("Marker and Map updated");
		}else{
			mapLoaded = true;
			map = new google.maps.Map(document.getElementById('map'), {
				center: {lat: location.lat, lng: location.lng},
				zoom: 17,
			});
			marker = new google.maps.Marker({
				position: location,
				map: map,
			});
			app.status("Map and Marker created");			
		}

	}	
}

app.setStatusBar = function(mode) {
	var fixIndicator = document.getElementById("fixIndicator");
	var timeStamp = document.getElementById("timeStamp");
	switch(mode) {
		case 1:
			fixIndicator.className = "oneD";
			timeStamp.innerHTML = app.getTime();
			break;
		case 2:
			fixIndicator.className = "twoD";
			timeStamp.innerHTML = app.getTime();			
			break;
		case 3:
			fixIndicator.className = "threeD";
			timeStamp.innerHTML = app.getTime();
			break;
		default:
			fixIndicator.className = "noFix";
	} 
}

app.getTime = function(){
	var currentTime = new Date();
	return currentTime.getHours() + ":" + currentTime.getMinutes();
}

app.onConnect = function(context) {
	app.subscribe();
	app.status("Connectado a: " + host);	
	app.connected = true;
	app.changeButton();
}

app.onConnectFailure = function(e){
	app.connected = false;
	app.setStatusBar();
	app.changeButton();
	app.status("Falha ao conectar: " + JSON.stringify(e));
}

app.onConnectionLost = function(responseObject) {
	app.status("Desconectado: "+responseObject.errorMessage);
	app.connected = false;
	app.changeButton();	
	app.setStatusBar();
}

app.status = function(s) {
	console.log(s);
}

app.changeButton = function(){
	if (app.connected){
		var connect = document.getElementById("connect");
		connect.className = "red wide"
		connect.innerHTML = "DESCONECTAR";
	}else{
		var connect = document.getElementById("connect");
		connect.className = "green wide"
		connect.innerHTML = "CONECTAR";
	}
}

app.initialize();
