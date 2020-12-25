/*
Created by: Jeffrey Daniel Raja V
Purpose: To help the user to reset password
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


    return getDBConfig().
        then((response) => execute(response))
        .then((response) => SendSuccessResponse("", response))
        .catch((error) => SendErrorResponse(error));

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

    function execute() {
        return new Promise((resolve, reject) => {

            try {
                var params = req.body.data;
                var salt = crypto.randomBytes(16).toString('hex');
                var hashPassword = crypto.pbkdf2Sync(params.Password, salt, 1000, 16, `sha512`).toString(`hex`);
                var respobj = {};
                respobj.hashPassword = hashPassword;
                respobj.salt = salt;
                dbConnection.collection("forgot_password").find({ "HashKey": params.HashKey }).toArray((error, response) => {
                    if (error) {
                        reject(error);
                    } else {
                        if (response.length > 0) {
                            dbConnection.collection("users").update({
                                "EmailId": response[0].EmailId
                            }, {
                                "$set": {
                                    "Password": hashPassword,
                                    "Salt": salt
                                }
                            }, {
                                upsert: true
                            }, (err, resp) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    sucessMessage = "Password Updated successfully";
                                    resolve("");
                                }
                            });
                        }
                        else {
                            reject("No Data Found");
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