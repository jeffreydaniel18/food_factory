/*
Created by: Jeffrey Daniel Raja V
Purpose: To help the user to login to the system
Created on: 25-12-2020
*/
var crypto = require('crypto');
var instanceHelper = require('../util/instances/mongoInstance');
var express = require('express');
var router = express.Router();

router.post('/', function (req, res) {
    var dbConnection = "";
    var errorMessage = 'Unexpected error has occured.Please contact adminstrator.';
    var sucessMessage = "";

    //Promice chain setup 
    return getDBConfig().
        then((response) => userLogin(response))
        .then((response) => SendSuccessResponse("", response))
        .catch((error) => SendErrorResponse(error));
    //This fucntion get the db details 
    function getDBConfig(requestData) {
        return new Promise((resolve, reject) => {
            instanceHelper.getMongoDBInstance().then((dbConn) => {
                dbConnection = dbConn;
                resolve("");
            }).catch((ex) => {
                reject(ex);
            });
        });
    }

    function userLogin() {
        return new Promise((resolve, reject) => {

            try {
                var params = req.body.data;//get the input params from the client
                dbConnection.collection("users").find({ "UserName": params.UserName, "Status": "Active" }).toArray((error, response) => {
                    if (error) {
                        reject(error);
                    } else {
                        if (response.length > 0) {
                            var hashpass = crypto.pbkdf2Sync(params.Password, response[0].Salt, 1000, 16, `sha512`).toString(`hex`);
                            if (response[0].Password.toString() == hashpass.toString()) {
                                sucessMessage = "Logged in successfully";
                                var result = {};
                                result.status = "SUCCESS";
                                result.message = sucessMessage;
                                resolve(result);

                            }
                            else {
                                errorMessage = "Invalid UserName/Password";
                                reject(errorMessage);
                            }
                        }
                        else {
                            errorMessage = "No Data found.";
                            reject(errorMessage)
                        }
                    }
                });
            } catch (ex) {
                console.log("Exception Occured");
                reject(errorMessage);

            }
        });
    }

    //Send success response.
    function SendSuccessResponse(message, responseObject) {
        // SetResult("SUCCESS", sucessMessage, responseObject);
        var result = {}
        result.status = "SUCCESS";
        result.message = sucessMessage;
        result.data = responseObject;
        res.send(result);
    }
    //Send error response.
    function SendErrorResponse(errorMessage) {
        //SetResult("FAILURE", errorMessage, {});
        var result = {}
        result.status = "FAILURE";
        result.message = errorMessage;
        result.data = {};
        res.send(result);
    }
});
module.exports = router;