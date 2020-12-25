/*
Created by: Jeffrey Daniel Raja V
Purpose: To help in taking order for food / cancel it / edit it
Created on: 25-12-2020
*/
var crypto = require('crypto');
var instanceHelper = require('../util/instances/mongoInstance');
var express = require('express');
var router = express.Router();
const { v4: uuidv4 } = require('uuid');

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
                var food_obj = {};
                var update_food_obj = {};
                var params = req.body.data;
                if (params.process == "Order") {
                    var salt = crypto.randomBytes(16).toString('hex');
                    var hashPassword = crypto.pbkdf2Sync(params.Password, salt, 1000, 16, `sha512`).toString(`hex`);
                    var Id = uuidv4();
                    food_obj["Id"] = Id;
                    food_obj["OrderedBy"] = params.OrderedBy;
                    food_obj["OrderTakenBy"] = params.OrderTakenBy;
                    food_obj["Status"] = "Active";
                    food_obj["AuditInfo"] = params.AuditInfo;
                    food_obj["Items"] = params.FirstName;
                    food_obj["TotalAmount"] = params.TotalAmount;
                    dbConnection.collection("foodorder").insert(food_obj, (err, res) => {
                        if (err) {
                            reject(err);
                        } else {
                            sucessMessage = "Ordered successfully";
                            resolve("");
                        }
                    });
                }
                else if (params.process == "Update") {
                    update_food_obj["OrderedBy"] = params.OrderedBy;
                    update_food_obj["OrderTakenBy"] = params.OrderTakenBy;
                    update_food_obj["Status"] = "Active";
                    update_food_obj["AuditInfo"] = params.AuditInfo;
                    update_food_obj["Items"] = params.FirstName;
                    update_food_obj["TotalAmount"] = params.TotalAmount;
                    dbConnection.collection("foodorder").update({
                        "Id": params.Id
                    }, {
                        "$set": update_food_obj
                    }, {
                        upsert: true
                    }, (err, resp) => {
                        if (err) {
                            reject(err);
                        } else {
                            sucessMessage = "Order updated successfully";
                            resolve("");
                        }
                    });
                }
                else if (params.process == "Delete") {
                    dbConnection.collection("foodorder").update({
                        "Id": params.Id
                    }, {
                        "$set": {
                            "Status": "InActive"
                        }
                    }, {
                        upsert: true
                    }, (err, resp) => {
                        if (err) {
                            reject(err);
                        } else {
                            sucessMessage = "Order deleted successfully";
                            resolve("");
                        }
                    });
                }
                else {

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