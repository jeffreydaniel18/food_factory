/*
Created by: Jeffrey Daniel Raja V
Purpose: To help fetch food orders based on user 
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
                if (params.type == "OrderedBy") {
                    dbConnection.collection("foodorder").find({ "OrderedBy": params.OrderedBy }).toArray((error, response) => {
                        if (error) {
                            reject(error)
                        } else {
                            if (response.length > 0) {
                                sucessMessage = "Orders fetched successfully";
                                resolve(response);
                            }
                            else {
                                errorMessage = "No Data found.";
                                reject(errorMessage)
                            }
                        }
                    });
                }
                else if (params.type == "OrderTakenBy") {
                    dbConnection.collection("foodorder").find({ "OrderTakenBy": params.OrderTakenBy }).toArray((error, response) => {
                        if (error) {
                            reject(error)
                        } else {
                            if (response.length > 0) {
                                sucessMessage = "Orders fetched successfully";
                                resolve(response);
                            }
                            else {
                                errorMessage = "No Data found.";
                                reject(errorMessage)
                            }
                        }
                    });
                }
                else if (params.type == "Difference") {
                    dbConnection.collection("food_inventory").find({ "$where": "this.Selling_Cost < this.Production_Cost" }).toArray((error, response) => {
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