/*
Created by: Jeffrey Daniel Raja V
Purpose: To help the system to fetch ingredients 
Created on: 25-12-2020
*/

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
                var params = req.body.data;//get the input params from the client
                if (params.fetch_type == "Difference") {
                    dbConnection.collection("ingredient_inventory").find({"$where":"this.Available_Quantity < this.Threshold_Quantity"}).toArray((error, response) => {
                        if (error) {
                            reject(error)
                        } else {
                            if (response.length > 0) {
                                sucessMessage = "Ingredients fetched based difference in quantity successfully";
                                resolve(response);
                            }
                            else {
                                errorMessage = "No Data found.";
                                reject(errorMessage)
                            }
                        }
                    });
                }
                else if (params.fetch_type == "Byvendor") {
                    dbConnection.collection("ingredient_inventory").find({ "Vendor": params.Vendor }).toArray((error, response) => {
                        if (error) {
                            reject(error)
                        } else {
                            if (response.length > 0) {
                                sucessMessage = "Ingredients fetched based on vendor successfully";
                                resolve(response);
                            }
                            else {
                                errorMessage = "No Data found.";
                                reject(errorMessage)
                            }
                        }
                    });
                }
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