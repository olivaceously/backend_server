var bodyParser = require('body-parser'); // Required if we need to use HTTP query or post parameters
var validator = require('validator');
var express = require('express');
var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // Required if we need to use HTTP query or post parameters

var mongoUri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/landmarks';
var MongoClient = require('mongodb').MongoClient, format = require('util').format;
var db = MongoClient.connect(mongoUri, function(error, databaseConnection) {
    db = databaseConnection;
    db.collection('landmarks').createIndex({'geometry':"2dsphere"});
});

app.set('port', (process.env.PORT || 5000));

app.get('/', function(request, response) {
		var finalResponse = "<!DOCTYPE html>";
		db.collection('checkins', function(error,collection) {
			collection.find().sort({created_at: -1}).toArray(function (error, result) {
				console.log(result);
				for (i = 0; i < result.length; i++) {
					finalResponse += "<p>" + result[i].login + " checked in at " + result[i].lat + ", " + result[i].lng + " on " + result[i].created_at + ". </p>";
				}
				finalResponse += "</html>";
				response.send(finalResponse);
			})
		});
});

app.get('/checkins.json', function(request, response) {
        response.header("Access-Control-Allow-Origin", "*");
        response.header("Access-Control-Allow-Headers", "X-Requested-With");
        
        var userCheckins = [];
        var user = request.query.login;

        if (user == {}) {
        	response.send(userCheckins);
        } else {
	        
	        db.collection('checkins', function(error, collection) {
	        	if (error) {
	        		response.send(500);
	        	} else {
	        		collection.find({"login": user}).toArray(function (error, uCheckins) {
	                		if (error) {
	                			response.send(500);
	                		} else {
	                			userCheckins = uCheckins;
	                			response.send(userCheckins);
	        				}
	        		});
	        	}
	        });
    	}
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

app.post('/sendLocation', function(request, response) {

	var results = {};
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Access-Control-Allow-Headers", "X-Requested-With");

    var login = request.body.login;
    var lat = request.body.lat;
    var lng = request.body.lng;
    var created_at = new Date();

    if (validator.isNull(login) || validator.isNull(lat) || validator.isNull(lng)) {
            response.send({"error":"Whoops, something is wrong with your data!"});
    } else {
            var toInsert = {
                    "login": login,c
                    "lat": lat,
                    "lng": lng,
                    "created_at": created_at
            };

            /* adding checkin to Mongo database */
            db.collection('checkins', function(error, collection) {
            	collection.insert(toInsert, function(error, saved) {
                if (error) {
                    response.send(500);
                } else {
                	collection.find().toArray(function (error, people) {
                		if (error) {
                			response.send(500);
                		} else {
                			results.people = people;
                			db.collection('landmarks', function(error, collection) {
                				if (error) {
                					response.send(500);
                  				} else {
                  					collection.find({geometry:{$near:{$geometry:{type:"Point",coordinates:[parseFloat(lng),parseFloat(lat)]},$minDistance: 0,$maxDistance: 1609}}}).toArray(function (error, close_landmarks){
                  						if (error) {
	                        				response.send(500);
	                					} else {
	        								results.landmarks = close_landmarks;
	        								response.send(results);
	                					}
                  					});
		                		}
		                	});
		                }
		            });
		        }});
			});
	}
});